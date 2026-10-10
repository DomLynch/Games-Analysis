# angband-angband (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/angband-angband/src/mon-move.c` (with `src/game-world.c`, `src/mon-group.c`, `src/mon-util.c`, `lib/gamedata/constants.txt`) | Licence: dual, GNU GPL v2 or the "Angband licence" (`src/mon-move.c` header lines 12-19; the Angband option is copy-for-not-for-profit only, so we take the GPL terms and write clean-room) | C | symbol `monster_check_active`

Checked: read in full: `mon-move.c` 212-308 (`get_move_find_range`), 391-502 (`get_move_advance`), 508-531 (`get_move_random`), 545-603 (`get_move_find_safety`), 613-666 (`get_move_find_hiding`), 675-731 (`get_move_flee`), 836-967 (`get_move`), 1693-1719 (`monster_check_active`), 1729-1780 (`monster_reduce_sleep`), 1787-1837 (`process_monster_timed`), 1886-1944 (`process_monsters`), 92-123 (the three sense helpers). Read in part: `mon-move.c` 1536-1575 (the bit of `monster_turn` that calls the pack rouse and `get_move`). `game-world.c` 385-450 (scent), 457-758 (`process_world`, only the noise/scent block at 656-660), 1011-1092 (the game loop call sites), 1168-1232 (`make_noise`). `mon-util.c` 682-696 (`monster_wake`), `mon-group.c` 404-429 (`monster_group_rouse`). Callers checked: `get_move` is called only from `monster_turn` (1574); `get_move_find_range` only from `get_move` (851); `monster_reduce_sleep` only from `process_monster_timed` (1791); `monster_check_active` only from `process_monsters` (1951); `monster_group_rouse` only from `monster_turn` (1561). Not read: `get_move_bodyguard` (309-390), `get_move_choose_direction` (740-835), most of `monster_turn` (1503-1692), `group_monster_tracking`, `distance()` (`cave-view.c` 38, signature only), `monster_passes_walls`, `mon_dec_timed` (whether it clamps at zero), `turn_energy`'s table, and the per-race `hearing` / `smell` values (`monster.txt`). Confidence: high on the activity gate, wake, the fight-or-flee range, the chase order and the flee/hide scoring (all read); medium on the full `monster_turn` order. Camera: not applicable (AI cell).

## 1. Mechanism

Each game turn, the player gains energy and every monster gains energy from its speed. A monster acts when it has at least one move's worth of energy. The loop goes from the highest monster index down (`game-world.c` 1087; `mon-move.c` 1900, 1919, 1938, 1945). A monster takes its turn only if it is active (1951). Work order per turn:

- Activity gate (`monster_check_active`, 1693-1719). A monster is active if: it has a passes-walls flag and is within its hearing range (1695); or it is hurt, `hp < maxhp` (1698); or the player can see its grid (1701); or it can hear the player (1704); or it can smell the player (1707); or it is taking terrain damage. Otherwise it goes passive and does nothing that turn.
- Hearing (`monster_can_hear`, 104-112): the hearing value is `race.hearing - stealth / 3` (106-107). The monster hears only if its grid has noise (108-109 return false when it has none) and the hearing value is greater than the grid's noise (111). Noise is a walk distance from the player, built in `make_noise` (game-world 1168-1204): the player's grid is 0 and each walk step adds 1 (`noise_increment`, 1174, 1198), and the spread stops at `max_hearing` (1204).
- Smell (`monster_can_smell`, 117-123): the scent grid must be nonzero and `race.smell` must be greater than it (122). Scent is an age: each refresh adds 1 to every scented grid (game-world 400), then a 5x5 stamp around the player gets 2/1/0 by ring (388-391), spreading only over squares that are not "no scent" (422) and next to a grid one step fresher (438).
- Sleep (`process_monster_timed`, 1790-1792). A sleeping monster does not act. Each of its turns, `monster_reduce_sleep` (1729-1780) rolls `notice` in 0..1023 (1733) and reduces sleep only if `notice^3 <= 2^(30 - stealth)` (1732, 1752). The reduction is `100 / noise` when the monster's grid has noise between 1 and 49 (1759-1760), else 1 (1754-1769). Aggravation wakes the monster at once (1737-1741).
- Awareness (1795-1796). An awake, active monster becomes aware with chance 1 in 10 per turn.
- Fight or flee (`get_move_find_range`, 212-308). It sets `min_range`, the distance the monster wants to keep:
  - Afraid (fear timer or frightened flag): flee range, always (223-224).
  - Taunted player: returns early at 233 (before `best_range` is set, so `best_range` is left as it was).
  - Otherwise the monster level is `race.level + (midx & 8) + 25` (241; the donor calls the middle term "morale"). If `m_lev + 3 < p_lev`, flee range (244-245). If `m_lev - 5 < p_lev`, compare `(p_lev x mhp + 4 x chp)` times the monster's `maxhp` against the monster's `(m_lev x maxhp + 4 x hp)` times the player's `mhp` (257-261). Greater means flee range. Note that `(p_chp << 2)` is four times current HP, so each side is "level + 4 x HP fraction".
  - If `min_range < flee_range` (266): never-move and never-blow monsters add 3 each (268-273). Then, if it is not fleeing, the rule at 277-281 applies: a fleeing monster is set to flee range whatever its distance (277-278), and a non-fleeing monster that is inside `turn_range` drops to 1 (279, 281).
  - Code note: the comment at 280 says nearby monsters "won't run away". The code does not do that for fleeing monsters: at 277-278 a fleeing monster is set to flee range whatever its distance. The near rule only drops the non-fleeing offsets.
