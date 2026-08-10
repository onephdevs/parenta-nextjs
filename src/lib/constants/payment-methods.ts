/**
 * Payment method helpers backed by CONSTANTS.MODULE.PAYMENT.
 * Prefer CONSTANTS.MODULE.PAYMENT.* for raw lists; use these helpers for labels/normalization.
 */

import { CONSTANTS } from '@/lib/constants/registry';

const PAYMENT = CONSTANTS.MODULE.PAYMENT;

export const PAYMENT_METHODS = PAYMENT.ALLOWED_METHODS;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CANONICAL_PAYMENT_METHODS = PAYMENT.CANONICAL_METHODS;

export type CanonicalPaymentMethod = (typeof CANONICAL_PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ...PAYMENT.METHOD_LABELS,
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ...PAYMENT.TYPE_LABELS,
};

export const ALLOWED_PAYMENT_METHODS = PAYMENT.ALLOWED_METHODS;

export const ALLOWED_PAYMENT_TYPES = PAYMENT.ALLOWED_TYPES;

export const DEFAULT_PAYMENT_METHOD = PAYMENT.DEFAULT_METHOD;

export const DEFAULT_PAYMENT_TYPE = PAYMENT.DEFAULT_TYPE;

/** Options for admin / tenant payment selects (canonical only). */
export const PAYMENT_METHOD_SELECT_OPTIONS: Array<{
  value: CanonicalPaymentMethod;
  label: string;
}> = CANONICAL_PAYMENT_METHODS.map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value] || value,
}));

export function formatPaymentMethodLabel(
  raw: string | null | undefined
): string {
  if (!raw) return '—';
  const key = String(raw).toLowerCase().trim().replace(/\s+/g, '_');
  return (
    PAYMENT_METHOD_LABELS[key] ||
    PAYMENT_METHOD_LABELS[toCanonicalPaymentMethod(raw)] ||
    String(raw).replace(/_/g, ' ')
  );
}

export function toCanonicalPaymentMethod(
  raw: string | null | undefined
): CanonicalPaymentMethod {
  const key = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');

  const aliases = PAYMENT.METHOD_ALIASES as Record<string, string>;
  if (aliases[key]) {
    const aliased = aliases[key];
    if ((CANONICAL_PAYMENT_METHODS as readonly string[]).includes(aliased)) {
      return aliased as CanonicalPaymentMethod;
    }
  }

  if (key === 'cheque') return 'cheque';
  if ((CANONICAL_PAYMENT_METHODS as readonly string[]).includes(key)) {
    return key as CanonicalPaymentMethod;
  }
  return 'other';
}

export function normalizePaymentMethod(
  raw: string | null | undefined
): PaymentMethod {
  const canonical = toCanonicalPaymentMethod(raw);
  const key = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if ((PAYMENT_METHODS as readonly string[]).includes(key)) {
    return key as PaymentMethod;
  }
  return canonical;
}

export function isAllowedPaymentMethod(raw: string | null | undefined): boolean {
  const key = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  return (ALLOWED_PAYMENT_METHODS as readonly string[]).includes(key);
}

export function resolveAllowedPaymentMethod(
  raw: string | null | undefined,
  fallback: string = DEFAULT_PAYMENT_METHOD
): string {
  const key = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (!isAllowedPaymentMethod(key)) return fallback;
  return key === 'check' ? 'cheque' : key;
}

export function isAllowedPaymentType(raw: string | null | undefined): boolean {
  const key = String(raw || '')
    .toLowerCase()
    .trim();
  return (ALLOWED_PAYMENT_TYPES as readonly string[]).includes(key);
}

export function resolveAllowedPaymentType(
  raw: string | null | undefined,
  fallback: string = DEFAULT_PAYMENT_TYPE
): string {
  const key = String(raw || '')
    .toLowerCase()
    .trim();
  return isAllowedPaymentType(key) ? key : fallback;
}
