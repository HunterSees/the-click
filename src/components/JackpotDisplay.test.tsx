import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import JackpotDisplay from './JackpotDisplay';
import { GameContext, GameContextType } from '../contexts/GameContext'; // Changed GameContextState to GameContextType
import * as socketService from '../services/socketService';

// Mock the socketService
vi.mock('../services/socketService', () => ({
  onJackpotUpdate: vi.fn(),
  onConnectionChange: vi.fn(),
  // Added initSocket and cleanupSocket as they might be called if JackpotDisplay uses them internally
  // or if other parts of context/useEffect chains call them.
  // Based on JackpotDisplay.tsx, these are not directly called by it, but good for future proofing if context evolves.
  initSocket: vi.fn(),
  cleanupSocket: vi.fn(),
}));

// Corrected mockGameContextValue to align with actual GameContextType
const mockGameContextValue: GameContextType = {
  jackpot: 1234567.89,
  setJackpot: vi.fn(),
  revealedTargetPixel: null,
  lastClick: null,
  hasClicked: false,
  setHasClicked: vi.fn(),
  dayNumber: 1, // Example day number
  registerClick: vi.fn(),
  devMode: false,
  isConnected: true, // Added isConnected
};

const renderWithContext = (ui: React.ReactElement, contextValue?: Partial<GameContextType>) => { // Allow partial for easier overrides
  const fullContextValue = { ...mockGameContextValue, ...contextValue };
  return render(
    <GameContext.Provider value={contextValue}>
      {ui}
    </GameContext.Provider>
  );
};

describe('JackpotDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the jackpot amount correctly formatted', () => {
    renderWithContext(<JackpotDisplay />, mockGameContextValue);
    // Check for integer part
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getAllByText('2')[0]).toBeInTheDocument(); // First '2'
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    // Check for decimal part
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    // Check for separators
    expect(screen.getAllByText(',')).toHaveLength(2); // Two commas
    expect(screen.getByText('.')).toBeInTheDocument(); // One decimal point
  });

  it('pads with leading zeros for smaller jackpot values', () => {
    const contextValue = { ...mockGameContextValue, jackpot: 123.45 };
    renderWithContext(<JackpotDisplay />, contextValue);
    // Expected: 0,000,123.45
    const digits = screen.getAllByText(/[0-9]/); // Get all elements with digits
    // Check segments based on the visual output
    // $ 0 , 0 0 0 , 1 2 3 . 4 5
    expect(digits[0].textContent).toBe('0'); // First digit of padded integer part
    expect(digits[1].textContent).toBe('0');
    expect(digits[2].textContent).toBe('0');
    expect(digits[3].textContent).toBe('0');
    expect(digits[4].textContent).toBe('1');
    expect(digits[5].textContent).toBe('2');
    expect(digits[6].textContent).toBe('3');
    expect(digits[7].textContent).toBe('4');
    expect(digits[8].textContent).toBe('5');
  });

  // Removed obsolete test for onJackpotUpdate/onConnectionChange calls from JackpotDisplay

  it('does not display "Connecting..." message when isConnected is true', () => {
    renderWithContext(<JackpotDisplay />, { ...mockGameContextValue, isConnected: true });
    expect(screen.queryByText('Connecting...')).toBeNull();
  });

  it('displays "Connecting..." message when isConnected is false', () => {
    renderWithContext(<JackpotDisplay />, { ...mockGameContextValue, isConnected: false });
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    expect(screen.getByText('Connecting...')).toHaveClass('animate-pulse');
  });
});
