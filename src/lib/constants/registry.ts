/**
 * Central app constants registry.
 *
 * Source of truth: `./CONSTANTS.json`
 * Access pattern: CONSTANTS.MODULE.<DOMAIN>.<KEY>
 *
 * Example:
 *   CONSTANTS.MODULE.PAYMENT.ALLOWED_METHODS
 *   CONSTANTS.MODULE.MAINTENANCE.STATUS_LABELS
 *
 * Prefer importing `CONSTANTS` (or domain helpers under this folder) instead of
 * duplicating string lists in routes/components.
 *
 * Primary consumers (update when wiring new domains):
 * - MODULE.PAYMENT → payment-methods.ts, tenant payment routes, payment forms
 * - MODULE.MAINTENANCE → maintenance.ts, maintenance UI/API
 * - MODULE.UPLOAD → tenant payment receipt routes
 */

import constantsJson from './CONSTANTS.json';

export const CONSTANTS = constantsJson;

export type AppConstants = typeof CONSTANTS;

/** Convenience alias matching the documented naming style. */
export const MODULE = CONSTANTS.MODULE;

export default CONSTANTS;
