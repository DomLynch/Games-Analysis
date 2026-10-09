# id-Software-Quake (camera, cell 14)

Donor: /mnt/frankendom-donors/id-Software-Quake/QW/client/cl_cam.c | Licence: GPL-2.0 (gnu.txt) | C (QuakeWorld client; QuakeC scripts are not involved) | symbol Cam_Track / Cam_Lock
Symbol check: Cam_Lock (123), Cam_TryFlyby (151), Cam_IsVisible (184), InitFlyby (201) and Cam_Track (315) confirmed on the VPS.

## 1. Mechanism
- A spectator camera that follows another player. Cam_Track(cmd) runs once per built client command (called from CL_SendCmd in cl_input.c, lines 411-413, only when cl.spectator), and returns early unless autocam is on and the connection state is active (lines 328-329). Inputs: the tracked player's state from the latest frame, the spectator's state, the lock and auto-camera flags, chase or flyby mode.
- If the tracked player has left (empty name) or become a spectator while locked, the lock is dropped and Cam_Track returns for this command (lines 331-338): with cl_hightrack on it calls Cam_CheckHighTarget (291-309: pick the non-spectator player with the most frags, lock on if not locked or that player has more frags than the current one; no candidate means Cam_Unlock), otherwise Cam_Unlock. Cam_CheckHighTarget is also called when not locked and high-track is on (lines 325-326).
- If the spectator is not locked, or the tracked player is not visible from the camera's current desired spot (Cam_IsVisible, 184-199: a trace from the player to the spot must have fraction 1, not be in water, and the spot must be at least 16 units from the player), it calls InitFlyby, with the visibility check on. If that first pass fails, Cam_Track calls InitFlyby again with the visibility check off (lines 346-347). A re-search while already locked is throttled: it runs only if more than 0.1 s of real time has passed since the last one (`cam_lastviewtime`); when not locked it always runs (line 345). While the current spot is still visible, the timer is simply refreshed.
- InitFlyby takes the player's view angles with pitch zeroed (lines 207-209, so only yaw matters) and tries twelve candidate directions built from forward, up and right (forward+up+right, forward+up-right, forward+right, forward-right, forward+up, forward-up, up+right-forward, up-right-forward, -forward, forward, -right, right; lines 214-279). Each goes through Cam_TryFlyby: the direction is normalised and a probe 800 units long from the player's origin is traced with PM_PlayerMove (the player-hull movement code, via Cam_DoTrace 136-148, not a point trace). A hit in water returns the reject value 9999, as does a hit closer than 32 or farther than 800 units from the player (lines 165-171). The returned score is that distance, except with the visibility check on: then the score is overwritten with the distance from the spectator's own origin to the hit point (lines 173-174), and a second trace from the spectator to the hit point must have fraction 1 and not be in water (176-178) or the candidate is rejected. The candidate with the lowest score under the initial 1000 wins. If none scores under 1000, InitFlyby returns false (lines 282-285); on success it sets locked and desired_position to the chosen point (286-288).
- Once locked, forward/side/up move are zeroed in both modes (358, 377). Chase mode (cl_chasecam, 357-370): copy the player's view angles into cl.viewangles, set desired_position to the player's origin, send a teleport message (clc_tmove) if that differs from the spectator's origin (memcmp) and set the local origin to it, and copy the weapon frame. Flyby mode (372-391): send clc_tmove if the spectator is more than 16 units from desired_position, always set the local origin to it, and set the view angles to point from the spot at the player (pitch negated).
- Output: client move messages and view angles. Runs at the client command rate, not on a fixed server tick. Related but not part of the sketch: Cam_Lock (123-134) sends the "ptrack" string command, sets spec_track and unlocks until InitFlyby succeeds; Cam_DrawPlayer (104-110) hides the tracked player while chase-camming.

