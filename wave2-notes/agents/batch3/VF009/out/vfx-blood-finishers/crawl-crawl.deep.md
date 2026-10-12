# crawl-crawl (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/bloodspatter.cc` | Licence: GNU GPL v2 or later (repo LICENSE lines 6-8; README line 96 says "GPLv2+") | C++ | symbols `bleed_onto_floor`, `_maybe_bloodify_square`, `_spatter_neighbours`, `generate_random_blood_spatter_on_level`, `blood_spray`, `bleed_for_makhleb`, plus the queue in `fineff.cc` (`blood_fineff`, `fire_final_effects`)

Checked: category_no 13 (vfx-blood-finishers), camera_scope not applicable (blood decals, not camera). Read in full: `bloodspatter.cc` 1-283, `attack.cc` 95-114 (the hook that queues blood), `fineff.cc` 61-67, 672-684, 724-727, 960-963, 1044-1050, 1240-1242, 2129-2137, `random.cc` 435-444 (x_chance_in_y). Callers: `melee-attack.cc` 1020-1036 and 3355-3375, `monster.cc` 4345-4358 and `main.cc` 2580-2590 were read around the call line; `mon-cast.cc` 973, `god-abil.cc` 6896, `beam.cc` 4328 and `stairs.cc` 1107 were seen only in grep (not read). The enclosing functions of the call sites were not read, so when each caller fires is (not read) beyond the queue itself. Confidence high on the decal rules (read end to end); moderate on the queue timing (read the queue, not every flush site).

## 1. Mechanism

- Blood is a per-square flag, not a particle. Setting it is a probabilistic roll, not a deterministic mark. A square's roll succeeds with chance `amount/20`, capped at 1 (`bloodspatter.cc` 138; `random.cc` 440-443 makes `x_chance_in_y(x, y)` true with probability x/y).
- Entry point for attacks made through the `attack` class (melee; other damage paths such as `beam.cc` call `bleed_onto_floor` directly, not read in full): `attack::handle_phase_damaged` (`attack.cc` 95). If the defender has blood, is not summoned, is in bounds and this is not a simulation (guard lines above 105, read, not receipted), it takes `blood = damage_done`, capped at the defender's HP before the hit (106-107), and queues a blood job (109). Damage is applied after that (114). So the cap uses HP before the hit: a killing blow still bleeds, up to the HP it removed.
- The queue is the final-effects list. A new job merges into a queued job with the same tile and monster type by adding the amounts (`fineff.cc` 963 for the key, 1049 for the sum, 678 for the merge call). Jobs fire at the end of the turn (`fire_final_effects`, `fineff.cc` 2129-2137): the newest job is popped and removed first, so nothing can merge into it, then fired. `blood_fineff::fire` calls `bleed_onto_floor(..., blood, true)` (`fineff.cc` 1242): spatter on.
- `bleed_onto_floor` (165-183) skips a monster type with no blood, then calls `_maybe_bloodify_square` (182).
- `_maybe_bloodify_square` (122-161), in order: return if amount < 1 (127); if the ignite mutation is held and the square is seen, double the amount (135-136; the fire cloud branch 149-154 is not part of the blood rule); roll `x_chance_in_y(amount, 20)` (138) and return on failure; if the square may bleed, set the flag (144-146) and orient wall blood (147); then, if `spatter` is set (158), every one of the 8 neighbours gets `_maybe_bloodify_square(*ai, amount/15, false, ...)` (159-160). That is a second roll with chance `amount/15` out of 20 for each neighbour, and neighbours do not spread again. The neighbour loop runs whether or not the centre was marked.
- `_allow_bleeding_on_square` (28-56) is the surface filter: no sanctuary (32), not already bloody unless igniting (37), no lava or water (41), no blue or sparkling fountain (45-49), no good-god altar (52).
- Wall blood (`_orient_wall_blood`, 80-120): a wall square takes the drip direction that faces the nearest open orthogonal cell that the source can see (88-101, 111-117). A wall in a corner gets no blood (105-109).
- Level dressing (`generate_random_blood_spatter_on_level`, 229-268): 7 to 15 random clusters (231). Each cluster marks its centre without a roll (`maybe_bloodify_square`, 264) and then spreads through `_spatter_neighbours` (212-226) with start chance `startprob` (262). A neighbour is marked with chance 1/chance, and a marked neighbour spreads again with chance+1 (220, 224). Fewer than 10 clusters keep the start range at 1..3 (lower start chance, so each cluster spreads wider); more than 12 move it to 2..5 (each cluster spreads less) (242-245, comments 235-237).
- Spray (`blood_spray`, 185-210): `level` drops, each with a radius from 1 to `max_ranged` (default 8, 193). Each drop picks random offsets in that square until one is in bounds and visible, with 5000 tries shared by the whole spray (195-208). Each drop uses amount 99, so it always passes the roll (99 of 20 is always true, `random.cc` 440-441) and marks the square if it may bleed (205, 146).
- Makhleb puddle (`bleed_for_makhleb`, 272-283): the first unbloodied, allowed, visible square within radius 2 (274-277) gets amount 20 (279); 20 of 20 always passes the roll, so the puddle always lands.

