// Licence: GPL-3.0 (donor, OpenDiablo2). clean-room
// Sketch of a weighted loot table with a no-drop bucket, guaranteed-count mode, nested table references
// and one quality roll per item. Written from the described mechanism, not a translation of the donor.
export {};

const BASE_NONE_WEIGHT = 1024;   // quality weight for "no modifier"; engine constant

type Quality = 'none' | 'unique' | 'set' | 'rare' | 'magic';

interface Entry { code: string; weight: number; }   // weight = the entry's probability (or a count in guaranteed mode)

interface Table {
  numPicks: number;              // negative = guaranteed counts from the entry weights
  noDrop: number;                // weight of the "drop nothing" bucket
  entries: Entry[];              // a code is an item, or the name of another table
  qualityWeights: { unique: number; set: number; rare: number; magic: number };
}

type Rnd = (n: number) => number;   // integer in [0, n)

// One weighted pick. The no-drop bucket comes first; a roll inside it returns null.
function pickEntry(t: Table, rnd: Rnd): Entry | null {
  const total = t.noDrop + t.entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;   // donor would call Intn(0) here; the sketch guards it
  const roll = rnd(total);
  if (roll < t.noDrop) return null;
  let acc = t.noDrop;
  for (const e of t.entries) {
    acc += e.weight;
    if (roll < acc) return e;
  }
  return null;
}

// Guaranteed-count mode: each entry weight is a count, taken in table order until -numPicks is reached.
function guaranteedPicks(t: Table): Entry[] {
  let left = -t.numPicks;
  const picks: Entry[] = [];
  for (const e of t.entries) {
    for (let c = 0; c < e.weight && left > 0; c++) {
      picks.push(e);
      left--;
    }
  }
  return picks;
}

// One quality roll for one item, out of the base none weight plus the table's quality weights.
function rollQuality(t: Table, rnd: Rnd): Quality {
  const order: Array<[Quality, number]> = [
    ['none', BASE_NONE_WEIGHT],
    ['unique', t.qualityWeights.unique],
    ['set', t.qualityWeights.set],
    ['rare', t.qualityWeights.rare],
    ['magic', t.qualityWeights.magic],
  ];
  const total = order.reduce((s, [, w]) => s + w, 0);
  const roll = rnd(total);
  let acc = 0;
  for (const [q, w] of order) {
    acc += w;
    if (roll < acc) return q;
  }
  return 'none';
}

// Resolve a table into items. Nested table names are resolved recursively.
// Simplified: each item gets one quality roll from the table that picked it (no second roll at the outer level).
function resolveTable(name: string, tables: Record<string, Table>, rnd: Rnd,
                      out: Array<{ code: string; quality: Quality }>): void {
  const t = tables[name];
  if (t === undefined) return;

  const picks: Entry[] = [];
  if (t.numPicks < 0) {
    picks.push(...guaranteedPicks(t));
  } else {
    for (let left = t.numPicks; left > 0; left--) {
      const e = pickEntry(t, rnd);
      if (e !== null) picks.push(e);
    }
  }

  for (const p of picks) {
    if (tables[p.code] !== undefined) {
      resolveTable(p.code, tables, rnd, out);
    } else {
      out.push({ code: p.code, quality: rollQuality(t, rnd) });
    }
  }
}
