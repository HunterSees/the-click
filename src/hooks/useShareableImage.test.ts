import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useShareableImage } from './useShareableImage';
import { Click } from '../contexts/GameContext';

// Mock necessary browser APIs
const mockToBlob = vi.fn();

// Mock getContext to return a dummy context object
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  fillText: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  scale: vi.fn(),
  // toBlob is NOT a method of the 2D rendering context
} as any));

// toBlob is a method of HTMLCanvasElement
HTMLCanvasElement.prototype.toBlob = mockToBlob;

global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

const mockLastClick: Click = {
  x: 100,
  y: 200,
  distance: 50,
  timestamp: new Date().toISOString(),
};

// Adjusted to pass props directly to the hook as per its signature in useShareableImage.ts
// useShareableImage = ({ lastClick, dayNumber, jackpot }: UseShareableImageProps)
const hookProps = {
  lastClick: mockLastClick,
  dayNumber: 1,
  jackpot: 1000,
};

describe('useShareableImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configure mock implementations for each test
    mockToBlob.mockImplementation((callback) => {
      const fakeBlob = new Blob(['fakeImageData'], { type: 'image/png' });
      callback(fakeBlob);
    });
    (global.URL.createObjectURL as vi.Mock).mockReturnValue('blob:http://localhost/fake-object-url');
  });

  it('should initialize with null image data', () => {
    const { result } = renderHook(() => useShareableImage(hookProps));
    expect(result.current.shareImageUrl).toBeNull();
    expect(result.current.shareImageBlob).toBeNull();
  });

  it('should not generate image if lastClick is null', async () => {
    const { result } = renderHook(() => useShareableImage({ ...hookProps, lastClick: null }));

    // canvasRef.current would not be set by the hook itself, but by the component rendering the canvas.
    // However, generateImage checks lastClick first.
    await act(async () => {
      result.current.generateImage();
    });

    expect(mockToBlob).not.toHaveBeenCalled();
    expect(result.current.shareImageUrl).toBeNull();
    expect(result.current.shareImageBlob).toBeNull();
  });

  it('should generate image data when generateImage is called with valid lastClick', async () => {
    const { result } = renderHook(() => useShareableImage(hookProps));

    act(() => {
        // Simulate the canvas element being rendered and ref being attached
        (result.current.canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = document.createElement('canvas');
    });

    await act(async () => { // `generateImage` itself isn't async, but state updates are.
      result.current.generateImage();
    });

    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    expect(mockToBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(result.current.shareImageBlob).toBeInstanceOf(Blob);
    expect(result.current.shareImageUrl).toBe('blob:http://localhost/fake-object-url');
  });

  it('should revoke previous object URL when new image is generated', async () => {
    const { result } = renderHook(() => useShareableImage(hookProps));
    act(() => {
        (result.current.canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = document.createElement('canvas');
    });

    // Generate first image
    await act(async () => {
      result.current.generateImage();
    });
    const firstUrl = result.current.shareImageUrl;
    expect(firstUrl).toBe('blob:http://localhost/fake-object-url');

    // Generate second image
    (global.URL.createObjectURL as vi.Mock).mockReturnValue('blob:http://localhost/another-fake-url');
    await act(async () => {
      result.current.generateImage();
    });

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
    expect(result.current.shareImageUrl).toBe('blob:http://localhost/another-fake-url');
  });

  it('should clear image data and revoke URL on clearImageData call', async () => {
    const { result } = renderHook(() => useShareableImage(hookProps));
    act(() => {
        (result.current.canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = document.createElement('canvas');
    });

    await act(async () => {
      result.current.generateImage();
    });
    const imageUrl = result.current.shareImageUrl;
    expect(imageUrl).not.toBeNull();

    await act(async () => { // clearImageData involves state updates
      result.current.clearImageData();
    });

    expect(result.current.shareImageUrl).toBeNull();
    expect(result.current.shareImageBlob).toBeNull();
    if (imageUrl) { // Only expect revoke if imageUrl was set
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(imageUrl);
    }
  });

  it('should not call revokeObjectURL if no image was generated on clearImageData', async () => {
    const { result } = renderHook(() => useShareableImage(hookProps));

    await act(async () => {
      result.current.clearImageData();
    });

    expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('should clear image data on unmount if image was generated', async () => {
    const { result, unmount } = renderHook(() => useShareableImage(hookProps));
    act(() => {
        (result.current.canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = document.createElement('canvas');
    });

    await act(async () => {
      result.current.generateImage();
    });
    const imageUrl = result.current.shareImageUrl;
    expect(imageUrl).not.toBeNull();

    unmount();

    if (imageUrl) { // Only expect revoke if imageUrl was set
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(imageUrl);
    }
  });

  it('should not try to revoke if unmounted without image', () => {
    const { unmount } = renderHook(() => useShareableImage(hookProps));
    unmount();
    expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});
