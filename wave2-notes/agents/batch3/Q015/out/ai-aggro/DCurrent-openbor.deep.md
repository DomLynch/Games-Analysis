# DCurrent-openbor (ai-aggro, cell 1)

Donor: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` | Licence: BSD-3-Clause (3-clause BSD, read: `/mnt/frankendom-donors/DCurrent-openbor/LICENSE` lines 5-11) | C | symbol `normal_find_target`

Checked: Read in full: `normal_find_target` (35497-35600), `common_try_chase` (41525-41636), `check_attack_chance` (39618-39651), `recheck_nextattack` (39655-39669), `common_try_normalattack` (39673-39722). Read the decision path: `common_think` (43827-43886), `check_ai` (32558-32580), `common_attack` (40760-40775), `normal_attack` (39967-39985), `common_move` target/chase/stall parts (43013-43440), `common_attack_finish` (40650-40690), the hit reset (31760-31775), `set_opponent` (30302-30326). Confidence high on target pick, chase point and attack gate. Not read: `normal_prepare` (35775), `common_try_wander`, `common_try_avoid`, `checkpathblocked`, `count_ents`, `rand32`/`randf`, the bodies of `check_range_target_*`, the body of `faction_check_is_hostile` beyond its top (48348-48390), and where `_time` advances. Scope: the AI is a per-entity think on an engine clock. It is not a camera donor, so `camera_scope` does not apply.

## 1. Mechanism

- Each entity runs `check_ai` when its `nextthink` is due. `check_ai` runs `think` (set to `common_think` at 9197, 27539, 27663, 27683) and sets `nextthink = _time + THINK_SPEED` (32575). `THINK_SPEED` is 2 (openbor.h:81; tab-formatted line, no receipt written).
- `common_think` (43827) runs in this order: recall (followers only), rise attack, grabbed escape, grab, escape, busy. If none of those returns, it runs `common_attack` (43875), then ducking (43881), then `common_move` (43886). The attack decision comes before movement in every think.
- Target pick, `normal_find_target` (35497). Walks `ent_list` in index order. Skips: self, not hostile (`faction_check_is_hostile`, 35541), out of the animation range when an animation is given, dead, a distance `|dx|+|dz|` outside the open window (0, 9999) (35569), and stealth hide above perception (35575). Keeps the first survivor. Replaces the kept pick with a later one when either (a) the kept pick is not vulnerable on its current frame, or is intangible (35582), or (b) the candidate is in front of self and nearer than the kept pick (35584). "In front" means the target is on the side the entity faces. Result: rule (b) does not check the candidate's vulnerability, so a nearer candidate in front replaces a vulnerable pick. A vulnerable pick is kept only while no nearer candidate in front appears. Among candidates all behind self, rule (b) never fires, so the first scanned vulnerable one is kept.
- Chase point, `common_try_chase` (41525). Range comes from `pick_random_attack(NULL, 0)`, which draws a random attack and uses the average of that animation's x range (41540). The range is clamped to hRes/4 (41550) and falls back to `grabdistance` when no attack is valid. The stop point is on the entity's own side: `target.x + range - 1` when self is right of target (41564), else `target.x - range + 1` (41568). Walk speed is `speed.x`. It runs (`runspeed`) when the x gap is over 150 and a run animation exists (41572). Z: `destz = target.z`; walk speed `speed.x / 2` (41619), or `runspeed / 2` when the z gap is over 100 and the z run flags and run animation allow it (41611-41613).
- Re-acquire each move. `common_move` (43013) keeps `custom_target` if it exists, otherwise calls `normal_find_target(-1, 0)` (43086). It faces an item if one is in reach, otherwise the target, unless the entity is running or has NO_FLIP (43103-43109). Chase is added to the pattern automatically only for `SUBTYPE_CHASE` or an NPC with a parent (43193). Other entities chase only when their model `aimove` includes the chase flags. When the entity comes to a stop after moving, it waits `(game_speed - aggression) / 2`, floor `game_speed / 5` (43426-43428).
- Attack decision, `common_attack` (40766). Returns 0 when `_time / THINK_SPEED % 4 == 0`, which is 2 of every 8 time units (the `_time` step is not read), so a quarter of the windows are skipped. Otherwise it calls `normal_attack` (39967): duck attack, grab, upper, block, run attack, `common_try_normalattack`, jump attack. The first that returns 1 wins.
- `common_try_normalattack` (39673): (1) `target = normal_find_target(-1, 0)` (39675). (2) `recheck_nextattack(target)` (39682), then the same call again in the gate (39684). (3) Return 0 if `nextattack > _time`. (4) Return 0 if the target is not vulnerable and is dropping, attacking, or rising (39689). (5) If `pick_random_attack(target, 1) >= 0` (39694): if a combo step is live, `stalltime = _time + 1` (39698). Otherwise roll `check_attack_chance` (39702). A refusal sets `nextattack = _time + randf(attackthrottletime)` (39704) and returns 0. An accept sets `stalltime = _time + randf(max(1, game_speed*3/4 - aggression))` (39709). Then `takeaction = normal_prepare` and `attacking = ATTACKING_PREPARED` (39713-39717).
- `recheck_nextattack` (39655): if the target is blocking, `nextattack = 0`. Else if the target is attacking and `nextattack > 4`, subtract 4. Else if the target is jumping and `nextattack > 16`, subtract 16. So a target that is busy attacking or jumping gives the entity its cooldown back, faster while the target is in those states.
- `check_attack_chance` (39618): `chance1` is a distance term from the entity to its destination, scaled by `move_noatk_factor` (3.0, 279) (39628). `chance2` is a crowd term: `(count_ents(type) - 1) * group_noatk_factor` (0.01, 280) (39629). Chance is `(1-chance1)*(1-chance2)` (39631), clamped to [min, max] (39633-39639), times `(1 - attackthrottle)` (39642), times `(1 - factor)` when off screen by more than 10 (39644-39647), where the factor is the model's `offscreen_noatk_factor` if set, else the global 0.5 (284, 39646-39647). Roll: `randf(1) <= chance` (39650).
- The clamp matters. Normal, upper and duck attacks pass `min == max == 1 - min_noatk_chance` (39702, 39884, 39943). Default `min_noatk_chance` is 0.0 (282), so the clamp forces chance to 1 and the distance and crowd terms have no effect. Only jump attacks pass a real window (0.05-0.4 at 39758, 0.05-0.5 at 39791). For those, the distance and crowd terms are live.
- Hit reaction. When a hit lands on a target, `target->next_hit_time` is set (31773) and `target->nextattack = 0` (31774, "reset this, make it easier to fight back"). A victim can answer at once.
- After an attack. `common_attack_finish` (40650): a player just goes idle. For an AI entity with an opponent within 80 and `(rand32() & 3)` non-zero (40673), it sets `destx` to self +40 capped at target +80 when self is right of target, or self -40 floored at target -80 when left (40676). It walks there. The `common_runoff` takeaction is commented out (40675), so there is no separate flee state.
- Opponent pairing. `set_opponent` (30302) stores the real opponent on both entities (30323). It is also called from other places (38992, 39275, 40221, 44756, 49333, 49410; contexts not read).

## 2. Key functions

- `normal_find_target`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 35497-35600. Target pick. Read in full.
- `common_try_chase`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 41525-41636. Chase point, run choice, z speed. Read in full.
- `common_move` (target and chase branch only): `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 43013-43440. Re-acquire, facing, chase flags, stall. Read the target, chase and stall parts only; the remaining pattern branches are not read.
- `common_try_normalattack`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 39673-39722. Attack gate. Read in full.
- `recheck_nextattack` and `check_attack_chance`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 39655-39669 and 39618-39651. Cooldown relief and the throttle roll. Read in full.
- `common_think` and `common_attack`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 43827-43886 and 40760-40775. Decision order and the one-in-four gate. Read in full.
- `common_attack_finish` (the step-back branch only): `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 40650-40690. Read in full up to the step-back branch.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Target: nearest hostile in front wins; a non-vulnerable pick is replaced by any later candidate | Window (0, 9999) (theirs, 35569); stealth from model (35575) |
| Chase point stands `range - 1` from the target on the attacker's side | Range is the average x range of a random attack, capped at hRes/4 (theirs, 41550); fallback `grabdistance` |
| Run when the gap is over a threshold | Threshold 150 (theirs, 41572); z speed is `speed.x / 2` (theirs, 41619) |
| Attack cooldown: set on refusal, cleared when the target blocks, cut when the target is busy | Cut 4 when target attacking above 4 (theirs, 39663); cut 16 when jumping above 16 (theirs, 39667); 0 on block (theirs, 39659) |
| Attack wait: uniform random, shorter for more aggressive units | `game_speed*3/4 - aggression`, floor 1 (theirs, 39709); `game_speed` 200 (theirs, openbor.h:80) |
| Throttle: a share of attacks is refused and sets a timed cooldown | Throttle and throttle time are per model (theirs, openbor.h:3759-3760) |
| Off-screen attacks are damped | Factor per model, else 0.5 (theirs, openbor.c:284); off-screen margin 10 (theirs, 39644) |
| Crowd damping: fewer attacks as more of the same type exist | 0.01 per extra same-type entity (theirs, 280); live only for jump attacks (39758, 39791), dead for normal, upper and duck attacks (clamp) |
| Victim cooldown reset on hit | None (the reset) |
| Step back after attack to a spacing of 80 | Step 40, spacing 80 (theirs, 40676); chance 3 in 4 (theirs, 40673) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's target pick (sequential replacement rules, nearest in front), chase stop point, cooldown relief, attack gate with refusal and wait, victim reset and step back. It omits: the z-axis distance term in the target pick (it uses x only), stealth and animation range filters, the dead and rise checks in the gate, the rand32/randf definitions (rand is a plain callback here), the combo-step stall, the jump and duck and upper attacks, the chase-pattern random choice, and the run animation check. It orders the gate as relief then wait, as the donor does, but calls relief once where the donor calls it twice (39682 and 39684). Crowd and distance terms are left out on purpose because the donor's clamp removes them for normal attacks.

```ts
// Licence: BSD-3-Clause (OpenBOR LICENSE, read). Clean-room shape written from the mechanism; not a line-by-line translation.
// Times are in the donor's _time units. GAME_SPEED = 200 (donor GAME_SPEED_DEFAULT).
const GAME_SPEED = 200;
const RUN_GAP = 150;        // run when the gap to the chase point is larger than this
const BACK_OFF_GAP = 80;    // step back after an attack only if the opponent is closer than this
const BACK_OFF_STEP = 40;
const OFFSCREEN_FACTOR = 0.5;

