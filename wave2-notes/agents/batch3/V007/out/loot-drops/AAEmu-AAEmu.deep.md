# AAEmu-AAEmu (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Items/Loots/LootPack.cs` | Licence: GPL-3.0 (LICENSE.GPL full text; README "Licensing information" header says LGPL-3.0; a LICENSE.MIT file (MIT, Rain0Ash 2019) exists but no .cs file names it, so its scope is unclear) | C# | symbol `LootPack.GeneratePackNewV2`

Checked: Read in full `LootPack.cs` (1-598), `Loot.cs`, `LootGroups.cs`, `LootActabilityGroups.cs`, `lootPackDroppingNpc.cs`, `Actability.cs` (1-51), `LootingRule.cs`, `LootingRuleMethod.cs`. Read `LootingContainer.cs` 1-150, 150-260, 288-326, 420-515, 527-600, 765-794 (not read: 260-287, 326-420, 515-527, 600-765). `LootGameData.cs`, `Configurations.cs` 68 and 73, `Unit.cs` 604 and `ActabilityType` were read by grep only. Candidates opened for this topic: `LootPack.cs`, `LootingContainer.cs`, `LootGameData.cs` (grep), `Loot.cs`, `LootGroups.cs`, `Actability.cs`. The NPC drop path is `LootingContainer.GenerateLoot` (81-222), which calls `GeneratePackNewV2`. The private `LootPack.GeneratePack` overload (45-166) is an older roll; I did not check whether anything calls it. The NPC path calls V2 (202), and the public `GeneratePack` (31-36) also calls V2 (35). Confidence: high on the order of rolls as read; nothing was run, so the reading-only claims in section 6 are marked. camera_scope: n/a.

Best transferable idea: A loot pack is a list of guaranteed or independently rolled items plus groups that each roll once and yield at most one item by weight, so a drop table reads as data with no script.
Decision (proposed): adapt - take the group-then-one-pick shape and the data-driven chances; reject the luck multiplier applied to the pick (it biases the pick, as read) and the ownership roll rule (its winner selection reads as wrong).
Acceptance: server test: a pack with one guaranteed item and one 50 percent group of two entries weighted 3:1 gives the guaranteed item on every kill over 10,000 kills, the group drops about half the time, and when it drops the two entries split about 3:1 (within 2 points) at luck 1.0 and at luck 1.5.

## 1. Mechanism

- Entry. `LootingContainer.GenerateLoot` runs once per container: a second call returns at once (84-86). For an NPC it looks up the NPC's loot packs (106) and calls `GeneratePackNewV2` once per pack (197-202) with the rates it has worked out.
- Rates. Eligible players are team members within `MaxLootingRange` (137) who hold tag rights, or the tagger (147, 160), or the killer when none are eligible (183-190). The drop rate is the best eligible player's `(100 + DropRateMul) / 100` (171, 173, 180); the gold rate is the same for `LootGoldMul` (172, 181). The killer-only fallback multiplies the rates by the killer's values (186-187). The server loot rate (`LootRate`, default 1.0, `Configurations.cs` 68) is multiplied in inside the pack (204, 217).
- Group 0 (`groupNo <= 0`, 190). Each item rolls on its own. A quest-gated item is skipped when the player lacks the quest (195-201). The item drops when `dice < DropRate x luck x LootRate` on a 0-10,000,000 scale (203-206), or when `AlwaysDrop` is set (206).
- Groups above 0. Each group rolls once: the group chance is `group.DropRate / 10,000,000 x luck x LootRate` (186, 217-219). If the roll passes, the non-quest items are filtered: an activity gate can drop an item (244-263; see gap 3), and every surviving item adds its `DropRate` to a total `normalizedRate` (264), where an always-drop item counts 10,000,000.
- The pick. The group draws `roll` from `[0, normalizedRate)` (274). It walks the surviving items in data order (drop rate descending, see data below), adds `floor(normalizedRate x itemRate x luck x LootRate)` to a running threshold (278), and selects the first item whose threshold the roll is below (279-284). At most one item comes from each group.
- Quest items for holders are added after the pick (290-296). See gap 2 for the lookup that can fail.
- Amounts and grades. Each selected item rolls `[min, max]` inclusive (308). Coins are scaled by `lootGoldRate x GoldLootMultiplier` (311). The grade is the inherited grade or the row's grade (313), unless the group has a grade distribution, which is a roll over 0-99 against 12 cumulative weights (314-315; `LootPack.cs` 569-597, roll at 582).
- Container. Items come back tagged with their origin group (317), and `GenerateLoot` registers them grouped by origin (207-222). The container then sets the corpse's removal time (298-310; see row 23 in section 5).

