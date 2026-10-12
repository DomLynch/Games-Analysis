# ihhub-fheroes2 (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/resource/artifact.cpp` | Licence: GPL-2.0-or-later (artifact.cpp header line 11: "(at your option) any later version."; LICENSE line 2: "Version 2, June 1991") | C++ | symbol `BagArtifacts::PushArtifact`, `BagArtifacts::exchangeArtifacts`, `BagArtifacts::assembleArtifactSetIfPossible`

Checked: Read in full: resource/artifact.cpp 825-871 (push, remove, isFull), 891-1037 (exchangeArtifacts), 1383-1412 (set assembly), 1066-1080 (gold per object type, values read at 1072, 1074, 1076, 1078); heroes/heroes.cpp 1405-1480 (pickup, set assembly, AI sort at 1475-1476); heroes/heroes_action.cpp 866-900 (skeleton find); battle/battle_main.cpp 64-131 (battle loot plan and transfer); heroes/heroes_meeting.cpp 96-146 (hero-to-hero swap, read to the end) and 75-84 (moveArtifacts, partly read); game/difficulty.cpp 350-361 (AI sort gate). Hint file dialog/dialog_selectitems.cpp: opened 1150-1172; it is the map-editor artifact picker (line 1164 uses EDITOR_ANY_ULTIMATE_ARTIFACT), so it is the wrong file for this topic. Confidence: high for the bag, the full-bag gold rule, the exchange and the battle loot; medium for the "reveal then commit" flow (read in heroes_action.cpp only). Not read: the phone layout and touch code for the bag and the reveal dialog (not read), the scouting bonus after pickup (not read).

Best transferable idea: a fixed-size bag where a find that cannot fit turns into currency shown in the same reveal, with set parts auto-combining on pickup and a battle loot plan bounded by free slots.
Decision (proposed): adapt — keep the full-bag-to-gold rule, the set auto-assembly and the slot-bounded loot plan in src/fight/loot.ts with capacity and gold values as zone data; reject the spell-book slot-0 rule and the Necromancy and scroll heuristics, which are HoMM2-specific.
Acceptance: a server test asserts that a 14-item bag killing into a chest gives 1000 gold to the one ledger and no item, and that the last of three set parts picked up yields the set item in the same tick with one message.

## 1. Mechanism

- A hero's artifact bag is a fixed array of 14 slots (`maxCapacity`, artifact.h 302). An empty slot holds `Artifact::UNKNOWN`. There is no stacking: each artifact takes one slot. Scrolls with different spells are different items.
- Pickup order (`PushArtifact`, 825-857): reject an invalid artifact; reject a second spell book (834); find the first empty slot (838); if none, fail (839-840). A normal item goes into that slot. A spell book shifts every slot before the empty one one place right (851) and takes slot 0 (854), so the book is always first.
- Finding loot with a full bag: `ActionToSkeleton` checks `IsFullBagArtifacts` before it shows anything (876). If full, the find is converted to gold (877), using `GoldInsteadArtifact` (1066): skeleton, treasure chest and shipwreck survivor give 1000 (case lines 1069-1071, value 1072); sea chest 1500 (1073-1074); graveyard 2000 (1075-1076); shipwreck 5000 (1077-1078). If not full, a reveal dialog shows the artifact (893-895), and the hero picks it up after OK (897). `Heroes::PickupArtifact` (1405) then tries the push (1411). On failure a human hero gets a "full load" message (1431) and the artifact is refused.
- Set assembly (`assembleArtifactSetIfPossible`, 1383-1412): the table has one set, the Anduran battle garb, made of three parts (artifact.cpp 60-62). For each set, while all parts are in the bag, the parts are removed (first copy each) and the result is pushed; the loop repeats. The result always fits because three slots were just freed. It runs after every successful pickup (1438) and after every exchange (1035-1037).
- Two-hero exchange (`exchangeArtifacts`, 891-1037), in this order: (a) lift every valid non-book item out of both bags into one pool, resetting each slot (898-906); (b) pure-cursed items (curses, no bonuses) go to the giver (910-916); (c) if the giver has Necromancy and the taker does not, necromancy-only items go to the giver (918-935); (d) if the taker has a spell book, scrolls whose spell the book already has go to the giver (938-959); (e) for unique items (no curses, no cumulative bonus), extra copies go to the giver and one copy stays in the pool (962-1004); (f) the pool is sorted by value, lowest first (1006-1007); (g) the taker pops from the end (best first) up to 13 times, leaving one slot free for a spell book (1009-1016); (h) if the pool is still bigger than the giver's free slots, the taker takes one more (1018-1025); (i) the giver takes the rest (1028-1031); (j) `assert(combined.empty())` (1033) is the only check that nothing is left.
- Battle loot (`battle_main.cpp`): `planArtifactTransfer` (69-102) counts the winner's free slots (71). It walks the loser's bag in slot order, skipping empty slots and the book (64-67, 79-86), and plans one item per free slot (95). Ultimate artifacts are put in a separate list that is appended at the end (88-89, 98-100), and they also use a planned slot (95). `transferArtifacts` (118-131) pushes each planned non-ultimate into the winner's bag (124-128) and then clears the loser's slot for every planned item, ultimates included (130). Items not planned stay with the loser.
- Hero-to-hero swap at a meeting (`swapArtifacts`, heroes_meeting.cpp 96-146): walks both bags from the back, skips the book (122-132), and swaps pairs (145). When one bag runs out, the other bag's remaining items move only into empty slots (`moveRemainingArtifact`, 98-118; a failed push leaves the item where it is, 113-114).
- Tick: none. All of this is synchronous, one call per pickup, exchange, meeting or battle.

