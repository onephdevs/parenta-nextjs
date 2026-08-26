import pool from '@/lib/db';
import type { Building, DatabaseBuilding } from '@/types/database';
import { parseStoredCoordinate } from '@/lib/maps/google-maps-location';
import { normalizeAmenities } from '@/lib/format/amenities';
import { getImagesByEntity } from '@/lib/api/images';
import {
  getRoomAssignmentHistory,
  getRoomFinancialSummary,
  getRoomOccupancyMetrics,
} from '@/lib/api/rooms';
import {
  assertOccupancyReconciles,
  buildOccupancyReconciliation,
  estimateLostRent,
} from '@/lib/occupancy/reconcile';
import { LANDING_FEATURED_LIMIT } from '@/lib/landing-featured';
import { countLandingFeaturedBuildings } from '@/lib/api/buildings';
import { withOccupancyHistoryBadges } from '@/lib/occupancy/history-badge';

function mapDatabaseBuildingToBuilding(dbBuilding: DatabaseBuilding): Building {
  return {
    id: dbBuilding.id,
    name: dbBuilding.name,
    addressLine1: dbBuilding.address_line1 || '',
    addressLine2: dbBuilding.address_line2,
    city: dbBuilding.city,
    state: dbBuilding.state,
    postalCode: dbBuilding.postal_code,
    country: dbBuilding.country,
    description: dbBuilding.description,
    buildingType: dbBuilding.building_type,
    yearBuilt: dbBuilding.year_built,
    totalFloors: dbBuilding.total_floors,
    totalUnits: dbBuilding.total_units,
    activeUnits: dbBuilding.active_units || 0,
    amenities: dbBuilding.amenities,
    isActive: dbBuilding.is_active,
    autoLateFee: dbBuilding.auto_late_fee !== false,
    showOnLandingNearby: dbBuilding.show_on_landing_nearby === true,
    latitude: parseStoredCoordinate(dbBuilding.latitude),
    longitude: parseStoredCoordinate(dbBuilding.longitude),
    googleMapsUrl: dbBuilding.google_maps_url || null,
    createdAt: dbBuilding.created_at,
    updatedAt: dbBuilding.updated_at,
  };
}

export interface PropertyListBuilding extends Building {
  occupiedUnits: number;
  vacantUnits: number;
  primaryImagePath?: string | null;
}

export interface PropertyRoomOccupant {
  id: string;
  firstName: string;
  lastName: string;
  relationshipToTenant?: string | null;
}

export interface PropertyRoomTenant {
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  previousAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  startDate: string | Date;
  /** Lease / assignment end when set. */
  endDate?: string | Date | null;
  /** Next rent due date when known (from open invoice or lease). */
  dueDate?: string | Date | null;
  monthlyRate: number;
  overdueAmount: number;
  pendingAmount: number;
  depositPaid?: number;
  advancePaid?: number;
  utilityDepositPaid?: number;
  profileImagePath?: string | null;
}

export interface PropertyRoomImage {
  id: string;
  filePath: string;
  isPrimary: boolean;
}

export interface PropertyRoomDocument {
  id: string;
  documentName: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  documentType?: string;
}

export interface PropertyRoomAsset {
  id: string;
  assetName: string;
  assetType: string;
  brand?: string | null;
  model?: string | null;
  condition?: string | null;
}

export interface PropertyRoomDetail {
  id: string;
  roomNumber: string;
  roomType: string;
  floorNumber?: number;
  squareFootage?: number;
  monthlyRate: number;
  depositAmount?: number;
  roomStatus: string;
  amenities: string[];
  description?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  tenant: PropertyRoomTenant | null;
  occupants: PropertyRoomOccupant[];
  images: PropertyRoomImage[];
  documents: PropertyRoomDocument[];
  electricBillAmount?: number;
  waterBillAmount?: number;
  lastPaymentAmount?: number;
  lastPaymentDate?: string | Date | null;
}

export interface RoomFinancialSummary {
  totalPayments: number;
  overdueAmount: number;
  pendingAmount: number;
  currentMonthlyRate: number;
  currentAssignmentStart: string | Date | null;
  depositReceived: number;
  lastPaymentAmount?: number;
  lastPaymentDate?: string | Date | null;
  unpaidBalance?: number;
  electricBillAmount?: number;
  waterBillAmount?: number;
  nextDueDate?: string | Date | null;
}

export interface RoomOccupancyMetrics {
  totalAssignments: number;
  totalOccupiedDays: number;
  avgAssignmentLength: number;
  occupancyRatePercent: number;
}

export interface RoomAssignmentHistoryItem {
  id: string;
  tenantId: string | null;
  tenantName: string;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  tenantExists?: boolean;
  startDate: string | Date;
  endDate?: string | Date | null;
  monthlyRate: number;
  depositPaid?: number;
  advancePaid?: number;
  utilityDepositPaid?: number;
  assignmentStatus: string;
  /** UI badge: current stay, renewed (same person later stay), or left. */
  occupancyBadge?: 'current' | 'renewed' | 'terminated';
}

export interface PropertyBuildingDetail {
  building: Building & {
    occupiedUnits: number;
    vacantUnits: number;
    totalUnits: number;
  };
  buildingImages: PropertyRoomImage[];
  rooms: PropertyRoomDetail[];
  tenantCount: number;
  landingFeaturedCount: number;
  landingFeaturedMax: number;
}

export async function getBuildingsForPropertiesPage(options?: {
  search?: string;
}): Promise<PropertyListBuilding[]> {
  let whereClause = 'WHERE b.is_active = true';
  const values: unknown[] = [];

  if (options?.search) {
    values.push(`%${options.search}%`);
    whereClause += ` AND (
      b.name ILIKE $1 OR
      b.city ILIKE $1 OR
      b.address_line1 ILIKE $1 OR
      b.state ILIKE $1
    )`;
  }

  const query = `
    SELECT
      b.*,
      COUNT(r.id) AS total_units,
      SUM(CASE WHEN r.room_status = 'occupied' THEN 1 ELSE 0 END) AS occupied_units,
      SUM(CASE WHEN r.room_status = 'vacant' THEN 1 ELSE 0 END) AS vacant_units,
      (
        SELECT i.file_path
        FROM images i
        WHERE i.entity_type = 'building' AND i.entity_id = b.id
        ORDER BY i.is_primary DESC, i.created_at ASC
        LIMIT 1
      ) AS primary_image_path
    FROM buildings b
    LEFT JOIN rooms r ON r.building_id = b.id AND r.is_active = true
    ${whereClause}
    GROUP BY b.id
    ORDER BY
      regexp_replace(lower(b.name), '[0-9]+', '', 'g'),
      COALESCE(NULLIF(regexp_replace(b.name, '[^0-9]', '', 'g'), '')::bigint, 0),
      lower(b.name)
  `;

  const result = await pool.query(query, values);

  return result.rows.map((row) => {
    const building = mapDatabaseBuildingToBuilding(row);
    return {
      ...building,
      totalUnits: parseInt(row.total_units, 10) || 0,
      occupiedUnits: parseInt(row.occupied_units, 10) || 0,
      vacantUnits: parseInt(row.vacant_units, 10) || 0,
      primaryImagePath: row.primary_image_path || null,
    };
  });
}

