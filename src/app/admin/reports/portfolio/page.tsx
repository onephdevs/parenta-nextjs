'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Printer,
  Layers,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import type { PortfolioReportData } from '@/lib/services/portfolio-report';

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export default function PortfolioReportPage() {
  const { data: session, status } = useSession();
  const { showNotification } = useNotifications();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [buildings, setBuildings] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<PortfolioReportData | null>(null);
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      redirect('/auth/signin');
    }

    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);

    fetch('/api/buildings?limit=100')
      .then((r) => r.json())
      .then((data) => {
        const list = data.data?.buildings || data.buildings || data.data || [];
        setBuildings(
          (Array.isArray(list) ? list : []).map(
            (b: { id: string; name: string }) => ({
              id: b.id,
              name: b.name,
            })
          )
        );
      })
      .catch(() => undefined);
  }, [session, status]);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      showNotification({
        type: 'warning',
        title: 'Date Required',
        message: 'Please select both start and end dates',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (buildingId) params.set('buildingId', buildingId);
      const response = await fetch(`/api/reports/portfolio?${params}`);
      const data = await response.json();
      if (data.success) {
        setReportData(data.data);
        showNotification({
          type: 'success',
          title: 'Report Generated',
          message: 'Portfolio rollup ready',
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to generate report',
        });
      }
    } catch {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate portfolio report',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const occ = reportData?.occupancy;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Portfolio Rollup"
        description="Unit → property → portfolio-wide (all properties combined)"
        actions={
          <Link href="/admin/reports">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All reports
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Date range</h2>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <FormField label="From" htmlFor="startDate">
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </FormField>
          <FormField label="To" htmlFor="endDate">
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </FormField>
          <FormField label="Property (optional)" htmlFor="buildingId">
            <Select
              id="buildingId"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
            >
              <option value="">All properties (portfolio)</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex items-end gap-2">
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Layers className="h-4 w-4 mr-2" />
              )}
              Generate
            </Button>
            {reportData && (
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
          </div>
        </div>
      </Card>

      {reportData && occ && (
        <>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Portfolio occupancy
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {occ.totalUnits} total = {occ.occupied} occupied + {occ.vacant}{' '}
                vacant + {occ.unassigned} unassigned
                {occ.reconciles ? '' : ' — integrity check failed'}
              </p>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Period collection</p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatPhp(reportData.periodCollection)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Previous total</p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatPhp(reportData.lifetime.previousTotal)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Overall collection</p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatPhp(reportData.lifetime.overallCollection)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Est. lost rent (vacant)</p>
                <p className="text-xl font-semibold tabular-nums text-amber-700">
                  {formatPhp(reportData.vacancy.totalEstimatedLostRent)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Owner-absorbed vacant utilities in period:{' '}
              {formatPhp(reportData.vacancy.ownerAbsorbedUtility)}
            </p>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                By property
              </h2>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Property</th>
                    <th className="pb-2 text-right">Units</th>
                    <th className="pb-2 text-right">Occ / Vac / Un</th>
                    <th className="pb-2 text-right">Collection</th>
                    <th className="pb-2 text-right">Lost rent</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {reportData.properties.map((p) => (
                    <React.Fragment key={p.buildingId}>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 font-medium">{p.buildingName}</td>
                        <td className="py-2 text-right">
                          {p.occupancy.totalUnits}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {p.occupancy.occupied} / {p.occupancy.vacant} /{' '}
                          {p.occupancy.unassigned}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatPhp(p.periodCollection)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatPhp(p.estimatedLostRent)}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            className="text-blue-600 text-xs hover:underline"
                            onClick={() =>
                              setExpandedBuilding(
                                expandedBuilding === p.buildingId
                                  ? null
                                  : p.buildingId
                              )
                            }
                          >
                            {expandedBuilding === p.buildingId
                              ? 'Hide units'
                              : 'Units'}
                          </button>
                        </td>
                      </tr>
                      {expandedBuilding === p.buildingId && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50 px-4 py-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-gray-500">
                                  <th className="pb-1">Unit</th>
                                  <th className="pb-1">Status</th>
                                  <th className="pb-1">Tenant</th>
                                  <th className="pb-1 text-right">Days vacant</th>
                                  <th className="pb-1 text-right">Lost rent</th>
                                  <th className="pb-1 text-right">Owner util.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.units.map((u) => (
                                  <tr key={u.roomId}>
                                    <td className="py-1">{u.roomNumber}</td>
                                    <td className="py-1 capitalize">
                                      {u.occupancyBucket}
                                    </td>
                                    <td className="py-1">
                                      {u.tenantName || '—'}
                                    </td>
                                    <td className="py-1 text-right">
                                      {u.daysVacant ?? '—'}
                                    </td>
                                    <td className="py-1 text-right">
                                      {u.estimatedLostRent != null
                                        ? formatPhp(u.estimatedLostRent)
                                        : '—'}
                                    </td>
                                    <td className="py-1 text-right">
                                      {formatPhp(u.ownerAbsorbedUtility)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
