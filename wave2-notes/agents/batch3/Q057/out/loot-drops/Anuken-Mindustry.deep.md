# Anuken-Mindustry (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/world/blocks/production/Drill.java` | Licence: GPL-3.0 (LICENSE lines 1-2 "GNU GENERAL PUBLIC LICENSE" / "Version 3, 29 June 2007"; clean-room, shape only, never a line-by-line translation) | Java | symbol `Drill.countOre`

Checked: read in full: `Drill.countOre` and `canMine` (Drill.java 198-235), `getDrillTime` (170-171), `DrillBuild.updateTile` (287-325), `DrillBuild.onProximityUpdate` (272-278), `progress()` (328-330), the Drill fields (28-52, read partly), `Tile.drop()` (Tile.java 580-581), the `sand` item (Items.java 35-40), `Item.lowPriority` and `Item.hardness` (Item.java 29-39). Callers of `countOre`: `onProximityUpdate` (Drill.java 275, the one that feeds the building), `drawPlanConfig` (105) and the placement preview (146), which write the same shared fields. Not read: `offload()` (what happens when the building has no room), `Seq.peek` and `Mathf.approachDelta` (Arc library, not in this repo), what triggers `onProximityUpdate` (the building framework), `BurstDrill.java` (its own dominant-item code at 77-108 was only seen in grep). Searched and not found: no random drop table or loot roll in this repo (grep for drop, chance and loot across core/src; the only chance calls in production blocks are visual effects). Confidence: high on the yield order and numbers; this is a deterministic resource yield, not a loot roll, so it is a weak fit for kill loot and a real fit for timed node yields.

Best transferable idea: a timed yield should be the majority resource under the node (ties broken by a fixed priority, then a stable id), with progress that carries its remainder into whole items, and a warmup that ramps up while running and decays while blocked.
Decision (proposed): adapt - take the remainder carry, the majority-with-fixed-tie-break choice and the warmup ramp for zone gathering nodes if Frankendom adds them; drop the liquid boost and the unclamped emit; kill loot is unchanged.
Acceptance: a server test: a node over 3 tiles of ore A (hardness 1) and 1 tile of ore B yields only ore A; over a fixed interval it yields floor(progress / delay) whole items and keeps the remainder; when its held items reach capacity its progress stops and its warmup decays.

## 1. Mechanism

- Choosing the item (`countOre`, Drill.java 198-229), run whenever the building's neighbours change (275):
  - For each tile in the drill's footprint (205), if `canMine` (231-235): not static, has a drop, the drop's hardness is at most `tier`, and the drop is not in `blockedItems`. The tile's drop is counted (206-207). `Tile.drop()` (Tile.java 580-581) returns the overlay's item if the overlay has one, else the floor's.
  - The counted items are sorted (215-221) so that a non-low-priority item sorts above a low-priority one (216), then more tiles sorts higher (218), then a higher `id` sorts higher (220). The top item is the dominant item (227), with its tile count (228).
  - The building copies the result into `dominantItem` and `dominantItems` (276-277). Nothing is mined if no minable tile exists (223-225).
- Speed and delay: `getDrillTime(item)` = (drillTime + hardnessDrillMultiplier * hardness) / item multiplier (171). Default base 300 frames and 50 frames per hardness point (Drill.java 28, 36); the time is in frames (comment at 35).
- Per update (`updateTile`, 287-325):
  - No dominant item: return (292-294). Otherwise `timeDrilled` grows by warmup times delta (296); the delay is `getDrillTime(dominantItem)` (298).
  - If there is room (`items.total() < itemCapacity`), a dominant count above 0 and efficiency above 0 (300): `speed` = lerp(1, liquid boost, optional efficiency) times efficiency (301). The reported rate is speed times count times warmup divided by delay (303). Then warmup moves toward speed by `warmupSpeed` (304), and progress grows by delta times count times speed times the new warmup (305).
  - Otherwise (309-312): the reported rate is 0 and warmup moves toward 0.
  - When progress reaches the delay and there is room (315): `amount` = floor(progress / delay) (316); `offload(dominantItem)` is called `amount` times (317-319); progress keeps only the remainder, `progress %= delay` (321).

## 2. Key functions

- `countOre`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/world/blocks/production/Drill.java` 198-229 (footprint count, sort, dominant pick).
- `canMine`: the same file, 231-235 (tier and static gates).
- `updateTile`: the same file, 287-325 (warmup, progress, emit, remainder).
- `Tile.drop()`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/world/Tile.java` 580-581.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Delay per item = base + multiplier * hardness, divided by a per-item speed multiplier | drillTime 300 frames (Drill.java 36); hardnessDrillMultiplier 50 (28); per-item multiplier defaults to 1 (171) |
| Tier gate: items above the tier are not mined | tier field, no default set in Drill.java (34) |
| Warmup ramp toward speed, decays when blocked | warmupSpeed 0.015 per step (40); speed is efficiency times boost |
| Liquid boost multiplies the speed | liquidBoostIntensity 1.6 (38); no liquid mechanic appears in the Frankendom rulings this brief gave, so this is not adopted |
| Low-priority items lose ties to everything else | sand is lowPriority (Items.java 36); Item.lowPriority field (Item.java 39) |
| Whole items from a fractional progress, remainder kept | progress %= delay (Drill.java 321) |

## 4. TypeScript sketch