interface Unit {
  id: number;
  x: number;
  facingRight: boolean;
  alive: boolean;
  vulnerable: boolean;      // vulnerable on its current animation frame
  intangible: boolean;
  attacking: boolean;
  jumping: boolean;
  blocking: boolean;
  hostileTo: (other: Unit) => boolean;
  throttle: number;         // attackthrottle, 0..1: share of attacks refused
  throttleTicks: number;    // attackthrottletime
  aggression: number;       // lowers the wait before a strike
  nextAttack: number;       // absolute tick before which no new attack is started
  stallUntil: number;       // absolute tick before which the unit holds position
}

// Target pick: nearest hostile in front. A kept pick that is non-vulnerable or intangible is replaced by any later candidate; a candidate in front and nearer replaces it too.
function pickTarget(self: Unit, units: Unit[]): Unit | null {
  let best: Unit | null = null;
  let bestD = 0;
  for (const u of units) {
    if (u === self || !u.alive || !self.hostileTo(u)) continue;
    const d = Math.abs(u.x - self.x);     // donor adds the z difference too (omitted)
    if (d <= 0 || d >= 9999) continue;
    const inFront = (self.x < u.x) === self.facingRight;
    if (best === null || !best.vulnerable || best.intangible || (inFront && d < bestD)) {
      best = u;
      bestD = d;
    }
  }
  return best;
}

