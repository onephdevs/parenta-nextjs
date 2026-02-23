/**
 * Currency utilities for formatting amounts based on app settings
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  PHP: {
    code: 'PHP',
    symbol: '₱',
    locale: 'en-PH',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    locale: 'en-EU',
  },
};

/**
 * Format amount as currency based on currency code
 * @param amount - The amount to format
 * @param currencyCode - Currency code (PHP, USD, EUR)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currencyCode: string = 'PHP'): string {
  if (amount == null || Number.isNaN(amount)) {
    amount = 0;
  }
  const config = CURRENCIES[currencyCode] || CURRENCIES.PHP;

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get currency symbol for a currency code
 * @param currencyCode - Currency code (PHP, USD, EUR)
 * @returns Currency symbol
 */
export function getCurrencySymbol(currencyCode: string = 'PHP'): string {
  return CURRENCIES[currencyCode]?.symbol || CURRENCIES.PHP.symbol;
}

/**
 * Parse currency string back to number
 * @param currencyString - Formatted currency string
 * @returns Numeric value
 */
export function parseCurrency(currencyString: string): number {
  // Remove all non-numeric characters except decimal point and minus
  const cleaned = currencyString.replace(/[^0-9.-]+/g, '');
  return parseFloat(cleaned) || 0;
}

