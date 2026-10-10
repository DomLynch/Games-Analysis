# DCurrent-openbor (camera, cell 14)

Donor: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` | Licence: BSD-style (LICENSE: "Redistribution and use in source and binary forms, with or without modification, are permitted provided that the followi..."; the full conditions were not read, confirm before copying code) | C | symbol `update_scroller`

Checked: `update_scroller` starts at 49989; read 49989-50062 (setup and spawn loop opening), 50100-50262 (spawn tail, player box, wait, right-scroll branch). The left, up and down branches (50263-50440+) were not read; they repeat the same shape by their grep hits (not read).

## 1. Mechanism

- This is a side-scrolling beat-'em-up (up to 4 players), and the "camera" is a single number pair, `advancex` and `advancey`, the left and top edge of the screen in level coordinates. `update_scroller` is called once per game step and moves them.
- Gate: it returns at once if the next allowed update time has not arrived or all animations are frozen (50000-50003); otherwise it stamps the time (50013). It also returns if the level is completed (a few lines after 50013).
- Target: it builds a box around all living players (`lm` leftmost, `rm` rightmost x, `tm`/`bm` for z), 50150 onward. The camera target is the middle of that box minus half the screen width plus a level offset `cameraxoffset` (50204). If the players are spread wider than the screen, the target stays where the camera already is (50198-50200), so it does not chase a split party.
- Clamp: the target is limited to the level's allowed scroll range (50207) and, when scrolling back is allowed, to a "blockade" (50216).
- Speed limit: the camera moves toward the target by at most `scrollspeed` units per update (50223-50225); `scrollspeed` defaults to 1 (24161) and levels can set it. There is no ease or lerp; speed is a hard cap.
- Wait gate: the whole move is skipped while `level->waiting` is set (50191). A level event sets `waiting` when a spawn point is marked "wait" (50057). It clears only when no enemies remain (50170-50180) and starts a 3-second "go" timer (50180). So the screen locks until the player clears the encounter.
- Encounters are driven by the same scroll position: spawn points have an `at` position and an enemy is created only when the scroll position reaches it (`level->pos >= spawnpoints[current_spawn].at`) and the number of live enemies is under a group maximum, refilling while below a group minimum (50037-50041). The spawn loop advances `current_spawn` (50142). Level end is reached when all spawns are used and no enemy remains.

## 2. Key functions

- `update_scroller`: `engine/openbor.c` 49989-50440+ (read in parts above). The whole camera and encounter gate.
- Scroll globals: `engine/openbor.c` 317-323 (`advancex`, `advancey`, `scrolldx`, `scrolldy`, `scrollminz`, `scrollmaxz`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Camera target = centre of the living players' bounding box, held if they are spread wider than the screen | Level offset `cameraxoffset` (a per-level data field) |
| Hard speed cap per update toward the target (no easing) | `scrollspeed` default 1 (theirs, 24161), per-level data |
| Wait gate: camera and spawns lock until the encounter is cleared, then a go timer | Go timer 3 seconds x game speed (theirs, 50180) |
| Spawn by scroll position with group min/max refill | Data per spawn point (`at`, `groupmin`, `groupmax`) |

## 4. TypeScript sketch

simplified: x axis only; no z/y scroll, no blockade or back-scroll, no frozen-animation gate, no level-complete check, no music or lighting spawn commands. Spawn points are plain data.

```ts
// Licence: BSD-style (donor; full text not read). Sketch is our own code from the described mechanism.
interface SpawnPoint { at: number; wait?: boolean; spawn(): void }
interface Actor { x: number; alive: boolean }

export class Scroller {
  x = 0;
  pos = 0;
  waiting = false;
  goTimerMs = 0;
  next = 0;
  constructor(
    private screenW: number,
    private levelW: number,
    private points: SpawnPoint[],
    private speed = 1,
    private offsetX = 0,
    private groupMin = 0,
    private groupMax = 3,
  ) {}

  step(players: Actor[], enemies: number, nowMs: number): void {
    const alive = players.filter((p) => p.alive);
    if (alive.length === 0) return;
    while (enemies < this.groupMax && this.next < this.points.length && this.pos >= this.points[this.next].at) {
      const sp = this.points[this.next++];
      if (sp.wait) { this.waiting = true; this.goTimerMs = 0; } else { sp.spawn(); enemies++; }
    }
    if (this.waiting) {
      if (enemies === 0) { this.waiting = false; this.goTimerMs = nowMs + 3000; }
      return;
    }
    const lm = Math.min(...alive.map((p) => p.x));
    const rm = Math.max(...alive.map((p) => p.x));
    let to = rm - lm > this.screenW ? this.x : (lm + rm) / 2 - this.screenW / 2 + this.offsetX;
    to = Math.max(0, Math.min(this.levelW - this.screenW, to));
    if (to > this.x) this.x = Math.min(to, this.x + this.speed);
    this.pos = Math.floor(this.x);
  }
}
```

## 5. Lands in

- TARGET `src/fight/camera.ts` (client, target = centre of the active fighters) and `src/fight/encounter.ts` (engine-side gate: lock until the pack is cleared): checklist row 11 (fight camera) and row 4 (fight loop: aggro, chase, leash). today: none read.
- Ruling (Lead Dev, 2026-10-10): the group min/max refill and wait-gate caps map to NEW parity row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer), as zone data fields; the camera half stays on row 11.
- Reuse tag: adapt-ok after reading the full licence text (BSD-style); the idea is plain and can be written from scratch
- Brief rule served: 5 (many-on-one: group min/max refill keeps N attackers on screen), 4 (zones as data: `at`, `wait`, group sizes are data), 1 (camera is client, the lock gate is engine)

## 6. Gaps and risks

- Side-scroll only. Frankendom fights are in zones and a Pit; only the idea of "target = centre of fighters, hold if too spread, hard speed cap" transfers, not the scroll axis.
- Strong lead for the spawns-encounters topic: the `wait` gate and group min/max refill (50037-50041, 50057) are the same loop that holds enemy count at a number. That fits the Frankendom MAX_ATTACKERS = 3 ruling as a data field, and is worth a separate note under spawns-encounters (cell 4 for this game is on this list).
- A hard speed cap with no easing looks mechanical; Frankendom can reuse the Funkin follow-smoothing note for the feel.
- The engine-vs-client split is blurred in the donor (the same function moves the camera and creates enemies). Frankendom must separate them: the lock decision is server-owned, the camera is not.
- Left, up and down branches and the blockade/back-scroll logic were not read.
