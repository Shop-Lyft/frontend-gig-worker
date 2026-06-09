/**
 * Performance tier classification utility.
 * Gold: average rating >= 4.8
 * Silver: average rating 4.5–4.79
 * Bronze: average rating < 4.5
 */

export type PerformanceTier = 'gold' | 'silver' | 'bronze';

/**
 * Classifies a worker's performance tier based on their average rating.
 * @param averageRating - The worker's average rating (0.0–5.0)
 * @returns The performance tier classification
 */
export function classifyTier(averageRating: number): PerformanceTier {
  if (averageRating >= 4.8) {
    return 'gold';
  }
  if (averageRating >= 4.5) {
    return 'silver';
  }
  return 'bronze';
}

/**
 * Returns the CSS hex colour associated with the performance tier.
 * @param tier - The performance tier
 * @returns A CSS hex colour string
 */
export function getTierColor(tier: PerformanceTier): string {
  switch (tier) {
    case 'gold':
      return '#FFD700';
    case 'silver':
      return '#C0C0C0';
    case 'bronze':
      return '#CD7F32';
  }
}
