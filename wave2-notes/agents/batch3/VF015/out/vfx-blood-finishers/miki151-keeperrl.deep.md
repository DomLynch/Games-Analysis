# miki151-keeperrl (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/miki151-keeperrl/furniture.cpp` (with `creature.cpp` 2033-2075 for the trigger, `level.cpp` 583-602 for the loop) | Licence: GPL-2.0-or-later (repo `LICENSE` is GPL version 2; `creature.cpp` and `level.cpp` headers say "either version 2 of the License, or (at your option) any later version"; `furniture.cpp` has no licence header of its own, so the repo licence applies) | C++ | symbol `Furniture::spreadBlood`

Checked: Read end to end: the blood path of `creature.cpp` 2033-2075 (death and blood), `furniture.cpp` 243-278 (`updateFire`, which also runs the blood ring), 464-487 (`onBloodNear`, `hasBlood`, `spreadBlood`), `level.cpp` 104-115 (load-time set), 583-602 (tick loop), 720-728 (`setFurniture`), `model.cpp` 143-148 (model tick order). Data half: `data_free/game_config/furniture.txt` (grep for blood gave two rows, 2492 and 2517; read 2488-2519). Also read `util.cpp` 378-384 (`Rectangle::centered`), `game_time.cpp` 187 (the `_visible` literal only). Candidates opened: `furniture_tick.cpp` 78-95 (pit fill, touches blood only in passing), `creature.h` 246 (default drops), `furniture_entry.cpp` (grep lines 65-80 only, non-blood deaths), `fx_particle_system.cpp` (first lines only; not the particle system itself). Confidence: high on the blood ring (every function on the path was read); the countdown and radius are read from code and data. Not read: the particle system (`fx_manager.cpp`, `fx_factory.cpp`, `fx_particle_system.cpp` beyond its header), the value of one visible time unit, the width() body of `Rectangle` (the 9x9 size assumes width = kx - px, the usual convention), `Model::tick`'s caller, `map_gui.cpp` render of the BLOODY modifier, and the other `dieWithAttacker` callers except where listed. Callers of `dieWithAttacker`: the default (EVERYTHING) is used by `creature.cpp:1401` and `creature_factory.cpp:85` and `effect.cpp:1387` in the grep lines I saw; `furniture_entry.cpp:65` passes ONLY_INVENTORY (no blood). Camera_scope: not a camera topic.

Best transferable idea: A death leaves a stain only after a shared countdown in the area runs out, then the stain spreads to stainable neighbours one step later, so gore reads as a moving front instead of an instant decal.

Decision (proposed): adapt - keep the stain front (one step per neighbour, one-shot per tile, decal state that a kill sets) as client-side presentation fed by server-verified flesh kills; keep the countdown per tile as zone data; drop the fallback that spends countdown across a 9x9 square unless a test shows it reads well, because it makes stains depend on deaths nearby.
Acceptance: a server test kills N flesh creatures on a stainable tile and asserts the tile is stained at the configured count, that a FROZEN or ONLY_INVENTORY death adds no stain, and that a replay with the same seed gives the same stain set; the client shows the stained tile on the same kill and the neighbours one step later.

## 1. Mechanism

- Trigger: `Creature::dieWithAttacker(attacker, drops)` (creature.cpp 2033). Blood is only considered when `drops == EVERYTHING` (2049) and the body has FLESH health (2056). A FROZEN creature's EVERYTHING is downgraded to ONLY_INVENTORY before that (2037-2038), so a frozen kill leaves no blood. The default drops mode is EVERYTHING (creature.h 246).
- Step 1, the death tile (2065): `addBlood(position)` walks the furniture on the tile (2058). Each furniture with a `bloodCountdown` is decremented by one (`onBloodNear`, furniture.cpp 464-469). The one whose countdown reaches zero stains (`spreadBlood`).
- Step 2, the fallback (2066-2068): if nothing stained on the death tile, the code takes a random permutation of the square of radius 4 around the death tile (`Rectangle::centered(4)`, util.cpp 378-380), skips the death tile, and calls `addBlood` on each tile in turn until one returns true. Each call decrements every countdown on that tile by one. So while nothing has stained, every pool in the square loses one count per death. The loop stops at the first pool that reaches zero, and the pools later in the permutation keep their counts.
- Stain (`Furniture::spreadBlood`, furniture.cpp 475-487): only if the tile still has a countdown (476). The countdown is cleared (477), the tile gets the BLOODY view modifier and the name "BLOODY_WATER" (478-479). For each of the four neighbours (480) that has a countdown (482), the neighbour's `bloodTime` is set to now + one visible unit (483) and the neighbour is added to the burning set (484). Neighbours already stained have no countdown and are skipped.
- Ring (`Furniture::updateFire`, furniture.cpp 276-277): each level tick, `Level::tick` visits every entry in `burningFurniture` (level.cpp 600-602). In `updateFire`, when `bloodTime` has passed, `spreadBlood` runs on that tile. That stains it and wakes its neighbours, so the stain front moves one 4-neighbour step per visible unit, through tiles that still have a countdown. The wake time is one visible unit after the stain (483); the value of one visible unit is in game_time.cpp 187 but is not read.
- Data: the countdown is 30 for water (furniture.txt 2492). Enchanted water sets it to none (2517), so it cannot stain. These are the only two blood rows in the data file (grep).
- Setup and place: a tile with a stain or a pending ring is put in the burning set during level setup (level.cpp 104-113; the enclosing function was not read) and when a furniture is placed (725-726).
- Driving loop: `Model::tick` calls the creatures' tick, then each level's `tick` (model.cpp 147-148), then the collectives. The caller of `Model::tick` was not read, so the wall-clock rate of the ring is not known.