// Chase point: stand range-1 away from the target on the attacker's own side.
function chaseStopX(self: Unit, target: Unit, range: number): number {
  return self.x > target.x ? target.x + range - 1 : target.x - range + 1;
}

function shouldRun(self: Unit, destX: number): boolean {
  return Math.abs(destX - self.x) > RUN_GAP;
}

// Victim side: a hit clears the victim's own attack cooldown so it can answer.
function onHit(victim: Unit): void {
  victim.nextAttack = 0;
}

// Cooldown relief, driven by what the target is doing (donor recheck_nextattack).
function relieveCooldown(self: Unit, target: Unit): void {
  if (target.blocking) self.nextAttack = 0;
  else if (target.attacking && self.nextAttack > 4) self.nextAttack -= 4;
  else if (target.jumping && self.nextAttack > 16) self.nextAttack -= 16;
}

// Attack gate. Returns true when a strike is started (the caller runs the attack).
function tryStrike(self: Unit, target: Unit, now: number, rand: () => number, offscreen: boolean): boolean {
  relieveCooldown(self, target);      // simplified: the donor calls this twice (lines 39682 and 39684)
  if (self.nextAttack > now) return false;
  if (!target.vulnerable && target.attacking) return false;   // donor also checks drop and rise

  // Normal attacks pass min == max, so the donor clamp fixes the distance and crowd terms at 1.
  let chance = 1;
  chance *= 1 - self.throttle;
  if (offscreen) chance *= 1 - OFFSCREEN_FACTOR;
  if (rand() > chance) {
    self.nextAttack = now + rand() * self.throttleTicks;
    return false;
  }
  self.stallUntil = now + Math.trunc(rand() * Math.max(1, (GAME_SPEED * 3) / 4 - self.aggression));
  return true;
}