## 2. Key functions

- `LootPack.GeneratePackNewV2`: `LootPack.cs` 178-322. The NPC drop roll: group 0 independent rolls, then one group roll and one weighted pick per group, then amounts and grades.
- `LootingContainer.GenerateLoot`: `LootingContainer.cs` 81-243. Once per container: rates from eligible players (166-190), packs (197-205), register (207-222).
- `LootPack.GiveLootPack`: `LootPack.cs` 514-567. Gives a generated list to a character. It checks room for every non-coin item before giving any (519-534), then adds items and coins. Used by doodad, fishing and gacha effects (grep only; not read).
- `LootGameData.Load` (grep): `LootGameData.cs` 40 and 73 (SQL with drop-rate normalisation and ordering), 163 (group count).
- `Actability.GetLootMultiplier`: `Actability.cs` 50 (returns the exp multiplier).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Independent item chance, scaled by luck | Scale 10,000,000 = 100 percent (`LootGameData.cs` 40: drop rates of 1 or less become 10,000,000) |
| Group chance, one roll per group | `group.DropRate / 10,000,000` (`LootPack.cs` 186, 217) |
| One pick by weight, first threshold passed | Weights are `DropRate` values; always-drop counts 10,000,000 (264) |
| Guaranteed item | `AlwaysDrop` flag from the `loots` table (`LootGameData.cs` 40, 57) |
| Amount range | `MinAmount` and `MaxAmount` inclusive (`LootGameData.cs` 53-54; `LootPack.cs` 308) |
| Player luck | `(100 + DropRateMul) / 100`, best eligible player (`LootingContainer.cs` 171, 173, 180) |
| Server loot rate | Default 1.0 (`Configurations.cs` 68); set globally by a command (`Unit.cs` 604) |
| Gold multiplier | Default 1.0 (`Configurations.cs` 73) |
| Activity gate | `Actability.GetLootMultiplier` is `GetExpMultiplier` (`Actability.cs` 50), and every exp multiplier is 1.00 (`Actability.cs` 15) |
| Grade distribution | 12 weights (`Weight0` to `Weight11`), roll 0-99 (`LootPack.cs` 576, 582) |
| Loot range | 200 units (`LootingContainer.cs` 32) |
| Public after | 180 s (`LootingContainer.cs` 37, 791) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: independent items first (each with its own roll), then one roll per group, then one pick by weight, then amounts. It changes one thing on purpose: luck (player drop multiplier times server loot rate) scales the group chance and the independent chance only, not the pick thresholds as the donor does (gap 1). It omits: quest gating, the activity gate, grade distributions, the gold multiplier, the choice of the best eligible player's rate, the container, the origin-group registration and the ownership rules. The donor's always-drop entries inside a group count as full weight; the sketch treats them as ordinary entries whose data sets the weight to the full scale.

