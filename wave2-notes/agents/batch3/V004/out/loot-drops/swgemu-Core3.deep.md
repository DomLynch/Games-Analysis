# swgemu-Core3 (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/loot/LootManagerImplementation.cpp` (roll, collection pass, nested groups, credits), with `managers/loot/lootgroup/LootGroupCollectionEntry.h`, `lootgroup/LootGroupEntry.h`, `lootgroup/LootGroups.h`, `MMOCoreORB/src/templates/LootGroupTemplate.h` (weighted group pick), `managers/creature/CreatureManagerImplementation.cpp` 606-700 (death: owner and corpse loot), `objects/tangible/threat/ThreatMap.cpp` 252-396 (highest-damage player and group leader) | Licence: GNU AGPL-3.0 (COPYING, Version 3) | C++ with Lua loot data | symbol `LootManagerImplementation::createLootFromCollection`

Checked: Read in full: `LootManagerImplementation.cpp` 301-309 (credits), 656-813 (creature loot, collection pass, nested creation); `LootGroupCollectionEntry.h` (1-61), `LootGroupEntry.h` (1-67), `LootGroups.h` (1-53), `LootGroupCollection.h` (1-53), `LootGroupTemplate.h` 46-61 and 94-119 (the two weighted-pick functions and the reader); `CreatureManagerImplementation.cpp` 606-700; `ThreatMap.cpp` 252-307 and 308-396; `ThreatMap.h` 124-160 (loot damage, DOT key). Data read: `bin/scripts/mobile/quest/corellia/maerzen.lua` (line 43 region), `bin/scripts/loot/groups/coa2_decoder_components.lua` (first lines). Not read: `createLootObject` and `setRandomLootValues` (item stats), `createLootSet`, `LootGroupMap.cpp` (the table loader), `SortedVector` ordering (engine3 submodule is empty in this donor; the file comment at LootGroupEntry.h 34 says the order is descending by weight, and I relied on that comment), `System::random` range (not verified), `disseminateExperience` (XP, outside this cell), and the ship and fishing loot paths. Confidence: high on the collection roll order and the owner rule (read end to end); medium on the group order (comment-only); the defect in section 6 is from reading, not from a run. camera_scope: n/a.

## 1. Mechanism

Order of events when a creature dies (`CreatureManagerImplementation`, 606-700):

- Owner first. The player who gets the loot is `copyThreatMap.getHighestDamageGroupLeader()` (629), the leader of the group with the most loot damage (see `ThreatMap` below). The corpse's owner ID is the group ID if that leader is grouped, otherwise the leader's object ID (634-639). Loot is only created when that leader is a player (684).
- Credits. A non-player creature that is not an event mob pays cash credits: `calculateLootCredits(level)` (689), added to the corpse (692).
- Item loot. `createLoot(trx, corpseInventory, creature)` (700) reads the creature's loot collection. If the collection is empty, it aborts (656-668). Otherwise it runs `createLootFromCollection` with the creature level (670).

Collection pass (`createLootFromCollection`, 695-755). For each entry of the collection, in the script order:

- The entry's chance is read from the script. If it is 0, the default is `2000000 + 20000*level`, which is 20% plus 0.2% per level (LootGroupCollectionEntry.h 39-43). A chance of 0 or less skips the entry (708-709).
- First roll: `roll = random(10000000)`. If `roll > chance` the entry does nothing (711-716). So the chance is out of 10,000,000.
- Second roll, on its own: `roll = random(10000000)` (724). The entry's group list is walked in stored order with a running total (734). The first group whose running total reaches the roll wins (737-742). Groups are stored sorted by weight in descending order (LootGroupEntry.h 33-36; the comment is the only evidence here). If no group reaches the roll, nothing is created for that entry. This collection-pass walk has no weight-above-zero test (729-743: it only skips a group while the running total is below the roll); the above-zero test exists only in the nested pick (LootGroupTemplate.h 55).
- Winning group: `createLoot(container, groupName, level)` (740). Its result is stored in `objectID`, which is overwritten by each winning entry. The collection reports success if the last stored `objectID` is above zero (754), and logs "Did not win loot rolls" otherwise (750-752).