export async function getPropertyBuildingDetail(
  buildingId: string
): Promise<PropertyBuildingDetail | null> {
  const buildingResult = await pool.query(
    `
    SELECT
      b.*,
      COUNT(r.id) AS total_units,
      SUM(CASE WHEN r.room_status = 'occupied' THEN 1 ELSE 0 END) AS occupied_units,
      SUM(CASE WHEN r.room_status = 'vacant' THEN 1 ELSE 0 END) AS vacant_units
    FROM buildings b
    LEFT JOIN rooms r ON r.building_id = b.id AND r.is_active = true
    WHERE b.id = $1 AND b.is_active = true
    GROUP BY b.id
    `,
    [buildingId]
  );

  if (buildingResult.rows.length === 0) {
    return null;
  }

  const row = buildingResult.rows[0];
  const building = {
    ...mapDatabaseBuildingToBuilding(row),
    totalUnits: parseInt(row.total_units, 10) || 0,
    occupiedUnits: parseInt(row.occupied_units, 10) || 0,
    vacantUnits: parseInt(row.vacant_units, 10) || 0,
  };

  const roomsResult = await pool.query(
    `
    SELECT
      r.*,
      t.id AS tenant_id,
      t.first_name AS tenant_first_name,
      t.last_name AS tenant_last_name,
      t.email AS tenant_email,
      t.phone AS tenant_phone,
      t.previous_address AS tenant_previous_address,
      t.emergency_contact_name AS tenant_emergency_contact_name,
      t.emergency_contact_phone AS tenant_emergency_contact_phone,
      t.notes AS tenant_notes,
      tra.start_date AS assignment_start,
      tra.end_date AS assignment_end,
      tra.deposit_paid,
      tra.advance_paid,
      tra.utility_deposit_paid,
      COALESCE(tra.monthly_rate, r.monthly_rate) AS assignment_monthly_rate,
      COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.assignment_id = tra.id
          AND p.payment_status = 'overdue'
      ), 0) AS overdue_amount,
      COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.assignment_id = tra.id
          AND p.payment_status = 'pending'
      ), 0) AS pending_amount,
      (
        SELECT i.due_date
        FROM invoices i
        WHERE i.tenant_id = t.id
          AND i.invoice_status IS DISTINCT FROM 'cancelled'
          AND GREATEST(i.total_amount - COALESCE(i.amount_paid, 0), 0) > 0.01
        ORDER BY i.due_date ASC NULLS LAST
        LIMIT 1
      ) AS next_due_date,
      (
        SELECT COALESCE(
          NULLIF(t.profile_picture_url, ''),
          (
            SELECT img.file_path
            FROM images img
            WHERE img.entity_type = 'tenant' AND img.entity_id = t.id
            ORDER BY img.is_primary DESC, img.created_at ASC
            LIMIT 1
          )
        )
      ) AS tenant_profile_image
    FROM rooms r
    LEFT JOIN LATERAL (
      SELECT tra.*
      FROM tenant_room_assignments tra
      WHERE tra.room_id = r.id
        AND tra.assignment_status = 'active'
        AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE)
      ORDER BY tra.created_at DESC NULLS LAST, tra.start_date DESC NULLS LAST
      LIMIT 1
    ) tra ON true
    LEFT JOIN tenants t ON t.id = tra.tenant_id
    WHERE r.building_id = $1 AND r.is_active = true
    ORDER BY
      regexp_replace(lower(r.room_number), '[0-9]+', '', 'g'),
      COALESCE(NULLIF(regexp_replace(r.room_number, '[^0-9]', '', 'g'), '')::bigint, 0),
      r.room_number
    `,
    [buildingId]
  );

  const roomIds = roomsResult.rows.map((r) => r.id as string);

  let occupantsByRoom = new Map<string, PropertyRoomOccupant[]>();
  if (roomIds.length > 0) {
    const occupantsResult = await pool.query(
      `
      SELECT id, room_id, first_name, last_name, relationship_to_tenant
      FROM occupants
      WHERE room_id = ANY($1::uuid[])
        AND is_active = true
        AND (move_out_date IS NULL OR move_out_date > CURRENT_DATE)
      ORDER BY move_in_date ASC
      `,
      [roomIds]
    );

    occupantsByRoom = occupantsResult.rows.reduce((map, occ) => {
      const list = map.get(occ.room_id) || [];
      list.push({
        id: occ.id,
        firstName: occ.first_name,
        lastName: occ.last_name,
        relationshipToTenant: occ.relationship_to_tenant,
      });
      map.set(occ.room_id, list);
      return map;
    }, new Map<string, PropertyRoomOccupant[]>());
  }

  const [buildingImages, ...roomImageLists] = await Promise.all([
    getImagesByEntity('building', buildingId),
    ...roomIds.map((id) => getImagesByEntity('room', id)),
  ]);

  const imagesByRoom = new Map<string, PropertyRoomImage[]>();
  roomIds.forEach((id, index) => {
    imagesByRoom.set(
      id,
      (roomImageLists[index] || []).map((img) => ({
        id: img.id,
        filePath: img.filePath,
        isPrimary: img.isPrimary,
      }))
    );
  });

  const documentsByRoom = new Map<string, PropertyRoomDocument[]>();
  if (roomIds.length > 0) {
    const tenantIds = roomsResult.rows
      .map((r) => r.tenant_id as string | null)
      .filter((id): id is string => Boolean(id));

    const docsResult = await pool.query(
      `
      SELECT
        d.id,
        d.room_id,
        d.tenant_id,
        d.document_name,
        d.file_name,
        d.file_size,
        d.mime_type,
        d.document_type
      FROM documents d
      WHERE d.room_id = ANY($1::uuid[])
         OR (cardinality($2::uuid[]) > 0 AND d.tenant_id = ANY($2::uuid[]))
      ORDER BY
        CASE
          WHEN lower(COALESCE(d.document_type, '')) LIKE '%lease%' THEN 0
          WHEN lower(COALESCE(d.document_name, '')) LIKE '%lease%' THEN 0
          ELSE 1
        END,
        d.created_at DESC
      `,
      [roomIds, tenantIds]
    );

    const seenByRoom = new Map<string, Set<string>>();
    for (const doc of docsResult.rows) {
      const targetRoomIds = new Set<string>();
      if (doc.room_id && roomIds.includes(doc.room_id)) {
        targetRoomIds.add(doc.room_id);
      }
      if (doc.tenant_id) {
        for (const r of roomsResult.rows) {
          if (r.tenant_id === doc.tenant_id) targetRoomIds.add(r.id);
        }
      }

      const mapped: PropertyRoomDocument = {
        id: doc.id,
        documentName: doc.document_name,
        fileName: doc.file_name,
        fileSize: doc.file_size ?? undefined,
        mimeType: doc.mime_type ?? undefined,
        documentType: doc.document_type ?? undefined,
      };

      for (const rid of targetRoomIds) {
        const seen = seenByRoom.get(rid) || new Set<string>();
        if (seen.has(mapped.id)) continue;
        seen.add(mapped.id);
        seenByRoom.set(rid, seen);
        const list = documentsByRoom.get(rid) || [];
        if (list.length < 12) {
          list.push(mapped);
          documentsByRoom.set(rid, list);
        }
      }
    }
  }

  const utilitiesByRoom = new Map<string, { electric: number; water: number }>();
  const lastPayByTenant = new Map<string, { amount: number; date: string | Date | null }>();
  if (roomIds.length > 0) {
    const tenantIdsForPay = roomsResult.rows
      .map((r) => r.tenant_id as string | null)
      .filter((id): id is string => Boolean(id));

    const [utilResult, lastPayResult] = await Promise.all([
      pool.query(
        `
        SELECT DISTINCT ON (ub.room_id, lower(ub.utility_type))
          ub.room_id,
          lower(ub.utility_type) AS utility_type,
          ub.amount
        FROM utility_bills ub
        WHERE ub.room_id = ANY($1::uuid[])
          AND COALESCE(ub.bill_status, 'pending') IS DISTINCT FROM 'cancelled'
          AND ub.parent_bill_id IS NULL
          AND lower(COALESCE(ub.utility_type, '')) IN ('electric', 'electricity', 'water')
        ORDER BY ub.room_id, lower(ub.utility_type), ub.due_date DESC NULLS LAST, ub.created_at DESC
        `,
        [roomIds]
      ),
      tenantIdsForPay.length > 0
        ? pool.query(
            `
            SELECT DISTINCT ON (p.tenant_id)
              p.tenant_id,
              p.amount,
              p.payment_date
            FROM payments p
            WHERE p.tenant_id = ANY($1::uuid[])
              AND p.payment_status IN ('paid', 'completed', 'confirmed')
            ORDER BY p.tenant_id, p.payment_date DESC NULLS LAST, p.created_at DESC
            `,
            [tenantIdsForPay]
          )
        : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
    ]);

    for (const row of utilResult.rows) {
      const roomId = String(row.room_id);
      const current = utilitiesByRoom.get(roomId) || { electric: 0, water: 0 };
      const type = String(row.utility_type || '');
      const amount = parseFloat(String(row.amount)) || 0;
      if (type === 'electric' || type === 'electricity') current.electric = amount;
      if (type === 'water') current.water = amount;
      utilitiesByRoom.set(roomId, current);
    }
    for (const row of lastPayResult.rows) {
      lastPayByTenant.set(String(row.tenant_id), {
        amount: parseFloat(String(row.amount)) || 0,
        date: (row.payment_date as string | Date | null) ?? null,
      });
    }
  }

  const rooms: PropertyRoomDetail[] = roomsResult.rows.map((r) => {
    const mapped = mapRoomRowToPropertyRoomDetail(
      r,
      occupantsByRoom.get(r.id) || [],
      imagesByRoom.get(r.id) || [],
      documentsByRoom.get(r.id) || []
    );
    const util = utilitiesByRoom.get(r.id);
    const lastPay = r.tenant_id ? lastPayByTenant.get(String(r.tenant_id)) : undefined;
    return {
      ...mapped,
      electricBillAmount: util?.electric || 0,
      waterBillAmount: util?.water || 0,
      lastPaymentAmount: lastPay?.amount,
      lastPaymentDate: lastPay?.date ?? null,
    };
  });

  return {
    building,
    buildingImages: buildingImages.map((img) => ({
      id: img.id,
      filePath: img.filePath,
      isPrimary: img.isPrimary,
    })),
    rooms,
    tenantCount: building.occupiedUnits,
    landingFeaturedCount: await countLandingFeaturedBuildings(),
    landingFeaturedMax: LANDING_FEATURED_LIMIT,
  };
}

