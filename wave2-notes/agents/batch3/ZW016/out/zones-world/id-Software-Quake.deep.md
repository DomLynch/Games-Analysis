# id-Software-Quake (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/client.qc` (game side, QuakeC) with the engine side in `/mnt/frankendom-donors/id-Software-Quake/WinQuake/sv_main.c` and `WinQuake/host_cmd.c` | Licence: GPL-2.0-or-later (client.qc header: "either version 2 of the License, or (at your option) any later version"; the root `gnu.txt` is GPL v2) | QuakeC + C | symbol `changelevel_touch`, `SetChangeParms`, `SV_SaveSpawnparms`, `Host_Changelevel_f`

Checked: The hint file `WinQuake/world.c` is the collision and area-node code (`SV_LinkEdict` 372, `SV_Move` 923); it is not the zone mechanism, so it was used only to rule out. The zone transition was found in `qw-qc/client.qc` (read 58-125, 155-182, 186-312, 458-470 and 484-520), `WinQuake/sv_main.c` (244-296, 980-1003, 1015-1032, 1047-1135, 1170-1180 read; 1136-1169 not read), `WinQuake/host_cmd.c` (306-357, 1279-1330) and `WinQuake/pr_edict.c` (890-975). Confidence: high on the server-side order of operations and the numbers. Medium on the claim that parms survive the client reconnect: the client-side `reconnect` handler and the `new` command were not read (inference, marked in section 1). `Killed`, the entity spawn functions and `SelectSpawnPoint` were not read. Camera: not applicable (zones-world).

## 1. Mechanism

Order of operations, one zone exit, as the donor runs it:

1. Exit trigger touch (`client.qc` 244-273). Only a `player` entity counts (248-249). The exit records the destination map (263), fires its targets (265), and clears its own touch function (267), so the trigger fires once. It then schedules the real move as a think 0.1 s later (271-272), because the comment at 269-270 says players cannot be moved inside the touch call (movement code is running).
2. `execute_changelevel` (208-241). Sets the intermission flag and an exit wait of 5 s (215). Sends the intermission camera position. Makes every player non-damageable, non-solid and motionless (234-236).
3. `IntermissionThink` (189-198; how it is assigned to the players was not read). Returns until `time >= intermission_exittime` (191-192), then waits for a button press (194-195) and calls `GotoNextMap` (197).
4. `GotoNextMap` (161-178). If the cvar `samelevel` is 1, stays on the same map (167-168). Otherwise uses the map list key or the trigger's `nextmap` (172-176).
5. Engine: `Host_Changelevel_f` (`host_cmd.c` 311-357). The non-QUAKE2 branch (340-356) calls `SV_SaveSpawnparms ()` (353) and then `SV_SpawnServer (level)` (355).
6. `SV_SaveSpawnparms` (`sv_main.c` 1015-1032). Stores `svs.serverflags` (1019). For each active client it runs the progs' `SetChangeParms` (1027-1028) and copies `parm1` to `parm16` into `host_client->spawn_parms` (1029-1030).
7. `SetChangeParms` (`client.qc` 62-91). A dead player (health <= 0) gets `SetNewParms` instead (64-67). Otherwise: removes the key, invisibility, invulnerability, suit and quad items (71-72); clamps health to a floor of 50 and a ceiling of 100 (75-78); keeps shells at least 25 (82-85); packs items, health, armour value, shells, nails, rockets, cells, weapon and armour type x 100 into `parm1` to `parm9` (79-90).
8. `SV_SpawnServer` (`sv_main.c` 1047-1180). Reads the skill cvar, rounds it, clamps to 0..3 (1074-1078). Reloads the map and progs (1085-1096). Copies `svs.serverflags` into the progs (1176). `ED_LoadFromFile` parses the map's entity text, removes entities by skill or deathmatch flag before their spawn function runs (`pr_edict.c` 934-943), and runs the spawn functions (1178).
9. Clients are told to reconnect: `SV_SendReconnect` (985-1003) sends a `reconnect` stufftext to all clients. Inference (not read on the client side): the connection is not rebuilt, so `SV_ConnectClient` (243-293) does not run again. It restores parms only when `sv.loadgame` is set (263-264, 282-283) and otherwise sets the defaults (287-289) for a new connection.
10. `Host_Spawn_f` (`host_cmd.c` 1279-1328). On the client's `spawn` command, copies each `host_client->spawn_parms[i]` into `parm1` to `parm16` (1315-1316), runs `ClientConnect` (1322) and then `PutClientInServer` (1327).
11. `PutClientInServer` (`client.qc` 479-...) calls `DecodeLevelParms` (501). That restores items, health, armour, shells, nails, rockets, cells and weapon from `parm1` to `parm9` (114-121) and sets `armortype = parm9 * 0.01` (122). If `serverflags` is non-zero and the map is `maps/start.bsp`, the kit is first reset to the defaults (108-111), which the donor treats as a new episode.

