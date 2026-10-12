# ValveSoftware-halflife (hud-ui, cell 1)

Donor: `/mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/health.cpp` | Licence: Valve, Half-Life 1 SDK LICENSE (root `LICENSE`: free use "to develop a modified Valve game running on the Half-Life 1 engine"; the cl_dll header says use is "restricted to non-commercial enhancements to products from Valve LLC. All other use, distribution, or modification is prohibited without written permission") | C++ | symbol `CHudHealth::CalcDamageDirection`

Checked: read `health.cpp` lines 54-474 in full (lines 1-53 not read in full: copyright header and the start of the `giDmgFlags` table were seen only through grep). Also read `ammohistory.cpp` (1-187) and `ammohistory.h` in full, `ammo.cpp` call sites (160-165, 292-303, 508-540, 865-882) and `hud_redraw.cpp` 98-108. Callers checked by grep across `cl_dll/`: `CalcDamageDirection` is called only from `MsgFunc_Damage` (health.cpp:136); `DrawPain` only from `Draw` (health.cpp:232). Not read: `AngleVectors` (an engine function pointer, cl_util.h:90; engine side not read), the sprite files (pain sprite frame order is inferred from the frame indices 0-3 passed to `SPR_DrawAdditive`), and the server code that fills the damage message's source position. Confidence: high on the order of operations and the numbers; medium on the sprite frame mapping. Candidate chosen: the pain compass, because it says where a hit came from, which matters for three attackers. The other candidate read in full, the ammo and item pickup feed in `ammohistory.cpp`, is not written up because a cell takes one mechanism; its one defect is noted in section 6. Not a camera cell.

## 1. Mechanism

- Damage message: `CHudHealth::MsgFunc_Damage` (119-137) reads armour, damage taken, the damage bits and a three-value source position (READ_COORD, 125-130). It calls `UpdateTiles` (damage-type icons, 132), then calls `CalcDamageDirection(vecFrom)` only when damage or armour is above zero (135-136).
- Storing the direction: `CalcDamageDirection` (235-292) first clears all four sides when the source vector is all zero (241-245). Otherwise it takes the vector from the player's origin to the source, normalises it and takes two dot products with the player's forward and right vectors (248-260). If the source is within 50 units (the donor uses the full 3D length) all four sides are set to 1 (262-265). Otherwise a forward side is set only when its magnitude is above 0.3 (270-277), a right or left side likewise (282-289), and each side keeps the maximum over the hits (271, 277, 283, 289). The donor's variable `front` holds the right-vector dot product and is stored in `m_fAttackRight` (259, 283); the names are off by one meaning, and the sketch calls it `across`.
- Drawing: `DrawPain` (294-366) runs from `Draw` (232). For each side above 0.4 (308, 322, 336, 350) it draws one sprite frame (0 top, 1 right, 2 rear, 3 left; sprite contents not read) at a screen position from the sprite size, with brightness `a * max(value, 0.5)` (311; `a` is 255 at 303) and the colour from `GetPainColor` (144-168: yellow above 25 health, red at or below 25). After drawing, the side loses `frame delta * 2` (305, 318, 332, 346, 361). A side at or below 0.4 is set to zero instead (320, 334, 348, 363), so the last part of the fade never plays. The frame delta is clamped to zero (hud_redraw.cpp:106-107).
- Stored once: `CalcDamageDirection` writes four numbers at hit time from the view it reads then (`gHUD.m_vecOrigin`, `gHUD.m_vecAngles`, 248-249). `DrawPain` reads only those four numbers, so the cue does not turn when the player turns.
- Health number (same file): `MsgFunc_Health` (100-116) sets the fade timer to `FADE_TIME` (100, hud.h:169) when health changes (111). `Draw` takes 20 per second of frame delta off it (185) and sets the alpha to `MIN_ALPHA` (100, hud.h:39) plus `(fade / FADE_TIME) * 128` (194). So a change flashes to 228 and dims back to 100 over about 5 s. At 15 or below the alpha is 255 (201-202).
- Damage-type icons: `DrawDamage` (368-427) pulses each active icon with `fabs(sin(flTime*2)) * 256` (378). An icon is removed only when its two-second life (`DMG_IMAGE_LIFE` = 2, health.h:16) has run out and the pulse is at its low point, `a < 40` (404-405). New icons go at the bottom and the others move up (`UpdateTiles`, 453-467); removing one moves the icons above it down (409-419).

