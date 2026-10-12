# ioquake-ioq3 (vfx-blood-finishers, cell 2)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_playerstate.c` (with `cgame/cg_view.c`, `cgame/cg_local.h`, `game/g_active.c`, `game/g_combat.c`, `qcommon/q_math.c`) | Licence: GPL-2.0-or-later (cg_view.c header lines 9-10: "either version 2 of the License, or (at your option) any later version"; COPYING.txt is the GPL v2 text) | C | symbol `CG_DamageFeedback`

Checked: camera_scope: world camera. The donor applies both effects to the first-person view only (cg_view.c 679-682 and 810-812, see section 1), so this note is about what a third-person follow camera must add. Read in full: `CG_DamageFeedback` (cg_playerstate.c 92-181), the kick envelope `CG_OffsetFirstPersonView` (cg_view.c 316-355), the blob `CG_DamageBlendBlob` (cg_view.c 559-602), and the call sites (cg_playerstate.c 506-507; cg_view.c 679-682, 812). Read in part: the server side `P_DamageFeedback` (g_active.c 37-80, the count, cap and direction lines; the pain-sound block was not read), the per-hit accumulation (g_combat.c 992-1008), and `vectoangles` (q_math.c 376-412). The hint file `cg_particles.c` was checked only by its function list (headers at 162-1996); the particle code there is not this mechanism. Other files opened as candidates: `cg_effects.c` (CG_Bleed and CG_GibPlayer headers, 491-564), `cg_localents.c` (CG_BloodTrail header, 116-121), `cg_draw.c` 428-436 (head flash, not read in full). Confidence: high on the client maths; medium on the server side (not read: the caller of `P_DamageFeedback`).
Best transferable idea: A hit kicks the view with a short triangle envelope (up in 100 ms, back down in 400 ms) whose strength is damage scaled up as health falls, and paints a red blob on the side the hit came from, so the player can read direction and severity without a HUD.
Decision (proposed): adapt - take the 100/400 ms envelope and the health-scaled, clamped kick for hits in the world camera (row 10), and replace the first-person sprite blob with a screen-edge marker on the side the hit came from. Fix the donor's decode scale mismatch by sending direction as vectors, not bytes. The Pit camera is frozen, so the kick is off there.
Acceptance: In the world, a hit of 20 damage at 100 hp gives a kick of 8 degrees at full strength (20 x 0.4, inside the 5..10 clamp), reached at 100 ms and back to 0 by 500 ms; a red edge marker on the hit side fades from alpha 200 to 0 over 500 ms; a server test asserts that the hit event carries damage, health after the hit, and the attacker direction or a centred flag for falls.

## 1. Mechanism

- Server side (`P_DamageFeedback`, game/g_active.c 37-80): each hit adds its blood and armour damage to two per-client totals (g_combat.c 998-999) and records the attacker direction (g_combat.c 1001-1006; the direction is overwritten by each hit, and a world hit sets a flag). `P_DamageFeedback` (its caller in the server frame was not read) takes the sum since its last call as `count` (g_active.c 48), returns if it is zero (49-51), caps it at 255 (53-55), and writes the playerstate: for world damage pitch and yaw are both 255 (61-64), otherwise pitch and yaw are the attacker direction encoded as `angle / 360 * 256` (68-69). It then sets `damageCount = count` (80). The total covers the hits since the last call; the direction is from the last of those hits.
- Transport: the playerstate carries `damageYaw`, `damagePitch` and `damageCount` (`damageEvent` is a counter that the client compares). The client calls `CG_DamageFeedback` only when `damageEvent` changed and `damageCount` is above zero (cg_playerstate.c 506-507).
- Client, in order (`CG_DamageFeedback`, cg_playerstate.c 92-181):
  1. Kick size: `scale` = 1 if health < 40, else 40 / health (107-111). `kick = damage * scale` (112). Clamped to 5..10 (114-117). So a hit at 100 hp is scaled by 0.4; at 40 hp and below, by 1.
  2. Centred case (both bytes 255): pitch kick = -kick, roll 0, blob at the centre (120-124).
  3. Positional case: decode yaw and pitch (127-128), build the direction, take its dot products with the view axes `front`, `left`, `up` (134-139), with the donor's direction negated first (135). Roll kick = kick * left (149). Pitch kick = -kick * front (151). Blob position: `damageX = -left / front`, `damageY = up / dist` (156-157), with `front` floored at 0.1 (153-155) and both blob coordinates clamped to -1..1 (161-173).
  4. Store `damageValue = kick` (179), `damageTime = cg.snap->serverTime` (181). The second clamp at 176-178 does nothing, because kick is already at most 10.
