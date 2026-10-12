# Card-Forge-forge (magic-spells-powers, cell 1)

Donor: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/zone/MagicStack.java` (plus `forge-game/.../ability/AbilityFactory.java`, `ability/ApiType.java`, `ability/effects/DamageDealEffect.java`, `ability/effects/ControlGainEffect.java`, `ability/effects/CounterEffect.java`, `mana/ManaPool.java`, and card scripts under `forge-gui/res/cardsfolder/`) | Licence: GPL-3.0 (LICENSE line 1 "GNU GENERAL PUBLIC LICENSE", line 2 "Version 3, 29 June 2007"; clean-room, shape only) | Java + card-script text | symbol `AbilityFactory.getAbility` / `MagicStack.resolveStack`

Checked: opened and read ApiType.java (1-60, 150-250), AbilityFactory.java (135-150, 200-230, 300-330, 366-369), DamageDealEffect.java (131-200), ControlGainEffect.java (91-190, 245-266), CounterEffect.java (61-125, 200-225), MagicStack.java (597-660, 724-782), ManaPool.java (89-120), and the whole of three card scripts (counterspell.txt, fireball.txt, blaze.txt). Not read: Cost.java and the payment path, parseAbilityCost (AbilityFactory 184-197), the X value resolution (Count$xPaid), the RaiseCost static, TokenEffect, the UnlessCost branch of CounterEffect (only its description, lines 52-53). The hasFizzled tail (766-782) was read in the fix pass. Depth: thin, because the cost and cast-time side was not read. Confidence: high for the spell-as-row path, the damage resolve and the control lease; medium for the fizzle rule. camera_scope: not a camera cell.

Best transferable idea: Store each spell as a data row that names one effect from a fixed registry plus its params, resolve it off a LIFO stack, and let a multi-target spell still hit its legal targets when only some are gone.
Decision (proposed): adapt - take the row-plus-registry shape and the partial-fizzle rule, not the Java classes or the card-script grammar. A new spell is one row when it reuses an existing effect name (DealDamage, GainControl, Counter); this is the "zones and spells as data" ruling. Resolution runs on the server inside src/fight, so the server, not the client, decides every hit.
Acceptance: a server test asserts that a 3-target X=10 spell gives each surviving target the even share (3 each, rounded down), that the same spell with one target gone gives each of the 2 survivors 5 (the divisor is the survivors), that a spell with one legal target left hits that one for the full X, and that a spell whose targets are all gone fizzles with no effect; a GainControl lease with expiry endOfTurn returns the creature to its owner at turn end.

## 1. Mechanism

- Spell data is a text row per card. Fields seen: `Name:`, `ManaCost:`, `Types:`, one or more `A:SP$ <API> | key$ value | ...` ability lines, `S:Mode$ ...` static lines, `SVar:<name>:<expr>` computed values, `Oracle:` text. Receipts: counterspell.txt 4 (`A:SP$ Counter | TargetType$ Spell | ValidTgts$ Card`), fireball.txt 4-5 and 7-10, blaze.txt 5 (`SVar:X:Count$xPaid`).
- Load: the ability string is split on `|` and `$` into a string-to-string map (AbilityFactory.java 367, `FileSection.parseToMap(... DOLLAR_SIGN_KV_SEPARATOR)`). The API name is looked up in the registry `ApiType` (AbilityFactory.java 94 calls `ApiType.smartValueOf`; ApiType.java 240 defines it and throws if the name is missing). Each registry entry names an effect class: DealDamage to DamageDealEffect (ApiType.java 70), GainControl to ControlGainEffect (ApiType.java 105). `ValidTgts` builds the target restriction (AbilityFactory.java 203).
- Cast: the ability is pushed on `MagicStack`, which the donor describes as LIFO (MagicStack.java 66, "They don't provide a LIFO queue, so had to use a deque").
- Resolve (MagicStack.resolveStack, from line 597): the stack is frozen while resolving. For a targeted spell the fizzle check runs first: `if (thisHasFizzled) { // Fizzle` (628). A spell whose targets are all invalid does nothing. A multi-target spell goes on while one target is still legal (comment 742). Invalid means the card changed or `!sa.canTarget(card, true)` (752). `hasFizzled` (MagicStack.java 766-782) then REMOVES the invalid targets from `sa.getTargets()` (777-780), so the effect only ever sees the survivors; it also has a `CantFizzle` param (766-770, Gilded Drake) and recurses into sub-abilities (773-775). A fizzled bestow or mutate spell still resolves as a creature spell (629-644). The fizzle outcome is computed at 617 and branched on at 628. Otherwise `AbilityUtils.resolve(sa)` runs the effect class (the branch is read, its line is not receipted).
- DealDamage resolve (DamageDealEffect.java 131-200): `dmg = calculateAmount(NumDmg)` (145, X comes from the SVar); targets come from `getTargetEntities` (177), which returns the survivors left by the fizzle check; if `DivideEvenly` is `RoundedDown`, `dmg = tgts.isEmpty() ? 0 : dmg / tgts.size()` (191), which is integer division, so the divisor is the SURVIVING targets, not all chosen ones; then a per-target damage map is built and dealt.
- GainControl resolve (ControlGainEffect.java 91-190): a target is skipped if it is not in play or `!tgtC.canBeControlledBy(newController)` (135). Control is taken with `tgtC.addTempController(newController, tStamp)` (153), a timestamped temporary controller. The `LoseControl` param chooses the end condition. For `EOT` the revert command goes on the end-of-turn list (184) and the stolen card gets an `SacMe` SVar of 6 (185; `EndOfCombat` does the same at 189). Nothing in forge-game reads `SacMe`: only the forge-ai heuristics do (for example AiBlockController.java 1302, SacrificeAi.java 83), as a hint that the AI may sacrifice or chump with the unit. The revert command returns control to the owner (removeTempController, 257), so the donor does NOT destroy the stolen unit. `LoseControl` may also be `StaticCommandCheck` (191-195), not in the list below. The revert command (getLoseControlCommand, 247-266) skips if `StaticAbilityCantGainControl.cantGainControl(c)` is true, otherwise removes the temporary controller and calls `controllerChangeZoneCorrection`.
- Counter resolve (CounterEffect.java 61-125): for each target spell, skip it if it is no longer on the stack (`si == null`), then `removeFromStack` (100). Destination defaults to Graveyard (265).
- Floating mana (ManaPool.java 89-107): `willManaBeLostAtEndOfPhase` returns false when the pool is empty, when a LoseMana replacement applies, or when `totalMana() != safeMana` is false (106), meaning every floating mana is in a colour the static keeps.

### MG table (rows read; cost and cast time were not read where marked)

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Counterspell | counter target spell | none (entry removed from stack, to graveyard by default) | 1 target (`ValidTgts$ Card`) | ManaCost `U U` (2) | none in the row; instant speed on the stack | target must still be on the stack | counterspell.txt:2,4; CounterEffect.java:100,265 |
| Blaze | X damage to any target | damage = X | X = mana paid (range not read) | ManaCost `X R` | none in the row | none stated | blaze.txt:2,4-5 |
| Fireball | X damage split evenly, rounded down | per target = floor(X / surviving targets); 0 if no targets | 0 to MaxTargets (SVar: players + permanents) | `X R`, +1 per target beyond the first (RaiseCost static) | none in the row | TargetMax = players + permanents | fireball.txt:4,5,7-10; DamageDealEffect.java:145,191 |
| GainControl (API) | steal a target until the named end | none | end set by LoseControl: EOT, EndOfCombat, Untap, LeavesPlay, LoseControl | from the card (not read) | until the named event | canBeControlledBy (135); cantGainControl check on revert (247-266) | ControlGainEffect.java:135,153,184-189 |
| Floating mana | per-player pool, emptied at end of phase unless kept | none | none | n/a | phase-bound | keep-colour list | ManaPool.java:89-107 |

### Strategy coverage, items (a) to (i)

- (a) casting model: the stack is LIFO and resolves in order; no cast time, channel or global cooldown appears in what was read. Not read: any cost-time field.
- (b) targeting: `ValidTgts`, `TargetMin`, `TargetMax` (AbilityFactory 203; Fireball row). Fizzle rule as above. Friendly-fire, reflect and absorb not read.
- (c) status ladder: only the GainControl duration was read. No diminishing-returns ladder found in the code read; not searched exhaustively.
- (d) mind effects: the control gain skips a target the new controller cannot control (135). No resist roll and no consent rule was found in the code read.
- (e) summons: not read (TokenEffect not opened).
- (f) dragons: none found in the code read.
- (g) schools and resistances: none found in the code read.
- (h) acquisition and (i) economy: not read.

Resource pools per character: the donor has no per-character pools. Mana is a player pool with floating mana (ManaPool.java 89-107).

## 2. Key functions

- `AbilityFactory.getAbility` (dispatch from text row): `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/ability/AbilityFactory.java` 94, 135-150, 200-230, 367.
- `ApiType.smartValueOf` and the registry: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/ability/ApiType.java` 70, 105, 240.
- `DamageDealEffect.resolve`: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/ability/effects/DamageDealEffect.java` 131-200 (145, 191).
- `ControlGainEffect.resolve` and its revert command: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/ability/effects/ControlGainEffect.java` 91-190 and 247-266.
- `CounterEffect.resolve`: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/ability/effects/CounterEffect.java` 61-125.
- `MagicStack.resolveStack` and the fizzle check: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/zone/MagicStack.java` 66, 597-660, 628, 724-760.
- `ManaPool.willManaBeLostAtEndOfPhase`: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/mana/ManaPool.java` 89-107.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Even split of one hit across targets, rounded down | Rounding is the string `RoundedDown` (fireball.txt 5); integer division (DamageDealEffect.java 191) |
| Spell with extra targets costs more | +1 per target beyond the first (fireball.txt 4 description; SVar IncreaseCost = TargetedObjects - 1 at line 10) |
| Max targets | players + permanents (fireball.txt 7-9) |
| Stop when no chosen target is legal | none (rule) |
| Timed control lease ends on a named event | the LoseControl value set (EOT, EndOfCombat, Untap, LeavesPlay, LoseControl) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order of checks (fizzle first, then the effect), divides by the surviving-target count, and keeps the lease as data. It omits the replacement hooks, the excess-damage branch, the Destination choice on counter, the UnlessCost branch, the SacMe AI hint that the donor attaches to an end-of-turn lease, the bestow/mutate continue-as-creature case, and the cost side. The divisor is the surviving (legal) targets, as in the donor (hasFizzled removes illegal targets first, MagicStack.java 777-780); the sketch also has the donor's `CantFizzle` row flag.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor.
type EffectName = "DealDamage" | "GainControl" | "Counter";
type ExpiryRule = "endOfTurn" | "endOfCombat" | "leavesPlay";

interface SpellRow {
  id: string;
  effect: EffectName;
  manaFixed: number;             // fixed part of the cost
  xPaid: boolean;                // X is the mana paid on cast
  targetMin: number;
  targetMax: number;
  extraTargetCost: number;       // mana added per target beyond the first
  divideEvenly: boolean;         // split X across the surviving targets, rounded down
  expiry?: ExpiryRule;           // only for GainControl
  cantFizzle?: boolean;          // donor CantFizzle param: the spell resolves even with no legal target
}

interface TargetState {
  id: string;
  alive: boolean;
  stillLegal: boolean;           // still a legal target at resolution
}

interface StackedCast {
  row: SpellRow;
  x: number;
  targets: TargetState[];
}

interface ResolveResult {
  fizzled: boolean;
  damage: Map<string, number>;
  controlLeases: { targetId: string; expiry: ExpiryRule }[];
}

// The donor's hasFizzled removes illegal targets from the spell's target list before the effect runs, so the
// divisor is the SURVIVING targets (MagicStack.java 777-780, DamageDealEffect.java 177). It omits the replacement hooks, the excess-damage
// branch, the counter's destination choice, the UnlessCost branch, and the 'SacMe' AI hint that the donor
// attaches to a lease that ends at end of turn, and the bestow/mutate continue-as-creature case.
function resolveCast(cast: StackedCast): ResolveResult {
  const result: ResolveResult = { fizzled: false, damage: new Map(), controlLeases: [] };
  const legal = cast.targets.filter((t) => t.alive && t.stillLegal);

  // Fizzle rule: a spell with targets fizzles only when no chosen target is still legal.
  if (cast.targets.length > 0 && legal.length === 0 && !cast.row.cantFizzle) {
    result.fizzled = true;
    return result;
  }

  if (cast.row.effect === "DealDamage") {
    const perTarget = cast.row.divideEvenly && legal.length > 0
      ? Math.floor(cast.x / legal.length)
      : cast.x;
    for (const t of legal) {
      result.damage.set(t.id, perTarget);
    }
  } else if (cast.row.effect === "GainControl" && cast.row.expiry !== undefined) {
    for (const t of legal) {
      result.controlLeases.push({ targetId: t.id, expiry: cast.row.expiry });
    }
  }
  return result;
}

export {};
```

Typecheck: copied to `/tmp/mg013-forge-spell-resolve.ts` on the VPS and run with `npx -p typescript tsc --noEmit --strict --target es2020` (exit 0).

## 5. Lands in

- TARGET `src/fight/spells.ts` (proposed new module; not checked against the Frankendom repo). The spell row is validated and resolved on the server. Parity-checklist row 13 (specials). The hint was row 22 (Pit-only), which does not fit: world spells are not Pit-only, so row 13 is the closer match.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room, shape only)
- Brief rule served: 1 (one engine, server-verified hits); zones and spells as data (ruling)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The text grammar and the Java classes are shape only; nothing is copied.
- The donor's divisor is the surviving legal targets (illegal ones are removed by the fizzle check first, MagicStack.java 777-780). A player who loses a target mid-stack gets a bigger share on the rest; keep this and test it. The sketch matches.
- The end-of-turn lease in the donor sets an `SacMe` SVar, but only the AI reads it; the revert command returns the unit to its owner (ControlGainEffect.java 257). Frankendom does the same: return to owner in server state, no destruction.
- The real fizzle rule is richer than "all targets gone": `CantFizzle` override, sub-ability recursion, and bestow/mutate spells that continue as creature spells. Add a `cantFizzle` row flag if a spell needs it (the sketch has one).
- No cast time, no cooldown and no per-character resource appear in the rows read. Frankendom needs cast time, cooldown and per-character pools (health, stamina, mana, focus) from its own rulings; the donor does not supply them.
- The donor's mana pool is a per-player floating pool. It does not transfer to per-character pools.
- The donor's own comment at CounterEffect.java 168 calls the ability detection "hacky". Do not copy that detection; match on the row id.
- Forge is a turn-based game with priority passes. Its numbers are not tuned for a fast mobile fight; nothing in the rows read gives a per-second value.

## 7. As-data shape (pass 2)

- Donor table: one text file per card under `/mnt/frankendom-donors/Card-Forge-forge/forge-gui/res/cardsfolder/<letter>/<card>.txt`.
- Row fields (name: type): `Name: string`; `ManaCost: mana string` (for example `X R`, `U U`); `Types: string`; `A:SP$ <API>: registry name plus key$value params` (keys seen: ValidTgts, TargetMin, TargetMax, NumDmg, DivideEvenly, LoseControl, Destination, SpellDescription); `S:Mode$ <mode>: static with params` (keys seen: ValidCard, Amount, Relative, EffectZone, Description); `SVar:<name>:<expr>: computed value` (Count$xPaid, TargetedObjects$Amount/Minus.1); `Oracle: text`.
- Cost: `ManaCost` string. Effect: the `A:` API name. Scaling: an SVar expression.
- Cast time: no field in the rows read. Cooldown: no field in the rows read.
- A new X is one row: yes, when X reuses an existing effect name (a new Fireball-style spell is a text row). No, when X needs a new effect (a new ApiType entry and an effect class are required). Not read: whether unknown keys are rejected by the loader.

## 8. Provenance and history

- Repo: Card-Forge-forge. Licence file: `/mnt/frankendom-donors/Card-Forge-forge/LICENSE` (GPL-3.0, line 1-2 as above).
- No history available: the donor copy has no `.git` (checked), and no changelog was opened.
- Comments that record a fix or a hack: CounterEffect.java 168 ("TODO: this is hacky... make the detection of this ability more robust and generic?"). MagicStack.java 456 mentions a forced update for the flashback zone (a hack); not read in full.

## 9. Rulings for Dom

1. Spells as rows that name one effect from a fixed registry, with no new effect names without review: yes or no? Recommendation: yes.
2. A multi-target spell where some targets are gone: legal targets still take the effect and the even split is over the survivors (the donor's rule), or the whole spell fizzles? Recommendation: keep the donor's rule.
3. A stolen unit with an end-of-turn lease: returns to its owner (the donor does this too; its SacMe flag is only an AI hint, not a destroy rule). Recommendation: return to owner.

Reuse tag: rewrite-from-idea (GPL-3.0)
Brief rule served: 1 (one engine, server-verified hits)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- SacMe claim unsupported: only forge-ai reads it; revert returns control to the owner, so the donor does not destroy the unit (confirmed by grep over the donor).
- Divisor question answered in the cited file: hasFizzled removes invalid targets, so the divisor is the surviving targets; sketch and acceptance divided by all chosen (confirmed).
- Fizzle outcome at 617, branch at 628; EndOfCombat also sets SacMe (189) (confirmed).
- Missed: CantFizzle param, sub-ability recursion, bestow/mutate continue as creature (766-775, 629-644); LoseControl=StaticCommandCheck (191-195) (confirmed).

Fixed 2026-10-12: SacMe description, Gaps bullet 3, Ruling 3, divisor everywhere (mechanism, MG table, section 3, acceptance, gaps, ruling 2), fizzle detail line, sketch now divides by surviving targets and has a cantFizzle flag (work/forge-spell-resolve.ts matched).
