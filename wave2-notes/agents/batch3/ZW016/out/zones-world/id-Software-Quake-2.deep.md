# id-Software-Quake-2 (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/id-Software-Quake-2/server/sv_ccmds.c` (save on exit, `SV_GameMap_f`), with `server/sv_init.c` (restore on entry, `SV_SpawnServer`, `SV_CheckForSavegame`) and the game side `ctf/g_save.c` (`WriteLevel`, `ReadLevel`) | Licence: GPL-2.0-or-later (`server/sv_world.c` header: "either version 2 of the License, or (at your option) any later version"; the root `gnu.txt` is GPL v2; the `ctf/` and `game/` trees are the game DLL source) | C | symbol `SV_GameMap_f`, `SV_CheckForSavegame`, `WriteLevel`, `ReadLevel`

Checked: The hint file `server/sv_world.c` is the world query and collision file (its header says "world query functions"); it is not the zone mechanism and was used only to read the licence header. The zone persistence was found by grep for `WriteLevel`, `ReadLevel` and `SpawnEntities`, then read in `server/sv_ccmds.c` (270-330, 488-560, 670-700), `server/sv_init.c` (110-175, 236-275), `ctf/g_save.c` (531-740), `ctf/g_target.c` (280-302, 440-500) and `ctf/g_main.c` (205-235, 333-352). Confidence: high on the save and restore order, the settle loop and the numbers. Medium on the client side: the client's own load and reconnect handling was not read (`client/` not read). Not read: `WriteEdict` body (`ctf/g_save.c` 499-530), `SV_Map` body, `SpawnEntities` skill filter in `ctf/g_spawn.c` (grep only, 534-620 not read), and the `game/` copy of `g_save.c` (not compared line by line). Camera: not applicable (zones-world).

## 1. Mechanism

Save on leaving a zone (`SV_GameMap_f`, `server/sv_ccmds.c` 488-547):

1. The `gamemap` command is issued by `ExitLevel` (`ctf/g_main.c` 333-346), which queues `gamemap "<next map>"`.
2. If the map name starts with `*`, every saved file in `save/current` is wiped (507-511). A `*` name starts a new unit.
3. If the server is in game state (514), every client's `inuse` flag is saved as false (516-523), so the clients are not written into the zone as bodies. The comment at 516-518 says the clients will then spawn at spawn points on re-entry.
4. `SV_WriteLevelFile` (278-298) writes the configstrings and portal state to `<map>.sv2` (292-293), then calls the game's `WriteLevel` to write `<map>.sav` (296-297).
5. `WriteLevel` (`ctf/g_save.c` 605-640) writes the edict size and a function-pointer base as checks (617-622), the level locals (625), then every in-use entity with its index (628-635). It ends the list with -1 (636-637).
6. The client `inuse` flags are restored (529-530). The next map starts with `SV_Map` (536).

Restore on entering a zone (`SV_SpawnServer` and `SV_CheckForSavegame`, `server/sv_init.c` 117-157 and 169-274):

7. `SV_SpawnServer` calls the game's `SpawnEntities` first (260). This builds the zone's own baseline so the baselines match the saved run (comment at `ctf/g_save.c` 647-651).
8. `SV_CheckForSavegame` (117) does nothing if `sv_noreload` is set (123-124), or if the server is deathmatch (126-127), or if the `save/current/<map>.sav` file is missing (129-132). Otherwise it reads the `.sv2` file (139) and then calls the game's `ReadLevel` (`server/sv_ccmds.c` 325).
9. `ReadLevel` (`ctf/g_save.c` 659-740) frees the level's dynamic memory (673), wipes all edicts (676), checks the edict size and function-pointer base (680-693), reads the level locals (696), then reads each saved entity and rebuilds its world links (699-717).
10. After the read, every client is marked unconnected (721-727). Entities whose classname is `target_crosslevel_target` get `nextthink = level.time + delay` (737-740).
11. If this was not a savegame load (`!sv.loadgame`, `sv_init.c` 141), the server runs 100 game frames in the loading state (152-153) with the state set to loading (151) so that lightstyle and other messages are not sent (145-155). At `FRAMETIME` 0.1 s this is about 10 s of hidden simulation (comment at 143: "run it for ten seconds").

