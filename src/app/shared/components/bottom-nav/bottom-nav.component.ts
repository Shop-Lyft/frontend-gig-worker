import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * BottomNavComponent — 4-tab navigation bar (Jobs, Active, Earnings, Profile).
 *
 * Features:
 * - SVG icons for each tab
 * - Active tab highlighted with accent colour (#10b981)
 * - Optional badge dot when worker has an active job
 * - 44px minimum touch targets
 * - Fixed to bottom of viewport
 */
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss'
})
export class BottomNavComponent {
  /** Whether the worker has an active job — shows badge dot on Active tab */
  @Input() hasActiveJob = false;
}
