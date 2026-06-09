import { reconcileJobList } from './reconcile.utils';
import { Job } from '../models/job.model';

describe('reconcile.utils - reconcileJobList', () => {
  function makeJob(id: string, storeName: string = 'Store'): Job {
    return {
      id,
      orderId: `order-${id}`,
      storeId: `store-${id}`,
      jobType: 'shopper',
      status: 'pending',
      storeName,
      storeLatitude: -26.2,
      storeLongitude: 28.0,
      itemCount: 5,
      estimatedPay: 45.0,
      createdAt: '2024-01-01T00:00:00Z',
    };
  }

  it('should return incoming jobs when current is empty', () => {
    const incoming = [makeJob('1'), makeJob('2')];
    const result = reconcileJobList([], incoming);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });

  it('should return empty when incoming is empty (removes stale)', () => {
    const current = [makeJob('1'), makeJob('2')];
    const result = reconcileJobList(current, []);
    expect(result).toEqual([]);
  });

  it('should add new jobs from incoming that are not in current', () => {
    const current = [makeJob('1')];
    const incoming = [makeJob('1'), makeJob('2'), makeJob('3')];
    const result = reconcileJobList(current, incoming);
    expect(result.length).toBe(3);
    expect(result.map((j) => j.id)).toEqual(['1', '2', '3']);
  });

  it('should remove jobs from current that are not in incoming', () => {
    const current = [makeJob('1'), makeJob('2'), makeJob('3')];
    const incoming = [makeJob('1'), makeJob('3')];
    const result = reconcileJobList(current, incoming);
    expect(result.length).toBe(2);
    expect(result.map((j) => j.id)).toEqual(['1', '3']);
  });

  it('should produce no duplicates even if incoming has duplicates', () => {
    const current = [makeJob('1')];
    const incoming = [makeJob('1'), makeJob('2'), makeJob('2'), makeJob('3')];
    const result = reconcileJobList(current, incoming);
    expect(result.length).toBe(3);
    const ids = result.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should preserve enriched data from current for jobs that exist in both', () => {
    const currentJob = { ...makeJob('1'), distance: 2.5 };
    const incomingJob = makeJob('1');
    const result = reconcileJobList([currentJob], [incomingJob]);
    expect(result.length).toBe(1);
    expect(result[0].distance).toBe(2.5);
  });

  it('should handle both current and incoming being empty', () => {
    const result = reconcileJobList([], []);
    expect(result).toEqual([]);
  });

  it('should use incoming job data for new jobs', () => {
    const incoming = [makeJob('new', 'New Store')];
    const result = reconcileJobList([], incoming);
    expect(result[0].storeName).toBe('New Store');
  });

  it('should maintain incoming order', () => {
    const current = [makeJob('3'), makeJob('1')];
    const incoming = [makeJob('2'), makeJob('1'), makeJob('3')];
    const result = reconcileJobList(current, incoming);
    expect(result.map((j) => j.id)).toEqual(['2', '1', '3']);
  });
});
