/**
 * Email Service using Resend
 * Handles sending transactional emails
 */

import { Resend } from 'resend';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  try {
    // Default from address (you can configure this in environment)
    const fromAddress = options.from || process.env.EMAIL_FROM || 'Parenta <noreply@parenta.com.mx>';
    
    const result = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });
    
    if (result.error) {
      console.error('Resend error:', result.error);
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      };
    }
    
    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Replace template variables in email content
 */
export function replaceTemplateVariables(
  content: string,
  variables: Record<string, any>
): string {
  let result = content;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value));
  }
  
  return result;
}

/**
 * Email Templates
 * These are fallback templates if database templates don't exist
 */

export const DEFAULT_TEMPLATES = {
  payment_reminder: {
    subject: 'Reminder: Payment Due Soon for Invoice {{invoice_number}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Reminder</h2>
        <p>Dear {{tenant_name}},</p>
        <p>This is a friendly reminder that your payment for invoice <strong>{{invoice_number}}</strong> is due on <strong>{{due_date}}</strong>.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {{invoice_number}}</p>
          <p style="margin: 5px 0;"><strong>Amount Due:</strong> ₱{{amount}}</p>
          <p style="margin: 5px 0;"><strong>Due Date:</strong> {{due_date}}</p>
        </div>
        <p>Please make your payment before the due date to avoid late fees.</p>
        <p>If you have already made this payment, please disregard this notice.</p>
        <p>Thank you,<br/>Parenta Property Management</p>
      </div>
    `,
    text: `Payment Reminder\n\nDear {{tenant_name}},\n\nThis is a friendly reminder that your payment for invoice {{invoice_number}} is due on {{due_date}}.\n\nInvoice Number: {{invoice_number}}\nAmount Due: ₱{{amount}}\nDue Date: {{due_date}}\n\nPlease make your payment before the due date to avoid late fees.\n\nThank you,\nParenta Property Management`,
  },
  
  payment_overdue: {
    subject: 'Overdue Payment Notice for Invoice {{invoice_number}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Overdue Payment Notice</h2>
        <p>Dear {{tenant_name}},</p>
        <p>Our records show that your payment for invoice <strong>{{invoice_number}}</strong> is now overdue.</p>
        <div style="background: #ffebee; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {{invoice_number}}</p>
          <p style="margin: 5px 0;"><strong>Amount Due:</strong> ₱{{amount}}</p>
          <p style="margin: 5px 0;"><strong>Due Date:</strong> {{due_date}}</p>
          <p style="margin: 5px 0;"><strong>Days Overdue:</strong> {{days_overdue}}</p>
        </div>
        <p>Please make your payment immediately to avoid additional late fees.</p>
        <p>If you have already made this payment, please contact us immediately.</p>
        <p>Thank you,<br/>Parenta Property Management</p>
      </div>
    `,
    text: `Overdue Payment Notice\n\nDear {{tenant_name}},\n\nOur records show that your payment for invoice {{invoice_number}} is now overdue.\n\nInvoice Number: {{invoice_number}}\nAmount Due: ₱{{amount}}\nDue Date: {{due_date}}\nDays Overdue: {{days_overdue}}\n\nPlease make your payment immediately to avoid additional late fees.\n\nThank you,\nParenta Property Management`,
  },
  
  payment_confirmation: {
    subject: 'Payment Received - Invoice {{invoice_number}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Payment Received</h2>
        <p>Dear {{tenant_name}},</p>
        <p>Thank you! We have received your payment.</p>
        <div style="background: #e8f5e9; padding: 15px; border-left: 4px solid #2e7d32; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {{invoice_number}}</p>
          <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₱{{amount_paid}}</p>
          <p style="margin: 5px 0;"><strong>Payment Date:</strong> {{payment_date}}</p>
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> {{payment_method}}</p>
        </div>
        <p>Your payment has been successfully processed and applied to your account.</p>
        <p>Thank you for your prompt payment!</p>
        <p>Best regards,<br/>Parenta Property Management</p>
      </div>
    `,
    text: `Payment Received\n\nDear {{tenant_name}},\n\nThank you! We have received your payment.\n\nInvoice Number: {{invoice_number}}\nAmount Paid: ₱{{amount_paid}}\nPayment Date: {{payment_date}}\nPayment Method: {{payment_method}}\n\nThank you for your prompt payment!\n\nBest regards,\nParenta Property Management`,
  },
  
  invoice_sent: {
    subject: 'New Invoice {{invoice_number}} from Parenta',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Invoice</h2>
        <p>Dear {{tenant_name}},</p>
        <p>A new invoice has been generated for your account.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {{invoice_number}}</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> ₱{{amount}}</p>
          <p style="margin: 5px 0;"><strong>Due Date:</strong> {{due_date}}</p>
          <p style="margin: 5px 0;"><strong>Description:</strong> {{description}}</p>
        </div>
        <p>Please make your payment by the due date to avoid late fees.</p>
        <p>Thank you,<br/>Parenta Property Management</p>
      </div>
    `,
    text: `New Invoice\n\nDear {{tenant_name}},\n\nA new invoice has been generated for your account.\n\nInvoice Number: {{invoice_number}}\nAmount: ₱{{amount}}\nDue Date: {{due_date}}\nDescription: {{description}}\n\nPlease make your payment by the due date.\n\nThank you,\nParenta Property Management`,
  },
  
  lease_expiry_warning: {
    subject: 'Lease Expiration Notice - {{property_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Lease Expiration Notice</h2>
        <p>Dear {{tenant_name}},</p>
        <p>This is to inform you that your lease agreement for {{property_name}} is expiring soon.</p>
        <div style="background: #fff3e0; padding: 15px; border-left: 4px solid #f57c00; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Property:</strong> {{property_name}}</p>
          <p style="margin: 5px 0;"><strong>Lease End Date:</strong> {{lease_end_date}}</p>
          <p style="margin: 5px 0;"><strong>Days Remaining:</strong> {{days_remaining}}</p>
        </div>
        <p>If you wish to renew your lease, please contact us at your earliest convenience to discuss terms and conditions.</p>
        <p>If you plan to move out, please inform us at least 30 days before your lease end date.</p>
        <p>Thank you,<br/>Parenta Property Management</p>
      </div>
    `,
    text: `Lease Expiration Notice\n\nDear {{tenant_name}},\n\nYour lease agreement for {{property_name}} is expiring soon.\n\nProperty: {{property_name}}\nLease End Date: {{lease_end_date}}\nDays Remaining: {{days_remaining}}\n\nPlease contact us if you wish to renew.\n\nThank you,\nParenta Property Management`,
  },
};

