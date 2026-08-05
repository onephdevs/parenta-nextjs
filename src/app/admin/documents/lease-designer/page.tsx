import { Metadata } from 'next';
import LeaseTemplateDesigner from '@/components/features/lease-designer/LeaseTemplateDesigner';

export const metadata: Metadata = {
  title: 'Lease Designer | Alfonso',
  description: 'Compact 1-page room rental agreement designer with live printable preview',
};

export default function LeaseDesignerPage() {
  return (
    <div className="w-full px-3 py-5 sm:px-4 lg:px-6">
      <LeaseTemplateDesigner />
    </div>
  );
}
