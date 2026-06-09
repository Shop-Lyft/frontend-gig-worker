import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, EMPTY, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { GigWorkerService } from './gig-worker.service';
import { Job, JobEvent, JobFilter, JobHistoryItem, PaginatedResult } from '../models/job.model';
import { AuthResult, ProfileUpdate, RegistrationData, WorkerProfile } from '../models/worker.model';
import { EarningsData, PerformanceData } from '../models/earnings.model';
import { PickItem, PickItemStatus, SubstitutionProposal, SubstitutionResponse } from '../models/picklist.model';

@Injectable()
export class GigWorkerRestService implements GigWorkerService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  // --- Auth ---

  login(email: string, password: string): Observable<AuthResult> {
    return this.http
      .post<AuthResult>(`${this.baseUrl}/auth/gig/login`, { email, password })
      .pipe(catchError(this.handleError));
  }

  register(data: RegistrationData): Observable<AuthResult> {
    return this.http
      .post<AuthResult>(`${this.baseUrl}/auth/gig/register`, data)
      .pipe(catchError(this.handleError));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/auth/gig/logout`, {})
      .pipe(catchError(this.handleError));
  }

  // --- Profile ---

  getProfile(): Observable<WorkerProfile> {
    return this.http
      .get<WorkerProfile>(`${this.baseUrl}/gig/profile`)
      .pipe(catchError(this.handleError));
  }

  updateProfile(data: ProfileUpdate): Observable<WorkerProfile> {
    return this.http
      .put<WorkerProfile>(`${this.baseUrl}/gig/profile`, data)
      .pipe(catchError(this.handleError));
  }

  // --- Availability ---

  getAvailability(): Observable<boolean> {
    return this.http
      .get<WorkerProfile>(`${this.baseUrl}/gig/profile`)
      .pipe(
        map((profile) => profile.available),
        catchError(this.handleError)
      );
  }

  setAvailability(available: boolean): Observable<void> {
    return this.http
      .put<void>(`${this.baseUrl}/gig/availability`, { available })
      .pipe(catchError(this.handleError));
  }

  // --- Jobs ---

  getAvailableJobs(filter?: JobFilter): Observable<Job[]> {
    let params = new HttpParams();
    if (filter && filter !== 'all') {
      params = params.set('filter', filter);
    }

    return this.http
      .get<Job[]>(`${this.baseUrl}/gig/jobs`, { params })
      .pipe(catchError(this.handleError));
  }

  acceptJob(jobId: string): Observable<Job> {
    return this.http
      .post<Job>(`${this.baseUrl}/gig/jobs/${jobId}/accept`, {})
      .pipe(catchError(this.handleError));
  }

  // --- Active Job ---

  getActiveJob(): Observable<Job | null> {
    return this.http
      .get<Job | null>(`${this.baseUrl}/gig/active-job`)
      .pipe(catchError(this.handleError));
  }

  getPicklist(orderId: string): Observable<PickItem[]> {
    return this.http
      .get<PickItem[]>(`${this.baseUrl}/gig/picklist/${orderId}`)
      .pipe(catchError(this.handleError));
  }

  updatePickItemStatus(orderId: string, itemId: string, status: PickItemStatus): Observable<void> {
    return this.http
      .put<void>(`${this.baseUrl}/gig/picklist/${orderId}/items/${itemId}`, { status })
      .pipe(catchError(this.handleError));
  }

  markAllPicked(jobId: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/gig/jobs/${jobId}/mark-picked`, {})
      .pipe(catchError(this.handleError));
  }

  completeDelivery(orderId: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/gig/delivery/${orderId}/complete`, {})
      .pipe(catchError(this.handleError));
  }

  // --- Substitution ---

  proposeSubstitution(orderId: string, itemId: string, sub: SubstitutionProposal): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/gig/picklist/${orderId}/items/${itemId}/substitute`, sub)
      .pipe(catchError(this.handleError));
  }

  cancelSubstitution(orderId: string, itemId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/gig/picklist/${orderId}/items/${itemId}/substitute`)
      .pipe(catchError(this.handleError));
  }

  // --- Earnings ---

  getEarnings(): Observable<EarningsData> {
    return this.http
      .get<EarningsData>(`${this.baseUrl}/gig/earnings`)
      .pipe(catchError(this.handleError));
  }

  // --- History & Performance ---

  getJobHistory(page: number, pageSize: number): Observable<PaginatedResult<JobHistoryItem>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', pageSize.toString());

    return this.http
      .get<PaginatedResult<JobHistoryItem>>(`${this.baseUrl}/gig/history`, { params })
      .pipe(catchError(this.handleError));
  }

  getPerformance(): Observable<PerformanceData> {
    return this.http
      .get<PerformanceData>(`${this.baseUrl}/gig/performance`)
      .pipe(catchError(this.handleError));
  }

  // --- Real-time (WebSocket handled separately in task 8.1) ---

  subscribeToJobUpdates(): Observable<JobEvent> {
    return EMPTY;
  }

  subscribeToSubstitutionResponses(): Observable<SubstitutionResponse> {
    return EMPTY;
  }

  // --- Error handling ---

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'An unexpected error occurred';

    if (error.status === 0) {
      message = 'Unable to connect to the server. Please check your network connection.';
    } else if (error.status === 401) {
      message = 'Your session has expired. Please log in again.';
    } else if (error.status === 403) {
      message = 'You do not have permission to perform this action.';
    } else if (error.status === 404) {
      message = 'The requested resource was not found.';
    } else if (error.status === 409) {
      message = 'This job is no longer available.';
    } else if (error.status === 422) {
      message = error.error?.message || 'Validation failed. Please check your input.';
    } else if (error.status >= 500) {
      message = 'A server error occurred. Please try again later.';
    }

    return throwError(() => ({ status: error.status, message, originalError: error }));
  }
}
