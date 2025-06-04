import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Client from 'socket.io-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import what we need from our server/index.js & database.js
import { configureAndStartServer } from '../index.js'; // Use the new function
import { closeDb, db as actualDb } from '../database.js'; // db for verification, initDb is handled by server

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DB_DIR = path.join(__dirname, 'test_data');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'server_integration_test_database.db'); // Must match index.js for NODE_ENV=test

describe('Server Integration Tests', () => {
  // These are effectively replaced by runningServer properties
  // let clientSocket; // Removed this one
  // let testHttpServer;
  // let testIo;

  let runningServer; // Will hold { httpServer, io, app, autoIncrementIntervalId }
  let serverAddress;
  const TEST_PORT = 3004;
  let clientSocket;

  // No top-level beforeAll for server start; will be per test.
  // No top-level afterAll for server stop; will be per test.

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
     // Clean up old test database file if it exists to ensure fresh state
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    try {
      runningServer = await configureAndStartServer(TEST_PORT);
      serverAddress = `http://localhost:${TEST_PORT}`;
    } catch (error) {
      console.error("Failed to start server for test:", error);
      throw error;
    }
    // Client connection will now be part of each test case or a nested beforeEach if all tests need it identically
  });

  afterEach(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    // Clear the server's auto-increment interval
    if (runningServer && runningServer.autoIncrementIntervalId) {
      clearInterval(runningServer.autoIncrementIntervalId);
    }
    if (runningServer && runningServer.io) {
      await new Promise(resolve => setTimeout(resolve, 50));
      runningServer.io.close();
    }
    if (runningServer && runningServer.httpServer && runningServer.httpServer.listening) {
      await new Promise(resolve => runningServer.httpServer.close(resolve));
    }
    if (actualDb && actualDb.open) {
      closeDb();
    }
     if (fs.existsSync(TEST_DB_PATH)) {
      // fs.unlinkSync(TEST_DB_PATH); // Optional: clean up test DB after each test
    }
  });

  it('should allow a client to connect and receive initial jackpot update', () => {
    return new Promise((resolve, reject) => {
      clientSocket = Client(serverAddress, { forceNew: true, timeout: 7000 });
      const testTimeout = setTimeout(() => reject(new Error('Test timeout: initial jackpot_update not received')), 7000);

      // Listener for the event we are testing
      clientSocket.on('jackpot_update', (data) => {
        clearTimeout(testTimeout);
        try {
          expect(data).toBeDefined();
          expect(data.amount).toBe(100.00);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      clientSocket.on('connect_error', (err) => {
        clearTimeout(testTimeout);
        reject(err);
      });
       clientSocket.on('error', (err) => { // Catch generic socket errors
        clearTimeout(testTimeout);
        reject(err);
      });
    });
  }, 8000);

  it('should process a basic click (miss), update jackpot, and log attempt/history', () => {
    return new Promise((resolve, reject) => {
      clientSocket = Client(serverAddress, { forceNew: true, timeout: 7000 });
      const clickData = { x: 10, y: 10 };
      let initialJackpotAmount = 0;
      let clickResultReceived = false;
      let jackpotUpdateAfterClickReceived = false;

      const testTimeout = setTimeout(() => reject(new Error("Test timeout waiting for click events")), 7000);

      clientSocket.on('connect', () => {
        // Wait for initial jackpot update before clicking
        clientSocket.once('jackpot_update', (data) => {
          initialJackpotAmount = data.amount;
          clientSocket.emit('click', clickData); // Emit click after getting initial state
        });
      });

      clientSocket.on('click_result', (result) => {
        expect(result).toBeDefined();
        expect(result.success).toBe(false);
        expect(result.distance).toBeGreaterThan(0);
        clickResultReceived = true;
        if (clickResultReceived && jackpotUpdateAfterClickReceived) {
          clearTimeout(testTimeout);
          resolve();
        }
      });

      const jackpotUpdateListener = (update) => {
        // Ensure we are checking an update *after* the initial one and click
        if (update.amount !== initialJackpotAmount && clickResultReceived) {
          expect(update.amount).toBeCloseTo(initialJackpotAmount + 0.001, 5);
          jackpotUpdateAfterClickReceived = true;
          clientSocket.off('jackpot_update', jackpotUpdateListener);
          if (clickResultReceived && jackpotUpdateAfterClickReceived) {
            clearTimeout(testTimeout);
            resolve();
          }
        }
      };
      clientSocket.on('jackpot_update', jackpotUpdateListener);

      clientSocket.on('connect_error', (err) => { clearTimeout(testTimeout); reject(err); });
      clientSocket.on('error', (err) => { clearTimeout(testTimeout); reject(err); });
    });
  }, 8000);

  it('should prevent a second click attempt on the same day', () => {
    return new Promise((resolve, reject) => {
      clientSocket = Client(serverAddress, { forceNew: true, timeout: 7000 });
      const clickData1 = { x: 20, y: 20 };
      const clickData2 = { x: 30, y: 30 };
      let errorReceived = false;

      const testTimeout = setTimeout(() => {
        if (!errorReceived) reject(new Error("Timeout: Did not receive daily attempt limit error."));
      }, 7000);

      clientSocket.on('connect', () => {
        clientSocket.emit('click', clickData1); // First click
      });

      clientSocket.once('click_result', () => { // After first click result
        clientSocket.emit('click', clickData2); // Attempt second click
      });

      clientSocket.on('error', (error) => {
        if (error.message === 'You have already made your attempt for today.') {
          errorReceived = true;
          clearTimeout(testTimeout);
          resolve();
        } else {
          clearTimeout(testTimeout);
          reject(new Error(`Unexpected error: ${error.message}`));
        }
      });
      clientSocket.on('connect_error', (err) => { clearTimeout(testTimeout); reject(err); });
    });
  }, 8000);

});
