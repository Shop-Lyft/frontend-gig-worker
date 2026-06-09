import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, Subject, fromEvent, merge } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as AuthActions from '../../store/auth/auth.actions';

/**
 * InactivityService monitors user activity and triggers auto-logout
 * after 10 minutes of inactivity with a 30-second warning countdown.
 *
 * Usage:
 * - Call start() after successful authentication
 * - Call stop() on logout or component destroy
 * - Subscribe to showWarning$ and countdown$ to display the warning UI
 * - Call dismissWarning() when user clicks "Stay Logged In"
 */
@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {
  private readonly INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  private readonly WARNING_DURATION = 30; // 30 seconds

  private destroy$ = new Subject<void>();
  private _showWarning$ = new BehaviorSubject<boolean>(false);
  private _countdown$ = new BehaviorSubject<number>(this.WARNING_DURATION);
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;

  get showWarning$(): Observable<boolean> { return this._showWarning$.asObservable(); }
  get countdown$(): Observable<number> { return this._countdown$.asObservable(); }

  constructor(
    private store: Store,
    private router: Router,
    private ngZone: NgZone
  ) {}

  /** Start monitoring inactivity. Call after successful login. */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.ngZone.runOutsideAngular(() => {
      const activity$ = merge(
        fromEvent(document, 'mousemove'),
        fromEvent(document, 'mousedown'),
        fromEvent(document, 'keydown'),
        fromEvent(document, 'scroll'),
        fromEvent(document, 'touchstart')
      );

      activity$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.resetTimer();
      });
    });

    this.resetTimer();
  }

  /** Stop monitoring. Call on logout. */
  stop(): void {
    this.isRunning = false;
    this.clearAllTimers();
    this._showWarning$.next(false);
    this.destroy$.next();
    this.destroy$.complete();
    this.destroy$ = new Subject<void>();
  }

  /** User clicked "Stay Logged In" */
  dismissWarning(): void {
    this._showWarning$.next(false);
    this.clearWarningTimers();
    this.resetTimer();
  }

  private resetTimer(): void {
    if (this._showWarning$.getValue()) {
      this.ngZone.run(() => {
        this._showWarning$.next(false);
      });
      this.clearWarningTimers();
    }

    clearTimeout(this.inactivityTimer!);
    this.inactivityTimer = setTimeout(() => {
      this.showWarningCountdown();
    }, this.INACTIVITY_TIMEOUT);
  }

  private showWarningCountdown(): void {
    this.ngZone.run(() => {
      this._showWarning$.next(true);
      this._countdown$.next(this.WARNING_DURATION);
    });

    let seconds = this.WARNING_DURATION;
    this.countdownInterval = setInterval(() => {
      seconds--;
      this.ngZone.run(() => {
        this._countdown$.next(seconds);
      });
      if (seconds <= 0) {
        this.performLogout();
      }
    }, 1000);
  }

  private performLogout(): void {
    this.clearAllTimers();
    this.ngZone.run(() => {
      this._showWarning$.next(false);
      this.store.dispatch(AuthActions.logout());
      // The logoutSuccessEffect will navigate to /auth/login
    });
  }

  private clearWarningTimers(): void {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private clearAllTimers(): void {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    this.clearWarningTimers();
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
