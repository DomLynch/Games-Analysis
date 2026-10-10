# afritz1-OpenTESArena (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/ArenaEntityUtils.cpp` | Licence: MIT (The OpenTESArena Developers; read in LICENSE.txt, header lines only) | C++ | symbol `ArenaEntityUtils::getPopulatedLootSlots`

Checked: The hint file (`World/MapGeneration.cpp`) only builds the entity definition (line 325 sets `allowsLootGeneration = true` for pile containers); the real mechanism is in `Entities/ArenaEntityUtils.cpp` (creature and container roll functions, read 15-121 and 426-486 and 641-672 and 684-906), the call sites in `Entities/EntityChunkManager.cpp` (initializeEntity, read 366-372, 600-1015) and the first-loot path (`Interface/GameWorldUiMVC.cpp` 1491-1537, `Player/PlayerLogic.cpp` 585-640). Not read: `pickSpellCastingItem` and the other accessory pickers (488+), `pickNonMagicArmor`/`pickNonMagicWeapon`, the EXE-derived tables (loot chances, palace gold, creature loot chances); those numbers live in the original game executable data, not in the source tree, so I cannot quote them. This is a single-player game: there is no drop ownership or shared-loot rule. Confidence: high on the control flow and formulas, none on the table values.

## 1. Mechanism

