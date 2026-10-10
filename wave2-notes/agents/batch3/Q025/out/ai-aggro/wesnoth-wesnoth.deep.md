# wesnoth-wesnoth (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth/src/ai/default/attack.cpp` | Licence: GPL-2.0-or-later (per attack.cpp header: version 2 or any later version; COPYING is GPL v2) | C++ | symbol `attack_analysis::rating`

Checked: `attack_analysis::rating` (attack.cpp 268-331) read in full. Also read: `attack_analysis::analyze` (42 to before 255, read through the restore loop at 250-251), `attack_close` (255-265), `combat_phase::evaluate` (ca.cpp 163-234; the analysis fetch at 171, the choice loop from 191 to 221, the commit at 230-234), `combat_phase::execute` (ca.cpp 238-262), `aspect_attacks_base::analyze_targets` (aspect_attacks.cpp 74-122), `do_attack_analysis` (aspect_attacks.cpp 125-150, plus the recursion at 316-321), defaults in data/ai/utils/default_config.cfg (44, 58, 60), and the Lua caller `impl_attack_rating` (src/ai/lua/core.cpp 528-536). NOT read: `battle_context` (the combat simulator that produces chance_to_kill, the hp distributions and the damage statistics), `power_projection`, `best_defensive_position`, and the candidate-action loop that calls `evaluate()` (so the per-turn timing is not described). Confidence: high on the rating formula and the choice order (both read in full); the meaning of the simulator inputs is taken from how they are used, not from their computation. Depth: full for the choice mechanism. Camera: not applicable (ai-aggro cell).

Best transferable idea: score every (target, attacker-set) option as chance to kill times target value, minus expected own loss weighted by (1 - aggression), divided by the resources spent, and engage only when the best score is above zero.

Decision (proposed): adapt - the one-scalar score with a single aggression knob and an engage-only-above-zero gate fits the engine's many-on-one target choice, but Frankendom must supply its own chance-to-kill and expected-loss estimator from the duel step (row 1) and cap attackers at 3, not copy Wesnoth's turn-based simulation.

Acceptance: server test: one hero, three creatures in reach, aggression 0.4. The test asserts the creature the score ranks highest is the one that attacks, that no more than 3 creatures are assigned to one target, and that when every option scores at or below zero no creature engages.

## 1. Mechanism

- Target enumeration (run when the attacks aspect is evaluated, before any rating; the caller that triggers it was not read). `analyze_targets` loops over every unit on the map; for each enemy that is not incapacitated, not invisible and allowed, it runs `do_attack_analysis` on that enemy (aspect_attacks.cpp 85, 104-118). `do_attack_analysis` adds one of our units at a time to a set of attackers, using a free tile next to the target, and analyses every set it builds, at each recursion level (316-321). The recursion stops at 5 movements (142-143). Every set built, of size 1 to 5, is one `attack_analysis` entry.
- Analysis of one option (`analyze`, attack.cpp 42-251). Inputs are read from the unit map: `target_value` = the target's cost, grown by its experience fraction (63-65); `prob_died` per attacker (159); `avg_losses += cost * prob_died` (168); `avg_damage_taken` (226); `chance_to_kill` is `first_chance_kill` when the defender would advance (239), otherwise the defender's final kill probability (243). The simulator that makes these probabilities (battle_context) is not read.
- Rating (`rating`, attack.cpp 268-331), in this order:
  1. Leader overrides: if `leader_threat`, aggression := 1.0 (270-271); if `uses_leader`, aggression := leader aggression (275). The later line wins.
  2. Base value: `chance_to_kill * target_value - avg_losses * (1 - aggression)` (278).
  3. Exposure, only when the attackers would leave better terrain: `exposure = exposure_mod * resources_used * (terrain_quality - alternative_terrain_quality) * vulnerability / max(0.01, support)`, with `exposure_mod = 2.0` for a leader and the caution aspect otherwise (280-287); `value -= exposure * (1 - aggression)` (290).
  4. Damage term: `value += ((target_starting_damage/3 + avg_damage_inflicted) - (1 - aggression) * avg_damage_taken) / 10` (294). This is the "prefer already damaged targets, prefer damage dealt" term.
  5. Sanity veto (the block runs unless the first attacker is boxed in and either has no support or takes no average damage): return -1 when `vulnerability > 50`, `vulnerability > 2 * support`, `chance_to_kill < 0.02`, `aggression < 0.75`, and the target is not near a recent attack (304-308; `attack_close` is distance < 4 to a recent attack, 255-265).
  6. Support scaling, not for leader threats: `value *= support / (vulnerability * terrain_quality)` when vulnerability and terrain quality are positive and support is non-zero (311-312).
  7. Cost normalisation: `value /= resources_used/2 + (resources_used/2) * terrain_quality` (315).
  8. Leader threat: `value *= 5` (317-318). Returns value (330).
