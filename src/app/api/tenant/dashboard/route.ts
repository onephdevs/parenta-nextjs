import { NextResponse } from 'next/server';
import { getTenantCompleteDataByTenantId } from '@/lib/api/tenant-user-link';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import pool from '@/lib/db';

/**
 * GET /api/tenant/dashboard
 * Aggregated dashboard payload for the logged-in (or previewed) tenant.
 */
export async function GET() {
  try {
    const access = await requireTenantAccess();
    if (access.error) return access.error;

    const { tenant } = access;
    const tenantData = await getTenantCompleteDataByTenantId(String(tenant.id));

    const [paymentsResult, maintenanceResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count
         FROM payments
         WHERE tenant_id = $1`,
        [tenant.id]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count
         FROM maintenance_requests
         WHERE tenant_id = $1
           AND LOWER(status) IN ('open', 'pending', 'scheduled', 'in_progress')`,
        [tenant.id]
      ),
    ]);

    const hasAssignment = Boolean(tenantData?.room_id && tenantData?.assignment_id);
    const address = tenantData
      ? [
          tenantData.address_line1,
          tenantData.address_line2,
          tenantData.city,
          tenantData.state,
          tenantData.postal_code,
        ]
          .filter(Boolean)
          .join(', ')
      : '';

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: tenant.id,
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          email: tenant.email || tenant.user_email,
          phone: tenant.phone,
          emergencyContactName: tenant.emergency_contact_name,
          emergencyContactPhone: tenant.emergency_contact_phone,
        },
        roomAssignment: hasAssignment
          ? {
              roomId: tenantData.room_id,
              roomNumber: tenantData.room_number,
              floorNumber: tenantData.floor_number,
              roomType: tenantData.room_type,
              buildingId: tenantData.building_id,
              buildingName: tenantData.building_name,
              address: address || null,
              assignmentStart: tenantData.assignment_start,
              assignmentEnd: tenantData.assignment_end,
              monthlyRate:
                tenantData.monthly_rate != null ? parseFloat(String(tenantData.monthly_rate)) : null,
              depositPaid:
                tenantData.deposit_paid != null
                  ? parseFloat(String(tenantData.deposit_paid))
                  : null,
              advancePaid:
                tenantData.advance_paid != null
                  ? parseFloat(String(tenantData.advance_paid))
                  : null,
            }
          : null,
        stats: {
          paymentCount: paymentsResult.rows[0]?.count ?? 0,
          activeMaintenanceCount: maintenanceResult.rows[0]?.count ?? 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching tenant dashboard data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
