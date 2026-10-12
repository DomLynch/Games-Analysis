# TurningWheel-Barony (magic-spells-powers, cell 2)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/magic/castSpell.cpp` (with `magic/act_HandMagic.cpp`, `magic/magic.cpp`, `magic/spell.cpp`, `magic/magic.hpp`, `src/entity.cpp` for `drainMP`, `src/mod_tools.cpp` for the spell JSON keys, `magic/setupSpells.cpp`) | Licence: BSD 2-Clause. `LICENSE.txt` at repo root: "This open source release of Barony is licensed under the BSD 2-Clause License ... Copyright (c) 2013-2020, Turning Wheel LLC". Code may be adapted | C++ | symbols `castSpellInit` (start-of-cast gates) and `castSpell` (fire)

Checked: read `castSpell.cpp` 180-262 (gates and refusal), 334-364 (beginner test), 527-534 (ability), 195-236 and 700-900 (cost, drain, newbie drain, fumble); `spell.cpp` 779-890 (cost functions); `act_HandMagic.cpp` 1015-1090 (wind-up setup), 1220-1262 and 1548-1625 (per-tick drip and fire); `magic.cpp` 4280-4370 (cast time, read in full for the cast-time branch); `entity.cpp` 3430-3612 (`drainMP`, read in full); `magic.hpp` 486-545 and 806-822; `setupSpells.cpp` 505-520, 653-668, 1172-1182, 3540-3570; `mod_tools.cpp` 1340-1360 (JSON keys). Scope: casting model, not a camera cell. Confidence: high on the cost, wind-up, drip and fumble order (all receipted). Medium on "a hit does not interrupt a wind-up": I grepped the `cast_animation` users and the deactivate call sites (`act_HandMagic.cpp` 130, 177, 1227, 1260, 1699, 1798, 1813, 1866, 1872; `actgeneral.cpp`, `menu.cpp`, `game.cpp`, `net.cpp`) and found no damage-triggered cancel, but the damage path was not read end to end. Not read: `getBonusFromCasterOfSpellElement` (`spell.cpp` 1003), `getSpellbookBonusPercent` (`castSpell.cpp` 391), the multiplayer server path (`net.cpp` 9388 only seen in grep), the sustain (channel) ongoing drain (only the design note at `magic.hpp` 529-541 was read), the wind-up animation code past line 1625. Receipts for the cast-time modifiers quote the branch lines only.

Best transferable idea: a cast's cost is paid as a per-tick drip during the wind-up with the rest charged at fire, the wind-up shortens with DEX, and a learner's extra wind-up and fumble roll are two separate, capped rules.
Decision (proposed): adapt - keep the drip-then-charge-at-fire shape, the DEX-shortened wind-up with floors, the capped learner extra and the fumble ladder; fix the integer drip interval and the mixed ability values; reject spell overdraw into HP for general casters, because Frankendom keeps resources as pools on one ledger and HP is not a spell pool.
Acceptance: a server test asserts that a cast costing more than the caster's pool is refused before any pool changes, and that a completed cast by a non-learner charges exactly its cost (drips plus the remainder at fire; a beginner also pays the one-time extra drain of up to MP / 10, which the sketch leaves out, so the test names the caster as a non-learner); a learner's extra wind-up is never more than the capped circles. In this note's decision, the 'capped learner extra' means the extra wind-up circles; the extra MP drain is shown as a separate preview line (D4).

## 1. Mechanism

Order of steps, as the code runs (single-player path; the multiplayer server path was not read):

(a) Gates before any spend, in `castSpellInit` (`castSpell.cpp` 30 onward; `castSpell` itself starts at 536 and runs at fire). It (`castSpell.cpp` 180-183) returns at once if the caster is paralysed or asleep. The cost is read from `getCostOfSpell` (195), then halved for a tome cast or an overcharge cast on the local player (204, 208). Then (232-255): if the cost is above MP, the cast is refused with a message (236, 243), unless the caster is a vampire or the cast is a tome cast (232), which are allowed to overexpend (see defect D5).

(b) Cost, `getCostOfSpell` (`spell.cpp` 828-875). Base cost is the spell's `mana` field (836). Summon adds a term from summon level; breathe-fire adds MAXMP/50 and doubles when MP is below 40% of MAXMP; teleport and tele-pull halve for a shadow-tagged target (condition at 866, halving at 868). A sustained (channelled) spell's per-tick cost is the sum of its element `channeledMana` values (`getSustainCostOfSpell`, 823).

