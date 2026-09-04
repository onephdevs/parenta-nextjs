import { getBoardBySlug, getCardsForBoard } from '@/lib/api/pipeline';
import InquiriesClient from '@/components/features/inquiries/InquiriesClient';

export const revalidate = 0;

export default async function InquiriesPage() {
  const [board, cards] = await Promise.all([
    getBoardBySlug('onboarding'),
    getCardsForBoard('onboarding', { includeClosed: true }),
  ]);

  if (!board) {
    return (
      <div className="space-y-6 p-6">
        <p className="text-sm text-gray-600">
          The onboarding pipeline is not set up yet, so inquiry tickets cannot be listed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <InquiriesClient initialCards={cards} board={board} />
    </div>
  );
}
