import { haversineDistance } from './distance.utils';

describe('distance.utils - haversineDistance', () => {
  it('should return 0 for the same point', () => {
    const distance = haversineDistance(40.7128, -74.006, 40.7128, -74.006);
    expect(distance).toBe(0);
  });

  it('should calculate distance between New York and Los Angeles (~3940 km)', () => {
    // New York: 40.7128° N, 74.0060° W
    // Los Angeles: 34.0522° N, 118.2437° W
    const distance = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(distance).toBeGreaterThan(3900);
    expect(distance).toBeLessThan(3980);
  });

  it('should calculate distance between two nearby points (~1.1 km)', () => {
    // Two points roughly 1 km apart in Johannesburg
    const distance = haversineDistance(-26.2041, 28.0473, -26.2131, 28.0473);
    expect(distance).toBeGreaterThan(0.9);
    expect(distance).toBeLessThan(1.2);
  });

  it('should be symmetric (distance A→B equals distance B→A)', () => {
    const d1 = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    const d2 = haversineDistance(48.8566, 2.3522, 51.5074, -0.1278);
    expect(d1).toBeCloseTo(d2, 10);
  });

  it('should handle antipodal points (~20015 km)', () => {
    // North pole to South pole
    const distance = haversineDistance(90, 0, -90, 0);
    expect(distance).toBeGreaterThan(20000);
    expect(distance).toBeLessThan(20100);
  });

  it('should handle points on the equator', () => {
    // Two points 1 degree apart on the equator (~111 km)
    const distance = haversineDistance(0, 0, 0, 1);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
  });
});
