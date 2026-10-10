# ioquake-ioq3 (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_client.c` (`SelectRandomFurthestSpawnPoint`, 183-260; `SelectSpawnPoint` 268-270; the respawn lock in `code/game/g_combat.c` 606-608 and the respawn check in `code/game/g_active.c` 997-1012) | Licence: GPL-2.0-or-later (COPYING.txt is "Version 2, June 1991"; g_client.c header line 9: "either version 2 of the License," with the "or (at your option) any later version" wording) | C | symbol `SelectRandomFurthestSpawnPoint`

Checked: Read in full: `SelectRandomFurthestSpawnPoint` (g_client.c 183-260), `SelectSpawnPoint` (268-270), `SpotWouldTelefrag` (g_client.c 84-100), `SelectInitialSpawnPoint` (302-335), the spawn section of `ClientSpawn` (1044-1100, the non-CTF branch and the respawn call), the respawn lock in `player_die` (g_combat.c 596-608), the respawn check in the client think (g_active.c 997-1012), the `g_forcerespawn` cvar (g_main.c 147), and the `random()` macro (q_shared.h 677). Callers: `SelectSpawnPoint` callers found by grep: g_client.c 326 (read), 1092 (read), g_team.c 1024, g_active.c 626 and g_main.c 970 (not opened). The description of the selector holds for every caller because all of them pass the avoid point to the same function; I did not read the team or intermission callers. Not read: item and powerup respawn (g_items.c 245-560), the CTF spawn selector, the bot respawn state (ai_dmnet.c 1232-1290), the body queue. Confidence: high on the filter, the ranking, the pick and the respawn timing (read end to end). camera_scope: not applicable.

Best transferable idea: a respawn goes to one of the spots furthest from where the player last stood (the top half of a sorted list, skipping spots that a living player blocks), after a short death lock, with a forced respawn when the player waits too long.

Decision (proposed): adapt - take the furthest-half pick and the death lock with a forced-respawn window as zone-data spawn rules; add a distance from living enemies to the ranking, since the donor ranks only by the player's own last position.

Acceptance: a server test in a zone with six spawn points: after a death, the respawn point is one of the three furthest from the death point and not within 15 horizontal units of a living player; no respawn is accepted before 1.7 s after death; with no input the player respawns at about 21.7 s (1.7 s lock plus the 20 s window).

## 1. Mechanism

- Death (g_combat.c 608): `respawnTime` is set to now + 1700 ms. The comment says respawn waits for the death animation; the forced respawn is measured from this time.
- Each client think while dead (`ClientThink_real`, g_active.c 754 onward; the check is at 997-1012): nothing happens until `level.time > respawnTime` (1000). After that, if `g_forcerespawn` is above 0 and more than `g_forcerespawn` seconds have passed since `respawnTime` (1002-1003), the player respawns (1004). Otherwise, attack or use respawns it (1009-1010). The default window is 20 s (g_main.c 147).
- `ClientRespawn` copies the body and calls `ClientSpawn` (g_client.c 530-533 region; read only as far as the call to `ClientSpawn`).
- `ClientSpawn` (non-CTF, non-initial branch, g_client.c 1090-1093): `SelectSpawnPoint(client->ps.origin, ...)`. The avoid point is the player's stored origin, the last position it had. The comment is "don't spawn near existing origin if possible" (1091).
- `SelectSpawnPoint` (268-269) forwards to `SelectRandomFurthestSpawnPoint`. The older random and nearest variants are in a comment block (271-297, not active).
- `SelectRandomFurthestSpawnPoint` (183-260), in order:
  - (a) For each `info_player_deathmatch` entity (183-205): skip it if it would telefrag (196), or if its no-bots or no-humans flag excludes this player type (199-200).
  - (b) Distance from the avoid point (206). The list is kept sorted furthest first by insertion (211 onward). Stored spots are capped at 128 (213, 230; the `MAX_SPAWN_POINTS` define is at 110 and 142).
  - (c) If no spot is usable, use the first `info_player_deathmatch` from `G_Find` without a telefrag check (238-241).
  - (d) Pick index `rnd = random() * (numSpots / 2)`, truncated (252). `random()` is `(rand() & 0x7fff) / 32767.0` (q_shared.h 677), so the index falls in `[0, numSpots/2)` except with probability 1/32768 when it equals `numSpots/2`. The pick is uniform over the top half of the ranking; with two or three usable spots it is always the furthest.
  - (e) Copy the origin (254) and angles, and return the spot.
- `SpotWouldTelefrag` (84-100): the player-sized box is the spot plus (-15, -15, -24) to (15, 15, 32) (87-88 and playerMins/playerMaxs at 27-28). Any entity with a client inside the box blocks the spot (89-95). The health test is commented out (93).
- Spawn sets `respawnTime` to now (g_client.c 1193), so the next death starts a new lock.

## 2. Key functions

- `SelectRandomFurthestSpawnPoint`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_client.c` 183-260. Filter, ranking, fallback and pick.
- `SelectSpawnPoint`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_client.c` 268-270. One line: forwards to the furthest selector.
- `SpotWouldTelefrag`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_client.c` 84-100. Box test for any client.
- `ClientSpawn` spawn section: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_client.c` 1044-1100. The avoid point and the call.
- Death lock: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_combat.c` 606-608 (`player_die`, function opens at 434).
- Respawn check: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_active.c` 997-1012. The lock, the forced window and the button path.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Death lock before respawn | 1700 ms (g_combat.c 608) |
| Forced respawn window after the lock | `g_forcerespawn` seconds, default 20 (g_main.c 147); check at g_active.c 1003 |
| Blocking box around a spot | (-15, -15, -24) to (15, 15, 32) (g_client.c 27-28) |
| Pick among the furthest half | `numSpots / 2`, integer division (g_client.c 252) |
| Spot list cap | 128 (`MAX_SPAWN_POINTS`, g_client.c 110, 142; used at 213, 230) |
| Random source | `random()` = `(rand() & 0x7fff) / 32767.0` (q_shared.h 677) |

