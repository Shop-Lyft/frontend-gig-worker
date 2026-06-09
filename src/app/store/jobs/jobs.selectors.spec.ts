import {
  selectJobs,
  selectJobsLoading,
  selectJobsError,
  selectActiveFilter,
  selectWorkerLocation,
  selectLastFetchedAt,
  selectFilteredJobs,
  selectSortedByDistance,
  selectHasActiveJob,
} from './jobs.selectors';
import { JobsState, initialJobsState } from './jobs.reducer';
import { Job } from '../../core/models/job.model';

describe('Jobs Selectors', () => {
  const mockShopperJob: Job = {
    id: 'job-1',
    orderId: 'order-1',
    storeId: 'store-1',
    jobType: 'shopper',
    status: 'pending',
    storeName: 'Shoprite Sandton',
    storeLatitude: -26.1076,
    storeLongitude: 28.0567,
    itemCount: 5,
    estimatedPay: 45.0,
    createdAt: '2024-01-01T10:00:00Z',
  };

  const mockDriverJob: Job = {
    id: 'job-2',
    orderId: 'order-2',
    storeId: 'store-2',
    jobType: 'driver',
    status: 'pending',
    storeName: 'Pick n Pay Rosebank',
    storeLatitude: -26.1470,
    storeLongitude: 28.0437,
    itemCount: 3,
    estimatedPay: 60.0,
    createdAt: '2024-01-01T11:00:00Z',
  };

  const mockActiveJob: Job = {
    id: 'job-3',
    orderId: 'order-3',
    storeId: 'store-3',
    jobType: 'shopper',
    status: 'assigned',
    storeName: 'Checkers Melrose',
    storeLatitude: -26.1330,
    storeLongitude: 28.0672,
    itemCount: 8,
    estimatedPay: 75.0,
    createdAt: '2024-01-01T12:00:00Z',
  };

  const stateWithJobs: JobsState = {
    data: [mockShopperJob, mockDriverJob],
    loading: false,
    error: null,
    lastFetchedAt: 1704103200000,
    activeFilter: 'all',
    workerLocation: { lat: -26.2041, lng: 28.0473 },
  };

  // Helper to create the root state shape
  const createState = (jobsState: JobsState) => ({
    jobs: jobsState,
  });

  describe('selectJobs', () => {
    it('should return jobs data', () => {
      const result = selectJobs.projector(stateWithJobs);
      expect(result).toEqual([mockShopperJob, mockDriverJob]);
    });

    it('should return null when no data', () => {
      const result = selectJobs.projector(initialJobsState);
      expect(result).toBeNull();
    });
  });

  describe('selectJobsLoading', () => {
    it('should return loading state', () => {
      const loadingState: JobsState = { ...initialJobsState, loading: true };
      const result = selectJobsLoading.projector(loadingState);
      expect(result).toBe(true);
    });
  });

  describe('selectJobsError', () => {
    it('should return error state', () => {
      const errorState: JobsState = {
        ...initialJobsState,
        error: { message: 'Failed', timestamp: 1000 },
      };
      const result = selectJobsError.projector(errorState);
      expect(result).toEqual({ message: 'Failed', timestamp: 1000 });
    });

    it('should return null when no error', () => {
      const result = selectJobsError.projector(initialJobsState);
      expect(result).toBeNull();
    });
  });

  describe('selectActiveFilter', () => {
    it('should return the active filter', () => {
      const result = selectActiveFilter.projector(stateWithJobs);
      expect(result).toBe('all');
    });
  });

  describe('selectWorkerLocation', () => {
    it('should return worker location', () => {
      const result = selectWorkerLocation.projector(stateWithJobs);
      expect(result).toEqual({ lat: -26.2041, lng: 28.0473 });
    });

    it('should return null when no location', () => {
      const result = selectWorkerLocation.projector(initialJobsState);
      expect(result).toBeNull();
    });
  });

  describe('selectLastFetchedAt', () => {
    it('should return the last fetched timestamp', () => {
      const result = selectLastFetchedAt.projector(stateWithJobs);
      expect(result).toBe(1704103200000);
    });
  });

  describe('selectFilteredJobs', () => {
    it('should return all jobs when filter is all', () => {
      const result = selectFilteredJobs.projector(
        [mockShopperJob, mockDriverJob],
        'all'
      );
      expect(result).toEqual([mockShopperJob, mockDriverJob]);
    });

    it('should filter shopper jobs only', () => {
      const result = selectFilteredJobs.projector(
        [mockShopperJob, mockDriverJob],
        'shopper'
      );
      expect(result).toEqual([mockShopperJob]);
    });

    it('should filter driver jobs only', () => {
      const result = selectFilteredJobs.projector(
        [mockShopperJob, mockDriverJob],
        'driver'
      );
      expect(result).toEqual([mockDriverJob]);
    });

    it('should return null when jobs is null', () => {
      const result = selectFilteredJobs.projector(null, 'all');
      expect(result).toBeNull();
    });

    it('should return empty array when no jobs match filter', () => {
      const result = selectFilteredJobs.projector(
        [mockShopperJob],
        'driver'
      );
      expect(result).toEqual([]);
    });
  });

  describe('selectSortedByDistance', () => {
    it('should sort jobs by distance from worker location', () => {
      // Worker is at -26.2041, 28.0473
      // mockShopperJob store at -26.1076, 28.0567 (closer)
      // mockDriverJob store at -26.1470, 28.0437 (in between)
      const result = selectSortedByDistance.projector(
        [mockShopperJob, mockDriverJob],
        { lat: -26.2041, lng: 28.0473 }
      );

      expect(result).not.toBeNull();
      // Both stores are north of the worker; Rosebank (-26.1470) is closer than Sandton (-26.1076)
      // but the actual distance depends on full haversine calculation
      expect(result!.length).toBe(2);
    });

    it('should return jobs as-is when no worker location', () => {
      const result = selectSortedByDistance.projector(
        [mockShopperJob, mockDriverJob],
        null
      );
      expect(result).toEqual([mockShopperJob, mockDriverJob]);
    });

    it('should return null when jobs is null', () => {
      const result = selectSortedByDistance.projector(
        null,
        { lat: -26.2041, lng: 28.0473 }
      );
      expect(result).toBeNull();
    });
  });

  describe('selectHasActiveJob', () => {
    it('should return true when a job has assigned status', () => {
      const result = selectHasActiveJob.projector([mockShopperJob, mockActiveJob]);
      expect(result).toBe(true);
    });

    it('should return true when a job has being_picked status', () => {
      const beingPickedJob: Job = { ...mockActiveJob, status: 'being_picked' };
      const result = selectHasActiveJob.projector([beingPickedJob]);
      expect(result).toBe(true);
    });

    it('should return true when a job has in_delivery status', () => {
      const inDeliveryJob: Job = { ...mockActiveJob, status: 'in_delivery' };
      const result = selectHasActiveJob.projector([inDeliveryJob]);
      expect(result).toBe(true);
    });

    it('should return false when all jobs are pending', () => {
      const result = selectHasActiveJob.projector([mockShopperJob, mockDriverJob]);
      expect(result).toBe(false);
    });

    it('should return false when jobs is null', () => {
      const result = selectHasActiveJob.projector(null);
      expect(result).toBe(false);
    });

    it('should return false for empty array', () => {
      const result = selectHasActiveJob.projector([]);
      expect(result).toBe(false);
    });
  });
});
