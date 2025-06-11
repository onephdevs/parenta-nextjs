// Document template system types
export interface DocumentTemplate {
  id: string;
  name: string;
  category: 'lease' | 'invoice' | 'receipt' | 'notice' | 'agreement' | 'report' | 'letter';
  description?: string;
  templateContent: string; // HTML template with variables
  variables: DocumentTemplateVariable[];
  isActive: boolean;
  isSystem: boolean; // Cannot be deleted
  previewImage?: string;
  usageCount: number;
  lastUsed?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean' | 'address' | 'signature';
  label: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  formatting?: {
    dateFormat?: string;
    currencyCode?: string;
    decimalPlaces?: number;
  };
}

export interface GeneratedDocument {
  id: string;
  templateId: string;
  templateName: string;
  fileName: string;
  generatedContent: string;
  variables: Record<string, any>;
  status: 'draft' | 'final' | 'signed' | 'archived';
  documentType: string;
  associatedEntityType?: 'tenant' | 'building' | 'room' | 'lease' | 'payment';
  associatedEntityId?: string;
  generatedBy: string;
  signatureRequired: boolean;
  signatures?: DocumentSignature[];
  version: number;
  parentDocumentId?: string; // For document revisions
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentSignature {
  id: string;
  signerName: string;
  signerEmail: string;
  signerRole: 'tenant' | 'landlord' | 'witness' | 'guarantor';
  signatureData?: string; // Base64 signature image
  signedAt?: Date;
  ipAddress?: string;
  deviceInfo?: string;
  status: 'pending' | 'signed' | 'declined';
}

// Advanced export types
export interface ExportRequest {
  id: string;
  name: string;
  exportType: 'financial_report' | 'tenant_list' | 'maintenance_log' | 'occupancy_report' | 'custom_query';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  parameters: ExportParameters;
  schedule?: ExportSchedule;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: Date;
  errorMessage?: string;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ExportParameters {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  buildingIds?: string[];
  tenantIds?: string[];
  roomIds?: string[];
  includeFields?: string[];
  excludeFields?: string[];
  filters?: Record<string, any>;
  groupBy?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customQuery?: string;
  templateId?: string;
}

export interface ExportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  time: string; // HH:mm format
  timezone: string;
  isActive: boolean;
  nextRun?: Date;
  lastRun?: Date;
  recipients: string[]; // Email addresses
}

export interface ReportBuilder {
  id: string;
  name: string;
  description?: string;
  dataSource: 'tenants' | 'buildings' | 'rooms' | 'leases' | 'payments' | 'maintenance' | 'utilities' | 'assets';
  fields: ReportField[];
  filters: ReportFilter[];
  grouping?: ReportGrouping[];
  sorting?: ReportSorting[];
  formatting?: ReportFormatting;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportField {
  fieldName: string;
  displayName: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max';
  formatting?: {
    dateFormat?: string;
    numberFormat?: string;
    currencyCode?: string;
  };
  width?: number;
  isVisible: boolean;
  sortOrder?: number;
}

export interface ReportFilter {
  fieldName: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  value2?: any; // For 'between' operator
  isRequired: boolean;
}

export interface ReportGrouping {
  fieldName: string;
  displayName: string;
  aggregations: {
    [fieldName: string]: 'sum' | 'count' | 'avg' | 'min' | 'max';
  };
}

export interface ReportSorting {
  fieldName: string;
  direction: 'asc' | 'desc';
  priority: number;
}

export interface ReportFormatting {
  title?: string;
  subtitle?: string;
  includeHeader: boolean;
  includeFooter: boolean;
  pageOrientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'Letter' | 'Legal';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fonts?: {
    headerFont: string;
    bodyFont: string;
    footerFont: string;
  };
  colors?: {
    headerBackground: string;
    headerText: string;
    alternatingRowBackground: string;
  };
}

// Workflow types for document approval
export interface DocumentWorkflow {
  id: string;
  documentId: string;
  workflowType: 'approval' | 'review' | 'signature' | 'distribution';
  status: 'initiated' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  steps: WorkflowStep[];
  currentStepIndex: number;
  initiatedBy: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  stepType: 'approval' | 'review' | 'signature' | 'notification';
  assignedTo: string;
  assignedRole?: string;
  status: 'pending' | 'completed' | 'rejected' | 'skipped';
  dueDate?: Date;
  completedAt?: Date;
  comments?: string;
  requiredAction: string;
  canDelegate: boolean;
  isOptional: boolean;
}

// Backup and restore types
export interface DataBackup {
  id: string;
  name: string;
  backupType: 'full' | 'incremental' | 'differential';
  dataTypes: string[]; // Which data to backup
  status: 'pending' | 'running' | 'completed' | 'failed';
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  checksumMD5?: string;
  encryptionKey?: string;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface DataRestore {
  id: string;
  backupId: string;
  restoreType: 'full' | 'selective';
  dataTypes: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  errorMessage?: string;
  restoredRecords?: number;
  conflictResolution: 'overwrite' | 'merge' | 'skip';
  dryRun: boolean;
  initiatedBy: string;
  createdAt: Date;
  completedAt?: Date;
} 