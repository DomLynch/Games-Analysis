# ModernUO (magic-spells-powers, cell 22)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Base/MagerySpell.cs` (skill window, mana table, resist, 1-116), with `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Base/Spell.cs` (reagent consume 260-263, scale mana 633-652, cast sequence 736-770), `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Skills/SkillCheck.cs` (skill window ramp 56-75), `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Skill Items/Magical/Spellbook.cs` (bit per spell, 598-603), `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Context Menus/AddToSpellbookEntry.cs` (scroll to book, 26-57), `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/GenericBuy.cs` and `BaseVendor.cs` (coin price, 1353) | Licence: GPL-3.0 (`/mnt/frankendom-donors/ModernUO/LICENSE`, "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; copyright 2019-2020 ModernUO Development Team) | C# | symbol `MagerySpell.GetCastSkills`

Checked: read: `UOContent/Spells/Base/MagerySpell.cs` 1-116 (whole file: mana table, skill table, cast skills, resist, cast delay); `UOContent/Spells/Base/Spell.cs` 255-275 (reagent consume), 615-663 (cast skill check, mana scale), 690-790 (cast delay, check sequence, mana and reagent order, cast); `UOContent/Spells/Reagent.cs` 1-133 (whole file: 17 reagent types); `UOContent/Spells/Base/SpellInfo.cs` 1-109 (reagent list and amounts); `UOContent/Spells/Base/SpellCircle.cs` 1-14; `UOContent/Skills/SkillCheck.cs` 36-107 (location check ramp, read in full for the window branch); `Projects/Server/Mobiles/Mobile.cs` 8091 (delegate); `Projects/Server/Items/Container.cs` 744-768 (ConsumeTotal, all-or-nothing); `UOContent/Items/Skill Items/Magical/Spellbook.cs` 141-150, 218-232, 598-603; `UOContent/Items/Skill Items/Magical/Scrolls/SpellScroll.cs` 1-63 (whole file); `UOContent/Context Menus/AddToSpellbookEntry.cs` 1-59 (whole file); `UOContent/Mobiles/Vendors/GenericBuy.cs` 12-85 (price); `UOContent/Mobiles/Vendors/BaseVendor.cs` 1346-1363; `UOContent/Engines/Factions/Core/Town.cs` 145-162; `UOContent/Mobiles/Vendors/GenericSell.cs` 12-20, 83; `UOContent/Mobiles/Vendors/SBInfo/SBMage.cs` 16, 40 and `SBAlchemist.cs` 26-33, 46-51 (prices); `UOContent/Spells/First/MagicArrow.cs` and `Heal.cs` (circle and reagents). Confidence: high on the skill window, mana, reagent and cast order, and the price code (all read in full). High on the reagent-before-mana order (read the sequence). Medium on the default era: both the pre-ML and ML skill tables exist and the `Core.ML` default was not read, so the pre-ML table is quoted and the ML table is shown beside it. Not read: `CastDelaySecondsPerTick` and `CastDelayMinimum` values, the anti-macro location check inside `CheckSkill(from, skill, loc, chance)`, the mana pool formula (`ManaMax` in Mobile.cs was not read), the arcane gem class, the `DisturbType` interrupt rules, the spell-scroll price (no scroll price was found in the vendor code read). Searched: `grep -rn "Intelligence" UOContent/Spells` gives only one comment (Mysticism), so no spell is gated by a stat. No spellmaking exists: spells are fixed classes registered by id (SpellRegistry), and a spellbook holds up to 64 of them as a bit mask.

## 1. Mechanism

Access to a spell is a skill window; the window is different for a spellbook and for a scroll. Cost is mana from a table by circle, plus reagents (all or nothing) from the backpack. Arcane gems can pay for reagents.

