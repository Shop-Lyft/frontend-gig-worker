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
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
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
