import { useState, useRef, useEffect, memo, lazy, Suspense } from 'react'; // Import memo, lazy, Suspense
import { HelpCircle, User } from 'lucide-react';
// import HowToPlayModal from './HowToPlayModal'; // Original import

const HowToPlayModal = lazy(() => import('./HowToPlayModal')); // Lazy import

const HeaderComponent = () => { // Renamed for memo
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const howToPlayButtonRef = useRef<HTMLButtonElement>(null);
  const prevIsHowToPlayOpenRef = useRef<boolean>(isHowToPlayOpen);

  useEffect(() => {
    // Check if the modal was open and is now closed
    if (prevIsHowToPlayOpenRef.current && !isHowToPlayOpen) {
      howToPlayButtonRef.current?.focus();
    }
    // Update the ref with the current state for the next render
    prevIsHowToPlayOpenRef.current = isHowToPlayOpen;
  }, [isHowToPlayOpen]);

  return (
    <header className="py-4">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex-1">
          <button className="text-white" aria-label="Open menu">
            <span className="text-2xl">☰</span>
          </button>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-white flex items-center">
            <span>THE</span>
            <span className="ml-2">CLIC<span className="text-[#FF0000]">X</span></span>
          </div>
          <p className="text-sm text-white mt-1">One shot. Every day. Jackpot.</p>
        </div>
        
        <div className="flex-1 flex items-center justify-end gap-4">
          <button
            ref={howToPlayButtonRef}
            onClick={() => setIsHowToPlayOpen(true)}
            className="text-white"
            aria-label="How to Play"
          >
            <HelpCircle size={24} />
          </button>
          
          <button 
            className="text-white"
            aria-label="User Profile" // Assuming this might also open a modal one day, could have its own ref
          >
            <User size={24} />
          </button>
        </div>
      </div>
      
      {isHowToPlayOpen && (
        <Suspense fallback={<div aria-busy="true" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white z-50">Loading How to Play...</div>}>
          <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />
        </Suspense>
      )}
    </header>
  );
};

export default memo(HeaderComponent); // Wrap with memo