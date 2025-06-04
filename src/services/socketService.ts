import { io, Socket } from 'socket.io-client';
import { formatDateKey } from '../utils/dateUtils';
import { LOCAL_STORAGE_CLICK_ATTEMPT_PREFIX } from '../constants'; // Import the constant

// Socket.io connection
let socket: Socket | null = null;
let reconnectInterval: number | null = null;
const RECONNECT_DELAY = 5000; // 5 seconds

// Event callbacks
type JackpotCallback = (amount: number) => void;
const jackpotCallbacks: JackpotCallback[] = [];

type ConnectionCallback = (status: boolean) => void;
const connectionCallbacks: ConnectionCallback[] = [];

type ClickResultCallback = (distance: number, targetX: number, targetY: number, success: boolean) => void;
const clickResultCallbacks: ClickResultCallback[] = [];

// Initialize WebSocket connection
export const initSocket = (): void => {
  if (socket) {
    socket.disconnect();
  }
  
  // Connect to the WebSocket server
  const socketUrl = import.meta.env.PROD 
    ? window.location.origin
    : 'http://localhost:3001';
  
  socket = io(socketUrl, {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket']
  });

  // Set up event listeners
  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
    notifyConnectionChange(true);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from WebSocket server');
    notifyConnectionChange(false);
    setupReconnect();
  });

  socket.on('connect_error', () => {
    console.log('WebSocket connection error');
    notifyConnectionChange(false);
    setupReconnect();
  });

  // Jackpot updates
  socket.on('jackpot_update', (data) => {
    if (typeof data.amount === 'number' || typeof data.amount === 'string') {
      const jackpotAmount = typeof data.amount === 'string' 
        ? parseFloat(data.amount) 
        : data.amount;
      notifyJackpotChange(jackpotAmount);
    }
  });
  
  // Click result from server
  socket.on('click_result', (data) => {
    if (typeof data.distance === 'number' && 
        typeof data.targetX === 'number' && 
        typeof data.targetY === 'number') {
      notifyClickResult(
        data.distance, 
        data.targetX, 
        data.targetY, 
        data.success || false
      );
    }
  });

  // Heartbeat response
  socket.on('heartbeat', () => {
    socket?.emit('heartbeat_response');
  });
  
  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
};

// Reconnect logic
const setupReconnect = (): void => {
  if (reconnectInterval) return;

  reconnectInterval = window.setInterval(() => {
    console.log('Attempting to reconnect...');
    initSocket();
  }, RECONNECT_DELAY);
};

// Register for jackpot updates
export const onJackpotUpdate = (callback: JackpotCallback): void => {
  jackpotCallbacks.push(callback);
};

// Register for connection status updates
export const onConnectionChange = (callback: ConnectionCallback): void => {
  connectionCallbacks.push(callback);
};

// Register for click result updates
export const onClickResult = (callback: ClickResultCallback): void => {
  clickResultCallbacks.push(callback);
};

// Notify all registered callbacks about jackpot changes
const notifyJackpotChange = (amount: number): void => {
  jackpotCallbacks.forEach(callback => callback(amount));
};

// Notify all registered callbacks about connection changes
const notifyConnectionChange = (status: boolean): void => {
  connectionCallbacks.forEach(callback => callback(status));
};

// Notify all registered callbacks about click results
const notifyClickResult = (distance: number, targetX: number, targetY: number, success: boolean): void => {
  clickResultCallbacks.forEach(callback => callback(distance, targetX, targetY, success));
};

// Register a click
export const registerClick = (x: number, y: number): void => {
  if (socket?.connected) {
    socket.emit('click', { x, y });
  } else {
    console.error('Socket not connected. Queuing click to send upon reconnection.');
    // Queue for when connection is restored
    const onceConnected = (status: boolean) => {
      if (status) {
        socket?.emit('click', { x, y });
        // Remove this one-time handler after execution
        const index = connectionCallbacks.indexOf(onceConnected);
        if (index > -1) {
          connectionCallbacks.splice(index, 1);
        }
      }
    };
    onConnectionChange(onceConnected);
  }
};

// Check if today's click is already registered
export const checkTodaysClick = (): boolean => {
  const todayKey = formatDateKey(new Date());
  try {
    const attemptData = localStorage.getItem(`${LOCAL_STORAGE_CLICK_ATTEMPT_PREFIX}${todayKey}`);
    return attemptData !== null;
  } catch (error) {
    console.error("Error reading from localStorage in checkTodaysClick:", error);
    return false; // Indicate failure to check or no data
  }
};

// Cleanup function
export const cleanupSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
};