# ax-grymyr-l2dn-server (animation-rigs, cell 1)

Donor: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/TaskManagers/RandomAnimationTaskManager.cs` | Licence: MIT (`LICENSE.txt` copyright line, as read; the repo README says the code began as a port of the L2J Java server) | C# (.NET) | symbol `RandomAnimationTaskManager`

Checked: Topic fit is loose and stated plainly. This is a server emulator. A search of the .cs files for anim, skeleton, skin, ragdoll, blend, retarget, IK, pose and attachment found no rig, skinning, blending, state machine, IK, ragdoll or attachment-point code. The hits were packet ids, config keys and mail attachments. The one real animation mechanism is a server-side scheduler that picks when an NPC plays an idle social clip; the client plays the clip. Read in full: `RandomAnimationTaskManager.cs` (whole file); `Npc.cs` 68 and 142-180; `Attackable.cs` 1676-1682; `NpcAction.cs` 60-90; `WorldRegion.cs` 166-186 and 245-307 (`SwitchAi`, both branches); `Creature.cs` 616-630 and 4173-4177; `Chest.cs` 84; `Defender.cs` 59; `General.ini` 258-274; `Config.General.cs` 241-244. Not read: the `ThreadPool.scheduleAtFixedRate` signature (the 1000 is taken as ms, which fits the x1000 seconds conversion, but the unit was not checked); `Rnd.get` range semantics (inclusive or not; the sketch assumes inclusive); the `Map` type behind `PENDING_ANIMATIONS` (thread safety unknown); `SocialActionPacket` and any client-side clip handling (not in this donor). Other callers of `WorldRegion.SetActive` were not read. Confidence: high on the scheduler order and the gates; high that the donor has no rig code; medium on the fit to Frankendom.

Best transferable idea: each creature rolls its next idle moment, and the roll is re-drawn whether or not the creature was allowed to play, with the play gated on live state (alive, not fighting, not moving, zone live) and spaced by a minimum gap, all driven by zone data.

Decision (proposed): adapt. Take the scheduler shape (per-creature due time, a live-state gate read at play time, always re-roll, a minimum gap between clips, interval and clip count as data), but run it client-side as cosmetic idle clips for creature actors. Do not copy the donor's server-to-client social packet: a clip is cosmetic, so the engine should not spend a message on it.

Acceptance: a player who looks at a creature standing still in a live zone sees one of two idle clips every 5 to 60 s, and a creature that is walking, fighting or dead never starts one (a client unit test on the gate function covers each of those states).

## 1. Mechanism

- One singleton scheduler drives idle animation for every enrolled NPC and monster. It runs on a fixed-rate timer with period 1000 (`RandomAnimationTaskManager.cs` 19). Each run takes the pending entries whose due time has passed (31). A plain static bool `_working` (15, 24-28) stops a re-entrant run. This is a poll, not a per-frame loop, so clip starts are up to one period late.
- Order of steps for each due NPC: (a) gate (35-36): the NPC is in an active region, not dead, not in combat, not moving, and has no action block; (b) if the gate passes, `onRandomAnimation(Rnd.get(2, 3))` (38), which plays one of two idle social ids; (c) the next due time is set (41-43) whether or not (b) ran. So a creature that failed the gate simply waits another random interval.
- The next due time is now plus `Rnd.get(min, max) * 1000` ms (42-43). The pair is the monster pair (`MIN/MAX_MONSTER_ANIMATION`) for attackables and the NPC pair otherwise. Defaults are min 5 and max 60 seconds (`General.ini` 266-272; parser defaults `Config.General.cs` 241-244).
- `onRandomAnimation` (`Npc.cs` 145) sends the social action only if more than 6000 ms have passed since the last one (68, 149-152). The same spacing covers the click reaction below.
- Enrolment is tied to region activity. When a region goes active, `WorldRegion.SwitchAi(true)` (245; called from `SetActive` at 185) adds each visible attackable or NPC (303, 307), and `add` only enrols those for which `hasRandomAnimation()` is true. When a region goes inactive, the same branch removes them (287, 291). That branch also clears aggro (267), stops AI and may teleport a mob back to spawn if it is too far (270-285). Those AI effects are not part of the animation mechanism and are noted only because they share the switch.
- Per-type gate: an NPC plays only if `MAX_NPC_ANIMATION > 0`, its template flag is on, and its AI is not CORPSE (`Npc.cs` 159-161). A monster needs `MAX_MONSTER_ANIMATION > 0`, its flag on, and must not be a GrandBoss (`Attackable.cs` 1679-1681). `Chest.cs` (84) and `Defender.cs` (59) override the gate to false.
- Click reaction (`NpcAction.cs` 77-79): when a player talks to an NPC that is not auto-attackable and can be interacted with, and the player is not sitting, the server sends `MoveToPawnPacket` and, if `hasRandomAnimation()`, one reaction id from `Rnd.get(8)` through the same rate-limited `onRandomAnimation`.
- Who hears it: for a playable creature the social packet always goes out (`Creature.cs` 616-623). For an NPC it goes out only if the region's neighbours are active (625).

## 2. Key functions

- `RandomAnimationTaskManager.run`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/TaskManagers/RandomAnimationTaskManager.cs` 22-47. Due filter, gate, clip, reschedule.
- `RandomAnimationTaskManager.add` / `remove`: same file, 49-63. `add` uses `TryAdd`, so an existing entry is not overwritten (53).
- `Npc.onRandomAnimation`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Npc.cs` 145-155 (6000 ms spacing at 149-152).
- `Npc.hasRandomAnimation` (159-162) and `Attackable.hasRandomAnimation` (1679-1682), same tree.
- `WorldRegion.SwitchAi` (245-307), called from `WorldRegion.SetActive` (166-186): `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/WorldRegion.cs`.
- Click branch: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Scripts/Handlers/ActionHandlers/NpcAction.cs` 77-79.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-creature due time, one poll per period, due ones handled once | Poll period 1000 (ms assumed; `RandomAnimationTaskManager.cs` 19), engine constant |
| Random idle interval drawn between min and max, re-drawn after every check | Min 5 s, max 60 s, separate for monsters and NPCs (`General.ini` 266-272), zone data in Frankendom |
| Play only if live state allows (alive, not in combat, not moving, not blocked, region live) | Engine rule, read at play time (`RandomAnimationTaskManager.cs` 35-36) |
| Re-roll even when the gate fails | Engine rule (41-43) |
| Minimum spacing between two social broadcasts | 6000 ms (`Npc.cs` 68), engine constant |
| Pick one clip from a small set | `Rnd.get(2, 3)` gives two ids (38), zone data (clip count 2) |
| Click reaction from a set of eight | `Rnd.get(8)` (`NpcAction.cs` 79), not needed for Frankendom |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (due check, gate, min gap, then the re-roll that always runs). It omits the click reaction path, the per-target broadcast and region-neighbour rule, the Chest, Defender, GrandBoss and CORPSE overrides, the region switch that removes NPCs and stops AI, the `_working` guard and the donor's `Map` type. It replaces the donor's batch over a map with a plain array, and `enrol` is a simplified stand-in for `add`. The sketch was typechecked on the VPS with `export {}` appended, `--strict --target es2020`, and passed.

