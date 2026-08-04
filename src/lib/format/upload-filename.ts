/**
 * Keep the user's original upload name for display/download.
 * Storage paths still use a unique key separately.
 */

export function originalUploadFileName(file: File, fallback = 'file'): string {
  const name = (file.name || '').trim();
  return name || fallback;
}

export function sanitizeDownloadFileName(name: string, fallback = 'file'): string {
  const raw = (name || fallback).trim().replace(/[/\\]/g, '_').replace(/"/g, '');
  return raw || fallback;
}

export function contentDispositionHeader(
  filename: string,
  disposition: 'inline' | 'attachment' = 'inline'
): string {
  const safe = sanitizeDownloadFileName(filename);
  const encoded = encodeURIComponent(safe);
  const ascii = safe.replace(/[^\x20-\x7E]/g, '_');
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