Nested creation (`createLoot` by name, 757-813):

- While the name is a loot group, one roll of `random(10000000)` picks an entry with `getLootGroupEntryForRoll` (769). The loop depth is capped at 32 (761-764).
- `getLootGroupEntryForRoll` (LootGroupTemplate.h 46-61) walks the group's entries in map order, keeping a running total of weights. It returns the first entry whose running total reaches the roll and whose weight is above zero. If the weights do not reach the roll it returns "" (and the comment at 59 says that should not happen when the scripts add up to 10,000,000).
- An unknown final name is logged and returns 0 (775-778). A real item is created (795), put in the container (804), and broadcast (805). If the transfer fails the object is destroyed and 0 is returned (807-809).

Ownership (`ThreatMap`):

- `getHighestDamageGroupLeader` (308-396) counts loot damage per attacker. Loot damage is total damage minus DOT, using the key `dotDMG` (ThreatMap.cpp 321; ThreatMap.h 143-144). Damage from grouped players is summed per group ID (338-341). The group's leader becomes the owner when that group's sum is the largest so far (346-348). An ungrouped player's total is compared directly (387-389). A pet is credited to its owner: a grouped owner's damage is added to the group sum (360-364), but an ungrouped owner's pet is compared only as a single entry, not as the owner's sum (377-380).
- The scan stops early at a group whose leader is missing or not a player: the check at 333-334 (and 357-358) ends the loop with `break`, so later attackers are ignored.
- `getHighestDamagePlayer` (252-306) is not used for loot. It is used for faction standing only when the kill was grouped (CreatureManagerImplementation.cpp 670); a solo kill awards standing to the loot owner (668). It uses total damage, which includes DOT (262), credits a pet to its owner (288-300), and keeps the first player to reach a strictly larger total (277).

## 2. Key functions

