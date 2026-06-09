import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { PickItem, PickItemStatus, SubstitutionStatus } from '../../../core/models/picklist.model';
import {
  selectActiveJob,
  selectPicklist,
  selectPicklistLoading,
  selectPicklistError,
  selectAllEligibleItemsPicked,
  selectSubstitutions,
} from '../../../store/active-job/active-job.selectors';
import {
  loadPicklist,
  updatePickItem,
  markAllPicked,
} from '../../../store/active-job/active-job.actions';

/**
 * PicklistComponent — Shopper pick list for active jobs.
 *
 * Features:
 * - Order number header ("#SL-[orderNumber]")
 * - "Picking list (Shopper mode)" subheader
 * - GPS tracking active indicator (green dot + text)
 * - Checkbox rows formatted as "[qty]x [name]"
 * - Strikethrough on checked/picked items
 * - "Substitute" link on unchecked items
 * - "Pending approval" badge for pending substitutions
 * - "Rejected - skip" and "Timed out - skip" badges
 * - "Mark All Picked" button (enabled when all eligible items picked)
 * - "Call Customer" button (tel: link)
 */
@Component({
  selector: 'app-picklist',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="picklist-container" aria-label="Shopper Picklist">
      <!-- Header -->
      @if (activeJob$ | async; as job) {
        <header class="picklist-header">
          <h1 class="order-number">#SL-{{ job.orderId }}</h1>
          <p class="mode-label">Picking list (Shopper mode)</p>
          <div class="gps-indicator" aria-label="GPS tracking active">
            <span class="gps-dot"></span>
            <span class="gps-text">GPS Active</span>
          </div>
        </header>

        <!-- Actions bar -->
        <div class="actions-bar">
          <a
            class="call-customer-btn"
            [href]="'tel:' + job.customerPhone"
            [class.disabled]="!job.customerPhone"
            aria-label="Call customer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            Call Customer
          </a>
        </div>
      }

      <!-- Loading state -->
      @if (picklistLoading$ | async) {
        <div class="loading-state" role="status" aria-label="Loading picklist">
          <span class="spinner"></span>
          <p>Loading picklist...</p>
        </div>
      }

      <!-- Error state -->
      @if (picklistError$ | async; as error) {
        <div class="error-state" role="alert">
          <p class="error-message">{{ error }}</p>
          <button class="retry-btn" (click)="onRetry()" aria-label="Retry loading picklist">
            Retry
          </button>
        </div>
      }

      <!-- Picklist items -->
      @if (picklist$ | async; as items) {
        <ul class="pick-items" role="list" aria-label="Pick items list">
          @for (item of items; track item.id) {
            <li class="pick-item" [class.picked]="item.status === 'picked' || item.status === 'substituted'" [class.skipped]="item.status === 'skipped'">
              <label class="pick-item-row">
                <input
                  type="checkbox"
                  class="pick-checkbox"
                  [checked]="item.status === 'picked' || item.status === 'substituted'"
                  [disabled]="item.status === 'skipped' || getSubstitutionStatus(item.id)?.status === 'pending'"
                  (change)="onToggleItem(item, $event)"
                  [attr.aria-label]="item.quantity + 'x ' + item.productName"
                />
                <span
                  class="pick-item-text"
                  [class.strikethrough]="item.status === 'picked' || item.status === 'substituted'"
                >
                  {{ item.quantity }}x {{ item.productName }}
                </span>
              </label>

              <!-- Substitution badges -->
              @if (getSubstitutionStatus(item.id)?.status === 'pending') {
                <span class="badge badge-pending">Pending approval</span>
              }
              @if (getSubstitutionStatus(item.id)?.status === 'rejected') {
                <span class="badge badge-rejected">Rejected - skip</span>
              }
              @if (getSubstitutionStatus(item.id)?.status === 'timed_out') {
                <span class="badge badge-timeout">Timed out - skip</span>
              }

              <!-- Substitute action (only on unchecked items without pending substitution) -->
              @if (item.status === 'pending' && getSubstitutionStatus(item.id)?.status !== 'pending') {
                <button
                  class="substitute-link"
                  (click)="onSubstitute(item)"
                  [attr.aria-label]="'Substitute ' + item.productName"
                >
                  Substitute
                </button>
              }
            </li>
          }
        </ul>

        <!-- Mark All Picked button -->
        <div class="mark-all-container">
          <button
            class="mark-all-btn"
            [disabled]="!(allEligiblePicked$ | async)"
            [class.enabled]="(allEligiblePicked$ | async)"
            (click)="onMarkAllPicked()"
            aria-label="Mark all items as picked"
          >
            Mark All Picked
          </button>
        </div>
      }
    </section>
  `,
  styles: [`
    .picklist-container {
      padding: 16px;
      max-width: 600px;
      margin: 0 auto;
    }

    .picklist-header {
      margin-bottom: 16px;
    }

    .order-number {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 4px;
    }

    .mode-label {
      font-size: 14px;
      color: #94a3b8;
      margin: 0 0 8px;
    }

    .gps-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 12px;
    }

    .gps-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .gps-text {
      font-size: 12px;
      font-weight: 500;
      color: #10b981;
    }

    .actions-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .call-customer-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      min-height: 44px;
      background: #1e293b;
      border-radius: 8px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      transition: background 0.2s ease;
    }

    .call-customer-btn:hover {
      background: #334155;
    }

    .call-customer-btn.disabled {
      opacity: 0.5;
      pointer-events: none;
    }

    .call-customer-btn svg {
      width: 18px;
      height: 18px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px;
      color: #94a3b8;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(148, 163, 184, 0.3);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-bottom: 12px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-state {
      text-align: center;
      padding: 24px;
    }

    .error-message {
      color: #ef4444;
      font-size: 14px;
      margin: 0 0 12px;
    }

    .retry-btn {
      min-height: 44px;
      padding: 10px 20px;
      border: 1px solid #94a3b8;
      border-radius: 8px;
      background: transparent;
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .retry-btn:hover {
      background: #1e293b;
    }

    .pick-items {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .pick-item {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-bottom: 1px solid #1e293b;
      min-height: 44px;
    }

    .pick-item:last-child {
      border-bottom: none;
    }

    .pick-item.skipped {
      opacity: 0.5;
    }

    .pick-item-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      cursor: pointer;
      min-height: 44px;
    }

    .pick-checkbox {
      width: 20px;
      height: 20px;
      accent-color: #10b981;
      cursor: pointer;
      flex-shrink: 0;
    }

    .pick-checkbox:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .pick-item-text {
      font-size: 15px;
      color: #ffffff;
      transition: text-decoration 0.2s ease, color 0.2s ease;
    }

    .pick-item-text.strikethrough {
      text-decoration: line-through;
      color: #64748b;
    }

    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .badge-pending {
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
    }

    .badge-rejected {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .badge-timeout {
      background: rgba(148, 163, 184, 0.15);
      color: #94a3b8;
    }

    .substitute-link {
      background: none;
      border: none;
      color: #60a5fa;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      padding: 4px 8px;
      min-height: 44px;
      display: flex;
      align-items: center;
      transition: color 0.2s ease;
    }

    .substitute-link:hover {
      color: #93c5fd;
    }

    .mark-all-container {
      padding: 16px 0;
      margin-top: 8px;
    }

    .mark-all-btn {
      width: 100%;
      min-height: 48px;
      padding: 14px 24px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease, opacity 0.2s ease;
      background: #94a3b8;
      color: #ffffff;
      opacity: 0.6;
    }

    .mark-all-btn:disabled {
      cursor: not-allowed;
    }

    .mark-all-btn.enabled {
      background: #10b981;
      opacity: 1;
    }

    .mark-all-btn.enabled:hover {
      background: #059669;
    }
  `],
})
export class PicklistComponent implements OnInit {
  private store = inject(Store);

  activeJob$ = this.store.select(selectActiveJob);
  picklist$ = this.store.select(selectPicklist);
  picklistLoading$ = this.store.select(selectPicklistLoading);
  picklistError$ = this.store.select(selectPicklistError);
  allEligiblePicked$ = this.store.select(selectAllEligibleItemsPicked);
  substitutions$ = this.store.select(selectSubstitutions);

  private substitutionsSnapshot: Record<string, SubstitutionStatus> = {};
  private activeJobSnapshot: { orderId: string; id: string } | null = null;

  ngOnInit(): void {
    this.activeJob$.subscribe((job) => {
      if (job) {
        this.activeJobSnapshot = { orderId: job.orderId, id: job.id };
        this.store.dispatch(loadPicklist({ orderId: job.orderId }));
      }
    });

    this.substitutions$.subscribe((subs) => {
      this.substitutionsSnapshot = subs;
    });
  }

  getSubstitutionStatus(itemId: string): SubstitutionStatus | null {
    return this.substitutionsSnapshot[itemId] ?? null;
  }

  onToggleItem(item: PickItem, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const newStatus: PickItemStatus = checkbox.checked ? 'picked' : 'pending';

    if (this.activeJobSnapshot) {
      this.store.dispatch(
        updatePickItem({
          orderId: this.activeJobSnapshot.orderId,
          itemId: item.id,
          status: newStatus,
        })
      );
    }
  }

  onSubstitute(item: PickItem): void {
    // Substitution form handling will be implemented in the substitution form component.
    // This emits the event to trigger the substitution UI.
    // For now, this is a placeholder that can be wired to a dialog/modal.
    console.log('Open substitution form for item:', item.id);
  }

  onMarkAllPicked(): void {
    if (this.activeJobSnapshot) {
      this.store.dispatch(markAllPicked({ jobId: this.activeJobSnapshot.id }));
    }
  }

  onRetry(): void {
    if (this.activeJobSnapshot) {
      this.store.dispatch(loadPicklist({ orderId: this.activeJobSnapshot.orderId }));
    }
  }
}
