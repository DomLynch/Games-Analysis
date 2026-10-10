# dhewm-dhewm3 (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp` (player respawn gate) and `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Item.cpp` (pickup respawn timer) | Licence: GPL-3.0 (`COPYING.txt`, "Version 3, 29 June 2007"; clean-room, shape only) | C++ | symbols `idPlayer::EvaluateControls`, `idPlayer::Kill`, `idPlayer::Killed`, `idItem::Pickup`, `idItem::Event_Respawn`

Checked: Read in full: `idItem::Pickup` respawn block (Item.cpp 370-410), `idItem::Event_Respawn` (544-556), `idPlayer::EvaluateControls` respawn check (Player.cpp 5672-5686), `idPlayer::Kill` (6466-6481). Read `idPlayer::Killed` at 6491-6535 (the death setup and both respawn branches; the rest of Killed, 6536 onward, was not read). Searched all of `neo/game` for wave, spawn-count and spawn-cap logic (grep for spawnCount-style terms, EV_Spawn, monster spawn counters): no wave director or spawn cap was found in the base game code; this is a grep result, not a read. Other candidates, grep only and not read: `neo/game/Target.cpp` and `neo/game/Trigger.cpp` (their timing keys `wait`, `random`, `delay` are trigger repeat timers, not encounter spawns). Callers of `idPlayer::Kill` were not read. Confidence: high on the timing rules as written. Not read: the idEvent queue (`PostEventSec`/`PostEventMS`), the `neo/d3xp` copies of these files, the game frame loop that calls `Think`, multiplayer spawn-point choice (`MultiplayerGame.cpp`, grep only), and the per-item `respawn` values in the .def files.

## 1. Mechanism

There are two timers. Both are in game milliseconds or seconds, both read their numbers from data.

(a) Player respawn gate. On death the donor arms a minimum wait from the character's `respawn_delay` (seconds, read from spawnArgs): `minRespawnTime = now + delay` (Player.cpp 6528-6529), then `maxRespawnTime = minRespawnTime + 10000` (6530). `idPlayer::Think` calls `EvaluateControls` (6290). In `EvaluateControls` (5672-5678), while `health <= 0`: if the time is past the minimum and the attack button is held, `forceRespawn` is set; otherwise, if the time is past the maximum, `forceRespawn` is set. So the player can respawn early by pressing attack after the minimum, and is always released once the window ends. Single player: `forceRespawn` makes the session take the "died" command (5682-5685). Multiplayer: the code comment says `idMultiplayerGame` decides spawns (5682); that path was not read.

Ragdoll variant: `Killed` checks `StartRagdoll()` (6521). If the ragdoll starts, the minimum is `now + 3000` (RAGDOLL_DEATH_TIME, 6523) and the donor ignores `respawn_delay`; the maximum is still min + 10000 (6524). Otherwise the minimum uses `respawn_delay` (6528-6529).

`Kill(delayRespawn, nodamage)` (6466-6481), for a living player: with `nodamage`, `forceRespawn` is set at once (6471-6473). Otherwise it applies a `damage_suicide` hit (6475), and with `delayRespawn` it clears `forceRespawn` and uses the same minimum and window from `respawn_delay` (6476-6480).

(b) Pickup respawn timer. `idItem::Pickup` (361) gives the item, fires targets, clears its contents, and hides the model (370-381). It then reads the item's `respawn` key (389). In multiplayer, a zero key becomes 20 s (393-395). If the value is non-zero and the item is not dropped and not `no_respawn`, it queues the respawn: an optional FX event at `respawn - 0.5` seconds, then `PostEventSec(&EV_RespawnItem, respawn)` (397-402). Otherwise, if not `inv_objective` and not `no_respawn`, it removes the item after 5000 ms unless `inv_carry` is set (403-407). `Event_Respawn` (544-556) sends the network event on the server, makes the item active and visible, re-enables the trigger contents (552), moves it back to its original origin, plays `snd_respawn`, and cancels any other queued respawn (555).

The respawn is an event that fires once after the delay. Nothing polls it each frame. The player gate is polled once per `Think` call.

## 2. Key functions

