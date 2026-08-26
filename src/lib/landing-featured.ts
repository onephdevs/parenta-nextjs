/** Max properties shown in landing Featured properties and What’s nearby. */
export const LANDING_FEATURED_LIMIT = 2;

export class LandingFeaturedFullError extends Error {
  readonly count: number;
  readonly max: number;

  constructor(count: number, max: number = LANDING_FEATURED_LIMIT) {
    super(
      `Landing page is full (${count}/${max}). Turn off another property first.`
    );
    this.name = 'LandingFeaturedFullError';
    this.count = count;
    this.max = max;
  }
}
