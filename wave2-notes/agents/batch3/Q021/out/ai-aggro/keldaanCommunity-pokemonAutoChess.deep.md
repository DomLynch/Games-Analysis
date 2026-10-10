# keldaanCommunity-pokemonAutoChess (ai-aggro, cell 1)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/attacking-state.ts` | Licence: as read: `LICENSE` file is GNU GPL v3 ("GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"); `package.json` says `"license": "BSD-3-Clause"`. The two conflict; treated as restricted, clean-room only | TypeScript | symbol `AttackingState.update`, with `MovingState.update`/`move`, `PokemonState.getNearestTargetAtRange`, `getNearestTargetAtSight`, `getTargetWhenConfused`, `PokemonEntity.isTargettableBy`

Checked: Read in full: `app/core/attacking-state.ts` (146 lines), `app/core/idle-state.ts` (68), `app/core/moving-state.ts` (167), `app/core/simulation-command.ts` (56), `app/core/move-speed.ts` (9), `app/utils/distance.ts` (14), `app/utils/random.ts` (1-60). Read in part: `app/core/pokemon-state.ts` 1085-1326 (target functions only), `app/core/pokemon-entity.ts` 225-335 and 483-497, `app/core/board.ts` 172-193, `app/utils/pathfind.ts` 1-130 (rest of the A* loop not read), `app/core/simulation.ts` 1310-1350, `app/rooms/game-room.ts` 713-730. Callers checked by grep: `getNearestTargetAtRange` is called only from `attacking-state.ts` (63, 70) and `moving-state.ts` (23); `getNearestTargetAtSight` from `attacking-state.ts` (75), `moving-state.ts` (58), `core/abilities/column-crush.ts` (37, grep only, not read) and `core/effects/passives.ts` (82, grep only, not read); `move()` from `moving-state.ts` (34, 60). Not read: `pokemon-state.ts` `update()`, `state.attack()` (what damage the impact applies), Colyseus `setTimestep` (not defined in this repo). Confidence high on the target and chase order; medium on the exact A* tie-break. Scope: auto-battler unit AI on a grid; not a camera cell (no camera_scope needed).

Best transferable idea: Keep the current target while it is still targettable and in range, and re-pick the nearest in-range enemy only when it dies, goes untargettable, or leaves range; break ties with an item flag before a random pick.

Decision (proposed): adapt — the sticky-target and nearest-in-range rules fit Frankendom's fast duels and many-on-one fights, but Frankendom needs the MAX_ATTACKERS = 3 slot cap, an engine-side hate list (the donor has none), and a seeded RNG (the donor uses `Math.random`), so the shape transfers and the rules change.

Acceptance: In a 3-on-1 server test, the lead attacker keeps hitting the same target while it stays in range, switches within one attack cycle after that target dies or leaves range, and an identical seed gives an identical target sequence.

## 1. Mechanism

- Driver: the room's timestep callback receives `deltaTime` and clamps it to `MAX_SIMULATION_DELTA_TIME` (50 ms) (game-room.ts:716-719, network.ts:12). Each step runs the queued commands first, then `pkm.update(dt, ...)` for every blue unit, then for every red unit (simulation.ts:1314-1349). This is a variable step with a clamp, not a fixed step. Each unit's `update` calls its current state object (pokemon-entity.ts:227-229). Idle moves to Moving when `canMove` (idle-state.ts:31-33).
- Moving state, once per move cooldown `Math.round(500 / (0.5 + speed/100))` ms (moving-state.ts:22; move-speed.ts:8; halved speed when paralysed). Each move tick, in this order:
  1. Nearest enemy within attack range (Chebyshev distance, all cells in the range box). If one exists, switch to Attacking (moving-state.ts:23, 45-46).
  2. Else nearest enemy anywhere on the board by Manhattan distance, found by scanning the whole board, ties random (pokemon-state.ts:1148-1181). Then `move()` one cell toward it (moving-state.ts:58-60).
