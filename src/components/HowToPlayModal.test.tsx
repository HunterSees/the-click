import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import HowToPlayModalComponent from './HowToPlayModal'; // Testing the unwrapped component

const mockOnClose = vi.fn();

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
};

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    },
  };
});

describe('HowToPlayModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body overflow for each test
    document.body.style.overflow = '';
  });

  it('renders nothing if isOpen is false', () => {
    render(<HowToPlayModalComponent {...defaultProps} isOpen={false} />);
    // The component uses AnimatePresence, so it might render null or an empty fragment.
    // Check for a specific role or data-testid if needed, but usually queryByRole for dialog is good.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders correctly when isOpen is true', () => {
    render(<HowToPlayModalComponent {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('How to Play')).toBeInTheDocument(); // Title
    expect(screen.getByText('Basic Rules')).toBeInTheDocument();
    expect(screen.getByText('Got It!')).toBeInTheDocument(); // "Got It!" button
    expect(screen.getByLabelText('Close How to Play modal')).toBeInTheDocument(); // X button
  });

  it('calls onClose when the close (X) button is clicked', () => {
    render(<HowToPlayModalComponent {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Close How to Play modal'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the "Got It!" button is clicked', () => {
    render(<HowToPlayModalComponent {...defaultProps} />);
    fireEvent.click(screen.getByText('Got It!'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('has correct ARIA attributes for accessibility', () => {
    render(<HowToPlayModalComponent {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'howToPlayModalTitle');
    expect(screen.getByText('How to Play').id).toBe('howToPlayModalTitle');
    expect(screen.getByLabelText('Close How to Play modal')).toBeInTheDocument();
  });

  it('sets document.body.style.overflow to "hidden" when open', () => {
    render(<HowToPlayModalComponent {...defaultProps} isOpen={true} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('resets document.body.style.overflow to "auto" when closed', () => {
    const { rerender } = render(<HowToPlayModalComponent {...defaultProps} isOpen={true} />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<HowToPlayModalComponent {...defaultProps} isOpen={false} />);
    expect(document.body.style.overflow).toBe('auto');
  });

  it('resets document.body.style.overflow to "auto" on unmount', () => {
    const { unmount } = render(<HowToPlayModalComponent {...defaultProps} isOpen={true} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  // Basic focus trapping test: first focusable element (close button) gets focus
  // More detailed Tab trapping tests could be added but are complex
  it('focuses the first focusable element (close button) when opened', () => {
    render(<HowToPlayModalComponent {...defaultProps} isOpen={true} />);
    // The first focusable element should be the 'X' close button
    expect(screen.getByLabelText('Close How to Play modal')).toHaveFocus();
  });

});
