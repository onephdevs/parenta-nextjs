/**
 * SQL fragments to exclude ADMIN / non-revenue units from rent & collection reports.
 * `rooms.is_revenue_unit = false` marks owner/admin spaces (not rent-roll).
 */

/** Room-level filter (alias `r`). */
export const ROOM_IS_REVENUE = `COALESCE(r.is_revenue_unit, true) = true`;

/**
 * Payment-level filter (alias `p`).
 * Resolves room via payment.room_id, else active assignment.
 * Payments with no resolvable room stay included (legacy / unassigned cash).
 */
export const PAYMENT_IS_REVENUE_UNIT = `
  COALESCE(
    (
      SELECT COALESCE(r.is_revenue_unit, true)
      FROM rooms r
      WHERE r.id = COALESCE(
        p.room_id,
        (
          SELECT tra.room_id
          FROM tenant_room_assignments tra
          WHERE tra.tenant_id = p.tenant_id
            AND tra.assignment_status = 'active'
          ORDER BY tra.start_date DESC
          LIMIT 1
        )
      )
    ),
    true
  ) = true
`;
