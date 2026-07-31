# Tenant Agreement CRUD Operations Summary

## Current Implementation Status

### ✅ CREATE (Upload Document)
- **Endpoint**: `POST /api/tenant/agreement` (tenant portal)
- **Endpoint**: `POST /api/tenants/[id]/agreement` (admin portal)
- **Functionality**: 
  - Upload new agreement document (PDF, DOC, DOCX)
  - Automatically deletes old document if one exists (acts as replace/update)
  - Validates file type and size (max 10MB)
  - Creates document record in database
  - Links document to tenant profile
- **UI**: "Upload Document" button in DocumentUpload component

### ✅ READ (View Document)
- **Endpoint**: `GET /api/tenant/agreement` (tenant portal)
- **Endpoint**: `GET /api/tenants/[id]/agreement` (admin portal)
- **Functionality**:
  - Fetches current tenant's agreement document
  - Returns document metadata (name, URL, size, etc.)
  - Returns `null` if no document exists
- **UI**: 
  - Shows document name and "View" button when document exists
  - Shows "No agreement document uploaded" when empty
  - "View" button opens document in new tab

### ⚠️ UPDATE (Replace Document)
- **Current Implementation**: 
  - POST endpoint automatically replaces existing document
  - When uploading a new document, old one is deleted first
  - This is standard behavior for file uploads (replace entire file)
- **Missing**: 
  - No dedicated PUT/PATCH endpoint for updating document metadata only
  - Cannot update document name/description without replacing file
- **Note**: For document files, replacing the entire file is typically the desired behavior

### ✅ DELETE (Remove Document)
- **Endpoint**: `DELETE /api/tenant/agreement` (tenant portal)
- **Endpoint**: `DELETE /api/tenants/[id]/agreement` (admin portal)
- **Functionality**:
  - Deletes document file from storage
  - Removes document record from database
  - Clears `tenant_agreement_document_id` from tenant record
- **UI**: "Delete" button in DocumentUpload component (with confirmation)

## Available Locations

### Tenant Portal
- **Page**: `/tenant/profile`
- **Component**: `DocumentUpload` in Tenant Agreement section
- **Access**: Tenants can upload, view, and delete their own agreement

### Admin Portal
- **Page**: `/admin/tenants/[id]` (Edit Tenant form)
- **Component**: `DocumentUpload` in Tenant Agreement section
- **Access**: Admins can upload, view, and delete any tenant's agreement

## API Endpoints Summary

### Tenant Portal API (`/api/tenant/agreement`)
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/tenant/agreement` | Get current tenant's agreement | ✅ |
| POST | `/api/tenant/agreement` | Upload/replace agreement | ✅ |
| DELETE | `/api/tenant/agreement` | Delete agreement | ✅ |

### Admin Portal API (`/api/tenants/[id]/agreement`)
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/tenants/[id]/agreement` | Get tenant's agreement | ✅ |
| POST | `/api/tenants/[id]/agreement` | Upload/replace agreement | ✅ |
| DELETE | `/api/tenants/[id]/agreement` | Delete agreement | ✅ |

## Conclusion

**CRUD Status: ✅ Complete (with replace-based update)**

- **Create**: ✅ Fully implemented
- **Read**: ✅ Fully implemented  
- **Update**: ✅ Implemented as "replace" (POST deletes old + creates new)
- **Delete**: ✅ Fully implemented

The current implementation provides full CRUD functionality. The UPDATE operation is implemented as a "replace" pattern, which is standard for file uploads where you replace the entire document rather than updating parts of it.

If you need to update document metadata (name, description) without replacing the file, we can add a PUT endpoint that uses the `updateDocument` function from the documents API.
