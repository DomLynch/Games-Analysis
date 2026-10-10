# OpenDUNE-OpenDUNE (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/explosion.c` (with `src/explosion.h` and `src/table/explosion.c`) | Licence: GPL-2.0 (README line 8: "licensed under the GNU General Public License version 2.0"; COPYING is the GPL, version 2, June 1991) | C | symbol `Explosion_Tick`

Checked: `src/explosion.h` read in full (1-83). `src/explosion.c` read in full (1-365). `src/table/explosion.c` read at 1-60, 240-256, 355-380, and the table names listed by grep. `src/timer.c` 37, 258-290 (Timer_Init only), 361-365 read. `src/opendune.c` 1168 read by grep. `src/gui/gui.c` 4566-4578 read. `src/map.c` 470-515 and 636-648 read (the function header of Map_MakeExplosion was not read). `src/unit.c` 1520-1573 read. `src/structure.c` 1039-1093 read. README 8-9 and COPYING line 1 read. Not read: `Timer_Add` internals, `sleepIdle` and `msleep` (os/sleep), `Video_SetOffset`, `Tools_RandomLCG_Range`, `Animation_Start`, and the GUI function that calls `Explosion_Tick` (so its call frequency is unknown). Topic fit, stated plainly: the donor has no blood, gore, wound or finisher code. Its effects are explosions, impact puffs, a screen shake and craters; those are the closest match. Confidence: high on the command order, the timeouts and the pool rule. High on the scheduler-gate arithmetic, which was traced by hand and not run. Medium on what a player would see per frame, because the call frequency is not read.

Best transferable idea: a finisher or hit effect is a short data list of timed steps (sprite, wait, shake, decal, stop) run by one shared 60 Hz clock from a fixed slot pool.
Decision (proposed): adapt - take the command-list shape, the replace-on-same-tile rule and the bounded pool, but make the shake non-blocking, count refused effects, and keep decals as a separate tunable step with no gameplay side effects. Why: finishers and hit impacts are client presentation with designer-tuned timing, so one list per finisher fits zones as data; the donor's blocking shake and silent refusal would stall a phone frame and hide load.
Acceptance: a finisher plays as a fixed list of timed steps at 60 Hz (flash, hold, shake, decal stamp, stop); a client test asserts each step fires within one tick of its data time, a 33rd concurrent effect is refused and counted, and no step blocks the frame.

## 1. Mechanism

- Data. Each effect type is a fixed array of command and parameter pairs (`src/table/explosion.c` 7-400; the array of arrays is `g_table_explosion`, 379-400, indexed by type). The commands are STOP, SET_SPRITE, SET_TIMEOUT, SET_RANDOM_TIMEOUT, MOVE_Y_POSITION, TILE_DAMAGE, PLAY_VOICE, SCREEN_SHAKE, SET_ANIMATION and BLOOM_EXPLOSION (`src/explosion.h` 42-53).
- Start (`Explosion_Start`, `src/explosion.c` 282-313): an unknown type is rejected (288). Any effect already running on the same tile is stopped first (291-293). The first free slot of 32 is taken (295-300). The slot gets the command array, `current = 0`, sprite 0, the position, and `timeOut = g_timerGUI` so the first command is due now (305-307). The shared gate `s_explosionTimer` is reset to 0 (308), and the tile is marked (309). If no slot is free, the loop ends and nothing is started, with no message (295-312).
- Tick (`Explosion_Tick`, 318-358; called from `src/gui/gui.c` 4574). If the shared gate is in the future, return (322). Otherwise push the gate 10000 units ahead (323). For each live slot whose time-out has passed (332), read the command at `current`, advance `current` (333-336), and run it (338-350). Then, if the slot is still live and its time-out is not after the gate, set the gate to that time-out (354-356). Traced by hand: because the gate only moves down inside the loop, the gate ends the call as the earliest pending time-out among live effects. With no live effects, the gate stays 10000 units ahead until the next Start resets it to 0.
- Time units. `g_timerGUI` is incremented once per timer tick (`src/timer.c` 361-363). The timer is added at 1000000 / 60 microseconds (`src/opendune.c` 1168), so one unit is 1/60 s. SET_TIMEOUT stores now plus the value (223). SET_RANDOM_TIMEOUT stores now plus a random value in a range from 0 to the value (233).
- Stop (`Explosion_Func_Stop`, 205-214): clear the tile flag (209), refresh the tile (211), and drop the command array (213).
- Per-effect numbers, from the tables:
  - Small impact (type 0, table 8-15): sprite 153, wait 3 ticks, bloom check, sprite 153, wait 3 ticks, stop. Total 6 ticks, 0.1 s.
  - Large impact (type 2, table 30-39): sprite 183, voice 50, bloom check, tile damage, wait 15, sprite 184, wait 15, stop. Total 30 ticks, 0.5 s.
  - Structure (type 14, table 245-256 read; the rest of the list was not read): a random wait of up to 60 ticks first, then a sprite, a voice, a timed sequence and a screen shake.
  - Spice bloom tremor (type 19, table 360-377): sprite 156, voice 40, shake, wait 7, shake, sprite 157, wait 3, shake, sprite 158, wait 3, shake, sprite 157, wait 3, shake, tile damage, stop. Total 16 ticks, about 0.27 s, with five shakes.
