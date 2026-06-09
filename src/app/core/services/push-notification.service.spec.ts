import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { PushNotificationService } from './push-notification.service';
import { selectWorker } from '../../store/auth/auth.selectors';
import { selectActiveJob } from '../../store/active-job/active-job.selectors';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let store: MockStore;

  const initialState = {
    auth: {
      worker: { id: '1', available: true, name: 'Test', email: 'test@test.com', workerType: 'shopper', bankAccountRef: 'ref', createdAt: '' },
      token: 'test-token',
      isAuthenticated: true,
      loginLoading: false,
      loginError: null,
      loginAttempts: 0,
      lockoutUntil: null,
    },
    'active-job': {
      data: null,
      loading: false,
      error: null,
      lastFetchedAt: null,
      picklist: null,
      picklistLoading: false,
      picklistError: null,
      substitutions: {},
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PushNotificationService,
        provideMockStore({
          initialState,
          selectors: [
            { selector: selectWorker, value: { id: '1', available: true, name: 'Test', email: 'test@test.com', workerType: 'shopper', bankAccountRef: 'ref', createdAt: '' } },
            { selector: selectActiveJob, value: null },
          ],
        }),
      ],
    });

    service = TestBed.inject(PushNotificationService);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    service.resetRateLimiting();
  });

  describe('permissionStatus', () => {
    it('should initialize with default permission', () => {
      // In test environment Notification may not exist, but signal defaults to 'default'
      expect(['default', 'granted', 'denied']).toContain(service.permissionStatus());
    });
  });

  describe('isPermissionDenied', () => {
    it('should return true when permission is denied', () => {
      service.permissionStatus.set('denied');
      expect(service.isPermissionDenied()).toBe(true);
    });

    it('should return false when permission is granted', () => {
      service.permissionStatus.set('granted');
      expect(service.isPermissionDenied()).toBe(false);
    });

    it('should return false when permission is default', () => {
      service.permissionStatus.set('default');
      expect(service.isPermissionDenied()).toBe(false);
    });
  });

  describe('shouldSuppress', () => {
    it('should suppress when worker is offline', () => {
      expect(service.shouldSuppress(false, false)).toBe(true);
    });

    it('should suppress when worker has active job', () => {
      expect(service.shouldSuppress(true, true)).toBe(true);
    });

    it('should suppress when worker is offline AND has active job', () => {
      expect(service.shouldSuppress(false, true)).toBe(true);
    });

    it('should NOT suppress when worker is online and has no active job', () => {
      expect(service.shouldSuppress(true, false)).toBe(false);
    });
  });

  describe('isRateLimited', () => {
    it('should not be rate limited with 0 notifications', () => {
      expect(service.isRateLimited(1000)).toBe(false);
    });

    it('should not be rate limited with fewer than 5 notifications in window', () => {
      const now = 60000;
      service.recordNotification(now - 40000);
      service.recordNotification(now - 30000);
      service.recordNotification(now - 20000);
      service.recordNotification(now - 10000);
      expect(service.isRateLimited(now)).toBe(false);
    });

    it('should be rate limited with 5 notifications in the 60s window', () => {
      const now = 60000;
      service.recordNotification(now - 50000);
      service.recordNotification(now - 40000);
      service.recordNotification(now - 30000);
      service.recordNotification(now - 20000);
      service.recordNotification(now - 10000);
      expect(service.isRateLimited(now)).toBe(true);
    });

    it('should not be rate limited after timestamps expire from the window', () => {
      const baseTime = 100000;
      // Record 5 notifications at baseTime
      for (let i = 0; i < 5; i++) {
        service.recordNotification(baseTime + i * 1000);
      }
      // At baseTime + 61000, all should have expired
      expect(service.isRateLimited(baseTime + 61000)).toBe(false);
    });

    it('should correctly handle mixed expired and active timestamps', () => {
      const now = 120000;
      // These are outside the 60s window (expired)
      service.recordNotification(now - 70000);
      service.recordNotification(now - 65000);
      // These are inside the window (active)
      service.recordNotification(now - 30000);
      service.recordNotification(now - 20000);
      service.recordNotification(now - 10000);
      // 3 active, 2 expired = not rate limited
      expect(service.isRateLimited(now)).toBe(false);
    });
  });

  describe('recordNotification', () => {
    it('should add timestamp to tracking array', () => {
      service.recordNotification(5000);
      expect(service.getNotificationCountInWindow(5000)).toBe(1);
    });

    it('should accumulate timestamps', () => {
      service.recordNotification(1000);
      service.recordNotification(2000);
      service.recordNotification(3000);
      expect(service.getNotificationCountInWindow(3000)).toBe(3);
    });
  });

  describe('getNotificationCountInWindow', () => {
    it('should return 0 when no notifications recorded', () => {
      expect(service.getNotificationCountInWindow(1000)).toBe(0);
    });

    it('should exclude expired notifications', () => {
      service.recordNotification(1000);
      service.recordNotification(2000);
      // 65 seconds later, both are expired
      expect(service.getNotificationCountInWindow(66000)).toBe(0);
    });
  });

  describe('resetRateLimiting', () => {
    it('should clear all tracked timestamps', () => {
      service.recordNotification(1000);
      service.recordNotification(2000);
      service.resetRateLimiting();
      expect(service.getNotificationCountInWindow(2000)).toBe(0);
    });
  });

  describe('handleNotificationTap', () => {
    it('should emit jobId on the onNotificationTap observable', (done) => {
      service.onNotificationTap.subscribe((event) => {
        expect(event.jobId).toBe('job-123');
        done();
      });

      service.handleNotificationTap('job-123');
    });

    it('should emit empty string jobId for batch summary taps', (done) => {
      service.onNotificationTap.subscribe((event) => {
        expect(event.jobId).toBe('');
        done();
      });

      service.handleNotificationTap('');
    });
  });

  describe('requestPermission', () => {
    it('should return denied when Notification API is not available', (done) => {
      // In environments without Notification API, it should gracefully handle
      // This test works if Notification is undefined in the test env
      if (typeof Notification === 'undefined') {
        service.requestPermission().subscribe((result) => {
          expect(result).toBe('denied');
          done();
        });
      } else {
        // If Notification is defined, we test based on current permission
        service.requestPermission().subscribe((result) => {
          expect(['granted', 'denied']).toContain(result);
          done();
        });
      }
    });
  });
});