## 2. Key functions

- `_maybe_bloodify_square`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/bloodspatter.cc` 122-161. The decal rule: chance amount/20, neighbours amount/15, one spread level.
- `attack::handle_phase_damaged` (queue hook): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/attack.cc` 95-114. Blood = damage capped at HP before the hit, queued before damage is applied.
- `_schedule_final_effect` and `blood_fineff::merge`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/fineff.cc` 672-684 and 1044-1050. Same tile plus same monster type: amounts add.
- `fire_final_effects`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/fineff.cc` 2129-2137. Pops from the back, removes first, fires.
- `_spatter_neighbours` and `generate_random_blood_spatter_on_level`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/bloodspatter.cc` 212-268. Level-time clusters with a shrinking spread.
- `blood_spray`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/bloodspatter.cc` 185-210. Radius-random drops with a shared try budget.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Decal chance = damage / 20, capped at 1 (one roll per square) | Divisor 20 (theirs, `bloodspatter.cc` 138) |
| Neighbours get damage / 15, one roll each, no further spread | Divisor 15 (theirs, `bloodspatter.cc` 160) |
| Blood amount = damage, capped at HP before the hit | Cap uses HP before the hit (theirs, `attack.cc` 106) |
| Same tile and type merge by summing amounts before they fire | Merge key = tile + monster type (theirs, `fineff.cc` 963) |
| Level clusters: count 7 + random(9), start chance 1..4 shifted by count | 7 + random2(9) (theirs, `bloodspatter.cc` 231); shift at 242-245; start formula at 262 |
| Spray: random radius, always lands, shared try budget | Radius max 8 (default, 193), amount 99 (205), tries 5000 (195) |
| Makhleb puddle: radius 2, amount 20 | Radius 2 (theirs, `bloodspatter.cc` 274), amount 20 (279) |
| Spread chance 1/k, k rises by one per generation | Start k 1..4 (262) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one hit (roll, centre mark, then the one-level neighbour roll with amount/15), the level-dressing spread (chance 1/k, k+1), the spray with a shared try budget, and the queue (merge by tile and kind, pop newest first). It omits: the ignite mutation doubling and the fire cloud; the wall-facing orientation (the donor's four drip flags and the corner rule); the monster-has-blood check (the caller passes `defenderHasBlood`); the separate surface kinds beyond floor/wall/other (the donor's lava, water, fountain and altar checks are reduced to one list); the old-blood inscription flag; line-of-sight (the caller supplies `visible`); the in-bounds handling of the donor's iterator (not read, so the sketch checks bounds itself). It also differs on one point: the donor's queue fires on turn end from `fire_final_effects`, and the sketch fires when `fire` is called.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Tile {
  bloody: boolean;
  surface: "floor" | "wall" | "liquid" | "fountain" | "goodAltar" | "sanctuary";
}
export interface Grid {
  w: number;
  h: number;
  tiles: Tile[];
}
export interface Rng {
  int(n: number): number; // uniform integer 0..n-1
}