- Chase (`get_move_advance`, 391-502). In order: if the player is in view, move straight at the player (422-424). Else, if it can hear, scan the 8 neighbours for a grid whose noise is lower than its own (433-456; equal noise is a backup, 460-462). Else, if it can smell, take the neighbour with the largest `race.smell - scent`, scent nonzero (477-484; no passability check here). Else take the backup, or return false.
- Then `get_move` (836-967) chooses among these, in order: a pack tracker in line of sight (860-864); keep the last goal if tracking (866-869); a random walkable step (872). Then: take-terrain-damage flee (881-886). Then, for pack monsters (group AI, not passes-walls), if the player stands where fewer than 5 neighbours are open and the player has more than half HP, find a hiding place (905-915). Then, if afraid, find a safe spot and flee to it (918-931). Then pack monsters in view step toward an empty grid next to the player (935-957).
- Safe spot (`get_move_find_safety`, 545-603): rings d = 1..9; a grid qualifies if its noise is at most this monster's noise plus 2d (573-574) and the player cannot see it (581). It takes the grid farthest from the player in the first ring that has any.
- Hiding spot (`get_move_find_hiding`, 613-666): minimum distance `dist(player, mon) x 3 / 4 + 2` (620). Among empty, unseen, projectable grids in the first ring with a hit, take the nearest one to the player that is at least that far (643-649).
- Flee step (`get_move_flee`, 675-731): only if the player is within `best_range` (684) and the monster can hear or smell (689). Score each neighbour: `5000 / (dist to target + 3) - 500 / (noise there + 1)`, clamped at 0 (711-714). Ties go to the later neighbour (717).
- Pack rouse (`monster_turn` 1561 calls `monster_group_rouse`, mon-group.c 407-429): an aware monster (414) wakes each sleeping group member it can see (419) with chance one in `dist x 20` (423), and the woken member becomes aware with chance 50 (424, via `monster_wake`, mon-util.c 689-696).

Tick: discrete game turns with an energy budget (not seconds). Every 10 game turns `process_world` runs (game-world 1074-1076), and the noise and scent refresh sits inside it (656-660, with the `process_world` body spanning 457-758). Noise and scent are therefore refreshed every ten game turns, not every player move. The donor does not spread monster work across turns; it only skips turns for passive monsters.

## 2. Key functions

