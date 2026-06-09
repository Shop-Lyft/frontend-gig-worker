import {
  isLoginFormValid,
  validateRegistration,
  validateSubstitution,
  validateProfileUpdate,
} from './validation.utils';
import { RegistrationData } from '../models/worker.model';
import { SubstitutionProposal } from '../models/picklist.model';

describe('Validation Utilities', () => {
  describe('isLoginFormValid', () => {
    it('should return true for valid email and password', () => {
      expect(isLoginFormValid('user@example.com', 'pass')).toBeTrue();
    });

    it('should return false for empty email', () => {
      expect(isLoginFormValid('', 'pass')).toBeFalse();
    });

    it('should return false for empty password', () => {
      expect(isLoginFormValid('user@example.com', '')).toBeFalse();
    });

    it('should return false for email without @', () => {
      expect(isLoginFormValid('userexample.com', 'pass')).toBeFalse();
    });

    it('should return false for email without . after @', () => {
      expect(isLoginFormValid('user@example', 'pass')).toBeFalse();
    });

    it('should return false for email with . directly after @', () => {
      expect(isLoginFormValid('user@.com', 'pass')).toBeFalse();
    });

    it('should return false for email ending with .', () => {
      expect(isLoginFormValid('user@example.', 'pass')).toBeFalse();
    });

    it('should return true for single character password', () => {
      expect(isLoginFormValid('a@b.c', 'x')).toBeTrue();
    });
  });

  describe('validateRegistration', () => {
    const validData: RegistrationData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Pass1234',
      workerType: 'shopper',
      bankAccountRef: '1234567890',
    };

    it('should return null for valid shopper registration', () => {
      expect(validateRegistration(validData)).toBeNull();
    });

    it('should return null for valid driver registration', () => {
      const driverData: RegistrationData = {
        ...validData,
        workerType: 'driver',
        vehicleType: 'car',
        vehicleRegistration: 'ABC123',
      };
      expect(validateRegistration(driverData)).toBeNull();
    });

    it('should return error for empty name', () => {
      const data = { ...validData, name: '' };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['name']).toBeDefined();
    });

    it('should return error for name exceeding 100 chars', () => {
      const data = { ...validData, name: 'a'.repeat(101) };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['name']).toBeDefined();
    });

    it('should return error for invalid email', () => {
      const data = { ...validData, email: 'notanemail' };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['email']).toBeDefined();
    });

    it('should return error for email exceeding 254 chars', () => {
      const data = { ...validData, email: 'a'.repeat(246) + '@test.com' };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['email']).toBeDefined();
    });

    it('should return error for password shorter than 8 chars', () => {
      const data = { ...validData, password: 'Pass1' };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['password']).toBeDefined();
    });

    it('should return error for password exceeding 128 chars', () => {
      const data = { ...validData, password: 'Aa1' + 'x'.repeat(126) };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['password']).toBeDefined();
    });

    it('should return error for password without uppercase', () => {
      const data = { ...validData, password: 'pass1234' };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['password']).toBeDefined();
    });

    it('should return error for password without lowercase', () => {
      const data = { ...validData, password: 'PASS1234' };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['password']).toBeDefined();
    });

    it('should return error for password without digit', () => {
      const data = { ...validData, password: 'Password' };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['password']).toBeDefined();
    });

    it('should return error for empty bankAccountRef', () => {
      const data = { ...validData, bankAccountRef: '' };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['bankAccountRef']).toBeDefined();
    });

    it('should return error for bankAccountRef exceeding 255 chars', () => {
      const data = { ...validData, bankAccountRef: 'x'.repeat(256) };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['bankAccountRef']).toBeDefined();
    });

    it('should return error for driver without vehicleType', () => {
      const data: RegistrationData = {
        ...validData,
        workerType: 'driver',
        vehicleRegistration: 'ABC123',
      };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['vehicleType']).toBeDefined();
    });

    it('should return error for driver without vehicleRegistration', () => {
      const data: RegistrationData = {
        ...validData,
        workerType: 'driver',
        vehicleType: 'car',
      };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['vehicleRegistration']).toBeDefined();
    });

    it('should return error for driver with vehicleRegistration exceeding 20 chars', () => {
      const data: RegistrationData = {
        ...validData,
        workerType: 'driver',
        vehicleType: 'car',
        vehicleRegistration: 'x'.repeat(21),
      };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(errors!['vehicleRegistration']).toBeDefined();
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const data: RegistrationData = {
        name: '',
        email: 'invalid',
        password: 'short',
        workerType: 'shopper',
        bankAccountRef: '',
      };
      const errors = validateRegistration(data);
      expect(errors).not.toBeNull();
      expect(Object.keys(errors!).length).toBeGreaterThan(1);
    });
  });

  describe('validateSubstitution', () => {
    const validProposal: SubstitutionProposal = {
      substituteName: 'Alternative Product',
      substituteQuantity: 2,
      reason: 'out_of_stock',
    };

    it('should return null for valid substitution', () => {
      expect(validateSubstitution(validProposal)).toBeNull();
    });

    it('should return null for all valid reasons', () => {
      expect(validateSubstitution({ ...validProposal, reason: 'out_of_stock' })).toBeNull();
      expect(validateSubstitution({ ...validProposal, reason: 'damaged' })).toBeNull();
      expect(validateSubstitution({ ...validProposal, reason: 'expired' })).toBeNull();
    });

    it('should return error for empty substituteName', () => {
      const proposal = { ...validProposal, substituteName: '' };
      const errors = validateSubstitution(proposal);
      expect(errors).not.toBeNull();
      expect(errors!['substituteName']).toBeDefined();
    });

    it('should return error for substituteName exceeding 200 chars', () => {
      const proposal = { ...validProposal, substituteName: 'x'.repeat(201) };
      const errors = validateSubstitution(proposal);
      expect(errors).not.toBeNull();
      expect(errors!['substituteName']).toBeDefined();
    });

    it('should return error for quantity less than 1', () => {
      const proposal = { ...validProposal, substituteQuantity: 0 };
      const errors = validateSubstitution(proposal);
      expect(errors).not.toBeNull();
      expect(errors!['substituteQuantity']).toBeDefined();
    });

    it('should return error for quantity greater than 50', () => {
      const proposal = { ...validProposal, substituteQuantity: 51 };
      const errors = validateSubstitution(proposal);
      expect(errors).not.toBeNull();
      expect(errors!['substituteQuantity']).toBeDefined();
    });

    it('should return error for non-integer quantity', () => {
      const proposal = { ...validProposal, substituteQuantity: 2.5 };
      const errors = validateSubstitution(proposal);
      expect(errors).not.toBeNull();
      expect(errors!['substituteQuantity']).toBeDefined();
    });

    it('should return error for invalid reason', () => {
      const proposal = { ...validProposal, reason: 'other' as any };
      const errors = validateSubstitution(proposal);
      expect(errors).not.toBeNull();
      expect(errors!['reason']).toBeDefined();
    });

    it('should accept boundary values (qty 1 and 50)', () => {
      expect(validateSubstitution({ ...validProposal, substituteQuantity: 1 })).toBeNull();
      expect(validateSubstitution({ ...validProposal, substituteQuantity: 50 })).toBeNull();
    });

    it('should accept substituteName at exactly 200 chars', () => {
      const proposal = { ...validProposal, substituteName: 'x'.repeat(200) };
      expect(validateSubstitution(proposal)).toBeNull();
    });
  });

  describe('validateProfileUpdate', () => {
    it('should return null for empty update (no fields provided)', () => {
      expect(validateProfileUpdate({}, 'shopper')).toBeNull();
    });

    it('should return null for valid name update', () => {
      expect(validateProfileUpdate({ name: 'Jane' }, 'shopper')).toBeNull();
    });

    it('should return error for empty name', () => {
      const errors = validateProfileUpdate({ name: '' }, 'shopper');
      expect(errors).not.toBeNull();
      expect(errors!['name']).toBeDefined();
    });

    it('should return error for name exceeding 100 chars', () => {
      const errors = validateProfileUpdate({ name: 'x'.repeat(101) }, 'shopper');
      expect(errors).not.toBeNull();
      expect(errors!['name']).toBeDefined();
    });

    it('should return null for valid bankAccountRef', () => {
      expect(validateProfileUpdate({ bankAccountRef: '123456' }, 'shopper')).toBeNull();
    });

    it('should return error for empty bankAccountRef', () => {
      const errors = validateProfileUpdate({ bankAccountRef: '' }, 'driver');
      expect(errors).not.toBeNull();
      expect(errors!['bankAccountRef']).toBeDefined();
    });

    it('should return error for bankAccountRef exceeding 255 chars', () => {
      const errors = validateProfileUpdate({ bankAccountRef: 'x'.repeat(256) }, 'shopper');
      expect(errors).not.toBeNull();
      expect(errors!['bankAccountRef']).toBeDefined();
    });

    it('should return null for valid driver vehicleRegistration', () => {
      expect(validateProfileUpdate({ vehicleRegistration: 'ABC123' }, 'driver')).toBeNull();
    });

    it('should return error for empty vehicleRegistration for driver', () => {
      const errors = validateProfileUpdate({ vehicleRegistration: '' }, 'driver');
      expect(errors).not.toBeNull();
      expect(errors!['vehicleRegistration']).toBeDefined();
    });

    it('should return error for vehicleRegistration exceeding 20 chars for driver', () => {
      const errors = validateProfileUpdate({ vehicleRegistration: 'x'.repeat(21) }, 'driver');
      expect(errors).not.toBeNull();
      expect(errors!['vehicleRegistration']).toBeDefined();
    });

    it('should not validate vehicleRegistration for shoppers', () => {
      // Even if vehicleRegistration is empty, shoppers don't get this validation
      expect(validateProfileUpdate({ vehicleRegistration: '' }, 'shopper')).toBeNull();
    });

    it('should accept name at exactly 100 chars', () => {
      expect(validateProfileUpdate({ name: 'x'.repeat(100) }, 'shopper')).toBeNull();
    });

    it('should accept bankAccountRef at exactly 255 chars', () => {
      expect(validateProfileUpdate({ bankAccountRef: 'x'.repeat(255) }, 'driver')).toBeNull();
    });

    it('should accept vehicleRegistration at exactly 20 chars for driver', () => {
      expect(validateProfileUpdate({ vehicleRegistration: 'x'.repeat(20) }, 'driver')).toBeNull();
    });
  });
});
