# PixelGuys-Cubyz (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/BlockDrop.zig` | Licence: GPL-3.0 (read: `/mnt/frankendom-donors/PixelGuys-Cubyz/LICENSE`, "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"; BlockDrop.zig has no per-file licence header) | Zig | symbol `BlockDrop.drop`

Checked: Read the whole file, src/server/BlockDrop.zig 1-138: `BlockDrop.isDroppedWhenBrokenWithItem` (17-28), `BlockDrop.drop` (30-36), the `Location` spawn helpers (38-117), `BlockDrop.Context.drop` (124-137). Also read: the loader `loadBlockDrop` (src/blocks.zig 227-272); the server break path `UpdateBlock.run` (src/sync.zig 1609-1672); the default `itemDropsOnChange` (src/rotation.zig 126-128); the pile counters and pickup `ItemDropManager.update` and `checkEntity` (src/itemdrop.zig 205-231, 372-395); `ServerWorld.dropWithCooldown` and `ServerWorld.update` (src/server/world.zig 1075-1082, 1102-1137); the player throw (src/sync.zig 1155-1170); the 20 Hz server loop (src/server/server.zig 572-573, 677-678, 768-785); collection into inventory (src/Inventory.zig 360-386). Other callers read: decay (src/callbacks/block/server/decay.zig 120-131) and support loss (src/callbacks/block/server/check_support_blocks.zig 44-53). Data read: assets/cubyz/blocks/leaves/_defaults.zig.zon 4-10, ruby_ore.zig.zon and iron_ore.zig.zon (drops `.auto`). Confidence: high on the block-break roll, the tool filter, and pile lifetime and pickup. Medium-high on pickup order: I read the user loop that calls `checkEntity` (world.zig 1131-1132) but not every caller. Not read: client drop placement and rendering, the `mods/` folder, `ItemStack.clone`, `Tag.hasTag`, `cmpxchgBlock` internals, and the mode table beyond the default hook (grep found no other `itemDropsOnChange` in src/). Camera: not applicable.

Best transferable idea: Roll each loot-table entry on its own chance, filter entries by the killing tool's tags, and let only the server roll once per confirmed kill.
Decision (proposed): adapt - Frankendom needs one server-rolled loot table per creature; take the entry shape (independent chance, all-or-nothing stack bundles, tool-tag filter) as creature data, but reject the block-change trigger, the vector launch and the first-come pickup, which fit neither server-verified kills nor an owner-based ledger.
Acceptance: A server test runs 10,000 confirmed kills of a creature whose entry has chance 0.25 and gets 0.25 +/- 0.02 drops; an entry gated on a tool tag never drops for a hit with no matching tag; only the server writes the ledger row. A player sees a loot pile at the kill spot that they can take within 1.0 unit of their box and that disappears after 900 s.

## 1. Mechanism

- Trigger. The player does not roll anything. The client sends the break as an `UpdateBlock` command carrying the hand slot, the old and new block, and a drop location (worldPos, normal, min, max) (sync.zig 1688-1691). On the server, `UpdateBlock.run` (sync.zig 1609) first checks the block with `cmpxchgBlock` (sync.zig 1635). If the block already changed, the server sends the real block to the client and returns an error, so nothing drops (1635-1642).
- Order of steps on success (sync.zig 1647-1670): (a) the hand item is captured before any cost is spent, so a tool that breaks on this hit still counts for the tag filter (1647); (b) the durability or item cost is spent (1648-1663); (c) drops run only on the server and only outside creative mode (1664); (d) `dropCtx.drop(self.dropLocation)` runs with the captured hand item (1670).
- Roll count. `itemDropsOnChange` returns 1 when the block type changed and 0 otherwise (rotation.zig 127). A same-type write therefore rolls nothing (BlockDrop.zig 125-126). The default is the only implementation in src/.
- Per roll pass, every drop entry of the old block is checked in table order (BlockDrop.zig 131-132):
  1. Tool filter (17-28). If the hand item is not a procedural tool, the entry drops only when it has no allowed-tag list (18). With a tool, any forbidden tag blocks the entry (21). If the entry has an allowed-tag list, the tool must carry one of those tags (22-24). Otherwise it passes (27).
  2. Chance. A chance of 1 drops without a draw. Otherwise one random draw must come in below the chance (31). Chance defaults to 1 when absent (blocks.zig 267).
  3. If it passes, every stack in the entry is spawned (32-33). Each entry rolls on its own, so a block can have several entries, and one entry is all-or-nothing for its stacks.
