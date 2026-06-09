import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { ConnectivityService } from './connectivity.service';

describe('ConnectivityService', () => {
  let service: ConnectivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConnectivityService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should reflect initial online status', () => {
    expect(service.isOnline()).toBe(navigator.onLine);
  });

  it('should set isOnline to false and connectionLost to true on offline event', () => {
    window.dispatchEvent(new Event('offline'));

    expect(service.isOnline()).toBeFalse();
    expect(service.connectionLost()).toBeTrue();
    expect(service.showOfflineBanner()).toBeTrue();
  });

  it('should set isOnline to true and connectionLost to false on online event', () => {
    // First go offline
    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBeFalse();

    // Then come back online
    window.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBeTrue();
    expect(service.connectionLost()).toBeFalse();
    expect(service.showOfflineBanner()).toBeFalse();
  });

  it('should emit onReconnect when transitioning from offline to online', () => {
    let reconnected = false;
    const subscription = service.onReconnect.subscribe(() => {
      reconnected = true;
    });

    // Go offline first
    window.dispatchEvent(new Event('offline'));
    expect(reconnected).toBeFalse();

    // Come back online
    window.dispatchEvent(new Event('online'));
    expect(reconnected).toBeTrue();

    subscription.unsubscribe();
  });

  it('should NOT emit onReconnect if already online when online event fires', () => {
    // Service starts online (navigator.onLine is true in test browser)
    let reconnected = false;
    const subscription = service.onReconnect.subscribe(() => {
      reconnected = true;
    });

    // Fire online event without going offline first
    window.dispatchEvent(new Event('online'));
    expect(reconnected).toBeFalse();

    subscription.unsubscribe();
  });

  it('should showOfflineBanner be true only when offline', () => {
    // Initially online
    expect(service.showOfflineBanner()).toBeFalse();

    window.dispatchEvent(new Event('offline'));
    expect(service.showOfflineBanner()).toBeTrue();

    window.dispatchEvent(new Event('online'));
    expect(service.showOfflineBanner()).toBeFalse();
  });

  it('should clean up event listeners on destroy', () => {
    const removeEventListenerSpy = spyOn(window, 'removeEventListener').and.callThrough();

    service.ngOnDestroy();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', jasmine.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', jasmine.any(Function));
  });
});
