# veloren-veloren (crafting-gathering-repair, cell 30)

Donor: `/mnt/frankendom-donors/veloren-veloren/` (Rust `common/`, `server/`, `voxygen/` plus RON data in `assets/`) | Licence: GPL-3.0 (LICENSE header: "GNU GENERAL PUBLIC LICENSE Version 3") | Rust + RON | symbols `MAX_DURABILITY`, `stats_durability_multiplier`, `Inventory::damage_items`, `try_salvage`, `required_mine_damage`, `DepleteResources`, `craft_simple`

Checked: Read in full or in the stated range: `common/src/comp/inventory/item/mod.rs` 1462-1525 and 485-495; `common/src/comp/inventory/loadout.rs` 17, 100-130, 485-535; `common/src/comp/inventory/mod.rs` 170-185 and 1200-1245 (the slot iterator at 174-182 only partly read); `server/src/events/entity_manipulation.rs` 1226-1262, 1268-1292, 1290-1360; `server/src/events/inventory_manip.rs` 996-1025, 1060-1100; `common/src/recipe.rs` 85-175 and 305-340; `server/src/events/interaction.rs` 314-470 (the XP block and the try_reclaim_from_block loot table not read); `common/src/terrain/sprite/mod.rs` 1106-1112, 1234-1300; `server/src/rtsim/rule/deplete_resources.rs` (whole file); `common/src/comp/skillset/skills.rs` 203-217, 322-340. Camera scope: not applicable. Confidence: high on the armour-wear, repair, salvage and mining mechanisms (every number read at its line); medium on the chunk-stock rule (the code that sets `max_res` and regrows stock was not read); not read: the loot tables behind `try_reclaim_from_block`, the `RESOURCE_EXPERIENCE_MANIFEST` values, and whether any asset overrides the mining modifiers (the code sets them as constants). Recipe counts come from counting `craft_sprite` fields, not from reading every row.

## 1. Mechanism

Five linked rules. Each is its own small function; they meet at the server event handlers.

**(a) Per-piece armour wear, driven by death.** Each item with durability carries a counter `durability_lost` from 0 to 12 (`MAX_DURABILITY`). The counter goes up by one each time its owner dies while the item is equipped. The server calls `damage_items` only for entities that are not deleted on death, which means players: the NPC branch of the death handler returns `true` (deleted), the client branch returns `false` (kept). A death inside a `NoDurabilityArea` skips the call. Inside `Inventory::damage_items`, equipped items with durability each get one increment (`loadout.rs` 491-501). Items that were unequipped in the last 60 s (`UNEQUIP_TRACKING_DURATION`) get one more increment per unequip count, which stops a player from taking gear off just before dying to dodge wear (`inventory/mod.rs` 1206-1222; the slot iterator it uses was read only in part). The stat multiplier is 1.0 for 0-9 lost, then falls linearly to 0.25 at 12: 10 lost gives 0.75, 11 gives 0.50, 12 gives 0.25 (`item/mod.rs` 1471-1483). The multiplier scales the piece's stats (`armor.rs` 273).

**(b) Piece share of a set.** A set's stats are split across slots by a weight table. Shoulder 2.0, Chest 3.0, Belt 0.5, Hand 1.0, Pants 2.0, Foot 1.0, Back 0.5; Backpack, Ring, Neck, Head, Tabard and Bag have weight 0. The sum is 10.0, so a piece's share is weight / 10 (Chest 0.30, Shoulder 0.20, Pants 0.20, Hand 0.10, Foot 0.10, Belt 0.05, Back 0.05). A zero-weight slot carries no set stats (`armor.rs` 251-268). Rings have no durability at all (`armor.rs` 30-40).

**(c) Repair.** A repair is a craft event that needs a `RepairBench` sprite in reach (`inventory_manip.rs` 1075-1078). It calls `reset_durability`, which sets the counter to 0 for one slot (`item/mod.rs` 1516-1521; `inventory/mod.rs` 1226-1242 for the slot lookup). The client pseudo-recipe for repair has an empty input list (`voxygen/src/hud/crafting.rs` 570), and the server branch does not check materials, so repair costs nothing in this donor. The server checks only the sprite.

