import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface GeoPosition {
  lat: number;
  lng: number;
}

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

/**
 * GeolocationService manages device GPS tracking with configurable polling intervals.
 *
 * - Active job mode: 10-second polling intervals
 * - Idle mode: 30-second polling intervals
 * - Stale detection: if no successful GPS fix for 60s, isStale becomes true
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
@Injectable({ providedIn: 'root' })
export class GeolocationService implements OnDestroy {
  static readonly ACTIVE_INTERVAL_MS = 10_000;
  static readonly IDLE_INTERVAL_MS = 30_000;
  static readonly STALE_THRESHOLD_MS = 60_000;

  private readonly _currentPosition = signal<GeoPosition | null>(null);
  private readonly _permissionStatus = signal<PermissionStatus>('unknown');
  private readonly _lastFixTimestamp = signal<number | null>(null);
  private readonly _isStale = signal<boolean>(false);

  private pollingTimerId: ReturnType<typeof setInterval> | null = null;
  private staleCheckTimerId: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  /** Current GPS coordinates or null if unavailable. */
  readonly currentPosition = this._currentPosition.asReadonly();

  /** Current geolocation permission status. */
  readonly permissionStatus = this._permissionStatus.asReadonly();

  /** True if no successful GPS fix has been received for 60+ seconds. */
  readonly isStale = this._isStale.asReadonly();

  /** Timestamp of the last successful GPS fix. */
  readonly lastFixTimestamp = this._lastFixTimestamp.asReadonly();

  /**
   * Requests geolocation permission from the browser.
   * Returns an Observable that emits true if permission is granted, false otherwise.
   */
  requestPermission(): Observable<boolean> {
    return new Observable<boolean>((subscriber) => {
      if (!navigator.geolocation) {
        this._permissionStatus.set('denied');
        subscriber.next(false);
        subscriber.complete();
        return;
      }

      // Check permission status via Permissions API if available
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          this.updatePermissionFromResult(result);

          // Listen for permission changes
          result.addEventListener('change', () => {
            this.updatePermissionFromResult(result);
          });

          if (result.state === 'granted') {
            subscriber.next(true);
            subscriber.complete();
          } else if (result.state === 'denied') {
            subscriber.next(false);
            subscriber.complete();
          } else {
            // 'prompt' — trigger the actual permission dialog
            this.triggerPermissionPrompt(subscriber);
          }
        }).catch(() => {
          // Permissions API not supported, fall back to getCurrentPosition
          this.triggerPermissionPrompt(subscriber);
        });
      } else {
        // No Permissions API, trigger directly
        this.triggerPermissionPrompt(subscriber);
      }
    });
  }

  /**
   * Starts periodic geolocation polling at the given interval.
   * Automatically sets up stale detection (60s without a fix).
   */
  startTracking(intervalMs: number): void {
    this.stopTracking();

    // Immediately get a position
    this.fetchPosition();

    // Set up periodic polling
    this.pollingTimerId = setInterval(() => {
      this.fetchPosition();
    }, intervalMs);

    // Set up stale check every second
    this.staleCheckTimerId = setInterval(() => {
      this.checkStaleStatus();
    }, 1000);
  }

  /**
   * Stops all periodic geolocation polling and stale checking.
   */
  stopTracking(): void {
    if (this.pollingTimerId !== null) {
      clearInterval(this.pollingTimerId);
      this.pollingTimerId = null;
    }
    if (this.staleCheckTimerId !== null) {
      clearInterval(this.staleCheckTimerId);
      this.staleCheckTimerId = null;
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopTracking();
  }

  /**
   * Fetches the current position using the Geolocation API.
   * On success, updates the position signal and resets stale state.
   * On failure, handles specific error codes.
   */
  private fetchPosition(): void {
    if (!navigator.geolocation || this.destroyed) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: GeoPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this._currentPosition.set(coords);
        this._lastFixTimestamp.set(Date.now());
        this._isStale.set(false);
        this._permissionStatus.set('granted');
      },
      (error) => {
        this.handleGeolocationError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 5_000,
      }
    );
  }

  /**
   * Checks if the last successful fix is older than 60 seconds and sets stale flag accordingly.
   */
  private checkStaleStatus(): void {
    const lastFix = this._lastFixTimestamp();
    if (lastFix === null) {
      // Never had a fix — consider stale if tracking has been running
      this._isStale.set(true);
      return;
    }

    const elapsed = Date.now() - lastFix;
    if (elapsed > GeolocationService.STALE_THRESHOLD_MS) {
      this._isStale.set(true);
    }
  }

  /**
   * Handles geolocation errors by error code.
   */
  private handleGeolocationError(error: GeolocationPositionError): void {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        this._permissionStatus.set('denied');
        break;
      case error.POSITION_UNAVAILABLE:
        // GPS signal lost — don't update position, stale check will handle it
        break;
      case error.TIMEOUT:
        // Timeout — don't update position, stale check will handle it
        break;
    }
  }

  /**
   * Triggers the browser's geolocation permission prompt via getCurrentPosition.
   */
  private triggerPermissionPrompt(subscriber: { next(value: boolean): void; complete(): void }): void {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this._permissionStatus.set('granted');
        this._currentPosition.set({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        this._lastFixTimestamp.set(Date.now());
        this._isStale.set(false);
        subscriber.next(true);
        subscriber.complete();
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          this._permissionStatus.set('denied');
        } else {
          this._permissionStatus.set('prompt');
        }
        subscriber.next(false);
        subscriber.complete();
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
      }
    );
  }

  /**
   * Updates the permission status signal from a PermissionStatus result.
   */
  private updatePermissionFromResult(result: { state: string }): void {
    switch (result.state) {
      case 'granted':
        this._permissionStatus.set('granted');
        break;
      case 'denied':
        this._permissionStatus.set('denied');
        break;
      case 'prompt':
        this._permissionStatus.set('prompt');
        break;
      default:
        this._permissionStatus.set('unknown');
    }
  }
}
