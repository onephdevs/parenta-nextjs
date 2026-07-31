import { NextRequest, NextResponse } from 'next/server';
import { getTenantCompleteDataByTenantId } from '@/lib/api/tenant-user-link';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import pool from '@/lib/db';

/**
 * GET /api/tenant/documents
 * List documents accessible to tenant
 */
export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess();
    if (access.error) return access.error;

    const { tenant } = access;
    
    // Get tenant's room assignment
    const tenantData = await getTenantCompleteDataByTenantId(String(tenant.id));
    
    // Query documents accessible to tenant:
    // 1. Documents specifically assigned to tenant (tenant_id = tenant.id)
    // 2. Documents with access_level = 'tenant' and is_public = true
    // 3. Documents for tenant's room (room_id matches)
    const documentsQuery = `
      SELECT 
        d.id,
        d.document_name,
        d.file_name,
        d.file_path,
        d.file_size,
        d.mime_type,
        d.document_type,
        d.description,
        d.tags,
        d.is_public,
        d.expiry_date,
        d.created_at,
        dc.name as category_name,
        b.name as building_name,
        r.room_number
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      LEFT JOIN buildings b ON d.building_id = b.id
      LEFT JOIN rooms r ON d.room_id = r.id
      WHERE (
        d.tenant_id = $1
        OR (d.access_level = 'tenant' AND d.is_public = true)
        OR (d.room_id = $2 AND d.access_level IN ('tenant', 'public'))
      )
      AND (d.expiry_date IS NULL OR d.expiry_date >= CURRENT_DATE)
      ORDER BY d.created_at DESC
    `;
    
    const roomId = tenantData?.room_id || null;
    const documentsResult = await pool.query(documentsQuery, [tenant.id, roomId]);
    
    // Group by category
    const categories = ['all', 'lease', 'payment', 'maintenance', 'insurance', 'legal', 'other'];
    const documentsByCategory = categories.reduce((acc, category) => {
      if (category === 'all') return acc;
      acc[category] = documentsResult.rows.filter(doc => 
        doc.document_type?.toLowerCase() === category || 
        doc.category_name?.toLowerCase() === category
      ).length;
      return acc;
    }, {} as Record<string, number>);
    
    return NextResponse.json({
      success: true,
      data: {
        totalDocuments: documentsResult.rows.length,
        documents: documentsResult.rows.map(row => ({
          id: row.id,
          name: row.document_name,
          category: row.category_name || row.document_type || 'other',
          uploadedAt: row.created_at,
          size: row.file_size,
          fileType: row.mime_type,
          documentType: row.document_type,
          description: row.description,
          tags: row.tags || [],
          buildingName: row.building_name,
          roomNumber: row.room_number,
          url: `/api/tenant/documents/${row.id}/download`,
        })),
        categories: documentsByCategory,
      },
    });
    
  } catch (error) {
    console.error('Error fetching tenant documents:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
