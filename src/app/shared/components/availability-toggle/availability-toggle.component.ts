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
  templateUrl: './availability-toggle.component.html',
  styleUrl: './availability-toggle.component.scss'
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
