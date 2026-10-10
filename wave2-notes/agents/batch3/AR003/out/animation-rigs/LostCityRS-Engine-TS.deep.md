# LostCityRS-Engine-TS (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` (playAnimation 1920-1929; reset via PathingEntity.ts 594-630) | Licence: MIT (LICENSE line 1 "MIT License", line 3 "Copyright (c) 2023-2026 Lost City") | TypeScript | symbol `playAnimation`

Checked: Read in full: `Player.playAnimation` (Player.ts 1920-1929), `Npc.playAnimation` (Npc.ts 470-479), `resetPathingEntity` (PathingEntity.ts 594-630), the `ANIM` and `P_ANIMPROTECT` script ops (PlayerOps.ts 196-200, 1236-1237), `SeqType` priority (SeqType.ts 80, 131), the info write (messages.ts 62-70), and the tick call list (World.ts 355-416, with `processNpcs` 665-676 and `processPlayers` 687-696 read). Callers of `playAnimation` found by grep; only their call lines read (NpcOps.ts 74, Npc.ts 294, World.ts 1293). Hint file `IfSetAnim.ts` is a two-field interface message (component, seq), not a rig. Nothing under `src/` is a skeleton, bone, skin, blend, ragdoll, retarget or IK (grep: the only hit is a comment "4 - skin" at PlayerOps.ts 1138). So this note covers one fragment of the topic: the clip-slot arbitration. Not read: the RS client (how long a clip plays, and the unit of the delay). Confidence: high on the per-tick clear and the priority rule; medium on what the client then does with them. camera_scope: not applicable (not a camera cell).

Best transferable idea: a one-slot clip arbiter with a priority gate and a lock flag, cleared at the end of each tick, gives a fight a simple rule for which reaction or attack clip shows when several requests land in the same tick.
Decision (proposed): adapt - take the priority gate and the lock-flag shape for the hero clip slot, but not the per-tick clear: a hit reaction or finisher must hold across ticks, which needs a client timer this donor does not show.
Acceptance: Two hits land in the same tick from up to 3 attackers: the higher-priority reaction clip shows (a finisher at priority 9 beats a hit reaction at 2). While a finisher lock is set, no hit-reaction clip is requested, and a server test shows the hit's damage is still applied with the clip locked.

## 1. Mechanism

- Each player and NPC has one animation slot: `animId` (a sequence id, -1 = none) and `animDelay` (a start delay). The slot is shared by every request made in the tick.
- `playAnimation(anim, delay)`, Player version, in order: (a) return if `anim >= SeqType.count` or if `animProtect` is non-zero (Player.ts 1921); (b) store the request if `anim == -1`, or the slot is empty (`animId == -1`), or the new clip's priority is equal or higher than the current clip's priority (1925); (c) store `animId` and `animDelay` and set the ANIM bit in the player's update mask (1926-1928). The NPC version (Npc.ts 470-478) is the same except it has no `animProtect` check.
- Priority is a cache field per clip, default 5 (SeqType.ts 80), set by cache opcode 5 (SeqType.ts 131). Equal priority wins, so the newest same-priority request replaces the older one.
- `animProtect` is a script-set flag. `P_ANIMPROTECT` sets it (PlayerOps.ts 1237). Nothing in the engine resets it to 0 per tick: the only references are the declaration (Player.ts 325), the read at 1921, and the script write. So a script that sets it must clear it.
- Each tick, in order (World.ts): NPC turn (367), player processing including scripts (378), output (408), then cleanup (415). In cleanup, `resetEntity(false)` runs for each player and NPC (World.ts 1149, 1163). For a player it calls `resetPathingEntity` (Player.ts 474), which sets `animId = -1` and `animDelay = -1` (PathingEntity.ts 614-617; the pair is written twice in the donor).
- Output: the ANIM bit writes `animId` as two bytes and `animDelay` as one byte (messages.ts 68-70).
- Consequence: the priority rule only decides between requests made in the same tick. A hit reaction in tick 10 does not block an attack clip requested in tick 11. The server keeps no clip state across ticks; anything that holds a clip over time is the client, which is not read here.

## 2. Key functions

