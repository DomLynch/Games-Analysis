# freeciv-freeciv (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/common/combat.c` | Licence: GPL-2.0-or-later per combat.c header | C | symbol `win_chance / unit_win_chance / get_total_attack_power`

Checked: `win_chance` 334-406, `unit_win_chance` 480-496, `get_total_attack_power` 615-638, `get_modified_firepower` 411-474, all read in full (verified). `get_total_defense_power` (772), `get_attack_power` (540) and `defense_multiplication` (650) were not read.

## 1. Mechanism

- Closed-form odds for a round-based fight. Inputs: attacker strength and hit points and firepower (`as`, `ahp`, `afp`), defender strength, hit points, firepower (`ds`, `dhp`, `dfp`). Output: a double, the attacker's probability of winning the whole fight. Pure function, no RNG, no state.
- Each round, the attacker loses with probability `ds / (as + ds)` (50/50 when both are zero). A side dies when it has taken enough hits: the attacker survives `ceil(ahp / dfp)` lost rounds, the defender survives `ceil(dhp / afp)` lost rounds.
- `win_chance` sums, over every count of lost rounds below the attacker's limit, the probability of the series that ends with the attacker's last needed win. It uses an incremental binomial coefficient so each term is one multiply from the last. Result: a single probability, no simulation.
- `unit_win_chance` (480-496) feeds this with the total attack power (`get_total_attack_power`, 615-638: base attack from `get_attack_power`, not read, times an attack-bonus percent from effects), the total defence power, and the firepower after situational modifiers from `get_modified_firepower` (411-474): the attacker's firepower doubles for a city-buster against a unit in a city; a bad-wall attacker is clamped when the defender has a defence bonus; against a bad city defender in a city the attacker doubles and the defender is clamped; a low-firepower combat bonus clamps the defender; land bombardment clamps both. The defence power comes from `get_total_defense_power` (772, not read), and the attack power is evaluated against the defender's tile and city (626-635).
- Tick: not a tick. Called on demand (for a preview or an AI choice) and does not change state.

## 2. Key functions

- `win_chance`: `/mnt/frankendom-donors/freeciv-freeciv/common/combat.c` 334-406. The closed-form round-based win probability. The derivation comment is 343-387; the computation is 389-405.
- `unit_win_chance`: `/mnt/frankendom-donors/freeciv-freeciv/common/combat.c` 480-496. Wires power, hit points and modified firepower into `win_chance`.
- `get_total_attack_power`: `/mnt/frankendom-donors/freeciv-freeciv/common/combat.c` 615-638. Attack power times (100 + attack-bonus effects) / 100.
- `get_modified_firepower`: `/mnt/frankendom-donors/freeciv-freeciv/common/combat.c` 411-474. Per-matchup firepower clamps and doublings; the rules are data-driven through unit-type flags, effects and game settings.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Round win probability p = strength / (strength + other strength) | Both strengths are unit stats (theirs) |
| Rounds to kill = ceil(hp / other firepower) | Firepower per unit type (theirs, data) |
| Closed-form fight odds by summing binomial series | No constants; pure math |
| Attack power x (100 + bonus %) / 100 | Attack bonus effects (theirs, data-driven) |
| Firepower clamp for a matchup | `low_firepower_badwallattacker`, `_pearl_harbor`, `_combat_bonus`, `_nonnat_bombard` game settings (theirs, 441, 449, 458, 471-472) |

## 4. TypeScript sketch

simplified: the sketch computes only the closed form; it omits the firepower modifiers, the effect-based attack and defence power, and the case where firepower is zero (the donor divides by it unchecked at 337-338). Terms are accumulated by an equivalent multiplication order (the donor carries the coefficient, the loss power and the base in one running product).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Attacker's chance of winning a round-based fight, from strength, hit points and firepower.
function winChance(as: number, ahp: number, afp: number, ds: number, dhp: number, dfp: number): number {
  const attLimit = Math.ceil(ahp / dfp);          // lost rounds the attacker can absorb
  const defLimit = Math.ceil(dhp / afp);          // wins the attacker needs
  const pAttLoses = as + ds === 0 ? 0.5 : ds / (as + ds);
  const pAttWins = 1 - pAttLoses;

  // Series: the attacker wins defLimit rounds, with lr losses before the last win.
  const base = Math.pow(pAttWins, defLimit - 1);
  let comb = 1;                                   // C(defLimit - 1 + lr, lr), built incrementally
  let total = base;
  for (let lr = 1; lr < attLimit; lr++) {
    comb = (comb * (defLimit - 1 + lr)) / lr;
    total += base * comb * Math.pow(pAttLoses, lr);
  }
  return total * pAttWins;                        // the last round is a win
}

// Example use: a preview of the odds before a fight starts; does not change state.
function oddsPreview(attackPower: number, attackHp: number, attackFp: number,
                     defPower: number, defHp: number, defFp: number): number {
  return winChance(attackPower, attackHp, attackFp, defPower, defHp, defFp);
}
```

## 5. Lands in

- TARGET `src/fight/odds.ts` (new module, fight engine): the exact odds of a fight for a preview, a test oracle for the duel step, or an AI choice. Parity-checklist row 1 (duel step / sim) as the oracle, and row 2 (AI brain) for the choice. It must not decide any result; kills stay server-verified.
- today: the shared engine entry is `src/fight/fight.ts` (`createFight`, checked in worktree `frankendom-backend`, commit 46e670530); `src/duel.ts` and `src/combat.ts` (both moving to `src/fight/`) hold the duel and combat helpers.
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; the donor's derivation comment is not copied.
- The model assumes independent rounds with fixed per-round odds. Frankendom's duel has windups, parry, stagger and a stamina economy, so the round model is an approximation; it would not match the live fight without a calibration.
- If odds are ever shown (HUD, checklist row 14), they must come from the server's number, not a client recomputation, so the one ledger and the display agree.
- The donor's firepower and modifier rules are per-matchup data. Frankendom has no firepower stat; do not add one from this file.
- The function is pure and needs no server state. Its risk is misuse: a client-computed odds value must not feed a server result.
