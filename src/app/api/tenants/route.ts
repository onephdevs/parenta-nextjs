import { NextResponse } from 'next/server';
import { getAllTenants, createTenant } from '../../../lib/api/tenants';
import { createTenantWithUser } from '@/lib/api/tenant-user-link';
import { requireAdmin } from '@/lib/api-auth';
import { logActivitySafe } from '@/lib/services/activity-logger';

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '1000', 10) || 1000));
    const status = searchParams.get('status') || undefined;

    const tenantsData = await getAllTenants({
      page,
      limit,
      search,
      status: status as 'active' | 'pending' | 'inactive' | 'terminated' | undefined,
    });
    
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
    const { session, error } = await requireAdmin();
    if (error) return error;

    const tenantData = await request.json();
    
    // Basic validation — email optional when username is provided for portal login
    if (!tenantData.firstName || !tenantData.lastName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: 'First name and last name are required'
        },
        { status: 400 }
      );
    }

    const createUserAccount = tenantData.createUserAccount !== false; // Default to true
    if (createUserAccount && !tenantData.email && !tenantData.username) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'Email or username is required when creating a portal login',
        },
        { status: 400 }
      );
    }
    
    const entityLabel = `${tenantData.firstName} ${tenantData.lastName}`.trim();
    
    if (createUserAccount) {
      // Create both user account and tenant profile (linked)
      const result = await createTenantWithUser({
        email: tenantData.email || null,
        username: tenantData.username || null,
        password: tenantData.password, // Optional: if not provided, generates random
        sendInvitation: tenantData.sendInvitation || false,
        profileCompleted: tenantData.profileCompleted,
        tenantStatus: tenantData.tenantStatus,
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

      logActivitySafe({
        actorUserId: session?.user?.id || null,
        actorRole: 'admin',
        actionType: 'tenant.created',
        category: 'tenants',
        entityType: 'tenant',
        entityId: result.tenantId,
        entityLabel,
        beforeData: null,
        afterData: {
          id: result.tenantId,
          firstName: tenantData.firstName,
          lastName: tenantData.lastName,
          email: tenantData.email,
        },
        link: `/admin/tenants/${result.tenantId}`,
        metadata: { link: `/admin/tenants/${result.tenantId}` },
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
      const tenantId = String(tenant.id || tenant.tenantId || '');

      logActivitySafe({
        actorUserId: session?.user?.id || null,
        actorRole: 'admin',
        actionType: 'tenant.created',
        category: 'tenants',
        entityType: 'tenant',
        entityId: tenantId || null,
        entityLabel,
        beforeData: null,
        afterData: tenant as unknown as Record<string, unknown>,
        link: tenantId ? `/admin/tenants/${tenantId}` : null,
        metadata: { link: tenantId ? `/admin/tenants/${tenantId}` : null },
      });
      
      return NextResponse.json({
        success: true,
        data: tenant,
        message: 'Tenant profile created successfully'
      });
    }
  } catch (error) {
    console.error('Create tenant error:', error);

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('email already exists') ||
        msg.includes('duplicate key') ||
        msg.includes('unique constraint')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Email already exists',
            details: 'A user or tenant with this email address already exists',
          },
          { status: 409 }
        );
      }
    }

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
