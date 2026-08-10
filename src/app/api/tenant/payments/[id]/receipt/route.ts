import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId } from '@/lib/api/tenant-user-link';
import { saveUploadedFile } from '@/lib/api/documents';
import { contentDispositionHeader, sanitizeDownloadFileName } from '@/lib/format/upload-filename';
import pool from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { CONSTANTS } from '@/lib/constants';

const MAX_FILE_SIZE = CONSTANTS.MODULE.UPLOAD.MAX_FILE_SIZE_BYTES;
const SUPPORTED_FILE_TYPES = CONSTANTS.MODULE.UPLOAD
  .SUPPORTED_RECEIPT_MIME_TYPES as readonly string[];

/**
 * POST /api/tenant/payments/[id]/receipt
 * Upload a receipt for a payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'tenant') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const tenant = await getTenantByUserId(userId);
    
    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant profile found',
        },
        { status: 404 }
      );
    }
    
    const paymentId = params.id;
    
    // Verify tenant owns this payment
    const paymentCheckQuery = `
      SELECT id, tenant_id, receipt_file_path
      FROM payments
      WHERE id = $1
    `;
    
    const paymentResult = await pool.query(paymentCheckQuery, [paymentId]);
    
    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment not found',
        },
        { status: 404 }
      );
    }
    
    const payment = paymentResult.rows[0];
    
    if (payment.tenant_id !== tenant.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - You can only upload receipts for your own payments',
        },
        { status: 403 }
      );
    }
    
    // Get the file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `File type ${file.type} is not supported. Supported types: PDF, JPEG, PNG, WEBP`,
        },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        },
        { status: 400 }
      );
    }
    
    // Delete old receipt if exists
    if (payment.receipt_file_path) {
      try {
        const oldFilePath = path.join(process.cwd(), 'public', payment.receipt_file_path);
        await fs.unlink(oldFilePath).catch(() => {
          // Ignore errors if file doesn't exist
        });
      } catch (error) {
        console.warn('Could not delete old receipt file:', error);
      }
    }
    
    // Save the uploaded file
    const { fileName, filePath, fileSize } = await saveUploadedFile(file, 'uploads/receipts');
    
    // Update payment record with receipt info
    const updateQuery = `
      UPDATE payments
      SET 
        receipt_file_path = $1,
        receipt_file_name = $2,
        receipt_file_size = $3,
        receipt_uploaded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    
    const updateResult = await pool.query(updateQuery, [
      filePath,
      fileName,
      fileSize,
      paymentId,
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        paymentId: updateResult.rows[0].id,
        receiptFileName: updateResult.rows[0].receipt_file_name,
        receiptFilePath: updateResult.rows[0].receipt_file_path,
        receiptUploadedAt: updateResult.rows[0].receipt_uploaded_at,
      },
      message: 'Receipt uploaded successfully',
    });
    
  } catch (error) {
    console.error('Error uploading receipt:', error);
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

/**
 * GET /api/tenant/payments/[id]/receipt
 * Download a receipt for a payment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'tenant') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const tenant = await getTenantByUserId(userId);
    
    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant profile found',
        },
        { status: 404 }
      );
    }
    
    const paymentId = params.id;
    
    // Verify tenant owns this payment and get receipt info
    const paymentQuery = `
      SELECT 
        id, 
        tenant_id, 
        receipt_file_path,
        receipt_file_name
      FROM payments
      WHERE id = $1
    `;
    
    const paymentResult = await pool.query(paymentQuery, [paymentId]);
    
    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment not found',
        },
        { status: 404 }
      );
    }
    
    const payment = paymentResult.rows[0];
    
    if (payment.tenant_id !== tenant.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - You can only access receipts for your own payments',
        },
        { status: 403 }
      );
    }
    
    if (!payment.receipt_file_path) {
      return NextResponse.json(
        {
          success: false,
          error: 'No receipt uploaded for this payment',
        },
        { status: 404 }
      );
    }

    const storedPath = String(payment.receipt_file_path);
    const fileName = sanitizeDownloadFileName(
      payment.receipt_file_name || 'receipt',
      'receipt'
    );

    if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) {
      try {
        const remote = await fetch(storedPath);
        if (!remote.ok) {
          return NextResponse.json(
            { success: false, error: 'Receipt file not found' },
            { status: 404 }
          );
        }
        const fileBuffer = Buffer.from(await remote.arrayBuffer());
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type':
              remote.headers.get('content-type') || 'application/octet-stream',
            'Content-Disposition': contentDispositionHeader(fileName, 'attachment'),
            'Content-Length': fileBuffer.length.toString(),
          },
        });
      } catch (fileError) {
        console.error('Error fetching remote receipt file:', fileError);
        return NextResponse.redirect(storedPath);
      }
    }
    
    const filePath = path.join(process.cwd(), 'public', storedPath.replace(/^\//, ''));
    
    try {
      const fileBuffer = await fs.readFile(filePath);
      
      const fileExtension = path.extname(storedPath).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
      };
      const contentType = contentTypeMap[fileExtension] || 'application/octet-stream';
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': contentDispositionHeader(fileName, 'attachment'),
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    } catch (fileError) {
      console.error('Error reading receipt file:', fileError);
      return NextResponse.json(
        {
          success: false,
          error: 'Receipt file not found',
        },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error('Error downloading receipt:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to download receipt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
