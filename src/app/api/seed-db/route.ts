import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed-data';

export async function POST() {
  try {
    await seedDatabase();
    
    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully with sample data'
    });
  } catch (error) {
    console.error('Seed database error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 