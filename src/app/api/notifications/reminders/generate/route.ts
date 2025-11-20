import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  generatePaymentReminders,
  processScheduledReminders,
} from '@/lib/services/notification-service';

/**
 * POST /api/notifications/reminders/generate
 * Generate payment reminders for upcoming due dates
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Generate reminders
    const remindersCreated = await generatePaymentReminders();
    
    // Process any pending reminders
    const remindersProcessed = await processScheduledReminders();
    
    return NextResponse.json({
      success: true,
      reminders_created: remindersCreated,
      reminders_processed: remindersProcessed,
      message: `Generated ${remindersCreated} reminder(s) and processed ${remindersProcessed}`,
    });
  } catch (error) {
    console.error('Error generating reminders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate reminders',
      },
      { status: 500 }
    );
  }
}

