import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from './Header';
import { GameProvider } from '../contexts/GameContext'; // Header might consume context indirectly or have children that do

describe('Header', () => {
  it('renders the header with logo and navigation buttons', () => {
    render(
      <GameProvider>
        <Header />
      </GameProvider>
    );

    // Check for logo text "THE"
    expect(screen.getByText('THE')).toBeInTheDocument();

    // Find the specific span that contains "CLIC" and has the red "X" as a child
    // This targets <span class="ml-2">CLIC<span class="text-[#FF0000]">X</span></span>
    const clicParentSpan = screen.getByText((content, element) => {
      // Check if the element is a SPAN
      if (element?.tagName !== 'SPAN') return false;
      // Check if its direct text content starts with "CLIC"
      // We take childNodes and filter for text nodes to get only the direct text "CLIC"
      const directText = Array.from(element.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent)
        .join('');
      if (!directText.startsWith('CLIC')) return false;

      // Check if it has a child SPAN with text "X" and the specific class for red color
      const childXSpan = element.querySelector('span.text-\\[\\#FF0000\\]'); // Escaped for querySelector
      return childXSpan?.textContent === 'X';
    });
    expect(clicParentSpan).toBeInTheDocument();

    // Additionally, verify the "X" text content from the found child span to be absolutely sure
    const xSpan = clicParentSpan.querySelector('span.text-\\[\\#FF0000\\]');
    expect(xSpan?.textContent).toBe('X');

    // Check for aria labels of buttons
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
    expect(screen.getByLabelText('How to Play')).toBeInTheDocument();
    expect(screen.getByLabelText('User Profile')).toBeInTheDocument(); // Corrected case
  });
});
