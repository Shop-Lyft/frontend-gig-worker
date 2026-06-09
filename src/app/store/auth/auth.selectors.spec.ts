import { AuthState, initialState } from './auth.reducer';
import {
  selectAuthState,
  selectIsAuthenticated,
  selectIsLockedOut,
  selectLoginAttempts,
  selectLoginError,
  selectLoginLoading,
  selectLockoutUntil,
  selectToken,
  selectWorker,
} from './auth.selectors';
import { WorkerProfile } from '../../core/models/worker.model';

describe('Auth Selectors', () => {
  const mockWorker: WorkerProfile = {
    id: '1',
    email: 'test@example.com',
    name: 'Test Worker',
    workerType: 'shopper',
    bankAccountRef: 'REF123',
    available: false,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const authenticatedState: AuthState = {
    worker: mockWorker,
    token: 'jwt-token',
    isAuthenticated: true,
    loginLoading: false,
    loginError: null,
    loginAttempts: 0,
    lockoutUntil: null,
  };

  describe('selectIsAuthenticated', () => {
    it('should return false for initial state', () => {
      const result = selectIsAuthenticated.projector(initialState);
      expect(result).toBe(false);
    });

    it('should return true when authenticated', () => {
      const result = selectIsAuthenticated.projector(authenticatedState);
      expect(result).toBe(true);
    });
  });

  describe('selectWorker', () => {
    it('should return null for initial state', () => {
      const result = selectWorker.projector(initialState);
      expect(result).toBeNull();
    });

    it('should return worker when authenticated', () => {
      const result = selectWorker.projector(authenticatedState);
      expect(result).toEqual(mockWorker);
    });
  });

  describe('selectToken', () => {
    it('should return null for initial state', () => {
      const result = selectToken.projector(initialState);
      expect(result).toBeNull();
    });

    it('should return token when authenticated', () => {
      const result = selectToken.projector(authenticatedState);
      expect(result).toBe('jwt-token');
    });
  });

  describe('selectLoginLoading', () => {
    it('should return false for initial state', () => {
      const result = selectLoginLoading.projector(initialState);
      expect(result).toBe(false);
    });

    it('should return true when loading', () => {
      const state: AuthState = { ...initialState, loginLoading: true };
      const result = selectLoginLoading.projector(state);
      expect(result).toBe(true);
    });
  });

  describe('selectLoginError', () => {
    it('should return null for initial state', () => {
      const result = selectLoginError.projector(initialState);
      expect(result).toBeNull();
    });

    it('should return error message', () => {
      const state: AuthState = { ...initialState, loginError: 'Error occurred' };
      const result = selectLoginError.projector(state);
      expect(result).toBe('Error occurred');
    });
  });

  describe('selectIsLockedOut', () => {
    it('should return false for initial state', () => {
      const result = selectIsLockedOut.projector(initialState);
      expect(result).toBe(false);
    });

    it('should return true when lockout is in the future', () => {
      const state: AuthState = { ...initialState, lockoutUntil: Date.now() + 30000 };
      const result = selectIsLockedOut.projector(state);
      expect(result).toBe(true);
    });

    it('should return false when lockout is in the past', () => {
      const state: AuthState = { ...initialState, lockoutUntil: Date.now() - 1000 };
      const result = selectIsLockedOut.projector(state);
      expect(result).toBe(false);
    });
  });

  describe('selectLoginAttempts', () => {
    it('should return 0 for initial state', () => {
      const result = selectLoginAttempts.projector(initialState);
      expect(result).toBe(0);
    });

    it('should return current attempts count', () => {
      const state: AuthState = { ...initialState, loginAttempts: 3 };
      const result = selectLoginAttempts.projector(state);
      expect(result).toBe(3);
    });
  });

  describe('selectLockoutUntil', () => {
    it('should return null for initial state', () => {
      const result = selectLockoutUntil.projector(initialState);
      expect(result).toBeNull();
    });

    it('should return lockout timestamp', () => {
      const ts = Date.now() + 60000;
      const state: AuthState = { ...initialState, lockoutUntil: ts };
      const result = selectLockoutUntil.projector(state);
      expect(result).toBe(ts);
    });
  });
});
