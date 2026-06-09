import { ZarCurrencyPipe } from './currency.pipe';

describe('ZarCurrencyPipe', () => {
  let pipe: ZarCurrencyPipe;

  beforeEach(() => {
    pipe = new ZarCurrencyPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format a number with R prefix and 2 decimal places', () => {
    expect(pipe.transform(45.5)).toBe('R45.50');
  });

  it('should format zero correctly', () => {
    expect(pipe.transform(0)).toBe('R0.00');
  });

  it('should format whole numbers with .00', () => {
    expect(pipe.transform(100)).toBe('R100.00');
  });

  it('should round to 2 decimal places', () => {
    expect(pipe.transform(99.999)).toBe('R100.00');
    expect(pipe.transform(10.125)).toBe('R10.13');
  });

  it('should handle large numbers', () => {
    expect(pipe.transform(12345.67)).toBe('R12345.67');
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });
});
