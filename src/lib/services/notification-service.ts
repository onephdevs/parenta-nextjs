/**
 * Notification Service
 * Handles notification scheduling, queue management, and sending
 */

import { Pool } from 'pg';
import pool from '../db';
import { sendEmail, replaceTemplateVariables, DEFAULT_TEMPLATES } from './email-service';

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  type: string;
}

interface QueuedNotification {
  id: string;
  recipient_email: string;
  recipient_name?: string;
  tenant_id?: string;
  notification_type: string;
  template_id?: string;
  subject: string;
  body_html: string;
  body_text?: string;
  context_data: Record<string, any>;
  scheduled_for: Date;
}

/**
 * Add a notification to the queue
 */
export async function queueNotification(
  recipientEmail: string,
  notificationType: string,
  context: Record<string, any>,
  scheduledFor?: Date,
  tenantId?: string,
  dbPool: Pool = pool
): Promise<string> {
  const client = await dbPool.connect();
  
  try {
    // Get the template for this notification type
    const templateResult = await client.query<NotificationTemplate>(
      `SELECT nt.* FROM notification_templates nt
       JOIN notification_settings ns ON ns.template_id = nt.id
       WHERE ns.notification_type = $1 AND ns.enabled = true
       LIMIT 1`,
      [notificationType]
    );
    
    let subject: string;
    let bodyHtml: string;
    let bodyText: string | undefined;
    let templateId: string | undefined;
    
    if (templateResult.rows.length > 0) {
      // Use database template
      const template = templateResult.rows[0];
      templateId = template.id;
      subject = replaceTemplateVariables(template.subject, context);
      bodyHtml = replaceTemplateVariables(template.body_html, context);
      bodyText = template.body_text ? replaceTemplateVariables(template.body_text, context) : undefined;
    } else {
      // Use default template
      const defaultTemplate = DEFAULT_TEMPLATES[notificationType as keyof typeof DEFAULT_TEMPLATES];
      if (!defaultTemplate) {
        throw new Error(`No template found for notification type: ${notificationType}`);
      }
      
      subject = replaceTemplateVariables(defaultTemplate.subject, context);
      bodyHtml = replaceTemplateVariables(defaultTemplate.html, context);
      bodyText = replaceTemplateVariables(defaultTemplate.text, context);
    }
    
    // Get tenant name if tenantId provided
    let recipientName: string | undefined;
    if (tenantId) {
      const tenantResult = await client.query(
        'SELECT first_name, last_name FROM tenants WHERE id = $1',
        [tenantId]
      );
      if (tenantResult.rows.length > 0) {
        const tenant = tenantResult.rows[0];
        recipientName = `${tenant.first_name} ${tenant.last_name}`;
      }
    }
    
    // Insert into queue
    const result = await client.query(
      `INSERT INTO notification_queue (
        recipient_email, recipient_name, tenant_id,
        notification_type, template_id, subject, body_html, body_text,
        context_data, scheduled_for
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        recipientEmail,
        recipientName,
        tenantId || null,
        notificationType,
        templateId || null,
        subject,
        bodyHtml,
        bodyText || null,
        JSON.stringify(context),
        scheduledFor || new Date(),
      ]
    );
    
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Process notifications in the queue (send pending notifications)
 */
export async function processNotificationQueue(
  limit: number = 50,
  dbPool: Pool = pool
): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  const client = await dbPool.connect();
  let processed = 0;
  let sent = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];
  
  try {
    // Get pending notifications
    const result = await client.query<QueuedNotification>(
      `SELECT * FROM notification_queue
       WHERE status = 'pending'
         AND scheduled_for <= CURRENT_TIMESTAMP
       ORDER BY scheduled_for ASC
       LIMIT $1`,
      [limit]
    );
    
    const notifications = result.rows;

    if (notifications.length > 0) {
      // Batch-claim as sending (one update instead of N)
      await client.query(
        `UPDATE notification_queue
         SET status = 'sending', updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($1::uuid[])`,
        [notifications.map((n) => n.id)]
      );
    }
    
    for (const notification of notifications) {
      try {
        // Send email
        const emailResult = await sendEmail({
          to: notification.recipient_email,
          subject: notification.subject,
          html: notification.body_html,
          text: notification.body_text,
        });
        
        if (emailResult.success) {
          // Move to history
          await client.query(
            `INSERT INTO notification_history (
              recipient_email, recipient_name, tenant_id,
              notification_type, template_id, subject,
              status, context_data, provider, provider_message_id, sent_at
            )
            SELECT 
              recipient_email, recipient_name, tenant_id,
              notification_type, template_id, subject,
              'sent', context_data, provider, $1, CURRENT_TIMESTAMP
            FROM notification_queue WHERE id = $2`,
            [emailResult.messageId, notification.id]
          );
          
          // Remove from queue
          await client.query('DELETE FROM notification_queue WHERE id = $1', [notification.id]);
          
          sent++;
        } else {
          // Check retry count — use row already loaded when possible
          const retry_count = notification.retry_count ?? 0;
          const max_retries = notification.max_retries ?? 3;
          
          if (retry_count >= max_retries) {
            // Max retries reached, mark as failed
            await client.query(
              `INSERT INTO notification_history (
                recipient_email, recipient_name, tenant_id,
                notification_type, template_id, subject,
                status, context_data, error_message
              )
              SELECT 
                recipient_email, recipient_name, tenant_id,
                notification_type, template_id, subject,
                'failed', context_data, $1
              FROM notification_queue WHERE id = $2`,
              [emailResult.error, notification.id]
            );
            
            await client.query('DELETE FROM notification_queue WHERE id = $1', [notification.id]);
            
            failed++;
            errors.push({ id: notification.id, error: emailResult.error || 'Unknown error' });
          } else {
            // Increment retry count and reset status
            await client.query(
              `UPDATE notification_queue 
               SET status = 'pending', 
                   retry_count = retry_count + 1,
                   error_message = $1,
                   scheduled_for = CURRENT_TIMESTAMP + INTERVAL '5 minutes',
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [emailResult.error, notification.id]
            );
          }
        }
        
        processed++;
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        errors.push({
          id: notification.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        // Reset status to pending for retry
        await client.query(
          'UPDATE notification_queue SET status = $1 WHERE id = $2',
          ['pending', notification.id]
        );
      }
    }
    
    return { processed, sent, failed, errors };
  } finally {
    client.release();
  }
}

