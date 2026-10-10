// simulation harness for the sketch (not part of the note)
import { pickOne, restock, Entry } from "./src";
let seed = 12345;
const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
const mk = (item: string, chance: number, maxDrops = -1): Entry => ({ item, qty: 1, chance, isItem: true, levelMin: 0, levelMax: 0, maxDrops });
// martigan-like: 4 tiers, edges 100/75/50/25, equal entry counts
const tiers = [[100, "t100"], [75, "t75"], [50, "t50"], [25, "t25"]] as const;
const table: Entry[] = [];
for (const [c, tag] of tiers) for (let i = 0; i < 5; i++) table.push(mk(`${tag}_${i}`, c));
const counts: Record<string, number> = { t100: 0, t75: 0, t50: 0, t25: 0 };
const N = 100000;
for (let i = 0; i < N; i++) {
  const e = pickOne(table.map(x => ({ ...x })), 0, 1, rng);
  if (e) counts[e.item.split("_")[0]]++;
}
console.log("martigan-like tier shares:", Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, (v / N).toFixed(3)])), "expect ~0.25 each");
// loren-like: a 5-edge tier should get about 5%
const t2: Entry[] = [mk("a_100", 100), mk("b_25", 25), mk("c_5", 5)];
const c2: Record<string, number> = { a: 0, b: 0, c: 0 };
for (let i = 0; i < N; i++) { const e = pickOne(t2.map(x => ({ ...x })), 0, 1, rng); if (e) c2[e.item[0]]++; }
console.log("edges 100/25/5 shares:", Object.fromEntries(Object.entries(c2).map(([k, v]) => [k, (v / N).toFixed(3)])), "expect a~0.75 b~0.20 c~0.05");
// maxDrops: an entry with maxDrops 2 appears at most 2 times in one visit with 50 rolls
const t3: Entry[] = [mk("rare", 100, 2), mk("common", 100)];
const v3 = restock(t3, 50, 50, 0, 1, rng);
console.log("rare capped at 2 per visit:", (v3.get("rare") ?? 0) <= 2, "got", v3.get("rare"));
// fixed entries: added once per visit
const t4: Entry[] = [{ ...mk("fixedItem", 0), chance: 0 }, mk("x", 100)];
const v4 = restock(t4, 3, 3, 0, 1, rng);
console.log("fixed count", v4.get("fixedItem"), "expect 1");
