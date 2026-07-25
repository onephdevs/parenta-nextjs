'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';
import { Building } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';

interface DeleteBuildingModalProps {
  building: Building;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
}

export default function DeleteBuildingModal({
  building,
  isOpen,
  onClose,
  onDelete,
}: DeleteBuildingModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting building:', error);
    } finally {
      setIsDeleting(false);
      setConfirmText('');
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText('');
      onClose();
    }
  };

  const isConfirmValid = confirmText.toLowerCase() === 'delete';

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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 text-center mb-2"
                >
                  Delete Building?
                </Dialog.Title>

                <div className="mt-4">
                  <Alert variant="danger" title="This action cannot be undone!" className="mb-4">
                    Deleting <span className="font-semibold">{building.name}</span> will permanently
                    remove:
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      <li>All rooms/units in this building</li>
                      <li>All tenant assignments</li>
                      <li>All uploaded images</li>
                      <li>All building data and history</li>
                    </ul>
                  </Alert>

                  <Card padding="sm" className="bg-gray-50 mb-4">
                    <p className="text-sm text-gray-900 mb-2 font-medium">Building Details:</p>
                    <div className="text-sm text-gray-900 space-y-1">
                      <p>
                        <strong>Name:</strong> {building.name}
                      </p>
                      <p>
                        <strong>Type:</strong> {building.type}
                      </p>
                      <p>
                        <strong>Address:</strong> {building.addressLine1}, {building.city},{' '}
                        {building.state}
                      </p>
                    </div>
                  </Card>

                  <FormField
                    htmlFor="confirmText"
                    label="Type DELETE to confirm:"
                    className="mb-6"
                  >
                    <Input
                      type="text"
                      id="confirmText"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      isDisabled={isDeleting}
                      placeholder="Type DELETE to confirm"
                      autoComplete="off"
                    />
                  </FormField>

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
                      Delete Building
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
