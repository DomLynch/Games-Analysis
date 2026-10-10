# Card-Forge-forge (combat-sim, cell 2)

Donor: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/combat/Combat.java` (with `forge-ai/src/main/java/forge/ai/ComputerUtilCombat.java`, `forge-game/src/main/java/forge/game/card/Card.java`, `forge-game/src/main/java/forge/game/phase/PhaseHandler.java`) | Licence: GNU GPL version 3 (root `LICENSE`, lines 1-2 "GNU GENERAL PUBLIC LICENSE" / "Version 3, 29 June 2007"; Combat.java header "Forge: Play Magic: the Gathering."). GPL-3.0 means clean-room, shape only | Java (Magic: the Gathering rules engine) | symbols `Combat.assignAttackersDamage`, `Combat.assignBlockersDamage`, `ComputerUtilCombat.distributeAIDamage`, `ComputerUtilCombat.getEnoughDamageToKill`

Checked: Read in full: `Combat.java` 705-759 (blocker damage), 761-904 (attacker damage), 906-939 (first-strike and regular damage flags, assign, deal); `PhaseHandler.java` 321-344; `ComputerUtilCombat.java` 2017-2119 (AI split), 2135-2198 (kill amount, damage to kill); `Card.java` 6109-6124, 6207-6232 (lethal, assigned damage). Partly read: `Combat.java` 486-503 (ordering at declare blockers); `PlayerControllerAi.java` 221-224 (AI entry point); `PlayerController.java` 111 (signature only). Not read: `predictDamageTo` (the prevention prediction used for kill amounts), `Card.getNetCombatDamage`, `AiBlockController.orderBlockers`, `game.getAction().dealDamage`, the human controller's split prompt, `Combat.java` 1-485 apart from the ordering lines. Confidence: high on the order of steps and the branch logic of the AI split as written; medium on what the prevention prediction does to kill amounts (not read). The sketch's behaviour was run on the VPS with compiled JS (examples in section 4), not only read.

## 1. Mechanism

Combat damage is decided in two stages per damage step. Stage A assigns: each attacker, then each blocker, works out its damage and, when it has more than one target, splits that damage across an ordered list of targets. Nothing is applied during Stage A. Stage B deals: `dealAssignedDamage` hands the whole damage map to the engine in one call. So all hits in a step land together.

Order of steps for an attacker blocked by several creatures:
- (a) Order is set at declare blockers. With more than one blocker and the legacy ordering rule on, the attacking player's controller orders the blockers (Combat.java 493-501). Otherwise the blockers keep their list order (494-495).
- (b) Damage = the attacker's net combat damage (Combat.java 781). If that is 0 or less the attacker is skipped (782-785).
- (c) The split is asked of the assigning player's controller (Combat.java 877). The AI controller calls `distributeAIDamage` (PlayerControllerAi.java 223).
- (d) AI split, several targets (ComputerUtilCombat.java 2076-2103). For each target in order, take its kill amount (2082). If that fits in what is left, assign it and subtract (2083-2085). If it does not fit, assign the smaller of its remaining lethal and what is left (2088-2089), subtract, and stop when nothing is left (2091-2092). Leftover: with trample it goes to the defending player (2097-2099); without trample it is added to the last target (2100-2101).
- (e) AI split, one target (2056-2074). Without trample the target takes all the damage (2058, 2074). With trample it takes its kill amount if affordable, otherwise the smaller of its lethal and what is left (2061-2066), and the rest goes to the defending player (2068-2072).
- (f) Kill amount (`getEnoughDamageToKill`, 2154-2178). Base: `getDamageToKill` (2188-2198), which is the excess value, i.e. max(0, getLethalDamage) (Card.java 6131-6136). A deathtouch source needs 1 (2161-2162). Indestructible or shielded targets cannot be killed by this hit (2157-2159). Otherwise it returns the smallest amount whose predicted damage (after prevention) reaches the kill amount (2165-2175), or max + 1 if none (2177).
- (g) `getLethalDamage` (Card.java 6117-6124) = lethal minus damage marked minus damage assigned this step. Lethal is toughness, or power when lethal is by power (6109-6114). `getLethalDamage` returns 0 once a deathtouch source has assigned damage (6119-6122).
- (h) Steps. The first-strike step assigns and deals only for first-strike and double-strike creatures (PhaseHandler 321-331; Combat.java 912). The regular step deals for double-strike creatures and for creatures that did not already deal first-strike damage (909-915). The list of first-strike dealers is cleared after the regular step (921-923).

The human player's split goes through the abstract `PlayerController.assignCombatDamage` (PlayerController.java 111). The human UI was not read.

## 2. Key functions

- `assignBlockersDamage`: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/combat/Combat.java` 705-759 (each blocker's damage to its ordered attackers; calls the controller at 746).
- `assignAttackersDamage`: same file, 761-904 (each attacker; trample and unblocked branch 848-875; ordered split at 876-900).
- `assignCombatDamage(boolean)` and `dealAssignedDamage`: same file, 918-939 (assign attackers then blockers, then one deal).
- `dealDamageThisPhase`: same file, 906-916 (who deals in which step).
- `PhaseHandler` damage cases: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/phase/PhaseHandler.java` 321-344.
- `distributeAIDamage`: `/mnt/frankendom-donors/Card-Forge-forge/forge-ai/src/main/java/forge/ai/ComputerUtilCombat.java` 2017-2119 (the split: one target, several targets, banding).
- `getEnoughDamageToKill` and `getDamageToKill`: same file, 2135-2198.
- `getLethal`, `getLethalDamage`, `addAssignedDamage`, `getTotalAssignedDamage`: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/card/Card.java` 6109-6124, 6207-6232.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Lethal-first split: pay each target its kill amount in order while it fits | Kill amount = toughness minus damage marked minus damage assigned this step (theirs, Card.java 6124) |
| If the next target cannot be killed, give it the smaller of its lethal and what is left, then stop | Stop when nothing is left (theirs, ComputerUtilCombat.java 2091-2092) |
| Leftover: overflow to the defending player when the attacker can overflow, otherwise to the last target | Trample overflow only (theirs, 2098-2101) |
| Hits that cannot kill: no kill amount | Indestructible or shield means max + 1 (theirs, 2157-2159, 2177) |
| Deathtouch source: a kill costs 1 | 1 (theirs, 2161-2162) |
| Destroy-when-damaged marker: a kill costs 1 | 1 (theirs, 2193-2194) |
| Two-stage: assign everything, then deal once | Deal call once per step (theirs, PhaseHandler 327-342; Combat.java 935) |
| First strike is its own damage step | Step names (theirs, PhaseHandler 321) |

## 4. TypeScript sketch

simplified: keeps the donor's lethal-first order, the kill-amount rule, the stop when nothing is left, the trample overflow and the last-target rule, and the deathtouch and unkillable cases. It takes the toughness, marked damage and assigned damage as plain inputs instead of reading a game state. It omits the prevention prediction (the donor predicts damage after prevention to find the kill amount, ComputerUtilCombat.java 2165-2175; this sketch assumes raw damage), the deathtouch-already-assigned rule on lethal (Card.java 6119-6122), the banding and defensive-formation branch (ComputerUtilCombat.java 2104-2117), the human ordering prompt, Planeswalker and battle targets, the first-strike split, and the zero-entry writes into the map (the donor writes them; the engine ignores non-positive amounts). It also drops the two-stage map: the caller here applies the returned split once.

I ran the compiled sketch on the VPS with these inputs (targets A 2, B 3, C 4 unless noted): 5 damage gives A 2 and B 3 and nothing else; 6 damage with trample gives A 2, B 3, C 1 and 0 to the defender (lethal to every blocker comes first, as in the donor); a deathtouch 3 gives 1 each; 10 damage gives A 2, B 3, C 5; 4 damage into a shielded S (unkillable) then B gives S 2 and B 2.

```ts
// Clean-room sketch: lethal-first split of one damage pool across an ordered list of targets.
// Shape only, written from the described mechanism; donor licence GPL-3.0 (Forge). Not a line-by-line translation.

export interface Target {
  id: string;
  toughness: number;          // damage needed to die, before damage already on it
  damageMarked: number;       // damage already on this target
  assignedThisStep: number;   // damage already assigned to it earlier in this step
  unkillableByHit: boolean;   // indestructible or shielded: this hit cannot kill it
}

export interface Split {
  byTarget: Map<string, number>; // positive entries only
  toDefender: number;            // trample overflow (0 without trample)
}

function lethalLeft(t: Target): number {
  return Math.max(0, t.toughness - t.damageMarked - t.assignedThisStep);
}

// Damage that kills this target: 1 for a deathtouch source, Infinity when this hit cannot kill it.
function killAmount(t: Target, deathtouch: boolean): number {
  if (t.unkillableByHit) return Infinity;
  return deathtouch ? 1 : lethalLeft(t);
}

export function splitDamage(damage: number, ordered: Target[], trample: boolean, deathtouch: boolean): Split {
  let left = damage;
  const byTarget = new Map<string, number>();
  const add = (id: string, n: number): void => {
    if (n > 0) byTarget.set(id, (byTarget.get(id) ?? 0) + n);
  };

  for (const t of ordered) {
    if (left <= 0) break;
    const need = killAmount(t, deathtouch);
    if (need <= left) {
      add(t.id, need);                       // enough to kill: give exactly that, move on
      left -= need;
    } else {
      const give = Math.min(lethalLeft(t), left); // cannot kill: the least that is still lethal, or all that is left
      add(t.id, give);
      left -= give;
    }
  }

  let toDefender = 0;
  if (left > 0) {
    if (trample) toDefender = left;          // overflow to the defending player
    else if (ordered.length > 0) add(ordered[ordered.length - 1].id, left); // else flush into the last target
  }
  return { byTarget, toDefender };
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (new module, engine damage step): the one place that splits a hit across several targets. Parity-checklist row 1 (duel step / sim). The split is computed as a plan, then applied once to the ledger on the server.
- today: `src/combat.ts` (moving, per the Quake note). Cleave or multi-target moves do not exist there yet.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only; this sketch is written from the mechanism)
- Brief rule served: 1 (one combat core, two clients): the split and the kill decisions live in the engine; the client only shows the result.

Best transferable idea: a lethal-first split of one damage pool across an ordered list of targets (pay each its kill amount while it fits, the rest goes to the last target or overflows), decided as a plan and applied once.
Decision (proposed): adapt — a single cleave or multi-target hit needs one rule for who dies and how much of the hit is left, and the donor's order-then-stop rule gives one; adapt because the donor's order comes from the AI or a prompt, its trample overflow is an MTG rule, and its prevention prediction is out of scope for a fast game.
Acceptance: server test: a 5-point cleave over enemies A (2 hp), B (3 hp), C (4 hp), in that order, kills A and B and leaves C at 4 hp; a 10-point cleave kills all three, with C taking the 5 left over; a shielded enemy in the list takes its lethal share and is not killed.

## 6. Gaps and risks

- The donor's order is chosen by the AI (`AiBlockController.orderBlockers`, not read) or by a human prompt (not read). Frankendom must pick one source of order (engine rule or player choice, validated on the server), not both.
- Kill amounts here use raw toughness. The donor's kill amount is after prevention and shields (predictDamageTo, not read). Frankendom's guard and parry (row 3) act before damage, so a shield-like skip inside the split is not needed; say so in the rule.
- Forge writes damage into a map and deals once per step. That matches one ledger, but Frankendom's kills are server-verified: the plan must be computed and applied on the server, and the client must never write health.
- The trample overflow rule (lethal to every blocker first) is an MTG rule. Only include an overflow move if the design has one; otherwise the leftover goes to the last target.
- MAX_ATTACKERS = 3 limits attackers, not targets. This split is for one attack against several targets. Check it against the ruling before a hero cleave is added.
- The first-strike and double-strike steps are MTG timing. Frankendom's duel step (row 1) owns timing; do not port the steps, only the split.
- Licence GPL-3.0: clean-room, shape only. The sketch has no donor lines.
- Not read: `predictDamageTo`, `Card.getNetCombatDamage`, `AiBlockController.orderBlockers`, `game.getAction().dealDamage`, the human split prompt, and the rest of `Combat.java` (1-485).

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one combat core, two clients)
