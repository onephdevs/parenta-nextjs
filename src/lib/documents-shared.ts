/** Client-safe document UI helpers (no DB imports). */

export type DocumentUiStatus =
  | 'signed'
  | 'on_file'
  | 'expiring_soon'
  | 'needs_review';

export interface DocumentStatusInput {
  categoryId?: string | null;
  buildingId?: string | null;
  roomId?: string | null;
  tenantId?: string | null;
  assetId?: string | null;
  documentType?: string | null;
  categoryName?: string | null;
  expiryDate?: Date | string | null;
}

const SIGNED_TYPES = new Set(['lease', 'contract']);

function isLinked(doc: DocumentStatusInput): boolean {
  return Boolean(doc.buildingId || doc.roomId || doc.tenantId || doc.assetId);
}

function isLeaseLike(doc: DocumentStatusInput): boolean {
  const type = (doc.documentType || '').toLowerCase();
  if (SIGNED_TYPES.has(type)) return true;
  const category = (doc.categoryName || '').toLowerCase();
  return category.includes('lease') || category.includes('agreement') || category.includes('contract');
}

function daysUntilExpiry(expiryDate: Date | string | null | undefined): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isDocumentUnlinked(doc: DocumentStatusInput): boolean {
  return !isLinked(doc);
}

export function getDocumentUiStatus(doc: DocumentStatusInput): DocumentUiStatus {
  const days = daysUntilExpiry(doc.expiryDate ?? null);
  const unlinked = isDocumentUnlinked(doc);
  const uncategorized = !doc.categoryId;

  if (unlinked || uncategorized || (days !== null && days < 0)) {
    return 'needs_review';
  }

  if (days !== null && days <= 30) {
    return 'expiring_soon';
  }

  if (isLeaseLike(doc)) {
    return 'signed';
  }

  return 'on_file';
}

export function formatDocumentLinkedTo(doc: {
  buildingName?: string | null;
  roomNumber?: string | null;
  tenantName?: string | null;
}): string | null {
  const parts: string[] = [];
  if (doc.buildingName && doc.roomNumber) {
    parts.push(`${doc.buildingName} · ${doc.roomNumber}`);
  } else if (doc.buildingName) {
    parts.push(doc.buildingName);
  } else if (doc.roomNumber) {
    parts.push(`Room ${doc.roomNumber}`);
  }
  if (doc.tenantName && !doc.buildingName) {
    return doc.tenantName;
  }
  if (doc.tenantName && parts.length === 0) {
    return doc.tenantName;
  }
  if (parts.length > 0 && doc.tenantName && !doc.roomNumber) {
    return `${parts[0]} · ${doc.tenantName}`;
  }
  return parts[0] || doc.tenantName || null;
}
