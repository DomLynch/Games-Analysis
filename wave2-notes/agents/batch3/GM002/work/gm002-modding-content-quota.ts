// Licence: none declared in the donor (clean-room). Sketch written from the described mechanism, not a translation of donor lines.
type Owner = string;

interface Placed {
  id: string;
  alive: boolean; // stands in for IsValid(ent) and not marked for deletion
}

interface Ledger {
  caps: Map<string, number>;                 // per content type; -1 = unlimited; missing = 0 (deny)
  placed: Map<Owner, Map<string, Placed[]>>; // owner -> content type -> placed rows
  allowRows: Set<string>;                    // default-deny whitelist for pasted rows
}

function capFor(l: Ledger, type: string): number {
  return l.caps.get(type) ?? 0; // fail closed: a missing cap blocks everything
}

// Prunes dead rows on read, then counts the live ones.
function countOf(l: Ledger, owner: Owner, type: string): number {
  const byType = l.placed.get(owner);
  const rows = byType?.get(type) ?? [];
  const live = rows.filter((p) => p.alive);
  if (byType !== undefined) byType.set(type, live);
  return live.length;
}

// cap < 0 is unlimited; otherwise a new row is refused when count > cap - 1.
function mayPlace(l: Ledger, owner: Owner, type: string): boolean {
  const cap = capFor(l, type);
  if (cap < 0) return true;
  const count = countOf(l, owner, type);
  if (count > cap - 1) return false;
  return true;
}

function recordPlaced(l: Ledger, owner: Owner, type: string, p: Placed): void {
  let byType = l.placed.get(owner);
  if (byType === undefined) {
    byType = new Map<string, Placed[]>();
    l.placed.set(owner, byType);
  }
  const rows = byType.get(type) ?? [];
  rows.push(p);
  byType.set(type, rows);
}

// Single door for one placement: whitelist, cap, then build, then record.
function placeOne(
  l: Ledger,
  owner: Owner,
  type: string,
  rowClass: string,
  make: () => Placed | null,
): Placed | null {
  if (!l.allowRows.has(rowClass)) return null;
  if (!mayPlace(l, owner, type)) return null;
  const p = make();
  if (p === null) return null;
  recordPlaced(l, owner, type, p);
  return p;
}

// Paste is all-or-nothing: one non-whitelisted row or one over-cap type refuses the whole layout.
function canPasteLayout(l: Ledger, owner: Owner, rows: { type: string; rowClass: string }[]): boolean {
  const extra = new Map<string, number>();
  for (const r of rows) {
    if (!l.allowRows.has(r.rowClass)) return false;
    extra.set(r.type, (extra.get(r.type) ?? 0) + 1);
  }
  for (const [type, n] of extra) {
    const cap = capFor(l, type);
    if (cap < 0) continue;
    if (countOf(l, owner, type) + n > cap) return false;
  }
  return true;
}

export {};
