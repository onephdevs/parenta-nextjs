import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import QRCode from 'qrcode';

// Mock asset QR code data - in production this would be from database
const assetQRCodes = new Map<string, {
  assetId: string;
  qrCode: string;
  qrCodeUrl: string;
  generatedAt: Date;
  generatedBy: string;
  trackingData: {
    scannedCount: number;
    lastScannedAt?: Date;
    lastScannedBy?: string;
    location?: string;
  };
}>();

// Generate QR code data URL
async function generateQRCodeDataURL(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256,
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

// POST /api/assets/qr-code - Generate QR code for asset
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { assetId, assetName, includeUrl = true } = body;

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    // Create tracking URL for QR code
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const trackingUrl = `${baseUrl}/track/asset/${assetId}`;
    
    // Create comprehensive QR code data
    const qrData = {
      type: 'asset',
      id: assetId,
      name: assetName,
      url: includeUrl ? trackingUrl : undefined,
      generatedAt: new Date().toISOString(),
      checksum: `${assetId}-${Date.now()}`,
    };

    const qrDataString = JSON.stringify(qrData);
    
    // Generate QR code
    const qrCodeDataURL = await generateQRCodeDataURL(qrDataString);
    
    // Store QR code data
    const qrCodeRecord = {
      assetId,
      qrCode: qrDataString,
      qrCodeUrl: qrCodeDataURL,
      generatedAt: new Date(),
      generatedBy: session.user.name || session.user.email || 'Unknown',
      trackingData: {
        scannedCount: 0,
      },
    };

    assetQRCodes.set(assetId, qrCodeRecord);

    // In production, update database with QR code info
    console.log(`Generated QR code for asset ${assetId}`);

    return NextResponse.json({
      success: true,
      data: {
        assetId,
        qrCode: qrDataString,
        qrCodeUrl: qrCodeDataURL,
        trackingUrl,
        generatedAt: qrCodeRecord.generatedAt,
        printReady: true,
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}

// GET /api/assets/qr-code - Get QR code for asset or scan tracking
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');
    const action = searchParams.get('action'); // 'get' or 'scan'

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    const qrCodeRecord = assetQRCodes.get(assetId);

    if (!qrCodeRecord) {
      return NextResponse.json(
        { error: 'QR code not found for this asset' },
        { status: 404 }
      );
    }

    // Handle scan action
    if (action === 'scan') {
      qrCodeRecord.trackingData.scannedCount++;
      qrCodeRecord.trackingData.lastScannedAt = new Date();
      qrCodeRecord.trackingData.lastScannedBy = session.user.name || session.user.email || 'Unknown';
      
      const location = searchParams.get('location');
      if (location) {
        qrCodeRecord.trackingData.location = location;
      }

      assetQRCodes.set(assetId, qrCodeRecord);

      // In production, log scan event to database
      console.log(`Asset ${assetId} scanned by ${qrCodeRecord.trackingData.lastScannedBy}`);

      return NextResponse.json({
        success: true,
        message: 'Asset scan recorded',
        data: {
          assetId,
          scannedAt: qrCodeRecord.trackingData.lastScannedAt,
          scannedBy: qrCodeRecord.trackingData.lastScannedBy,
          totalScans: qrCodeRecord.trackingData.scannedCount,
        },
      });
    }

    // Return QR code data
    return NextResponse.json({
      success: true,
      data: {
        assetId,
        qrCodeUrl: qrCodeRecord.qrCodeUrl,
        generatedAt: qrCodeRecord.generatedAt,
        trackingData: qrCodeRecord.trackingData,
      },
    });
  } catch (error) {
    console.error('Error handling QR code request:', error);
    return NextResponse.json(
      { error: 'Failed to process QR code request' },
      { status: 500 }
    );
  }
}

// DELETE /api/assets/qr-code - Remove QR code for asset
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    if (!assetQRCodes.has(assetId)) {
      return NextResponse.json(
        { error: 'QR code not found for this asset' },
        { status: 404 }
      );
    }

    assetQRCodes.delete(assetId);

    // In production, remove QR code from database
    console.log(`Removed QR code for asset ${assetId}`);

    return NextResponse.json({
      success: true,
      message: 'QR code removed successfully',
    });
  } catch (error) {
    console.error('Error removing QR code:', error);
    return NextResponse.json(
      { error: 'Failed to remove QR code' },
      { status: 500 }
    );
  }
} 