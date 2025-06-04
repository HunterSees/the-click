import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { 
  // Database functions are now primarily used by gameService.js
  // We still need initDb, getJackpot, and getOrCreateDailyTargetPixel.
  initDb, 
  getJackpot,
  getOrCreateDailyTargetPixel, // Re-add this import
  // No longer directly used here:
  // db, updateJackpot, resetJackpot, logJackpotHistory,
  // forceNewDailyTarget, recordClickAttempt, hasAttemptedToday
} from './database.js';
import cors from 'cors';
import { handleClick, performAutoIncrement } from './services/gameService.js'; // Import gameService functions

import path, { dirname as pathDirname } from 'path'; // For test DB path
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathDirname(__filename);

// Determine DB path based on NODE_ENV
const TEST_DB_DIR = path.join(__dirname, 'tests', 'test_data'); // Consistent with unit tests
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'server_integration_test_database.db');
const PROD_DB_PATH = undefined; // Uses default path in database.js

const dbPathToUse = process.env.NODE_ENV === 'test' ? TEST_DB_PATH : PROD_DB_PATH;

// REMOVED: const dbPathToUse = process.env.NODE_ENV === 'test' ? TEST_DB_PATH : PROD_DB_PATH;

const app = express();
app.use(cors());
app.use(express.json());

// Global set for connected clients, accessible by health check
let connectedClients = new Set();

// Constants for intervals
const HEARTBEAT_INTERVAL = 30000;
const AUTO_INCREMENT_INTERVAL = 300000;

async function configureAndStartServer(portToListenOn) {
  // Initialize DB for this server instance. initDb sets a module-global 'db' in database.js
  await initDb(dbPathToUse);

  const httpServerInstance = createServer(app);
  const ioInstance = new Server(httpServerInstance, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  console.log('Database initialized, setting up Socket.IO handlers and intervals for this server instance.');

  ioInstance.on('connection', async (socket) => {
    console.log(`Client connected: ${socket.id} to server on port ${portToListenOn}`);
    connectedClients.add(socket.id);

    const targetPixel = getOrCreateDailyTargetPixel();
    // console.log(`Current target for ${targetPixel.date}: (${targetPixel.x}, ${targetPixel.y})`);

    // Send initial jackpot state
    const initialJackpot = getJackpot(); // Still needed for initial emit
    socket.emit('jackpot_update', { amount: initialJackpot.current_amount });

    socket.on('click', (data) => { // Removed async as handleClick is now synchronous
      const userIp = socket.handshake.address;
      // const userId = socket.id;

      if (data === null || typeof data.x !== 'number' || typeof data.y !== 'number') {
          socket.emit('error', { message: 'Invalid click data. Coordinates x and y are required.' });
          return;
      }
      const { x, y } = data;

      if (
        !Number.isInteger(x) || !Number.isInteger(y) ||
        x < 0 || x > 999 || y < 0 || y > 999
      ) {
        socket.emit('error', { message: 'Invalid coordinates. Coordinates must be integers between 0 and 999.' });
        return;
      }

      try {
        const result = handleClick(x, y, userIp); // Call synchronous gameService function

        if (result.status === 'success') {
          socket.emit('click_result', { 
            distance: result.distance,
            targetX: result.targetX,
            targetY: result.targetY,
            success: result.type === 'win'
          });

          if (result.type === 'win') {
            ioInstance.emit('jackpot_update', { amount: result.newBaseJackpotAmount });
            ioInstance.emit('jackpot_won', { amount: result.wonAmount, timestamp: new Date().toISOString() });
          } else { // miss
            ioInstance.emit('jackpot_update', { amount: result.newJackpotAmount });
          }
        } else { // result.status === 'error'
          socket.emit('error', { message: result.message });
        }
      } catch (error) { // Catch unexpected errors from gameService or other issues
        console.error(`Critical error processing click on port ${portToListenOn} for user ${userIp}:`, error);
        socket.emit('error', { message: 'An unexpected server error occurred.' });
      }
    });

    const heartbeatIntervalId = setInterval(() => {
      socket.emit('heartbeat');
    }, HEARTBEAT_INTERVAL);

    socket.on('heartbeat_response', () => {
      // console.log(`Heartbeat received from ${socket.id}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id} from server on port ${portToListenOn}`);
      connectedClients.delete(socket.id);
      clearInterval(heartbeatIntervalId);
    });
  });

  const autoIncrementTimer = setInterval(async () => {
    try {
      const result = performAutoIncrement(); // Call the gameService
      if (result.status === 'success') {
        ioInstance.emit('jackpot_update', { amount: result.newJackpotAmount });
      } else {
        console.error(`Auto increment failed on port ${portToListenOn}:`, result.message);
      }
    } catch (error) {
      console.error(`Critical error in auto increment on port ${portToListenOn}:`, error);
    }
  }, AUTO_INCREMENT_INTERVAL);

  return new Promise((resolve, reject) => {
    httpServerInstance.listen(portToListenOn, () => {
      console.log(`Server configured and running on port ${portToListenOn}`);
      // Return the interval ID so it can be cleared in tests
      resolve({ httpServer: httpServerInstance, io: ioInstance, app, autoIncrementIntervalId: autoIncrementTimer });
    });
    httpServerInstance.on('error', reject);
  });
}

export { configureAndStartServer, app }; // app is global, configureAndStartServer is the main way to get a server


// API endpoints (can be defined once as they use the global 'app')
app.get('/api/jackpot', (req, res) => { // No async needed
  try {
    const jackpot = getJackpot(); // Synchronous
    res.json({ amount: jackpot.current_amount });
  } catch (error) {
    console.error('Error fetching jackpot via API:', error);
    res.status(500).json({ error: 'Failed to fetch jackpot' });
  }
});

// System health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    clients: connectedClients.size,
    uptime: process.uptime()
  });
});

// Simple route to check if server is running
app.get('/', (req, res) => {
  res.send('The Click API Server is running');
});

// Start server only if not in test environment or if this file is run directly
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001;
  // The main dbInitializationPromise for production is implicitly handled by configureAndStartServer
  configureAndStartServer(PORT).catch(err => {
    console.error("Failed to start server for production:", err);
    process.exit(1);
  });
}