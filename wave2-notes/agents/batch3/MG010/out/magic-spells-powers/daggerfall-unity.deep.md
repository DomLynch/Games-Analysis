# daggerfall-unity (magic-spells-powers, cell 22)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` (cost section, 2203-2381) | Licence: MIT (`/mnt/frankendom-donors/daggerfall-unity/LICENSE`, "MIT License", copyright 2009-2023 Daggerfall Workshop) | C# (Unity) | symbol `CalculateTotalEffectCosts`

Checked: read: FormulaHelper.cs 1976-2000 (CalculateTradePrice, buy branch read; sell branch 1990-1995), 2203-2243 (CalculateTotalEffectCosts), 2261-2342 (CalculateEffectCosts), 2345-2367 (ApplyTargetCostMultiplier), 2372-2381 (GetEffectComponentCosts), 2649 (trunc). DaggerfallSpellMakerWindow.cs 677-800 (inscribe and buy). DaggerfallSpellBookWindow.cs 256-272, 514-534, 978-1022 (list, buy-mode price, purchase). EntityEffectManager.cs 318-346 (ready-spell check, inside SetReadySpell at 312) and 384-395 (deduction path, inside CastNoAnimSpell at 367). EnemyMotor.cs lines 759 and 761 only, by grep (enemy ranged-cast gate; the surrounding method was not read). MagesGuild.cs 120-175 (service gates). EntityEffectBroker.cs 512-533 (GetGroupNames). Confidence: high on the cost formula (every line of it read, all callers of CalculateTotalEffectCosts that I opened are listed in section 2). Medium on "no stat-gated schools": I grepped `Assets/Scripts/Game` only, for MinimumSkill, SkillRequire, RequiredSkill, Requirement, reagent. Not read: SPELLS.STD loader, the bodies of the 40+ effect classes beyond the samples cited, PlayerEntity magicka regen, the animated cast path (EntityEffectManager 426 deduction, its method not read), `EffectSettings` validation.

## 1. Mechanism

Spell cost has two currencies, computed from the same effect list.

- Spell point (the pool, "magicka" in code) cost: computed from gold per effect, then summed. Order of steps as the code runs (`CalculateTotalEffectCosts`, 2203):
  (a) empty effect list returns zero, with no floor (2216-2217).
  (b) for each effect (2220-2227): `CalculateEffectCosts` returns gold and spell points for that effect; both are summed.
  (c) inside `CalculateEffectCosts` (2261): the caster's live skill for the effect's own magic school is read (player when no caster is given, 2274; the given caster otherwise, 2279).
  (d) gold for each supported component (2284-2330): duration (if the effect supports it), chance (if it supports it), magnitude (if it supports it; start = average of min and max, plus = average of plusMin and plusMax, 2317-2318). Each component: `trunc(OffsetGold + CostA * start + CostB * trunc(plus / perLevel))` (2372-2380).
  (e) if no component is supported (e.g. a teleport-type effect), a fixed fudge is added: the donor calls `GetEffectComponentCosts(MakeEffectCosts(60, 100, 160), 1, 1, 1, skill)`, which is 160 + 60 + 100 = 320 gold (2332-2334; my arithmetic, the donor does not write 320).
  (f) effect gold = sum of (d) and (e) (2338). Effect spell points = `gold * (110 - skill) / 400`, integer (2339). So a skill of 0 keeps 27.5% of the gold as points, skill 100 keeps 2.5%.
  (g) the target multiplier is applied to the summed gold and to the summed points (2231-2232): caster-only and touch x1.0, single target at range x1.5, area around caster x2.0, area at range x2.5 (2345-2367).
  (h) floor: when the vampire flag is set the points become 5 (2235-2236); otherwise points below 5 become 5 (2239-2240).
