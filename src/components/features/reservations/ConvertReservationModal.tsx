'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReservationWithDetails } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import FullScreenModal from '@/components/ui/FullScreenModal';

interface ConvertReservationModalProps {
  reservation: ReservationWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConvertReservationModal({
  reservation,
  isOpen,
  onClose,
}: ConvertReservationModalProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const { currencyCode } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    depositPaid: reservation.reservationDeposit.toString(),
    advanceAmount: '',
    notes: reservation.notes || '',
    generateInvoices: true,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate dates
    if (formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      showNotification({
        type: 'error',
        title: 'Invalid Date',
        message: 'End date must be after start date',
      });
      setIsSubmitting(false);
      return;
    }

    const loadingId = showNotification({
      type: 'loading',
      title: 'Converting reservation...',
      message: 'Please wait while we convert the reservation to an assignment.',
    });

    try {
      const response = await fetch(`/api/reservations/${reservation.id}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          depositPaid: formData.depositPaid ? parseFloat(formData.depositPaid) : reservation.reservationDeposit,
          advanceAmount: formData.advanceAmount ? parseFloat(formData.advanceAmount) : undefined,
          notes: formData.notes,
          generateInvoices: formData.generateInvoices,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.details || 'Failed to convert reservation');
      }

      updateNotification(loadingId, {
        type: 'success',
        title: 'Reservation converted successfully!',
        message: 'The reservation has been converted to an assignment and the room status has been updated.',
      });

      onClose();
      router.push(`/admin/tenants/${reservation.tenantId}`);
    } catch (error) {
      console.error('Error converting reservation:', error);
      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to convert reservation',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionButtons = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="convert-reservation-form"
        disabled={isSubmitting}
        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Converting...' : 'Convert to Assignment'}
      </button>
    </>
  );

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Convert Reservation to Assignment"
      subtitle="Convert this reservation into a full room assignment with lease details"
      actionButtons={actionButtons}
    >
      <form id="convert-reservation-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Pre-filled Information Display */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="text-sm font-medium text-gray-900">Reservation Details</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Tenant:</span>
              <span className="ml-2 text-gray-900">{reservation.tenantName}</span>
            </div>
            <div>
              <span className="text-gray-600">Room:</span>
              <span className="ml-2 text-gray-900">{reservation.roomNumber} - {reservation.buildingName}</span>
            </div>
            <div>
              <span className="text-gray-600">Monthly Rate:</span>
              <span className="ml-2 text-gray-900">{formatCurrency(reservation.monthlyRate, currencyCode)}</span>
            </div>
            <div>
              <span className="text-gray-600">Reservation Deposit:</span>
              <span className="ml-2 text-gray-900">{formatCurrency(reservation.reservationDeposit, currencyCode)}</span>
            </div>
          </div>
        </div>

        {/* Lease Start Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-900 mb-1">
            Lease Start Date *
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            required
            value={formData.startDate}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Lease End Date */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-900 mb-1">
            Lease End Date (Optional)
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleInputChange}
            min={formData.startDate}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-600">
            Leave empty for month-to-month lease
          </p>
        </div>

        {/* Deposit Paid */}
        <div>
          <label htmlFor="depositPaid" className="block text-sm font-medium text-gray-900 mb-1">
            Deposit Paid ({formatCurrency(0, currencyCode).replace(/[\d,.]/g, '')})
          </label>
          <input
            type="number"
            id="depositPaid"
            name="depositPaid"
            min="0"
            step="0.01"
            value={formData.depositPaid}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-600">
            Pre-filled from reservation deposit: {formatCurrency(reservation.reservationDeposit, currencyCode)}
          </p>
        </div>

        {/* Advance Payment */}
        <div>
          <label htmlFor="advanceAmount" className="block text-sm font-medium text-gray-900 mb-1">
            Advance Payment ({formatCurrency(0, currencyCode).replace(/[\d,.]/g, '')}) (Optional)
          </label>
          <input
            type="number"
            id="advanceAmount"
            name="advanceAmount"
            min="0"
            step="0.01"
            value={formData.advanceAmount}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-600">
            Any advance rent payment made at the start of the lease
          </p>
        </div>

        {/* Generate Invoices */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="generateInvoices"
            name="generateInvoices"
            checked={formData.generateInvoices}
            onChange={handleInputChange}
            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
          />
          <label htmlFor="generateInvoices" className="ml-2 block text-sm text-gray-900">
            Automatically generate invoices for the lease period
          </label>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-900 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Additional notes about this assignment..."
          />
        </div>
      </form>
    </FullScreenModal>
  );
}

