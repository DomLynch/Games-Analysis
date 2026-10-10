# crawl-crawl (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-gear.cc` (spawn roll, `give_item` 2498) with `mon-poly.cc` (`monster_drop_things` 75) and `mon-act.cc` (`_handle_pickup` 3016) | Licence: GPL-2.0-or-later (`/mnt/frankendom-donors/crawl-crawl/LICENSE` lines 7-8: "either version 2 of the License, or (at your option) any later version.") | C++ | symbol `give_item`

Checked: Confidence high on the spawn-roll, death-drop and pickup-guard path (each function read in full or to its end). Medium on the exact per-type weights: only the orc weapon table total and a few gates are quoted. Not read: `make_mons_armour` (mon-gear.cc 1941), the full body of `_give_extra_equipment` past its first gate, the subtype choice inside `items()` (makeitem.cc 2100 onward), the caller of `_handle_pickup`, and what `remove_unique_annotation` does in `monster_die`. Checked 3 or more candidates: mon-gear.cc, mon-poly.cc, mon-death.cc, mon-act.cc, mon-place.cc, makeitem.cc.

## 1. Mechanism

- Loot is carried, not rolled at death. The monster's gear is rolled once at creation. The spawn code calls `give_item(mon, place.absdepth())` for dancing (animated) weapons (mon-place.cc 1214) and for monsters with starting equipment, under the condition at mon-place.cc 1239 (1242 is the call). `give_item` (mon-gear.cc 2498) rolls gold, talisman, wand, weapon, ammo, armour, shield, extra equipment and book, in that order (2502-2515).
- Tier by depth: weapons get the level as passed (`_give_weapon(mons, level_number)`, 2505). Armour and shields get `1 + level_number / 2` (2507-2508). Depth is the dungeon depth (absdepth).
- Each slot is a gate, then a weighted pick. Gates are "1 in N" rolls: plus roll `one_chance_in(spec.plusses.odds)` (mon-gear.cc 262), a goblin sling `one_chance_in(12)` (1180), and per-type extra equipment such as `one_chance_in(mon->type == MONS_CENTAUR ...)` (2386). Weighted picks use `random_choose_weighted` over a table, for example the orc weapon table (317-318) whose weights sum to 525 (the comment on 317 says so; the sum was checked by hand).
- Quality upgrade: a separate 1-in-N roll, `spec.good_chance && one_chance_in(spec.good_chance)`, sets the level to `ISPEC_GOOD_ITEM` (273-274). `makeitem.cc` checks `ISPEC_GOOD_ITEM` in its own rolls at 211, 750 and 1580 (contexts not read).
- Death: `monster_die` (mon-death.cc 2506). `drop_items` starts as `!hard_reset` (2598). If it is set, `monster_drop_things(&mons, YOU_KILL(killer) || pet_kill)` runs (3598-3605). Otherwise `mons.destroy_inventory()` runs, so hard-reset monsters lose their gear.
- `monster_drop_things` (mon-poly.cc 75): loops the inventory slots from last to first (80), so the comment on 79 says weapons and missiles land on top. For each carried item: if the monster is the "mark origins" case (you or your pet killed it), `origin_set_monster` is called (95-96). The item always gets `DROPPER_MID_KEY` = the dropper's monster id (98). It is unequipped and moved to the monster's cell (107-110). Summoned items are destroyed instead (mon-poly.cc 87-91).
- Pickup: `_handle_pickup` (mon-act.cc 3016). A monster must have itemuse at least `MONUSE_WEAPONS_ARMOUR` (3041). Neutral, friendly, charmed and hexed monsters never pick up (3046-3049). An item the player has seen blocks pickup unless the monster has `AF_STEAL` (3064-3066). The exemption is an item the monster dropped itself (3067). The arena is exempt from the guard (3058). Pickup takes at most two items a turn: after one pickup the loop breaks on a coin flip, or after the second item (3091).
- Floor loot with no monster: `items()` picks the item class by weight, total 1660 (makeitem.cc 2067-2079), of which gold is 440 (2079). On top of that, a miscellany roll `x_chance_in_y(11 + item_level, 9000)` above depth 7 (2082-2083) and a bauble roll `one_chance_in(275)` (2092-2093) can replace the class.