Units: a map name containing `*` set through a `target_changelevel` clears the cross-level flag bits (`ctf/g_target.c` 296-297). The same `*` rule for the save wipe is the first character check at step 2 (`sv_ccmds.c` 507). The two checks are not the same test (see section 6).

Cross-level flags (secondary, not the main mechanism here): a `target_crosslevel_trigger` ORs its spawn flags into `game.serverflags` when used (`ctf/g_target.c` 451-455). A `target_crosslevel_target` schedules one think after its delay (478-486). When that think runs, it fires its targets and frees itself only if all of its own bits are set in `game.serverflags` (469-476). If not, nothing else is scheduled.

## 2. Key functions

- `SV_GameMap_f`: `/mnt/frankendom-donors/id-Software-Quake-2/server/sv_ccmds.c` 488-547. Save the exited zone, wipe on unit change, start the next map.
- `SV_WriteLevelFile` and `SV_ReadLevelFile`: `/mnt/frankendom-donors/id-Software-Quake-2/server/sv_ccmds.c` 278-326. The file pair per zone.
- `SV_CheckForSavegame`: `/mnt/frankendom-donors/id-Software-Quake-2/server/sv_init.c` 117-157. The restore gate and the settle loop.
- `SV_SpawnServer`: `/mnt/frankendom-donors/id-Software-Quake-2/server/sv_init.c` 169-275. Spawn baseline (260), then restore check (274).
- `WriteLevel` and `ReadLevel`: `/mnt/frankendom-donors/id-Software-Quake-2/ctf/g_save.c` 605-740. The entity dump and load.
- `target_crosslevel_target_think`: `/mnt/frankendom-donors/id-Software-Quake-2/ctf/g_target.c` 469-476. The one-shot bit check.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Save only the entities that are alive in the zone (`inuse`) | `WriteLevel` loop 628-635 |
| Clients are not saved as bodies: their flags are cleared during the save and restored after | Mechanism (516-530) |
| Build the zone baseline first, then overlay the saved state | Mechanism (260 then 274) |
| Deathmatch zones skip the overlay and respawn fresh | Deathmatch check at 126-127 |
| Settle run before players are admitted, run with the state set to loading | 100 frames (152) at 0.1 s FRAMETIME (`ctf/g_local.h` line 76; the value is read from the define line, which has tabs, so it is not quoted) |
| Cross-level bits: 8 bits, mask 0xff | `SFL_CROSS_TRIGGER_MASK` define at `ctf/g_local.h` line 179 (the value is on the same line, not in the quote) |
| A new unit (`*` name) drops all zone saves | Wipe at 507-511 |
| Edict size and function-pointer checks before a load | 617-622 and 680-693 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: mark players not-in-use while the zone is written, write only in-use entities, build the zone baseline first, overlay the saved state unless the zone is deathmatch-style, report the 100-frame settle when an overlay was applied, and clear all snapshots on a new unit. It omits the binary file format, the edict size and function-pointer checks, the configstring and portal state, the `sv.loadgame` branch, the client `connected` reset, the restore of cross-level target think timers, the cross-level bit flags (see section 6), the `gi.error` aborts, and the client side. The sketch returns a settle count instead of running frames.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ZoneId = string;

interface EntityRecord {
  id: number;
  kind: string;
  inUse: boolean;
  fields: Record<string, number | string | boolean>;
}

interface ZoneSnapshot { zone: ZoneId; savedAt: number; entities: EntityRecord[]; }

// Donor: the settle run on re-entry is 100 game frames at FRAMETIME 0.1 s (about 10 s).
const SETTLE_FRAMES = 100;

const snapshots = new Map<ZoneId, ZoneSnapshot>();

function copyEntity(e: EntityRecord): EntityRecord {
  return { ...e, fields: { ...e.fields } };
}

// Exit: player entities are marked not-in-use while the zone is written, so they are not saved
// as bodies; the flags are then restored (donor: sv_ccmds.c 516-530).
function saveZoneOnExit(zone: ZoneId, world: EntityRecord[], playerIds: ReadonlySet<number>, now: number): void {
  const flags = new Map<number, boolean>();
  for (const e of world) {
    if (playerIds.has(e.id)) { flags.set(e.id, e.inUse); e.inUse = false; }
  }
  const entities = world.filter((e) => e.inUse).map(copyEntity);
  for (const e of world) {
    const f = flags.get(e.id);
    if (f !== undefined) e.inUse = f;
  }
  snapshots.set(zone, { zone, savedAt: now, entities });
}

