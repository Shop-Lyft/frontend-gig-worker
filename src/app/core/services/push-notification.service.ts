import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { Observable, Subject, from, of, EMPTY } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { selectActiveJob } from '../../store/active-job/active-job.selectors';
import { selectWorker } from '../../store/auth/auth.selectors';

/**
 * Push Notification Service
 *
 * Handles FCM token registration, permission requests, notification tap handling,
 * client-side rate limiting (5 per 60s), and suppression when worker is offline
 * or has an active job.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly store = inject(Store);
  private readonly ngZone = inject(NgZone);
  private readonly http = inject(HttpClient);

  /** Current notification permission state */
  readonly permissionStatus = signal<NotificationPermission>('default');

  /** True if user denied notifications */
  readonly isPermissionDenied = computed(() => this.permissionStatus() === 'denied');

  /** Subject emitting when user taps a push notification */
  private readonly _onNotificationTap = new Subject<{ jobId: string }>();
  readonly onNotificationTap: Observable<{ jobId: string }> = this._onNotificationTap.asObservable();

  /** Rate limiting: track notification timestamps within the 60s window */
  private notificationTimestamps: number[] = [];

  /** Rate limiting constants */
  private readonly MAX_NOTIFICATIONS_PER_WINDOW = 5;
  private readonly RATE_LIMIT_WINDOW_MS = 60000; // 60 seconds

  /** Count of batched notifications (excess beyond rate limit) */
  private batchedCount = 0;
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Firebase Messaging instance (lazy-loaded) */
  private messagingInstance: any = null;

  constructor() {
    // Initialize permission status from browser state
    if (typeof Notification !== 'undefined') {
      this.permissionStatus.set(Notification.permission);
    }

    // Listen for messages from the service worker (notification taps from background)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NOTIFICATION_TAP') {
          this.ngZone.run(() => {
            this.handleNotificationTap(event.data.jobId || '');
          });
        }
      });
    }
  }

  /**
   * Requests Notification permission from the browser.
   * Displays an explanation before prompting (handled by the calling component).
   *
   * @returns Observable emitting 'granted' or 'denied'
   */
  requestPermission(): Observable<'granted' | 'denied'> {
    if (typeof Notification === 'undefined') {
      this.permissionStatus.set('denied');
      return of('denied');
    }

    // If already decided, return current state
    if (Notification.permission !== 'default') {
      const result = Notification.permission === 'granted' ? 'granted' : 'denied';
      this.permissionStatus.set(Notification.permission);
      return of(result);
    }

    return from(Notification.requestPermission()).pipe(
      map((permission): 'granted' | 'denied' => {
        this.permissionStatus.set(permission);
        return permission === 'granted' ? 'granted' : 'denied';
      }),
      catchError(() => {
        this.permissionStatus.set('denied');
        return of('denied' as const);
      })
    );
  }

  /**
   * Gets FCM messaging token from Firebase Messaging and sends it to the backend.
   *
   * @returns Observable emitting the FCM token string
   */
  registerToken(): Observable<string> {
    return from(this.getMessagingToken()).pipe(
      switchMap((token) => {
        if (!token) {
          return EMPTY;
        }
        // Send token to backend
        return this.http
          .post<{ token: string }>(`${environment.apiBaseUrl}/gig/fcm-token`, { token })
          .pipe(
            map(() => token),
            catchError(() => of(token)) // Even if backend fails, return the token
          );
      }),
      catchError(() => EMPTY)
    );
  }

  /**
   * Initializes foreground notification handling via Firebase onMessage.
   * Applies rate limiting and suppression logic before displaying notifications.
   */
  initializeForegroundHandler(): void {
    this.getMessaging().then((messaging) => {
      if (!messaging) return;

      import('firebase/messaging').then(({ onMessage }) => {
        onMessage(messaging, (payload) => {
          this.ngZone.run(() => {
            this.handleForegroundNotification(payload);
          });
        });
      });
    });
  }

  /**
   * Checks if a notification should be suppressed based on worker state.
   * Suppresses when worker is offline or has an active job.
   *
   * @param workerAvailable - Whether the worker is online
   * @param hasActiveJob - Whether the worker has an active job
   * @returns true if notification should be suppressed
   */
  shouldSuppress(workerAvailable: boolean, hasActiveJob: boolean): boolean {
    // Suppress if worker is offline
    if (!workerAvailable) {
      return true;
    }
    // Suppress if worker has active job
    if (hasActiveJob) {
      return true;
    }
    return false;
  }

  /**
   * Checks if the rate limit has been exceeded (>5 notifications in 60s window).
   * Cleans expired timestamps from the tracking array.
   *
   * @param now - Current timestamp in ms (defaults to Date.now())
   * @returns true if rate limit exceeded
   */
  isRateLimited(now: number = Date.now()): boolean {
    // Clean expired timestamps outside the 60s window
    this.notificationTimestamps = this.notificationTimestamps.filter(
      (ts) => now - ts < this.RATE_LIMIT_WINDOW_MS
    );

    return this.notificationTimestamps.length >= this.MAX_NOTIFICATIONS_PER_WINDOW;
  }

  /**
   * Records a notification delivery timestamp for rate limiting.
   *
   * @param now - Current timestamp in ms (defaults to Date.now())
   */
  recordNotification(now: number = Date.now()): void {
    this.notificationTimestamps.push(now);
  }

  /**
   * Resets rate limiting state (useful for testing).
   */
  resetRateLimiting(): void {
    this.notificationTimestamps = [];
    this.batchedCount = 0;
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }

  /**
   * Gets the current count of notifications in the rate limit window.
   */
  getNotificationCountInWindow(now: number = Date.now()): number {
    this.notificationTimestamps = this.notificationTimestamps.filter(
      (ts) => now - ts < this.RATE_LIMIT_WINDOW_MS
    );
    return this.notificationTimestamps.length;
  }

  /**
   * Handles a notification tap event (e.g., from service worker message).
   * Emits the jobId so the app can navigate to the jobs screen with highlight.
   */
  handleNotificationTap(jobId: string): void {
    this._onNotificationTap.next({ jobId });
  }

  /**
   * Handles foreground notification with rate limiting and suppression.
   */
  private handleForegroundNotification(payload: any): void {
    const jobId = payload?.data?.jobId;
    const jobType = payload?.data?.jobType || payload?.notification?.title;
    const storeName = payload?.data?.storeName || '';
    const estimatedPay = payload?.data?.estimatedPay || '';

    // Check suppression: get current worker state from store
    let workerAvailable = false;
    let hasActiveJob = false;

    this.store.select(selectWorker).pipe(
      map((worker) => worker?.available ?? false)
    ).subscribe((available) => { workerAvailable = available; }).unsubscribe();

    this.store.select(selectActiveJob).pipe(
      map((job) => job !== null)
    ).subscribe((active) => { hasActiveJob = active; }).unsubscribe();

    // Apply suppression
    if (this.shouldSuppress(workerAvailable, hasActiveJob)) {
      return;
    }

    // Apply rate limiting
    const now = Date.now();
    if (this.isRateLimited(now)) {
      // Batch excess notifications
      this.batchedCount++;
      this.scheduleBatchSummary();
      return;
    }

    // Record and display
    this.recordNotification(now);
    this.displayLocalNotification(jobType, storeName, estimatedPay, jobId);
  }

  /**
   * Displays a local notification using the Notification API.
   */
  private displayLocalNotification(
    jobType: string,
    storeName: string,
    estimatedPay: string,
    jobId?: string
  ): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const title = `New ${jobType} job available`;
    const body = storeName
      ? `${storeName} - Estimated pay: R${Number(estimatedPay).toFixed(2)}`
      : 'Tap to view details';

    const notification = new Notification(title, {
      body,
      icon: '/assets/icons/icon-192x192.png',
      data: { jobId },
      tag: jobId || 'new-job', // Prevent duplicate notifications for the same job
    });

    notification.onclick = () => {
      notification.close();
      if (jobId) {
        this.handleNotificationTap(jobId);
      }
    };
  }

  /**
   * Schedules a batch summary notification for excess notifications
   * that exceeded the rate limit.
   */
  private scheduleBatchSummary(): void {
    // Clear existing timeout to debounce
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Send batch summary after a short delay (2s debounce)
    this.batchTimeout = setTimeout(() => {
      if (this.batchedCount > 0 && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const notification = new Notification('Multiple jobs available', {
          body: `${this.batchedCount} additional job${this.batchedCount > 1 ? 's' : ''} available near you`,
          icon: '/assets/icons/icon-192x192.png',
          tag: 'batch-summary',
        });

        notification.onclick = () => {
          notification.close();
          this.handleNotificationTap('');
        };
      }
      this.batchedCount = 0;
      this.batchTimeout = null;
    }, 2000);
  }

  /**
   * Lazily initializes and returns Firebase Messaging instance.
   */
  private async getMessaging(): Promise<any> {
    if (this.messagingInstance) {
      return this.messagingInstance;
    }

    try {
      const { getApp } = await import('firebase/app');
      const { getMessaging } = await import('firebase/messaging');
      const app = getApp();
      this.messagingInstance = getMessaging(app);
      return this.messagingInstance;
    } catch {
      return null;
    }
  }

  /**
   * Gets the FCM token from Firebase Messaging.
   */
  private async getMessagingToken(): Promise<string | null> {
    try {
      const messaging = await this.getMessaging();
      if (!messaging) return null;

      const { getToken } = await import('firebase/messaging');
      const token = await getToken(messaging, {
        vapidKey: environment.firebase?.messagingSenderId,
      });
      return token || null;
    } catch {
      return null;
    }
  }
}
