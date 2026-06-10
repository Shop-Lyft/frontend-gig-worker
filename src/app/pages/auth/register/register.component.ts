import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as AuthActions from '../../../store/auth/auth.actions';
import { selectLoginLoading, selectLoginError } from '../../../store/auth/auth.selectors';
import { validateRegistration } from '../../../core/utils/validation.utils';
import { RegistrationData } from '../../../core/models/worker.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  fieldErrors: Record<string, string> = {};
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
  ) {
    this.loading$ = this.store.select(selectLoginLoading);
    this.error$ = this.store.select(selectLoginError);
  }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: [''],
      email: [''],
      password: [''],
      workerType: [''],
      bankAccountRef: [''],
      vehicleType: [''],
      vehicleRegistration: [''],
    });

    // Clear field errors when user modifies a field
    this.registerForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Clear individual field errors as user types
        Object.keys(this.registerForm.controls).forEach((key) => {
          if (this.registerForm.get(key)?.dirty && this.fieldErrors[key]) {
            delete this.fieldErrors[key];
          }
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    const formValue = this.registerForm.getRawValue();

    const data: RegistrationData = {
      name: formValue.name?.trim() ?? '',
      email: formValue.email?.trim() ?? '',
      password: formValue.password ?? '',
      workerType: formValue.workerType || '',
      bankAccountRef: formValue.bankAccountRef?.trim() ?? '',
      vehicleType: formValue.workerType === 'driver' ? (formValue.vehicleType || undefined) : undefined,
      vehicleRegistration: formValue.workerType === 'driver' ? (formValue.vehicleRegistration?.trim() || undefined) : undefined,
    };

    const errors = validateRegistration(data);
    if (errors) {
      this.fieldErrors = errors;
      return;
    }

    this.fieldErrors = {};
    this.store.dispatch(AuthActions.register({ data }));
  }
}
