# OpenEnroth-OpenEnroth (progression, cell 10)

Donor: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Party.cpp` (GivePartyExp, 837-856; the hinted Party.h only declares it at 125) | Licence: LGPL-3.0 (repo LICENSE: "Version 3, 29 June 2007", GNU Lesser General Public License; copyleft, clean-room, shape only) | C++ | symbol `Party::GivePartyExp`, with `Character::learningPercent`, `Character::CanTrainToNextLevel`, `PriceCalculator::trainingCostForPlayer`, `GUIWindow_Training::trainDialogue`

Checked: read in full: Party.cpp 837-856 (split), Character.cpp 712-727 (learningPercent), 1132-1136 (CanTrainToNextLevel), 2835-2850 (mastery multiplier), 4492-4497 (setXP), PriceCalculator.cpp 135-159 (merchant percent and discount) and 216-226 (trainer price), CharacterEnumFunctions.h 149-152 (class tier), Training.cpp 15-30 (hall caps) and 40-90 (trainer step), Actor.cpp 3155-3172 (kill path). Grep-line only, not read in full: Spells.cpp 888, Character.cpp 3897 and 4063 (other kill paths), GameBindings.cpp 96 (script call). Not read: the monster `exp` table (`pMonsterStats->infos[id].exp`), the definition of `_charactersTrainedLevels`, `restAndHeal`. Sketch: typechecked (tsc --strict, es2020) and spot-checked on the VPS: 2 active members with 100 XP gives 50 and 75 (the second has 50% learning); `xpToTrain(10)` = 55000; price at level 10, tier 2, house x1.5, merchant 20 = 24. Confidence: high on the split and the three trainer gates (read end to end); medium-high on the training result (read, not run). Camera: n/a.

Best transferable idea: split each kill's XP across the members still standing, scale each share by a learning bonus, and make level-up a trainer step gated by XP and a per-zone cap, all on one XP ledger.
Decision (proposed): adapt - take the active-only split and the trainer gate; drop the 7-day rest and the gold price unless Frankendom has a gold economy.
Acceptance: with three members and one still standing (two down), a 100 XP kill credits only the standing member (100 + bonus) and a server test asserts the down members' ledger XP is unchanged; a zone with cap 15 refuses a level-16 train.

## 1. Mechanism

- Source: a monster kill calls `pParty->GivePartyExp(monster exp)`, but only when the monster's `exp` is non-zero (Actor.cpp 3165-3166). The exp value is per monster (table not read). The kill happens after `Actor::Die` (Actor.cpp 3162) and before the kill speech (after 3166).
- Split (Party.cpp 837-856): if the total is positive, count the members who are not unconscious, dead, petrified or eradicated (842). If that count is above zero, each share is `total / count` (integer, 848). Each active member gets `share + share * learningPercent() / 100` (851) and `setXP(experience + that)` (852). Order: count, share, then per-member bonus, then ledger write.
- Learning bonus (Character.cpp 712-727): hireling bonus first, 10 for a teacher, +15 for an instructor, +5 for a scholar (714-716). If the member's learning skill is 0, the result is the hireling bonus only (724-725). Otherwise it is `hireling + multiplier * skill + 9` (721-723), where the multiplier is 1, 2, 3 or 5 for novice, expert, master, grandmaster (2835-2850 read in full).
- Ledger write (Character.cpp 4492-4497): `setXP` stores the value, but a value above 4000000000 or below 0 is replaced by 0 (4493-4494). It is a reset to zero, not a clamp.
- Level-up is NOT automatic. XP piles up on the ledger (`experience` is a uint64, Character.h 331). The level rises only in a training hall (Training.cpp 56-90). Three gates in order: (a) the member's level must be below the hall cap (65; table at 18-28: Emerald Island 5, Harmondale 15, Erathia 25, Tularean Forest 25, Celeste 200, Pit 200, Mount Nighon no limit, Tatalia 50, Avlee 50, Stone City 100); (b) XP must be at least `1000 * L * (L+1) / 2` for current level L (66; the same threshold as `CanTrainToNextLevel` at 1134-1135 and `trainingCostForPlayer` at 218-219); (c) gold must cover the price (67).
- Price (PriceCalculator.cpp 216-226): base = `L * house multiplier * class tier` (221); merchant discount applied to the base (222; `100 - merchant percent`, 154); never below one third of the base (223-224). Class tier is the low two bits of the class: index 3 gives tier 3, else index + 1 (CharacterEnumFunctions.h 150-151). Merchant percent (135-150): grandmaster gives 100 (139-141); with no merchant skill it is minus party reputation (146-147); otherwise `min(multiplier * skill - reputation + 7, 100)` (144-150).
- On success (Training.cpp 70-87): level +1 (70); skill points +`newLevel / 10 + 5` (71; uses the new level); health and mana to max (72-73); if the party-wide high of the per-character trained count rises, rest until dawn plus 4 h (plus 12 h at Pit or Mount Nighon) plus 7 days (75-82; the array is not read); then the level-up speech (87).
- Numbers at work: training from level 1 to 2 needs 1000 XP; level 10 to 11 needs 55000; a level 10 character in a tier 2 class at a x1.5 hall with 20 percent merchant pays 24 gold (the sketch, arithmetic from the code).

## 2. Key functions

- `Party::GivePartyExp`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Party.cpp` 837-856 (split among active members, learning bonus, ledger write).
- `Character::learningPercent`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Character.cpp` 712-727.
- `Character::CanTrainToNextLevel` and `Character::setXP`: same file, 1132-1136 and 4492-4497.
- `PriceCalculator::trainingCostForPlayer`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/PriceCalculator.cpp` 216-226; `playerMerchant` 135-151; `applyMerchantDiscount` 153-155.
- `GUIWindow_Training::trainDialogue`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/Houses/Training.cpp` 56-90 (gates 65-67, step 70-71, rest 75-82); hall caps 18-28.
- Kill call site: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Actor.cpp` 3165-3166.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Split a kill's XP by integer share over members still standing; each share scaled by a per-member bonus | Bonus is `share * learningPct / 100` (theirs, Party.cpp 851) |
| Learning bonus = fixed hireling part, plus (skill x mastery multiplier + 9) when skill > 0 | Hireling 10 / 15 / 5 (Character.cpp 714-716); multiplier 1, 2, 3, 5 (721); +9 (723) |
| Level-up is a trainer step gated by XP and a per-place cap | Caps 5, 15, 25, 25, 200, 200, unlimited, 50, 50, 100 per hall (Training.cpp 19-28) |
| XP gate that grows with level: 1000 * L * (L+1) / 2 | 1000 and the triangle (Training.cpp 66; PriceCalculator.cpp 218) |
| Price = level x multiplier x tier, discounted, with a floor at one third | Floor 1/3 (PriceCalculator.cpp 223-224); tier from class bits (CharacterEnumFunctions.h 150-151) |
| Skill points on level = new level / 10 + 5 | 10 and 5 (Training.cpp 71) |
| Ledger write that zeroes out-of-range values | Range 0 to 4000000000 (Character.cpp 4493) |