- Where the costs are used:
  - Spell maker (inscribing a spell, `DaggerfallSpellMakerWindow`): `UpdateSpellCosts` (677-698) recalculates gold and points; it is called from several places in the window (522, 988, 1010 in the same file). The buy button (740) first checks for a Spellbook item (750), then at least one effect, then `moneyAvailable < totalGoldCost` (766), then a name, then deducts the GOLD (779) and adds the spell (793). Points are NOT charged at inscription.
  - Spellbook buy list (`DaggerfallSpellBookWindow`): the list shows each known spell's points (256-272). In buy mode the price shown is `presentedCost = spellPointCost * 4` (522). Witches Festival halves it, minimum 1 (528-531). The real trade price is `CalculateTradePrice(presentedCost, quality, false)` (687), which uses the player's Mercantile skill and Personality (FormulaHelper 1976-2000). Purchase: Spellbook item required (983), gold check (987), deduct (1016), spell added (1020).
  - Casting: `SetReadySpell` (312) computes points for the caster (the player's skills unless the mod flag is set; enemies use player skills by default, comment at 322), stores them (328), and refuses the ready if `CurrentMagicka < cost` for the player, except god mode or a no-points flag (337-342). Points are deducted when the spell is cast (388, inside `CastNoAnimSpell`, 367).

## 2. Key functions

- `CalculateTotalEffectCosts`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 2203-2243. Sums per-effect costs, applies target multiplier, floor 5.
- `CalculateEffectCosts` (IEntityEffect overload): same file 2261-2342. Skill lookup, components, fudge, `gold * (110 - skill) / 400`.
- `GetEffectComponentCosts`: same file 2372-2381. `trunc(OffsetGold + CostA * starting + CostB * trunc(increase / perLevel))`. The `skillValue` parameter is passed in and never read (dead parameter).
- `ApplyTargetCostMultiplier`: same file 2345-2367. Multipliers 1.0, 1.5, 2.0, 2.5.
- `CalculateTradePrice`: same file 1976 (function start). Buy branch at 1996-2000 (mercantile and personality terms). The sell branch is 1990-1995 (not used for spells here). Function end not recorded.
- `SetReadySpell` (cast gate): `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/MagicAndEffects/EntityEffectManager.cs` 312-346.
- `CastNoAnimSpell` (point deduction, line 388): same file 367-395.
- Spell maker purchase: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/UserInterfaceWindows/DaggerfallSpellMakerWindow.cs` 677-698 (`UpdateSpellCosts`), 740-800 (buy button).
- Spellbook buy price: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/UserInterfaceWindows/DaggerfallSpellBookWindow.cs` 514-534 (price), 978-1022 (purchase).
- Effect station filter: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/MagicAndEffects/EntityEffectBroker.cs` 512-533 (`GetGroupNames`), with the flag test at 520.
- Guild gates: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Guilds/MagesGuild.cs` 120-175 (`CanAccessLibrary` 131; `CanAccessService` cases at 144-147: BuySpellsMages open, MakeSpells needs membership).

## 3. Numbers vs mechanism

| Reusable rule | Donor number (where it is) | Fast-fight reading |
|---|---|---|
| Gold per component: offset + A*start + B*(plus/perLevel) | Per effect curves, e.g. Heal Health magnitude (20, 28) (HealHealth.cs 34); Fortify Strength duration (28, 100) and magnitude (40, 120) (FortifyStrength.cs 34-35) | Curves are per effect type, so they are engine constants in Frankendom |
| No-component fudge | 320 gold (60, 100, 160 with 1, 1, 1) (FormulaHelper 2334) | Stops zero-cost effects like a pure utility; keep as a rule |
| Points from gold and skill | `gold * (110 - skill) / 400` (2339). Factor 0.275 at skill 0, 0.025 at skill 100 | Eleven-fold spread from skill; a mid-skill caster pays about 0.15 of gold |
| Point floor | 5 (2209, 2239) | A fixed minimum cost; what 5 means depends on pool size and regen (not read) |
| Target multiplier | 1.0 / 1.0 / 1.5 / 2.0 / 2.5 (2358-2365) | A ranged or area spell costs 1.5x to 2.5x; reasonable as data |
| Buy-list price | points x 4 (SBW 522); Witches Festival x 0.5, min 1 (529-531) | A price in coin that tracks points; the holiday is a zone/event number |
| Buy trade price | CalculateTradePrice buy side (2000) with Mercantile and Personality | Depends on player stats; not for Frankendom v1 |
| Editor magnitude range | 1 to 100 (DaggerfallEffectSettingsEditorWindow.cs 230-233) | Input bound for designers |

Illustrative (inputs made up, not donor data): one effect with magnitude start 10, plus 0, perLevel 1, on Heal Health (20, 28): gold = 20*10 + 28*0 = 200. Caster skill 50: points = 200*60/400 = 30; self target so no multiplier; floor not reached. Shop price = 30*4 = 120.

## 4. TypeScript sketch

simplified: keeps the donor order (per-effect components, fudge, per-effect points with each school's skill, summed, target multiplier, floor 5). Changes: (1) `perLevel` is clamped to at least 1 (donor divides with no guard); (2) skill is clamped to 0..100 (donor does not clamp); (3) the unused `skillValue` parameter and the unused `EffectCosts.Factor` are dropped; (4) the vampire flag and the holiday halving are reduced to the shop function; (5) `canReadySpell` applies to every caster and has a god-mode exemption only; the donor's `SetReadySpell` check is player-only, and enemies are blocked only at zero points (EnemyMotor 761); (6) the donor's "vampire minimum" is not modelled; (7) buy trade price (Mercantile/Personality) and the magic school list are omitted; (8) the sketch takes the caster's skill as an input instead of reading a live skill table. The sketch was typechecked on the VPS (`tsc --noEmit --strict --target es2020`, exit 0).

```ts
// Licence: MIT (donor: Daggerfall Unity, LICENSE copyright 2009-2023 Daggerfall Workshop). Shape adapted; numbers from donor FormulaHelper.cs.
type Target = 'self' | 'touch' | 'singleRange' | 'areaSelf' | 'areaRange';

// Fixed per effect type. Donor: EffectCosts { OffsetGold, CostA, CostB }.
interface CostCurve { offsetGold: number; costA: number; costB: number; }

// One supported component (duration, chance or magnitude) with this spell's settings.
// For magnitude the caller passes start = (min + max) / 2 and plus = (plusMin + plusMax) / 2, as the donor does.
interface Component { curve: CostCurve; start: number; plus: number; perLevel: number; }

interface EffectEntry {
  skill: number;          // caster's live skill for this effect's school
  duration?: Component;
  chance?: Component;
  magnitude?: Component;
}

const TARGET_MULT: Record<Target, number> = { self: 1, touch: 1, singleRange: 1.5, areaSelf: 2, areaRange: 2.5 };
const SP_FLOOR = 5;
const FUDGE_CURVE: CostCurve = { offsetGold: 160, costA: 60, costB: 100 };

function componentGold(c: Component): number {
  // Donor: trunc(OffsetGold + CostA * start + CostB * trunc(plus / perLevel)), no guard on perLevel.
  // Fix: perLevel clamped to at least 1 so a zero in data cannot divide by zero.
  const perLevel = Math.max(1, c.perLevel);
  return Math.trunc(c.curve.offsetGold + c.curve.costA * c.start + c.curve.costB * Math.trunc(c.plus / perLevel));
}

function effectCost(e: EffectEntry): { gold: number; sp: number } {
  let gold = 0;
  let hasComponent = false;
  for (const c of [e.duration, e.chance, e.magnitude]) {
    if (c) { hasComponent = true; gold += componentGold(c); }
  }
  // Donor: an effect with no supported component gets a fixed fudge (start 1, plus 1, perLevel 1).
  if (!hasComponent) gold += componentGold({ curve: FUDGE_CURVE, start: 1, plus: 1, perLevel: 1 });
  // Donor: gold * (110 - skill) / 400 with integer division. Fix: skill clamped to 0..100 (donor does not clamp).
  const skill = Math.min(100, Math.max(0, e.skill));
  const sp = Math.trunc((gold * (110 - skill)) / 400);
  return { gold, sp };
}

export function spellCost(effects: EffectEntry[], target: Target): { gold: number; sp: number } {
  // Donor: an empty spell costs 0 and skips the floor (early return before the floor check).
  if (effects.length === 0) return { gold: 0, sp: 0 };
  let gold = 0;
  let sp = 0;
  for (const e of effects) {
    const r = effectCost(e);
    gold += r.gold;
    sp += r.sp; // spell points are summed per effect, each with its own school skill
  }
  const m = TARGET_MULT[target];
  gold = Math.trunc(gold * m);
  sp = Math.trunc(sp * m);
  if (sp < SP_FLOOR) sp = SP_FLOOR;
  return { gold, sp };
}

// Donor SpellBookWindow: buy-list price = spell points * 4; halved on Witches Festival, minimum 1.
export function shopListPrice(sp: number, witchesFestival: boolean): number {
  let price = sp * 4;
  if (witchesFestival) {
    price = Math.trunc(price / 2);
    if (price === 0) price = 1;
  }
  return price;
}

// Donor EntityEffectManager (SetReadySpell, 337): refuse the ready when magicka is below the cost. Donor exempts god mode and enemies.
export function canReadySpell(magicka: number, sp: number, godMode: boolean): boolean {
  return godMode || magicka >= sp;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/specials.ts` (proposed name; the Frankendom repo was not read in this pass). A pure cost function that the server runs when a spell is readied and again when it is cast. Costs are data per spell, the function is engine code.
- Parity-checklist row 13 (specials). Costs feed the specials/spells catalogue row 21 fields (not a second row).
- Reuse tag: adapt-allowed (MIT; code may be adapted; keep the Daggerfall Workshop copyright notice if any text is copied)
- Brief rule served: 1 (one engine: the cost is a pure function the server can run, one ledger for the coin price); 7 (licence read: MIT, adaptation allowed)

Best transferable idea: Derive a spell's pool cost and its shop price from its effects, using a per-effect cost curve, a caster-skill discount `(110 - skill) / 400`, a target multiplier and a floor of 5, so new spells are data rows and not code.
Decision (proposed): adapt - take the cost function and drop the spell-maker UI; Frankendom spells are fixed catalogue rows, the field inscription flow is not needed for fast duels, and the coin price is one ledger entry, not a client-side charge.
Acceptance: In a duel the spell button shows a mana cost; the server refuses a cast when mana is below cost; a unit test asserts `spellCost` for three fixture spells (self, single-at-range, area-at-range) and checks the 5-point floor and the no-component fudge of 320 gold before the skill factor.

## 6. Gaps and risks

- Two costs: the donor charges gold once at inscription and points at each cast. Frankendom has one ledger. Decide one place where coin is spent (server) and keep points as a per-cast pool cost; do not charge both per cast.
- Skill is per school in the donor; Frankendom's duel skill table was not read in this pass. Until one exists, the sketch takes `skill` as an input and enemy casters need their own value. The donor uses player skills for enemy costs by default (EntityEffectManager 322); Frankendom should not copy that for mobs without deciding it.
- The donor does not clamp skill and divides by `perLevel` with no guard. Both fixed in the sketch; confirm the catalogue never stores a zero perLevel and never passes skill above 100 (the donor's skill cap was not read).
- The spell-point floor (5) is a fixed number in the donor; for a fast fight the pool size and regen decide whether 5 is cheap or dear (pool and regen not read in this cell).
- The donor's cast gate (EntityEffectManager 337) is player-only; enemies are blocked only at zero points (EnemyMotor 761). Frankendom should use one gate for all casters (sketch does this), so a mob cannot cast on empty.
- No stat gate on schools: the donor gates effects only by station flag (EntityEffectBroker 520) and guilds by rank and membership (MagesGuild 131-147). Schools gated by stats are NOT in this donor (searched `Assets/Scripts/Game` only). Do not claim the donor has them.
- No reagents: grep for "reagent" under `Assets/Scripts/Game` found no code. The donor's reagent-like cost is the Spellbook item (a gate, not a consumable). Reagents as items are not in this donor.
- The Witches Festival halving is a calendar event; for Frankendom this is a zone or event parameter, not a constant.
- Buy trade price depends on Mercantile and Personality (FormulaHelper 1996-2001). That makes the price depend on the buyer's stats; for v1 use the flat x4 list price.
- A donor comment says classic does not charge gold for a zero-component effect and calls it a bug (FormulaHelper 2331); the fudge is the donor's choice. Keep the choice, document it, and test it.
