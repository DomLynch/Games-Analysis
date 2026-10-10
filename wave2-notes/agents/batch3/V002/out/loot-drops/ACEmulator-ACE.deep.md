# ACEmulator-ACE (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Factories/LootGenerationFactory.cs` (roll), `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Creature_Death.cs` (kill hook, ownership) | Licence: GNU Affero General Public License v3 (repo `LICENSE`, read; no per-file header) | C# | symbol `CreateRandomLootObjects` (plus `GenerateTreasure`, `HasPermission`)

Checked: Read in full: `LootGenerationFactory.cs` 37-116 (entry and category rolls), 248-264 (`RollItemType`), 374-422 (mundane addon rolls), `ThreadSafeRandom.cs` 1-45, `ChanceTable.cs` 10-50, `TreasureProfile_Item.cs` 1-121, `TreasureDeath.cs` (model fields), `Creature_Death.cs` 100-150 and 428-730, `Corpse.cs` 20-60 and 96-300, `WorldObject_Decay.cs` 18 and 49-100, `Landblock.cs` 515-532. Callers: `GenerateTreasure` has two callers, the no-corpse path (Creature_Death.cs:434) and the monster corpse path (587); both read. `CreateRandomLootObjects(TreasureDeath)` is also called from `GeneratorProfile.cs:474`, `Creature_Death.cs:653`, `Creature_Equipment.cs:791`, `Player_Death.cs:1084` (the Olthoi death treasure) and the test helper `LootGenerationFactory_Test.cs:75`; only the Creature_Death.cs:653 call lies inside the range read, the others were not read. Not read: `TreasureProfile_Mundane.cs` (mundane item types), `TryCreateRare` and the rare tables, the weenie-level wcid tables, the Olthoi slag path. Confidence: high on the three-gate roll order and the inclusive 1..100 gate (read and receipted); medium-high on the ownership rules (read, not run). Checked on the donor only; nothing was executed.

## 1. Mechanism

- Trigger: a monster's health reaches 0 (`Creature_Death.cs` 104 sets `KillerId = topDamager.Guid.Full`). An action chain waits for the death animation (129), then calls `CreateCorpse(topDamager)` (133). The corpse path is per creature. A creature with no corpse calls `GenerateTreasure(killer, null)` (434) and drops the items on the ground.
- In `GenerateTreasure` (monster branch, 587), the creature's `DeathTreasure` profile (cached DB row, `Creature_Death.cs` 22) is checked (651). If it exists, `LootGenerationFactory.CreateRandomLootObjects(profile)` returns a list (653) and the items go into the corpse. Wielded and create-list treasure follow in the same method (not part of this note).
- Factory roll, in this order (`LootGenerationFactory.cs` 37-98):
  1. Item category: `itemChance = ThreadSafeRandom.Next(1, 100)` (48). The category fires if the roll is `<= ItemChance` (49). If it fires, the count is `Next(ItemMinAmount, ItemMaxAmount)`, both inclusive (51), and that many drops are made.
  2. Magic category: a fresh roll `Next(1, 100)` (62) against `MagicItemChance` (63), with the count from `MagicItemMinAmount`..`MagicItemMaxAmount` (about 64-72; not receipted line by line).
  3. Mundane category: the same shape with `MundaneItemChance` (77). After its count loop, one extra addon roll runs inside the same branch (92).
