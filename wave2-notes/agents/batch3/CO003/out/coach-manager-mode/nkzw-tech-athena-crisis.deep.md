# nkzw-tech-athena-crisis (coach-manager-mode, cell 1)

Donor: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/athena/lib/getChargeValue.tsx` (plus `apollo/Action.tsx` 520-625, `athena/lib/canActivatePower.tsx`, `apollo/actions/applyActionResponse.tsx` 538-556, `dionysus/DionysusAlpha.tsx` 110-145, `dionysus/lib/shouldActivatePower.tsx`) | Licence: MIT (LICENSE.md line 3: "The MIT License (MIT)"; branding and art are separately licensed and not used here) | TypeScript | symbol `getChargeValue`

Checked: Read in full: `athena/lib/getChargeValue.tsx` (29 lines), `athena/lib/canActivatePower.tsx`, `apollo/actions/applyEndTurnActionResponse.tsx` (lines 1-30), `apollo/actions/applyPower.tsx` (1-225), `dionysus/lib/shouldActivatePower.tsx`, and the attack and building paths in `apollo/Action.tsx` (530-625). Read in part: `athena/info/Skill.tsx` (366-380, 222-232, 884-896, 1438-1448, the `getSkillConfig` function), `dionysus/DionysusAlpha.tsx` (86-180). Not read: `Unit.isCompleted()` definition (the donor's own definition was not found by grep; the meaning of "completed" below is inferred from the attack gate at `apollo/Action.tsx:533`), the function header at `athena/info/Skill.tsx:884`, the occupant-unit rule (whether a unit on a destroyed building dies with it), `DiomedesEpsilon.tsx` (only grep hits at 142-170 seen; looks like the same shape, not confirmed). Confidence: high on the charge formulas and the spend and reset rules (read end to end); medium on the AI section (one AI read, one related AI skimmed). camera_scope not applicable.

Best transferable idea: a coach meter that fills from damage taken (the side that is hit fills fastest, the side that hits gets one third), is spent in fixed bars per command, is capped at ten bars, and lets each command fire once per cycle.
Decision (proposed): adapt - keep the meter and the bar costs, but make the reset a command-window timer instead of "next own turn" (Frankendom fights are real-time duels), compute every charge from server-verified HP changes, and replace the donor's random pick with the fight seed.
Acceptance: a 40 HP loss on a 100-cost fighter adds 40 units to the coach being hit and 13 to the coach that hit (floor(100 x 0.40 x 0.33)); a 3-bar command with 2 bars banked is refused by the server test, and a second send of the same command in one window is refused.

## 1. Mechanism

- The meter is a number of charge units per player (`Charge = 1500` per bar, `MaxCharges = 10` bars). It only goes up from combat and down when a power is spent. Every set goes through `setCharge`, which clamps to 0..15000 (Player.tsx:100).
- Order of steps for one attack (`attackUnit`, apollo/Action.tsx 529-568): (a) checks the attacker is the current player, the attacker is not completed (533), it can reach the target and the target is visible; (b) runs the hit and an optional counter-attack; (c) attacker charge = current charge + charge from the defender's loss x 0.33 x attacker modifier (553), + charge from the attacker's own counter-loss at full modifier (554); (d) defender charge = current charge + charge from its own loss at full modifier (557), only if the defender is a real player (player id above 0, 556).
- Charge from a loss (`getChargeValue`, a unit): unit value x (HP lost / 100) x modifier, floored (28). Unit value is the unit's cost for the owning player, or a fallback of (defence + fuel) x 20 when the cost is infinite (`getUnitValue.tsx:18-21`, read).
- Charge from a building (`getChargeValue`, a non-unit): zero unless the building is now destroyed (14-15). When destroyed it is floor(2/3 of one bar + 2 x cost) (23), so a destroyed building pays 1000 + 2 x its cost. Infinite cost is replaced by 10 x MinFunds (19-21).
- Who is paid for a building: in `attackBuilding` (apollo/Action.tsx 572-630) the building OWNER gets the destroyed-building charge (609). The attacker gets charge only if the building's occupant counter-attacks (613, weight 0.5). So the side that loses the building is paid, not the side that destroyed it.
- Modifier: 1, or 1.1 when the owner has the Charge skill (521). The Charge skill itself is a power that grants 2 bars (`ChargeSkillCharges`, Skill.tsx:374; applied at applyPower.tsx:156).
- Spend (`canActivatePower`, athena/lib/canActivatePower.tsx 5-14): the power needs a bar cost (charges) that is not null, `charges x 1500 <= charge` (9), the skill owned (10), not already active this cycle (11), and the crystal item when the skill flags it (12). The apply step subtracts `charges x 1500` unless the activation is free (applyActionResponse.tsx:551).
- Cycle: `activeSkills` is a set on the player. Activating a skill adds it (`activateSkill`, Player.tsx). When the turn passes, the NEXT player's `activeSkills` are cleared (applyEndTurnActionResponse.tsx:13). So an activated power stays active through the opponent's turn and clears at the owner's next turn start.
- AI use (DionysusAlpha.tsx): `activatePower` runs first in its action chain (92). It does nothing unless the AI has skills and at least one bar (114). It collects skills not already active where `canActivatePower` and `shouldActivatePower` both hold (120-133), picks one with `randomEntry` (136; I did not read `@nkzw/core/randomEntry` to confirm whether it is seeded), executes it, then continues attacking.
- The unit-ratio gate (shouldActivatePower.tsx 83-100): for attack-type powers it fires when completed units / matching units <= 0.5 (96). For the recovery power (`isRecoverySkill`, Skill.tsx:1375-1377, true only for `RecoverAirUnits`) it fires when the ratio >= 0.75. Powers outside the gate list, and heal powers, always pass (84-85).

## 2. Key functions

- `getChargeValue` (unit and building branches): `/mnt/frankendom-donors/nkzw-tech-athena-crisis/athena/lib/getChargeValue.tsx` 7-29.
- `attackUnit` charge block: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/apollo/Action.tsx` 548-558.
- `attackBuilding` charge block: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/apollo/Action.tsx` 605-619.
- `canActivatePower`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/athena/lib/canActivatePower.tsx` 5-14.
- `ActivatePower` apply: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/apollo/actions/applyActionResponse.tsx` 538-556.
- Cycle reset: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/apollo/actions/applyEndTurnActionResponse.tsx` 13.
- AI chain and pick: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/dionysus/DionysusAlpha.tsx` 90-145.
- AI gate: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/dionysus/lib/shouldActivatePower.tsx` 83-100.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Meter fills from HP lost: unit value x loss fraction x modifier, floored | Bar 1500 units (theirs, Configuration.tsx:52); HP scale 100 (Configuration.tsx:40, read via `MaxHealth`, not quoted) |
| Attacker share of the victim's loss | 0.33 (theirs, Action.tsx:553) |
| Victim gets its own loss at full weight | 1.0 (theirs, Action.tsx:557) |
| Counter-loss on the attacker | full weight (theirs, Action.tsx:554); 0.5 when a building occupant counters (theirs, Action.tsx:613) |
| Building loss pays the owner: floor(2/3 bar + 2 x cost) | 2/3 of a bar (theirs, getChargeValue.tsx:23); cost multiplier 2 (theirs, same line) |
| Meter cap | 10 bars = 15000 (theirs, Configuration.tsx:53 and Player.tsx:100) |
| Command cost in bars, cannot go below zero, cannot fire twice per cycle | Per-command bar cost: 2 to 10 bars (theirs, e.g. Skill.tsx:201 `charges: 5`); Charge skill grants 2 bars (theirs, Skill.tsx:374) and a 1.1 modifier (theirs, Action.tsx:521 with Skill.tsx:375 = 0.1) |
| Cycle reset on the next owner turn | None (rule shape, applyEndTurnActionResponse.tsx:13) |
| AI attack gate and recovery gate | 0.5 and 0.75 (theirs, shouldActivatePower.tsx:96) |

