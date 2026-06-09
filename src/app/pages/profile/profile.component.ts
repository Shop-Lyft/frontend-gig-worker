import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, pairwise, filter } from 'rxjs';

import { SkeletonLoaderComponent, ErrorRetryComponent } from '../../shared/components';
import { WorkerProfile, ProfileUpdate } from '../../core/models/worker.model';
import { validateProfileUpdate } from '../../core/utils/validation.utils';
import * as ProfileActions from '../../store/profile/profile.actions';
import * as AuthActions from '../../store/auth/auth.actions';
import {
  selectProfileData,
  selectProfileLoading,
  selectProfileError,
  selectProfileUpdateLoading,
  selectProfileUpdateError,
} from '../../store/profile/profile.selectors';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    SkeletonLoaderComponent,
    ErrorRetryComponent,
  ],
  template: `
    <div class="profile-page">
      <h1 class="page-title">Profile</h1>

      <!-- Loading state -->
      @if (loading$ | async) {
        <app-skeleton-loader [lines]="5"></app-skeleton-loader>
      }

      <!-- Error state -->
      @if (error$ | async; as error) {
        @if (!(loading$ | async)) {
          <app-error-retry
            [message]="error.message"
            (retry)="onLoadRetry()"
          ></app-error-retry>
        }
      }

      <!-- Profile form -->
      @if (profile$ | async; as profile) {
        @if (!(loading$ | async)) {
          <form
            [formGroup]="profileForm"
            (ngSubmit)="onSave()"
            class="profile-form"
            novalidate
          >
            <!-- Name (editable) -->
            <div class="form-group">
              <label for="name" class="form-label">Name</label>
              <input
                id="name"
                type="text"
                formControlName="name"
                class="form-input"
                autocomplete="name"
              />
              @if (validationErrors['name']) {
                <span class="field-error" role="alert">{{ validationErrors['name'] }}</span>
              }
            </div>

            <!-- Email (read-only) -->
            <div class="form-group">
              <label for="email" class="form-label">Email</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                class="form-input readonly"
                readonly
                aria-readonly="true"
              />
            </div>

            <!-- Worker Type (read-only) -->
            <div class="form-group">
              <label for="workerType" class="form-label">Worker Type</label>
              <input
                id="workerType"
                type="text"
                [value]="profile.workerType | titlecase"
                class="form-input readonly"
                readonly
                aria-readonly="true"
              />
            </div>

            <!-- Bank Account Reference (editable) -->
            <div class="form-group">
              <label for="bankAccountRef" class="form-label">Bank Account Reference</label>
              <input
                id="bankAccountRef"
                type="text"
                formControlName="bankAccountRef"
                class="form-input"
                autocomplete="off"
              />
              @if (validationErrors['bankAccountRef']) {
                <span class="field-error" role="alert">{{ validationErrors['bankAccountRef'] }}</span>
              }
            </div>

            <!-- Driver-specific fields -->
            @if (profile.workerType === 'driver') {
              <div class="form-group">
                <label for="vehicleType" class="form-label">Vehicle Type</label>
                <select
                  id="vehicleType"
                  formControlName="vehicleType"
                  class="form-input form-select"
                >
                  <option value="bicycle">Bicycle</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="car">Car</option>
                </select>
              </div>

              <div class="form-group">
                <label for="vehicleRegistration" class="form-label">Vehicle Registration</label>
                <input
                  id="vehicleRegistration"
                  type="text"
                  formControlName="vehicleRegistration"
                  class="form-input"
                  autocomplete="off"
                />
                @if (validationErrors['vehicleRegistration']) {
                  <span class="field-error" role="alert">{{ validationErrors['vehicleRegistration'] }}</span>
                }
              </div>
            }

            <!-- Save button -->
            <button
              type="submit"
              class="save-btn"
              [disabled]="(updateLoading$ | async) || !profileForm.dirty"
              [attr.aria-busy]="updateLoading$ | async"
            >
              @if (updateLoading$ | async) {
                <span class="spinner" aria-hidden="true"></span>
                Saving...
              } @else {
                Save Changes
              }
            </button>

            <!-- Success feedback -->
            @if (showSuccess) {
              <div class="feedback success" role="status" aria-live="polite">
                Profile updated successfully
              </div>
            }

            <!-- Error feedback -->
            @if (updateError$ | async; as updateError) {
              <div class="feedback error" role="alert">
                {{ updateError }}
              </div>
            }
          </form>

          <!-- Navigation links -->
          <nav class="profile-nav" aria-label="Profile sub-pages">
            <a routerLink="/profile/history" class="nav-link">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 8v4l3 3"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              Job History
              <svg class="nav-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </a>
            <a routerLink="/profile/performance" class="nav-link">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Performance & Ratings
              <svg class="nav-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </a>
          </nav>

          <!-- Sign Out -->
          <button class="sign-out-btn" (click)="onSignOut()">
            <svg class="sign-out-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        }
      }
    </div>
  `,
  styles: [`
    .profile-page {
      padding: 16px;
      max-width: 480px;
      margin: 0 auto;
    }

    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0 0 24px 0;
    }

    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 500;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-input {
      width: 100%;
      padding: 12px 14px;
      font-size: 16px;
      color: #f1f5f9;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      outline: none;
      transition: border-color 0.2s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      border-color: #10b981;
    }

    .form-input.readonly {
      background: #0f172a;
      color: #64748b;
      cursor: not-allowed;
    }

    .form-select {
      appearance: none;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      padding-right: 36px;
    }

    .field-error {
      font-size: 12px;
      color: #ef4444;
      margin-top: 2px;
    }

    .save-btn {
      margin-top: 8px;
      min-height: 48px;
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      background: #10b981;
      color: #ffffff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity 0.2s ease, background 0.2s ease;
    }

    .save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #475569;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .feedback {
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 14px;
      text-align: center;
    }

    .feedback.success {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .feedback.error {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .profile-nav {
      margin-top: 32px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 14px;
      background: #1e293b;
      border-radius: 10px;
      color: #f1f5f9;
      text-decoration: none;
      font-size: 15px;
      font-weight: 500;
      transition: background 0.2s ease;
    }

    .nav-link:hover {
      background: #334155;
    }

    .nav-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: #10b981;
    }

    .nav-chevron {
      width: 16px;
      height: 16px;
      margin-left: auto;
      color: #64748b;
    }

    .sign-out-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      margin-top: 24px;
      padding: 14px 20px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 10px;
      color: #ef4444;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease;
      min-height: 48px;
    }

    .sign-out-btn:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .sign-out-icon {
      width: 20px;
      height: 20px;
    }
  `],
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileForm!: FormGroup;
  validationErrors: Record<string, string> = {};
  showSuccess = false;

  profile$ = this.store.select(selectProfileData);
  loading$ = this.store.select(selectProfileLoading);
  error$ = this.store.select(selectProfileError);
  updateLoading$ = this.store.select(selectProfileUpdateLoading);
  updateError$ = this.store.select(selectProfileUpdateError);

  private destroy$ = new Subject<void>();
  private currentProfile: WorkerProfile | null = null;
  private successTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private store: Store,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.store.dispatch(ProfileActions.loadProfile());

    // Populate form when profile data arrives
    this.profile$.pipe(takeUntil(this.destroy$)).subscribe((profile) => {
      if (profile) {
        this.currentProfile = profile;
        this.patchForm(profile);
      }
    });

    // Detect successful update: updateLoading transitions true → false with no error
    this.store
      .select(selectProfileUpdateLoading)
      .pipe(
        pairwise(),
        filter(([prev, curr]) => prev === true && curr === false),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Check error state synchronously after loading completes
        const sub = this.store
          .select(selectProfileUpdateError)
          .subscribe((error) => {
            if (!error) {
              this.showSuccessFeedback();
              this.profileForm.markAsPristine();
            }
          });
        sub.unsubscribe();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }
  }

  onSave(): void {
    this.validationErrors = {};
    this.showSuccess = false;

    if (!this.currentProfile) return;

    const formValue = this.profileForm.getRawValue();
    const updateData: ProfileUpdate = {
      name: formValue.name,
      bankAccountRef: formValue.bankAccountRef,
    };

    if (this.currentProfile.workerType === 'driver') {
      updateData.vehicleType = formValue.vehicleType;
      updateData.vehicleRegistration = formValue.vehicleRegistration;
    }

    // Validate using the shared utility
    const errors = validateProfileUpdate(updateData, this.currentProfile.workerType);
    if (errors) {
      this.validationErrors = errors;
      return;
    }

    this.store.dispatch(ProfileActions.updateProfile({ data: updateData }));
  }

  onLoadRetry(): void {
    this.store.dispatch(ProfileActions.loadProfile());
  }

  onSignOut(): void {
    this.store.dispatch(AuthActions.logout());
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: [{ value: '', disabled: true }],
      bankAccountRef: ['', [Validators.required, Validators.maxLength(255)]],
      vehicleType: ['bicycle'],
      vehicleRegistration: [''],
    });
  }

  private patchForm(profile: WorkerProfile): void {
    this.profileForm.patchValue({
      name: profile.name,
      email: profile.email,
      bankAccountRef: profile.bankAccountRef,
      vehicleType: profile.vehicleType || 'bicycle',
      vehicleRegistration: profile.vehicleRegistration || '',
    });
    this.profileForm.markAsPristine();
  }

  private showSuccessFeedback(): void {
    this.showSuccess = true;
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }
    this.successTimeout = setTimeout(() => {
      this.showSuccess = false;
    }, 3000);
  }
}