## 2. Key functions

- `CHudHealth::MsgFunc_Damage`: `health.cpp` 119-137. Reads the message, calls the icon update and the direction, returns.
- `CHudHealth::CalcDamageDirection`: `health.cpp` 235-292. The four-side projection, the 50-unit rule, the 0.3 set threshold and the max per side.
- `CHudHealth::DrawPain`: `health.cpp` 294-366. The per-frame draw, the 0.4 draw threshold, the delta fade and the snap to zero.
- `CHudHealth::MsgFunc_Health` and `CHudHealth::Draw`: `health.cpp` 100-116 and 170-232. The health-number flash and the low-health alpha.
- `CHudHealth::DrawDamage` and `CHudHealth::UpdateTiles`: `health.cpp` 368-427 and 430-474. The damage-type icon pulse, expiry and stacking.
- `CHud::Redraw`: `hud_redraw.cpp` 98-108. Sets `m_flTime` and `m_flTimeDelta` (102) and clamps a negative delta (106-107).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Four screen sides lit from the dot products of the hit direction with the view's forward and right; max per side | Four sides (theirs, 318-363); set threshold 0.3 (theirs, 270-288) |
| Full indicator for a source within a small radius of the player | 50 units (theirs, 262) |
| Linear fade by frame delta | Delta times 2 (theirs, 305): full to zero in about 0.5 s (derived: 1 / 2) |
| Draw threshold that differs from the set threshold | 0.4 (theirs, 308); this mismatch is a defect, see section 6 |
| Flash on value change, then dim | `FADE_TIME` 100 at 20 per s (theirs, hud.h:169 and health.cpp:185): about 5 s; `MIN_ALPHA` 100 (theirs, hud.h:39) |
| Expire a repeating cue only at the low point of its pulse | Pulse `sin(2t)` and threshold 40 of 256 (theirs, 378 and 405); life 2 s (theirs, health.h:16) |

## 4. TypeScript sketch

simplified: omits the donor's brightness floor (`max(value, 0.5)`, health.cpp:311), the sprite placement and sizes, the damage-type icons, the health-number flash, the 3D distance (2D here) and the view-vector source (`fwd` and `right` are passed in, because the donor's `AngleVectors` is an engine pointer that was not read). It changes four things on purpose: world-space storage projected each frame, one threshold for set and draw, a hit with no source is ignored (not cleared), and a delta fade with no snap-off.

```ts
// Pain compass, shape only (clean-room, Valve licence). World-space hits, projected onto the view each frame.
type Vec2 = { x: number; y: number };

// dir: unit vector from the player TO the attacker (world XY). dir null = on top of the player (all four sides).
export type Hit = { dir: Vec2 | null; strength: number };

export interface Compass { front: number; rear: number; left: number; right: number }

const ON_TOP_RADIUS = 50; // theirs: health.cpp:262 (donor uses 3D length; 2D here)
const SIDE_MIN = 0.3;     // theirs: health.cpp:270-288 sets at 0.3, draws only above 0.4 (308, 322, 336, 350); fixed: one value
const FADE_PER_S = 2;     // theirs: health.cpp:305 (frame delta * 2), linear to zero

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

// fix: a hit with no source is ignored (donor clears the compass on a zero vector, health.cpp:241-245)
export function addHit(hits: Hit[], attacker: Vec2 | null, player: Vec2): void {
  if (attacker === null) return;
  const dx = attacker.x - player.x;
  const dy = attacker.y - player.y;
  const len = Math.hypot(dx, dy);
  if (len <= ON_TOP_RADIUS) {
    hits.push({ dir: null, strength: 1 });
  } else {
    hits.push({ dir: { x: dx / len, y: dy / len }, strength: 1 });
  }
}

// fwd and right are the current view's unit vectors on the ground plane.
// fix: projected every frame, so an indicator turns with the player (donor stored four numbers once, at hit time).
export function compassFor(hits: Hit[], fwd: Vec2, right: Vec2): Compass {
  const c: Compass = { front: 0, rear: 0, left: 0, right: 0 };
  for (const h of hits) {
    if (h.dir === null) {
      c.front = Math.max(c.front, h.strength);
      c.rear = Math.max(c.rear, h.strength);
      c.left = Math.max(c.left, h.strength);
      c.right = Math.max(c.right, h.strength);
      continue;
    }
    const side = dot(h.dir, fwd);
    const across = dot(h.dir, right);
    if (side > SIDE_MIN) c.front = Math.max(c.front, side * h.strength);
    else if (-side > SIDE_MIN) c.rear = Math.max(c.rear, -side * h.strength);
    if (across > SIDE_MIN) c.right = Math.max(c.right, across * h.strength);
    else if (-across > SIDE_MIN) c.left = Math.max(c.left, -across * h.strength);
  }
  return c;
}

// Fade by frame delta. A hit is removed only at zero, so nothing snaps off at 0.4 (donor: health.cpp:320).
export function tick(hits: Hit[], dt: number): void {
  for (const h of hits) {
    h.strength = Math.max(0, h.strength - dt * FADE_PER_S);
  }
  for (let i = hits.length - 1; i >= 0; i--) {
    if (hits[i].strength === 0) hits.splice(i, 1);
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hud.ts` (proposed client HUD module; I did not read the repo for it), parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea
- Brief rule served: 1 (one combat core, two clients). The compass is a client view of a hit the server has already verified; it adds no rule of its own.

