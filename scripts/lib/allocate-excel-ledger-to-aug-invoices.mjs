/**
 * Apply Jun 16–Jul 15 Excel ledger cash (rent + 1-month advance) onto
 * August 2026 rent invoices so the payments hub Paid filter includes Apt 1/2.
 *
 * Idempotent: only allocates remaining unallocated payment cash up to
 * remaining invoice balance. Does not apply deposits or the Store hardware cheque.
 *
 * @param {import('pg').Client} client
 */
export async function allocateExcelLedgerToAugustInvoices(client) {
  const INVOICE_TAG = 'excel-ledger-rent:2026-08+09';
  const LEDGER_TAG = 'ledger:2026-06-16:2026-07-15';
  const ALLOC_NOTE = `Excel ledger sync [${LEDGER_TAG}]`;

  const invoices = await client.query(
    `SELECT
       i.id,
       i.tenant_id,
       i.invoice_number,
       i.total_amount::float AS total_amount,
       i.amount_paid::float AS amount_paid,
       i.invoice_status,
       t.first_name || ' ' || t.last_name AS tenant_name,
       r.room_number,
       b.name AS building_name
     FROM invoices i
     JOIN tenants t ON t.id = i.tenant_id
     LEFT JOIN LATERAL (
       SELECT tra.room_id
       FROM tenant_room_assignments tra
       WHERE tra.tenant_id = i.tenant_id
         AND tra.assignment_status = 'active'
         AND (tra.end_date IS NULL OR tra.end_date >= CURRENT_DATE)
       ORDER BY tra.start_date DESC
       LIMIT 1
     ) a ON true
     LEFT JOIN rooms r ON r.id = a.room_id
     LEFT JOIN buildings b ON b.id = r.building_id
     WHERE i.invoice_status IS DISTINCT FROM 'cancelled'
       AND i.notes ILIKE $1
       AND TO_CHAR(COALESCE(i.billing_period_start, i.due_date, i.issue_date), 'YYYY-MM') = '2026-08'
     ORDER BY b.name, r.room_number`,
    [`%${INVOICE_TAG}%`]
  );

  const summary = {
    invoices: invoices.rows.length,
    allocated: 0,
    paid: 0,
    partial: 0,
    skippedPaid: 0,
    skippedNoCash: 0,
    amount: 0,
  };

  console.log('\n==== Allocate Excel ledger payments → August invoices ====');

  for (const invoice of invoices.rows) {
    const alreadyPaid = Number(invoice.amount_paid) + 0.009 >= Number(invoice.total_amount);
    if (alreadyPaid) {
      summary.skippedPaid += 1;
      continue;
    }

    const payments = await client.query(
      `SELECT
         p.id,
         p.amount::float AS amount,
         p.payment_type,
         p.payment_date,
         GREATEST(
           p.amount::float - COALESCE((
             SELECT SUM(pa.allocated_amount)::float
             FROM payment_allocations pa
             WHERE pa.payment_id = p.id
           ), 0),
           0
         ) AS remaining
       FROM payments p
       WHERE p.tenant_id = $1
         AND p.payment_status IN ('paid', 'completed', 'partial')
         AND p.payment_type IN ('rent', 'advance')
         AND p.notes ILIKE $2
         AND p.notes NOT ILIKE '%Hardware%'
         AND LOWER(COALESCE(p.payment_method, 'cash')) NOT IN ('cheque', 'check')
       ORDER BY
         CASE p.payment_type WHEN 'rent' THEN 0 ELSE 1 END,
         p.payment_date ASC,
         p.created_at ASC`,
      [invoice.tenant_id, `%${LEDGER_TAG}%`]
    );

    let remainingInvoice =
      Number(invoice.total_amount) - Number(invoice.amount_paid);
    let applied = 0;

    await client.query('BEGIN');
    try {
      for (const payment of payments.rows) {
        if (remainingInvoice <= 0.009) break;
        const cash = Number(payment.remaining);
        if (cash <= 0.009) continue;

        const alloc = Math.round(Math.min(cash, remainingInvoice) * 100) / 100;
        if (alloc <= 0) continue;

        await client.query(
          `INSERT INTO payment_allocations (
             payment_id, invoice_id, allocated_amount, allocation_date, notes
           ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)`,
          [payment.id, invoice.id, alloc, ALLOC_NOTE]
        );

        remainingInvoice -= alloc;
        applied += alloc;
      }

      if (applied <= 0.009) {
        await client.query('ROLLBACK');
        summary.skippedNoCash += 1;
        const label = `${(invoice.building_name || '').trim()} ${invoice.room_number || ''}`.trim();
        console.log(
          `  skip ${invoice.invoice_number} ${label} ${invoice.tenant_name} — no unallocated rent/advance cash`
        );
        continue;
      }

      const newPaid =
        Math.round((Number(invoice.amount_paid) + applied) * 100) / 100;
      const newBalance = Math.round((Number(invoice.total_amount) - newPaid) * 100) / 100;
      const invoiceStatus = newBalance <= 0.009 ? 'paid' : 'partial';
      const billStatus = newBalance <= 0.009 ? 'PAID' : 'PARTIAL';

      await client.query(
        `UPDATE invoices
         SET amount_paid = $1,
             invoice_status = $2,
             bill_status = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [newPaid, invoiceStatus, billStatus, invoice.id]
      );
      await client.query('COMMIT');

      summary.allocated += 1;
      summary.amount += applied;
      if (invoiceStatus === 'paid') summary.paid += 1;
      else summary.partial += 1;

      const label = `${(invoice.building_name || '').trim()} ${invoice.room_number || ''}`.trim();
      console.log(
        `  ${invoice.invoice_number} ${label} ${invoice.tenant_name} +₱${applied.toLocaleString()} → ${invoiceStatus}`
      );
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  console.log(
    `  → invoices=${summary.invoices} allocated=${summary.allocated} paid=${summary.paid} partial=${summary.partial} alreadyPaid=${summary.skippedPaid} noCash=${summary.skippedNoCash} amount=₱${summary.amount.toLocaleString()}`
  );
  return summary;
}
