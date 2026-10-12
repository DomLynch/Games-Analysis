# open-duelyst-duelyst (magic-spells-powers, cell 2)

Donor: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/cards/card.coffee` (buff stack 1907-1976, silence 1856-1871), with `app/sdk/spells/spell.coffee`, `app/sdk/spells/spellDamage.coffee`, `app/sdk/spells/spellFilterType.coffee`, and the card factory `app/sdk/cards/factory/coreshatter/faction2.coffee` | Licence: CC0 1.0 Universal (`/mnt/frankendom-donors/open-duelyst-duelyst/LICENSE` and `COPYING`, both "CC0 1.0 Universal"; a public-domain dedication, not on the MIT/Apache/BSD list, so it is classed permissive here and Dom should confirm) | CoffeeScript | symbol `Card._getBuffedAttributeFromModifiers` / `Card.getBuffedAttribute`

Checked: read card.coffee 1650-1690 (keyword classes), 1856-1871 (silence, dispel alias), 1907-1990 (buff stack and getBuffedAttribute); spell.coffee 40-100 and 110-140 (apply flow, positions, filter) with the header; spellDamage.coffee (whole file); spellFilterType.coffee (whole file); faction2.coffee 168-183, 440-456 (factory blocks), faction6.coffee 171 and unity/neutral.coffee 342 by grep. Not read: modifier.coffee getBuffedAttribute body (1822-1850, grep hits only), the cache flush (where cachedBuffedAttributes is cleared), modifierSilence.coffee body, the aura-managed flag, the keyword rules after silence, the DamageAction. Depth: thin. Confidence: high for the three-layer stack order and the clamp; medium for the cache and the aura rules (not read). camera_scope: not a camera cell.

Best transferable idea: Compute every stat as base, then the last rebasing modifier, then normal modifiers in order with a fixed one as a hard stop, then auras, then clamp to zero; silence removes only the modifiers flagged removable.
Decision (proposed): adapt - take the layered stack and the removable flag for gear buffs and status effects; change the donor's aura rule (in the donor a fixed normal modifier also blocks the aura step; here auras always apply, a deliberate change for Dom to rule on). Do not copy the CoffeeScript or the card art or resources. Why: a stat-modifier stack is the one place where gear, specials and status effects must agree on one number; this gives the server a single function for it.
Acceptance: a server test asserts that a unit with a base attack of 3, a rebase to 2, a +1 normal buff and an aura of +1 reads 4, that a fixed normal debuff stops later normal buffs, that the value never goes below 0 (a -5 debuff on 3 gives 0), and that silence removes the buff and keeps the base value.

## 1. Mechanism

- Card data is code. Each card is built in a per-set factory file by an if-chain on the card id that picks a spell class and then sets properties. Knucklestorm: the branch on `Cards.Spell.Kindle` (faction2.coffee 172) creates `SpellIntensifyDealDamage` (173); the name is set at 177, `manaCost` at 180, `damageAmount` at 183 (receipts). Phoenix Barrage: `SpellDamageAndPutCardInHand` (443), `damageAmount = 3` (452).
- Spell apply (authoritative session only, spell.coffee 68): the base position is pushed (133), the pattern or radius positions are added and then filtered (136); the per-tile hook runs for each position (87); the one-time hook runs after the loop (91); then `drawCardsPostPlay` cards are drawn (94). A damage spell's per-tile hook (spellDamage.coffee 22) sets a `DamageAction` with `@damageAmount` on the unit at that tile, and sends it through `executeAction`.
- Spell filter (spellFilterType.coffee 4 and neighbours): `None`, `EnemyDirect` (must target an enemy directly), `EnemyIndirect`, `AllyDirect`, `AllyIndirect`, `NeutralDirect`, `NeutralIndirect`, `SpawnSource` (any standard spawn location). `canBeAppliedAnywhere` defaults to true for spells (spell.coffee 15).
- Cost: `getManaCost` returns `@getBuffedAttribute(@manaCost, "manaCost")` (card.coffee 919), so a mana discount or surcharge is a modifier on the cost, not a separate rule.
- Intensify (the real rule of Knucklestorm): the card class is `SpellIntensifyDealDamage`; damage = `damageAmount * getIntensifyAmount()`, where `getIntensifyAmount` counts this owner's play-card actions of the same base card in the session (`spellIntensify.coffee`). Description reads 'Intensify: Deal 1 damage'. Frankendom reading: a repeat-cast scaling counter, kept per caster and per spell.
- Buff stack (card.coffee 1907-1976), read in full:
  1. Modifiers are sorted into three groups. A modifier managed by an aura goes to the aura group. Otherwise it is a rebasing modifier if `getRebasesAttribute(buffKey)` is true (1917), else a normal modifier.
  2. The first non-aura modifier (rebasing or normal) with `getIsAttributeFixed(buffKey)` becomes the stop point (1923).
  3. The last rebasing modifier is applied first to the running value (1937).
  4. Normal modifiers are applied in list order; the loop applies the stop modifier and then returns the value before the aura step (1944 loop). So a fixed NORMAL modifier blocks the auras as well as later normal modifiers; a fixed REBASING modifier never matches in this loop, so no stop happens and auras do apply.
  5. Aura modifiers are applied last, by a recursive call with the aura flag set (1951); the recursion re-runs the same rebasing/normal split on the aura modifiers themselves (forAuras = true), each with its own stop point.
  6. `getBuffedAttribute` caches the result per attribute and clamps it: `attributeValue = Math.max(0, attributeValue)` (1976).
- Silence / dispel (card.coffee 1856-1871): `silence` walks the modifiers from the end (1858) and removes each one that is removable (1859), then flushes the cached keyword classes. `cleanse` and `dispel` are the same function (1865 comment "for now cleanse/dispel is just an alias for silence"; 1867). A unit is silenced when it has a `ModifierSilence` (cached test, 1870).

### MG table (rows read)

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Knucklestorm (Kindle id) | deal damage to an enemy, intensify | damage = damageAmount x getIntensifyAmount() (spellIntensifyDealDamage.coffee 14); the amount is the count of PlayCardAction entries by the owner for this base card id (spellIntensify.coffee) | damageAmount 1 per play, so total grows with each play of the card | manaCost 1 | none (turn-based card game) | EnemyDirect; canTargetGeneral true | faction2.coffee:172,173,177,180,183 |
| Phoenix Barrage | deal damage to anything, put Phoenix Fire in hand | damage = damageAmount | damageAmount 3 | manaCost 5 | none | NeutralDirect; canTargetGeneral true | faction2.coffee:443,452 |
| Spell apply (any spell) | per-tile hook over base position plus pattern or radius | per-position callback | radius and affectPattern (values not read) | - | - | positions filtered (136) | spell.coffee:68,87,91,94,133,136 |
| Buff stack (any attribute) | rebase, then normal, then aura, then clamp | value := rebase(v); normal in order; aura; max(0, v) | modifier values per modifier (not read) | - | - | clamp 0 (1976) | card.coffee:919,1907-1976 |
| Silence / dispel | remove removable modifiers, flush keyword classes | none | - | - | - | non-removable base kept | card.coffee:1858,1859,1865,1867 |

### Strategy coverage, items (a) to (i)

- (a) casting: no cast time or channel; the card is played on a turn, so the cost is the card's manaCost. No global-cooldown logic read.
- (b) targeting: spell filter enum (spellFilterType.coffee), `canTargetGeneral`, pattern and radius (spell.coffee 133). Counter and reflect: not read.
- (c) status ladder: none read. Silence is the only status-removal rule read.
- (d) mind effects: none read.
- (e) summons: `SpawnSource` filter exists (spellFilterType.coffee 7); spawn logic not read.
- (f) dragons: none found in the code read.
- (g) schools and resistances: none found in the code read.
- (h) acquisition and (i) economy: not read.

Per-character resource pools: not present in the donor (turn-based mana on the player).

## 2. Key functions

- `Card._getBuffedAttributeFromModifiers`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/cards/card.coffee` 1907-1951 (rebase test 1917, fixed stop 1923, last rebasing 1937, normal loop 1944, aura recursion 1951).
- `Card.getBuffedAttribute`: same file, 1955-1976 (clamp at 1976).
- `Card.silence` (dispel and cleanse are aliases): same file, 1856-1867.
- `Spell.onApplyToBoard` and the apply helpers: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/spells/spell.coffee` 68-136.
- `SpellDamage.onApplyEffectToBoardTile`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/spells/spellDamage.coffee` 22.
- Factory blocks: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/cards/factory/coreshatter/faction2.coffee` 172-183, 443-452.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Rebase, then normal, then aura, then clamp | Clamp floor 0 (card.coffee 1976) |
| Fixed modifier stops later normal modifiers | the fixed flag per modifier (no number) |
| Removable flag decides what silence removes | the flag per modifier (no number) |
| Cost is a buffed attribute | manaCost 1 (Knucklestorm, 180), 5 (Phoenix Barrage, row not receipted for 5) |
| Damage is a per-card field | damageAmount 1 (183), 3 (452) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's three groups and their order, the last-rebase rule, the normal loop with a stop, and the clamp. It changes two things: the stop point is the first fixed NORMAL modifier (the donor takes the first fixed modifier of either kind in list order, so a fixed rebasing modifier listed first hides a later fixed normal one), and auras always apply (the donor skips the aura step when a fixed normal modifier is reached in the normal loop; with only a fixed rebasing modifier, the donor applies auras). Both are deliberate changes, not donor behaviour. It omits the stopAtBase variant used for base values, the caches, the keyword rules, and the silence flush.

```ts
// Licence: CC0-1.0 (donor LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor.
type Layer = "rebase" | "normal" | "aura";