- `idPlayer::EvaluateControls`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp` 5672-5686. The release test (minimum plus attack, or the window end) and the single-player hand-off.
- `idPlayer::Kill`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp` 6466-6481. Forced and delayed variants.
- `idPlayer::Killed`, respawn setup: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp` 6519-6530. Ragdoll branch (6521-6524) and the `respawn_delay` branch (6526-6530).
- `idItem::Pickup`, respawn block: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Item.cpp` 389-409.
- `idItem::Event_Respawn`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Item.cpp` 544-556.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Early release on input after a minimum wait; forced release at minimum plus a fixed window | Forced window 10000 ms (theirs, Player.cpp 116) |
| The minimum wait is per-character data | `respawn_delay` in seconds, read from spawnArgs (theirs, Player.cpp 6528); the .def default was not read |
| A replacement death (ragdoll) sets its own fixed minimum | 3000 ms (theirs, Player.cpp 117; used at 6523) |
| Pickup respawn timer, with zero meaning "use the default" | Multiplayer default 20 s (theirs, Item.cpp 394) |
| Dropped and `no_respawn` pickups do not come back | Flags checked at Item.cpp 397; a dropped pickup is removed after 5000 ms (Item.cpp 407) |
| Timer tick base | 60 Hz usercmd rate (theirs, UsercmdGen.h 40); how `gameLocal.time` advances per frame was not read |

## 4. TypeScript sketch

simplified: the sketch covers the two timers as pure functions; the caller schedules the pickup respawn. It omits the ragdoll branch (fixed 3000 ms minimum), the `Kill(nodamage)` path, the single-player "died" hand-off and the multiplayer spawn decision, the respawn FX event, the `inv_objective` and `inv_carry` flags, and the event queue itself. It keeps the donor order: the release test checks the minimum and the input first, then the window end. Milliseconds are whole numbers, truncated as the donor's `SEC2MS` does (the `FtoiFast` helper was not read).

```ts
// Licence: GPL-3.0 (donor COPYING.txt). Clean-room sketch of the mechanism only: respawn gate and pickup respawn timer.
interface DeathState {
  minAt: number; // ms: the earliest moment an attack press may respawn the player
  maxAt: number; // ms: forced respawn moment, whatever the input
}

const RESPAWN_WINDOW_MS = 10000; // forced release this long after the minimum

// Armed at death. delayS is per-character data (donor: spawnArgs "respawn_delay").
function armRespawn(nowMs: number, delayS: number): DeathState {
  const minAt = nowMs + Math.trunc(delayS * 1000);
  return { minAt, maxAt: minAt + RESPAWN_WINDOW_MS };
}

// Checked every tick while dead. True when the player should respawn now.
function respawnDue(state: DeathState, nowMs: number, attackPressed: boolean): boolean {
  if (nowMs > state.minAt && attackPressed) return true;
  return nowMs > state.maxAt;
}

// Pickup respawn timer.
interface PickupDef { respawnS: number; dropped: boolean; noRespawn: boolean; }
type PickupAfter =
  | { kind: "respawn"; afterS: number }
  | { kind: "remove"; afterMs: number }
  | { kind: "keep" };

const MP_DEFAULT_RESPAWN_S = 20;

function pickupAfter(def: PickupDef, isMultiplayer: boolean): PickupAfter {
  let respawnS = def.respawnS;
  if (isMultiplayer && respawnS === 0) respawnS = MP_DEFAULT_RESPAWN_S;
  if (respawnS !== 0 && !def.dropped && !def.noRespawn) return { kind: "respawn", afterS: respawnS };
  if (!def.noRespawn) return { kind: "remove", afterMs: 5000 };
  return { kind: "keep" };
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the respawn timer for a spawn point or a pickup, with `respawn s` and the window as zone data fields, not constants). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn).
- The per-character death gate (minimum wait plus forced window) is death/respawn, parity row 17, and is not claimed by this note.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (the respawn time and the window are zone fields); one ledger (the timer decides, nothing on the client decides a respawn).

Best transferable idea: a respawn gate that releases early on input after a minimum wait and always at minimum plus a fixed window, with the minimum as zone data.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism; do not port the donor lines.
- The donor has no wave director or spawn cap in the base game code (grep only). Row 23's caps and despawn grace have no counterpart here. Do not cite this donor for caps.
- The donor takes the release input from the player's own usercmd (Player.cpp 5675) inside the entity's `Think`. Frankendom's rule is server-verified: the server must decide the release and send the result. How the donor's multiplayer path decides was not read.
- The forced release only sets a flag (`forceRespawn`). What the respawn itself does (spawn point, health reset) was not read, so the donor does not show how it stays on one ledger.
- Item respawn defaults to 20 s only in multiplayer and only when the key is 0. A Frankendom zone field must state its value explicitly and not inherit an implicit default.
- Dropped pickups are removed, not respawned. Frankendom loot dropped by a kill should follow the same rule so that dropped loot is not a respawning spawn point (loot ownership is row 18).
- The `neo/d3xp` copies of these files were not read; the expansion may differ.
