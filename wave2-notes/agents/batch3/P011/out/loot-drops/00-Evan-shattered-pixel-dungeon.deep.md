# 00-Evan-shattered-pixel-dungeon (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/Mob.java` | Licence: GPL-3.0 (LICENSE.txt: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | Java | symbol `rollToDropLoot`

Checked: The list's hint (`items/Heap.java`) is the floor pile that a drop lands on. I grepped it (class line 60, `enum Type` 62, `pickUp` 133) but did not read it in full. The real roll is `Mob.rollToDropLoot` (1096-1124, read in full), called from `Mob.die` (1022-1036, ENEMY branch at 1030, read). Also read in full: `Mob.lootChance` (1075-1093), `Mob.createLoot` (1139-1165), the deck logic in `items/Generator.java` (random() 675-686, random(Category) 698-730, reset 645-655, fullReset 625-637, category table 275), `Random.chances` (SPD-classes `Random.java` 175-190), `RingOfWealth.tryForBonusDrop` (111-165) and its tracker classes (314-316), `Bat.java` 84-96, `Gnoll.java` 38-42. Not read: `Level.drop` (where the item is placed), `Random.NormalIntRange`, `getBuffedBonus`, `Challenges.isItemBlocked`, `genEquipmentDrop`, `ExoticCrystals`, `Dungeon.LimitedDrops`, the tier tables in the item generators, and the soul-eater step. Confidence high on the order of the roll and the level gate, which I read in full; medium on the deck details, which I read but did not trace through every category.

## 1. Mechanism

- A kill of an enemy (not an ally, not a chasm death) calls `rollToDropLoot()` once, from `die()`, inside the ENEMY branch (1030, 1036). Then the other kill effects run.
- Order of steps inside `rollToDropLoot` (1096-1124):
  - (a) Level gate: if the hero's level is more than `maxLvl + 2`, return at once (1097). Nothing after it runs, so no base drop, no wealth bonus, no lucky proc, and no pity progress. This blocks farming weak monsters at high level.
  - (b) Thief gate: the base roll runs only if the monster's `StolenTracker` says no item was stolen (1099-1100). The later steps still run.
  - (c) Base roll: if `Random.Float() < lootChance()` (1101), `createLoot()` (1102) makes the item and `Dungeon.level.drop` places it at the monster's cell (1104).
  - (d) Wealth bonus: `rolls` is 1 for a normal monster, 5 for a mini-boss (1113), 15 for a boss (1112). `RingOfWealth.tryForBonusDrop(hero, rolls)` (1114) returns a list, and each entry is dropped at the same cell (1116), then a flare is shown (1117). Runs only when the wealth bonus is above 0 (check at 1110; `tryForBonusDrop` also returns early at 114 when it is 0).
  - (e) Lucky proc (1122-1123): a separate drop if the buff is present.
  - (f) Soul-eater talent (1127-1131): not read beyond the call.
- `lootChance()` (1075-1093): `base lootChance x dropBonus`. `dropBonus` starts at the wealth multiplier `1.20^wealth` (RingOfWealth 107-109, the `Math.pow(1.20, ...)` line). It adds a bounty-hunter term only if the hero has the tracker and a Preparation buff (1080-1089), and adds `ShardOfOblivion` multiplier minus 1 (1091). Subclasses override: `Bat.lootChance` multiplies by `(7 - BAT_HP.count) / 7` (Bat 86-88), so the bat's potion chance falls to 0 after 7 counted drops. `Bat.createLoot` increments that counter before the normal `createLoot` (Bat 91-94).
- `createLoot()` (1139-1165): if `loot` is a `Generator.Category`, it calls `randomUsingDefaults` (no deck). If it is a class, it may swap to an exotic potion or scroll with `ExoticCrystals.consumableExoticChance()`, then calls `Generator.random(class)`. Otherwise it returns the fixed item.
- Generator deck (`Generator.java`):
  - `random()` (675-686): picks a category by weight from `categoryProbs` (676), then takes one away from that category (682). If no category has weight left, it swaps deck halves and rebuilds the weights (679-681). The comment says the game has two decks of 35 items (275).
  - `random(Category)` (698-730): armour, weapons and missiles use their own tiered generators. Artifacts fall back to a ring when none are left. Other categories with a deck: the category's own seeded stream is pushed (713, skipping `dropped` values, 714), the item index is drawn by weight (717), and if the deck is empty it is restocked and redrawn (719-720). The drawn weight is taken away (722), the seeded stream is popped (726), and the count advances (727). As the code reads: the n-th draw of a category uses the n-th value of that category's seeded stream, so its outcome does not depend on when it happens.
  - Exotic swap for potions and scrolls at 731, as in `createLoot`.
  - `reset(cat)` (645-655): if the category has a second deck table, it toggles between the two; otherwise it restores the default table.
  - `fullReset` (625-637): picks the deck half, then gives each deck category its own seed (632).
