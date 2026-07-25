'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';
import { Room } from '@/types/database';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';

interface DeleteRoomModalProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
}

export default function DeleteRoomModal({
  room,
  isOpen,
  onClose,
  onDelete,
}: DeleteRoomModalProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [accessCode, setAccessCode] = useState('');

  const REQUIRED_ACCESS_CODE = 'DELETE2024';

  const handleDelete = async () => {
    if (accessCode !== REQUIRED_ACCESS_CODE) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete();
      router.refresh();
      onClose();
    } catch (error) {
      console.error('Error deleting room:', error);
    } finally {
      setIsDeleting(false);
      setConfirmText('');
      setAccessCode('');
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText('');
      setAccessCode('');
      onClose();
    }
  };

  const isConfirmValid =
    (confirmText.toLowerCase() === 'delete' || confirmText === room.roomNumber) &&
    accessCode === REQUIRED_ACCESS_CODE;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-gray-900 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 text-center mb-2"
                >
                  Delete Room?
                </Dialog.Title>

                <div className="mt-4">
                  <Alert variant="danger" title="This action cannot be undone!" className="mb-4">
                    Deleting <span className="font-semibold">Room {room.roomNumber}</span> will
                    permanently remove:
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      <li>All tenant assignments for this room</li>
                      <li>All payment history</li>
                      <li>All uploaded images</li>
                      <li>All room data and history</li>
                    </ul>
                  </Alert>

                  <Card padding="sm" className="bg-gray-50 mb-4">
                    <p className="text-sm text-gray-900 mb-2 font-medium">Room Details:</p>
                    <div className="text-sm text-gray-900 space-y-1">
                      <p>
                        <strong>Room Number:</strong> {room.roomNumber}
                      </p>
                      <p>
                        <strong>Type:</strong> {room.roomType}
                      </p>
                      <p>
                        <strong>Status:</strong> {room.roomStatus}
                      </p>
                      <p>
                        <strong>Monthly Rate:</strong>{' '}
                        {formatCurrency(parseFloat(room.monthlyRate.toString()))}
                      </p>
                    </div>
                  </Card>

                  <div className="mb-6 space-y-4">
                    <FormField
                      htmlFor="confirmText"
                      label={`Type DELETE or Room Number ${room.roomNumber} to confirm:`}
                    >
                      <Input
                        type="text"
                        id="confirmText"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        isDisabled={isDeleting}
                        placeholder={`Type DELETE or ${room.roomNumber}`}
                        autoComplete="off"
                        isInvalid={confirmText.length > 0 && !isConfirmValid && accessCode === REQUIRED_ACCESS_CODE}
                      />
                    </FormField>

                    <FormField
                      htmlFor="accessCode"
                      label="Access Code"
                      required
                      hint="An access code is required to delete a room for security purposes."
                    >
                      <Input
                        type="password"
                        id="accessCode"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        isDisabled={isDeleting}
                        placeholder="Enter access code"
                        autoComplete="off"
                      />
                    </FormField>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={handleClose}
                      isDisabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="flex-1"
                      onClick={handleDelete}
                      isDisabled={!isConfirmValid}
                      isLoading={isDeleting}
                    >
                      Delete Room
                    </Button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
