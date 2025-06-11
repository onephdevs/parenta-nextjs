// Enhanced notification types for TASK-013 system enhancements

// Basic notification types (existing)
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId?: string;
  category?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// Email notification system types
export interface EmailNotification {
  id: string;
  templateId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'bounced';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
  sentAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'system' | 'tenant' | 'maintenance' | 'financial' | 'marketing';
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
  variables: EmailTemplateVariable[];
  isActive: boolean;
  isSystem: boolean; // Cannot be deleted
  description?: string;
  lastUsed?: Date;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean';
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
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    categories: {
      system: boolean;
      maintenance: boolean;
      financial: boolean;
      tenant: boolean;
      marketing: boolean;
    };
    quietHours: {
      enabled: boolean;
      startTime: string; // HH:mm format
      endTime: string;   // HH:mm format
      timezone: string;
    };
  };
  inAppNotifications: {
    enabled: boolean;
    categories: {
      system: boolean;
      maintenance: boolean;
      financial: boolean;
      tenant: boolean;
    };
  };
  smsNotifications: {
    enabled: boolean;
    phoneNumber?: string;
    categories: {
      urgent: boolean;
      maintenance: boolean;
      security: boolean;
    };
  };
  updatedAt: Date;
}

export interface NotificationQueue {
  id: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  templateId?: string;
  subject?: string;
  content: string;
  variables?: Record<string, any>;
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'cancelled';
  scheduledAt?: Date;
  processedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
}

export interface NotificationLog {
  id: string;
  notificationId: string;
  event: 'created' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  timestamp: Date;
  details?: string;
  metadata?: Record<string, any>;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  description?: string;
  templateId: string;
  targetAudience: {
    type: 'all' | 'admins' | 'tenants' | 'custom';
    filters?: {
      buildingIds?: string[];
      tenantStatus?: string[];
      userRoles?: string[];
      customQuery?: string;
    };
  };
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
  scheduledAt?: Date;
  sentAt?: Date;
  statistics: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification trigger types
export interface NotificationTrigger {
  id: string;
  name: string;
  event: string; // e.g., 'payment_overdue', 'maintenance_due', 'lease_expiring'
  conditions: Record<string, any>;
  templateId: string;
  isActive: boolean;
  delay?: number; // delay in minutes
  maxOccurrences?: number;
  createdAt: Date;
  updatedAt: Date;
}

// API response types
export interface SendNotificationRequest {
  templateId: string;
  recipientEmail: string;
  recipientName?: string;
  variables?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
}

export interface SendNotificationResponse {
  success: boolean;
  notificationId?: string;
  message: string;
  estimatedDelivery?: Date;
}

export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  recentActivity: {
    sent24h: number;
    sent7d: number;
    sent30d: number;
  };
  byCategory: {
    category: string;
    sent: number;
    delivered: number;
    openRate: number;
  }[];
} 