- Shake (`Explosion_Func_ScreenShake`, 124-150). The function loops twice. Each loop waits, sets the display offset to 320, waits again, and sets it to 0. The waits are four `sleepIdle()` calls per loop off Windows, or two `msleep(30)` per loop on Windows, which is about 120 ms per shake call. The call blocks the game loop while it runs.
- Who starts impacts (read, not traced to the top): `Unit_Damage` (`src/unit.c` 1530-1573) lowers hit points with a floor at 0 (1544-1548). If hit points reach 0, the unit dies and the function returns (1554-1568), so the hit-impact call is not made on that path. If the unit survives and `range != 0`, it calls `Map_MakeExplosion` with SMALL when damage is under 25, else MEDIUM (1571-1573). `Structure_Damage` (`src/structure.c` 1039-1093): a structure that reaches 0 is destroyed (1055-1087) and plays a sound with no explosion on that path. A structure that survives a hit with `range != 0` gets a LARGE impact at its layout centre (1090-1092). `Map_MakeExplosion` (`src/map.c`) calls `Explosion_Start` at 512.
- Crater decal (`Explosion_Func_TileDamage`, `src/explosion.c` 49-107, the TILE_DAMAGE command). It does nothing on structure or destroyed-wall tiles (68), on landscape with no crater type (77), or on veiled tiles (64, 81). If the tile already has a crater in the crater icon range (86), the index is moved down by the range base and gets +2 if it was below 4 (88-89). Otherwise a new crater is chosen at random, index 0 or 1 (92). It also removes one unit of spice (96), explodes a bloom if one is on the tile (99-101), and writes the new crater (105-106).

## 2. Key functions

- `Explosion_Start`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/explosion.c` 282-313. Reject unknown type, same-tile stop, slot take, gate reset.
- `Explosion_Tick`: same file, 318-358. Gate check and push (322-323), one command per due slot (332-350), gate lowering (354-356).
- `Explosion_Func_ScreenShake`: same file, 124-150 (the blocking shake).
- `Explosion_Func_TileDamage`: same file, 49-107 (craters).
- `Explosion_StopAtPosition` and `Explosion_Func_Stop`: same file, 252-270 and 205-214.
- Command and state types: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/explosion.h` 42-74 (the command enum and the slot struct).
- Effect tables: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/table/explosion.c` 7-400.
- Callers: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/unit.c` 1530-1573; `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/structure.c` 1039-1093; `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/map.c` 512 and 646.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| An effect is a data list of timed steps; a step either acts now or sets when the next step is due | The command set (explosion.h 43-52) (theirs) |
| One shared clock; the gate is the earliest due time among live effects | 60 Hz clock (opendune.c 1168) (theirs); the 10000-unit push (explosion.c 323) (theirs, internal) |
| Bounded pool; a full pool refuses a new start | 32 slots (explosion.h 7) (theirs) |
| A new effect on the same tile stops the old one first | None (the rule, explosion.c 291-293) |
| Screen shake as two loops of a display-offset flip | Offsets 320 and 0, two loops (explosion.c 134-148) (theirs; blocking) |
| Impact size chosen by a damage threshold | 25 (unit.c 1572) (theirs) |
| Crater grows on repeat, random on first hit | +2 when the index is below 4 (explosion.c 89); index 0 or 1 at random (92) (theirs) |

## 4. TypeScript sketch

simplified: keeps the donor's order: same-key stop before the slot check, one step per due effect per tick, a wait sets the next due time, and an effect ends at its stop or when its list runs out. It differs in four ways. It replaces the donor's shared gate (the 10000-unit push and the earliest-time-out trick) with a per-tick scan, which is simpler and is what the gate is for. The shake is a non-blocking hook, where the donor's shake blocks. A refused start is counted, where the donor drops it silently. The random range is assumed inclusive, because the donor's LCG range was not read. The crater rule and the spice and bloom side effects are left out on purpose.