- `LootManagerImplementation::createLootFromCollection`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/loot/LootManagerImplementation.cpp` 695-755. The collection pass.
- `LootManagerImplementation::createLoot` (by name): same file, 757-813. Nested group descent and item creation.
- `LootManagerImplementation::createLoot` (creature): same file, 656-671. Empty-collection abort and call.
- `LootManagerImplementation::calculateLootCredits`: same file, 301-308.
- `LootGroupTemplate::getLootGroupEntryForRoll`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/templates/LootGroupTemplate.h` 46-61. The weighted pick.
- Creature death: `CreatureManagerImplementation` (`.../managers/creature/CreatureManagerImplementation.cpp`) 606-700. Owner, credits and the corpse loot call.
- `ThreatMap::getHighestDamageGroupLeader`: `.../objects/tangible/threat/ThreatMap.cpp` 308-396. The loot owner.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two independent rolls: an entry chance, then a weighted group pick | Scale 10,000,000 (LootManagerImplementation.cpp 711, 724, 769) |
| Weighted pick by running total, with a "no entry" result when the weights fall short | Scripts put weights summing to 10,000,000 by convention (LootGroupTemplate.h 59); example weight `1666667` (`loot/groups/coa2_decoder_components.lua`, line 6) |
| Default chance that rises with level | 2000000 + 20000 x level (LootGroupCollectionEntry.h 42), i.e. 20% plus 0.2% per level |
| Full-chance drop | `lootChance = 10000000` (maerzen.lua, line 43) |
| Nested group descent with a depth cap | Depth cap 32 (LootManagerImplementation.cpp 761) |
| Owner = the group with the most loot-eligible damage | DOT excluded (ThreatMap.cpp 321) |
| Credits per kill | max = round(0.03 L^2 + 3 L + 50); min = round(max x 0.5 + 2 L); credits random between them (LootManagerImplementation.cpp 302-305) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: each collection entry rolls its own chance first, then a second roll picks one group in stored order, then nested groups are resolved with the depth cap, and ownership is the group or solo player with the most loot damage. It omits the overwrite of `objectID` (the sketch keeps each entry's result separately, which is the fix the note recommends), the early `break` on a bad group leader, the pet compare rule (the sketch sums per group and per solo player), the player-only check, the corpse container and its owner ID, item stats, the item transfer and its failure path, and the XP call. The random source is injected as `rng` in [0, 1) because `System::random` was not read. The default chance is written as a function of level, as the donor does at script read time. The weight-above-zero guard is applied only to the nested pick, as in the donor; the collection pass has none.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch of the mechanism shape, not a translation of the donor lines.
type Rng = () => number; // returns a number in [0, 1)
const SCALE = 10000000;  // the donor writes every chance out of 10,000,000

interface Option { name: string; weight: number; }
interface CollectionEntry { chance: number; groups: Option[]; }  // groups sorted by weight, descending (donor)

// A script chance of 0 means "use the default": 20% plus 0.2% per creature level.
function defaultChance(level: number): number { return 2000000 + level * 20000; }

// First option whose running total reaches the roll; "" when the weights do not reach it (donor).
// requirePositive: the nested pick skips zero weights (donor LootGroupTemplate.h 55); the collection pass does not (729-743).
function pickByWeight(options: Option[], roll: number, requirePositive: boolean): string {
  let total = 0;
  for (const o of options) {
    total += o.weight;
    if (total >= roll && (!requirePositive || o.weight > 0)) return o.name;
  }
  return "";
}

// One pass over a creature's collection: each entry rolls its own chance, then one weighted group.
function rollCollection(entries: CollectionEntry[], rng: Rng): string[] {
  const won: string[] = [];
  for (const e of entries) {
    if (e.chance <= 0) continue;
    if (Math.floor(rng() * SCALE) > e.chance) continue;     // the entry's own roll
    const name = pickByWeight(e.groups, Math.floor(rng() * SCALE), false);
    if (name !== "") won.push(name);
  }
  return won;
}

// Nested groups: keep choosing an entry while the name is a group (depth cap 32), then it must be an item.
interface Table { groups: Map<string, Option[]>; items: Set<string>; }
function resolveItem(t: Table, name: string, rng: Rng): string | null {
  let entry = name;
  for (let depth = 0; depth < 32 && t.groups.has(entry); depth++) {
    entry = pickByWeight(t.groups.get(entry) ?? [], Math.floor(rng() * SCALE), true);
  }
  return t.items.has(entry) ? entry : null;
}

// Credits paid with the drop (donor formula; the random range semantics were not read).
function lootCredits(level: number, rng: Rng): number {
  const max = Math.round(0.03 * level * level + 3 * level + 50);
  const min = Math.round(max * 0.5 + 2 * level);
  return min + Math.floor(rng() * (max - min));
}

// Ownership: the group (or solo player) with the most loot-eligible damage; DOT is excluded by the caller.
interface Hit { attackerId: string; groupId: string | null; lootDamage: number; }
function lootOwner(hits: Hit[]): string | null {
  const sums = new Map<string, number>();
  let best = 0;
  let owner: string | null = null;
  for (const h of hits) {
    const key = h.groupId ?? h.attackerId;
    const sum = (sums.get(key) ?? 0) + h.lootDamage;
    sums.set(key, sum);
    if (sum > best) { best = sum; owner = key; }
  }
  return owner;
}
export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new engine module: the drop roll and the loot owner, computed on the server from the fight ledger; the drop list goes into the fight record). Parity-checklist row 18 (loot roll and XP award).
- The Frankendom repo was not opened in this pass, so there is no "today" file to name.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine; loot ownership and rolls live in the engine); server-verified kills (the owner is computed on the server from the same damage ledger)

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism.
- Defect in the donor: the collection pass overwrites `objectID` on every winning group (LootManagerImplementation.cpp 740). If an earlier entry has already put an item in the corpse, and a later entry wins a group whose item fails to create (`createLoot` returns 0, 775-778 or 807-809), `objectID` becomes 0 and the collection reports "Did not win loot rolls" (750-752), although the earlier item is in the corpse. Read by hand, not run. Frankendom must keep one result per entry and never overwrite a success.
- Early exit in the ownership scan: a group with no player leader stops the whole loop with `break` (ThreatMap.cpp 333-334, 357-358), so attackers after it are ignored. Frankendom must use `continue` (skip that group), not stop.
- Pet rule is inconsistent: a grouped owner's pet is summed per group (360-364), but an ungrouped owner's pet is compared as one entry (377-380). Frankendom needs one rule: sum per owner, then per group.
- DOT: the loot owner excludes the `dotDMG` key (ThreatMap.cpp 321), but the threat owner does not. Frankendom has one ledger; loot eligibility must be an explicit field on each hit, not a magic key.
- Rolls use `System::random`. A server-verified kill with a fight record (checklist row 19) needs replayable rolls: seed the rolls from the fight record and log each roll in the drop record.
- Default chance depends on creature level read at script load (LootGroupCollectionEntry.h 41-43). Frankendom zone data should state the chance; the level default should be a documented curve, not a hidden one.
- Weights sum to 10,000,000 by script convention, and an unfilled table silently returns "" (LootGroupTemplate.h 59). Frankendom should validate the sum at load time and reject a table that does not reach the scale.
- Credits formula is a donor economy rule. Shape only; Frankendom should decide whether it has a currency before adopting it.
- Sort order of groups is a comment, not verified (LootGroupEntry.h 33-36; SortedVector not read). Frankendom should sort explicitly when it loads the table.

