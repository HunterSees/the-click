import { useState, useRef, useEffect, useCallback, memo, lazy, Suspense } from 'react'; // Import lazy, Suspense
import { useGameContext } from '../contexts/GameContext';
import { Share2, Copy, X, Twitter, Facebook, Linkedin, Mail, MessageSquare } from 'lucide-react'; // X might be unused now
import { useShareableImage } from '../hooks/useShareableImage';

// Lazy load the ShareModal
const ShareModal = lazy(() => import('./ShareModal'));

const ClickFeedbackComponent = () => {
  const { lastClick, hasClicked, dayNumber, jackpot } = useGameContext();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPlatformOptions, setShowPlatformOptions] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // This triggerButtonRef is for the "Share Result" button, used to return focus when ShareModal closes.
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  // Use the custom hook for shareable image generation
  const {
    canvasRef,
    shareImageUrl,
    shareImageBlob,
    generateImage,
    clearImageData
  } = useShareableImage({ lastClick, dayNumber, jackpot });

  // Generate share text for fallback and clipboard
  const generateShareText = useCallback(() => {
    if (!lastClick) return '';
    
    const formattedJackpot = jackpot.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `The Click: Day ${dayNumber}\nDistance: ${Math.round(lastClick.distance)}px\nJackpot: $${formattedJackpot}\ntheclickgame.com`;
  }, [lastClick, dayNumber, jackpot]);
  
  // Generate share image when modal opens
  useEffect(() => {
    if (showShareModal && !shareImageUrl && lastClick) {
      generateImage(); // Call generateImage from the hook
    }
    // The hook's internal useEffect handles cleanup of shareImageUrl on unmount.
    // Additional cleanup on modal close is handled by handleCloseModal calling clearImageData.
  }, [showShareModal, shareImageUrl, generateImage, lastClick]);


  // Focus trapping logic for ShareModal is now within ShareModal.tsx.
  // This useEffect handles returning focus to the trigger button when ShareModal closes.
  useEffect(() => {
    if (!showShareModal && triggerButtonRef.current) {
      triggerButtonRef.current.focus();
      triggerButtonRef.current = null; // Clear ref after focus is returned
    }
    // No need to add/remove keydown listeners here anymore for the share modal
  }, [showShareModal]);


  if (!hasClicked || !lastClick) {
    return null;
  }

  const { distance } = lastClick;
  const formattedDistance = Math.round(distance);
  
  // Web Share API handler - FIXED to better handle permission issues
  const handleShare = async () => {
    if (!shareImageBlob) { // Use shareImageBlob
      // If blob is not ready, perhaps generate or wait? For now, just return or show error.
      console.error("Share image blob not available yet.");
      return;
    }
    
    try {
      const file = new File([shareImageBlob], 'the-click-result.png', { type: 'image/png' });
      
      // First try with file sharing if supported
      if (navigator.share && 
          navigator.canShare && 
          navigator.canShare({ files: [file] })) {
        try {
          // Try file sharing
          await navigator.share({
            title: 'The Click - Daily Pixel Challenge',
            text: generateShareText(),
            files: [file]
          });
          setShowShareModal(false);
          return; // Exit if successful
        } catch (fileShareError) {
          console.error('File sharing failed:', fileShareError);
          // Continue to text-only sharing
        }
      }
      
      // If file sharing failed or isn't available, try text-only sharing
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'The Click - Daily Pixel Challenge',
            text: generateShareText(),
            url: 'https://theclickgame.com'
          });
          setShowShareModal(false);
          return; // Exit if successful
        } catch (textShareError) {
          console.error('Text sharing failed:', textShareError);
          // Fall through to platform options
        }
      }
      
      // If we reach here, all Web Share API attempts failed or weren't available
      setShowPlatformOptions(true);
    } catch (err) {
      console.error('Error in share process:', err);
      // Fall back to platform options
      setShowPlatformOptions(true);
    }
  };

  // Platform-specific share handlers
  const shareToTwitter = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
    setShowShareModal(false);
  };

  const shareToFacebook = () => {
    // Using simple Facebook sharer to avoid issues
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + 
      encodeURIComponent('https://theclickgame.com'), 
      '_blank', 'noopener,noreferrer');
    setShowShareModal(false);
  };

  const shareToLinkedIn = () => {
    window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + 
      encodeURIComponent('https://theclickgame.com'), 
      '_blank', 'noopener,noreferrer');
    setShowShareModal(false);
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('The Click - Daily Pixel Challenge');
    const body = encodeURIComponent(generateShareText());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
    setShowShareModal(false);
  };

  const downloadImage = () => {
    if (shareImageUrl) { // Use shareImageUrl
      const link = document.createElement('a');
      link.href = shareImageUrl; // Use shareImageUrl
      link.download = `the-click-day-${dayNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    }
    return false;
  };

  const shareToDiscord = () => {
    // For Discord we'll download the image
    if (downloadImage()) {
      // Show success message
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
    setShowShareModal(false);
  };

  const shareToSlack = () => {
    // For Slack we'll download the image
    if (downloadImage()) {
      // Show success message
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
    setShowShareModal(false);
  };
  
  // Determine feedback message based on distance
  let feedbackMessage = '';
  let colorClass = '';
  
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
    feedbackMessage = 'Try again tomorrow!';
    colorClass = 'text-gray-400';
  }

  // Save the result image
  const saveImage = () => {
    if (downloadImage()) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleCloseModal = () => {
    setShowShareModal(false);
    setShowPlatformOptions(false);
    clearImageData(); // Clear image data using the function from the hook
  };

  return (
    <div className="text-center mt-6">
      <h2 className={`text-2xl font-bold ${colorClass} mb-2`}>
        {formattedDistance} PIXELS AWAY
      </h2>
      <p className={`${colorClass} font-medium`}>{feedbackMessage}</p>
      
      <button
        onClick={(e) => {
          setShowShareModal(true);
          triggerButtonRef.current = e.currentTarget; // Store the trigger button
        }}
        className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-6 rounded-lg transition-colors inline-flex items-center"
        aria-label="Share your result"
      >
        <Share2 className="h-5 w-5 mr-2" />
        Share Result
      </button>
      
      {/* Hidden canvas for generating the share image */}
      <canvas 
        ref={canvasRef} 
        className="hidden" 
        aria-hidden="true"
      />
      

      {showShareModal && (
        <Suspense fallback={<div aria-busy="true" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white z-50">Loading Share Options...</div>}>
          <ShareModal
            isOpen={showShareModal}
            onClose={handleCloseModal}
            shareImageUrl={shareImageUrl}
            dayNumber={dayNumber}
            copySuccess={copySuccess}
            // setCopySuccess={setCopySuccess} // Keep setCopySuccess in ClickFeedback
            handleShare={handleShare}
            downloadImage={downloadImage}
            shareToTwitter={shareToTwitter}
            shareToFacebook={shareToFacebook}
            shareToLinkedIn={shareToLinkedIn}
            shareViaEmail={shareViaEmail}
            shareToDiscord={shareToDiscord}
            shareToSlack={shareToSlack}
            showPlatformOptions={showPlatformOptions}
            setShowPlatformOptions={setShowPlatformOptions}
          />
        </Suspense>
      )}
    </div>
  );
};

export default memo(ClickFeedbackComponent); // Wrap with memo