# id-Software-wolf3d (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_STATE.C` (plus `WL_ACT2.C`, `WL_PLAY.C`, `WL_DRAW.C`, `ID_US_A.ASM`) | Licence: id Software "Limited Use Software License Agreement" (README/LICENSE.DOC): educational use of portions only, commercial exploitation prohibited; clean-room, shape only | C with x86 asm (RNG) | symbol `SightPlayer`

Checked: Read in full: `SightPlayer` (WL_STATE.C 1404-1478), `FirstSighting` (1253-1340 switch, class multipliers), `CheckSight` (1187; ends at the CheckLine call, 1236), `DamageActor` (964-1000, to the FirstSighting call), `SelectDodgeDir` (WL_STATE.C 359 on), `SelectChaseDir` (475 on), `T_Stand` (WL_ACT2.C 3047) and `T_Chase` (3069 on), `DoActor` (WL_PLAY.C 1260 on, the tick path), `CalcTics` (WL_DRAW.C 1236 on), `US_RndT` (ID_US_A.ASM 80-100). Partly read: `CheckLine` (WL_STATE.C 1037; start and end only, door middle not read), `TryWalk` (181-300, the tile checks only), `T_Path` (WL_ACT2.C 3367-3380; only the SightPlayer call and the top). Not read: `SelectRunDir` (WL_STATE.C 585, flee), `T_DogChase`, spawn code (speed base values), `T_Shoot` (what the shot does). Only one target exists in this game (the player): no target selection to read. Confidence: high on the wake, sight and chase order; medium on the line-of-sight body. `MAXTICS` = 10 is read at ID_HEADS.H line 108, but that line is tab-separated, so no receipt quote fits it.

## 1. Mechanism

- Idle actors look at the player every tic. `T_Stand` calls `SightPlayer` (WL_ACT2.C 3049). A patrolling actor calls it first in `T_Path` and returns if it woke (WL_ACT2.C 3372). The whole thing is per-actor and per-tic. The only cross-actor wake signal in the code read is the global `madenoise` flag (WL_PLAY.C 1404; WL_STATE.C 966).
- Order inside `SightPlayer` (WL_STATE.C 1404):
  (a) If a reaction countdown is running (`temp2`), subtract `tics` (1414). While it is above 0, return false. At 0, clear it, call `FirstSighting`, return true (1475-1477).
  (b) Otherwise (no countdown yet): skip actors in an area the player cannot reach (1421). An ambush actor must pass `CheckSight` once, then loses its ambush flag (1424-1428). Any other actor wakes on noise (`madenoise`) or on `CheckSight` (1432). If it wakes, it arms its class reaction delay (1440-1452) and returns false. So a sighting always costs at least one tic of delay.
- `CheckSight` (1187): (i) if the player is inside a 1.5-tile box (`MINSIGHT` 0x18000), sight is automatic; (ii) else the player must be in the half-plane the actor faces (north: player not south; and the same for the other three); (iii) else `CheckLine`, a tile-by-tile line trace that stops at walls and closed doors.
- `FirstSighting` (1253): engage is a state change. The actor goes into its chase state and its speed is multiplied by a class constant (guard 3, officer 5, mutant 3, ss 4, dog 2; 1262-1286).
- `DamageActor` (964): any hit sets `madenoise` (966). Damage is doubled when the actor was not already in attack mode (971-972). Health is reduced (974). At 0 it is killed; otherwise, if not in attack mode, it calls `FirstSighting` (980-981). So being shot is also an aggro event.
- Chase, once engaged: `T_Chase` (WL_ACT2.C 3069). It returns at once if the victory flag is set (3075). If `CheckLine` is clear (3079), it rolls for a shot: chance = 300 (certain) when the tile distance is 0, or 1 and the actor is within 0x4000 of its tile centre (3084-3085); otherwise chance = `(tics<<4)/dist` out of 256 (3087). `US_RndT() < chance` means a shot state change and return (3089). If the roll fails, `dodge` is set (3141). When the actor has no heading, or reaches its tile goal, it picks a new direction: `SelectDodgeDir` if `dodge`, else `SelectChaseDir` (3147-3149, 3188-3190). It moves `speed*tics` along its path per tic.
- `SelectDodgeDir` (359): prefer the two axes toward the player; if the horizontal gap is larger, the vertical axis goes first (415). A 50/50 swap of the pairs runs on `US_RndT() < 128` (425). The two away-directions come after. The reverse heading (`turnaround`) is excluded from the list and tried last. On the first attack after noticing, the flag `FL_FIRSTATTACK` (372) sets `turnaround` to none: the reverse is not excluded and there is no last-resort reverse. The diagonal toward the player is tried first in the donor (435); the sketch omits it.
- `SelectChaseDir` (475): toward-axes (larger gap first; 1st and 2nd choice), then the old heading, then a sweep. The sweep is N,E,S,W if `US_RndT() > 128`, else W,S,E,N (536). Reversing is last. The block that handles "no direct path" is at 527.
- Tick: `PlayLoop` (WL_PLAY.C 1368) clears `madenoise` once per pass (1404), then runs `DoActor` for every object. `DoActor` (1260) runs the state's `think` when `ticcount` is 0; otherwise it subtracts `tics` (1300) and advances states while the count is at or below 0 (1301-1306). `tics` comes from `CalcTics` (WL_DRAW.C 1236 on): elapsed timer units since the last call, looped until non-zero (1249), clamped to `MAXTICS` (10) with the excess time dropped from `TimeCount` (1262-1265). So a slow frame slows the game instead of making it catch up in bursts of more than 10 tics. The timer's real rate is not read (the timer source is not in this tree).
- Randomness: `US_RndT` returns the next byte of a fixed 256-entry table, indexed in sequence (ID_US_A.ASM 19, 80-100). `US_InitRndT` sets the start index (not read in full). So the "random" stream is a deterministic cycle.