simplified: keeps the dominant-ore choice (low-priority rule, then count, then higher id), the delay formula, the warmup ramp (updated before progress, as in the donor), the progress accumulation, and the remainder carry. It omits: the liquid boost (no liquid mechanic in the brief), the blocked-item list, the static-block check, the building's proximity refresh, the reported rate, the effect calls, and `offload()`. It also changes the donor in one place: it clamps the emitted amount to the free capacity and keeps the remainder, where the donor does not clamp (Drill.java 315-319).

```ts
// Licence: GPL-3.0 (donor, Mindustry). clean-room
// Sketch of a drill that yields the dominant resource under its footprint, with a warmup ramp
// and a remainder carry so fractional progress becomes whole items. Shape only, not a translation.
export {};

interface Ore {
  name: string;
  id: number;
  lowPriority: boolean;   // low-priority items lose ties to everything else
  hardness: number;
}

interface Node {
  tier: number;                       // ores with hardness above this are not mined
  drillTime: number;                  // base time per item, in frames (donor: 300)
  hardnessMultiplier: number;         // extra time per hardness point (donor: 50)
  itemMultiplier: Map<string, number>;// per-item speed multiplier (donor default: 1)
  progress: number;
  warmup: number;
  itemsHeld: number;
  itemCapacity: number;
}

// Donor order: not lowPriority beats lowPriority, then more footprint tiles, then the higher id.
function better(a: { ore: Ore; count: number }, b: { ore: Ore; count: number }): boolean {
  if (a.ore.lowPriority !== b.ore.lowPriority) return !a.ore.lowPriority;
  if (a.count !== b.count) return a.count > b.count;
  return a.ore.id > b.ore.id;
}

// Dominant ore under the footprint. One entry per footprint tile; null = nothing minable on that tile.
// Simplified: the donor also skips blocked items and static blocks; the caller passes only minable tiles here.
function dominant(tiles: Array<Ore | null>, tier: number): { ore: Ore; count: number } | null {
  const counts = new Map<string, { ore: Ore; count: number }>();
  for (const ore of tiles) {
    if (ore === null || ore.hardness > tier) continue;
    const c = counts.get(ore.name);
    if (c !== undefined) c.count += 1;
    else counts.set(ore.name, { ore, count: 1 });
  }
  let best: { ore: Ore; count: number } | null = null;
  for (const c of counts.values()) {
    if (best === null || better(c, best)) best = c;
  }
  return best;
}

// Time for one item of this ore, in frames: (base + multiplier * hardness) / item speed multiplier.
function drillDelay(n: Node, ore: Ore): number {
  return (n.drillTime + n.hardnessMultiplier * ore.hardness) / (n.itemMultiplier.get(ore.name) ?? 1);
}

// Move v toward target by at most maxStep (sketch stand-in for the donor's approachDelta).
function approachTo(v: number, target: number, maxStep: number): number {
  if (v < target) return Math.min(v + maxStep, target);
  return Math.max(v - maxStep, target);
}

// One update of one node. Returns the number of whole items emitted this step.
// speed = efficiency times the boost (1 when unboosted); dt = frame delta.
// Simplified: the donor does not clamp the emitted amount to the free capacity; the sketch does
// (and keeps the remainder), and the donor's offload() was not read.
function step(n: Node, ore: Ore, count: number, speed: number, dt: number, warmupSpeed: number): number {
  if (n.itemsHeld >= n.itemCapacity || count <= 0 || speed <= 0) {
    n.warmup = approachTo(n.warmup, 0, warmupSpeed * dt);   // cool down while blocked or unpowered
    return 0;
  }

  const delay = drillDelay(n, ore);
  n.warmup = approachTo(n.warmup, speed, warmupSpeed * dt);  // warmup updated before progress, as in the donor
  n.progress += dt * count * speed * n.warmup;

  if (n.progress < delay) return 0;

  let amount = Math.floor(n.progress / delay);
  amount = Math.min(amount, n.itemCapacity - n.itemsHeld);
  n.itemsHeld += amount;
  n.progress %= delay;                                        // remainder carries to the next item
  return amount;
}
```

## 5. Lands in

- TARGET `origins/server/world-nodes.ts` (new: zone gathering nodes as data, yield computed on the server, items into the one ledger). Parity-checklist row 18 (loot and the item side of the ledger; a node yield is not a kill roll, so the kill roll itself is unchanged). Frankendom has no gathering yet; this is a proposal for later, not a current gap.
- Reuse tag: rewrite-from-idea (GPL-3.0 is copyleft; clean-room only, shape taken, no code)
- Brief rule served: one ledger (node items are credited by the server only); zones as data (node type and ore table are zone data); rules 7-9 n/a

## 6. Gaps and risks

- This is a deterministic yield, not a random drop. Frankendom's kill loot (row 18) still needs its own roll; do not read this note as loot.
- Ties go to the higher id, so the result depends on the content order of the ore ids. Frankendom must give ids a stable, written order.
- Low-priority ore (sand, Items.java 36) loses to every other ore even with more tiles. That is a content rule Frankendom would have to decide on purpose.
- The donor's emit loop is not clamped to the free space (315-319), and `offload()` was not read, so the donor may overfill. The sketch clamps. Do not copy the overfill.
- `countOre` writes shared return fields (returnItem, returnCount) that the placement preview also uses (Drill.java 105, 146). Frankendom should not share scratch state between preview and the server.
- The dominant item is refreshed only on proximity updates (275). What triggers those updates was not read; a node whose footprint changes without a refresh would yield the stale item.
- The liquid boost (liquidBoostIntensity 1.6, Drill.java 38) has no counterpart in the rulings this brief gave, and it is not in the sketch.
- Frames: the donor's time unit is frames (Drill.java 35); Frankendom must convert to its own tick length, which this note did not read.
