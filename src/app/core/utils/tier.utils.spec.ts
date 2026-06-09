import { classifyTier, getTierColor, PerformanceTier } from './tier.utils';

describe('tier.utils', () => {
  describe('classifyTier', () => {
    it('should return gold for rating exactly 4.8', () => {
      expect(classifyTier(4.8)).toBe('gold');
    });

    it('should return gold for rating 5.0', () => {
      expect(classifyTier(5.0)).toBe('gold');
    });

    it('should return gold for rating above 4.8', () => {
      expect(classifyTier(4.9)).toBe('gold');
    });

    it('should return silver for rating exactly 4.5', () => {
      expect(classifyTier(4.5)).toBe('silver');
    });

    it('should return silver for rating 4.79', () => {
      expect(classifyTier(4.79)).toBe('silver');
    });

    it('should return silver for rating 4.6', () => {
      expect(classifyTier(4.6)).toBe('silver');
    });

    it('should return bronze for rating just below 4.5', () => {
      expect(classifyTier(4.49)).toBe('bronze');
    });

    it('should return bronze for rating 0', () => {
      expect(classifyTier(0)).toBe('bronze');
    });

    it('should return bronze for rating 4.0', () => {
      expect(classifyTier(4.0)).toBe('bronze');
    });

    it('should return bronze for rating 3.5', () => {
      expect(classifyTier(3.5)).toBe('bronze');
    });
  });

  describe('getTierColor', () => {
    it('should return gold colour #FFD700 for gold tier', () => {
      expect(getTierColor('gold')).toBe('#FFD700');
    });

    it('should return silver colour #C0C0C0 for silver tier', () => {
      expect(getTierColor('silver')).toBe('#C0C0C0');
    });

    it('should return bronze colour #CD7F32 for bronze tier', () => {
      expect(getTierColor('bronze')).toBe('#CD7F32');
    });
  });
});