- Skill window (`MagerySpell.cs` 30-43): `min = _requiredSkill[ Scroll == null ? Circle + 2 : Circle ]`, `max = min + 40`. Pre-ML table, index 0 to 9: -50, -30, 0, 10, 20, 30, 40, 50, 60, 70 (line 17). So a spellbook casts from index circle+2, and a scroll from index circle, two table steps lower.
- Ramp (`SkillCheck.cs` 60-70, read): value below min fails; value at or above max succeeds; between them the chance is `(value - min) / (max - min)`, then the location check runs (not read).
- Mana (`MagerySpell.cs` 8, 45; `Spell.cs` 633-652): table by circle `4, 6, 9, 11, 14, 20, 40, 50`. A wand costs 0. The scalar starts at the Mind Rot scalar (`MindRotSpell.GetMindRotScalar`, Spell.cs 635-640; 1.0 when the caster has no Mind Rot), then lower mana cost (AOS attribute, capped at 40 percent) is subtracted: `mana * (mindRot - min(lmc, 40)/100)`, truncated (Spell.cs 649-651).
- Reagents (`Spell.cs` 260-263): free if the cast is from a scroll, if the caster is not a player, if the lower-regeneration-cost roll passes, or in a duel. Otherwise `Caster.Backpack.ConsumeTotal(Info.Reagents, Info.Amounts) == -1`. The `SpellInfo` constructor read sets each reagent amount to 1 (`SpellInfo.cs` 85-90); no other constructor was read. `ConsumeTotal` (`Container.cs` 751-767) validates every slot first and removes only if all are present; it returns the index of the first short slot.
- Arcane gems (`MagerySpell.cs` 27-28): a magery spell may take `1 + circle` gem charges instead of reagents (1 on the SE era).
- Cast sequence (`Spell.cs` 736-770): (1) scaled mana; (2) fizzle checks; (3) reagent consume (line 750); (4) mana check (line 754); (5) frozen, calmed, skill check; (6) mana deducted (line 770), scroll or wand charge consumed.
- Resist (`MagerySpell.cs` 88-99, 61-86): the target's chance to resist is `max(MR/5, MR - ((caster skill - 20)/5 + (1 + circle)*5)) / 2` percent, clamped to 0 and 1, then rolled. Example at magic resist 100, caster 100, circle First: first term 20, second term 79, chance 39.5 percent.
- Cast delay (`MagerySpell.cs` 25, 101-114): base `(3 + circle) * CastDelaySecondsPerTick`; pre-AOS `0.5 + 0.25 * circle` seconds.
- Acquisition (`SpellScroll.cs`, `AddToSpellbookEntry.cs`): a scroll carries a spell id and is stackable. Double-click casts it (scroll route). Target a spellbook to add it: the book type must match (line 35), a duplicate is refused (40), the spell's bit in the book's `ulong` is set (48), and one scroll is consumed (50). A book holds `BookCount` spells, at most 64 (`Spellbook.cs` 228, 598-603).
- Coin (`GenericBuy.cs` 61-82; `BaseVendor.cs` 1353): a vendor's buy price is the base price times `(100 + town tax)` percent, rounded (`(m_Price * DefaultPrice + 50) / 100`), and the unscaled base price when the scalar is zero. Stock: mage spellbook 18 coin (SBMage 16), black pearl 5 (SBMage 40, also SBAlchemist 26), garlic, ginseng, spiders silk, sulfurous ash 3 each, stock 20 (SBAlchemist 28-33). `GenericSell.GetBuyPriceFor` is `1.90 * GetSellPriceFor` (`GenericSell.cs` 83); `GetSellPriceFor` is what the vendor pays the player (`BaseVendor.cs` 537). The function that uses `GetBuyPriceFor` at `BaseVendor.cs` 210 was not read.

## 2. Key functions

