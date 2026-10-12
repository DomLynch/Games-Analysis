# xu4-engine-u4 (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/xu4-engine-u4/src/city.cpp` (with `maploader.cpp`, `config_boron.cpp`, `game.cpp`, `party.cpp`, `person.h`) | Licence: GPL-3.0 (COPYING in the repo root is GPL version 3; no "or any later version" grant was found in the source files read) | C++ | symbol `City::addPeople`

Checked: The hint file (`src/maploader.cpp`, 616 lines) holds the loaders. Read in full: `city.cpp` (92 lines), `city.h`, `maploader.cpp` 173-282 (ULT slot table and city loader) and 506-600 (record loader and `loadMap` dispatch), `config_boron.cpp` 405-432, `game.cpp` 421-476 (`setMap`, the `addPeople` call), `party.cpp` 969-980, `person.h` 10-54, `person.cpp` 1-60, `object.cpp` 41-53, `u4.h` 8-11. Opened and set aside: `location.h` (location and context enums only). Grep for minimap, radar, landmark, signpost, signage and road or building grammar across `src/` found nothing relevant, so this donor has no minimap or signage code. The town roster is the one real mechanism. Confidence: high on the roster loop and its order; medium on the companion filter's real effect, because the names it compares come from data that was not read. Not read: the town data files (`.ult`, `.con`, the Boron town values), `discourse.cpp` (dialogue), and `location.cpp` in full.

## 1. Mechanism

- A town is a 32 x 32 map (`u4.h` 9-10; checked by an assert at `maploader.cpp` 207-208). Its people come from a fixed slot table of up to 32 entries (`u4.h` 11).
- Binary (ULT) form: eight 32-byte columns: tile (offset 0), X (32), Y (64), previous tile (96), movement (192), dialogue (224), size 256 (`maploader.cpp` 173-181). Bytes 128-191 have no name in the enum (not read).
- Load (ULT path, `loadCityMap`): for each slot with a non-zero tile, build a `Person` from the tile (223), set its start tile from X and Y (226-229), map the movement byte to a behaviour or fail the whole load (231-232; codes 0 fixed, 1 wander, 0x80 follow the avatar, 0xFF attack the avatar, `moveBehavior` 183-191). Then match dialogue entries to slots (259-262). Then assign roles by slot id: `people[(*ri).id - 1]` (272), where a null slot is skipped (273).
- Roles come from the town's config block (`conf_initCity`, `config_boron.cpp` 418-429): each pair is a role code and a slot id. The stored role is the code plus `NPC_TALKER_COMPANION` (424), which is 4 in the enum (`person.h` 10-28). So code 1 means `NPC_VENDOR_WEAPONS` (5), up to `NPC_VENDOR_STABLE` (13). Slot id is the second number (425).
- Record form (`loadCityXu4`, compiled under `CONF_MODULE`, `maploader.cpp` 505-551): records carry X, Y, tile, movement, dialogue id and role (514-535). The role is applied only if non-zero (534-535). In a `CONF_MODULE` build, `loadMap` takes this form for a city once the module entry and its header are found (557-583, city call at 579-582); otherwise the ULT form is used (593-595). The `#else` branch at 587-590 opens the file by config name, and which branch a given build uses was read only as far as these lines.
- Each entry: `GameController::setMap` (`game.cpp` 421) sets the new map and, if it is a city, calls `addPeople()` (470-472). `City::addPeople` (`city.cpp` 54-66): clears the town (56), then for each template with a non-zero tile (61) skips a companion who has joined the party (62-63), and calls `addPerson` (64). `addPerson` (38-49) copies the template (42) and places the copy at its authored start (45) with `placeOnMap`, which sets the coordinates without a passability check (`object.cpp` 45).
- The copy's comment says the copy is deliberate: "things like angering the guards" is forgotten on the next visit (`city.cpp` 39-41).
- Order of operations per entry: clear, then for each template in order: skip-check, copy, place. Each person is placed one at a time, in roster order. No search for a free tile happens.

## 2. Key functions

- `City::addPeople`: `/mnt/frankendom-donors/xu4-engine-u4/src/city.cpp` 54-66 (clear, filter, add).
- `City::addPerson`: same file, 38-49 (copy, place at start, push to objects).
- `loadCityMap` (ULT slot table, roles, dialogue): `/mnt/frankendom-donors/xu4-engine-u4/src/maploader.cpp` 196-282. `moveBehavior`: 183-191.
- `loadCityXu4` (record form): `maploader.cpp` 506-550.
- `conf_initCity` (role block in the town config): `/mnt/frankendom-donors/xu4-engine-u4/src/config_boron.cpp` 405-432.
- `GameController::setMap` (entry hook): `/mnt/frankendom-donors/xu4-engine-u4/src/game.cpp` 421-476; the `addPeople` call is at 470-473.
- `Party::isPersonJoined` (companion filter): `/mnt/frankendom-donors/xu4-engine-u4/src/party.cpp` 969-980.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Authored roster of slots (tile, start, movement, dialogue, role); a slot with no tile is empty | 32 slots max (`u4.h` 11, a format size, not a runtime check) |
| Rebuild the population on every entry: clear, then copy each template and place it at its start | None (the copy and place steps) |
| Skip a party member who has joined, so they are not a townsperson any more | Compared by name (`party.cpp` 976), loop from index 1 (975) |
| Movement as a per-NPC mode | 0 fixed, 1 wander, 0x80 follow, 0xFF attack (`maploader.cpp` 185-188) |
| Role as a code offset from the companion type | +4 (`config_boron.cpp` 424); roles 5 to 13 are the vendors and the inn, guild and stable (`person.h` 16-24) |
| City size | 32 x 32 tiles (`u4.h` 9-10) |

