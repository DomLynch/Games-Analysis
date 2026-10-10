# OpenDAoC-OpenDAoC-Core (spawns-encounters, cell 6)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameNPC.cs` (plus `CoreDatabase/Tables/DbMob.cs`, `GameServer/serverproperty/ServerProperties.cs`, `GameServer/gameutils/Util.cs`, `GameServer/scripts/mobs/HiberniaMobs/Ick.cs`) | Licence: GPL-3.0 (repo LICENSE file; README.md lines 41-42 "GNU General Public License (GPL) v3"). GameNPC.cs has no per-file licence header (first 12 lines read; grep for "GNU" in it returned nothing). The repo also carries `gplheader.txt` (GPL-2.0-or-later text) for files that use that header. Clean-room either way. | C# | symbol `StartRespawn` / `RespawnTimerCallback` (GameNPC.cs 2974, 2996)

Checked: The respawn path is GameNPC.cs 1019-1022 (load from DB), 2893-2942 (`RespawnInterval` getter and setter), 2947-2989 (`IsAlive`, `IsRespawning`, `StartRespawn`), 2996-3026 (`RespawnTimerCallback`), and the death call at 2792. Read: those ranges of GameNPC.cs (1005-1030, 2758-2800, 2890-3040), and TimeDependentSpawnNpc.cs in full (60 lines, day/night visibility on the same callback). Also read: DbMob.cs 60-72, ServerProperties.cs 1174-1179, Util.cs 15-36, Ick.cs 70-112. Searched by grep for population caps and despawn (`maxspawn|spawnlimit|population|despawn`): no zone-level spawn cap was found; the hits were pets, bosses, a despawn-warning brain, and a population-limit check inside a custom mob script (BPMob.cs 11, 87). Not read: the ECS game timer class (how it is driven by the game loop), `LoadTemplate`, where `m_spawnPoint` is set, the save-back at GameNPC.cs 1173, and the keep guard respawn (grep only). Confidence: high on the per-mob respawn formula and the death-to-callback order; medium on what drives the timer, which I did not read. The donor is not a zone director: each NPC runs its own respawn timer.

Best transferable idea: each NPC keeps its own respawn timer whose delay is a random window picked from the mob's tier (above level 65 adds a minute per level; realm NPCs use a flat 5 to 10 minute window; a capitalised name adds 5 minutes), and the respawn restores full resources at the spawn point.
Decision (proposed): adapt — the tiered respawn window is the respawn half of parity row 23 and fits zone data (window min, window max, tier add); the donor has no population cap or zone director, and its -1 sentinel means random in the database but no respawn in code, which must not be copied. Frankendom uses explicit fields.
Acceptance: a server test: a zone mob with a 300-600 s window dies at time t; its respawn event lands between t+300 s and t+600 s inclusive, at its spawn point, at full health; a mob with respawn disabled never returns.

## 1. Mechanism

- Death (`ProcessDeath` override, GameNPC.cs 2758-2793): the body is removed (`Delete()` at 2790) and the timer starts (`StartRespawn()` at 2792). No zone-level population count appears in what was read or in the grep for caps (see Checked); each NPC handles only itself.
- The interval is read from `RespawnInterval` (2909-2942). If the stored value `m_respawnInterval` is positive it is returned as ms (2913-2914). If it is negative it is returned as is, and a negative value means no respawn: `StartRespawn` returns early when `RespawnInterval <= 0` (2976). The stored value is 0 for "random" (the field starts at -1, 2896; a database -1 is turned into 0 at 1019-1022; `DbMob` says "random respawn by default", DbMob.cs 69).
- Random window (stored value 0), in the order the code runs. (a) `minutes = Util.Random(NPC_MIN_RESPAWN_INTERVAL, NPC_MIN_RESPAWN_INTERVAL + 5)` (2916); the property defaults to 5 minutes (ServerProperties.cs 1177-1178). This draw happens for every NPC, including realm NPCs. (b) Named mobs, meaning names that are not all lowercase, get +5 minutes (2918-2921). (c) If `Level <= 65 && Realm == 0`: the delay is `minutes * 60000` ms (2923-2926). (d) Else if `Realm != 0`: the delay is `Util.Random(5 * 60000, 10 * 60000)` ms, a flat 5 to 10 minutes, and the level does not matter (2927-2931); the (b) bonus is discarded for realm NPCs. (e) Otherwise (level above 65, realm 0): `add = (Level - 65) + NPC_MIN_RESPAWN_INTERVAL` (2934) and the delay is `(minutes + add) * 60000` ms (2935). With the default of 5, a level 70 mob waits 15 to 20 minutes, or 20 to 25 if named.
- Timer: `StartRespawn` makes an `ECSGameTimer` once and starts it with `RespawnInterval` (2979-2988). `IsAlive` is false while `IsRespawning` (2952), so the mob reads as dead during the wait.
- Callback (`RespawnTimerCallback`, 2996-3026). It stops and clears the timer (3000-3004). It returns 0 without acting if the mob is alive or in `eObjectState.Active` (3007-3008). Otherwise it reloads the template (3010), sets health, mana and endurance to their maxima (3011-3013), moves the mob to `m_spawnPoint` with its spawn heading (3014-3017), stamps `SpawnTick` from the game loop time (3018), restores stealth if it had it (3021-3022), and adds the mob back to the world (3024). It returns 0, so the timer does not re-arm.
- Ick worm (Ick.cs 70-103), read as a second shape of the same family. Ick adds set `RespawnInterval = -1` (86), so they never respawn. A 180 s timer (73, 87) runs `Despawn`. If the worm is alive it defers every 30 s (74, 97-98) while it is in combat or has aggro, and otherwise removes itself from the world (100). This is a timed lifetime with combat deferral, not a check on an empty zone.
- Tick: (not read) the ECS timer's driver. The donor's own code only sets the delay and runs the callback.