- `MagerySpell.GetCastSkills`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Base/MagerySpell.cs` 30-43 (window), table 15-17.
- `MagerySpell.GetMana`: same file 45.
- `MagerySpell.ConsumeReagents` (arcane gem fallback): same file 27-28.
- `MagerySpell.GetResistPercentForCircle` and `CheckResisted`: same file 47-99.
- `Spell.ConsumeReagents`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Base/Spell.cs` 260-263.
- `Spell.ScaleMana`: same file 633-652.
- `Spell.CheckCast` (skill check through `Caster.CheckSkill`): same file 615-629.
- `Spell.CheckSequence` (order of checks): same file 736-770.
- `Mobile_SkillCheckLocation` and `CheckLocation` (window ramp): `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Skills/SkillCheck.cs` 42-75.
- `Container.ConsumeTotal` (all-or-nothing): `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Container.cs` 744-768.
- `Spellbook.HasSpell`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Skill Items/Magical/Spellbook.cs` 598-603.
- `AddToSpellbookEntry.InternalTarget.OnTarget`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Context Menus/AddToSpellbookEntry.cs` 26-57.
- `SpellScroll.OnDoubleClick`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Skill Items/Magical/Scrolls/SpellScroll.cs` 39-62.
- `GenericBuyInfo.Price`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/GenericBuy.cs` 58-83.
- `BaseVendor.GetPriceScalar`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/BaseVendor.cs` 1353.

## 3. Numbers vs mechanism

| Rule | Donor number (where) | For a fast mobile fight |
|---|---|---|
| Skill window | min from table, max = min + 40 (MagerySpell 42) | A 40-point ramp. Below min a spell never works; above min+40 it always works. |
| Table, pre-ML (MagerySpell 17) | -50, -30, 0, 10, 20, 30, 40, 50, 60, 70 by index | Book index is circle + 2, so each circle asks 10 more points from Third up. |
| Table, ML (MagerySpell 16) | -46, -32, -18, -4, 10, 24, 38, 52, 66, 80 | Shows a different era; the ML/pre-ML default was not read. |
| Scroll offset | Scroll uses circle index: 50 points lower at First, 40 at Second, 20 from Third up (the two-step offset) | Scrolls are the skill-free route: a found item lets a low-skill caster cast above the book's window. |
| Worked example, book, Third circle, skill 50 | window 20 to 60 (index 4), chance (50 - 20)/40 = 75 percent | Playable: one number decides chance. |
| Worked example, scroll, Third circle, skill 50 | window 0 to 40 (index 2), 50 >= 40 so always succeeds | A scroll is a sure cast at that skill. |
| Mana table (MagerySpell 8) | 4, 6, 9, 11, 14, 20, 40, 50 by circle | Eight steps; the top two cost 40 and 50 per cast. |
| Lower mana cost | capped at 40 percent (Spell 644-649); scalar starts at the Mind Rot scalar (635-640), so a Mind Rot debuff changes cost | Caps the discount, so a full-discount build still pays 60 percent (when no Mind Rot). |
| Resist | (MR/5 or MR - (skill-20)/5 - 5(1+circle)) / 2 percent (MagerySpell 91-96) | Example in section 1: 39.5 percent at MR 100 vs skill 100, First circle. |
| Gem charges | 1 + circle (SE: 1) (MagerySpell 28) | A charge bank can replace reagents. |
| Reagent vendor price | 3 coin for garlic, ginseng, spiders silk, sulfurous ash; 5 for black pearl and bloodmoss (stock 20) | Heal (First, reagents garlic, ginseng, spiders silk) costs 9 coin per cast at vendor base price (Heal.cs 15-17). Magic Arrow (First, sulfurous ash) costs 3 coin (MagicArrow.cs 13). |
| Book capacity | 64 spells (bit mask in a ulong; Spellbook 228) | A book is a fixed-size set, not a growing list. |

## 4. TypeScript sketch

simplified: keeps the donor's order: the scroll and book index offset, the skill window ramp, the mana table with the capped lower mana cost, the resist term, the all-or-nothing reagent check, the spellbook bit with its type and duplicate checks, and the vendor price with the town scalar. Changes: (0) `scaledMana` takes the Mind Rot scalar as an optional argument (default 1.0), as the donor does; (1) the fixed cast order is shown as a function: mana check before reagents (the donor consumes reagents first, so reagents are lost on a mana shortfall, see section 6); (2) the wrong-type scroll add returns a reason instead of silently doing nothing; (3) the town scalar is an explicit branch, not `100 + tax ?? 0`; (4) the gem-charge fallback, the regeneration-cost roll, the duel exemption, cast delay, fizzle and the pre-ML/ML choice are not modelled (the table is the pre-ML one); (5) the location-based anti-macro check is not modelled; the sketch returns the chance. The sketch was typechecked on the VPS (`tsc --noEmit --strict --target es2020`, exit 0).

```ts
// Licence: GPL-3.0 (donor, LICENSE line 3). CLEAN-ROOM: written from the described mechanism only; no donor lines copied.
const MANA_BY_CIRCLE = [4, 6, 9, 11, 14, 20, 40, 50];                 // donor: _manaTable
const REQUIRED_SKILL_BY_INDEX = [-50, -30, 0, 10, 20, 30, 40, 50, 60, 70]; // donor: _requiredSkill (pre-ML branch)
const CAST_WINDOW = 40;                                                 // donor: max = min + 40
const LOWER_MANA_CAP = 40;                                              // donor: LowerManaCost capped at 40

