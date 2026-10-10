# rathena-rathena (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` | Licence: GPL-3.0 (read: `/mnt/frankendom-donors/rathena-rathena/LICENSE` lines 1-2, "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"). Clean-room, shape only. | C++ | symbol `mob_ai_sub_hard`

Checked: Read: `mob_ai_sub_hard` (1841-2226), with the loot branch read in outline and the bg-ally and slave sub-branches skimmed; `mob_can_changetarget` (1229-1256); `mob_target` (1290-1307); `mob_ai_sub_hard_activesearch` (1314-1366); `mob_ai_sub_hard_changechase` (1369-1392); `mob_unlocktarget` (1627-1665, first half); `mob_set_attacked_id` (2257-2305); the per-player driver `mob_ai_sub_foreachclient`, `mob_ai_sub_hard_timer`, `mob_ai_sub_lazy` (2332-2458) and the timers (2460-2475, 7363-7364). Damage log (`mob_log_damage` 2672-2771) read, to see whether it feeds targeting: it does not (no reference in lines 1229-2230 by grep). Config read: `conf/battle/monster.conf` (89, 109, 338), `conf/battle/client.conf` (39), `src/map/battle.cpp` table lines 8580, 8622, 8748. Not read: `mob_randomwalk`, the body of `mob_warpchase`, `mobskill_use`, `mob_add_spotted`/`mob_is_spotted`, `unit_can_reach_bl`, `distance_bl`/`check_distance_bl`, `battle_check_range`, `battle_check_target`, and the loot-item branch in detail. Confidence high on target pick, retarget, chase refresh and unlock. Medium on the "same tick twice" note (inferred from the gate, not run). camera_scope not applicable (AI topic).

## 1. Mechanism

- Two AI passes run from timers. `mob_ai_hard` fires every `MIN_MOBTHINKTIME` = 100 ms (7363) and, for each player, calls `mob_ai_sub_hard_timer` on every mob inside `AREA_SIZE + ACTIVE_AI_RANGE` = 14 + 4 cells of that player (2348-2351). Each such mob is recorded as spotted by that player (2337) and given the hard AI. `mob_ai_lazy` fires every 1000 ms (7364) and runs `mob_ai_sub_lazy` over all mobs (2461). The lazy pass skips a mob that had a hard run in the last 200 ms (2403), clears the spotted log (2399), unlocks its target (before the random walk) and, if the mob is spotted, random-walks it with `mob_nopc_move_rate` chance (2437-2442).
- Hard AI gate and order, `mob_ai_sub_hard` (1841): returns if the mob has no map or is dead; returns if it is force-walked (early in the function). Then `if (DIFF_TICK(tick, md->next_thinktime) < 0) return false;` (1854-1855), then `md->next_thinktime = tick;` (1858). The 100 ms cadence therefore comes from the timer, not from the stored time (inferred; see gaps). A busy skill (`skilltimer`) returns (before the target check). Abnormal states clear the target ids (before the target check). A skill is used first if the walk timer is idle and `MOB_SKILL_INTERVAL` (1000 ms) has passed (1884). View range is `range2`, or 1 when blind (line 1894).
- Target validity. If the current target is gone, on another map, not skill-usable, a gangster-paradise player, or invincible, the mob tries a warp chase, then keeps walking if it is already walking, else unlocks (read at the level of branch structure).
- Retarget on being hit, `mob_ai_sub_hard` attacked block (the attacked block, ending at 1994). `attacked_id` is set by `mob_set_attacked_id` (2257): a pet's master, a mob's master (when `retaliate_to_master`), or the attacker itself (the switch on source type). That also clears `aggressive` (2297) and runs the hard AI at once (2301). In the hard AI the switch happens only if: the attacker is on the same map and within `AREA_SIZE` (1959), it is an enemy, the change rule allows it (`mob_can_changetarget`, 1955), and either the attacker is inside melee range or the mob can reach it within `range3` (the reach condition that follows). Otherwise the attack is "rude": the attacker is not the mob itself, and `++attacked_count > RUDE_ATTACKED_COUNT` (1 at mob.cpp:49) calls the rude-attacked skill (the rude branch); no switch. A successful switch sets `target_id = attacked_id` (1986) and lowers the count by one. Both ids are cleared after (1994).
- Change rule, `mob_can_changetarget` (1229): by state. Idle, walk, loot, follow and angry always allow a change (the switch cases follow, angry, idle, walk and loot return 1). Rush allows only when the mode has `MD_CHANGETARGETCHASE` (1252). Berserk needs `MD_CHANGETARGETMELEE` (1242), then a normal-attack-id or range check. Default: no change.
- Aggressive search, `mob_ai_sub_hard_activesearch` (1314-1366), run when there is no target (or the slave lost its target) and the mob is aggressive, or when it is in follow state (2024). It walks everyone in `view_range`. A candidate is skipped if: it is the current target (start of the function); the mob has `MD_TARGETWEAK` and the candidate's level is at least the mob's level minus 5 (1330); it is not an enemy (`battle_check_target`); it has gangster paradise (not read in detail, the check is at 1334-1338). Otherwise the candidate replaces the current pick only if there is no pick, or the pick is farther than the candidate (1346: `(*target) == nullptr || !check_distance_bl(md, *target, dist)`). The candidate must also be inside `range2` (1347). With `ACTIVEPATHSEARCH` (defined, mob.cpp:58) the walked path must be at most `range2` cells when standing, or `range3` cells when walking (1354).
- Engage. If a new target was found and it is already inside weapon range, the mob drops aggressive and goes to rush (2030-2032). If the mob is in weapon range of its target it attacks (2141). Otherwise chase:
  - Re-plan gate (the chase branch): while walking and not yet `mob_chase_refresh` cells along the path (32 by default, battle.cpp:8748), keep the current path.
  - Angry state (2208): only chases if the target is inside `range3` for reach; otherwise unlock.
  - Walk to the target, stopping at weapon range (2213: `unit_walktobl(md, tbl, weapon range, 2)`).