## 2. Key functions

- `RespawnInterval` (get and set): `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameNPC.cs` 2909-2942. The tiered window.
- `StartRespawn`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameNPC.cs` 2974-2989. Starts the timer with the interval.
- `RespawnTimerCallback`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameNPC.cs` 2996-3026. Full reset at the spawn point, back into the world.
- Death call: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameNPC.cs` 2758-2792 (`ProcessDeath` override).
- DB load: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameNPC.cs` 1019-1022.
- Time-of-day variant on the same callback: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/scripts/mobs/TimeDependentSpawnNpc.cs` 12-17 (`CheckVisibility` before `base.RespawnTimerCallback`); not used for the numbers.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-entity respawn timer started at death, after the body is removed | Timer started at 2792 and 2987 (GameNPC.cs) |
| Random window in minutes, drawn inclusively at both ends | Window of 5 to 10 minutes: base 5 (ServerProperties.cs 1177), width 5 (GameNPC.cs 2916); `Util.Random` inclusive (Util.cs 25, 29) |
| Named-entity bonus | +5 minutes for names that are not all lowercase (GameNPC.cs 2918-2920) |
| Tier split at level 65 | Level <= 65 and realm 0 uses the window as is (2923); above 65 adds (Level - 65) plus the base minutes (2934) |
| Realm NPCs: flat window, level ignored | 5 to 10 minutes, in ms (2927-2930; comment 2929) |
| Explicit window in seconds from the database | DB value times 1000 (GameNPC.cs 1022); DB -1 means random (1019-1020; DbMob.cs 69) |
| Negative window means never respawn | Early return when `RespawnInterval <= 0` (2976) |
| Full reset on respawn | Health (3011), mana and endurance (3012-3013) to maxima; spawn point (3014-3017) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's branch order and draw order: the minutes draw first for every mob, the named bonus, then the branch, with the realm branch drawing a second value as the donor does. It omits the ECS timer and its game-loop callback, the template reload, the full-resource and spawn-point reset, the stealth restore, the add-to-world step, the `IsAlive` and `IsRespawning` coupling, the save-back to the database, and the `SpawnTick` stamp. The database -1 mapping is in `storedFromDb`; the in-code negative value (no respawn) is `storedMs < 0`, which the sketch returns as is and `scheduleRespawn` turns into null.

```ts
// Licence: GPL-3.0 (repo LICENSE file; README.md lines 41-42). Clean-room sketch of the mechanism, not a translation.
// clean-room
interface NpcSpec {
  storedMs: number;   // donor m_respawnInterval: >0 explicit ms, 0 random window, <0 no respawn
  level: number;
  realm: number;      // 0 = ordinary mob, non-zero = realm NPC
  named: boolean;     // donor: name is not all lowercase
}

interface RespawnRules {
  minMinutes: number; // donor: NPC_MIN_RESPAWN_INTERVAL, default 5
}