- Selection (`combat_phase::evaluate`, ca.cpp 163-234). Start at -1000 (168). For every analysis from `get_attacks()` (171; skipping some by a position budget `skip_num`, 189-195), rate with the side aggression (214) and keep the strict maximum (218). Commit only if the best rating is above zero (230); else the phase returns BAD_SCORE (234).
- Execution (`combat_phase::execute`, ca.cpp 238-262). Only `movements[0]` is used: its attacker moves to its target tile (241-246), then attacks the chosen target from there (253). The rest of the set is not moved; the next evaluation re-plans.
- Aggression knob. Side aggression default 0.4 (default_config.cfg 44), so losses weigh 0.6. Caution 0.25 (58) feeds only the exposure term. Leader aggression -4.0 (60) weighs the leader's losses 5.0, which makes a leader very loss-averse.
- The Lua API exposes the same function: `impl_attack_rating` reads `roc.get_aggression()` (core.cpp 533) and calls the same `rating` (534). So a Lua aspect and the C++ choice loop see identical numbers. Callers of `rating` under src/ (grep): ca.cpp:214 and core.cpp:534, both read.

## 2. Key functions

- `attack_analysis::rating`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/ai/default/attack.cpp` 268-331. The score and the veto.
- `attack_analysis::analyze`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/ai/default/attack.cpp` 42-251 (through the restore loop). Produces the inputs. Read in full, including the battle_context construction at 120-140; the battle_context internals themselves are not read.
- `combat_phase::evaluate`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/ai/default/ca.cpp` 163-234. Choice loop and commit gate.
- `combat_phase::execute`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/ai/default/ca.cpp` 238-262. First-attacker-only move and strike.
- `aspect_attacks_base::analyze_targets` and `do_attack_analysis`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/ai/default/aspect_attacks.cpp` 74-122 and 125-150, 316-321. Target enumeration and the 5-attacker cap.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Score = chance to kill x target value, minus expected own loss x (1 - aggression) | Aggression default 0.4, so loss weight 0.6 (theirs, default_config.cfg 44) |
| One knob sets how much a side fears losing its own units | Leader aggression -4.0, loss weight 5.0 (theirs, default_config.cfg 60) |
| A "boxed in" override forces aggression to 1.0 for threats to a leader | 1.0 (theirs, attack.cpp 271) and a x5 value multiplier (theirs, 318) |
| Veto: do not throw units away when the kill chance is tiny and we are exposed | Vulnerability > 50, > 2 x support, kill chance < 0.02, aggression < 0.75 (theirs, attack.cpp 304-306) |
| Divide value by resources committed, so cheap options are not favoured | Divisor resources_used (theirs, attack.cpp 315) |
| Engage only if the best score is above zero | Threshold 0 (theirs, ca.cpp 230) |
| Attacker set size cap | 5 (theirs, aspect_attacks.cpp 142); Frankendom ruling is 3 |
| Target value grows with the target's experience | value x (1 + xp / max xp) (theirs, attack.cpp 63-65) |

## 4. TypeScript sketch

simplified: keeps the donor's order (base value, exposure, damage term, sanity veto, support scaling, resource divide, leader x5), the leader aggression overrides, the strict-maximum choice and the commit-only-above-zero rule, and the first-attacker-only commit. It omits how chanceToKill, expectedLoss, damage and exposure are simulated (here they are inputs), the surrounded and terrain-quality bookkeeping, poison, village and XP-advance credit, the position budget (skip_num), and the enumeration of attacker sets. It caps attackers at 3 (Frankendom), not 5.

```ts
// Licence of donor: GPL-2.0-or-later. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface AttackOption {
  targetId: string;
  attackers: string[];          // ordered; attackers[0] moves and strikes first
  surrounded: boolean;          // the first attacker is boxed in
  targetValue: number;          // cost of the target, grown by its experience fraction
  chanceToKill: number;         // 0..1
  expectedLoss: number;         // sum of attacker cost x probability that attacker dies
  damageDealt: number;          // expected hp removed from the target
  damageTaken: number;          // expected hp our attackers lose
  targetStartingDamage: number; // hp the target already lacks
  resourcesUsed: number;        // sum of attacker costs
  exposure: number;             // precomputed terrain exposure (0 when not applicable)
  vulnerability: number;        // enemy power that can reach our tiles
  support: number;              // our power on those tiles
  terrainQuality: number;       // 0..1
  leaderThreat: boolean;        // target stands next to an enemy leader
  usesLeader: boolean;          // the attacking set includes our leader
}

