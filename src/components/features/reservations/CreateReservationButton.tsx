'use client';

import { useState } from 'react';
import CreateReservationModal from './CreateReservationModal';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

export default function CreateReservationButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClose = () => {
    setIsModalOpen(false);
    window.dispatchEvent(new CustomEvent('reservationCreated'));
  };

  return (
    <>
      <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
        Create Reservation
      </Button>
      <CreateReservationModal isOpen={isModalOpen} onClose={handleClose} />
    </>
  );
}