export interface RoomsPageListItem {
  id: string;
  buildingId: string;
  buildingName: string;
  roomNumber: string;
  roomType: string;
  roomStatus: string;
  squareFootage?: number;
  monthlyRate: number;
  tenantName: string | null;
  primaryImagePath?: string | null;
}

export interface RoomPageDetail {
  room: PropertyRoomDetail;
  building: Building & {
    occupiedUnits: number;
    vacantUnits: number;
    totalUnits: number;
  };
  buildingImages: PropertyRoomImage[];
  financialSummary: RoomFinancialSummary;
  occupancyMetrics: RoomOccupancyMetrics;
  assignmentHistory: RoomAssignmentHistoryItem[];
  assets: PropertyRoomAsset[];
}

function mapRoomRowToPropertyRoomDetail(
  r: Record<string, unknown>,
  occupants: PropertyRoomOccupant[],
  images: PropertyRoomImage[],
  documents: PropertyRoomDocument[] = []
): PropertyRoomDetail {
  const tenantId = r.tenant_id as string | null;
  const tenant =
    tenantId
      ? {
          tenantId,
          firstName: r.tenant_first_name as string,
          lastName: r.tenant_last_name as string,
          email: (r.tenant_email as string | null) ?? null,
          phone: (r.tenant_phone as string | null) ?? null,
          previousAddress: (r.tenant_previous_address as string | null) ?? null,
          emergencyContactName: (r.tenant_emergency_contact_name as string | null) ?? null,
          emergencyContactPhone: (r.tenant_emergency_contact_phone as string | null) ?? null,
          notes: (r.tenant_notes as string | null) ?? null,
          startDate: r.assignment_start as string | Date,
          endDate: (r.assignment_end as string | Date | null) ?? null,
          dueDate: (r.next_due_date as string | Date | null) ?? null,
          monthlyRate:
            parseFloat(String(r.assignment_monthly_rate)) ||
            parseFloat(String(r.monthly_rate)) ||
            0,
          overdueAmount: parseFloat(String(r.overdue_amount)) || 0,
          pendingAmount: parseFloat(String(r.pending_amount)) || 0,
          depositPaid:
            r.deposit_paid != null ? parseFloat(String(r.deposit_paid)) || 0 : undefined,
          advancePaid:
            r.advance_paid != null ? parseFloat(String(r.advance_paid)) || 0 : undefined,
          utilityDepositPaid:
            r.utility_deposit_paid != null
              ? parseFloat(String(r.utility_deposit_paid)) || 0
              : undefined,
          profileImagePath: (r.tenant_profile_image as string | null) ?? null,
        }
      : null;

  return {
    id: r.id as string,
    roomNumber: r.room_number as string,
    roomType: r.room_type as string,
    floorNumber: (r.floor_number as number | null) ?? undefined,
    squareFootage: (r.square_footage as number | null) ?? undefined,
    monthlyRate: parseFloat(String(r.monthly_rate)) || 0,
    depositAmount:
      r.deposit_amount != null ? parseFloat(String(r.deposit_amount)) || 0 : undefined,
    roomStatus: r.room_status as string,
    amenities: normalizeAmenities(r.amenities),
    description: (r.description as string | null) ?? undefined,
    createdAt: (r.created_at as string | Date | null) ?? undefined,
    updatedAt: (r.updated_at as string | Date | null) ?? undefined,
    tenant,
    occupants,
    images,
    documents,
  };
}

