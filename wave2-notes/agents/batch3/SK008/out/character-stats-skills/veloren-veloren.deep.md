# veloren-veloren (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/energy.rs` (pool and ramp), with the driver in `/mnt/frankendom-donors/veloren-veloren/common/systems/src/stats.rs` | Licence: GPL-3.0 (`LICENSE` header: "GNU GENERAL PUBLIC LICENSE Version 3") | Rust | symbol `Energy::regen`

Checked: Read in full: `energy.rs` (whole file, 135 lines); the stamina driver `common/systems/src/stats.rs` lines 14-16 and 95-177 (the state match that gates regen, plus `energy_mods` at 92); the cost gate `ability.rs` 1347-1437 (sampled the arms that use `try_change_by`); the hit refund in `combat.rs` 550-575, 820-845, 2208-2243; the server apply in `server/src/events/entity_manipulation.rs` 2520-2531; humanoid pool in `common/src/comp/body/mod.rs` 948-975; poise `common/src/comp/poise.rs` in full (317 lines) for the ladder and reset; skill-point curves `common/src/comp/skillset/mod.rs` 96-120 and 160-182, 362-390. Data: `assets/common/abilities/axe/*.ron` (costs), `assets/common/items/armor` (energy_max and energy_reward: counted across all armour files, 221 and 213 entries), `assets/common/abilities` (energy_cost 352 entries, energy_regen 491 entries). Callers: `Energy::regen` is called only from `stats.rs` (112, 129); `Poise::regen` from `stats.rs` (115, 132); `reset_regen_rate` from `stats.rs` 166 and `entity_manipulation.rs` 2528. Confidence: high on the stamina path (read end to end); the 15 s and 12 s refill times are from a sketch run on the VPS (node), with dt 0.01 s. Medium on units: `DeltaTime` is documented as time since the previous tick and the code multiplies rates by it; I took seconds (not checked). camera_scope: not applicable (not a camera cell). Not read: weapon and skill-tree effects on the pool (`ability.rs` 2404-2418 scales energy_regen by a skill modifier, seen but not traced), the body table beyond humanoid, the attack event code path that calls `CombatEffect::EnergyReward` for melee (`melee.rs` 118-120 seen).

## 1. Mechanism

- Stamina is `Energy`: a pool stored in fixed point (x256 inside the module), with a current value, a base max, a live max, and a regen rate (`energy.rs` 14-28, 85-96). The donor's doc comment for the rate says "per tick"; the code multiplies it by `dt` (`energy.rs` 25, 101).
- Max pool: `needs_maximum_update` takes `StatsModifier::compute_maximum` (`comp/stats.rs` 56-58, `base * mult + add`) (`energy.rs` 63-75). The driver sets `add` to the stat add plus the sum of equipped armour `energy_max` (`stats.rs` 92-96; `combat.rs` 2228-2243). So armour adds a flat amount; stat modifiers scale the base. Humanoid base is 100 (`body/mod.rs` 965).
- One tick of regen (order matters):
  - (a) The driver matches the character state (`stats.rs` 110-177). Three groups:
    - Sit: `energy.regen(2.5, dt)` (112).
    - Idle, talk, dance, skate, glide, wielding, equipping, boost: `energy.regen(1.0, dt)` (129).
    - Attack, roll, climb, summon, blink and similar: no regen, and the rate is set back to zero (165-166). The comment says "Ability use does not regen and sets the rate back to zero" (135).
    - Stall group (crawl, wall-run, stunned, block, item use, transform, interact, regrow head): no regen call and no reset, so the ramp is kept but no energy comes in (169-173).
  - (b) `regen` does nothing at full pool (`energy.rs` 100). Otherwise it first adds `rate * dt` to the pool (101), then ramps the rate by `accel * dt` and caps it at 10.0 (102).
- Ramp in numbers: with accel 1.0 the rate is `min(t, 10)` after t seconds of regen, so the pool gains t^2/2 until t = 10 and then 10 per second. From empty to 100 that is 15 s when idle and 12 s when sitting (accel 2.5, rate cap reached at 4 s). Both checked by the sketch run below.
- Spend gate: `try_change_by(-cost)` fails if the new value would be below 0 or above max (`energy.rs` 120-125). `requirements_paid` in `ability.rs` (1347) runs this before an ability starts; it is the gate for basic melee, guard, roll, leap and others (1361, 1381, 1405-1437). Rapid ranged checks `current >= cost + initial` (1389).
- Hit refund: an attack's `EnergyReward(ec)` becomes an `EnergyChangeEvent` to the attacker with change `ec * armour_reward_mod * strength_modifier * attacker energy_reward_modifier * attacked energy_reward`, and `reset_rate: false` (`combat.rs` 559-568; the same block again at 830-840). The armour mod is `1.0 + sum(energy_reward)` (2208-2222). The server applies it as `change_by` and resets the rate only if asked (`entity_manipulation.rs` 2520-2531).
- Block: `BasicBlock` costs 5 at start (`assets/common/abilities/axe/basic_guard.ron` 10) and its state is in the stall group, so while blocking the pool does not refill. A blocked hit costs poise: `poise_cost = min(damage / block_strength, 1) * 25` (`combat.rs` 79, 221). The block-hit code (`combat.rs` 185-250) has no energy change; that is what the read shows. The block state declares `energy_regen` (`states/basic_block.rs` 38) but does not use it (grep of the state file finds only the declaration).