## 2. Key functions

- `Creature::dieWithAttacker`: `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 2033-2075 (the blood block is 2056-2069).
- `Furniture::onBloodNear`: `/mnt/frankendom-donors/miki151-keeperrl/furniture.cpp` 464-469 (decrement; true at zero).
- `Furniture::spreadBlood`: `/mnt/frankendom-donors/miki151-keeperrl/furniture.cpp` 475-487 (stain, rename, wake neighbours).
- `Furniture::updateFire` (blood ring at 276-277; the fire branch 246-275 is not part of this note): `/mnt/frankendom-donors/miki151-keeperrl/furniture.cpp` 243-278.
- `Level::tick` (the loop that visits the burning set): `/mnt/frankendom-donors/miki151-keeperrl/level.cpp` 583-602.
- `Level::setFurniture` (adds a tile to the set when it has blood or fire): `/mnt/frankendom-donors/miki151-keeperrl/level.cpp` 720-728.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stain needs a countdown; each triggering event decrements it; zero triggers the change | Countdown 30 for water (furniture.txt 2492); none for enchanted water (2517) |
| Stain front: a stained cell wakes its stainable 4-neighbours, which stain one step later | One visible time unit (furniture.cpp 483; unit value not read, game_time.cpp 187 is the literal) |
| Search an area around the event for a pool that can stain, in random order, stop at the first | Radius 4 (creature.cpp 2066, `Rectangle::centered(4)`); 9x9 if width = kx - px (util.cpp 379) |
| Only the flesh deaths with a full drop leave blood | FLESH health (2056); EVERYTHING drops (2049); FROZEN downgrade (2037-2038) |
| Stained state is a view modifier and a new name | BLOODY modifier (furniture.cpp 478); "BLOODY_WATER" (479) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (death tile first, then the shuffled square; countdown decrement; stain; wake neighbours with a ring time; ring fires in a tick). It takes the flesh and full-drop gate as a `bleeds` flag from the caller, and it uses a single layer and a plain Map for the tiles. It leaves out the view modifier and rename, the furniture layers, the save and load code, the Pit fill path, and the global RNG (the caller injects one). It changes one thing on purpose: a ringing pool is taken out of the pending set when it fires (fix D2 below); the donor never removes it.

```ts
// clean-room sketch: a flesh death counts down nearby stain pools; a pool that runs out becomes a stain
// and wakes its neighbouring pools one step later. Licence of donor: GPL-2.0-or-later. Written from the
// described mechanism, not a line-by-line translation.

export interface Pos { x: number; y: number; }

export interface StainParams {
  initialCountdown: number; // donor furniture.txt:2492 WATER bloodCountdown = 30
  radius: number;           // donor creature.cpp:2066 Rectangle::centered(4)
  ringDelay: number;        // donor furniture.cpp:483 "+ 1_visible" (value of one visible unit not read); ticks here
}

interface Pool {
  countdown: number | null; // null = no countdown (cannot stain) or already stained
  stained: boolean;
  ringAt: number | null;    // pending ring time, null when no ring is pending
}

const key = (p: Pos): string => `${p.x},${p.y}`;

function neighbours4(p: Pos): Pos[] {
  return [
    { x: p.x, y: p.y - 1 }, { x: p.x, y: p.y + 1 },
    { x: p.x - 1, y: p.y }, { x: p.x + 1, y: p.y },
  ];
}

function square(p: Pos, r: number): Pos[] {
  const out: Pos[] = [];
  for (let y = p.y - r; y <= p.y + r; y++)
    for (let x = p.x - r; x <= p.x + r; x++)
      out.push({ x, y });
  return out;
}

