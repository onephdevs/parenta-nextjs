import { NextResponse } from 'next/server';
import { getAllTenants } from '../../../lib/api/tenants';

export async function GET() {
  try {
    const tenants = await getAllTenants();
    
    return NextResponse.json({
      success: true,
      data: tenants
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tenants',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Not implemented',
      details: 'Tenant creation not yet implemented'
    },
    { status: 501 }
  );
}