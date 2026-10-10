# exult-exult (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/exult-exult/actors.cc` (with `npctime.cc`, `monsters.cc`, `objs/find_nearby.h`, `shapes/shapeinf/monstinf.h`) | Licence: GPL-2.0-or-later (file headers: "either version 2 of the License, or (at your option) any later version"; COPYING is GPL v2, June 1991) | C++ | symbols `Actor::bleed`, `Actor::reduce_health`, `Npc_bleed_timer`

Checked: Read the whole bleed path end to end: `Actor::bleed` (actors.cc 2855-2904), the bleed roll inside `Actor::reduce_health` (2912-3010 read, roll at 2977-2983), the bleed timer (npctime.cc 273-275, 301-306, 504-534), the slime trail (monsters.cc 629-632), and the stop points (actors.cc 2531-2594 setter, 4309-4319 die, 4513-4515 mend_wounds). Confidence high for the bleed and pool path. Not read: the rendering meaning of frame bit 32 (the code sets it on a random half of pools), the rest of `reduce_health` after 3010, and any removal path for pools (they are flagged `is_temporary` at 2891; my grep found only set sites and two reads, so I could not confirm when pools are deleted). Other files opened: `objs/find_nearby.h` (search flags and `delta`), `effects.cc` by grep only (sparkles, explosions, text; no blood). The hint file `effects.cc` is the wrong file for blood. Camera: not applicable.

Best transferable idea: Make a bleed a timed client decal that grows one stage per drip, never duplicates on one tile, and stops adding pools when two already sit in the 3x3 area around the victim.
Decision (proposed): adapt. Take the stacking rule (one pool per tile, grow before adding, neighbour cap) and the timed bleed as a cosmetic client layer. Reject any gameplay effect from bleeding: the donor itself does no HP loss (npctime.cc 530 is a TODO), and an HP drip would have to run on the server tick (row 18 sub-line), which is a design change, not a port.
Acceptance: In a duel, a fighter hit for normal damage shows a small pool under them at once; every 0.5-1 s the pool grows one stage, up to four stages; no two pools share a tile; a heal, mend or death stops new stages within one tick; a server test asserts the bleed never changes health.

## 1. Mechanism

- Two parts. (a) Pools. `Actor::bleed(first, last, loc)` places a temporary floor object (shape 912, actors.cc 2857) on the actor's tile, or grows the pool already on that tile by one stage. Normal blood uses stages 0 to 3 (2901-2902). A new pool starts on stage 0 or 1 because `num_frames` is capped at 2 (2884, 2886). Each growth re-rolls a flip bit at 50 percent (2872-2873). The donor drops the old bit when it reads the frame (`% 32`, 2866), so the flip is re-rolled, not kept. A pool is only ever grown on its tile; the code returns after growing (2877) and never adds a second pool there (2859-2860).
- (b) Bleeding state. `Actor::set_type_flag(tf_bleeding)` (actors.cc 3400-3401) calls `start_bleeding`, which replaces the timer object with a new `Npc_bleed_timer` (npctime.cc 274). The timer's constructor queues its first tick 5000 ms out (504; base queue at 294) and drips once at once (508; body call not receipted because the line is too short). The bleed lasts 60000 + rand()%120000 ms, 1 to 3 minutes (510). Each tick (`handle_event`, 517-534): if the time is up, the flag is clear, or the actor is dead or dormant (525), the timer stops; otherwise it drips (531) and re-queues in 500 + rand()%500 ms (533).
- Bleed roll, inside `Actor::reduce_health` (2912). It runs only for `normal_damage` (2977), not for monsters with `cant_bleed` (2978, flag accessor monstinf.h 197), and only when `rand()%10 < delta` and fewer than 2 pools are in the 3x3 area (find_nearby with delta 1, 2982; delta meaning "tiles in each direction", find_nearby.h 70). Before the roll, `delta` is doubled for vulnerable monsters (2940-2941) and clamped at the low-health floor (2948-2950). So the chance is min(delta, 10) / 10. The comment in the same block says ten or more hits always cause bleeding; I did not receipt that comment line.
- Re-hit. The roll runs again while the actor is already bleeding. If it succeeds, `set_type_flag` runs again and replaces the timer. The old timer's destructor removes its queued event (npctime.cc 301-304), so the clock restarts at 1 to 3 minutes and a new immediate drip happens.
- Stops. A health rise in `set_property` (actors.cc 2593-2594) clears the flag. `mend_wounds` (4513-4515) clears it. `die` (4309-4319) clears it. The timer notices on its next tick.
- No damage. Bleeding does not reduce HP in the donor (npctime.cc 530, a TODO).
- Slime trail. A slime that moves drops a pool on its old tile with a 1 in 6 chance per step, stages 4 to 7 (monsters.cc 629-632).
- Timing: event-driven. Times are `Game::get_ticks()` in ms from a time queue (npctime.cc 294, 304). This is not a fixed-step loop and not a per-frame loop.

