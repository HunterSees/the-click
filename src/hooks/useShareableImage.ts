import { useRef, useState, useCallback, useEffect } from 'react';
import { Click } from '../contexts/GameContext'; // Corrected import path for Click type

interface UseShareableImageProps {
  lastClick: Click | null;
  dayNumber: number;
  jackpot: number;
}

export const useShareableImage = ({ lastClick, dayNumber, jackpot }: UseShareableImageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareImageBlob, setShareImageBlob] = useState<Blob | null>(null);

  const clearImageData = useCallback(() => {
    if (shareImageUrl) {
      URL.revokeObjectURL(shareImageUrl);
    }
    setShareImageUrl(null);
    setShareImageBlob(null);
  }, [shareImageUrl]);

  const generateImage = useCallback(() => {
    if (!lastClick) {
      clearImageData(); // Clear any existing image if lastClick is null
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Start of canvas drawing logic (copied from ClickFeedback.tsx) ---
    const width = 500;
    const verticalSpacing = 20;
    canvas.width = width;
    const titleY = 40;
    const gridSize = 200;
    const gridX = (width - gridSize) / 2;
    const gridY = titleY + 30;
    const distanceTextY = gridY + gridSize + verticalSpacing * 2;
    const jackpotTextY = distanceTextY + verticalSpacing * 2;
    const websiteTextY = jackpotTextY + verticalSpacing * 2;
    const totalHeight = websiteTextY + verticalSpacing * 2;
    canvas.height = totalHeight;

    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, totalHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`The Click: Day ${dayNumber}`, width / 2, titleY);

    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.fillRect(gridX, gridY, gridSize, gridSize);

    ctx.strokeStyle = '#475569'; // slate-600
    ctx.lineWidth = 2;
    ctx.strokeRect(gridX, gridY, gridSize, gridSize);

    const normalizedX = Math.min(Math.max(lastClick.x / 1000, 0), 1);
    const normalizedY = Math.min(Math.max(lastClick.y / 1000, 0), 1);

    const markerX = gridX + normalizedX * gridSize;
    const markerY = gridY + normalizedY * gridSize;

    ctx.fillStyle = '#ef4444'; // red-500
    ctx.beginPath();
    ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('X', markerX, markerY);

    ctx.textBaseline = 'top';

    const formattedDistance = Math.round(lastClick.distance);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Distance: ${formattedDistance}px`, width / 2, distanceTextY);

    const formattedJackpot = jackpot.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    ctx.fillText(`Jackpot: $${formattedJackpot}`, width / 2, jackpotTextY);

    ctx.fillStyle = '#3b82f6'; // blue-500
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText('theclickgame.com', width / 2, websiteTextY);
    // --- End of canvas drawing logic ---

    canvas.toBlob((blob) => {
      if (blob) {
        // Revoke previous object URL before creating a new one
        if (shareImageUrl) {
          URL.revokeObjectURL(shareImageUrl);
        }
        setShareImageBlob(blob);
        const newObjectUrl = URL.createObjectURL(blob);
        setShareImageUrl(newObjectUrl);
      } else {
        // If blob creation fails, clear existing data
        clearImageData();
      }
    }, 'image/png');
  }, [lastClick, dayNumber, jackpot, clearImageData, shareImageUrl]); // Added shareImageUrl to deps of generateImage

  // Effect for unmount cleanup
  useEffect(() => {
    // This cleanup function will be called when the component using the hook unmounts
    return () => {
      clearImageData();
    };
  }, [clearImageData]); // clearImageData is stable due to its own useCallback deps

  return {
    canvasRef,
    shareImageUrl,
    shareImageBlob,
    generateImage,
    clearImageData,
  };
};