Default kit (`SetNewParms`, 93-104): items shotgun and axe (95), health 100 (96), armour 0 (97), shells 25 (98), no nails, rockets or cells (99-101), weapon 1 (102), armour type 0 (103).

## 2. Key functions

- `changelevel_touch`: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/client.qc` 244-273. The fire-once trigger and the 0.1 s deferral.
- `execute_changelevel`: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/client.qc` 208-241. Intermission start and the 5 s exit wait (215).
- `IntermissionThink` and `GotoNextMap`: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/client.qc` 189-198 and 161-178.
- `SetChangeParms` (carry out): `/mnt/frankendom-donors/id-Software-Quake/qw-qc/client.qc` 62-91. Strip, clamp, pack.
- `DecodeLevelParms` (carry in): `/mnt/frankendom-donors/id-Software-Quake/qw-qc/client.qc` 106-123, called from `PutClientInServer` at 501.
- `SV_SaveSpawnparms`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/sv_main.c` 1015-1032. Runs the carry-out per client.
- `Host_Changelevel_f`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/host_cmd.c` 311-357. Save parms, then spawn the new server.
- `SV_SpawnServer`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/sv_main.c` 1047-1180. Skill clamp, serverflags restore, map load.
- `Host_Spawn_f`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/host_cmd.c` 1279-1328. Copies parms into the progs and places the player.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Exit fires once: the first player touch disarms the trigger | Touch cleared at 267 (mechanism) |
| Defer the real move past the touch call | 0.1 s (272) |
| Hold players in intermission for a minimum time before they can leave | 5 s (215), checked at 191-192 |
| Snapshot each player when they leave, with clamps | Health floor 50 and ceiling 100 (75-78); shells floor 25 (82-85) |
| A dead player carries the default kit, not the death state | Default kit at 93-104 |
| Strip timed or key items from the carry | Six flags removed (71-72): key 1, key 2, invisibility, invulnerability, suit, quad |
| Restore on arrival with a per-level reset on the first map of an episode | `maps/start.bsp` with serverflags set (108-111) |
| Cross-level flags as a bit field | `serverflags` (1019, 1176); the engine comment at 1175 says they are "for cross level information (sigils)" |
| Carry slots | 16 slots: `NUM_SPAWN_PARMS` (`WinQuake/server.h` line 76, name only in the quote) |
| Skill range for entity filtering | Clamp 0..3 (`sv_main.c` 1077-1078) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (fire once, defer, wait the minimum, snapshot with clamps and the dead-player default kit, restore on arrival). It omits the 16 untyped parm slots and the serverflags bits, the intermission camera and entity freeze, the `samelevel` and map-list branches, the skill filter, the reconnect path, `SV_SpawnServer`, the trigger linking through the area nodes, and the donor's `NO_INTERMISSION` header comment (I found no check for that flag in the code I read). Items are typed as strings rather than `IT_` bits, and the ammo map is a record rather than four floats. The clamp values are the donor's constants, not Frankendom data.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ItemKind = "key" | "invisibility" | "invulnerability" | "suit" | "quad" | "shotgun" | "axe";
type AmmoKind = "shells" | "nails" | "rockets" | "cells";

interface Kit {
  items: Set<ItemKind>;
  health: number;
  armour: number;
  armourKind: number;
  ammo: Record<AmmoKind, number>;
  weapon: number;
}

interface Player { alive: boolean; kit: Kit; }

// Zone data candidates (the donor hard-codes these; see data_fields in the sidecar).
const CARRY_HEALTH_MIN = 50;
const CARRY_HEALTH_MAX = 100;
const CARRY_SHELLS_MIN = 25;
// Engine constants in the donor.
const EXIT_DEFER_S = 0.1;
const EXIT_WAIT_S = 5;

const NOT_CARRIED: ReadonlySet<ItemKind> = new Set<ItemKind>(["key", "invisibility", "invulnerability", "suit", "quad"]);

const DEFAULT_KIT: Kit = {
  items: new Set<ItemKind>(["shotgun", "axe"]),
  health: 100,
  armour: 0,
  armourKind: 0,
  ammo: { shells: 25, nails: 0, rockets: 0, cells: 0 },
  weapon: 1,
};

function cloneKit(k: Kit): Kit {
  return { ...k, items: new Set(k.items), ammo: { ...k.ammo } };
}

// Called once per player when the zone exit is taken. A dead player carries the default kit.
function snapshotForExit(p: Player): Kit {
  if (!p.alive) return cloneKit(DEFAULT_KIT);
  const items = new Set<ItemKind>([...p.kit.items].filter((i) => !NOT_CARRIED.has(i)));
  return {
    items,
    health: Math.min(CARRY_HEALTH_MAX, Math.max(CARRY_HEALTH_MIN, p.kit.health)),
    armour: p.kit.armour,
    armourKind: p.kit.armourKind,
    ammo: { ...p.kit.ammo, shells: Math.max(CARRY_SHELLS_MIN, p.kit.ammo.shells) },
    weapon: p.kit.weapon,
  };
}

// Called when the player arrives in the next zone. No carry means the default kit.
function arrivalKit(carry: Kit | null): Kit {
  return carry ? cloneKit(carry) : cloneKit(DEFAULT_KIT);
}

interface ExitTrigger { armed: boolean; commitAt: number | null; }

// The exit fires once: the first player touch disarms it and schedules the move.
function onExitTouch(t: ExitTrigger, isPlayer: boolean, now: number): ExitTrigger {
  if (!isPlayer || !t.armed) return t;
  return { armed: false, commitAt: now + EXIT_DEFER_S };
}

// Players sit in intermission; they may leave only after the wait has passed.
function leaveAllowed(now: number, intermissionStart: number): boolean {
  return now >= intermissionStart + EXIT_WAIT_S;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/zone-transition.ts` (proposed new file; the Frankendom tree was not read, so the path is a proposal). The server-side exit, carry-out and carry-in. Zone population logic sits next to it in `origins/server/world-spawns.ts`.
