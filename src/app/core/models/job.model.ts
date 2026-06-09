export interface Job {
  id: string;
  orderId: string;
  storeId: string;
  jobType: 'shopper' | 'driver';
  status: string;
  storeName: string;
  storeLatitude: number;
  storeLongitude: number;
  itemCount: number;
  estimatedPay: number;
  distance?: number;
  customerAddress?: string;
  customerPhone?: string;
  createdAt: string;
}

export interface JobHistoryItem {
  id: string;
  orderId: string;
  orderNumber: string;
  jobType: 'shopper' | 'driver';
  storeName: string;
  completedAt: string;
  earnedAmount: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface JobEvent {
  type: 'job_available' | 'job_taken';
  payload: JobAvailablePayload | JobTakenPayload;
}

export interface JobAvailablePayload {
  jobId: string;
  jobType: 'shopper' | 'driver';
  storeName: string;
  storeLatitude: number;
  storeLongitude: number;
  itemCount: number;
  estimatedPay: number;
}

export interface JobTakenPayload {
  jobId: string;
}

export type JobFilter = 'all' | 'shopper' | 'driver';
