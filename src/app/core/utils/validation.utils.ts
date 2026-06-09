import { RegistrationData, ProfileUpdate } from '../models/worker.model';
import { SubstitutionProposal } from '../models/picklist.model';

/**
 * Basic email pattern: contains @ followed by at least one . after @
 */
function isValidEmail(email: string): boolean {
  if (!email) return false;
  const atIndex = email.indexOf('@');
  if (atIndex < 1) return false;
  const afterAt = email.substring(atIndex + 1);
  return afterAt.includes('.') && !afterAt.startsWith('.') && !afterAt.endsWith('.');
}

/**
 * Returns true if the login form is valid (both fields non-empty, email has @ and .)
 */
export function isLoginFormValid(email: string, password: string): boolean {
  if (!email || !password) return false;
  if (password.length < 1) return false;
  return isValidEmail(email);
}

/**
 * Returns field-level errors for registration, or null if valid.
 * Validation rules:
 * - name: 1-100 characters
 * - email: valid format + max 254 characters
 * - password: 8-128 chars with at least 1 uppercase, 1 lowercase, 1 digit
 * - workerType: must be "shopper" or "driver"
 * - bankAccountRef: 1-255 characters
 * - vehicleType: required for drivers (bicycle/motorcycle/car)
 * - vehicleRegistration: 1-20 characters, required for drivers
 */
export function validateRegistration(data: RegistrationData): Record<string, string> | null {
  const errors: Record<string, string> = {};

  // Name: 1-100 chars
  if (!data.name || data.name.length === 0) {
    errors['name'] = 'Name is required';
  } else if (data.name.length > 100) {
    errors['name'] = 'Name must not exceed 100 characters';
  }

  // Email: valid format + max 254
  if (!data.email || data.email.length === 0) {
    errors['email'] = 'Email is required';
  } else if (data.email.length > 254) {
    errors['email'] = 'Email must not exceed 254 characters';
  } else if (!isValidEmail(data.email)) {
    errors['email'] = 'Email must be a valid email address';
  }

  // Password: 8-128 chars, 1 upper, 1 lower, 1 digit
  if (!data.password || data.password.length === 0) {
    errors['password'] = 'Password is required';
  } else if (data.password.length < 8) {
    errors['password'] = 'Password must be at least 8 characters';
  } else if (data.password.length > 128) {
    errors['password'] = 'Password must not exceed 128 characters';
  } else {
    const hasUpper = /[A-Z]/.test(data.password);
    const hasLower = /[a-z]/.test(data.password);
    const hasDigit = /[0-9]/.test(data.password);
    if (!hasUpper || !hasLower || !hasDigit) {
      errors['password'] = 'Password must contain at least one uppercase letter, one lowercase letter, and one digit';
    }
  }

  // Worker type: shopper or driver
  if (!data.workerType) {
    errors['workerType'] = 'Worker type is required';
  } else if (data.workerType !== 'shopper' && data.workerType !== 'driver') {
    errors['workerType'] = 'Worker type must be "shopper" or "driver"';
  }

  // Bank account reference: 1-255 chars
  if (!data.bankAccountRef || data.bankAccountRef.length === 0) {
    errors['bankAccountRef'] = 'Bank account reference is required';
  } else if (data.bankAccountRef.length > 255) {
    errors['bankAccountRef'] = 'Bank account reference must not exceed 255 characters';
  }

  // Driver-specific fields
  if (data.workerType === 'driver') {
    const validVehicleTypes = ['bicycle', 'motorcycle', 'car'];
    if (!data.vehicleType) {
      errors['vehicleType'] = 'Vehicle type is required for drivers';
    } else if (!validVehicleTypes.includes(data.vehicleType)) {
      errors['vehicleType'] = 'Vehicle type must be bicycle, motorcycle, or car';
    }

    if (!data.vehicleRegistration || data.vehicleRegistration.length === 0) {
      errors['vehicleRegistration'] = 'Vehicle registration is required for drivers';
    } else if (data.vehicleRegistration.length > 20) {
      errors['vehicleRegistration'] = 'Vehicle registration must not exceed 20 characters';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Returns field-level errors for substitution proposal, or null if valid.
 * Validation rules:
 * - substituteName: 1-200 characters
 * - substituteQuantity: integer 1-50
 * - reason: must be "out_of_stock", "damaged", or "expired"
 */
export function validateSubstitution(proposal: SubstitutionProposal): Record<string, string> | null {
  const errors: Record<string, string> = {};

  // Substitute name: 1-200 chars
  if (!proposal.substituteName || proposal.substituteName.length === 0) {
    errors['substituteName'] = 'Substitute product name is required';
  } else if (proposal.substituteName.length > 200) {
    errors['substituteName'] = 'Substitute product name must not exceed 200 characters';
  }

  // Substitute quantity: integer 1-50
  if (proposal.substituteQuantity == null) {
    errors['substituteQuantity'] = 'Substitute quantity is required';
  } else if (!Number.isInteger(proposal.substituteQuantity)) {
    errors['substituteQuantity'] = 'Substitute quantity must be a whole number';
  } else if (proposal.substituteQuantity < 1 || proposal.substituteQuantity > 50) {
    errors['substituteQuantity'] = 'Substitute quantity must be between 1 and 50';
  }

  // Reason: must be one of the valid options
  const validReasons = ['out_of_stock', 'damaged', 'expired'];
  if (!proposal.reason) {
    errors['reason'] = 'Reason is required';
  } else if (!validReasons.includes(proposal.reason)) {
    errors['reason'] = 'Reason must be "out_of_stock", "damaged", or "expired"';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Returns field-level errors for profile update, or null if valid.
 * Only validates fields that are provided (partial update).
 * Validation rules:
 * - name: 1-100 characters (if provided)
 * - bankAccountRef: 1-255 characters (if provided)
 * - vehicleRegistration: 1-20 characters for drivers (if provided)
 */
export function validateProfileUpdate(
  data: ProfileUpdate,
  workerType: 'shopper' | 'driver'
): Record<string, string> | null {
  const errors: Record<string, string> = {};

  // Name: 1-100 chars (if provided)
  if (data.name !== undefined) {
    if (data.name.length === 0) {
      errors['name'] = 'Name cannot be empty';
    } else if (data.name.length > 100) {
      errors['name'] = 'Name must not exceed 100 characters';
    }
  }

  // Bank account reference: 1-255 chars (if provided)
  if (data.bankAccountRef !== undefined) {
    if (data.bankAccountRef.length === 0) {
      errors['bankAccountRef'] = 'Bank account reference cannot be empty';
    } else if (data.bankAccountRef.length > 255) {
      errors['bankAccountRef'] = 'Bank account reference must not exceed 255 characters';
    }
  }

  // Driver-specific: vehicleRegistration 1-20 (if provided and worker is driver)
  if (workerType === 'driver' && data.vehicleRegistration !== undefined) {
    if (data.vehicleRegistration.length === 0) {
      errors['vehicleRegistration'] = 'Vehicle registration cannot be empty';
    } else if (data.vehicleRegistration.length > 20) {
      errors['vehicleRegistration'] = 'Vehicle registration must not exceed 20 characters';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
