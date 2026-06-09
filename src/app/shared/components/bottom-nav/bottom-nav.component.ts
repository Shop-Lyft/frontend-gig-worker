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
  template: `
    <nav class="bottom-nav" aria-label="Main navigation">
      <a
        class="nav-item"
        routerLink="/jobs"
        routerLinkActive="active"
        [routerLinkActiveOptions]="{ exact: true }"
        aria-label="Jobs"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        <span class="nav-label">Jobs</span>
      </a>

      <a
        class="nav-item"
        routerLink="/active"
        routerLinkActive="active"
        aria-label="Active job"
      >
        <div class="icon-wrapper">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          @if (hasActiveJob) {
            <span class="badge-dot" aria-label="Active job in progress"></span>
          }
        </div>
        <span class="nav-label">Active</span>
      </a>

      <a
        class="nav-item"
        routerLink="/earnings"
        routerLinkActive="active"
        aria-label="Earnings"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <span class="nav-label">Earnings</span>
      </a>

      <a
        class="nav-item"
        routerLink="/profile"
        routerLinkActive="active"
        aria-label="Profile"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span class="nav-label">Profile</span>
      </a>
    </nav>
  `,
  styles: [`
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: #1e293b;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
      padding: 4px 0;
      padding-bottom: env(safe-area-inset-bottom, 4px);
      z-index: 1000;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      padding: 6px 12px;
      text-decoration: none;
      color: #94a3b8;
      transition: color 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .nav-item.active {
      color: #10b981;
    }

    .icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .nav-icon {
      width: 22px;
      height: 22px;
    }

    .nav-label {
      font-size: 11px;
      margin-top: 2px;
      font-weight: 500;
    }

    .badge-dot {
      position: absolute;
      top: -2px;
      right: -4px;
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      border: 2px solid #1e293b;
    }
  `]
})
export class BottomNavComponent {
  /** Whether the worker has an active job — shows badge dot on Active tab */
  @Input() hasActiveJob = false;
}
