'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { Room } from '@/types/database';
import { useCurrency } from '@/contexts/CurrencyContext';

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
  
  // Access code required for room deletion
  const REQUIRED_ACCESS_CODE = 'DELETE2024';

  const handleDelete = async () => {
    if (accessCode !== REQUIRED_ACCESS_CODE) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await onDelete();
      router.refresh(); // Refresh to update dashboard stats
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 text-center mb-2"
                >
                  Delete Room?
                </Dialog.Title>

                <div className="mt-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-800 font-medium mb-2">
                      ⚠️ This action cannot be undone!
                    </p>
                    <p className="text-sm text-red-700">
                      Deleting <span className="font-semibold">Room {room.roomNumber}</span> will permanently remove:
                    </p>
                    <ul className="mt-2 ml-4 text-sm text-red-700 list-disc space-y-1">
                      <li>All tenant assignments for this room</li>
                      <li>All payment history</li>
                      <li>All uploaded images</li>
                      <li>All room data and history</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-900 mb-2">
                      <strong>Room Details:</strong>
                    </p>
                    <div className="text-sm text-gray-900 space-y-1">
                      <p><strong>Room Number:</strong> {room.roomNumber}</p>
                      <p><strong>Type:</strong> {room.roomType}</p>
                      <p><strong>Status:</strong> {room.roomStatus}</p>
                      <p><strong>Monthly Rate:</strong> {formatCurrency(parseFloat(room.monthlyRate.toString()))}</p>
                    </div>
                  </div>

                  <div className="mb-6 space-y-4">
                    <div>
                      <label
                        htmlFor="confirmText"
                        className="block text-sm font-medium text-gray-900 mb-2"
                      >
                        Type <span className="font-mono font-bold text-red-600">DELETE</span> or Room Number <span className="font-mono font-bold text-red-600">{room.roomNumber}</span> to confirm:
                      </label>
                      <input
                        type="text"
                        id="confirmText"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        disabled={isDeleting}
                        placeholder={`Type DELETE or ${room.roomNumber}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        autoComplete="off"
                      />
                    </div>
                    
                    <div>
                      <label
                        htmlFor="accessCode"
                        className="block text-sm font-medium text-gray-900 mb-2"
                      >
                        Access Code <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="password"
                        id="accessCode"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        disabled={isDeleting}
                        placeholder="Enter access code"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        autoComplete="off"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        An access code is required to delete a room for security purposes.
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isDeleting}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={!isConfirmValid || isDeleting}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        'Delete Room'
                      )}
                    </button>
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

