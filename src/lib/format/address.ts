export interface AddressParts {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

/**
 * Build a readable address, omitting blank parts so sparse data does not render
 * as ", , ," or trailing commas.
 */
export function formatAddress(parts: AddressParts, emptyLabel = 'No address listed'): string {
  const line1 = [parts.addressLine1, parts.addressLine2]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(', ');

  const stateZip = [parts.state, parts.postalCode]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(' ');

  const locality = [parts.city?.trim(), stateZip].filter(Boolean).join(', ');
  const segments = [line1, locality].filter(Boolean);

  if (segments.length === 0) return emptyLabel;
  return segments.join(', ');
}