## 4. TypeScript sketch

simplified: keeps the active-only integer split, the learning bonus with its +9 branch, the trainer threshold, the price with the one-third floor, and the train step in the donor's order (cap, XP, gold; then level up and skill points on the new level). It omits the setXP zeroing rule (above 4000000000 or below 0), the heal on train, the 7-day party rest, the speech and status text, the interaction gate (`checkIfPlayerCanInteract`), the merchant percent calculation (taken as an input), the monster exp table and the other kill callers, and uint64 typing (plain numbers here). It reorders nothing else.

```ts
// Licence: LGPL-3.0 (donor LICENSE). Clean-room shape only: the rules are written from the donor's described behaviour, not translated line by line.
// Frankendom reading: total XP is the ledger value; the level counter moves only on a trainer action.

export interface Member {
  id: string;
  active: boolean;        // false when unconscious, dead, petrified or eradicated
  xp: number;             // ledger total (never reset by training)
  level: number;          // level counter, raised only by training
  skillPoints: number;
  learningPct: number;    // from learningPercent()
  classTier: number;      // 1..3
}

// Kill XP: the share is total / active count (integer); each active member gets share + share * learningPct / 100.
export function splitKillXp(members: Member[], killXp: number): void {
  if (killXp <= 0) return;
  const activeCount = members.filter(m => m.active).length;
  if (activeCount === 0) return;
  const share = Math.trunc(killXp / activeCount);
  for (const m of members) {
    if (!m.active) continue;
    m.xp += share + Math.trunc((share * m.learningPct) / 100);
  }
}

// Learning bonus: hireling bonus alone when there is no learning skill; otherwise bonus + mastery multiplier x skill + 9.
// masteryMultiplier is 1, 2, 3 or 5 for novice, expert, master, grandmaster (0 when no mastery).
export function learningPercent(hirelingBonus: number, learningSkill: number, masteryMultiplier: number): number {
  if (learningSkill === 0) return hirelingBonus;
  return hirelingBonus + masteryMultiplier * learningSkill + 9;
}

// XP the member must have on the ledger before the trainer will raise the level: 1000 * (L+1) * L / 2 for level L.
export function xpToTrain(level: number): number {
  const lvl = level + 1;
  return Math.trunc((lvl * (lvl - 1)) / 2) * 1000;
}

// Trainer price: level x house multiplier x class tier, merchant discount, never below one third of the base.
export function trainingPrice(level: number, classTier: number, houseMultiplier: number, merchantPct: number): number {
  const base = Math.trunc(level * houseMultiplier * classTier);
  const discounted = Math.trunc((base * (100 - merchantPct)) / 100);
  return Math.max(discounted, Math.trunc(base / 3));
}

// One trainer action for the active member. Hall cap is checked first, then XP, then gold (as the donor).
export function tryTrain(m: Member, hallMaxLevel: number, gold: number, houseMultiplier: number, merchantPct: number): { ok: boolean; gold: number; price: number } {
  if (m.level >= hallMaxLevel) return { ok: false, gold, price: 0 };
  if (m.xp < xpToTrain(m.level)) return { ok: false, gold, price: 0 };
  const price = trainingPrice(m.level, m.classTier, houseMultiplier, merchantPct);
  if (gold < price) return { ok: false, gold, price };
  m.level += 1;
  m.skillPoints += Math.trunc(m.level / 10) + 5; // uses the new level, as the donor does
  return { ok: true, gold: gold - price, price };
}
```

