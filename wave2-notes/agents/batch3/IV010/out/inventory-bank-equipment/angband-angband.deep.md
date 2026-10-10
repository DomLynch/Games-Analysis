# angband-angband (inventory-bank-equipment, cell 1)

Donor: `/mnt/frankendom-donors/angband-angband/src/obj-gear.c` | Licence: GPL v2, or the "Angband licence" (dual; header obj-gear.c 11-14, same in obj-pile.c 10-13) | C | symbol `inven_carry_num`

Checked: Hint file `ui-equip-cmp.c` is the knowledge-menu resistance grid, not the inventory; not used. Real mechanism found by grep for `inven_carry`, `object_stackable`, `combine_pack`, `pack_overflow`. Read in full: `inven_carry_num` (obj-gear.c 749-780), `quiver_absorb_num` (649-740, read for the count only), `inven_carry` (821 onward, merge part), `inven_can_stack_partial` (1183 onward), `combine_pack` (1242 to the end of the function, about 1318; end line not checked exactly), `pack_overflow` (1345 onward), `pack_slots_used` (257-290), `object_similar` / `object_stackable` / `object_mergeable` / `object_absorb_partial` / `object_absorb` (obj-pile.c 394-700), `player_pickup_aux` (cmd-pickup.c 229 onward), store purchase check (store.c 1684). Not read: `calc_inventory` (only its call to `combine_pack` at player-calcs.c 2550 is seen), the Home (bank) code in store.c beyond the grep hit at 1814-1815, the quiver slot placement beyond `quiver_absorb_num`. Confidence: high for the carry-count and top-up path, which is the part the note relies on; medium for the full pack reorder.

Best transferable idea: Before a loot pile lands in a bag, count what fits (a free slot takes the whole pile, otherwise only the headroom left in same-kind stacks), move only that, and leave the remainder on the ground with a report.
Decision (proposed): adapt - The count-then-take shape gives a clear bag-full result for a phone player and keeps the move on the server; adapt because the donor is single-player, has a quiver Frankendom does not need, and has pickup take-what-fits while purchase refuses the whole pile, which Frankendom must choose between per source.
Acceptance: A pile of 12 potions landing on a bag with one potion stack of 35 of 40 and no free slot: the server adds 5, the phone shows 'Bag full: 7 potions stay on the ground', and the ground pile is left with 7; a server test asserts the bag count never exceeds the cap and the remainder is never lost.

## 1. Mechanism

- Stacks: two objects merge only when `object_similar` passes (same kind, same flags and element resistances, not equipped, not an artifact, and the type-specific checks) and their inscriptions do not conflict (obj-pile.c 394-510). A merge is refused when the combined total passes the kind's cap (`object_mergeable`, obj-pile.c 512-520). The default cap is 40 (object_base.txt 17).
- Count that fits (the core): `inven_carry_num` (obj-gear.c 749) answers "how many of this pile can I take right now". Order of steps: (a) gold is always taken in full (754-755); (b) ammo or throwing items first try the quiver (`quiver_absorb_num`, 759-760); (c) if the quiver took everything, or the pack has a free slot, the whole pile is taken (762-765; a free slot is checked by `pack_slots_used`, 257-290, which does not count equipped gear); (d) otherwise it walks the pack, and each same-kind stack that can absorb the pile reduces `num_left` by its headroom, `max_stack - number` (767-776); (e) it returns `number - MAX(num_left, 0)`, which is the smaller of the pile size and the total headroom (778-779).
- Pickup from the floor: `player_pickup_aux` (cmd-pickup.c 229-232) takes this count first. If it is 0 the pickup is aborted (`quit_fmt`, 234-235). If the count is less than the pile, the player is asked for a number, or an auto-pickup maximum from an inscription applies (`auto_max`). The rest stays on the floor. So pickup is partial: it takes what fits and leaves the remainder.
- Purchase: `store.c` 1684-1685 refuses the whole purchase ("You cannot carry that many items.") if the bought count is above `inven_carry_num`. Same check again at store.c 1814-1815 (seen in grep, not read in full). So purchase is all-or-nothing, pickup is take-what-fits.
- Adding to the pack: `inven_carry` (821) first looks for a non-equipped, mergeable stack (the quiver or pack stack type is chosen per item). If it finds one it absorbs the item (`object_absorb`, which clamps the count to the cap, obj-pile.c 676-684). If not, it appends the item to the gear list and updates weight. It does not drop anything itself.
- Over capacity: `pack_overflow` (1345) runs only when the pack holds more slots than `pack-size` (checked by `pack_is_overfull`). It takes the last inventory slot (1363-1365), says "Your pack overflows!" (1356), excises it and drops it near the player (1378-1380). It is called from game-world.c 871-872 after a command, so one add may leave the pack one slot over until that step.
- Tidy-up: `combine_pack` (1242) walks the pack from the last item backwards. For each item it tries a full merge into an earlier stack (1263-1264). If that fails and `inven_can_stack_partial` (1183) allows it, `object_absorb_partial` (obj-pile.c 624 onward) tops the earlier stack up to the cap and leaves the rest in the later one (1288-1291). Callers (checked by grep): cmd-obj.c 256 (call seen, not read), obj-gear.c 1009 (inside `inven_wield`), player-calcs.c 2550 (call seen, not read).

## 2. Key functions

