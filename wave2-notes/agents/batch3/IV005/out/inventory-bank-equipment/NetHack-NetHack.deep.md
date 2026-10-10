# NetHack-NetHack (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/NetHack-NetHack/src/invent.c` | Licence: NetHack General Public License (`dat/license`; copyleft: paragraph 2b requires a derivative work to be licensed on identical terms) | C | symbol `mergable`

Checked: Read in full: `mergable` (invent.c 4431-4550), `merge_choice` (775-807), `merged` (814-~900, the worn-slot merge at 878 read, the tail after it not read), `add_to_container` (mkobj.c 2691-2712), `weight` (mkobj.c 1903 onward; container branch at 1966-1968), `container_weight` (2748-2753), `in_container` (pickup.c 2565-2718, the Icebox and shop-billing branches read but not traced), `mbag_explodes` (pickup.c 2495-2514), `carry_count` (pickup.c 1574-1660), `lift_object` (pickup.c 1709-1760, gold branch not read), `weight_cap`, `inv_weight`, `calc_capacity`, `max_capacity` (hack.c 4295-4396), `carrying_too_much` (hack.c 2616-2630, the rest not read). Confidence: high on stacking, pack-full refusal, pickup count, burden tiers and the bag weight rule. Not read: `out_container` (pickup.c 2734+), the body of `do_boh_explosion` (pickup.c ~2517-2560), loot presentation (`loot_classify` invent.c 149, `loot_xname` 309, `menu_loot` pickup.c 3272). So the phone-presentation part of this topic is NOT covered by this note. Candidate files opened: src/invent.c, src/pickup.c, src/mkobj.c, src/hack.c, include/weight.h, include/hack.h, dat/license. camera_scope: n/a.

Best transferable idea: Decide stack identity from a fixed field list, refuse a pickup into a full pack only when no existing stack would take it, and roll and validate a container move before anything leaves the pack.

Decision (proposed): adapt - take the stack-identity key, the merge-before-slot gate, the burden tiers and the bag weight rule; reject the bag-of-holding blast as a random loot-loss mechanic (it destroys items at random, which the server-verified ledger does not need), and fix the donor's move order so nothing leaves the pack before the roll.
Acceptance: A server test asserts that a potion matching a stack already in a full pack adds to that stack (count +1, no new slot), an unlike item into the same full pack is refused and the ledger is unchanged, and a multi-unit pickup stops at the last unit that keeps the total under 3 x weight cap.

## 1. Mechanism

