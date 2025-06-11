'use client';

import Link from 'next/link';
import { Tenant } from '@/types/database';

interface TenantCardProps {
  tenant: Tenant;
}

export default function TenantCard({ tenant }: TenantCardProps) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'terminated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
      <div className="p-6">
        {/* Header with name and status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-lg font-medium text-purple-600">
                  {tenant.firstName.charAt(0)}{tenant.lastName.charAt(0)}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                {tenant.firstName} {tenant.lastName}
              </h3>
              <p className="text-sm text-gray-500">{tenant.email}</p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(tenant.tenantStatus)}`}>
            {tenant.tenantStatus}
          </span>
        </div>

        {/* Contact Information */}
        <div className="space-y-3">
          <div className="flex items-center text-sm">
            <svg className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-gray-600">{tenant.phone || 'No phone number'}</span>
          </div>

          {tenant.monthlyIncome && (
            <div className="flex items-center text-sm">
              <svg className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-gray-600">{formatCurrency(tenant.monthlyIncome)} / month</span>
            </div>
          )}

          {tenant.moveInDate && (
            <div className="flex items-center text-sm">
              <svg className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-600">Moved in: {formatDate(tenant.moveInDate)}</span>
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        {tenant.emergencyContactName && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Emergency Contact</h4>
            <div className="text-sm text-gray-600">
              <div className="flex items-center">
                <svg className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{tenant.emergencyContactName}</span>
              </div>
              {tenant.emergencyContactPhone && (
                <div className="flex items-center mt-1">
                  <svg className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{tenant.emergencyContactPhone}</span>
                </div>
              )}
              {tenant.emergencyContactRelationship && (
                <div className="text-xs text-gray-500 mt-1">
                  {tenant.emergencyContactRelationship}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-3">
          <Link
            href={`/admin/tenants/${tenant.id}`}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
          >
            View Details
          </Link>
          <Link
            href={`/admin/tenants/${tenant.id}/edit`}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
          >
            Edit
          </Link>
        </div>

        {/* Additional Info */}
        {tenant.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-1">Notes</h4>
            <p className="text-sm text-gray-600 line-clamp-2">{tenant.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
} 