**(d) Salvage.** A `DismantlingBench` sprite is needed (`inventory_manip.rs` 1000). `try_salvage` (`recipe.rs` 311-340) reads the item's `SalvageInto(material, qty)` tags, makes `qty` copies of that material, and removes the salvaged item only if the output is not empty; otherwise it returns `NotSalvageable`. The tags are data: `cloth_blue/chest.ron` line 11 has `SalvageInto(Linen, 3)`, and 266 asset files carry a SalvageInto tag. Modular tools derive `SalvageInto(material, 1)` from their primary component (`modular.rs` 217-239).

**(e) Gathering nodes (mining).** A node is a sprite with a `mine_tool` (Pick or Shovel, `sprite/mod.rs` 1234-1256), a hardness `required_mine_damage` (2 to 6 for ores and gems; a sprite with no hardness breaks on its first valid hit, `interaction.rs` 345), and a drop interval `mine_drop_interval` (1 to 3). Each valid hit adds 1 to the block's Damage attribute (`interaction.rs` 324-326). The node breaks when damage reaches hardness (345). A partial stage happens when `damage % interval == 0` (351). On a stage or a break the server reclaims the node's items. A full break pays every item, and the tool's weapon skill gets XP from the items (the XP block is after line 345, not line-checked). A partial stage keeps each item only with a chance: `0.5 + bonus`, where the bonus is `0.1 x skill level` for items whose id contains `mineral.ore.` or `mineral.gem.` (ore_gain and gem_gain are constants of 0.1 at `skills.rs` 336), and 0.5 for everything else (`interaction.rs` 405-427). The ore skill's max level is 3 (`skill_max_levels.ron` 18), so the highest keep chance is 0.8. Drops are spawned with a loot owner for the miner and the fast ownership timeout (`interaction.rs` 436-447 region; the spawn block was read, its line numbers not captured).

**(f) Chunk resource stock (world rule).** Each chunk has resource stocks (`chunk_res`, each 0 to 1) and a maximum (`chunk_state.max_res`). On every block change, `DepleteResources` (`deplete_resources.rs` 17-45) takes away the old block's remaining fraction `1 - damage / required` from the stock (fraction 1.0 when the block has no Damage attribute or no hardness), and adds the new block's remaining fraction back. The result is clamped to 0..1. So a chunk's stock is a budget of mineable nodes, and partly mined nodes cost less budget.

**(g) Recipes as rows.** Recipes are data. `assets/common/recipe_book_manifest.ron` has 326 entries and `component_recipe_book.ron` has 252 (counted by `craft_sprite` fields). A row has an output (item id, count), inputs (item id, amount, is-component flag) and a `craft_sprite` station (`recipe.rs` 85-91). An input with amount 0 is a tool: it must be present but is not consumed (`manifest` line 30 craftsman hammer; `recipe.rs` 115-118 comment, and the `contains_any` check at 148). `craft_simple` (`recipe.rs` 95-175) claims inputs from the slots the player picks, and fails if any input is short or a required tool is missing.

## 2. Key functions

- `Item::stats_durability_multiplier`, `item/mod.rs` 1471-1483: the wear curve (threshold 9, floor 0.25, max 12).
- `Item::increment_damage`, `item/mod.rs` 1489-1497: one increment per call, capped at 12.
- `Item::reset_durability`, `item/mod.rs` 1516-1521: repair, back to 0.
- `Loadout::damage_items`, `loadout.rs` 491-501: equipped items with durability get one increment each.
- `Inventory::damage_items`, `inventory/mod.rs` 1200-1222: equipped increments, then the 60 s unequip-window rule.
- Death hook, `server/src/events/entity_manipulation.rs` 1338-1357: the `resists_durability` gate and the `damage_items` call.
- `Inventory::repair_item_at_slot`, `inventory/mod.rs` 1226-1242, and the server repair branch, `inventory_manip.rs` 1075-1081.
- `try_salvage`, `common/src/recipe.rs` 311-341.
- Mining hit, `server/src/events/interaction.rs` 318-470: damage, break, stage, keep-chance filter, XP, drop spawn.
- `required_mine_damage` and `mine_drop_interval`, `sprite/mod.rs` 1259-1300: the per-sprite tables.
- `DepleteResources` rule, `server/src/rtsim/rule/deplete_resources.rs` 17-45.
- `Recipe` and `craft_simple`, `common/src/recipe.rs` 85-175.

