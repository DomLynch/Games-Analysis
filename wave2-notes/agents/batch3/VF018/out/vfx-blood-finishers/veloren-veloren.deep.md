# veloren-veloren (vfx-blood-finishers, cell 3)

Donor: `/mnt/frankendom-donors/veloren-veloren/common/src/states/finisher_melee.rs` (with `common/src/states/utils.rs` ComboConsumption, `common/src/combat.rs` ScalingKind, `common/src/comp/combo.rs`, `common/systems/src/stats.rs`, and the finisher assets under `assets/common/abilities/`) | Licence: GNU GPL v3, as read in `LICENSE` ("GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"). Clean-room only | Rust (+ RON assets) | symbol `FinisherMelee` (state `Data::behavior`)

Checked: The hinted file (`voxygen/src/scene/particle.rs`) is the blood and particle path. I read its blood, death and hit-outcome arms, the particle manager and the shader motion for blood and death. Those are real, but the finisher is the stronger mechanism for this cell, so the note covers the finisher; the blood path is in section 6 only. Read in full: `common/src/states/finisher_melee.rs` (1-159), `common/src/comp/combo.rs` (1-40), `common/src/states/utils.rs` 1956-1977 (ComboConsumption), `common/src/combat.rs` 2023-2036 (ScalingKind), `common/src/comp/character_state.rs` 672 (is_stunned, one line), and assets `sword/heavy_guillotine.ron`, `sword/basic_mighty_strike.ron`, `axe/keelhaul.ron`, `axe/fracture.ron`, `hammer/judgement.ron`. Read in part: `common/src/combat.rs` 640-666 (combo gain and AdditionalDamage) and 1572-1592 (requirements, partial); `common/src/comp/ability.rs` 1405-1440 (requirement gate, enclosing function not named) and 3327-3350 (state built from the ability); `common/src/comp/melee.rs` 425-445 (scaling, head only); `common/systems/src/stats.rs` 176-192 (decay); `server/src/events/entity_manipulation.rs` line 2550 (grep hit only). Not read: the rest of `handle_scaling` (446 onward), the melee hitbox creation, `compute_precision_mult`, the other 13 finisher assets, the client display of combo. Confidence: high on the order of gate, spend and scale; high on the numbers in the three assets I read; medium on the stun bonus (the stunned definition is a one-liner); the zero-minimum NaN edge is my reading of Rust's `f32::min`, not run. Camera: not applicable.

Best transferable idea: a finisher is a combo-gated state: it is allowed only at a minimum combo, spends the combo on its single strike, and scales that strike by the combo spent, with an extra bonus only against a stunned target.
Decision (proposed): adapt - a combo-gated finisher fits our rules (engage is a state change, kills are server-verified, MAX_ATTACKERS = 3) and gives players a reason to hold combo for row 9. Adapt means: read one combo value for both the spend and the scale (the donor reads two), guard the zero-minimum case, and tie the stun bonus to our guard/stagger state (row 3) rather than a generic stunned flag.
Acceptance: In a duel, the finisher button is greyed at 11 combo and lit at 12 (minimum 12). A server test asserts: with minimum 1 and the Half rule, at 10 combo the hit deals 20 damage (2 per factor step, factor 10), the combo drops to 5, and the hit lands once even if the action tick runs twice; a stunned target takes an extra 100% of that hit.

## 1. Mechanism

- Activation gate: an ability is usable only if the combo counter is at least the minimum (`comp/ability.rs` 1427). The finisher also needs its energy cost (the keelhaul and judgement assets set energy 0; the sword assets set 20).
- Activation snapshot: the state copies the current combo into `combo_on_use` and the minimum, and starts in the buildup section (`comp/ability.rs` 3337-3350; `states/finisher_melee.rs` 28).
- Stage order (`states/finisher_melee.rs` 56-142): buildup timer, then the action section, then swing, then recover, then end.
- Action section, first tick (71-113): the state sets `exhausted = true` (74), so the strike is built once. It consumes combo (77-81). Then, if a scaling block exists (84-105): factor = `kind(combo_on_use, minimum)` (linear = value/norm, sqrt = sqrt of value/norm; `combat.rs` 2030-2033), capped at `max_factor` (91). The factor is applied to the attack (target Attack: `handle_scaling`, which computes `base + per_factor x factor`, `comp/melee.rs` 426) or to a buff's strength (target Buff: strength x factor, 97-103). Then the melee hitbox is inserted with a precision multiplier (107-113).
- Consumption rule (`states/utils.rs` 1965-1975): All spends the whole counter; Half spends `ceil(counter / 2)` (1969); Cost spends the minimum (1970). The event is `change: -(spent)`, sent to the server (1972-1974).
- Extra damage against a stunned target: a combat effect `TargetPoised` is true when the target's character state is `Stunned` (`combat.rs` 1590; `character_state.rs` 672). An `AdditionalDamage(f)` effect adds `amount x f x strength_modifier` as a second damage event (`combat.rs` 654-666; additional damage also subtracts from accumulated damage, 661).
- Combo gain: a hit with a `Combo(c)` effect adds `ceil(c x strength_modifier)` to the attacker's combo (`combat.rs` 646-653). The strength modifier source was not traced.
- Combo decay: after `COMBO_DECAY_START` = 7.5 s since the last change, the counter resets to 0 at once (`comp/combo.rs` 4; `common/systems/src/stats.rs` 181-190). Every combo change, including a spend, sets the clock (`comp/combo.rs` 28-34; applied by `server/src/events/entity_manipulation.rs` 2550).
- Worked numbers (from the assets and formulas; not run). Keelhaul: minimum 1, base damage 0, scaled damage 2 per factor, linear scaling capped at 20, Half rule. At 10 combo: factor = 10/1 = 10, damage = 0 + 2 x 10 = 20, spend = ceil(10/2) = 5, leaves 5. At 25 combo: factor = min(25, 20) = 20, damage = 40, spend = 13, leaves 12. Heavy guillotine: minimum 12, damage 50, no scaling, AdditionalDamage 1.0 on a stunned target (so 100 before armour and precision, if the additional damage equals the base 50). Judgement: minimum 20, damage 25, AdditionalDamage 2.5 on a stunned target. Fracture: minimum 1, Crippled buff strength 0.05 scaled by the factor, capped at 10 (so up to 0.5).
- Timing: basic mighty strike 0.2 s buildup, 0.1 s swing, 0.4 s recover. Keelhaul 0.2, 0.1, 0.3. Judgement 0.3, 0.2, 0.6 (from the asset lines read).
- Tick: the state is advanced once per tick by shared common code (`behavior`, 47-48); the combo spend is emitted with `emit_server` (`utils.rs` 1972-1975), so the server applies it.