// Scroll casts index the table at the circle; spellbook casts index at circle + 2 (higher requirement).
export function castSkillWindow(circle: number, fromScroll: boolean): { min: number; max: number } {
  const min = REQUIRED_SKILL_BY_INDEX[fromScroll ? circle : circle + 2];
  return { min, max: min + CAST_WINDOW };
}

// Donor CheckLocation: below min fails, at or above max succeeds, otherwise linear in between.
export function castChance(value: number, min: number, max: number): number {
  if (value < min) return 0;
  if (value >= max || min >= max) return 1;
  return (value - min) / (max - min);
}

// Donor ScaleMana: table value times (1 - lowerManaCost/100), lower mana cost capped at 40.
export function scaledMana(circle: number, isWand: boolean, lowerManaCost: number): number {
  if (isWand) return 0;
  const lmc = Math.min(lowerManaCost, LOWER_MANA_CAP);
  return Math.trunc(MANA_BY_CIRCLE[circle] * (1 - lmc / 100));
}

// Donor MagerySpell.GetResistPercentForCircle, returned as a 0..1 chance and clamped (donor: n <= 0 false, n >= 1 true).
export function resistChance(targetMagicResist: number, casterSkill: number, circle: number): number {
  const first = targetMagicResist / 5;
  const second = targetMagicResist - ((casterSkill - 20) / 5 + (1 + circle) * 5);
  const pct = Math.max(first, second) / 2;
  return Math.max(0, Math.min(1, pct / 100));
}

// Donor Container.ConsumeTotal: all-or-nothing. Validate every slot first, then remove.
// Returns -1 on success, else the index of the first short slot. Fix: the caller checks mana before calling this.
export function consumeAllOrNothing(bag: Map<string, number>, needs: string[], amounts: number[]): number {
  for (let i = 0; i < needs.length; i++) {
    if ((bag.get(needs[i]) ?? 0) < amounts[i]) return i;
  }
  for (let i = 0; i < needs.length; i++) {
    bag.set(needs[i], (bag.get(needs[i]) ?? 0) - amounts[i]);
  }
  return -1;
}

// Fixed order (the donor does reagents before the mana check, which can lose reagents on a mana shortfall):
// 1) scaled mana; 2) mana check; 3) reagents (scroll and wand casts are free); 4) deduct mana.
export function castOrder(
  mana: number, casterMana: number, reagentsOk: () => boolean
): { ok: boolean; reason: 'mana' | 'reagents' | null } {
  if (casterMana < mana) return { ok: false, reason: 'mana' };
  if (!reagentsOk()) return { ok: false, reason: 'reagents' };
  return { ok: true, reason: null };
}

// Vendor coin price. Donor GetPriceScalar: 100 + town tax inside a town, otherwise no scaling.
// Fix: explicit branch instead of the donor's `100 + t?.Tax ?? 0` (zero means "unscaled" by accident).
export function vendorPrice(basePrice: number, townTax: number | null): number {
  if (townTax === null) return basePrice;
  return Math.trunc((basePrice * (100 + townTax) + 50) / 100);
}