## 2. Key functions

- `SightPlayer`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_STATE.C` 1404-1478. Wake gate: reaction countdown, area gate, ambush, noise-or-sight, class reaction delay.
- `CheckSight`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_STATE.C` 1187 (ends at 1236). Auto-sight box, facing half-plane, then `CheckLine`.
- `FirstSighting`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_STATE.C` 1253 (class switch to 1340). Chase state plus class speed multiplier.
- `DamageActor`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_STATE.C` 964-1000 (to the call at 981). Noise, surprise double damage, engage on hit.
- `T_Chase`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_ACT2.C` 3069 on. Shot roll, dodge flag, direction choice, move.
- `SelectDodgeDir`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_STATE.C` 359 on. Sidestep preference, 50/50 swap, reverse last.
- `SelectChaseDir`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_STATE.C` 475 on (`SelectRunDir` starts at 585, not read). Toward-axes, old heading, sweep, reverse last.
- `DoActor` and `PlayLoop`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_PLAY.C` 1260 on and 1368 on (madenoise reset at 1404). Per-tic think and state advance.
- `CalcTics`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_DRAW.C` 1236 on (clamp at 1262-1265). Variable step with a 10-tic clamp.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sight: auto-notice inside a near box, then facing half-plane, then a line test | Auto-sight 1.5 tiles = 0x18000 with 1 tile = `GLOBAL1` = 1<<16 (theirs, WL_DEF.H 97; WL_STATE.C 1185, 1203) |
| Wake: a random reaction delay per class, counted in tics; the sighting only arms it | Guard 1 + rnd/4; officer 2; mutant and ss 1 + rnd/6; dog 1 + rnd/8 (theirs, WL_STATE.C 1440-1452; rnd is 0-255) |
| Engage is a state change plus a per-class speed boost | Guard x3, officer x5, mutant x3, ss x4, dog x2 (theirs, WL_STATE.C 1263, 1269, 1274, 1280, 1286) |
| Being hit is an alarm, and an unaware target takes double damage | `damage <<= 1` when not in attack mode (theirs, WL_STATE.C 971-972) |
| Shot chance falls with range and scales with frame time: `tics*16/dist` out of 256 | Certain shot at distance 0, or adjacent and close (300); otherwise `(tics<<4)/dist` (theirs, WL_ACT2.C 3084-3089). Example: 1 tic at 4 tiles = 4/256 per tic |
| Fixed-table pseudo-random stream | 256-entry table (theirs, ID_US_A.ASM 19) |
| Frame time clamp | `MAXTICS` 10 (theirs, ID_HEADS.H 108; tab-separated, no receipt) |

## 4. TypeScript sketch

simplified: the sketch keeps the wake order (countdown, area gate, ambush or noise-or-sight, class delay), the engage speed boost, the shot roll, and the sidestep and chase preference orders. It omits: the diagonal directions (the donor uses eight), tile-path movement and door waits, the state tables and animation, the `T_Shoot` shot itself, the boss kinds (their speed is set, not multiplied, in the donor), the `victoryflag` return, and the surprise double damage (described above, not coded). The `FL_FIRSTATTACK` turnaround rule is handled by the caller passing `back = null`. The `distance < 0x4000` test is passed in as `adjacentClose`. The random table is replaced by an injected `rnd` in 0..255. `CheckLine` is an injected `lineClear` callback (its body was not read in full). Order of checks inside `wakeTick` follows the donor; the directions are candidates, and the caller chooses the first walkable one.

```ts
// Licence: id Software Limited Use Software License Agreement (educational use only, no commercial exploitation; donor README/LICENSE.DOC). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Dir = "N" | "E" | "S" | "W";
type Kind = "guard" | "officer" | "mutant" | "ss" | "dog";
type Mode = "shoot" | "dodge" | "chase";
type Rnd = () => number; // 0..255

