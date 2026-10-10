# alexbatalov-fallout1-ce (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/item.cc` (`item_drop_all` 441-504) with `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/map.cc` (`map_age_dead_critters` 1108-1221) | Licence: Sustainable Use License 1.0 (`LICENSE.md`, "Version 1.0"; limits use and distribution to internal business, non-commercial or personal use, so it is not an open-source licence: clean-room, shape only) | C | symbol `item_drop_all`, `map_age_dead_critters`

Checked: Read `item_drop_all` (441-504) in full, `item_remove_mult` (309-349, partial-stack path read to line 349, the `obj_copy` call not traced) and `item_compact` (373-381), `map_age_dead_critters` (1108-1221) in full, `map_load_in_game` (1084-1105), `show_death` (399-426), `action_loot_container` (1190-1220), `loot_container` (3607-3660, not read to its end), `obj_erase_object` (1962-1990, not read to its end), `scripts.h` 18, `object_types.h` 94. Candidates grepped and opened: `item.cc`, `map.cc`, `actions.cc`, `inventry.cc`, `object.cc`, `inventry.h` (the hint file: a header with the loot window enum and the `loot_container` declaration, not the mechanism). Repo-wide grep: `item_drop_all` has two callers (`actions.cc` 419, `map.cc` 1185); `CRITTER_NO_DROP` has no reader in `src/`. Confidence: high on the ageing condition, the unreachable 14-day branch and the order of the drop; medium-high on the two `item_drop_all` defects in section 1, which I traced by hand and did not run.

Best transferable idea: A dead body keeps its loot until it is looted, and a zone left unvisited for a fixed time releases every dead non-robot body's loot to the ground in one server pass and removes the body.

## 1. Mechanism

- As far as traced, death does not drop loot. `show_death` (actions.cc 399-426) calls `item_drop_all` only inside the branch for the electrified and exploded "to nothing" animations (417-419). For the ordinary death animations the inventory stays on the corpse (reading of `show_death`; the other death paths were not traced).
- Corpse loot (ownership moves on request): the player walks to the corpse; `action_loot_container` (1190-1218) queues the move and then `scripts_request_loot_container`, which calls `loot_container` (inventry.cc 3607). Before the native loot runs, unless the loot is a steal, the object's script gets `SCRIPT_PROC_PICKUP` (3644), and if the script sets `scriptOverrides` the native loot is skipped (3648-3650).
- Drop-all (`item_drop_all`, 441-504), order of steps: (a) money first (451-463): the whole money stack is removed, connected to the tile as one object, and its `charges` is set to the quantity (463); (b) every other item: an equipped item sets a flag, and a worn item has its AC bonus removed (465-476); (c) each non-money stack is removed one unit at a time and connected to the tile (479-495); if a connect fails, the unit goes back to the critter or is destroyed and the function returns -1 (484-490); (d) if anything was equipped, the corpse's frame is rebuilt (497).
- Ageing on re-entry (`map_age_dead_critters`, 1108-1221), called from `map_load_in_game` only when game time has moved on (1093-1098): `hoursSinceLastVisit` is game time since the last visit divided by ticks per hour (1114; `GAME_TIME_TICKS_PER_HOUR` = 60 * 60 * 10 = 36000, scripts.h 18). If the value is 0, return (1115). If more than 6 * 24 = 144 hours, `agingType = 1` (1134-1135). The 14-day test (1136-1137) is never reached; anything else returns 0 (1139).
- The `agingType = 2` branch (14 days, misc object pid 0x500000B, 1164) is unreachable: the 6-day test comes first and catches every value above 144 hours, including those above 336.
- Per dead body (1150-1151): every critter that is not the player and is dead, and is not a robot kill type, goes on the list. Then for each: if the pid is not 16777265, 213 or 214, the blood pid is 0x5000004 and `item_drop_all` runs (1183-1185); for those three pids the drop is skipped and the blood pid is 213. The blood object is moved to the corpse tile with a random frame: `roll_random(0, 3)`, plus 6 for one proto flag, else plus 3 unless the kill type is rat or mantis (1196-1210, partly read). Then the corpse is removed from the map list (`obj_erase_object`, 1215).
- No drop tables exist in the C. The only rolls on this path choose the blood frame (1201), not any item. Per-item chances, if any, would live in game scripts that are not in the donor (not read).
- Two defects in `item_drop_all`, traced by hand (not run). (i) The inner loop bound is `inventoryItem->quantity` (479), and it is re-read after each unit is removed, so a stack of n units drops ceil(n/2) and keeps floor(n/2): a stack of 2 drops 1; a stack of 4 drops 2; a stack of 3 drops 2. Trace for n = 2: index 0 (0 < 2) removes one unit (quantity becomes 1); index 1 (1 < 1 is false) exits. (ii) When a single-unit stack is removed, `item_compact` (340, 373-381) shifts the next item into its slot, and the outer loop's `index++` steps past that item. So the item after an emptied single-unit stack is not dropped; if the next stack has two or more units, the inner loop's next pass calls `item_remove_mult` on the removed item and the function returns -1 (480-482).
- The return value of `item_drop_all` is ignored at both call sites (`actions.cc` 419, `map.cc` 1185), and the corpse is erased right after (`map.cc` 1215). Leftover units are therefore no longer on the map after ageing (inference from `obj_erase_object` 1962-: it removes the corpse from the object list; I did not trace whether the detached object is freed).
- Tick: no per-frame loop. Ageing runs once, at map load. Drops are event-driven (death animation end, map re-entry).

## 2. Key functions

