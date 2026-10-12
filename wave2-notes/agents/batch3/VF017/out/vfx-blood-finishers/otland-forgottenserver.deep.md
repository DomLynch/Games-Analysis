# otland-forgottenserver (vfx-blood-finishers, cell 1)

Donor: `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` | Licence: GPL-2.0 (LICENSE file: GNU General Public License, Version 2, June 1991) | C++ | symbol `Game::combatChangeHealth`, `Game::combatGetTypeInfo`, `Creature::dropCorpse`

Checked: Read `Game::combatGetTypeInfo` (game.cpp 4043-4110 and 4086-4096; its other damage-type cases from 4110 to 4146 were not read), `Game::combatChangeHealth` body in pieces (4148-4160, 4395-4538), `Game::startDecay` and `checkDecay` (4729-4760, 4768-4807, decay queue 4836-4852), `Tile::addThing` splash rule (tile.cpp 819, 855-880), `Creature::onDeath` and `dropCorpse` (creature.cpp 448-456, 511, 523-566), the splash item stages in items.xml (1744-1770), items.cpp 942-946, item.cpp 239-251, game.h 47-48, const.h 25 and 591-592, rat.xml line 2. Opened 9 candidate files; the hint `src/const.h` is enum values only, so the real logic is in game.cpp. Confidence high on the hit path order and the splash rules; medium on the decay wheel (scheduling read, the removal path after line 4807 and `transformItem` were not read). Callers of `combatChangeHealth` were listed by grep (combat.cpp 822, 990; condition.cpp 1402; player.cpp 2051; luascript.cpp 8389) but not read.

Best transferable idea: Keep a per-race table of hit effect, colour and floor decal, let the decal be one per tile with a newer one replacing the old, give decals staged lifetimes as data, and skip the decal in safe zones.

Decision (proposed): adapt - take the race table, the one-decal-per-tile rule and the staged decal lifetime, but the decal is client-only presentation driven by a hit event from the engine (race, kind, tile, safe) emitted after the lethal veto; the donor's item-on-tile model and its side effect in the lookup are not used. Why: Frankendom's engine owns the kill and the client owns the look, and the donor's order (effects before the veto) breaks that.

Acceptance: A player in an open zone who lands a physical hit on a blood-race creature sees a splash that changes after 45 s and clears after about 150 s, and a second hit on that spot replaces it; in a safe zone the hit flash shows and no splash appears; a server test asserts that a lethal hit refused by the prepare-death rule emits no hit event and drains no health.

## 1. Mechanism

- One function applies a hit to a creature: `Game::combatChangeHealth` (4148). Its callers, found by grep, are in combat.cpp, condition.cpp, player.cpp (reflect) and the Lua API (luascript.cpp). Callers were not read, so this note describes the body only.
- Order of steps inside the body, as the code runs:
  (a) If the primary damage is positive and the target is dead, return false (4149-4154).
  (b) HEALTHCHANGE creature events run and may re-enter the function (4411-4415).
  (c) Clamp: `targetHealth` is read (4419); if the primary damage is at least the target's health it is cut to the target's health and the secondary is zeroed (4420-4425).
  (d) If the realised damage is zero, return true with no visuals (4427-4429).
  (e) Visuals: if the primary value is non-zero, `combatGetTypeInfo` picks the hit effect and text colour, and for physical damage on a blood-race target outside a protection zone it creates a small splash, places it on the target tile and starts its decay (4440-4449; body 4043-4092).
  (f) Lethal check: if the realised damage is at least the target's health, each PREPAREDEATH creature event runs; if one returns false the function returns false without draining (4525-4531).
  (g) `target->drainHealth(attacker, realDamage)` removes the health (4533).
  So the blood effect and the splash are shown and placed before the lethal veto and before the health is removed (see section 6).
- Race table (inside `combatGetTypeInfo`, physical damage only, 4046): blood gives `CONST_ME_DRAWBLOOD` and red text, and a small blood splash unless the tile is a protection zone (4054-4059); venom gives a poison effect, light-green text and a slime splash with no zone check; ink gives an ink effect, dark-grey text and an ink splash unless protection zone; undead gives `CONST_ME_HITAREA` and light-grey text with no splash; fire gives blood-style effect and orange text with no splash; energy gives an energy effect and purple text with no splash.
- Splash placement: `internalAddItem` puts the splash on the target tile and `startDecay` starts its decay (4091-4092). `Tile::addThing` first removes one existing splash on the tile before inserting the new one (tile.cpp 862-874), so a tile keeps the newest splash.
- Decay: a small splash (item 2019) decays to 2020, then 2021, then is removed (decayTo 0). Stage durations are 45 s, 45 s and 60 s (items.xml 1760, 1764, 1768). Full splash (item 2016, used on death) follows 2016 -> 2017 -> 2018 with 45 s, 45 s and 600 s (items.xml 1748, 1752, 1756). The XML value is seconds; `item.cpp` 241 multiplies by 1000 to milliseconds.
- Scheduler: `checkDecay` is started on a 250 ms tick (game.cpp 71 and 4770; `EVENT_DECAYINTERVAL` = 250 at game.h 47). Items sit in one of 4 buckets (game.h 48). Each tick visits one bucket, so each bucket is visited once per second; a visit takes off `min(1000, duration)` ms (4784-4786). After a visit, an item with 4 s or more left stays in its bucket and a shorter one is re-filed by its remaining seconds (4789-4803). Items queued by `startDecay` enter the wheel at 4845-4850.
- Death: `Creature::onDeath` (448) calls `dropCorpse` (511). For venom, blood and ink races (switch at 541-549) `dropCorpse` creates a full splash, places it on the tile and starts its decay (560-561). There is no protection-zone check on this path (see section 6).

