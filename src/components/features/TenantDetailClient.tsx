'use client';

import ProfilePictureUpload from './ProfilePictureUpload';
import DocumentUpload from './DocumentUpload';
import { TenantDocumentsPanel } from './TenantDocumentsPanel';
import LeaseSignPanel from './lease-designer/LeaseSignPanel';

interface TenantDetailClientProps {
  tenantId: string;
  profilePictureUrl?: string | null;
  agreementDocumentId?: string | null;
  agreementDocumentUrl?: string | null;
  agreementDocumentName?: string | null;
}

export default function TenantDetailClient({
  tenantId,
  profilePictureUrl,
  agreementDocumentId,
  agreementDocumentUrl,
  agreementDocumentName,
}: TenantDetailClientProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-gray-900">Profile picture</h3>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <ProfilePictureUpload
            tenantId={tenantId}
            currentPictureUrl={profilePictureUrl}
            onUploadComplete={handleRefresh}
            onDeleteComplete={handleRefresh}
            size="lg"
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Opportunity uploads (ID, income, screening, lease) and other tenant files.
          </p>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <TenantDocumentsPanel tenantId={tenantId} />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-gray-900">Signed lease agreement</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Generate a draft, upload a signed PDF, or record landlord/witness clickwrap signatures.
          </p>
        </div>
        <div className="space-y-4 px-4 py-4 sm:px-5">
          <DocumentUpload
            tenantId={tenantId}
            currentDocumentId={agreementDocumentId}
            currentDocumentUrl={agreementDocumentUrl}
            currentDocumentName={agreementDocumentName}
            allowGenerate
            onUploadComplete={handleRefresh}
            onDeleteComplete={handleRefresh}
          />
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Electronic signatures
            </h4>
            <LeaseSignPanel tenantId={tenantId} onSigned={handleRefresh} />
          </div>
        </div>
      </div>
    </div>
  );
}
