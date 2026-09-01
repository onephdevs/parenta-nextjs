import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAllAssets, createAsset } from '@/lib/api/assets';
import { logActivitySafe } from '@/lib/services/activity-logger';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanParam(value: string | null): string | undefined {
  if (!value || value === 'undefined' || value === 'null') return undefined;
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const buildingIdRaw = cleanParam(searchParams.get('buildingId'));
    
    const filters = {
      buildingId:
        buildingIdRaw && UUID_RE.test(buildingIdRaw) ? buildingIdRaw : undefined,
      assetType: cleanParam(searchParams.get('assetType')),
      assetStatus: cleanParam(searchParams.get('assetStatus')),
      assetCondition: cleanParam(searchParams.get('assetCondition')),
      searchTerm: cleanParam(searchParams.get('searchTerm')),
      sortBy: cleanParam(searchParams.get('sortBy')),
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const result = await getAllAssets(filters);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch assets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.assetName || !body.assetType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Asset name and type are required' 
        },
        { status: 400 }
      );
    }

    // Parse dates if provided
    const assetData = {
      ...body,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
      warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined,
      lastMaintenanceDate: body.lastMaintenanceDate ? new Date(body.lastMaintenanceDate) : undefined,
      nextMaintenanceDate: body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : undefined,
      assetCondition: body.assetCondition || 'good',
      assetStatus: body.assetStatus || 'available',
      isActive: body.isActive !== undefined ? body.isActive : true
    };

    const asset = await createAsset(assetData);
    const assetId = String(asset.id || '');

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'asset.created',
      category: 'assets',
      entityType: 'asset',
      entityId: assetId || null,
      entityLabel: body.assetName,
      afterData: asset as unknown as Record<string, unknown>,
      link: '/admin/assets',
      metadata: { link: '/admin/assets' },
    });
    
    return NextResponse.json({
      success: true,
      data: asset
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 