## 3. Numbers vs mechanism

| Quantity | Formula | Number range | file:line |
|---|---|---|---|
| Wear counter cap | `min(deaths, MAX)` | 0 to 12 | item/mod.rs:1004 |
| Wear threshold | no stat loss while lost <= 9 | 9 | item/mod.rs:1475 |
| Stat multiplier | `(1 - (lost-9)/3) x 0.75 + 0.25` past 9 | lost 0-9 = 1.00; 10 = 0.75; 11 = 0.50; 12 = 0.25 | item/mod.rs:1477-1481 |
| Wear increment | +1 per death while equipped (players, not in NoDurabilityArea) | 1 per death | loadout.rs:500; entity_manipulation.rs:1353-1356 |
| Unequip window | count only if unequipped within window | 60 s | loadout.rs:17, 529 |
| Piece share | `weight / sum(weights)` | sum 10.0; Shoulder 0.20, Chest 0.30, Belt 0.05, Hand 0.10, Pants 0.20, Foot 0.10, Back 0.05; zero for Head, Neck, Ring, Tabard, Bag, Backpack | armor.rs:251-268 |
| Repair | counter := 0; material cost | 0; no inputs | item/mod.rs:1517; crafting.rs:570 |
| Salvage yield | `qty` copies of tagged material; item removed only if qty > 0 | Linen 3 (cloth chest); 1 (modular tool) | chest.ron:11; modular.rs:239; recipe.rs:325-332 |
| Node hardness | hits to break = `required_mine_damage` | ores 6 (Gold), 4 (Iron, Coal), 3 (Copper, Tin); gems 3; VeloriteFrag 2; no value = 1 hit | sprite/mod.rs:1259-1280; interaction.rs:345 |
| Partial drop interval | drop check when `damage % interval == 0` | Gold 3, Coal 2, Iron 2, Copper 1, Tin 1 | sprite/mod.rs:1284-1300; interaction.rs:351 |
| Partial keep chance | `0.5 + 0.1 x skill level` for ore/gem; 0.5 otherwise | ore level 0-3 gives 0.50-0.80 | interaction.rs:405-427; skills.rs:336; skill_max_levels.ron:18 |
| Chunk stock step | `(res x max - remaining) / max`, clamp 0..1 | remaining in 0..1 | deplete_resources.rs:17-45 |
| Recipe row | (output, count), [(input, amount, is_component)], craft_sprite | 326 + 252 rows; amount 0 = tool | recipe_book_manifest.ron:16,27,30; recipe.rs:85-91 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for mining (damage +1, break check, stage check, then a full break pays all or a partial stage filters by chance) and the same wear curve. It omits the chunk-stock rule, the XP award, the drop spawning and loot owner, the loot table behind `try_reclaim_from_block`, the unequip-window increment, the NoDurabilityArea gate, repair and salvage, and the donor's saturating u8 damage counter. The skill level is passed in as a number instead of read from a skill tree. The ore chance is capped at 1 in the sketch; the donor passes `0.5 + bonus` unclamped (its skill cap of 3 keeps it at 0.8).

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const WEAR_MAX = 12;        // deaths-while-equipped cap
const WEAR_THRESHOLD = 9;          // no stat loss up to this many
const WEAR_FLOOR = 0.25;           // stat multiplier at WEAR_MAX

// Stat multiplier for one piece after `lost` deaths while equipped.
export function wearMultiplier(lost: number): number {
  const l = Math.min(Math.max(lost, 0), WEAR_MAX);
  const over = Math.max(0, l - WEAR_THRESHOLD);
  return (1 - over / (WEAR_MAX - WEAR_THRESHOLD)) * (1 - WEAR_FLOOR) + WEAR_FLOOR;
}