Worked check (VPS, `node` run of the sketch below, dt 0.01 s): idle refill from empty is 15.01 s, sit refill is 12.01 s.

## 2. Key functions

- `Energy::regen`: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/energy.rs` 99-103. Ramp, cap, and the full-pool guard.
- `Energy::try_change_by`: same file, 120-127. The spend gate.
- Stamina driver: `/mnt/frankendom-donors/veloren-veloren/common/systems/src/stats.rs` 88-177. The state match that decides regen, ramp or reset.
- Ability gate: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/ability.rs` `requirements_paid` 1347-1437.
- Hit refund: `/mnt/frankendom-donors/veloren-veloren/common/src/combat.rs` 559-568 (and 830-840); `compute_energy_reward_mod` 2208-2224; `compute_max_energy_mod` 2228-2243.
- Server apply: `/mnt/frankendom-donors/veloren-veloren/server/src/events/entity_manipulation.rs` 2520-2531.
- Poise (same file set): `/mnt/frankendom-donors/veloren-veloren/common/src/comp/poise.rs` `poise_effect` 79-143, `damage_multiplier` 151-160, `change` 220-235, `regen` 240-252, `reset` 254-257, `poise_state` 265-273, `compute_poise_damage_reduction` 276-298.

## 3. Numbers vs mechanism

Each row: name | what it does | formula | number ranges | caps | file:line.

