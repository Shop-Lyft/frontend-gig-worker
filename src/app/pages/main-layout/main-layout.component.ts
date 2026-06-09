import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ConnectionStatusComponent } from '../../shared/components/connection-status/connection-status.component';
import { selectHasActiveJob } from '../../store/active-job/active-job.selectors';

/**
 * MainLayoutComponent — shell wrapping all authenticated pages.
 *
 * Provides:
 * - <app-connection-status> banner at the top
 * - Nested <router-outlet> for child page content
 * - <app-bottom-nav> fixed at the bottom with active job badge
 * - Bottom padding to account for the fixed bottom nav height
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, BottomNavComponent, ConnectionStatusComponent],
  template: `
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

    .layout-content {
      padding-bottom: 64px; /* Account for fixed bottom nav height */
    }
  `],
})
export class MainLayoutComponent {
  private readonly store = inject(Store);

  /** Observable indicating if the worker currently has an active job */
  readonly hasActiveJob$: Observable<boolean> = this.store.select(selectHasActiveJob);
}