function shuffle<T>(xs: T[], rnd: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

export class StainField {
  private pools = new Map<string, Pool>();
  private pending = new Map<string, Pos>(); // FIX: only pools with a pending ring are visited each tick

  constructor(private p: StainParams, private rnd: () => number) {}

  addPool(pos: Pos, countdown: number | null): void {
    this.pools.set(key(pos), { countdown, stained: false, ringAt: null });
  }

  isStained(pos: Pos): boolean {
    return this.pools.get(key(pos))?.stained ?? false;
  }

  // Caller decides whether the death bleeds (flesh body, full drops, not frozen): donor creature.cpp:2037-2056.
  onDeath(pos: Pos, bleeds: boolean, now: number): void {
    if (!bleeds) return;
    if (this.countDown(pos, now)) return;
    // donor creature.cpp:2066-2068: every other cell in the square is tried in random order until one stains
    const cells = shuffle(
      square(pos, this.p.radius).filter(c => !(c.x === pos.x && c.y === pos.y)),
      this.rnd,
    );
    for (const c of cells)
      if (this.countDown(c, now)) break;
  }

  // Donor furniture.cpp:464-469 (onBloodNear): decrement, and report true when it reaches zero.
  private countDown(pos: Pos, now: number): boolean {
    const pool = this.pools.get(key(pos));
    if (!pool || pool.countdown === null) return false;
    pool.countdown -= 1;
    if (pool.countdown !== 0) return false;
    this.stain(pos, now);
    return true;
  }

  // Donor furniture.cpp:475-487 (spreadBlood): stain this pool, schedule the stained neighbours' rings.
  private stain(pos: Pos, now: number): void {
    const pool = this.pools.get(key(pos));
    if (!pool) return;
    pool.countdown = null;
    pool.stained = true;
    for (const n of neighbours4(pos)) {
      const np = this.pools.get(key(n));
      if (np && np.countdown !== null) {
        np.ringAt = now + this.p.ringDelay;
        this.pending.set(key(n), n);
      }
    }
  }

  // Donor furniture.cpp:276-277 (updateFire), driven each level tick by level.cpp:600-602.
  tick(now: number): void {
    for (const [k, pos] of [...this.pending]) {
      const pool = this.pools.get(k);
      if (!pool || pool.ringAt === null || pool.ringAt > now) continue;
      pool.ringAt = null;
      this.pending.delete(k); // FIX: the donor never removes the entry, so it is visited every tick forever
      this.stain(pos, now);
    }
  }

  pendingCount(): number {
    return this.pending.size;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/VF015_keeperrl_blood_stain.ts`).

## 5. Lands in

- TARGET `src/fight/blood.ts` (new module): the stain field for presentation. The stain is a client decal state set from server-verified flesh kills (the kill is the server's call; the stain only reads it). If Lead wants stains to affect play (footing, tracking), that is a separate decision that must go through the engine.
- Parity-checklist row 8 (blood, wounds, decals). The death itself is row 17; this note is about the stain only.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the stain is a client view fed by server kills, not a second state); rules 7-9 n/a

## 6. Gaps and risks

- Client, not engine: in the donor the stain is world state (a furniture tile with a modifier and a new name), so it sits in the same level as the creatures. In Frankendom blood is presentation. The rule to keep is that the stain is derived from kill events, never read back by the fight.
- Server-verified kills: the donor triggers blood inside the death call (creature.cpp 2033-2069). Frankendom must trigger it from the server's accepted kill, not from a client death event.
- Determinism: the fallback uses the global `Random.permutation` (creature.cpp 2066). Two clients or a replay would not agree. The stain should use a client RNG for looks only, or the seeded stream if a stain ever affects play.
- Design question (not a defect, but decide it): the fallback decrements every pool in the square on each death until one stains (creature.cpp 2066-2068). So a stain depends on deaths nearby, not only on deaths on that tile. Pick one rule and test it. The sketch keeps the fallback because it is the donor's rule; the acceptance test is the way to decide.
- Defect D1, the ring never leaves the set: a pool that has been reached by a ring keeps its `bloodTime` after it stains (`spreadBlood` does not clear it, 475-487; `updateFire` does not clear it, 276-277), and nothing removes it from `burningFurniture`. The grep of the whole repo finds inserts only (level.cpp 113, 580, 726), one iteration (600), and the declaration (level.h 192). So each ringed pool gets an `updateFire` call on every level tick for the rest of the game, doing nothing once stained. The origin pool does not get stuck this way, since it never gets a `bloodTime`. fix: clear `bloodTime` and erase the entry when the ring fires (sketch `tick`).
- Defect D2, blood and fire share one function and one set: `updateFire` carries the blood ring (276-277) and fire is in the same set (level.cpp 725). That coupling is why the stale entry in D1 happens unnoticed. fix: give the stain its own set and tick, as the sketch does.
- MAX_ATTACKERS = 3 and the hate list do not apply: there is no attacker model in this code. The one attacker-related rule that does transfer is the non-bleeding death (ONLY_INVENTORY, furniture_entry.cpp 65), which is a useful test case.
- Zones as data: the stainable tile is data (`bloodCountdown` on the furniture row). Frankendom should expose the countdown and the ring delay as zone data fields with defaults, not as constants.
- Particle system and screen effects: the donor also has a particle system (fx_particle_system.cpp, fx_manager.cpp, fx_factory.cpp, about 2,500 lines together). Only the header of fx_particle_system.cpp was read. It is the candidate for the particle and screen-effect half of this cell, and it needs its own read before anyone calls it strong.