// Share of a set's stats that one piece carries, from per-slot weights.
export function pieceShare(weights: Record<string, number>, slot: string): number {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return sum === 0 ? 0 : (weights[slot] ?? 0) / sum;
}

export interface Node {
  hardness: number | null;   // hits to break; null = broken on the first valid hit
  dropInterval: number;      // partial drop every N hits
  damage: number;            // hits taken so far (kept on the zone row)
}

export interface Drop { itemId: string; }

// One valid tool hit on a node. Full break pays every drop; a partial stage
// keeps each drop with a chance (ore/gem get a skill bonus).
export function harvestHit(
  node: Node,
  isOre: (id: string) => boolean,
  oreSkillLevel: number,
  drops: Drop[],
  rng: () => number,
): { broken: boolean; kept: Drop[] } {
  node.damage += 1;
  const broken = node.hardness === null || node.damage >= node.hardness;
  const stage = node.damage % node.dropInterval === 0;
  if (broken) return { broken: true, kept: drops };
  if (!stage) return { broken: false, kept: [] };
  const oreChance = Math.min(1, 0.5 + 0.1 * oreSkillLevel);
  const kept = drops.filter(d => rng() < (isOre(d.itemId) ? oreChance : 0.5));
  return { broken: false, kept };
}

export {};
```

## 5. Lands in

- TARGET `origins/server/gather-nodes.ts` (proposed new module): the server-side harvest rule for gathering nodes stored as zone rows (hardness, drop interval, damage on the row). The wear rule would sit beside it as `src/fight/gear-wear.ts` (proposed); it is not a row-18 item and is flagged in section 6.
- PARITY ROW 18 (loot roll and XP award): the partial-stage keep roll and the full-break payout are the loot roll for gathering.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only).
- Brief rule served: 1 (one engine, zones as data); the node is a zone row and the harvest is one server rule. Rules 7-9 n/a.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch was written from the mechanism; no lines were translated.
- Node damage in the donor is an attribute on a voxel block, which is world state. Frankendom must keep it as server state on the zone row, never on the client, to stay server-verified.
- The keep chance is not clamped in the donor (`interaction.rs` 420-421). Safe there only because the ore skill tops out at 3 (`skill_max_levels.ron` 18). Frankendom must clamp, or cap its own skill levels.
- Repair costs no materials in this donor (`crafting.rs` 570; the server branch checks only the sprite). That is a gold-free repair; Frankendom must decide whether repair has a cost, since there is no economy sink in the donor for it.
- Death wear (section 1a) is a death penalty on gear. It is a row-17 question (death and respawn), not row 18. Flagged for Lead; not claimed as a row-18 landing. It also needs the gear-tier rule before it can be scored: the donor's cap of 12 and threshold of 9 are its own numbers and should be zone or engine data in Frankendom.
- The unequip-window rule (60 s) is a clever anti-dodge rule, but it was read in part (the slot iterator at `inventory/mod.rs` 174-182 only partly read). Check before porting.
- The chunk stock rule (section 1f) needs zone-level max values that the donor sets elsewhere (not read). Frankendom zones are data, so it would be a per-zone budget, not a chunk grid. Do not port the chunk grid.
- Drops: the miner gets a short loot owner window (`ONWERSHIP_TIMEOUT_FAST`, `interaction.rs` spawn block). That fits take-one loot, but the window length was not read.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine, zones as data)

Best transferable idea: a gathering node is a zone row with a hardness and a drop interval; each hit adds damage on the row, a partial stage pays a chance-filtered drop, and the full break pays all.
Decision (proposed): adapt — keep the hardness, interval and partial-stage keep roll, but keep damage on the zone row, clamp the keep chance, and drop the voxel-block storage.
Acceptance: server test on a copper node (hardness 3, interval 1): hits 1 and 2 pay only the kept subset (each drop kept at 0.5, ore at 0.5 + 0.1 x skill level); hit 3 pays every drop with the miner as loot owner.
