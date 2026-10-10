// Licence: CC-BY-SA 3.0 (donor, whole project). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type IntRng = (lo: number, hi: number) => number; // inclusive, like the donor's rng(lo, hi)
type FloatRng = () => number;                      // 0..1

interface Entry {
  kind: "item" | "group";
  id: string;
  prob: number;              // collection: percent 0..100; distribution: a weight
  count?: [number, number];  // how many to make, rolled per entry
}
interface Table { type: "collection" | "distribution"; entries: Entry[] }

interface Ctx {
  int: IntRng;
  float: FloatRng;
  spawnRate: number;         // global density knob, applied at leaf items only
  maximized: boolean;        // skip the rolls, take the top of each count range
  applySpawnRate: boolean;   // per call, like the donor's use_spawn_rate flag
}

export function roll(tables: Map<string, Table>, id: string, ctx: Ctx, stack: string[] = []): string[] {
  const t = tables.get(id);
  if (!t || stack.includes(id)) return [];   // unknown table, or a loop back into the stack
  const out: string[] = [];
  stack.push(id);
  if (t.type === "collection") {
    for (const e of t.entries) {
      // a p percent entry passes when the roll is below p
      if (!ctx.maximized && ctx.int(0, 99) >= e.prob) continue;
      out.push(...emit(tables, e, ctx, stack));
    }
  } else {
    const total = t.entries.reduce((s, e) => s + e.prob, 0);
    if (total > 0) {
      const pick = ctx.int(1, total);
      let acc = 0;
      for (const e of t.entries) {
        acc += e.prob;
        if (pick <= acc) { out.push(...emit(tables, e, ctx, stack)); break; }
      }
    }
  }
  stack.pop();
  return out;
}

function emit(tables: Map<string, Table>, e: Entry, ctx: Ctx, stack: string[]): string[] {
  const n = e.count ? (ctx.maximized ? e.count[1] : ctx.int(e.count[0], e.count[1])) : 1;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    if (e.kind === "group") { out.push(...roll(tables, e.id, ctx, stack)); continue; }
    if (ctx.applySpawnRate && ctx.float() > ctx.spawnRate) continue;
    out.push(e.id);
  }
  return out;
}
export {};