## 2. Key functions

- `Game::combatChangeHealth`: `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` 4148-4538. Order as in section 1. Read: 4148-4160, 4395-4538. Not read: 4160-4395 (the top branch with its own secondary handling).
- `Game::combatGetTypeInfo`: `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` 4043-4146. Read 4043-4110 and 4086-4096: the physical-damage race switch (4046-4090) plus the splash creation and placement (4091-4092). Not read: 4110-4145 (other damage types). Its name says "type info" but it places an item on the map.
- `Game::startDecay` / `Game::checkDecay`: `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` 4729-4760 and 4768-4807, queue 4836-4852. Not read: the rest of `internalDecayItem` and `transformItem`.
- `Tile::addThing` splash rule: `/mnt/frankendom-donors/otland-forgottenserver/src/tile.cpp` 819, 862-874.
- `Creature::onDeath` and `Creature::dropCorpse`: `/mnt/frankendom-donors/otland-forgottenserver/src/creature.cpp` 448, 511, 523-566.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Race table: hit effect, text colour, floor decal per race | Effect enum names and text colours (theirs, const.h 25 for `CONST_ME_DRAWBLOOD = 1`; race switch game.cpp 4048-4090) |
| Decal only outside a safe zone | Protection-zone flag (game.cpp 4058); no number |
| One decal per tile, newest replaces the old one | Rule only (tile.cpp 862-874) |
| Staged decal lifetime, then removed | Small splash 45 s / 45 s / 60 s (items.xml 1760, 1764, 1768); full splash 45 s / 45 s / 600 s (items.xml 1748, 1752, 1756). Seconds in the file, x1000 at item.cpp 241 |
| Decay tick and wheel | 250 ms tick; 4 buckets (game.h 47-48); one visit per bucket per second (game.cpp 4784) |
| Clamp to remaining health before effects | Threshold = target's current health (game.cpp 4419-4420) |
| Lethal veto before the drain | PREPAREDEATH event return value (game.cpp 4527) |

## 4. TypeScript sketch

simplified: the sketch keeps the race table, the one-decal-per-tile rule, the protection-zone gate and both stage lists (45/45/60 and 45/45/600 seconds). It reorders the steps: clamp, then the lethal veto, then visuals, then the drain, where the donor shows the visuals (4440-4449) before the veto (4525-4531) and the drain (4533). It omits: spectator lists and message text, the combat analyzer, the secondary damage value, HEALTHCHANGE events, the fluid sprites, the 4-bucket wheel (a plain per-frame dt is used instead of the 250 ms tick) and the death callback beyond the splash. The lethal veto is a boolean input rather than the event callback.

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Race = "blood" | "venom" | "ink" | "undead" | "fire" | "energy" | "none";
type Fluid = "blood" | "slime" | "ink";
type DamageKind = "physical" | "other";

interface HitFx {
  effect: string;      // donor enum name for the hit effect (CONST_ME_*), shown to spectators
  colour: string;      // donor text colour name (TEXTCOLOR_*)
  splash: Fluid | null; // floor splash, only for physical hits
}

// Data table, one row per race. Pure lookup: it returns what to show and places nothing.
const HIT_FX: Record<Race, HitFx> = {
  blood:  { effect: "CONST_ME_DRAWBLOOD",  colour: "TEXTCOLOR_RED",          splash: "blood" },
  venom:  { effect: "CONST_ME_HITBYPOISON", colour: "TEXTCOLOR_LIGHTGREEN",  splash: "slime" },
  ink:    { effect: "CONST_ME_DRAWINK",     colour: "TEXTCOLOR_DARKGREY",    splash: "ink" },
  undead: { effect: "CONST_ME_HITAREA",     colour: "TEXTCOLOR_LIGHTGREY",   splash: null },
  fire:   { effect: "CONST_ME_DRAWBLOOD",   colour: "TEXTCOLOR_ORANGE",      splash: null },
  energy: { effect: "CONST_ME_ENERGYHIT",   colour: "TEXTCOLOR_ELECTRICPURPLE", splash: null },
  none:   { effect: "CONST_ME_NONE",        colour: "TEXTCOLOR_NONE",        splash: null },
};