const TILE = 65536;          // one tile in world units
const MIN_SIGHT = 0x18000;   // 1.5 tiles: close enough to notice without a facing test

interface Foe {
  kind: Kind;
  x: number;
  y: number;
  facing: Dir;
  connected: boolean;        // shares a floor area with the player
  ambush: boolean;           // must see the player once before it can wake
  reactTics: number;         // reaction countdown, 0 = idle
  baseSpeed: number;
  speed: number;
  chasing: boolean;
}

interface Target { x: number; y: number; }

function inFront(f: Dir, dx: number, dy: number): boolean {
  switch (f) {
    case "N": return dy <= 0;
    case "S": return dy >= 0;
    case "E": return dx >= 0;
    case "W": return dx <= 0;
  }
}

// Auto-sight inside 1.5 tiles; otherwise the target must be in the facing half-plane and lineClear must hold.
function canSee(foe: Foe, t: Target, lineClear: () => boolean): boolean {
  const dx = t.x - foe.x;
  const dy = t.y - foe.y;
  if (dx > -MIN_SIGHT && dx < MIN_SIGHT && dy > -MIN_SIGHT && dy < MIN_SIGHT) return true;
  if (!inFront(foe.facing, dx, dy)) return false;
  return lineClear();
}

function reactionDelay(kind: Kind, rnd: Rnd): number {
  switch (kind) {
    case "guard": return 1 + Math.floor(rnd() / 4);
    case "officer": return 2;
    case "mutant": return 1 + Math.floor(rnd() / 6);
    case "ss": return 1 + Math.floor(rnd() / 6);
    case "dog": return 1 + Math.floor(rnd() / 8);
  }
}

function speedMultiplier(kind: Kind): number {
  switch (kind) {
    case "guard": return 3;
    case "officer": return 5;
    case "mutant": return 3;
    case "ss": return 4;
    case "dog": return 2;
  }
}

// Engage: a state change plus a speed boost, as in the donor's FirstSighting.
function startChase(foe: Foe): void {
  foe.chasing = true;
  foe.speed = foe.baseSpeed * speedMultiplier(foe.kind);
}

// Returns true on the tick the foe engages. A new sighting only arms the reaction timer.
function wakeTick(foe: Foe, t: Target, noiseMade: boolean, lineClear: () => boolean, rnd: Rnd, tics: number): boolean {
  if (foe.reactTics > 0) {
    foe.reactTics -= tics;
    if (foe.reactTics > 0) return false;
    foe.reactTics = 0;
    startChase(foe);
    return true;
  }
  if (!foe.connected) return false;
  if (foe.ambush) {
    if (!canSee(foe, t, lineClear)) return false;
    foe.ambush = false;
  } else if (!noiseMade && !canSee(foe, t, lineClear)) {
    return false;
  }
  foe.reactTics = reactionDelay(foe.kind, rnd);
  return false;
}

// Shot roll while the line to the target is clear. Adjacent-close is the donor's (ob->distance < 0x4000) test, passed in.
function chaseTick(distTiles: number, adjacentClose: boolean, lineClear: boolean, rnd: Rnd, tics: number): Mode {
  if (!lineClear) return "chase";
  const chance = distTiles === 0 || (distTiles === 1 && adjacentClose)
    ? 300
    : Math.floor((tics * 16) / distTiles);
  return rnd() < chance ? "shoot" : "dodge";
}

