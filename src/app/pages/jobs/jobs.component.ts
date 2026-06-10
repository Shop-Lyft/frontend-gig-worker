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
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss',
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
    { label: 'All Jobs', value: 'all' },
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
          const workerType = (worker.workerType || 'shopper') as JobFilter;
          console.log('[Jobs] Worker type:', workerType);

          // Always filter by worker type — dispatch filter
          this.store.dispatch(JobsActions.setFilter({ filter: workerType }));

          // Configure visible tabs based on worker type
          if (workerType === 'shopper') {
            this.filterTabs = [
              { label: 'All Shopper Jobs', value: 'shopper' },
            ];
          } else if (workerType === 'driver') {
            this.filterTabs = [
              { label: 'All Driver Jobs', value: 'driver' },
            ];
          }

          // Dispatch loadJobs after a tick to ensure filter is set in store
          setTimeout(() => {
            this.store.dispatch(JobsActions.loadJobs());
          }, 50);

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
