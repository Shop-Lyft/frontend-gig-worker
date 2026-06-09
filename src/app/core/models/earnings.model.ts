export interface EarningsData {
  weeklyEarnings: number;
  monthlyEarnings: number;
  jobsCompletedThisWeek: number;
  workerRating: number;
  recentSettlements: DailySettlement[];
  bankAccountRefMasked: string;
}

export interface DailySettlement {
  day: string;
  amount: number;
}

export interface PerformanceData {
  overallRating: number;
  totalRatings: number;
  totalJobsCompleted: number;
  acceptanceRate: number;
  currentTier: 'gold' | 'silver' | 'bronze';
  recentReviews: Review[];
}

export interface Review {
  rating: number;
  reviewText?: string;
  createdAt: string;
}
