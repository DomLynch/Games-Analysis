// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// One authored line in a content file: a plain row, an "add" row, or a "remove" row.
type Row = { op: "set" | "add" | "remove"; key: string; values: string[] };

// One catalogue entry (a planet, a government, a fleet) as the loader currently holds it.
interface Entry {
  fields: Map<string, string[]>;
}

function pushValues(e: Entry, key: string, values: string[]): void {
  const cur = e.fields.get(key) ?? [];
  e.fields.set(key, [...cur, ...values]);
}

// Apply one content file's rows to an existing entry. Overwrite keys are cleared by the
// FIRST plain row for that key in this file; after that they append (the donor drops the
// key from its local overwrite set). "add" always appends; "remove" with no values clears
// the key, "remove" with values drops those values only.
function applyRows(e: Entry, rows: Row[], overwriteKeys: Set<string>): void {
  const pending = new Set(overwriteKeys);
  for (const r of rows) {
    if (r.op === "add") {
      pushValues(e, r.key, r.values);
      continue;
    }
    if (r.op === "remove") {
      if (r.values.length === 0) {
        e.fields.delete(r.key);
      } else {
        const cur = e.fields.get(r.key) ?? [];
        e.fields.set(r.key, cur.filter((v) => !r.values.includes(v)));
      }
      continue;
    }
    if (pending.has(r.key)) {
      e.fields.delete(r.key);
      pending.delete(r.key);
    }
    pushValues(e, r.key, r.values);
  }
}

// A fleet keeps its valid variants. Invalid variants are dropped and the lost weight is
// reported, instead of disabling the whole fleet (donor: Fleet.cpp 167-178).
interface Variant {
  weight: number;
  valid: boolean;
}

function pruneVariants(variants: Variant[]): { kept: Variant[]; dropped: number; lostWeight: number } {
  const kept = variants.filter((v) => v.valid);
  const total = variants.reduce((s, v) => s + v.weight, 0);
  const keptWeight = kept.reduce((s, v) => s + v.weight, 0);
  return { kept, dropped: variants.length - kept.length, lostWeight: total - keptWeight };
}

// A name that is referenced but never defined is reported and the load goes on (donor:
// UniverseObjects.cpp 229 warns; the placeholder is named so saves can still write it).
function unresolvedNames(referenced: string[], defined: Set<string>): string[] {
  return [...new Set(referenced)].filter((n) => !defined.has(n));
}

// Frankendom side: a bad number in a server-loaded row is a load error, not 0.
// (Donor: DataNode.cpp 137-143 logs and returns 0.)
function parseNumberStrict(token: string, where: string): number {
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(token)) {
    throw new Error(`${where}: not a number "${token}"`);
  }
  return Number(token);
}