- Two sources of loot, both rolled when the entity is created (chunk load), not when it dies. `initializeEntity` seeds a small private RNG from the engine RNG (370) and then fills the entity's inventory.
- Creatures carry a packed `lootChances` word: four bytes, gold chance, magic-item chance, plain weapon/armour chance, magic weapon/armour chance (ArenaEntityUtils 17-32). At spawn: a magic item is possible only if the creature level is above 2 and a 1..100 roll is at or under byte 1 (92-100); a plain weapon or armour needs only the roll (103-108); a magic weapon or armour needs level above 6 plus the roll (112-120). Magic item kind is a coin flip between a potion (one of 15 types) and an accessory or trinket whose quality threshold is `level + 1` (435-445, 641-644, 456). Accessory kind is then one in three (468).
- Creature gold is NOT rolled at spawn. It is rolled the first time the player loots the corpse (GameWorldUiMVC 1504, with the donor's own comment "should be done at creature instantiation"). The `hasBeenLootedBefore` flag is set first, so it can only happen once (PlayerLogic 612-615). Roll: a 1..100 roll must be at or under the gold chance; then a second roll 0..100 must NOT be under the same chance (the code comment says the original game reversed the comparison, so gold is unlikely for creatures with high gold chance). Amount = (1..10) x (level + 1) (ArenaEntityUtils 67-88). Gold is added straight to the player's gold counter (1515).
- Humanoid enemies roll gold at spawn (the call site at EntityChunkManager 817 was seen by grep, the lines around it were not read): chance index depends on class category (thief 0, mage 1, else 2), the roll must be strictly below the table chance, and the amount is 1..50 (646-672).
- Containers (chests, piles, houses) have four slots, each an independent roll: slot 0 gold, slot 1 magic item, slot 2 plain weapon/armour, slot 3 magic weapon/armour. Slot `i` is filled if `random.next(100)+1 <= lootChances[lootValuesIndex*4 + i]` (704-719). `lootValuesIndex` is chosen by the interior type: house, palace, noble, dungeon, crypt (tower shares crypt) (684-702).
- Per-container formulas: house gold `(0..8)+2`, halved in villages, doubled elsewhere; noble gold is the house formula x10; palace gold is a fixed table value by city type; dungeon and crypt gold is `level^2 + (1..100)` where `level` is the dungeon floor index (721-772). Magic-item quality threshold: house 1..5, noble 2..10, palace 16/14/12 by city type, dungeon `5 x (level+1)`, crypt `3 x level` (806-842). An accessory is created only if the threshold is at least 3 (793). Slot 2 always uses quality 16 (the original computed a threshold then overwrote it; the code says so, 850-851). Slot 3 is a uniform pick from every weapon/armour/shield definition (a "@todo" says the real game picks an actually magic one) (EntityChunkManager 1003-1011).
- Item condition (durability) of looted gear is a percentage of max health picked from a 3-entry table; "favourable" container types use entries 1 and 2 only (ArenaEntityUtils 876-906).
- Player drop piles (items the player dropped) never roll loot (EntityChunkManager 626-633).
- Tick: none. Rolls happen at entity creation and on the first corpse interaction.

## 2. Key functions

- `ArenaEntityUtils::getPopulatedLootSlots`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/ArenaEntityUtils.cpp` 704-719. Four independent slot rolls from a chance table.
- `ArenaEntityUtils::getLootGoldAmount` and `getLootItemQualityThreshold`: same file 721-772 and 806-842. Per container-kind gold and quality formulas.
- `ArenaEntityUtils::getCreatureGold`: same file 67-88. Double-roll gold with level scaling.
- `ArenaEntityUtils::getCreatureHasMagicItem` and siblings: same file 90-121. Level-gated item chances from the packed word.
- `EntityChunkManager::initializeEntity` (loot part): `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` 613-1015. Calls the above and fills the inventory.
- `GameWorldUiController::onEnemyCorpseInteractedFirstTime`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Interface/GameWorldUiMVC.cpp` 1491-1537. Rolls corpse gold once.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-source packed chance word: gold / magic item / plain gear / magic gear | Byte layout of `lootChances` (theirs, ArenaEntityUtils 17-32); the values are in the original EXE (not read) |
| Level gates: rare drop classes unlock above a creature level | Level > 2 for magic items, level > 6 for magic gear (theirs, 92 and 112) |
| Container = four independent slots with their own chance per container kind | Chance table `lootChances[kind*4+slot]` (EXE data, not read) |
| Gold scales with creature level or dungeon depth | Creature `(1..10)x(level+1)` (theirs, 86); dungeon `level^2 + 1..100` (theirs, 765) |
| Quality threshold scales with depth or city rank | Dungeon `5x(level+1)`, crypt `3x level`, palace 16/14/12 (theirs, 832, 835, 817-825) |
| Fixed-quality fallback for plain gear | 16 (theirs, 851) |
| Double-roll with a reversed comparison to make gold unlikely at high chance | Same chance used twice (theirs, 71-81) |
| Rolled-once flag on the corpse | `hasBeenLootedBefore` |

## 4. TypeScript sketch

simplified: the sketch keeps the formulas but changes the order of RNG draws (the donor rolls item classes in separate functions with a shared arena RNG, so replaying the same seed would differ). It omits item definition lookup, potion and accessory kind selection beyond the quality number, condition percentages, human enemy gold, armour/weapon material, and the first-loot flag (the caller owns it). Chance tables and formulas are passed as data, since the donor reads them from an EXE.

```ts
// Licence: MIT (donor). Adapted from the described mechanism; MIT permits adaptation with the notice kept.
// RNG is injected: next(max) returns an integer in [0, max)
interface Rng { next(exclusiveMax: number): number; }

// per-creature chances, each 0..100 (donor packs them as 4 bytes in one uint32)
interface CreatureLootChances { gold: number; magicItem: number; plainGear: number; magicGear: number; }

interface CreatureLoot { gold: number; magicItem: boolean; plainGear: boolean; magicGear: boolean; }

// donor quirk kept: a first roll for gold, then a second, reversed roll against the same chance
function creatureGold(level: number, chance: number, rng: Rng): number {
  const first = 1 + rng.next(100);
  if (first > chance) return 0;
  const second = rng.next(101);
  if (second < chance) return 0;
  return (1 + rng.next(10)) * (level + 1);
}

function rollCreatureLoot(level: number, c: CreatureLootChances, rng: Rng): CreatureLoot {
  const hit = (chance: number): boolean => 1 + rng.next(100) <= chance;
  return {
    gold: creatureGold(level, c.gold, rng),
    magicItem: level > 2 && hit(c.magicItem),
    plainGear: hit(c.plainGear),
    magicGear: level > 6 && hit(c.magicGear),
  };
}

// container loot: four independent slots (gold, magic item, plain gear, magic gear), each its own chance
type ContainerKind = 'house' | 'palace' | 'noble' | 'dungeon' | 'crypt';
interface ContainerData {
  slotChances: [number, number, number, number];
  goldRule: (level: number, rng: Rng) => number;
  qualityRule: (level: number, rng: Rng) => number;
}

interface ContainerLoot { gold: number; magicQuality: number | null; plainGear: boolean; magicGear: boolean; }

function rollContainer(d: ContainerData, level: number, rng: Rng): ContainerLoot {
  const slots = d.slotChances.map((ch) => rng.next(100) + 1 <= ch);
  return {
    gold: slots[0] ? d.goldRule(level, rng) : 0,
    magicQuality: slots[1] ? d.qualityRule(level, rng) : null,
    plainGear: slots[2],
    magicGear: slots[3],
  };
}

// data-only examples of the donor's formulas
const dungeonGold = (level: number, rng: Rng): number => level * level + (rng.next(100) + 1);
const dungeonQuality = (level: number): number => 5 * (level + 1);

export { rollCreatureLoot, rollContainer, dungeonGold, dungeonQuality, ContainerKind };
```

Typechecked on the VPS: `npx -p typescript tsc --noEmit --strict --target es2020` returned no errors (file with `export {}` appended).

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module, engine drop step; rolled server-side from `origins/server/world-spawns.ts` records): parity-checklist row 18 (loot roll and XP award). Chance words and formulas live in zone data fields (zones as data, rows 20-21).
- today: not checked.
- Reuse tag: adapt-code (MIT)
- Brief rule served: 18 (loot roll and XP award)

## 6. Gaps and risks

- Server-verified kills: loot must be rolled by the server on a verified kill, from a seed the client cannot choose. The donor rolls at spawn (all but creature gold), which is fine for single player but would let a client see or time the result. Frankendom should roll on the verified kill, not at spawn; the donor's spawn-time roll is the shape to avoid.
- One ledger: the donor adds creature gold to a plain counter on the client. Frankendom must write the award into the single character ledger, once, keyed by the kill id (the `hasBeenLootedBefore` flag is the donor's version of that idempotence).
- Many-on-one (MAX_ATTACKERS = 3): the donor has one looter and no ownership rule; Frankendom needs an award rule for the last hit versus damage share, which is not in this donor.
- The double-roll gold rule is an acknowledged quirk of the original game (the code comment says so), not a design to copy; a single roll is cleaner. Keep it only if you want gold to be rare for high-chance enemies.
- Level gates stop rare drops from low-level mobs, which suits zones as data (a `minLevel` per drop class), but the cut-offs 2 and 6 are tuned for a different level range.
- Slot 3 picks any weapon or armour uniformly (a stated placeholder). Do not copy; use a weighted table by tier.
- Numbers in the EXE-derived tables are unread; do not cite them as the donor's balance.
