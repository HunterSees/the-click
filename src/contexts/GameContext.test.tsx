import React, { useContext } from 'react';
import { render, act, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameProvider, useGameContext, GameContextType, Click } from './GameContext'; // Import Click if needed for casting
import * as socketService from '../services/socketService';
import * as dateUtils from '../utils/dateUtils';
import { LOCAL_STORAGE_CLICK_ATTEMPT_PREFIX } from '../constants';

// Mocks
vi.mock('../services/socketService', () => ({
  initSocket: vi.fn(),
  registerClick: vi.fn(), // Renamed to avoid conflict: socketRegisterClick in source
  onJackpotUpdate: vi.fn(),
  onClickResult: vi.fn(),
  onConnectionChange: vi.fn(),
}));

vi.mock('../utils/dateUtils', async () => {
  const actual = await vi.importActual('../utils/dateUtils');
  return {
    ...actual, // Keep other functions like formatDateKey
    getCurrentDayNumber: vi.fn(),
  };
});

// Helper component to consume and display context values
const TestConsumer: React.FC<{ selector?: (context: GameContextType) => any }> = ({ selector }) => {
  const context = useGameContext();
  if (selector) {
    const selectedValue = selector(context);
    return <div>{JSON.stringify(selectedValue)}</div>;
  }
  return <div>{JSON.stringify(context)}</div>;
};


