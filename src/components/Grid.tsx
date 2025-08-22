import { useState, useRef, useEffect } from 'react';
import { useGameContext } from '../contexts/GameContext';
import ShareCard from './ShareCard';

const Grid = () => {
  const { registerClick, clicks, gameWon } = useGameContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const [showShareCard, setShowShareCard] = useState(false);
  
  // Setup and resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const updateCanvasSize = () => {
      const parentWidth = canvas.parentElement?.clientWidth || 500;
      const size = Math.min(parentWidth, 500);
      
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      
      const scale = window.devicePixelRatio || 1;
      canvas.width = size * scale;
      canvas.height = size * scale;
      
      setGridSize({ width: size, height: size });
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
      }
      
      drawCanvas();
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);
  
  // Redraw canvas when game state changes
  useEffect(() => {
    drawCanvas();
  }, [clicks, gameWon, gridSize]);

  // Show share card automatically when game is won
  useEffect(() => {
    if (gameWon) {
      const timer = setTimeout(() => {
        setShowShareCard(true);
      }, 500); // Delay to see the winning click
      return () => clearTimeout(timer);
    }
  }, [gameWon]);

  // Draw the canvas based on game state
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const displayWidth = gridSize.width;
    const displayHeight = gridSize.height;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    // The marker is no longer drawn. The user must remember their click.
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, displayWidth - 3, displayHeight - 3);
  };
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameWon) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const gridX = Math.floor((x / rect.width) * 1000);
    const gridY = Math.floor((y / rect.height) * 1000);
    
    registerClick(gridX, gridY);
  };

  const handleCloseShareCard = () => {
    setShowShareCard(false);
  };

  // Determine feedback message based on the last click
  let feedbackMessage = '';
  let colorClass = '';
  const lastClick = clicks.length > 0 ? clicks[clicks.length - 1] : null;
  
  if (lastClick && lastClick.distance !== -1) {
    const { distance } = lastClick;
    
    if (distance === 0) {
      feedbackMessage = 'JACKPOT! You found the exact pixel!';
      colorClass = 'text-yellow-400';
    } else if (distance < 5) {
      feedbackMessage = 'Incredibly close!';
      colorClass = 'text-emerald-400';
    } else if (distance < 20) {
      feedbackMessage = 'Very close!';
      colorClass = 'text-emerald-500';
    } else if (distance < 50) {
      feedbackMessage = 'Getting closer!';
      colorClass = 'text-blue-400';
    } else if (distance < 100) {
      feedbackMessage = 'Not bad!';
      colorClass = 'text-blue-500';
    } else {
      feedbackMessage = 'Keep trying!';
      colorClass = 'text-gray-400';
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {showShareCard && gameWon ? (
        <div className="w-full aspect-square flex items-center justify-center">
          <ShareCard onClose={handleCloseShareCard} />
        </div>
      ) : (
        <>
          <canvas 
            ref={canvasRef}
            onClick={handleClick}
            className={`w-full aspect-square ${
              gameWon ? 'cursor-default opacity-75' : 'cursor-pointer'
            }`}
          />
          
          {lastClick && lastClick.distance !== -1 && (
            <div className="text-center mt-6">
              <h2 className={`text-2xl font-bold ${colorClass} mb-2`}>
                {Math.round(lastClick.distance)} PIXELS AWAY
              </h2>
              <p className={`${colorClass} font-medium`}>{feedbackMessage}</p>
            </div>
          )}
          
          {clicks.length === 0 && (
            <div className="text-xs text-gray-400 mt-2 text-center">
              Click to find the secret pixel!
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Grid;