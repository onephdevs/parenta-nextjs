import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrlValue: process.env.NEXTAUTH_URL || 'NOT SET',
    // Don't expose actual secrets, just check if they exist
    databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) || 'NOT SET',
  });
}