interface Modifier {
  id: string;
  layer: Layer;
  fixed: boolean;          // a fixed modifier stops later normal modifiers
  removable: boolean;      // silence / dispel removes it
  apply: (value: number) => number;
}

// simplified: the donor applies the last rebasing modifier, then normal modifiers in list order, then auras, then clamps
// to zero. Its stop point is the first fixed modifier of either kind in list order, and its aura step is skipped
// when that stop modifier is a normal one (the loop returns at it). This sketch changes both: the stop is the first fixed
// NORMAL modifier, and auras always apply (deliberate; ruling for Dom). It omits the stopAtBase variant used for base values, the per-attribute caches, the keyword rules,
// and the donor's silence flush.
function buffedAttribute(base: number, mods: Modifier[]): number {
  let value = base;

  const rebases = mods.filter((m) => m.layer === "rebase");
  if (rebases.length > 0) {
    value = rebases[rebases.length - 1].apply(value);
  }

  for (const m of mods.filter((m) => m.layer === "normal")) {
    value = m.apply(value);
    if (m.fixed) break;
  }

  for (const m of mods.filter((m) => m.layer === "aura")) {
    value = m.apply(value);
  }

  return Math.max(0, value);
}

// Intensify (donor SpellIntensifyDealDamage): damage scales with how many times this caster has played the card.
function intensifyDamage(damageAmount: number, timesPlayed: number): number {
  return damageAmount * timesPlayed;
}