## 5. Lands in

- TARGET `src/fight/progression.ts` (new module): the kill XP split runs in the fight engine when a monster dies (server-verified kill), the trainer gate reads the same XP ledger. Parity-checklist row 18 (loot roll and XP award).
- Per-hall level caps belong in zone data (the hall is a building in a zone), not in the function.
- Reuse tag: adapt-shape (LGPL-3.0: clean-room; write the rules from this note, not from the donor lines).
- Brief rule served: one ledger (XP is the single value and the trainer step only reads it); zones as data (the cap per hall is data); server-verified kills (the split happens where the kill is verified).

## 6. Gaps and risks

- Frankendom's MAX_ATTACKERS = 3 means a kill can have up to three contributors. This donor splits among every standing party member, not among attackers. Frankendom must decide who is in the split (the attackers, or the party), and write it down.
- `setXP` zeroes out-of-range values (Character.cpp 4493-4494). On the Frankendom ledger that would erase progress silently; clamp or refuse, and test it.
- Level is a separate counter from XP, so XP can sit above the threshold without a level. That is intended here (the trainer is the step), but Frankendom's one-ledger ruling needs a single source for level-or-XP; choose one and test the other is derived.
- The 7-day rest after a new party-wide high (Training.cpp 75-82) is a time gate that does not fit a fast browser fighting game. Reject that piece; keep only the cap and the gate.
- The gold price depends on a gold economy and a merchant skill that Frankendom may not have. Adapt (a price in whatever currency the zone uses) or drop.
- Grandmaster merchant makes the discount 100%, so the price falls to the one-third floor (PriceCalculator.cpp 139-141, 223-224). Probably intended; keep the floor, not the zero.
- Learning skill 0 drops the +9 (Character.cpp 723 is only reached when the skill is non-zero). Keep or drop on purpose; the sketch keeps it.
- Callers were read in part: the kill path at Actor.cpp 3165-3166 was read; Spells.cpp 888, Character.cpp 3897 and 4063, and GameBindings.cpp 96 were grep lines only, so the claim that every kill calls the split is about these call sites, not about all paths.
- Monster XP values (the table) and the `_charactersTrainedLevels` definition were not read; the depth claim stops there.
