# luanti-org-luanti (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/luanti-org-luanti/builtin/game/item.lua | Licence: LGPL | Lua | symbol core.item_drop / core.item_pickup / core.handle_node_drops

Symbol check: `core.item_drop` at 360-381, `core.item_pickup` at 383-399, `core.handle_node_drops` at 462-488 and `core.get_node_drops` at 41-133 (read as the drop source) all land as named. The input cell says C++; the file is Lua.

## 1. Mechanism

- `core.get_node_drops` (41-133) turns a dug node into a list of item strings. With no `drop` field the node drops itself (55-62); a string `drop` gives that item or nothing if empty (63-65); a table without `items` gives nothing (66-69). An extended table (71-132) walks `drop.items` in order: each entry has an optional `rarity` (a 1-in-N `math.random` roll, 78), optional `tools` / `tool_groups` filters against the digging tool (80-115), and the walk stops at `drop.max_items` hits (127-129). A colored node carries its palette index as item metadata (default drop 57-61, or per entry with `inherit_color` 120-124).
- `core.handle_node_drops` (462-488) is the dig step. Each drop goes first into the digger's main inventory through `add_item`. Whatever does not fit comes back as a remainder and is spawned as a world item at the node position, with a random offset of up to a quarter of a block on each axis. A digger without an inventory gets every drop as a world item.
- `core.item_drop` (360-381): spawns a world item with `core.add_item` at a copy of the position, raised 1.2 blocks only when the dropper is a player (361-366). If the spawn worked, the stack is cleared (368); for a player it also gets a throw velocity from the look direction (x and z scaled by 2.9, y scaled by 2.9 plus 2, 370-374) and records the dropper name (375). Returns the cleared stack and the object. If the spawn fails nothing is cleared and the function returns nothing (379-380).
- `core.item_pickup` (383-399): global pickup callbacks (`registered_on_item_pickups`) run first; the first callback that returns a truthy result takes the pickup and that result is returned as an ItemStack (386-391). Otherwise the item is added to the picker's `main` inventory and the remainder is returned (394-397); with no inventory the whole stack is returned (398).
- Inputs: node, drops, digger, picker. Outputs: inventory adds, world items, remainders.
- Tick: on dig, on drop, on pickup. There is no per-tick work in these functions.

## 2. Key functions

- `core.handle_node_drops`: `/mnt/frankendom-donors/luanti-org-luanti/builtin/game/item.lua` lines 462-488. Drops into the digger's inventory first; remainder spills as a world item with jitter.
- `core.item_drop`: `/mnt/frankendom-donors/luanti-org-luanti/builtin/game/item.lua` lines 360-381. Player drop: world item with throw velocity and dropper record.
- `core.item_pickup`: `/mnt/frankendom-donors/luanti-org-luanti/builtin/game/item.lua` lines 383-399. Pickup callbacks first, then the inventory add.
- `core.get_node_drops`: `/mnt/frankendom-donors/luanti-org-luanti/builtin/game/item.lua` lines 41-133. Drop source from the node definition, with palette metadata.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Drop goes into the actor's inventory first; only the remainder becomes a world item | main inventory list name (theirs) |
| Spill position: random offset per axis around the source | 0.25 block half-range (theirs) |
| Throw: velocity from look direction, scaled, with an upward lift | scale 2.9, lift 2, drop height 1.2 (theirs) |
| Pickup as a chain of callbacks; the first that takes it wins | callback list (theirs) |
| Drop table per source, default is the source itself | node drop field (theirs, data) |

## 4. TypeScript sketch

simplified: the drop-table step (`get_node_drops`: rarity roll, tool filters, `max_items`, palette metadata) is not sketched, drops come in as a list; `playerDrop` returns a plan and does not clear the stack or handle the spawn-failure branch (379-380) or the non-player case (no lift, no velocity); there is no `dropped_by` record; the pickup chain returns the first callback's result as-is (donor wraps it in an ItemStack).

```ts
// Licence: LGPL (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Inv { add(item: string): string | null; }   // returns the remainder, or null if all fit
interface World { spawn(pos: { x: number; y: number; z: number }, item: string): void; }

// Dig: each drop goes to the digger first; only what does not fit is spawned in the world.
function handleDrops(pos: { x: number; y: number; z: number }, drops: string[], digger: Inv | null, world: World, rand: () => number): void {
  for (const d of drops) {
    const left = digger ? digger.add(d) : d;
    if (left === null) continue;
    const jitter = () => (rand() - 0.5) * 0.5;         // +/- a quarter of a block per axis
    world.spawn({ x: pos.x + jitter(), y: pos.y + jitter(), z: pos.z + jitter() }, left);
  }
}

// Pickup: callbacks run in order; the first that takes the item decides; otherwise add to inventory.
function pickup(item: string, callbacks: ((i: string) => string | null)[], inv: Inv): string | null {
  for (const cb of callbacks) {
    const taken = cb(item);
    if (taken !== null) return taken;
  }
  return inv.add(item);
}

// Player drop: a world item 1.2 above the spot, with a throw velocity from the look direction.
function playerDrop(look: { x: number; y: number; z: number }, pos: { x: number; y: number; z: number }, item: string): { at: { x: number; y: number; z: number }; vel: { x: number; y: number; z: number }; item: string } {
  return {
    at: { x: pos.x, y: pos.y + 1.2, z: pos.z },
    vel: { x: look.x * 2.9, y: look.y * 2.9 + 2, z: look.z * 2.9 },
    item,
  };
}
```

## 5. Lands in

- Target: `src/fight/loot.ts` (new) for the drop step, and the one-ledger rule for the inventory add. Checklist: row 18 (loot roll and XP award; the drop step). Feature-map: loot and inventory.
- today: no flat src/ module for this shape is named in the checklist. Row 18 names the existing sources it unifies, Pit loot/career and Zone `hunt.ts` / mob-rewards, with post-K item 3 (server tick unifies, Pit moves to server rewards); the new `src/fight/loot.ts` serves that item.
- Reuse tag: rewrite-from-idea
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks

- The spill is a world item. That is a second ledger: a dropped stack lives on the ground, outside any inventory, and can be picked up by any player. Under the one-ledger rule, a kill drop should not be a world object with its own state. Lead to decide.
- The pickup callback chain lets any mod take the item. Frankendom needs a single server path for a pickup, with the server as the only decider.
- Dig drops are per node. A kill has no node; the donor's drop-table idea transfers, the spill does not.
- The player drop returns a position and a velocity for the caller to apply; the donor sets the velocity on the spawned entity. The entity physics are out of scope.
- LGPL: clean-room only in Frankendom, as written here.