| Stat or term | What it does | Formula | Number ranges | Caps | file:line |
|---|---|---|---|---|---|
| Stamina pool (humanoid base) | Base pool | 100 | 100 | live max from stats | body/mod.rs 965; energy.rs 85-90 |
| Max pool | Live maximum | base * stat mult + stat add + sum(armour energy_max) | armour energy_max median 3.4 over 221 entries; one debug piece at 900 (`items/debug/admin.ron` 9) | pool is clamped to max | energy.rs 63-75; combat.rs 2228-2243; stats.rs 92-96 |
| Idle regen accel | Ramp while standing or moving | rate += 1.0 * dt | 1.0 per second squared | rate cap 10.0 | stats.rs 14, 129; energy.rs 102 |
| Sit regen accel | Ramp while sitting | rate += 2.5 * dt | 2.5 per second squared | rate cap 10.0 | stats.rs 15, 112 |
| Regen rate cap | Top speed of refill | min(rate, 10.0) | 10 per second | 10.0 | energy.rs 102 |
| Refill time from empty | Idle / sit | integral of min(accel*t, 10) to 100 | 15 s idle; 12 s sit | none | sketch run; energy.rs 99-102 |
| Ramp reset | Attack, roll, leap, summon states | rate = 0, no regen | rate back to 0 each tick while in the state | none | stats.rs 135-166 |
| Ramp kept, no regen | Block, stun, item use, transform, interact | no regen, rate kept | no refill during the state | none | stats.rs 169-173 |
| Spend gate | Pay for an ability at start | refuse if pool - cost < 0 | cost 0 to 60 over 352 ability entries (median 0) | pool >= 0 | energy.rs 120-127; ability.rs 1361 |
| Rapid ranged gate | Pay more during a state | needs current >= cost + initial | e.g. per-tick spend `-energy_cost` | none | ability.rs 1389; states/rapid_ranged.rs 213-217 |
| Guard cost | Block cost at start | energy_cost 5 | 5 | none | assets/common/abilities/axe/basic_guard.ron 10 |
| Basic attack cost | Light attack cost | energy_cost 0 (dagger tempbasic) | 0 | none | assets/common/abilities/dagger/tempbasic.ron |
| Ability costs (examples) | Heavier skills | fierce raze 8; brutal swing 10 per strike; furor 30 | 8, 10, 30 | none | axe/fierce_raze.ron 15; axe/brutal_swing.ron 21; axe/furor.ron 8 |
| Hit refund (energy_regen on attacks) | Energy gained on hit | EnergyReward(ec) * armour mod * stat mod * attacked mod; no ramp reset | energy_regen 0 to 50 over 491 entries | none | combat.rs 559-568 |
| Armour reward mod | Refund multiplier from gear | 1.0 + sum(armour energy_reward) | energy_reward median 0.075 over 213 entries | none | combat.rs 2208-2222 |
| Block poise cost | Poise lost when blocking | min(damage / block_strength, 1) * 25 | 0 to 25 | 25 | combat.rs 79, 221 |
| Poise pool (humanoid) | Stagger buffer | 100 | 100 | live max | body/mod.rs 1476; poise.rs 207-217 |
| Poise ladder | State from remaining poise | >50 Normal; >30 Interrupted; >15 Stunned; >5 Dazed; else KnockedDown | thresholds 50, 30, 15, 5 | none | poise.rs 179, 265-273 |
| Stagger durations | Time in each state | Interrupted 0.2+0.2 s (move x0.8); Stunned 0.35+0.35 s (x0.5); Dazed 0.75+0.75 s (x0.2); KnockedDown 1.5+1.5 s (x0, impulse 10) | see left | none | poise.rs 88-122 |
| Poise into health | Health damage multiplier in a state | Interrupted 0.1; Stunned 0.25; Dazed 0.5; KnockedDown 1.0 | 0.1 to 1.0 | none | poise.rs 151-158 |
| Poise grace | Ignore poise changes after a stun | change ignored while last_stun_time + 1.0 > now | 1.0 s | none | poise.rs 173, 220-223, 254-256 |
| Poise regen | Poise refill | rate += 2.0 * dt, cap 10 | accel 2.0 | cap 10.0 | stats.rs 16, 115, 132; poise.rs 240-251 |
| Armour poise reduction | Stagger resist from gear | dr / (60 + abs(dr)) | diminishing | none | poise.rs 284 |
| Poise resistant | Stagger resist from a capability | x0.5 if POISE_RESISTANT | 0.5 | none | poise.rs 291-292 |
| Skill point cost (per skill) | SP to buy the next level | cost = next level (1, 2, 3, ...) | per skill level | skill max (not read) | skillset/skills.rs 181; skillset/mod.rs 413-415 |
| EXP per SP, weapon groups | Group EXP for the next SP | 25 * floor(400 * (n/(n+20))^2 + 5 * e^(0.025 n)) with n = earned SP | 125 at n=0; 525 at n=5; 1250 at n=10; 2700 at n=20; 3850 at n=30; 4775 at n=40; 5525 at n=50 (python replica of the formula) | none | skillset/mod.rs 98-105 |
| EXP per SP, other groups | Group EXP for the next SP | 10 * floor(100 / (1 + e^(-0.125 n) * 13.29)) with n = earned SP | 70 at n=0; 120 at n=5; 200 at n=10; 470 at n=20; 760 at n=30; 910 at n=40; 970 at n=50 (ceiling 1000) | ceiling 1000 | skillset/mod.rs 108-117 |
| Level and XP | Not in this read | not read | not read | not read | (not read) |
| Strength, dexterity, intelligence | Not present as stats | `Stats` has damage reduction, poise reduction, speed modifiers, not attribute scores | none | none | comp/stats.rs 77-100 |

Note on the table: the donor has no STR/DEX/INT scores. Its "attributes" are the skill groups (weapon groups and others) and the body and armour stats above. Magic and resistances are not read here.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (regen adds rate times dt, then the rate ramps and caps; reset zeroes the ramp; stall keeps it). It omits the fixed-point storage (x256), the separate sit and idle lookup (pass the accel), the per-state table of 40+ character states (the caller maps each state to one of three phases), the attacker and target lookups for the refund (pass the mults), the server event path (the refund is applied directly), and the poise pool. It also does not clamp a spend at max, because the donor does not need it.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism; no donor lines translated.
// clean-room
// Stamina (energy) pool with a state-gated regen ramp. Units: pool units; rate in units per second; dt in seconds.
type RegenPhase = 'regen' | 'reset' | 'stall';

interface Stamina {
  current: number;   // 0..max
  max: number;
  rate: number;      // regen rate, ramps while regenerating, zeroed by actions
}

const RATE_CAP = 10.0;   // per second (donor cap)
const ACCEL_IDLE = 1.0;  // rate gained per second of regen (donor ENERGY_REGEN_ACCEL)
const ACCEL_SIT = 2.5;   // donor SIT_ENERGY_REGEN_ACCEL

// One tick. Order matches the donor: regen adds rate*dt first, then the rate ramps and caps.
function tickStamina(s: Stamina, phase: RegenPhase, accel: number, dt: number): void {
  if (phase === 'reset') { s.rate = 0; return; }   // attacks, rolls: no regen, ramp restarts
  if (phase === 'stall') return;                  // block, stun, item use: no regen, ramp kept
  if (s.current < s.max) {
    s.current = Math.min(s.max, s.current + s.rate * dt);
    s.rate = Math.min(s.rate + accel * dt, RATE_CAP);
  }
}

