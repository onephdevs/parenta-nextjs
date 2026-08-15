import pool from '@/lib/db';
import {
  currentTxnYearYy,
  formatParentaOrId,
  formatParentaTxnId,
  isTxnTypeCode,
  orSequenceTypeKey,
  type TxnTypeCode,
} from '@/lib/constants/transaction-ids';

async function allocateSequenceValue(
  sequenceKey: string,
  yearYy: number
): Promise<number> {
  const yy = Number(yearYy) % 100;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO txn_sequences (txn_type, year_yy, last_value)
       VALUES ($1, $2, 0)
       ON CONFLICT (txn_type, year_yy) DO NOTHING`,
      [sequenceKey, yy]
    );
    const result = await client.query<{ last_value: number }>(
      `UPDATE txn_sequences
       SET last_value = last_value + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE txn_type = $1 AND year_yy = $2
       RETURNING last_value`,
      [sequenceKey, yy]
    );
    const seq = result.rows[0]?.last_value;
    if (!seq || seq < 1) {
      throw new Error('Failed to allocate sequence');
    }
    await client.query('COMMIT');
    return seq;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

async function peekSequenceValue(
  sequenceKey: string,
  yearYy: number
): Promise<number> {
  const yy = Number(yearYy) % 100;
  const result = await pool.query<{ last_value: number }>(
    `SELECT last_value FROM txn_sequences
     WHERE txn_type = $1 AND year_yy = $2`,
    [sequenceKey, yy]
  );
  return (result.rows[0]?.last_value ?? 0) + 1;
}

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
  const seq = await allocateSequenceValue(type, yy);
  return formatParentaTxnId(type, seq, yy);
}

/**
 * Allocate the next Official Receipt number: or-{type}-{######}-{YY}
 * Same shape as txn ids; uses a separate sequence key (or_r, or_b, …).
 */
export async function allocateParentaOrId(
  type: TxnTypeCode,
  yearYy = currentTxnYearYy()
): Promise<string> {
  if (!isTxnTypeCode(type)) {
    throw new Error(`Invalid OR type: ${type}`);
  }
  const yy = Number(yearYy) % 100;
  const seq = await allocateSequenceValue(orSequenceTypeKey(type), yy);
  return formatParentaOrId(type, seq, yy);
}

/** Preview next OR without consuming the sequence (for Process Payment form). */
export async function peekNextParentaOrId(
  type: TxnTypeCode,
  yearYy = currentTxnYearYy()
): Promise<string> {
  if (!isTxnTypeCode(type)) {
    throw new Error(`Invalid OR type: ${type}`);
  }
  const yy = Number(yearYy) % 100;
  const seq = await peekSequenceValue(orSequenceTypeKey(type), yy);
  return formatParentaOrId(type, seq, yy);
}
