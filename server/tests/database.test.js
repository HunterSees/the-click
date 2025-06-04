import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// Correctly import functions from database.js
// Note: The 'db' export itself is also available if direct inspection is needed, but typically not used in tests.
import {
  initDb,
  getJackpot,
  updateJackpot,
  resetJackpot,
  getOrCreateDailyTargetPixel,
  // db as actualDbInstance // Example if you needed to access the db instance directly
  // Import new functions to be tested
  logJackpotHistory,
  forceNewDailyTarget,
  recordClickAttempt,
  hasAttemptedToday,
  db, // Import db to allow direct queries for verification where needed
  closeDb // Import closeDb
} from '../database.js'; // Adjust path as necessary

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DB_DIR = path.join(__dirname, 'test_data');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test_database.db');

// Mock console.log to keep test output clean, can be enabled for debugging
// vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Database Module', () => {
  beforeEach(async () => {
    // Ensure test data directory exists
    if (!fs.existsSync(TEST_DB_DIR)) {
      fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    }
    // Clean up old test database file if it exists
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // Initialize DB with test path. This is async.
    await initDb(TEST_DB_PATH);
  });

  afterEach(() => {
    // Close the database connection
    if (db && db.open) {
      closeDb();
    }
    // Clean up test database file
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('initDb', () => {
    it('should create all necessary tables', () => {
      // To check if tables exist, we can try to query their schema or count rows (0 for new tables)
      // This requires access to the 'db' instance from database.js.
      // For this test, we'll assume initDb works if no errors are thrown and default data is present.
      // A more robust check would involve querying sqlite_master.
      // For now, we'll verify by checking default data insertion.
      const jackpot = getJackpot();
      expect(jackpot).toBeDefined();

      const today = new Date().toISOString().split('T')[0];
      const target = getOrCreateDailyTargetPixel(); // This will also create if not exists
      expect(target).toBeDefined();
      expect(target.date).toBe(today);
    });

    it('should initialize jackpot_state with default values if empty', () => {
      const jackpot = getJackpot();
      expect(jackpot.current_amount).toBe(100.00);
      // Check other default fields if necessary (e.g., last_modified_by: 'system')
      // This requires modifying getJackpot or another function to return more fields,
      // or direct db query if db instance is exposed and used in tests.
    });

    it('should initialize daily_target for the current date if none exists', () => {
      const today = new Date().toISOString().split('T')[0];
      const target = getOrCreateDailyTargetPixel();
      expect(target.target_date || target.date).toBe(today); // target.date is what getOrCreateDailyTargetPixel returns
      expect(target.x).toBeTypeOf('number');
      expect(target.y).toBeTypeOf('number');
    });
  });

  describe('Jackpot Functions', () => {
    it('getJackpot should return the current jackpot amount', () => {
      const jackpot = getJackpot();
      expect(jackpot.current_amount).toBe(100.00); // Initial default
    });

    it('updateJackpot should correctly change the amount and version', () => {
      const newAmount = 150.75;
      const userId = 'test-user';

      // Get initial version (requires a more detailed getJackpot or direct DB query)
      // For now, just check if update is successful
      const updated = updateJackpot(newAmount, userId);
      expect(updated).toBe(true);

      const jackpot = getJackpot();
      expect(jackpot.current_amount).toBe(150.75);

      // To test version increment, we'd need to query jackpot_state directly
      // or have getJackpot return the version.
    });

    it('resetJackpot should set the amount to the base value', () => {
      updateJackpot(200.00, 'test-user'); // Change it first

      const baseAmount = 50.00;
      const userId = 'reset-user';
      const reset = resetJackpot(baseAmount, userId);
      expect(reset).toBe(true);

      const jackpot = getJackpot();
      expect(jackpot.current_amount).toBe(50.00);
    });
  });

  describe('getOrCreateDailyTargetPixel', () => {
    it('should create a new target if none exists for the day', () => {
      // This is implicitly tested by beforeEach and the initDb tests,
      // as initDb calls getOrCreateDailyTargetPixel internally (or similar logic).
      // To explicitly test creation vs. getting, we might need to manipulate dates or clear the table.
      const target = getOrCreateDailyTargetPixel();
      expect(target).toBeDefined();
      expect(target.x).toBeGreaterThanOrEqual(0);
      expect(target.x).toBeLessThanOrEqual(999);
      expect(target.y).toBeGreaterThanOrEqual(0);
      expect(target.y).toBeLessThanOrEqual(999);
      expect(target.date).toBe(new Date().toISOString().split('T')[0]);
    });

    it('should return an existing target if one exists for the day', () => {
      const initialTarget = getOrCreateDailyTargetPixel(); // Creates one
      const retrievedTarget = getOrCreateDailyTargetPixel(); // Should retrieve the same one

      expect(retrievedTarget.x).toBe(initialTarget.x);
      expect(retrievedTarget.y).toBe(initialTarget.y);
      expect(retrievedTarget.date).toBe(initialTarget.date);
    });
  });

  // TODO: Add tests for logJackpotHistory, forceNewDailyTarget, recordClickAttempt, hasAttemptedToday

  describe('logJackpotHistory', () => {
    it('should insert a history record correctly', () => {
      const previousAmount = 100.00;
    const newAmount = 100.001;
    const actionType = 'INCREMENT';
    const userId = 'test-user-history';

    const success = logJackpotHistory(previousAmount, newAmount, actionType, userId);
    expect(success).toBe(true);

    // Verify by querying the database directly
    const stmt = db.prepare('SELECT * FROM jackpot_history WHERE user_id = ?');
    const record = stmt.get(userId);

    expect(record).toBeDefined();
    expect(record.previous_amount).toBe(previousAmount);
    expect(record.new_amount).toBe(newAmount);
    expect(record.action_type).toBe(actionType);
    expect(record.user_id).toBe(userId);
    expect(record.timestamp).toBeTypeOf('string');
  });

  it('should allow multiple history records to be added', () => {
    logJackpotHistory(100, 101, 'INCREMENT', 'user1');
    logJackpotHistory(101, 102, 'INCREMENT', 'user2');

    const stmt = db.prepare('SELECT COUNT(*) as count FROM jackpot_history');
    const result = stmt.get();
    expect(result.count).toBe(2);
  });
});

describe('forceNewDailyTarget', () => {
  it('should create a new target for the current day', () => {
    const initialTarget = getOrCreateDailyTargetPixel(); // Ensures one might exist or gets created by init
    const newForcedTarget = forceNewDailyTarget();

    expect(newForcedTarget).toBeDefined();
    expect(newForcedTarget.date).toBe(new Date().toISOString().split('T')[0]);
    expect(newForcedTarget.x).not.toBe(initialTarget.x); // Or y, or check version if implemented fully
    expect(newForcedTarget.y).not.toBe(initialTarget.y);


    // Verify in DB
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare('SELECT * FROM daily_target WHERE target_date = ?');
    const dbTarget = stmt.get(today);
    expect(dbTarget.target_x).toBe(newForcedTarget.x);
    expect(dbTarget.target_y).toBe(newForcedTarget.y);
    // expect(dbTarget.version).toBeGreaterThan(initialTarget.version || 0); // if version was accessible
  });

  it('should replace an existing target and update version if called again on the same day', () => {
    forceNewDailyTarget(); // Call 1
    const stmt1 = db.prepare('SELECT * FROM daily_target WHERE target_date = ?');
    const target1 = stmt1.get(new Date().toISOString().split('T')[0]);
    const version1 = target1.version;

    forceNewDailyTarget(); // Call 2
    const stmt2 = db.prepare('SELECT * FROM daily_target WHERE target_date = ?');
    const target2 = stmt2.get(new Date().toISOString().split('T')[0]);
    const version2 = target2.version;

    expect(version2).toBe(version1 + 1);
    expect(target2.target_x).not.toBe(target1.target_x); // Or y
  });
});

describe('Click Attempt Functions', () => {
  const testIdentifier = 'test-ip-123';
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];


  it('hasAttemptedToday should return false for no attempt', () => {
    expect(hasAttemptedToday(testIdentifier, today)).toBe(false);
  });

  it('recordClickAttempt should insert an attempt and hasAttemptedToday should then return true', () => {
    const success = recordClickAttempt(testIdentifier, today);
    expect(success).toBe(true);
    expect(hasAttemptedToday(testIdentifier, today)).toBe(true);
  });

  it('hasAttemptedToday should return false for an attempt made on a different day', () => {
    recordClickAttempt(testIdentifier, today);
    expect(hasAttemptedToday(testIdentifier, tomorrow)).toBe(false);
  });

  it('recordClickAttempt should throw an error if attempting to record for the same identifier and date twice', () => {
    recordClickAttempt(testIdentifier, today); // First attempt
    expect(() => {
      recordClickAttempt(testIdentifier, today); // Second attempt
    }).toThrow(); // Expecting a unique constraint violation or similar
  });
});
// Ensure all test suites are within the main 'Database Module' describe block
});
