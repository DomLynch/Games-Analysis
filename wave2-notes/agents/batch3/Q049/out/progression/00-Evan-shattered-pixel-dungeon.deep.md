# 00-Evan-shattered-pixel-dungeon (progression, cell 10)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/hero/Hero.java` | Licence: GPL-3.0 (`LICENSE.txt`, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; the per-file headers were not read) | Java | symbol `Hero.earnExp` (with `Hero.maxExp`, `Mob` kill award at `Mob.java` 988-1001)

Checked: The hint file `Hero.java` is the real implementation of the level loop, read 2000-2135 in full, plus `maxExp` 2110-2116, HP per level 258-268, and talent point rules 380-416. The kill side is `Mob.java` 975-1012 (read in full) and `AllyBuff.java` 60-85 (read). `EtherealChains.java` 344-364 read in full as the one XP-fed consumer I traced. Grep of `earnExp(` in `core/src/main` gives five callers besides the definition: `Mob.java:1001`, `AllyBuff.java:77`, `AscensionChallenge.java:208`, `Pasty.java:153`, `PotionOfExperience.java:44`. I read the first two and the Hero body; the other three were not read. NOT read: `AscensionChallenge.processEnemyKill` and its buff body; the per-mob `EXP` and `maxLvl` values (only the default lines 133-134 and a grep); `Bless.DURATION`; the body of `Pasty` and `PotionOfExperience` beyond the call; the talent-spending UI; `items/*` `onHeroGainExp` implementations beyond the call. `Talent.java` read only at 436 and 960 (grep lines). Camera scope: not a camera cell. Confidence: high on the kill cutoff, the level loop and the cap; high on the charge fraction, since I read `Hero.earnExp` 2016-2046 and one consumer; medium on talent tier rules (read the two functions, not the spend path).

Best transferable idea: Make the kill reward a hard level-gap cutoff (a mob gives nothing once the hero is above its max level), and carry an XP award's remainder through every level it clears, so one large award is not cut short at the first level.
Decision (proposed): adapt — keep the cutoff and the carry-over loop in the award function; reject the XP-to-charge meters, because they would be a second ledger fed from XP and Frankendom's rule is one ledger.
Acceptance: A server test: a level-12 hero who kills a mob with maxLevel 10 gains 0 XP and the kill is still logged; an award that clears two level bars in one call levels the hero twice and keeps the remainder in the next bar; at level 30 the remainder is dropped and a timed buff is applied instead.

## 1. Mechanism