// Donor AddToSpellbookEntry: a scroll is added only to a matching book, not twice, and only inside the book's range.
// Fix: the wrong-type branch returns a reason instead of silently doing nothing.
export function addScrollToBook(
  book: { type: string; content: bigint; bookCount: number; bookOffset: number },
  scroll: { type: string; spellId: number }
): { result: 'added' | 'wrong-type' | 'duplicate' | 'out-of-range'; content: bigint } {
  if (scroll.type !== book.type) return { result: 'wrong-type', content: book.content };
  const bit = scroll.spellId - book.bookOffset;
  if (bit < 0 || bit >= book.bookCount) return { result: 'out-of-range', content: book.content };
  if ((book.content & (1n << BigInt(bit))) !== 0n) return { result: 'duplicate', content: book.content };
  return { result: 'added', content: book.content | (1n << BigInt(bit)) };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/specials.ts` (proposed name; the Frankendom repo was not read in this pass). The spell access rule (window, scroll route), the cast order (mana, then cost, then deduct) and the resist roll are server functions. Spells are catalogue rows.
- Parity-checklist row 13 (specials).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only; no donor code may be copied)
- Brief rule served: 1 (one engine: the window, the roll and the cost are server functions); 7 (licence read: GPL-3.0, clean-room only)

Best transferable idea: Gate a spell by a skill window (zero chance below its minimum, certain above minimum plus 40, linear between), and let a scroll use the spell at a window two table steps lower, so a found item is a skill-free route to a spell the player has not trained.
Decision (proposed): adapt - take the window ramp and the scroll offset as the access rule for specials, and drop the item reagents (17 reagent items with vendor stock) for Frankendom v1; a cost in mana per cast is enough for a fast fight.
Acceptance: A Third-circle special cast from a book at skill 50 succeeds on a server roll at 75 percent (window 20 to 60); the same special from a scroll succeeds every time at skill 50 (window 0 to 40); a unit test asserts `castSkillWindow` and `castChance` for both routes and checks that a mana shortfall is refused before any reagent or charge is spent.

## 6. Gaps and risks

- Reagents are spent before the mana check. `Spell.cs` 750 runs `ConsumeReagents()` (which removes the items on success) and only then line 754 checks `Caster.Mana < mana`. A caster short of mana loses reagents with no cast. Fix: check mana first, then consume reagents, then deduct mana (sketch `castOrder`).
- The spellbook scroll add does nothing silently for a wrong book type. `AddToSpellbookEntry.cs` 35-37 has an empty body for `type != book.SpellbookType`, so the player gets no message and the scroll stays. Fix: send a message (the donor sends one for a duplicate at 40).
- The magic resist gain ceiling differs between two functions: `GetResistSkill` uses `1 + circle * 10` (line 51) and `CheckResisted` uses `(1 + circle) * 10` (line 78). Fix: one helper for both.
- The price scalar `100 + Town.FromRegion(Region)?.Tax ?? 0` (BaseVendor 1353) yields 0 outside a town, and `GenericBuyInfo` reads 0 as "unscaled" (GenericBuy 61-82). The result is right by accident. Fix: explicit branch (sketch `vendorPrice`).
- Stats do not gate spells in this donor (`Intelligence` appears in one comment in UOContent/Spells). Schools are gated by the skill that `CastSkill` names (Magery, Necromancy, Chivalry...), not by a stat.
- No spellmaking: the donor has fixed spell classes and a 64-bit book mask. Daggerfall-style custom spell cost does not exist here. Do not claim it does.
- No spell-scroll price was found in the vendor code read. The coin figures in section 3 are base vendor prices from SBMage and SBAlchemist, not a scroll price.
- Pre-ML and ML skill tables both exist (MagerySpell 15-17). The era flag `Core.ML` was not read; check which table is live before quoting numbers.
- Cast delay constants (`CastDelaySecondsPerTick`, `CastDelayMinimum`) and the mana pool formula were not read, so the seconds per cast and the pool size are unknown.
- The location check inside `CheckSkill(from, skill, loc, chance)` (anti-macro, `SkillCheck.cs` 72-74) was not read. Frankendom should not copy a location-based roll without deciding its anti-cheat role.
- Reagents are consumed at line 750, before the `CheckFizzle()` branch at line 768, so a fizzle after the reagent step loses them. Whether that is intended was not checked. Decide whether a fizzle refunds.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Error: ScaleMana was described as mana*(1-min(lmc,40)/100) only. Real Spell.cs 633-652 starts the scalar from `MindRotSpell.GetMindRotScalar` (635-640) and then subtracts lmc/100 (649), so Mind Rot changes cost; the sketch `scaledMana` omitted it. Confirmed in code.
- Missed: the Mind Rot cost scalar (Spell.cs 635-640). Added to section 1, section 3 and the sketch.
- Verified OK: MagerySpell lines, resist example 39.5, scroll offsets, CheckSequence order, ConsumeTotal, AddToSpellbookEntry, GenericBuy/BaseVendor, SB prices, GPL-3.0.

Fixed 2026-10-12: section 1 and 3 now include the Mind Rot scalar; sketch `scaledMana` gets an optional `mindRotScalar` (default 1.0); work/modernuo-spell-access.ts updated to match. Typecheck below.
