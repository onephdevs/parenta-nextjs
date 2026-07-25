'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import AddBuildingModal from './AddBuildingModal';
import { Button } from '@/components/ui/Button';

export default function AddBuildingButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setIsModalOpen(true)}
        leftIcon={<Plus className="h-4 w-4" />}
      >
        Add Building
      </Button>

      <AddBuildingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBuildingAdded={() => {
          setIsModalOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
