# id-Software-DOOM (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_mobj.c` (with `p_tick.c`, `p_setup.c`, `d_net.c`, `g_game.c`, `m_random.c`, `p_local.h`, `doomdef.h`) | Licence: UNCLEAR. The source headers (p_mobj.c line 9, p_tick.c line 9) say "only under the terms of the DOOM Source Code License as published by id Software. All rights reserved." The donor README.TXT (line 81) says "Licensed under the GNU General Public License 2.0.", and LICENSE.TXT is the GPL v2 text. Treated as unclear: clean-room, shape only | C | symbol `P_RespawnSpecials`

Checked: `P_RespawnSpecials` (p_mobj.c 578-631, read in full); `P_RemoveMobj` queue push (p_mobj.c 546-570, read in full); `P_NightmareRespawn` (p_mobj.c 354-409, read in full); the dead-monster branch of the thinker (p_mobj.c 440-470, read); `P_SpawnMapThing` skill and multiplayer filter (p_mobj.c 704-750, read to the skill check; the rest 750-800 not read); `P_LoadThings` monster filter (p_setup.c 299-346, read); `P_Ticker` (p_tick.c 130-157, read); `TryRunTics` (d_net.c 636-700 and 736-748, read in part: the start, the `counts` loop head and the per-tic `G_Ticker` call; the rest not read); `G_Ticker` definition (g_game.c 605, not read in full); `P_Random` (m_random.c 31, 57-60; table counted by me on the VPS); skill constants (doomdef.h 122, 138-154; the MTF bit values at 140-142). Candidates opened: p_mobj.c, p_tick.c, p_setup.c, d_net.c, g_game.c, m_random.c, doomdef.h, p_local.h (grep). Callers: `P_RespawnSpecials` is called once (p_tick.c 154); `P_NightmareRespawn` is called once (p_mobj.c 470); `P_RemoveMobj` is called from p_mobj.c 65 and 408 (the second is the nightmare path, which removes a corpse, not an item). Not read: `P_CheckPosition`, `P_SpawnMobj`, `P_RunThinkers`, the bodies of `G_ExitLevel` and `G_SecretExitLevel` (g_game.c 1002, 1009), the call sites in p_spec.c 679 and 762 and p_enemy.c 1755 and 1898 (grep only). Confidence: high for the respawn queue and corpse respawn order; medium for the tic driver (outer loop not read). camera_scope: n/a (not a camera topic).

## 1. Mechanism

- Driver. `P_Ticker` (p_tick.c 130-157) is the body of one game tic: player think, thinkers, specials, then `P_RespawnSpecials()` (154), then `leveltime++` (157). The tic rate is a fixed 35 per second (doomdef.h 122). `TryRunTics` (d_net.c 648-670) measures how many tics of wall-clock time have passed (`realtics`), caps them by the tics the network has available, and then loops `counts` times (736) over a loop of `ticdup` iterations (738) that calls `G_Ticker` (745). So the world advances in fixed tics; `leveltime` is the clock every timer below reads. The outer loop that runs `counts` tics was not read in full.
- Item respawn (deathmatch only). When a pickup is removed, `P_RemoveMobj` (p_mobj.c 553-559) pushes its spawn point and the current `leveltime` into a ring of `ITEMQUESIZE` slots. The ring is written at the head; if the head catches the tail, the tail advances, so the oldest entry is dropped. Dropped pickups (MF_DROPPED) and the two inventory types (MT_INV, MT_INS) are not queued (the condition is on p_mobj.c 548-552, read).
- `P_RespawnSpecials` (p_mobj.c 578-631) runs once per tic. It returns unless `deathmatch == 2` (591), the ring is non-empty (595), and the oldest entry has waited at least 30*35 tics (599). It then spawns a teleport-fog effect and the item at the stored spawn point, with ceiling or floor height by its flag, copies the spawn point into the new object, and advances the tail (630). At most one item respawns per tic. The code read has no check that the spawn point is free (578-631).
- Monster respawn (nightmare or `-respawn`). Only in the dead branch of the thinker (p_mobj.c 453-470): the object must count as a kill (453) and `respawnmonsters` must be set (456; set in g_game.c 1416-1417 by the nightmare skill or the `-respawn` parameter). Then `movecount` grows by one each tic (459). The respawn check waits until `movecount >= 12*35` (461), runs only when `leveltime & 31` is zero (464), and passes only when `P_Random() <= 4` (467). Then `P_NightmareRespawn` (357-409) checks the spawn point with `P_CheckPosition` (370). If something stands there, it returns and the corpse stays; the timer keeps counting, so it tries again at a later check. If the point is free, it spawns a fog at the old and new spots, spawns the same monster type at the spawn point, sets the ambush flag from the spawn options (402), and removes the corpse (408).
- Spawn table per zone. `P_LoadThings` (p_setup.c 301-346) sets spawn false for ten monster types unless the game is the commercial mode (318-332), and then `if (spawn == false) break;` (336-337) leaves the whole loop, not just that thing, so the first such thing aborts loading of every later thing in the lump (a donor defect, see section 6), then hands each thing to `P_SpawnMapThing` (346). `P_SpawnMapThing` (p_mobj.c 740-750) drops a thing marked for multiplayer only when the game is single player (740). Otherwise the thing spawns only if its option bits include the skill tier: baby uses bit 1 (743-744), nightmare uses bit 4 (746), and other skills use `1 << (skill - 1)` (748). So the five skill levels map onto three tier flags, which the code reads as easy 1, normal 2, hard 4 (doomdef.h 140-142 is where the values are; not quoted).
- Transitions. `G_ExitLevel` (g_game.c 1002) and `G_SecretExitLevel` (1009) are the exits. They are called from p_spec.c 679 and 762 and from p_enemy.c 1755 and 1898; the functions containing those call sites were not read, so what triggers each exit is not claimed beyond the call.

