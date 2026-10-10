# DCurrent-openbor (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` | Licence: BSD-style 3-clause (engine/LICENSE: Senile Team / OpenBOR Team; redistribution with notice, no-endorsement clause; read) | C | symbol `update_scroller` (spawn director block) + `smartspawn`

Checked: Read the director block in `update_scroller` (starts 49989; spawn block 50030-50143), `smartspawn` (49512-~49665), the level-file parse cases (`group` 24856, `wait` 24789, `2pspawn` 24897, `health` 24953, `at` 25115), `count_ents` (34614) and the outer tick loop (51538-51604). Confidence: high on the director and queue; not read: `spawn()` beyond the slot-eviction test at 28651, `findent`, the remaining branches of `update_scroller` (music, palette, shadow markers are only noted), and how the scroll position `level->pos` is derived beyond 50254 (not read in full).

Best transferable idea: a zone is an ordered queue of timed/positioned markers plus two numbers, groupMin (refill trigger) and groupMax (fill ceiling); the director spawns only when live enemies fall below groupMin and stops at groupMax, so pacing comes from data, not code.

## 1. Mechanism

- Every level (a "zone") loads into a flat array of markers (`level->spawnpoints`), each with an `at` value (a scroll position). A marker is one of: a spawn (an enemy entry with optional per-player-count health), a `wait` marker, a `group` marker (new groupmin/groupmax), or presentation changes (music, palette, shadow: not read in detail). The parser builds one marker, then the `at` command copies it into the array and clears the scratch entry (25117-25126). Defaults at level load: cursor 0, groupmin 100, groupmax 100 (23907-23909).
- Each logical tick `update_scroller` runs the director (49989). Order: (a) if the cursor is past the last marker AND no live enemy AND a player is alive, the level is complete (50030); (b) otherwise, only if live enemies < groupmin (50037), loop: while live enemies < groupmax AND the cursor is inside the array AND the progress position has reached the marker's `at` (50039-50041), consume the marker at the cursor. (c) A `wait` marker sets `level->waiting` (50057), which stops scrolling (50191) until no enemies are left (50175). A `group` marker overwrites groupmin/groupmax (50060). A plain spawn calls `smartspawn` (50140). (d) The cursor advances after every marker, including ones `smartspawn` refused (50142).
- `smartspawn` per entry: it returns nothing if `spawnplayer_count >= max(1, live players)` (49528), so a "2P-only" enemy (count 1) is skipped when one player is present and a boss that is skipped also decrements the level boss count (49532). Health comes from a per-player-count array indexed by player count - 1 (49577), where the level file's `health` fills all four slots (24954) and `2phealth` fills slots 1-3 (24958). Other overrides (score, alias, colour map, weapon, item carry) are in the same function (read, not itemised).
- Live enemies are counted by `count_ents`, which ignores corpses (34621), so a dying enemy stops counting before its body is removed.
- Hard entity cap: `spawn()` reuses a free slot; once `ent_count >= spawnoverride` (default 999999, line 60) it evicts an existing entity whose `priority` is negative and not above the new model's priority (28651). Only that one test was read.
- Tick: the loop is a fixed-step catch-up. `update` computes a wall-clock `interval` in ticks (clamped to game_speed/4 = 50 ticks at the 200 default, 50819, openbor.h 80), sets `newtime = _time + interval`, and runs the body `while(_time < newtime)` (51538), calling `update_scroller` each pass (51547) and `++_time` at the end (51604). So the director runs once per fixed logical tick, including catch-up ticks.

## 2. Key functions