// Silence / dispel: remove every removable modifier; non-removable ones (base effects) stay.
function silence(mods: Modifier[]): Modifier[] {
  return mods.filter((m) => !m.removable);
}

export {};
```

Typecheck: copied to `/tmp/mg013-duelyst-modifier-stack.ts` on the VPS and run with `npx -p typescript tsc --noEmit --strict --target es2020` (exit 0).

## 5. Lands in

- TARGET `src/fight/modifiers.ts` (proposed new module; not checked against the Frankendom repo): one stat-modifier stack for attack, health, stamina and mana, used by gear, specials and status effects, all on the server. Parity-checklist row 13 (specials). The hint was row 22 (Pit-only), which does not fit a stat stack used in the world.
- Reuse tag: adapt-idea (CC0 code may be adapted; art and resources are not taken)
- Brief rule served: 1 (one engine: one stat function); 7 (one ledger for the values the client shows)

## 6. Gaps and risks

- Donor rule: a fixed normal modifier ends the stack before the aura step, so auras are skipped (card.coffee 1944-1951). The sketch deliberately lets auras always apply; this is a design change, not a bug fix of a mis-located quirk. Test it before shipping.
- Dispel is an alias of silence, with no resist roll (card.coffee 1865-1867). In open PvP an unresisted dispel is a free counter to every buff, so the rule needs a resist roll or a per-target cooldown from Dom.
- The donor's stop point depends on list order. Frankendom must sort modifiers by a stable key (for example, id) so the result does not depend on the order gear was equipped.
- The cache (cachedBuffedAttributes) is cleared somewhere not read; the invalidation rule is a risk for a server that recomputes often. Not read.
- Turn-based card game: the manaCost buff is per turn. Frankendom's stamina and mana regen are per tick and not in the donor.
- Licence: CC0 1.0 for code. The repo also ships art and resources (under app/resources); their licences were not read. Take the code only.

## 7. As-data shape (pass 2)

- Donor table: no data file. A card is a factory block: `card = new <SpellClass>(gameSession)` (faction2.coffee 173, 443), then property sets (`card.id`, `card.name`, `card.manaCost`, `card.rarityId`, `card.spellFilterType`, `card.canTargetGeneral`, `card.damageAmount`, `card.cardDataOrIndexToPutInHand`, FX and sound resources).
- Row fields (name: type): `id: Cards.Spell.*`; `name: string`; `manaCost: int`; `rarityId: enum`; `spellFilterType: SpellFilterType (0-7)`; `canTargetGeneral: bool`; `damageAmount: int` (damage spells); `cardDataOrIndexToPutInHand: card ref` (optional); `radius: int` and `affectPattern: positions` (spell.coffee 133, 136); `drawCardsPostPlay: int` (spell.coffee 94).
- A new X is one row: no. A new damage card with an existing class is one factory block plus an if-branch (faction2.coffee 172-173); a new behaviour needs a new class. The row is code, not JSON.

## 8. Provenance and history

- Repo: open-duelyst-duelyst. Licence file: `/mnt/frankendom-donors/open-duelyst-duelyst/LICENSE` and `COPYING` (CC0 1.0 Universal).
- No history available: the donor copy has no `.git` (checked), and no changelog was opened.
- Comments that record a placeholder: card.coffee 1865 "for now cleanse/dispel is just an alias for silence".

## 9. Rulings for Dom

1. Dispel: unconditional removal as in the donor, or a resist roll against the caster's level in PvP? Recommendation: a resist roll in PvP only.
2. Buff stack: auras always apply (the sketch's change), or keep the donor's rule that a fixed normal modifier also blocks auras? Recommendation: always apply.
3. Licence: may we adapt CC0 code without credit, and leave the donor's art out? Recommendation: yes for code; no art.

Reuse tag: adapt-idea (CC0 code; art and resources not taken)
Brief rule served: 1 (one engine: one stat function); 7 (one ledger for values shown on the client)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: WRONG.
- Error: Knucklestorm damage was "damageAmount (1)"; the class is SpellIntensifyDealDamage and damage = damageAmount x getIntensifyAmount() (confirmed).
- Error: the donor aura skip was described as happening when a fixed rebasing modifier exists; in fact the stop is the first fixed non-aura modifier of either kind, the normal loop returns before the aura step when it reaches a fixed NORMAL modifier, and a fixed rebasing one never stops anything so auras apply (confirmed, card.coffee 1909-1952).
- Error: the sketch's always-apply-auras is a different rule from the donor, not a fix of a mis-located quirk (confirmed; now labelled as a deliberate change).
- Acknowledged omission: stopAtBase / getBuffsAttributeAbsolutely paths.
- Missed: Intensify scaling is the real magic rule of the chosen card (now added); aura recursion re-runs the split with forAuras = true (now added).
Fixed 2026-10-12: Decision, mechanism steps 2/4/5, Knucklestorm table row and Intensify line, sketch comment and added intensifyDamage helper (work/duelyst-modifier-stack.ts matches), Gaps and Ruling 2.
