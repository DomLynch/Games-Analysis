// Licence: Business Source License 1.1 (donor LICENSE.txt). Restricted: clean-room, shape only; not a translation of the donor lines.
// clean-room
export interface Delta<Row> {
  inserts: Row[];
  deletes: Row[];
}

export interface DeltaResult<Row> {
  delta: Delta<Row> | null;   // null when nothing changed for this query
  duplicatesEvaluated: number;
  duplicatesSent: number;
}

// One query, one transaction. Inserts are counted first, then deletes cancel
// pending inserts of the same row; what is left is emitted with bag semantics.
export function evalDelta<Row>(
  forEachInsert: (f: (r: Row) => void) => void,
  forEachDelete: (f: (r: Row) => void) => void,
  keyOf: (r: Row) => string,
  isJoin: boolean,
): DeltaResult<Row> {
  const inserts: Row[] = [];
  const deletes: Row[] = [];
  let duplicatesEvaluated = 0;
  let duplicatesSent = 0;

  if (!isJoin) {
    // Single-table plans: no counting, every row is emitted once.
    forEachInsert((r) => { inserts.push(r); });
    forEachDelete((r) => { deletes.push(r); });
  } else {
    // A join can return the same row several times, so count per row.
    const insertCounts = new Map<string, { row: Row; n: number }>();
    const deleteCounts = new Map<string, { row: Row; n: number }>();

    forEachInsert((r) => {
      const k = keyOf(r);
      const e = insertCounts.get(k);
      if (e !== undefined) {
        duplicatesEvaluated += 1;
        e.n += 1;
      } else {
        insertCounts.set(k, { row: r, n: 1 });
      }
    });

    forEachDelete((r) => {
      const k = keyOf(r);
      const ins = insertCounts.get(k);
      if (ins === undefined) {
        // No insert for this row in this tx: a real delete.
        const d = deleteCounts.get(k);
        if (d !== undefined) { duplicatesEvaluated += 1; d.n += 1; }
        else deleteCounts.set(k, { row: r, n: 1 });
      } else if (ins.n === 0) {
        // Inserts already used up by earlier deletes: this one is a real delete too.
        duplicatesEvaluated += 1;
        const d = deleteCounts.get(k);
        if (d !== undefined) d.n += 1;
        else deleteCounts.set(k, { row: r, n: 1 });
      } else {
        // Cancels one pending insert: neither row is sent.
        duplicatesEvaluated += 1;
        ins.n -= 1;
      }
    });

    for (const { row, n } of insertCounts.values()) {
      if (n > 0) {
        duplicatesSent += n - 1;
        for (let i = 0; i < n; i++) inserts.push(row);
      }
    }
    for (const { row, n } of deleteCounts.values()) {
      if (n > 0) {
        duplicatesSent += n - 1;
        for (let i = 0; i < n; i++) deletes.push(row);
      }
    }
  }

  if (inserts.length === 0 && deletes.length === 0) {
    return { delta: null, duplicatesEvaluated, duplicatesSent };
  }
  return { delta: { inserts, deletes }, duplicatesEvaluated, duplicatesSent };
}

export {};
