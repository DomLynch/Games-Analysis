# veloren-veloren (enemy-ai-behaviour, cell 1)

Donor: `/mnt/frankendom-donors/veloren-veloren/server/src/sys/agent/behavior_tree/mod.rs` (do_combat 852-1009) with `server/agent/src/util.rs` 66-103 | Licence: GPL-3.0 (read: LICENSE, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | Rust | symbol `stop_pursuing`

Checked: Read end to end: `do_combat` (behavior_tree/mod.rs 852-1009), `stop_pursuing` and its two score helpers (server/agent/src/util.rs 66-103), `choose_target` (action_nodes.rs 1034-1198), `target_if_attacked` (behavior_tree/mod.rs 274-330), `Psyche` (common/src/comp/agent.rs 254-281 and the per-species arms), `flee` (action_nodes.rs 860-898), constants (server/agent/src/consts.rs). Partly read: `attack.rs` ability choice (only `choose_weighted` 6255-6303 and the tactic table start 1254-1300); the 9077-line `attack.rs` otherwise (not read). Confidence high on the leash score and its order of steps; medium on the claim that the ability choice is random-weighted per tactic (read the helper, not every caller). Veloren has no `.git` directory in the box, so there is no commit history; history below is from CHANGELOG.md only. Camera: n/a.

Best transferable idea: Decide break-off with a two-score race (a keep-chasing score from aggression over distance and target health, against a let-go score from anchor distance, time since the last hit and own health) instead of a fixed leash radius.
Decision (proposed): adapt — the race takes row fields (flee_health, aggro radius, never-breaks-off flag) so new creatures are rows; the donor's clock runs from target selection and its divisions have no floor, both fixed in the sketch; GPL-3.0 means clean-room only.
Acceptance: Server test with fixed inputs (test fixture, not donor values: flee_health 0.4, aggro_dist 20, sight_dist 30, both sides at full health, so aggression = 2.5 x 20 x 30 = 1500): an NPC with its target 5 m away, hit by that target 2 s ago and 30 m from its anchor, keeps chasing (pursue 6000 vs escape 9); an NPC with its target 20 m away, not hit for 60 s and 60 m from its anchor, drops the target and walks home (pursue 375 vs escape 1080). The same 60 s / 60 m NPC with the target at 5 m keeps chasing (pursue 6000), because the result flips on the pursue score; a 0-health or 0-distance input returns a finite result.

## 1. Mechanism

- One NPC, one tick: `BehaviorTree::root().run` is called once per agent per tick from the agent system (`server/src/sys/agent/mod.rs` 265); the system is measured as a Rayon job (42). The tree decides; action nodes write the controller.
- The decision for an NPC that has a target runs in `do_combat`, in this order (behavior_tree/mod.rs):
  1. Flee first: if below `flee_health` or a stay position is set, flee (915). Crawling NPCs always flee with a 5x timer multiplier (crawl arm 897, value 907). Flee lasts `FLEE_DURATION` = 3.0 s times the multiplier (918). Then the target is dropped and the NPC idles (947-953). Detail: beyond `NORMAL_FLEE_DIR_DIST` (20) from the target the NPC flees toward a random point set at the start of the flee, not directly away.
  2. Target dead: drop it, say relief, idle (954-957).
  3. Target invulnerable OR `stop_pursuing(...)` is true: drop the target and idle (958-969).
  4. Otherwise: retarget if due (971-976), then attack if `aggro_on`, else menace (warn) (978-1000).
- Aggro latch: inside `aggro_dist * aggro_range_multiplier` (squared compare, 886-889) `aggro_on` is set true (891-893). Menace (warning) happens only while it is still false.
- The break-off test is a two-score race (util.rs 66-80): `stop_pursuing = should_stop_pursuing AND escape > pursue`.
  - Pursue score (keep chasing) = `100 * aggression / (dist_to_target^2 * target_health_fraction)`, where `aggression = (1 / max(flee_health, 0.25)) * (aggro_dist or sight_dist) * sight_dist` (util.rs 83-93). Lower flee_health gives more aggression, up to a 4x cap.
  - Escape score (let go) = `(dist_to_anchor^2 / own_health_fraction) * seconds * 0.005` (util.rs 97-103).
  - `dist_to_anchor^2` is the squared distance to the NPC's patrol origin (873-876). If there is no patrol origin, the value is the constant 1.0 (874-875 `None` arm). So an NPC without a patrol origin never gets far from "home" in this score.
  - `seconds` is `read_data.time.0 - selected_at` (964): time since the target was selected, not time since the target last hit the NPC. The name of the parameter in util.rs says "since last attacked"; the call site passes "since selected". Both are checked above.
- Retarget: every 10 s (`RETARGETING_THRESHOLD_SECONDS`, consts.rs 15) the NPC calls `choose_target`, but not while `should_stop_pursuing` and the target is in aggro range (974). `choose_target` rewrites `selected_at` to now whenever it finds a target (1190-1196), so a retarget resets the escape clock. But `choose_target` only writes `agent.target` when `should_stop_pursuing || target.is_some()` (action_nodes.rs ~1189): for a stop-pursuing creature, a 10 s retarget that finds no detectable target sets `agent.target = None`, a second leash / lost-sight drop. `aggro_on` is first set inside `choose_target` (~1063) when a hostile attacker is found for an already-hostile case, which skips the warning (menace) phase.
- Target choice (`choose_target`, action_nodes.rs 1034-1198): candidates come from the spatial grid within `search_dist` (1052; `search_dist` = max(sight, listen) * multiplier, common agent.rs 470). Each candidate must pass `detects_other` (2374-2385): a 30 percent roll per call inside 5 units (2387-2389), or line of sight within sight distance with a FOV dot product above 0.15 (2332-2357). The winner is `min_by_key((hostile flag, squared distance x 100 as i32))` (1174-1179). `hostile = false` covers item pickup and downed allies to save (1119-1155), so those sort before any hostile target, even a closer one.
- Hit reaction (`target_if_attacked`, behavior_tree/mod.rs 274-330): an attacker that hit within `DAMAGE_MEMORY_DURATION` = 0.25 s (consts.rs 1, check 277) replaces the target if there is none or `is_more_dangerous_than_target` says so (299-305). That function's second clause can never be true (see section 6).
- Flee steering: `flee()` (action_nodes.rs 860-898) asks the chaser for a path to a point 50 units directly away from the target (884-888), and caps speed at 0.65 (868, 896).

## 2. Key functions

- `do_combat`: `/mnt/frankendom-donors/veloren-veloren/server/src/sys/agent/behavior_tree/mod.rs` 852-1009. Whole decision order (flee, dead, break-off, retarget, attack or menace).
- `stop_pursuing`, `should_continue_to_pursue`, `should_let_target_escape`: `/mnt/frankendom-donors/veloren-veloren/server/agent/src/util.rs` 66-103. The race and its two scores.
- `choose_target`: `/mnt/frankendom-donors/veloren-veloren/server/agent/src/action_nodes.rs` 1034-1198. Candidate search, sort key, write of `agent.target`.
- `is_more_dangerous_than_target`: `/mnt/frankendom-donors/veloren-veloren/server/agent/src/action_nodes.rs` 2242-2272. Switch rule for hits (defect, section 6).
- `Psyche` (per-species numbers): `/mnt/frankendom-donors/veloren-veloren/common/src/comp/agent.rs` 254-281 (struct) and the `From<&Body>` arms from 283.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and values |
|---|---|
| Two-score race: keep chasing when a pursue score beats a let-go score; both fall out of distances, health fractions and time | Let-go weight 0.005 (util.rs 102); pursue weight 100 (util.rs 92); aggression floor 0.25 on flee_health (util.rs 88) |
| Low flee_health means a braver NPC (more aggression) | flee_health examples (theirs, agent.rs): Danari 0.4 (288), Pig 0.5 (296), Boar 0.1 (299) |
| Aggro radius for humanoids | 20.0 (theirs, agent.rs 444); other bodies have no aggro radius (always aggressive once detected) |
| Flee for a fixed time, then give up and idle | 3.0 s (theirs, consts.rs 2); crawl multiplier 5.0 (behavior_tree 907) |
| Retarget every 10 s | 10.0 s (theirs, consts.rs 15) |
| Hit memory window | 0.25 s (theirs, consts.rs 1) |
| Target search over a spatial grid, nearest first within hostility class | search_dist = max(sight, listen) x multiplier (theirs, agent.rs 470); listen_dist default 30.0 (agent.rs 442) |
| Sense without sight | 5 units at 30 percent per call (theirs, action_nodes.rs 2388-2389) |
| FOV gate | dot product above 0.15 (theirs, action_nodes.rs 2357), about 81 degrees either side |

## 4. TypeScript sketch

simplified: keeps the donor's two-score race and its four constants, and fixes two things: the escape clock is an input the caller supplies as "seconds since the target last hit this NPC" (the donor passes "seconds since the target was selected"), and the health and distance divisions are floored (the donor divides by the raw fraction, so a zero gives Infinity). It omits the flee branch, the dead and invulnerable checks, the retarget timer, the aggro latch, the menace path and the awareness meter; the caller must run those in the donor order (flee, dead, break-off, retarget, attack). It also omits the patrol-origin 1.0 convention: the caller passes the anchor distance and must decide what "no anchor" means.

```ts
// Licence of donor: GPL-3.0. Clean-room sketch written from the described mechanism (score race and its constants), not a translation of the donor lines.
// clean-room

export interface LeashInputs {
  distToTargetSq: number;          // squared distance to the current target, metres
  distToAnchorSq: number;          // squared distance to the leash anchor (spawn/patrol point), metres
  ownHealthFrac: number;           // 0..1
  targetHealthFrac: number;        // 0..1
  secondsSinceLastHitByTarget: number; // FIX: donor passes seconds since target was selected
  fleeHealth: number;              // row field, 0..1, 0 = never flees
  aggroDist: number | null;        // row field, metres, null = always aggressive once detected
  sightDist: number;               // row field, metres
  shouldStopPursuing: boolean;     // row field; false = never breaks off (bosses/roamers)
}

// Engine constants (donor values; fixed rule of the engine, not per row).
const ESCAPE_K = 0.005;     // weight of the let-go score
const PURSUE_K = 100;       // weight of the keep-chasing score
const FLEE_FLOOR = 0.25;    // donor: aggression uses 1 / max(flee, 0.25)
const HEALTH_FLOOR = 0.01;  // FIX: donor divides by the raw health fraction, so 0 gives Infinity
const DIST_FLOOR_SQ = 1e-6; // FIX: guard against division by zero distance

export function shouldBreakOff(i: LeashInputs): boolean {
  if (!i.shouldStopPursuing) return false;

  const own = Math.max(i.ownHealthFrac, HEALTH_FLOOR);
  const tgt = Math.max(i.targetHealthFrac, HEALTH_FLOOR);
  const dist = Math.max(i.distToTargetSq, DIST_FLOOR_SQ);

  // Keep-chasing score: rises for low-flee (brave) rows, sight/aggro range, and falls with distance and target health.
  const aggression = (1 / Math.max(i.fleeHealth, FLEE_FLOOR)) * (i.aggroDist ?? i.sightDist) * i.sightDist;
  const pursue = (PURSUE_K * aggression) / (dist * tgt);

  // Let-go score: rises with distance from the anchor, time since the last hit, and falls as own health rises.
  const escape = (i.distToAnchorSq / own) * i.secondsSinceLastHitByTarget * ESCAPE_K;

  return escape > pursue;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 ai003-veloren-leash.ts` on the VPS, exit 0 (sketch file /tmp/ai003-veloren-leash.ts; local copy in the AI003 work folder).

## 5. Lands in

- TARGET `src/fight/ai.ts` (new function `shouldBreakOff`, called from the server fight step after the flee check and before the retarget and attack steps). It is server-only; the client never decides a break-off.
- Parity-checklist row 4 (fight loop: aggro, chase, leash). Row 2 (AI brain) is the wider home for the target choice; this note cites row 4 only.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: the leash runs in the server fight step, not in each client); server-verified kills n/a here.