// Donor Util.Random(min, max): inclusive at both ends.
function randInt(min: number, max: number, rnd: () => number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

// Donor DB mapping: DB -1 means random (0 in memory); other DB values are seconds.
export function storedFromDb(dbSeconds: number): number {
  return dbSeconds === -1 ? 0 : dbSeconds * 1000;
}

// Respawn delay in ms. Same draw order as the donor: minutes first, then the named bonus, then the branch.
export function respawnDelayMs(npc: NpcSpec, rules: RespawnRules, rnd: () => number): number {
  if (npc.storedMs > 0 || npc.storedMs < 0) return npc.storedMs;   // explicit value (negative = no respawn)
  let minutes = randInt(rules.minMinutes, rules.minMinutes + 5, rnd);
  if (npc.named) minutes += 5;
  if (npc.level <= 65 && npc.realm === 0) return minutes * 60000;
  if (npc.realm !== 0) return randInt(5 * 60000, 10 * 60000, rnd);  // realm NPCs: flat 5 to 10 minutes
  const add = (npc.level - 65) + rules.minMinutes;                    // above 65: add a minute per level over 65
  return (minutes + add) * 60000;
}

// Death path: the body is removed first, then the timer starts. Returns the due time, or null for no respawn.
export function scheduleRespawn(npc: NpcSpec, now: number, rules: RespawnRules, rnd: () => number): number | null {
  const delay = respawnDelayMs(npc, rules, rnd);
  if (delay <= 0) return null;
  return now + delay;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (per-spawn respawn timer, server side). Parity-checklist row 23 (zone population), respawn half only: the window is the respawn interval; the tier add and named bonus are per-entity data or engine rules. The donor shows no spawn cap, so row 23's cap half is not covered by this cell. The server-tick sub-line applies only to the timer driver, which was not read: "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3).
- today: (not read) `origins/server/world-spawns.ts`.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: respawn decisions live in the server engine, zones as data); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- No zone director. Each NPC has its own timer, and the code read has no population cap, no spawn count per zone, and no zone-level spawn loop. For row 23's caps, look at another donor; this one does not show them.
- Sentinel conflict. -1 means "random" when it comes from the database (1019-1020) but "no respawn" when set in code (IckAdd, Ick.cs 86; a default field value of -1, 2896). Frankendom must use separate explicit fields (`respawn: random | fixed s | never`) and must not copy the overlap.
- Named bonus is a naming check. "Name is not all lowercase" is a convention that marks capitalised mobs as named (2918). Frankendom should use an explicit tier or boss flag in zone data.
- Level tier is a DAoC curve. The add of one minute per level above 65 (2934) is tuned to that game. In Frankendom it becomes a zone-data field with a default of zero.
- Units. The donor mixes minutes (property), seconds (database) and ms (timer). Frankendom stores seconds in zone data and converts once on load.
- Realm branch draws a random value and then discards the named bonus (2916-2921 before 2927-2930). Harmless in the donor, but a Frankendom test should not depend on the number of random draws.
- Despawn. Ick.cs (73-102) shows a timed lifetime with combat deferral (180 s, retry 30 s). It is not an empty-zone check with a grace timer, so it covers only part of row 23's despawn half. Look for an empty-zone despawn elsewhere.
- Not read: the timer driver (ECSGameTimer), so the claim "the callback runs on the server game loop" is not verified. The Frankendom server tick rule (fixed step) is a requirement, not something this donor shows.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** No false claim found. Verified: RespawnInterval getter 2909-2937 (draw Random(min,min+5) first, +5 if name != lower, <=65 && realm 0 -> minutes*60000, realm !=0 -> Random(5,10 min), else (minutes + (Level-65)+min)*60000), default 5 (ServerProperties.cs 1177), DB -1 -> 0 and *1000 (1019-1022), field default -1 (2896), StartRespawn early return <=0 (2976), callback 2996-3026 (stop timer, alive/active return 0, LoadTemplate, full resources, spawn point, SpawnTick, stealth, AddToWorld), death calls Delete then StartRespawn (2790, 2792), Util.Random inclusive (Util.cs 22-30), Ick.cs 73-102 (180 s, 30 s retry, RespawnInterval=-1), README 41-42 GPL v3, no cap grep hit. Worked example 15-20 / 20-25 min is correct.

**Missed:** StartRespawn evaluates the RespawnInterval getter TWICE (2976 for the <=0 test, 2987 for Start), so the random window is drawn twice and the first value is discarded; the note mentions draw count only in passing and the sketch draws once - harmless but a replay test must not assume one draw.