## 4. TypeScript sketch

simplified: the sketch keeps the charge rules, the spend rule, the once-per-cycle flag and the AI gate. It omits the crystal check (reduced to a boolean `hasItem`), the Charge skill modifier, the free-activation path beyond a flag, the attacker-vs-building split (the caller passes the weight), neutral defenders (player id 0 or below, which pay nothing), the occupant-unit rule on buildings, and the AI's random pick. It also moves the meter from the player record into a `CoachState` value. Unit value is an input, not `getUnitValue`.

```ts
// Licence: MIT (donor LICENSE.md). Clean-room sketch written from the mechanism, not a translation.
// clean-room
export const BAR = 1500;          // one charge bar (donor units)
export const MAX_BARS = 10;       // meter cap in bars
export const MAX_HP = 100;        // HP scale for the loss fraction
export const ATTACKER_SHARE = 0.33; // attacker share of the victim's loss (donor Action.tsx)

export interface Command {
  id: string;
  bars: number;        // cost in bars
  needsItem: boolean;  // donor: requiresCrystal
}

export interface CoachState {
  charge: number;                  // units, 0..MAX_BARS*BAR
  owned: ReadonlySet<string>;      // commands this coach has unlocked
  fired: ReadonlySet<string>;      // commands already fired and not yet reset
  hasItem: boolean;
}

const clampCharge = (c: number): number => Math.max(0, Math.min(MAX_BARS * BAR, c));

// Charge for HP lost: unit value x fraction of HP lost x modifier x weight.
// Victim weight is 1; the attacker of a hit uses ATTACKER_SHARE; a counter-hit on the attacker uses 1.
export function chargeForHpLost(unitValue: number, hpLost: number, weight: number, modifier: number): number {
  return Math.floor(unitValue * (hpLost / MAX_HP) * modifier * weight);
}

// A destroyed building pays its owner, not the attacker.
export function chargeForBuildingLoss(buildingCost: number): number {
  return Math.floor((BAR * 2) / 3 + buildingCost * 2);
}

export function addCharge(s: CoachState, amount: number): CoachState {
  return { ...s, charge: clampCharge(s.charge + amount) };
}

export function canFire(s: CoachState, c: Command): boolean {
  return (
    c.bars * BAR <= s.charge &&
    s.owned.has(c.id) &&
    !s.fired.has(c.id) &&
    (!c.needsItem || s.hasItem)
  );
}

export function fire(s: CoachState, c: Command, free = false): CoachState {
  if (!canFire(s, c)) {
    return s;
  }
  const cost = free ? 0 : c.bars * BAR;
  return { ...s, charge: clampCharge(s.charge - cost), fired: new Set([...s.fired, c.id]) };
}

// Called when the coach's own next turn or round begins. Fired commands stay active through the other side's reply.
export function startOwnCycle(s: CoachState): CoachState {
  return { ...s, fired: new Set() };
}

// AI gate: attack-type commands while at most half the side has acted; recovery commands at 3/4 or more.
// With no matching units the ratio is NaN and both comparisons are false (same as the donor).
export function aiGate(kind: 'attack' | 'recovery', acted: number, total: number): boolean {
  const ratio = acted / total;
  return kind === 'recovery' ? ratio >= 0.75 : ratio <= 0.5;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/coachCommands.ts` (new engine module): the coach meter, the bar costs, the once-per-window flag and the AI gate. It runs on the server; the client only shows the bars.