/**
 * Generate payment reminders for upcoming due dates
 */
export async function generatePaymentReminders(dbPool: Pool = pool): Promise<number> {
  const result = await dbPool.query('SELECT generate_payment_reminders()');
  return parseInt(result.rows[0].generate_payment_reminders || '0');
}

/**
 * Process scheduled reminders
 */
export async function processScheduledReminders(dbPool: Pool = pool): Promise<number> {
  const result = await dbPool.query('SELECT process_pending_reminders()');
  return parseInt(result.rows[0].process_pending_reminders || '0');
}

/**
 * Send a payment reminder for a specific invoice
 */
export async function sendPaymentReminder(
  invoiceId: string,
  dbPool: Pool = pool
): Promise<{ success: boolean; message: string }> {
  const client = await dbPool.connect();
  
  try {
    // Get invoice and tenant details
    const result = await client.query(
      `SELECT 
        i.id, i.invoice_number, i.total_amount, i.due_date, i.description,
        t.id as tenant_id, t.email, t.first_name, t.last_name
       FROM invoices i
       JOIN tenants t ON t.id = i.tenant_id
       WHERE i.id = $1`,
      [invoiceId]
    );
    
    if (result.rows.length === 0) {
      return { success: false, message: 'Invoice not found' };
    }
    
    const invoice = result.rows[0];
    
    if (!invoice.email) {
      return { success: false, message: 'Tenant has no email address' };
    }
    
    const daysUntilDue = Math.ceil((new Date(invoice.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    const notificationType = daysUntilDue < 0 ? 'payment_overdue' : 'payment_reminder';
    
    const context = {
      tenant_name: `${invoice.first_name} ${invoice.last_name}`,
      invoice_number: invoice.invoice_number,
      amount: invoice.total_amount.toFixed(2),
      due_date: new Date(invoice.due_date).toLocaleDateString(),
      description: invoice.description || 'Monthly rent',
      days_overdue: daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0,
    };
    
    await queueNotification(
      invoice.email,
      notificationType,
      context,
      new Date(),
      invoice.tenant_id,
      client
    );
    
    return { success: true, message: 'Payment reminder queued successfully' };
  } finally {
    client.release();
  }
}

/**
 * Send payment confirmation
 */
export async function sendPaymentConfirmation(
  paymentId: string,
  dbPool: Pool = pool
): Promise<{ success: boolean; message: string }> {
  const client = await dbPool.connect();
  
  try {
    // Get payment and tenant details
    const result = await client.query(
      `SELECT 
        p.id, p.amount, p.payment_date, p.payment_method, p.transaction_id,
        i.invoice_number,
        t.id as tenant_id, t.email, t.first_name, t.last_name
       FROM payments p
       LEFT JOIN invoices i ON i.id = p.invoice_id
       JOIN tenants t ON t.id = p.tenant_id
       WHERE p.id = $1`,
      [paymentId]
    );
    
    if (result.rows.length === 0) {
      return { success: false, message: 'Payment not found' };
    }
    
    const payment = result.rows[0];
    
    if (!payment.email) {
      return { success: false, message: 'Tenant has no email address' };
    }
    
    const context = {
      tenant_name: `${payment.first_name} ${payment.last_name}`,
      invoice_number: payment.invoice_number || 'N/A',
      amount_paid: payment.amount.toFixed(2),
      payment_date: new Date(payment.payment_date).toLocaleDateString(),
      payment_method: payment.payment_method,
      reference_number: payment.transaction_id || 'N/A',
    };
    
    await queueNotification(
      payment.email,
      'payment_confirmation',
      context,
      new Date(),
      payment.tenant_id,
      client
    );
    
    return { success: true, message: 'Payment confirmation queued successfully' };
  } finally {
    client.release();
  }
}

/**
 * Get notification history for a tenant
 */
export async function getNotificationHistory(
  tenantId: string,
  limit: number = 50,
  dbPool: Pool = pool
): Promise<any[]> {
  const result = await dbPool.query(
    `SELECT * FROM notification_history
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [tenantId, limit]
  );
  
  return result.rows;
}