describe('GameContext', () => {
  let mockGetItem: ReturnType<typeof vi.spyOn>;
  let mockSetItem: ReturnType<typeof vi.spyOn>;
  const initialDayNumber = 20230101; // Example

  beforeEach(() => {
    vi.clearAllMocks();
    (dateUtils.getCurrentDayNumber as vi.Mock).mockReturnValue(initialDayNumber);

    mockGetItem = vi.spyOn(Storage.prototype, 'getItem');
    mockSetItem = vi.spyOn(Storage.prototype, 'setItem');

    // Default localStorage mocks
    mockGetItem.mockReturnValue(null); // No existing data by default
    mockSetItem.mockClear();

    // Mock window.location.search for devMode tests
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers(); // Ensure real timers are restored
  });

  it('provides initial context values', () => {
    render(
      <GameProvider>
        <TestConsumer selector={(ctx) => ({ jackpot: ctx.jackpot, dayNumber: ctx.dayNumber, devMode: ctx.devMode })} />
      </GameProvider>
    );
    expect(screen.getByText(JSON.stringify({ jackpot: 100.00, dayNumber: initialDayNumber, devMode: false }))).toBeInTheDocument();
  });

  it('detects devMode=true from URL search params', () => {
    Object.defineProperty(window, 'location', { value: { search: '?dev=true' }, writable: true });
    render(
      <GameProvider>
        <TestConsumer selector={(ctx) => ctx.devMode} />
      </GameProvider>
    );
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('hydrates lastClick and hasClicked from localStorage if data exists', () => {
    const todayKey = dateUtils.formatDateKey(new Date());
    const mockStoredClick: Click = { x: 1, y: 2, distance: 3, timestamp: 'test-ts' };
    mockGetItem.mockImplementation((key) => {
      if (key === `${LOCAL_STORAGE_CLICK_ATTEMPT_PREFIX}${todayKey}`) {
        return JSON.stringify(mockStoredClick);
      }
      return null;
    });

    render(
      <GameProvider>
        <TestConsumer selector={(ctx) => ({ lastClick: ctx.lastClick, hasClicked: ctx.hasClicked })} />
      </GameProvider>
    );
    expect(screen.getByText(JSON.stringify({ lastClick: mockStoredClick, hasClicked: true }))).toBeInTheDocument();
  });

  describe('registerClick', () => {
    it('updates lastClick, hasClicked, calls socketService, and sets localStorage (non-devMode)', () => {
      let capturedContext: GameContextType | null = null;
      render(
        <GameProvider>
          <TestConsumer selector={(ctx) => { capturedContext = ctx; return null;}} />
        </GameProvider>
      );

      const clickX = 100, clickY = 200;
      act(() => {
        capturedContext!.registerClick(clickX, clickY);
      });

      expect(capturedContext!.lastClick?.x).toBe(clickX);
      expect(capturedContext!.lastClick?.y).toBe(clickY);
      expect(capturedContext!.lastClick?.distance).toBe(-1); // Initial distance
      expect(capturedContext!.hasClicked).toBe(true);
      expect(socketService.registerClick).toHaveBeenCalledWith(clickX, clickY);

      const todayKey = dateUtils.formatDateKey(new Date());
      expect(mockSetItem).toHaveBeenCalledWith(
        `${LOCAL_STORAGE_CLICK_ATTEMPT_PREFIX}${todayKey}`,
        JSON.stringify(capturedContext!.lastClick)
      );
    });

    it('does not set localStorage in devMode', () => {
      Object.defineProperty(window, 'location', { value: { search: '?dev=true' }, writable: true });
      let capturedContext: GameContextType | null = null;
      render(
        <GameProvider>
          <TestConsumer selector={(ctx) => { capturedContext = ctx; return null;}} />
        </GameProvider>
      );
      act(() => {
        capturedContext!.registerClick(100, 200);
      });
      expect(mockSetItem).not.toHaveBeenCalled();
    });
  });

  it('handles jackpot updates from socketService', () => {
    let capturedOnJackpotUpdateCallback: ((amount: number) => void) | null = null;
    (socketService.onJackpotUpdate as vi.Mock).mockImplementation((callback) => {
      capturedOnJackpotUpdateCallback = callback;
    });

    let capturedContext: GameContextType | null = null;
    render(
      <GameProvider>
        <TestConsumer selector={(ctx) => { capturedContext = ctx; return ctx.jackpot; }} />
      </GameProvider>
    );
    expect(screen.getByText('100')).toBeInTheDocument(); // Initial jackpot

    act(() => {
      capturedOnJackpotUpdateCallback!(150.50);
    });
    expect(screen.getByText('150.5')).toBeInTheDocument(); // Updated jackpot
  });

  it('handles click results from socketService and updates localStorage', () => {
    let capturedOnClickResultCallback: ((distance: number, targetX: number, targetY: number, success: boolean) => void) | null = null;
    (socketService.onClickResult as vi.Mock).mockImplementation((callback) => {
      capturedOnClickResultCallback = callback;
    });

    let capturedContext: GameContextType | null = null;
    render(
      <GameProvider>
        <TestConsumer selector={(ctx) => { capturedContext = ctx; return null; }} />
      </GameProvider>
    );

    // Initial click to set up lastClick structure
    act(() => {
      capturedContext!.registerClick(10, 20);
    });
    const initialLastClick = capturedContext!.lastClick;

    act(() => {
      capturedOnClickResultCallback!(75, 500, 600, false);
    });

    expect(capturedContext!.revealedTargetPixel).toEqual({ x: 500, y: 600 });
    expect(capturedContext!.lastClick?.distance).toBe(75);
    expect(capturedContext!.lastClick?.x).toBe(initialLastClick?.x); // x, y, timestamp should remain from initial click

    const todayKey = dateUtils.formatDateKey(new Date());
    expect(mockSetItem).toHaveBeenCalledWith(
      `${LOCAL_STORAGE_CLICK_ATTEMPT_PREFIX}${todayKey}`,
      JSON.stringify(capturedContext!.lastClick)
    );
  });

  it('updates dayNumber when interval detects a new day', () => {
    vi.useFakeTimers();
    (dateUtils.getCurrentDayNumber as vi.Mock).mockReturnValue(1);

    render(
      <GameProvider>
        <TestConsumer selector={(ctx) => ctx.dayNumber} />
      </GameProvider>
    );
    expect(screen.getByText('1')).toBeInTheDocument();

    // Simulate day changing
    (dateUtils.getCurrentDayNumber as vi.Mock).mockReturnValue(2);
    act(() => {
      vi.advanceTimersByTime(60000); // Advance by 1 minute (interval duration)
    });

    expect(screen.getByText('2')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
