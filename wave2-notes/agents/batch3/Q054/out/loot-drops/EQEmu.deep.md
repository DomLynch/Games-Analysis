# EQEmu (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/EQEmu/zone/loot.cpp` (with `zone/attack.cpp`, `zone/spawn2.cpp`) | Licence: GNU GPL v3 or later (source header, zone/loot.cpp lines 3-7: "either version 3 of the License, or"; repo LICENSE.md is GPL v3) | C++ | symbol `NPC::AddLootTable`, `NPC::AddLootDropTable`, `NPC::MeetsLootDropLevelRequirements`

Checked: Read in full: `zone/loot.cpp` lines 31-283 (`AddLootTable`, `AddLootDropTable`, the level filter). Read in part: `zone/attack.cpp` 2855-2925 (corpse loot rights, the block only) and `zone/spawn2.cpp` 292-302 (the call site at 299 inside `Spawn2::Process`, whose header at 152 was confirmed by grep). Caller check for `AddLootTable`: a grep of zone/*.cpp shows callers in spawn2.cpp:299, zone.cpp:2583, trap.cpp:173 and 198, forage.cpp:320, zone_save_state.cpp:56, gm_commands/npctypespawn.cpp:40, questmgr.cpp, and the Lua and Perl bindings; `NPC::Death` in attack.cpp is not a caller. Not read: `NPC::AddLootDrop` (zone/loot.cpp 284-556: charges, augments, item fields), the hand-off of the rolled list to the corpse, `zone/global_loot_manager.cpp` (185 lines, header only), `zone/zone_loot.cpp` (the table loader), `zone/gm_commands/lootsim.cpp`. Candidates opened and set aside: `common/loot.h` (the LootItem struct only). The list hint `shared_memory/items.cpp` was not opened: the roll is in zone/loot.cpp. Confidence: high on the table roll and the spawn-time timing (both read end to end); medium on the corpse rights (the block was read, the hand-off to the corpse was not).

Best transferable idea: Make a drop table a set of data rows with a per-table gate, a weighted pick, a guaranteed minimum and a per-copy roll, rolled on the server when a kill is verified.
Decision (proposed): adapt - take the table shape (gate, weighted pick, minimum, copies) as zone data, but roll at the verified kill on the server, not at NPC spawn as the donor does.
Acceptance: A server test seeds 10,000 kills on a table of three items (chances 60, 30, 10; drop limit 1; minimum 0): about 74.8% of kills drop one item (1 - 0.4 x 0.7 x 0.9), and of those drops about 60%, 30% and 10% are the three items.

## 1. Mechanism

- Timing: loot is rolled when the NPC spawns, not when it dies. `Spawn2::Process` calls `npc->AddLootTable()` (spawn2.cpp 299). The death path in attack.cpp does not call it (see Checked).
- Stage 1, the table (`AddLootTable`, loot.cpp 31-141). Cash first: if the average coin value lies inside [min, max], the code picks an upper branch with chance `(avg - min) / (max - min)` and draws uniformly from [avg, max] (87-92), otherwise from [min, avg] (95). If the average is not inside the range, it draws uniformly from [min, max] (99). Cash is then split into platinum, gold, silver and copper (103-115, read, not receipted). The mean of the biased draw works out to exactly `avg` when the average is inside the range (arithmetic: with u = (avg - min) / (max - min), the mean is u(avg + max)/2 + (1 - u)(min + avg)/2, which reduces to avg). Items: each table entry repeats `multiplier x GlobalLootMultiplier` times (116-118). Each repeat rolls a percent from 0 to 100 (125) and fires when the probability is not 0 and the roll is at or under it, or the probability is exactly 100 (128). A fired entry calls `AddLootDropTable` with that entry's drop group, drop limit and minimum (129).
- Stage 2, the drop group (`AddLootDropTable`, loot.cpp 142-251). Two modes:
  - Scan-once mode, when drop limit and minimum are both 0 (151): each item entry rolls its own percent once per copy (154-156). No gate and no weighted pick: each item is an independent roll.
  - Weighted mode, otherwise. A list above 100 entries with limit 0 is cut to 10 picks (173-174); the limit is raised to the minimum if it is lower (177-178). Only items that pass the NPC level filter (`MeetsLootDropLevelRequirements`, 252-283: min and max level on each entry) count. The total weight is the sum of the eligible chances (roll_t += at 189). Any eligible chance of 100 or more sets a bypass for the whole group (191-192). Otherwise the group keeps a product of misses, `noLootProb *= (100 - chance) / 100` (195).
  - The loop runs `drop limit` times (214-215). In each pass a pick happens if the drops so far are below the minimum, or the bypass is set, or a random number is at least `noLootProb` (the gate). The pick draws `roll` in [0, total) (216), walks the eligible entries and the first with `roll < chance` wins (225); otherwise `roll -= chance` (242). The winner is added (226) and counted; its extra copies (multiplier - 1) each roll their own percent against the chance (234-235).
  - The arithmetic of the gate: the gate passes with probability 1 - noLootProb, which is the union of the independent item chances. Given a pass, an item wins by weight (its chance over the total), so an item's unconditional chance in one pass is (1 - noLootProb) x chance / total.

## 2. Key functions

- `NPC::AddLootTable(uint32, bool)`: `/mnt/frankendom-donors/EQEmu/zone/loot.cpp` 31-141. Cash (84-115), entry loop (116-130).
- `NPC::AddLootDropTable`: `/mnt/frankendom-donors/EQEmu/zone/loot.cpp` 142-251. Scan-once (151-170), weighted setup (173-195), pick loop (213-243).
- `NPC::MeetsLootDropLevelRequirements`: `/mnt/frankendom-donors/EQEmu/zone/loot.cpp` 252-283. Min level check at 254.
- Spawn call site: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 299 (inside `Spawn2::Process`, 152-354).
- Corpse loot rights on a kill: `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` 2863-2909. A client killer gets slot 0 (2863); a grouped killer gives each group member a slot (2864-2871); raid loot types: LeaderOnly (2888), LeaderAndGroupLeadersOnly, LeaderSelected, EntireRaid (2906).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two-branch uniform whose mean equals a target average | Branch chance (avg - min) / (max - min) (87); draws [avg, max] (92) and [min, avg] (95); fallback [min, max] (99) |
| Per-entry percent roll, repeated per copy | Percent 0-100 (125); exactly 0 never fires, exactly 100 always fires (128); repeats = multiplier x GlobalLootMultiplier (116-118) |
| Union gate, then a weighted pick | Product of misses (195); weight total roll_t (216); bypass at 100 or more (191) |
| Guaranteed minimum before the gate | Pick forced while drops < minimum (215) |
| Large-list default | More than 100 entries with limit 0 means 10 picks (173-174) |
| Extra copies with their own roll | Each extra copy rolls a percent against the chance (234) |
| Level band per entry | Min level (254); max level check at 267, same shape |

## 4. TypeScript sketch

simplified: the sketch keeps the two modes of the drop group (scan-once, and the weighted pick with the gate), the bypass for a chance of 100 or more, the 100-entry clamp, the minimum guarantee, the descending-roll pick, and the per-copy rolls. It omits the table stage (cash split and its mean-matched draw, the per-repeat loop count with GlobalLootMultiplier, and the `entryFires` gate, which is in the sketch but is not called by it), the database item lookup, the charges and augment fields in `AddLootDrop`, the logging, and the equipment light update. It reorders one thing: the donor rolls the scan-once percent before it runs the level check, and the sketch checks the level first, so the random sequence differs and tests must not assume the donor's sequence.

```ts
// Licence: GNU GPL v3 or later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface DropEntry {
  itemId: number;
  chance: number;      // percent; a chance of 100 or more in any eligible entry passes the gate for the whole group
  multiplier: number;  // extra copies: each copy after the first rolls its own chance
  levelOk: boolean;    // result of the donor's level filter for this NPC
}

export interface DropGroupRule {
  dropLimit: number;   // 0 means "scan once" when minDrop is also 0
  minDrop: number;     // guaranteed picks before the gate applies
}

// Entry gate at table level: probability in percent; 0 never fires, 100 always fires.
export function entryFires(probability: number, rand: () => number): boolean {
  const roll = probability >= 0 && probability <= 100 ? rand() * 100 : 0;
  return probability !== 0 && (probability === 100 || roll <= probability);
}

// One drop group. Returns the item ids that dropped, in order.
export function rollDropGroup(entries: DropEntry[], rule: DropGroupRule, rand: () => number): number[] {
  const out: number[] = [];

  // Scan-once mode: each entry rolls on its own, once per copy.
  if (rule.dropLimit === 0 && rule.minDrop === 0) {
    for (const e of entries) {
      if (!e.levelOk) continue;
      for (let j = 0; j < e.multiplier; j++) {
        if (rand() * 100 <= e.chance) out.push(e.itemId);
      }
    }
    return out;
  }

  let limit = rule.dropLimit;
  if (entries.length > 100 && limit === 0) limit = 10;
  if (limit < rule.minDrop) limit = rule.minDrop;

  // Weighted pick: total weight, and the chance that the gate lets a pick through.
  const eligible = entries.filter((e) => e.levelOk);
  if (eligible.length === 0) return out;
  let total = 0;
  let noLootProb = 1;
  let bypass = false;
  for (const e of eligible) {
    total += e.chance;
    if (e.chance >= 100) bypass = true;
    else noLootProb *= (100 - e.chance) / 100;
  }

  let drops = 0;
  for (let i = 0; i < limit; i++) {
    // Guaranteed picks first; after that a pick happens only if the gate passes.
    if (drops < rule.minDrop || bypass || rand() >= noLootProb) {
      let roll = rand() * total;
      for (const e of eligible) {
        if (roll < e.chance) {
          out.push(e.itemId);
          drops++;
          const copies = Math.max(1, e.multiplier);
          for (let k = 1; k < copies; k++) {
            if (rand() * 100 <= e.chance) out.push(e.itemId);
          }
          break;
        }
        roll -= e.chance;
      }
    }
  }
  return out;
}
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new, server-side): the drop-group roll for one verified kill, reading tables as zone data. Parity-checklist row 18 (loot roll and XP award).
- The cash mean-matched draw (loot.cpp 87-99) fits coin drops in the same module, row 18.
- Corpse rights (attack.cpp 2863-2909) become ownership on the loot ledger (row 18), not a corpse property.
- Reuse tag: rewrite-from-idea (GPL v3 or later; clean-room only)
- Brief rule served: server-verified kills and one ledger (the roll and the claim are server state); zones as data (limit, minimum, chance, copies and level band are table fields).

## 6. Gaps and risks

- GPL v3 or later: clean-room only. The sketch is written from the mechanism, not translated.
- The donor rolls at spawn (spawn2.cpp 299). Frankendom's rulings want a verified kill to decide the loot, so the roll moves to the kill. Rolling at spawn would fix the loot before the fight is over.
- Two modes sit in one function. A table with limit 0 and minimum 0 rolls each item independently; a table with limit 1 uses the gate and the weights. A designer can get very different shares from the same chances, so Frankendom must pick one mode per table or name the mode in the data.
- Corpse rights are read at death from the group or raid state (attack.cpp 2863-2909). For MAX_ATTACKERS = 3 fights, who may claim the loot is a rule to define in the ledger, not left to group state.
- The cash mean-match holds only when the average is inside [min, max]. Outside it the donor draws uniformly over [min, max] (99), so the mean is not the average.
- The donor's random sequence differs from the sketch (see section 4). Seeded tests in Frankendom must use Frankendom's order.
- Not read: `AddLootDrop` internals, how the rolled list reaches the corpse, `global_loot_manager.cpp`. Global loot (CheckGlobalLootTables, zone.cpp path) is a second source and is not in this note.
