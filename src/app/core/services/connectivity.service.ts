import { Injectable, NgZone, OnDestroy, signal, computed } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * ConnectivityService — signal-based online/offline detection.
 *
 * Responsibilities:
 * - Tracks navigator.onLine via window online/offline events
 * - Exposes `isOnline` signal for reactive UI binding
 * - Exposes `connectionLost` signal that is true when the connection drops
 * - Exposes `showOfflineBanner` signal used by connection-status component (Req 20.3)
 * - Emits `onReconnect` observable when transitioning from offline → online (Req 20.4)
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService implements OnDestroy {
  /** Current online status derived from navigator.onLine */
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  /** True when the connection has been lost (stays true until reconnected) */
  readonly connectionLost = signal<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  /** True while offline — drives the persistent offline banner (Req 20.3) */
  readonly showOfflineBanner = computed(() => !this.isOnline());

  private readonly reconnectSubject = new Subject<void>();

  /** Emits when going from offline → online — triggers data refresh (Req 20.4) */
  readonly onReconnect: Observable<void> = this.reconnectSubject.asObservable();

  private readonly onlineHandler = () => this.handleOnline();
  private readonly offlineHandler = () => this.handleOffline();

  constructor(private readonly ngZone: NgZone) {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
    }
    this.reconnectSubject.complete();
  }

  private handleOnline(): void {
    this.ngZone.run(() => {
      const wasOffline = !this.isOnline();
      this.isOnline.set(true);
      this.connectionLost.set(false);

      if (wasOffline) {
        this.reconnectSubject.next();
      }
    });
  }

  private handleOffline(): void {
    this.ngZone.run(() => {
      this.isOnline.set(false);
      this.connectionLost.set(true);
    });
  }
}
