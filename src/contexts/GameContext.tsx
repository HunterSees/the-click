import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { formatDateKey, getCurrentDayNumber } from '../utils/dateUtils';
import { 
  initSocket, 
  registerClick as socketRegisterClick,
  onJackpotUpdate, 
  onClickResult,
  onConnectionChange 
} from '../services/socketService';

interface Click {
  x: number;
  y: number;
  distance: number;
  timestamp: string;
}

interface GameContextType {
  jackpot: number;
  setJackpot: (value: number) => void;
  clicks: Click[];
  gameWon: boolean;
  dayNumber: number;
  registerClick: (x: number, y: number) => void;
  devMode: boolean;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [jackpot, setJackpot] = useState(100.00); // Starting jackpot value of $100
  const [dayNumber] = useState(getCurrentDayNumber());
  const [clicks, setClicks] = useState<Click[]>([]);
  const [gameWon, setGameWon] = useState(false);
  const [devMode, setDevMode] = useState(false);

  // Initialize WebSocket connection and set devMode
  useEffect(() => {
    initSocket();
    const queryParams = new URLSearchParams(window.location.search);
    setDevMode(queryParams.get('dev') === 'true');
  }, []);

  // Listen for jackpot updates and other events
  useEffect(() => {
    onJackpotUpdate((amount) => {
      setJackpot(amount);
    });

    // Listen for click results from server
    onClickResult((distance, success) => {
      setClicks(prevClicks => {
        const newClicks = [...prevClicks];
        const lastClickIndex = newClicks.length - 1;
        
        if (lastClickIndex >= 0) {
          newClicks[lastClickIndex] = {
            ...newClicks[lastClickIndex],
            distance: distance,
          };
        }

        return newClicks;
      });

      // Check for win condition
      if (distance === 0) {
        setGameWon(true);
      }
    });
    
    // Monitor connection status
    onConnectionChange((status) => {
      console.log(`Connection status: ${status ? 'connected' : 'disconnected'}`);
    });
  }, []);

  const registerClick = useCallback((x: number, y: number) => {
    if (gameWon) return; // Don't allow clicks after winning

    // Create initial click data without distance
    const clickData: Click = {
      x,
      y,
      distance: -1, // Placeholder until server responds
      timestamp: new Date().toISOString(),
    };
    
    setClicks(prevClicks => [...prevClicks, clickData]);
    
    // Send click to server for processing
    socketRegisterClick(x, y);
  }, [gameWon]);

  const value = {
    jackpot,
    setJackpot,
    clicks,
    gameWon,
    dayNumber,
    registerClick,
    devMode,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}