- Kick envelope (`CG_OffsetFirstPersonView`, cg_view.c 316-355): no kick when dead (334-339). When `damageTime` is set (344), `ratio = cg.time - damageTime` (345). Attack: if ratio < 100 (346), ratio becomes ratio / 100 (347) and pitch and roll get `ratio * v_dmg_*` (348-349). Release: otherwise ratio = 1 - (ratio - 100) / 400 (351), applied while ratio > 0 (352-355). So it rises linearly to full at 100 ms and falls linearly to zero at 500 ms.
- Blob (`CG_DamageBlendBlob`, cg_view.c 559-602): returns if `cg_blood` is off, if `damageValue` is 0 (568-570), on the RagePro hardware path, or if t = cg.time - damageTime is not in (0, 500) (581-585). It is a sprite 8 units in front of the eye (592), moved by `damageX * -8` along the right axis (593) and `damageY * 8` along up (594). Radius = `damageValue * 3` (596). Alpha = 200 * (1 - t / 500) (601).
- Gating (call sites): the kick is applied only in the `else` (first-person) branch (cg_view.c 679-682). The blob is drawn only `if ( !cg.renderingThirdPerson )` (810-812). Third person is chosen in `CG_DrawActiveFrame` just before the blob call, by `cg_thirdPerson` or by health <= 0. So in third person neither effect is drawn, and a dead player is always third person.
- Time base: `cg.time` is set from `serverTime` in `CG_DrawActiveFrame` (cg_view.c 764). `CG_ProcessSnapshots` raises `cg.time` to the snapshot server time if it is lower (cg_snapshot.c 391-393). So t = cg.time - damageTime is normally >= 0. The order of these two calls inside a frame was not read.

## 2. Key functions

- `CG_DamageFeedback`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_playerstate.c` 92-181 (kick size, centred or positional, blob position, store).
- `CG_TransitionPlayerState` call site: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_playerstate.c` 506-507.
- `CG_OffsetFirstPersonView` (kick envelope): `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_view.c` 316-355.
- `CG_DamageBlendBlob` (blob): `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_view.c` 559-602; call at 810-812.
- Timing constants: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_local.h` 39-41 (DAMAGE_DEFLECT_TIME 100, DAMAGE_RETURN_TIME 400, DAMAGE_TIME 500).
- Server count and direction: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_active.c` 37-80; per-hit totals: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_combat.c` 998-1006.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Hit strength scales up as health falls, with a floor and cap | Scale 40 / hp above 40 hp, flat 1 at and below 40 (theirs, cg_playerstate.c 107-111). Kick clamped to 5..10 (114-117). A 20-damage hit gives 20 x 0.4 = 8 at 100 hp; at 40 hp it gives 20 x 1 = 20, clamped to 10. |
| Direction from the hit: pitch = -kick x forward, roll = kick x right | Same formula (theirs, cg_playerstate.c 149, 151). Centred hits: pitch -kick, roll 0 (124). |
| Attack-release envelope on the kick | 100 ms attack, 400 ms release, total 500 (theirs, cg_local.h 39-41; cg_view.c 346-355). |
| Screen blob: position, size, fade | Position 8 units forward and +/-8 units sideways by the blob coordinates (theirs, cg_view.c 592-594). Radius = kick x 3 (596). Alpha 200 at t = 0, falling to 0 at t = 500 (601). |
| Clamp of the screen position | -1..1 (theirs, cg_playerstate.c 161-173). |
| Direction encoding | Server `angle / 360 * 256` (theirs, g_active.c 68-69). Client decode `byte / 255 * 360` (theirs, cg_playerstate.c 127-128). The two scales differ (see section 6). |

## 4. TypeScript sketch

simplified: the sketch takes the attack direction as dot products (front, left, up) that are already negated, and a centred flag from the server, so it never decodes the 0-255 yaw and pitch bytes (the donor's 256 / 255 mismatch is avoided by design). It keeps the donor's kick formula, the 5..10 clamp, the 100/400 ms triangle envelope, and the blob alpha, offset and size numbers. It omits: the dead-player check, the application of the kick to view angles, the blob sprite drawing, the `cg_blood` cvar and RagePro gates, and the head flash HUD (cg_draw.c 428-436). It drops the donor's second clamp (a no-op). It adds a t < 0 guard to the envelope, which the donor does not have.

```ts
// clean-room sketch from the described mechanism (donor is GPL-2.0-or-later; not a translation)
// Times in ms, angles in degrees, screen position in -1..1.
const DEFLECT_MS = 100; // donor: DAMAGE_DEFLECT_TIME
const RETURN_MS = 400;  // donor: DAMAGE_RETURN_TIME
const TOTAL_MS = DEFLECT_MS + RETURN_MS; // donor: DAMAGE_TIME = 500

export interface HitFeedback {
  pitchKick: number; // degrees at full strength
  rollKick: number;  // degrees at full strength
  blobX: number;     // -1..1, where the red blob sits on screen
  blobY: number;     // -1..1
  blobValue: number; // 5..10, used for the blob radius
  startMs: number;   // client time of the hit
}

const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));

