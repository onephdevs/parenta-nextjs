import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { testEmailConnection, sendEmail } from '@/lib/services/email-service';

/**
 * Test email connection and optionally send a test email
 * POST /api/notifications/test-email
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Allow testing without authentication in development
    if (process.env.NODE_ENV === 'production' && (!session || session.user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { sendTestEmail, testRecipient } = body;

    // Test connection
    const connectionTest = await testEmailConnection();

    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        connectionTest,
        message: 'Gmail SMTP connection failed. Please check your credentials.',
      });
    }

    // If requested, send an actual test email
    let emailTest = null;
    if (sendTestEmail && testRecipient) {
      emailTest = await sendEmail({
        to: testRecipient,
        subject: '✅ Test Email from Alfonso Property Management System',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #4F46E5;">🎉 Email Configuration Successful!</h2>
            <p>This is a test email from your Alfonso Property Management System.</p>
            <p><strong>Gmail SMTP is working correctly!</strong></p>
            <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
            <p style="color: #6B7280; font-size: 12px;">
              Sent at: ${new Date().toLocaleString()}<br>
              From: ${process.env.GMAIL_USER}<br>
              System: Alfonso Property Management System
            </p>
          </div>
        `,
        text: 'This is a test email from Alfonso Property Management System. Gmail SMTP is working correctly!',
      });
    }

    return NextResponse.json({
      success: true,
      connectionTest,
      emailTest,
      configuration: {
        gmailUser: process.env.GMAIL_USER,
        hasAppPassword: !!process.env.GMAIL_APP_PASSWORD,
        emailFrom: process.env.EMAIL_FROM || `Alfonso Property Management System <${process.env.GMAIL_USER}>`,
      },
      message: 'Gmail SMTP is configured and working!',
    });

  } catch (error) {
    console.error('Error testing email:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test email connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get email configuration status
 * GET /api/notifications/test-email
 */
export async function GET() {
  try {
    const hasGmailUser = !!process.env.GMAIL_USER;
    const hasAppPassword = !!process.env.GMAIL_APP_PASSWORD;
    const isConfigured = hasGmailUser && hasAppPassword;

    return NextResponse.json({
      isConfigured,
      configuration: {
        gmailUser: process.env.GMAIL_USER || 'Not set',
        hasAppPassword,
        emailFrom: process.env.EMAIL_FROM || `Alfonso Property Management System <${process.env.GMAIL_USER}>`,
      },
      message: isConfigured
        ? 'Gmail is configured'
        : 'Gmail is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check email configuration' },
      { status: 500 }
    );
  }
}