- `monster_check_active`: `/mnt/frankendom-donors/angband-angband/src/mon-move.c` 1693-1719. The activity gate.
- `monster_reduce_sleep`: same file, 1729-1780. The stealth roll and the distance-scaled sleep drain.
- `get_move_find_range`: same file, 212-308. Fight or flee by level plus HP fraction.
- `get_move_advance`: same file, 391-502. Sight, then sound, then scent, then backup.
- `get_move`: same file, 836-967. The order of the movement choices.
- `get_move_flee` and `get_move_find_safety` / `get_move_find_hiding`: same file, 675-731, 545-603, 613-666.
- `make_noise` and `update_scent`: `/mnt/frankendom-donors/angband-angband/src/game-world.c` 1168-1232 and 385-450.
- `monster_group_rouse`: `/mnt/frankendom-donors/angband-angband/src/mon-group.c` 407-429.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Act only when something can sense the target (hear, smell, see) or the actor is hurt; otherwise skip the turn | Hearing = race value minus stealth / 3 (107); smell = race value (122); hurt means below max HP (1698). Race values are not read |
| Noise as a walk-distance field from the target, capped at a range | Step cost 1, or 4 under covert tracks (1174); cap = `max_hearing` (1204) |
| Sleep drains by a roll weighted by stealth; drains faster when closer | Notice 0..1023 cubed against 2^(30 - stealth) (1732-1733, 1752); drain 100 / noise for noise 1..49, else 1 (1759-1760) |
| Random wake from awake active state | One in 10 per turn to become aware (1795) |
| Fight-or-flee by level plus HP fraction, cross-multiplied | Weak test: monster level + 3 below player (244); fight test: within 5 (246); HP weight 4 (257); monster level offset 25 plus a 0-or-8 bit (241) |
| Near enemies keep their no-run offsets reset | turn-range 5 (constants.txt 62; 279) |
| Flee range | max-sight 20 + flee-range 5 (constants.txt 195, 58; `flee_range` defined at 220 and 846 in the donor) |
| Flee step scoring: far from target, far from the source | 5000 / (d + 3) - 500 / (noise + 1) (711) |
| Ambush hide distance | dist x 3 / 4 + 2 (620) |
| Pack rouse | One in dist x 20 (423); friend wakes with 50 (424); aware gate (414) |
| Awareness roll on wake | 100 for aggravation (1741), 50 for pack rouse (424) |

## 4. TypeScript sketch

simplified: the sketch keeps the activity gate (without the passes-walls and terrain branches), the sleep roll and drain, the fight-or-flee range (with the taunt early return and the never-move/never-blow offsets), the sight, sound, scent and backup chase order, the flee step scoring, the hiding spot, and the pack rouse. It omits: the bodyguard role, the decoy target, the group tracker, the random walk, the multiply and ranged-attack branches that come before the move in `monster_turn`, the stagger / erratic move, the covert-tracks sight limit, `best_range` bonuses (archers, spellcasters, breathers), the terrain-damage flee, the surround step, the energy loop, and the cave's own distance function (passed in as a parameter). The sound branch's passability test is a parameter. The scent branch has no passability test, as in the donor.

