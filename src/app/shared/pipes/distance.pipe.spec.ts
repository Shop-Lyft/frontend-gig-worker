import { DistancePipe } from './distance.pipe';

describe('DistancePipe', () => {
  let pipe: DistancePipe;

  beforeEach(() => {
    pipe = new DistancePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format distance with 1 decimal place and km suffix', () => {
    expect(pipe.transform(3.5)).toBe('3.5 km');
  });

  it('should format zero distance', () => {
    expect(pipe.transform(0)).toBe('0.0 km');
  });

  it('should format whole numbers with .0', () => {
    expect(pipe.transform(5)).toBe('5.0 km');
  });

  it('should round to 1 decimal place', () => {
    expect(pipe.transform(2.75)).toBe('2.8 km');
    expect(pipe.transform(1.14)).toBe('1.1 km');
  });

  it('should handle large distances', () => {
    expect(pipe.transform(150.3)).toBe('150.3 km');
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });
});
