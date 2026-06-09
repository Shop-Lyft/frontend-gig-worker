import { createReducer, on } from '@ngrx/store';
import { Job, JobFilter } from '../../core/models/job.model';
import * as JobsActions from './jobs.actions';

export interface JobsState {
  data: Job[] | null;
  loading: boolean;
  error: { message: string; timestamp: number } | null;
  lastFetchedAt: number | null;
  activeFilter: JobFilter;
  workerLocation: { lat: number; lng: number } | null;
}

export const initialJobsState: JobsState = {
  data: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
  activeFilter: 'all',
  workerLocation: null,
};

export const jobsReducer = createReducer(
  initialJobsState,

  // Load jobs
  on(JobsActions.loadJobs, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  // Background load (stale-while-revalidate: show cached data, no spinner)
  on(JobsActions.loadJobsBackground, (state) => ({
    ...state,
    error: null,
  })),

  on(JobsActions.loadJobsSuccess, (state, { jobs }) => ({
    ...state,
    data: jobs,
    loading: false,
    error: null,
    lastFetchedAt: Date.now(),
  })),

  on(JobsActions.loadJobsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error: { message: error, timestamp: Date.now() },
  })),

  // Filter
  on(JobsActions.setFilter, (state, { filter }) => ({
    ...state,
    activeFilter: filter,
  })),

  // Worker location
  on(JobsActions.setWorkerLocation, (state, { lat, lng }) => ({
    ...state,
    workerLocation: { lat, lng },
  })),

  // Accept job
  on(JobsActions.acceptJob, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(JobsActions.acceptJobSuccess, (state, { job }) => ({
    ...state,
    loading: false,
    data: state.data?.filter((j) => j.id !== job.id) ?? null,
  })),

  on(JobsActions.acceptJobFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error: { message: error, timestamp: Date.now() },
  })),

  // Real-time WebSocket events
  on(JobsActions.jobAvailable, (state, { job }) => ({
    ...state,
    data: state.data ? [...state.data, job] : [job],
  })),

  on(JobsActions.jobTaken, (state, { jobId }) => ({
    ...state,
    data: state.data?.filter((j) => j.id !== jobId) ?? null,
  })),

  // Clear state
  on(JobsActions.clearJobsState, () => ({ ...initialJobsState }))
);