- Pity counter (`RingOfWealth.tryForBonusDrop`, 111-165): on each call `triesToDrop` counts down by `tries` (131). While it is 0 or below (132): if `dropsToEquip` is 0 or below (133), an equipment drop is made with tier from the wealth level (149) and `dropsToEquip` is topped up by a random 5-10 (152). Otherwise a consumable drop is made and `dropsToEquip` counts down by 1 (159). After either, `triesToDrop` is topped up by a random 0-20 (161). Both counters are buffs with `revivePersists = true` (316), so they survive death.

## 2. Key functions

- `rollToDropLoot`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/Mob.java` 1096-1124. Level gate, base roll, wealth pity, lucky proc.
- `lootChance`: same file 1075-1093. Base chance times the wealth, bounty and shard multipliers.
- `createLoot`: same file 1139-1165. Category, class or fixed item.
- `Mob.die` (loot call only): same file 1022-1036, ENEMY branch at 1030, call at 1036.
- `Generator.random()` and `Generator.random(Category)`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/items/Generator.java` 675-730. The category deck and the per-category item deck.
- `RingOfWealth.tryForBonusDrop`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/items/rings/RingOfWealth.java` 111-165. The pity counters.
- `Random.chances` (weighted pick, returns -1 when the weights sum to 0): `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/utils/Random.java` 175-190.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Level gate: no loot once the killer is more than 2 levels above the monster's top level | `maxLvl + 2` (theirs, Mob 1097); default `maxLvl = Hero.MAX_LEVEL - 1` (Mob 134); Rat 5 (Rat.java 39), Gnoll 8 (Gnoll.java 38), Crab 9 (Crab.java 39), Bat 15 (Bat.java 43); grep lines only for the last four, not read in context |
| Base chance per kill, scaled by a multiplier per bonus level | Wealth multiplier 1.20 per level (theirs, RingOfWealth 108); Gnoll gold 0.5 (theirs, Gnoll 41); Bat potion chance times (7 - count) / 7 (theirs, Bat 87) |
| Pity counter: each kill counts down by its rolls, one bonus per time it crosses 0 | Rolls: 1 normal, 5 mini-boss, 15 boss (theirs, Mob 1111-1113 with 1112 and 1113 as receipts); re-arm 0-20 (theirs, RingOfWealth 161); equipment countdown re-arm 5-10 (theirs, 152) |
| Deck: draw by weight, remove the card, restock when empty | Two decks of 35 (theirs, Generator 275); e.g. potion table `{0, 3, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1}` (theirs, Generator 342) |
| Seeded deck: the n-th draw of a category is fixed for a seed | Stream per category set at `fullReset` (theirs, Generator 632) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (level gate first, then the base roll with the wealth multiplier, then the pity counter with equipment before consumable). It omits the thief gate, the bounty-hunter and shard multipliers, the Lucky proc, the soul-eater step, the exotic swap, the per-monster subclass overrides (Bat's counter), and the seeded per-category stream and its `dropped` count. It also replaces the donor's `Random.chances` with a plain weighted pick, and takes the item makers as callbacks, so the equipment tier generator and `Challenges` blocking are not modelled. The pity counter's ranges are passed in (`rollRange`) because the donor's `NormalIntRange` was not read.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Deck {
  left: number[];   // copies left per index; a deck with nothing left is restocked from full
  full: number[];
}

interface Monster {
  maxLvl: number;   // no drops at all once the hero is more than 2 levels above this
  chance: number;   // base chance per kill
  rolls: number;    // pity steps for this kill: 1 normal, 5 mini-boss, 15 boss
}

interface Hero {
  level: number;
  wealth: number;          // wealth bonus level; 0 = no bonus drops
  pity: number;            // counts down per kill; a bonus drop fires at 0 or below
  equipCountdown: number;  // bonus drops left before the next equipment drop
}

type Rand = () => number;
type RangeRoll = (min: number, max: number) => number;

// Picks an index by weight. A deck with nothing left is restocked first, then drawn.
function drawFromDeck(deck: Deck, rand: Rand): number {
  let total = deck.left.reduce((a, w) => a + Math.max(0, w), 0);
  if (total <= 0) {
    deck.left = deck.full.slice();
    total = deck.left.reduce((a, w) => a + Math.max(0, w), 0);
  }
  if (total <= 0) return -1;
  let r = rand() * total;
  for (let i = 0; i < deck.left.length; i++) {
    const w = Math.max(0, deck.left[i]);
    if (r < w) {
      deck.left[i] -= 1;
      return i;
    }
    r -= w;
  }
  return -1;
}

// One kill, in donor order. The level gate returns before any roll, so the pity counter does not move either.
function onKill(
  hero: Hero,
  mon: Monster,
  baseDeck: Deck,
  consDeck: Deck,
  rand: Rand,
  rollRange: RangeRoll,
  pickBase: (i: number) => string,
  pickConsumable: (i: number) => string,
  pickEquip: () => string,
): string[] {
  const drops: string[] = [];
  if (hero.level > mon.maxLvl + 2) return drops;

  // base roll: chance scaled by the wealth multiplier 1.2 per wealth level
  const mult = Math.pow(1.2, hero.wealth);
  if (rand() < mon.chance * mult) {
    const i = drawFromDeck(baseDeck, rand);
    if (i >= 0) drops.push(pickBase(i));
  }

  // pity counter: each kill counts down by its rolls; every time it reaches 0 or below, one bonus drop
  if (hero.wealth > 0) {
    hero.pity -= mon.rolls;
    while (hero.pity <= 0) {
      if (hero.equipCountdown <= 0) {
        drops.push(pickEquip());
        hero.equipCountdown += rollRange(5, 10);
      } else {
        const i = drawFromDeck(consDeck, rand);
        if (i >= 0) drops.push(pickConsumable(i));
        hero.equipCountdown -= 1;
      }
      hero.pity += rollRange(0, 20);
    }
  }
  return drops;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module; loot roll and XP award, parity-checklist row 18). Runs on the server only, after a server-verified kill, and writes to the one ledger. The sketch takes the monster as data (`maxLvl`, `chance`, `rolls`), which fits zones as data.
- today: loot is not in Frankendom's fight code (not read here; the target is the planned home).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: server-verified kills, one ledger, zones as data. Rules 7-9 n/a.
- Best transferable idea: gate loot on the killer's level against the monster's top level, and make a bonus-drop pity counter that fires a fixed number of times per kill, instead of rolling every kill at random.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- The donor rolls in the local kill path. Frankendom must roll only on the server, after the kill is verified, and must not roll on the client. The sketch does not decide where the call sits.
- The pity counters and the equipment countdown are per-hero buffs that survive death (`revivePersists`, RingOfWealth 316). Frankendom's one-ledger rule means these must be ledger fields on the character, not buffs.
- The donor's base rolls use a global RNG. The deck streams are seeded per category. Frankendom needs a seeded RNG per fight so that a replay (row 19) gives the same drops. The donor's per-category seed is a good idea, but it must be keyed to the fight seed, not to the level.
- The bat's counter (`Dungeon.LimitedDrops.BAT_HP`) is a run-wide global. Frankendom should not copy a global; a per-zone or per-ledger field is the fit. `Dungeon.java` 118 declares it; the reset rules were not read.
- The level gate is the main anti-farm rule here. Its numbers (`maxLvl` per monster) are per-monster data, which is the zone-as-data shape; the values are the donor's, not Frankendom's.
- Equipment tiers (`genEquipmentDrop`) and `Challenges.isItemBlocked` were not read. The sketch takes an equipment callback instead of guessing the tiers.
- `NormalIntRange` was not read. The re-arm ranges 0-20 and 5-10 are the donor's arguments; the true spread is unknown here.
- Deck-based drops remove streaks, but the donor's two decks and the category weights (POTION (8, 8), SCROLL (8, 8), GOLD (10, 10) at Generator 246, 249, 252) are the donor's design. Frankendom needs its own table.