(c) Wind-up length, `getSpellPropertyFromID(SPELLPROP_MODIFIED_SPELL_CAST_TIME)` (`magic.cpp` 4352-4365). Cast time in circles = base `cast_time` minus a DEX term (DEX times (1 + bonus) times `cast_time_mult`, divided by 100) (4352-4353). A robe whose school matches the spell (4325) shortens it by a capped fraction (4331); a cursed matching robe lengthens it (4335). Legendary proficiency in the three schools adds to the bonus (4347-4349). Then multiplied by the equipment factor (4358). Floors: 0.5 circles if the base is under 1.01 (4359-4361), else 1.0 (4365). A final global floor then applies to the tick count after the learner and spellbook additions: `max(HANDMAGIC_TICKS_PER_CIRCLE / 2, ticks)` = 10 ticks (`act_HandMagic.cpp` 1075). Stored in ticks as circles times 20 (`act_HandMagic.cpp` 1030, `HANDMAGIC_TICKS_PER_CIRCLE` 20 at line 52).

(d) Learner's extra wind-up, `act_HandMagic.cpp` 1039-1046 (spellbook casts add their own extra circles instead: `min(5, 1 + 2 x (difficulty - ability))` when the book's difficulty exceeds the ability, 1060-1068). For a beginner (ability under the beginner threshold, `castSpell.cpp` 358, threshold 40 in `magic.hpp` 19): a roll (`rand % 10 >= proficiency / 15`) adds (`rand % 50`) divided by (proficiency + INT), capped at 3 circles (`magic.hpp` 263), times 20 ticks (1046).

(e) MP is spent in three steps, in this order. First, the wind-up drip, `act_HandMagic.cpp` 1572-1610 (single-player only, `multiplayer == SINGLE` at 1578): the drip interval is wind-up ticks divided by cost, integer (1080); each time the drip timer goes below zero and MP is owed, `drainMP(1, false)` runs (1580) and the owed count drops by 1 (1610). Second, at fire, the MP still owed is charged (`castSpell.cpp` 700-701). Third, still inside `castSpell` at fire, a learner's extra drain (`castSpell.cpp` 812-834, inside `if (newbie && stat)`): if a roll (`rand % 100`) is at least ability, drain `rand % (300 / (ability + 1))`, capped at MP / 10 (825-826), via `drainMP` (834). This is on top of the printed cost.

(f) Fire. When the circle count reaches the wind-up length (`act_HandMagic.cpp` 1621) the animation moves to its next stage; the `castSpell` call is at 1218-1222 in the cast-stage code, which was not read in full, so the exact hand-off is not verified. Inside `castSpell` the MP still owed is charged before the learner's extra drain: single-player at 700-701 (`magiccost = cast_animation[player].mana_left` then `drainMP`); multiplayer computes the cost at 743, halves it for overcharge at 746, and drains at 773.

(g) Fumble, `castSpell.cpp` 850-879. Ability is proficiency plus INT, clamped 0-100 (`getEffectiveSpellcastingAbility`, 527-533). A roll (`rand % 100`) at or above ability marks a fumble candidate (852). For a non-book cast at or above basic level (857), the candidate is cleared. For a book cast the chance is 35 plus half of (difficulty minus ability) when positive (876-879). A second roll at or below that chance fizzles the spell. A cursed book is degraded (in the same block).

(h) Overdraw, `Entity::drainMP` (`entity.cpp` 3442-3549). MP drops by the amount (3455). If MP goes below zero, the overflow is captured (3484-3487), MP is floored at zero (3488), and the overflow is applied to HP (`modHP`, 3537). The obituary and killer tag are set to failed invocation (3549) whenever the overflow happens; the tag only matters if the HP change kills. An insectoid hunger branch also reduces hunger per MP spent (not receipted).

Pools as data per character: HP and MP. MP default is `DEFAULT_MP` 30 (`game.hpp` 368; the assignment was seen by grep at `actgeneral.cpp` 3225, not read). Spell cost is a per-spell `mana` (JSON key `mana`, `mod_tools.cpp` 1345; built-in spells set through `spellElementConstructor`, `setupSpells.cpp`). Cast time is a per-spell `cast_time` (JSON key `cast_time`, `mod_tools.cpp` 1358; built-in `setupSpells.cpp` 3455). Spell data is therefore a JSON table with C defaults (`spell_t`: `cast_time` 1.0 at `magic.hpp` 814; the `mana` default of 1 is declared at 816, not receipted).

