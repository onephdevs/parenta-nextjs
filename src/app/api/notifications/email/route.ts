import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { EmailNotification, EmailTemplate, SendNotificationRequest, NotificationStats } from '@/types/notifications';

// Mock email templates
const emailTemplates: EmailTemplate[] = [
  {
    id: 'welcome-tenant',
    name: 'Welcome New Tenant',
    category: 'tenant',
    subject: 'Welcome to {{buildingName}}!',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Welcome to {{buildingName}}!</h1>
        <p>Dear {{tenantName}},</p>
        <p>We're excited to welcome you to your new home in {{buildingName}}. Here are your move-in details:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Unit:</strong> {{unitNumber}}</p>
          <p><strong>Move-in Date:</strong> {{moveInDate}}</p>
          <p><strong>Monthly Rent:</strong> {{monthlyRent}}</p>
        </div>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>{{propertyManagerName}}</p>
      </div>
    `,
    variables: [
      { name: 'tenantName', type: 'string', description: 'Tenant full name', required: true },
      { name: 'buildingName', type: 'string', description: 'Building name', required: true },
      { name: 'unitNumber', type: 'string', description: 'Unit number', required: true },
      { name: 'moveInDate', type: 'date', description: 'Move-in date', required: true },
      { name: 'monthlyRent', type: 'currency', description: 'Monthly rent amount', required: true },
      { name: 'propertyManagerName', type: 'string', description: 'Property manager name', required: false },
    ],
    isActive: true,
    isSystem: true,
    usageCount: 25,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    category: 'financial',
    subject: 'Rent Payment Reminder - Due {{dueDate}}',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">Payment Reminder</h1>
        <p>Dear {{tenantName}},</p>
        <p>This is a friendly reminder that your rent payment is due on {{dueDate}}.</p>
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p><strong>Amount Due:</strong> {{amountDue}}</p>
          <p><strong>Due Date:</strong> {{dueDate}}</p>
          <p><strong>Unit:</strong> {{unitNumber}}</p>
        </div>
        <p>Please ensure payment is made by the due date to avoid late fees.</p>
        <p><a href="{{paymentUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Make Payment</a></p>
        <p>Thank you,<br>Property Management</p>
      </div>
    `,
    variables: [
      { name: 'tenantName', type: 'string', description: 'Tenant full name', required: true },
      { name: 'amountDue', type: 'currency', description: 'Amount due', required: true },
      { name: 'dueDate', type: 'date', description: 'Payment due date', required: true },
      { name: 'unitNumber', type: 'string', description: 'Unit number', required: true },
      { name: 'paymentUrl', type: 'string', description: 'Payment portal URL', required: false },
    ],
    isActive: true,
    isSystem: true,
    usageCount: 150,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'maintenance-scheduled',
    name: 'Maintenance Scheduled',
    category: 'maintenance',
    subject: 'Maintenance Scheduled for {{maintenanceDate}}',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Maintenance Scheduled</h1>
        <p>Dear {{tenantName}},</p>
        <p>We have scheduled maintenance for your unit. Please see the details below:</p>
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p><strong>Type:</strong> {{maintenanceType}}</p>
          <p><strong>Date & Time:</strong> {{maintenanceDate}} at {{maintenanceTime}}</p>
          <p><strong>Duration:</strong> {{estimatedDuration}}</p>
          <p><strong>Unit:</strong> {{unitNumber}}</p>
        </div>
        <p>{{maintenanceDetails}}</p>
        <p>Please ensure someone is available or provide access instructions.</p>
        <p>Best regards,<br>Maintenance Team</p>
      </div>
    `,
    variables: [
      { name: 'tenantName', type: 'string', description: 'Tenant full name', required: true },
      { name: 'maintenanceType', type: 'string', description: 'Type of maintenance', required: true },
      { name: 'maintenanceDate', type: 'date', description: 'Maintenance date', required: true },
      { name: 'maintenanceTime', type: 'string', description: 'Maintenance time', required: true },
      { name: 'estimatedDuration', type: 'string', description: 'Estimated duration', required: true },
      { name: 'unitNumber', type: 'string', description: 'Unit number', required: true },
      { name: 'maintenanceDetails', type: 'string', description: 'Additional details', required: false },
    ],
    isActive: true,
    isSystem: true,
    usageCount: 75,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20'),
  },
];

// Mock notification queue
const notificationQueue: EmailNotification[] = [];
let notificationCounter = 1;

// Mock notification stats
const mockStats: NotificationStats = {
  totalSent: 1250,
  totalDelivered: 1198,
  totalOpened: 789,
  totalClicked: 234,
  deliveryRate: 95.8,
  openRate: 65.9,
  clickRate: 19.5,
  bounceRate: 4.2,
  recentActivity: {
    sent24h: 45,
    sent7d: 298,
    sent30d: 1250,
  },
  byCategory: [
    { category: 'Financial', sent: 450, delivered: 432, openRate: 72.3 },
    { category: 'Maintenance', sent: 280, delivered: 271, openRate: 68.1 },
    { category: 'Tenant', sent: 320, delivered: 308, openRate: 61.2 },
    { category: 'System', sent: 200, delivered: 187, openRate: 58.9 },
  ],
};

// Helper function to replace template variables
function replaceTemplateVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    let formattedValue = value;
    
    // Format based on variable type
    if (typeof value === 'number' && key.toLowerCase().includes('amount')) {
      formattedValue = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
      }).format(value);
    } else if (value instanceof Date || (typeof value === 'string' && Date.parse(value))) {
      const date = new Date(value);
      formattedValue = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    
    result = result.replace(regex, formattedValue);
  });
  
  return result;
}

// GET /api/notifications/email - Get email templates, queue, or stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'templates';

    switch (type) {
      case 'templates':
        return NextResponse.json({
          success: true,
          data: emailTemplates,
        });

      case 'queue':
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const status = searchParams.get('status');
        
        let filteredQueue = [...notificationQueue];
        if (status) {
          filteredQueue = filteredQueue.filter(n => n.status === status);
        }
        
        const paginatedQueue = filteredQueue.slice(offset, offset + limit);
        
        return NextResponse.json({
          success: true,
          data: {
            notifications: paginatedQueue,
            total: filteredQueue.length,
            limit,
            offset,
          },
        });

      case 'stats':
        return NextResponse.json({
          success: true,
          data: mockStats,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error fetching email data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email data' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/email - Send email notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const body: SendNotificationRequest = await request.json();
    const { templateId, recipientEmail, recipientName, variables, priority, scheduledAt } = body;

    if (!templateId || !recipientEmail) {
      return NextResponse.json(
        { error: 'Template ID and recipient email are required' },
        { status: 400 }
      );
    }

    // Find template
    const template = emailTemplates.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Validate required variables
    const missingVariables = template.variables
      .filter(v => v.required && !variables?.[v.name])
      .map(v => v.name);

    if (missingVariables.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required variables',
          missingVariables 
        },
        { status: 400 }
      );
    }

    // Process template
    const processedSubject = replaceTemplateVariables(template.subject, variables || {});
    const processedHtml = replaceTemplateVariables(template.htmlTemplate, variables || {});

    // Create notification
    const notification: EmailNotification = {
      id: `email_${notificationCounter++}`,
      templateId,
      recipientEmail,
      recipientName,
      subject: processedSubject,
      htmlContent: processedHtml,
      status: scheduledAt ? 'pending' : 'sending',
      priority: priority || 'normal',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      retryCount: 0,
      maxRetries: 3,
      metadata: {
        templateName: template.name,
        senderUserId: session.user.id || session.user.email,
        originalVariables: variables,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to queue
    notificationQueue.push(notification);

    // Simulate sending (in production, this would use an email service)
    setTimeout(() => {
      const queuedNotification = notificationQueue.find(n => n.id === notification.id);
      if (queuedNotification) {
        queuedNotification.status = 'sent';
        queuedNotification.sentAt = new Date();
        queuedNotification.updatedAt = new Date();
      }
    }, 2000);

    // Update template usage
    const templateIndex = emailTemplates.findIndex(t => t.id === templateId);
    if (templateIndex !== -1) {
      emailTemplates[templateIndex].usageCount++;
      emailTemplates[templateIndex].lastUsed = new Date();
    }

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      message: 'Email notification queued successfully',
      estimatedDelivery: scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 30000),
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
    return NextResponse.json(
      { error: 'Failed to send email notification' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications/email - Update notification status or retry
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationId, action } = body;

    if (!notificationId || !action) {
      return NextResponse.json(
        { error: 'Notification ID and action are required' },
        { status: 400 }
      );
    }

    const notification = notificationQueue.find(n => n.id === notificationId);
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'retry':
        if (notification.retryCount >= notification.maxRetries) {
          return NextResponse.json(
            { error: 'Maximum retry attempts reached' },
            { status: 400 }
          );
        }
        
        notification.status = 'sending';
        notification.retryCount++;
        notification.updatedAt = new Date();
        break;

      case 'cancel':
        if (notification.status === 'sent') {
          return NextResponse.json(
            { error: 'Cannot cancel sent notification' },
            { status: 400 }
          );
        }
        
        notification.status = 'failed';
        notification.failureReason = 'Cancelled by admin';
        notification.updatedAt = new Date();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Notification ${action} successful`,
      data: notification,
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
} 