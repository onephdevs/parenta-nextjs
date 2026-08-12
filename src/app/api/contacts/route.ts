import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  createContact,
  ensureDefaultVendors,
  listContacts,
} from '@/lib/api/contacts';
import { isContactRole, type ContactRole } from '@/lib/constants/contacts';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role')?.toUpperCase();
    const search = searchParams.get('search') || searchParams.get('q') || undefined;
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const utilityTypeRaw = (searchParams.get('utilityType') || '').toLowerCase();
    const utilityType =
      utilityTypeRaw === 'electricity' || utilityTypeRaw === 'water'
        ? utilityTypeRaw
        : undefined;

    const role: ContactRole | undefined =
      roleParam && isContactRole(roleParam) ? roleParam : undefined;

    if (role === 'VENDOR') {
      await ensureDefaultVendors().catch((err) => {
        console.warn('ensureDefaultVendors:', err);
      });
    }

    const contacts = await listContacts({ role, search, activeOnly, utilityType });

    return NextResponse.json({ success: true, data: contacts });
  } catch (error) {
    console.error('Error listing contacts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list contacts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const firstName = String(body.firstName || body.vendorName || '').trim();
    const lastName = String(body.lastName || body.contactName || '').trim();
    const email = body.email != null ? String(body.email).trim() : null;
    const phone = body.phone != null ? String(body.phone).trim() : null;
    const notes = body.notes != null ? String(body.notes).trim() : null;

    const rolesRaw = Array.isArray(body.roles)
      ? body.roles
      : body.role
        ? [body.role]
        : ['VENDOR'];
    const roles = rolesRaw
      .map((r: unknown) => String(r).toUpperCase())
      .filter(isContactRole) as ContactRole[];

    if (!firstName) {
      return NextResponse.json(
        { success: false, error: 'Vendor / provider name is required' },
        { status: 400 }
      );
    }
    if (roles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one valid role is required' },
        { status: 400 }
      );
    }

    const contact = await createContact({
      firstName,
      lastName: lastName || undefined,
      email,
      phone,
      notes,
      roles,
    });

    return NextResponse.json({ success: true, data: contact }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    const message = error instanceof Error ? error.message : 'Failed to create contact';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
