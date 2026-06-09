import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import * as AuthActions from './store/auth/auth.actions';
import { WorkerProfile } from './core/models/worker.model';
import { GIG_WORKER_SERVICE } from './core/services/gig-worker.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `],
})
export class AppComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly gigService = inject(GIG_WORKER_SERVICE);
  title = 'ShopLyft Gig Worker';

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
