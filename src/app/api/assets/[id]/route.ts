import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAssetById, updateAsset, deleteAsset } from '@/lib/api/assets';
import { logActivitySafe } from '@/lib/services/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const asset = await getAssetById(id);
    
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: asset
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No update data provided' },
        { status: 400 }
      );
    }

    const before = await getAssetById(id);
    const asset = await updateAsset(id, body);
    
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'asset.updated',
      category: 'assets',
      entityType: 'asset',
      entityId: id,
      entityLabel: asset.assetName || asset.asset_name || before?.assetName || before?.asset_name || id,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: asset as unknown as Record<string, unknown>,
      link: '/admin/assets',
      metadata: { link: '/admin/assets' },
    });
    
    return NextResponse.json({
      success: true,
      data: asset,
      message: 'Asset updated successfully'
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json(
      { error: 'Failed to update asset' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const before = await getAssetById(id);
    
    const deleted = await deleteAsset(id);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'asset.deleted',
      category: 'assets',
      entityType: 'asset',
      entityId: id,
      entityLabel: before?.assetName || before?.asset_name || id,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: null,
      link: '/admin/assets',
      metadata: { link: '/admin/assets' },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
