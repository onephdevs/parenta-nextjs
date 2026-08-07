import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Percent,
  Zap,
} from 'lucide-react';
import { authOptions } from '@/lib/auth';
import PaymentGatewayManager from '@/components/features/PaymentGatewayManager';
import {
  Alert,
  Badge,
  Button,
  ListSummaryCard,
  PageHeader,
} from '@/components/ui';

export default async function PaymentGatewaysPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payment Gateway Configuration"
        description="Configure gateways to accept online payments"
        actions={
          <>
            <Badge tone="success">Test Mode</Badge>
            <Link href="/admin/financial">
              <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Active Gateways"
          value={1}
          footer="currently enabled"
          icon={<CheckCircle2 className="h-8 w-8 text-green-600" />}
        />
        <ListSummaryCard
          title="Payment Methods"
          value={6}
          footer="supported methods"
          icon={<CreditCard className="h-8 w-8 text-blue-600" />}
        />
        <ListSummaryCard
          title="Avg Processing Fee"
          value="2.9%"
          footer="typical gateway rate"
          icon={<Percent className="h-8 w-8 text-yellow-600" />}
        />
        <ListSummaryCard
          title="Webhooks Status"
          value="Active"
          footer="receiving events"
          icon={<Zap className="h-8 w-8 text-purple-600" />}
        />
      </div>

      <Alert variant="warning" title="Payment Gateway Configuration">
        Configure your payment gateways to start accepting online payments. Make sure
        to test your configuration thoroughly before enabling live mode. All sensitive
        API keys are encrypted and securely stored.
      </Alert>

      <PaymentGatewayManager />
    </div>
  );
}
