# hedgewars-hw (combat-sim, cell 3)

Donor: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGears.pas` (`CheckNoDamage` 81-133, `ProcessGears` turn-end states 342-372) with `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGearsUtils.pas` (`ModifyDamage` 264-279, `ApplyDamage` 281-349, `CheckHHDamage` 454-484, `doMakeExplosion` 94-262, `AmmoShoveImpl` 1320-1479) | Licence: GNU GPL-2.0 (`COPYING` line 2: "Version 2, June 1991") | Pascal (Free Pascal engine) | symbol `CheckNoDamage` / `ApplyDamage` / `doMakeExplosion`

Checked: The hint file `share/hedgewars/Data/Scripts/Multiplayer/Random_Weapon.lua` is a game-mode script that hands each team a random weapon (it does not implement damage); it was read in full (115 lines) and is not the mechanism. The real implementation is the Pascal engine. Read end to end: the hit path (`ApplyDamage`, `ModifyDamage`), the damage round (`CheckNoDamage`), its turn-end state machine (`ProcessGears` 342-372 with the state order at uGears.pas 67), the explosion damage and push (`doMakeExplosion` 127-179, the wrap pass 240-259), and the fall damage (`CheckHHDamage`). Partly read: `AmmoShoveImpl` (only the damage, push and hit-order lines; the per-kind branches for knives, drills, sentries and fire were not read), the callers of `CheckHHDamage` (uGearsHedgehog.pas 1092, 1237, 1410, grep only), `HealthMachine` (uGears.pas 163-224, not read), and the weapon `Power` values (not read). Confidence high on the order of the damage round and the numbers quoted; medium on the claim that the round runs only when no gear is moving, since I read the gate (342) and the sweep state (368-372) but not every state that sets `step`. Verdict STRONG: the pending-then-settle damage round is a self-contained mechanism with exact numbers.

Best transferable idea: hits only add to a pending amount, and one settle pass per tick (or per turn end) clamps each target's health, with a short pause and a repeat until nothing is pending.
Decision (proposed): adapt - adopt the same-tick aggregation (several hits on one target in one tick are summed and resolved once, so three attackers in one tick give one death), but reject the turn-end settle, which would delay every kill in a fast duel.
Acceptance: a server test lands three hits on a 20-health defender in one tick (summed 8 + 7 + 6); the defender loses 21 and dies once, the kill event is emitted once, and a single-hit tick gives the same result as today's path.

## 1. Mechanism

- Hit. Every damaging effect calls `ApplyDamage` (uGearsUtils.pas 281). For a hedgehog it sets the last attacker (line 29), plays the hurt sound and adds a damage tag (35-36), and clamps the amount to what is left after the pending damage (300: `tmpDmg = min(Damage, max(0, Health - pending))`). For karma (gfKarma, not for self hits, 301, and only when the game flag `gfInvulnerable` is off and the active hog is not invulnerable) the active hog is credited with `tmpDmg` (319), and a vampiric heal of 80% of `tmpDmg` is applied to the active hog (305). Then the amount is added to the gear's pending `Damage` field (346). Nothing changes `Health` yet. The pending field is incremented at line 346 and a script hook `onGearDamage` is called with the amount (348).
- Amount scaling. `ModifyDamage` (264-279) multiplies the raw amount by the global modifier and percent: `modifier x dmg x attacker factor x percent x 0.01 x target factor`. Attacker factor is 1.5 when the active hog is king (272-273). Target factor is 0.5 when the target is king or frozen (276). Defaults are modifier 1 and percent 100 (uVariables.pas 2922, 2960).
- Damage round (CheckNoDamage, uGears.pas 81-133). This is the one place health changes for hogs. For each hedgehog gear: if not in a multi-shot, the karma is added to pending damage (92-93). If pending damage is non-zero and the hog is not invulnerable (94): health drops by the pending amount, clamped to 0 (98-105), a health tag is spawned and the team health is recounted (113-116), and the round reports "something happened" (96). Otherwise (no pending damage, or the hog is invulnerable), in king mode, a hog whose team has no king is set to 0 health (119-125). Then karma resets outside a multi-shot (127-128) and pending damage resets to 0 for every hog (129). The gate on line 89-90 limits the round to hogs when there is no infinite-attack flag, or when a hog is nearly still.
- Turn-end loop (ProcessGears, uGears.pas 342-372). The states run only when every gear is inactive (342). The state order is stInit, stDelay1, stChDmg, stSweep, ... (67). In `stChDmg` (356), `CheckNoDamage` is called (357). If it found damage, the state waits (362-365: 500 steps when not between turns and not in a multi-shot, 1500 otherwise) and returns to `stChDmg` through `stDelay1`. If it found nothing, the state moves on. `stSweep` (368-372) re-activates all gears when the sweep is dirty and returns to `stChDmg`. So damage is applied in rounds, each followed by a pause, until a round finds nothing, and a death or push caused by the round starts a new round.
- Explosion. `doMakeExplosion` (uGearsUtils.pas 94 onward) computes `dmgBase = 2 x Radius + cHHRadius div 2` (127). For each hog-kind gear it rejects far gears with a Manhattan prefilter (160), computes `dmg = dmgBase - round(distance)` (161), and if `dmg > 1` applies `ModifyDamage(min(dmg div 2, Radius))` (164) through `ApplyDamage` with `dsExplosion` (169). Unless the mask forbids touching, the gear is then pushed: `dX += sign(tdX) x (0.005 x dmg + cHHKick) / (Density/3)` and the same for `dY` (176-177), and set moving (179). The grave kind has its own copy of the same formula. If the world wraps (240), the explosion runs a second time near the edge (259 `until (not wrap)`).
- Shove (AmmoShoveImpl, uGearsUtils.pas 1320-1479). A hit by a shot pushes the gear with the ammo's direction times power: `dX = ammo.dX x Power x 0.01` (1444), or `x 0.005` for a king or frozen hog (1432). A minigun bullet adds to the velocity instead of replacing it. Some shot kinds pass a hit-order gate (1348, keyed by gear and an order number; the gate itself, uCollisions.pas 344-366, was only partly read).
- Fall. `CheckHHDamage` (454-484) is called from three hedgehog step sites (uGearsHedgehog.pas 1092, 1237, 1410; only the call lines were read). If the downward speed `dY` is above 0.4 (460), damage is `ModifyDamage(1 + round((dY - 0.4) x 70))` (462). Invulnerable hogs take no fall damage (476). The fall damage is charged to the hog's last attacker, or the active hog if there is none (480-482).
- Tick. The round is driven by the turn-end state machine, not by a per-tick loop. The pause is counted by `DoDelay`, which decrements once per call and returns true at zero (uGears.pas 135-142). The unit of one call (a game tick or a millisecond) was not read.

## 2. Key functions

- `CheckNoDamage`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGears.pas` 81-133. The damage round.
- `ProcessGears` turn-end states: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGears.pas` 342-372 (`stChDmg` 356-366, `stSweep` 368-372).
- `ApplyDamage`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGearsUtils.pas` 281-349. The hit path: pending add, karma, vampiric.
- `ModifyDamage`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGearsUtils.pas` 264-279.
- `doMakeExplosion`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGearsUtils.pas` 94-262 (damage 160-169, push 176-179, wrap 240-259).
- `CheckHHDamage`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGearsUtils.pas` 454-484.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hits add to a pending amount; one round subtracts it with a floor of 0 | Floor 0 (theirs, uGears.pas 99-105) |
| Pending is folded per hog once per round and reset | Reset to 0 (theirs, uGears.pas 129) |
| Repeat rounds with a pause until nothing is pending | Pause 500 (short) or 1500 (theirs, uGears.pas 76-77, 362-364) |
| Explosion damage falls with distance: base minus distance, halved, capped at the radius | Base = 2 x radius + 4 (theirs, uGearsUtils.pas 127; cHHRadius 9 at uConsts.pas 194 gives the 4); half (theirs, 164); distance rounded (161) |
| Explosion push per axis: damage term plus a small kick, divided by density over three | Kick 0.01 (theirs, uConsts.pas 634); term 0.005 (theirs, 176-177) |
| Fall damage from downward speed above a threshold, linear above it | Threshold 0.4 and slope 70 and base 1 (theirs, uGearsUtils.pas 460-462) |
| Scaled by a modifier and a percent, with a half factor for kings and frozen targets | Percent 100 (theirs, uVariables.pas 2960); modifier 1 (theirs, 2922); king attacker 1.5 (theirs, uGearsUtils.pas 272-273); king or frozen target 0.5 (theirs, 276) |
| Max health | Max health constant 268435455 (theirs, uConsts.pas 197); hog radius 9 (theirs, 194) |

Arithmetic from the formulas (not donor values): with radius 25 and distance 0, the damage is min(floor(54 / 2), 25) = 25; at distance 30 it is floor(24 / 2) = 12; at distance 52 it is 1. For a landing with dY = 0.5, the fall damage is 1 + round(0.1 x 70) = 8, in the donor's units of dY.

## 4. TypeScript sketch

simplified: the sketch keeps the pending-then-settle order of the damage round (karma folded in outside a multi-shot, floor of 0, invulnerable hogs skip the subtraction, king mode kills, pending reset), the loop that repeats rounds with a pause until nothing is pending, and the explosion, fall and modifier formulas. It omits the hit path's hurt sound and damage tags, the team health recount, the vampiric heal, the last-attacker bookkeeping, the poison and grave branches, the per-kind explosion cases, the world-wrap second pass, the hit-order gate, the sweep that re-wakes gears, and the gate that skips still-moving hogs in infinite-attack mode. It takes the modifier and percent as arguments (engine globals in the donor). `hwRound` is taken as `Math.round` (the donor's helper was not read).

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation.
interface Hog {
  health: number;
  pending: number;      // damage waiting for the damage round
  karma: number;        // damage reflected back to this hog, waiting to be added
  invulnerable: boolean;
  king: boolean;
  frozen: boolean;
  teamHasKing: boolean;
}

interface Rules { kingMode: boolean; modifier: number; percent: number; }

// Explosion damage falls with distance from the blast centre and is capped at the radius.
function explosionDamage(radius: number, dist: number, hogRadius = 9): number {
  const base = radius * 2 + Math.floor(hogRadius / 2);
  const raw = base - Math.round(dist);
  if (raw <= 1) return 0;
  return Math.min(Math.floor(raw / 2), radius);
}

// A downward landing speed above 0.4 hurts: 1 plus 70 per unit above the threshold, rounded.
function fallDamage(dY: number): number {
  return dY > 0.4 ? 1 + Math.round((dY - 0.4) * 70) : 0;
}

// Scale by the global modifier and percent. A king attacker adds half; a king or frozen target takes half.
function modifyDamage(dmg: number, attackerKing: boolean, targetKingOrFrozen: boolean, r: Rules): number {
  const attack = attackerKing ? 1.5 : 1;
  const target = targetKingOrFrozen ? 0.5 : 1;
  return Math.round(r.modifier * dmg * attack * r.percent * 0.01 * target);
}

// A hit only adds to the pending amount. Health does not move until the damage round.
function addPending(target: Hog, amount: number): void {
  target.pending += amount;
}

// One damage round over all hogs, in the donor's order. Returns true when nothing was pending.
function damageRound(hogs: Hog[], rules: Rules, multiShot: boolean): boolean {
  let nothingPending = true;
  for (const h of hogs) {
    if (!multiShot) h.pending += h.karma;
    if (h.pending !== 0 && !h.invulnerable) {
      nothingPending = false;
      h.health = h.health < h.pending ? 0 : h.health - h.pending;
    } else if (rules.kingMode && !h.teamHasKing) {
      h.health = 0;
    }
    if (!multiShot) h.karma = 0;
    h.pending = 0;
  }
  return nothingPending;
}

// Turn-end loop: round, pause, round again, until a round finds nothing pending.
// The pause is short only when it is not between turns and not inside a multi-shot.
function settleDamage(hogs: Hog[], rules: Rules, multiShot: boolean, betweenTurns: boolean,
                      pause: (steps: number) => void): number {
  let rounds = 0;
  for (;;) {
    rounds++;
    if (damageRound(hogs, rules, multiShot)) return rounds;
    pause(!betweenTurns && !multiShot ? 500 : 1500);
  }
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (parity row 1, duel step / sim). The adapted part is the same-tick aggregation: hits on one target in one server tick are summed and resolved once, with the server tick as the place where the single resolve is called (post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget"). The turn-end settle is not adopted.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only). The sketch is written from the mechanism.
- Brief rule served: 1 (one combat core, two clients). Hit aggregation keeps one resolve per target per tick, which is the one-ledger rule applied inside a tick.

## 6. Gaps and risks

- Settle at rest is wrong for us. The donor applies damage only when every gear is still (uGears.pas 342), with pauses of 500 or 1500 steps (362-364). A fast duel resolves per blow; a pause would make a kill feel late. Only the same-tick sum transfers.
- Karma and vampiric heal are donor toggles (gfKarma, uConsts.pas 254; uGearsUtils.pas 305). Karma reflects damage to the active hog; that would double-count in our one-ledger rules, so it is out.
- King mode kills a whole team when its king dies (uGears.pas 119-124), as coded. That is a team rule outside our rulings and is out.
- Invulnerable hogs lose their pending damage without a subtraction (94 and 129). If we keep the aggregation, invulnerability must be checked in the ledger and logged, not silently reset.
- The push is per axis with the same magnitude and only the sign of the offset (176-177), so every blast pushes diagonally regardless of angle. Do not copy this if any push is ported. The rulings already say the push is a state change, not a vector (see the Quake note's gap on momentum).
- Fall damage uses a downward speed threshold (460). In our engine the fall must be computed on the server from server-side motion. The donor computes it inside the engine step (its network model was not read), so this is a donor pattern to replace, not copy.
- Zones as data: the modifier and percent (uVariables.pas 2922, 2960) are match-level settings, so they fit zone data as per-encounter overrides; the 0.4 threshold, slope 70, kick 0.01 and the 1.5 and 0.5 factors are engine constants.
- Not read: the team health recount and the poison and grave branches, the per-kind explosion cases, `HealthMachine` (uGears.pas 163-224), and how the donor synchronises the damage round across network clients. Those are open; nothing above depends on them except the claim that the round runs at rest.
- GPL-2.0: clean-room only; the sketch is written from the mechanism and states the licence.