- `move()` (moving-state.ts:72-153, non-Dark-synergy branch): candidate cells are every empty cell in the square of Chebyshev radius `range` around the goal, with the centre skipped (board.ts:172-193; the name "outer range" is misleading, the loop fills the whole square). For each candidate it runs A* from the attacker to that cell with every other unit as an obstacle (moving-state.ts:119-131). It keeps the candidate with the fewest path steps (strict `<`, so the first candidate scanned wins a tie) and moves one cell along the first step of that path (moving-state.ts:134-150). A* uses 8 neighbours, diagonal cost sqrt(2), a Chebyshev heuristic and a sorted open list (pathfind.ts:20, 93, 110-117).
- Attacking state, once per attack cooldown `round(1000 / (0.4 + speed*0.007))` ms (attacking-state.ts:24; pokemon-entity.ts:320-322). On entry the cooldown is 0, so the first attack is immediate (attacking-state.ts:116). Each attack tick, target selection runs in this order (attacking-state.ts:27-71):
  1. Merciless, only when the unit has the MERCILESS effect and `pp < maxPP`: the target is the candidate with the lowest `hp + shield` among units in range; first in scan order wins a tie (attacking-state.ts:33-44; pokemon-state.ts:1091-1110).
  2. Confused: `getTargetWhenConfused`. A 50% chance (luck-scaled) bypasses confusion. If it does not, allies join the pool. The pool is built from the nearest units by Manhattan distance; then the unit itself is appended, and a random pick is made (attacking-state.ts:45-46; pokemon-state.ts:1286-1325). The distance limit is loose (see section 6).
  3. Otherwise sticky targeting. The stored target id and cell are kept if the cell still holds that unit (no range check: it was in range when chosen). If the unit has moved, the previous target is kept only while `isTargettableBy` holds and Chebyshev distance is at most `range`. Else the nearest in range is chosen again (attacking-state.ts:47-71). If the cell holds the previous target but it is no longer targettable, retarget (attacking-state.ts:65-71).
  4. No target, or charmed: if any enemy is in sight, switch to Moving; otherwise do nothing this tick (attacking-state.ts:74-78).
  5. Target found: store its id, cell and facing (attacking-state.ts:80-89). Cast the skill if `pp >= maxPP` and the unit can cast; else queue an `AttackCommand` with delay `delayBeforeShoot + travelTime` (attacking-state.ts:91-105). At impact, `AttackCommand.execute` checks `canAttack` and calls `state.attack` (simulation-command.ts:51-55; `state.attack` not read).
- Ties for the at-range choice: candidates with a Pokedoll item are preferred; the pick is then random (pokemon-state.ts:1136-1142). Exit from Attacking or Idle clears the stored target (attacking-state.ts:119-122; idle-state.ts:64-67).
- There is no hate list, no threat table, no leash distance and no slot cap. A unit remembers only its current target. It chases the nearest enemy anywhere on the board.

## 2. Key functions

- `AttackingState.update`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/attacking-state.ts` 19-111. Merciless, confusion, sticky target, sight fallback, then the attack queue.
- `MovingState.update` and `move`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/moving-state.ts` 19-70 and 72-153. Range check, sight chase, outer-cell A* step.
- `getTargetsAtRange`, `getNearestTargetAtRange`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-state.ts` 1091-1110 and 1115-1146. Chebyshev box and nearest-in-range with Pokedoll tie-break.
- `getNearestTargetAtSight`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-state.ts` 1148-1181. Whole-board Manhattan search, random tie-break.
- `getTargetWhenConfused`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-state.ts` 1286-1325.
- `isTargettableBy`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-entity.ts` 275-288. Enemies always; allies only for a merciless attacker at hp <= 10; untargettable excluded.
- `findPath`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/utils/pathfind.ts` 60-130 (partly read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Move cooldown: one cell per interval, interval shrinks with speed | `Math.round(500 / (0.5 + speed/100))` ms; 1000 ms at speed 0, 500 ms at speed 50 (theirs, moving-state.ts:22; move-speed.ts:8) |
| Attack cooldown: interval shrinks with speed | `Math.round(1000 / (0.4 + speed*0.007))` ms; 2500 ms at speed 0, 1333 ms at speed 50 (theirs, pokemon-entity.ts:321; attacking-state.ts:24) |
| Keep target until it dies, leaves or becomes untargettable | No constant; "range" is the unit's attack range (theirs, attacking-state.ts:57) |
| Nearest in range, Chebyshev | Chebyshev, the donor's own note explains why (theirs, pokemon-state.ts:1113) |
| Nearest in sight, Manhattan, whole board | Manhattan (theirs, pokemon-state.ts:1161; distance.ts:8) |
| Finisher: lowest hp+shield in range | Merciless hp threshold `this.hp <= 10` for targeting allies (theirs, pokemon-entity.ts:286) |
| Confusion bypass chance | `chance(0.5, pokemon)`, probability raised to `1 - luck/100` (theirs, pokemon-state.ts:1293; random.ts:11) |
| Path cost | Diagonal step cost sqrt(2) (theirs, pathfind.ts:115-117) |
| Tick clamp | `MAX_SIMULATION_DELTA_TIME = 50` ms (theirs, network.ts:12) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for each decision (merciless pick, then keep-or-retarget, then the chase step) and the two cooldown formulas. It omits the confusion branch, the charm and drummer branches, the Dark-synergy jump, the ability cast, the target-cell lookup (the sketch keeps the target id and cell in a memory object instead), and `state.attack`. It also replaces the donor's A* (sqrt(2) diagonal cost, sorted open list) with an unweighted BFS, so the step it returns can differ from the donor's path in ties. It uses an injected `Rng` where the donor calls `Math.random`. Ties in the chase pick the first BFS hit, not the donor's first minimum.

```ts
// Licence: restricted (as read: LICENSE file = GNU GPL v3; package.json "license": "BSD-3-Clause"; conflict). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export interface Unit {
  id: string;
  side: number;
  x: number;
  y: number;
  hp: number;
  shield: number;
  range: number;        // attack range, Chebyshev cells
  untargetable: boolean;
  pokedoll: boolean;    // holds the tie-break item
}

