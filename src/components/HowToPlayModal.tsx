import { useEffect, useRef, memo } from 'react'; // Import memo
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, MousePointerClick, Clock, Calendar, Award } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HowToPlayModalComponent = ({ isOpen, onClose }: HowToPlayModalProps) => { // Renamed for memo
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Close when clicking outside the modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Focus trapping logic
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
      document.addEventListener('keydown', handleKeyDown);
    } else {
      // This part of the else is effectively handled by the cleanup function if isOpen becomes false
      // document.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-80"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-[#111111] rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="howToPlayModalTitle"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 id="howToPlayModalTitle" className="text-2xl font-bold text-white flex items-center">
                  <Target className="text-[#FF0000] mr-2" size={24} />
                  How to Play
                </h2>
                <button 
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#222222]"
                  aria-label="Close How to Play modal" // Added aria-label for clarity
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-[#222222] rounded-lg p-4">
                  <h3 className="font-semibold text-[#FF0000] mb-2 flex items-center">
                    <MousePointerClick className="mr-2" size={18} />
                    Basic Rules
                  </h3>
                  <p className="text-gray-200 text-sm">
                    The Click is a daily pixel challenge where you get ONE chance to click as close as possible to a hidden target pixel.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex">
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="bg-[#FF0000] text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">1</div>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Click Anywhere on the Grid</h4>
                      <p className="text-gray-300 text-sm">You get one attempt per day. Choose your pixel wisely!</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="bg-[#FF0000] text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">2</div>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">See How Close You Got</h4>
                      <p className="text-gray-300 text-sm">After clicking, you'll see how many pixels away from the target you were.</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="bg-[#FF0000] text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">3</div>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Win the Jackpot</h4>
                      <p className="text-gray-300 text-sm">Hit the exact target pixel to win the entire jackpot!</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Calendar className="text-[#FF0000] mr-2 flex-shrink-0" size={18} />
                    <p className="text-sm text-gray-300">The target pixel changes every day at midnight.</p>
                  </div>
                  
                  <div className="flex items-start">
                    <Award className="text-[#FF0000] mr-2 flex-shrink-0" size={18} />
                    <p className="text-sm text-gray-300">The jackpot increases over time until someone hits the exact pixel.</p>
                  </div>
                  
                  <div className="flex items-start">
                    <Clock className="text-[#FF0000] mr-2 flex-shrink-0" size={18} />
                    <p className="text-sm text-gray-300">Return daily for more chances to win!</p>
                  </div>
                </div>
                
                <div className="bg-[#222222] rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-1">Pro Tip</h3>
                  <p className="text-gray-300 text-sm">
                    Share your results with friends and see who can get closest to the target!
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="w-full mt-6 bg-[#FF0000] hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                Got It!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default memo(HowToPlayModalComponent); // Wrap with memo