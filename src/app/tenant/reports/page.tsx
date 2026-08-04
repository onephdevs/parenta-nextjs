import { redirect } from 'next/navigation';

/** Statements live under Payments — keep old URL working. */
export default function TenantReportsRedirect() {
  redirect('/tenant/payments?tab=statements');
}