```ts
// Licence: GNU GPL v2 or the "Angband licence" (donor header, src/mon-move.c, dual licence). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Cell = { x: number; y: number };
interface Race { hearing: number; smell: number; level: number; neverMove: boolean; neverBlow: boolean; frightened: boolean; passesWalls: boolean; }
interface Mon { grid: Cell; hp: number; maxhp: number; level: number; morale: number; race: Race; asleep: number; fear: number; aware: boolean; dist: number; minRange: number; }
interface Player { grid: Cell; lev: number; chp: number; mhp: number; stealth: number; taunted: boolean; }
interface Field { noise(c: Cell): number; scent(c: Cell): number; inView(c: Cell): boolean; }

const MAX_SIGHT = 20;              // data: player:max-sight (lib/gamedata/constants.txt)
const FLEE_RANGE = MAX_SIGHT + 5;  // data: max-sight + flee-range (mon-play:flee-range = 5)
const TURN_RANGE = 5;              // data: mon-play:turn-range

// Can the monster hear the player? Noise is a walk distance from the player (0 = none).
function canHear(m: Mon, p: Player, f: Field): boolean {
  const base = m.race.hearing - Math.trunc(p.stealth / 3);
  const n = f.noise(m.grid);
  return n !== 0 && base > n;
}

function canSmell(m: Mon, f: Field): boolean {
  const s = f.scent(m.grid);
  return s !== 0 && m.race.smell > s;
}

// Activity gate: a monster takes turns only when it can sense the player or is hurt.
function isActive(m: Mon, p: Player, f: Field, terrainHurts: boolean): boolean {
  if (m.dist <= m.race.hearing && m.race.passesWalls) return true;
  if (m.hp < m.maxhp) return true;
  if (f.inView(m.grid)) return true;
  if (canHear(m, p, f)) return true;
  if (canSmell(m, f)) return true;
  return terrainHurts;
}

// Sleep: a sleeping monster does not act. Each turn a stealth-based roll may drain sleep;
// the drain is 100 / noise when the monster is 1..49 walk-steps from the player, else 1.
function reduceSleep(m: Mon, p: Player, f: Field, rnd: () => number): void {
  const notice = Math.floor(rnd() * 1024);
  const playerNoise = Math.pow(2, 30 - p.stealth);
  if (notice * notice * notice > playerNoise) return;
  const n = f.noise(m.grid);
  let drain = 1;
  if (n > 0 && n < 50) drain = Math.trunc(100 / n);
  m.asleep = Math.max(0, m.asleep - drain); // donor clamp not read; the sketch clamps at zero
}

// Fight-or-flee: the monster's minimum range. FLEE_RANGE means it runs. Taunt returns early (donor).
function findMinRange(m: Mon, p: Player): number {
  if (m.fear > 0 || m.race.frightened) return FLEE_RANGE; // afraid: always runs
  if (p.taunted) return 1;                                // donor returns before best_range is set
  let r = 1;
  const mLev = m.race.level + m.morale + 25;
  if (mLev + 3 < p.lev) {
    r = FLEE_RANGE; // much weaker than the player
  } else if (mLev - 5 < p.lev) {
    // (player level + 4 x hp fraction) vs (monster level + 4 x hp fraction), cross-multiplied
    const pVal = p.lev * p.mhp + 4 * p.chp;
    const mVal = mLev * m.maxhp + 4 * m.hp;
    if (pVal * m.maxhp > mVal * p.mhp) r = FLEE_RANGE;
  }
  if (r < FLEE_RANGE) {
    if (m.race.neverMove) r += 3;
    if (m.race.neverBlow) r += 3;
    if (m.dist < TURN_RANGE) r = 1; // near, not fleeing: offsets dropped
  }
  return r;
}

// Chase: sight, then the quieter neighbour, then the strongest-scent neighbour, then a backup.
type Kind = 'see' | 'hear' | 'smell' | 'backup';
function advance(m: Mon, p: Player, f: Field, neigh: Cell[], okToStep: (c: Cell) => boolean): { to: Cell; kind: Kind } | undefined {
  if (f.inView(m.grid)) return { to: p.grid, kind: 'see' };
  let backup: Cell | undefined;
  if (canHear(m, p, f)) {
    const here = f.noise(m.grid);
    for (const g of neigh) {
      const n = f.noise(g);
      if (n === 0 || !okToStep(g)) continue;
      if (n < here) return { to: g, kind: 'hear' }; // lower noise = closer to the player
      if (n === here) backup = g;                    // donor keeps the last equal one
    }
  }
  if (canSmell(m, f)) { // reached only when no quieter neighbour was found (donor order)
    let bestVal = 0;
    let bestCell: Cell | undefined;
    for (const g of neigh) {
      const s = f.scent(g);
      const v = m.race.smell - s;
      if (v > bestVal && s !== 0) { bestVal = v; bestCell = g; } // no passability check here (donor)
    }
    if (bestCell) return { to: bestCell, kind: 'smell' };
  }
  return backup ? { to: backup, kind: 'backup' } : undefined;
}

// Flee step: score = 5000 / (dist to safe spot + 3) - 500 / (noise here + 1); best neighbour wins, ties to later.
function fleeStep(target: Cell, neigh: Cell[], f: Field, distance: (a: Cell, b: Cell) => number): Cell {
  let best = neigh[0];
  let bestScore = -1;
  for (const g of neigh) {
    const score = Math.max(0, Math.trunc(5000 / (distance(g, target) + 3)) - Math.trunc(500 / (f.noise(g) + 1)));
    if (score < bestScore) continue;
    bestScore = score;
    best = g;
  }
  return best;
}

// Hide (pack ambush): the nearest empty, unseen, reachable grid that is at least 3/4 of the current distance + 2 from the player.
function findHiding(m: Mon, p: Player, rings: Cell[][], isEmpty: (c: Cell) => boolean, reachable: (c: Cell) => boolean, f: Field, distance: (a: Cell, b: Cell) => number): Cell | undefined {
  const min = Math.floor(distance(p.grid, m.grid) * 3 / 4) + 2;
  for (let d = 1; d < 10; d++) {
    let best: Cell | undefined;
    let gdis = 999;
    for (const g of rings[d]) {
      if (!isEmpty(g) || f.inView(g) || !reachable(g)) continue;
      const dis = distance(g, p.grid);
      if (dis < gdis && dis >= min) { best = g; gdis = dis; }
    }
    if (gdis < 999) return best;
  }
  return undefined;
}

// Pack rouse: an aware monster wakes sleeping friends it can see, chance 1 in (distance x 20), then a 50% awareness roll.
function groupRouse(rouser: Mon, members: Mon[], canSee: (a: Cell, b: Cell) => boolean, distance: (a: Cell, b: Cell) => number, rnd: () => number): void {
  if (!rouser.aware) return;
  for (const f of members) {
    if (f.asleep <= 0 || !canSee(rouser.grid, f.grid)) continue;
    const d = distance(rouser.grid, f.grid);
    if (Math.floor(rnd() * d * 20) !== 0) continue;
    f.asleep = 0;
    if (rnd() * 100 < 50) f.aware = true;
  }
}
```

