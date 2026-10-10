# id-Software-Quake-2 (inventory-bank-equipment, cell 3)

Donor: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_items.c` (with `game/g_combat.c`, `game/g_cmds.c`, `client/cl_inv.c`, `client/client.h`) | Licence: GNU GPL version 2 or any later version (cl_inv.c header lines 4-7; gnu.txt is GPL v2; readme.txt line 6 says the code is GPL; readme.txt line 19 says the Q2 data files remain copyrighted) = GPL-2.0-or-later, copyleft: clean-room, shape only | C | symbols `Pickup_Armor`, `CheckArmor`, `Add_Ammo`, `CL_DrawInventory`

Checked: The hint file `client/cl_inv.c` (142 lines) was read in full. It is the inventory screen (presentation only); the item rules are in `game/g_items.c`. Read: `Pickup_Armor` (607-684), `ArmorIndex` (590-605), armour tier table (39-41), `gitem_armor_t` fields (g_local.h 203-210), `Add_Ammo` (447-481), `Pickup_Ammo` (483-511), `Drop_General` (187-192), `Pickup_Bandolier` (221-257, the caps and clamps in part), `Pickup_Pack` (259-296, the caps in part), `Touch_Item` (761-786, to the selection line), `CheckArmor` (255-293), its caller (470-477), `Cmd_Inven_f`, `Cmd_InvUse_f`, `Cmd_InvDrop_f`, `SelectNextItem` (70-96 in part), `ValidateSelectedItem` (130-140). Not read: `SetRespawn` (unit not confirmed), the removal of a taken item after line 800 of g_items.c, `Drop_Item` after line 870, the max_* defaults, the renderer's scaling of the 256x240 panel. Confidence: high on the armour swap and the absorb rule (read end to end); moderate on the bag/pack rules (read in part). camera_scope: not a camera note. Hint-file caveat: the list hint points at the presentation file, not the rules. The idea is in game/g_items.c.

Best transferable idea: One equipment slot holds one armour tier and its point count; a better tier converts the held points by the protection ratio (old/new), adds the new tier's base, and caps at the new max; a worse or equal tier adds its base converted by new/old, and is refused (left on the floor) when the slot is already at the cap.
Decision (proposed): adapt — take the single-slot tier swap with refuse-when-full as Frankendom gear rules (the tier table is catalogue data); the armour-as-points absorb (1 point = 1 HP saved) conflicts with the guard/parry/stamina rows and is not proposed.
Acceptance: A server test: a player in combat armour at 100 points who takes body armour ends with body armour at 175; the same player at body armour 200 who takes a combat vest keeps 200 and the vest stays on the floor; a shard at 200 is refused (the donor would make it 202).

## 1. Mechanism

- Storage model: one counter per item type, not a slot grid. The server keeps `pers.inventory[MAX_ITEMS]` (g_cmds.c 484-489 sends all MAX_ITEMS counts when the inventory opens; cl_inv.c 33-34 reads them back). Ammo has a per-type cap in `pers.max_*` (Add_Ammo, g_items.c 455-466).
- One equipment slot for armour: `ArmorIndex` (590-605) returns the first tier held with a count above zero, in the order jacket, combat, body. Armour is the only equipment slot in this code. Tier data (g_items.c 39-41, fields in g_local.h 205-209: base_count, max_count, normal_protection, energy_protection):
  jacket base 25, max 50, normal .30, energy .00; combat base 50, max 100, normal .60, energy .30; body base 100, max 200, normal .80, energy .60.
- Order of steps in `Pickup_Armor` (607-684), as the code runs:
  (a) read the new tier (617) and the held tier (619).
  (b) Shard (622-628): if nothing is held, jacket count = 2 (625); otherwise held count += 2 (627). No cap and no refusal.
  (c) Nothing held (631-634): count of the new tier = its base.
  (d) Better tier, new normal > held normal (647): converted = held points x (old normal / new normal), truncated to int (650-651); new count = new base + converted (652), capped at the new max (653-654); the held count is zeroed (657) and the new tier gets the count (660). The slot changes tier.
  (e) Worse or equal tier (662-676): converted = new base x (new normal / old normal) (665-666); new count = held points + converted, capped at the held tier's max (667-669); if held points already >= that count, return false (672-673) and the item stays; otherwise held points = new count (676).
  (f) If the pickup was taken, deathmatch only and not a dropped item: SetRespawn(ent, 20) (680-681). Return true (683).
- Absorb (CheckArmor, g_combat.c 255-293): save = ceil(normal x damage), or energy protection for energy hits (280-282); save is capped at the points held (283-284); points -= save (289); save is returned. The caller subtracts it from the hit (476-477). So each armour point absorbs exactly one point of damage, and the protection share sets how fast the points are spent.
- Auto-select on pickup (Touch_Item 772-786): if the pickup returns true and the item has a use function, it becomes the selected item (785-786). `SelectNextItem` (70-96) walks forward from the selected item with wrap (82), skips zero counts (83-84) and items without a use (86-87), and sets selected to -1 if none is found (95).
- Ammo (`Add_Ammo` 447-481; `Pickup_Ammo` 483-511): refuse when the count equals the cap (472-473); add the count (475); clamp to the cap (477-478); return true (480). The pickup amount is the entity count, or the item quantity (492-495); with infinite ammo a weapon pickup counts as 1000 (490-491). A weapon the player did not have (oldcount 0) becomes the new weapon when the player is not in deathmatch, or when the held weapon is the blaster (502-505); ammo respawn is 30 in deathmatch (508-509).
- Bag upgrades (`Pickup_Bandolier` 221-257; `Pickup_Pack` 259-296, in part): the bandolier raises the bullet cap to at least 250 (226-227), shells 150 (228-229), cells 250, slugs 75 (230-233); it adds the bullet and shell quantities and clamps each to its cap (239-241, 248-250). The pack raises bullets to at least 300 (264-265) and shells to at least 200 (266-267), and clamps the same way (281-283, 290-292). The bandolier returns true (256) even when its bundle adds nothing above the caps; the pack's return value was not read.
- Drop (`Drop_General` 187-192): Drop_Item spawns the world entity (189), then the held count is decremented (190), then the selection is validated (191).
- Presentation (cl_inv.c `CL_DrawInventory`, 66-140): the list holds every item with a count above zero (82-91); the window is 17 rows (64), centred on the selected row (94), pulled up so it stays full at the bottom (95-96), and never above row 0 (97-98). The panel is 256 by 240 virtual pixels, centred (100-101). Each row is "binding, count, name" (117-127); the binding is found by scanning the 256 key bindings for "use <name>" (117-124). Rows other than the selected one get the high bit set (128-129). The selected row gets a blinking cursor at x-8 (130-134). The blink test is `(int)(cls.realtime*10) & 1`, and it never passes (see section 6).

## 2. Key functions

- `Pickup_Armor`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_items.c` 607-684. The whole armour swap: shard, first pickup, better tier with conversion, worse tier with refusal.
- `CheckArmor`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_combat.c` 255-293. The absorb: ceil(normal x damage), capped at the points held, spent 1:1.
- `Add_Ammo` and `Pickup_Ammo`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_items.c` 447-511. Refuse at the cap, clamp over it, respawn 30 in deathmatch.
- `CL_DrawInventory`: `/mnt/frankendom-donors/id-Software-Quake-2/client/cl_inv.c` 66-140. The scrolling list: window size 17, centred scroll, bottom clamp, count and binding columns.
- `Drop_General`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_items.c` 187-192. Spawn the world item, then decrement.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| One equip slot, one tier at a time | Tier order jacket, combat, body (g_items.c 595-602) |
| Tier data: base points, cap, protection share | jacket 25 / 50 / .30; combat 50 / 100 / .60; body 100 / 200 / .80 (g_items.c 39-41) |
| Better tier converts held points by old/new protection (truncated) | Factor old.normal / new.normal, e.g. combat to body = .6 / .8 = .75 (g_items.c 650-651) |
| Worse or equal tier adds its base converted by new/old (truncated) | Factor new.normal / old.normal, e.g. body to combat: .6 / .8 applied to base 50 = 37 (g_items.c 665-666) |
| Refuse when the slot is already at the cap | Return false when held points >= the capped sum (g_items.c 672-673) |
| Shard: a flat +2 | +2 (g_items.c 625, 627), no cap in the donor |
| Absorb: ceil(protection x damage), capped at points held | Share .30 / .60 / .80 (g_combat.c 282); 1 point per HP saved (289, 476-477) |
| Refuse at the cap for ammo | count == cap (g_items.c 472) |
| Bag upgrade raises caps | bullets 250 / 300, shells 150 / 200 (g_items.c 226-229, 264-267) |
| Respawn in deathmatch | armour 20, ammo 30 (g_items.c 681, 509); unit not confirmed (SetRespawn not read) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's branch order (shard, first pickup, better tier with conversion, worse or equal tier with refusal) and the absorb rule. It differs in four ways: it holds one tier by construction (the donor's ArmorIndex picks the first non-zero tier); it caps and refuses the shard (the donor adds 2 with no cap); it multiplies before it divides in the ratio, because in double precision 0.6 / 0.8 x 100 is 74.99999999999999 and truncates to 74, where the donor's C float gives 75 (the multiply-first form gives 75, matching the donor's worked values); and it omits the energy protection column, the damage pipeline around CheckArmor (power armour, invulnerability), the deathmatch respawn, the removal of a taken item, and the auto-select of the item on pickup.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type TierId = "jacket" | "combat" | "body";

interface ArmourTier {
  base: number;     // points granted when this tier is taken with nothing held
  max: number;      // cap on held points
  normal: number;   // share of each hit this tier absorbs (protection)
}

const TIERS: Record<TierId, ArmourTier> = {
  jacket: { base: 25, max: 50, normal: 0.3 },
  combat: { base: 50, max: 100, normal: 0.6 },
  body: { base: 100, max: 200, normal: 0.8 },
};

// One equipment slot: at most one tier is held, with a point count.
interface ArmourSlot {
  tier: TierId | null;
  points: number;
}

// Returns true when the pickup is taken. false means the item stays on the floor.
function pickupArmour(slot: ArmourSlot, item: TierId): boolean {
  const incoming = TIERS[item];
  if (slot.tier === null) {
    slot.tier = item;
    slot.points = incoming.base;
    return true;
  }
  const held = TIERS[slot.tier];
  if (incoming.normal > held.normal) {
    // Better tier: convert the held points by old/new protection, add the new base, cap at the new max.
    const converted = Math.trunc((held.normal * slot.points) / incoming.normal);
    slot.tier = item;
    slot.points = Math.min(incoming.base + converted, incoming.max);
    return true;
  }
  // Same or worse tier: convert the incoming base by new/old protection and add it to the held points.
  const added = Math.trunc((incoming.normal * incoming.base) / held.normal);
  const next = Math.min(slot.points + added, held.max);
  if (slot.points >= next) return false; // already at the cap: refuse, the item stays
  slot.points = next;
  return true;
}

// Shard: +2 points. Fix: the donor adds 2 with no cap; here the held tier's max applies and a full slot refuses.
function pickupShard(slot: ArmourSlot): boolean {
  if (slot.tier === null) {
    slot.tier = "jacket";
    slot.points = 2;
    return true;
  }
  const held = TIERS[slot.tier];
  if (slot.points >= held.max) return false;
  slot.points = Math.min(slot.points + 2, held.max);
  return true;
}

// Each hit: the slot absorbs ceil(normal x damage) points, never more than it holds.
function absorb(slot: ArmourSlot, damage: number): number {
  if (slot.tier === null || slot.points <= 0) return 0;
  let save = Math.ceil(TIERS[slot.tier].normal * damage);
  if (save >= slot.points) save = slot.points;
  slot.points -= save;
  return save;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/quake2-armour-swap.ts, with `export {}` appended): exit 0. Behaviour check (compiled with `--module commonjs`, run with node on the VPS; the check script is in the work folder): combat 100 + body gives body 175 (taken); body 150 + combat gives body 187 (taken); body 200 + combat is refused (200); body 200 + shard is refused (200); empty + jacket gives jacket 25; body 10 points with a hit of 10 saves 8 and leaves 2. All six outputs match the expectations I worked out by hand from the donor lines (g_items.c 650-652 and 665-669 for the first two); the sketch was not run against the donor itself.

## 5. Lands in

- TARGET `src/fight/armour.ts` (new module: the one equipment slot, the tier table as catalogue data, the pickup swap and the absorb step). Parity-checklist row 1 (duel step / sim): the absorb runs in the damage step. The tier fields belong to catalogue (row 21), not a second row here.
- Today: not checked (the Frankendom repo was not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only; no donor line copied)
- Brief rule served: one engine (the swap and absorb live in the engine, not in the client); one ledger (the pickup changes one count and returns taken or refused); server-verified (the pickup decision belongs to the server).

## 6. Gaps and risks

- Defect 1, blink never on: `(int)(cls.realtime*10) & 1` (cl_inv.c 132). `cls.realtime` is an int in milliseconds (client.h 207, `cls` is client_static_t, client.h 241). An int times 10 is always even, so the bit is always 0 and the selected row's cursor is never drawn. fix: `(cls.realtime / 250) & 1` (toggles every 250 ms); check it on a device, since the renderer was not read.
- Defect 2, shard uncapped: the shard adds 2 with no cap (g_items.c 625, 627), so body armour at 200 becomes 202, and a full slot still takes the shard. fix: cap at the held tier's max and refuse when full (the sketch does this).
- Ordering on drop: the world item is spawned before the held count is decremented (g_items.c 189-190). In the donor's single-threaded server that is safe. Frankendom's ledger rule wants the count change and the world item created in one step, so a failed spawn cannot leave a duplicate or a lost item.
- Design question (not a code defect): the swap keeps points x protection, not absorb capacity. Each point absorbs one HP (CheckArmor 289 and the caller 476-477), so converting combat 100 to body gives 75 + 100 base = 175 points, which absorbs more than the 100 it replaced only because of the base. Frankendom must decide which quantity to keep: the factor new/old keeps capacity instead.
- Silent loss in ammo: `Add_Ammo` clamps to the cap and the rest is discarded (477-478); the pickup is then taken (510). A full stack refuses, a part-full one takes everything and wastes the excess without a message. The `clamp-and-report` tag applies: report the overflow.
- Bags never refuse: the bandolier returns true even when it adds nothing above the caps (256). Frankendom should decide whether a bag upgrade refuses at the cap, to match armour.
- Not read: the max_* defaults, SetRespawn, the item removal after a taken pickup (g_items.c after 800), the energy protection branch beyond CheckArmor's line 280, the damage pipeline's other gates (power armour), and the renderer's scaling of the 256x240 panel. The phone rule (readability at 375 wide) is not tested by this donor.
- Presentation on a phone: the binding column is keyboard-only (cl_inv.c 117-124); a phone build has no key bindings, so the column is empty and should be replaced by a slot number. The 17-row list at 8 px per row (cl_inv.c 136) needs scale checks.
- Licence: GPL-2.0-or-later. Shape only. The sketch is written from the described rules; the tier numbers are game facts and are cited, not copied as code.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
Brief rule served: one engine (equipment and absorb in the engine); one ledger (one count changes per pickup); server-verified pickup decisions