- Each drop: `CreateRandomLootObjects(profile, category)` (106) calls `RollWcid`. `RollWcid` calls `RollItemType` (248), which for the item category calls `TreasureProfile_Item.Roll(profile.ItemTreasureTypeSelectionChances)` (253). That index picks one of 11 fixed weighted tables (`TreasureProfile_Item.cs` 115-120). Example: profile 9 is Weapon 0.20, Armor 0.20, Scroll 0.20, Clothing 0.05, Jewelry 0.05, Gem 0.05, ArtObject 0.05, PetDevice 0.20 (sums to 1.0; the table verifies this at first use and logs an error if not).
- Weighted table (`ChanceTable.cs` 30-50): one uniform roll `rng = Next(0.0, 1.0)` (38). Walk the entries, adding each chance to a running total. Return the first entry where `rng < total` (44). If none matches, return the last entry with chance > 0 (50).
- Addon roll (`TryRollMundaneAddon`, 374-383): tier <= 4 goes to coalesced mana (377), tier 5+ goes to aetheria. Coalesced mana passes when a float in [0,1) is `< 0.02` (393). Aetheria returns nothing if `aetheria_drop_rate <= 0` (403-404); otherwise it draws from `[0, 1/aetheria_drop_rate)` (406, 412) and passes when the draw is `< 0.02` (414). Derived from that code, not run: the aetheria pass chance is min(1, 0.02 x aetheria_drop_rate).
- Ownership of a monster corpse (`Corpse.cs` 152-200, called from `Open` at 126). The corpse's own player always has permission (155-156), and so does the killer (159). Otherwise a monster corpse opens to every player when its `TimeToRot < HalfLife`, where `HalfLife = 180` (188, 206), unless the corpse generated a rare. Fellowship members with loot sharing on also get permission under the same rare condition (191-196). `/permit` applies to non-PK corpses (165).
- Decay (`WorldObject_Decay.cs`): a unset `TimeToRot` is set to `DefaultTimeToRot`, 5 minutes (18, 60). A corpse with an empty inventory drops to `EmptyDecayTime`, 15 s (77; `Corpse.cs` 27). `Decay` is called once per decayable object per landblock heartbeat (`Landblock.cs` 516, 528) with the elapsed time subtracted.
- Rare: `CanGenerateRare` is set when the creature's level is >= 100 (593-595), or when it is higher than the killer's level (600-601). `TryGenerateRare` runs on the corpse (`Corpse.cs` 275). Not read in detail: its luck table and timers.

## 2. Key functions

- `CreateRandomLootObjects(TreasureDeath profile)`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Factories/LootGenerationFactory.cs` 37-98. Three category gates in order: item, magic, mundane (plus addon).
- `ChanceTable<T>.Roll`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Factories/Entity/ChanceTable.cs` 30-50. One roll, cumulative walk, last-positive fallback.
- `TreasureProfile_Item.Roll(int)`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Factories/Tables/TreasureProfile_Item.cs` 115-120. Index 1..11 into fixed tables, out of range returns Undef.
- `GenerateTreasure(killer, corpse)`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Creature_Death.cs` 646-709 (treasure-profile block at 651-653). Moves factory output into the corpse, or onto the ground.
- `Corpse.HasPermission(player)`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Corpse.cs` 152-200. The ownership ladder.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Category gate: one roll in 1..100, passes if `<=` the chance | `ItemChance` / `MagicItemChance` / `MundaneItemChance` are DB integers per profile (`TreasureDeath.cs` 27, 35, 43). Chance p gives p/100 exactly, because the range is inclusive (`ThreadSafeRandom.cs` 30, `Next(min, max + 1)`). |
| Count drawn inclusive from a range | `ItemMinAmount`..`ItemMaxAmount` (`TreasureDeath.cs` 29, 31); magic 37, 39; mundane 45, 47. Zone data. |
| Weighted table by cumulative chance, one roll | 11 `TreasureProfile_Item` profiles, each summing to 1.0 by hand check (`TreasureProfile_Item.cs` 1-121, read). The runtime check logs an error if a table does not sum to 1.0 (`ChanceTable.cs` 24-25). |
| Mundane addon chance | 0.02 for coalesced mana (`LootGenerationFactory.cs` 393) and 0.02 for aetheria (414), with the draw range divided by the server property `aetheria_drop_rate` (406); rate <= 0 disables aetheria (403-404) |
| Looting window | `HalfLife = 180` s (`Corpse.cs` 206). The donor comment (187) says "after 1/2 decay time"; the code uses the absolute 180 s. The default monster decay is 300 s (`WorldObject_Decay.cs` 18), so the window is the last 60 % of it there. Weenie-level overrides of `TimeToRot` were not read. |
| Empty corpse decay | 15 s (`Corpse.cs` 27) |
| Quality modifier | None. `// TODO: quality mod` (`LootGenerationFactory.cs` 130) and `ChanceTable.Roll(qualityMod = 0)` (`ChanceTable.cs` 30). Not used. |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (item, then magic, then mundane with its addon roll inside the mundane branch) and the same inclusive 1..100 gate and cumulative table walk. It omits: the quality modifier (unused in the donor), the tier split inside the addon (the sketch passes `tier` to a callback), the per-type wcid tables and mutation, the Olthoi and PK paths, player corpses, `/permit` lists, the `IsLooted` flag on close (kept as a field), the pet-owner mapping for the killer, rare generation, and the corpse object itself. The looting check models only the monster corpse case and the fellowship share. It does not model the decay timer; `secondsToRot` is passed in, as the heartbeat would supply it.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Rng = () => number; // uniform in [0, 1)
type Category = "item" | "magic" | "mundane";