```ts
// Licence: GPL-2.0 (donor). Clean-room: shape only, written from the described mechanism; no donor lines reproduced.
export type Step =
  | { kind: "sprite"; id: number }
  | { kind: "wait"; ticks: number }
  | { kind: "randomWait"; maxTicks: number }
  | { kind: "shake"; cycles: number }
  | { kind: "decal" }
  | { kind: "stop" };

export interface Hooks {
  sprite(id: number): void;
  decal(): void;
  shake(cycles: number): void; // must not block; the render loop plays it
}

interface Running {
  key: string;
  steps: readonly Step[];
  index: number;
  dueTick: number;
  done: boolean;
}

export class EffectRunner {
  private readonly active: Running[] = [];
  private refusedCount = 0;

  constructor(
    private readonly maxActive: number,
    private readonly randomUpTo: (max: number) => number, // assumed inclusive; donor LCG range not read
  ) {}

  get refused(): number {
    return this.refusedCount;
  }

  // Starts an effect. An effect already running on the same key is stopped first.
  start(key: string, steps: readonly Step[], now: number): boolean {
    for (const e of this.active) {
      if (e.key === key) e.done = true;
    }
    const live = this.active.filter(e => !e.done).length;
    if (live >= this.maxActive) {
      this.refusedCount += 1; // refused and counted, never silently dropped
      return false;
    }
    this.active.push({ key, steps, index: 0, dueTick: now, done: false });
    return true;
  }

  // Run once per 1/60 s tick. Each effect runs at most one step per call.
  tick(now: number, hooks: Hooks): void {
    for (const e of this.active) {
      if (e.done || e.dueTick > now) continue;
      if (e.index >= e.steps.length) {
        e.done = true;
        continue;
      }
      const step = e.steps[e.index++];
      switch (step.kind) {
        case "sprite": hooks.sprite(step.id); break;
        case "wait": e.dueTick = now + step.ticks; break;
        case "randomWait": e.dueTick = now + this.randomUpTo(step.maxTicks); break;
        case "shake": hooks.shake(step.cycles); break;
        case "decal": hooks.decal(); break;
        case "stop": e.done = true; break;
      }
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].done) this.active.splice(i, 1);
    }
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/finisher.ts` (new; client-only sequencer for finisher and hit steps). The engine decides the kill and sends a start event with a key and a step list id. The client plays the steps and never changes engine state. Parity-checklist row 9 (finishers). The hit-impact choice by damage (unit.c 1572) is the same idea for row 10 and is noted, not written up here.
- today: not read (no Frankendom source was opened in this task).
- Reuse tag: rewrite-from-idea (GPL-2.0: clean-room, shape only; no table, function body or constant copied as code; the step lists are ours)
- Brief rule served: 1 (one engine: the engine owns the kill and the start event; the sequencer is client presentation); "zones as data" (the step lists are data); rules 7-9 n/a

## 6. Gaps and risks

- The donor's shake blocks the game loop: it sleeps inside the command (explosion.c 134-148). About 120 ms per call on Windows, and the tremor makes five calls (table 363-374). Frankendom must make the shake a timed offset in the render loop, as the sketch does.
- A refused start is silent (explosion.c 295-312). Frankendom must count it and test the count, as the sketch does.
- The shared gate (explosion.c 308, 322-323, 354-356) is subtle. Its correctness depends on the reset in Start, the 10000-unit push and the earliest-time-out trick. A port that gets one of these wrong will sleep through effects or run them late. The sketch uses a per-tick scan (at most 32 slots) instead, which we should test rather than copy the gate.
- Time units are 1/60 s on the donor's GUI timer (timer.c 361-363; opendune.c 1168). Frankendom must pick one clock for finishers (the fight tick or the render frame) and test that the step times hold on a phone at a lower frame rate.
- A death does not use the hit impact (unit.c 1554-1568 returns before 1572). The death effect is a separate start in the donor and was not traced further (not read). Frankendom should keep the finisher and the hit impact as separate effect starts.
- The crater rule changes the map and removes spice (explosion.c 96). For us a decal is a client overlay only and must never change gameplay state. The reusable part is the grow-on-repeat rule (explosion.c 86-92), which we should test as a pure function.
- Random timeouts use a LCG range (explosion.c 233) that was not read. The sketch assumes the range is inclusive.
- Licence: GPL-2.0. Clean-room only. The sketch and the step lists are written from the described mechanism; no donor line, table or constant is copied as code.
- Not read: the GUI function that calls `Explosion_Tick` (frequency), `Timer_Add` internals, `sleepIdle`, `msleep`, `Video_SetOffset`, `Tools_RandomLCG_Range`, `Animation_Start`, and `Map_MakeExplosion`'s own header and damage branch beyond what is listed.