## 2. Key functions

- `finisher_melee::Data::behavior`: `/mnt/frankendom-donors/veloren-veloren/common/src/states/finisher_melee.rs` 47-145 (stage machine; action section 71-126).
- `ComboConsumption::consume`: `/mnt/frankendom-donors/veloren-veloren/common/src/states/utils.rs` 1964-1977.
- `ScalingKind::factor`: `/mnt/frankendom-donors/veloren-veloren/common/src/combat.rs` 2029-2036.
- Gate: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/ability.rs` 1407-1429.
- Decay: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/combo.rs` 4, 28-34; `/mnt/frankendom-donors/veloren-veloren/common/systems/src/stats.rs` 181-190.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Activate only at a minimum resource level | minimum 12 (theirs, heavy_guillotine.ron 20; basic_mighty_strike.ron 16); minimum 20 (judgement.ron); minimum 1 (keelhaul.ron 21, fracture.ron 22) |
| Spend the resource on the strike, by a rule | All (default), Half = ceil(n/2) (theirs, utils.rs 1969; keelhaul.ron 27), Cost = minimum (utils.rs 1970) |
| Scale the strike by spend, capped | linear value/norm, cap 20 (theirs, keelhaul.ron 25); cap 10 on a buff (theirs, fracture.ron 26) |
| Per-step damage added to a zero base | 2 per factor step (theirs, keelhaul.ron 14) |
| Extra damage on a stunned target | x1.0 (heavy_guillotine.ron 16), x2.5 (judgement.ron 16) |
| Once-per-use strike | exhausted flag (theirs, finisher_melee.rs 74) |
| Combo decay window | 7.5 s (theirs, combo.rs 4), resets to 0 (stats.rs 188) |
| Stage timings | buildup 0.2-0.5 s, swing 0.1-0.2 s, recover 0.3-0.6 s (assets, see section 1) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (gate, then factor from the scaling, then the extra damage, then the spend). It fixes two things: one counter value is read for both the spend and the scale (the donor scales from the combo at activation and spends from the counter at the action tick, so they can disagree), and a zero minimum does not divide by zero. It omits: the stage machine and timings (fired in one call), the buff-target branch (Crippled strength scaling), the melee hitbox and precision multiplier, the energy cost, the combo gain from hits and the 7.5 s decay, the requirement effect (CombatRequirement::Combo), and the once-per-use flag (the caller calls once). The stun bonus uses a flat "stunned" boolean where the donor uses the Stunned character state.