interface CategoryRule {
  chancePct: number; // whole percent 0..100: the kill passes this category when a 1..100 roll is <= chancePct
  minCount: number;  // inclusive
  maxCount: number;  // inclusive
}

interface DropProfile {
  tier: number;
  item: CategoryRule;
  magic: CategoryRule;
  mundane: CategoryRule;
  addonChance: number; // extra roll after a mundane hit, 0..1
}

// Inclusive integer roll: both min and max are reachable.
function rollInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// Weighted table: one uniform roll, first entry whose running total exceeds it; falls back to the last positive entry.
function rollTable<T>(rng: Rng, table: ReadonlyArray<readonly [T, number]>): T | undefined {
  const r = rng();
  let total = 0;
  for (const [value, weight] of table) {
    total += weight;
    if (r < total) return value;
  }
  for (let i = table.length - 1; i >= 0; i--) {
    if (table[i][1] > 0) return table[i][0];
  }
  return undefined;
}

// One kill: an independent chance roll per category, a count, then a per-drop pick. The mundane addon roll sits inside the mundane branch.
function rollKillLoot(
  p: DropProfile,
  rng: Rng,
  pickDrop: (cat: Category, rng: Rng) => string | undefined,
  pickAddon: (tier: number) => string | undefined,
): string[] {
  const drops: string[] = [];
  const order: Array<[Category, CategoryRule]> = [
    ["item", p.item],
    ["magic", p.magic],
    ["mundane", p.mundane],
  ];
  for (const [cat, rule] of order) {
    if (rollInt(rng, 1, 100) > rule.chancePct) continue;
    const n = rollInt(rng, rule.minCount, rule.maxCount);
    for (let i = 0; i < n; i++) {
      const d = pickDrop(cat, rng);
      if (d !== undefined) drops.push(d);
    }
    if (cat === "mundane" && rng() < p.addonChance) {
      const a = pickAddon(p.tier);
      if (a !== undefined) drops.push(a);
    }
  }
  return drops;
}

// Corpse looting permission, monster corpse case only (player corpses, PK and /permit are not modelled).
interface Corpse {
  killerId: string | null;
  rareGenerated: boolean;
  secondsToRot: number;
  looted: boolean;
}
interface Looter {
  id: string;
  sameFellowshipAsKiller: boolean;
  fellowshipShares: boolean;
}

const HALF_LIFE_S = 180; // the donor's constant is named HalfLife; a monster corpse opens to all inside its last 180 s

