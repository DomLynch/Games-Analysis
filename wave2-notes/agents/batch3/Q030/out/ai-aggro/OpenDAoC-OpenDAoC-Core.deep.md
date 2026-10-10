# OpenDAoC-OpenDAoC-Core (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/AggroTable.cs` | Licence: GPL-3.0 (LICENSE line 2 "Version 3, 29 June 2007"; README.md line 41 "licensed under the [GNU General Public License (GPL)] v3"; the four cited files carry no licence header; repo-root gplheader.txt is a GPL v2-or-later header that these files do not use) | C# | symbol `AggroTable.UpdateAndGetHighestThreat`

Checked: Read in full: `AggroTable.cs` (1-366), `AggroCandidateLoop.cs` (all), `StandardMobBrain.cs` 60-190 (proximity aggro), 296-372 (`AddToAggroList`), 398-445 (`AttackMostWanted`), 480-512 (LOS reply listener, last part only, and the target getter), 512-576 (`CanAggroTarget`, damage to aggro), 1349-1420 (`ThreatStrategy`), `StandardMobState.cs` 84-130 (AGGRO state), `NpcAttackAction.cs` 80-135 (melee reach switch; lines 1-79 not read), `Faction.cs` 1-150 (lines 150-159 not read). Partly read: `TurretFNFBrain.cs` 130-200 (a second threat strategy; the end of its `SelectTarget` was not read). Not read: the LOS reply handler body (roughly 440-480), `PropagateAggroToGroupMembers`, `ModifyDamageWithTaunt`, `BringFriends`, the caller of `CheckProximityAggro` and how often it runs, the other uses of `CHECK_LOS_BEFORE_AGGRO` (its default, true, was read in the `[ServerProperty]` attribute at serverproperty/ServerProperties.cs:655). Callers: `UpdateAndGetHighestThreat` has one caller in this path (StandardMobBrain.cs:501, reached from `CalculateNextAttackTarget` at 507-509); grep shows about 40 callers of `AddToAggroList`, of which I read only the two in `ConvertAttackToAggroAmount` (567, 574) and the pet tag (569). Confidence: high on the threat table, the decay curve and the pick (read end to end). Medium on how often the proximity check runs. camera_scope: not applicable (ai-aggro cell).

## 1. Mechanism