```ts
// Licence: MIT (donor LICENSE.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Idle-clip director for creature actors. Client-side cosmetic only; the engine never reads it.

interface IdleCreature {
  dueAt: number;          // ms (monotonic clock): when the next idle roll is due
  lastClipAt: number;     // ms: when this creature last started an idle clip
  minIdleMs: number;      // zone data
  maxIdleMs: number;      // zone data
  idleClipCount: number;  // zone data: how many idle clips this creature set has
  inActiveZone: boolean;  // zone chunk is loaded and live
  dead: boolean;
  inFight: boolean;
  moving: boolean;
  actionsBlocked: boolean;
}

const TICK_MS = 1000;            // engine constant: scheduler period
const MIN_CLIP_GAP_MS = 6000;    // engine constant: minimum gap between two idle clips

function canIdle(c: IdleCreature): boolean {
  return c.inActiveZone && !c.dead && !c.inFight && !c.moving && !c.actionsBlocked;
}

// Inclusive integer roll between min and max.
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// One director tick. Every creature whose roll is due is handled once.
// The next roll is always scheduled, even when the gate says no.
function idleTick(creatures: IdleCreature[], now: number, playClip: (clipIndex: number, c: IdleCreature) => void): void {
  for (const c of creatures) {
    if (now < c.dueAt) continue;
    if (canIdle(c) && now - c.lastClipAt > MIN_CLIP_GAP_MS) {
      c.lastClipAt = now;
      playClip(randInt(0, c.idleClipCount - 1), c);
    }
    c.dueAt = now + randInt(c.minIdleMs, c.maxIdleMs);
  }
}

// Enrol a creature when its zone goes live (donor: add on region activation).
function enrol(c: IdleCreature, now: number): void {
  c.dueAt = now + randInt(c.minIdleMs, c.maxIdleMs);
}
```

## 5. Lands in

- TARGET `origins/client/creature-idle.ts` (new, client-only idle director for creature actors; the engine does not read it). Parity-checklist row 7 (creature actor/clips). The fit is to the creature's clips, not to the fight rows.
- today: not read (the Frankendom repo was not part of this pass).
- Reuse tag: rewrite-from-idea (MIT; the sketch is clean-room and carries no donor code)
- Brief rule served: zones as data (interval and clip count per creature are zone data); one engine (gate inputs come from engine state, not from a second copy)

## 6. Gaps and risks

- Topic fit is loose. The donor has no rig, skeleton, skinning, blending, state machine, IK, ragdoll or attachment code. The only transferable part is the clip trigger.
- The donor sends a clip id to the client and never plays it. In Frankendom keep idle clips out of the server message path: the engine should not decide cosmetics.
- The gate must read live state at play time, not at roll time. A creature that starts a fight between the roll and the play must not play an idle clip mid-fight. The donor does this check at play time (35-36), so keep that order.
- Poll precision: a poll of 1000 ms (unit assumed, see Checked) means a clip can start up to one period late. That is fine for idle variety and wrong for anything tied to a hit or a step.
- Thread safety: `_working` is a plain static bool (15), and the `Map` type behind `PENDING_ANIMATIONS` was not read. Do not copy the guard shape; a single-threaded client loop needs no guard.
- Licence: MIT by `LICENSE.txt`. The README (line 9) says the code began as a port of the L2J Java server, and this file carries an `@author Mobius` tag (line 10). The L2J licence was not checked. The sketch is clean-room, so no donor code is carried over.
- Related but not read in depth: the knockback and blink packets carry an `animationSpeed` (`KnockBack.cs` 101; `FlyToLocationPacket.cs` 57). The server passes speed and delay and the client animates the motion. This is a hit-reaction motion, but it is outside this cell.

Reuse tag: rewrite-from-idea (MIT; sketch written clean-room)
Brief rule served: zones as data (interval and clip count per creature); one engine (gate reads engine state)