// After an attack: usually step back toward a spacing of BACK_OFF_GAP from the opponent.
function backOffDest(self: Unit, opponent: Unit, rand: () => number): number | null {
  if (Math.abs(self.x - opponent.x) >= BACK_OFF_GAP || rand() < 0.25) return null;   // donor uses rand32() & 3
  return self.x > opponent.x
    ? Math.min(self.x + BACK_OFF_STEP, opponent.x + BACK_OFF_GAP)
    : Math.max(self.x - BACK_OFF_STEP, opponent.x - BACK_OFF_GAP);
}
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (new module, engine AI decision: pick target, chase point, attack gate, step back). Parity-checklist row 2 (AI brain).
- Related row, not the target: row 4 (fight loop: aggro, chase, leash) takes the chase point and the leash. Row 18 / post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget" covers the think schedule, which this donor sets per entity with `nextthink` and `THINK_SPEED` (32560-32575) and which has no per-tick budget in `check_ai` (read).
- today: not checked (this reader had no Frankendom checkout; only donor code was in reach).
- Reuse tag: adapt-allowed (BSD-3-Clause: code may be adapted; this sketch is written from the mechanism)
- Brief rule served: 1 (one engine: the AI decision lives in one module); rules 7-9 n/a

Best transferable idea: a victim's hit clears its own attack cooldown, and an attacker's cooldown is cleared when its target blocks and cut while its target attacks or jumps, so fights stay fast without a separate aggro table.

Decision (proposed): adapt - take the target rule (nearest in front; a non-vulnerable pick is replaced by any later candidate) and the cooldown relief and victim reset; reject the crowd term as the donor wrote it (dead for normal, upper and duck attacks), because MAX_ATTACKERS = 3 is the Frankendom pile-on rule and must be enforced in the engine, not as a donor chance term.
Acceptance: a server test with one player and five hostile enemies at x = 100..300 asserts the picked target is the nearest enemy in front, that a non-vulnerable pick is replaced by a later candidate, that a landed hit sets the victim's nextAttack to 0 on that tick, and that no more than 3 enemies hold ATTACKING at once.

## 6. Gaps and risks

- Pile-on: OpenBOR has no attacker cap. The only crowd damping is the `count_ents` term, and it is dead for normal, upper and duck attacks because of the clamp (39702, 39884, 39943). It is live only for jump attacks (39758, 39791). Frankendom's MAX_ATTACKERS = 3 must be enforced in `src/fight/ai.ts` and tested. Do not port the donor's crowd term as the cap.
- One engine and server-verified kills: the donor runs AI per entity from the client loop (`check_ai`, `nextthink`). Nothing in the read code shows the server deciding targets. Frankendom's server must own the AI tick (row 18 / post-K item 3 sub-line), and the client must only draw.
- Zones as data: throttle, throttle time, aggression and the off-screen factor are per character in the donor (openbor.h:3616, 3747, 3759-3760). Frankendom should keep them in the catalogue, and any per-zone pressure in zone data (row 23 for population).
- One ledger: the donor writes the victim's cooldown from the attacker's hit path (31773-31774). In Frankendom only the engine's hit step may write it.
- Determinism: target pick depends on `ent_list` index order and on a sequential replacement rule. Two clients or a replay would pick differently if the order differs. Frankendom must sort candidates by a stable id before the pick. The donor's random source (rand32, randf) was not read; the server needs a seeded RNG.
- Donor quirk, not copied: `recheck_nextattack` is called twice per attempt (39682 and 39684), so a target that is attacking cuts the cooldown by up to 8 per attempt, not 4. The sketch calls it once. Frankendom tests should fix one call.
- Donor quirk, not copied: `common_try_chase` calls `pick_random_attack(NULL, 0)` (41540) to get a range, which draws a random attack as a side effect. Frankendom should take the chase range from data.
- Dead code: the `common_runoff` flee state is commented out (40675). Retreat is only the step-back in `common_attack_finish`. The flee pattern is not a donor feature to rely on.
- The victim cooldown reset and the attacker's cooldown relief only apply through the donor's hit path (31760-31775) and the combat decision. Frankendom's duel step (row 1) must call the same reset.
- Not read: `normal_prepare`, `common_try_wander`, `common_try_avoid`, `checkpathblocked`, `count_ents`, rand32/randf, `check_range_target_*` bodies, and most of `faction_check_is_hostile` (48348). The sketch does not claim anything about those.
