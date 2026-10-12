# otland-forgottenserver (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/otland-forgottenserver/src/town.h` (with `iomap.cpp`, `iologindata.cpp`, `player.cpp`, `map.cpp`, `housetile.cpp`, `protocolgame.cpp`, `luascript.cpp`) | Licence: GPL-2.0 (LICENSE line 2: "Version 2, June 1991"; `town.h` line 2: "governed by the GPL-2.0 License") | C++ | symbols `Towns` / `Town` (town.h), `IOMap::parseWaypoints` (iomap.cpp 429-458), `Player::death` (player.cpp 2071-2211)

Checked: Read in full: `town.h`, `IOMap::parseWaypoints` (429-458), the towns section loop (iomap.cpp 396-425), login load of the town and login position (iologindata.cpp 255-290), `Player::death` 2071-2211 (the skill-loss arithmetic 2076-2150 read in part only), `Map::removeTile` 144-172, `HouseTile` entry query 84-104, the house rent pass 615-640 (town check only), login placement 214-232, Lua waypoint lookup 4043-4055, `map.h` 250-258, `player.h` 304-306. Callers checked by grep: `getTown` (house.cpp 629; iologindata.cpp 270; luascript.cpp 9800, 12557), `getTemplePosition` (housetile.cpp 98; iologindata.cpp 281; player.cpp 2205; protocolgame.cpp 227). Not read: `sendReLoginWindow` body (protocolgame.cpp 1698), the rest of the death skill-loss block (2086-2150 in part), `spawn.cpp`, the Lua NPC and shop scripts, the save path for the town field. Confidence: high on the hub data and the login, void and house fallbacks; medium on the death re-login path (client-side behaviour not read). Torn between STRONG and PARTIAL for the hub piece, because the mechanism is small; written as STRONG per addendum rule 3. Camera scope: not applicable.

City-map topics: this donor has a hub (town) record and fallbacks to it, plus a named waypoint registry. It has no minimap, no road or building grammar, no landmark rendering, and no service placement in the C++ read. Shops, banks and depots are Lua data, not read.

## 1. Mechanism