- Kill award (`Mob.java` 975-1001). On an enemy's death, the hero is credited with `exp = Dungeon.hero.lvl <= maxLvl ? EXP : 0` (988). So the cutoff is hard: a mob gives its full `EXP` at or below its `maxLvl`, and nothing above it. The default `maxLvl` is `Hero.MAX_LEVEL-1`, i.e. 29 (134), and the default `EXP` is 1 (133); per-mob values were not read.
- Ascension fallback (993-995). Only when the normal award is 0 and an ascension buff is active and the hero is below level 30, the mob gives `round(10 x spawningWeight())` XP, where `spawningWeight()` returns 1 in the base class (1168-1169). Not traced further.
- Award call (1001): `Dungeon.hero.earnExp(exp, getClass())`. The source is the mob class, so the XP enters the ledger.
- `earnExp` (`Hero.java` 2010-2108), in order:
  (a) If the source is not an ascension challenge, `this.exp += exp` (2013-2014). Ledger write, one place.
  (b) `percent = exp / maxExp()` (2016): the gain as a fraction of the current level bar, computed before any level-up.
  (c) Consumers of `percent` (2018-2054): charge meters (chains, horn, toolkit, armband, berserk recovery, each item's `onHeroGainExp`, and three furrow counters that count down by `percent x 200`, `x 20` and `x 100`). The furrow counters are only applied when the source is not `PotionOfExperience` (2033-2054). Not every consumer was read.
  (d) Level loop (2058-2087): `while (this.exp >= maxExp())`, subtract the current level's cost (2059), then if `lvl < MAX_LEVEL` (30, `Hero.java` 205), increment the level, apply the level-up stat changes (`updateHT(true)`, `attackSkill++`, `defenseSkill++`, 2066-2076). Otherwise (at the cap) apply `Bless` (2079) and set `exp = 0` (2080). The loop carries the remainder through every level it clears.
  (e) After the loop, if any level was gained, show messages, sound, and a talent blink while below the top talent threshold (2089-2102).
- Level cost: `maxExp(lvl) = 5 + lvl x 5` (2114-2116). Linear, not a table. `maxExp()` reads the current level (2110-2111), so each loop pass uses the new level's cost.
- HP per level: `HT = 20 + 5 x (lvl - 1) + HTBoost` (263), then a ring multiplier, then the elixir boost (264-268).
- Talent points, per tier (`Hero.java` 393-416): a tier opens at level `tierLevelThresholds[tier] - 1` (`Talent.java` 436 gives `{0, 2, 7, 13, 21, 31}`), so tier 1 at level 1, tier 4 at level 20. Tier 3 needs a subclass and tier 4 needs an armour ability (395-396). Points available are the tier size minus spent plus bonus, or `1 + lvl - threshold - spent + bonus` while the tier is still filling (399-401). The bonus is +2 for a tier boosted by a divine inspiration tracker (410-412).
- Tick: no tick. Synchronous, once per kill or other award call. Callers: five others (see Checked).

## 2. Key functions

- `Hero.earnExp`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/hero/Hero.java` 2010-2108. Ledger write, fraction for consumers, level loop, cap.
- `Hero.maxExp(int)`: same file, 2114-2116. `5 + lvl * 5`.
- `Mob` kill award: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/Mob.java` 975-1012. The level-gap cutoff (988) and the ascension fallback (993-995).
- `AllyBuff` kill award: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/buffs/AllyBuff.java` 60-82. Same cutoff for ally kills (73).
- `EtherealChains.chainsRecharge.gainExp`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/items/artifacts/EtherealChains.java` 344-362. Example XP-fed meter with a soft cap.
- Talent points: `Hero.java` 385-416, rules in `Talent.java` 436.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hard cutoff: no award above the source's max level | `maxLvl` default 29 = MAX_LEVEL - 1 (theirs, Mob.java 134); per-mob values not read |
| Award = source value, or 0 | `EXP` default 1 (theirs, Mob.java 133) |
| Linear cost per level, carry the remainder through each cleared level | `5 + 5 x lvl` (theirs, Hero.java 2115) |
| Cap: at the top level, drop the remainder and add a timed buff | MAX_LEVEL 30 (theirs, Hero.java 205); Bless (theirs, 2079; duration not read) |
| Fraction of the current bar, for consumers | `exp / maxExp()` (theirs, Hero.java 2016) |
| Soft cap on a consumer: above it, the same fraction charges less | `5 + 2 x level` (theirs, EtherealChains.java 350-351); x6 partial charge (353) |
| HP grows per level | `20 + 5 x (lvl - 1)` (theirs, Hero.java 263) |
| Talent tier open levels | `{0, 2, 7, 13, 21, 31}` (theirs, Talent.java 436) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the award: the level-gap cutoff on the kill, then the ledger write, then the carry-over loop with the cap, and returns the bar fraction the donor passes to consumers. It omits the ascension fallback and ascension-sourced XP, the item and buff consumers apart from one soft-capped meter, the level-up stat and talent effects, the furrow counters, the potion-of-experience and pasty sources, and the talent point rules. The cap buff is simplified to extending a timestamp from now or from the current expiry; the donor calls `Buff.prolong` with `Bless.DURATION`, which was not read.

```ts
// Licence: GPL-3.0 (donor LICENSE.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface HeroXp {
  level: number;
  xp: number;
  blessUntil: number;        // ms timestamp until which the cap buff runs
}

interface MobXp {
  xp: number;                // XP the mob is worth (donor: Mob.EXP)
  maxLevel: number;          // highest hero level that still earns this mob's XP (donor: Mob.maxLvl)
}

interface Meter {
  charge: number;
  softCap: number;           // charge above this slows XP-fed charge (donor: 5 + 2 x item level)
  partial: number;           // fractional charge not yet converted
}

const MAX_LEVEL = 30;        // donor: Hero.MAX_LEVEL

// XP needed to clear the current level (donor: maxExp(lvl) = 5 + 5 x lvl)
function xpToNext(level: number): number {
  return 5 + 5 * level;
}

// Kill XP: a hard cutoff. Above the mob's max level the kill gives nothing.
function killXp(hero: HeroXp, mob: MobXp): number {
  return hero.level <= mob.maxLevel ? mob.xp : 0;
}

// Gain XP: carry the excess through every level it clears; at the cap the excess is dropped and a buff is added.
// Returns the fraction of the current level bar this gain filled, for XP-fed meters.
function earnXp(hero: HeroXp, amount: number, now: number, blessMs: number): number {
  const fraction = amount / xpToNext(hero.level);
  hero.xp += amount;
  while (hero.xp >= xpToNext(hero.level)) {
    hero.xp -= xpToNext(hero.level);
    if (hero.level < MAX_LEVEL) {
      hero.level += 1;
    } else {
      hero.blessUntil = Math.max(hero.blessUntil, now) + blessMs; // simplified: extend from now or from current expiry
      hero.xp = 0;
    }
  }
  return fraction;
}

// Feed an XP fraction into a meter; above the soft cap the same fraction charges less.
function feedMeter(m: Meter, fraction: number): void {
  let f = fraction;
  if (m.charge > m.softCap) f *= m.softCap / m.charge;
  m.partial += f * 6;        // donor: partialCharge += levelPortion * 6
}
```

## 5. Lands in

- TARGET `src/fight/xp-award.ts` (the same engine module as the OpenDAoC cell, so one award path serves both): the kill award and the level loop. Parity-checklist row 18 (loot roll and XP award).
- today: (not read; Frankendom's current XP code is outside this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room only, shape not code)
- Brief rule served: one ledger (single XP write in the award function; consumers get a read-only fraction if they are ever allowed); zones as data (`maxLevel` and `xp` per creature, in zone data); row 18.

## 6. Gaps and risks

- GPL-3.0 copyleft: clean-room only. The sketch is from the mechanism and was typechecked on the VPS; it has no tests.
- The cutoff is a cliff: a mob gives everything at `maxLvl` and nothing one level above. Frankendom's zones as data should decide whether it wants a cliff or a falloff; the donor has no falloff, and this note does not recommend one.
- The XP-fed meters (chains, horn, toolkit, armband, berserk, furrows) are the donor's way of making XP a second resource. Frankendom's one-ledger ruling rejects that. If a specials meter is wanted, it should be a separate, explicit charge rule, not a side effect of XP.
- At the cap the donor discards the remainder and applies a buff (2079-2080). Whether Frankendom wants excess XP to become a buff, to be discarded, or to be banked is a designer decision; the sketch's simplified buff extension is not a donor rule that was verified.
- The level loop carries the remainder, unlike the OpenDAoC single-step level check (see the other note). This is the better shape for a server award.
- The per-mob `EXP` and `maxLvl` values, the ascension fallback, and `Pasty`/`PotionOfExperience` XP sources were not read; zone data for Frankendom would need those values from the donor's content files, which this pass did not open.
