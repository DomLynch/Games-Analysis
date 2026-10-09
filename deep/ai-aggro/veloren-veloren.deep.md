# veloren-veloren (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/veloren-veloren/server/src/sys/agent/behavior_tree/mod.rs` | Licence: GPL-3 | Rust | symbol `target_if_attacked / BehaviorTree::hostile` at 274 (verified: `target_if_attacked` opens at 274; `BehaviorTree::hostile` is at 159 and `do_hostile_tree_if_hostile_and_aware` at 384; `update_target_awareness` at 789). Also opened this pass: `BehaviorTree::root` 84-96 and `target` 102-116, the `Awareness` type in `/mnt/frankendom-donors/veloren-veloren/common/src/comp/agent.rs` 662-721, the constants in `/mnt/frankendom-donors/veloren-veloren/server/agent/src/consts.rs`, and `is_more_dangerous_than_target` in `/mnt/frankendom-donors/veloren-veloren/server/agent/src/action_nodes.rs` 2242-2272.

## 1. Mechanism

- A behaviour tree runs per agent each tick. The root tree (84-96) reacts to immediate dangers (gliding, falling, fire), then runs `target_if_attacked`, then the inbox, then either the target tree (agent has a target) or the idle tree. The target tree (102-116) runs, in order: update last known position, drop a dead target, `update_target_awareness`, search the last known position if awareness is partial, the hostile branch if hostile and alert, then allies, pets, loot pickup and idle.
- `target_if_attacked` (274-335): if the agent took damage (negative health change) within `DAMAGE_MEMORY_DURATION` (0.25 s) and the attacker still exists: if the attacker is dead or invulnerable (safe zone), clear the target. Otherwise: if there is no target yet, play an angry utterance; add 1.0 to awareness (which clamps to the maximum, so one hit makes the agent alert); and take the attacker as target if there is none, or if `is_more_dangerous_than_target` says so. The new target is marked hostile with `aggro_on` set, its selection time and last known position.
- `is_more_dangerous_than_target` (action_nodes.rs 2242-2272): returns true if the current target has not triggered aggro (`!target.aggro_on`), or if the attacker is closer by a proportional threshold (`FUZZY_DIST_COMPARISON` 0.8) and hostile towards the agent. As written, the closer test (2259-2260) compares one distance (target to attacker position) with 0.8 times the same distance, so it cannot be true for a positive distance; in effect a damage switch only happens when the current target was not already aggro-flagged.
- `Awareness` (agent.rs 662-721) is a level clamped to 0 to 1 with a latch: `change_by` clamps the level, sets `reached` when the level hits 1.0 (alert) and clears it when the state falls to unaware (the level at or below the "low" band start 0.1; exact edge depends on `is_between`, not read). The state bands are low 0.1, medium 0.3, high 0.6, alert 1.0.
- `update_target_awareness` (789-825): with a target that is visible, awareness rises by 1.75 x dt. With a target sensed nearby, it rises by a flat 0.25 per tick (not scaled by dt). Otherwise (and when there is no target) it changes by `STD_AWARENESS_DECAY_RATE` (-0.05) x dt, about 20 s from full to zero. If the state is unaware and the agent is not trading, the target is cleared.
- `do_hostile_tree_if_hostile_and_aware` (384-395): runs the hostile branch (`hostile`: heal self if hurt, hurt utterance, combat; 159-163) only if there is a hostile target and the awareness latch `reached()` is set. Because the latch only clears at unaware, an agent stays in the hostile branch while its awareness decays from 1.0 down to the unaware band.
- Inputs: health change history, the entity list, visibility, distance. Outputs: target, awareness, utterances. Tick: per agent per server tick.

## 2. Key functions

