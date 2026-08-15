#!/usr/bin/env node
/**
 * Backfill Apt 1/2 occupied tenants into modules a real create-tenant
 * + assign flow would have written: portal users already exist; this
 * adds contacts, activity, deposit ledger, notes, and task-board cards.
 *
 * Does not invent photos, maintenance, reservations, occupants, late fees,
 * or lease PDFs unless those already exist.
 *
 * Usage: node scripts/sync-excel-ledger-modules.mjs
 */
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(root, '.env.local') });
config({ path: join(root, '.env') });

const NOTE_TAG = 'excel-ledger-modules';
const EXP_TAG = 'ledger-exp:2026-06-16:2026-07-15';

const url = (process.env.DIRECT_URL || process.env.DATABASE_URL || '').replace(
  /[?&]pgbouncer=true/g,
  ''
);
if (!url) {
  console.error('DIRECT_URL or DATABASE_URL is required');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl:
    url.includes('supabase') || url.includes('vercel')
      ? { rejectUnauthorized: false }
      : undefined,
});

const counts = {
  contacts: 0,
  activity: 0,
  depositLedger: 0,
  notes: 0,
  onboardingCards: 0,
  paymentCards: 0,
  expenseCards: 0,
};

async function boardStage(slug, stageSlug) {
  const res = await client.query(
    `SELECT b.id AS board_id, s.id AS stage_id, s.is_won, s.slug
     FROM pipeline_boards b
     JOIN pipeline_stages s ON s.board_id = b.id
     WHERE b.slug = $1 AND s.slug = $2
     LIMIT 1`,
    [slug, stageSlug]
  );
  return res.rows[0] || null;
}

await client.connect();

