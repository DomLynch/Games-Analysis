# TrinityCore-TrinityCore (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Loot/LootMgr.cpp` (with `Loot.cpp`, `Loot.h`, `src/common/Utilities/Random.h`) | Licence: GPL-2.0-or-later (LootMgr.cpp header: "either version 2 of the License, or (at your option) any later version"; repo COPYING is GPL v2) | C++ | symbol `LootTemplate::LootGroup::Roll`

Checked: Read in full: `LootStoreItem::Roll` (LootMgr.cpp 250-282), `LootGroup::Roll` (432-465) and `LootGroup::Process` (519-521), `LootTemplate::Process` (641-696), `LootGroupInvalidSelector` (61-79), `Loot::FillLoot` (859-926), `Loot::AddItem` (929-974), `LootRoll::TryToStart`, `PlayerVote`, `UpdateRoll`, `AllPlayerVoted`, `Finish` (Loot.cpp 465-518, 521-562, 565-575, 587-624, 674-715), `LootItem::ItemAllowedForPlayer` (Loot.cpp 110-162), round-robin visibility (Loot.cpp 225-262). Read in part: `LootItem::AllowedForPlayer` callers and `LootTemplate::ProcessPersonalLoot` (698-815, not read); `Loot::Update` (Loot.cpp 1189-1196, read; its caller not read). Callers: only the creature-kill paths were read (Unit.cpp 11400 and 11426; 11426's outer condition not read). Not read: GameObject chests and fishing callers, disenchant callers, loot packet layer. Confidence: high on the drop tables (whole path read end to end); medium on the group Need/Greed flow (read the vote and resolve code, not the packet layer). camera_scope: not applicable.

## 1. Mechanism

- A creature death fills one `Loot` object from the creature's loot id via `Loot::FillLoot`, which calls `LootTemplate::Process` once (Loot.cpp 878). The steps run in this order:
  (a) Ungrouped entries, in table order. Each is an independent roll (661). The chance is the raw chance, or for ungrouped items the raw chance times a quality rate (261), and a chance of 100 or more always passes (`LootStoreItem::Roll` returns true first). A plain item is added (`AddItem`). A reference entry runs the referenced table again `maxcount x Rate.Drop.Item.ReferencedAmount` times (681-683), so one entry can add several rolls.
  (b) Then each group, one pick per group (`LootGroup::Process`, 519-521).
- The group pick (`LootGroup::Roll`, 432-465): invalid entries are erased first (439; the filter drops entries whose lootmode does not match, 67, and, for a personal looter, entries that player cannot take, 70-71). Then ONE draw, a float in [0,100) (447). The explicit entries (chance not zero) are walked in order: an entry of 100 or more returns at once (451-452); otherwise the chance is subtracted from the draw and the entry is returned when the draw goes below zero (454-456). If no explicit entry is hit, the equal-chance pool (chance zero) is consulted and one entry is chosen uniformly (460-462). If that pool is empty too, the group gives nothing.
- Group entries get NO quality rate. `LootGroup::Process` takes no rate argument (519) and `Roll` walks the raw chance (454). Only ungrouped entries get the quality multiplier (261). The donor is inconsistent here; see section 6.
- Stack split (`Loot::AddItem`, 939-946): the count is drawn uniformly from min to max (939); stacks = ceil(count / max stack) (940); each stack holds min(count, max stack) (946); the loop stops when the loot already holds `MAX_NR_LOOT_ITEMS` (18) slots (942). Stacks past the cap are dropped with no error (the loop condition is the only check that was read).
- Ownership, after the rolls (`FillLoot`, 880-926): for a non-personal kill by a group, each member within reward distance can see the non-normal loot. For each item that follows loot rules and is not free-for-all: below the group loot threshold quality, the item is marked under threshold (901-902), which makes it visible only to the round-robin player (checks at 237-254; the owner is set at 885 for corpse loot). At or above threshold, under MASTER_LOOT, GROUP_LOOT or NEED_BEFORE_GREED, the item is marked blocked (rolled, 911).
- The group roll (`LootRoll::TryToStart`, Loot.cpp 465-518): the item is blocked while rolling (478). Each allowed player starts as NotEmitedYet, or as Pass if they chose pass-on-loot (490). If only one player can take the item (`playerCount > 1` false, 505), the item becomes under threshold and unblocked (514-515) with no roll. Otherwise the roll starts and gets a 60-second deadline (509, `LOOT_ROLL_TIMEOUT = 1min`).
- Votes (`PlayerVote`, 521-562): Need, Greed and Disenchant each draw `urand(1, 100)` (531). Pass draws nothing. A player can vote once.
- Resolve (`UpdateRoll`, 565-575, called from `Loot::Update` over the open rolls, 1189-1196): the roll finishes when every player has voted or the deadline has passed (569). `AllPlayerVoted` (587-624) picks the winner: any Need beats every Greed/Disenchant (606 comment and the `isSomeoneNeed` flag); among Needs the highest roll wins; among Greeds the highest roll wins only if no Need exists; Pass is excluded; a player still NotEmitedYet is counted as not voted, but at the deadline the winner is still taken from those who voted.
- `Finish` (674-715): no winner gives `SendAllPassed` (679). A winner gets `rollWinnerGUID` set (683) and the item stored to them (`StoreLootItem`), or a Disenchant winner gets the disenchant loot instead.

## 2. Key functions

- `LootStoreItem::Roll`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Loot/LootMgr.cpp` 250-282 (chance 100 pass, per-quality rate, `roll_chance`).
- `LootTemplate::LootGroup::Roll`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Loot/LootMgr.cpp` 432-465 (filter, one draw, explicit walk, equal-chance fallback).
- `LootTemplate::Process`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Loot/LootMgr.cpp` 641-696 (ungrouped rolls, reference recursion, then groups).
- `Loot::FillLoot`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Loot/Loot.cpp` 859-926 (one Process call, then group ownership flags).
- `Loot::AddItem`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Loot/Loot.cpp` 929-974 (count, stacks, 18-slot cap).
- `LootRoll::TryToStart` / `PlayerVote` / `AllPlayerVoted` / `Finish`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Loot/Loot.cpp` 465-518, 521-562, 587-624, 674-715.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One draw in [0,100) walks cumulative chances of mutually exclusive drops; a miss falls to a uniform equal-chance pool | Chances are per row in the loot tables (data, not code); a chance of 0 marks the equal-chance pool. The draw range is fixed at 0-100, so filtering entries does not renormalise |
| Ungrouped entry passes when chance x rate > draw; chance of 100 or more always passes | Quality-to-rate table `QualityToRate` (LootMgr.cpp 34-45): Poor..Artifact map to rate config, Heirloom and WoW token map to none (MAX_RATES) |
| Rate config default | `Rate.Drop.Item.*` default 1 (theirs, worldserver.conf.dist 2459) |
| Reference repeat count = maxcount x amount rate | `Rate.Drop.Item.ReferencedAmount` default 1 (theirs, worldserver.conf.dist 2467) |
| Stack count uniform in [min, max], split into stacks of the max stack size | Max stack size comes from the item template (not read) |
| Hard slot cap per corpse | `MAX_NR_LOOT_ITEMS` = 18 (theirs, Loot.h 86) |
| Group roll window | `LOOT_ROLL_TIMEOUT` = 1 minute (theirs, Loot.h 34) |
| Vote draw | `urand(1, 100)` (theirs, Loot.cpp 531) |
| Need beats greed; highest roll wins inside the class | Rule as coded (Loot.cpp 597-606) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one table (explicit walk with one draw, then the equal-chance fallback), the ungrouped roll, the stack split with the 18-slot cap, and the Need-over-Greed vote rule. It omits: the lootmode filter and the personal-looter usability check (the sketch takes a predicate); the quality rate on ungrouped entries (the sketch takes it as an argument and leaves groups without it, as the donor does); reference recursion; ownership flags (round robin, threshold, master loot); the disenchant vote; pass-on-loot as a stored setting; and the 1-eligible-player shortcut. The donor's `count -= maxStack` loop is kept as written.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Draw = () => number;                       // float in [0, 100)
const MAX_SLOTS = 18;                           // slots per corpse
const ROLL_TIMEOUT_S = 60;                      // group roll window

interface Entry {
  id: string;
  chance: number;                               // percent; 0 = equal-chance pool
  min: number; max: number; maxStack: number;   // stack count range
}

// Explicit entries share ONE draw in [0,100): walk the cumulative chances.
// A miss falls to the equal-chance pool (uniform). Invalid entries are removed first,
// so the draw range does not shrink and a filtered-out entry raises the chance of "nothing".
function pickFromGroup(group: Entry[], eligible: (e: Entry) => boolean, draw: Draw, rnd: () => number): Entry | null {
  const pool = group.filter(eligible);
  const explicit = pool.filter(e => e.chance !== 0);
  const equal = pool.filter(e => e.chance === 0);
  if (explicit.length > 0) {
    let r = draw();
    for (const e of explicit) {
      if (e.chance >= 100) return e;
      r -= e.chance;
      if (r < 0) return e;
    }
  }
  if (equal.length > 0) return equal[Math.floor(rnd() * equal.length)];
  return null;
}

// Ungrouped entry: independent roll. Quality rate multiplies the chance; the raw 100 check comes first.
function rollIndependent(chance: number, qualityRate: number, draw: Draw): boolean {
  if (chance >= 100) return true;
  return chance * qualityRate > draw();          // roll_chance: chance > draw
}

// Stack split: one count per entry, ceil(count / maxStack) stacks, stop at the slot cap.
function stacksFor(e: Entry, slotsUsed: number, rnd: () => number): { id: string; count: number }[] {
  let count = e.min + Math.floor(rnd() * (e.max - e.min + 1));
  const stacks = Math.ceil(count / e.maxStack);
  const out: { id: string; count: number }[] = [];
  for (let i = 0; i < stacks && slotsUsed + out.length < MAX_SLOTS; i++) {
    out.push({ id: e.id, count: Math.min(count, e.maxStack) });
    count -= e.maxStack;
  }
  return out;
}

// Group loot: needs beat greeds; highest 1-100 roll wins inside a class; passes never win.
type Vote = "need" | "greed" | "pass" | "none";
interface Ballot { vote: Vote; roll: number; }

// Returns the winner id, null for all-passed, or "pending" while votes are open and the timer runs.
function resolveRoll(ballots: Map<string, Ballot>, timedOut: boolean): string | null | "pending" {
  let winner: string | null = null;
  let winnerRoll = -1;
  let needSeen = false;
  let waiting = 0;
  for (const [pid, b] of ballots) {
    if (b.vote === "none") { waiting++; continue; }
    if (b.vote === "need") {
      if (!needSeen || b.roll > winnerRoll) { needSeen = true; winner = pid; winnerRoll = b.roll; }
    } else if (b.vote === "greed") {
      if (!needSeen && (winner === null || b.roll > winnerRoll)) { winner = pid; winnerRoll = b.roll; }
    }
  }
  if (waiting === 0 || timedOut) return winner;
  return "pending";
}

export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module; not in the tree as far as this pass checked, not verified): the one place a kill's drops are rolled, server-side, then written to the one ledger. Parity-checklist row 18 (loot roll and XP award), with the server sub-line "server tick: fixed step, input intake, per-tick NPC budget" for the timer (the roll window is advanced by the server update, as `Loot::Update` does). Row 18 is the only fit; zone population rows are not involved.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (drops are written once, by the server); server-verified kills (the roll happens on the server, never on the client); zones as data (loot tables are data, the engine rolls them)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- Inconsistency in the donor: ungrouped entries get the quality rate (LootMgr.cpp 261) and group entries do not (519, 454). Frankendom should pick one rule and state it in the zone data. Do not copy the split by accident.
- Filter-before-draw: removing an entry (wrong lootmode, or a personal looter who cannot take it) does not renormalise the 0-100 draw, so the "nothing dropped" share rises. Frankendom must decide whether a filtered entry changes odds (it should not silently, for a per-player drop) and test it.
- Overflow is silent: stacks beyond 18 slots are dropped with no record (Loot.cpp 942). Frankendom's one-ledger rule wants the overflow logged or the table rejected at load time.
- Need/Greed, round robin and master loot are party features. Frankendom's fights are up to MAX_ATTACKERS = 3 with server-verified kills; a party roll UI is not in the rulings yet. The server-side timer shape is the part that transfers.
- The donor's `Loot::Update` poll (1189-1196) is driven by a caller that was not read; the timing source is therefore unknown here (not read).
- Only creature-kill callers were read. Chests, fishing, disenchant and pickpocket callers (GameObject.cpp, SpellEffects.cpp) were not read.
- Rates are server config (default 1), not per zone in the donor. Frankendom should carry them as zone data with defaults.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: one ledger, server-verified kills, zones as data (rule 1 one engine, two clients)

Best transferable idea: One draw walks the cumulative chances of mutually exclusive drops, with a uniform equal-chance pool for the rest, and filtering is stated as a rule rather than left to renormalise.
Decision (proposed): adapt — the one-draw table is simple, server-side and checkable, so take the shape; do not copy the donor's group/quality inconsistency or the silent overflow, and defer the Need/Greed party UI until a party rule exists.
Acceptance: a server test over 100k seeded rolls on one zone table (explicit chances 10 and 25, plus an equal-chance item) lands each within 0.5 points of its chance; a kill payload carries one pick per group and never more than 18 stacks, with the overflow written to the ledger.
