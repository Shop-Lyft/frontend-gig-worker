import { createFeatureSelector, createSelector } from '@ngrx/store';
import { JobsState } from './jobs.reducer';
import { Job } from '../../core/models/job.model';

export const selectJobsState = createFeatureSelector<JobsState>('jobs');

export const selectJobs = createSelector(
  selectJobsState,
  (state) => state.data
);

export const selectJobsLoading = createSelector(
  selectJobsState,
  (state) => state.loading
);

export const selectJobsError = createSelector(
  selectJobsState,
  (state) => state.error
);

export const selectActiveFilter = createSelector(
  selectJobsState,
  (state) => state.activeFilter
);

export const selectWorkerLocation = createSelector(
  selectJobsState,
  (state) => state.workerLocation
);

export const selectLastFetchedAt = createSelector(
  selectJobsState,
  (state) => state.lastFetchedAt
);

export const selectFilteredJobs = createSelector(
  selectJobs,
  selectActiveFilter,
  (jobs, filter): Job[] | null => {
    if (!jobs) return null;
    if (filter === 'all') return jobs;
    return jobs.filter((job) => job.jobType === filter);
  }
);

/**
 * Haversine distance in km between two lat/lng points.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export const selectSortedByDistance = createSelector(
  selectFilteredJobs,
  selectWorkerLocation,
  (jobs, location): Job[] | null => {
    if (!jobs) return null;
    if (!location) return jobs;

    return [...jobs].sort((a, b) => {
      const distA = haversineDistance(
        location.lat,
        location.lng,
        a.storeLatitude,
        a.storeLongitude
      );
      const distB = haversineDistance(
        location.lat,
        location.lng,
        b.storeLatitude,
        b.storeLongitude
      );
      return distA - distB;
    });
  }
);

export const selectHasActiveJob = createSelector(
  selectJobs,
  (jobs): boolean => {
    if (!jobs) return false;
    return jobs.some(
      (job) =>
        job.status === 'assigned' ||
        job.status === 'being_picked' ||
        job.status === 'in_delivery'
    );
  }
);