- `target_if_attacked`: `mod.rs` 274-335. Damage-driven target switch and awareness bump.
- `update_target_awareness`: `mod.rs` 789-825. Awareness meter: visible, near, decay, clear on unaware.
- `do_hostile_tree_if_hostile_and_aware`: `mod.rs` 384-395. Gate on the alert latch.
- `BehaviorTree::hostile`: `mod.rs` 159-163 (tree is three nodes: heal, utterance, combat; the combat node body is not read).
- `Awareness`: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/agent.rs` 662-721. Clamped level with an alert latch.
- `is_more_dangerous_than_target`: `/mnt/frankendom-donors/veloren-veloren/server/agent/src/action_nodes.rs` 2242-2272. Switch rule.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Awareness meter that rises when seen, slower when sensed, decays otherwise, and clears the target when unaware; a latch keeps the agent alert until fully unaware | Visible 1.75 per second; sensed 0.25 per tick; decay -0.05 per second; bands 0.1 / 0.3 / 0.6 / 1.0 (theirs) |
| Damage switches the target only when the current one is not aggro-flagged (the proportional test is dead code as written) | Test (theirs); factor 0.8 (theirs, ineffective) |
| A hit adds a fixed bump to awareness (full alert) | Bump 1.0 (theirs) |
| Hostile branch runs only when the latch is set | Latch at level 1.0 (theirs) |
| Damage memory window | 0.25 s (theirs, `consts.rs` line 1) |

## 4. TypeScript sketch

simplified: the root tree order (gliding, fall, fire, inbox), dead / invulnerable attacker clearing, the angry utterance, the last-known-position search and the whole hostile node (heal, utterance, combat) are omitted; `moreDangerous` is passed in; the 0.25 s damage-memory window is the caller's job; the trading exception and the `is_between` edge of the unaware band are simplified to level <= 0.1.
```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Target { id: number; hostile: boolean; aggroOn: boolean; }
interface Agent { level: number; reached: boolean; target: Target | null; trading: boolean; }

const ALERT = 1.0, UNAWARE_AT = 0.1;

// Clamp to 0..1; latch alert when full, release when unaware.
function changeBy(a: Agent, amount: number): void {
  a.level = Math.max(0, Math.min(ALERT, a.level + amount));
  if (a.level >= ALERT) a.reached = true;
  else if (a.level <= UNAWARE_AT) a.reached = false;
}

// A recent hit: full alert bump; the attacker becomes the target when there is none or it counts as more dangerous.
function onHit(a: Agent, attacker: number, moreDangerous: (attacker: number, current: Target) => boolean): void {
  changeBy(a, 1.0);
  if (a.target === null || moreDangerous(attacker, a.target)) {
    a.target = { id: attacker, hostile: true, aggroOn: true };
  }
}

// Awareness per tick: fast when the target is seen, a flat step when sensed nearby, otherwise decay; clear the target when unaware.
function updateAwareness(a: Agent, visible: boolean, sensedNear: boolean, dt: number, decayPerSecond = -0.05): void {
  if (a.target !== null && visible) changeBy(a, 1.75 * dt);
  else if (a.target !== null && sensedNear) changeBy(a, 0.25);
  else changeBy(a, decayPerSecond * dt);
  if (a.level <= UNAWARE_AT && !a.trading) a.target = null;
}

// The hostile branch runs only when there is a hostile target and the alert latch is set.
function hostileBranchRuns(a: Agent): boolean {
  return a.target !== null && a.target.hostile && a.reached;
}
```

## 5. Lands in

- TARGET `src/fight/world.ts` (exists today: threat list, `GIVE_UP_UNSEEN_S`, `SIGHT_M` hysteresis over `AGGRO_M`, `MAX_ATTACKERS` 3), checklist row 4 (fight loop: aggro, leash). The new idea here is the awareness latch (a creature becomes committed after a hit or sustained sight and stays so while a slow decay runs down), which is a second form of the existing sight hysteresis; compare before adding. A damage-switch rule (switch only when the current target is not aggro-flagged) is a candidate tie-break beside the existing most-threat choice.
- TARGET `src/fight/ai.ts` (today: `src/ai.ts`, moving), checklist row 2 (AI brain): committing to a fight at a threshold is brain-side only if a profile needs a visible wind-up before it acts (catalogue AI knob, row 21).
- Reuse tag: rewrite-from-idea
- Brief rule served: 5 (many-on-one: hate list and target selection in the engine); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- Server-verified kills: the meter is a per-tick float quantity driven by wall-clock `dt`. Frankendom's server steps at a fixed 1/60 accumulator and must replay the meter bit-exact (integer or the `detmath` rules in `src/detmath.ts`); do not use the seconds values directly. Note also that the sensed branch is not scaled by dt in the donor, so it depends on tick rate.
- MAX_ATTACKERS = 3: the donor's switch rule is one agent choosing among attackers; it does not cap how many agents target one player. The cap and the hold ring stay in `src/fight/world.ts`.
- No hidden numbers: the 1.75 / 0.25 / -0.05 rates and the band edges are tuned constants; if used, each is a catalogue field (row 21), not a code constant. The donor's dead 0.8 factor should not be copied.
- Zones as data: visibility and sensing are server-world functions; Zone 1 has `SIGHT_M` 14 m, a distance test, not line of sight. Any sight rule must be a zone-data choice.
- One engine: the awareness state belongs to the shared creature state, not to a client loop; the Pit client must not gain authority over target choice.
