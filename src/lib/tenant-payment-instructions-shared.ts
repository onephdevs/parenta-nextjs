import { CONSTANTS } from '@/lib/constants';

export const TENANT_PAYMENT_INSTRUCTIONS_KEY = 'tenant_payment_instructions';

type TenantAcceptedMethod = 'gcash' | 'maya' | 'bank_transfer' | 'other';

export interface TenantPaymentInstructions {
  /** Primary mobile number for GCash / Maya / similar */
  phone: string;
  /** Account holder name shown to tenants */
  accountName: string;
  /** Optional bank account details */
  bankName: string;
  bankAccountNumber: string;
  /** Extra notes shown on the tenant pay screen */
  notes: string;
  /** Methods the office accepts */
  acceptedMethods: TenantAcceptedMethod[];
}

export const DEFAULT_TENANT_PAYMENT_INSTRUCTIONS: TenantPaymentInstructions = {
  phone: '',
  accountName: '',
  bankName: '',
  bankAccountNumber: '',
  notes: 'Send payment to the number below, then upload a screenshot of your transfer receipt.',
  acceptedMethods: [
    ...(CONSTANTS.MODULE.PAYMENT.TENANT_ACCEPTED_METHODS_DEFAULT as TenantAcceptedMethod[]),
  ],
};

/** True when tenants have a number to send GCash / transfers to. */
export function isTenantPaymentInstructionsConfigured(
  instructions: Pick<TenantPaymentInstructions, 'phone'> | null | undefined
): boolean {
  return Boolean(instructions?.phone?.trim());
}

export function parseTenantPaymentInstructions(raw: unknown): TenantPaymentInstructions {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TENANT_PAYMENT_INSTRUCTIONS };
  }

  const data = raw as Record<string, unknown>;
  const methods = Array.isArray(data.acceptedMethods)
    ? data.acceptedMethods.filter(
        (m): m is TenantPaymentInstructions['acceptedMethods'][number] =>
          m === 'gcash' || m === 'maya' || m === 'bank_transfer' || m === 'other'
      )
    : DEFAULT_TENANT_PAYMENT_INSTRUCTIONS.acceptedMethods;

  return {
    phone: String(data.phone || '').trim(),
    accountName: String(data.accountName || '').trim(),
    bankName: String(data.bankName || '').trim(),
    bankAccountNumber: String(data.bankAccountNumber || '').trim(),
    notes: String(data.notes || DEFAULT_TENANT_PAYMENT_INSTRUCTIONS.notes).trim(),
    acceptedMethods:
      methods.length > 0 ? methods : DEFAULT_TENANT_PAYMENT_INSTRUCTIONS.acceptedMethods,
  };
}