// Decal lifetimes are data: seconds per stage, removed after the last stage.
const SMALL_SPLASH_STAGES_S = [45, 45, 60];   // donor items.xml 1760, 1764, 1768
const FULL_SPLASH_STAGES_S = [45, 45, 600];   // donor items.xml 1748, 1752, 1756

interface Decal {
  fluid: Fluid;
  stages: number[];   // seconds per stage, remaining stages only
  msLeft: number;     // time left in the current stage
}

class Floor {
  private decals = new Map<string, Decal>(); // one decal per tile key

  // Replaces any decal already on the tile. A safe zone gets no floor decal.
  place(tile: string, fluid: Fluid, stages: number[], safe: boolean): void {
    if (safe) return;
    this.decals.set(tile, { fluid, stages: stages.slice(1), msLeft: stages[0] * 1000 });
  }

  // Delta-time update. Donor uses a 4-bucket wheel with a 250 ms tick; here a plain dt is used.
  tick(dtMs: number): void {
    for (const [tile, d] of this.decals) {
      d.msLeft -= dtMs;
      while (d.msLeft <= 0) {
        if (d.stages.length === 0) { this.decals.delete(tile); break; }
        d.msLeft += d.stages.shift()! * 1000;
      }
    }
  }

  count(): number { return this.decals.size; }
}

interface HitInput {
  race: Race;
  kind: DamageKind;
  raw: number;          // damage before clamping
  hp: number;           // target health before the hit
  lethalVeto: boolean;  // a prepare-death rule refused the death
  safe: boolean;        // tile is a safe zone
  tile: string;
}

interface HitOutcome { drained: number; fx: HitFx | null; vetoed: boolean; }

// Order: clamp to remaining health, then the veto check, then visuals, then the drain.
// Donor order differs: it shows the effect and places the splash before the veto and the drain.
function resolveHit(p: HitInput, floor: Floor): HitOutcome {
  const dmg = Math.min(Math.max(p.raw, 0), p.hp);
  if (dmg === 0) return { drained: 0, fx: null, vetoed: false };
  if (dmg >= p.hp && p.lethalVeto) return { drained: 0, fx: null, vetoed: true };

  const fx = HIT_FX[p.race];
  if (p.kind === "physical" && fx.splash !== null) {
    floor.place(p.tile, fx.splash, SMALL_SPLASH_STAGES_S, p.safe);
  }
  return { drained: dmg, fx, vetoed: false };
}

// Death: one rule for the safe zone, applied to the death splash too (donor death path skips it).
function onDeath(race: Race, tile: string, safe: boolean, floor: Floor): void {
  if (race === "blood") floor.place(tile, "blood", FULL_SPLASH_STAGES_S, safe);
  if (race === "ink") floor.place(tile, "ink", FULL_SPLASH_STAGES_S, safe);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` run on the VPS at /tmp/otland-hitfx-blood.ts, exit 0.

## 5. Lands in

- TARGET `src/fight/hitfx.ts` (new): the engine emits one hit event (race, kind, tile, safe) only after the lethal veto and the clamp; the client maps it to the flash and the decal. Parity-checklist row 8 (blood, wounds and decals). The lead's hint was row 10; row 10 covers only the hit flash and the hitstop, which this donor does not model, so row 8 is the row the mechanism lands in.
- today: nothing read in Frankendom (the target file is named by the brief, not checked against the repo).
- Reuse tag: rewrite-from-idea (GPL-2.0: clean-room, shape only)
- Brief rule served: 1 (one engine decides the hit and the drain; the client only draws it); zone data (the safe flag is zone data)

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is from the mechanism, not a translation.
- Defect, order: the donor shows the effect and places the splash (4440-4449) before the lethal veto (4525-4531) and before the drain (4533), so a hit that a PREPAREDEATH event refuses still leaves blood. Keep the idea, fix: resolve the clamp and the veto first, then emit the hit event (sketch `resolveHit`).
- Defect, side effect in a lookup: `combatGetTypeInfo` places an item on the map and starts its decay while it appears to only return a colour and an effect. Keep the idea, fix: the table lookup is pure, and placement is a separate call (sketch `HIT_FX` and `Floor.place`).
- Defect, inconsistent safe zone: the hit splash has a protection-zone check (4058) and the death splash does not (523-561). Keep the idea, fix: one safe-zone rule for both paths (sketch `onDeath`).
- Lifetime: 150 s for a hit splash and about 690 s for a death splash is long for a fast game with many fights. Keep both as data fields with the donor values as defaults and tune them at 375 wide.
- The donor's decal is a map item (tile model). Frankendom has no tile items, so only the stage list and the one-per-tile rule transfer; the per-tile key is a plain string here.
- Clutter: many-on-one fights (MAX_ATTACKERS = 3) produce at most one decal per hit; add a maximum-on-screen count as a data field if the client needs one. (Not in donor.)
- Not read: the client rendering of the fluid subtypes, the body of `internalDecayItem` and `transformItem`, the top branch of `combatChangeHealth` (4160-4395), and the callers' context (only listed by grep).
- Frankendom rulings: kills stay server-verified (the veto is server-side in this sketch); the decal and flash are client-only.
