# 2004Scape-Server (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Npc.ts` (`playAnimation` 451-459; Player twin 1833-1842) | Licence: MIT (LICENSE line 1: "MIT License", Copyright (c) 2023-2025 Lost City) | TypeScript | symbol `playAnimation`

Checked: Read in full: `Npc.playAnimation` (Npc.ts 451-459), `Player.playAnimation` (Player.ts 1833-1842), `resetPathingEntity` (PathingEntity.ts 575-600), `SeqType.decode` (SeqType.ts 80-132), the tick phase order in `World.cycle` (World.ts 369-444) and the per-entity cleanup (World.ts 1148-1173). All four callers of `playAnimation` in `src/` were found by grep and read: NpcOps.ts 54-59, PlayerOps.ts 146-151, World.ts 1316, Npc.ts 286. The skeleton files `src/cache/graphics/AnimBase.ts` and `AnimFrame.ts` were read (cache decode only). Confidence: high on the arbitration and on its one-tick scope, because both were read end to end. Not read: the network encoder that writes `animId` into the info packet (it is gated by `masks`, see World.ts 1025-1046), the client that plays the clip and gives `delay` its meaning, and the `basWalk*` locomotion fields outside PlayerOps.ts 884-913. This is a camera-free cell. The donor is a server; the client that plays clips is not in this donor.

Best transferable idea: a per-actor clip arbiter for one tick: a request replaces the current clip only if its priority is strictly higher, a priority-0 clip yields to anything, a protect flag refuses every request, and the slot clears at cleanup, so arbitration only happens between requests made within the same tick.
Decision (proposed): adapt — the strict-greater, same-tick rule lets a hit reaction beat an attack swing requested in the same tick, but the donor has no lock across ticks, so the duel state machine (rows 1 and 3) must hold stagger and recovery.
Acceptance: a server test submits an attack clip (priority 5) and a hit-reaction clip (priority 9) in one tick and asserts the reaction is written to the snapshot, an equal-priority pair keeps the first request, and the next tick starts with an empty slot.

## 1. Mechanism

- One slot per actor per tick. `animId` and `animDelay` hold the single clip that will be sent to clients in this tick's info record (World.ts 1045-1046, 1087-1088). The `masks` bit is set on accept (Npc.ts 459; Player.ts 1841).
- Request order, the same for Npc (Npc.ts 451-459) and Player (Player.ts 1833-1842), with the Player-only protect check first:
  1. Player only: if `animProtect` is non-zero, return (Player.ts 1834). This runs BEFORE the reset check, so a protected Player also refuses the -1 reset.
  2. If the clip id is at or above `SeqType.count`, return (Npc.ts 452; Player.ts 1834).
  3. Accept when: the new clip is -1 (reset), OR nothing is set (`animId == -1`), OR the new clip's priority is strictly greater than the current clip's, OR the current clip's priority is 0 (Npc.ts 456; Player.ts 1838).
  4. On accept: set `animId` and `animDelay` and set the mask bit (Npc.ts 457-459; Player.ts 1839-1841).
