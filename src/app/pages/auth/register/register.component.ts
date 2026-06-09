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
  template: `
    <div class="register-container">
      <div class="register-card">
        <h1 class="register-title">Create Account</h1>
        <p class="register-subtitle">Join ShopLyft as a gig worker</p>

        <!-- Error Banner -->
        <div class="error-banner" *ngIf="error$ | async as error">
          <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
          <span>{{ error }}</span>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" novalidate>
          <!-- Name Field -->
          <div class="form-group">
            <label for="name" class="form-label">Full Name</label>
            <input
              id="name"
              type="text"
              formControlName="name"
              class="form-input"
              [class.input-error]="fieldErrors['name']"
              placeholder="Enter your full name"
              autocomplete="name"
            />
            <span class="field-error" *ngIf="fieldErrors['name']">{{ fieldErrors['name'] }}</span>
          </div>

          <!-- Email Field -->
          <div class="form-group">
            <label for="email" class="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="form-input"
              [class.input-error]="fieldErrors['email']"
              placeholder="you@example.com"
              autocomplete="email"
            />
            <span class="field-error" *ngIf="fieldErrors['email']">{{ fieldErrors['email'] }}</span>
          </div>

          <!-- Password Field -->
          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              class="form-input"
              [class.input-error]="fieldErrors['password']"
              placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 digit"
              autocomplete="new-password"
            />
            <span class="field-error" *ngIf="fieldErrors['password']">{{ fieldErrors['password'] }}</span>
          </div>

          <!-- Worker Type -->
          <div class="form-group">
            <label class="form-label">Worker Type</label>
            <div class="radio-group">
              <label class="radio-option" [class.radio-selected]="registerForm.get('workerType')?.value === 'shopper'">
                <input type="radio" formControlName="workerType" value="shopper" />
                <span class="radio-label">
                  <svg class="radio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 01-8 0"/>
                  </svg>
                  Shopper
                </span>
              </label>
              <label class="radio-option" [class.radio-selected]="registerForm.get('workerType')?.value === 'driver'">
                <input type="radio" formControlName="workerType" value="driver" />
                <span class="radio-label">
                  <svg class="radio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="1" y="3" width="15" height="13"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  Driver
                </span>
              </label>
            </div>
            <span class="field-error" *ngIf="fieldErrors['workerType']">{{ fieldErrors['workerType'] }}</span>
          </div>

          <!-- Bank Account Reference -->
          <div class="form-group">
            <label for="bankAccountRef" class="form-label">Bank Account Reference</label>
            <input
              id="bankAccountRef"
              type="text"
              formControlName="bankAccountRef"
              class="form-input"
              [class.input-error]="fieldErrors['bankAccountRef']"
              placeholder="Account number or reference"
              autocomplete="off"
            />
            <span class="field-error" *ngIf="fieldErrors['bankAccountRef']">{{ fieldErrors['bankAccountRef'] }}</span>
          </div>

          <!-- Driver-specific fields (conditional) -->
          <ng-container *ngIf="registerForm.get('workerType')?.value === 'driver'">
            <!-- Vehicle Type -->
            <div class="form-group">
              <label for="vehicleType" class="form-label">Vehicle Type</label>
              <select
                id="vehicleType"
                formControlName="vehicleType"
                class="form-input form-select"
                [class.input-error]="fieldErrors['vehicleType']"
              >
                <option value="">Select vehicle type</option>
                <option value="bicycle">Bicycle</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="car">Car</option>
              </select>
              <span class="field-error" *ngIf="fieldErrors['vehicleType']">{{ fieldErrors['vehicleType'] }}</span>
            </div>

            <!-- Vehicle Registration -->
            <div class="form-group">
              <label for="vehicleRegistration" class="form-label">Vehicle Registration Number</label>
              <input
                id="vehicleRegistration"
                type="text"
                formControlName="vehicleRegistration"
                class="form-input"
                [class.input-error]="fieldErrors['vehicleRegistration']"
                placeholder="e.g. CA 123-456"
                autocomplete="off"
              />
              <span class="field-error" *ngIf="fieldErrors['vehicleRegistration']">{{ fieldErrors['vehicleRegistration'] }}</span>
            </div>
          </ng-container>

          <!-- Submit Button -->
          <button
            type="submit"
            class="submit-btn"
            [disabled]="(loading$ | async)"
          >
            <span *ngIf="!(loading$ | async)">Create Account</span>
            <span *ngIf="loading$ | async" class="loading-content">
              <svg class="spinner" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4" stroke-dashoffset="10"/>
              </svg>
              Creating account...
            </span>
          </button>
        </form>

        <!-- Link to Login -->
        <p class="login-link">
          Already have an account?
          <a routerLink="/auth/login" class="link">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: #0f172a;
    }

    .register-card {
      width: 100%;
      max-width: 420px;
      background: #1e293b;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    }

    .register-title {
      color: #ffffff;
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 0.25rem;
      text-align: center;
      font-family: 'Inter', sans-serif;
    }

    .register-subtitle {
      color: #94a3b8;
      font-size: 0.875rem;
      margin: 0 0 1.5rem;
      text-align: center;
      font-family: 'Inter', sans-serif;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      margin-bottom: 1rem;
      color: #fca5a5;
      font-size: 0.875rem;
      font-family: 'Inter', sans-serif;
    }

    .error-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
      color: #ef4444;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      color: #e2e8f0;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.375rem;
      font-family: 'Inter', sans-serif;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #ffffff;
      font-size: 1rem;
      font-family: 'Inter', sans-serif;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
      min-height: 44px;
    }

    .form-input::placeholder {
      color: #64748b;
    }

    .form-input:focus {
      border-color: #10b981;
    }

    .form-input.input-error {
      border-color: #ef4444;
    }

    .form-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      background-size: 1.25rem;
      padding-right: 2.5rem;
    }

    .field-error {
      display: block;
      color: #fca5a5;
      font-size: 0.75rem;
      margin-top: 0.25rem;
      font-family: 'Inter', sans-serif;
    }

    .radio-group {
      display: flex;
      gap: 0.75rem;
    }

    .radio-option {
      flex: 1;
      cursor: pointer;
    }

    .radio-option input[type="radio"] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .radio-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #94a3b8;
      font-size: 0.875rem;
      font-family: 'Inter', sans-serif;
      transition: all 0.2s;
      min-height: 44px;
    }

    .radio-selected .radio-label {
      border-color: #10b981;
      color: #10b981;
      background: rgba(16, 185, 129, 0.05);
    }

    .radio-icon {
      width: 1.25rem;
      height: 1.25rem;
    }

    .submit-btn {
      width: 100%;
      padding: 0.875rem 1.5rem;
      background: #10b981;
      border: none;
      border-radius: 8px;
      color: #ffffff;
      font-size: 1rem;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: background 0.2s, opacity 0.2s;
      margin-top: 0.5rem;
      min-height: 44px;
    }

    .submit-btn:hover:not(:disabled) {
      background: #059669;
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .loading-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .spinner {
      width: 1.25rem;
      height: 1.25rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .login-link {
      text-align: center;
      color: #94a3b8;
      font-size: 0.875rem;
      margin-top: 1.5rem;
      font-family: 'Inter', sans-serif;
    }

    .link {
      color: #10b981;
      text-decoration: none;
      font-weight: 500;
    }

    .link:hover {
      text-decoration: underline;
    }
  `],
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
