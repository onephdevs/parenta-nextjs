'use client';

import ProfilePictureUpload from './ProfilePictureUpload';
import DocumentUpload from './DocumentUpload';

interface TenantDetailClientProps {
  tenantId: string;
  profilePictureUrl?: string | null;
  agreementDocumentUrl?: string | null;
  agreementDocumentName?: string | null;
}

export default function TenantDetailClient({
  tenantId,
  profilePictureUrl,
  agreementDocumentUrl,
  agreementDocumentName
}: TenantDetailClientProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      {/* Profile Picture */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Profile Picture</h3>
          <ProfilePictureUpload
            tenantId={tenantId}
            currentPictureUrl={profilePictureUrl}
            onUploadComplete={handleRefresh}
            onDeleteComplete={handleRefresh}
            size="lg"
          />
        </div>
      </div>

      {/* Tenant Agreement */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Tenant Agreement</h3>
          <DocumentUpload
            tenantId={tenantId}
            currentDocumentUrl={agreementDocumentUrl}
            currentDocumentName={agreementDocumentName}
            onUploadComplete={handleRefresh}
            onDeleteComplete={handleRefresh}
          />
        </div>
      </div>
    </>
  );
}

