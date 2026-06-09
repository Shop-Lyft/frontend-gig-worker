import { authReducer, AuthState, initialState } from './auth.reducer';
import * as AuthActions from './auth.actions';
import { WorkerProfile } from '../../core/models/worker.model';

describe('Auth Reducer', () => {
  const mockWorker: WorkerProfile = {
    id: '1',
    email: 'test@example.com',
    name: 'Test Worker',
    workerType: 'shopper',
    bankAccountRef: 'REF123',
    available: false,
    createdAt: '2024-01-01T00:00:00Z',
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const action = { type: 'Unknown' } as any;
      const state = authReducer(undefined, action);
      expect(state).toEqual(initialState);
    });
  });

  describe('login action', () => {
    it('should set loginLoading to true and clear error', () => {
      const stateWithError: AuthState = {
        ...initialState,
        loginError: 'previous error',
      };
      const action = AuthActions.login({ email: 'test@test.com', password: 'pass' });
      const state = authReducer(stateWithError, action);

      expect(state.loginLoading).toBe(true);
      expect(state.loginError).toBeNull();
    });
  });

  describe('loginSuccess action', () => {
    it('should set authenticated state and reset attempts', () => {
      const stateWithAttempts: AuthState = {
        ...initialState,
        loginAttempts: 3,
        loginLoading: true,
      };
      const action = AuthActions.loginSuccess({ token: 'jwt-token', worker: mockWorker });
      const state = authReducer(stateWithAttempts, action);

      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('jwt-token');
      expect(state.worker).toEqual(mockWorker);
      expect(state.loginLoading).toBe(false);
      expect(state.loginAttempts).toBe(0);
      expect(state.lockoutUntil).toBeNull();
    });
  });

  describe('loginFailure action', () => {
    it('should increment loginAttempts and set error', () => {
      const action = AuthActions.loginFailure({ error: 'Invalid credentials' });
      const state = authReducer(initialState, action);

      expect(state.loginLoading).toBe(false);
      expect(state.loginError).toBe('Invalid credentials');
      expect(state.loginAttempts).toBe(1);
      expect(state.lockoutUntil).toBeNull();
    });

    it('should set lockoutUntil after 5 failures', () => {
      let state: AuthState = { ...initialState, loginAttempts: 4 };
      const action = AuthActions.loginFailure({ error: 'Invalid credentials' });
      state = authReducer(state, action);

      expect(state.loginAttempts).toBe(5);
      expect(state.lockoutUntil).not.toBeNull();
      expect(state.lockoutUntil!).toBeGreaterThan(Date.now() - 1000);
      expect(state.lockoutUntil!).toBeLessThanOrEqual(Date.now() + 60000);
    });

    it('should not set lockoutUntil before 5 failures', () => {
      let state: AuthState = { ...initialState, loginAttempts: 3 };
      const action = AuthActions.loginFailure({ error: 'Invalid credentials' });
      state = authReducer(state, action);

      expect(state.loginAttempts).toBe(4);
      expect(state.lockoutUntil).toBeNull();
    });
  });

  describe('register action', () => {
    it('should set loginLoading to true', () => {
      const action = AuthActions.register({ data: {} as any });
      const state = authReducer(initialState, action);

      expect(state.loginLoading).toBe(true);
      expect(state.loginError).toBeNull();
    });
  });

  describe('registerSuccess action', () => {
    it('should set authenticated state', () => {
      const action = AuthActions.registerSuccess({ token: 'jwt-token', worker: mockWorker });
      const state = authReducer(initialState, action);

      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('jwt-token');
      expect(state.worker).toEqual(mockWorker);
      expect(state.loginLoading).toBe(false);
    });
  });

  describe('registerFailure action', () => {
    it('should set error and stop loading', () => {
      const action = AuthActions.registerFailure({ error: 'Email already exists' });
      const state = authReducer({ ...initialState, loginLoading: true }, action);

      expect(state.loginLoading).toBe(false);
      expect(state.loginError).toBe('Email already exists');
    });
  });

  describe('logout action', () => {
    it('should set loading', () => {
      const authenticatedState: AuthState = {
        ...initialState,
        isAuthenticated: true,
        token: 'token',
        worker: mockWorker,
      };
      const action = AuthActions.logout();
      const state = authReducer(authenticatedState, action);

      expect(state.loginLoading).toBe(true);
    });
  });

  describe('logoutSuccess action', () => {
    it('should reset to initial state', () => {
      const authenticatedState: AuthState = {
        ...initialState,
        isAuthenticated: true,
        token: 'token',
        worker: mockWorker,
      };
      const action = AuthActions.logoutSuccess();
      const state = authReducer(authenticatedState, action);

      expect(state).toEqual(initialState);
    });
  });

  describe('tokenExpired action', () => {
    it('should reset to initial state', () => {
      const authenticatedState: AuthState = {
        ...initialState,
        isAuthenticated: true,
        token: 'token',
        worker: mockWorker,
      };
      const action = AuthActions.tokenExpired();
      const state = authReducer(authenticatedState, action);

      expect(state).toEqual(initialState);
    });
  });

  describe('clearError action', () => {
    it('should clear loginError', () => {
      const stateWithError: AuthState = {
        ...initialState,
        loginError: 'some error',
      };
      const action = AuthActions.clearError();
      const state = authReducer(stateWithError, action);

      expect(state.loginError).toBeNull();
    });
  });
});