- Each NPC owns a threat table (`AggroTable`), keyed by living entity, holding a base aggro number (AggroTable.cs 10, 326-332).
- Adding aggro (`AddOrUpdateInternal`): an existing entry gets `Base = max(0, Base + amount)`, so negative amounts are allowed but never go below 0 (328). A new entry starts at `max(1, amount)` (332), so a zero-damage pull still registers. The first entry in an empty table moves the NPC to AGGRO and resets its next think tick (StandardMobBrain.cs 353-356).
- Damage to aggro (`ConvertAttackToAggroAmount`, 553-576): skipped if the attack does not generate aggro, the NPC is dead or not active, or in PASSIVE (555). Amount = max(0, damage + critical damage) (558). A pet's damage goes to the pet at 100% and the owner gets 30% as a tag (565-569). Any other attacker gets the full amount (574).
- Protect (`AddToAggroList`, 303-350): for each protect effect on the living, if the protector is not incapacitated or sitting (320-321) and is within 1000 units of the living (323), the protector takes 10% per protect level of the amount (331, `abilityLevel * 0.1 * aggroAmount`), that share is subtracted from the living's amount (335), and it is added to the protector's own entry (347). The code comment (329) calls the percentages guesses.
- Proximity acquisition (`CheckProximityAggro`, 73-90): runs only when the NPC has an aggro level and range, no spell in progress, an empty table and no pending LOS checks (81). Players come from a radius query (116). Players are skipped if they are stealthed, mounted or shaded (99-103). With `CHECK_LOS_BEFORE_AGGRO` on (105; the default is true, ServerProperties.cs:655), the LOS check is sent to a player's client and the NPC is added only if the reply is positive (the reply handler, partly read, calls `AddToAggroList`, 483); otherwise the NPC is added directly (108). The per-tick budget is 5 player LOS requests (61) and 3 NPC LOS requests (62), counted per call and reset at 77-78. The budget counts LOS requests only: with the LOS check off, every player in radius is added in one call, and the budget does not apply. Without the LOS check, the NPC pull adds the first eligible NPC and returns (145-146); with the LOS check on it sends the request and continues only when the other NPC, or this mob, is a pet with a player owner (133-142); any other NPC falls through to the direct add and return (145-146), as with the check off.
- Candidate rotation (`AggroCandidateLoop`): candidates are read from index `(_index + _processed) % Length` (43), the loop stops when the checks reach the cap (37), and disposal advances the index by the number processed (52). So the same first few candidates are not checked every time.
- Target choice (`UpdateAndGetHighestThreat`, AggroTable.cs 245-299): (1) snapshot the table; (2) for each entry, remove it if `ShouldBeRemoved` (270-276, the entry is deleted from the table); skip it if `ShouldBeIgnored` (280; kept in the table); (3) effective aggro = `CalculateEffectiveAggro(base, living, out distance)` (284); (4) track the highest effective aggro among entries with distance <= attack range (286-292, strictly higher wins, starts at -1 at 264); (5) store that as `LastHighestThreatInAttackRange` (296); (6) return `SelectTarget` over all valid entries (298), which is not range-filtered.
- `ThreatStrategy` (StandardMobBrain.cs 1349-1420): effective aggro = base when distance <= 250 (1351, 1367-1368). Above 250 it is `ceil(base * exp(k * (distance - 250)))` with `k = ln(1/3) / (1500 - 250)` (1352, 1369), so it is one third of base at 1500 units. Removal: dead, a different region, or not allowed to attack unless it is a shade (1408-1410). Ignored: a shade, or beyond 6000 units (1417-1418; kept in the table, so the NPC can pick them up again).
- `SelectTarget` (1377-1402): highest effective aggro wins. The current target is kept if it is still in the candidates and its effective aggro is at least the best (1396-1402: "Don't change target if the current one is still at least as threatening"), so equal aggro does not flap.
- Retarget cadence: the AGGRO state (StandardMobState.cs 115-130) calls `AttackMostWanted` each think. It drops to IDLE once it has been out of combat for `LEAVE_WHEN_OUT_OF_COMBAT_FOR` (line 86, 25000; the unit is assumed ms because the timer is `GameLoopTime`, not checked; 119-123), or when `HasAggro` is false after the retarget (127-129). While the NPC is crowd-controlled or carries the speed debuff with value 99, `Think` refreshes the combat end time each tick instead (117-118), so it does not drop to IDLE.
- `AttackMostWanted` (420-445): if the NPC is not active, return (422-423). New target = `CalculateNextAttackTarget()` (425). If there is none, return. If the NPC had no target, it brings friends and fires the aggro sentence (430-433). Then it sets the target and starts attacking (440-445).
- Melee reach switch (`NpcAttackAction.cs` 99-113): if the current target is out of melee reach and the owner is a non-controlled StandardMobBrain, the brain's `LastHighestThreatInAttackRange` replaces the target when it is not null (103-106). If the target is still null or out of melee reach, the melee attack is skipped for this tick (108-112). So an NPC hits the best threat that is already in its attack range.
- Faction gate (`CanAggroTarget`, 512-543): first `IsAllowedToAttack` must pass (514), and a grey-con target (a pet resolves to its owner) is never aggroed, so only green or higher is attacked (529-530). Then, if the NPC has a faction, a player target must have Aggressive standing and the result returns directly (533-536). An NPC target in an enemy faction returns true (537-538). Otherwise the NPC aggroes only when it has an aggro level and (it has a realm or the target is not an NPC) (542).
- Faction standing (`Faction.cs`): per character, a value clamped to -100..100 (14-15, 119), base from the faction's base value (137). Standing bands: above 75 Aggressive (139-140), above 50 Hostile, above 25 Neutral, else Friendly. A member kill moves friend factions up by 1 and enemy factions down by 1 (88-95), each change only on a 20% roll (113). The player is told about the change whether or not the roll succeeded (131-132 sit outside the roll).

## 2. Key functions

