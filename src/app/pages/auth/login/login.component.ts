import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, interval } from 'rxjs';
import { takeUntil, map, distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';

import * as AuthActions from '../../../store/auth/auth.actions';
import {
  selectLoginLoading,
  selectLoginError,
  selectIsLockedOut,
  selectLockoutUntil,
} from '../../../store/auth/auth.selectors';
import { isLoginFormValid } from '../../../core/utils/validation.utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-container">
      <div class="login-header">
        <h1 class="login-title">ShopLyft</h1>
        <p class="login-subtitle">Gig Worker Panel</p>
      </div>

      <form
        class="login-form"
        [formGroup]="loginForm"
        (ngSubmit)="onSubmit()"
        aria-label="Login form"
      >
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            placeholder="Enter your email"
            autocomplete="email"
            [attr.aria-invalid]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            placeholder="Enter your password"
            autocomplete="current-password"
            [attr.aria-invalid]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
          />
        </div>

        <!-- Error Message -->
        <div
          *ngIf="loginError$ | async as error"
          class="login-error"
          role="alert"
          aria-live="polite"
        >
          <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <span>{{ error }}</span>
        </div>

        <!-- Lockout Message -->
        <div
          *ngIf="isLockedOut$ | async"
          class="lockout-message"
          role="alert"
          aria-live="assertive"
        >
          <svg class="warning-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <span>Too many login attempts. Please wait {{ lockoutCountdown$ | async }}s before trying again.</span>
        </div>

        <button
          type="submit"
          class="btn btn-primary login-button"
          [disabled]="!isFormValid || (loginLoading$ | async) || (isLockedOut$ | async)"
          [attr.aria-busy]="loginLoading$ | async"
        >
          <span *ngIf="!(loginLoading$ | async)">Sign In</span>
          <span *ngIf="loginLoading$ | async" class="loading-indicator">
            <span class="spinner" aria-hidden="true"></span>
            <span>Signing in...</span>
          </span>
        </button>
      </form>

      <p class="register-link">
        Don't have an account?
        <a routerLink="/auth/register">Register here</a>
      </p>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .login-title {
      font-size: 1.875rem;
      font-weight: 700;
      color: #10b981;
      margin: 0 0 0.25rem;
    }

    .login-subtitle {
      font-size: 0.875rem;
      color: #94a3b8;
      margin: 0;
    }

    .login-form {
      width: 100%;
      max-width: 380px;
      background-color: #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }

    .login-error {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      margin-bottom: 1rem;
      color: #ef4444;
      font-size: 0.875rem;
    }

    .error-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .lockout-message {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
      background-color: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 8px;
      margin-bottom: 1rem;
      color: #f59e0b;
      font-size: 0.875rem;
    }

    .warning-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .login-button {
      width: 100%;
      margin-top: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .loading-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .spinner {
      display: inline-block;
      width: 1rem;
      height: 1rem;
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

    .register-link {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.875rem;
      color: #94a3b8;
    }

    .register-link a {
      color: #10b981;
      font-weight: 500;
    }

    .register-link a:hover {
      color: #34d399;
    }
  `],
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  loginLoading$!: Observable<boolean>;
  loginError$!: Observable<string | null>;
  isLockedOut$!: Observable<boolean>;
  lockoutCountdown$!: Observable<number>;

  isFormValid = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });

    this.loginLoading$ = this.store.select(selectLoginLoading);
    this.loginError$ = this.store.select(selectLoginError);
    this.isLockedOut$ = this.store.select(selectIsLockedOut);

    // Lockout countdown: ticks every second based on lockoutUntil from the store
    this.lockoutCountdown$ = this.store.select(selectLockoutUntil).pipe(
      switchMap((lockoutUntil) => {
        if (!lockoutUntil) return [0];
        return interval(1000).pipe(
          startWith(0),
          map(() => Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000))),
          distinctUntilChanged(),
        );
      }),
    );

    // Track form validity using the shared validation util
    this.loginForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        this.isFormValid = isLoginFormValid(value.email || '', value.password || '');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (!this.isFormValid) return;

    const { email, password } = this.loginForm.value;
    this.store.dispatch(AuthActions.login({ email: email.trim(), password }));
  }
}
