import pool from '@/lib/db';
import {
  currentTxnYearYy,
  formatParentaTxnId,
  isTxnTypeCode,
  type TxnTypeCode,
} from '@/lib/constants/transaction-ids';

/**
 * Allocate the next Parenta txn id: txn-{type}-{######}-{YY}
 * Sequence is per type + year (resets each calendar year in Asia/Manila).
 */
export async function allocateParentaTxnId(
  type: TxnTypeCode,
  yearYy = currentTxnYearYy()
): Promise<string> {
  if (!isTxnTypeCode(type)) {
    throw new Error(`Invalid txn type: ${type}`);
  }
  const yy = Number(yearYy) % 100;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO txn_sequences (txn_type, year_yy, last_value)
       VALUES ($1, $2, 0)
       ON CONFLICT (txn_type, year_yy) DO NOTHING`,
      [type, yy]
    );
    const result = await client.query<{ last_value: number }>(
      `UPDATE txn_sequences
       SET last_value = last_value + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE txn_type = $1 AND year_yy = $2
       RETURNING last_value`,
      [type, yy]
    );
    const seq = result.rows[0]?.last_value;
    if (!seq || seq < 1) {
      throw new Error('Failed to allocate transaction sequence');
    }
    await client.query('COMMIT');
    return formatParentaTxnId(type, seq, yy);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
