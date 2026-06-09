import { createAction, props } from '@ngrx/store';
import { Job, JobFilter } from '../../core/models/job.model';

// Load jobs
export const loadJobs = createAction('[Jobs] Load Jobs');
export const loadJobsBackground = createAction('[Jobs] Load Jobs Background');
export const loadJobsSuccess = createAction(
  '[Jobs] Load Jobs Success',
  props<{ jobs: Job[] }>()
);
export const loadJobsFailure = createAction(
  '[Jobs] Load Jobs Failure',
  props<{ error: string }>()
);

// Filter
export const setFilter = createAction(
  '[Jobs] Set Filter',
  props<{ filter: JobFilter }>()
);

// Worker location
export const setWorkerLocation = createAction(
  '[Jobs] Set Worker Location',
  props<{ lat: number; lng: number }>()
);

// Accept job
export const acceptJob = createAction(
  '[Jobs] Accept Job',
  props<{ jobId: string }>()
);
export const acceptJobSuccess = createAction(
  '[Jobs] Accept Job Success',
  props<{ job: Job }>()
);
export const acceptJobFailure = createAction(
  '[Jobs] Accept Job Failure',
  props<{ error: string }>()
);

// Real-time WebSocket events
export const jobAvailable = createAction(
  '[Jobs] Job Available',
  props<{ job: Job }>()
);
export const jobTaken = createAction(
  '[Jobs] Job Taken',
  props<{ jobId: string }>()
);

// Clear state on logout
export const clearJobsState = createAction('[Jobs] Clear State');