## 2. Key functions

- `Actor::bleed(int, int, Tile_coord)`: `/mnt/frankendom-donors/exult-exult/actors.cc` 2855-2877 (grow or skip when a pool is on the tile), 2880-2891 (new pool).
- `Actor::bleed()`: `/mnt/frankendom-donors/exult-exult/actors.cc` 2895-2904 (default stages 0 to 3; `cant_bleed` check at 2897).
- `Actor::reduce_health`: `/mnt/frankendom-donors/exult-exult/actors.cc` 2912 onward; bleed roll 2977-2983.
- `Npc_bleed_timer::Npc_bleed_timer` and `Npc_bleed_timer::handle_event`: `/mnt/frankendom-donors/exult-exult/npctime.cc` 504-511 and 517-534.
- `Npc_timer_list::start_bleeding` and `Npc_timer::~Npc_timer`: `/mnt/frankendom-donors/exult-exult/npctime.cc` 273-275 and 301-306.
- `Actor::set_type_flag` (bleed hook): `/mnt/frankendom-donors/exult-exult/actors.cc` 3400-3401.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit chance grows with damage, capped at certain | `rand() % 10 < delta` (actors.cc 2982): 1 in 10 per point, always at 10 or more |
| Vulnerable target takes double damage for the roll | x2 (actors.cc 2941) |
| One decal per tile; grow it before adding another | No number (the rule); tile lookup with transparent objects allowed (2860, mask 0x80, find_nearby.h 40) |
| Decal stages: start small, grow to a cap | Last stage 3 (actors.cc 2902); start span 2 (2884) |
| Neighbour cap on decals | Fewer than 2 pools within 1 tile (2982) |
| Timed status with random length | 60000 + rand()%120000 ms (npctime.cc 510) |
| First tick delay | 5000 ms (npctime.cc 504) |
| Tick interval with jitter | 500 + rand()%500 ms (npctime.cc 533) |
| Trail from a moving body | 1 in 6 per step, stages 4 to 7 (monsters.cc 629-631) |

## 4. TypeScript sketch

simplified: keeps the donor order: at hit time, the roll and the neighbour check come first; a start places the first pool at once and arms a 5 s first tick; a tick checks time and death before it drips. It omits the slime stage range (4 to 7) and the frame-range check for pools outside 0 to 3, the low-health clamp, the tournament and split branches, and the flip bit as an animation flag (kept as a boolean). It uses an injected RNG and a Map keyed by tile instead of the donor's object search. A heal, mend or death clears the flag at once; the donor stops at its next tick. Times are ms on the caller's clock.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng = () => number; // uniform in [0, 1), injected instead of rand()

const BLEED_MIN_MS = 60_000;        // donor: 60000 + rand() % 120000
const BLEED_SPAN_MS = 120_000;
const BLEED_FIRST_TICK_MS = 5_000;  // donor: timer base delay 5000
const TICK_MIN_MS = 500;            // donor: 500 + rand() % 500
const TICK_SPAN_MS = 500;
const POOL_LAST_STAGE = 3;          // donor: last_blood_frame = 3
const POOL_START_SPAN = 2;          // donor: num_frames capped at 2 (new pool is stage 0 or 1)
const POOL_NEIGHBOUR_LIMIT = 2;     // donor: fewer than 2 pools in the 3x3 area

interface Pool { stage: number; flip: boolean; }

interface Victim {
  x: number;
  y: number;
  noBleed: boolean;        // donor cant_bleed flag
  dead: boolean;
  bleedUntil?: number;     // ms on the caller's clock; undefined = not bleeding
  nextTickAt?: number;
}

interface Decals {
  pools: Map<string, Pool>; // one pool per tile
}

const key = (x: number, y: number): string => `${x},${y}`;

function neighbourPools(d: Decals, x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (d.pools.has(key(x + dx, y + dy))) n++;
    }
  }
  return n;
}

