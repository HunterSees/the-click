import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { formatDateKey, getTimeUntilTomorrow } from './dateUtils';

describe('dateUtils', () => {
  describe('formatDateKey', () => {
    it('should format a date into YYYY-MM-DD string', () => {
      const date = new Date(2023, 0, 1); // Month is 0-indexed
      expect(formatDateKey(date)).toBe('2023-01-01');
    });

    it('should correctly pad single digit months and days', () => {
      const date = new Date(2023, 8, 5); // September 5th
      expect(formatDateKey(date)).toBe('2023-09-05');
    });
  });

  describe('getTimeUntilTomorrow', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate time until next day correctly', () => {
      // Set current time to 10:00:00 AM
      const now = new Date(2023, 0, 1, 10, 0, 0);
      vi.setSystemTime(now);
      // Expect 14 hours, 0 minutes, 0 seconds until tomorrow
      expect(getTimeUntilTomorrow()).toBe('14:00:00');
    });

    it('should show minimal time just before midnight', () => {
       // Set current time to 23:59:58
      const now = new Date(2023, 0, 1, 23, 59, 58);
      vi.setSystemTime(now);
      expect(getTimeUntilTomorrow()).toBe('00:00:02');
    });

    it('should handle timezone differences by focusing on local time', () => {
      // Mock a specific date and time, e.g., 11 PM
      const specificTime = new Date();
      specificTime.setHours(23, 0, 0, 0); // 11:00:00 PM
      vi.setSystemTime(specificTime);

      // Calculate expected remaining time: 1 hour to midnight
      // Expected format: "01:00:00"
      const expectedTime = "01:00:00";
      expect(getTimeUntilTomorrow()).toBe(expectedTime);
    });
  });
});