## 2. Key functions

- `P_RespawnSpecials`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_mobj.c` 578-631. The item ring pop and the once-per-tic respawn.
- `P_RemoveMobj` queue push: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_mobj.c` 546-570. The ring push and drop-oldest rule.
- Dead-monster branch of the thinker: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_mobj.c` 440-470. Corpse timer, check period and roll.
- `P_NightmareRespawn`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_mobj.c` 354-409. Occupancy check, fog, spawn, corpse removal.
- `P_SpawnMapThing` skill filter: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_mobj.c` 704-750. Multiplayer-only bit and skill tier bits.
- `P_Ticker`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_tick.c` 130-157. The per-tic body.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Bounded FIFO of removed spawn points, drop oldest when full | Ring of 128 slots, so 127 entries are kept (theirs, p_local.h 99; p_mobj.c 558-559) |
| Respawn the oldest entry only after a delay, at most one per tick | Item delay 30*35 tics = 1050 tics, which is 30 s at 35 tics per second (theirs, p_mobj.c 599; doomdef.h 122) |
| Corpse timer that only counts while the respawn flag is on | 12*35 = 420 tics, 12 s (theirs, p_mobj.c 461) |
| Check on a fixed beat rather than every tic | Every 32 tics: `leveltime & 31` (theirs, p_mobj.c 464) |
| Probability roll per check | Pass when `P_Random() <= 4`. The table has 256 entries (theirs, m_random.c 31); I counted 6 of them at or below 4 on the VPS, so the pass rate is about 6/256 = 2.3% if the index visits every entry once per cycle (my count, not the donor's). The table is not a permutation: it has 166 distinct values |
| Retry while the spot is occupied | Stay dead and try again at the next check (theirs, p_mobj.c 370) |
| Five difficulty levels on three tier flags | Baby and easy share bit 1; medium bit 2; hard and nightmare share bit 4 (theirs, p_mobj.c 743-748) |
| Respawn switched on by difficulty or a run flag | Nightmare or `-respawn` (theirs, g_game.c 1416-1417) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the queue pops only its oldest entry and only when that entry has waited long enough; a corpse counts only while the respawn flag is on, checks every 32 tics, takes the roll, and then asks whether the spot is free. It omits the deathmatch-only gate on items, the teleport fog and sounds, the ambush and reaction-time fields, the monster-type table, the head/tail ring indices (it uses an array with a length cap, which gives the same 127 entries), the tic driver, and the exit functions. The occupancy check is in the sketch for corpses only, because the donor's item path has none.

```ts
// Licence: unclear (donor source headers cite the DOOM Source Code License; the donor README and LICENSE.TXT say GPL-2.0). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SpawnPoint { x: number; y: number; kind: string; }

const TIC_RATE = 35;                      // tics per second
const ITEM_RING = 128;                    // ring slots; one slot is always kept free, so 127 entries
const ITEM_DELAY = 30 * TIC_RATE;         // tics an item waits before it may respawn
const CORPSE_DELAY = 12 * TIC_RATE;       // tics a corpse waits before it may respawn
const CORPSE_CHECK_MASK = 31;             // corpses are checked every 32 tics

interface Removed { at: SpawnPoint; removedTic: number; }

// FIFO of removed pickups. Oldest entries are dropped when the ring is full.
export class ItemRespawnQueue {
  private q: Removed[] = [];

  push(at: SpawnPoint, nowTic: number): void {
    this.q.push({ at, removedTic: nowTic });
    if (this.q.length > ITEM_RING - 1) this.q.shift();   // drop oldest
  }

  // Called once per tic. Respawns at most one item: the oldest, and only once it has waited long enough.
  tick(nowTic: number, spawn: (at: SpawnPoint) => void): void {
    const oldest = this.q[0];
    if (!oldest) return;
    if (nowTic - oldest.removedTic < ITEM_DELAY) return;
    this.q.shift();
    spawn(oldest.at);
  }
}

export interface Corpse {
  spawn: SpawnPoint;
  countsAsKill: boolean;
  waitedTics: number;      // grows each tic while the corpse lies dead
}

// Per-tic check for one dead monster. roll() returns 0..255. Returns true when the monster should come back now.
export function corpseRespawnDue(
  c: Corpse,
  nowTic: number,
  respawnOn: boolean,
  spotFree: (s: SpawnPoint) => boolean,
  roll: () => number,
): boolean {
  if (!c.countsAsKill || !respawnOn) return false;
  c.waitedTics += 1;
  if (c.waitedTics < CORPSE_DELAY) return false;
  if ((nowTic & CORPSE_CHECK_MASK) !== 0) return false;
  if (roll() > 4) return false;            // about 6 of 256 table entries pass
  return spotFree(c.spawn);                // occupied: stay dead, try again at the next check
}

// Difficulty tiers: five skill levels share three spawn flags (1 easy, 2 normal, 4 hard).
export function spawnsAt(thingBits: number, skill: 0 | 1 | 2 | 3 | 4, netgame: boolean): boolean {
  if (!netgame && (thingBits & 16) !== 0) return false;   // multiplayer-only thing
  const bit = skill === 0 ? 1 : skill === 4 ? 4 : 1 << (skill - 1);
  return (thingBits & bit) !== 0;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: respawn of removed spawn points through a bounded queue, and the corpse respawn check with its occupancy retry). Parity-checklist row 23 (zone population: respawn). Row 23 names respawn, so this is a direct fit.
- Also relevant to the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3): the queue releases at most one item per tic, and the tic is fixed at 35 per second. I did not name it as the row.
- today: not checked in the Frankendom repo (not read).
- Reuse tag: rewrite-from-idea (licence unclear; clean-room only)
- Brief rule served: zones as data on one runtime (delays and queue size are zone data); server-verified outcomes (the queue and the roll run on the server, and every drop and respawn goes to the one ledger)

## 6. Gaps and risks

- Licence unclear. The headers say DOOM Source Code License, the README and LICENSE.TXT say GPL-2.0. Clean-room, shape only; do not copy lines or constants as code. The timing constants are game numbers (30 s, 12 s), not copyrighted expression.
- No occupancy check on items. The code read has no spawn-spot check in `P_RespawnSpecials` (578-631). A pickup can reappear on a player's feet. Frankendom must check the spot or defer the item.
- Corpses wait on an occupied spot without limit. A player standing on the spawn point holds the monster dead indefinitely. Frankendom needs a timeout or relocation rule, and the test must cover it.
- Silent drops. When more than 127 pickups are pending, the oldest is dropped with no record (559). Frankendom's one ledger should record the drop.
- The roll is a table, not a uniform random draw. The table has 166 distinct values across 256 entries (my count). Frankendom should use its seeded server RNG and state the pass rate as data. Do not assume 6/256 carries over.
- Deathmatch-only gate. The item queue runs only in deathmatch mode 2 (591). Frankendom has no deathmatch; the zone data must decide whether a zone respawns pickups.
- Fixed-tic driver. The timers read `leveltime`, which advances in the fixed tic (p_tick.c 157). That matches the server tick rule (fixed step), but the outer loop of `TryRunTics` was not read, so catch-up behaviour is not claimed here.
- Effects (fog, sounds) are client cues. In Frankendom they are client-only; the server only decides the spawn.
- Donor defect (P_LoadThings, p_setup.c 336-337): after the non-commercial filter sets spawn false, the code does `break` instead of `continue`, so the first filtered thing ends the loop and all later things are never spawned. Keep the idea (filter a spawn table by game mode); fix: use `continue` so only the filtered thing is skipped. Any Frankendom filter by mode or tier must skip the entry, never stop the load.

Best transferable idea: a bounded FIFO respawn queue of spawn points with a removal timestamp, that respawns at most one entry per tick and only once the oldest has waited long enough.
Decision (proposed): adapt - take the bounded FIFO, the one-per-tick release and the retry-while-occupied rule for corpses; drop the deathmatch-only gate, the unchecked item spawn, and the table roll. The server records every drop and respawn in the one ledger.
Acceptance: a server test: removing 130 pickups in a zone leaves 127 queued and logs the drop of the oldest three; the first respawn happens no earlier than the zone's delay after the oldest removal (donor value 1050 tics); no tick respawns more than one pickup; a respawn whose spawn point holds a player is deferred, not dropped.

Reuse tag: rewrite-from-idea (licence unclear; clean-room only)
Brief rule served: zones as data on one runtime; server-verified outcomes

## Checker findings

- Verdict: MINOR
- Corrected: P_LoadThings bullet no longer says the filter just skips types: it states the break out of the whole loop (336-337); recorded as a donor defect with the fix (continue)
- Missed (also added to section 6): P_LoadThings break instead of continue (donor defect, fix: continue)