export interface Memory {
  targetId: string | null; // last chosen target
  tx: number;              // cell the target was on when chosen
  ty: number;
}

export interface Rng { next(): number } // [0,1), injected so a server can replay it

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];

const cheb = (ax: number, ay: number, bx: number, by: number): number =>
  Math.max(Math.abs(ax - bx), Math.abs(ay - by));

// Same rule as the donor's isTargettableBy: enemies always; allies only for a merciless attacker and only at hp <= 10.
export function canTarget(me: Unit, t: Unit, merciless: boolean): boolean {
  if (t.untargetable || t.id === me.id) return false;
  if (t.side !== me.side) return true;
  return merciless && t.hp <= 10;
}

// Nearest targettable unit inside attack range. Ties: pokedoll holders first, then a random pick.
export function nearestInRange(me: Unit, all: Unit[], rng: Rng): Unit | undefined {
  let best = Infinity;
  let pool: Unit[] = [];
  for (const t of all) {
    if (!canTarget(me, t, false)) continue;
    const d = cheb(me.x, me.y, t.x, t.y);
    if (d > me.range) continue;
    if (d < best) { best = d; pool = [t]; } else if (d === best) pool.push(t);
  }
  if (pool.length === 0) return undefined;
  const dolls = pool.filter((t) => t.pokedoll);
  const list = dolls.length > 0 ? dolls : pool;
  return list[Math.floor(rng.next() * list.length)];
}

// Keep the previous target while it is still on the remembered cell; if it moved, keep it only while
// targettable and in range; otherwise pick the nearest in range again.
export function keepOrRetarget(me: Unit, mem: Memory, all: Unit[], rng: Rng): Unit | undefined {
  const prev = all.find((u) => u.id === mem.targetId);
  const occupant = all.find((u) => u.x === mem.tx && u.y === mem.ty);
  if (occupant && prev && occupant.id === prev.id) {
    return canTarget(me, prev, false) ? prev : nearestInRange(me, all, rng);
  }
  if (prev && canTarget(me, prev, false) && cheb(me.x, me.y, prev.x, prev.y) <= me.range) return prev;
  return nearestInRange(me, all, rng);
}

// Merciless (caller checks pp < maxPP): lowest hp + shield among targettables in range; first in scan order wins ties.
export function mercilessPick(me: Unit, all: Unit[]): Unit | undefined {
  const inRange = all.filter((t) => canTarget(me, t, true) && cheb(me.x, me.y, t.x, t.y) <= me.range);
  if (inRange.length === 0) return undefined;
  let pick = inRange[0];
  for (const t of inRange) if (t.hp + t.shield < pick.hp + pick.shield) pick = t;
  return pick;
}

