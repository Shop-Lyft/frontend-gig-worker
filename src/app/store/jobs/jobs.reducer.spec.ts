import { jobsReducer, JobsState, initialJobsState } from './jobs.reducer';
import * as JobsActions from './jobs.actions';
import { Job } from '../../core/models/job.model';

describe('Jobs Reducer', () => {
  const mockJob: Job = {
    id: 'job-1',
    orderId: 'order-1',
    storeId: 'store-1',
    jobType: 'shopper',
    status: 'pending',
    storeName: 'Test Store',
    storeLatitude: -26.2041,
    storeLongitude: 28.0473,
    itemCount: 5,
    estimatedPay: 45.0,
    createdAt: '2024-01-01T10:00:00Z',
  };

  const mockJob2: Job = {
    id: 'job-2',
    orderId: 'order-2',
    storeId: 'store-2',
    jobType: 'driver',
    status: 'pending',
    storeName: 'Another Store',
    storeLatitude: -26.1076,
    storeLongitude: 28.0567,
    itemCount: 3,
    estimatedPay: 60.0,
    createdAt: '2024-01-01T11:00:00Z',
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const action = { type: 'Unknown' } as any;
      const state = jobsReducer(undefined, action);
      expect(state).toEqual(initialJobsState);
    });
  });

  describe('loadJobs action', () => {
    it('should set loading to true and clear error', () => {
      const stateWithError: JobsState = {
        ...initialJobsState,
        error: { message: 'previous error', timestamp: 1000 },
      };
      const action = JobsActions.loadJobs();
      const state = jobsReducer(stateWithError, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('loadJobsSuccess action', () => {
    it('should set jobs data, stop loading, and record timestamp', () => {
      const loadingState: JobsState = { ...initialJobsState, loading: true };
      const jobs = [mockJob, mockJob2];
      const action = JobsActions.loadJobsSuccess({ jobs });
      const state = jobsReducer(loadingState, action);

      expect(state.data).toEqual(jobs);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastFetchedAt).not.toBeNull();
      expect(state.lastFetchedAt!).toBeGreaterThan(0);
    });
  });

  describe('loadJobsFailure action', () => {
    it('should set error and stop loading', () => {
      const loadingState: JobsState = { ...initialJobsState, loading: true };
      const action = JobsActions.loadJobsFailure({ error: 'Network error' });
      const state = jobsReducer(loadingState, action);

      expect(state.loading).toBe(false);
      expect(state.error).not.toBeNull();
      expect(state.error!.message).toBe('Network error');
      expect(state.error!.timestamp).toBeGreaterThan(0);
    });
  });

  describe('setFilter action', () => {
    it('should update activeFilter', () => {
      const action = JobsActions.setFilter({ filter: 'shopper' });
      const state = jobsReducer(initialJobsState, action);

      expect(state.activeFilter).toBe('shopper');
    });

    it('should set filter to driver', () => {
      const action = JobsActions.setFilter({ filter: 'driver' });
      const state = jobsReducer(initialJobsState, action);

      expect(state.activeFilter).toBe('driver');
    });

    it('should set filter back to all', () => {
      const filteredState: JobsState = { ...initialJobsState, activeFilter: 'shopper' };
      const action = JobsActions.setFilter({ filter: 'all' });
      const state = jobsReducer(filteredState, action);

      expect(state.activeFilter).toBe('all');
    });
  });

  describe('setWorkerLocation action', () => {
    it('should set worker location coordinates', () => {
      const action = JobsActions.setWorkerLocation({ lat: -26.2041, lng: 28.0473 });
      const state = jobsReducer(initialJobsState, action);

      expect(state.workerLocation).toEqual({ lat: -26.2041, lng: 28.0473 });
    });
  });

  describe('acceptJob action', () => {
    it('should set loading to true and clear error', () => {
      const action = JobsActions.acceptJob({ jobId: 'job-1' });
      const state = jobsReducer(initialJobsState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('acceptJobSuccess action', () => {
    it('should remove accepted job from the list', () => {
      const stateWithJobs: JobsState = {
        ...initialJobsState,
        data: [mockJob, mockJob2],
        loading: true,
      };
      const action = JobsActions.acceptJobSuccess({ job: mockJob });
      const state = jobsReducer(stateWithJobs, action);

      expect(state.loading).toBe(false);
      expect(state.data).toEqual([mockJob2]);
    });

    it('should handle null data gracefully', () => {
      const loadingState: JobsState = { ...initialJobsState, loading: true };
      const action = JobsActions.acceptJobSuccess({ job: mockJob });
      const state = jobsReducer(loadingState, action);

      expect(state.loading).toBe(false);
      expect(state.data).toBeNull();
    });
  });

  describe('acceptJobFailure action', () => {
    it('should set error and stop loading', () => {
      const loadingState: JobsState = { ...initialJobsState, loading: true };
      const action = JobsActions.acceptJobFailure({ error: 'Job no longer available' });
      const state = jobsReducer(loadingState, action);

      expect(state.loading).toBe(false);
      expect(state.error!.message).toBe('Job no longer available');
    });
  });

  describe('jobAvailable action (WebSocket)', () => {
    it('should append new job to existing list', () => {
      const stateWithJobs: JobsState = { ...initialJobsState, data: [mockJob] };
      const action = JobsActions.jobAvailable({ job: mockJob2 });
      const state = jobsReducer(stateWithJobs, action);

      expect(state.data).toEqual([mockJob, mockJob2]);
    });

    it('should create list with single job when data is null', () => {
      const action = JobsActions.jobAvailable({ job: mockJob });
      const state = jobsReducer(initialJobsState, action);

      expect(state.data).toEqual([mockJob]);
    });
  });

  describe('jobTaken action (WebSocket)', () => {
    it('should remove taken job from list', () => {
      const stateWithJobs: JobsState = { ...initialJobsState, data: [mockJob, mockJob2] };
      const action = JobsActions.jobTaken({ jobId: 'job-1' });
      const state = jobsReducer(stateWithJobs, action);

      expect(state.data).toEqual([mockJob2]);
    });

    it('should handle null data gracefully', () => {
      const action = JobsActions.jobTaken({ jobId: 'job-1' });
      const state = jobsReducer(initialJobsState, action);

      expect(state.data).toBeNull();
    });

    it('should handle non-existent job ID', () => {
      const stateWithJobs: JobsState = { ...initialJobsState, data: [mockJob] };
      const action = JobsActions.jobTaken({ jobId: 'non-existent' });
      const state = jobsReducer(stateWithJobs, action);

      expect(state.data).toEqual([mockJob]);
    });
  });

  describe('clearJobsState action', () => {
    it('should reset to initial state', () => {
      const populatedState: JobsState = {
        data: [mockJob, mockJob2],
        loading: false,
        error: null,
        lastFetchedAt: 1234567890,
        activeFilter: 'driver',
        workerLocation: { lat: -26.2041, lng: 28.0473 },
      };
      const action = JobsActions.clearJobsState();
      const state = jobsReducer(populatedState, action);

      expect(state).toEqual(initialJobsState);
    });
  });
});