// Dodge: sidestep preference toward the target axes first, away axes next, reverse last (not on the first attack).
function dodgeOrder(dx: number, dy: number, rnd: Rnd, back: Dir | null): Dir[] {
  const h: Dir = dx > 0 ? "E" : "W";
  const v: Dir = dy > 0 ? "S" : "N";
  const hAway: Dir = h === "E" ? "W" : "E";
  const vAway: Dir = v === "S" ? "N" : "S";
  let order: Dir[] = [h, v, hAway, vAway];
  if (Math.abs(dx) > Math.abs(dy)) order = [v, h, vAway, hAway];
  if (rnd() < 128) order = [order[1], order[0], order[3], order[2]];
  const picks = order.filter((d) => d !== back);
  if (back !== null) picks.push(back);
  return picks;
}

// Chase: toward axes (larger axis first), then the old heading, then a 50/50 sweep order, reverse last.
function chaseOrder(dx: number, dy: number, rnd: Rnd, oldDir: Dir | null, back: Dir | null): Dir[] {
  const h: Dir | null = dx > 0 ? "E" : dx < 0 ? "W" : null;
  const v: Dir | null = dy > 0 ? "S" : dy < 0 ? "N" : null;
  let d1: Dir | null = h;
  let d2: Dir | null = v;
  if (Math.abs(dy) > Math.abs(dx)) { d1 = v; d2 = h; }
  if (d1 === back) d1 = null;
  if (d2 === back) d2 = null;
  const out: Dir[] = [];
  if (d1 !== null) out.push(d1);
  if (d2 !== null) out.push(d2);
  if (oldDir !== null) out.push(oldDir);
  const sweep: Dir[] = rnd() > 128 ? ["N", "E", "S", "W"] : ["W", "S", "E", "N"];
  for (const d of sweep) if (d !== back) out.push(d);
  if (back !== null) out.push(back);
  return out;
}

// First direction that the caller says is walkable.
function pickDir(order: Dir[], walkable: (d: Dir) => boolean): Dir | null {
  for (const d of order) if (walkable(d)) return d;
  return null;
}
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module): wake, sight, engage and chase decisions run in the engine on the server tick. Parity-checklist row 4 (fight loop: aggro, chase, leash). The server tick sub-line (fixed step, input intake, per-tick NPC budget) belongs to row 18 / post-K item 3, not to this note.
- Reuse tag: rewrite-from-idea (id Software Limited Use: educational use only; clean-room, no lines carried over)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- One target only: the donor is one player against many AIs, each with its own state. It has no hate list, no target selection and no cap on attackers. Frankendom's hate list and `MAX_ATTACKERS = 3` must be written in the engine. The donor shows the per-actor wake and chase shape, not the many-on-one rule.
- No leash and no return to post in the donor. `SelectRunDir` (flee, WL_STATE.C 585) exists but was not read. A leash rule for row 4 has no donor source here.
- Tick: the donor's delays are in tics from a variable frame step, clamped at 10. Frankendom's server tick must be a fixed step, so the reaction countdown and the shot roll must be converted to whole server ticks (row 18 sub-line). Do not copy the frame-time scaling.
- Randomness: the donor's stream is a fixed table read in sequence, so replays depend on how often it is called. Frankendom needs a seeded server RNG that is logged for the fight record (row 19).
- Server-verified kills: the donor's shot roll starts a shot state. In Frankendom the server must decide both the roll and the hit. Do not let a client decide the engage or the shot.
- Zones as data: the class reaction delays, speed multipliers, the 300 certain-shot value and the 1.5-tile sight box belong in catalogue or zone fields with defaults in code, not as constants in the function.
- One ledger: the chase flag and speed are state. They must live in the one ledger and be changed only by the engine's engage step (state change, not a side effect).
- Pit as client: the wake and chase logic must not run in the Pit. The Pit shows the result.
- Surprise double damage is a combat rule, not an aggro rule. It belongs to the damage step (row 1), and should be a data field there.
- Licence: educational use only. Clean-room from the described mechanism; do not translate the C or the asm.

Reuse tag: rewrite-from-idea (id Software Limited Use: educational use only; clean-room)
Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

Best transferable idea: Let an enemy notice the player through a short reaction timer that counts in ticks and a class-specific delay, and make a shot roll whose chance falls with distance and scales with the frame's tick count.
