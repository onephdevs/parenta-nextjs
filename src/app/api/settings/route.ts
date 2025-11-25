import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/settings - Fetch all settings
export async function GET() {
  try {
    const result = await pool.query(
      'SELECT key, value FROM app_settings ORDER BY key ASC'
    );

    const settings: Record<string, string> = {};
    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch settings',
      },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Key and value are required',
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key)
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, value]
    );

    return NextResponse.json({
      success: true,
      setting: result.rows[0],
      message: 'Setting updated successfully',
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update setting',
      },
      { status: 500 }
    );
  }
}

// POST /api/settings/bulk - Update multiple settings at once
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Settings object is required',
        },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `INSERT INTO app_settings (key, value, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (key)
           DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
          [key, value]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update settings',
      },
      { status: 500 }
    );
  }
}

