import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SubstitutionStatus } from '../../../core/models/picklist.model';
import { validateSubstitution } from '../../../core/utils/validation.utils';
import * as ActiveJobActions from '../../../store/active-job/active-job.actions';
import { selectActiveJobError } from '../../../store/active-job/active-job.selectors';

@Component({
  selector: 'app-substitution-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Approved state -->
    <div
      *ngIf="substitutionStatus?.status === 'approved'"
      class="substitution-result approved"
      role="status"
      aria-live="polite"
    >
      <svg class="result-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      <span>Approved: {{ substitutionStatus.substituteName }} (x{{ substitutionStatus.substituteQuantity }})</span>
    </div>

    <!-- Rejected state -->
    <div
      *ngIf="substitutionStatus?.status === 'rejected'"
      class="substitution-result rejected"
      role="status"
      aria-live="polite"
    >
      <svg class="result-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
      <span>Rejected - skip</span>
    </div>

    <!-- Timed out state -->
    <div
      *ngIf="substitutionStatus?.status === 'timed_out'"
      class="substitution-result timed-out"
      role="status"
      aria-live="polite"
    >
      <svg class="result-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
      </svg>
      <span>Timed out - skip</span>
    </div>

    <!-- Pending state -->
    <div
      *ngIf="substitutionStatus?.status === 'pending'"
      class="substitution-pending"
      role="status"
      aria-live="polite"
    >
      <span class="pending-badge">Pending approval</span>
      <button
        type="button"
        class="btn btn-cancel"
        (click)="onCancel()"
        aria-label="Cancel substitution"
      >
        Cancel
      </button>
    </div>

    <!-- Form (shown when no substitution status) -->
    <form
      *ngIf="!substitutionStatus"
      class="substitution-form"
      [formGroup]="form"
      (ngSubmit)="onSubmit()"
      aria-label="Substitution form"
    >
      <div class="form-group">
        <label [for]="'sub-name-' + itemId">Substitute product name</label>
        <input
          [id]="'sub-name-' + itemId"
          type="text"
          formControlName="substituteName"
          placeholder="Enter substitute product name"
          maxlength="200"
          [attr.aria-invalid]="validationErrors['substituteName'] ? 'true' : null"
          [attr.aria-describedby]="validationErrors['substituteName'] ? 'sub-name-error-' + itemId : null"
        />
        <span
          *ngIf="validationErrors['substituteName']"
          [id]="'sub-name-error-' + itemId"
          class="field-error"
          role="alert"
        >
          {{ validationErrors['substituteName'] }}
        </span>
      </div>

      <div class="form-group">
        <label [for]="'sub-qty-' + itemId">Quantity</label>
        <input
          [id]="'sub-qty-' + itemId"
          type="number"
          formControlName="substituteQuantity"
          min="1"
          max="50"
          placeholder="1–50"
          [attr.aria-invalid]="validationErrors['substituteQuantity'] ? 'true' : null"
          [attr.aria-describedby]="validationErrors['substituteQuantity'] ? 'sub-qty-error-' + itemId : null"
        />
        <span
          *ngIf="validationErrors['substituteQuantity']"
          [id]="'sub-qty-error-' + itemId"
          class="field-error"
          role="alert"
        >
          {{ validationErrors['substituteQuantity'] }}
        </span>
      </div>

      <div class="form-group">
        <label [for]="'sub-reason-' + itemId">Reason</label>
        <select
          [id]="'sub-reason-' + itemId"
          formControlName="reason"
          [attr.aria-invalid]="validationErrors['reason'] ? 'true' : null"
          [attr.aria-describedby]="validationErrors['reason'] ? 'sub-reason-error-' + itemId : null"
        >
          <option value="" disabled>Select a reason</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="damaged">Damaged</option>
          <option value="expired">Expired</option>
        </select>
        <span
          *ngIf="validationErrors['reason']"
          [id]="'sub-reason-error-' + itemId"
          class="field-error"
          role="alert"
        >
          {{ validationErrors['reason'] }}
        </span>
      </div>

      <!-- Submission error -->
      <div
        *ngIf="submissionError$ | async as error"
        class="submission-error"
        role="alert"
        aria-live="polite"
      >
        <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <span>{{ error.message }}</span>
      </div>

      <button
        type="submit"
        class="btn btn-primary submit-button"
        [disabled]="submitting"
        [attr.aria-busy]="submitting"
      >
        <span *ngIf="!submitting">Submit Substitution</span>
        <span *ngIf="submitting" class="loading-indicator">
          <span class="spinner" aria-hidden="true"></span>
          <span>Submitting...</span>
        </span>
      </button>
    </form>
  `,
  styles: [`
    .substitution-form {
      background-color: #1e293b;
      border-radius: 8px;
      padding: 1rem;
      margin-top: 0.5rem;
    }

    .substitution-pending {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #1e293b;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-top: 0.5rem;
    }

    .pending-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      background-color: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .substitution-result {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .substitution-result.approved {
      background-color: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }

    .substitution-result.rejected {
      background-color: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .substitution-result.timed-out {
      background-color: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }

    .result-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
    }

    .form-group {
      margin-bottom: 0.75rem;
    }

    .form-group label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      color: #94a3b8;
      margin-bottom: 0.25rem;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.625rem 0.75rem;
      background-color: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #ffffff;
      font-size: 0.875rem;
      min-height: 44px;
      box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    .form-group input[aria-invalid="true"],
    .form-group select[aria-invalid="true"] {
      border-color: #ef4444;
    }

    .form-group select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
      background-position: right 0.5rem center;
      background-repeat: no-repeat;
      background-size: 1.25rem;
    }

    .field-error {
      display: block;
      font-size: 0.75rem;
      color: #ef4444;
      margin-top: 0.25rem;
    }

    .submission-error {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      margin-bottom: 0.75rem;
      color: #ef4444;
      font-size: 0.8125rem;
    }

    .error-icon {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .submit-button {
      width: 100%;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0.625rem 1rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background-color: #10b981;
      color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #059669;
    }

    .btn-cancel {
      background-color: transparent;
      border: 1px solid #475569;
      color: #94a3b8;
      font-size: 0.75rem;
      min-height: 36px;
      padding: 0.375rem 0.75rem;
    }

    .btn-cancel:hover:not(:disabled) {
      border-color: #ef4444;
      color: #ef4444;
    }

    .loading-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .spinner {
      display: inline-block;
      width: 0.875rem;
      height: 0.875rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `],
})
export class SubstitutionFormComponent implements OnInit, OnDestroy {
  @Input({ required: true }) orderId!: string;
  @Input({ required: true }) itemId!: string;
  @Input({ required: true }) itemName!: string;
  @Input() substitutionStatus: SubstitutionStatus | null = null;

  form!: FormGroup;
  submitting = false;
  validationErrors: Record<string, string> = {};
  submissionError$!: Observable<{ message: string; timestamp: number } | null>;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      substituteName: ['', [Validators.required, Validators.maxLength(200)]],
      substituteQuantity: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
      reason: ['', [Validators.required]],
    });

    this.submissionError$ = this.store.select(selectActiveJobError);

    // Clear validation errors on value changes
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.validationErrors = {};
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.submitting) return;

    const proposal = {
      substituteName: (this.form.value.substituteName || '').trim(),
      substituteQuantity: Number(this.form.value.substituteQuantity),
      reason: this.form.value.reason,
    };

    const errors = validateSubstitution(proposal);
    if (errors) {
      this.validationErrors = errors;
      return;
    }

    this.submitting = true;
    this.store.dispatch(
      ActiveJobActions.proposeSubstitution({
        orderId: this.orderId,
        itemId: this.itemId,
        proposal,
      })
    );

    // Reset submitting state when we get a response (success or failure)
    this.store
      .select(selectActiveJobError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.submitting = false;
      });
  }

  onCancel(): void {
    this.store.dispatch(
      ActiveJobActions.cancelSubstitution({
        orderId: this.orderId,
        itemId: this.itemId,
      })
    );
  }
}
