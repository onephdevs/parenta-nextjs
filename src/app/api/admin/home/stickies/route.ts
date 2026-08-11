import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  createAdminHomeSticky,
  isStickyColor,
  listAdminHomeStickies,
  STICKY_COLORS,
} from '@/lib/api/admin-home-stickies';

export async function GET() {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const userId = String(session!.user.id || '');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing user' }, { status: 400 });
    }

    const data = await listAdminHomeStickies(userId);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/admin/home/stickies error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load stickies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const userId = String(session!.user.id || '');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing user' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const color =
      typeof body.color === 'string' && isStickyColor(body.color)
        ? body.color
        : STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];

    const sticky = await createAdminHomeSticky({
      userId,
      title: typeof body.title === 'string' ? body.title : '',
      body: typeof body.body === 'string' ? body.body : '',
      color,
    });

    return NextResponse.json({ success: true, data: sticky }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/home/stickies error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create sticky' },
      { status: 500 }
    );
  }
}
