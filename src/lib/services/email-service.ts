/**
 * Email Service
 * Sends emails using Gmail SMTP via nodemailer
 */

import nodemailer from 'nodemailer';

// Email sending options
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

// Result of sending an email
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Create transporter with Gmail SMTP settings (lazy initialization)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

/**
 * Send an email using Gmail SMTP
 */
export async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  try {
    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn('[Email Service] Gmail credentials not configured. Email will not be sent.');
      return {
        success: false,
        error: 'Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.',
      };
    }
    
    // Default from address
    const fromAddress = options.from || process.env.EMAIL_FROM || `Parenta <${process.env.GMAIL_USER}>`;
    
    // Prepare email options
    const mailOptions = {
      from: fromAddress,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
    };

    // Send email
    const info = await getTransporter().sendMail(mailOptions);

    console.log('[Email Service] Email sent successfully:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('[Email Service] Failed to send email:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send a batch of emails
 */
export async function sendBatchEmails(
  emails: EmailOptions[]
): Promise<SendEmailResult[]> {
  const results: SendEmailResult[] = [];
  
  for (const email of emails) {
    const result = await sendEmail(email);
    results.push(result);
    
    // Add a small delay between emails to avoid rate limiting
    if (emails.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Test email connection
 */
export async function testEmailConnection(): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return {
        success: false,
        message: 'Gmail credentials not configured',
      };
    }

    await getTransporter().verify();
    
    return {
      success: true,
      message: 'Gmail SMTP connection successful',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
}