- Lost mobility and unlock. If the mob is immobile or trapped and has no attack timer running (the branch before the chase, read around 2182), it unlocks when `DIFF_TICK(tick, last_canmove) > mob_unlock_time` (2000 ms, monster.conf:338), otherwise it switches to idle and keeps the target a little longer. `mob_unlocktarget` (1627): the default branch stops the attack, sets idle, clears the target, and schedules the next random walk at `tick + rnd()%1000 + MIN_RANDOMWALKTIME` (4000 ms, mob.hpp:39; 1652). Walk-instantly is a flag (1649).
- Rush or follow re-target. In rush or follow state with `MD_CHANGECHASE`, the mob re-targets any enemy inside `min(view range, weapon range)` (around the call at 2040; the changechase candidate also needs `battle_check_range` at 1384).

## 2. Key functions

- `mob_ai_sub_hard`: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 1841-2226. The whole AI decision: gate, skills, target validity, retarget, aggressive search, changechase, unlock, attack or chase. Read in full apart from the loot and slave sub-branches.
- `mob_can_changetarget`: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 1229-1256. The change rule by state.
- `mob_ai_sub_hard_activesearch`: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 1314-1366. Nearest-wins pick with weak-target and path gates. Read in full.
- `mob_ai_sub_hard_changechase`: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 1369-1392. Rush/follow re-target inside weapon range.
- `mob_set_attacked_id`: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 2257-2305. Records the attacker, clears aggression, runs the AI immediately. Read in full.
- `mob_ai_sub_foreachclient` / `mob_ai_sub_hard_timer` / `mob_ai_sub_lazy`: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 2332-2458. The per-player driver and the lazy pass. Read in full except the slave branch.
- `mob_unlocktarget`: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 1627-1665. Unlock and idle (first half read; the rest is the lootitem/cell-stack branch).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Nearest eligible target wins; a farther pick is replaced by a nearer one | Search radius `range2` (per mob, db not read); distance metric not read |
| Weak-target filter: skip players at least `level - 5` | 5 levels (theirs, mob.cpp:1330) |
| Path gate: standing mobs use `range2`, walking mobs use `range3` | ACTIVEPATHSEARCH defined (theirs, mob.cpp:58) |
| Retarget on hit only if the attacker is near and reachable; otherwise count a rude attack | Visual area `AREA_SIZE` (theirs, client.conf:39, value 14); rude threshold 1 (theirs, mob.cpp:49) |
| Chase refresh: do not re-plan until N cells walked | 32 cells (theirs, battle.cpp:8748 default) |
| Lost-mobility unlock after a timeout, then idle and random walk | 2000 ms (theirs, monster.conf:338); random walk 4000 ms + rnd < 1000 (theirs, mob.hpp:39, mob.cpp:1652) |
| Hard AI near a player, lazy AI far away | Hard 100 ms (theirs, mob.cpp:7363 via MIN_MOBTHINKTIME, mob.hpp:35); lazy 1000 ms (theirs, mob.cpp:7364); presence radius 14 + 4 (theirs, mob.cpp:2351, mob.cpp:46) |
| Skill interval | 1000 ms (theirs, mob.hpp:42) |
| Damage log for rewards | Log size `DAMAGELOG_SIZE` (not read); self damage counts for tap (theirs, mob.cpp:2737) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's nearest-in-view pick (with weak-target filter and path gate), the on-hit retarget with the reach and rude-count rule, the chase refresh gate, the lost-mobility unlock, and the near/far driver route. It omits: the skill checks (rude-attacked skill is a no-op hook), the warp chase, abnormal-state target clearing, the loot branch, slave and bg-ally branches, the idle state and the random walk, the change-rule modes (`MD_CHANGETARGETCHASE`, berserk), the `attacked_id == target_id` branch, and the per-player timers (the sketch routes each mob once, by distance to any player). The distance metric is a stand-in (not read).