- Stacking (`mergable`, invent.c 4431-4550). Two items stack only when they are the same object type and pass a fixed list of checks, in this order as the code runs: not the same object and not `nomerge` (4439-4440); coins of one kind always merge (4444-4445); cursed and blessed state match (4447); the same `how_lost` (4450-4453); then, after a globby shortcut, unpaid state, charges (`spe`), `no_charge`, broken, trapped and lit state match (4468-4470); food eaten and rotten state match; dknown, erosion and greased match; corpse, egg and tin kind match; hatching eggs and revivable corpses never merge; candles merge only when their ages are within the same 25-turn bucket; names must agree when both are set (4519-4526); mail command and artifact match (4544). Quantity is not part of the key.
- Merge (`merged`, invent.c 814-~900). The surviving stack adds the quantities (836), takes a quantity-weighted average age (832), recomputes its weight (842), takes the incoming name if it has none (843), and sets an identification flag on both sides if either side has it (862). A stack worn in competing slots is merged to one slot (878).
- Pack full (`lift_object`, pickup.c 1748). When the pack already holds the usual maximum of 52 letters (the donor comment at invent.c 772 says "all 52 inventory slots"), a new item is refused with "knapsack cannot accommodate any more items" unless `merge_choice` finds a stack that would take it. Gold is exempt from the slot limit. So a full pack still accepts a matching item.
- Pickup count (`carry_count`, pickup.c 1574-1660). The running offset is `max_capacity()` (1591), which is total weight minus 3 x capacity. For a count of identical units, the code adds one unit at a time and stops at the first unit whose addition makes the offset zero or more (1648-1653). The count taken is therefore the largest number that keeps the total under 3 x capacity. A code comment at 1642 calls this loop "Ugh".
- Burden tiers (`calc_capacity`, hack.c 4372-4381). Excess = total - capacity. Excess <= 0 is tier 0 (unencumbered). Otherwise tier = min(5, floor(2 x excess / capacity) + 1). That gives 1 Burdened for total in (cap, 1.5 cap), 2 Stressed for [1.5 cap, 2 cap), 3 Strained for [2 cap, 2.5 cap), 4 Overtaxed for [2.5 cap, 3 cap), and 5 Overloaded from 3 cap (the names are in include/hack.h 458-463).
- Move refusal (`carrying_too_much`, hack.c 2616-2630). At tier 5 the hero cannot move ("collapse under your load"). Above tier 1 it is also refused when HP is below 10 and not at maximum ("don't have enough stamina to move").
- Capacity (`weight_cap`, hack.c 4295-4345). Capacity is 25 x (STR + CON) + 50, capped at 1000 and floored at 1 (weight.h 12, 14, 25). Wounded legs and levitation adjust it; not traced here.
- Putting an item into a container (`in_container`, pickup.c 2565-2718). Refusals first: the container itself, worn armour and accessories, cursed loadstones, the Amulet and other special items, leashed items, boxes and boulders. Then the item is taken out of the pack (`freeinv`, 2631). Then, for a bag of holding, the blast roll (2665). On a blast the item is lost, the bag is consumed, and the hero takes 6d6 damage. On success `add_to_container` (2710) merges into an identical stack already in the bag, else links the item in at the front of the bag's list, and then the bag weight is recomputed (2711).
- Bag weight (`weight`, mkobj.c 1903 onward). A container weighs its own weight plus its contents. For a bag of holding the contents count x2 when cursed, (x+3)/4 when blessed, and (x+1)/2 otherwise (1966-1968). `container_weight` (2748-2753) recomputes an object and then its containers upward.
- Blast chance (`mbag_explodes`, pickup.c 2495-2514). An item that is a bag of holding (or a wand of cancellation with charges) rolls rn2(2^min(d,7)) <= d at depth d, where d is 0 for the item and rises by one per nested container. So putting a bag of holding into a bag of holding is certain (depth 0 gives rn2(1) <= 0). The donor comment gives the odds as 1/1, 2/2, 3/4, 4/8 and so on.

## 2. Key functions

- `mergable`: `/mnt/frankendom-donors/NetHack-NetHack/src/invent.c` 4431-4550. The identity key.
- `merged`: `/mnt/frankendom-donors/NetHack-NetHack/src/invent.c` 814-~900. Quantity sum, age average, weight, identification flags.
- `merge_choice`: `/mnt/frankendom-donors/NetHack-NetHack/src/invent.c` 775-807. "Would any stack take this?" for the full-pack gate. Callers read: pickup.c 1728 and 1748 (pickup), uhitm.c 2803 and shk.c 204 (monster gold), files.c 2555.
- `lift_object` and `carry_count`: `/mnt/frankendom-donors/NetHack-NetHack/src/pickup.c` 1709-1760 and 1574-1660. Pickup order: loadstone override, count by weight, full-pack gate, then the lift.
- `in_container` and `mbag_explodes`: `/mnt/frankendom-donors/NetHack-NetHack/src/pickup.c` 2565-2718 and 2495-2514.
- `add_to_container` and `weight`: `/mnt/frankendom-donors/NetHack-NetHack/src/mkobj.c` 2691-2712 and 1903 onward (container branch 1966-1968).
- `weight_cap`, `calc_capacity`, `max_capacity`, `carrying_too_much`: `/mnt/frankendom-donors/NetHack-NetHack/src/hack.c` 4295-4396 and 2616-2630.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stack identity key: fixed field list, quantity excluded, merge adds counts | The field list (theirs: invent.c 4439-4550); coins always merge (4444-4445) |
| Merge-before-slot: a full pack refuses only when no stack would take the item | 52 pack letters (theirs: invent.c 772) |
| Pickup count = largest count that keeps total under the Overloaded line | Overloaded line 3 x capacity (derived: hack.c 4380-4381 and 4395) |
| Burden tiers from excess / capacity, five levels | Tier numbers 1-5 (theirs: include/hack.h 458-463) |
| Capacity from stats | 25 per STR+CON point, +50, max 1000 (theirs: include/weight.h 12, 14, 25) |
| Container weight with a multiplier | Bag of holding: x2 cursed, /4 blessed, /2 uncursed (theirs: mkobj.c 1966-1968) |
| Chance by nesting depth | rn2(2^min(d,7)) <= d (theirs: pickup.c 2504) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's stack key (type, curse/bless, name with unnamed-joins-named), the merge-before-slot gate, the burden tiers, the pickup count (closed form of the donor's per-unit loop) and the bag weight rule. It omits: charges, lit and unpaid state, shop billing, eaten/eroded state, corpse and egg kind, age averaging, worn-slot merging, identification flags, the wand-of-cancellation case in the blast roll, the 6d6 damage and the scatter of bag contents on a blast, and the wounded-legs and levitation capacity changes. It reorders one thing on purpose: the donor takes the item out of the pack (freeinv, pickup.c 2631) before the blast roll (2665), so a blast leaves the pack changed; the sketch rolls first and changes nothing else on a refusal or blast. Bag weight is derived on read instead of cached, so there is no stale value to forget (the donor caches it and recomputes at call sites). The sketch is written from the mechanism; NetHack is copyleft, so this is clean-room.

