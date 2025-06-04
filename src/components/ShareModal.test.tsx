import React from 'react'; // Import React for forwardRef
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest'; // Added beforeEach
import ShareModal from './ShareModal';

const mockOnClose = vi.fn();
const mockHandleShare = vi.fn();
const mockDownloadImage = vi.fn(() => true); // Assume download is successful
const mockShareToTwitter = vi.fn();
const mockShareToFacebook = vi.fn();
const mockShareToLinkedIn = vi.fn();
const mockShareViaEmail = vi.fn();
const mockShareToDiscord = vi.fn();
const mockShareToSlack = vi.fn();
const mockSetShowPlatformOptions = vi.fn();

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  shareImageUrl: 'mock-image-url.png',
  dayNumber: 10,
  copySuccess: false,
  handleShare: mockHandleShare,
  downloadImage: mockDownloadImage,
  shareToTwitter: mockShareToTwitter,
  shareToFacebook: mockShareToFacebook,
  shareToLinkedIn: mockShareToLinkedIn,
  shareViaEmail: mockShareViaEmail,
  shareToDiscord: mockShareToDiscord,
  shareToSlack: mockShareToSlack,
  showPlatformOptions: false,
  setShowPlatformOptions: mockSetShowPlatformOptions,
};

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    },
  };
});


describe('ShareModal', () => {
  beforeEach(() => { // Ensure mocks are cleared for each test
    vi.clearAllMocks();
  });

  it('renders nothing if isOpen is false', () => {
    render(<ShareModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders correctly when isOpen is true', () => {
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // There are two buttons with this label, test for at least one or be more specific
    expect(screen.getAllByLabelText('Close sharing dialog').length).toBeGreaterThanOrEqual(1);
    // Specific check for the icon close button (often the first one in DOM order for modals)
    expect(screen.getAllByLabelText('Close sharing dialog')[0]).toBeInTheDocument();
    expect(screen.getByAltText('Your click result')).toHaveAttribute('src', 'mock-image-url.png');
    expect(screen.getByText('Share Your Result')).toBeInTheDocument(); // Modal title
    expect(screen.getByLabelText('Share to platforms')).toBeInTheDocument();
    expect(screen.getByLabelText('Save image')).toBeInTheDocument();
  });

  it('calls onClose when the icon close button (X) is clicked', () => {
    render(<ShareModal {...defaultProps} showPlatformOptions={false} />);
    // The icon button is the first one with this aria-label in the initial view
    fireEvent.click(screen.getAllByLabelText('Close sharing dialog')[0]);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the text "Close" button is clicked (initial view)', () => {
    render(<ShareModal {...defaultProps} showPlatformOptions={false} />);
    // The text button has visible text "Close" and also the aria-label
    // We need to be specific to distinguish from the X icon button if labels are identical
    const closeButtons = screen.getAllByLabelText('Close sharing dialog');
    // Find the button that also has the text "Close"
    const textCloseButton = closeButtons.find(btn => btn.textContent === "Close");
    expect(textCloseButton).toBeInTheDocument();
    fireEvent.click(textCloseButton!);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls handleShare when the main share button is clicked', () => {
    render(<ShareModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Share to platforms'));
    expect(mockHandleShare).toHaveBeenCalledTimes(1);
  });

  it('calls downloadImage (via saveImage) when "Save Image" button is clicked (initial view)', () => {
    render(<ShareModal {...defaultProps} showPlatformOptions={false} />);
    fireEvent.click(screen.getByLabelText('Save image'));
    expect(mockDownloadImage).toHaveBeenCalledTimes(1);
  });

  it('shows platform options when showPlatformOptions is true', () => {
    render(<ShareModal {...defaultProps} showPlatformOptions={true} />);
    expect(screen.getByText('Share via:')).toBeInTheDocument();
    expect(screen.getByLabelText('Share to Twitter')).toBeInTheDocument();
    expect(screen.getByLabelText('Download image for Discord')).toBeInTheDocument();
    // Check that initial share buttons are not visible
    expect(screen.queryByLabelText('Share to platforms')).toBeNull();
  });

  it('calls specific share handlers when platform buttons are clicked', () => {
    render(<ShareModal {...defaultProps} showPlatformOptions={true} />);
    fireEvent.click(screen.getByLabelText('Share to Twitter'));
    expect(mockShareToTwitter).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Download image for Discord'));
    expect(mockShareToDiscord).toHaveBeenCalledTimes(1);
  });

  it('calls downloadImage (via saveImage) when "Save Image" button is clicked (platform options view)', () => {
    render(<ShareModal {...defaultProps} showPlatformOptions={true} />);
    // There are two "Save Image" buttons possible depending on view, ensure we click the visible one
    const saveButtons = screen.getAllByLabelText('Save image');
    fireEvent.click(saveButtons[0]); // Assuming the one in platform options is the first or only one if structure changes
    expect(mockDownloadImage).toHaveBeenCalledTimes(1);
  });

  it('calls setShowPlatformOptions(false) when "Back" button is clicked', () => {
    render(<ShareModal {...defaultProps} showPlatformOptions={true} />);
    fireEvent.click(screen.getByLabelText('Go back'));
    expect(mockSetShowPlatformOptions).toHaveBeenCalledWith(false);
  });

  it('displays "Saved!" text on save button when copySuccess is true', () => {
    render(<ShareModal {...defaultProps} showPlatformOptions={true} copySuccess={true} />);
    // Find button by its text changing
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('has correct ARIA attributes for accessibility', () => {
    render(<ShareModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'shareModalTitle');
  });
});