```ts
// Licence: GPL-3.0 (rAthena LICENSE, read: GNU GENERAL PUBLIC LICENSE, Version 3). Clean-room shape only, written from the mechanism; no donor lines are translated.
// Times in ms, cells in map cells. Values are the donor defaults named in the note.
const HARD_THINK_MS = 100;        // MIN_MOBTHINKTIME
const LAZY_THINK_MS = 1000;       // MIN_MOBTHINKTIME * 10
const SKILL_INTERVAL_MS = 1000;   // MOB_SKILL_INTERVAL
const AREA_SIZE = 14;             // area_size (conf/battle/client.conf:39)
const ACTIVE_AI_RANGE = 4;        // added to AREA_SIZE for the hard AI
const RUDE_ATTACKED_COUNT = 1;    // rude attacks before the rude-attacked skill hook
const UNLOCK_MS = 2000;           // mob_unlock_time (conf/battle/monster.conf:338)
const CHASE_REFRESH_CELLS = 32;   // monster_chase_refresh (default in battle.cpp)

interface Point { x: number; y: number; }
interface Player extends Point { id: number; level: number; invisible: boolean; }
interface Mob extends Point {
  id: number;
  level: number;
  viewRange: number;        // range2
  walkViewRange: number;    // range3, used while walking
  weaponRange: number;
  weakTarget: boolean;      // only picks players below its level
  aggressive: boolean;
  target: Player | null;
  attackedBy: Player | null;
  rudeCount: number;
  cellsWalked: number;      // cells walked on the current path
  walking: boolean;
  lastMoveMs: number;
  spotted: Set<number>;     // players that have seen this mob
  pathLen: (to: Player) => number;   // path length in cells
}

function cellDist(a: Point, b: Point): number {       // metric not read in the donor (distance_bl)
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

// Aggressive search: nearest eligible player inside view range, path length gated.
function pickNearest(m: Mob, players: Player[]): Player | null {
  let best: Player | null = null;
  let bestD = Infinity;
  for (const p of players) {
    if (p.invisible) continue;
    if (m.weakTarget && p.level >= m.level - 5) continue;
    const d = cellDist(m, p);
    if (d > m.viewRange) continue;
    if (best !== null && d >= bestD) continue;      // replace only when strictly nearer
    const limit = m.walking ? m.walkViewRange : m.viewRange;
    if (m.pathLen(p) > limit) continue;
    best = p;
    bestD = d;
  }
  return best;
}

// Rude-attacked skill hook (donor: a skill use; not modelled here).
function rudeAttackedHook(_m: Mob): void {
  return;
}

// Retarget on being hit: switch only when the attacker is near and reachable; otherwise count a rude attack.
function onAttacked(m: Mob, attacker: Player, changeAllowed: boolean, canReach: boolean): void {
  if (!changeAllowed) return;
  if (cellDist(m, attacker) > AREA_SIZE) return;     // outside the visual area
  const inMelee = cellDist(m, attacker) <= m.weaponRange;
  if (!inMelee && !canReach) {
    m.rudeCount++;                                    // donor: ++attacked_count
    if (m.rudeCount > RUDE_ATTACKED_COUNT) rudeAttackedHook(m);   // donor: mobskill_use(MSC_RUDEATTACKED)
    return;
  }
  m.target = attacker;
  if (m.rudeCount > 0) m.rudeCount--;
  m.aggressive = false;                               // being attacked leaves aggressive mode
}

// Chase refresh: a walking mob re-plans only after it has walked CHASE_REFRESH_CELLS cells.
function mayReplanChase(m: Mob): boolean {
  return !m.walking || m.cellsWalked > CHASE_REFRESH_CELLS;
}

// Lost mobility: keep the target for UNLOCK_MS after the last move, then drop it and go idle.
function unlockIfStuck(m: Mob, nowMs: number, canMove: boolean): void {
  if (canMove) return;
  if (nowMs - m.lastMoveMs > UNLOCK_MS) m.target = null;
}

// Driver routing: a mob with a player inside AREA_SIZE + ACTIVE_AI_RANGE gets the hard AI; others get the lazy pass.
function driverRoute(m: Mob, players: Player[]): "hard" | "lazy" {
  for (const p of players) {
    if (cellDist(m, p) <= AREA_SIZE + ACTIVE_AI_RANGE) {
      m.spotted.add(p.id);
      return "hard";
    }
  }
  return "lazy";
}
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (engine AI decision: nearest target in view, retarget on hit, chase refresh, unlock). Parity-checklist row 2 (AI brain).
- Related, not the target: the presence route (near = hard AI, far = lazy pass with a spotted log) and the cadence (100 ms hard, 1000 ms lazy) belong to row 23 (zone population: presence-gated engine logic) and to the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3). This donor has no per-tick NPC budget in the read code.
- today: not checked (this reader had no Frankendom checkout; only donor code was in reach).
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room, shape only)
- Brief rule served: 1 (one engine: the AI decision lives in one module); rules 7-9 n/a

Best transferable idea: a mob only switches to the player who hit it when that player is in view and reachable, so a distant or unreachable hitter counts as a rude attack and does not pull aggro.

Decision (proposed): adapt - take the retarget-on-hit gate (in view, reachable, otherwise a counted rude attack) and the presence route (hard AI near, lazy pass far) as data; reject the damage log as a threat table, because here it only feeds rewards and is not read by targeting, and reject the `monster_ai` bit switches (defaults are 0, and Frankendom needs one rule set).
Acceptance: a server test with a mob, a player 10 cells away and weapon range 2 that cannot be reached asserts that a hit leaves the target unchanged and raises the rude count to 1; and a mob 19 cells from every player is routed "lazy", not "hard".

## 6. Gaps and risks

- No attacker cap. rAthena has no MAX_ATTACKERS-like limit: every mob with a player in view picks its own nearest player, so a crowd can all target one player. Frankendom's MAX_ATTACKERS = 3 must be enforced in `src/fight/ai.ts`, not copied from here.
- Server-side AI. The donor runs the AI on the map server, which fits "server-verified kills". Frankendom's server must own the hard AI tick (row 18 sub-line), and the Pit client only draws.
- One ledger. The damage log keeps per-character damage for rewards (`mob_log_damage`, 2672-2771) and is kept apart from targeting. Frankendom's one-ledger rule should keep reward credit in the one ledger, not a per-mob threat table.
- Zones as data. The radius (14 + 4), the lazy and hard intervals, the unlock time and the chase refresh are global battle config here. Frankendom should move presence radius and unlock time into zone data (row 23).
- Same-tick repeat (inferred, not run). The hard gate sets `next_thinktime = tick` (1858) rather than `tick + interval`, and the driver runs once per player in range (2348-2351). A mob inside two players' view may therefore think twice in one pass. Test before copying the cadence.
- Rude-attacked skill and warp chase are not modelled. The donor fires a skill hook (the rude branch) and a warp chase (warp chase function, gated by `mob_ai` 0x40, default 0 at battle.cpp:8580, so off by default). Frankendom should decide whether a rude attack does anything at all.
- Not read: `mob_randomwalk`, `mob_warpchase` body, `mobskill_use`, `mob_add_spotted`/`mob_is_spotted`, `unit_can_reach_bl`, `distance_bl`, `check_distance_bl`, `battle_check_range`, `battle_check_target`, the loot-item branch, `unit_update_chase` body (grep only, `unit.cpp` 113-165 lines seen in grep).