function canLoot(c: Corpse, l: Looter): boolean {
  if (c.looted) return true;
  if (c.killerId !== null && c.killerId === l.id) return true;
  if (!c.rareGenerated && c.secondsToRot < HALF_LIFE_S) return true;
  if (!c.rareGenerated && l.sameFellowshipAsKiller && l.fellowshipShares) return true;
  return false;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new, engine side): the roll at the server kill event, one record per drop, and the owner rule on the corpse or drop record. Parity-checklist row 18 (loot roll and XP award). Sub-line for the timing of the roll: "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3). Zone numbers (chances, counts, the tier) are zone data, as Frankendom rules require.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only, shape and numbers from the described mechanism, no code copied)
- Brief rule served: 1 (the server rolls and owns the drop; kills are server-verified); zones as data for the profile fields

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism. Donor code is not to be copied or translated line by line.
- Timing: the donor rolls the loot after a death animation delay (`Creature_Death.cs` 129, then `CreateCorpse` at 133). Frankendom must roll once at the server kill event and store the result, so the animation length cannot change the outcome or let a client pick it up.
- Many-on-one, MAX_ATTACKERS = 3: the donor gives the sole owner to the top damager (104, 133). It has no split across attackers in this path. Frankendom must decide the owner rule for up to three attackers (top damage, last hit, or share) and write it down. The donor does not decide this for us.
- The 180 s window is a donor design choice whose own comment disagrees with it (half decay vs absolute seconds). Do not copy the number as a ruling. If Frankendom uses a window, make it a zone field and test the rule itself.
- Category gate uses integer percent with an inclusive 1..100 roll. Frankendom must pick one convention (integer percent or float) and test it with a seeded rng, so the expected count matches the chance.
- Rare generation (`CanGenerateRare`, `TryGenerateRare`) is out of scope here and not read in detail. It depends on real-time timers and a luck table; do not port it from this note.
- Quality mod is unused in the donor (TODO). Do not model it until Frankendom needs it.
- Decay and corpse rules use the landblock heartbeat (`Landblock.cs` 516, 528), which subtracts wall-clock elapsed time. Frankendom's server tick is fixed step (row 18 sub-line); a looting window counted in ticks is deterministic across restarts, a wall-clock one is not.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (server verifies the kill and owns the drop record); zones as data

Best transferable idea: Roll each drop category once per kill with its own integer percent chance and inclusive count range, then pick from weighted tables, all on the server at the moment the kill is verified.
Decision (proposed): adapt - keep the three-gate shape and the weighted table as zone data; the looting window and the top-damager owner rule are separate choices, not adopted here.
Acceptance: a seeded server test where an item chance of 100 with min=max=2 yields exactly two item drops per kill, chance 0 yields none, and a second looter cannot take the corpse before the window opens and can after it.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Caller list incomplete: note says CreateRandomLootObjects(profile) has 'a caller in GeneratorProfile.cs:474' besides GenerateTreasure; real code also calls it from Creature_Equipment.cs:791 and Player_Death.cs:1084 (Olthoi). Otherwise verified: 48/49/51 item gate and inclusive Next (ThreadSafeRandom.cs:30 min,max+1), 62-63 magic, 76-77 mundane, addon inside mundane branch (92), 0.02 coalesced (393), aetheria 1/rate draw (406,412,414) so pass = min(1,0.02*rate), tier<=4 split (377), ChanceTable 30-50 (rng<total, last chance>0 fallback; verify 24-25), 11 item profiles and profile 9 values, HasPermission 152-200 order, HalfLife=180 (206), 'TimeToRot < HalfLife' (188), EmptyDecayTime 15 (Corpse.cs:27; WorldObject_Decay 77), DefaultTimeToRot 5 min (18, 60), Landblock heartbeat decay 516/528, CanGenerateRare 593-601, GenerateTreasure 646-660, field line numbers in TreasureDeath. Sketch order matches donor.

**Missed:** HasPermission also has the /permit 'permitteeOpened' branch (184-185) before the window; TreasureDeath has LootQualityMod (23) although the roll does not use it
