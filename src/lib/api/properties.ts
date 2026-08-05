import pool from '@/lib/db';
import type { Building, DatabaseBuilding } from '@/types/database';
import { normalizeAmenities } from '@/lib/format/amenities';
import { getImagesByEntity } from '@/lib/api/images';
import {
  getRoomAssignmentHistory,
  getRoomFinancialSummary,
  getRoomOccupancyMetrics,
} from '@/lib/api/rooms';

function mapDatabaseBuildingToBuilding(dbBuilding: DatabaseBuilding): Building {
  return {
    id: dbBuilding.id,
    name: dbBuilding.name,
    addressLine1: dbBuilding.address_line1,
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
  startDate: string | Date;
  monthlyRate: number;
  overdueAmount: number;
  pendingAmount: number;
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
}

export interface RoomFinancialSummary {
  totalPayments: number;
  overdueAmount: number;
  pendingAmount: number;
  currentMonthlyRate: number;
  currentAssignmentStart: string | Date | null;
  depositReceived: number;
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
  startDate: string | Date;
  endDate?: string | Date | null;
  monthlyRate: number;
  assignmentStatus: string;
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
    ORDER BY b.name ASC
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
      tra.start_date AS assignment_start,
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
      ), 0) AS pending_amount
    FROM rooms r
    LEFT JOIN tenant_room_assignments tra
      ON tra.room_id = r.id
      AND tra.assignment_status = 'active'
      AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE)
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
      ORDER BY d.created_at DESC
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
        if (list.length < 5) {
          list.push(mapped);
          documentsByRoom.set(rid, list);
        }
      }
    }
  }

  const rooms: PropertyRoomDetail[] = roomsResult.rows.map((r) => {
    const tenant =
      r.tenant_id
        ? {
            tenantId: r.tenant_id as string,
            firstName: r.tenant_first_name as string,
            lastName: r.tenant_last_name as string,
            email: r.tenant_email as string | null,
            phone: r.tenant_phone as string | null,
            startDate: r.assignment_start as string | Date,
            monthlyRate: parseFloat(r.assignment_monthly_rate) || parseFloat(r.monthly_rate) || 0,
            overdueAmount: parseFloat(r.overdue_amount) || 0,
            pendingAmount: parseFloat(r.pending_amount) || 0,
          }
        : null;

    return {
      id: r.id,
      roomNumber: r.room_number,
      roomType: r.room_type,
      floorNumber: r.floor_number ?? undefined,
      squareFootage: r.square_footage ?? undefined,
      monthlyRate: parseFloat(r.monthly_rate) || 0,
      depositAmount:
        r.deposit_amount != null ? parseFloat(r.deposit_amount) || 0 : undefined,
      roomStatus: r.room_status,
      amenities: normalizeAmenities(r.amenities),
      description: r.description ?? undefined,
      createdAt: r.created_at ?? undefined,
      updatedAt: r.updated_at ?? undefined,
      tenant,
      occupants: occupantsByRoom.get(r.id) || [],
      images: imagesByRoom.get(r.id) || [],
      documents: documentsByRoom.get(r.id) || [],
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
          startDate: r.assignment_start as string | Date,
          monthlyRate:
            parseFloat(String(r.assignment_monthly_rate)) ||
            parseFloat(String(r.monthly_rate)) ||
            0,
          overdueAmount: parseFloat(String(r.overdue_amount)) || 0,
          pendingAmount: parseFloat(String(r.pending_amount)) || 0,
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
      t.last_name AS tenant_last_name
    FROM rooms r
    JOIN buildings b ON b.id = r.building_id AND b.is_active = true
    LEFT JOIN tenant_room_assignments tra
      ON tra.room_id = r.id
      AND tra.assignment_status = 'active'
      AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE)
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
      tra.start_date AS assignment_start,
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
    LEFT JOIN tenant_room_assignments tra
      ON tra.room_id = r.id
      AND tra.assignment_status = 'active'
      AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE)
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
      ORDER BY d.created_at DESC
      LIMIT 5
      `,
      [roomId, tenantId]
    ),
    getRoomFinancialSummary(roomId),
    getRoomOccupancyMetrics(roomId),
    getRoomAssignmentHistory(roomId),
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
    addressLine1: row.address_line1,
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
    createdAt: row.building_created_at,
    updatedAt: row.building_updated_at,
  };

  const financialSummary: RoomFinancialSummary = {
    totalPayments: parseFloat(String(financialRaw.total_payments)) || 0,
    overdueAmount: parseFloat(String(financialRaw.overdue_amount)) || 0,
    pendingAmount: parseFloat(String(financialRaw.pending_amount)) || 0,
    currentMonthlyRate: parseFloat(String(financialRaw.current_monthly_rate)) || 0,
    currentAssignmentStart: financialRaw.current_assignment_start ?? null,
    depositReceived: parseFloat(String(financialRaw.deposit_received)) || 0,
  };

  const occupancyMetrics: RoomOccupancyMetrics = {
    totalAssignments: occupancyRaw.total_assignments || 0,
    totalOccupiedDays: occupancyRaw.total_occupied_days || 0,
    avgAssignmentLength: occupancyRaw.avg_assignment_length || 0,
    occupancyRatePercent: occupancyRaw.occupancy_rate_percent || 0,
  };

  const assignmentHistory: RoomAssignmentHistoryItem[] = (historyRaw || [])
    .slice(0, 5)
    .map((item: Record<string, unknown>) => {
      const displayName = String(item.display_name || '').trim();
      const fallbackName = `${item.first_name || ''} ${item.last_name || ''}`.trim();
      return {
        id: item.id as string,
        tenantId: (item.live_tenant_id as string | null) ?? (item.tenant_id as string | null) ?? null,
        tenantName: displayName || fallbackName || 'Unknown tenant',
        tenantEmail: (item.display_email as string | null) ?? (item.email as string | null) ?? null,
        startDate: item.start_date as string | Date,
        endDate: (item.end_date as string | Date | null) ?? null,
        monthlyRate: parseFloat(String(item.monthly_rate)) || 0,
        assignmentStatus: String(item.assignment_status || ''),
      };
    });

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
  };
}