export async function getRoomsForRoomsPage(): Promise<RoomsPageListItem[]> {
  const result = await pool.query(
    `
    SELECT
      r.id,
      r.building_id,
      b.name AS building_name,
      r.room_number,
      r.room_type,
      r.room_status,
      r.square_footage,
      r.monthly_rate,
      t.first_name AS tenant_first_name,
      t.last_name AS tenant_last_name,
      (
        SELECT i.file_path
        FROM images i
        WHERE i.entity_type = 'room' AND i.entity_id = r.id
        ORDER BY i.is_primary DESC, i.created_at ASC
        LIMIT 1
      ) AS primary_image_path
    FROM rooms r
    JOIN buildings b ON b.id = r.building_id AND b.is_active = true
    LEFT JOIN LATERAL (
      SELECT tra.tenant_id
      FROM tenant_room_assignments tra
      WHERE tra.room_id = r.id
        AND tra.assignment_status = 'active'
        AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE)
      ORDER BY tra.created_at DESC NULLS LAST, tra.start_date DESC NULLS LAST
      LIMIT 1
    ) tra ON true
    LEFT JOIN tenants t ON t.id = tra.tenant_id
    WHERE r.is_active = true
    ORDER BY b.name ASC,
      regexp_replace(lower(r.room_number), '[0-9]+', '', 'g'),
      COALESCE(NULLIF(regexp_replace(r.room_number, '[^0-9]', '', 'g'), '')::bigint, 0),
      r.room_number
    `
  );

  return result.rows.map((row) => {
    const tenantName =
      row.tenant_first_name || row.tenant_last_name
        ? `${row.tenant_first_name || ''} ${row.tenant_last_name || ''}`.trim()
        : null;

    return {
      id: row.id,
      buildingId: row.building_id,
      buildingName: row.building_name,
      roomNumber: row.room_number,
      roomType: row.room_type,
      roomStatus: row.room_status,
      squareFootage: row.square_footage ?? undefined,
      monthlyRate: parseFloat(row.monthly_rate) || 0,
      tenantName,
      primaryImagePath: row.primary_image_path || null,
    };
  });
}