// Entry: the zone is first built from its own baseline, then the saved state replaces it
// (donor: SpawnEntities at sv_init.c 260, then the restore check at 274). Deathmatch-style
// zones skip the restore (sv_init.c 126-127).
function enterZone(
  zone: ZoneId,
  baseline: () => EntityRecord[],
  deathmatch: boolean,
): { world: EntityRecord[]; settleFrames: number } {
  const snap = snapshots.get(zone);
  if (deathmatch || !snap) return { world: baseline(), settleFrames: 0 };
  return { world: snap.entities.map(copyEntity), settleFrames: SETTLE_FRAMES };
}

// A map name starting with '*' begins a new unit: every saved zone is dropped (donor: sv_ccmds.c 507-511).
function startMap(name: string): void {
  if (name.startsWith("*")) snapshots.clear();
}

export {};
```

## 5. Lands in

- TARGET `origins/server/zone-state.ts` (proposed new file; the Frankendom tree was not read, so the path is a proposal). The server writes the zone snapshot on exit and reads it on entry. Its spawn baseline comes from the zone's data.
- Parity-checklist row: 23 (zone population). This is the closest fit. Row 23 names spawn caps, respawn and despawn; this mechanism decides what respawn means on re-entry (fresh baseline or the saved population). It is a partial fit: the snapshot rule for players and units has no row of its own. Lead should decide whether a row is needed.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (one runtime); server-verified kills (a kill that is saved stays saved); one ledger for zone population. Rules 7-9 n/a.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, and the typecheck passed on the VPS with `tsc --strict`.
- The save is a binary dump of the whole edict array with pointer fix-ups and a function-pointer base check (`ctf/g_save.c` 617-622, 680-693). Reject the format. Keep the shape: a typed snapshot of in-use zone entities, written by the server.
- A layout change or a bad file makes the donor abort (`gi.error` at 668-669, 684 and 692) rather than fall back to the baseline. Frankendom must choose a schema version and a fallback, so a bad snapshot never blocks a player entering a zone.
- The donor writes the snapshot to a local file under `save/current`. Frankendom's rule is that kills are server-verified: the snapshot must live in the server's store, with the same ledger that records the kills.
- The `*` unit rule is tested two ways: `strstr` anywhere in the name when a trigger exits (`ctf/g_target.c` 296) and first character only when the save is wiped (`server/sv_ccmds.c` 507). Frankendom must pick one test.
- The settle is 100 hidden frames with the state set to loading (`server/sv_init.c` 145-155). Frankendom's server tick is fixed-step and must not run hidden frames for players. If a zone needs a settle, do it as a server step before players are admitted (parity row 18 sub-line: "server tick: fixed step, input intake, per-tick NPC budget").
- The cross-level target check is one-shot: when its think runs and its bits are not all set, nothing is rescheduled (`ctf/g_target.c` 469-476). A target that needs a later unit's flags never fires. Do not copy that as a rule; it is not part of the main mechanism here and is listed only as a second mechanism.
- Deathmatch-style zones skip the restore (`server/sv_init.c` 126-127). Frankendom has no deathmatch; if a zone needs fresh respawns, that is a zone-data flag, not a copy of this check.
- Client handling after a restore (the clients marked unconnected at `ctf/g_save.c` 721-727, and how the client re-enters at a spawn point) was not read.
- The skill filter in `ctf/g_spawn.c` (534-620) is a second per-zone table mechanism seen only by grep. It is a candidate for its own note, not written up here.

Best transferable idea: Save a zone's live entities when the player leaves, and overlay them on the zone's fresh baseline when it is entered again, so kills stay dead, while all saves are dropped at a unit boundary.
Decision (proposed): adapt — keep the save-on-exit, build-baseline-then-overlay and unit-wipe shape with the server writing a typed snapshot; reject the binary edict dump and the abort-on-bad-file load, which do not fit server-verified kills or the one ledger.
Acceptance: Server test: a player kills 3 of 5 mobs in zone A and leaves; on re-entry the 3 stay dead and the 2 living mobs are where they were; the player is placed at a spawn point, not in an old body; a deathmatch-style zone ignores its snapshot and respawns its baseline; a map name starting with * drops all saved zones.