- Spawn position and launch (BlockDrop.zig 30-36 hand the stack to `ServerWorld.drop`). The position is inside the block when the new block does not collide, and on the broken face otherwise (128). The direction is the face normal with up to 0.25 random per axis (103). The vertical is remapped so that upward faces send drops up (109). The launch speed is 3.5 plus a signed random 0.5 (113), multiplied by 0.333 for downward faces (114).
- Pile lifetime and pickup cooldown. `ServerWorld.dropWithCooldown` adds each pile with a despawn counter of `updatesPerSec*900` (18,000 counts) and the given pickup cooldown (world.zig 1075-1078). Block drops pass 0 (1082). A player throw passes `updatesPerSec*2` (40 counts) and speed 20 (sync.zig 1166).
- Pile update. Each world update calls `itemDropManager.update` (world.zig 1127). That moves each pile, then decrements `pickupCooldown` and `despawnTime` by one (itemdrop.zig 223-224). A pile is removed when `despawnTime` is below 0 (225).
- Pickup. The world loops over users and calls `checkEntity` for each (world.zig 1131-1132). A pile whose cooldown is above 0 is skipped for every user (itemdrop.zig 376). Otherwise, if the largest per-axis gap between the pile point and the player's outer box is below radius 0.1 plus range 1.0 (385), the pile calls `tryCollectingToPlayerInventory` (387). That fills matching stacks first, then the first empty slot, across the user's player inventories (Inventory.zig 367-385). Any remainder stays on the pile. The pile is removed when its amount reaches 0 (itemdrop.zig 388-391), or when its despawn counter runs out.
- Server clock. The server loop targets 1/20 s per update (server.zig 573). It sleeps until the next slot and advances `lastTime` by one period (778-780). If it is behind, it logs, resets `lastTime` to now, and runs one update with no catch-up (782-785). So the pile counters move once per update call, not once per wall-clock second.

## 2. Key functions

