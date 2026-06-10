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
  templateUrl: './substitution-form.component.html',
  styleUrl: './substitution-form.component.scss',
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