- `inven_carry_num`: `/mnt/frankendom-donors/angband-angband/src/obj-gear.c` 749-780. Returns how many of a pile fit (pickup and purchase both call it).
- `player_pickup_aux`: `/mnt/frankendom-donors/angband-angband/src/cmd-pickup.c` 229 onward. Floor-to-pack move; takes the clamp from `inven_carry_num` at 232.
- `inven_carry`: `/mnt/frankendom-donors/angband-angband/src/obj-gear.c` 821 onward. Merge into an existing stack or append.
- `combine_pack`: `/mnt/frankendom-donors/angband-angband/src/obj-gear.c` 1242 onward. Full merge, then partial top-up, walking backwards.
- `pack_overflow`: `/mnt/frankendom-donors/angband-angband/src/obj-gear.c` 1345 onward. Drops the last slot when over capacity.
- `object_mergeable` / `object_absorb_partial` / `object_absorb`: `/mnt/frankendom-donors/angband-angband/src/obj-pile.c` 512-520, 624 onward, 676-684.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Count that fits = pile size, unless no free slot, then min(pile, headroom in same-kind stacks) | Pack size 23 slots (constants.txt 132) |
| Stack cap per kind; merge refused past the cap | Default cap 40 (object_base.txt 17); per-kind overrides exist in the data (not read) |
| Partial top-up: first stack filled to the cap, remainder stays in the second | Cap minus the larger count (obj-pile.c 660) |
| Free slot takes the whole pile; no free slot means only headroom | Quiver sizes 10 / 40 / multiplier 5 (constants.txt 135-141), not used in the sketch |
| Gold always fits | Rule (754-755) |

## 4. TypeScript sketch

simplified: keeps the free-slot test, the same-kind headroom count, the top-up and the overflow drop, in the donor's order. It omits the quiver (ammo and throwing items have their own slot size and multiplier), the gold rule, the inscription and known-status checks in `object_stackable`, charge splitting (`distribute_charges`), artifacts, the pack reorder that happens after an excise, and the `pack_overflow` message and drop placement. The cap is a parameter; the sketch does not check that an incoming pile is already at or under the cap (the donor's free-slot branch does not check it either, see section 6).

```ts
// Licence: GPL-2.0 or the "Angband licence" (donor, dual). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Stack { kind: string; number: number; max: number; }
interface Pack { slots: number; stacks: Stack[]; }

// How many of an incoming pile fit in the pack right now: a free slot takes the whole pile,
// otherwise only what the same-kind stacks have headroom for is taken. The rest stays on the ground.
function carryCount(pack: Pack, kind: string, incoming: number, max: number): number {
  const freeSlots = pack.slots - pack.stacks.length;
  if (freeSlots > 0) return incoming;
  let headroom = 0;
  for (const s of pack.stacks) {
    if (s.kind === kind) headroom += Math.max(0, max - s.number);
  }
  return Math.min(incoming, headroom);
}

// Top up one stack from another as far as the cap allows; returns what is left in `from`.
function topUp(into: Stack, from: Stack): number {
  const moved = Math.min(into.max - into.number, from.number);
  into.number += moved;
  from.number -= moved;
  return from.number;
}

// After an add the pack may hold one slot too many; the last slot is dropped to the ground.
function overflowDrop(pack: Pack): Stack | null {
  if (pack.stacks.length <= pack.slots) return null;
  return pack.stacks.pop() ?? null;
}

// Demo values: 0 free slots, one potion stack of 35 with cap 40, pile of 12.
const pack: Pack = { slots: 1, stacks: [{ kind: "potion", number: 35, max: 40 }] };
const taken = carryCount(pack, "potion", 12, 40);
export { taken, topUp, overflowDrop };
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file copied to /tmp on the VPS).

## 5. Lands in

- TARGET `src/fight/loot.ts` (proposed new module for the pickup count; the addendum does not name an inventory module and the repo layout was not checked, so treat the path as a proposal): the count-that-fits and the remainder rule for a loot pile landing in a bag.
- Parity-checklist row 18 (loot roll and XP award). No sub-line.
- Reuse tag: adapt (dual GPL-2 / Angband licence; clean-room, shape only)
- Brief rule served: one ledger (the server computes the count and the move; the phone shows the result); rules 7-9 n/a

## 6. Gaps and risks

- Licence: GPL v2 or the Angband licence, both offered. Treat as copyleft and clean-room. The sketch is written from the mechanism.
- Two rules, not one. Pickup takes what fits and leaves the rest (cmd-pickup.c 232-260); purchase refuses the whole thing (store.c 1684-1685). Frankendom must choose one per source (loot pickup: partial with a remainder; shop or bank transfer: whole or nothing) and test both. Do not let one ledger mix them.
- The free-slot branch returns the whole pile without checking the cap (obj-gear.c 762-765). The donor relies on piles already being at or under the cap. Frankendom's server must clamp the pile to the cap itself.
- Overflow happens in two steps: an add can leave the pack one slot over, and `pack_overflow` drops the last slot later (game-world.c 871-872). A single-ledger server should make the add and the drop one transaction, or the client can see a half-state.
- The quiver (ammo and throwing items with their own slot size and multiplier) is not used here. Frankendom has no quiver; leave it out.
- The count depends on pack state at that moment, so two players picking up from the same pile race. The donor is single-player and has no race case. The server must count and move under one lock or one tick.
- Auto-pickup inscriptions (`!g`, `=g`, cmd-pickup.c 163-200) are a player filter, a client option. The engine should not read them.

Reuse tag: adapt (GPL-2 / Angband licence; clean-room, shape only)
Brief rule served: one ledger for loot piles (row 18); the count is server-side, the phone reads it