// Donor bleed(): if a pool is already on this tile, grow it one stage; otherwise start a new one.
function placePool(d: Decals, x: number, y: number, rng: Rng): void {
  const k = key(x, y);
  const p = d.pools.get(k);
  if (p) {
    if (p.stage < POOL_LAST_STAGE) {
      p.stage += 1;
      p.flip = rng() < 0.5;   // donor reads frame % 32 and re-rolls the flip bit
    }
    return;
  }
  d.pools.set(k, { stage: Math.floor(rng() * POOL_START_SPAN), flip: rng() < 0.5 });
}

// Donor set_type_flag(tf_bleeding): a new start replaces the old timer, so the clock restarts.
function startBleed(d: Decals, v: Victim, nowMs: number, rng: Rng): void {
  v.bleedUntil = nowMs + BLEED_MIN_MS + rng() * BLEED_SPAN_MS;
  v.nextTickAt = nowMs + BLEED_FIRST_TICK_MS;
  placePool(d, v.x, v.y, rng);   // donor: the timer constructor drips once at once
}

// Donor reduce_health(): normal damage only; delta doubled for vulnerable targets;
// roll delta/10 (capped at 1); and only if fewer than 2 pools are in the 3x3 area.
export function onHit(
  d: Decals, v: Victim, rawDamage: number, kind: "normal" | "other",
  vulnerable: boolean, nowMs: number, rng: Rng,
): void {
  if (kind !== "normal" || v.noBleed || v.dead) return;
  const delta = vulnerable ? rawDamage * 2 : rawDamage;
  if (Math.floor(rng() * 10) >= delta) return;   // donor: rand() % 10 < delta
  if (neighbourPools(d, v.x, v.y) >= POOL_NEIGHBOUR_LIMIT) return;
  startBleed(d, v, nowMs, rng);
}

// Donor Npc_bleed_timer::handle_event: stop on time or death; otherwise drip and re-arm.
export function bleedTick(d: Decals, v: Victim, nowMs: number, rng: Rng): void {
  if (v.bleedUntil === undefined || v.nextTickAt === undefined || nowMs < v.nextTickAt) return;
  if (nowMs >= v.bleedUntil || v.dead) {
    v.bleedUntil = undefined;
    v.nextTickAt = undefined;
    return;
  }
  placePool(d, v.x, v.y, rng);
  v.nextTickAt = nowMs + TICK_MIN_MS + rng() * TICK_SPAN_MS;
}

// Donor: a health rise (set_property), mend_wounds or death clears the flag.
// The donor timer stops on its next tick; this sketch stops at once.
export function clearBleed(v: Victim): void {
  v.bleedUntil = undefined;
  v.nextTickAt = undefined;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/damage.ts`: the engine emits the hit with its post-armour damage and damage kind, and owns the bleed roll (it decides whether a hit bleeds, so the roll is the only gameplay-adjacent part). The decal pools and the drip timer are client-only and live in the client decal layer (module path not read; not in my brief).
- Parity-checklist row 8 (blood / wounds / decals). Not row 18 (the bleed does not touch health or XP); the server tick is not involved because bleeding has no server effect in this donor.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients): the engine rolls, the client draws; rules 7-9 n/a.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; the code is not translated.
- The roll and the drip run on the client in the donor (C `rand()`, no server). That is fine for cosmetics. If Frankendom ever lets bleeding change HP, the roll and the drip must move to the server tick, and the donor offers no model for that (npctime.cc 530 is a TODO).
- The donor bleed is cosmetic only. Adopting an HP drip would be a design change, not a port of this code.
- Pool removal is not verified. Pools are flagged `is_temporary` (actors.cc 2891), but I did not find a removal path in this read. Frankendom needs an explicit cap or time-to-live per pool, otherwise a long fight or a long visit leaks decals.
- Restart on re-hit (the donor replaces the timer): with up to MAX_ATTACKERS = 3 on one victim, every landed hit can restart the 1 to 3 minute clock while the neighbour cap is below 2. Decide whether a restart is wanted; the sketch keeps the donor behaviour.
- The donor clears bleeding on any health rise (actors.cc 2593-2594), including non-heal sources. Frankendom should clear on its server heal event only.
- Pool art: the donor uses sprite frames (shape 912, stages 0 to 3, flip bit). Frankendom needs stage art, or a scale ramp on one sprite, before this reads on a phone.
- The donor's `find_nearby` scans game objects; the sketch uses a Map keyed by tile. Use a tile map in Frankendom too; the scan does not scale to a crowd of victims.
