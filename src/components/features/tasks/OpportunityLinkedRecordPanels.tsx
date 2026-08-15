'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { Avatar } from '@/components/ui/Avatar';
import { getImageUrl } from '@/lib/format/image-url';

function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMoney(value?: number | string | null): string {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? formatCurrency(n) : '—';
}

function pick(
  row: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (value == null || value === '') continue;
    return String(value);
  }
  return '';
}

function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
  const display = value == null || value === '' ? '—' : value;
  return (
    <div className="grid grid-cols-3 gap-3 py-1.5">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="col-span-2 text-sm text-gray-900">{display}</dd>
    </div>
  );
}

export function OpportunityTenantProfilePanel({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/tenants/${encodeURIComponent(tenantId)}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load tenant');
        }
        if (!cancelled) setTenant(json.data as Record<string, unknown>);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tenant');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading tenant information…</p>;
  }
  if (error || !tenant) {
    return (
      <p className="text-sm text-red-600">{error || 'Tenant not found.'}</p>
    );
  }

  const current = (tenant.currentAssignment || null) as Record<string, unknown> | null;
  const history = Array.isArray(tenant.assignmentHistory)
    ? (tenant.assignmentHistory as Record<string, unknown>[])
    : [];
  const fullName =
    `${pick(tenant, 'firstName', 'first_name')} ${pick(tenant, 'lastName', 'last_name')}`.trim() ||
    'Tenant';

  const photoUrl = pick(tenant, 'profilePictureUrl', 'profile_picture_url');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            name={fullName}
            src={photoUrl ? getImageUrl(photoUrl) : null}
            size="lg"
            className="h-14 w-14 flex-shrink-0 text-base"
          />
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900">{fullName}</p>
            <p className="text-sm text-gray-500 capitalize">
              {pick(tenant, 'tenantStatus', 'tenant_status') || '—'}
              {tenant.isTenant === true ? ' · current tenant' : ''}
            </p>
          </div>
        </div>
        <Link
          href={`/admin/tenants/${tenantId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline"
        >
          Open profile
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Contact
        </h3>
        <dl>
          <InfoRow label="Email" value={pick(tenant, 'email')} />
          <InfoRow label="Phone" value={pick(tenant, 'phone')} />
          <InfoRow
            label="Date of birth"
            value={formatDate(
              (tenant.dateOfBirth || tenant.date_of_birth) as string | Date | null
            )}
          />
          <InfoRow
            label="Previous address"
            value={pick(tenant, 'previousAddress', 'previous_address')}
          />
        </dl>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Emergency contact
        </h3>
        <dl>
          <InfoRow
            label="Name"
            value={pick(tenant, 'emergencyContactName', 'emergency_contact_name')}
          />
          <InfoRow
            label="Phone"
            value={pick(tenant, 'emergencyContactPhone', 'emergency_contact_phone')}
          />
          <InfoRow
            label="Relationship"
            value={pick(
              tenant,
              'emergencyContactRelationship',
              'emergency_contact_relationship'
            )}
          />
        </dl>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Employment
        </h3>
        <dl>
          <InfoRow
            label="Status"
            value={pick(tenant, 'employmentStatus', 'employment_status')}
          />
          <InfoRow
            label="Employer"
            value={pick(tenant, 'employerName', 'employer_name')}
          />
          <InfoRow
            label="Monthly income"
            value={formatMoney(
              (tenant.monthlyIncome ?? tenant.monthly_income) as number | string | null
            )}
          />
        </dl>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Property & room
        </h3>
        <dl>
          <InfoRow
            label="Property"
            value={
              pick(current, 'buildingName', 'building_name') ||
              pick(tenant, 'currentBuildingName') ||
              ''
            }
          />
          <InfoRow
            label="Current room"
            value={
              pick(current, 'roomNumber', 'room_number')
                ? `Room ${pick(current, 'roomNumber', 'room_number')}`
                : pick(tenant, 'currentRoomNumber')
                  ? `Room ${pick(tenant, 'currentRoomNumber')}`
                  : ''
            }
          />
          <InfoRow
            label="Current rent"
            value={formatMoney(
              (current?.monthlyRate ??
                current?.monthly_rate ??
                tenant.currentMonthlyRent) as number | string | null
            )}
          />
        </dl>
        {pick(current, 'roomId', 'room_id') ? (
          <Link
            href={`/admin/rooms/${pick(current, 'roomId', 'room_id')}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline"
          >
            Open room
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Lease
        </h3>
        <dl>
          <InfoRow
            label="Lease start"
            value={formatDate(
              (tenant.leaseStartDate || tenant.lease_start_date) as string | Date | null
            )}
          />
          <InfoRow
            label="Lease end"
            value={formatDate(
              (tenant.leaseEndDate || tenant.lease_end_date) as string | Date | null
            )}
          />
          <InfoRow
            label="Security deposit"
            value={formatMoney(
              (tenant.securityDeposit ?? tenant.security_deposit) as number | string | null
            )}
          />
        </dl>
      </section>

      {pick(tenant, 'notes') ? (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Notes
          </h3>
          <p className="whitespace-pre-wrap text-sm text-gray-800">
            {pick(tenant, 'notes')}
          </p>
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Assignment history
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No room assignments yet.</p>
        ) : (
          <ol className="space-y-2">
            {history.map((row, index) => (
              <li
                key={pick(row, 'id') || String(index)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <p className="text-sm font-medium text-gray-900">
                  {pick(row, 'buildingName', 'building_name')} · Room{' '}
                  {pick(row, 'roomNumber', 'room_number')}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate((row.startDate || row.start_date) as string | Date | null)}{' '}
                  –{' '}
                  {formatDate((row.endDate || row.end_date) as string | Date | null)}
                  {' · '}
                  {pick(row, 'assignmentStatus', 'assignment_status') || '—'}
                  {' · '}
                  {formatMoney(
                    (row.monthlyRate ?? row.monthly_rate) as number | string | null
                  )}
                  /mo
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export function OpportunityRoomProfilePanel({ roomId }: { roomId?: string }) {
  const [loading, setLoading] = useState(Boolean(roomId));
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!roomId) {
      setDetails(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/details`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load room');
        }
        if (!cancelled) setDetails(json.data as Record<string, unknown>);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load room');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (!roomId) {
    return (
      <p className="text-sm text-gray-500">
        Select a room on the Location tab to see unit details and occupancy history.
      </p>
    );
  }
  if (loading) {
    return <p className="text-sm text-gray-500">Loading room information…</p>;
  }
  if (error || !details) {
    return <p className="text-sm text-red-600">{error || 'Room not found.'}</p>;
  }

  const room = (details.room || {}) as Record<string, unknown>;
  const current = (details.currentTenant || null) as Record<string, unknown> | null;
  const history = Array.isArray(details.assignmentHistory)
    ? (details.assignmentHistory as Record<string, unknown>[])
    : [];
  const metrics = (details.occupancyMetrics || {}) as Record<string, unknown>;
  const amenitiesRaw = room.amenities;
  const amenities = Array.isArray(amenitiesRaw)
    ? amenitiesRaw.map(String).filter(Boolean)
    : String(amenitiesRaw || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  const occupantName =
    `${pick(current, 'firstName', 'first_name')} ${pick(current, 'lastName', 'last_name')}`.trim() ||
    pick(current, 'display_name', 'displayName');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-gray-900">
            Room {pick(room, 'roomNumber', 'room_number') || '—'}
          </p>
          <p className="text-sm text-gray-500 capitalize">
            {pick(room, 'buildingName', 'building_name') || '—'}
            {pick(room, 'roomStatus', 'room_status')
              ? ` · ${pick(room, 'roomStatus', 'room_status')}`
              : ''}
          </p>
        </div>
        <Link
          href={`/admin/rooms/${roomId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline"
        >
          Open room
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Unit details
        </h3>
        <dl>
          <InfoRow label="Floor" value={pick(room, 'floorNumber', 'floor_number')} />
          <InfoRow
            label="Type"
            value={pick(room, 'roomType', 'room_type')}
          />
          <InfoRow
            label="Size"
            value={
              pick(room, 'squareFootage', 'square_footage')
                ? `${pick(room, 'squareFootage', 'square_footage')} sq ft`
                : ''
            }
          />
          <InfoRow
            label="Monthly rate"
            value={formatMoney(
              (room.monthlyRate ?? room.monthly_rate) as number | string | null
            )}
          />
          <InfoRow
            label="Deposit"
            value={formatMoney(
              (room.depositAmount ?? room.deposit_amount) as number | string | null
            )}
          />
          <InfoRow
            label="Revenue unit"
            value={
              room.isRevenueUnit === false || room.is_revenue_unit === false
                ? 'No (admin/owner use)'
                : 'Yes'
            }
          />
        </dl>
      </section>

      {pick(room, 'description') ? (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Description
          </h3>
          <p className="whitespace-pre-wrap text-sm text-gray-800">
            {pick(room, 'description')}
          </p>
        </section>
      ) : null}

      {amenities.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Amenities
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {amenities.map((item) => (
              <span
                key={item}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
              >
                {item}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Current occupant
        </h3>
        {current ? (
          <dl>
            <InfoRow label="Tenant" value={occupantName} />
            <InfoRow label="Email" value={pick(current, 'email', 'display_email')} />
            <InfoRow label="Phone" value={pick(current, 'phone', 'display_phone')} />
            <InfoRow
              label="Since"
              value={formatDate(
                (current.startDate || current.start_date) as string | Date | null
              )}
            />
            <InfoRow
              label="Rent"
              value={formatMoney(
                (current.monthlyRate ?? current.monthly_rate) as number | string | null
              )}
            />
          </dl>
        ) : (
          <p className="text-sm text-gray-500">No active occupant.</p>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Occupancy
        </h3>
        <dl>
          <InfoRow
            label="Assignments"
            value={pick(metrics, 'total_assignments')}
          />
          <InfoRow
            label="Occupancy rate"
            value={
              metrics.occupancy_rate_percent != null
                ? `${Math.round(Number(metrics.occupancy_rate_percent))}%`
                : ''
            }
          />
          <InfoRow
            label="Avg stay"
            value={
              metrics.average_stay_duration_days != null
                ? `${Math.round(Number(metrics.average_stay_duration_days))} days`
                : ''
            }
          />
          <InfoRow
            label="Total revenue"
            value={formatMoney(metrics.total_revenue as number | string | null)}
          />
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Room history
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No occupancy history for this room.</p>
        ) : (
          <ol className="space-y-2">
            {history.map((row, index) => {
              const name =
                pick(row, 'display_name', 'displayName') ||
                `${pick(row, 'firstName', 'first_name')} ${pick(row, 'lastName', 'last_name')}`.trim() ||
                'Former occupant';
              return (
                <li
                  key={pick(row, 'id') || String(index)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <p className="text-sm font-medium text-gray-900">{name}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(
                      (row.startDate || row.start_date) as string | Date | null
                    )}{' '}
                    –{' '}
                    {formatDate((row.endDate || row.end_date) as string | Date | null)}
                    {' · '}
                    {pick(row, 'assignmentStatus', 'assignment_status') || '—'}
                    {' · '}
                    {formatMoney(
                      (row.monthlyRate ?? row.monthly_rate) as number | string | null
                    )}
                    /mo
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
