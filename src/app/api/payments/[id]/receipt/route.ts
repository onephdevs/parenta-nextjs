import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payments/[id]/receipt
 * Admin download of an uploaded payment receipt
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const result = await pool.query(
      `SELECT id, receipt_file_path, receipt_file_name
       FROM payments
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const payment = result.rows[0];

    if (!payment.receipt_file_path) {
      return NextResponse.json(
        { error: 'No receipt uploaded for this payment' },
        { status: 404 }
      );
    }

    const filePath = path.join(process.cwd(), 'public', payment.receipt_file_path);

    try {
      const fileBuffer = await fs.readFile(filePath);
      const fileExtension = path.extname(payment.receipt_file_path).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
      };
      const contentType = contentTypeMap[fileExtension] || 'application/octet-stream';
      const fileName = payment.receipt_file_name || `receipt-${id}${fileExtension}`;

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    } catch {
      return NextResponse.json({ error: 'Receipt file not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error downloading admin payment receipt:', error);
    return NextResponse.json(
      { error: 'Failed to download receipt' },
      { status: 500 }
    );
  }
}
