import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createLateFeeSettings,
  getAllLateFeeSettings,
} from '@/lib/services/late-fee-service';
import { CreateLateFeeSettingsData } from '@/types/financial';

/**
 * GET /api/late-fees/settings
 * Get all late fee settings, optionally filtered by building
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id') || undefined;
    
    const settings = await getAllLateFeeSettings(buildingId);
    
    return NextResponse.json({
      success: true,
      settings,
      count: settings.length,
    });
  } catch (error) {
    console.error('Error fetching late fee settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch late fee settings',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/late-fees/settings
 * Create a new late fee setting
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body: CreateLateFeeSettingsData = await request.json();
    
    // Validation
    if (!body.name || !body.fee_type) {
      return NextResponse.json(
        { success: false, error: 'Name and fee type are required' },
        { status: 400 }
      );
    }
    
    if (body.fee_type === 'percentage' && !body.percentage_amount) {
      return NextResponse.json(
        { success: false, error: 'Percentage amount is required for percentage fee type' },
        { status: 400 }
      );
    }
    
    if (body.fee_type === 'flat_rate' && !body.flat_rate_amount) {
      return NextResponse.json(
        { success: false, error: 'Flat rate amount is required for flat rate fee type' },
        { status: 400 }
      );
    }
    
    if (body.fee_type === 'tiered' && (!body.tiers || body.tiers.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'At least one tier is required for tiered fee type' },
        { status: 400 }
      );
    }
    
    const createdBy = (session.user as any)?.id;
    const setting = await createLateFeeSettings(body, createdBy);
    
    return NextResponse.json(
      {
        success: true,
        setting,
        message: 'Late fee setting created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating late fee setting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create late fee setting',
      },
      { status: 500 }
    );
  }
}

