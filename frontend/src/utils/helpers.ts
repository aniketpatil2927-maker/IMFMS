import type { Role } from '../types';

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  OFFICE_STAFF: 'Office Staff',
  SITE_SUPERVISOR: 'Site Supervisor',
};

export function formatMoney(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export function formatDate(value?: string | Date | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (typeof error === 'object' && error && 'response' in error) {
    const res = (error as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
