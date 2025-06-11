'use client';

import { useState } from 'react';
import AddBuildingModal from './AddBuildingModal';

export default function AddBuildingButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Building
      </button>

      <AddBuildingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onBuildingAdded={() => {
          setIsModalOpen(false);
          // Force a page refresh to show the new building
          window.location.reload();
        }}
      />
    </>
  );
} 