- `update_scroller` (spawn director block): `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 49989 (entry), 50030 (complete test), 50037-50143 (director loop), 50170-50177 (wait release), 50191 (scrolling gate).
- `smartspawn`: same file 49512-~49665 (read to its close). Player-count gate 49528, health 49575-49577.
- Level parse: same file 24789 (`wait`), 24856-24868 (`group`), 24897-24907 (`2pspawn`, `3pspawn`), 24953-24960 (`health`), 25115-25128 (`at`).
- `count_ents`: same file 34614-34624.
- Outer loop: same file 51538-51604.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ordered marker queue with a cursor; entries released by position | `at` is a scroll position in pixels (theirs) |
| Refill only below groupMin, fill up to groupMax | Defaults 100/100 (theirs, 23908-23909); group command clamps groupmax to at least 1 and groupmin<1 becomes 100 (24859-24866) |
| `wait` marker holds progress until the field is clear | None |
| Skip-by-player-count gate and per-player-count health | Four slots (MAX_PLAYERS 4, theirs) |
| Counting ignores corpses | None |
| Slot eviction by priority at a cap | spawnoverride 999999 (theirs, line 60, effectively off) |
| Fixed-step catch-up | 200 ticks/s, 50-tick clamp (theirs) |

## 4. TypeScript sketch

simplified: shows the queue, groupMin/groupMax gating, wait and group markers, the player-count skip (donor `spawnplayer_count` N means minPlayers N+1) and per-player-count health. Omits music/palette/shadow markers, boss counting, item carry, scripts, level-complete, entity-slot eviction and scroll-position derivation. As in the donor, the cursor advances even when a marker is skipped, and a `wait` does not stop the same pass from consuming later markers.

```ts
// Licence: BSD-style (donor). Sketch written from the described mechanism; if code is ever adapted, keep the donor copyright notice.
type Marker =
  | { kind: 'spawn'; at: number; archetype: string; minPlayers: number; hp?: readonly number[] }
  | { kind: 'wait'; at: number }
  | { kind: 'group'; at: number; groupMin: number; groupMax: number };

interface Director {
  queue: Marker[];          // sorted by `at`, consumed in order
  cursor: number;
  groupMin: number;         // refill only when live < groupMin
  groupMax: number;         // fill up to this many
  waiting: boolean;         // blocks progress until the field is clear
}

interface World {
  progress: number;                         // scroll position / player progress
  liveEnemies(): number;                    // corpses excluded
  players(): number;
  spawn(archetype: string, hp: number | undefined): void;
}

function directorTick(d: Director, w: World): void {
  if (d.waiting) {
    if (w.liveEnemies() === 0) d.waiting = false;
    return;
  }
  if (d.cursor >= d.queue.length) return;            // queue done
  if (w.liveEnemies() >= d.groupMin) return;         // enough on the field
  while (
    w.liveEnemies() < d.groupMax &&
    d.cursor < d.queue.length &&
    w.progress >= d.queue[d.cursor]!.at
  ) {
    const m = d.queue[d.cursor]!;
    if (m.kind === 'wait') d.waiting = true;
    else if (m.kind === 'group') { d.groupMin = m.groupMin; d.groupMax = m.groupMax; }
    else if (w.players() >= m.minPlayers) {
      const n = Math.max(1, w.players());
      w.spawn(m.archetype, m.hp ? m.hp[Math.min(n, m.hp.length) - 1] : undefined);
    }
    d.cursor++;                                       // advances even if skipped
  }
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (engine logic) with numbers as zone data fields; the marker/queue shape is also usable as an encounter script for `src/fight/encounter.ts` (new). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with grace timer).
- today: not checked in this pass.
- Reuse tag: adapt (BSD-style; shape reused, written fresh)
- Brief rule served: zones as data on one runtime; many-on-one pacing capped by MAX_ATTACKERS = 3 is a separate rule (7-9 n/a)

## 6. Gaps and risks

- The donor is a side-scroller where `at` is a scroll position. Frankendom zones are not scrolled; `at` would become zone-progress or a trigger event, which is a design change, not a port.
- It is a one-shot level script (queue consumed once, no respawn, no despawn on empty, no grace timer). Row 23 also needs respawn s, grace s and coverage; the donor has none of these. Only the cap/refill gating transfers.
- groupMax is a count of live enemies in the whole level; Frankendom's per-fight attacker cap (MAX_ATTACKERS = 3) is a different, engine-side rule and must not be replaced by groupMax.
- `wait` and `group` are interleaved with presentation markers in one array; Frankendom should keep presentation (music, palette) out of the engine queue (camera/HUD/sound are client-only).
- Skipped markers are consumed for good, so a 1-player run permanently loses 2P-only entries; fine for data-driven scaling, but the zone data must say so.
- Kills and spawn state must be server-verified; the donor is a single-process game with no authority split (not applicable here).