- `item_drop_all`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/item.cc` 441-504. Money as one object, units one at a time, worn gear unequipped, frame refresh. Both defects are in the loop at 479-495.
- `item_remove_mult` and `item_compact`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/item.cc` 309-340 and 373-381. Remove one unit; a stack that reaches zero is compacted out of the array.
- `map_age_dead_critters`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/map.cc` 1108-1221. Ageing tiers (1134-1139), dead-body scan (1149-1164), drop and blood (1183-1210), erase (1215).
- `map_load_in_game` (the one caller of the ageing): `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/map.cc` 1093-1098.
- `loot_container` (player loot path, script hook first): `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/inventry.cc` 3607-3650.
- `show_death` (drops only for the "to nothing" animations): `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/actions.cc` 399-426.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Death keeps the loot on the body; the body is the container | None (mechanism, actions.cc 417-419 for the exception) |
| Visit-based catch-up: on re-entry after a long absence, dead bodies release their loot to the ground in one pass and are removed | Threshold 6 * 24 = 144 hours (theirs, map.cc 1134); ticks per hour 36000 (theirs, scripts.h 18) |
| Money is one stack with a count stored in `charges` | `charges` field used as the count (theirs, item.cc 463) |
| Blood or gore as a cosmetic child of the body | Pid 0x5000004 (theirs, map.cc 1184); random frame 0-3 plus 3 or 6 (theirs, map.cc 1201-1210) |
| Three special body pids keep their loot and use another blood pid | Pids 16777265, 213, 214 (theirs, map.cc 1183) |

## 4. TypeScript sketch

simplified: the sketch is the intended behaviour, not the donor's loop. It drops every unit of every stack (the donor drops ceil(n/2) and skips the item after an emptied single-unit stack, section 1), so do not read the drop count as a claim about the donor. It keeps the donor's 6-day gate and the rule that robot and player bodies are never aged. It omits the blood child, the worn-gear AC removal and frame rebuild, the money-as-count-in-charges encoding (money would be a stack like any other), the script hook that can refuse loot, the special pids, and the 14-day tier, which the donor never reaches.

```ts
// Licence: Sustainable Use License 1.0 (donor). Clean-room: written from the described mechanism, not translated.
interface Stack { id: string; units: number; }
interface Body { tile: string; dead: boolean; robot: boolean; player: boolean; stacks: Stack[]; }

// Donor: a map unvisited for more than 6 days (144 h) ages its dead bodies (map.cc 1134).
const AGE_AFTER_HOURS = 6 * 24;

// A death leaves the inventory on the corpse; nothing drops at the moment of death (sketch of the donor's show_death rule).
function onDeath(body: Body): void {
  body.dead = true;
}

// On re-entry, every dead non-robot, non-player body drops ALL its units on its tile and leaves the world.
// Donor intent per map.cc 1150-1215; the donor drops only ceil(n/2) units per stack and skips the next stack (see note section 1).
function ageBodies(world: Body[], hoursSinceVisit: number): { ground: Map<string, Stack[]>; kept: Body[] } {
  const ground = new Map<string, Stack[]>();
  const kept: Body[] = [];
  if (hoursSinceVisit <= 0 || hoursSinceVisit <= AGE_AFTER_HOURS) {
    return { ground, kept: world.slice() };
  }
  for (const b of world) {
    if (!b.dead || b.robot || b.player) {
      kept.push(b);
      continue;
    }
    const pile = ground.get(b.tile) ?? [];
    for (const s of b.stacks) pile.push({ id: s.id, units: s.units });
    ground.set(b.tile, pile);
  }
  return { ground, kept };
}
export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new, proposed; not checked against the Frankendom repo): death keeps loot on the body, and the server writes the loot transfer (drop, loot, ownership) as one ledger entry after a verified kill.
- Parity row: 18 (loot roll and XP award). The corpse-ageing rule, if it lands as a zone rule, cites row 23 in `origins/server/world-spawns.ts` (not checked against the repo).
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0 is not an open-source licence; clean-room, shape only)
- Brief rule served: 1 (one engine, server-verified kills, one ledger); zones as data for the 144-hour threshold

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 restricts use and distribution to internal business, non-commercial or personal use. Clean-room only; no line-by-line translation.
- No drop tables or chance rolls exist in the donor's C. Frankendom's loot tables (rolls, weights, rarity) are not covered by this donor and need their own design, with rolls on the server RNG and written to the fight record (row 19).
- Defect (i): `item_drop_all` drops ceil(n/2) of a stack of n (479-480 with the quantity re-read). Defect (ii): the item after an emptied single-unit stack is skipped (340, 373-381, outer loop). Do not port either. Frankendom needs a test: stack of 4, single, stack of 2 all drop, with the ledger showing every unit.
- The return value of `item_drop_all` is ignored at 419 and 1185, and the corpse is erased at 1215. Frankendom must check the drop result and must not erase a body whose loot is not on the ground or in the ledger.
- Ageing is an offline catch-up at map load (map.cc 1093-1098). It is zone-level despawn: the donor's rule (dead bodies removed after 6 days away) maps to row 23 (despawn with a grace timer, zone data).
- The 14-day tier (1136, 1164) is unreachable (the 6-day test first). Do not port it as written.
- Magic pids (16777265, 213, 214 at 1183) and the blood pid 0x5000004 (1184) are donor literals. Frankendom expresses the "keep loot" exception as a zone or body data flag, and blood is client art (row 8), not server state.
- Ownership: `loot_container` lets the object's script refuse the loot (3648-3650) and skips the hook for steals (3641). Frankendom must not let a client script change who owns loot; the server decides and writes.
- `CRITTER_NO_DROP` (object_types.h 94) has no reader in `src/` (grep). Do not treat it as a working feature.
- Not read: `loot_container` past 3660, `obj_erase_object` past its first branch, `obj_copy` and `obj_connect`, the partial-stack path of `item_remove_mult` past line 349, the other death paths.
