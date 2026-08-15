/**
 * GET /api/tenant/payments/[id] — tenant payment claim detail
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import pool from '@/lib/db';
import { getImageUrl } from '@/lib/format/image-url';
import { listPaymentUpdates } from '@/lib/api/payment-updates';
import { resolveTenantAvatarUrl } from '@/lib/api/user-profile-extras';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function extractInvoiceIdFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/invoice_id=([0-9a-f-]{36})/i);
  return match?.[1] || null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const access = await requireTenantAccess();
    if (access.error) return access.error;

    const { id } = await params;
    const result = await pool.query(
      `SELECT
         p.id,
         p.amount,
         p.payment_type,
         p.payment_method,
         p.payment_status,
         p.payment_date,
         p.due_date,
         p.reference_number,
         p.parenta_txn_id,
         p.notes,
         p.receipt_file_path,
         p.receipt_file_name,
         p.created_at,
         p.updated_at,
         COALESCE(ra_r.room_number, direct_r.room_number) AS room_number,
         COALESCE(ra_b.name, direct_b.name) AS building_name
       FROM payments p
       LEFT JOIN tenant_room_assignments ra ON p.assignment_id = ra.id
       LEFT JOIN rooms ra_r ON ra.room_id = ra_r.id
       LEFT JOIN buildings ra_b ON ra_r.building_id = ra_b.id
       LEFT JOIN rooms direct_r ON p.room_id = direct_r.id
       LEFT JOIN buildings direct_b ON direct_r.building_id = direct_b.id
       WHERE p.id = $1 AND p.tenant_id = $2
       LIMIT 1`,
      [id, access.tenant.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const invoiceId = extractInvoiceIdFromNotes(row.notes);
    let invoiceNumber: string | null = null;
    if (invoiceId) {
      const inv = await pool.query(
        `SELECT invoice_number FROM invoices WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [invoiceId, access.tenant.id]
      );
      invoiceNumber = inv.rows[0]?.invoice_number || null;
    }

    const updates = await listPaymentUpdates(id);
    const receiptPath = String(row.receipt_file_path || '').trim();
    const rawAvatar = await resolveTenantAvatarUrl({
      profilePictureUrl:
        (access.tenant.profile_picture_url as string | null | undefined) || null,
      userId:
        access.userId ||
        (access.tenant.user_id ? String(access.tenant.user_id) : null),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        amount: parseFloat(row.amount || 0),
        paymentType: row.payment_type,
        paymentMethod: row.payment_method,
        status: row.payment_status,
        paymentDate: row.payment_date,
        dueDate: row.due_date,
        referenceNumber: row.reference_number,
        parentaTxnId: row.parenta_txn_id,
        notes: row.notes,
        roomNumber: row.room_number,
        buildingName: row.building_name,
        invoiceId,
        invoiceNumber,
        receiptFileName: row.receipt_file_name,
        receiptUrl: receiptPath ? getImageUrl(receiptPath) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        tenantName: `${access.tenant.first_name || ''} ${access.tenant.last_name || ''}`.trim(),
        tenantAvatarUrl: rawAvatar ? getImageUrl(rawAvatar) : null,
        updates,
      },
    });
  } catch (error) {
    console.error('GET /api/tenant/payments/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load payment' },
      { status: 500 }
    );
  }
}
