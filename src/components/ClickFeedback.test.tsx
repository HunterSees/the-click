import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ClickFeedbackComponent from './ClickFeedback'; // Testing the unwrapped component
import { GameContext, GameContextType } from '../contexts/GameContext';
import * as useShareableImageHook from '../hooks/useShareableImage'; // To mock the hook
import { Click } from '../contexts/GameContext';

// Mock the useShareableImage hook
const mockGenerateImage = vi.fn();
const mockClearImageData = vi.fn();
const mockUseShareableImage = vi.spyOn(useShareableImageHook, 'useShareableImage');

// Mock the lazy-loaded ShareModal
vi.mock('./ShareModal', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: vi.fn(({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="mock-share-modal">Mock Share Modal <button onClick={onClose}>Close Mock</button></div> : null
  ),
}));


const mockLastClick: Click = { x: 10, y: 10, distance: 5, timestamp: 'ts' };
const mockNoClick: Click | null = null;

const gameContextValueBase: GameContextType = {
  lastClick: mockLastClick,
  hasClicked: true,
  dayNumber: 1,
  jackpot: 1000,
  setJackpot: vi.fn(),
  revealedTargetPixel: null,
  setHasClicked: vi.fn(),
  registerClick: vi.fn(),
  devMode: false,
};

const renderWithContext = (ui: React.ReactElement, contextValue: Partial<GameContextType> = {}) => {
  return render(
    <GameContext.Provider value={{ ...gameContextValueBase, ...contextValue } as GameContextType}>
      {ui}
    </GameContext.Provider>
  );
};


describe('ClickFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseShareableImage.mockReturnValue({
      canvasRef: { current: null }, // Mock canvasRef if needed for direct interactions
      shareImageUrl: null,
      shareImageBlob: null,
      generateImage: mockGenerateImage,
      clearImageData: mockClearImageData,
    });
  });

  it('renders nothing if hasClicked is false', () => {
    renderWithContext(<ClickFeedbackComponent />, { hasClicked: false, lastClick: mockNoClick });
    expect(screen.queryByText(/PIXELS AWAY/)).toBeNull();
  });

  it('renders nothing if lastClick is null', () => {
    renderWithContext(<ClickFeedbackComponent />, { hasClicked: true, lastClick: mockNoClick });
    expect(screen.queryByText(/PIXELS AWAY/)).toBeNull();
  });

  it('renders feedback message and distance when clicked', () => {
    renderWithContext(<ClickFeedbackComponent />, { lastClick: { ...mockLastClick, distance: 3 } });
    expect(screen.getByText(/3 PIXELS AWAY/)).toBeInTheDocument();
    expect(screen.getByText('Incredibly close!')).toBeInTheDocument();
  });

  it('renders different feedback message for larger distance', () => {
    renderWithContext(<ClickFeedbackComponent />, { lastClick: { ...mockLastClick, distance: 150 } });
    expect(screen.getByText(/150 PIXELS AWAY/)).toBeInTheDocument();
    expect(screen.getByText('Try again tomorrow!')).toBeInTheDocument();
  });

  it('opens ShareModal and calls generateImage when "Share Result" button is clicked', async () => {
    renderWithContext(<ClickFeedbackComponent />);

    const shareButton = screen.getByLabelText('Share your result');
    fireEvent.click(shareButton);

    // Check if ShareModal is rendered (via its mock)
    // Need to wait for Suspense to resolve if ShareModal is truly lazy loaded in test
    // For a simple mock like above, it might be immediate.
    // If using React.lazy, we might need findByTestId
    expect(await screen.findByTestId('mock-share-modal')).toBeInTheDocument();
    expect(mockGenerateImage).toHaveBeenCalledTimes(1);
  });

  it('closes ShareModal and calls clearImageData when onClose is triggered from ShareModal', async () => {
    renderWithContext(<ClickFeedbackComponent />);

    // Open the modal first
    const shareButton = screen.getByLabelText('Share your result');
    fireEvent.click(shareButton);

    // Wait for modal to appear
    const mockModal = await screen.findByTestId('mock-share-modal');
    expect(mockModal).toBeInTheDocument();

    // Simulate closing the modal by finding the "Close Mock" button in our mock
    const closeButtonInMockModal = screen.getByText('Close Mock');
    fireEvent.click(closeButtonInMockModal);

    // Check if modal is removed
    // With how the mock is set up, it will return null when isOpen is false
    // which effectively removes it from the DOM query.
    expect(screen.queryByTestId('mock-share-modal')).toBeNull();
    expect(mockClearImageData).toHaveBeenCalledTimes(1);
  });

  it('passes correct props to ShareModal', async () => {
    mockUseShareableImage.mockReturnValue({
      canvasRef: { current: null },
      shareImageUrl: 'test-url',
      shareImageBlob: new Blob(['test']),
      generateImage: mockGenerateImage,
      clearImageData: mockClearImageData,
    });
    renderWithContext(<ClickFeedbackComponent />, { dayNumber: 5, jackpot: 1234 });

    fireEvent.click(screen.getByLabelText('Share your result'));
    await screen.findByTestId('mock-share-modal'); // Ensure modal is loaded

    const ShareModalMock = await vi.importMock('./ShareModal').then(m => m.default) as ReturnType<typeof vi.fn>;

    expect(ShareModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        shareImageUrl: 'test-url',
        dayNumber: 5,
        // Check other important props that are passed
      }),
      expect.anything() // Second argument to functional component is ref, can ignore
    );
  });

});