## 2. Key functions
- Cam_Lock (Quake) | /mnt/frankendom-donors/id-Software-Quake/QW/client/cl_cam.c | 123-134 | sends the track command and sets the tracked player.
- Cam_TryFlyby (Quake) | /mnt/frankendom-donors/id-Software-Quake/QW/client/cl_cam.c | 151-181 | one candidate direction: probe 800 units, reject water and out-of-range hits, optional visibility.
- Cam_IsVisible (Quake) | /mnt/frankendom-donors/id-Software-Quake/QW/client/cl_cam.c | 184-199 | unobstructed, not in water, at least 16 units from the player.
- InitFlyby (Quake) | /mnt/frankendom-donors/id-Software-Quake/QW/client/cl_cam.c | 201-289 | tries twelve candidate directions, keeps the nearest hit, sets lock and desired position.
- Cam_Track (Quake) | /mnt/frankendom-donors/id-Software-Quake/QW/client/cl_cam.c | 315-392 | per-command driver: lock checks, visibility, re-target, chase or flyby output.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Pick the nearest unobstructed spot from a set of candidate directions | 12 candidate directions (theirs; lines 214-279), the lowest score wins (the rule is the algorithm) |
| Probe length and accept window | 800 units probe (theirs; line 161); 32 minimum and 800 maximum accept (theirs; line 170) |
| Visibility: unobstructed and not too close | 16 units minimum distance (theirs; line 196) |
| Teleport threshold | 16 units (theirs; line 378) |
| Re-search throttle | 0.1 s (theirs; line 345, cam_lastviewtime) |
| Sentinel for no result | 1000 initial max (line 213, 282) and 9999 reject (lines 166, 171, 178) (theirs) |

## 4. TypeScript sketch
simplified: the 12 direction vectors are passed in by the caller (the donor builds them from the pitch-zeroed view); trace stands in for PM_PlayerMove (hull trace); the reject value 9999 is Infinity; the lock/desired-position state, the 0.1 s throttle, the chase/flyby output, the high-track target pick and the retry with the visibility check off are omitted.

```ts
// Licence: GPL-2.0 (gnu.txt) (id-Software-Quake, QW client). CLEAN-ROOM: written from the mechanism, no donor lines.
type V = { x: number; y: number; z: number };
type Trace = { end: V; hitWorld: boolean; wet: boolean };
const PROBE = 800, MIN_HIT = 32, MAX_HIT = 800, MIN_VIS = 16;   // all theirs

const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// One candidate direction: probe out from the player, accept a nearby, dry, in-range hit.
function tryDir(dir: V, origin: V, trace: (a: V, b: V) => Trace, viewer: V | null): { d: number; spot: V } {
  // score is the distance from the player, or from the viewer when the visibility check is on (as the donor does)
  const n = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const far = { x: origin.x + (dir.x / n) * PROBE, y: origin.y + (dir.y / n) * PROBE, z: origin.z + (dir.z / n) * PROBE };
  const t = trace(origin, far);
  const d = dist(t.end, origin);
  if (t.wet || d < MIN_HIT || d > MAX_HIT) return { d: Infinity, spot: t.end };
  if (viewer) {
    const tv = trace(viewer, t.end);
    if (tv.hitWorld || tv.wet) return { d: Infinity, spot: t.end };   // spot must be seen by the viewer
    return { d: dist(t.end, viewer), spot: t.end };
  }
  return { d, spot: t.end };
}

// Keep the candidate with the nearest hit.
function pickSpot(origin: V, dirs: V[], trace: (a: V, b: V) => Trace, viewer: V | null): V | null {
  let best = 1000, spot: V | null = null;
  for (const dir of dirs) {
    const r = tryDir(dir, origin, trace, viewer);
    if (r.d < best) { best = r.d; spot = r.spot; }
  }
  return spot;
}

// Visible when the trace from the player reaches the spot unobstructed and the spot is not too close.
function isVisible(player: V, spot: V, trace: (a: V, b: V) => Trace): boolean {
  const t = trace(player, spot);
  return !t.hitWorld && !t.wet && dist(player, spot) >= MIN_VIS;
}
```

## 5. Lands in
- Frankendom target: src/fight/camera.ts for any shared helper (the spot-picking trace), with the spectator driver in the replay client; today: src/camera* and src/record (moving). Not fight logic: a spectator is not a fight participant.
- Parity row: 19 (fight record / replay: spectator view of a recorded fight), with 11 (fight camera, standoff) for the unobstructed-spot idea.
- Reuse tag: rewrite-from-idea (GPL-2.0)
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- The donor's visibility check rejects any trace that is not fraction 1 (any obstruction), which the sketch models as hitWorld.
- The donor's traces run on client-side player-move physics (PM_PlayerMove, hull-sized). Frankendom's trace must be a pure function of the arena, so a replay (row 19) gives the same camera.
- Spectator moves are sent to the server (clc_tmove). Frankendom: the server must ignore spectator position for any gameplay decision, and server-verified kills never read camera state; the Pit and zones are clients of one engine, so no per-client camera trace.
- The re-search uses realtime (line 345), not game time. Use game time.
- Fixed arena/zone data: the 12 directions assume enclosed rooms; open zones as data may have no hit under 1000 units, so a fallback pose is needed (the donor just keeps the old spot or fails).
- The camera is a client; no state change for the fight. Not relevant to MAX_ATTACKERS = 3 except as a framing input.