- Equal priority does not replace (the comparison is `>`), so the first request in a tick keeps the slot. A priority-0 clip is replaced by any later request.
- Clear: the cleanup phase calls `resetEntity(false)` for every Player and NPC (World.ts 1158, 1172). Both call `resetPathingEntity` (Npc.ts 313; Player.ts 457), which sets `animId = -1` and `animDelay = -1` (PathingEntity.ts 596-599). So the slot is empty at the start of every tick.
- Consequence, which is the main finding: the priority comparison only resolves requests made within the same tick. A clip set in tick T is sent in T and cleared at cleanup. A request in tick T+1 finds `animId == -1` and is accepted whatever its priority. Nothing in this code keeps a high-priority clip playing across ticks. The clip's length is computed (see below) but never used to hold the slot.
- Tick: `TICKRATE` is 600 ms (World.ts 120). The phase order in `cycle()` is: world, client input, NPC processing (396), player processing (407), logins/logouts, zones, info build (426), client output (437), cleanup (444). Requests come from scripts and engine code that run in any phase before the info build (phase 426 reads the slot), so a request made after phase 426 in the same tick is cleared at cleanup and never sent. Which phase runs which script was not traced beyond the phase names.
- Clip length: `SeqType.decode` adds each frame's delay into `duration` (SeqType.ts 104). A frame delay of 0 falls back to the SeqFrame delay, then to 1 (SeqType.ts 96-102). `SEQLENGTH` returns `duration` to scripts (ServerOps.ts 202-203). The unit of these delays is not read.
- Spawn: when an NPC enters the world, `playAnimation(-1, 0)` runs after `resetEntity(true)` (World.ts 1315-1316). The comment at Npc.ts 286 says the reason: "reset animation or last anim has a chance to appear on respawn".
- Locomotion set: each Player holds seven clip slots (ready, turn-on-spot, walk forward/back/left/right, running), set by script opcodes (PlayerOps.ts 884-913). The content script first sets the human set (appearance.rs2 8-14), then overrides each slot from the equipped weapon's params with `oc_param($weapon, ...)` (appearance.rs2 16-22). The trigger that runs this script was not read.
- Protect: `animProtect` is set by scripts (PlayerOps.ts 1123) and cleared by the appearance script (appearance.rs2 110 and 133). Nothing in the engine clears it: the grep for `animProtect` found only Player.ts 334, 1834 and PlayerOps.ts 1123. The trawler minigame sets it on to disable animations (trawler_sink.rs2 38 and 50).
- Skeleton data: `AnimBase` holds per-bone-group op types (base 0, translate 1, rotate 2, scale 3, alpha 5; AnimBase.ts 8-12) and labels. `AnimFrame` holds per-frame transforms with a delay and a flags byte per group (AnimFrame.ts 50, 61-62). No other `src/` file references `AnimBase.` or `AnimFrame.` (grep). So the server never poses a skeleton. The skeleton is cache data for clients, and the server only sends clip ids.

## 2. Key functions

- `Npc.playAnimation`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Npc.ts` 451-459. Accept rule and slot write. No protect check.
- `Player.playAnimation`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Player.ts` 1833-1842. Same rule plus `animProtect` (1834) before the reset check.
- `resetPathingEntity`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/PathingEntity.ts` 575-600. Clears the slot (596-599; the pair is written twice, harmless).
- `SeqType.decode`: `/mnt/frankendom-donors/2004Scape-Server/src/cache/config/SeqType.ts` 80-132. Priority (opcode 5, line 120), duration sum (104), default priority 5 (73).
- `World.cycle` and `processCleanup`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 369-444 (phase order) and 1148-1173 (reset calls).
- Script entry points: `/mnt/frankendom-donors/2004Scape-Server/src/engine/script/handlers/PlayerOps.ts` 146-151 (`ANIM`), 1122-1124 (`P_ANIMPROTECT`); `/mnt/frankendom-donors/2004Scape-Server/src/engine/script/handlers/NpcOps.ts` 54-59 (`NPC_ANIM`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Replace only on strictly higher priority; equal keeps the first | Default priority 5 (theirs, SeqType.ts 73) |
| A current priority of 0 yields to any request | 0 is the yield value (theirs, Npc.ts 456; Player.ts 1838) |
| Reset (-1) is always accepted, except when protected for a Player | -1 sentinel (theirs, PathingEntity.ts 596) |
| Protect flag refuses every request | Non-zero toggle set by scripts (theirs, PlayerOps.ts 1123) |
| Clear the slot each tick, so arbitration is per tick | Tick 600 ms (theirs, World.ts 120) |
| Clip length as sum of frame delays | Frame delay 0 falls back to the frame's delay, then to 1 (theirs, SeqType.ts 96-102) |
| Seven locomotion slots per weapon override | Seven slots (theirs, PlayerOps.ts 884-913) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's check order (count, then protect, then the priority rule) and the one-slot-per-tick write. It omits the Npc/Player split (Npc has no protect), the mask bit, the info-packet encoder, the client's use of `delay`, the clip length sum, the locomotion-set overrides and the spawn reset. Clip priority and count come from a catalogue the caller supplies; the donor's catalogue is `SeqType`.

```ts
// Licence: MIT (donor LICENSE, Lost City). Sketch written from the described mechanism, not a copy of the donor lines.
// clean-room
export interface ClipDef {
  priority: number; // 0 = yields to any later request in the same tick
}