// Spend: refuse if the pool would go below zero (donor try_change_by).
function trySpend(s: Stamina, cost: number): boolean {
  if (s.current - cost < 0) return false;
  s.current -= cost;
  return true;
}

// Hit refund: adds energy without resetting the ramp (donor EnergyReward, reset_rate false).
// armourSum is the sum of equipped armour energy_reward values; the donor folds it as 1.0 + sum.
function hitRefund(s: Stamina, reward: number, armourSum: number, statMult: number): void {
  const armourMult = 1.0 + armourSum;
  s.current = Math.min(s.max, s.current + reward * armourMult * statMult);
}

// Max pool: base times a stat multiplier, plus flat stat and armour additions.
function maxPool(base: number, statMult: number, statAdd: number, armourMaxSum: number): number {
  return base * statMult + statAdd + armourMaxSum;
}

// Worked check: a humanoid pool of 100, idle regen from empty, dt 0.01 s. Expect about 15 s.
function secondsFromEmptyIdle(): number {
  const s: Stamina = { current: 0, max: 100, rate: 0 };
  let t = 0;
  while (s.current < s.max && t < 60) { tickStamina(s, 'regen', ACCEL_IDLE, 0.01); t += 0.01; }
  return t;
}
export const idleFullSeconds: number = secondsFromEmptyIdle();

// Worked check: sit regen from empty. Expect about 12 s.
function secondsFromEmptySit(): number {
  const s: Stamina = { current: 0, max: 100, rate: 0 };
  let t = 0;
  while (s.current < s.max && t < 60) { tickStamina(s, 'regen', ACCEL_SIT, 0.01); t += 0.01; }
  return t;
}
export const sitFullSeconds: number = secondsFromEmptySit();
export {};

```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS passed. The two worked checks were run with `node` on the VPS: `idle 15.01 sit 12.01`.

## 5. Lands in

- TARGET `src/fight/stamina.ts` (new): the stamina pool, its regen ramp, the per-state gate, and the spend gate, read by the duel step. Parity-checklist row 3 (guard, parry and stamina). The hint for this batch said row 21; the catalogue fields (costs, regen accel, caps) feed row 3 and are data, so row 3 is the honest row here.
- Reuse tag: adapt-idea (GPL-3.0: clean-room, shape only, no line translated)
- Brief rule served: 1 (one engine: the pool and the ramp live in src/fight, the client only shows them); rule 7 (licence: clean-room); SK-FOCUS 2 (stamina and fatigue) and 4 (block and parry costs).

## 6. Gaps and risks

- Defect (keep the idea, fix the defect): the poise regen rate is never reset. `Poise::regen` ramps the rate (`poise.rs` 250), and only the energy path resets it (`stats.rs` 166; `entity_manipulation.rs` 2528). `Poise::reset` (254-257) refills the pool but does not reset the rate, and no other code resets it (grep of `common`, `common/systems`, `server`). So after the first long regen, later stagger refills run at the 10/s cap at once instead of ramping. Fix: reset the poise rate in `Poise::reset`, as energy does on attack states. Our sketch starts the ramp at zero after a stagger.
- Defect (doc only): the energy rate doc says "per tick" (`energy.rs` 25) but the code multiplies by dt. Fix: write our rate as units per second.
- Hit refund exploit risk: energy on hit (`combat.rs` 559-568) is an attacker reward decided on the server. In Frankendom it must be decided and capped on the server (kills and hits are server-verified), and capped per swing.
- Block costs: blocking stops refill (stall group) and costs 5 to start, but a blocked hit costs poise (25 max), not energy. Frankendom's guard rule (row 3) must pick one; this donor uses both.
- Zones as data: the pool base, the accel, the cap and the costs are catalogue or engine data (per body, per ability, per armour piece). None is zone data.
- One ledger: the pool is a field on the character, not per zone. Keep it that way.
- Not read: skill-tree modifiers on the pool and regen (`ability.rs` 2404-2418), the level and XP curve beyond the group curve, max-level values, and the magic pool (none in this file set).

Best transferable idea: a stamina pool whose refill ramps up while idle, restarts when you attack, pauses while you block, refunds a little on a hit, and refuses any action that would drive it below zero.
Decision (proposed): adopt — the state-gated ramp and the spend gate are the stamina economy row 3 needs; take the shape as is, with the poise rate reset fixed and the values as catalogue data.
Acceptance: a player who keeps attacking sees the stamina bar stop refilling; after 2 s of idling it refills at a visibly faster rate and reaches full in about 15 s from empty; holding block stops the refill; an attack that costs 10 at 8 stamina is refused with a "not enough stamina" cue; a stagger refills poise from zero rate, not at the cap.

Reuse tag: adapt-idea (GPL-3.0; clean-room, shape only)
Brief rule served: 1 (one engine); 7 (licence: clean-room)