```ts
type Flavour = 'cursed' | 'blessed' | 'uncursed';

interface Item {
  type: string;          // identity: only the same type stacks
  quan: number;          // stack size
  unitWeight: number;    // weight of one item (bags: their own weight)
  flavour: Flavour;      // curse/bless state must match to stack
  name: string;          // player-given name; '' means none
  holding?: boolean;     // bag of holding
  contents?: Item[];     // bag contents
}

const SLOTS = 52; // pack slots (donor comment: "all 52 inventory slots")

// Stack identity. Quantity is not part of the key. Names conflict only when both are set and differ;
// an unnamed stack may join a named one (the donor then keeps the name).
function canStack(a: Item, b: Item): boolean {
  if (a === b) return false;
  if (a.type !== b.type) return false;
  if (a.flavour !== b.flavour) return false;
  return a.name === '' || b.name === '' || a.name === b.name;
}

// Quantities add; the surviving stack keeps its identity and takes a name if it has none.
function mergeInto(a: Item, b: Item): boolean {
  if (!canStack(a, b)) return false;
  a.quan += b.quan;
  if (a.name === '') a.name = b.name;
  return true;
}

// A new item needs a free slot only when no existing stack accepts it.
type Fit = 'merge' | 'slot' | 'full';
function fitsPack(pack: Item[], item: Item): Fit {
  if (pack.some((p) => canStack(p, item))) return 'merge';
  return pack.length < SLOTS ? 'slot' : 'full';
}

function itemWeight(i: Item): number {
  return (i.contents ? bagWeight(i) : i.unitWeight) * i.quan;
}

function contentsWeight(items: Item[]): number {
  return items.reduce((s, i) => s + itemWeight(i), 0);
}

// Bag of holding: contents count x2 when cursed, (x+3)/4 when blessed, (x+1)/2 otherwise.
function bagWeight(bag: Item): number {
  const raw = contentsWeight(bag.contents ?? []);
  let shown = raw;
  if (bag.holding) {
    if (bag.flavour === 'cursed') shown = raw * 2;
    else if (bag.flavour === 'blessed') shown = Math.floor((raw + 3) / 4);
    else shown = Math.floor((raw + 1) / 2);
  }
  return bag.unitWeight + shown;
}

// Carry capacity: 25 x (STR+CON) + 50, at most 1000, at least 1. Wounded-leg reduction omitted.
function weightCap(str: number, con: number): number {
  return Math.max(1, Math.min(1000, 25 * (str + con) + 50));
}

// Burden tier 0..5. Excess = total - cap; tier = min(5, floor(2*excess/cap) + 1) once over cap.
function burdenTier(total: number, cap: number): number {
  const excess = total - cap;
  if (excess <= 0) return 0;
  if (cap <= 1) return 5;
  return Math.min(5, Math.floor((2 * excess) / cap) + 1);
}

// Largest count (<= count) that keeps the total under 3 x cap, the Overloaded threshold.
// Closed form of the donor's one-unit-at-a-time loop: q units fit while q * unit < room.
function liftCount(total: number, cap: number, unitWeight: number, count: number): number {
  const room = 3 * cap - total;
  if (room <= 0) return 0;
  if (unitWeight <= 0) return count;
  return Math.min(count, Math.floor((room - 1) / unitWeight));
}

// Bag of holding blast chance: at depth d, roll floor(rng * 2^min(d,7)) <= d.
// Applies to a bag of holding, or to any bag of holding inside the item.
function explodes(item: Item, depth: number, rng: () => number): boolean {
  const span = 2 ** Math.min(depth, 7);
  if (item.holding && Math.floor(rng() * span) <= depth) return true;
  return (item.contents ?? []).some((c) => explodes(c, depth + 1, rng));
}

type PutResult =
  | { ok: true; pack: Item[]; lost: boolean }
  | { ok: false; reason: string };

// Decide first (validation and the blast roll), then commit. A refused or blasted move changes nothing else.
function putInBag(pack: Item[], bag: Item, item: Item, rng: () => number): PutResult {
  if (item === bag) return { ok: false, reason: 'a bag cannot go in itself' };
  if (!pack.includes(item) || !pack.includes(bag)) return { ok: false, reason: 'not carried' };
  if (bag.holding && explodes(item, 0, rng)) {
    return { ok: true, pack: pack.filter((p) => p !== item && p !== bag), lost: true };
  }
  const contents = bag.contents ?? [];
  if (!contents.some((c) => mergeInto(c, item))) contents.push(item);
  bag.contents = contents;
  return { ok: true, pack: pack.filter((p) => p !== item), lost: false };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file /tmp/NetHack-NetHack-stack.ts; local copy at /private/tmp/p2/wave2-haiku/batch3/IV005/work/NetHack-NetHack-stack.ts).

## 5. Lands in

- TARGET `src/fight/loot.ts` (proposed new module: pack stacking, pickup count, burden tiers and the move commit; the Frankendom repo was not read for this cell, so the path is a proposal).
- Parity-checklist row 18 (loot roll and XP award), sub-line for the pack: stack identity, merge-before-slot, burden tier.
- Reuse tag: rewrite-from-idea (NetHack General Public License, copyleft: clean-room, shape only)
- Brief rule served: 1 (one ledger: pack and move rules in one engine module, one validated commit per move); rules 7-9 n/a

## 6. Gaps and risks

- Copyleft licence: the sketch is clean-room. Nothing is adapted line by line.
- Donor defect 1: the item leaves the pack (pickup.c 2631) before the bag-of-holding blast roll (2665). A blast then changes the pack, and the shop bill is handled in the middle. Fix: roll and validate first, then commit once (done in the sketch).
- Donor defect 2: the pickup count recomputes weight one unit at a time, and the code comment at pickup.c 1642 calls it "Ugh". Fix: closed form (done in the sketch). Unit counts here are small, so this is a clarity fix, not a speed fix.
- Donor risk, not confirmed as a bug: bag weight is a cached field recomputed at call sites (pickup.c 2711, mkobj.c 2750). A missed call would leave a stale bag weight. The sketch derives weight on read. The donor's out_container (pickup.c 2734+) was not read, so I have not checked whether it misses a recompute.
- Reject for now: the blast destroys a bag and its contents at random. Frankendom's loot rulings need a server roll that is audited, and a random loss needs a design decision from Dom. It is not in the sketch.
- Burden and move refusal are a weight model. Frankendom has no weight model in the duel. If one is added it belongs in the engine (src/fight), not in the Pit client. The HP-gated move refusal (hack.c 2620-2624) is a separate, optional rule and was not adopted.
- Loot presentation on a phone is not covered: the donor's loot sorting and menus were not read, and they are terminal menus, not touch UI.
- Equipment slots: the worn-item rules in `in_container` (pickup.c 2581) and `merged` (878) were only partly read. The equipment half of this topic is thin.
