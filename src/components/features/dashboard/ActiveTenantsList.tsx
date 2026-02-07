'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Users, AlertCircle, CheckCircle2, ArrowRight, DollarSign } from 'lucide-react';

interface ActiveTenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roomNumber?: string;
  buildingName?: string;
  buildingId?: string;
  balance: number;
  pastDueAmount: number;
  overdueCount: number;
  daysPastDue: number;
  leaseStart?: string;
  leaseEnd?: string;
}

export default function ActiveTenantsList() {
  const [tenants, setTenants] = useState<ActiveTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActiveTenants();
  }, []);

  const fetchActiveTenants = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/dashboard/active-tenants');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setTenants(data.data.tenants || []);
      } else {
        console.error('API returned error:', data.error);
        setTenants([]);
      }
    } catch (error) {
      console.error('Error fetching active tenants:', error);
      setTenants([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const uniqueTenants = useMemo(() => {
    const seen = new Set<string>();
    return tenants.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [tenants]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2 text-purple-600" />
            Active Tenants
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <Users className="h-5 w-5 mr-2 text-purple-600" />
          Active Tenants
        </h3>
        <Link
          href="/admin/tenants"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          View All <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No active tenants found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {uniqueTenants.map((tenant) => (
            <Link
              key={tenant.id}
              href={`/admin/tenants/${tenant.id}`}
              className="block p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900">
                      {tenant.firstName} {tenant.lastName}
                    </h4>
                    {tenant.overdueCount > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {tenant.overdueCount} overdue
                      </span>
                    ) : tenant.balance > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Balance due
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {tenant.roomNumber && tenant.buildingName && (
                      <p>
                        {tenant.buildingName} - Room {tenant.roomNumber}
                      </p>
                    )}
                    {tenant.balance > 0 && (
                      <p className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        Balance: {formatCurrency(tenant.balance)}
                        {tenant.pastDueAmount > 0 && (
                          <span className="ml-2 text-red-600">
                            ({formatCurrency(tenant.pastDueAmount)} past due)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