- `AggroTable.UpdateAndGetHighestThreat`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/AggroTable.cs` 245-299. Removal, ignore, effective aggro, in-range best, then the strategy pick.
- `AggroTable.AddOrUpdateInternal`: same file, 324-334. First-contact minimum 1, floor 0 on later changes.
- `StandardMobBrain.ThreatStrategy` (`CalculateEffectiveAggro`, `SelectTarget`, `ShouldBeRemoved`, `ShouldBeIgnored`): `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ai/brain/StandardMob/StandardMobBrain.cs` 1349-1420.
- `StandardMobBrain.AddToAggroList` (protect): same file, 303-358.
- `StandardMobBrain.ConvertAttackToAggroAmount`: same file, 553-576. Damage to aggro and the pet tag.
- `StandardMobBrain.CheckProximityAggro` / `CheckPlayerAggro` / `CheckNpcAggro`: same file, 73-148. Gate, radius query, LOS budget.
- `AggroCandidateLoop<T>`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/AggroCandidateLoop.cs` 7-55. Rotating budgeted enumeration.
- `StandardMobState` (AGGRO): `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ai/brain/StandardMob/StandardMobState.cs` 84-130.
- `NpcAttackAction` melee reach switch: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Components/Actions/NpcAttackAction.cs` 80-116.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Threat table: entries add or subtract; a new entry always counts at least 1 | Floor 1 on first contact, floor 0 after (theirs, AggroTable.cs 328, 332) |
| Damage becomes threat, with the pet's threat tagged to its owner | Pet tag 0.3 (theirs, StandardMobBrain.cs 569); damage plus critical damage (558) |
| Threat decays with distance: full inside 250 units, then exponential | Threshold 250 (1351); exponent ln(1/3)/1250, so one third at 1500 units (1352) |
| Entries beyond a far radius are ignored but kept | 6000 units (1417-1418) |
| Keep the current target while it is still at least as threatening | Ties keep current (1401-1402) |
| A protector near the target takes a share of new threat | 1000 units (ProtectAbilityHandler.cs 12); 0.1 per protect level (StandardMobBrain.cs 331, comment 329 says "guessed") |
| Budgeted LOS checks, with a rotating start index | 5 player and 3 NPC LOS requests per call (61-62) |
| Combat timeout before leaving the fight | 25000 (StandardMobState.cs 86) |

## 4. TypeScript sketch

simplified: the sketch keeps the threat table (first-contact floor, floor 0 on later changes), the distance curve (250 threshold, one third at 1500, rounded up), the pick with keep-current, the protect share with a distance gate, and the rotating budget scan. It omits the removal and ignore rules (which the donor applies in the table, with the ignore radius at 6000 units), the pet and owner split, the faction gate, the LOS client round trip, the in-range pick used by the melee switch, the locking and pooled buffers, the group propagation, the aggro sentence and the 25000 combat timeout. The sketch takes distance as a plain number in the same units as the thresholds.

```ts
// Licence: GPL-3.0 (donor, README.md and LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface HateConfig {
  falloffStart: number;      // 250 units: below this, effective aggro equals base
  fullFalloff: number;       // 1500 units: effective aggro is one third of base here
  ignoreBeyond: number;      // 6000 units: entries stay in the table but are not candidates
  protectRange: number;      // 1000 units
  protectPerLevel: number;   // 0.1 of the aggro per protect level
  petOwnerTag: number;       // 0.3 of a pet's damage also tagged to its owner
  losPlayersPerTick: number; // 5
  losNpcsPerTick: number;    // 3
}

export const DONOR_HATE: HateConfig = {
  falloffStart: 250, fullFalloff: 1500, ignoreBeyond: 6000, protectRange: 1000,
  protectPerLevel: 0.1, petOwnerTag: 0.3, losPlayersPerTick: 5, losNpcsPerTick: 3,
};

// Effective aggro: base, then decays exponentially past falloffStart, rounded up.
export function effectiveAggro(base: number, dist: number, cfg: HateConfig): number {
  const over = dist - cfg.falloffStart;
  if (over <= 0) return base;
  const k = Math.log(1 / 3) / (cfg.fullFalloff - cfg.falloffStart);
  return Math.ceil(base * Math.exp(k * over));
}

// Adding aggro: a new entry starts at least at 1; an existing entry never drops below 0.
export function addAggro(table: Map<number, number>, id: number, amount: number): void {
  const cur = table.get(id);
  if (cur !== undefined) table.set(id, Math.max(0, cur + amount));
  else table.set(id, Math.max(1, amount));
}

// Pick: highest effective aggro wins; the current target is kept while it is at least as high (no flapping).
export function selectTarget(cands: { id: number; eff: number }[], current: number | null): number | null {
  let best: number | null = null;
  let bestEff = -1;
  let currentEff = -1;
  for (const c of cands) {
    if (c.id === current) currentEff = c.eff;
    if (c.eff > bestEff) { bestEff = c.eff; best = c.id; }
  }
  const keepCurrent = current !== null && currentEff > -1 && current !== best && currentEff >= bestEff;
  return keepCurrent ? current : best;
}

// Protect: a protector near the target takes a share of new aggro, 10% per protect level.
export function protectShare(amount: number, level: number, distToProtector: number, cfg: HateConfig): number {
  if (distToProtector > cfg.protectRange) return 0;
  return Math.floor(level * cfg.protectPerLevel * amount);
}

