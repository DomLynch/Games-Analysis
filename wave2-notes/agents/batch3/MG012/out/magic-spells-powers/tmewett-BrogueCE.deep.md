# tmewett-BrogueCE (magic-spells-powers, cell 3)

Donor: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/` (PowerTables.c, Time.c, Items.c, Combat.c, Monsters.c, Globals.c, Rogue.h) with data in `/mnt/frankendom-donors/tmewett-BrogueCE/src/variants/GlobalsBrogue.c` (bolt catalog, wand and charm tables) and `CHANGELOG.md` | Licence: GNU AGPL-3.0 (LICENSE.txt line 1-2: "GNU AFFERO GENERAL PUBLIC LICENSE, Version 3, 19 November 2007") | C | symbols `rechargeItemsIncrementally`, `staffChargeDuration`, `wandDominate`, `staffPoison`, `monstUseBolt`, `zap` (Items.c, the function that starts at 6555)

Checked: Opened: PowerTables.c 40-70 (staff damage, blink, haste, discord, entrancement, protection, poison), 105-137 (reflection, full regen), 138-150 (damage fraction comment), 206-220 (charm duration and recharge), 45-46 (domination); Time.c 1815-1862 (staff charge duration, the recharge loop, charm recharge), 1817-1858 (read in full); Items.c 330-338 (staff generation), 4523-4530 (domination), 4571-4600 (poison and entrancement, the player branch only), 4639-4650 (discord), 6555-6660 (zap: charge checks, fizzle, bolt copy, one charge per use), 2440-2470 (staff description, read partly); Combat.c 1125-1140 (reaping); Monsters.c 2777-2800 (monster bolts); Globals.c 1641-1652 (staff table); GlobalsBrogue.c 58, 701-730 (bolt catalog head, wand, charm tables); Rogue.h 1122, 1423-1435, 1861-1874; CHANGELOG.md (grep hits). Not read: the bolt path and target-selection code (`specificallyValidBoltTarget` beyond the preview check at 5262-5270, grep only), the monster-entrancement branch (after 4600), the full staff initial-charge roll above line 330, `randClumpedRange`, `addPoison`, `monsterSummons`, the conjuration blade code, the wisdom ring multiplier, and the rest of the bolt catalog. No `.git`. No diminishing-returns logic in the repo (grep for "diminish": 0 hits). camera_scope: not a camera cell. Confidence: high on the recharge loop, the power curves, the domination and reaping rules (read in full). Medium on the zap and bolt path (partly read). Depth thin: the magic system as a whole was not read end to end.

Best transferable idea: Magic as charged items, not a character pool: each staff keeps a charge count and one random re-arm timer (about D/3 to 5D/3 per charge, D from the enchant level), and a weapon property can drain or refill that timer, so melee and staff use trade against each other on one clock.
Decision (proposed): adapt. Take the charge-timer shape and the enchant curves as data rows for our specials (row 13). Do not take the fixed-point tables (we use floats on the server, with the same curve values as data). Keep the donor's rule that a fizzle costs a turn, but make the identified-empty refusal free of cost, as the donor does.
Acceptance: Server test: a staff with 3 max charges (enchant 3), fully emptied, gets its first charge back after 56 to 278 turns (mean about 167); a 40-damage hit on a 100-HP foe with reaping +1 shifts that staff's timer by a random 0 to 400 units (0 to 40 turns, because the call passes the reaped amount as the multiplier and the increment is 10 x amount), and an empty identified staff refuses the zap without ending the turn.

## 1. Mechanism

Magic is items, not a character pool. Staffs, wands and charms are item rows with a charge count. There is no mana, focus or SP pool in this donor. The character pool is HP only (regen below). Each staff has two numbers in the item: `charges` (current) and `enchant1` (max charges, equal to the enchant level). `enchant2` is the staff's recharge timer (Items.c 336-338).

Staff generation (Items.c 330-338): charges start at 2 in code (327); 50% for a third, then 15% for a fourth, then a 10% chain of further charges (328-335). The staff row range {2,4,1} (Globals.c 1651 shows the healing row) is not what sets this. Max charges is set from the charges (337). The start timer is 1000 for blinking and obstruction and 500 for the rest (338).

Recharge clock (Time.c 1815-1860, read in full). `rechargeItemsIncrementally(multiplier)` runs for every staff in the pack:
- (a) Increment: 10 per call, times the wisdom ring multiplier if the player has the ring, times the multiplier argument (Time.c 1826-1833). A positive multiplier recharges when the staff has room (1837-1840 `enchant2 -= rechargeIncrement`). A negative multiplier drains a staff that has charges. The comment at 1820 says so directly.
- (b) Charge gained: while the timer is 0 or less, add a charge if there is room (1845-1847), then set the timer to a random value, `randClumpedRange(max(D/3, 1), D x 5/3, 3)` (1848), where D = `staffChargeDuration` (1817): `(10000 if blinking or obstruction, else 5000) / enchant1`. Blinking and obstruction recharge at half speed, by design (comment at Time.c 1815-1816 in the donor).
- (c) Drain: while the timer is above 5D/3, remove a charge (if any) and subtract D (1850-1856).
- The player-facing estimate matches this loop: the item text divides D by 10 to give turns per charge (Items.c 2453 and 2460). So the mean is D/10 turns, with the spread from D/30 to 5D/30 turns.
- Charms: each charm's charges count down by the multiplier and clamp (a negative multiplier, from negative reaping, pushes charm charges UP, i.e. drains the charm; the clamp is 0 to the delay) to the charm's recharge delay (Time.c 1858). The delay is `charmRechargeDelay` (PowerTables.c 215-217): duration plus `rechargeDelayDuration x rechargeDelayBase^enchant`, with a minimum of `rechargeDelayMinTurns` turns.

Reaping, the melee-to-magic bridge (Combat.c 1125-1140, read in full). If the attacker is the player and `rogue.reaping` is set (a weapon property, set elsewhere, not read), and the victim is not inanimate or invulnerable: `specialDamage = min(damage, victim HP) x reaping` (1129). The amount is `rand_range(0, specialDamage)` for positive reaping and `rand_range(specialDamage, 0)` for negative (1130-1134). Non-zero amounts go to `rechargeItemsIncrementally` (1136). So a reaping weapon refills staffs on hits, and a negative weapon drains them.

Zap (Items.c 6555-6660, read in full except the bolt flight):
- (d) An identified staff or wand with no charges refuses the zap and returns false without using a turn (6561-6566).
- (e) Otherwise the player picks a direction (prompt at 6567), the bolt is copied from the catalog (`boltCatalog[table[kind].power]`, 6572), and for staffs the magnitude is set to enchant1 (6574). Blink distance is `staffBlinkDistance(netEnchant)` (6580).
- (f) An empty staff or wand fizzles. The message names the empty state (6632), the max-charges flag is set, and the turn ends (6637-6638). That is the only cost of an empty zap.
- (g) On success the staff's last-use slots shift (lastUsed[0..2], 6646-6648) and one charge is spent (6652). A wand also counts its discharges in `enchant2` (6653-6655, for the player's convenience).
- The success path returns true to the caller, which ends the turn. That caller was not read.
- There is no cast time, no interrupt and no global cooldown in this path. The cost is the charge and, on a fizzle, the turn.

Bolt effects (Items.c 4523-4641, read in part):
- (h) Domination (4523-4530): not on inanimate or invulnerable monsters; succeeds if `rand_percent(wandDominate(monst))`. Success clears discord and makes the monster an ally. `wandDominate` (PowerTables.c 45-46): 100 if `hp x 5 < maxHp` (below 20%), else `100 x (maxHp - hp) / maxHp` (so a full-HP monster has 0%). The target preview hides the bolt when that value is 0 (5262-5265, grep only).
- (i) Poison (4571-4573): `addPoison(monst, staffPoison(magnitude), 1)`. `staffPoison` is `5 x 1.3^(e-2)` with the index clamped to 0..50 (PowerTables.c 68-69). The addPoison stacking rule was not read.
- (j) Entrancement on the player (4591-4595): `status[CONFUSED] = staffEntrancementDuration` (3 x e, PowerTables 56) and `maxStatus = max(status, maxStatus)`. The current status is overwritten, not raised to the max, so a shorter new bolt can shorten an active longer confusion (see section 6). The monster branch was not read.
- (k) Discord (4639-4641): `status[DISCORDANT] = maxStatus = max(4 x e, status)`. The longer of the two wins, no stacking.
- Damage (staff): `low = (2 + e) x 3/4`, `high = 4 + 5e/2`, with `randClumpedRange(low, high, 1 + e/3)` (PowerTables.c 49-51). Blink `2 + 2e`, haste `2 + 4e` (PowerTables 52-53), protection `130 x 1.4^(e-2)` (58). Reflection `100 x (1 - 0.85^e)`, clamped to 1..100 (121-122, from a quarter-step table). These are in the table and the comment says so.

Monster casting (Monsters.c 2777-2800, read in full):
- (l) A monster with no bolts returns at once (2780). For each creature in turn, starting with the player, a valid target is checked. Then each bolt in the monster's list: blinking is skipped (2790, "handled elsewhere"), and a bolt that is specifically valid is cast with a 30% roll per turn (2795: `rand_percent(30)`) unless the monster has the always-use flag. The first cast ends the monster's turn. Summons are checked first in `monstUseMagic` (2808-2812).

Regen, the one HP pool (PowerTables.c 125-137, Rogue.h 1122). `turnsForFullRegenInThousandths(bonus)` = `1000 x 300 x 0.75^(bonus+10 index) + 2000`, with the table from -10 to 50 (133-134). So a bonus of 0 gives full regen in about 302 turns, each +1 of regen bonus multiplies the time by 0.75, and there is a 2-turn floor. The comment says this was a nerf after a +18 ring (not receipted).

Staff and wand rows (data): staffTable (Globals.c 1641), wandTable (GlobalsBrogue.c 701), charmTable (713), charm effects (GlobalsBrogue.c 729-732). Row fields for items (itemTable, Rogue.h 1423-1435): name, flavor, callTitle, frequency, marketValue, strengthRequired, power (bolt index), range (charges min, max, step), identified, called, magicPolarity (1 good, -1 aimed at allies, e.g. healing and haste at Globals.c 1651), magicPolarityRevealed, description. Bolt row fields (Rogue.h 1861-1874): name, description, abilityDescription, theChar, foreColor, backColor, boltEffect, magnitude, pathDF, targetDF, forbiddenMonsterFlags, flags. Charm effect row (GlobalsBrogue.c 730): kind, effectDurationBase, effectDurationIncrement, rechargeDelayDuration, rechargeDelayBase, rechargeDelayMinTurns, effectMagnitudeMultiplier (and constant, not in this row).

## 2. Key functions

- `rechargeItemsIncrementally`, `staffChargeDuration`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Time.c` 1815-1862.
- Power curves: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/PowerTables.c` 45-137, 206-220.
- Zap and bolt effects: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Items.c` 6555-6660 and 4523-4641.
- Reaping: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Combat.c` 1125-1140.
- Monster bolt use: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Monsters.c` 2777-2812.
- Data: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Globals.c` 1641-1652; `/mnt/frankendom-donors/tmewett-BrogueCE/src/variants/GlobalsBrogue.c` 58, 701-732.

## 3. Numbers vs mechanism

Table rows (name | effect | formula | number ranges | cost, cast time, cooldown | caps | file:line):

| name | effect | formula | number ranges | cost / cast / cooldown | caps | file:line |
|---|---|---|---|---|---|---|
| Staff charges | max uses | enchant1 = generated charges | start 2; 50% +1, then 15% +1, then 10% chain | one charge per zap | max = enchant1 | Items.c 327-337 |
| Staff recharge | charge returns | timer -10 per tick; at 0 a charge returns and the timer is re-armed | D = 5000 (or 10000) / enchant; re-arm in [D/3, 5D/3] | D/10 turns mean | room only | Time.c 1817, 1830, 1837-1848 |
| Staff drain | charge removed | timer above 5D/3 removes a charge and subtracts D | - | - | charges >= 0 | Time.c 1850-1856 |
| Reaping | melee refills or drains staffs | `rand(0, min(dmg, victim HP) x reaping)` | reaping as a weapon value | none | victim HP cap | Combat.c 1129-1136 |
| Zap cost | spend a charge | charges-- on success | - | fizzle costs the turn | identified empty: no turn | Items.c 6561-6566, 6632-6652 |
| Staff damage | bolt damage | clumped random in [low, high] | low (2+e)x3/4, high 4+2.5e, clump 1+e/3 | - | - | PowerTables.c 49-51 |
| Blink distance | teleport range | 2 + 2e | 4 at e=1 | - | - | Items.c 6580; PowerTables.c 52 |
| Haste duration | ally speed | 2 + 4e | - | - | - | PowerTables.c 53 |
| Discord duration | turn on allies | max(4e, existing) | - | - | no stacking | Items.c 4641; PowerTables.c 55 |
| Entrancement duration | confusion | 3e, overwrites on player | - | - | - | Items.c 4594-4595; PowerTables.c 56 |
| Poison | DoT stack | 5 x 1.3^(e-2), index 0..50 | - | - | index cap 50 | PowerTables.c 68-69 |
| Protection | shield | 130 x 1.4^(e-2) | - | - | - | PowerTables.c 58 |
| Reflection | bolt bounce chance | 100 x (1 - 0.85^e), 1..100 | - | - | 1..100 | PowerTables.c 121-122 |
| Domination | ally conversion | 100% if HP < 20%, else missing HP % | - | wand charges 1-2 | 0% at full HP | PowerTables.c 45-46; Items.c 4523-4525 |
| Monster bolt | enemy casts | 30% per turn per valid bolt | - | turn | blink excluded | Monsters.c 2790, 2795 |
| Charm recharge | charm cooldown | duration + base x rechargeBase^enchant | base 2500 (health); base 0.55 | min turns | rechargeDelayMinTurns | PowerTables.c 215-217; GlobalsBrogue.c 730 |
| HP regen | full regen time | 1000 x 300 x 0.75^(bonus) + 2000 | 300 turns at bonus 0 | - | 2-turn floor | PowerTables.c 133-134; Rogue.h 1122 |

Which numbers suit a fast mobile fight: a 3-charge staff re-arms in about 56 to 278 turns, which is too slow for a phone duel as a main attack, and right for a special that is used a few times per fight. A reaping hit that refills staffs is a good melee-to-magic bridge. The power curves are exponential in enchant; keep the table, not the formula, as data.

## 4. TypeScript sketch

simplified: keeps the staff charge timer (the decrement, the re-arm window, the drain window), the enchant curves for damage, poison, discord and entrancement, the domination formula, the monster 30% gate with blink excluded, and the reaping recharge. Omits: the fixed-point tables (floats here), the wisdom ring multiplier, the staff generation roll, the charm code, the blink path and bolt flight, the summons check, the entrancement monster branch, the addPoison stacking rule, the lastUsed bookkeeping, and the exact `randClumpedRange` algorithm (the sketch averages n uniform draws; the donor's clumped range was not read). The domination, entrancement and discord rules are as read. The sketch does not copy the entrancement overwrite; it uses max for the timed status (section 6).

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.

// --- 1. Staff power by enchant level e (donor uses fixed point; floats here) ---
export function staffDamageRange(e: number): [number, number] {
  return [Math.floor(((2 + e) * 3) / 4), Math.floor(4 + (5 * e) / 2)];
}
export function staffBlinkDistance(e: number): number { return 2 + 2 * e; }
export function staffHasteDuration(e: number): number { return 2 + 4 * e; }
export function staffDiscordDuration(e: number): number { return 4 * e; }
export function staffEntrancementDuration(e: number): number { return 3 * e; }
// Poison: 5 x 1.3^(e-2), index clamped to 0..50 (donor: 51-entry table).
export function staffPoison(e: number): number {
  const idx = Math.min(Math.max(e - 2, 0), 50);
  return Math.floor(5 * Math.pow(1.3, idx));
}

// --- 2. Staff charges: one timer per staff; +10 per turn; a charge is added when the timer reaches 0 ---
export interface Staff {
  enchant: number;          // max charges and recharge speed
  maxCharges: number;
  charges: number;
  timer: number;
  blinkOrObstruction: boolean;
}

export function chargeDuration(s: Staff): number {
  return (s.blinkOrObstruction ? 10000 : 5000) / s.enchant; // donor Time.c 1817
}

// Average of n uniform draws over [lo, hi]. Stand-in: the donor's randClumpedRange was not read.
function clumped(lo: number, hi: number, n: number, rnd01: () => number): number {
  let total = 0;
  for (let i = 0; i < n; i++) total += rnd01();
  return Math.floor(lo + (total / n) * (hi - lo));
}

// multiplier > 0 recharges, < 0 drains (donor: reaping hits pass a negative or positive amount).
export function rechargeTick(s: Staff, multiplier: number, rnd01: () => number): void {
  if ((s.charges < s.maxCharges && multiplier > 0) || (s.charges > 0 && multiplier < 0)) {
    s.timer -= 10 * multiplier;
  }
  const d = chargeDuration(s);
  while (s.timer <= 0) {
    if (s.charges < s.maxCharges) s.charges++;
    s.timer += clumped(Math.max(Math.floor(d / 3), 1), Math.floor((d * 5) / 3), 3, rnd01);
  }
  while (s.timer > Math.floor((d * 5) / 3)) {
    if (s.charges > 0) s.charges--;
    s.timer -= d;
  }
}

// --- 3. Wand of domination: chance from missing HP (donor PowerTables.c 45-46) ---
export function dominateChancePct(hp: number, maxHp: number): number {
  if (hp * 5 < maxHp) return 100;
  return Math.max(0, Math.floor((100 * (maxHp - hp)) / maxHp));
}

// --- 4. Timed status refresh: keep the longer of the two (donor discord, Items.c 4641) ---
export function refreshStatus(current: number, duration: number): number {
  return Math.max(current, duration);
}

// --- 5. Monster bolt gate: 30% per turn per valid target; blinking handled elsewhere (donor Monsters.c 2777-2795) ---
export function monsterCastsBolt(effect: string, validTarget: boolean, alwaysUse: boolean, rnd01: number): boolean {
  if (effect === "blinking") return false;
  return validTarget && (alwaysUse || rnd01 * 100 < 30);
}

// --- 6. Reaping: damage dealt recharges staffs by a random share of min(damage, victim HP) x reaping (donor Combat.c 1129-1136) ---
export function reapRecharge(
  damage: number,
  victimHp: number,
  reaping: number,
  rndRange: (lo: number, hi: number) => number,
  recharge: (amount: number) => void,
): void {
  const reaped = Math.min(damage, victimHp) * reaping;
  if (reaped === 0) return;
  const amount = reaping > 0 ? rndRange(0, reaped) : rndRange(reaped, 0);
  if (amount !== 0) recharge(amount);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/charge-pool.ts` (new module: staff and wand charges as item rows, the re-arm timer, the reaping hook, and the zap rules). Parity-checklist row 13 (specials). The timed-status refresh rule (section 4 item 4) belongs to the CC ladder in cell 1 and cell 2's module, `src/fight/cc-ladder.ts`.