## 2. Key functions

- `BagArtifacts::PushArtifact`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/resource/artifact.cpp` 825-857. The first-empty-slot rule and the book shift to slot 0.
- `BagArtifacts::exchangeArtifacts`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/resource/artifact.cpp` 891-1037. Lift-out, filters, taker-best deal, giver remainder.
- `BagArtifacts::assembleArtifactSetIfPossible`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/resource/artifact.cpp` 1383-1412. Set detection and replacement.
- `GoldInsteadArtifact`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/resource/artifact.cpp` 1066-1080. Gold per find type.
- `Heroes::PickupArtifact`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/heroes/heroes.cpp` 1405-1441. Push, then set assembly, then the scouting check.
- `ActionToSkeleton`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/heroes/heroes_action.cpp` 866-900. Full-bag branch to gold, else reveal then pickup.
- `planArtifactTransfer` and `transferArtifacts`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/battle/battle_main.cpp` 69-101 and 118-131. Battle loot plan bounded by free winner slots.
- `swapArtifacts`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/heroes/heroes_meeting.cpp` 96-146. Pairwise swap from the back with the book skipped.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A fixed slot array; a new item takes the first empty slot; if none, the add fails and nothing changes | Capacity 14 (artifact.h 302) |
| Full bag turns a find into currency, with the reveal decided once before the dialog | Gold per find type: 1000 / 1500 / 2000 / 5000 (artifact.cpp 1072, 1074, 1076, 1078) |
| Parts are removed and the set result is pushed, repeated while complete | One set, three parts (artifact.cpp 61-62) |
| Exchange: lift out, filter, sort by value, deal best to the taker, rest to the giver | One spare slot for a book on the taker side (artifact.cpp 1010); the emergency take-one-more rule (1023) |
| Battle loot: planned count limited by free winner slots | Ultimates are last in the plan and use a slot (battle_main.cpp 95, 98-100) |
| AI sorts its bag from worst to best only on harder difficulties | Off for EASY and NORMAL (game/difficulty.cpp 352-356, read at 350-361) |

## 4. TypeScript sketch

simplified: keeps the bag push rule (book pinned to slot 0), the full-bag-to-gold decision, the set assembly, the loot plan (one fix: ultimates stay with the loser and use no winner slot) and the exchange deal (one fix: leftovers are returned, not dropped). It omits the Necromancy and scroll-duplicate rules, the unique-duplicate pass, the reveal dialog itself, the scouting bonus, the AI sort, the meeting swap, and the donor's `assert` checks. The caller must not pass a book into `dealExchange` or `planLoot`, and must refuse a trade when `dealExchange` returns leftovers.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Item {
  id: string;
  value: number;     // used only to order exchanges and loot
  isBook: boolean;   // spell book: pinned to slot 0, never traded
  ultimate: boolean; // ultimate items never leave a loser
}

export type Slot = Item | null;

export const BAG_CAPACITY = 14;

export interface SetDef {
  result: Item;
  parts: string[];
}

export class Bag {
  readonly slots: Slot[];

  constructor(capacity: number = BAG_CAPACITY) {
    this.slots = new Array<Slot>(capacity).fill(null);
  }

  isFull(): boolean {
    return this.slots.every((s) => s !== null);
  }

  // Normal items take the first empty slot. A spell book shifts the slots before the first empty one right and takes slot 0.
  push(item: Item): boolean {
    if (item.isBook && this.slots.some((s) => s !== null && s.isBook)) return false;
    const empty = this.slots.indexOf(null);
    if (empty === -1) return false;
    if (!item.isBook) {
      this.slots[empty] = item;
      return true;
    }
    this.slots.splice(empty, 1);
    this.slots.unshift(item);
    return true;
  }

  // Removes the first copy of an id.
  remove(id: string): void {
    const i = this.slots.findIndex((s) => s !== null && s.id === id);
    if (i !== -1) this.slots[i] = null;
  }