## 6. Gaps and risks

- Valve licence: clean-room only. Use the shape (four sides, max per side, 50-unit rule, delta fade); do not copy lines.
- Defects in the donor, each with its fix (the sketch has the fix):
  1. Stale direction. The four sides are set once at hit time from the view then (248-249, 262-289) and `DrawPain` never re-projects them (294-366). Fix: store the world direction and project every frame (`compassFor`).
  2. Set and draw thresholds differ (0.3 at 270-288, 0.4 at 308-350). A side between 0.3 and 0.4 is stored and then zeroed without ever drawing (320). Fix: one threshold (`SIDE_MIN`).
  3. Snap-off. A side at or below 0.4 is set to zero (320, 334, 348, 363), so the fade's last 0.4 never plays. Fix: draw while the value is above zero and remove at zero (`tick`).
  4. A source with all-zero coordinates clears the compass (241-245), so a directionless hit wipes live cues. Fix: ignore it (`addHit`).
- Design gap, not a defect: a source almost directly above or below the player has both dot products at or below 0.3, so no side lights (270-288). For Frankendom, either light the nearest side or add a centre flash.
- Camera: the sides are relative to the view's yaw. With an over-the-shoulder world camera, use the camera's forward and right, not the body's facing. The donor is first-person, so it does not show this.
- Three attackers (MAX_ATTACKERS = 3) can light three sides together; the max-per-side rule keeps four cues readable. Keep the cues at the edges of the central fight area so they do not cover the enemies at 375 wide. Not measured.
- Data needed: the hit event must carry the attacker's world position. That is a server fight-event field and is not in the donor's HUD code; the donor's source is the damage message's vector, whose server origin was not read.
- `ammohistory.cpp` (not written up): the pickup feed's `return 1` at line 148 (unknown weapon) returns from the whole draw loop, so one unknown weapon hides every later entry for that frame (`continue` is the fix). Its `abs()` on `READ_BYTE` (ammo.cpp, MsgFunc_AmmoPickup) is a no-op on an unsigned value (READ_BYTE definition not read).

Best transferable idea: Mark each hit as a fading cue on the side it came from, stored in world space and projected onto the current view every frame, with max-per-side so three attackers stay readable.

Decision (proposed): adapt - keep the four-side cue and the 50-unit on-top rule, with the four donor defects fixed (stale direction, two thresholds, snap-off, cleared-on-no-source), because Frankendom needs "where did that come from" for up to three attackers and the cue must follow the world camera's yaw.

Acceptance: At 375 wide in a zone fight, a hit from the player's right lights a cue on the right edge that fades to nothing over about 0.5 s and stays on the attacker's side as the player turns; with three attackers at front, left and rear, three cues show together; a server test asserts that the hit event carries the attacker's position.