## 2. Key functions

- `castSpellInit`: `/mnt/frankendom-donors/TurningWheel-Barony/src/magic/castSpell.cpp` 30-300 (gates, cost read, refusal 180-262).
- `castSpell`: same file from 536, run at fire: 700-900 (remainder at fire, learner drain, fumble).
- `getCostOfSpell`, `getSustainCostOfSpell`: `/mnt/frankendom-donors/TurningWheel-Barony/src/magic/spell.cpp` 811-875.
- wind-up setup and per-tick drip: `/mnt/frankendom-donors/TurningWheel-Barony/src/magic/act_HandMagic.cpp` 1015-1090 and 1548-1625.
- cast-time property: `/mnt/frankendom-donors/TurningWheel-Barony/src/magic/magic.cpp` 4280-4370.
- `Entity::drainMP`: `/mnt/frankendom-donors/TurningWheel-Barony/src/entity.cpp` 3442-3550.

## 3. Numbers vs mechanism

TABLE. Values are the donor's (BSD, may be adapted). "Circle" is 20 ticks (`act_HandMagic.cpp` 52). `TICKS_PER_SECOND` is 50 (`game.hpp` 389), so one circle is 0.4 s.

| name | effect | formula | number ranges | cost | cooldown/cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| MP pool | spendable pool | MP -= amount; below zero the overflow goes to HP | default 30 (`DEFAULT_MP`) | MP | none | MP floored at 0 | entity.cpp 3455-3488; game.hpp 368 |
| Base cost | cost of a spell | cost = spell `mana` (default 1) | per spell (JSON `mana`) | MP | none | none | spell.cpp 836; mod_tools.cpp 1345 (the default of 1 at magic.hpp 816 is a short line, not receipted) |
| Tome and overcharge | halve cost | max(1, cost / 2) | halves | MP | none | minimum 1 | castSpell.cpp 204, 208; act_HandMagic.cpp 1020 |
| Sustain (channel) cost | per-element upkeep | sum of element channeledMana | per element | MP per period (design note, not read) | none | none | spell.cpp 823; magic.hpp 529 |
| Wind-up | the cast takes time | circles = cast_time - DEX/100 (with bonuses); ticks = circles x 20 | base 1.0 circle (default); floor 0.5 (short) or 1.0 (long) | none | 0.5-1.0 circle = 0.2-0.4 s, before learner extra | floors above | magic.cpp 4352-4365; act_HandMagic.cpp 1030; magic.hpp 814 |
| Robe school match | shorten the wind-up | min(0.5, 0.2 + 0.1 x abs(beatitude)) on a matching robe | up to 0.5 | none | none | cap 0.5 | magic.cpp 4325, 4331, 4358 |
| Cursed matching robe | lengthen the wind-up | factor -0.5 | fixed | none | longer | none | magic.cpp 4335 |
| Learner extra wind-up | extra circles | roll (rand % 10 >= proficiency / 15); add (rand % 50) / (proficiency + INT) circles | 0 to 3 circles (60 ticks) | none | +0 to +1.2 s | cap 3 circles | act_HandMagic.cpp 1039-1046; magic.hpp 263 |
| Learner extra drain | extra MP, taken at fire after the remainder, beginners only | if roll (rand % 100) >= ability: rand % (300 / (ability + 1)) | 0 up to MP / 10 | MP | none | cap MP / 10 | castSpell.cpp 812-834 |
| Wind-up drip | MP leaves during the cast | interval = ticks / cost (integer); drain 1 MP each interval | interval 0 means every tick | MP | over the wind-up | MP owed only | act_HandMagic.cpp 1080, 1572-1610 |
| Remainder at fire | rest of cost paid at the end (multiplayer: the whole cost is drained once here, no drip) | charge the owed MP | rest of cost | MP | at fire | none | castSpell.cpp 700-701, 743-773 |
| Ability | learner test and fumble input | proficiency + INT | 0-100 | none | none | clamp 0-100 | castSpell.cpp 527-533 |
| Beginner threshold | who counts as a learner | ability under 40 | 40 | none | none | none | magic.hpp 19; castSpell.cpp 358 |
| Fumble | the spell fizzles | ability >= 20 (non-book): never; else roll >= ability, then roll <= 35 (+ half of book gap) | 35% base | none; book degrade | none | cap at basic level 20 | castSpell.cpp 852-879; stat.hpp 196 |
| Refusal | no cast if short | cost > MP refused (except vampire, tome), in castSpellInit | none | none | none | none | castSpell.cpp 232-255 |
| Paralysis/sleep | no cast | flag check, in castSpellInit | n/a | none | n/a | n/a | castSpell.cpp 182 |

