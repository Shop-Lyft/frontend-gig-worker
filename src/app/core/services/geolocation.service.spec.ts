import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { GeolocationService, GeoPosition, PermissionStatus } from './geolocation.service';

describe('GeolocationService', () => {
  let service: GeolocationService;

  // Mock navigator.geolocation
  let mockGetCurrentPosition: jasmine.Spy;
  let mockGeolocation: { getCurrentPosition: jasmine.Spy };

  beforeEach(() => {
    mockGetCurrentPosition = jasmine.createSpy('getCurrentPosition');
    mockGeolocation = { getCurrentPosition: mockGetCurrentPosition };

    // Override navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });

    // Remove permissions API to simplify tests
    Object.defineProperty(navigator, 'permissions', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(GeolocationService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  describe('initial state', () => {
    it('should have null currentPosition initially', () => {
      expect(service.currentPosition()).toBeNull();
    });

    it('should have "unknown" permissionStatus initially', () => {
      expect(service.permissionStatus()).toBe('unknown');
    });

    it('should have isStale as false initially', () => {
      expect(service.isStale()).toBe(false);
    });

    it('should have null lastFixTimestamp initially', () => {
      expect(service.lastFixTimestamp()).toBeNull();
    });
  });

  describe('requestPermission()', () => {
    it('should emit true when geolocation permission is granted', (done) => {
      mockGetCurrentPosition.and.callFake(
        (success: PositionCallback) => {
          success({
            coords: { latitude: -26.2041, longitude: 28.0473 },
            timestamp: Date.now(),
          } as GeolocationPosition);
        }
      );

      service.requestPermission().subscribe((result) => {
        expect(result).toBe(true);
        expect(service.permissionStatus()).toBe('granted');
        expect(service.currentPosition()).toEqual({ lat: -26.2041, lng: 28.0473 });
        done();
      });
    });

    it('should emit false when permission is denied', (done) => {
      mockGetCurrentPosition.and.callFake(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error({
            code: 1, // PERMISSION_DENIED
            message: 'User denied',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        }
      );

      service.requestPermission().subscribe((result) => {
        expect(result).toBe(false);
        expect(service.permissionStatus()).toBe('denied');
        done();
      });
    });

    it('should emit false when geolocation API is not available', (done) => {
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      service.requestPermission().subscribe((result) => {
        expect(result).toBe(false);
        expect(service.permissionStatus()).toBe('denied');
        done();
      });
    });
  });

  describe('startTracking()', () => {
    it('should immediately fetch a position when starting', fakeAsync(() => {
      mockGetCurrentPosition.and.callFake(
        (success: PositionCallback) => {
          success({
            coords: { latitude: -26.2041, longitude: 28.0473 },
            timestamp: Date.now(),
          } as GeolocationPosition);
        }
      );

      service.startTracking(10_000);

      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
      expect(service.currentPosition()).toEqual({ lat: -26.2041, lng: 28.0473 });

      discardPeriodicTasks();
    }));

    it('should poll at the specified interval', fakeAsync(() => {
      mockGetCurrentPosition.and.callFake(
        (success: PositionCallback) => {
          success({
            coords: { latitude: -26.2041, longitude: 28.0473 },
            timestamp: Date.now(),
          } as GeolocationPosition);
        }
      );

      service.startTracking(10_000);

      // Initial call
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);

      // After 10 seconds, should poll again
      tick(10_000);
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(2);

      // After another 10 seconds
      tick(10_000);
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(3);

      discardPeriodicTasks();
    }));

    it('should use 30s interval for idle mode', fakeAsync(() => {
      mockGetCurrentPosition.and.callFake(
        (success: PositionCallback) => {
          success({
            coords: { latitude: -26.2041, longitude: 28.0473 },
            timestamp: Date.now(),
          } as GeolocationPosition);
        }
      );

      service.startTracking(GeolocationService.IDLE_INTERVAL_MS);

      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);

      // After 10 seconds, should NOT have polled again (idle = 30s)
      tick(10_000);
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);

      // After 30 seconds total, should poll
      tick(20_000);
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(2);

      discardPeriodicTasks();
    }));

    it('should update position on each successful poll', fakeAsync(() => {
      let callCount = 0;
      const positions = [
        { latitude: -26.2041, longitude: 28.0473 },
        { latitude: -26.2100, longitude: 28.0500 },
      ];

      mockGetCurrentPosition.and.callFake(
        (success: PositionCallback) => {
          success({
            coords: positions[callCount++],
            timestamp: Date.now(),
          } as GeolocationPosition);
        }
      );

      service.startTracking(10_000);

      expect(service.currentPosition()).toEqual({ lat: -26.2041, lng: 28.0473 });

      tick(10_000);
      expect(service.currentPosition()).toEqual({ lat: -26.2100, lng: 28.0500 });

      discardPeriodicTasks();
    }));
  });

  describe('stopTracking()', () => {
    it('should stop polling when called', fakeAsync(() => {
      mockGetCurrentPosition.and.callFake(
        (success: PositionCallback) => {
          success({
            coords: { latitude: -26.2041, longitude: 28.0473 },
            timestamp: Date.now(),
          } as GeolocationPosition);
        }
      );

      service.startTracking(10_000);
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);

      service.stopTracking();

      tick(10_000);
      // Should NOT have polled again
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
    }));
  });

  describe('stale detection', () => {
    it('should set isStale to true when no GPS fix for 60+ seconds', fakeAsync(() => {
      // First call succeeds, subsequent calls fail
      let callCount = 0;
      mockGetCurrentPosition.and.callFake(
        (success: PositionCallback, error: PositionErrorCallback) => {
          if (callCount === 0) {
            callCount++;
            success({
              coords: { latitude: -26.2041, longitude: 28.0473 },
              timestamp: Date.now(),
            } as GeolocationPosition);
          } else {
            callCount++;
            error({
              code: 2, // POSITION_UNAVAILABLE
              message: 'GPS signal lost',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          }
        }
      );

      service.startTracking(10_000);
      expect(service.isStale()).toBe(false);

      // After 60 seconds without a successful fix, should become stale
      tick(61_000);
      expect(service.isStale()).toBe(true);

      discardPeriodicTasks();
    }));

    it('should clear stale flag when GPS fix is restored', fakeAsync(() => {
      let shouldSucceed = true;

      mockGetCurrentPosition.and.callFake(
        (success: PositionCallback, error: PositionErrorCallback) => {
          if (shouldSucceed) {
            success({
              coords: { latitude: -26.2041, longitude: 28.0473 },
              timestamp: Date.now(),
            } as GeolocationPosition);
          } else {
            error({
              code: 2,
              message: 'GPS signal lost',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          }
        }
      );

      service.startTracking(10_000);
      expect(service.isStale()).toBe(false);

      // Make subsequent calls fail
      shouldSucceed = false;

      // After 61 seconds should be stale
      tick(61_000);
      expect(service.isStale()).toBe(true);

      // Restore GPS
      shouldSucceed = true;

      // Next poll restores it
      tick(10_000);
      expect(service.isStale()).toBe(false);

      discardPeriodicTasks();
    }));

    it('should mark stale if tracking starts with null lastFixTimestamp and fix never comes', fakeAsync(() => {
      mockGetCurrentPosition.and.callFake(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error({
            code: 3, // TIMEOUT
            message: 'Timed out',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        }
      );

      service.startTracking(10_000);

      // After stale check runs (1s intervals), with null lastFix it's immediately stale
      tick(1_000);
      expect(service.isStale()).toBe(true);

      discardPeriodicTasks();
    }));
  });

  describe('error handling', () => {
    it('should set permissionStatus to denied on PERMISSION_DENIED error', fakeAsync(() => {
      mockGetCurrentPosition.and.callFake(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error({
            code: 1, // PERMISSION_DENIED
            message: 'User denied geolocation',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        }
      );

      service.startTracking(10_000);
      expect(service.permissionStatus()).toBe('denied');

      discardPeriodicTasks();
    }));

    it('should not clear current position on POSITION_UNAVAILABLE error', fakeAsync(() => {
      let callCount = 0;
      mockGetCurrentPosition.and.callFake(
        (success: PositionCallback, error: PositionErrorCallback) => {
          callCount++;
          if (callCount === 1) {
            success({
              coords: { latitude: -26.2041, longitude: 28.0473 },
              timestamp: Date.now(),
            } as GeolocationPosition);
          } else {
            error({
              code: 2,
              message: 'Position unavailable',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          }
        }
      );

      service.startTracking(10_000);
      expect(service.currentPosition()).toEqual({ lat: -26.2041, lng: 28.0473 });

      tick(10_000);
      // Position should still be the last known one
      expect(service.currentPosition()).toEqual({ lat: -26.2041, lng: 28.0473 });

      discardPeriodicTasks();
    }));

    it('should not clear current position on TIMEOUT error', fakeAsync(() => {
      let callCount = 0;
      mockGetCurrentPosition.and.callFake(
        (success: PositionCallback, error: PositionErrorCallback) => {
          callCount++;
          if (callCount === 1) {
            success({
              coords: { latitude: -26.2041, longitude: 28.0473 },
              timestamp: Date.now(),
            } as GeolocationPosition);
          } else {
            error({
              code: 3,
              message: 'Timeout',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          }
        }
      );

      service.startTracking(10_000);
      expect(service.currentPosition()).toEqual({ lat: -26.2041, lng: 28.0473 });

      tick(10_000);
      expect(service.currentPosition()).toEqual({ lat: -26.2041, lng: 28.0473 });

      discardPeriodicTasks();
    }));
  });

  describe('constants', () => {
    it('should have ACTIVE_INTERVAL_MS of 10000', () => {
      expect(GeolocationService.ACTIVE_INTERVAL_MS).toBe(10_000);
    });

    it('should have IDLE_INTERVAL_MS of 30000', () => {
      expect(GeolocationService.IDLE_INTERVAL_MS).toBe(30_000);
    });

    it('should have STALE_THRESHOLD_MS of 60000', () => {
      expect(GeolocationService.STALE_THRESHOLD_MS).toBe(60_000);
    });
  });

  describe('startTracking replaces previous tracking', () => {
    it('should stop previous polling when startTracking is called again', fakeAsync(() => {
      mockGetCurrentPosition.and.callFake(
        (success: PositionCallback) => {
          success({
            coords: { latitude: -26.2041, longitude: 28.0473 },
            timestamp: Date.now(),
          } as GeolocationPosition);
        }
      );

      // Start with idle interval
      service.startTracking(30_000);
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);

      // Switch to active interval
      service.startTracking(10_000);
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(2); // new immediate call

      // After 10s, should poll at new interval
      tick(10_000);
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(3);

      // Verify old 30s interval is no longer active
      tick(20_000);
      // Only one more poll at the 10s mark
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(5); // 3 + 2 more at 10s each

      discardPeriodicTasks();
    }));
  });
});