const at = (g: Grid, x: number, y: number): Tile => g.tiles[y * g.w + x];
const inside = (g: Grid, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < g.w && y < g.h;

function eight(x: number, y: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (dx !== 0 || dy !== 0) out.push([x + dx, y + dy]);
  return out;
}

// True with probability x / y; always true when x >= y; never when x <= 0.
function chanceIn(rng: Rng, x: number, y: number): boolean {
  if (x <= 0) return false;
  if (x >= y) return true;
  return rng.int(y) < x;
}

// May this tile take a blood mark? (surface exclusions and not already bloody)
function mayBleed(g: Grid, x: number, y: number): boolean {
  if (!inside(g, x, y)) return false;
  const t = at(g, x, y);
  if (t.bloody) return false;
  return t.surface === "floor" || t.surface === "wall";
}

// Donor: _maybe_bloodify_square. One roll with chance amount/20 decides the
// centre tile; the eight neighbours then get amount/15 with no further spread.
export function bloodifySquare(
  g: Grid, rng: Rng, x: number, y: number, amount: number, spatter: boolean,
): void {
  if (amount < 1) return;
  if (!chanceIn(rng, amount, 20)) return;
  if (mayBleed(g, x, y)) at(g, x, y).bloody = true;
  if (spatter) {
    for (const [nx, ny] of eight(x, y)) {
      if (inside(g, nx, ny)) bloodifySquare(g, rng, nx, ny, Math.floor(amount / 15), false);
    }
  }
}

// Donor: _spatter_neighbours. Each free neighbour is marked with chance 1/chance;
// a marked tile spreads again with chance + 1, so clusters shrink as they grow.
function spatterNeighbours(g: Grid, rng: Rng, x: number, y: number, chance: number): void {
  for (const [nx, ny] of eight(x, y)) {
    if (!mayBleed(g, nx, ny)) continue;
    if (chanceIn(rng, 1, chance)) {
      at(g, nx, ny).bloody = true;
      spatterNeighbours(g, rng, nx, ny, chance + 1);
    }
  }
}

// Donor: generate_random_blood_spatter_on_level. Cluster count 7..15 and the
// start chance range change with the cluster count (see the donor comments).
export function levelSplatter(g: Grid, rng: Rng): void {
  const clusters = 7 + rng.int(9);
  let minProb = 1;
  let maxProb = 4;
  if (clusters < 10) maxProb--;
  else if (clusters > 12) minProb++;
  for (let i = 0; i < clusters; i++) {
    const x = rng.int(g.w);
    const y = rng.int(g.h);
    const startProb = minProb + rng.int(maxProb);
    if (mayBleed(g, x, y)) at(g, x, y).bloody = true;
    spatterNeighbours(g, rng, x, y, startProb);
  }
}

// Donor: blood_spray. Each drop picks a radius 1..maxRanged and tries random
// offsets (5000 tries shared by the whole spray) until one is visible.
export function bloodSpray(
  g: Grid, rng: Rng, ox: number, oy: number, level: number,
  visible: (x: number, y: number) => boolean, maxRanged = 8,
): void {
  let tries = 0;
  for (let i = 0; i < level; i++) {
    const range = rng.int(maxRanged) + 1;
    while (tries < 5000) {
      tries++;
      const x = ox + rng.int(2 * range + 1) - range;
      const y = oy + rng.int(2 * range + 1) - range;
      if (inside(g, x, y) && visible(x, y)) {
        bloodifySquare(g, rng, x, y, 99, false);
        break;
      }
    }
  }
}

export interface BloodJob { x: number; y: number; kind: string; amount: number; }

// Donor: _schedule_final_effect plus fire_final_effects. Blood jobs are queued
// until the action ends; a job with the same tile and kind absorbs the new amount.
export class FinalEffects {
  private jobs: BloodJob[] = [];

  scheduleBlood(x: number, y: number, kind: string, amount: number): void {
    const same = this.jobs.find((j) => j.x === x && j.y === y && j.kind === kind);
    if (same) same.amount += amount;
    else this.jobs.push({ x, y, kind, amount });
  }

  // Pops from the back and removes the job before firing, so nothing can merge into it.
  fire(g: Grid, rng: Rng): void {
    while (this.jobs.length > 0) {
      const job = this.jobs.pop()!;
      bloodifySquare(g, rng, job.x, job.y, job.amount, true);
    }
  }
}

// Donor: attack::handle_phase_damaged. The blood amount is the damage, capped at
// the defender's HP before the hit lands, and it is queued before the damage is applied.
export function onHitLanded(
  q: FinalEffects, x: number, y: number, kind: string,
  damage: number, hpBeforeHit: number, defenderHasBlood: boolean,
): void {
  if (!defenderHasBlood) return;
  const blood = Math.min(damage, hpBeforeHit);
  if (blood > 0) q.scheduleBlood(x, y, kind, blood);
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/blood.ts` (client-only decal layer, fed by the engine's hit events; the engine never reads it). Parity-checklist row 8 (blood/wounds/decals). The damage numbers come from row 1 (`src/fight/damage.ts`, the one ledger); this module only reads them.
- Reuse tag: rewrite-from-idea (GPLv2+; clean-room only)
- Brief rule served: 1 (one combat core, two clients); the decal layer is a client, so the camera/HUD/sound client-only ruling applies; rules 7-9 n/a

## 6. Gaps and risks

- Client-only: decals must never change game state. The donor's flag has no gameplay reader in these functions; the renderer that draws the flag was not read (not read). Frankendom must enforce "decals never feed the ledger" by code, not convention.
- Server-verified hits: the donor takes the amount from the damage that was just computed, and caps it at HP before the hit. Frankendom's hit event must carry `damage` and `hpBeforeHit` as server-verified values, so the client shows the same blood the server settled. A client-side guess of damage would show blood the ledger never recorded.
- Replay and determinism: the donor's rolls use the game's shared random source. Frankendom's fight record (row 19) must replay the same outcome, so decal rolls need their own seeded stream that the fight record does not read.
- Many-on-one: with MAX_ATTACKERS = 3 several hits can land on one tile in one turn. The merge-by-tile rule keeps the decal count down. Frankendom should key the merge on tile and the struck fighter (the sketch keys on tile and kind), not on the donor's monster type.
- Per-frame budget: the spray's 5000-try cap is a loop bound, not a frame budget. A phone build should cap decals per frame and per fight (client compute budget), and decide the cap as data.
- Wall orientation: the donor uses four grid drip directions. A 3D arena needs a surface normal and a projection, so this part does not transfer as written.
- Fire (ignite) and fire cloud: out of scope for Frankendom; drop them.
- GPLv2+: clean-room only. The sketch is written from the mechanism, not translated.
- Cluster details the mechanism skipped (reading): `generate_random_blood_spatter_on_level` takes a `susceptible_area` mask and skips any cluster centre outside it (donor 253-254), which the sketch does not model. `_spatter_neighbours` iterates `adjacent_iterator(where, false)`, where the second argument is `exclude_center`, so it visits 9 cells including the centre (coordit.h 116-117); the centre is already bloody or disallowed so this changes nothing in practice. It also calls `_orient_wall_blood(where, ...)` with the parent square, not the neighbour that was marked, so wall orientation for spread blood uses the wrong square (low importance for a 3D port, which drops this part).
- Unread: the ignite cloud branch is named but not studied; the callers listed in Checked were not read end to end, so turn-timing claims are limited to the queue itself.

Reuse tag: rewrite-from-idea (GPLv2+; clean-room only)
Brief rule served: 1 (one combat core, two clients); client-only visuals per camera/HUD/sound ruling; rules 7-9 n/a

Best transferable idea: a hit's decal chance scales with its damage (damage/20 per square, damage/15 per neighbour, one roll), and same-tile hits in one turn merge before they fire.

Decision (proposed): adapt — take the chance-from-damage rule and the end-of-turn merge for a client decal layer fed by server-verified hit events; drop the 4-way wall flags and the fire branch, which do not transfer to a 3D arena.
Acceptance: on a 375-wide phone fight, a 20-damage hit always leaves a blood mark on the victim's tile, and a 4-damage hit leaves a mark about one time in five; three 4-damage hits on the same tile in one turn produce one blood job of amount 12, and no decal is ever read by the ledger (a server test asserts the fight outcome is unchanged with decals disabled).

Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR. Core rules verified (x_chance_in_y, amount/20 then amount/15 with no further spread, ignite doubling, surface filter, attack.cc 95-114 cap, blood_fineff merge, pop-then-fire, cluster 7+random2(9), blood_spray 5000/99/8, Makhleb radius 2 amount 20, GPLv2+).
- Small gaps confirmed: _spatter_neighbours uses adjacent_iterator(where,false) (9 cells, includes centre) and passes the parent square to _orient_wall_blood; generate_random_blood_spatter_on_level skips clusters outside susceptible_area.
- Missed: susceptible_area filter; the _orient_wall_blood parent-square quirk (both added to Gaps).

Fixed 2026-10-12: added the cluster-details line to Gaps. Sketch unchanged.