- `Player.playAnimation`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 1920-1929. Range check, lock check, priority gate, store.
- `Npc.playAnimation`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Npc.ts` 470-479. Same gate without the lock.
- `PathingEntity.resetPathingEntity` (the per-tick clear): `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/PathingEntity.ts` 594-630; clear at 614-617.
- Script entry points: `ANIM` at `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/PlayerOps.ts` 196-200; `P_ANIMPROTECT` at 1236-1237.
- Tick order: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 355-416 (call list); cleanup 1139-1170.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Reject out-of-range clip ids | `anim >= SeqType.count` (Player.ts 1921, Npc.ts 471) |
| Lock: a set flag refuses all requests, including the reset to -1 (Player only) | `animProtect` non-zero (Player.ts 1921, set by PlayerOps.ts 1237) |
| Priority gate: empty or -1 always wins, else new priority >= current | Default priority 5 (SeqType.ts 80); per-clip value from cache opcode 5 (SeqType.ts 131) |
| Start delay travels with the clip | Passed by the script; sent as one byte (messages.ts 70). Client unit not read. |
| Clear the slot at the end of each tick | -1 for both fields (PathingEntity.ts 614-615) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (range check, lock, empty-or-priority gate, store) and the end-of-tick clear. It takes `locked` as an argument instead of reading the Player field, and it leaves out the NPC/Player difference beyond that argument, the update-mask bit and the info write, the spotanim fields, the respawn reset in Npc.ts 294, and the client's clip playback (not read). `delayTicks` is passed through unchanged; its unit was not read.

```ts
// Licence: MIT (donor). Clean-room sketch written from the described mechanism.
// clean-room
interface ClipTable {
  count: number;                    // number of clips in the catalogue
  priority(clip: number): number;   // catalogue field; donor default is 5
}

interface ClipSlot {
  clip: number;        // -1 = no clip requested this tick
  delayTicks: number;  // start delay sent with the clip
  needsSend: boolean;  // goes into this tick's output
}

// Accept a clip when the slot is empty or the new clip's priority is equal or higher.
// `locked` is the Player-only protect flag: while set, every request is refused.
function requestClip(slot: ClipSlot, table: ClipTable, clip: number, delayTicks: number, locked: boolean): boolean {
  if (clip >= table.count || locked) return false;
  if (clip === -1 || slot.clip === -1 || table.priority(clip) >= table.priority(slot.clip)) {
    slot.clip = clip;
    slot.delayTicks = delayTicks;
    slot.needsSend = true;
    return true;
  }
  return false;
}

// Run after this tick's output is sent: the slot is empty again at the start of the next tick.
function endOfTick(slot: ClipSlot): void {
  slot.clip = -1;
  slot.delayTicks = -1;
  slot.needsSend = false;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/actor-clips.ts` (new): the hero's clip slot, a presentation object for the Pit and zone clients. The engine never reads it. Parity-checklist row 6 (hero actor/animation).
- today: not located in this pass (the Frankendom repo is not on this Mac and was not read).
- Reuse tag: adapt-shape (MIT; code may be adapted; this note uses the shape only, written as a sketch)
- Brief rule served: presentation is client-only; the engine decides outcomes and never reads the clip slot.

## 6. Gaps and risks

- The donor clears the slot every tick. A hit reaction must hold for a few hundred milliseconds, and a finisher must hold for its whole animation. The donor has no mechanism for that (it is the client's job, not read). Frankendom needs a client timer per clip, or the reaction will snap back after one tick.
- The clip slot is presentation only. A locked or replaced clip must never change damage or the kill: kills stay server-verified, and the server test in the acceptance line covers this.
- With MAX_ATTACKERS = 3, up to three hit reactions can land in one tick. The priority gate keeps one clip per tick and drops the rest silently. That is the intended effect here, but Frankendom must decide the tie-break (the donor's rule is newest-wins at equal priority) and test it.
- `animProtect` has no owner and no expiry in the donor. Any script can set it and forget to clear it. Frankendom should tie the lock to a named fight state with an end, not a free flag.
- Priority values are catalogue data per clip (zone-independent). They belong in the clip catalogue (parity rows 20-21), not in the function.
- The donor is a server for an RS-protocol game and has no skeleton, blend or IK code under `src/`. Nothing here covers rig skinning, clip blending, retargeting or ragdoll; those need a different donor.
