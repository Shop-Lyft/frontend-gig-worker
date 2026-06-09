import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Job, JobFilter } from '../../core/models/job.model';
import {
  AvailabilityToggleComponent,
  JobCardComponent,
  SkeletonLoaderComponent,
  ErrorRetryComponent,
} from '../../shared/components';
import * as JobsActions from '../../store/jobs/jobs.actions';
import {
  selectSortedByDistance,
  selectJobsLoading,
  selectJobsError,
  selectActiveFilter,
} from '../../store/jobs/jobs.selectors';
import { selectHasActiveJob } from '../../store/active-job/active-job.selectors';
import { selectWorker, selectToken } from '../../store/auth/auth.selectors';
import { GIG_WORKER_SERVICE } from '../../core/services/gig-worker.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { PushNotificationService } from '../../core/services/push-notification.service';

/**
 * JobsPageComponent — Available Jobs screen.
 *
 * Displays the AvailabilityToggle at top, three filter tabs (All/Shopper/Driver),
 * a list of JobCards sorted by distance, and handles multiple empty states:
 * - Offline: "Go online to see jobs"
 * - No GPS: "Enable location to see jobs"
 * - No matching jobs: "No jobs available"
 *
 * Real-time: new jobs arriving via WebSocket slide in with a 300ms animation.
 *
 * Push notification flows (Req 13.2–13.5):
 * - On first login after registration, prompts for push notification permission
 * - Shows denial banner when permission is denied
 * - Handles notification tap → highlights the target job card
 *
 * Requirements: 4.1–4.6, 5.1–5.8, 6.1–6.7, 13.2–13.5
 */
