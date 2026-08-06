import LandingPageClient from '@/components/features/LandingPageClient';
import { getPublicPortfolio } from '@/lib/api/public-portfolio';

/**
 * Marketing homepage — portfolio is loaded on the server (with in-process cache)
 * so reloads do not flash a client loading state for stats/properties.
 */
export default async function LandingPage() {
  let initialPortfolio = null;
  try {
    initialPortfolio = await getPublicPortfolio();
  } catch (error) {
    console.error('Landing page portfolio preload failed:', error);
  }

  return <LandingPageClient initialPortfolio={initialPortfolio} />;
}