Best transferable idea: a drop roll with an independent chance per entry and then one weighted pick per entry, with the loot owner set by the highest loot-eligible damage among groups (DOT excluded), computed once from the fight ledger.
Decision (proposed): adapt - take the two-roll drop, the weighted pick with an explicit "no drop" result, the depth-capped nested groups and the owner-by-loot-damage rule. Reject the overwrite of the result, the early break, and the inconsistent pet compare. Make every roll replayable from the fight record and validate that each table sums to 10,000,000 when it loads.
Acceptance: In a 3-player group server test with a fixed seed, replaying the same fight record gives the same drop list and the same owner; the owner is the group with the most loot damage (DOT excluded); when one drop fails to create, the earlier drops stay in the corpse and only that entry is reported as failed.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one engine; loot ownership and rolls live in the engine); server-verified kills (owner from the server's damage ledger)


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Sketch rollCollection reuses pickByWeight with 'weight > 0' guard, but the donor collection pass (LootManagerImplementation.cpp 729-743) does NOT check weight>0 (only tempChance < roll continue); the weight>0 guard exists only in LootGroupTemplate.h 55 (nested pick). Faction standing: CreatureManagerImplementation 667-670 uses getHighestDamagePlayer only for grouped kills; solo kills use the loot owner (668); note says it is simply 'used for faction standing'. All other cites verified (656-671, 695-755 incl. 711/715/724/737/740/750-754, 761-764, 769, 775-778, 804-809, credits 302-305, 2000000+20000*level at CollectionEntry 42, ThreatMap 308-396 incl. break at 333-334/357-358, pet branch 360-364 vs 377-380, getLootDamage excludes dotDMG, maerzen.lua:43, coa2 weight 1666667 line 6).

**Missed:** 'chances' vector in createLootFromCollection is declared but never filled (700, 746); lootGroupNames logs every group walked. Nested createLoot passes maxCondition and level into createLootObject (not read). Ship loot path (673-693) uses a float lootChance*10000000.
