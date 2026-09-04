'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Pencil,
  Printer,
  Upload,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  Badge,
  Checkbox,
  Dialog,
  FileDropzone,
  Input,
  Select,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  TableCard,
  WorkItemHeader,
  WorkItemRow,
  type WorkItemBadge,
  type WorkItemTone,
} from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useNotifications } from '@/hooks/useNotifications';
import type {
  ApartmentBuildingSheet,
  ApartmentExpenseItem,
  ApartmentPayStatus,
  ApartmentRecordsData,
  ApartmentUnitBlock,
} from '@/lib/apartment-records-types';

function buildingTabOrder(name: string): number {
  const upper = name.toUpperCase();
  if (upper.includes('BALIBAGO')) return 0;
  if (upper.includes('VILLASOL')) return 1;
  return 2;
}

function sheetPeriodSummary(sheet: ApartmentBuildingSheet) {
  const netIncome = Math.round((sheet.collection - sheet.expenseTotal) * 100) / 100;
  return {
    collection: sheet.collection,
    expenses: sheet.expenseTotal,
    electricTotal: sheet.electricTotal,
    waterTotal: sheet.waterTotal,
    netIncome,
    grandTotal: netIncome,
    cashAllowance: 0,
    cheque: 0,
  };
}

interface ImportPreviewRow {
  buildingKey: string;
  unitKey: string;
  unitLabel: string;
  electric: number | null;
  water: number | null;
  electricStatus: 'pending' | 'paid';
  waterStatus: 'pending' | 'paid';
  matched: boolean;
  buildingName: string | null;
}

interface ImportPreview {
  fileName: string;
  rows: ImportPreviewRow[];
  matched: number;
  unmatched: number;
}

function statusTone(status: ApartmentPayStatus): WorkItemTone {
  if (status === 'paid' || status === 'newTenant') return 'success';
  if (status === 'partial') return 'warning';
  if (status === 'unpaid') return 'danger';
  return 'neutral';
}

function unitRentAmount(unit: ApartmentUnitBlock): number | null {
  if (unit.payStatus === 'vacant') return unit.monthlyRate > 0 ? unit.monthlyRate : null;
  const rentLine = unit.lines.find((line) => line.kind === 'rent' && line.amountPaid);
  if (rentLine?.amountPaid) return rentLine.amountPaid;
  if (unit.monthlyRate > 0) return unit.monthlyRate;
  return null;
}

function paymentStatusBadges(unit: ApartmentUnitBlock): WorkItemBadge[] {
  const badges: WorkItemBadge[] = [];
  if (unit.payStatus === 'vacant') {
    badges.push({ key: 'rent', label: 'Rent vacant', tone: 'neutral' });
  } else if (unit.payStatus === 'partial') {
    badges.push({ key: 'rent', label: 'Rent partial', tone: 'warning' });
  } else if (unit.payStatus === 'unpaid') {
    badges.push({ key: 'rent', label: 'Rent unpaid', tone: 'danger' });
  } else {
    badges.push({ key: 'rent', label: 'Rent paid', tone: 'success' });
  }

  const electric = unitUtilityAmount(unit, 'electric');
  if (electric != null) {
    const unpaid = utilityUnpaid(unit, 'electric');
    badges.push({
      key: 'electric',
      label: unpaid ? 'Electric unpaid' : 'Electric paid',
      tone: unpaid ? 'danger' : 'success',
    });
  }

  const water = unitUtilityAmount(unit, 'water');
  if (water != null) {
    const unpaid = utilityUnpaid(unit, 'water');
    badges.push({
      key: 'water',
      label: unpaid ? 'Water unpaid' : 'Water paid',
      tone: unpaid ? 'danger' : 'success',
    });
  }

  return badges;
}

function unitDatePaid(unit: ApartmentUnitBlock): string | null {
  return unit.lines.find((line) => line.datePaid)?.datePaid || null;
}

function unitUtilityAmount(unit: ApartmentUnitBlock, kind: 'electric' | 'water'): number | null {
  const line = unit.lines.find((row) => row.kind === kind);
  if (!line) return null;
  return kind === 'electric' ? line.electric : line.water;
}

function utilityUnpaid(unit: ApartmentUnitBlock, kind: 'electric' | 'water'): boolean {
  return Boolean(unit.lines.find((row) => row.kind === kind)?.unpaid);
}

