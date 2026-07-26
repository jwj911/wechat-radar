import { describe, it, expect } from 'vitest';
import {
  normalizeDate,
  isRangeKey,
  normalizeRangeKey,
  ymd,
  todayStr,
  daysBefore,
  rangeToWindow,
  dateList,
} from '../lib/range';

describe('normalizeDate', () => {
  it('returns a valid, round-tripping date unchanged', () => {
    expect(normalizeDate('2024-03-10')).toBe('2024-03-10');
    expect(normalizeDate('2024-02-29')).toBe('2024-02-29'); // leap day
  });

  it('falls back to today for empty / undefined input', () => {
    expect(normalizeDate('')).toBe(todayStr());
    expect(normalizeDate(undefined)).toBe(todayStr());
    expect(normalizeDate(null)).toBe(todayStr());
  });

  it('falls back for malformed strings', () => {
    expect(normalizeDate('2024-13-99', 'FALLBACK')).toBe('FALLBACK');
    expect(normalizeDate('not-a-date', 'FALLBACK')).toBe('FALLBACK');
  });

  it('falls back for a non round-tripping date (Feb 30 rolls over)', () => {
    // new Date(2024, 1, 30) === 2024-03-01, so ymd !== input -> fallback
    expect(normalizeDate('2024-02-30', 'FALLBACK')).toBe('FALLBACK');
  });

  it('honors an explicit fallback param', () => {
    expect(normalizeDate('', '1999-01-01')).toBe('1999-01-01');
    expect(normalizeDate('garbage', '1999-01-01')).toBe('1999-01-01');
  });
});

describe('isRangeKey', () => {
  it('returns true for every valid range key', () => {
    for (const key of ['day', 'week', 'month', 'quarter', 'year', 'custom']) {
      expect(isRangeKey(key)).toBe(true);
    }
  });

  it('returns false for invalid / nullish values', () => {
    expect(isRangeKey('foo')).toBe(false);
    expect(isRangeKey('')).toBe(false);
    expect(isRangeKey(null)).toBe(false);
    expect(isRangeKey(undefined)).toBe(false);
  });
});

describe('normalizeRangeKey', () => {
  it('returns the value when it is a valid range key', () => {
    expect(normalizeRangeKey('week', 'day')).toBe('week');
    expect(normalizeRangeKey('custom', 'day')).toBe('custom');
  });

  it('returns the fallback when the value is invalid', () => {
    expect(normalizeRangeKey('foo', 'month')).toBe('month');
    expect(normalizeRangeKey(null, 'year')).toBe('year');
    expect(normalizeRangeKey(undefined, 'day')).toBe('day');
  });
});

describe('ymd', () => {
  it('formats a Date to YYYY-MM-DD with zero-padding', () => {
    expect(ymd(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(ymd(new Date(2024, 11, 31))).toBe('2024-12-31');
    expect(ymd(new Date(2024, 8, 9))).toBe('2024-09-09');
  });
});

describe('todayStr', () => {
  it('matches the YYYY-MM-DD shape', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('daysBefore', () => {
  it('returns the anchor unchanged for n = 0', () => {
    expect(daysBefore(0, '2024-03-10')).toBe('2024-03-10');
  });

  it('crosses a month boundary into a leap-year Feb 29', () => {
    expect(daysBefore(1, '2024-03-01')).toBe('2024-02-29');
  });

  it('crosses a year boundary', () => {
    expect(daysBefore(1, '2024-01-01')).toBe('2023-12-31');
  });

  it('subtracts multiple days within a month', () => {
    expect(daysBefore(5, '2024-03-10')).toBe('2024-03-05');
  });
});

describe('rangeToWindow (anchor 2024-03-10)', () => {
  it('day -> single-day window', () => {
    expect(rangeToWindow('day', '2024-03-10')).toEqual({
      since: '2024-03-10',
      until: '2024-03-10',
      days: 1,
    });
  });

  it('week -> 7-day window', () => {
    expect(rangeToWindow('week', '2024-03-10')).toEqual({
      since: '2024-03-04',
      until: '2024-03-10',
      days: 7,
    });
  });

  it('month -> 30-day window', () => {
    expect(rangeToWindow('month', '2024-03-10')).toEqual({
      since: '2024-02-10',
      until: '2024-03-10',
      days: 30,
    });
  });

  it('quarter -> 90-day window', () => {
    const w = rangeToWindow('quarter', '2024-03-10');
    expect(w.days).toBe(90);
    expect(w.until).toBe('2024-03-10');
    expect(w.since).toBe('2023-12-12');
  });

  it('year -> 365-day window', () => {
    const w = rangeToWindow('year', '2024-03-10');
    expect(w.days).toBe(365);
    expect(w.until).toBe('2024-03-10');
    expect(w.since).toBe('2023-03-12');
  });

  it('custom -> 7-day window ending at until', () => {
    expect(rangeToWindow('custom', '2024-03-10')).toEqual({
      since: '2024-03-04',
      until: '2024-03-10',
      days: 7,
    });
  });
});

describe('dateList', () => {
  it('returns an inclusive list across consecutive days', () => {
    expect(dateList('2024-03-01', '2024-03-03')).toEqual([
      '2024-03-01',
      '2024-03-02',
      '2024-03-03',
    ]);
  });

  it('returns a single element when since === until', () => {
    expect(dateList('2024-03-01', '2024-03-01')).toEqual(['2024-03-01']);
  });
});
