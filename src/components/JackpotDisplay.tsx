import { useState, useEffect, useMemo, memo } from 'react'; // Import useMemo and memo
import { useGameContext } from '../contexts/GameContext';
import { onJackpotUpdate, onConnectionChange } from '../services/socketService';

const JackpotDisplayComponent = () => { // Renamed for memo
  const { jackpot, setJackpot } = useGameContext();
  const [isConnected, setIsConnected] = useState(true); // isConnected is not used, consider removing if not planned.
  
  const [integerPart, decimalPart] = useMemo(() => {
    // Format with commas and 2 decimal places
    const formatted = jackpot.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Pad with leading zeros if needed to ensure consistent format
    const parts = formatted.split('.');
    const intPart = parts[0]; // Renamed to avoid conflict with outer scope if any
    const decPart = parts[1]; // Renamed
    
    // Ensure integer part is at least 7 digits (for 0,000,000)
    // If jackpot is 0, parts[0] is "0", padStart(7,'0') is "0000000"
    // If jackpot is 1234567, parts[0] is "1,234,567" - this needs care.
    // The original logic assumed integerPart was just digits.
    // Let's get the raw number before formatting for padding.
    const rawIntegerPart = Math.floor(jackpot).toString();
    const paddedRawIntegerPart = rawIntegerPart.padStart(7, '0');

    // Now, re-format this paddedRawIntegerPart with commas.
    // This is tricky because the original toLocaleString already adds commas.
    // A simpler approach for consistent length might be to format the number,
    // then ensure the integer segment before the first comma (or the whole number if no comma)
    // is padded if the total number of integer digits is less than 7.
    // However, the original logic was padding the already-formatted string (potentially with commas).
    // Let's stick to minimal changes to the core formatting logic but ensure it's robust.

    // The original logic for inserting commas into 'paddedIntegerPart' which was already locale-formatted.
    // This logic is a bit flawed if 'paddedIntegerPart' comes from 'integerPart.padStart(7,'0')'
    // where integerPart itself can have commas. Example: jackpot=12345.67 -> integerPart="12,345"
    // paddedIntegerPart = "12,345".padStart(7,'0') -> "012,345" - this seems okay.
    // Example: jackpot=123.45 -> integerPart="123" -> paddedIntegerPart = "0000123"
    // The comma insertion loop then correctly formats "0,000,123". This seems to be the intent.
    
    const prePaddedInteger = intPart.padStart(7, '0'); // Pad the part that might contain commas

    let result = '';
    let counter = 0;
    // Iterate backwards over the potentially comma-containing padded string
    for (let i = prePaddedInteger.length - 1; i >= 0; i--) {
      if (prePaddedInteger[i] === ',') continue; // Skip existing commas for counter logic

      if (counter === 3) {
        result = ',' + result;
        counter = 0;
      }
      result = prePaddedInteger[i] + result;
      counter++;
    }
     // The above loop rebuilds the integer string. If jackpot is large (e.g. 1,234,567),
     // intPart is "1,234,567". prePaddedInteger is "1,234,567".
     // The loop will strip original commas and re-insert. This is fine.
     // If jackpot is small, e.g. 123.45, intPart is "123". prePaddedInteger is "0000123".
     // Loop produces "0,000,123". This is also fine.

    return [result, decPart];
  }, [jackpot]);

  // WebSocket updates for jackpot
  useEffect(() => {
    // Register for jackpot updates
    onJackpotUpdate((amount) => {
      setJackpot(amount);
    });
    
    // Register for connection status updates
    onConnectionChange((status) => {
      setIsConnected(status);
    });
  }, [setJackpot]);

  // Split the formatted jackpot into individual digits for display
  const jackpotDigits = integerPart.split('');

  return (
    <div className="text-center mb-6">
      {/* Digital Jackpot Display */}
      <div className="flex items-center justify-center mb-4">
        <div className="text-white text-4xl mr-2">$</div>
        <div className="inline-flex">
          {jackpotDigits.map((digit, index) => 
            digit === ',' ? (
              <div key={`sep-${index}`} className="separator">,</div>
            ) : (
              <div key={`digit-${index}`} className="digit-container">
                <div className="digit">{digit}</div>
              </div>
            )
          )}
          <div className="separator">.</div>
          {decimalPart.split('').map((digit, index) => (
            <div key={`decimal-${index}`} className="digit-container">
              <div className="digit">{digit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(JackpotDisplayComponent); // Wrap with memo