export async function getRoomPageDetail(roomId: string): Promise<RoomPageDetail | null> {
  const roomResult = await pool.query(
    `
    SELECT
      r.*,
      b.id AS building_uuid,
      b.name AS building_name,
      b.address_line1,
      b.address_line2,
      b.city,
      b.state,
      b.postal_code,
      b.country,
      b.latitude,
      b.longitude,
      b.google_maps_url,
      b.auto_late_fee,
      b.show_on_landing_nearby,
      b.description AS building_description,
      b.building_type,
      b.year_built,
      b.total_floors,
      b.total_units,
      b.amenities AS building_amenities,
      b.is_active AS building_is_active,
      b.created_at AS building_created_at,
      b.updated_at AS building_updated_at,
      t.id AS tenant_id,
      t.first_name AS tenant_first_name,
      t.last_name AS tenant_last_name,
      t.email AS tenant_email,
      t.phone AS tenant_phone,
      t.previous_address AS tenant_previous_address,
      t.emergency_contact_name AS tenant_emergency_contact_name,
      t.emergency_contact_phone AS tenant_emergency_contact_phone,
      t.notes AS tenant_notes,
      tra.start_date AS assignment_start,
      tra.end_date AS assignment_end,
      tra.deposit_paid,
      tra.advance_paid,
      tra.utility_deposit_paid,
      COALESCE(tra.monthly_rate, r.monthly_rate) AS assignment_monthly_rate,
      COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.assignment_id = tra.id
          AND p.payment_status = 'overdue'
      ), 0) AS overdue_amount,
      COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.assignment_id = tra.id
          AND p.payment_status = 'pending'
      ), 0) AS pending_amount,
      (
        SELECT i.due_date
        FROM invoices i
        WHERE i.tenant_id = t.id
          AND i.invoice_status IS DISTINCT FROM 'cancelled'
          AND GREATEST(i.total_amount - COALESCE(i.amount_paid, 0), 0) > 0.01
        ORDER BY i.due_date ASC NULLS LAST
        LIMIT 1
      ) AS next_due_date,
      (
        SELECT COALESCE(
          NULLIF(t.profile_picture_url, ''),
          (
            SELECT img.file_path
            FROM images img
            WHERE img.entity_type = 'tenant' AND img.entity_id = t.id
            ORDER BY img.is_primary DESC, img.created_at ASC
            LIMIT 1
          )
        )
      ) AS tenant_profile_image,
      (
        SELECT COUNT(*)::int FROM rooms rr
        WHERE rr.building_id = r.building_id AND rr.is_active = true
      ) AS total_units_count,
      (
        SELECT COUNT(*)::int FROM rooms rr
        WHERE rr.building_id = r.building_id AND rr.is_active = true AND rr.room_status = 'occupied'
      ) AS occupied_units_count,
      (
        SELECT COUNT(*)::int FROM rooms rr
        WHERE rr.building_id = r.building_id AND rr.is_active = true AND rr.room_status = 'vacant'
      ) AS vacant_units_count
    FROM rooms r
    JOIN buildings b ON b.id = r.building_id AND b.is_active = true
    LEFT JOIN LATERAL (
      SELECT tra.*
      FROM tenant_room_assignments tra
      WHERE tra.room_id = r.id
        AND tra.assignment_status = 'active'
        AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE)
      ORDER BY tra.created_at DESC NULLS LAST, tra.start_date DESC NULLS LAST
      LIMIT 1
    ) tra ON true
    LEFT JOIN tenants t ON t.id = tra.tenant_id
    WHERE r.id = $1 AND r.is_active = true
    `,
    [roomId]
  );

  if (roomResult.rows.length === 0) {
    return null;
  }

  const row = roomResult.rows[0];
  const buildingId = row.building_id as string;

  const tenantId = (row.tenant_id as string | null) || null;

  const [
    occupantsResult,
    roomImages,
    buildingImages,
    docsResult,
    financialRaw,
    occupancyRaw,
    historyRaw,
    assetsResult,
    lastPaymentResult,
    utilityResult,
  ] = await Promise.all([
    pool.query(
      `
      SELECT id, room_id, first_name, last_name, relationship_to_tenant
      FROM occupants
      WHERE room_id = $1
        AND is_active = true
        AND (move_out_date IS NULL OR move_out_date > CURRENT_DATE)
      ORDER BY move_in_date ASC
      `,
      [roomId]
    ),
    getImagesByEntity('room', roomId),
    getImagesByEntity('building', buildingId),
    pool.query(
      `
      SELECT
        d.id,
        d.document_name,
        d.file_name,
        d.file_size,
        d.mime_type,
        d.document_type
      FROM documents d
      WHERE d.room_id = $1
         OR ($2::uuid IS NOT NULL AND d.tenant_id = $2::uuid)
      ORDER BY
        CASE
          WHEN lower(COALESCE(d.document_type, '')) LIKE '%lease%' THEN 0
          WHEN lower(COALESCE(d.document_name, '')) LIKE '%lease%' THEN 0
          ELSE 1
        END,
        d.created_at DESC
      LIMIT 12
      `,
      [roomId, tenantId]
    ),
    getRoomFinancialSummary(roomId),
    getRoomOccupancyMetrics(roomId),
    getRoomAssignmentHistory(roomId),
    pool.query(
      `
      SELECT
        a.id,
        a.asset_name,
        a.asset_type,
        a.brand,
        a.model,
        a.asset_condition
      FROM assets a
      INNER JOIN asset_assignments aa ON a.id = aa.asset_id
      WHERE aa.room_id = $1
        AND aa.assignment_status = 'active'
        AND a.is_active = true
      ORDER BY a.asset_type ASC, a.asset_name ASC
      `,
      [roomId]
    ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
    tenantId
      ? pool.query(
          `
          SELECT amount, payment_date
          FROM payments
          WHERE tenant_id = $1
            AND payment_status IN ('paid', 'completed', 'confirmed')
          ORDER BY payment_date DESC NULLS LAST, created_at DESC
          LIMIT 1
          `,
          [tenantId]
        ).catch(() => ({ rows: [] as Record<string, unknown>[] }))
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
    pool.query(
      `
      SELECT
        utility_type,
        amount,
        due_date,
        bill_status
      FROM utility_bills
      WHERE COALESCE(bill_status, 'pending') IS DISTINCT FROM 'cancelled'
        AND parent_bill_id IS NULL
        AND (
          room_id = $1
          OR (room_id IS NULL AND building_id = $2)
        )
        AND lower(COALESCE(utility_type, '')) IN ('electric', 'electricity', 'water')
      ORDER BY due_date DESC NULLS LAST, created_at DESC
      `,
      [roomId, buildingId]
    ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
  ]);

  const occupants: PropertyRoomOccupant[] = occupantsResult.rows.map((occ) => ({
    id: occ.id,
    firstName: occ.first_name,
    lastName: occ.last_name,
    relationshipToTenant: occ.relationship_to_tenant,
  }));

  const documents: PropertyRoomDocument[] = docsResult.rows.map((doc) => ({
    id: doc.id,
    documentName: doc.document_name,
    fileName: doc.file_name,
    fileSize: doc.file_size ?? undefined,
    mimeType: doc.mime_type ?? undefined,
    documentType: doc.document_type ?? undefined,
  }));

  const room = mapRoomRowToPropertyRoomDetail(
    row,
    occupants,
    roomImages.map((img) => ({
      id: img.id,
      filePath: img.filePath,
      isPrimary: img.isPrimary,
    })),
    documents
  );

  const building: Building & {
    occupiedUnits: number;
    vacantUnits: number;
    totalUnits: number;
  } = {
    id: buildingId,
    name: row.building_name,
    addressLine1: row.address_line1 || '',
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    description: row.building_description,
    buildingType: row.building_type,
    yearBuilt: row.year_built,
    totalFloors: row.total_floors,
    totalUnits: row.total_units_count || 0,
    activeUnits: row.total_units_count || 0,
    occupiedUnits: row.occupied_units_count || 0,
    vacantUnits: row.vacant_units_count || 0,
    amenities: Array.isArray(row.building_amenities) ? row.building_amenities : [],
    isActive: row.building_is_active,
    autoLateFee: row.auto_late_fee !== false,
    showOnLandingNearby: row.show_on_landing_nearby === true,
    latitude: parseStoredCoordinate(row.latitude),
    longitude: parseStoredCoordinate(row.longitude),
    googleMapsUrl: (row.google_maps_url as string | null) || null,
    createdAt: row.building_created_at,
    updatedAt: row.building_updated_at,
  };

  const lastPay = lastPaymentResult.rows[0] || null;
  let electricBillAmount = 0;
  let waterBillAmount = 0;
  for (const bill of utilityResult.rows) {
    const type = String(bill.utility_type || '').toLowerCase();
    const amount = parseFloat(String(bill.amount)) || 0;
    if ((type === 'electricity' || type === 'electric') && electricBillAmount === 0) {
      electricBillAmount = amount;
    }
    if (type === 'water' && waterBillAmount === 0) waterBillAmount = amount;
  }

  const unpaidBalance =
    (parseFloat(String(financialRaw.overdue_amount)) || 0) +
    (parseFloat(String(financialRaw.pending_amount)) || 0);

  const financialSummary: RoomFinancialSummary = {
    totalPayments: parseFloat(String(financialRaw.total_payments)) || 0,
    overdueAmount: parseFloat(String(financialRaw.overdue_amount)) || 0,
    pendingAmount: parseFloat(String(financialRaw.pending_amount)) || 0,
    currentMonthlyRate: parseFloat(String(financialRaw.current_monthly_rate)) || 0,
    currentAssignmentStart: financialRaw.current_assignment_start ?? null,
    depositReceived: parseFloat(String(financialRaw.deposit_received)) || 0,
    lastPaymentAmount: lastPay ? parseFloat(String(lastPay.amount)) || 0 : 0,
    lastPaymentDate: lastPay?.payment_date ?? null,
    unpaidBalance,
    electricBillAmount,
    waterBillAmount,
    nextDueDate: (row.next_due_date as string | Date | null) ?? null,
  };

  const occupancyMetrics: RoomOccupancyMetrics = {
    totalAssignments: occupancyRaw.total_assignments || 0,
    totalOccupiedDays: occupancyRaw.total_occupied_days || 0,
    avgAssignmentLength: occupancyRaw.avg_assignment_length || 0,
    occupancyRatePercent: occupancyRaw.occupancy_rate_percent || 0,
  };

  const assignmentHistory = withOccupancyHistoryBadges(
    (historyRaw || []).map((item: Record<string, unknown>) => {
      const displayName = String(item.display_name || '').trim();
      const fallbackName = `${item.first_name || ''} ${item.last_name || ''}`.trim();
      return {
        id: item.id as string,
        tenantId: (item.live_tenant_id as string | null) ?? (item.tenant_id as string | null) ?? null,
        tenantName: displayName || fallbackName || 'Unknown tenant',
        tenantEmail: (item.display_email as string | null) ?? (item.email as string | null) ?? null,
        tenantPhone: (item.display_phone as string | null) ?? (item.phone as string | null) ?? null,
        emergencyContactName: (item.display_emergency_name as string | null) ?? null,
        emergencyContactPhone: (item.display_emergency_phone as string | null) ?? null,
        tenantExists: Boolean(item.tenant_exists),
        startDate: item.start_date as string | Date,
        endDate: (item.end_date as string | Date | null) ?? null,
        monthlyRate: parseFloat(String(item.monthly_rate)) || 0,
        depositPaid:
          item.deposit_paid != null ? parseFloat(String(item.deposit_paid)) || 0 : undefined,
        advancePaid:
          item.advance_paid != null ? parseFloat(String(item.advance_paid)) || 0 : undefined,
        utilityDepositPaid:
          item.utility_deposit_paid != null
            ? parseFloat(String(item.utility_deposit_paid)) || 0
            : undefined,
        assignmentStatus: String(item.assignment_status || ''),
      };
    })
  );

  const assets: PropertyRoomAsset[] = (assetsResult.rows || []).map((a) => ({
    id: String(a.id),
    assetName: String(a.asset_name || ''),
    assetType: String(a.asset_type || ''),
    brand: a.brand ? String(a.brand) : null,
    model: a.model ? String(a.model) : null,
    condition: a.asset_condition ? String(a.asset_condition) : null,
  }));

  room.electricBillAmount = electricBillAmount;
  room.waterBillAmount = waterBillAmount;
  room.lastPaymentAmount = lastPay ? parseFloat(String(lastPay.amount)) || 0 : 0;
  room.lastPaymentDate = lastPay?.payment_date ?? null;

  return {
    room,
    building,
    buildingImages: buildingImages.map((img) => ({
      id: img.id,
      filePath: img.filePath,
      isPrimary: img.isPrimary,
    })),
    financialSummary,
    occupancyMetrics,
    assignmentHistory,
    assets,
  };
}

export interface PropertyReportUnitThumb {
  roomId: string;
  roomNumber: string;
  tenantName?: string | null;
  imagePath?: string | null;
}

export interface PropertyUnsignedUnit {
  roomId: string;
  roomNumber: string;
  roomStatus: string;
  monthlyRate: number;
  imagePath?: string | null;
  reason: 'vacant' | 'unassigned' | 'awaiting_signature';
}

export interface PropertyMaintenanceCategoryCount {
  category: string;
  count: number;
}

export interface PropertyVacantUnitMetrics {
  roomId: string;
  roomNumber: string;
  monthlyRate: number;
  daysVacant: number;
  estimatedLostRent: number;
  lastMoveOutDate: string | null;
  ownerAbsorbedUtility: number;
}

export interface PropertyBuildingReport {
  buildingId: string;
  month: string; // YYYY-MM
  monthLabel: string;
  rent: {
    totalRent: number;
    rentCollected: number;
    rentOutstanding: number;
    rentProcessing: number;
    unpaidPercent: number;
    collectedPercent: number;
    unitsWithInvoiceDue: number;
    unitsWithInvoicePaid: number;
    unitsWithInvoices: number;
    dueUnitThumbs: PropertyReportUnitThumb[];
    paidUnitThumbs: PropertyReportUnitThumb[];
  };
  availability: {
    totalUnits: number;
    occupied: number;
    vacant: number;
    /** Derived: totalUnits − occupied − vacant (never independently tallied) */
    unassigned: number;
    occupiedPercent: number;
    vacantPercent: number;
    unassignedPercent: number;
    reconciles: boolean;
  };
  vacantUnits: PropertyVacantUnitMetrics[];
  unsignedUnits: PropertyUnsignedUnit[];
  maintenance: {
    newRequests: number;
    urgentRequests: number;
    openRequests: number;
    byCategory: PropertyMaintenanceCategoryCount[];
  };
}

function parseYearMonth(input?: string | null): { year: number; month: number; key: string } {
  const now = new Date();
  if (input && /^\d{4}-\d{2}$/.test(input)) {
    const [y, m] = input.split('-').map(Number);
    if (y >= 2000 && m >= 1 && m <= 12) {
      return { year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}` };
    }
  }
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return { year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}` };
}

/**
 * Monthly rent collection + availability + maintenance snapshot for one building.
 */
export async function getPropertyBuildingReport(
  buildingId: string,
  monthKey?: string | null
): Promise<PropertyBuildingReport | null> {
  const buildingCheck = await pool.query(
    `SELECT id FROM buildings WHERE id = $1 AND is_active = true`,
    [buildingId]
  );
  if (buildingCheck.rows.length === 0) return null;

  const { year, month, key } = parseYearMonth(monthKey);
  const monthStart = `${key}-01`;
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const [rentResult, availabilityResult, vacantMetricsResult, unsignedResult, awaitingResult, maintenanceResult, categoryResult] =
    await Promise.all([
      pool.query(
        `
        WITH building_tenants AS (
          SELECT DISTINCT tra.tenant_id, tra.room_id, r.room_number
          FROM tenant_room_assignments tra
          INNER JOIN rooms r ON r.id = tra.room_id
          WHERE r.building_id = $1
            AND r.is_active = true
            AND tra.assignment_status = 'active'
            AND (tra.end_date IS NULL OR tra.end_date >= $2::date)
            AND tra.start_date < ($2::date + INTERVAL '1 month')
        ),
        month_invoices AS (
          SELECT
            i.id,
            i.tenant_id,
            i.total_amount,
            i.amount_paid,
            GREATEST(i.total_amount - COALESCE(i.amount_paid, 0), 0) AS balance_due,
            i.invoice_status,
            i.due_date,
            bt.room_id,
            bt.room_number
          FROM invoices i
          INNER JOIN building_tenants bt ON bt.tenant_id = i.tenant_id
          WHERE i.invoice_status IS DISTINCT FROM 'cancelled'
            AND (
              (i.due_date >= $2::date AND i.due_date < ($2::date + INTERVAL '1 month'))
              OR (
                i.billing_period_start IS NOT NULL
                AND i.billing_period_start < ($2::date + INTERVAL '1 month')
                AND COALESCE(i.billing_period_end, i.due_date) >= $2::date
              )
            )
        ),
        room_invoice AS (
          SELECT DISTINCT ON (room_id)
            room_id,
            room_number,
            total_amount,
            amount_paid,
            balance_due,
            invoice_status,
            due_date
          FROM month_invoices
          ORDER BY room_id, due_date DESC NULLS LAST
        )
        SELECT
          COALESCE((SELECT SUM(total_amount) FROM month_invoices), 0)::float AS total_rent,
          COALESCE((SELECT SUM(amount_paid) FROM month_invoices), 0)::float AS rent_collected,
          COALESCE((SELECT SUM(balance_due) FROM month_invoices WHERE balance_due > 0), 0)::float AS rent_outstanding,
          COALESCE((
            SELECT SUM(p.amount)
            FROM payments p
            INNER JOIN building_tenants bt ON bt.tenant_id = p.tenant_id
            WHERE p.payment_status = 'pending'
              AND p.payment_date >= $2::date
              AND p.payment_date < ($2::date + INTERVAL '1 month')
          ), 0)::float AS rent_processing,
          COALESCE((SELECT COUNT(*) FROM room_invoice), 0)::int AS units_with_invoices,
          COALESCE((SELECT COUNT(*) FROM room_invoice WHERE balance_due > 0.01), 0)::int AS units_due,
          COALESCE((
            SELECT COUNT(*) FROM room_invoice
            WHERE balance_due <= 0.01 OR invoice_status = 'paid'
          ), 0)::int AS units_paid,
          COALESCE((
            SELECT json_agg(json_build_object(
              'roomId', ri.room_id,
              'roomNumber', ri.room_number,
              'imagePath', (
                SELECT i.file_path FROM images i
                WHERE i.entity_type = 'room' AND i.entity_id = ri.room_id
                ORDER BY i.is_primary DESC, i.created_at ASC LIMIT 1
              )
            ) ORDER BY ri.room_number)
            FROM room_invoice ri WHERE ri.balance_due > 0.01
          ), '[]'::json) AS due_thumbs,
          COALESCE((
            SELECT json_agg(json_build_object(
              'roomId', ri.room_id,
              'roomNumber', ri.room_number,
              'imagePath', (
                SELECT i.file_path FROM images i
                WHERE i.entity_type = 'room' AND i.entity_id = ri.room_id
                ORDER BY i.is_primary DESC, i.created_at ASC LIMIT 1
              )
            ) ORDER BY ri.room_number)
            FROM room_invoice ri
            WHERE ri.balance_due <= 0.01 OR ri.invoice_status = 'paid'
          ), '[]'::json) AS paid_thumbs
        `,
        [buildingId, monthStart]
      ),
      // Occupied + vacant only; unassigned is derived in JS (never independent COUNT)
      pool.query(
        `
        SELECT
          COUNT(*)::int AS total_units,
          SUM(CASE WHEN room_status = 'occupied' THEN 1 ELSE 0 END)::int AS occupied,
          SUM(CASE WHEN room_status = 'vacant' THEN 1 ELSE 0 END)::int AS vacant
        FROM rooms
        WHERE building_id = $1 AND is_active = true
        `,
        [buildingId]
      ),
      pool.query(
        `
        SELECT
          r.id AS room_id,
          r.room_number,
          r.monthly_rate,
          (
            SELECT MAX(tra.end_date)
            FROM tenant_room_assignments tra
            WHERE tra.room_id = r.id AND tra.end_date IS NOT NULL
          ) AS last_move_out_date,
          GREATEST(
            0,
            (
              CURRENT_DATE - COALESCE(
                (
                  SELECT MAX(tra.end_date)
                  FROM tenant_room_assignments tra
                  WHERE tra.room_id = r.id AND tra.end_date IS NOT NULL
                ),
                r.updated_at::date
              )
            )
          )::int AS days_vacant,
          COALESCE((
            SELECT SUM(ub.amount)
            FROM utility_bills ub
            WHERE ub.room_id = r.id
              AND COALESCE(ub.cost_bearer, 'TENANT') = 'OWNER'
              AND COALESCE(ub.bill_status, 'pending') IS DISTINCT FROM 'cancelled'
              AND ub.billing_period_start < ($2::date + INTERVAL '1 month')
              AND ub.billing_period_end >= $2::date
          ), 0)::float AS owner_absorbed_utility
        FROM rooms r
        WHERE r.building_id = $1
          AND r.is_active = true
          AND r.room_status = 'vacant'
        ORDER BY days_vacant DESC NULLS LAST, r.room_number
        `,
        [buildingId, monthStart]
      ),
      pool.query(
        `
        SELECT
          r.id AS room_id,
          r.room_number,
          r.room_status,
          r.monthly_rate,
          (
            SELECT i.file_path FROM images i
            WHERE i.entity_type = 'room' AND i.entity_id = r.id
            ORDER BY i.is_primary DESC, i.created_at ASC LIMIT 1
          ) AS image_path
        FROM rooms r
        WHERE r.building_id = $1
          AND r.is_active = true
          AND r.room_status IS DISTINCT FROM 'occupied'
        ORDER BY
          CASE
            WHEN r.room_status = 'vacant' THEN 0
            WHEN r.room_status = 'reserved' THEN 1
            ELSE 2
          END,
          regexp_replace(lower(r.room_number), '[0-9]+', '', 'g'),
          COALESCE(NULLIF(regexp_replace(r.room_number, '[^0-9]', '', 'g'), '')::bigint, 0),
          r.room_number
        LIMIT 20
        `,
        [buildingId]
      ),
      pool.query(
        `
        SELECT
          c.id,
          c.title,
          c.room_id,
          r.room_number,
          r.monthly_rate,
          r.room_status,
          (
            SELECT i.file_path FROM images i
            WHERE i.entity_type = 'room' AND i.entity_id = r.id
            ORDER BY i.is_primary DESC, i.created_at ASC LIMIT 1
          ) AS image_path
        FROM pipeline_cards c
        INNER JOIN pipeline_boards b ON b.id = c.board_id AND b.slug = 'onboarding'
        LEFT JOIN rooms r ON r.id = c.room_id
        WHERE c.building_id = $1
          AND c.card_status = 'open'
          AND c.lease_status = 'awaiting_signature'
        ORDER BY c.updated_at DESC
        LIMIT 12
        `,
        [buildingId]
      ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
      pool.query(
        `
        SELECT
          COUNT(*) FILTER (
            WHERE status IN ('open', 'submitted', 'pending')
          )::int AS new_requests,
          COUNT(*) FILTER (
            WHERE priority IN ('urgent', 'high')
              AND status NOT IN ('completed', 'cancelled', 'closed')
          )::int AS urgent_requests,
          COUNT(*) FILTER (
            WHERE status NOT IN ('completed', 'cancelled', 'closed')
          )::int AS open_requests
        FROM maintenance_requests
        WHERE building_id = $1
        `,
        [buildingId]
      ),
      pool.query(
        `
        SELECT
          COALESCE(NULLIF(trim(category), ''), 'other') AS category,
          COUNT(*)::int AS count
        FROM maintenance_requests
        WHERE building_id = $1
          AND status NOT IN ('completed', 'cancelled', 'closed')
        GROUP BY 1
        ORDER BY count DESC, category ASC
        `,
        [buildingId]
      ),
    ]);

  const rentRow = rentResult.rows[0] || {};
  const totalRent = Number(rentRow.total_rent) || 0;
  const rentCollected = Number(rentRow.rent_collected) || 0;
  const rentOutstanding = Number(rentRow.rent_outstanding) || 0;
  const rentProcessing = Number(rentRow.rent_processing) || 0;
  const unitsWithInvoices = Number(rentRow.units_with_invoices) || 0;
  const unitsDue = Number(rentRow.units_due) || 0;
  const unitsPaid = Number(rentRow.units_paid) || 0;
  const denom = totalRent > 0 ? totalRent : rentCollected + rentOutstanding;
  const unpaidPercent = denom > 0 ? Math.round((rentOutstanding / denom) * 100) : 0;
  const collectedPercent = denom > 0 ? Math.max(0, 100 - unpaidPercent) : 0;

  const parseThumbs = (raw: unknown): PropertyReportUnitThumb[] => {
    const arr = Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw) : [];
    return (arr as Record<string, unknown>[]).map((t) => ({
      roomId: String(t.roomId || t.room_id || ''),
      roomNumber: String(t.roomNumber || t.room_number || ''),
      imagePath: t.imagePath || t.image_path ? String(t.imagePath || t.image_path) : null,
    }));
  };

  const avail = availabilityResult.rows[0] || {};
  const occupancy = buildOccupancyReconciliation({
    totalUnits: Number(avail.total_units) || 0,
    occupied: Number(avail.occupied) || 0,
    vacant: Number(avail.vacant) || 0,
  });
  assertOccupancyReconciles(occupancy, `building ${buildingId}`);

  const vacantUnits: PropertyVacantUnitMetrics[] = vacantMetricsResult.rows.map(
    (r) => {
      const daysVacant = Number(r.days_vacant) || 0;
      const monthlyRate = Number(r.monthly_rate) || 0;
      return {
        roomId: String(r.room_id),
        roomNumber: String(r.room_number),
        monthlyRate,
        daysVacant,
        estimatedLostRent: estimateLostRent(daysVacant, monthlyRate),
        lastMoveOutDate: r.last_move_out_date
          ? String(r.last_move_out_date).slice(0, 10)
          : null,
        ownerAbsorbedUtility: Number(r.owner_absorbed_utility) || 0,
      };
    }
  );

  const unsignedVacant: PropertyUnsignedUnit[] = unsignedResult.rows.map((r) => {
    const status = String(r.room_status || 'vacant');
    return {
      roomId: String(r.room_id),
      roomNumber: String(r.room_number),
      roomStatus: status,
      monthlyRate: Number(r.monthly_rate) || 0,
      imagePath: r.image_path ? String(r.image_path) : null,
      reason: (status === 'vacant' ? 'vacant' : 'unassigned') as 'vacant' | 'unassigned',
    };
  });

  const unsignedAwaiting: PropertyUnsignedUnit[] = (awaitingResult.rows || [])
    .filter((r) => r.room_id)
    .map((r) => ({
      roomId: String(r.room_id),
      roomNumber: String(r.room_number || '—'),
      roomStatus: String(r.room_status || 'reserved'),
      monthlyRate: Number(r.monthly_rate) || 0,
      imagePath: r.image_path ? String(r.image_path) : null,
      reason: 'awaiting_signature' as const,
    }));

  const seenRooms = new Set(unsignedAwaiting.map((u) => u.roomId));
  const unsignedUnits = [
    ...unsignedAwaiting,
    ...unsignedVacant.filter((u) => !seenRooms.has(u.roomId)),
  ].slice(0, 16);

  const maint = maintenanceResult.rows[0] || {};

  return {
    buildingId,
    month: key,
    monthLabel,
    rent: {
      totalRent,
      rentCollected,
      rentOutstanding,
      rentProcessing,
      unpaidPercent,
      collectedPercent,
      unitsWithInvoiceDue: unitsDue,
      unitsWithInvoicePaid: unitsPaid,
      unitsWithInvoices,
      dueUnitThumbs: parseThumbs(rentRow.due_thumbs).slice(0, 6),
      paidUnitThumbs: parseThumbs(rentRow.paid_thumbs).slice(0, 6),
    },
    availability: {
      totalUnits: occupancy.totalUnits,
      occupied: occupancy.occupied,
      vacant: occupancy.vacant,
      unassigned: occupancy.unassigned,
      occupiedPercent: occupancy.occupiedPercent,
      vacantPercent: occupancy.vacantPercent,
      unassignedPercent: occupancy.unassignedPercent,
      reconciles: occupancy.reconciles,
    },
    vacantUnits,
    unsignedUnits,
    maintenance: {
      newRequests: Number(maint.new_requests) || 0,
      urgentRequests: Number(maint.urgent_requests) || 0,
      openRequests: Number(maint.open_requests) || 0,
      byCategory: categoryResult.rows.map((r) => ({
        category: String(r.category),
        count: Number(r.count) || 0,
      })),
    },
  };
}

