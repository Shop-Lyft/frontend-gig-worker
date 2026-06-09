import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * AvailabilityToggleComponent — Online/Offline toggle switch.
 *
 * Features:
 * - Green (#10b981) indicator when online, grey (#475569) when offline
 * - Loading state with spinner
 * - Disabled state (e.g. during active job)
 * - 44px minimum touch target
 * - Accessible toggle button with role="switch"
 */
@Component({
  selector: 'app-availability-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="toggle-container"
      [class.online]="available"
      [class.is-loading]="loading"
      [disabled]="disabled || loading"
      [attr.aria-checked]="available"
      [attr.aria-label]="available ? 'Currently online, tap to go offline' : 'Currently offline, tap to go online'"
      role="switch"
      (click)="onToggle()"
    >
      <span class="toggle-track">
        <span class="toggle-thumb">
          @if (loading) {
            <span class="thumb-spinner" aria-hidden="true"></span>
          }
        </span>
      </span>
      <span class="toggle-label">
        @if (loading) {
          Updating...
        } @else if (available) {
          Online
        } @else {
          Offline
        }
      </span>
    </button>
  `,
  styles: [`
    .toggle-container {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      min-width: 44px;
      padding: 8px 12px;
      border: none;
      border-radius: 22px;
      background: rgba(71, 85, 105, 0.3);
      cursor: pointer;
      transition: background 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .toggle-container:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .toggle-container.online {
      background: rgba(16, 185, 129, 0.15);
    }

    .toggle-track {
      width: 44px;
      height: 24px;
      border-radius: 12px;
      background: #475569;
      position: relative;
      transition: background 0.2s ease;
    }

    .toggle-container.online .toggle-track {
      background: #10b981;
    }

    .toggle-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ffffff;
      transition: transform 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toggle-container.online .toggle-thumb {
      transform: translateX(20px);
    }

    .toggle-label {
      font-size: 14px;
      font-weight: 600;
      color: #94a3b8;
      transition: color 0.2s ease;
    }

    .toggle-container.online .toggle-label {
      color: #10b981;
    }

    .thumb-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-top-color: #475569;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AvailabilityToggleComponent {
  /** Current availability state */
  @Input() available = false;

  /** Whether the toggle is disabled (e.g. active job) */
  @Input() disabled = false;

  /** Whether an availability update is in progress */
  @Input() loading = false;

  /** Emits the new desired availability state */
  @Output() toggle = new EventEmitter<boolean>();

  onToggle(): void {
    if (!this.disabled && !this.loading) {
      this.toggle.emit(!this.available);
    }
  }
}