// Kick from damage: scale 1 below 40 hp, 40 / hp above; then clamp to 5..10.
export function kickFor(damage: number, hp: number): number {
  const scale = hp < 40 ? 1 : 40 / hp;
  return Math.min(10, Math.max(5, damage * scale));
}

// front, left, up: dot products of the NEGATED attack direction with the view axes.
// centred: true for world damage (falls, slime), which has no direction.
export function makeFeedback(args: {
  damage: number; hp: number; startMs: number;
  centred: boolean; front: number; left: number; up: number;
}): HitFeedback {
  const kick = kickFor(args.damage, args.hp);
  if (args.centred) {
    return { pitchKick: -kick, rollKick: 0, blobX: 0, blobY: 0, blobValue: kick, startMs: args.startMs };
  }
  const dist = Math.max(0.1, Math.hypot(args.front, args.left));
  const front = Math.max(0.1, args.front);
  return {
    pitchKick: -kick * args.front, // raw front, as the donor (kick is set before its front clamp)
    rollKick: kick * args.left,
    blobX: clamp1(-args.left / front),
    blobY: clamp1(args.up / dist),
    blobValue: kick,
    startMs: args.startMs,
  };
}

// Triangle envelope: 0 to 1 over DEFLECT_MS, then 1 to 0 over RETURN_MS, 0 after that.
export function envelope(elapsedMs: number): number {
  if (elapsedMs < 0 || elapsedMs >= TOTAL_MS) return 0; // fix: donor kick branch has no t < 0 guard
  if (elapsedMs < DEFLECT_MS) return elapsedMs / DEFLECT_MS;
  return 1 - (elapsedMs - DEFLECT_MS) / RETURN_MS;
}

// View kick to add to the camera angles at nowMs (world camera only).
export function viewKick(f: HitFeedback, nowMs: number): { pitch: number; roll: number } {
  const e = envelope(nowMs - f.startMs);
  return { pitch: e * f.pitchKick, roll: e * f.rollKick };
}

// Blob alpha 200 * (1 - t / 500) for 0 < t < 500 (donor: returns when t <= 0 or t >= DAMAGE_TIME).
export function blobAlpha(f: HitFeedback, nowMs: number): number {
  const t = nowMs - f.startMs;
  if (t <= 0 || t >= TOTAL_MS) return 0;
  return 200 * (1 - t / TOTAL_MS);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/impact.ts` (the hit event and its feedback fields; the kick and the edge marker are client-only in the world camera). The server sends the hit event with damage, health after the hit, and the direction as a vector or a centred flag. The client builds the feedback from that.
- Parity-checklist row 10 (hit impact / hitstop). Row 11 (fight camera) takes the third-person application of the kick, which the donor does not have.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later, clean-room only; no code copied)
- Brief rule served: 1 (one engine emits the hit; the feedback is client-only and never feeds the kill check); camera critical rule (the donor's camera effect is first-person only, so the world camera must add it explicitly).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch was written from the described mechanism.
- Third person: the donor draws neither the kick nor the blob in third person (cg_view.c 679-682, 810-812). A world follow camera needs the envelope added to its own pitch and roll, and a screen-edge marker instead of a view-space sprite (the sprite sits 8 units in front of the eye, which only makes sense in first person). This is the main point for the owner's camera concern.
- Decode mismatch: the server encodes `angle / 360 * 256` (g_active.c 68-69) and the client decodes `byte / 255 * 360` (cg_playerstate.c 127-128). The result is about 0.4 percent too large: byte 128 decodes to 180.7 degrees, not 180. Fix: send vectors or degrees, not bytes (the sketch does this).
- Multi-hit frames: the damage total is the sum of the frame (g_combat.c 998-999; g_active.c 48), but the direction is the last hit's (g_combat.c 1001-1006). With up to three attackers (MAX_ATTACKERS = 3) the kick size and the side can come from different hits. Fix: send the largest hit's direction, or one event per hit.
- Dead code: `cg.v_dmg_time` is set (cg_playerstate.c 180) and never read anywhere in the code I searched (grep of the whole cgame directory). The second clamp at 176-178 has no effect. These are cleanups, not behaviour changes.
- The 40-hp scale is flat at 1 below 40 hp, so the kick stops growing when the player is low. The comment in the donor says "the lower on health you are, the greater the view kick" (cg_playerstate.c 105); the code only does that between 40 and 100 hp. Keep the flat floor as a design choice, and say so in the tuning notes.
- Rulings: the camera is client-only, so the kick never changes hit or kill results (kills are server-verified). The server message is the ledger; the feedback is derived from it.
- Not read: the caller of `P_DamageFeedback` in the server frame loop; the pain sound block in that function; the `cg_blood` cvar default; the head flash in cg_draw.c (428-436) beyond its first lines; the particle system in the hint file (`cg_particles.c`), which is a different mechanism (blood clouds, bleed, blood pools), not written up here.
