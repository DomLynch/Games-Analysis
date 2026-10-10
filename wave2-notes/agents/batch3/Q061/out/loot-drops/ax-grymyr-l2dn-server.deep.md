# ax-grymyr-l2dn-server (loot-drops, cell 1)

Donor: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Templates/NpcTemplate.cs` (recipient and call order in `.../Model/Actor/Attackable.cs`) | Licence: MIT License (LICENSE.txt, "Copyright (c) 2024-2025 Grymyr, L2Dn Server Project") | C# | symbol `NpcTemplate.calculateDrops`

Checked: read end to end, the kill-to-drop path: `Attackable.cs` 305-400 (damage tally, party totals, sort), 460-480 (recipient), 1090-1260 (`doItemDrop`); `NpcTemplate.cs` 645-700 (`calculateDrops` dispatch), 697-905 (group roll), 908-1000 (ungrouped roll), 1035-1110 and 1114-1250 (per-entry roll and amount); `Config.Rates.cs` 155-169 and `Config.Character.cs` 421 (defaults only); `Rnd.cs` 20-22; `Sweeper.cs` 1-60; `LICENSE.txt`. Not read: `Attackable.cs` 1-300 and 400-460 (reward XP path), `dropItem()`, `doAutoLoot()`, `takeSweep()`, `checkSpoilOwner()`, the champion constants, the rate-by-id loading. Callers: `calculateDrops` is called from `Attackable.cs` 1171 (spoil), 1174 (drop), 1223 (fortune), 1575 (sweep); I read 1171, 1174 and 1223 in context, not 1575. `doItemDrop` is called from `Attackable.cs` 473 and 478 (reward path); other callers in the repo were not searched. Confidence: high on the roll order, the eviction rule and the group bias (the bias is also confirmed by a local 400k-draw simulation of the code as read, not a run of the donor). High on the dead party branch (a static argument from one guard, not run). Medium on the recipient detail for the path where a dealer is offline (read, not run).

## 1. Mechanism

- One kill runs three decisions in order: who gets the drop (recipient), which tables roll (DROP, and the spoil list when spoiled), and each table entry's roll.
- **Recipient, as the donor runs it.** The damage tally walks the aggro list. An attacker counts only if its acting player exists and the single aggro entry's damage is above 1 (`Attackable.cs` 324). A player is in range only if `Util.checkIfInRange(ALT_PARTY_RANGE, ...)` passes (327; default 1500, `Config.Character.cs` 421, units not read). Totals per player are kept, and `maxDealer` is replaced only when a player's total is strictly greater than `maxDamage` (338-341).
- **The party branch is dead as written.** A party total list is built (346-392), then sorted and the last entry taken as `mostDamageParty` (396-397). The branch at 470 needs `mostDamageParty` to be non-null, and the party-leader call is 473. But the only `damagingParties.Add` (392) runs only when `partyContainerStream` is non-null (390). That variable is set only by searching `damagingParties` (362-368), which starts empty (346). So the search never finds anything, the add never runs, the list stays empty, `mostDamageParty` is null, and 470 is never true. The code that runs is 478: the top dealer if online, otherwise `lastAttacker`. This is a static derivation from reading, not an observed run.
- **doItemDrop** (`Attackable.cs` 1117). If the killer has no acting player, only a fake-player path runs. Otherwise: if the monster is spoiled and not plundered, the spoil list is rolled (1170-1171); then the DROP list is rolled for the player (1174). Each drop goes to the killer (autoloot condition at 1184-1186, `player.doAutoLoot`) or to the ground.
- **calculateDrops** (`NpcTemplate.cs` 645). DROP returns the group list and the ungrouped list concatenated. SPOIL and FORTUNE use the ungrouped function only, with their own list. Champion extras are appended in both paths (not read in detail).
- **Ungrouped roll, per entry, in this order** (908-1000, the per-entry roll 1114-1250):
  1. Eviction (928-935). If the occurrence counter is 0, the entry's base chance is below 100, and at least one limited drop is held, the earliest held limited drop (`randomDrops[0]`) is removed from the result and kept as `cachedItem`. The counter is set to 1.
  2. Level gap (939). The entry is skipped when `killer.level - victim.level` is greater than 14 (items; adena has its own config, same default 14).
  3. Roll (1182). `Rnd.nextDouble() * 100 < chance * rateChance`, one independent roll per entry. `rateChance` comes from a by-id override, or herb, raid or death multipliers, champion, premium, and the BONUS_DROP_RATE stats.
  4. Amount (1240). `Rnd.get(min, max) * rateAmount`, cast to long. `Rnd.get(min, max)` is `Random.Shared.Next(min, max)` (`Rnd.cs` 22), so max is exclusive.
  5. Bookkeeping. The drop is added to the result. If the base chance is below 100 (967-976), the counter drops by one and the drop holds a slot.
  - After the loop (983-985): if the counter is still above 0 and `cachedItem` is set, the evicted drop goes back into the result.
- **What the eviction means in practice (read from the code).** Eviction happens whenever a limited entry is reached while the slots are full, before its level check and roll. If that entry then drops, the earlier drop is gone. If it does not drop (failed roll or level-filtered), the earlier drop comes back. So a later rare entry takes the slot from the earliest one when it rolls. The comment at 931 says "remove the highest chance item", but the code takes index 0 of the held list, which is the earliest limited drop in table order. I did not check whether the data tables are sorted by chance.
- **Group roll** (697-905). Entries inside a group are tested in order. With no custom rate, `totalChance` is a running sum of the entry chances (779). Each entry is tested against `totalChance * (group.getChance() / 100) * rateChance` (786) with a fresh random number (1043). The first success ends the group (855-858). This is not an exclusive partition. I ran a local Monte Carlo of exactly that rule (400k draws, group chance 100): entries 20/30/50 gave 0.20 / 0.40 / 0.40 (stated 0.20 / 0.30 / 0.50); entries 30/20 gave 0.30 / 0.35 (stated 0.30 / 0.20); entries 50/50 gave 0.50 / 0.50 (exact). The later entries win more than their stated chance. The donor's cap and eviction rules apply to the group path too (704-706, 797-803).
- Tick: none. A kill is one synchronous call. There is no per-frame loop here.

## 2. Key functions

- `Attackable.cs` 305-341, damage tally and top dealer: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Attackable.cs` (lines 324, 338-341).
- `Attackable.cs` 346-397, party totals (dead branch): same file (362, 390, 392, 396, 397).
- `Attackable.cs` 470-478, recipient: same file (470, 473, 478).
- `Attackable.cs` 1117-1186, `doItemDrop`: same file (1117, 1171, 1174, 1186).
- `NpcTemplate.cs` 645-695, `calculateDrops` dispatch: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Templates/NpcTemplate.cs` (645).
- `NpcTemplate.cs` 697-905, `calculateGroupDrops`: same file (704, 706, 779, 786, 797-798, 807, 855, 1043, 1102).
- `NpcTemplate.cs` 908-1000, `calculateUngroupedDrops`: same file (917-922, 928-935, 939, 967, 970, 976, 979, 983).
- `NpcTemplate.cs` 1114-1250, `calculateUngroupedDrop` (per entry roll and amount): same file (1182, 1240).
- `Rnd.cs` 20-22, `Rnd.get(min, max)`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.Common/Utilities/Rnd.cs` (22).
- `Sweeper.cs` 30-50, the sweep path for spoiled monsters (a second channel, not the same table): `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Scripts/Handlers/EffectHandlers/Sweeper.cs` (40, 47).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| A per-kill cap on rare entries (chance < 100), with a slot count | Normal 2, raid 7 (`Config.Rates.cs` 165-166) |
| Level-gap filter: skip the entry when the killer is too far above the victim | 14 for items (168), 14 for adena (167) |
| Per-entry independent roll against percent chance times a global rate | Death drop chance multiplier 1 (159) |
| Amount = uniform integer in [min, max) times a global rate, truncated | Death drop amount multiplier 1 (155); `Random.Shared.Next`, max exclusive (`Rnd.cs` 22) |
| Recipient: top single dealer by total damage if online, else last attacker | Range 1500 (`Config.Character.cs` 421), units not read; the party-leader alternative never runs |
| Group roll with running totals (not exclusive) | Group chance enters as `group.getChance() / 100` (786); value not read |
| Cap of zero | Disables the whole list (guards at 706 and 922) |

