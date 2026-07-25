import { NextResponse } from 'next/server';
import { getAllTenants, createTenant } from '../../../lib/api/tenants';
import { createTenantWithUser } from '@/lib/api/tenant-user-link';
import { requireAdmin } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const tenantsData = await getAllTenants({ limit: 1000 }); // Get all tenants for API
    
    return NextResponse.json({
      success: true,
      data: {
        tenants: tenantsData.tenants,
        pagination: tenantsData.pagination
      }
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

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const tenantData = await request.json();
    
    // Basic validation
    if (!tenantData.firstName || !tenantData.lastName || !tenantData.email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: 'First name, last name, and email are required'
        },
        { status: 400 }
      );
    }
    
    // Check if this should create a user account too
    const createUserAccount = tenantData.createUserAccount !== false; // Default to true
    
    if (createUserAccount) {
      // Create both user account and tenant profile (linked)
      const result = await createTenantWithUser({
        email: tenantData.email,
        password: tenantData.password, // Optional: if not provided, generates random
        sendInvitation: tenantData.sendInvitation || false,
        firstName: tenantData.firstName,
        lastName: tenantData.lastName,
        phone: tenantData.phone,
        dateOfBirth: tenantData.dateOfBirth,
        emergencyContactName: tenantData.emergencyContactName,
        emergencyContactPhone: tenantData.emergencyContactPhone,
        emergencyContactRelationship: tenantData.emergencyContactRelationship,
        employmentStatus: tenantData.employmentStatus,
        employerName: tenantData.employerName,
        monthlyIncome: tenantData.monthlyIncome,
        previousAddress: tenantData.previousAddress,
        securityDeposit: tenantData.securityDeposit,
        leaseStartDate: tenantData.leaseStartDate,
        leaseEndDate: tenantData.leaseEndDate,
        notes: tenantData.notes,
      });
      
      return NextResponse.json({
        success: true,
        data: {
          id: result.tenantId, // Add id field for frontend compatibility
          tenantId: result.tenantId,
          userId: result.userId,
          // One-time handoff — not stored after this response
          temporaryPassword: result.temporaryPassword,
        },
        message: 'Tenant and user account created successfully'
      });
    } else {
      // Create only tenant profile (for existing users or manual linking)
      const tenant = await createTenant(tenantData);
      
      return NextResponse.json({
        success: true,
        data: tenant,
        message: 'Tenant profile created successfully'
      });
    }
  } catch (error) {
    console.error('Create tenant error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create tenant',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