Tick: the death drop is synchronous inside `monster_die`, one call per kill. `_handle_pickup` is called from monster action code (caller not read; how often it runs is not checked).

## 2. Key functions

- `give_item`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-gear.cc` 2498-2513. Order of the calls and the tiers (2507-2508).
- `_give_weapon`: mon-gear.cc 1523-1557 (second-weapon recursion and the make-weapon call at 1537).
- `_apply_weapon_spec`: mon-gear.cc 247-281 (plus roll 262, good-item roll 273-274).
- `make_mons_weapon`: mon-gear.cc 304 onward (tables; the sling gate at 1180 is inside the per-type switch).
- `monster_die`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-death.cc` 2506 onward (drop decision 2598, drop call 3598-3605).
- `monster_drop_things`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-poly.cc` 75-120 (slot loop 80, dropper id 98, floor move 110).
- `_handle_pickup`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-act.cc` 3016-3095 (guard 3041-3067, pickup cap 3091).
- `items` class table: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/makeitem.cc` 2059-2079.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Gear rolled once at creation from depth | Armour/shield tier `1 + depth/2` (mon-gear.cc 2507); weapon tier = depth (2505) |
| Slot gate: roll 1 in N, then weighted pick | Sling 1 in 12 (1180); plus roll 1 in odds (262); centaur barding 1 in 1000 (2386, first case) |
| Quality upgrade: separate 1-in-N roll | `good_chance` per weapon spec (273); `ISPEC_GOOD_ITEM` level |
| Weighted table with a total | Orc weapon weights sum to 525 (317-318) |
| Drop everything, last slot first, weapons on top | Loop 80; comment 79 |
| Death drop only if not hard-reset | `drop_items = !hard_reset` (2598) |
| Ownership tag only for player kills | `YOU_KILL(killer) || pet_kill` (3605); tag set in 95-96 |
| Pickup guard: seen items blocked unless stealer or self-dropped | Guard 3065-3067; cap 3091 (coin flip after one) |
| Floor class table by weight | Total 1660; gold 440 (makeitem.cc 2067-2079) |

Caveat on the table: the constants are the donor's (theirs). The mechanism is the shape. Quoted gates are the ones I read; the other per-type gates are not quoted.

## 4. TypeScript sketch

simplified: the sketch takes its slot list in one order (the donor's `give_item` order is gold, talisman, wand, weapon, ammo, armour, shield, extra, book). It omits the per-slot special cases (unique items, Maurice's gold, the second weapon, the shield-only-if-no-two-hander rule, barding, the sling gate), the arena exception, the Gozag penance glint, the summoned-item destruction, clearing `DROPPER_MID_KEY` on pickup, and the "pick at most two" cap. The donor's pickup returns out of the whole stack walk on the first blocked item; the sketch checks one item. The good-item roll is applied to every carried item here, while the donor rolls it per weapon spec. The sketch's `good` flag stands in for the donor's `ISPEC_GOOD_ITEM` level.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rand = () => number;

interface LootEntry { item: string; weight: number; minTier: number; } // item "" = no drop
interface SlotRoll { slot: string; table: LootEntry[]; oneInN: number; } // oneInN 1 = always rolled
interface CreatureLoot { slots: SlotRoll[]; goodOneInN: number; }       // 1-in-N quality upgrade

interface Carried {
  slot: string;
  item: string;
  good: boolean;
  droppedBy?: number;    // dropper id, set on death
  originPlayer?: boolean; // true only when the player (or pet) made the kill
}

function oneIn(n: number, rand: Rand): boolean {
  return n <= 1 || Math.floor(rand() * n) === 0;
}

function pickWeighted(table: LootEntry[], tier: number, rand: Rand): string | null {
  const eligible = table.filter(e => e.minTier <= tier && e.weight > 0);
  const total = eligible.reduce((s, e) => s + e.weight, 0);
  if (total === 0) return null;
  let r = rand() * total;
  for (const e of eligible) {
    r -= e.weight;
    if (r < 0) return e.item || null;
  }
  return null;
}

// Spawn: rolled once when the creature is created. Tier comes from depth.
function rollSpawnLoot(spec: CreatureLoot, depth: number, rand: Rand): Carried[] {
  const tier = 1 + Math.floor(depth / 2);
  const carried: Carried[] = [];
  for (const s of spec.slots) {
    if (!oneIn(s.oneInN, rand)) continue;
    const item = pickWeighted(s.table, tier, rand);
    if (item === null) continue;
    carried.push({ slot: s.slot, item, good: oneIn(spec.goodOneInN, rand) });
  }
  return carried;
}

// Death: everything carried falls to the floor in the order given (weapons last, so they land on top).
// Hard-reset monsters lose their gear. Killer origin is set only when the player made the kill.
function dropOnDeath(carried: Carried[], dropperId: number, playerKill: boolean, hardReset: boolean): Carried[] {
  if (hardReset) return [];
  return carried.map(c => ({ ...c, droppedBy: dropperId, originPlayer: playerKill }));
}

// Pickup for a monster standing on a floor item.
// Blocked when the monster is neutral/friendly, or the player has seen the item and the monster cannot steal,
// unless this monster dropped the item itself.
function mayPickUp(
  item: Carried & { seenByPlayer: boolean },
  monsterId: number,
  hostile: boolean,
  canSteal: boolean,
): boolean {
  const blocked = (!hostile || (item.seenByPlayer && !canSteal));
  return !blocked || item.droppedBy === monsterId;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module): the spawn roll (per-creature tables as zone data, a depth tier, gated weighted picks) and the death drop (carried items to the floor, dropper id, player-kill origin flag). The ledger write happens only from the server-verified kill.
- Parity-checklist row 18 (loot roll and XP award). Server-tick sub-line not used here.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (tables are data, not constants in the function) and one ledger (the item is recorded once, at the server-verified kill)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Rolls at spawn are per creature instance. Frankendom must make the roll on the server at spawn (or at zone load), store the result, and write the ledger only on a server-verified kill. A client-side roll would break the rule that kills are server-verified.
- The donor's origin tag (`origin_set_monster`, 95-96) records who made the kill, for item history. The code read here does not use it to lock the item to the killer. Frankendom should not copy it as a lock; the ledger is the owner.
- The donor's pickup AI (monsters picking up floor items, mon-act.cc 3016-3095) has no Frankendom counterpart in the fight. Do not port it. Only the "dropped by this monster" tag is worth keeping if zones ever let creatures pick up loot.
- The donor's gold and talisman special cases are named-monster rules (Lodul, Maurice, `_talisman_for` at mon-gear.cc 110-142, `_give_gold` 2453-2465). Frankendom should express these as zone-data entries, not as per-name branches.
- Per-type numbers (sling 1 in 12, plus roll, barding 1 in 1000, orc table weights) are the donor's. Do not copy them as numbers; the design shape is the transferable part.
- Not read, so not claimed: `make_mons_armour` (1941), the subtype logic inside `items()` (makeitem.cc 2100 onward), the caller of `_handle_pickup`, and the item-generation path behind `ISPEC_GOOD_ITEM`. An RNG subgenerator is used in `make_mons_weapon` (mon-gear.cc 306, `rng::subgenerator item_rng;`); I did not trace how it seeds the rolls, which matters for deterministic replay (row 19).
- The donor is single-player roguelike loot. Multi-player loot ownership, zone-wide spawn caps and respawn are not in this mechanism; those are row 23 concerns and are not claimed here.
- Best transferable idea: roll a creature's carried loot once at spawn from its own weighted table (tier from zone depth, 1-in-N gates), then drop everything it carries at its death and let only the server-verified killer's ledger take it.
