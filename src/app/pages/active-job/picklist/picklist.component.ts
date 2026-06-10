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
  templateUrl: './picklist.component.html',
  styleUrl: './picklist.component.scss',
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
