import { NextResponse } from 'next/server';
import { getTenantById, updateTenant, deleteTenant } from '../../../../lib/api/tenants';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const tenant = await getTenantById(id);
    
    if (!tenant) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tenant not found'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tenant',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantData = await request.json();
    
    // Validate email format if provided
    if (tenantData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(tenantData.email)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid email format',
            details: 'Please provide a valid email address'
          },
          { status: 400 }
        );
      }
    }

    // Convert date strings to Date objects if provided
    if (tenantData.dateOfBirth) {
      tenantData.dateOfBirth = new Date(tenantData.dateOfBirth);
    }
    
    const tenant = await updateTenant(id, tenantData);
    
    return NextResponse.json({
      success: true,
      data: tenant,
      message: 'Tenant updated successfully'
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'Tenant not found') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Tenant not found'
          },
          { status: 404 }
        );
      }
      if (error.message.includes('duplicate key value')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Email already exists',
            details: 'A tenant with this email address already exists'
          },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update tenant',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    await deleteTenant(id);
    
    return NextResponse.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    console.error('Delete tenant error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('active room assignments')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cannot delete tenant',
            details: 'Tenant has active room assignments. Please end assignments first.'
          },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete tenant',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 