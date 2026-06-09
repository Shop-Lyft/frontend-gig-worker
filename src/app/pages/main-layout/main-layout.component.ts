import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ConnectionStatusComponent } from '../../shared/components/connection-status/connection-status.component';
import { selectHasActiveJob } from '../../store/active-job/active-job.selectors';
import { selectWorker } from '../../store/auth/auth.selectors';
import { WorkerProfile } from '../../core/models/worker.model';

/**
 * MainLayoutComponent — shell wrapping all authenticated pages.
 *
 * Provides:
 * - Brand header with greeting and worker type badge (SHOPPER/DRIVER)
 * - <app-connection-status> banner
 * - Nested <router-outlet> for child page content
 * - <app-bottom-nav> fixed at the bottom with active job badge
 * - Bottom padding to account for the fixed bottom nav height
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, BottomNavComponent, ConnectionStatusComponent],
  template: `
    <header class="layout-header">
      <div class="top-bar">
        <span class="greeting">
          @if (worker$ | async; as worker) {
            Welcome back, {{ worker.name }}
          } @else {
            Welcome
          }
        </span>
      </div>
      <h1 class="brand-logo">
        <span class="brand-logo__icon">🛍️</span>
        <span class="brand-logo__text">Shop<span class="brand-logo__accent">lyft</span></span>
        @if (worker$ | async; as worker) {
          <span class="brand-logo__tag" [class.brand-logo__tag--driver]="worker.workerType === 'driver'">
            {{ worker.workerType === 'shopper' ? 'Shopper' : 'Driver' }}
          </span>
        }
      </h1>
    </header>
    <app-connection-status></app-connection-status>
    <main class="layout-content">
      <router-outlet></router-outlet>
    </main>
    <app-bottom-nav [hasActiveJob]="(hasActiveJob$ | async) ?? false"></app-bottom-nav>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .layout-header {
      padding: 1.25rem 1rem 0;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .greeting {
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 1rem;

      &__icon {
        font-size: 1.5rem;
      }

      &__text {
        font-size: 1.75rem;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.5px;
      }

      &__accent {
        color: #10b981;
      }

      &__tag {
        font-size: 0.7rem;
        font-weight: 600;
        color: #10b981;
        background: rgba(16, 185, 129, 0.12);
        padding: 0.2rem 0.6rem;
        border-radius: 10px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        align-self: center;

        &--driver {
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.12);
        }
      }
    }

    .layout-content {
      padding-bottom: 64px;
    }
  `],
})
export class MainLayoutComponent {
  private readonly store = inject(Store);

  /** Observable indicating if the worker currently has an active job */
  readonly hasActiveJob$: Observable<boolean> = this.store.select(selectHasActiveJob);

  /** Observable of the current worker profile */
  readonly worker$: Observable<WorkerProfile | null> = this.store.select(selectWorker);
}
