# id-Software-Quake-2 (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/id-Software-Quake-2/game/g_spawn.c | Licence: GPL-2.0 (gnu.txt) | C | symbol SpawnEntities / ED_CallSpawn (opened: ED_CallSpawn 278-312, ED_ParseEdict 414-457, SpawnEntities 520-620)

## 1. Mechanism

- At map load, `SpawnEntities` (520-620) first clamps the `skill` cvar to 0..3 (floor, then bounds) and force-sets the cvar if it changed (528-534), saves client data, frees the level memory tag, zeroes the level state and the entity array, and records the map name and spawn point (536-548).
- It then parses the map's entity text one `{ ... }` block at a time (554-603). The first block fills the world entity (`g_edicts[0]`); each later block gets a fresh entity from `G_Spawn`. `ED_ParseEdict` (414-457) reads the key-value pairs of one block; keys starting with an underscore are discarded as comments; a block with no pairs zeroes the entity.
- Right after parsing, a map hack clears the not-hard flag on one `trigger_once` with model `*27` in the map `command` (569-571).
- Each entity except the world is filtered by mode (573-600). In deathmatch an entity flagged not-deathmatch is freed and counted as inhibited. Otherwise (the coop test is commented out, 587) the skill value decides: skill 0 removes not-easy entities, skill 1 not-medium, skill 2 or 3 not-hard. The filter flags are cleared on kept entities, in either mode (599).
- `ED_CallSpawn` (278-312) is then called for each kept entity. It logs and returns for a null class name; first checks the item list (`itemlist`, `SpawnItem`), then the spawn-function table (`spawns`), calling the first name match; a name with no match is logged ("doesn't have a spawn function") and the entity is left as parsed. The spawn functions themselves (monster set-up, aggro hooks) were not read.
- After the loop: the inhibited count is logged, then `G_FindTeams` chains entities with a matching team field (470-510, read) and `PlayerTrail_Init` runs.
- Inputs: the entity text, the mode, the skill. Outputs: spawned entities with their hooks set by the spawn function.
- Tick: map load, once.

## 2. Key functions

- `SpawnEntities`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_spawn.c` lines 520-620. Resets the level, parses entity blocks, filters by mode and skill, spawns the rest, chains teams.
- `ED_CallSpawn`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_spawn.c` lines 278-312. Class-name dispatch: item list first, then the spawn-function table.
- `ED_ParseEdict`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_spawn.c` lines 414-457. Parses one `{ ... }` block into key-value fields; keys starting with an underscore are discarded as comments.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Data-driven placement: a text block becomes an entity with key-value fields | block format (theirs) |
| Per-entity difficulty flags, filtered at load by mode and difficulty | "not easy / medium / hard / deathmatch" flags (theirs) |
| Difficulty clamp to a small integer range | skill range 0 to 3 (theirs, lines 528-532) |
| Class-name dispatch to a spawn function; unknown class is logged and skipped | class table (theirs) |
| Inhibited count for the log | n/a |

## 4. TypeScript sketch

Licence: GPL-2.0. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: text parsing and the world-entity exemption (the donor never filters the first entity), clearing the filter flags after the check, the coop flag (commented out in the donor), the item-list-first dispatch (one table here), the map hack, level reset, team chaining and the cvar force-set are omitted; the sketch clamps the difficulty itself before the filter.

```ts
// Licence: GPL-2.0 (gnu.txt) (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface ZoneEntry { cls: string; fields: Record<string, string>; flags: { easy?: boolean; medium?: boolean; hard?: boolean; notDeathmatch?: boolean; }; }

// Clamp difficulty to a small integer band.
function clampDifficulty(d: number): number {
  return Math.min(Math.max(Math.floor(d), 0), 3);
}

// Load-time filter: deathmatch uses its own flag; otherwise the difficulty flags apply.
function keep(e: ZoneEntry, mode: "pve" | "deathmatch", difficulty: number): boolean {
  if (mode === "deathmatch") return !e.flags.notDeathmatch;
  if (difficulty === 0 && e.flags.easy) return false;
  if (difficulty === 1 && e.flags.medium) return false;
  if (difficulty >= 2 && e.flags.hard) return false;
  return true;
}

// Dispatch by class name: a known class gets its spawn function; an unknown one is reported and skipped.
function spawnAll(entries: ZoneEntry[], table: Record<string, (fields: Record<string, string>) => void>, mode: "pve" | "deathmatch", difficulty: number): { spawned: number; inhibited: number; unknown: string[] } {
  const d = clampDifficulty(difficulty);
  const out = { spawned: 0, inhibited: 0, unknown: [] as string[] };
  for (const e of entries) {
    if (!keep(e, mode, d)) { out.inhibited++; continue; }
    const fn = table[e.cls];
    if (!fn) { out.unknown.push(e.cls); continue; }
    fn(e.fields);
    out.spawned++;
  }
  return out;
}
```

## 5. Lands in

- TARGET origins/zones/loader.ts (the one place that reads and validates a zone's data package; `zoneProblems` is its validator) with origins/world/schema.ts (zone Params; `difficulty.levelMin / levelMax` already exist). A new `src/fight/zone-load.ts` is not needed: the zone loader and `populateZone` (origins/mobs/populate.ts) already turn data into creatures. What is genuinely new from this donor is small: per-entry mode / difficulty flags that remove an entry at load (a row field), and the "unknown class is reported, not fatal" rule, which Frankendom's loader instead makes a thrown error (`loadZone` throws on any problem). Checklist: feature map, zones as data (rule 4); row 21 for the row field.
- Parity-checklist row: 4 (zones as data).
- Reuse tag: rewrite-from-idea
- Brief rule served: zone-schema rule (every property is a data field with a default); rules 7-9 n/a

## 6. Gaps and risks

- Zones as data: the donor's text fields are strings with no declared defaults; defaults are set inside each spawn function. Frankendom's zone schema needs a declared default per field (origins/mobs/row.ts `DEFAULTS`). The loader shape transfers; the default handling is different.
- Server-verified kills: filtering by difficulty at load must be a pure function of the zone data and seed, so the server computes the same creature list (origins/mobs/populate.ts is pure and seeded); the donor reads the global `skill` cvar.
- The donor's unknown class is logged and skipped; Frankendom's loader should reject by name (as `validateMobRow` / `zoneProblems` do), so a typo cannot drop a creature silently.
- Map hacks are in the loader (569-571). Frankendom must not carry per-zone code paths: one engine, zones as data.
- Item-first dispatch lets an item class shadow a monster class of the same name; Frankendom's ids must be unique keys.
- MAX_ATTACKERS = 3 is not addressed here: placement says nothing about how many entities engage one player (src/fight/world.ts).