// Rotating scan under a per-call check budget. Every candidate looked at advances the index,
// whether or not a check was sent (donor: processed count), so the same ones are not checked every time.
export function scanRotating<T>(items: T[], state: { index: number }, maxChecks: number, wantsCheck: (t: T) => boolean): number {
  const n = items.length;
  if (n === 0) return 0;
  let processed = 0;
  let checks = 0;
  while (processed < n && checks < maxChecks) {
    const item = items[(state.index + processed) % n];
    processed++;
    if (wantsCheck(item)) checks++;
  }
  state.index = (state.index + processed) % n;
  return checks;
}
```

## 5. Lands in

- TARGET `src/fight/hate.ts` (new module, proposed name; not checked against the repo): the per-monster hate list and target pick, owned by the engine. Parity-checklist row 4 (fight loop: aggro, chase, leash). The per-tick check budget belongs to the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3), not to row 4.
- Best transferable idea: a per-monster hate table where threat decays with distance past a threshold and the current target is kept unless another threat is strictly higher, with protect as a distance-gated share of new threat.
- Decision (proposed): adapt — the table, the decay curve and the keep-current pick fit the engine-owned hate list for MAX_ATTACKERS = 3; drop the client-side LOS round trip (Frankendom checks on the server), and make the threshold, the falloff and the protect share zone data or engine constants instead of the donor's values.
- Acceptance: a server test asserts that a base of 100 at 1500 units gives an effective 34 (ceil of 33.3), that the current target stays while its effective aggro is not below the best, that an entry beyond 6000 units is not a candidate but stays in the table, and that a protector within 1000 units takes 10% per level of a new threat.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: the hate list and target pick are engine functions, not client code; MAX_ATTACKERS = 3 enforced when an entry is added); rules 7-9 n/a

## 6. Gaps and risks

- The donor checks line of sight by asking a player's client to do it (SendLosCheckRequest). Frankendom is server-verified and the engine has the positions, so do not port the round trip. Any LOS test must run on the server from zone geometry.
- The donor's per-tick budget counts only LOS requests. With LOS off (the default is on, so this is the non-default case), every player in radius is added in one call. Frankendom needs its budget to cover the whole candidate scan, not only the optional checks.
- The donor has no cap on how many entries a monster keeps or on how many attack it. MAX_ATTACKERS = 3 must be enforced when a new attacker is added to the engine's list, not inferred from the score.
- The donor's table removes dead or disallowed entries inside the scan. Frankendom's ledger must remove them through an explicit engine event, so the server and the client see the same list.
- Ties in the donor are broken by table order, which is a C# dictionary order and is not guaranteed. Frankendom's list must have a stable order (insertion order with an id) so that two servers pick the same target.
- The 250-unit threshold is commented in the donor as "higher than players' melee range". Frankendom must set the threshold from its own duel reach, as data, and test it at duel distances, where the falloff does not start until well past melee.
- The donor's melee switch moves the NPC to a target already in reach. In Frankendom a target change is a state change (engage is a state change), so the switch needs a rule and a server test, not a silent swap.
- The protect percentages are guesses per the donor comment (329). Do not copy them as rules; make them data.
- The faction standing bands and the player message that is sent whether or not the 20% roll succeeds (131-132) are a quirk. Do not copy the message rule.
- The donor's timeout (25000) and the ignore radius (6000) are in the donor's game units; Frankendom's units differ and must be set as data.
- GPL-3.0: clean-room only. The sketch is written from the mechanism.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine: the hate list and target pick are engine functions, not client code; MAX_ATTACKERS = 3 enforced when an entry is added); rules 7-9 n/a


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** (1) CHECK_LOS_BEFORE_AGGRO default was reported as 'not read'; ServerProperties.cs:655 declaration carries default true, so LOS is ON by default and the Gaps bullet 'With LOS off (the default was not read)' frames the wrong case. (2) NPC-aggro bullet says with LOS on the NPC 'sends the request and continues (136,141)'; real code only does that when one side is a pet with a player owner, otherwise it falls through to AddToAggroList(npc)+return (145-146). (3) AGGRO state timer: Think (117-118) also refreshes _aggroEndTime while crowd-controlled or speed-debuff value 99, not mentioned. Verified: 245-299 order, 264/286 strict, 296, 328/332, 250/ln(1/3)/1250 curve at 1351-1369 (34 at 1500 for base 100), 6000 ignore, SelectTarget keep-current 1396-1402, protect 1000 (ProtectAbilityHandler.cs:12), 0.1/level, 0.3 pet tag at 569, 5/3 LOS budgets 61-62, loop index rotation 43/52, melee switch 99-113, 25000 at StandardMobState:86, Faction clamp 14-15/119, bands 139-146, 20% roll 113, message outside roll 131-132.

**Missed:** CanAggroTarget (512-543) also requires IsAllowedToAttack (514) and a grey-con exclusion (529-530: only attacks green+); note's faction-gate bullet omits both
