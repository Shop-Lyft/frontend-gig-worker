import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import * as AuthActions from './store/auth/auth.actions';
import { WorkerProfile } from './core/models/worker.model';

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
        // Corrupted data — clear and let user re-login
        localStorage.removeItem('gig_auth_token');
        localStorage.removeItem('gig_worker_profile');
      }
    }
  }
}
