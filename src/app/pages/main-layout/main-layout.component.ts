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
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private readonly store = inject(Store);

  /** Observable indicating if the worker currently has an active job */
  readonly hasActiveJob$: Observable<boolean> = this.store.select(selectHasActiveJob);

  /** Observable of the current worker profile */
  readonly worker$: Observable<WorkerProfile | null> = this.store.select(selectWorker);
}
