import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  let pipe: RelativeTimePipe;

  beforeEach(() => {
    pipe = new RelativeTimePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "just now" for dates less than 1 minute ago', () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    expect(pipe.transform(thirtySecondsAgo)).toBe('just now');
  });

  it('should return "1 minute ago" for exactly 1 minute ago', () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    expect(pipe.transform(oneMinuteAgo)).toBe('1 minute ago');
  });

  it('should return "X minutes ago" for less than 60 minutes', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(pipe.transform(fiveMinutesAgo)).toBe('5 minutes ago');
  });

  it('should return "1 hour ago" for exactly 1 hour', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    expect(pipe.transform(oneHourAgo)).toBe('1 hour ago');
  });

  it('should return "X hours ago" for less than 24 hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(pipe.transform(threeHoursAgo)).toBe('3 hours ago');
  });

  it('should return "1 day ago" for exactly 1 day', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(pipe.transform(oneDayAgo)).toBe('1 day ago');
  });

  it('should return "X days ago" for less than 30 days', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(fiveDaysAgo)).toBe('5 days ago');
  });

  it('should return "DD MMM YYYY" format for 30+ days ago', () => {
    // Use a date that is definitely more than 30 days ago
    const oldDate = new Date(2023, 0, 15); // Jan 15, 2023
    expect(pipe.transform(oldDate)).toBe('15 Jan 2023');
  });

  it('should pad single-digit days with leading zero in DD MMM YYYY format', () => {
    const oldDate = new Date(2023, 5, 5); // Jun 5, 2023
    expect(pipe.transform(oldDate)).toBe('05 Jun 2023');
  });

  it('should handle string date inputs', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    expect(pipe.transform(tenMinutesAgo.toISOString())).toBe('10 minutes ago');
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return empty string for invalid date strings', () => {
    expect(pipe.transform('not-a-date')).toBe('');
  });
});
