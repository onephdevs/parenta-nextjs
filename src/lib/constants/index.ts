/**
 * Re-exports the central constants registry.
 *
 * Source: CONSTANTS.json
 * Access: CONSTANTS.MODULE.<DOMAIN>.<KEY>
 *
 * Domain helpers (labels, normalization) live in sibling modules and also
 * read from the same JSON so lists stay single-sourced.
 */

export { CONSTANTS, MODULE, type AppConstants } from './registry';
export { default } from './registry';