- Parity-checklist row: 23 (zone population). This is the closest row and it is a partial fit: row 23 names spawn caps, respawn and despawn. No row in 1-23 covers a zone exit, the wait before leaving, or the character's carry across zones. Lead should decide whether a row is needed. Death and respawn is row 17, which is the closest row for the dead-player default kit, but row 17 is not about carry.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (one runtime); one ledger for the carried character; server-verified transition. Rules 7-9 n/a.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, and the typecheck passed on the VPS with `tsc --strict`.
- The carry is 16 untyped float slots (`NUM_SPAWN_PARMS`), and the cross-level flags are a bit field. Both break the one-ledger ruling. Frankendom needs a typed snapshot on the character record, written by the server.
- The health floor of 50 means a player who leaves at 10 health arrives at 50 (75-78). This is a donor rule that Frankendom has not ruled on. Keep it as zone data or reject it.
- The 5 s exit wait and the 0.1 s defer are one global value each in this donor. Frankendom may want the wait per zone; the sidecar marks the wait as an engine constant, which is the donor's choice, not a ruling.
- The header comment on `trigger_changelevel` (`client.qc` 275) says `NO_INTERMISSION` skips the intermission. In the code I read (244-285), the touch always schedules `execute_changelevel`, and I found no check for that flag. Do not copy the flag name without the behaviour.
- The donor runs the carry in two trees: the engine in `WinQuake` and the progs in `qw-qc`. I checked that the engine's calls match the progs' definitions by name. I did not build or diff the shipped `qwprogs.dat`.
- The client's handler for `reconnect` and the `new` command were not read, and the claim that parms survive the reconnect without `SV_ConnectClient` is inference. Verify before relying on the carry path.
- Trigger contact (`SV_LinkEdict`, `SV_TouchLinks` in `WinQuake/world.c`) was not read in detail. This note says nothing about how touch volumes are found.
- A second mechanism in the same donor is real and self-contained and is not written up here: the skill and deathmatch spawn filter at load (`pr_edict.c` 934-943), a per-zone spawn table keyed by difficulty flags. It is a candidate for its own cell or note.

Best transferable idea: On a zone exit, snapshot each character once (clamped, with a dead character getting the default kit), defer the move past the touch, and restore on arrival from one server-side record.
Decision (proposed): adapt — the shape fits zones-as-data and the one-ledger rule, but the 16 untyped parm slots and the serverflags bit field do not, so the snapshot should be one typed record that the server writes.
Acceptance: Server test: a character with 250 health and an active quad timer leaves zone A; on arrival in zone B health is 100, no quad or key items remain and shells are at least 25; a character who died before the exit arrives with the default kit; a second touch on the same exit within the defer window produces one transition.