- Hub as data: a town is an id, a name and a temple position (`town.h` 9-14: `id` at 11, `templePosition` at 13). The map file's towns section is parsed into the registry (`iomap.cpp` 399-425: id read at 405, `setTown` with name and temple coordinates at 422-424). Setting an id that already exists replaces the record (`town.h` 21).
- Account to hub binding: the character row stores a town id. The load looks the town up (`iologindata.cpp` 270). If the id is unknown, the load fails and the log says the town id does not exist (271-275). The client is then told "Your character could not be loaded." (`protocolgame.cpp` 219-221, read).
- Login placement: the player is placed at the stored login position (`protocolgame.cpp` 226). If that placement fails, the player is placed at the temple (227-231). A stored login position of (0, 0, 0) is replaced by the temple at load (`iologindata.cpp` 280-281).
- Death, in order: (a) the login position is set to the town temple first (`player.cpp` 2073). (b) If skill loss applies (the `if (skillLoss)` branch, 2075-2186), the death penalties run, then the re-login window is sent (2164). On return, a black-skull character gets 40 health and 0 mana (2166-2168); everyone else gets full health and mana (2170-2172). In this branch no teleport call is made; the next login places the player at the login position, which is the temple (protocolgame.cpp 226). (c) Otherwise (the `else`, 2187-2205): skill loss is armed for the next death (2188), health is restored (2204), and the player is teleported to the temple at once (2205).
- Floor removed under creatures (`map.cpp` 144-172): players on the removed tile are teleported to their town temple, passing `FLAG_NOLIMIT` (165; the flag's meaning was not read); other creatures are removed (167).
- Houses (`housetile.cpp` 88-104): a player who is not invited to a house is sent to the house entry tile (90-91). If that tile is missing, the player is sent to the temple (98). The house rent pass skips a house whose town id is unknown (`house.cpp` 629-632).
- Waypoints (`iomap.cpp` 429-458): a name-to-position map, filled from the map file. A later entry with the same name overwrites the earlier one (455). Lua looks a name up (`luascript.cpp` 4046-4050) and gets `false` when the name is unknown (4051-4052).

## 2. Key functions

- `Towns` and `Town`: `/mnt/frankendom-donors/otland-forgottenserver/src/town.h` 9-33 (record and registry; `setTown` at 21, `getTown` at 23-30).
- Towns section loader: `/mnt/frankendom-donors/otland-forgottenserver/src/iomap.cpp` 399-425.
- `IOMap::parseWaypoints`: `/mnt/frankendom-donors/otland-forgottenserver/src/iomap.cpp` 429-458.
- Login town load and login position: `/mnt/frankendom-donors/otland-forgottenserver/src/iologindata.cpp` 270-282.
- `Player::death`: `/mnt/frankendom-donors/otland-forgottenserver/src/player.cpp` 2071-2211 (temple set at 2073; respawn branches 2164-2205).
- `Map::removeTile`: `/mnt/frankendom-donors/otland-forgottenserver/src/map.cpp` 144-172 (temple teleport at 165).
- House entry fallback: `/mnt/frankendom-donors/otland-forgottenserver/src/housetile.cpp` 88-104.
- Login placement: `/mnt/frankendom-donors/otland-forgottenserver/src/protocolgame.cpp` 214-232.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hub is a record: id, name, spawn point, read from the map | Record fields (theirs, town.h 11-13) |
| A character points at a hub by id; an unknown id refuses the load | Refuse, not default (theirs, iologindata.cpp 270-275) |
| Zero stored position means "start at the hub" | (0, 0, 0) sentinel (theirs, iologindata.cpp 280) |
| Death resets the spawn to the hub before any penalty | Set first (theirs, player.cpp 2073) |
| Black-skull return health and mana | 40 health, 0 mana (theirs, player.cpp 2167-2168) |
| Removed floor rescues players to the hub | `FLAG_NOLIMIT` passed on the teleport (theirs, map.cpp 165; flag meaning not read) |
| Named waypoints as a registry for scripts | Last duplicate wins (theirs, iomap.cpp 455) |

## 4. TypeScript sketch

simplified: keeps the hub record and registry (replace on same id), the login fallback (refuse on unknown hub, zero position becomes the temple), the death order (spawn set to the temple first, then respawn now or through a re-login, and skill loss armed in the no-loss case), and the floor-removal split (players to the hub, others removed). It omits: the OTBM binary parse and property reads, the database load and save, the death penalty arithmetic (experience, skills, magic, the unfair-fight reduction), the black-skull health and mana rule (the sketch does not set health), the house entry and rent logic, the Lua waypoint interface, the client re-login window, and the protection and skull checks. The order of spawn-then-penalty matches the donor (2073 runs before the skill-loss test).

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pos { x: number; y: number; z: number; }

// A hub is data: an id, a name and a temple position (read from the map file in the donor).
interface Hub { id: number; name: string; temple: Pos; }

class HubRegistry {
  private hubs = new Map<number, Hub>();
  set(h: Hub): void { this.hubs.set(h.id, h); } // a later record with the same id replaces the earlier one
  get(id: number): Hub | undefined { return this.hubs.get(id); }
}

interface Account { hubId: number; loginPos: Pos; }

const isZero = (p: Pos): boolean => p.x === 0 && p.y === 0 && p.z === 0;

// Login: refuse when the hub is missing; a zero stored login position becomes the hub temple.
export function resolveLogin(reg: HubRegistry, acc: Account):
  { ok: true; spawn: Pos; hub: Hub } | { ok: false; reason: string } {
  const hub = reg.get(acc.hubId);
  if (hub === undefined) return { ok: false, reason: "hub missing" };
  if (isZero(acc.loginPos)) acc.loginPos = { ...hub.temple };
  return { ok: true, spawn: { ...acc.loginPos }, hub };
}

// Death: the login position is set to the temple first. With skill loss on, the client re-login
// places the player (not read here); with it off, the respawn is immediate and skill loss is armed.
export function onDeath(acc: Account, hub: Hub, skillLoss: boolean):
  { immediateRespawn: boolean; armSkillLoss: boolean } {
  acc.loginPos = { ...hub.temple };
  return skillLoss
    ? { immediateRespawn: false, armSkillLoss: false }
    : { immediateRespawn: true, armSkillLoss: true };
}

// A floor tile is removed under creatures: players go to the hub temple, other creatures are removed.
export function onFloorRemoved(creatures: { id: number; isPlayer: boolean }[], hub: Hub):
  { teleport: number[]; remove: number[] } {
  const teleport: number[] = [];
  const remove: number[] = [];
  for (const c of creatures) {
    if (c.isPlayer) teleport.push(c.id);
    else remove.push(c.id);
  }
  return { teleport, remove };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/CM019-tfs-hub-temple.ts` (with `export {}`): exit 0.

Best transferable idea: Treat each zone's hub (name, temple position) as a data record, and have login, death, and floor-loss rules all resolve to it, refusing a character whose hub is unknown rather than guessing a spawn.

Decision (proposed): adapt - take the hub-as-data record and the refuse-on-unknown-hub rule as they are, but change the death order (set the respawn hub first, then resolve penalties) so the respawn is server-side and does not wait for a client re-login, which the donor relies on.
Acceptance: A player who dies in zone A is placed at zone A's hub temple on the server with no client round trip; a server test asserts that a character whose hub id is missing is refused at login, and that a removed floor under a player moves that player to the hub and removes the other creatures.

## 5. Lands in

- TARGET `origins/server/zone-hubs.ts` (new, proposed path; the Frankendom repo layout was not read). Server-side, zone data.
- Parity-checklist row 17 (death and respawn). The list's hint was row 23 (zone population). Row 23 is the monster side of a zone (spawn caps, respawn, despawn); this donor's player respawn point is row 17. The monster spawn code (`spawn.cpp`) was not read in this cell and is not claimed here.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: zones as data (the hub table is the zone table); one ledger (no silent overwrite on duplicate ids); server-verified (respawn and rescue are server calls).

## 6. Gaps and risks

- Re-login dependence: with skill loss on, the donor's respawn is a client re-login (player.cpp 2164, then placement at 226); the window body (`protocolgame.cpp` 1698) was not read. Frankendom should place the respawn on the server (the sketch does this) and not wait for the client.
- Silent overwrite: a duplicate town id (`town.h` 21) or a duplicate waypoint name (`iomap.cpp` 455) replaces the earlier record without an error. Fix: reject duplicates at load and report them, so one zone cannot quietly lose its hub.
- Null hub risk: `Player::death` (2073) and `Map::removeTile` (165) dereference the town with no null check. The login path refuses a missing town (`iologindata.cpp` 270-275), so the risk is only for players not created by that path. Fix: make the hub a required field on the character and validate it once at load.
- Penalty numbers are outside this note: the death penalty arithmetic (2076-2150 in part) and the unfair-fight reduction belong to rows 17 and 18 and were not read in full.
- Services (shops, banks, depots) and their placement one at a time are not in the C++ read; they are Lua data and were not opened. Treat the "services placed one at a time" part of the topic as NONE for this donor's C++.
- Road and building grammar, minimap and landmark rendering: not in this donor's C++ read (NONE).
- The hint file `iomap.cpp` holds only the loader; the mechanism is spread over `town.h`, `iologindata.cpp`, `player.cpp`, `map.cpp`, `housetile.cpp` and `protocolgame.cpp`.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
CLEAN
