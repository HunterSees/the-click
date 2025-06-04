import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, X, Twitter, Facebook, Linkedin, Mail, MessageSquare } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareImageUrl: string | null;
  // shareImageBlob: Blob | null; // Not directly used by ShareModal UI, but by handleShare passed as prop
  dayNumber: number;
  copySuccess: boolean;
  // setCopySuccess: (value: boolean) => void; // If copy success message is managed inside ShareModal

  // Platform handlers & actions
  handleShare: () => Promise<void>; // Generic Web Share
  downloadImage: () => boolean; // Used by saveImage, shareToDiscord, shareToSlack

  shareToTwitter: () => void;
  shareToFacebook: () => void;
  shareToLinkedIn: () => void;
  shareViaEmail: () => void;
  shareToDiscord: () => void;
  shareToSlack: () => void;

  showPlatformOptions: boolean;
  setShowPlatformOptions: (value: boolean) => void;
  isGenerating: boolean; // New prop for loading state
}

const ShareModal = ({
  isOpen,
  onClose,
  shareImageUrl,
  dayNumber, // Used for download filename if downloadImage is used by saveImage inside
  copySuccess,
  // setCopySuccess, // Assuming parent ClickFeedback manages this for simplicity now
  handleShare,
  downloadImage, // Pass this down
  isGenerating, // Destructure new prop
  shareToTwitter,
  shareToFacebook,
  shareToLinkedIn,
  shareViaEmail,
  shareToDiscord,
  shareToSlack,
  showPlatformOptions,
  setShowPlatformOptions,
}: ShareModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trapping logic (moved from ClickFeedback.tsx)
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
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
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
      document.removeEventListener('keydown', handleKeyDown);
      // Focus return to triggerButton is handled by ClickFeedback component
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Helper function for "Save Image" button, if kept inside ShareModal
  // Or, ClickFeedback can pass down a specific saveImage function
  const saveImage = () => {
    if (downloadImage()) {
      // setCopySuccess(true); // Parent (ClickFeedback) should manage this state
      // setTimeout(() => setCopySuccess(false), 2000);
      // For now, assume parent handles copySuccess state based on downloadImage return
    }
  };


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shareModalTitle"
    >
      <motion.div
        ref={modalRef}
        className="bg-slate-800 rounded-lg p-6 max-w-md w-full"
        tabIndex={-1}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="shareModalTitle" className="text-xl font-bold text-white">Share Your Result</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700"
            aria-label="Close sharing dialog"
          >
            <X size={20} />
          </button>
        </div>

        {isGenerating ? (
          <div className="mb-4 text-center text-gray-400">
            <p>Generating image...</p>
            {/* Optional: Add a spinner SVG or animation here */}
          </div>
        ) : shareImageUrl ? (
          <div className="mb-4 flex justify-center">
            <img
              src={shareImageUrl}
              alt="Your click result"
              className="rounded-lg border border-slate-700 max-w-full h-auto"
            />
          </div>
        ) : (
          // Optional: Placeholder or error if not generating and no URL (e.g., generation failed)
          <div className="mb-4 text-center text-gray-500">
            <p>Image not available.</p>
          </div>
        )}

        {!showPlatformOptions ? (
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleShare}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
              aria-label="Share to platforms"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>

            <button
              onClick={saveImage} // Calls local saveImage which calls prop downloadImage
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
              aria-label="Save image"
            >
              <Copy className="h-4 w-4 mr-2" />
              Save Image
            </button>

            <button
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
              aria-label="Close sharing dialog"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            <h3 className="text-sm text-gray-300 mb-3">Share via:</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={shareToTwitter}
                className="bg-slate-700 hover:bg-[#1DA1F2] text-white py-2 px-3 rounded-lg transition-colors flex items-center"
                aria-label="Share to Twitter"
              >
                <Twitter className="h-4 w-4 mr-2" />
                X (Twitter)
              </button>

              <button
                onClick={shareToFacebook}
                className="bg-slate-700 hover:bg-[#1877F2] text-white py-2 px-3 rounded-lg transition-colors flex items-center"
                aria-label="Share to Facebook"
              >
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </button>

              <button
                onClick={shareToLinkedIn}
                className="bg-slate-700 hover:bg-[#0A66C2] text-white py-2 px-3 rounded-lg transition-colors flex items-center"
                aria-label="Share to LinkedIn"
              >
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </button>

              <button
                onClick={shareViaEmail}
                className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors flex items-center"
                aria-label="Share via Email"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </button>

              <button
                onClick={shareToDiscord}
                className="bg-slate-700 hover:bg-[#5865F2] text-white py-2 px-3 rounded-lg transition-colors flex items-center"
                aria-label="Download image for Discord"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Download for Discord
              </button>

              <button
                onClick={shareToSlack}
                className="bg-slate-700 hover:bg-[#4A154B] text-white py-2 px-3 rounded-lg transition-colors flex items-center"
                aria-label="Download image for Slack"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Download for Slack
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveImage} // Calls local saveImage which calls prop downloadImage
                className={`flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center ${
                  copySuccess ? 'bg-green-600' : '' // copySuccess is a prop
                }`}
                aria-label="Save image"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copySuccess ? 'Saved!' : 'Save Image'}
              </button>

              <button
                onClick={() => setShowPlatformOptions(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
                aria-label="Go back"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ShareModal;