@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    AvailabilityToggleComponent,
    JobCardComponent,
    SkeletonLoaderComponent,
    ErrorRetryComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="jobs-page">
      <!-- Push Notification Permission Prompt Dialog -->
      @if (showPushPrompt) {
        <div class="push-prompt-overlay" role="dialog" aria-labelledby="push-prompt-title" aria-describedby="push-prompt-desc">
          <div class="push-prompt-dialog">
            <div class="push-prompt-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <h2 id="push-prompt-title" class="push-prompt-title">Enable Notifications</h2>
            <p id="push-prompt-desc" class="push-prompt-desc">
              Get notified instantly when new jobs matching your skills are available nearby.
              This helps you respond quickly and earn more.
            </p>
            <div class="push-prompt-actions">
              <button class="push-prompt-btn primary" (click)="onAllowNotifications()">Allow Notifications</button>
              <button class="push-prompt-btn secondary" (click)="onDismissPushPrompt()">Not Now</button>
            </div>
          </div>
        </div>
      }

      <!-- Push Notification Denied Banner -->
      @if (showPushDeniedBanner) {
        <div class="push-denied-banner" role="alert">
          <div class="push-denied-content">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="push-denied-icon" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            <span class="push-denied-text">
              Push notifications disabled.
              <a href="app-settings:notifications" class="push-denied-link" (click)="onOpenDeviceSettings($event)">Enable in device settings</a>
              to get new job alerts.
            </span>
          </div>
          <button class="push-denied-dismiss" (click)="onDismissPushDeniedBanner()" aria-label="Dismiss notification banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      }

      <!-- Filter Tabs -->
      <nav class="filter-tabs" aria-label="Job type filter">
        @for (tab of filterTabs; track tab.value) {
          <button
            class="filter-tab"
            [class.active]="(activeFilter$ | async) === tab.value"
            (click)="onFilterChange(tab.value)"
            [attr.aria-pressed]="(activeFilter$ | async) === tab.value"
          >
            {{ tab.label }}
          </button>
        }
      </nav>

      <!-- Content Area -->
      <section class="jobs-content">
        @if ((loading$ | async) === true && jobsList === null) {
          <!-- Loading State -->
          <div class="skeleton-list">
            @for (i of skeletonItems; track i) {
              <app-skeleton-loader [lines]="3" [showAvatar]="true"></app-skeleton-loader>
            }
          </div>
        } @else if (errorMessage) {
          <!-- Error State -->
          <app-error-retry
            [message]="errorMessage"
            (retry)="onRetry()"
          ></app-error-retry>
        } @else if (gpsPermissionDenied) {
          <!-- No GPS Empty State -->
          <div class="empty-state" role="status">
            <div class="empty-icon gps-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
                <line x1="2" y1="2" x2="22" y2="22"/>
              </svg>
            </div>
            <h2 class="empty-title">Location required</h2>
            <p class="empty-message">Enable location to see available jobs</p>
          </div>
        } @else if (jobsList !== null && jobsList.length === 0) {
          <!-- No Matching Jobs Empty State -->
          <div class="empty-state" role="status">
            <div class="empty-icon no-jobs-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <h2 class="empty-title">No jobs available</h2>
            <p class="empty-message">No jobs available for the selected filter right now</p>
          </div>
        } @else if (jobsList !== null && jobsList.length > 0) {
          <!-- Job List -->
          <div class="job-list" role="list">
            @for (job of jobsList; track job.id) {
              <div
                class="job-card-wrapper"
                [class.highlighted]="highlightedJobId === job.id"
                role="listitem"
              >
                <app-job-card
                  [job]="job"
                  [acceptLoading]="acceptingJobId === job.id"
                  [disabled]="acceptingJobId !== null && acceptingJobId !== job.id || (hasActiveJob$ | async) === true"
                  (accept)="onAcceptJob($event)"
                ></app-job-card>
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .jobs-page {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      padding: 16px;
      gap: 16px;
    }

    /* Availability Section */
    .availability-section {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }

    .active-job-warning {
      font-size: 12px;
      color: #f59e0b;
      margin: 0;
    }

    /* Filter Tabs */
    .filter-tabs {
      display: flex;
      gap: 8px;
      padding: 4px;
      background: #1e293b;
      border-radius: 10px;
    }

    .filter-tab {
      flex: 1;
      min-height: 44px;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #94a3b8;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .filter-tab.active {
      background: #10b981;
      color: #ffffff;
      font-weight: 600;
    }

    .filter-tab:not(.active):hover {
      background: rgba(148, 163, 184, 0.1);
    }

    /* Content Area */
    .jobs-content {
      flex: 1;
    }

    /* Skeleton list */
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* Empty States */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }

    .empty-icon {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      margin-bottom: 16px;
    }

    .empty-icon svg {
      width: 32px;
      height: 32px;
    }

    .offline-icon {
      background: rgba(148, 163, 184, 0.1);
      color: #94a3b8;
    }

    .gps-icon {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }

    .no-jobs-icon {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 8px;
    }

    .empty-message {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
      line-height: 1.5;
    }

    /* Job List with slide-in animation */
    .job-list {
      display: flex;
      flex-direction: column;
    }

    .job-card-wrapper {
      animation: slideIn 300ms ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Highlighted Job Card (from notification tap) */
    .job-card-wrapper.highlighted {
      animation: highlightPulse 3s ease-out;
      border-radius: 12px;
    }

    @keyframes highlightPulse {
      0% {
        background: rgba(16, 185, 129, 0.25);
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.5);
      }
      70% {
        background: rgba(16, 185, 129, 0.1);
        box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.2);
      }
      100% {
        background: transparent;
        box-shadow: none;
      }
    }

    /* Push Notification Permission Prompt Dialog */
    .push-prompt-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 24px;
    }

    .push-prompt-dialog {
      background: #1e293b;
      border-radius: 16px;
      padding: 32px 24px;
      max-width: 340px;
      width: 100%;
      text-align: center;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
    }

    .push-prompt-icon {
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      margin: 0 auto 16px;
    }

    .push-prompt-icon svg {
      width: 28px;
      height: 28px;
    }

    .push-prompt-title {
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 8px;
    }

    .push-prompt-desc {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0 0 24px;
    }

    .push-prompt-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .push-prompt-btn {
      min-height: 44px;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.2s;
    }

    .push-prompt-btn.primary {
      background: #10b981;
      color: #ffffff;
    }

    .push-prompt-btn.primary:hover {
      opacity: 0.9;
    }

    .push-prompt-btn.secondary {
      background: transparent;
      color: #94a3b8;
      border: 1px solid #334155;
    }

    .push-prompt-btn.secondary:hover {
      background: rgba(148, 163, 184, 0.05);
    }

    /* Push Notification Denied Banner */
    .push-denied-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 10px;
    }

    .push-denied-content {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }

    .push-denied-icon {
      width: 20px;
      height: 20px;
      color: #f59e0b;
      flex-shrink: 0;
    }

    .push-denied-text {
      font-size: 13px;
      color: #f59e0b;
      line-height: 1.4;
    }

    .push-denied-link {
      color: #fbbf24;
      text-decoration: underline;
      cursor: pointer;
    }

    .push-denied-dismiss {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: #f59e0b;
      cursor: pointer;
      border-radius: 6px;
      flex-shrink: 0;
    }

    .push-denied-dismiss:hover {
      background: rgba(245, 158, 11, 0.1);
    }

    .push-denied-dismiss svg {
      width: 16px;
      height: 16px;
    }
  `],
})
export class JobsComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly gigService = inject(GIG_WORKER_SERVICE);
  private readonly geolocationService = inject(GeolocationService);
  private readonly webSocketService = inject(WebSocketService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  /** localStorage key for push prompt tracking */
  private static readonly PUSH_PROMPTED_KEY = 'gig_push_prompted';
  /** localStorage key for banner dismissed state */
  private static readonly PUSH_DENIED_DISMISSED_KEY = 'gig_push_denied_dismissed';

  /** Observable streams from store */
  jobs$!: Observable<Job[] | null>;
  loading$!: Observable<boolean>;
  error$!: Observable<{ message: string; timestamp: number } | null>;
  activeFilter$!: Observable<JobFilter>;
  hasActiveJob$!: Observable<boolean>;

  /** Local component state synced from observables for template use */
  jobsList: Job[] | null = null;
  errorMessage: string | null = null;
  isOnline = true; // Workers are always online when logged in
  availabilityLoading = false;
  gpsPermissionDenied = false;
  acceptingJobId: string | null = null;

  /** Push notification prompt state */
  showPushPrompt = false;

  /** Push notification denied banner state */
  showPushDeniedBanner = false;

  /** Currently highlighted job ID (from notification tap or query param) */
  highlightedJobId: string | null = null;

  /** Timer ref for highlight auto-remove */
  private highlightTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Filter tab configuration — dynamically set based on worker type */
  filterTabs: { label: string; value: JobFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Shopper', value: 'shopper' },
    { label: 'Driver', value: 'driver' },
  ];

  /** Skeleton placeholder count */
  readonly skeletonItems = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    // Wire store selectors
    this.jobs$ = this.store.select(selectSortedByDistance);
    this.loading$ = this.store.select(selectJobsLoading);
    this.error$ = this.store.select(selectJobsError);
    this.activeFilter$ = this.store.select(selectActiveFilter);
    this.hasActiveJob$ = this.store.select(selectHasActiveJob);

    // Sync jobs list to local property for template usage
    this.jobs$
      .pipe(takeUntil(this.destroy$))
      .subscribe((jobs) => {
        this.jobsList = jobs;
      });

    // Sync error state to local property for template usage
    this.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.errorMessage = error?.message ?? null;
      });

    // Worker is always online when logged in — initialize immediately
    this.store
      .select(selectWorker)
      .pipe(takeUntil(this.destroy$))
      .subscribe((worker) => {
        if (worker) {
          this.isOnline = true;

          // Set default filter based on worker type (shopper/driver)
          const workerType = worker.workerType as JobFilter;
          if (workerType === 'shopper' || workerType === 'driver') {
            this.store.dispatch(JobsActions.setFilter({ filter: workerType }));

            // Configure visible tabs based on worker type
            if (workerType === 'shopper') {
              this.filterTabs = [
                { label: 'All', value: 'shopper' },
                { label: 'Shopper', value: 'shopper' },
              ];
            } else if (workerType === 'driver') {
              this.filterTabs = [
                { label: 'All', value: 'driver' },
                { label: 'Driver', value: 'driver' },
              ];
            }
          }

          this.initializeOnlineMode();
        }
      });

    // Listen for accept job results to clear local loading state
    this.store
      .select(selectJobsLoading)
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        if (!loading) {
          this.acceptingJobId = null;
        }
      });

    // Track GPS permission status
    const permStatus = this.geolocationService.permissionStatus();
    this.gpsPermissionDenied = permStatus === 'denied';

    // --- Push Notification Permission Flow (Req 13.4) ---
    this.checkAndPromptPushPermission();

    // --- Push Notification Denied Banner (Req 13.5) ---
    this.updatePushDeniedBannerState();

    // --- Handle notification tap navigation (Req 13.2, 13.3) ---
    this.handleNotificationTapNavigation();

    // --- Check for highlightJobId query param ---
    this.checkHighlightQueryParam();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }
  }

  /**
   * Handle availability toggle. Persists the new state to the backend
   * and starts/stops online mode accordingly.
   */
  onAvailabilityToggle(newState: boolean): void {
    this.availabilityLoading = true;
    const previousState = this.isOnline;

    this.gigService.setAvailability(newState).subscribe({
      next: () => {
        this.isOnline = newState;
        this.availabilityLoading = false;

        if (newState) {
          this.initializeOnlineMode();
        } else {
          this.teardownOnlineMode();
        }
      },
      error: () => {
        // Revert toggle on failure (Requirement 4.6)
        this.isOnline = previousState;
        this.availabilityLoading = false;
      },
    });
  }

  /**
   * Handle filter tab selection.
   */
  onFilterChange(filter: JobFilter): void {
    this.store.dispatch(JobsActions.setFilter({ filter }));
  }

  /**
   * Handle job accept button click.
   */
  onAcceptJob(jobId: string): void {
    this.acceptingJobId = jobId;
    this.store.dispatch(JobsActions.acceptJob({ jobId }));
  }

  /**
   * Handle error retry.
   */
  onRetry(): void {
    this.store.dispatch(JobsActions.loadJobs());
  }

  /**
   * User clicks "Allow Notifications" in the push prompt dialog.
   * Requests browser notification permission and registers FCM token.
   */
  onAllowNotifications(): void {
    this.showPushPrompt = false;
    localStorage.setItem(JobsComponent.PUSH_PROMPTED_KEY, 'true');

    this.pushNotificationService.requestPermission()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result === 'granted') {
          // Register FCM token with backend
          this.pushNotificationService.registerToken()
            .pipe(takeUntil(this.destroy$))
            .subscribe();
          this.showPushDeniedBanner = false;
        } else {
          // Permission denied — show banner
          this.showPushDeniedBanner = true;
          localStorage.removeItem(JobsComponent.PUSH_DENIED_DISMISSED_KEY);
        }
      });
  }

  /**
   * User clicks "Not Now" — dismiss the push prompt without requesting permission.
   */
  onDismissPushPrompt(): void {
    this.showPushPrompt = false;
    localStorage.setItem(JobsComponent.PUSH_PROMPTED_KEY, 'true');
    // Permission is still 'default' or 'denied' — show denial banner if denied
    this.updatePushDeniedBannerState();
  }

  /**
   * User dismisses the push denied banner.
   */
  onDismissPushDeniedBanner(): void {
    this.showPushDeniedBanner = false;
    localStorage.setItem(JobsComponent.PUSH_DENIED_DISMISSED_KEY, 'true');
  }

  /**
   * Attempts to open device settings for notifications.
   * In web context, this just prevents default and gives instructions.
   */
  onOpenDeviceSettings(event: Event): void {
    event.preventDefault();
    // On mobile (PWA), we can try to open app settings.
    // On desktop, just provide guidance — there's no universal API for this.
    // The link text itself guides the user.
    if ('permissions' in navigator && 'query' in navigator.permissions) {
      // Can't programmatically open settings, but the banner text directs the user
    }
  }

  /**
   * Checks if this is the first login after registration and shows push prompt.
   * Uses localStorage flag `gig_push_prompted` to track if we've already prompted.
   */
  private checkAndPromptPushPermission(): void {
    const alreadyPrompted = localStorage.getItem(JobsComponent.PUSH_PROMPTED_KEY);

    if (alreadyPrompted) {
      // Already prompted previously — don't show again
      return;
    }

    // Check if Notification API is available and permission hasn't been decided yet
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      // Show the explanation dialog before requesting permission
      this.showPushPrompt = true;
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      // Already granted — mark as prompted and register token
      localStorage.setItem(JobsComponent.PUSH_PROMPTED_KEY, 'true');
      this.pushNotificationService.registerToken()
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    } else {
      // Permission is denied or Notification API unavailable — mark as prompted
      localStorage.setItem(JobsComponent.PUSH_PROMPTED_KEY, 'true');
    }
  }

  /**
   * Updates the push denied banner visibility based on current permission state
   * and whether the user has dismissed it.
   */
  private updatePushDeniedBannerState(): void {
    const dismissed = localStorage.getItem(JobsComponent.PUSH_DENIED_DISMISSED_KEY);
    if (dismissed) {
      this.showPushDeniedBanner = false;
      return;
    }

    // Show banner if permission was denied
    if (this.pushNotificationService.isPermissionDenied()) {
      this.showPushDeniedBanner = true;
    }
  }

  /**
   * Subscribes to push notification tap events and handles navigation.
   * When a notification is tapped, navigates to /jobs with the highlighted job.
   */
  private handleNotificationTapNavigation(): void {
    this.pushNotificationService.onNotificationTap
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ jobId }) => {
        if (jobId) {
          this.highlightJob(jobId);
        }
        // If we're not already on /jobs, navigate there
        this.router.navigate(['/jobs'], {
          queryParams: jobId ? { highlightJobId: jobId } : {},
        });
      });
  }

  /**
   * Checks the route query params for a `highlightJobId` param and highlights
   * that job card temporarily.
   */
  private checkHighlightQueryParam(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const highlightJobId = params['highlightJobId'];
        if (highlightJobId) {
          this.highlightJob(highlightJobId);
          // Clean up the query param after reading it
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true,
          });
        }
      });
  }

  /**
   * Highlights a specific job card for 3 seconds, then removes the highlight.
   */
  private highlightJob(jobId: string): void {
    // Clear any existing highlight timeout
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }

    this.highlightedJobId = jobId;

    // Auto-remove highlight after 3 seconds
    this.highlightTimeout = setTimeout(() => {
      this.highlightedJobId = null;
      this.highlightTimeout = null;
    }, 3000);
  }

  /**
   * Initialize online mode: request geolocation, start tracking,
   * connect WebSocket, load available jobs.
   */
  private initializeOnlineMode(): void {
    // Request geolocation permission and start tracking
    this.geolocationService.requestPermission().subscribe((granted) => {
      if (granted) {
        this.gpsPermissionDenied = false;
        // Start tracking with idle interval (30s) when no active job
        this.geolocationService.startTracking(
          GeolocationService.IDLE_INTERVAL_MS
        );

        // Update worker location in store when position changes
        this.pollLocationUpdates();
      } else {
        this.gpsPermissionDenied = true;
      }
    });

    // Connect WebSocket
    this.store
      .select(selectToken)
      .pipe(takeUntil(this.destroy$))
      .subscribe((token) => {
        if (token) {
          this.webSocketService.connect(token);
        }
      });

    // Load available jobs
    this.store.dispatch(JobsActions.loadJobs());
  }

  /**
   * Teardown online mode: stop geolocation tracking, disconnect WebSocket.
   */
  private teardownOnlineMode(): void {
    this.geolocationService.stopTracking();
    this.webSocketService.disconnect();
  }

  /**
   * Periodically read the geolocation service's current position and
   * dispatch location updates to the store.
   */
  private pollLocationUpdates(): void {
    // Use an interval to check for position changes since the service uses signals
    const checkInterval = setInterval(() => {
      const position = this.geolocationService.currentPosition();
      if (position) {
        this.store.dispatch(
          JobsActions.setWorkerLocation({ lat: position.lat, lng: position.lng })
        );
      }
    }, 5000);

    // Clean up on destroy
    this.destroy$.subscribe(() => clearInterval(checkInterval));
  }
}
