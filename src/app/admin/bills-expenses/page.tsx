import { redirect } from 'next/navigation';

/** Overview removed — Bills & Expenses lands on room utility bills. */
export default function BillsExpensesIndexPage() {
  redirect('/admin/bills-expenses/utility-bills');
}