  // Replaces every complete set with its result. The result always fits because the parts were just removed.
  assemble(sets: SetDef[]): string[] {
    const made: string[] = [];
    for (const set of sets) {
      while (set.parts.every((p) => this.slots.some((s) => s !== null && s.id === p))) {
        for (const p of set.parts) this.remove(p);
        this.push(set.result);
        made.push(set.result.id);
      }
    }
    return made;
  }
}

export type LootOutcome = { kind: "item"; item: Item } | { kind: "gold"; gold: number };

// Decide once, with the bag as it is now: a full bag turns the find into gold.
// Caller order: show the reveal, then on OK call push() or add the gold.
export function resolveLoot(bag: Bag, item: Item, goldInstead: number): LootOutcome {
  return bag.isFull() ? { kind: "gold", gold: goldInstead } : { kind: "item", item };
}

// Won fight: free winner slots bound the plan. Normal items move in loser order. Ultimates stay with the loser and use no winner slot.
// Unplanned items stay with the loser.
export function planLoot(winnerFree: number, loser: Slot[]): { moved: Item[] } {
  let free = winnerFree;
  const moved: Item[] = [];
  for (const s of loser) {
    if (free === 0) break;
    if (s === null || s.isBook || s.ultimate) continue;
    moved.push(s);
    free -= 1;
  }
  return { moved };
}

// Two-hero exchange: the pool is lifted out first, then dealt back. The taker takes the best until one slot is spare.
export function dealExchange(taker: Bag, giver: Bag, pool: Item[]): Item[] {
  const sorted = [...pool].sort((a, b) => a.value - b.value); // lowest first, best from the end
  for (let i = 1; i < taker.slots.length && sorted.length > 0; i++) {
    if (!taker.push(sorted[sorted.length - 1])) break;
    sorted.pop();
  }
  while (sorted.length > 0 && giver.push(sorted[sorted.length - 1])) {
    sorted.pop();
  }
  return sorted; // not empty means the pool did not fit
}
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (the loot step after a won fight, one ledger): the bag rule (capacity, push, full-bag gold), set assembly, and the battle loot plan.
- Parity-checklist row 18 (loot roll and XP award). Sub-line for the loot plan: "loot roll and XP award". Spawn caps or respawn are not involved.
- today: (not read). Frankendom's current inventory and loot code was not opened for this note.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, one ledger: gold instead of an item goes through the same ledger); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defect 1, exchange has no runtime guard: `exchangeArtifacts` lifts every item out of both bags (906) and only `assert(combined.empty())` (1033) checks that all were placed. A release build compiles that out, so leftovers would be dropped. I did not prove this is reachable; nothing at runtime checks it (checked: only the assert at 1021 and 1033). fix: check the capacity before lifting, or return the leftovers and refuse the trade (the sketch's `dealExchange` returns them).
- Defect 2, ultimate in battle: `planArtifactTransfer` counts a planned ultimate against the winner's free slots (95), and `transferArtifacts` then clears the loser's slot for it (130) without moving it. So an ultimate is erased, and it blocks a slot. The comment says ultimates never go to the winner, but the code does not say they are destroyed. fix: the sketch keeps ultimates on the loser and uses no winner slot. The rule itself (destroy, keep, or give) is a design decision for Dom.
- Gold instead of an item: the gold values are per find type (1000 to 5000), not per zone. fix: in Frankendom these are zone data fields, with the same single-ledger rule.
- The reveal is decided before the dialog (876) and the commit comes after OK (897). In Frankendom the same decision must be re-checked at commit, because a bag can change between reveal and OK in a multi-tap UI. (Not read whether fheroes2 does this; the donor commits by calling PickupArtifact, which pushes again.)
- Magic book rules (one per bag, pinned to slot 0, never traded) are HoMM2-specific. Frankendom has no spell book. Reject that part.
- The Necromancy and scroll-duplicate heuristics (artifact.cpp 918-959) depend on hero skills and spell books. Reject for Frankendom; keep the principle only as "rare duplicate goes to whoever needs it less" if at all.
- AI sort gate: the donor sorts AI bags only on hard difficulties (game/difficulty.cpp 350-361). Frankendom has no AI bag; reject unless a bot is added.
- Phone presentation of the bag and the reveal: not read. The donor's reveal is one modal dialog with the artifact element (heroes_action.cpp 893-895); how it lays out at 375 px is (not read).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN. Line claims verified (maxCapacity 14, PushArtifact 825-857, exchangeArtifacts steps a-j, GoldInsteadArtifact values, set assembly, PickupArtifact, battle_main transfer, licence).
- Missed: none. (AI-sort gate is 'not EASY/NORMAL', i.e. hard and above; the note's 'hard difficulties' wording is acceptable.)