export interface ClipCatalog {
  count: number;
  get(id: number): ClipDef | undefined;
}

export interface ActorClipState {
  clipId: number;     // -1 = none chosen this tick
  delayTicks: number; // -1 = none; client meaning of the delay not read
  protect: boolean;   // when true every request is refused, including the reset
}

const DEFAULT_PRIORITY = 5; // donor default for a clip with no priority opcode

// One request for this actor in the current tick. Returns true if it was kept.
export function requestClip(a: ActorClipState, cat: ClipCatalog, clipId: number, delay: number): boolean {
  if (a.protect) return false;             // protect refuses everything, even clipId -1
  if (clipId >= cat.count) return false;   // unknown clip id is ignored

  const current = a.clipId === -1 ? undefined : cat.get(a.clipId);
  let accept: boolean;
  if (clipId === -1 || current === undefined) {
    accept = true;                         // reset, or nothing chosen yet this tick
  } else {
    const next = cat.get(clipId) ?? { priority: DEFAULT_PRIORITY };
    // strictly higher priority replaces; equal priority keeps the first request;
    // a current clip with priority 0 can be replaced by anything.
    accept = next.priority > current.priority || current.priority === 0;
  }
  if (!accept) return false;

  a.clipId = clipId;
  a.delayTicks = delay;
  return true;
}

// Called once per tick when the actor's update is written to clients.
export function clipForTick(a: ActorClipState): { clipId: number; delay: number } | null {
  if (a.clipId === -1) return null;
  return { clipId: a.clipId, delay: a.delayTicks };
}

// Called in the tick cleanup phase: the arbiter is empty again for the next tick.
export function clearTick(a: ActorClipState): void {
  a.clipId = -1;
  a.delayTicks = -1;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (sketch copy: `/tmp/2004scape-clip-arbiter.ts`).

## 5. Lands in

- TARGET `src/fight/clip-arbiter.ts` (new, engine-side request slot per actor per tick; the client only plays what it is sent). Parity-checklist row 6 (hero actor/animation). The creature side would use row 7, but this cell names only the hero row.
- today: not checked in this pass (the Frankendom repo was not opened here).
- Reuse tag: adapt-allowed (MIT, Lost City: code may be adapted; this sketch is written clean-room from the mechanism)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- No lock across ticks. The donor clears the slot each tick (PathingEntity.ts 596-599), so priority cannot hold a hit reaction or a windup for its length. Frankendom's stagger, recovery and guard must be state in the duel step (rows 1 and 3), and the arbiter must not be trusted to hold them.
- Clip length is computed (SeqType.ts 104) but unused by the arbitration. A Frankendom version that wants holds must read the clip length from the catalogue (rows 20-21) and store an end tick on the actor.
- Protect blocks the reset too (Player.ts 1834 returns before the -1 check), and nothing in the engine clears `animProtect`; only scripts do (appearance.rs2 110 and 133). If Frankendom copies it, protect must expire on death, respawn and disconnect, or a stuck protect leaves a stale clip on screen.
- `delay` is passed through to clients without a unit check in the server (Npc.ts 458; PlayerOps.ts 150). Its client unit was not read. Frankendom should fix a unit (ticks, ms) in the catalogue before it becomes data.
- Respawn: the donor clears the NPC clip on spawn (World.ts 1316) so a last clip cannot appear on respawn (Npc.ts 286 comment). Frankendom's death and respawn (row 17) must do the same.
- Priority values come from the catalogue (`seq` configs) and the donor default is 5 (SeqType.ts 73). Frankendom should set its own priorities per clip (hit reaction, attack, idle), not copy these numbers.
- Skeleton and blending: this donor has no skinning, IK, blending between clips, state machine, retargeting, ragdoll or attachment points on the server. The `AnimBase`/`AnimFrame` files are a cache decoder for clients. They offer no rig design that Frankendom can reuse; this note does not claim otherwise.
