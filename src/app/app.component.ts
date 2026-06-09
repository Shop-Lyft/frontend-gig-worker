import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import * as AuthActions from './store/auth/auth.actions';
import { selectIsAuthenticated } from './store/auth/auth.selectors';
import { WorkerProfile } from './core/models/worker.model';
import { GIG_WORKER_SERVICE } from './core/services/gig-worker.service';
import { InactivityService } from './core/services/inactivity.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <router-outlet></router-outlet>

    <!-- Inactivity Warning Banner -->
    @if (showInactivityWarning) {
      <div class="inactivity-warning-overlay">
        <div class="inactivity-warning">
          <p class="inactivity-warning__text">
            You will be logged out in <strong>{{ inactivityCountdown }}</strong> seconds due to inactivity.
          </p>
          <button class="inactivity-warning__btn" (click)="stayLoggedIn()">Stay Logged In</button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .inactivity-warning-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 80px;
      z-index: 10000;
    }

    .inactivity-warning {
      background: #1e293b;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      max-width: 400px;
      width: 90%;
      text-align: center;
      border: 1px solid #334155;
    }

    .inactivity-warning__text {
      margin: 0 0 16px;
      font-size: 16px;
      color: #f1f5f9;
      line-height: 1.5;
    }

    .inactivity-warning__text strong {
      color: #ef4444;
      font-size: 20px;
    }

    .inactivity-warning__btn {
      background: #10b981;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      min-height: 44px;
    }

    .inactivity-warning__btn:hover {
      background: #059669;
    }
  `],
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly gigService = inject(GIG_WORKER_SERVICE);
  private readonly inactivityService = inject(InactivityService);
  title = 'ShopLyft Gig Worker';

  showInactivityWarning = false;
  inactivityCountdown = 30;
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Rehydrate worker profile from localStorage on page refresh
    const token = localStorage.getItem('gig_auth_token');
    const workerJson = localStorage.getItem('gig_worker_profile');

    if (token && workerJson) {
      try {
        const worker: WorkerProfile = JSON.parse(workerJson);
        this.store.dispatch(AuthActions.restoreSession({ token, worker }));
      } catch {
        // Corrupted data — try fetching from backend
        this.fetchAndRestoreProfile(token);
      }
    } else if (token && !workerJson) {
      // Token exists but profile was never persisted (logged in before this fix)
      // Fetch profile from backend and store it
      this.fetchAndRestoreProfile(token);
    }

    // Subscribe to inactivity warning state
    this.subscriptions.push(
      this.inactivityService.showWarning$.subscribe((show) => {
        this.showInactivityWarning = show;
      }),
      this.inactivityService.countdown$.subscribe((count) => {
        this.inactivityCountdown = count;
      })
    );

    // Start/stop inactivity based on auth state
    this.subscriptions.push(
      this.store.select(selectIsAuthenticated).subscribe((isAuth) => {
        if (isAuth) {
          this.inactivityService.start();
        } else {
          this.inactivityService.stop();
        }
      })
    );
  }

  stayLoggedIn(): void {
    this.inactivityService.dismissWarning();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.inactivityService.stop();
  }

  private fetchAndRestoreProfile(token: string): void {
    this.gigService.getProfile().subscribe({
      next: (worker) => {
        localStorage.setItem('gig_worker_profile', JSON.stringify(worker));
        this.store.dispatch(AuthActions.restoreSession({ token, worker }));
      },
      error: () => {
        // Can't fetch profile — clear token and force re-login
        localStorage.removeItem('gig_auth_token');
        localStorage.removeItem('gig_worker_profile');
      },
    });
  }
}
