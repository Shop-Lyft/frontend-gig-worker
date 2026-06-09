import { isMarkAllPickedEnabled } from './picklist.utils';
import { PickItem, SubstitutionStatus } from '../models/picklist.model';

describe('picklist.utils', () => {
  describe('isMarkAllPickedEnabled', () => {
    it('should return false for an empty items array', () => {
      expect(isMarkAllPickedEnabled([], {})).toBe(false);
    });

    it('should return true when all items are picked', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 2, status: 'picked' },
        { id: '2', productName: 'Bread', quantity: 1, status: 'picked' },
      ];
      expect(isMarkAllPickedEnabled(items, {})).toBe(true);
    });

    it('should return false when some items are still pending', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 2, status: 'picked' },
        { id: '2', productName: 'Bread', quantity: 1, status: 'pending' },
      ];
      expect(isMarkAllPickedEnabled(items, {})).toBe(false);
    });

    it('should exclude skipped items from the check', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 2, status: 'picked' },
        { id: '2', productName: 'Bread', quantity: 1, status: 'skipped' },
      ];
      expect(isMarkAllPickedEnabled(items, {})).toBe(true);
    });

    it('should return false if all items are skipped', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 2, status: 'skipped' },
        { id: '2', productName: 'Bread', quantity: 1, status: 'skipped' },
      ];
      expect(isMarkAllPickedEnabled(items, {})).toBe(false);
    });

    it('should count substituted items as done', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 2, status: 'substituted' },
        { id: '2', productName: 'Bread', quantity: 1, status: 'picked' },
      ];
      expect(isMarkAllPickedEnabled(items, {})).toBe(true);
    });

    it('should return false when an item has a pending substitution', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 2, status: 'pending' },
        { id: '2', productName: 'Bread', quantity: 1, status: 'picked' },
      ];
      const substitutions: Record<string, SubstitutionStatus> = {
        '1': { status: 'pending' },
      };
      expect(isMarkAllPickedEnabled(items, substitutions)).toBe(false);
    });

    it('should count items with approved substitution as done', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 2, status: 'pending' },
        { id: '2', productName: 'Bread', quantity: 1, status: 'picked' },
      ];
      const substitutions: Record<string, SubstitutionStatus> = {
        '1': { status: 'approved', substituteName: 'Almond Milk', substituteQuantity: 2 },
      };
      expect(isMarkAllPickedEnabled(items, substitutions)).toBe(true);
    });

    it('should count items with rejected substitution as done (excluded from check)', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 2, status: 'pending' },
        { id: '2', productName: 'Bread', quantity: 1, status: 'picked' },
      ];
      const substitutions: Record<string, SubstitutionStatus> = {
        '1': { status: 'rejected' },
      };
      expect(isMarkAllPickedEnabled(items, substitutions)).toBe(true);
    });

    it('should count items with timed_out substitution as done (excluded from check)', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 2, status: 'pending' },
        { id: '2', productName: 'Bread', quantity: 1, status: 'picked' },
      ];
      const substitutions: Record<string, SubstitutionStatus> = {
        '1': { status: 'timed_out' },
      };
      expect(isMarkAllPickedEnabled(items, substitutions)).toBe(true);
    });

    it('should treat cancelled substitution items as not done', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 2, status: 'pending' },
        { id: '2', productName: 'Bread', quantity: 1, status: 'picked' },
      ];
      const substitutions: Record<string, SubstitutionStatus> = {
        '1': { status: 'cancelled' },
      };
      expect(isMarkAllPickedEnabled(items, substitutions)).toBe(false);
    });

    it('should handle a mix of picked, skipped, and substituted items', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 2, status: 'picked' },
        { id: '2', productName: 'Bread', quantity: 1, status: 'skipped' },
        { id: '3', productName: 'Eggs', quantity: 12, status: 'substituted' },
        { id: '4', productName: 'Butter', quantity: 1, status: 'pending' },
      ];
      const substitutions: Record<string, SubstitutionStatus> = {
        '4': { status: 'approved', substituteName: 'Margarine', substituteQuantity: 1 },
      };
      expect(isMarkAllPickedEnabled(items, substitutions)).toBe(true);
    });

    it('should return false for single pending item with no substitution', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 1, status: 'pending' },
      ];
      expect(isMarkAllPickedEnabled(items, {})).toBe(false);
    });

    it('should return true for single picked item', () => {
      const items: PickItem[] = [
        { id: '1', productName: 'Milk', quantity: 1, status: 'picked' },
      ];
      expect(isMarkAllPickedEnabled(items, {})).toBe(true);
    });
  });
});
