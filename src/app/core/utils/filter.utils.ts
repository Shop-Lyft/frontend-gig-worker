import { Job, JobFilter } from '../models/job.model';

/**
 * Filters a list of jobs by type.
 *
 * @param jobs - Array of jobs to filter
 * @param filter - Filter type: 'all' returns all jobs, 'shopper' returns only shopper jobs,
 *                 'driver' returns only driver jobs
 * @returns Filtered array of jobs matching the specified type
 */
export function filterJobsByType(jobs: Job[], filter: JobFilter): Job[] {
  if (filter === 'all') {
    return jobs;
  }
  return jobs.filter((job) => job.jobType === filter);
}
