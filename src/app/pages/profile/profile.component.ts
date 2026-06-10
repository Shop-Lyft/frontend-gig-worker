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
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
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