- today: no magic module in `src/fight/` was checked here.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room, shape only)
- Brief rule served: 1 (one engine: charges and timers are server state, not client); data rule (charges, curves and durations are item rows).

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism. The numbers (5000 timer base, 10 per tick, 1/3 to 5/3 re-arm window, enchant curves, 30% monster gate, 20% domination threshold) are design values recorded with their donor lines.
- Defect, kept with a fix: entrancement on the player sets `status[CONFUSED]` to the new duration, not to the max of old and new (Items.c 4594), while the next line takes a max for `maxStatus` only (4595). A shorter bolt can shorten an active longer confusion. Fix: `max(status, duration)`, as the discord branch does (4641). The sketch uses max.
- Entrancement on monsters (after line 4600) was not read; check it before copying the rule for monsters.
- Domination has no resist roll: it depends on missing HP only, so a full-HP monster is never dominated and a monster under 20% HP is always dominated (PowerTables 45-46). Frankendom's PvP consent rule (no control of a flagged-off player) is not in the donor. Mind control of players is out of scope here and needs its own rule.
- The "spell vs melee" link is reaping. A negative reaping weapon drains staffs as well as refilling them (Combat.c 1133). That is a melee-to-magic cost; decide whether Frankendom wants a drain.
- No diminishing returns anywhere in the repo (grep 0 hits). The statuses stack or refresh by their own rules. Use the one CC ladder from cell 1 for stun-like effects; do not copy the donor's per-status rules.
- Fizzle costs a turn, but an identified empty staff refuses for free (Items.c 6561-6566, 6632-6638). Pick one rule for the phone: a refused zap should cost nothing, a fizzle should cost the action.
- Charges are per item, so a player's magic is limited by pack items. Frankendom's loot rules decide how many staffs a fight can see.
- Depth thin: the bolt flight and target selection, the summon code, addPoison, the monster entrancement branch, the staff generation roll above line 330, and the rest of the bolt catalog were not read.