Which numbers suit a fast mobile fight (this reader's proposal, not donor values): keep the wind-up at 0.5-1 circle (0.2-0.4 s), which the floors already enforce; cap a learner's extra at 1 circle (0.4 s) in a duel instead of 3 (1.2 s); turn the fumble ladder off in duels (it is a learning rule); keep the MP cap of MP / 10 for the learner's extra drain.

Defects (keep the idea, fix the defect):

- D1. The drip interval is an integer division (`act_HandMagic.cpp` 1080). When cost is larger than the wind-up ticks the interval is 0 and MP drains every tick; otherwise the last drips bunch up. Total is still the cost (the remainder is charged at fire). fix: accumulate a fractional drip (sketch).
- D2. The learner roll and the learner size use different ability values: the roll uses proficiency / 15 (`act_HandMagic.cpp` 1039-1046), the size uses proficiency + INT (1046). fix: one ability value for both (sketch).
- D3. The fumble and the learner extra are integer-divided (`castSpell.cpp` 825, 879): fine for the donor, but a fractional formula gives smoother odds. fix: keep integers, document the rounding.
- D4. The learner's extra drain (`castSpell.cpp` 834) is MP on top of the printed cost, taken once at fire, after the remainder (beginners only: it sits inside `if (newbie && stat)`, 812). The donor intends it as a learner penalty, but nothing in the code shows it to the player as a separate line. fix: show the penalty as a visible extra in the cast preview.
- D5. Overexpend (`castSpellInit`, `castSpell.cpp` 232) lets a vampire or a tome cast go below zero MP, and `drainMP` (3484-3537) then bleeds the overflow into HP for any entity. The gate is at the start of the cast only. fix: keep the gate on one function; for Frankendom, the overflow is a designed special, not a default.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's refusal before spend, the DEX-shortened wind-up with its floors, the learner extra circles with their cap, the per-tick drip with the remainder charged at fire, the fumble ladder and the overdraw into HP only for casters that may overexpend. The donor values are kept as named constants and the donor's own ability-based numbers are used. It omits: the robe school and cursed-robe factors, the legendary bonus, `getBonusFromCasterOfSpellElement`, the tome and overcharge halving (the caller does this), the sustain (channel) drain, spellbook circles and the cursed-book degrade, the multiplayer server path, the gold cost, the animation state and all network sends. It reorders: the drip uses a fractional accumulator instead of the donor's integer interval (D1), and the learner roll and size use one ability value (D2). The DEX term assumes the bonus and multiplier are 1 and 0 (simplified).

```ts
// Barony-derived shape (BSD-2-Clause, adaptable). Numbers below are the donor values, kept as named constants.
const TICKS_PER_CIRCLE = 20;  // donor HANDMAGIC_TICKS_PER_CIRCLE
const EXTRA_CIRCLES_CAP = 3;  // donor CASTING_EXTRA_TIMES_CAP
const BEGINNER_BELOW = 40;    // donor SPELLCASTING_BEGINNER
const BASIC_LEVEL = 20;       // donor SKILL_LEVEL_BASIC
const FUMBLE_BASE = 35;       // donor base fizzle chance, percent

interface Caster { mp: number; hp: number; canOverexpend: boolean; }

interface CastInput {
  costMp: number;          // base cost after caller discounts (tome, overcharge)
  castTimeCircles: number; // spell cast time in circles (1 circle = TICKS_PER_CIRCLE ticks)
  dex: number;
  ability: number;         // proficiency + INT, clamped 0..100
  fromBook: boolean;
  bookDifficulty: number;
  paralysed: boolean;
}

interface Wind { ticksLeft: number; mpLeft: number; dripPerTick: number; dripAcc: number; }

type Charge = { mpCharged: number; hpCharged: number };

// Donor: cast time = base - DEX term, floored at 0.5 (short spells) or 1.0 (long spells), in circles.
function windUpTicks(input: CastInput, rng: () => number): number {
  const floor = input.castTimeCircles < 1.01 ? 0.5 : 1.0;
  const circles = Math.max(floor, input.castTimeCircles - input.dex / 100);
  let ticks = Math.round(circles * TICKS_PER_CIRCLE);
  // Beginner: the roll and the size use one ability value here (donor mixes proficiency and proficiency+INT).
  if (input.ability < BEGINNER_BELOW && Math.floor(rng() * 100) >= input.ability) {
    const extra = Math.min(EXTRA_CIRCLES_CAP, Math.floor(rng() * 50) / Math.max(input.ability, 1));
    ticks += Math.floor(extra) * TICKS_PER_CIRCLE;
  }
  return ticks;
}

// Overdraw goes into HP only for casters allowed to overexpend (donor: vampire, or tome cast).
function spendMp(c: Caster, amount: number): Charge {
  const fromMp = Math.min(amount, c.mp);
  c.mp -= fromMp;
  const over = amount - fromMp;
  if (over > 0) {
    c.hp -= over;
  }
  return { mpCharged: fromMp, hpCharged: over };
}

// Start of cast: refuse before any MP is spent.
function beginCast(c: Caster, input: CastInput, rng: () => number): Wind | "refused" {
  if (input.paralysed) return "refused";
  if (input.costMp > c.mp && !c.canOverexpend) return "refused";
  const ticks = windUpTicks(input, rng);
  return { ticksLeft: ticks, mpLeft: input.costMp, dripPerTick: input.costMp / Math.max(1, ticks), dripAcc: 0 };
}

// Once per tick during the wind-up: MP drips out at an even rate (accumulator, not an integer interval).
function tickWind(c: Caster, w: Wind): void {
  w.ticksLeft -= 1;
  w.dripAcc += w.dripPerTick;
  while (w.dripAcc >= 1 && w.mpLeft > 0) {
    w.dripAcc -= 1;
    w.mpLeft -= 1;
    spendMp(c, 1);
  }
}

// Fumble ladder. Returns true when the spell fizzles.
function fizzles(input: CastInput, rng: () => number): boolean {
  if (Math.floor(rng() * 100) < input.ability) return false; // roll passed: no fumble candidate
  if (!input.fromBook && input.ability >= BASIC_LEVEL) return false;
  let chance = FUMBLE_BASE;
  if (input.fromBook) chance += Math.max(input.bookDifficulty - input.ability, 0) / 2;
  return Math.floor(rng() * 100) <= chance;
}

// Fire at the end of the wind-up: whatever MP is still owed is charged now.
function fire(c: Caster, w: Wind): Charge {
  const owed = w.mpLeft;
  w.mpLeft = 0;
  return spendMp(c, owed);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/barony-wind-up-cast.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/cast.ts` (engine casting: wind-up, drip-free pool check, fumble ladder for learners; same module as the sven cell). Parity-checklist row 13 (specials).
- Reuse tag: adapt-from-donor (BSD-2-Clause; code may be adapted; the sketch is a rewrite of the shape with the donor's values as named constants).
- Brief rule served: 1 (one engine: the cast and its pool spend live in `src/fight`); row 13 specials; the server, not the client, must charge the pool (server-verified outcomes).

## 6. Gaps and risks

- Client-side spend: the donor drains MP on the client in single-player and on the server in multiplayer. Frankendom must charge once, on the server; the client shows the predicted drip.
- One ledger: HP overflow (`entity.cpp` 3537) is an HP write from a spell path. Frankendom's one-ledger rule means a spell may not write HP except through the one damage path, so the overdraw special must go through that path or not exist.
- Frankendom's attacker-slot cap (MAX_ATTACKERS = 3 is a Frankendom constant, not a donor one): a long wind-up keeps a caster standing still in a many-on-one fight. The donor has no slot logic here (not read); Frankendom must stop a wind-up when the caster is attacked, or the caster is a free target. The donor does not interrupt on hit (grep only; see Checked).
- Learner penalties (D4) can surprise a player; show them in the cast preview.
- Pools: Frankendom has stamina and stance (row 3). Map MP to a spell pool only if the design needs a second pool; do not add HP spending by default.
- Not read: the damage path (interrupt on hit), multiplayer server casting, sustain drain, the robe and legendary factors in full detail beyond the lines receipted.

Reuse tag: adapt-from-donor (BSD-2-Clause)
Brief rule served: 1 (one engine); specials row 13


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Verified OK: BSD-2 LICENSE.txt; HANDMAGIC_TICKS_PER_CIRCLE 20 (act_HandMagic.cpp:52); TICKS_PER_SECOND 50; getCostOfSpell spell.cpp 828-875 incl. summon, breathe-fire (MAXMP/50, x2 below 40%), shadow-tag teleport halving; cast-time property incl. robe min(0.5,0.2+0.1*abs(beatitude)), cursed -0.5, legendary +1.0 bonus, floors 0.5 (<1.01) / 1.0; SPELLCASTING_BEGINNER 40; CASTING_EXTRA_TIMES_CAP 3; learner extra circles roll (rand%10 >= prof/15) and size (rand%50)/(prof+INT) - D2 mismatch is real; drip interval = times_to_circle / max(1,cost) (1080) and drip loop 1572-1610; remainder drain mana_left (castSpell 700-701); drainMP overflow to HP, KilledBy::FAILED_INVOCATION; fizzle 35 + (difficulty-ability)/2 for books; DEFAULT_MP 30; spell_t defaults cast_time 1.0, mana 1; JSON keys. ERRORS: (1) WRONG ORDER: section 1(e) says the learner's extra mana drain (castSpell.cpp 815-834) is 'decided once at the start' and happens FIRST, then the drip. Real code: that block is inside castSpell() (line 536 onward), which is called only at FIRE (act_HandMagic.cpp 1218-1222), after the remainder drain at 700-701. Real order: gate -> wind-up with drip -> at fire remainder drain -> extra drain -> fizzle roll. The note's own (f) says castSpell is called at 1218, contradicting (e). (2) WRONG FUNCTION: the paralysed/asleep gate (180-183), cost read (195), tome/overcharge halving (204,208) and the cost>MP refusal with vampire/tome exemption (232-255) are in castSpellInit() (castSpell.cpp line 30), not castSpell(); the symbol line and key-functions list name the wrong function and castSpell 180-262 does not exist as stated. (3) The extra drain is not a learner-only rule: it triggers for ANY caster whose ability roll fails (rand%100 >= ability; ability 70 = 30% chance), only the size shrinks as ability rises; the table and D4 label it 'learner'. (4) Section (c)/(d) omit the final global floor `max(HANDMAGIC_TICKS_PER_CIRCLE/2, times_to_circle)` (act_HandMagic.cpp ~1075) applied after learner and spellbook additions, and the spellbook extra circles `min(5, 1+2*(difficulty-ability/20))` (1060-1068) - sketch states it omits spellbooks, ok. (5) Drip happens only when multiplayer==SINGLE (act_HandMagic 1578); in multiplayer the whole cost is drained once at fire (743-773) - note says 'single-player path' but the acceptance 'drips plus remainder at fire' describes only that path. ACCEPTANCE: 'a completed cast charges exactly its cost' is true for the sketch but false for the donor (extra drain on top); Decision says 'keep the capped learner extra' - ambiguous between wind-up and drain. MAX_ATTACKERS=3 is not in the donor (Frankendom constant).
Missed: castSpellInit (castSpell.cpp 30-300) is the real start-of-cast gate and the note never names it; the 10-tick global floor; extra-drain applies to every caster; multiplayer path drains full cost at fire (no drip).

Fixed 2026-10-12 (Sonnet fixer): verified in castSpell.cpp that gates, cost read and refusal are in `castSpellInit` (line 30), while `castSpell` starts at 536 and runs at fire (act_HandMagic.cpp 1218-1222); symbol line, key functions, steps (a), (e), (f) and table fixed. Order corrected to drip, remainder at fire, then the learner extra drain. Not accepted: the checker said the extra drain applies to any caster; the code (castSpell.cpp 812) guards it with `if (newbie && stat)`, so it stays beginner-only. Added the 10-tick global floor (act_HandMagic.cpp 1075), spellbook extra circles (1060-1068), and that the drip is single-player only (multiplayer drains once at fire). Acceptance now says non-learner and separates the extra wind-up from the extra drain. MAX_ATTACKERS relabelled as a Frankendom constant. Sketch unchanged (it omits the drain and the spellbook rules and says so).
