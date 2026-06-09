import { filterJobsByType } from './filter.utils';
import { Job } from '../models/job.model';

describe('filter.utils - filterJobsByType', () => {
  const mockJobs: Job[] = [
    {
      id: '1',
      orderId: 'o1',
      storeId: 's1',
      jobType: 'shopper',
      status: 'pending',
      storeName: 'Store A',
      storeLatitude: -26.2,
      storeLongitude: 28.0,
      itemCount: 5,
      estimatedPay: 45.0,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      orderId: 'o2',
      storeId: 's2',
      jobType: 'driver',
      status: 'pending',
      storeName: 'Store B',
      storeLatitude: -26.3,
      storeLongitude: 28.1,
      itemCount: 3,
      estimatedPay: 60.0,
      createdAt: '2024-01-01T01:00:00Z',
    },
    {
      id: '3',
      orderId: 'o3',
      storeId: 's3',
      jobType: 'shopper',
      status: 'pending',
      storeName: 'Store C',
      storeLatitude: -26.4,
      storeLongitude: 28.2,
      itemCount: 8,
      estimatedPay: 55.0,
      createdAt: '2024-01-01T02:00:00Z',
    },
  ];

  it('should return all jobs when filter is "all"', () => {
    const result = filterJobsByType(mockJobs, 'all');
    expect(result).toEqual(mockJobs);
  });

  it('should return only shopper jobs when filter is "shopper"', () => {
    const result = filterJobsByType(mockJobs, 'shopper');
    expect(result.length).toBe(2);
    expect(result.every((job) => job.jobType === 'shopper')).toBe(true);
  });

  it('should return only driver jobs when filter is "driver"', () => {
    const result = filterJobsByType(mockJobs, 'driver');
    expect(result.length).toBe(1);
    expect(result[0].jobType).toBe('driver');
    expect(result[0].id).toBe('2');
  });

  it('should return an empty array if no jobs match the filter', () => {
    const shopperOnly: Job[] = [mockJobs[0], mockJobs[2]];
    const result = filterJobsByType(shopperOnly, 'driver');
    expect(result).toEqual([]);
  });

  it('should return an empty array when given an empty array', () => {
    expect(filterJobsByType([], 'all')).toEqual([]);
    expect(filterJobsByType([], 'shopper')).toEqual([]);
    expect(filterJobsByType([], 'driver')).toEqual([]);
  });

  it('should not mutate the original array', () => {
    const original = [...mockJobs];
    filterJobsByType(mockJobs, 'shopper');
    expect(mockJobs).toEqual(original);
  });
});
