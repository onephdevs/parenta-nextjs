import { Metadata } from 'next';
import { CheckCircle2, Clock, FileDown, FileText } from 'lucide-react';
import AdvancedExportManager from '@/components/features/AdvancedExportManager';
import {
  Alert,
  ListSummaryCard,
  PageHeader,
} from '@/components/ui';

export const metadata: Metadata = {
  title: 'Advanced Export | Property Management',
  description: 'Create custom reports and manage data exports',
};

export default async function AdvancedExportPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Advanced Export Manager"
        description="Create custom reports and manage data exports"
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total Exports"
          value={24}
          footer="+3 this week"
          icon={<FileDown className="h-8 w-8 text-blue-600" />}
        />
        <ListSummaryCard
          title="Completed"
          value={18}
          footer="95% success rate"
          icon={<CheckCircle2 className="h-8 w-8 text-green-600" />}
        />
        <ListSummaryCard
          title="Processing"
          value={2}
          footer="Est. 3 min remaining"
          icon={<Clock className="h-8 w-8 text-yellow-600" />}
        />
        <ListSummaryCard
          title="Custom Reports"
          value={8}
          footer="6 public reports"
          icon={<FileText className="h-8 w-8 text-purple-600" />}
        />
      </div>

      <AdvancedExportManager />

      <Alert variant="info" title="Export Features">
        <ul className="list-inside list-disc space-y-1">
          <li>Export data in multiple formats: CSV, Excel, PDF, and JSON</li>
          <li>Create custom reports with filters and field selection</li>
          <li>Schedule automated exports with email delivery</li>
          <li>Large exports are processed in the background</li>
          <li>Download links expire after 7 days for security</li>
          <li>All exports are logged for audit purposes</li>
        </ul>
      </Alert>
    </div>
  );
}
