import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Job, JobEvent, JobFilter, JobHistoryItem, PaginatedResult } from '../models/job.model';
import { AuthResult, ProfileUpdate, RegistrationData, WorkerProfile } from '../models/worker.model';
import { EarningsData, PerformanceData } from '../models/earnings.model';
import { PickItem, PickItemStatus, SubstitutionProposal, SubstitutionResponse } from '../models/picklist.model';

export interface GigWorkerService {
  // Auth
  login(email: string, password: string): Observable<AuthResult>;
  register(data: RegistrationData): Observable<AuthResult>;
  logout(): Observable<void>;

  // Profile
  getProfile(): Observable<WorkerProfile>;
  updateProfile(data: ProfileUpdate): Observable<WorkerProfile>;

  // Availability
  getAvailability(): Observable<boolean>;
  setAvailability(available: boolean): Observable<void>;

  // Jobs
  getAvailableJobs(filter?: JobFilter): Observable<Job[]>;
  acceptJob(jobId: string): Observable<Job>;

  // Active Job
  getActiveJob(): Observable<Job | null>;
  getPicklist(orderId: string): Observable<PickItem[]>;
  updatePickItemStatus(orderId: string, itemId: string, status: PickItemStatus): Observable<void>;
  markAllPicked(jobId: string): Observable<void>;
  completeDelivery(orderId: string): Observable<void>;

  // Substitution
  proposeSubstitution(orderId: string, itemId: string, sub: SubstitutionProposal): Observable<void>;
  cancelSubstitution(orderId: string, itemId: string): Observable<void>;

  // Earnings
  getEarnings(): Observable<EarningsData>;

  // History & Performance
  getJobHistory(page: number, pageSize: number): Observable<PaginatedResult<JobHistoryItem>>;
  getPerformance(): Observable<PerformanceData>;

  // Real-time
  subscribeToJobUpdates(): Observable<JobEvent>;
  subscribeToSubstitutionResponses(): Observable<SubstitutionResponse>;
}

export const GIG_WORKER_SERVICE = new InjectionToken<GigWorkerService>('GigWorkerService');