```ts
// Licence: copyleft (AAEmu LICENSE.GPL is GPL-3.0; README "Licensing information" header is LGPL-3.0).
// clean-room: written from the described mechanism, not a translation of the donor lines.
// Weights are in donor units: 10,000,000 = 100 percent.
const FULL = 10_000_000;

interface LootEntry {
  itemId: number;
  weight: number;      // item chance or pick weight (donor drop_rate)
  min: number;         // inclusive amount range
  max: number;
  always: boolean;     // guaranteed when it sits in the independent list
}

interface LootGroup {
  chance: number;      // group chance in donor units (donor loot_groups.drop_rate)
  entries: LootEntry[]; // at most one entry is picked when the group triggers
}

interface LootPack {
  independent: LootEntry[]; // each rolls on its own (donor group 0)
  groups: LootGroup[];      // each group rolls once, then picks one entry
}

interface Drop { itemId: number; count: number; }

// luck: player drop multiplier times server loot rate (1 = no bonus).
function rollPack(pack: LootPack, luck: number, rnd: () => number): Drop[] {
  const drops: Drop[] = [];
  const amount = (e: LootEntry): number => e.min + Math.floor(rnd() * (e.max - e.min + 1));

  for (const e of pack.independent) {
    const chance = Math.min(1, (e.weight / FULL) * luck);
    if (e.always || rnd() < chance) drops.push({ itemId: e.itemId, count: amount(e) });
  }

  for (const g of pack.groups) {
    const groupChance = Math.min(1, (g.chance / FULL) * luck);
    if (rnd() >= groupChance) continue;               // one roll per group
    const total = g.entries.reduce((sum, e) => sum + e.weight, 0);
    if (total <= 0) continue;
    let roll = rnd() * total;                          // pick by weight; luck does not touch the pick
    for (const e of g.entries) {
      if (roll < e.weight) {
        drops.push({ itemId: e.itemId, count: amount(e) });
        break;
      }
      roll -= e.weight;
    }
  }
  return drops;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS passed (`/tmp/loot-sketch.ts`).

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module: drop tables as data, one roll per group, the pick). Parity-checklist row 18 (loot roll and XP award). The corpse-removal tie-in (`LootingContainer.cs` 298-310) belongs to row 23 (zone population: despawn).
- today: not checked in this pass.
- Reuse tag: rewrite-from-idea (GPL-3.0 / LGPL-3.0; clean-room only)
- Brief rule served: zones as data (drop tables as data, luck and rates as engine constants), server-verified (the drop is generated on the server, once per kill), one ledger (granted items go through one room check).

## 6. Gaps and risks

- Gap 1, luck biases the pick (reading, not run). The pick threshold adds `floor(normalizedRate x itemRate x luck x LootRate)` (`LootPack.cs` 278) and the roll is drawn over `[0, normalizedRate)` without luck (274). Summed thresholds therefore total about `luck x normalizedRate`. When luck is above 1, the first entries are chosen more often and the last ones are never reached; when luck is below 1, some groups give nothing even after they pass. The donor's pick is not proportional to weight when the multiplier is not 1. Frankendom should apply luck to the group chance and the independent chance only (the sketch does this).
- Gap 2, quest-merge key lookup (reading, not run). Quest items for a holder are merged with `selectedItemsByGroup[groupNo].Contains(loot)` (`LootPack.cs` 290-293). The indexer throws if the group produced no pick, which happens when no entry passed the activity gate or the pick failed while a holder's quest item exists. Frankendom must check a map before reading it.
- Gap 3, the activity gate changes nothing today. `GetLootMultiplier` returns the exp multiplier (`Actability.cs` 50), every value of which is 1.00 (`Actability.cs` 15). NPC kills pass `ActabilityType.None` (`LootingContainer.cs` 202). So the gate in `LootPack.cs` 259 drops items only when the rolled dice exceed the group's `MaxDice`, with no skill effect. Do not copy the gate without data for it.
- Gap 4, one rate for the whole kill. The rate is the best eligible player's (`LootingContainer.cs` 171-180), not each looter's. Quest gating uses the killer only (`LootingContainer.cs` 202 passes `killer as Character`). Generation runs once at death, so a quest state that changes before looting is not re-checked here. Frankendom must choose per-looter or per-kill and say which.
- Gap 5, the ownership roll picks the wrong winner (reading, not run). `FinishRolling` takes the highest result by sorting ascending and taking the first positive value (`LootingContainer.cs` 570-574). The qualifier test then includes every positive roller (578), and the winner is a uniform pick among them (590). A roll of 1 can win over 99. Reject this rule; if rolls are wanted, take the maximum and test it.
- Gap 6, luck and rates are global. `LootRate` is one server value, and a command sets it for everyone (`Unit.cs` 604). Zone data cannot vary luck per zone with this code. Frankendom's zone data should carry any zone luck.
- Gap 7, all-or-nothing grant. `GiveLootPack` checks room for every non-coin item before giving any (`LootPack.cs` 519-534), which is the shape Frankendom's ledger needs. It is used by doodad, fishing and gacha effects, not by the NPC drop path (grep only).
- Gap 8, corpse timing. When a container empties, the corpse is kept until creation plus the spawner's despawn time, or 2 s if that has passed (`LootingContainer.cs` 298-310). The 300 s hold for unlooted loot is in the spawns note (cell 4).
- Gap 9, group 0 inherits the donor's loot-row order. The `loots` SQL orders by group, pack and drop rate descending (`LootGameData.cs` 40), and that order matters for the pick (gap 1). Frankendom's loot data must keep a stable order or it will change drop odds.

Reuse tag: rewrite-from-idea (GPL-3.0 / LGPL-3.0; clean-room only)
Brief rule served: zones as data; server-verified drops; one ledger