The lock, the window and the box are fixed in code except the window, which is a server cvar. The top-half rule is a fixed rule of the selector. Spot flags (no bots, no humans) are map data.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: filter (telefrag and bot/human flags), rank by distance from the player's last position, fall back to the first spot, pick in the top half, and the respawn gates (lock, then forced window, then button). It omits the spot cap of 128, the insertion sort (a plain sort gives the same order), the body-queue copy, the angles copy, the team and CTF selectors, the bot respawn state, the respawn-time reset at spawn (g_client.c 1193), and the donor's health test (commented out in the donor anyway). Telefrag is a point test on each occupant, standing in for the entity-box query. The donor's random() can return exactly 1.0, which gives one index past the top half with probability 1/32768; the sketch's `rnd` is in [0, 1). It adds nothing from living enemies: that is the donor's behaviour, and the decision above changes it.

```ts
// Licence: GPL-2.0-or-later (donor, ioquake-ioq3). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type V3 = { x: number; y: number; z: number };
interface Spot extends V3 { noBots: boolean; noHumans: boolean; }

const RESPAWN_LOCK_MS = 1700;   // no respawn until the death animation is done
const FORCE_RESPAWN_S = 20;     // forced respawn window after the lock (default)

const dist = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// A living player inside the player-sized box at the spot blocks it.
function blocked(s: Spot, occupied: V3[]): boolean {
  return occupied.some(o =>
    Math.abs(o.x - s.x) <= 15 && Math.abs(o.y - s.y) <= 15 && o.z - s.z >= -24 && o.z - s.z <= 32);
}

// Rank usable spots by distance from the respawning player's own last position, furthest first,
// then pick uniformly among the top half of the ranking.
function pickSpawn(lastPos: V3, spots: Spot[], occupied: V3[], isBot: boolean, rnd: () => number): Spot | undefined {
  const usable = spots.filter(s => !(s.noBots && isBot) && !(s.noHumans && !isBot) && !blocked(s, occupied));
  if (usable.length === 0) return spots[0];                 // fallback: first spot, not checked for blocking
  const ranked = usable.map(s => ({ s, d: dist(s, lastPos) })).sort((a, b) => b.d - a.d);
  const half = Math.floor(usable.length / 2);               // integer half of the ranking
  return ranked[Math.floor(rnd() * half)]?.s;               // one index in [0, half)
}

// Death sets the lock; a respawn is accepted only after it.
function respawnTimeAtDeath(now: number): number { return now + RESPAWN_LOCK_MS; }

// Checked in the client think while dead (donor g_active.c 997-1012): after the lock, a forced respawn
// fires once the window has passed; before that, attack or use respawns the player.
function mayRespawn(now: number, respawnTime: number, buttonPressed: boolean): boolean {
  if (now <= respawnTime) return false;
  if (FORCE_RESPAWN_S > 0 && now - respawnTime > FORCE_RESPAWN_S * 1000) return true;
  return buttonPressed;
}

export { pickSpawn, respawnTimeAtDeath, mayRespawn };
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone spawn points on the server: the respawn spot choice, the death lock and the forced-respawn window are server rules, not client input). Parity-checklist row 23 (zone population and respawn). The death and respawn UI is also row 17; this note cites row 23 per the addendum rule that respawn findings cite row 23.
- today: not read (Frankendom side not opened in this pass).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one engine (the spawn choice and the lock run on the server; the client only shows the result); zones as data (spawn spots, their no-bot and no-human flags, and the forced window are zone or server data); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- The donor ranks spots by the player's own last position only (g_client.c 206). It ignores living enemies. In a many-on-one fight that can respawn a player next to the group that just killed them. Frankendom's version must add a distance from living enemies (threat), and the sketch does not yet do that.
- The telefrag check is a box test for any entity with a client pointer (g_client.c 89-95). It does not check health (the health test is commented out at 93), so the donor blocks a spot for dead as well as living clients. Frankendom's check must say which players count.
- The fallback (g_client.c 238-241) returns the first spot with no blocking check. Frankendom should refuse to spawn onto a blocked spot, or pick the least blocked one, not fall back to a fixed spot.
- The forced respawn is a timer the client can see and the server must enforce. The donor enforces it in the client think (g_active.c 997-1012). Frankendom's server must own it, so a client cannot wait out or skip the window.
- The pick is uniform over the top half. With two or three usable spots it always picks the furthest one, so the donor's variety is small in small zones. Make the fraction a zone field.
- Frankendom's kill and loot ledger is not touched here, but the lock and window must not reward or cancel a kill credit. Not checked in the donor (not read).
- Item and powerup respawn (g_items.c 245-560) was not read and is not part of this note.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** SelectRandomFurthestSpawnPoint 183-259 (telefrag skip, bot/human flags, insertion sort, cap 128, fallback 238-248, rnd = random()*(numSpots/2)), SelectSpawnPoint 268-270, SpotWouldTelefrag health test commented out (93), box -15/-24/15/32, 1700 ms lock g_combat.c 608, forced respawn g_active.c 997-1012, g_forcerespawn 20, respawnTime reset 1193, random() macro, GPL v2 or later all verified.

**Missed:** ClientSpawn calls G_KillBox(ent) at g_client.c 1203, so the fallback spot (no telefrag check) kills anyone standing there; note's fallback risk section says it 'returns the first spot with no blocking check' but does not state the donor then telefrags occupants.