```ts
// Licence: GPL-3.0 (donor LICENSE). Clean-room sketch from the described mechanism, not a translation of the donor lines.
export {};

type Consumption = "all" | "half" | "cost";

interface Scaling {
  target: "attack" | "buff";
  kind: "linear" | "sqrt";
  maxFactor: number;
}

interface Finisher {
  minimumCombo: number;
  consumption: Consumption;
  costPerUse: number;        // used only by the "cost" rule
  baseDamage: number;
  damagePerFactor: number;   // added per factor step when the attack is scaled
  scaling?: Scaling;
}

interface Fighter {
  combo: number;
}

interface FinisherResult {
  spent: number;
  factor: number;
  damage: number;
}

// Donor gate (ability.rs 1427): usable only when combo >= minimum.
function canActivate(f: Finisher, a: Fighter): boolean {
  return a.combo >= f.minimumCombo;
}

// Donor: factor = linear value/norm or sqrt(value/norm), capped at max_factor.
// Fix: the donor divides by the minimum, which is 0 for a zero-minimum finisher (0/0 = NaN, which then takes the cap).
function scaleFactor(s: Scaling, comboAtUse: number, minimum: number): number {
  if (minimum <= 0) return 0;
  const ratio = comboAtUse / minimum;
  const raw = s.kind === "linear" ? ratio : Math.sqrt(ratio);
  return Math.min(raw, s.maxFactor);
}

// Donor: "all" spends the whole counter, "half" spends ceil(counter / 2), "cost" spends the minimum.
function spendAmount(rule: Consumption, comboNow: number, cost: number): number {
  if (rule === "all") return comboNow;
  if (rule === "half") return Math.ceil(comboNow / 2);
  return cost;
}

// Fire once at the action tick. Fix: spend and scale both read the same counter value (the donor scales from the
// combo at activation but spends from the counter at the action tick, so they can disagree).
// stunBonus is the donor's AdditionalDamage factor for a stunned target (0 = none).
function fireFinisher(f: Finisher, a: Fighter, targetStunned: boolean, stunBonus: number): FinisherResult | null {
  if (!canActivate(f, a)) return null;
  const comboNow = a.combo;

  let factor = 0;
  let damage = f.baseDamage;
  if (f.scaling) {
    factor = scaleFactor(f.scaling, comboNow, f.minimumCombo);
    if (f.scaling.target === "attack") damage += f.damagePerFactor * factor;
  }
  if (targetStunned && stunBonus > 0) damage += stunBonus * damage; // donor: AdditionalDamage multiplies the hit

  const spent = Math.min(comboNow, spendAmount(f.consumption, comboNow, f.costPerUse));
  a.combo = comboNow - spent;
  return { spent, factor, damage };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/vf018-veloren-finisher-combo.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/finisher.ts` (a server-side finisher state in the one fight engine; the client only shows the button state and the hit).
- PARITY row 9 (finishers). The list hint was row 10 (hit impact/hitstop) because the hinted file is the particle path. The finisher is the mechanism that matches row 9; the blood path would be row 8 and is not written here.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room; shape only; no donor line copied; RON numbers used as reference values only)
- Brief rule served: kills are server-verified (the server spends the combo and applies the one hit); one ledger (combo spend is one server change); rule 9 of the parity list (finishers), and rule 4 of the addendum (Best transferable idea on every cell).

## 6. Gaps and risks

- Defect 1, two combo reads: the scale uses `combo_on_use` (snapshot at activation, `ability.rs` 3345; `finisher_melee.rs` 88) and the spend uses the counter at the action tick (`utils.rs` 1966). If the combo rises during the buildup, a Half or All finisher spends more than it scaled on. Not run. Fix: read once (the sketch).
- Defect 2, zero minimum: `scaleFactor` divides by the minimum; with a zero minimum and zero combo the donor gives 0/0 = NaN. Rust's `f32::min` returns the non-NaN operand, so the cap (max_factor) would be taken. No asset in the set I read uses a zero minimum. My reading, not run. Fix: guard (the sketch).
- Choice for Lead, not a defect: every combo change, including a spend, resets the 7.5 s decay clock (`comp/combo.rs` 34; `entity_manipulation.rs` 2550). So a finisher that spends combo also keeps the combo alive. Whether that is wanted is a design call. Not decided here.
- Stun bonus source: the donor's bonus is on the Stunned character state. Our stagger and guard state (row 3) is the nearest equivalent; the mapping is not decided here.
- Catalogue, not zones: the finisher numbers are per-ability catalogue values (row 20/21), not zone data. The `where` field in the sidecar says engine constant because the schema has no catalogue option; this is a known mismatch.
- Blood and death particles (the hinted file, not written as a note): the hit outcome emits 30 blood particles only when the target body `bleeds()` (`voxygen/src/scene/particle.rs` 408-431; `common/src/comp/body/mod.rs` 345-350), with the count multiplied by the graphics chance setting. The death outcome emits 40 particles (546-559). The blood colour is fixed red in the shader (`assets/voxygen/shaders/particle-vert.glsl` 602-612), not the victim's colour. Motion is closed-form in the vertex shader (`particle-vert.glsl` 135-191), so there is no per-frame CPU integration. The gravity term is `vec3(0, 0, -g * t)` inside a velocity, which makes the fall `-g t^2`, i.e. an acceleration of 2g (my arithmetic, not run; intended or not is not clear). The CPU keeps particles in an unbounded `Vec` with no cap (`particle.rs` 767-780). These are real and could be a separate blood note later.
- Screen effect (not written): the low-HP pulse overlay is `voxygen/src/hud/mod.rs` 1606-1618: the phase advances by `dt x 10 / clamp(hp%, 3, 7)` and the overlay shows below 10% HP. HUD is client-only, so it fits the rules as presentation.
- Not read: the melee hitbox creation, the precision multiplier, the other 13 finisher assets, the client combo display, the strength-modifier source.
- Licence: GPL-3.0, clean-room only.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room; shape only)
Brief rule served: kills are server-verified and the combo spend is one server change; receipts-not-reports (each number above has a receipt in `receipts.tsv`)