- Parity-checklist row 13 (specials): the command is a special spent from a meter. The server tick sub-line does not apply here (no per-tick work in this mechanism).
- Reuse tag: rewrite-from-idea (MIT; code could be adapted, the sketch is clean-room)
- Brief rule served: 1 (one engine: the meter and the command gate sit in the engine; the client only displays them)

## 6. Gaps and risks

- The donor is turn-based. "Active until the owner's next turn" does not exist in a real-time duel. Frankendom needs a command window (a timer in ticks) and the same once-per-window rule.
- The charge must be computed from server-verified HP changes, once per hit. Taking the value from the client breaks the one-ledger and server-verified kill rulings.
- The donor's AI picks among eligible commands with `randomEntry` (DionysusAlpha.tsx:136). I did not read the helper, so I do not know whether it is seeded. Frankendom's coach AI must use the fight seed so a replay reproduces the same pick.
- The donor's AI gate returns false when there are no matching units (0 / 0 is NaN, both tests fail). That may be intended (no ground units, no ground command) but I did not confirm the intent.
- The building payout goes to the owner, not the attacker. Frankendom has no buildings in the duel; the same rule could apply to a fighter's down-state or a gate, but that is a design choice, not a donor fact.
- The occupant-unit rule in `attackBuilding` (`unitC.setHealth(0)` when the building dies, Action.tsx:615-618) was not traced: I do not know whether the occupant dies with the building. Not read.
- 1500 units per bar, the 0.33 share and the 2 x cost payout are donor constants. Frankendom should expose them as data fields with defaults (see the JSON sidecar), not hard-code them.
- Frankendom's Pit fights and zone fights may need different meter sizes; keep the bar size and cap per encounter as zone data.

Reuse tag: rewrite-from-idea (MIT; clean-room sketch)
Brief rule served: 1 (one engine), 2 (server-verified kills and changes)
