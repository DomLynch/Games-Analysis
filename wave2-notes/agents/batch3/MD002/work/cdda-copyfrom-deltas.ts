// Licence: CC-BY-SA-3.0 (donor, LICENSE.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Value = number | string | boolean;
type Fields = Record<string, Value>;

interface Row {
  id: string;
  abstract?: boolean;                 // a template: stored for copy-from, never spawned
  copyFrom?: string;                  // base row id (or abstract id)
  fields: Fields;                     // direct values; these always win
  proportional?: Record<string, number>; // multiply the inherited number; scalar must be > 0 and != 1
  relative?: Record<string, number>;     // add to the inherited number
}

export interface LoadResult { finished: Map<string, Fields>; abstracts: Map<string, Fields>; errors: string[] }

// Build one row's fields from its base (if any). Direct values win; a delta is used only when the row
// has no direct value for that field. Deltas without a base are ignored with an error.
function buildFields(base: Fields | undefined, row: Row, schema: Set<string>, errors: string[]): Fields {
  const out: Fields = { ...(base ?? {}) };
  for (const key of Object.keys(row.fields)) {
    if (!schema.has(key) && !key.startsWith("//")) errors.push(`${row.id}: unknown field '${key}'`);
    out[key] = row.fields[key];
  }
  const deltaKeys = new Set([...Object.keys(row.proportional ?? {}), ...Object.keys(row.relative ?? {})]);
  for (const key of deltaKeys) {
    if (key in row.fields) continue;       // direct value wins; the delta is not applied
    if (base === undefined) { errors.push(`${row.id}: delta on '${key}' without copy-from is ignored`); continue; }
    const cur = out[key];
    if (typeof cur !== "number") { errors.push(`${row.id}: delta on non-number '${key}'`); continue; }
    const scalar = row.proportional?.[key];
    if (scalar !== undefined) {
      if (scalar <= 0 || scalar === 1) { errors.push(`${row.id}: invalid scalar ${scalar} for '${key}'`); continue; }
      out[key] = cur * scalar;
      continue;
    }
    const adder = row.relative?.[key];
    if (adder !== undefined) out[key] = cur + adder;
  }
  return out;
}

// Retry loop: a row whose copy-from base is not loaded yet waits for the next pass. A pass that makes
// no progress ends the load. Fix over the donor: the error names the missing base, not "circular".
export function loadRows(input: Row[], schema: Set<string>): LoadResult {
  const finished = new Map<string, Fields>();
  const abstracts = new Map<string, Fields>();
  const errors: string[] = [];
  let pending = [...input];

  while (pending.length > 0) {
    const before = pending.length;
    const deferred: Row[] = [];
    for (const row of pending) {
      const base = row.copyFrom === undefined ? undefined : (finished.get(row.copyFrom) ?? abstracts.get(row.copyFrom));
      if (row.copyFrom !== undefined && base === undefined) { deferred.push(row); continue; }
      const fields = buildFields(base, row, schema, errors);
      if (row.abstract) abstracts.set(row.id, fields); else finished.set(row.id, fields);
    }
    pending = deferred;
    if (pending.length === before) {
      for (const row of pending) {
        errors.push(`${row.id}: copy-from '${row.copyFrom}' is not loaded (missing, or in a cycle); row dropped`);
      }
      break;
    }
  }
  return { finished, abstracts, errors };
}

export {};