## 4. TypeScript sketch

simplified: keeps the donor's order (clear, then copy and place each authored slot in roster order), the movement modes, the role names, the dialogue id and the companion skip. Omits the binary ULT reader, the record reader, the tile-to-sprite mapping, the dialogue text load, the discourse name lookup, and the object-list bookkeeping. Changes the donor in three places: the companion skip compares a character id, not a name (the donor compares names at `party.cpp` 976); the roster is checked at load for slot range, duplicates and blocked start tiles (the donor has no check on role slot ids at `maploader.cpp` 272 or on start tiles at `city.cpp` 45); and the role is a named value in the data, not a code offset (`config_boron.cpp` 424). The `export {}` line is used only for the typecheck.

```ts
// Licence: GPL-3.0 (donor COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Movement = "fixed" | "wander" | "follow_avatar" | "attack_avatar";

type Role =
  | "talker" | "beggar" | "guard" | "companion"
  | "vendor_weapons" | "vendor_armor" | "vendor_food" | "vendor_tavern"
  | "vendor_reagents" | "vendor_healer" | "vendor_inn" | "vendor_guild" | "vendor_stable"
  | "lord_british" | "hawkwind";

// One authored slot in a town's roster (zone data).
interface NpcTemplate {
  slot: number;           // 1-based slot in the roster
  tile: string;           // tile name from the town's tileset
  x: number;
  y: number;              // authored start tile
  movement: Movement;
  talkId: number | null;  // dialogue index into the town's text file
  role: Role;
  companionId?: string;   // set only on companion slots; matched against party membership by id
}

type PlacedNpc = NpcTemplate;

// Load-time checks. The donor has no check on role slot ids or on start tiles.
function validateRoster(
  roster: NpcTemplate[],
  maxNpcs: number,
  passable: (x: number, y: number) => boolean,
): string[] {
  const errors: string[] = [];
  const seen = new Set<number>();
  for (const n of roster) {
    if (n.slot < 1 || n.slot > maxNpcs) errors.push(`slot ${n.slot} out of range`);
    if (seen.has(n.slot)) errors.push(`duplicate slot ${n.slot}`);
    seen.add(n.slot);
    if (!passable(n.x, n.y)) errors.push(`slot ${n.slot} starts on a blocked tile`);
  }
  return errors;
}

// One town entry: fresh copies of the authored roster, joined companions skipped, each placed at its own start tile in order.
function populateTown(roster: NpcTemplate[], joinedCompanionIds: ReadonlySet<string>): PlacedNpc[] {
  const placed: PlacedNpc[] = [];
  for (const t of roster) {
    if (t.role === "companion" && t.companionId !== undefined && joinedCompanionIds.has(t.companionId)) continue;
    placed.push({ ...t }); // a copy: anything changed during the last visit is not kept
  }
  return placed;
}
```

## 5. Lands in

- TARGET `origins/zones/<zone>.ts` (proposed path; not checked against the Frankendom repo): a `population` block on each hub zone holding the authored roster (slot, tile, start, movement, dialogue, role, companion id). `populateTown` runs on zone entry.
- Parity row 23 (zone population). Only the population-on-entry half applies: the donor has no spawn cap, respawn or despawn logic in the code read, so those numbers are not taken from here.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (the roster is zone data); one ledger (the companion skip reads party membership by character id from the ledger, not from a name).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not a translation.
- Copy-on-entry forgets state. The donor forgets a guard's anger on the next visit, by design (`city.cpp` 39-41). Frankendom has one ledger: any hub that must remember anger, a dead vendor or a joined companion keeps it in the ledger. Only the placement half is adopted; the copy must not be the place state is reset.
- Companion filter by name (`party.cpp` 976). A discourse name that differs from the party member's name (`person.cpp` 36-46 uses the discourse name for talkers) could leave a joined companion on the map. Not tested. Fix: match by character id from the ledger.
- Role slot id has no range check (`maploader.cpp` 272). Fix: `validateRoster` rejects it at load.
- Start tile has no passability check (`city.cpp` 45 and `object.cpp` 45). Fix: `validateRoster` rejects a blocked start.
- Role codes are an offset from `NPC_TALKER_COMPANION` (`config_boron.cpp` 424). Fix: name the role in the data.
- The 32-person cap is a file-format size (`u4.h` 11). In Frankendom the cap is a data field with a default, not a format limit.
- The companion loop starts at index 1 (`party.cpp` 975). Why index 0 is skipped was not read.
- Movement `attack_avatar` (0xFF) in a town would start a fight from a townsperson. In Frankendom an engage must be a state change in the engine, and kills are server-verified, so a townsperson cannot attack outside the engine.
- The dialogue system and the real town data were not read. No town number here is verified.

Best transferable idea: Author a town's services as a fixed roster of slots (tile, start, role, dialogue) and rebuild the population from it on every entry, skipping party members who have joined.
Decision (proposed): adapt — take the authored roster and the rebuild-on-entry placement for hub services; key the companion skip by character id from the ledger; keep the anger-style state in the ledger, not in the copy.
Acceptance: Entering a test hub places exactly the authored vendor roles at their authored tiles; a companion who has joined the party is absent from the placed roster; a roster with a slot outside 1 to MAX, or a start on a blocked tile, fails zone load with an error.
