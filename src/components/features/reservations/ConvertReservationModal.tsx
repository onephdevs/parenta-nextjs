'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReservationWithDetails } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import SectionedFormShell, { SectionedFormSection } from '@/components/ui/SectionedFormShell';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';
import { Home, Calendar, DollarSign, Settings, FileText } from 'lucide-react';

interface ConvertReservationModalProps {
  reservation: ReservationWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

type FormSection = 'reservation' | 'lease' | 'payments' | 'settings' | 'notes';

const formSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'reservation',
    label: 'Reservation',
    icon: <Home className="h-4 w-4" />,
    title: 'Reservation Details',
    subtitle: 'Current reservation information',
  },
  {
    id: 'lease',
    label: 'Lease Dates',
    icon: <Calendar className="h-4 w-4" />,
    title: 'Lease Period',
    subtitle: 'Set the lease start and end dates',
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: <DollarSign className="h-4 w-4" />,
    title: 'Payment Details',
    subtitle: 'Configure deposits and advance payments',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="h-4 w-4" />,
    title: 'Conversion Options',
    subtitle: 'Additional settings for the conversion',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <FileText className="h-4 w-4" />,
    title: 'Additional Notes',
    subtitle: 'Add any additional information',
  },
];

export default function ConvertReservationModal({
  reservation,
  isOpen,
  onClose,
}: ConvertReservationModalProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const { formatCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<FormSection>('reservation');

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
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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
          depositPaid: formData.depositPaid
            ? parseFloat(formData.depositPaid)
            : reservation.reservationDeposit,
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
        message:
          'The reservation has been converted to an assignment and the room status has been updated.',
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

  const currencyLabel = formatCurrency(0).replace(/[\d,.]/g, '');

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'reservation':
        return (
          <Card padding="sm" className="bg-gray-50 border-gray-200">
            <div className="text-sm font-medium text-gray-900 mb-2">Current Reservation</div>
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Tenant:</span>
                <span className="ml-2 text-gray-900">{reservation.tenantName}</span>
              </div>
              <div>
                <span className="text-gray-600">Room:</span>
                <span className="ml-2 text-gray-900">
                  {reservation.roomNumber} - {reservation.buildingName}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Monthly Rate:</span>
                <span className="ml-2 text-gray-900">
                  {formatCurrency(reservation.monthlyRate)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Reservation Deposit:</span>
                <span className="ml-2 text-gray-900">
                  {formatCurrency(reservation.reservationDeposit)}
                </span>
              </div>
            </div>
          </Card>
        );

      case 'lease':
        return (
          <div className="space-y-6">
            <FormField label="Lease Start Date" htmlFor="startDate" required>
              <Input
                type="date"
                id="startDate"
                name="startDate"
                required
                value={formData.startDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                max="2099-12-31"
                style={{ colorScheme: 'light' }}
              />
            </FormField>

            <FormField
              label="Lease End Date (Optional)"
              htmlFor="endDate"
              hint="Leave empty for month-to-month lease"
            >
              <Input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                min={formData.startDate || '2000-01-01'}
                max="2099-12-31"
                style={{ colorScheme: 'light' }}
              />
            </FormField>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <FormField
              label={`Deposit Paid (${currencyLabel})`}
              htmlFor="depositPaid"
              hint={`Pre-filled from reservation deposit: ${formatCurrency(reservation.reservationDeposit)}`}
            >
              <Input
                type="number"
                id="depositPaid"
                name="depositPaid"
                min="0"
                step="0.01"
                value={formData.depositPaid}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField
              label={`Advance Payment (${currencyLabel}) (Optional)`}
              htmlFor="advanceAmount"
              hint="Any advance rent payment made at the start of the lease"
            >
              <Input
                type="number"
                id="advanceAmount"
                name="advanceAmount"
                min="0"
                step="0.01"
                value={formData.advanceAmount}
                onChange={handleInputChange}
              />
            </FormField>
          </div>
        );

      case 'settings':
        return (
          <Checkbox
            id="generateInvoices"
            name="generateInvoices"
            checked={formData.generateInvoices}
            onChange={handleInputChange}
            label="Automatically generate invoices for the lease period"
          />
        );

      case 'notes':
        return (
          <FormField label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes about this assignment..."
            />
          </FormField>
        );

      default:
        return null;
    }
  };

  return (
    <SectionedFormShell
      mode="modal"
      isOpen={isOpen}
      onCancel={onClose}
      eyebrow="Convert Reservation"
      entityLabel={`${reservation.roomNumber} - ${reservation.tenantName}`}
      sections={formSections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      primaryLabel="Convert to Assignment"
      primaryLoading={isSubmitting}
      formId="convert-reservation-form"
    >
      <form id="convert-reservation-form" onSubmit={handleSubmit} className="space-y-6">
        {renderSectionContent()}
      </form>
    </SectionedFormShell>
  );
}
