import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import { saveUploadedFile } from '@/lib/api/documents';
import pool from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { logActivitySafe } from '@/lib/services/activity-logger';
import { CONSTANTS } from '@/lib/constants';
import {
  resolveAllowedPaymentMethod,
  resolveAllowedPaymentType,
} from '@/lib/constants/payment-methods';
import { txnTypeFromPaymentType } from '@/lib/constants/transaction-ids';
import { allocateParentaTxnId } from '@/lib/services/transaction-id-service';
import { syncPaymentCardForTenant } from '@/lib/api/pipeline';

const MAX_FILE_SIZE = CONSTANTS.MODULE.UPLOAD.MAX_FILE_SIZE_BYTES;
const SUPPORTED_FILE_TYPES = CONSTANTS.MODULE.UPLOAD
  .SUPPORTED_RECEIPT_MIME_TYPES as readonly string[];

/**
 * POST /api/tenant/payments/upload-receipt
 * Upload a receipt image and link it to an existing payment, unpaid invoice, or custom payment date.
 */
export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess({ allowMutation: true });
    if (access.error) return access.error;

    const { tenant } = access;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const paymentIdRaw = String(formData.get('paymentId') || '').trim();
    const invoiceIdRaw = String(formData.get('invoiceId') || '').trim();
    const paymentDateRaw = String(formData.get('paymentDate') || '').trim();
    const amountRaw = String(formData.get('amount') || '').trim();
    const notesRaw = String(formData.get('notes') || '').trim();
    const referenceNumberRaw = String(formData.get('referenceNumber') || '').trim();
    const paymentMethodRaw = String(formData.get('paymentMethod') || 'gcash')
      .trim()
      .toLowerCase();
    const paymentTypeRaw = String(formData.get('paymentType') || 'rent')
      .trim()
      .toLowerCase();

    const paymentMethod = resolveAllowedPaymentMethod(paymentMethodRaw);
    const paymentType = resolveAllowedPaymentType(paymentTypeRaw);

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported file type. Use PDF, JPEG, PNG, or WEBP.',
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    if (!paymentIdRaw && !invoiceIdRaw && !paymentDateRaw) {
      return NextResponse.json(
        {
          success: false,
          error: 'Select a payment, invoice period, or payment date to link this receipt.',
        },
        { status: 400 }
      );
    }

    const assignmentResult = await pool.query(
      `SELECT tra.id as assignment_id, tra.room_id
       FROM tenant_room_assignments tra
       WHERE tra.tenant_id = $1 AND tra.assignment_status = 'active'
       ORDER BY tra.start_date DESC
       LIMIT 1`,
      [tenant.id]
    );
    const assignment = assignmentResult.rows[0];

    let paymentId = paymentIdRaw || null;
    let linkedInvoiceId: string | null = null;
    let paymentAmount = amountRaw ? parseFloat(amountRaw) : NaN;

    if (paymentId) {
      const paymentCheck = await pool.query(
        `SELECT id, tenant_id, receipt_file_path, amount
         FROM payments
         WHERE id = $1`,
        [paymentId]
      );
      if (paymentCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
      }
      if (paymentCheck.rows[0].tenant_id !== tenant.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        paymentAmount = parseFloat(paymentCheck.rows[0].amount) || 0;
      }
    } else if (invoiceIdRaw) {
      const invoiceCheck = await pool.query(
        `SELECT id, tenant_id, balance_due, due_date, invoice_number, invoice_status
         FROM invoices
         WHERE id = $1`,
        [invoiceIdRaw]
      );
      if (invoiceCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
      }
      const invoice = invoiceCheck.rows[0];
      if (invoice.tenant_id !== tenant.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }

      linkedInvoiceId = invoice.id;
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        paymentAmount = parseFloat(invoice.balance_due) || 0;
      }
      if (paymentAmount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Enter a payment amount for this receipt' },
          { status: 400 }
        );
      }

      const parentaTxnId = await allocateParentaTxnId(
        txnTypeFromPaymentType(paymentType)
      );

      const createPayment = await pool.query(
        `INSERT INTO payments (
           tenant_id, room_id, assignment_id, amount, payment_type, payment_method,
           payment_date, due_date, payment_status, reference_number, parenta_txn_id, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11)
         RETURNING id, parenta_txn_id`,
        [
          tenant.id,
          assignment?.room_id || null,
          assignment?.assignment_id || null,
          paymentAmount,
          paymentType,
          paymentMethod,
          paymentDateRaw || invoice.due_date,
          invoice.due_date,
          referenceNumberRaw || null,
          parentaTxnId,
          [
            `Parenta txn ${parentaTxnId}`,
            `Tenant payment claim for invoice ${invoice.invoice_number || invoice.id} (invoice_id=${invoice.id})`,
            'Status: awaiting office verification — invoice balance not updated yet.',
            referenceNumberRaw ? `GCash / bank reference: ${referenceNumberRaw}` : null,
            notesRaw ? `Tenant notes: ${notesRaw}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
        ]
      );
      paymentId = createPayment.rows[0].id;
      // Do not allocate until an admin confirms the receipt.
    } else {
      // Custom payment date (no existing payment / invoice)
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Enter a payment amount for this receipt' },
          { status: 400 }
        );
      }

      const parentaTxnId = await allocateParentaTxnId(
        txnTypeFromPaymentType(paymentType)
      );

      const createPayment = await pool.query(
        `INSERT INTO payments (
           tenant_id, room_id, assignment_id, amount, payment_type, payment_method,
           payment_date, due_date, payment_status, reference_number, parenta_txn_id, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 'pending', $8, $9, $10)
         RETURNING id, parenta_txn_id`,
        [
          tenant.id,
          assignment?.room_id || null,
          assignment?.assignment_id || null,
          paymentAmount,
          paymentType,
          paymentMethod,
          paymentDateRaw,
          referenceNumberRaw || null,
          parentaTxnId,
          [
            `Parenta txn ${parentaTxnId}`,
            referenceNumberRaw ? `GCash / bank reference: ${referenceNumberRaw}` : null,
            notesRaw || `Receipt uploaded for payment dated ${paymentDateRaw}`,
            'Status: awaiting office verification — balance not updated yet.',
          ]
            .filter(Boolean)
            .join('\n'),
        ]
      );
      paymentId = createPayment.rows[0].id;
    }

    // Delete previous receipt if replacing on an existing payment
    const existing = await pool.query(
      `SELECT receipt_file_path FROM payments WHERE id = $1`,
      [paymentId]
    );
    const oldPath = existing.rows[0]?.receipt_file_path as string | null;
    if (oldPath) {
      try {
        const oldFilePath = path.join(process.cwd(), 'public', oldPath.replace(/^\//, ''));
        await fs.unlink(oldFilePath).catch(() => undefined);
      } catch {
        // ignore
      }
    }

    const { fileName, filePath, fileSize } = await saveUploadedFile(file, 'uploads/receipts');

    let parentaTxnId: string | null = null;
    if (paymentIdRaw) {
      const existingTxn = await pool.query<{ parenta_txn_id: string | null }>(
        `SELECT parenta_txn_id FROM payments WHERE id = $1`,
        [paymentId]
      );
      parentaTxnId = existingTxn.rows[0]?.parenta_txn_id || null;
      if (!parentaTxnId) {
        parentaTxnId = await allocateParentaTxnId(txnTypeFromPaymentType(paymentType));
      }
    } else {
      const createdTxn = await pool.query<{ parenta_txn_id: string | null }>(
        `SELECT parenta_txn_id FROM payments WHERE id = $1`,
        [paymentId]
      );
      parentaTxnId = createdTxn.rows[0]?.parenta_txn_id || null;
    }

    const updateResult = await pool.query(
      `UPDATE payments
       SET receipt_file_path = $1,
           receipt_file_name = $2,
           receipt_file_size = $3,
           receipt_uploaded_at = CURRENT_TIMESTAMP,
           payment_status = CASE
             WHEN payment_status IN ('paid', 'completed', 'confirmed') THEN payment_status
             ELSE 'pending'
           END,
           payment_method = COALESCE(NULLIF($5, ''), payment_method),
           reference_number = COALESCE(NULLIF($6, ''), reference_number),
           parenta_txn_id = COALESCE(parenta_txn_id, $7),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, receipt_file_name, receipt_file_path, receipt_uploaded_at, payment_date, amount, parenta_txn_id, reference_number`,
      [
        filePath,
        fileName,
        fileSize,
        paymentId,
        paymentIdRaw ? paymentMethod : null,
        paymentIdRaw ? referenceNumberRaw || null : null,
        parentaTxnId,
      ]
    );

    const paymentRow = updateResult.rows[0];
    const amountValue = parseFloat(paymentRow.amount);

    try {
      await syncPaymentCardForTenant(tenant.id);
    } catch (syncErr) {
      console.error('Rent Payment board sync after claim failed:', syncErr);
    }

    logActivitySafe({
      actorUserId: access.userId,
      actorRole: 'tenant',
      actionType: 'payment.claim_submitted',
      category: 'payments',
      entityType: 'payment',
      entityId: String(paymentRow.id),
      entityLabel: `₱${amountValue.toLocaleString()} — verify GCash reference`,
      afterData: {
        paymentId: paymentRow.id,
        amount: amountValue,
        referenceNumber: paymentRow.reference_number || referenceNumberRaw || null,
        parentaTxnId: paymentRow.parenta_txn_id || parentaTxnId,
        invoiceId: linkedInvoiceId,
      },
      link: `/admin/financial/payments/${paymentRow.id}`,
      metadata: {
        link: `/admin/financial/payments/${paymentRow.id}`,
        invoiceId: linkedInvoiceId,
        tenantId: tenant.id,
        referenceNumber: paymentRow.reference_number || referenceNumberRaw || null,
        parentaTxnId: paymentRow.parenta_txn_id || parentaTxnId,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        'Payment submitted for verification. Your invoice balance updates after the office confirms it.',
      data: {
        paymentId: paymentRow.id,
        invoiceId: linkedInvoiceId,
        receiptFileName: paymentRow.receipt_file_name,
        receiptFilePath: paymentRow.receipt_file_path,
        receiptUploadedAt: paymentRow.receipt_uploaded_at,
        paymentDate: paymentRow.payment_date,
        amount: amountValue,
        status: 'pending',
        parentaTxnId: paymentRow.parenta_txn_id || parentaTxnId,
        referenceNumber: paymentRow.reference_number || referenceNumberRaw,
      },
    });
  } catch (error) {
    console.error('Error uploading linked receipt:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload receipt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