## 6. Gaps and risks

- GPL-3.0: clean-room only. Shape and constants are described, not translated. The sketch was written from the mechanism.
- Defect 1, the escape clock (util.rs 102 with behavior_tree 964): the parameter is named "since last attacked" but the caller passes "since selected" (`read_data.time.0 - selected_at`). The fix in the sketch uses time since the target's last hit. The idea is kept.
- Defect 2, divide by zero (util.rs 92 and 102): both scores divide by a raw health fraction. The comment at common agent.rs 456-457 says the author hit this and skipped the function for the BloodmoonBat species (match arm 458). Fix: floor the fraction (sketch `HEALTH_FLOOR`) instead of skipping the function.
- Defect 3, inert hysteresis (action_nodes.rs 2259-2260 and 2269): both sides of the "closer by 0.8" test measure the same distance (target to candidate), so `d < d * 0.8` is always false and the second clause never fires. The comment (2253-2256) describes switching only when the candidate is clearly closer to the agent. My reading of the intent: compare the agent's distance to the candidate against its distance to the current target, times 0.8. Not run. Fix that way, and say so in the test.
- Gap against the rulings: the donor's "home" is the patrol origin and the value is a constant 1.0 when there is none (behavior_tree 873-876). Frankendom needs an explicit leash anchor per spawn (a zone row field), never a constant.
- Gap against the rulings: MAX_ATTACKERS = 3 is not in this mechanism. The break-off decides one NPC's chase; the cap on how many NPCs may attack one player still has to live in the engine.
- Gap against the rulings: the donor's threshold for "in aggro range" uses the target's squared distance, but the NPC also keeps `aggro_on` latched after it has left the range (892, no reset in do_combat). Frankendom must decide when aggro drops.
- Not read: the ability picker in `attack.rs` beyond its helper (6255-6303); the stuck-detector defect below was found in `path.rs`, not in this note's mechanism.
- Adjacent finding (not in this note's mechanism, reasoned from code, not run): the stuck test in `common/src/path.rs` 551-562 compares a squared distance in metres with a value in seconds to the fourth power. At a 30 Hz tick the threshold is about 5e-8 m^2 (radius about 0.2 mm), so the detector fires only when the NPC is almost exactly motionless. Fix: compare metres with expected travel (speed fraction x max walk speed x dt). This belongs in a separate pathing note.

## 7. As-data shape (PASS2)

- Donor table or file: no data table. The per-species numbers are Rust match arms in `common/src/comp/agent.rs` `impl From<&Body> for Psyche` (about 283-455). Each arm returns a literal.
- Row fields (name: type): `flee_health: f32` (0..1), `sight_dist: f32` (units), `listen_dist: f32` (units), `aggro_dist: Option<f32>` (units, None = always aggressive), `idle_wander_factor: f32` (ratio), `aggro_range_multiplier: f32` (ratio), `should_stop_pursuing: bool` (agent.rs 254-281).
- Engine constants (not per row): 0.005, 100, 0.25 floor, 10.0 s retarget (consts.rs 15), 3.0 s flee (consts.rs 2), 0.25 s damage memory (consts.rs 1).
- A new creature is one row: no. A new species needs a new match arm in Rust and a rebuild. Plugin bodies get `flee_health` from `body.flee_health()` (agent.rs 432), which is the only data-driven path in the file.
- Provenance per claim: all from `veloren-veloren` (GPL-3.0). Code paths and lines are in sections 1-3 and the receipts file. Shape only.

## 8. What they patched later

- CHANGELOG.md 690 (0.13.0 section, line 682 onward): "Hostile agent will now abort pursuing their target based on multiple metrics." This is the break-off race.
- CHANGELOG.md 679 (0.13.0): "Flee if attacked even if attacker is not close." The hit path for flee.
- CHANGELOG.md 697 (0.13.0): "Add FOV check for agents scanning for targets they are hostile to." The FOV gate in `detects_other`.
- CHANGELOG.md 862 (0.12.0 section, line 766 onward): "Agents can flee once again, and more appropriately." Flee was broken for a while before this.
- CHANGELOG.md 565 (0.15.0 section, line 499 onward): "Creatures flee less quickly when low on health." Flee speed/threshold tuning.
- Comment at common agent.rs 456-457: the break-off score "breaks when the health fraction is 0.0", so the BloodmoonBat species is set to never break off (match arm 458). This is the zero-division defect, handled by a skip instead of a fix.
- No git history in the box (no `.git`). CHANGELOG.md is the only history.

## 9. Rulings for Dom

1. Should break-off numbers (anchor radius, let-go weight, flee_health, aggro radius) be row fields with one engine formula for every creature, or should bosses keep their own formula? Recommendation: one formula, the four numbers as row fields, and a boolean "never breaks off" for bosses (`should_stop_pursuing` in the donor).
2. Should the let-go clock run from the target's last hit on this NPC or from when the NPC picked the target? Recommendation: last hit, because the donor's name says so and a clock from selection lets a lost fight reset every 10 s.
3. Should a downed ally or an item pickup outrank a closer hostile target, as the donor does? Recommendation: no for PvP (keep hostile first); allow the help-up priority only for NPC allies.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine; the break-off runs in the server fight step); rules 7-9 n/a

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Acceptance numbers had no target distance or health and the result flips on the pursue score: fixed with explicit fixture inputs, worked through the sketch formula (6000 vs 9, 375 vs 1080).
- Flee-branch detail (random flee point beyond 20 units) omitted: added.
- Missed: choose_target writes agent.target only when should_stop_pursuing || target found, so a 10 s retarget with no target drops the target (second leash drop); aggro_on first set inside choose_target: added.
Fixed 2026-10-12: acceptance inputs, retarget drop, flee detail. Sketch code unchanged.