// One chase step toward the goal: BFS over 8 neighbours to the nearest free cell within range of the goal.
// Returns the first cell of that path, or undefined when no such cell is reachable.
export function chaseStep(me: Unit, goal: Unit, all: Unit[], cols: number, rows: number): { x: number; y: number } | undefined {
  const key = (x: number, y: number) => `${x},${y}`;
  const occupied = new Set(all.map((u) => key(u.x, u.y)));
  const ring = new Set<string>();
  for (let y = goal.y - me.range; y <= goal.y + me.range; y++) {
    for (let x = goal.x - me.range; x <= goal.x + me.range; x++) {
      if ((x === goal.x && y === goal.y) || x < 0 || y < 0 || x >= cols || y >= rows) continue;
      if (!occupied.has(key(x, y))) ring.add(key(x, y));
    }
  }
  const start = key(me.x, me.y);
  const parent = new Map<string, string | null>([[start, null]]);
  const queue: [number, number][] = [[me.x, me.y]];
  let found: string | undefined;
  for (let i = 0; i < queue.length; i++) {
    const [cx, cy] = queue[i];
    const k = key(cx, cy);
    if (k !== start && ring.has(k)) { found = k; break; }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nk = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (parent.has(nk) || occupied.has(nk)) continue;
      parent.set(nk, k);
      queue.push([nx, ny]);
    }
  }
  if (found === undefined) return undefined;
  let step = found;
  let k: string | null = found;
  while (k !== null && k !== start) { step = k; k = parent.get(k) ?? null; }
  const [sx, sy] = step.split(",").map(Number);
  return { x: sx, y: sy };
}

// Cooldowns as in the donor: move = round(500 / (0.5 + speed/100)); attack = round(1000 / (0.4 + speed*0.007)).
// Paralysis halves speed before either formula.
export function moveCooldownMs(speed: number, paralysed: boolean): number {
  const s = paralysed ? speed / 2 : speed;
  return Math.round(500 / (0.5 + s / 100));
}

export function attackCooldownMs(speed: number, paralysed: boolean): number {
  const s = paralysed ? speed / 2 : speed;
  return Math.round(1000 / (0.4 + s * 0.007));
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai-target.ts` (new module, engine AI): the pure target choice (merciless pick, keep-or-retarget, nearest-in-range with seeded tie-break) and one chase step. Parity-checklist row 2 (AI brain). The per-tick move and attack timing sit in the fight loop (row 4), not in this module.
- today: Frankendom's current AI code was not opened in this pass; the target path above is where it would go.
- Reuse tag: rewrite-from-idea (licence conflict; GPL-3.0 file vs BSD-3-Clause package.json, clean-room only)
- Brief rule served: ruling "many-on-one logic (hate list, target selection) lives in the engine" and MAX_ATTACKERS = 3 (addendum, Frankendom context); parity row 2 (AI brain)

## 6. Gaps and risks

- Licence conflict: `LICENSE` is GPL-3.0, `package.json` says BSD-3-Clause. Clean-room shape only; do not copy lines.
- No hate list, no threat, no leash. `getNearestTargetAtSight` scans the whole board (pokemon-state.ts:1159), so a unit chases any enemy anywhere and never gives up. Frankendom's MAX_ATTACKERS = 3 and hate-list ruling mean the engine must add the slot cap and hate table; the donor has neither, so in a 3-on-1 every attacker converges on the nearest unit.
- Not replayable as written: `pickRandomIn` and `chance` use `Math.random` (random.ts:11, 47). Frankendom's server-verified kills need a seeded RNG; the donor's tie-breaks and confusion would differ across runs.
- Two metrics: at-range uses Chebyshev, sight and confusion use Manhattan, and the path uses sqrt(2) diagonals. A test that assumes one metric will disagree with this donor.
- Confusion search reads oddly: `let distance = pokemon.range + 1` with `candidateDistance == distance` pushing candidates means a unit at Manhattan distance exactly range + 1 can be chosen when nothing is nearer (pokemon-state.ts:1290-1311). Read, not run. Do not port it as a cap of range.
- Sticky branch 1 keeps the target without a range check when the cell still holds it. Correct only because the stored cell is refreshed each time a target is chosen (attacking-state.ts:80-82). Frankendom should test the "moved away and back" case.
- Tick: variable step clamped at 50 ms (game-room.ts:716-719). It is not a fixed step, and no per-tick NPC budget was found in the code read (the row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget" is not supported by this donor).
- Cost: `move()` runs A* once per candidate cell in the range square (moving-state.ts:119-131). A radius-r search is up to (2r+1)^2 - 1 A* runs per move tick. Frankendom needs a cap if it copies this.
- The attack is queued and resolved later; at impact only `canAttack` is checked (simulation-command.ts:52-53). Whether `state.attack` re-checks that the target is still alive was not read.
- Not read: `state.attack`, `pokemon-state.ts` `update()`, Colyseus `setTimestep` (not in this repo), the abilities that call `getNearestTargetAtSight`.
