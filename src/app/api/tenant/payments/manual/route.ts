import { NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import { saveUploadedFile } from '@/lib/api/documents';
import { logActivitySafe } from '@/lib/services/activity-logger';
import pool from '@/lib/db';
import { CONSTANTS } from '@/lib/constants';
import {
  isAllowedPaymentType,
  resolveAllowedPaymentMethod,
} from '@/lib/constants/payment-methods';
import { txnTypeFromPaymentType } from '@/lib/constants/transaction-ids';
import { allocateParentaTxnId } from '@/lib/services/transaction-id-service';
import { syncPaymentCardForTenant } from '@/lib/api/pipeline';

const MAX_FILE_SIZE = CONSTANTS.MODULE.UPLOAD.MAX_FILE_SIZE_BYTES;
const SUPPORTED_FILE_TYPES = CONSTANTS.MODULE.UPLOAD
  .SUPPORTED_RECEIPT_MIME_TYPES as readonly string[];

/**
 * POST /api/tenant/payments/manual
 * Tenant submits a manual payment claim with required receipt + reference number.
 * Status stays pending until an admin confirms the transaction ID.
 */
export async function POST(request: Request) {
  try {
    const access = await requireTenantAccess({ allowMutation: true });
    if (access.error) return access.error;

    const { tenant } = access;
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Receipt image is required. Submit payment with a receipt photo and reference number.',
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const amount = parseFloat(String(formData.get('amount') || ''));
    const paymentType = String(formData.get('paymentType') || 'rent')
      .trim()
      .toLowerCase();
    const paymentMethodRaw = String(formData.get('paymentMethod') || 'gcash')
      .trim()
      .toLowerCase();
    const referenceNumber = String(formData.get('referenceNumber') || '').trim();
    const notes = String(formData.get('notes') || '').trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!isAllowedPaymentType(paymentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment type' },
        { status: 400 }
      );
    }

    if (!referenceNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reference / transaction number is required',
        },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Receipt image or PDF is required' },
        { status: 400 }
      );
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

    const paymentMethod = resolveAllowedPaymentMethod(paymentMethodRaw);

    const assignmentResult = await pool.query(
      `SELECT tra.id as assignment_id, tra.room_id
       FROM tenant_room_assignments tra
       WHERE tra.tenant_id = $1
         AND tra.assignment_status = 'active'
       ORDER BY tra.start_date DESC
       LIMIT 1`,
      [tenant.id]
    );
    const assignment = assignmentResult.rows[0];

    const { fileName, filePath, fileSize } = await saveUploadedFile(
      file,
      'uploads/receipts'
    );

    const parentaTxnId = await allocateParentaTxnId(
      txnTypeFromPaymentType(paymentType)
    );

    const noteParts = [
      notes || null,
      `Parenta txn ${parentaTxnId}`,
      'Status: awaiting office verification — balance not updated yet.',
      `GCash / bank reference: ${referenceNumber}`,
    ].filter(Boolean);

    const paymentResult = await pool.query(
      `INSERT INTO payments (
         tenant_id,
         room_id,
         assignment_id,
         amount,
         payment_type,
         payment_method,
         payment_date,
         due_date,
         payment_status,
         reference_number,
         parenta_txn_id,
         notes,
         receipt_file_path,
         receipt_file_name,
         receipt_file_size,
         receipt_uploaded_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_DATE, 'pending', $7, $8, $9,
         $10, $11, $12, CURRENT_TIMESTAMP
       )
       RETURNING id, payment_type, amount, payment_date, reference_number, parenta_txn_id`,
      [
        tenant.id,
        assignment?.room_id || null,
        assignment?.assignment_id || null,
        amount,
        paymentType,
        paymentMethod,
        referenceNumber,
        parentaTxnId,
        noteParts.join('\n'),
        filePath,
        fileName,
        fileSize,
      ]
    );

    const payment = paymentResult.rows[0];

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
      entityId: String(payment.id),
      entityLabel: `₱${Number(payment.amount).toLocaleString()} — verify GCash reference`,
      afterData: {
        paymentId: payment.id,
        amount: parseFloat(payment.amount),
        referenceNumber: payment.reference_number,
        parentaTxnId: payment.parenta_txn_id,
        paymentType: payment.payment_type,
      },
      link: `/admin/financial/payments/${payment.id}`,
      metadata: {
        link: `/admin/financial/payments/${payment.id}`,
        tenantId: tenant.id,
        referenceNumber: payment.reference_number,
        parentaTxnId: payment.parenta_txn_id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        amount: parseFloat(payment.amount),
        paymentType: payment.payment_type,
        paymentDate: payment.payment_date,
        referenceNumber: payment.reference_number,
        parentaTxnId: payment.parenta_txn_id,
        status: 'pending',
      },
      message:
        'Payment submitted for verification. Your balance updates after the office confirms the GCash / bank reference.',
    });
  } catch (error) {
    console.error('Error recording manual payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record payment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
