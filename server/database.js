import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import Database from 'better-sqlite3';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default Database file path
const DEFAULT_DB_DIR = join(__dirname, 'data');
const DEFAULT_DB_FILE_PATH = join(DEFAULT_DB_DIR, 'database.db');

let db;

// Export the db instance for transaction control
// This allows server/index.js to use it for transactions,
// and tests to potentially inspect it if needed (though usually not recommended for direct manipulation in tests).
export { db };

// Ensure database directory exists and initialize DB
const initDb = async (dbPath = DEFAULT_DB_FILE_PATH) => {
  try {
    // Ensure the directory for the dbPath exists
    const dbDir = dirname(dbPath);
    await fs.mkdir(dbDir, { recursive: true });
    
    // Use the provided dbPath or the default one
    db = new Database(dbPath, { verbose: dbPath.includes('test') ? undefined : console.log }); // Conditional logging

    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS jackpot_state (
        id INTEGER PRIMARY KEY,
        current_amount REAL NOT NULL,
        last_update TEXT NOT NULL,
        last_modified_by TEXT,
        version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS jackpot_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        previous_amount REAL NOT NULL,
        new_amount REAL NOT NULL,
        action_type TEXT NOT NULL,
        user_id TEXT
      );

      CREATE TABLE IF NOT EXISTS daily_target (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_x INTEGER NOT NULL,
        target_y INTEGER NOT NULL,
        target_date TEXT NOT NULL UNIQUE,
        version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS click_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT NOT NULL,
        attempt_date TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        UNIQUE(identifier, attempt_date)
      );
    `);

    // If jackpot_state is empty, insert initial default jackpot
    const jackpotRow = db.prepare('SELECT * FROM jackpot_state WHERE id = 1').get();
    if (!jackpotRow) {
      db.prepare(
        'INSERT INTO jackpot_state (id, current_amount, last_update, last_modified_by, version) VALUES (?, ?, ?, ?, ?)'
      ).run(1, 100.00, new Date().toISOString(), 'system', 1);
      console.log('Initialized jackpot_state with default values');
    }

    // If daily_target has no entry for the current date, create one
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const targetRow = db.prepare('SELECT * FROM daily_target WHERE target_date = ?').get(currentDate);
    if (!targetRow) {
      db.prepare(
        'INSERT INTO daily_target (target_x, target_y, target_date, version) VALUES (?, ?, ?, ?)'
      ).run(Math.floor(Math.random() * 1000), Math.floor(Math.random() * 1000), currentDate, 1);
      console.log(`Initialized daily_target for ${currentDate}`);
    }

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Get current jackpot value
const getJackpot = () => {
  try {
    const row = db.prepare('SELECT current_amount FROM jackpot_state WHERE id = 1').get();
    return { current_amount: row ? row.current_amount : 0 };
  } catch (error) {
    console.error('Error reading jackpot state:', error);
    throw error;
  }
};

// Update jackpot value
const updateJackpot = (newAmount, userId) => {
  try {
    // Validate amount is within expected range
    if (newAmount < 0 || newAmount > 10000000) { // $10M max for safety
      throw new Error('Invalid jackpot amount');
    }
    
    // Round to 3 decimal places to ensure precision
    const roundedAmount = Math.round(newAmount * 1000) / 1000;
    
    const stmt = db.prepare(
      'UPDATE jackpot_state SET current_amount = ?, last_update = ?, last_modified_by = ?, version = version + 1 WHERE id = 1'
    );
    const result = stmt.run(roundedAmount, new Date().toISOString(), userId);
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating jackpot:', error);
    throw error; // Re-throw to indicate failure
  }
};

// Reset jackpot to base amount
const resetJackpot = (baseAmount, userId) => {
  return updateJackpot(baseAmount, userId);
};

// Log jackpot history
const logJackpotHistory = (previousAmount, newAmount, actionType, userId) => {
  try {
    const stmt = db.prepare(
      'INSERT INTO jackpot_history (timestamp, previous_amount, new_amount, action_type, user_id) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(new Date().toISOString(), previousAmount, newAmount, actionType, userId);
    return result.changes > 0;
  } catch (error) {
    console.error('Error logging jackpot history:', error);
    throw error; // Re-throw to indicate failure
  }
};

// Get or create daily target pixel
const getOrCreateDailyTargetPixel = () => {
  try {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let targetRow = db.prepare('SELECT target_x, target_y, target_date FROM daily_target WHERE target_date = ?').get(currentDate);

    if (targetRow) {
      return {
        x: targetRow.target_x,
        y: targetRow.target_y,
        date: targetRow.target_date
      };
    } else {
      // No target for today, create one
      const newX = Math.floor(Math.random() * 1000);
      const newY = Math.floor(Math.random() * 1000);
      
      const stmt = db.prepare(
        'INSERT INTO daily_target (target_x, target_y, target_date, version) VALUES (?, ?, ?, ?)'
      );
      stmt.run(newX, newY, currentDate, 1);
      
      console.log(`Created new daily_target for ${currentDate}: (${newX}, ${newY})`);
      return { x: newX, y: newY, date: currentDate };
    }
  } catch (error) {
    console.error('Error managing daily target:', error);
    throw error; // Re-throw to indicate failure
  }
};

// Force a new target generation
const forceNewDailyTarget = () => {
  try {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const newX = Math.floor(Math.random() * 1000);
    const newY = Math.floor(Math.random() * 1000);

    // Upsert strategy: INSERT ON CONFLICT UPDATE
    // This requires SQLite 3.24.0+
    // The version is incremented using a subquery.
    // COALESCE is used to handle the case where the target_date doesn't exist yet (version starts at 1).
    const stmt = db.prepare(`
      INSERT INTO daily_target (target_x, target_y, target_date, version)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(target_date)
      DO UPDATE SET
        target_x = excluded.target_x,
        target_y = excluded.target_y,
        version = daily_target.version + 1;
    `);
    
    stmt.run(newX, newY, currentDate);

    console.log(`Forced/updated new target pixel for ${currentDate}: (${newX}, ${newY})`);
    return {
      x: newX,
      y: newY,
      date: currentDate
    };
  } catch (error) {
    console.error('Error forcing new daily target:', error);
    throw error; // Re-throw to indicate failure
  }
};

export {
  initDb, // initDb remains async due to fs.mkdir
  getJackpot,
  updateJackpot,
  resetJackpot,
  logJackpotHistory,
  getOrCreateDailyTargetPixel,
  forceNewDailyTarget,
  recordClickAttempt,
  hasAttemptedToday,
  closeDb // Export closeDb
};

// Function to close the database connection
const closeDb = () => {
  if (db && db.open) {
    db.close();
    // console.log('Database connection closed.'); // Optional: for debugging
  }
};

// Record a click attempt
const recordClickAttempt = (identifier, attempt_date) => {
  try {
    const stmt = db.prepare(
      'INSERT INTO click_attempts (identifier, attempt_date, timestamp) VALUES (?, ?, ?)'
    );
    const result = stmt.run(identifier, attempt_date, new Date().toISOString());
    return result.changes > 0;
  } catch (error) {
    console.error('Error recording click attempt:', error);
    // It's important to let errors propagate if, for example, a unique constraint is violated,
    // though hasAttemptedToday should prevent this specific case.
    throw error;
  }
};

// Check if an identifier has already attempted today
const hasAttemptedToday = (identifier, attempt_date) => {
  try {
    const stmt = db.prepare(
      'SELECT id FROM click_attempts WHERE identifier = ? AND attempt_date = ?'
    );
    const row = stmt.get(identifier, attempt_date);
    return !!row; // True if a row exists, false otherwise
  } catch (error) {
    console.error('Error checking click attempt:', error);
    throw error; // Re-throw to allow higher-level handling
  }
};