## 4. TypeScript sketch

simplified: this sketch is the ungrouped path only, in the donor order (eviction, level gap, roll, bookkeeping, restore), plus the recipient rule as read. It omits the group running-total roll (deliberately not copied; see Section 6), champion extras, by-id rate overrides and the herb, raid, premium and bonus-stat multipliers (`chanceMult` stands in for one global rate), the separate adena level gap, the spoil and fortune tables, autoloot versus ground drops, the fake-player path, and the party totals (the donor branch is dead). It departs from the donor once on purpose: the donor allows a cap of 0, which switches off every drop in that list (706, 922); the sketch throws instead. The limited test uses the base chance, as the donor's default branch does.

```ts
// Donor licence: MIT (permissive). This is a clean-room re-expression of the mechanism, not a line translation.
// clean-room
export interface DropEntry {
  itemId: number;
  chance: number; // percent, 0-100
  min: number;
  max: number;    // exclusive upper bound, as the donor's Rnd.get(min, max)
}

export interface DropRules {
  maxLimitedDrops: number; // slots for entries with chance < 100 (zone data)
  levelGapMax: number;     // skip the table when killer.level - victim.level exceeds this (engine constant)
  chanceMult: number;      // global chance rate (engine constant)
  amountMult: number;      // global amount rate (engine constant)
}

export interface Drop { itemId: number; count: number; }

// Walks the table in order. Mirrors the donor's ungrouped path:
// eviction check first, then the level-gap filter, then one independent roll, then slot bookkeeping.
export function rollDrops(entries: DropEntry[], killerLevel: number, victimLevel: number,
                          rules: DropRules, rnd: () => number): Drop[] {
  if (rules.maxLimitedDrops < 1) throw new Error("maxLimitedDrops must be >= 1");
  const out: Drop[] = [];
  const kept: Drop[] = [];         // limited drops that hold a slot, oldest first
  let slots = rules.maxLimitedDrops;
  let cached: Drop | null = null;  // last drop pushed out to make room
  for (const e of entries) {
    if (slots === 0 && e.chance < 100 && kept.length > 0) {
      cached = kept.shift() as Drop;
      out.splice(out.indexOf(cached), 1);
      slots = 1;
    }
    if (killerLevel - victimLevel > rules.levelGapMax) continue;
    if (rnd() * 100 >= e.chance * rules.chanceMult) continue;
    const span = e.max - e.min;
    const raw = span > 0 ? e.min + Math.floor(rnd() * span) : e.min;
    const drop: Drop = { itemId: e.itemId, count: Math.trunc(raw * rules.amountMult) };
    out.push(drop);
    if (e.chance < 100) { slots -= 1; kept.push(drop); }
  }
  if (slots > 0 && cached !== null) out.push(cached);
  return out;
}

export interface Dealer { id: string; damage: number; online: boolean; } // per-player totals

// Donor rule as read: the top single dealer gets the drop if online, otherwise the last attacker.
// Strictly greater total replaces the current top, so a tie keeps the earlier dealer.
export function pickRecipient(dealers: Dealer[], lastAttacker: string): string {
  let top: Dealer | null = null;
  for (const d of dealers) {
    if (top === null || d.damage > top.damage) top = d;
  }
  return top !== null && top.online ? top.id : lastAttacker;
}
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module, server side). The roll and the recipient run inside the kill, after the server verifies the death. The sketch is not called from the tick or the client.
- Parity-checklist row 18 (loot roll and XP award). The server tick has no row of its own: this sits under row 18 / post-K item 3.
- Reuse tag: adapt (MIT; shape taken, code not copied; the sketch is clean-room)
- Brief rule served: 1 (one engine: the roll and the recipient live in the engine, not the client); zones as data (the rare-drop cap is zone data); server-verified kills (the recipient is decided at death on the server)

## 6. Gaps and risks

- One engine and zones as data. The donor keeps the cap, the level gap and the rates in one global config file. For Frankendom the cap (normal 2, raid 7 in the donor) is per-encounter zone data; the level gap and the rate multipliers are engine constants. Do not copy the config-file split.
- Server-verified kills. The recipient is chosen at death from the damage tally, which is the right moment. Under the MAX_ATTACKERS = 3 ruling the tally has at most three players, which is simpler than the donor's unbounded aggro list. The donor's range check (ALT_PARTY_RANGE, units not read) needs an explicit Frankendom equivalent.
- The party-leader branch never runs in the donor. Do not port it as if it worked. If party credit is wanted, it is a new rule with its own test.
- Order-dependent eviction. Whether a rare drop survives depends on table order and on a later rare entry failing its own level check. Frankendom should not copy the displacement. Keep the cap, and once the slots are full, skip later rare entries. Write the table order explicitly in the catalogue and test it.
- Group running-total bias. Do not copy. Use one uniform draw against cumulative thresholds (an exclusive partition), so the data's stated chances are the real chances. Acceptance test: 20/30/50 over 100k seeded draws gives each within 1 point.
- Cap of 0 disables the whole list. Reject 0 at data load instead.
- Randomness. The donor uses `Random.Shared`, which cannot be replayed. Frankendom needs an injected seeded RNG for the fight record and replay (row 19) and for tests.
- Amount bounds. The donor's max is exclusive. Frankendom's data must say inclusive or exclusive, and the test must pin it.
- The donor comment says "highest chance item" but the code removes the earliest held drop. Never ship a comment that does not match the code.
- Not used: champion extras, premium and herb rules, spoil and fortune tables, the fake-player path. Frankendom has no such features (per the rulings I was given; not checked against the repo).

Best transferable idea: give each kill a fixed number of rare-drop slots and gate the whole table by a killer-to-victim level gap, so rare loot is capped per kill and a killer far above the mob gets nothing.
Decision (proposed): adapt. Keep the per-kill rare cap (zone data), the level-gap filter (engine constant) and the top-dealer recipient rule. Drop the eviction displacement, the group running-total roll and the dead party branch, because they make drop odds depend on table order and do not give the chances the data states.
Acceptance: a server test with a seeded RNG, where a 20/30/50 group rolled over 100k kills lands within 1 point of each stated chance; a killer 15 levels above a level-3 mob never receives a rare drop; a raid zone with cap 7 never yields more than 7 rare drops per kill; among at most three attackers the top dealer receives the drop when online, else the last attacker.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** Dead party branch verified exactly (Attackable.cs 362-368, 390-393, 397, 470 vs 478); strict > for maxDealer (338); damage>1 filter (324); eviction/restore logic and the index-0 vs 'highest chance' comment (NpcTemplate 928-935, 984-987); group running-total with first-success break (779, 786, 856-858) and the 0.20/0.40/0.40 bias arithmetic reproduces by hand; Rnd.get exclusive max (Rnd.cs 22); Config defaults 2/7/14/14 and 155-168 line refs; ALT_PARTY_RANGE 1500; MIT licence: all correct.

**Missed:** group path only evicts when rateChance==1 (793) - note says eviction applies to group path too, which is true but incomplete; otherwise nothing
