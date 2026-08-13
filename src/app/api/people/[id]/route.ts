import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getPersonDetail } from '@/lib/api/people';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const person = await getPersonDetail(id);
    if (!person) {
      return NextResponse.json(
        { success: false, error: 'Person not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: person });
  } catch (err) {
    console.error('Person detail error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load person',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