function utilityPaidLocked(unit: ApartmentUnitBlock, kind: 'electric' | 'water'): boolean {
  return unitUtilityAmount(unit, kind) != null && !utilityUnpaid(unit, kind);
}

function draftFromUnit(unit: ApartmentUnitBlock): UtilityDraft {
  const electric = unitUtilityAmount(unit, 'electric');
  const water = unitUtilityAmount(unit, 'water');
  return {
    electric: electric != null ? String(electric) : '',
    water: water != null ? String(water) : '',
  };
}

function parseDraftAmount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100) / 100;
}

export default function ApartmentRecordsView({ data }: { data: ApartmentRecordsData }) {
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<string>('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UtilityDraft>>({});
  const [billStatus, setBillStatus] = useState<'pending' | 'paid'>('pending');
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const selectedBuilding = data.buildingId || 'ALL';

  const setQuery = (next: { month?: string; buildingId?: string }) => {
    const params = new URLSearchParams();
    const month = next.month ?? data.monthKey;
    const buildingId = next.buildingId ?? selectedBuilding;
    if (month) params.set('month', month);
    if (buildingId && buildingId !== 'ALL') params.set('buildingId', buildingId);
    const qs = params.toString();
    router.push(qs ? `/admin/reports/apartment-records?${qs}` : '/admin/reports/apartment-records');
  };

  const orderedSheets = useMemo(() => {
    return [...data.sheets].sort(
      (left, right) =>
        buildingTabOrder(left.shortName || left.name) -
        buildingTabOrder(right.shortName || right.name)
    );
  }, [data.sheets]);

  const showBuildingTabs = !data.buildingId && orderedSheets.length > 1;
  const activeSheet =
    orderedSheets.find((sheet) => sheet.buildingId === activeTab) || orderedSheets[0] || null;

  useEffect(() => {
    if (orderedSheets.length === 0) return;
    if (!orderedSheets.some((sheet) => sheet.buildingId === activeTab)) {
      setActiveTab(orderedSheets[0].buildingId);
    }
  }, [orderedSheets, activeTab]);

  const visibleUnits = useMemo(() => (activeSheet ? activeSheet.units : []), [activeSheet]);
  const visibleIds = useMemo(() => visibleUnits.map((unit) => unit.roomId), [visibleUnits]);
  const unitsById = useMemo(
    () => new Map(visibleUnits.map((unit) => [unit.roomId, unit])),
    [visibleUnits]
  );

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = prev.filter((id) => visibleIds.includes(id));
      return next.length === prev.length ? prev : next;
    });
  }, [visibleIds]);

  const applySelection = (ids: string[]) => {
    const unique = [...new Set(ids)];
    setSelectedIds(unique);
    setDrafts((prev) => {
      const next: Record<string, UtilityDraft> = {};
      for (const roomId of unique) {
        const unit = unitsById.get(roomId);
        next[roomId] = prev[roomId] || (unit ? draftFromUnit(unit) : { electric: '', water: '' });
      }
      return next;
    });
  };

  const toggleUnit = (roomId: string) => {
    applySelection(
      selectedIds.includes(roomId)
        ? selectedIds.filter((id) => id !== roomId)
        : [...selectedIds, roomId]
    );
  };

  const toggleSheet = (units: ApartmentUnitBlock[]) => {
    const ids = units.map((unit) => unit.roomId);
    const allOn = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    applySelection(
      allOn ? selectedIds.filter((id) => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])]
    );
  };

  const setDraftValue = (roomId: string, field: keyof UtilityDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [roomId]: {
        electric: prev[roomId]?.electric ?? '',
        water: prev[roomId]?.water ?? '',
        [field]: value,
      },
    }));
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds([]);
    setDrafts({});
    setBillStatus('pending');
  };

  const saveBulk = async () => {
    const updates = selectedIds
      .map((roomId) => {
        const unit = unitsById.get(roomId);
        return {
          roomId,
          electric:
            unit && utilityPaidLocked(unit, 'electric')
              ? null
              : parseDraftAmount(drafts[roomId]?.electric ?? ''),
          water:
            unit && utilityPaidLocked(unit, 'water')
              ? null
              : parseDraftAmount(drafts[roomId]?.water ?? ''),
        };
      })
      .filter((row) => row.electric != null || row.water != null);

    if (updates.length === 0) {
      const onlyPaid = selectedIds.some((roomId) => {
        const unit = unitsById.get(roomId);
        return unit && (utilityPaidLocked(unit, 'electric') || utilityPaidLocked(unit, 'water'));
      });
      showNotification({
        type: 'warning',
        title: onlyPaid ? 'Paid bills locked' : 'Amount required',
        message: onlyPaid
          ? 'Paid electric and water cannot be edited. Tick unpaid units, or units with no bill yet.'
          : 'Enter an electric or water amount on at least one selected unit.',
      });
      return;
    }

    const invalid = updates.find(
      (row) =>
        (row.electric != null && row.electric <= 0) || (row.water != null && row.water <= 0)
    );
    if (invalid) {
      showNotification({
        type: 'warning',
        title: 'Amount required',
        message: 'Electric and water amounts must be greater than zero.',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/reports/apartment-records/utilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates,
          startDate: data.startDate,
          endDate: data.endDate,
          billStatus,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to save utilities');
      }
      showNotification({
        type: 'success',
        title: 'Utilities saved',
        message: json.message || `Updated ${updates.length} units`,
      });
      exitBulkMode();
      router.refresh();
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Could not save',
        message: err instanceof Error ? err.message : 'Failed to save utilities',
      });
    } finally {
      setSaving(false);
    }
  };

  const closeImport = () => {
    if (importing) return;
    setImportOpen(false);
    setImportFile(null);
    setImportPreview(null);
  };

  const postImport = async (file: File, dryRun: boolean) => {
    const form = new FormData();
    form.append('file', file);
    form.append('startDate', data.startDate);
    form.append('endDate', data.endDate);
    form.append('dryRun', dryRun ? 'true' : 'false');
    if (data.buildingId) form.append('buildingId', data.buildingId);
    const response = await fetch('/api/reports/apartment-records/import', {
      method: 'POST',
      body: form,
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Failed to import apartment records');
    }
    return json;
  };

  const previewImportFile = async (file: File) => {
    setImportFile(file);
    setImportPreview(null);
    setImporting(true);
    try {
      const json = await postImport(file, true);
      setImportPreview(json.data as ImportPreview);
    } catch (err) {
      setImportFile(null);
      showNotification({
        type: 'error',
        title: 'Could not read file',
        message: err instanceof Error ? err.message : 'Failed to preview import',
      });
    } finally {
      setImporting(false);
    }
  };

  const commitImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const json = await postImport(importFile, false);
      showNotification({
        type: 'success',
        title: 'Import saved',
        message: json.message || 'Utilities imported',
      });
      setImportOpen(false);
      setImportFile(null);
      setImportPreview(null);
      router.refresh();
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Could not import',
        message: err instanceof Error ? err.message : 'Failed to import apartment records',
      });
    } finally {
      setImporting(false);
    }
  };

  const s = showBuildingTabs && activeSheet ? sheetPeriodSummary(activeSheet) : data.summary;
  const summaryLabel = showBuildingTabs && activeSheet
    ? `${activeSheet.shortName} · ${data.periodLabel}`
    : data.periodLabel;

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title="Apartment records"
        description="Who paid in each building this cycle, with expenses and a period summary."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link href="/admin/reports">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All reports
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Apartment</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <BuildingChip
                active={selectedBuilding === 'ALL'}
                onClick={() => setQuery({ buildingId: 'ALL' })}
                label="See all"
              />
              {data.buildings
                .slice()
                .sort(
                  (left, right) =>
                    buildingTabOrder(left.shortName) - buildingTabOrder(right.shortName)
                )
                .map((building) => (
                  <BuildingChip
                    key={building.id}
                    active={selectedBuilding === building.id}
                    onClick={() => setQuery({ buildingId: building.id })}
                    label={building.shortName}
                  />
                ))}
            </div>
          </div>
          <label className="text-sm text-gray-600">
            Billing period
            <select
              value={data.monthKey}
              onChange={(event) => setQuery({ month: event.target.value })}
              className="ml-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800"
            >
              {(data.availableMonths.length > 0
                ? data.availableMonths
                : [{ value: data.monthKey, label: data.periodLabel }]
              ).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.9fr)]">
        <div className="space-y-5">
          {orderedSheets.length === 0 ? (
            <TableCard title="Tenants">
              <p className="px-6 py-8 text-sm text-gray-500">No units in this view</p>
            </TableCard>
          ) : showBuildingTabs ? (
            <Tabs value={activeSheet?.buildingId || orderedSheets[0].buildingId} onValueChange={setActiveTab}>
              <TenantListToolbar
                bulkMode={bulkMode}
                billStatus={billStatus}
                saving={saving}
                onBillStatusChange={setBillStatus}
                onToggleBulk={() => (bulkMode ? exitBulkMode() : setBulkMode(true))}
                onImport={() => setImportOpen(true)}
                onSave={() => void saveBulk()}
              >
                <TabList className="mb-0 border-b-0 px-1">
                  {orderedSheets.map((sheet) => (
                    <Tab key={sheet.buildingId} value={sheet.buildingId}>
                      {sheet.shortName}
                    </Tab>
                  ))}
                </TabList>
              </TenantListToolbar>
              {orderedSheets.map((sheet) => (
                <TabPanel key={sheet.buildingId} value={sheet.buildingId} className="pt-4">
                  <BuildingTenantList
                    sheet={sheet}
                    bulkMode={bulkMode}
                    selectedIds={selectedIds}
                    drafts={drafts}
                    onToggleUnit={toggleUnit}
                    onToggleSheet={() => toggleSheet(sheet.units)}
                    onDraftChange={setDraftValue}
                  />
                </TabPanel>
              ))}
            </Tabs>
          ) : (
            <div className="space-y-4">
              <TenantListToolbar
                bulkMode={bulkMode}
                billStatus={billStatus}
                saving={saving}
                onBillStatusChange={setBillStatus}
                onToggleBulk={() => (bulkMode ? exitBulkMode() : setBulkMode(true))}
                onImport={() => setImportOpen(true)}
                onSave={() => void saveBulk()}
              />
              {orderedSheets.map((sheet) => (
                <BuildingTenantList
                  key={sheet.buildingId}
                  sheet={sheet}
                  bulkMode={bulkMode}
                  selectedIds={selectedIds}
                  drafts={drafts}
                  onToggleUnit={toggleUnit}
                  onToggleSheet={() => toggleSheet(sheet.units)}
                  onDraftChange={setDraftValue}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-4">
          <ExpensePanel
            periodLabel={data.periodShortLabel}
            items={data.expenses}
            showBuilding={!data.buildingId && data.buildings.length > 1}
            total={data.summary.expenses}
          />
          <TableCard title="Period summary" description={summaryLabel}>
            <SummaryRow label="Total collection" value={s.collection} />
            <SummaryRow label="Electric" value={s.electricTotal} variant="note" />
            <SummaryRow label="Water" value={s.waterTotal} variant="note" />
            <SummaryRow label="Less expenses" value={s.expenses} variant="deduct" />
            <SummaryRow label="Net income" value={s.netIncome} variant="subtotal" />
            {s.cashAllowance !== 0 && (
              <SummaryRow label="Ima cash allowance" value={s.cashAllowance} variant="deduct" />
            )}
            {s.cheque !== 0 && <SummaryRow label="Hardware / cheque" value={s.cheque} />}
            <SummaryRow label="Grand total" value={s.grandTotal} variant="total" />
          </TableCard>
        </aside>
      </div>

      <Dialog
        isOpen={importOpen}
        onClose={closeImport}
        title="Import CSV"
        description={`Electric and water from the APRT. RECORDS spreadsheet will be saved to ${data.periodShortLabel}. Rent and expenses are not imported.`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeImport} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={() => void commitImport()}
              isLoading={importing}
              disabled={!importPreview || importPreview.matched === 0}
            >
              Import {importPreview && importPreview.matched > 0 ? `${importPreview.matched} units` : ''}
            </Button>
          </>
        }
      >
        <FileDropzone
          accept=".xlsx,.xlsm,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          label="Drop the apartment records spreadsheet or CSV"
          hint="Same layout as APRT. RECORDS (Balibago left, Villasol right), or building,unit,electric,water CSV."
          disabled={importing}
          onFiles={(files) => {
            const file = files[0];
            if (file) void previewImportFile(file);
          }}
          className="mb-4"
        />
        <p className="mb-3 text-xs text-gray-500">
          Need a simple file?{' '}
          <a
            href="/api/reports/apartment-records/import"
            className="font-medium text-gray-800 underline"
          >
            Download CSV template
          </a>
        </p>
        {importFile ? (
          <p className="mb-2 text-sm text-gray-700">
            {importFile.name}
            {importPreview
              ? ` · ${importPreview.matched} matched, ${importPreview.unmatched} unmatched`
              : importing
                ? ' · Reading…'
                : ''}
          </p>
        ) : null}
        {importPreview && importPreview.unmatched > 0 ? (
          <p className="mb-2 text-sm text-amber-700">
            {importPreview.unmatched} row{importPreview.unmatched === 1 ? '' : 's'} did not match a
            Balibago or Villasol room and will be skipped.
          </p>
        ) : null}
        {importPreview ? (
          <div className="max-h-64 overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2 text-right">Electric</th>
                  <th className="px-3 py-2 text-right">Water</th>
                  <th className="px-3 py-2">Match</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.rows.map((row, index) => (
                  <tr key={`${row.buildingKey}-${row.unitKey}-${index}`} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-gray-800">
                      {row.buildingName || row.buildingKey} {row.unitLabel}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">
                      {row.electric != null ? formatCurrency(row.electric) : '—'}
                      {row.electric != null ? (
                        <span className="ml-1 text-gray-400">
                          {row.electricStatus === 'paid' ? 'paid' : 'unpaid'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">
                      {row.water != null ? formatCurrency(row.water) : '—'}
                      {row.water != null ? (
                        <span className="ml-1 text-gray-400">
                          {row.waterStatus === 'paid' ? 'paid' : 'unpaid'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-1.5">
                      {row.matched ? (
                        <span className="text-emerald-600">Matched</span>
                      ) : (
                        <span className="text-rose-600">No room</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function TenantListToolbar({
  bulkMode,
  billStatus,
  saving,
  onBillStatusChange,
  onToggleBulk,
  onImport,
  onSave,
  children,
}: {
  bulkMode: boolean;
  billStatus: 'pending' | 'paid';
  saving: boolean;
  onBillStatusChange: (status: 'pending' | 'paid') => void;
  onToggleBulk: () => void;
  onImport: () => void;
  onSave: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200">
        <div className="min-w-0 flex-1">{children}</div>
        <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={onImport}
          >
            Import CSV
          </Button>
          {bulkMode ? (
            <>
              <Select
                size="sm"
                value={billStatus}
                onChange={(event) =>
                  onBillStatusChange(event.target.value === 'paid' ? 'paid' : 'pending')
                }
                className="w-28"
                aria-label="Bill status"
              >
                <option value="pending">Unpaid</option>
                <option value="paid">Paid</option>
              </Select>
              <Button
                type="button"
                size="sm"
                leftIcon={<Zap className="h-4 w-4" />}
                onClick={onSave}
                isLoading={saving}
              >
                Save utilities
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant={bulkMode ? 'outline' : 'primary'}
            size="sm"
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={onToggleBulk}
          >
            {bulkMode ? 'Done' : 'Edit bulk'}
          </Button>
        </div>
      </div>
      {bulkMode ? (
        <p className="pt-2 text-sm text-gray-600">
          Tick units on the left. Unpaid electric and water become amount fields. Paid bills stay locked.
        </p>
      ) : null}
    </div>
  );
}

function BuildingChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        active
          ? 'bg-gray-900 text-white'
          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

const RENT_COL = 'w-24 shrink-0';
const DATE_COL = 'w-[6.25rem] shrink-0';
const UTILITY_COL = 'w-[5.75rem] shrink-0';
const STATUS_COL = 'w-[15.5rem] shrink-0';

function BuildingTenantList({
  sheet,
  bulkMode,
  selectedIds,
  drafts,
  onToggleUnit,
  onToggleSheet,
  onDraftChange,
}: {
  sheet: ApartmentBuildingSheet;
  bulkMode: boolean;
  selectedIds: string[];
  drafts: Record<string, UtilityDraft>;
  onToggleUnit: (roomId: string) => void;
  onToggleSheet: () => void;
  onDraftChange: (roomId: string, field: keyof UtilityDraft, value: string) => void;
}) {
  const sheetIds = sheet.units.map((unit) => unit.roomId);
  const selectedInSheet = sheetIds.filter((id) => selectedIds.includes(id)).length;
  const allSelected = sheetIds.length > 0 && selectedInSheet === sheetIds.length;

  return (
    <TableCard>
      {sheet.units.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-500">No units match this status</p>
      ) : (
        <div className="max-h-[min(42rem,calc(100vh-16rem))] overflow-auto">
          <WorkItemHeader
            className="sticky top-0 z-10 bg-slate-50"
            leading={
              bulkMode ? (
                <Checkbox
                  checked={allSelected}
                  onChange={onToggleSheet}
                  aria-label={allSelected ? 'Clear selection' : 'Select all units'}
                />
              ) : null
            }
            title="Tenant"
            showStatus={false}
            showDate={false}
            showMeta={false}
            showTrailing={false}
            extra={
              <>
                <span className={`${RENT_COL} text-right`}>Rent</span>
                <span className={`${DATE_COL} text-right`}>Date</span>
                <span className={`${UTILITY_COL} text-right`}>Electric</span>
                <span className={`${UTILITY_COL} text-right`}>Water</span>
                <span className={`${STATUS_COL} text-right`}>Status</span>
              </>
            }
          />
          {sheet.units.map((unit) => (
            <UnitRecordRow
              key={unit.roomId}
              unit={unit}
              bulkMode={bulkMode}
              selected={selectedIds.includes(unit.roomId)}
              draft={drafts[unit.roomId]}
              onToggle={() => onToggleUnit(unit.roomId)}
              onDraftChange={onDraftChange}
            />
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3 border-t-2 border-gray-900 bg-gray-50 px-6 py-3.5">
        <span className="text-sm font-semibold text-gray-900">{sheet.shortName} collection</span>
        <div className="flex flex-wrap items-end gap-6">
          <LedgerFootNote label="Electric" value={sheet.electricTotal} />
          <LedgerFootNote label="Water" value={sheet.waterTotal} />
          <LedgerFootNote label="Total" value={sheet.collection} emphasize />
        </div>
      </div>
    </TableCard>
  );
}

function UnitRecordRow({
  unit,
  bulkMode,
  selected,
  draft,
  onToggle,
  onDraftChange,
}: {
  unit: ApartmentUnitBlock;
  bulkMode: boolean;
  selected: boolean;
  draft?: UtilityDraft;
  onToggle: () => void;
  onDraftChange: (roomId: string, field: keyof UtilityDraft, value: string) => void;
}) {
  const rent = unitRentAmount(unit);
  const datePaid = unitDatePaid(unit);
  const statusBadges = paymentStatusBadges(unit);

  return (
    <WorkItemRow
      href={bulkMode ? undefined : unit.href}
      leading={
        bulkMode ? (
          <Checkbox
            checked={selected}
            onChange={onToggle}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Select ${unit.unit}`}
          />
        ) : null
      }
      title={unit.tenantName || (unit.payStatus === 'vacant' ? 'Vacant' : unit.unit)}
      subtitle={unit.unit}
      showBadges={false}
      showDate={false}
      showMeta={false}
      showTrailing={false}
      extra={
        <>
          <div className={`${RENT_COL} text-right`}>
            <span
              className={`text-xs tabular-nums ${
                rent == null ? 'text-gray-300' : 'text-gray-900'
              }`}
            >
              {rent == null ? '—' : formatCurrency(rent)}
            </span>
          </div>
          <div className={`${DATE_COL} flex items-center justify-end gap-1 text-xs text-gray-600`}>
            {datePaid ? (
              <>
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span className="tabular-nums">{datePaid}</span>
              </>
            ) : (
              <span className="text-gray-300">—</span>
            )}
          </div>
          <UtilityAmountCell
            label={`Electric for ${unit.unit}`}
            amount={unitUtilityAmount(unit, 'electric')}
            unpaid={utilityUnpaid(unit, 'electric')}
            editing={selected && !utilityPaidLocked(unit, 'electric')}
            value={draft?.electric ?? ''}
            onChange={(value) => onDraftChange(unit.roomId, 'electric', value)}
          />
          <UtilityAmountCell
            label={`Water for ${unit.unit}`}
            amount={unitUtilityAmount(unit, 'water')}
            unpaid={utilityUnpaid(unit, 'water')}
            editing={selected && !utilityPaidLocked(unit, 'water')}
            value={draft?.water ?? ''}
            onChange={(value) => onDraftChange(unit.roomId, 'water', value)}
          />
          <div className={`${STATUS_COL} flex flex-wrap items-center justify-end gap-1`}>
            {statusBadges.map((badge) => (
              <Badge key={badge.key} variant="dot" tone={badge.tone || 'neutral'}>
                {badge.label}
              </Badge>
            ))}
          </div>
        </>
      }
      dotTone={statusTone(unit.payStatus)}
      className={selected ? 'bg-sky-50/70 hover:bg-sky-50/80' : undefined}
    />
  );
}

function UtilityAmountCell({
  label,
  amount,
  unpaid,
  editing,
  value,
  onChange,
}: {
  label: string;
  amount: number | null;
  unpaid: boolean;
  editing: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  if (editing) {
    return (
      <div className={UTILITY_COL}>
        <Input
          size="sm"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          className="px-1.5 py-1 text-right tabular-nums"
          aria-label={label}
        />
      </div>
    );
  }

  return (
    <div className={`${UTILITY_COL} text-right`}>
      <span
        className={`text-xs tabular-nums ${
          amount == null ? 'text-gray-300' : unpaid ? 'text-rose-600' : 'text-gray-900'
        }`}
        title={!unpaid && amount != null ? 'Paid — cannot edit' : undefined}
      >
        {amount == null ? '—' : formatCurrency(amount)}
      </span>
    </div>
  );
}

function ExpensePanel({
  periodLabel,
  items,
  showBuilding,
  total,
}: {
  periodLabel: string;
  items: ApartmentExpenseItem[];
  showBuilding: boolean;
  total: number;
}) {
  const unique = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [items]);

  return (
    <TableCard
      title="Expenses"
      description={periodLabel}
      actions={
        <Link
          href="/admin/financial/expenses"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          View all
        </Link>
      }
    >
      {unique.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-500">No expenses this period</p>
      ) : (
        <div className="max-h-[28rem] overflow-auto">
          {unique.map((item) => (
            <Link
              key={item.id}
              href={`/admin/financial/expenses/${item.id}`}
              className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-2.5 last:border-b-0 hover:bg-slate-50/80"
            >
              <div className="min-w-0">
                <p className="text-sm leading-snug text-gray-900">{item.description}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {[item.categoryLabel, showBuilding ? item.buildingName : null, item.date]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span className="shrink-0 text-right text-sm tabular-nums text-gray-900">
                {formatCurrency(item.amount)}
              </span>
            </Link>
          ))}
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4 border-t-2 border-gray-900 bg-gray-50 px-6 py-3.5">
        <span className="text-sm font-semibold text-gray-900">Total expenses</span>
        <span className="text-xl font-semibold tabular-nums text-gray-900">
          {formatCurrency(total)}
        </span>
      </div>
    </TableCard>
  );
}

function LedgerFootNote({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div className="text-right">
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div
        className={
          emphasize
            ? 'text-xl font-semibold tabular-nums text-gray-900'
            : 'text-sm tabular-nums text-gray-700'
        }
      >
        {formatCurrency(value)}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  variant = 'line',
}: {
  label: string;
  value: number;
  variant?: 'line' | 'note' | 'deduct' | 'subtotal' | 'total';
}) {
  const display =
    variant === 'deduct' ? `(${formatCurrency(Math.abs(value))})` : formatCurrency(value);

  if (variant === 'total') {
    return (
      <div className="flex items-baseline justify-between gap-4 border-t-2 border-gray-900 bg-gray-50 px-6 py-3.5">
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        <span className="text-xl font-semibold tabular-nums text-gray-900">{display}</span>
      </div>
    );
  }

  const rowClass =
    variant === 'subtotal'
      ? 'flex items-center justify-between gap-4 border-t border-gray-300 px-6 py-2.5'
      : variant === 'note'
        ? 'flex items-center justify-between gap-4 px-6 py-1.5 pl-10'
        : 'flex items-center justify-between gap-4 px-6 py-2.5';
  const labelClass =
    variant === 'subtotal'
      ? 'text-sm font-medium text-gray-900'
      : variant === 'note'
        ? 'text-xs text-gray-500'
        : variant === 'deduct'
          ? 'text-sm text-gray-600'
          : 'text-sm text-gray-600';
  const valueClass =
    variant === 'subtotal'
      ? 'text-sm font-medium tabular-nums text-gray-900'
      : variant === 'note'
        ? 'text-xs tabular-nums text-gray-500'
        : variant === 'deduct'
          ? 'text-sm tabular-nums text-rose-700'
          : 'text-sm tabular-nums text-gray-900';

  return (
    <div className={rowClass}>
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{display}</span>
    </div>
  );
}