- `BlockDrop.isDroppedWhenBrokenWithItem`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/BlockDrop.zig` 17-28. The tool filter, one entry at a time.
- `BlockDrop.drop`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/BlockDrop.zig` 30-36. The chance roll, then every stack of the entry goes to the world.
- `BlockDrop.Context.drop`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/BlockDrop.zig` 124-137. Drop count per change, then each entry through the filter and the roll.
- `loadBlockDrop`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/blocks.zig` 227-272. Zon to entries: amount default 1 (240), `auto` = block id (248), allowed tags (256-262), chance default 1 (267).
- `itemDropsOnChange` (default): `/mnt/frankendom-donors/PixelGuys-Cubyz/src/rotation.zig` 126-128.
- `UpdateBlock.run`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/sync.zig` 1609-1672. Server-only gate, captured hand item, cost, drop.
- `ItemDropManager.update`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/itemdrop.zig` 205-231. Physics, then the cooldown and despawn counters, then removal.
- `ItemDropManager.checkEntity`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/itemdrop.zig` 372-395. Cooldown gate, distance gate, collect.
- `ServerWorld.dropWithCooldown` and `ServerWorld.update`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/world.zig` 1075-1082 and 1102-1137.
- Server loop: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/server.zig` 572-573 and 768-785.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Independent roll per entry; a chance of 1 skips the draw | Default chance 1 (theirs, blocks.zig 267). Example: apple at `chance = 0.01` (theirs, assets/cubyz/blocks/leaves/_defaults.zig.zon line 8) |
| All-or-nothing stack bundle per entry | Default amount 1 (theirs, blocks.zig 240); `auto` = block id (theirs, blocks.zig 248) |
| Tool gate: allowed list must match, forbidden list blocks | Leaves: block itself only with a `cuttable` tool (theirs, leaves zon line 7); apple only when not cut with a cuttable tool (theirs, leaves zon line 8) |
| Rolls per change | 1 (theirs, rotation.zig 127) |
| Pile lifetime | 900 s = `updatesPerSec*900` = 18,000 counts at 20 per second (theirs, world.zig 1078; server.zig 572) |
| Player throw cooldown | 2 s = 40 counts (theirs, sync.zig 1166) |
| Pickup reach | radius 0.1 + range 1.0 (theirs, itemdrop.zig 49, 53, 385) |
| Launch speed | 3.5 +/- 0.5, x0.333 for downward faces (theirs, BlockDrop.zig 113-114) |
| Server step | 1/20 s per update (theirs, server.zig 573) |

## 4. TypeScript sketch

simplified: keeps the donor order (per roll pass, then per entry: tool filter, then the chance roll, then every stack of that entry) and the no-tool rule. It omits the server world call, spawn position and launch velocity, the item-name and amount parser, the creative-mode gate, the decay and support-loss callers, the pile physics, the collection into inventory and the user-order pickup loop. The per-tick counters are reduced to two numbers; the donor also moves the pile before it decrements them.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Tag = string;

interface Stack { id: string; amount: number; }

interface LootEntry {
  stacks: Stack[];            // one entry = all its stacks drop together
  chance: number;             // 0..1; 1 means always (no roll)
  allowedTags: Tag[] | null;  // null = no tool requirement
  forbiddenTags: Tag[];
}

// Tags of the killing tool, or null when the kill had no tool (bare hands, environment).
type KillTool = Tag[] | null;

function passesToolFilter(e: LootEntry, tool: KillTool): boolean {
  if (tool === null) return e.allowedTags === null;
  const have: Tag[] = tool;
  if (e.forbiddenTags.some((t) => have.includes(t))) return false;
  if (e.allowedTags !== null) {
    const want: Tag[] = e.allowedTags;
    return want.some((t) => have.includes(t));
  }
  return true;
}

// One confirmed kill = one roll pass over the table (donor: drops per event = 1).
function rollKill(table: LootEntry[], tool: KillTool, rng: () => number, rollsPerEvent = 1): Stack[] {
  const out: Stack[] = [];
  for (let n = 0; n < rollsPerEvent; n++) {
    for (const e of table) {
      if (!passesToolFilter(e, tool)) continue;
      if (e.chance === 1 || rng() < e.chance) {
        for (const s of e.stacks) out.push({ ...s });
      }
    }
  }
  return out;
}

// Ground pile: counters move once per server tick (donor: 20 ticks/s); removed when despawn drops below 0.
interface Pile { stacks: Stack[]; pickupCooldown: number; despawn: number; }
const PICKUP_RANGE = 1.0;   // donor itemdrop.zig:53
const PILE_RADIUS = 0.1;    // donor itemdrop.zig:49

function tickPile(p: Pile): boolean {
  p.pickupCooldown -= 1;
  p.despawn -= 1;
  return p.despawn >= 0;    // false = remove now
}

function canPickUp(p: Pile, gap: number): boolean {
  // gap = largest per-axis distance from the pile point to the player's box
  return p.pickupCooldown <= 0 && gap < PILE_RADIUS + PICKUP_RANGE;
}
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module, proposed): the server rolls the creature's loot table once per confirmed kill, reads the table as zone or creature data, and writes the result to the one ledger. Parity-checklist row 18 (loot roll and XP award). The ground pile (lifetime, pickup cooldown, reach) goes with it as a server-side counter.
- today: no Frankendom file was read in this pass (not read).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape not code)
- Brief rule served: server-verified kills and one ledger (only the server rolls and writes; the client never rolls); licence rule 7 (GPL-3.0, clean-room)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor lines are copied.
- The break command carries the drop location (worldPos, normal, min, max) from the client (sync.zig 1688-1691), and the server spawns drops with it (sync.zig 1670). I did not check whether the server clamps min and max. Frankendom must take spawn points from server data, never from a client message.
- No owner. Pickup is first come: the first user in the list who is in range takes the pile (world.zig 1131-1132; itemdrop.zig 376-387), and the cooldown is per pile, so it also blocks the thrower. In a many-on-one fight (MAX_ATTACKERS = 3), the nearest or first-listed player takes the loot. Frankendom needs a ruling: killer-owned loot or a share rule. The current rulings do not cover this.
- Replay (row 19). The roll uses the shared server seed (BlockDrop.zig 31 uses `main.random.nextFloat(&main.seed)`), so a fight record must store the rolled stacks, not rely on re-rolling from the seed.
- Hand item only. The tool filter reads the hand item captured before the cost (sync.zig 1647). A tool that breaks on the same hit still counts. Frankendom must pick an explicit rule, for example "the weapon that landed the killing hit".
- Loader traps. An unknown item id is skipped without an error (blocks.zig 252 `orelse continue`). The amount parser takes the first word as a number; if that fails, the amount becomes 1 and the second word becomes the item name (blocks.zig 243-244). Frankendom's zone loader must reject both.
- An empty `allowedToolTags` logs an error but is kept as an empty list, so that entry never drops (blocks.zig 257-262; BlockDrop.zig 22-24).
- Environmental callers pass no item. Tool-gated entries never drop from decay or support loss (decay.zig 125-130; check_support_blocks.zig 47-52). Frankendom should say what a no-tool kill (environment damage) yields.
- Creative mode gives no drops at all (sync.zig 1664). Sandbox or test modes must not write ledger rows.
- Counters move per update call, not per second. If the loop lags, pile lifetime stretches in real time (server.zig 778-785). Frankendom should store an absolute expiry tick, not a countdown, if it needs a real-time guarantee.
- Not read: client drop placement and rendering, the `mods/` folder, `ItemStack.clone`, `Tag.hasTag`, `cmpxchgBlock` internals, every caller of `checkEntity` (only the one in world.zig 1132 was read), and the mode table beyond the default hook.
