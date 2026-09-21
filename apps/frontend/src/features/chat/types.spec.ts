import { describe, it, expect, afterEach } from 'vitest';
import { formatRange, STATUS_LABEL } from './types';

const originalDateString = Date.prototype.toLocaleDateString;
const originalTimeString = Date.prototype.toLocaleTimeString;

afterEach(() => {
  Date.prototype.toLocaleDateString = originalDateString;
  Date.prototype.toLocaleTimeString = originalTimeString;
});

describe('formatRange', () => {
  it('formats start and end into a single human-readable range', () => {
    Date.prototype.toLocaleDateString = function () {
      return 'Mon, Sep 21';
    };
    Date.prototype.toLocaleTimeString = function (this: Date) {
      return this.getUTCHours() === 9 ? '9:00 AM' : '10:00 AM';
    };

    const result = formatRange(
      '2026-09-21T09:00:00.000Z',
      '2026-09-21T10:00:00.000Z',
    );

    expect(result).toBe('Mon, Sep 21, 9:00 AM – 10:00 AM');
  });
});

describe('STATUS_LABEL', () => {
  it('contains a label for every task status', () => {
    expect(STATUS_LABEL.PENDING).toBe('Pending');
    expect(STATUS_LABEL.IN_PROGRESS).toBe('In progress');
    expect(STATUS_LABEL.COMPLETED).toBe('Completed');
    expect(STATUS_LABEL.CANCELLED).toBe('Cancelled');
  });
});