## 5. Lands in

- TARGET `src/fight/brain.ts` (new module, proposed): the per-attacker decision each tick (act or skip, approach, hold, flee, hide). Parity-checklist row 2 (AI brain). The per-tick NPC budget sub-line of the server tick (post-K item 3, "server tick: fixed step, input intake, per-tick NPC budget") is where the activity gate would live; it is cited there, not as a separate row.
- today: (not read) in the Frankendom repo.
- Reuse tag: rewrite-from-idea (GPL v2 terms; clean-room only; the Angband licence option is not-for-profit and is not used)
- Brief rule served: 1 (one engine decides the target's movement; the server owns it); zones as data for the sense ranges and the flee numbers.
- Best transferable idea: Let an NPC take a turn only when it can hear, smell or see the player (or is hurt), and decide fight or flee by comparing level plus HP fraction, so the server spends its per-tick NPC budget only on fights that can happen.
- Decision (proposed): adapt — keep the activity gate and the level-plus-HP fight-or-flee test as the brain's cheap first checks, because they give the server a per-tick budget rule and a readable flee rule; drop the stealth dice wake and the roaming scent trail for a duel, because a duel has one known opponent and nothing to find.
- Acceptance: A server test shows an NPC out of hearing and in no view, at full HP, runs no brain step on that tick; a player entering view makes it act on the same tick; an NPC whose level plus 4 x HP fraction is below the player's moves to flee range once it is 5 or more units away.

## 6. Gaps and risks

- Clean-room only. The donor is GPL v2 or the Angband licence (not-for-profit). We take the GPL terms and write the sketch from the mechanism.
- Frankendom's duels have one opponent per fight and a 3-attacker cap (MAX_ATTACKERS = 3). The donor's pack logic (surround, ambush, group tracker) is many-monster; only the activity gate and the flee test fit the duel. The pack rouse fits zones, not the duel.
- The sense ranges (hearing, smell) are per race in the donor and are not read here (`monster.txt`). Frankendom should make them zone data, not engine constants.
- The donor's noise is a walk distance on a grid. Frankendom has no grid walk for a duel. A zone-level equivalent would need the zone's own walkable graph, and that is not built.
- The donor's comment on turn-range says nearby monsters "won't run away", but the code does not do that for a fleeing monster (277-281). Do not port the comment as a rule. Port the code: fleeing monsters run whatever the distance; near non-fleeing monsters drop their offsets.
- Timing is discrete game turns with energy, not wall-clock seconds. The server tick must count ticks, not ms.
- The taunt branch returns before `best_range` is set, so a taunted monster keeps its old range. Frankendom should set the range explicitly on every path; do not copy the stale value.
- Not read: `monster_turn` in full, the bodyguard role, the group tracker, the race hearing and smell values, and `mon_dec_timed`'s clamp. Do not claim how they behave.