const MAX_ATTACKERS = 3;        // Frankendom ruling (the donor enumerates up to 5)
const SIDE_AGGRESSION = 0.4;    // zone data default; donor default_config aggression
const LEADER_AGGRESSION = -4.0; // zone data default; donor default_config leader_aggression

function effectiveAggression(o: AttackOption, side: number, leader: number): number {
  let a = side;
  if (o.leaderThreat) a = 1.0;
  if (o.usesLeader) a = leader;
  return a;
}

// Returns a rating for one option. Negative means "veto" (the donor returns -1 for the sanity check).
function rate(o: AttackOption, aggression: number): number {
  const lossWeight = 1.0 - aggression;
  let value = o.chanceToKill * o.targetValue - o.expectedLoss * lossWeight;
  value -= o.exposure * lossWeight;
  value += ((o.targetStartingDamage / 3 + o.damageDealt) - lossWeight * o.damageTaken) / 10.0;

  if (!o.surrounded || (o.support !== 0 && o.damageTaken !== 0)) {
    if (o.vulnerability > 50.0 && o.vulnerability > o.support * 2.0 &&
        o.chanceToKill < 0.02 && aggression < 0.75) {
      return -1.0;
    }
  }
  if (!o.leaderThreat && o.vulnerability * o.terrainQuality > 0.0 && o.support !== 0) {
    value *= o.support / (o.vulnerability * o.terrainQuality);
  }
  value /= (o.resourcesUsed / 2) + (o.resourcesUsed / 2) * o.terrainQuality;
  if (o.leaderThreat) value *= 5.0;
  return value;
}

// Pick the best option over all candidates; commit only if its rating is above zero.
function choose(options: AttackOption[], side = SIDE_AGGRESSION, leader = LEADER_AGGRESSION):
    { mover: string; targetId: string; rating: number } | null {
  let best: AttackOption | null = null;
  let bestRating = -1000;
  for (const o of options) {
    if (o.attackers.length === 0 || o.attackers.length > MAX_ATTACKERS) continue;
    const r = rate(o, effectiveAggression(o, side, leader));
    if (r > bestRating) { best = o; bestRating = r; }
  }
  if (best === null || bestRating <= 0) return null;
  // Only the first attacker moves and strikes now; the rest is re-planned next pass.
  return { mover: best.attackers[0], targetId: best.targetId, rating: bestRating };
}
export {};
```

Typecheck: `/tmp/wesnoth-attack-rating.ts` on the VPS, `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/wesnoth-attack-rating.ts` passed (printed TSC_OK, exit 0).

## 5. Lands in

- TARGET `src/fight/ai-target.ts` (new module; the engine's AI brain). Parity-checklist row 2 (AI brain). The shape is one scoring function over (creature, target, attacker-set) options, owned by the engine, so both the Pit and the zones read it.
- today: not checked in this pass (the Frankendom repo was not read).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only; shape only, no line-by-line port)
- Brief rule served: one engine (ruling: many-on-one logic lives in the engine, not in a client); MAX_ATTACKERS = 3 (ruling) applied to the attacker-set size

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism and the donor's constants are cited as theirs, not copied as code.
- Wesnoth's chance_to_kill and expected losses come from a hit-by-hit simulation (battle_context, not read). Frankendom's duel is real time with guard, parry and stamina (row 1, row 3). We have no estimator for these inputs; a server-side estimator must be designed and tested. This is the largest risk.
- Determinism and replay: the score is only as good as its inputs. Any estimator used on the server must be deterministic for the fight record (row 19), or replays will disagree with the live fight.
- Turn-based positions: `support`, `vulnerability` and `terrain_quality` are tile-based. Frankendom has no tile grid in the duel. Porting the support ratio needs zone geometry, so keep it out of the first version.
- The sanity veto numbers (50, 2.0, 0.02, 0.75) are in Wesnoth power units and cannot be copied as numbers. They need calibration on our own fights.
- Commit model: the donor re-plans every turn and executes only the first attacker. In Frankendom, engage is a state change (ruling). Re-scoring every tick would make creatures flicker between targets; the engage gate needs hysteresis (not in the donor).
- MAX_ATTACKERS = 3: the donor's cap is 5 and its enumeration is recursive. With 3, the set count is small, but the per-tick NPC budget (row 18 sub-line) still has to bound the enumeration.
- Not read: battle_context internals, power_projection, best_defensive_position, and the candidate-action loop that calls evaluate(). The per-turn timing is therefore not described; the position budget is described from ca.cpp 189-195 only.