Rulings for Dom (the questions Dom must decide, each with a recommendation):
1. Should magic use a character pool (mana or focus) or item charges that re-arm on a random timer? Recommendation: charges on items, as the donor does. A pool would be a second health-like bar on a phone, and the charge timer gives variance without a bar.
2. Should a melee reaping effect be allowed to drain staffs (negative reaping), or only refill them? Recommendation: refill only at first, so melee never costs magic.
3. Should a zap refused for an empty identified staff cost the turn? Recommendation: no, it refuses for free (donor behaviour, Items.c 6561-6566), and a fizzle on an unknown staff costs the turn (6637-6638).

## 7. Pass-2 additions

As-data shape:
- Item rows (itemTable, Rogue.h 1423-1435): name (string), flavor (string), callTitle (string, player-set), frequency (short), marketValue (short), strengthRequired (short), power (int, bolt index for staffs, wands and charms, or effect id for scrolls and potions), range (randomRange: min, max, step, the charge range), identified (bool), called (bool), magicPolarity (int: 1, 0, -1), magicPolarityRevealed (bool), description (string).
- Example staff row (Globals.c 1651, healing): name "healing", flavor itemWoods[10], frequency 5, marketValue 1100, strengthRequired 0, power BOLT_HEALING, range {2,4,1}, polarity -1.
- Example wand row (GlobalsBrogue.c 706, domination): charges {1,2,1}, power BOLT_DOMINATION, marketValue 1000, frequency 1.
- Bolt rows (bolt catalog, GlobalsBrogue.c 58 on): name, description, abilityDescription, theChar, foreColor, backColor, boltEffect (BE_* enum), magnitude, pathDF, targetDF, forbiddenMonsterFlags, flags (Rogue.h 1861-1874). A staff's magnitude is replaced at zap time by its enchant (Items.c 6574).
- Charm effect rows (GlobalsBrogue.c 729-732): kind, effectDurationBase, effectDurationIncrement (a table), rechargeDelayDuration, rechargeDelayBase (a fixed-point factor), rechargeDelayMinTurns, effectMagnitudeMultiplier, effectMagnitudeConstant.
- Table-driven: yes for the item kinds, charges, prices, frequencies, bolt effects and magnitudes. The power formulas are code (PowerTables.c), keyed by the enchant and by the bolt effect. So the numbers per item are rows and the curves are code.
- A new staff kind is one row: yes if its effect is one of the existing BE_* effects (e.g., a new damage staff is one row with BOLT_FIRE-style effect). No for a new effect, which needs a new BE_* case in Items.c.
- Spellmaking (Daggerfall-style custom spells): not in this donor. Scrolls and potions are fixed kinds. Acquisition is by table frequency and by identification (section 1).
- Economy: marketValue per item row; the reagents-as-items idea is not present.