try {
  const buildings = await client.query(
    `SELECT id, name FROM buildings
     WHERE COALESCE(is_active, true) = true
       AND (lower(trim(name)) LIKE '%apartment-1%'
         OR lower(trim(name)) LIKE '%aprtment-2%'
         OR lower(trim(name)) LIKE '%villasol%')`
  );
  const buildingIds = buildings.rows.map((b) => b.id);
  if (buildingIds.length === 0) throw new Error('Apt 1/2 buildings not found');

  const tenants = await client.query(
    `SELECT t.id, t.first_name, t.last_name, t.email, t.phone, t.user_id, t.notes,
            tra.id AS assignment_id, tra.room_id, tra.start_date, tra.deposit_paid,
            r.room_number, r.building_id, b.name AS building_name
     FROM tenants t
     JOIN tenant_room_assignments tra
       ON tra.tenant_id = t.id AND tra.assignment_status = 'active'
     JOIN rooms r ON r.id = tra.room_id
     JOIN buildings b ON b.id = r.building_id
     WHERE r.building_id = ANY($1::uuid[])
       AND COALESCE(t.is_active, true) = true`,
    [buildingIds]
  );

  const onboardWon = await boardStage('onboarding', 'won');
  const paymentsPaid = await boardStage('payments', 'paid');
  const paymentsDue = await boardStage('payments', 'due');
  const paymentsOverdue = await boardStage('payments', 'overdue');
  const paymentsUpcoming = await boardStage('payments', 'upcoming');

  await client.query('BEGIN');

  for (const t of tenants.rows) {
    const label = `${t.first_name} ${t.last_name}`.trim();

    const contact = await client.query(
      `SELECT id FROM contacts WHERE tenant_id = $1 LIMIT 1`,
      [t.id]
    );
    let contactId = contact.rows[0]?.id;
    if (!contactId) {
      const created = await client.query(
        `INSERT INTO contacts (first_name, last_name, email, phone, tenant_id, user_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id`,
        [t.first_name, t.last_name, t.email, t.phone, t.id, t.user_id]
      );
      contactId = created.rows[0].id;
      counts.contacts += 1;
    }
    await client.query(
      `INSERT INTO contact_roles (contact_id, role)
       VALUES ($1, 'TENANT')
       ON CONFLICT (contact_id, role) DO NOTHING`,
      [contactId]
    );

    const activity = await client.query(
      `SELECT 1 FROM activity_log
       WHERE entity_type = 'tenant' AND entity_id = $1
         AND action_type IN ('tenant.created', 'tenant.assigned')
       LIMIT 1`,
      [t.id]
    );
    if (!activity.rows[0]) {
      await client.query(
        `INSERT INTO activity_log (
           actor_user_id, actor_role, action_type, category,
           entity_type, entity_id, entity_label, metadata
         ) VALUES (NULL, 'system', 'tenant.assigned', 'tenants', 'tenant', $1, $2, $3::jsonb)`,
        [
          t.id,
          label,
          JSON.stringify({
            source: NOTE_TAG,
            room: t.room_number,
            building: t.building_name,
            link: `/admin/tenants/${t.id}`,
          }),
        ]
      );
      counts.activity += 1;
    }

    const depositPayments = await client.query(
      `SELECT id, amount, payment_date
       FROM payments
       WHERE tenant_id = $1 AND payment_type = 'deposit'
         AND COALESCE(payment_status, '') NOT IN ('cancelled', 'failed')`,
      [t.id]
    );
    for (const p of depositPayments.rows) {
      const existing = await client.query(
        `SELECT 1 FROM deposit_ledger WHERE payment_id = $1 LIMIT 1`,
        [p.id]
      );
      if (existing.rows[0]) continue;
      const byAmount = await client.query(
        `SELECT 1 FROM deposit_ledger
         WHERE tenant_id = $1 AND transaction_type = 'deposit' AND amount = $2
         LIMIT 1`,
        [t.id, p.amount]
      );
      if (byAmount.rows[0]) continue;
      await client.query(
        `INSERT INTO deposit_ledger (
           tenant_id, amount, transaction_type, payment_id, description, transaction_date
         ) VALUES ($1, $2, 'deposit', $3, $4, $5)`,
        [
          t.id,
          p.amount,
          p.id,
          `Security deposit — ${t.building_name} ${t.room_number} [${NOTE_TAG}]`,
          p.payment_date,
        ]
      );
      counts.depositLedger += 1;
    }

    if (t.notes && String(t.notes).trim()) {
      const note = await client.query(
        `SELECT 1 FROM entity_notes
         WHERE entity_type = 'tenant' AND entity_id = $1 AND body = $2
         LIMIT 1`,
        [t.id, String(t.notes).trim()]
      );
      if (!note.rows[0]) {
        await client.query(
          `INSERT INTO entity_notes (entity_type, entity_id, body)
           VALUES ('tenant', $1, $2)`,
          [t.id, String(t.notes).trim()]
        );
        counts.notes += 1;
      }
    }

    if (onboardWon) {
      const card = await client.query(
        `SELECT c.id FROM pipeline_cards c
         JOIN pipeline_boards b ON b.id = c.board_id
         WHERE b.slug = 'onboarding' AND c.tenant_id = $1
         LIMIT 1`,
        [t.id]
      );
      if (!card.rows[0]) {
        const created = await client.query(
          `INSERT INTO pipeline_cards (
             board_id, stage_id, title,
             contact_first_name, contact_last_name, contact_email, contact_phone,
             building_id, room_id, tenant_id, assignment_id,
             amount, source, tags, card_status, lease_status,
             lease_start_date, move_in_date, won_at, notes
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
             $12, 'Excel ledger', ARRAY['excel-ledger','Active lease'],
             'won', 'signed', $13, $13, CURRENT_TIMESTAMP, $14
           )
           RETURNING id`,
          [
            onboardWon.board_id,
            onboardWon.stage_id,
            `${label} — ${t.room_number}`,
            t.first_name,
            t.last_name,
            t.email,
            t.phone,
            t.building_id,
            t.room_id,
            t.id,
            t.assignment_id,
            t.deposit_paid,
            t.start_date,
            `Backfilled from Excel ledger [${NOTE_TAG}]`,
          ]
        );
        await client.query(
          `INSERT INTO pipeline_card_events (card_id, event_type, to_stage_id, to_board_id, note)
           VALUES ($1, 'created', $2, $3, $4)`,
          [
            created.rows[0].id,
            onboardWon.stage_id,
            onboardWon.board_id,
            'Excel ledger occupancy',
          ]
        );
        counts.onboardingCards += 1;
      }
    }

    const aug = await client.query(
      `SELECT invoice_status, total_amount::float AS total, amount_paid::float AS paid,
              GREATEST(total_amount - COALESCE(amount_paid, 0), 0)::float AS balance,
              due_date::text AS due_date
       FROM invoices
       WHERE tenant_id = $1
         AND invoice_status IS DISTINCT FROM 'cancelled'
         AND notes ILIKE '%excel-ledger-rent:2026-08+09%'
         AND TO_CHAR(COALESCE(billing_period_start, due_date), 'YYYY-MM') = '2026-08'
       LIMIT 1`,
      [t.id]
    );
    const inv = aug.rows[0];
    let payStage = paymentsPaid;
    if (inv && inv.balance > 0.01) {
      const dueIso = String(inv.due_date || '').slice(0, 10);
      const due = dueIso ? new Date(`${dueIso}T00:00:00`) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntilDue = due
        ? Math.round((due.getTime() - today.getTime()) / 86400000)
        : 99;
      if (daysUntilDue < 0) payStage = paymentsOverdue || paymentsDue || paymentsPaid;
      else if (daysUntilDue <= 7) payStage = paymentsDue || paymentsUpcoming || paymentsPaid;
      else payStage = paymentsUpcoming || paymentsDue || paymentsPaid;
    }
    if (payStage) {
      const existingPay = await client.query(
        `SELECT c.id FROM pipeline_cards c
         JOIN pipeline_boards b ON b.id = c.board_id
         WHERE b.slug = 'payments' AND c.tenant_id = $1
         LIMIT 1`,
        [t.id]
      );
      const amount = inv ? inv.balance || inv.total : null;
      if (existingPay.rows[0]) {
        await client.query(
          `UPDATE pipeline_cards SET
             stage_id = $2,
             amount = $3,
             card_status = 'open',
             won_at = NULL,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
             AND (stage_id IS DISTINCT FROM $2 OR amount IS DISTINCT FROM $3)`,
          [existingPay.rows[0].id, payStage.stage_id, amount]
        );
        counts.paymentCards += 1;
      } else {
        await client.query(
          `INSERT INTO pipeline_cards (
             board_id, stage_id, title,
             contact_first_name, contact_last_name, contact_email,
             building_id, room_id, tenant_id, assignment_id,
             amount, source, tags, card_status, notes
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             $11, 'Excel ledger', ARRAY['excel-ledger','Active lease'],
             'open', $12
           )`,
          [
            payStage.board_id,
            payStage.stage_id,
            label,
            t.first_name,
            t.last_name,
            t.email,
            t.building_id,
            t.room_id,
            t.id,
            t.assignment_id,
            amount,
            `Excel ledger August rent [${NOTE_TAG}]`,
          ]
        );
        counts.paymentCards += 1;
      }
    }
  }

  const expenses = await client.query(
    `SELECT e.id, e.category, e.amount, e.expense_status, e.expense_date,
            e.vendor_name, e.description, e.building_id, e.room_id, e.notes,
            b.name AS building_name, r.room_number
     FROM expenses e
     JOIN buildings b ON b.id = e.building_id
     LEFT JOIN rooms r ON r.id = e.room_id
     WHERE e.building_id = ANY($1::uuid[])
       AND e.notes ILIKE $2`,
    [buildingIds, `%${EXP_TAG}%`]
  );

  for (const e of expenses.rows) {
    const existing = await client.query(
      `SELECT 1 FROM pipeline_cards WHERE expense_id = $1 LIMIT 1`,
      [e.id]
    );
    if (existing.rows[0]) continue;
    const status = String(e.expense_status || 'pending').toLowerCase();
    const stageSlug =
      status === 'paid' ? 'paid' : status === 'approved' ? 'approved' : 'bill_received';
    const stage = await boardStage('expenses', stageSlug);
    if (!stage) continue;
    const location = [e.building_name, e.room_number].filter(Boolean).join(' ');
    const title = (e.description || '').trim() || `${e.category} — ${location}`;
    const isPaid = stageSlug === 'paid';
    await client.query(
      `INSERT INTO pipeline_cards (
         board_id, stage_id, title, contact_first_name,
         building_id, room_id, expense_id, amount, source, tags,
         card_status, due_at, won_at, notes
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, 'Expense',
         ARRAY['excel-ledger','Expense'],
         $9, $10, CASE WHEN $11 THEN CURRENT_TIMESTAMP ELSE NULL END, $12
       )`,
      [
        stage.board_id,
        stage.stage_id,
        title,
        e.vendor_name || e.category,
        e.building_id,
        e.room_id,
        e.id,
        e.amount,
        isPaid ? 'won' : 'open',
        e.expense_date,
        isPaid,
        e.notes,
      ]
    );
    counts.expenseCards += 1;
  }

  await client.query('COMMIT');
  console.log(`Tenants processed: ${tenants.rows.length}`);
  console.log(counts);
} catch (err) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // ignore
  }
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
