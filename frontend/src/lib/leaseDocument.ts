import { apiPath } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';

export function leaseDownloadPath(id: string, type: 'original' | 'signed') {
  return `/lease-download?leaseId=${encodeURIComponent(id)}&type=${type}`;
}

export const LEASE_UNAVAILABLE_MESSAGE = 'Lease document is not available. Please contact management.';

export async function fetchLeaseDocument(id: string, type: 'original' | 'signed') {
  const token = getStoredToken();
  const res = await fetch(apiPath(leaseDownloadPath(id, type)), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || contentType.includes('application/json')) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || LEASE_UNAVAILABLE_MESSAGE);
  }

  const blob = await res.blob();
  if (blob.size < 50) {
    throw new Error(LEASE_UNAVAILABLE_MESSAGE);
  }

  return blob;
}

export async function openLeaseDocument(id: string, type: 'original' | 'signed') {
  const blob = await fetchLeaseDocument(id, type);
  const url = URL.createObjectURL(blob);
  return { blob, url };
}