Provenance per claim: repo `/mnt/frankendom-donors/tmewett-BrogueCE`, licence AGPL-3.0 (LICENSE.txt lines 1-2). Every number and claim above has a receipt in `receipts.tsv` (246 rows across the three cells, verifier passed). Copyleft: shape only.

What they patched later (no `.git`; `CHANGELOG.md` is the history, 909 lines):
- Auto-targeting now skips targets where the item would have no effect (CHANGELOG 103-106): it takes reflection, fire immunity, health (for domination and healing), negatable abilities, proximity and weapon immunity into account. This is a preview rule, not a change to domination itself.
- Discordant monsters now attack the player when they could (line 29): a discord bug fix; the discord rule is a live area.
- Entranced monsters crash fix (line 432): entrancement has had a crash.
- Discordant wanderers no longer target the player with bolts or spells (line 426): a targeting fix for discord.
- Staff of protection duration buffed (line 612): the curve was retuned once.
- Firebolt and lightning damage and haste duration values fixed (line 898): the damage and haste curves were wrong for a time. (The reason the curves are tables is the out-of-sync comment at PowerTables.c ~36-41: pow() was replaced by lookup tables for saved-game and recording sync.)
- Defect found in this read: entrancement overwrites the current confusion (Items.c 4594), not kept by any changelog line. Recorded in section 6.

Rulings for Dom: three, in section 6 above.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Staff generation omitted the 50% first roll (Items.c 328-335): fixed.
- Reaping acceptance range was 0 to 40 units; real is 0 to 400 units (0 to 40 turns): fixed.
- CHANGELOG 105 misread (auto-target preview, not a domination rule change): fixed.
- "Power curves are tables" reason for the 898 fix was inference; real reason is PowerTables.c comment: fixed.
- Missed: negative multiplier raises charm charges (drain): added.
Fixed 2026-10-12: staff generation roll, reaping acceptance range, CHANGELOG 105 reading, table-reason line, charm drain line. Sketch code unchanged (it was already right).
