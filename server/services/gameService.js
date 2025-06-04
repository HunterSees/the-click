// server/services/gameService.js
import {
  db, // For transactions
  getJackpot,
  updateJackpot,
  resetJackpot,
  logJackpotHistory,
  getOrCreateDailyTargetPixel,
  forceNewDailyTarget,
  recordClickAttempt,
  hasAttemptedToday
} from '../database.js';

const handleClick = (x, y, userIdentifier) => { // Removed async
  // Input validation for x, y should ideally happen before calling this service,
  // but a basic check here can be a safeguard.
  if (
    typeof x !== 'number' || typeof y !== 'number' ||
    !Number.isInteger(x) || !Number.isInteger(y) ||
    x < 0 || x > 999 || y < 0 || y > 999
  ) {
    // This case should ideally be caught by server/index.js before calling gameService
    return { status: 'error', type: 'validation', message: 'Invalid coordinates.' };
  }

  const today = new Date().toISOString().split('T')[0];

  // Attempt limit check (outside transaction for now, or can be part of it)
  // For this refactor, let's keep it simple: check first, then transact.
  // A more robust approach might include the check within the transaction if preferred.
  if (hasAttemptedToday(userIdentifier, today)) {
    return { status: 'error', type: 'attempt_limit', message: 'You have already made your attempt for today.' };
  }

  try {
    const targetPixel = getOrCreateDailyTargetPixel(); // This is a read, can be outside transaction too
    const distance = Math.sqrt(Math.pow(targetPixel.x - x, 2) + Math.pow(targetPixel.y - y, 2));
    const roundedDistance = Math.round(distance * 1000) / 1000;

    const currentJackpotState = getJackpot(); // Read before transaction

    if (roundedDistance === 0) { // Winner
      const baseAmount = 100.00;
      const wonAmount = currentJackpotState.current_amount;

      const winTransaction = db.transaction(() => {
        if (!resetJackpot(baseAmount, userIdentifier)) { // userIdentifier is used as userId here
          throw new Error('Failed to reset jackpot');
        }
        logJackpotHistory(wonAmount, baseAmount, 'JACKPOT_WIN', userIdentifier);
        forceNewDailyTarget();
        recordClickAttempt(userIdentifier, today); // Record attempt as part of successful win
      });

      winTransaction();
      return {
        status: 'success',
        type: 'win',
        distance: roundedDistance,
        targetX: targetPixel.x,
        targetY: targetPixel.y,
        wonAmount: wonAmount,
        newBaseJackpotAmount: baseAmount
      };

    } else { // Miss
      const newJackpotAmount = parseFloat(currentJackpotState.current_amount) + 0.001;
      const roundedNewJackpotAmount = Math.round(newJackpotAmount * 1000) / 1000;

      const missTransaction = db.transaction(() => {
        if (!updateJackpot(roundedNewJackpotAmount, userIdentifier)) {
          throw new Error('Failed to update jackpot on miss');
        }
        logJackpotHistory(currentJackpotState.current_amount, roundedNewJackpotAmount, 'INCREMENT', userIdentifier);
        recordClickAttempt(userIdentifier, today); // Record attempt as part of successful miss
      });

      missTransaction();
      return {
        status: 'success',
        type: 'miss',
        distance: roundedDistance,
        targetX: targetPixel.x,
        targetY: targetPixel.y,
        newJackpotAmount: roundedNewJackpotAmount
      };
    }
  } catch (error) {
    console.error('Error in handleClick gameService:', error.message);
    // It's better to throw a generic error or a custom one that server/index.js can catch
    // For now, return an error object for consistency with other error types.
    return { status: 'error', type: 'server_error', message: 'An unexpected server error occurred.' };
  }
};

const performAutoIncrement = () => {
  try {
    const currentJackpot = getJackpot();
    const newAmount = parseFloat(currentJackpot.current_amount) + 0.01; // Increment by 1 cent
    const roundedAmount = Math.round(newAmount * 1000) / 1000;

    const autoIncrementTransaction = db.transaction(() => {
      if (!updateJackpot(roundedAmount, 'system')) {
        throw new Error('Auto-increment updateJackpot failed');
      }
      logJackpotHistory(currentJackpot.current_amount, roundedAmount, 'AUTO_INCREMENT', 'system');
    });

    autoIncrementTransaction();
    return { status: 'success', newJackpotAmount: roundedAmount };
  } catch (error) {
    console.error('Error in performAutoIncrement gameService:', error.message);
    return { status: 'error', type: 'server_error', message: 'Auto increment failed.' };
    // Or rethrow: throw new Error('Auto increment failed: ' + error.message);
  }
};

export { handleClick, performAutoIncrement };
