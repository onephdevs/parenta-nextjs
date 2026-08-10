/** Deposit ledger account types (per lease / assignment). */

export const DEPOSIT_TYPES = ['SECURITY', 'UTILITY'] as const;
export type DepositType = (typeof DEPOSIT_TYPES)[number];

export const DEPOSIT_TYPE_LABELS: Record<DepositType, string> = {
  SECURITY: 'Security deposit',
  UTILITY: 'Utility deposit',
};

export function isDepositType(value: string | null | undefined): value is DepositType {
  return (DEPOSIT_TYPES as readonly string[]).includes(String(value || '').toUpperCase());
}
