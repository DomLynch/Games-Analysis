# latentcollapse-RustDAoC (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/motion.rs` | Licence: GPL-3.0-or-later (LICENSE file, GNU GPL v3 text; workspace Cargo.toml `license = "GPL-3.0-or-later"`) | Rust | symbol `MotionTracker::resolve`

Checked: Read `motion.rs` in full (391 lines, tests included). Callers read: `caer-render/src/lib.rs` 419-424 and 506-512 and 630 (`render_world`), `caer-render/src/bin/rustdaoc.rs` 4837-4862 (`frame`: dt, drain, then render) and 5380-5392 (the live `render_world` call). Transport read: `caer-render/src/live.rs` 29-31, 380-470, 580, 710-750; `caer-client/src/lib.rs` 45-48, 120-160, 206-240. Confidence: high on the constants and the order of operations inside `resolve`. Medium on the claim that this is the only place remote entities get their drawn position: I did not read `caer-render/src/entities.rs` (3294 lines) beyond the grep hits. The server tick is NOT in this repo (README: server lives in the separate CamelotCore project). A grep for rollback, lag compensation, reconcile and server tick found nothing in the client. camera_scope: not a camera cell.

## 1. Mechanism

- Purpose (the file's own header): a mob's position arrives from the server in sparse packets. Drawing the packet position directly made it stand still while its walk cycle played, then jump. The fix is a client-side view of remote actors: dead reckoning plus easing.
- Input per call: the entity id, the latest server position, the render clock `now` (seconds), and the frame delta `dt`. Output: the position to draw and a `measuredSpeed` that drives the locomotion clip.
- Order of operations inside one `resolve` call (`motion.rs` 91-154):
  (a) First sight: a new track starts at the server position with zero velocity (92-98).
  (b) `last_seen = now` (99).
  (c) If the server position moved by more than 0.1 units (squared distance over 0.01, 102-103):
      - if the jump is over 2000 units (104), the drawn position is cut to the server position and the velocity is zeroed (107-108);
      - otherwise the velocity is `(new - old) / gap`, where `gap` is the time since the previous change, floored at 1 ms (110-115). If the HORIZONTAL speed (x and y only, 116) is over 400 units/s, the velocity is zeroed (118-122). A real speed up to 400 is kept, including its z component.
      - the server position and its time are re-anchored (124-125).
  (d) Prediction: `elapsed = clamp(now - server_at, 0, 1.5)` (129); `predicted = server + velocity * elapsed` (130-134). Heading is never read.
  (e) Ease, on EVERY call, even when the server did not change: `k = 1 - exp(-12 * dt)` (138), then `rendered += (predicted - rendered) * k` per axis (139-141).
  (f) Stale: if `now - server_at > 1.5` (144), the reported speed is 0 (145-149). Otherwise it is the horizontal length of the velocity.
- Caller order (`rustdaoc.rs` frame, 4837 on): `dt` = wall time since the last frame, capped at 0.1 s (4848). Server events are folded in first (`drain_into`, 4862). Then `render_world` runs with `dt` and the tracker (5380-5392). Inside `render_world` (`lib.rs` 506-512) every visible entity except the player (`Kind::Self_`) goes through `resolve`. The dev lens and screenshots pass `None` and get the raw packet position (`lib.rs` 419-424 comment). `prune(anim_time, 10.0)` runs at `lib.rs` 630.
- Transport that feeds the samples (read, not part of the mechanism itself): a feed thread (`live.rs` ~404-600) calls `LiveSession::poll`, which uses a 100 ms socket read timeout (`caer-client/src/lib.rs` 45) and forwards decoded events over an 8192-slot channel (`live.rs` 29). The render thread drains it without blocking (`drain_into`, `live.rs` 710-750).
- Tick: in the render path this file sits on, the step is the variable frame delta `dt` (rustdaoc.rs 4848). Other fixed cadences exist but were not part of this mechanism: a headless bot's `TICK_MS` 200 (`caer-client/src/main.rs` 498) and a presentation tick in `caer-world` (not read). No server tick, rollback or lag compensation is in this repo.

## 2. Key functions

- `MotionTracker::resolve`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/motion.rs` 91-154. Whole mechanism: first sight, snap or measure, predict, ease, stale speed.
- `MotionTracker::prune`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/motion.rs` 158-160 (drops tracks not seen for `keep` seconds).
- Constants block: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/motion.rs` 22-47 (SNAP_DISTANCE 28, CORRECTION_PER_SEC 34, MAX_PREDICT_SECONDS 41, MAX_BELIEVABLE_SPEED 47).
- Per-frame caller: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/lib.rs` 506-512 (`resolve` for non-player entities).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Velocity measured from two consecutive server samples, not from a reported heading | none (the choice itself) |
| Teleport cut: a sample jump over the snap distance is drawn at once, velocity zeroed | `SNAP_DISTANCE` 2000 units (motion.rs 28) |
| Reject an implausible measured speed (horizontal) and use zero velocity | `MAX_BELIEVABLE_SPEED` 400 units/s (motion.rs 47); the donor's own comment says DAoC's clean ceiling is about 191 u/s (motion.rs 45) |
| Predict only up to a capped time past the last sample, then hold | `MAX_PREDICT_SECONDS` 1.5 s (motion.rs 41) |
| Ease toward the prediction, frame-rate independent: `k = 1 - exp(-rate * dt)` | `CORRECTION_PER_SEC` 12 per second (motion.rs 34); the donor's comment says this is its own tuning, not the client's |
| Ignore changes under 0.1 units (squared distance 0.01) | 0.01 squared (motion.rs 103) |
| Frame delta clamp for the ease step | 0.1 s cap (rustdaoc.rs 4848, a caller constant) |
| Speed for the walk clip comes from motion, not the wire | none (the choice itself; motion.rs 145-149) |

## 4. TypeScript sketch

simplified: keeps the donor order (first sight, snap or measure with the speed check, capped prediction, ease, then the stale check for reported speed). It omits the caller's exclusion of the player entity, the Rust map and f32 precision (it uses a JS Map and doubles), the `prune` schedule (the prune method is included but not wired to a schedule), and the `Math.hypot` form of the speed (identical in value). The sketch is clean-room, written from the described mechanism.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type V3 = [number, number, number];

const SNAP_DISTANCE = 2000;        // units: a sample-to-sample jump this big is a teleport, so cut
const CORRECTION_PER_SEC = 12;     // 1/s: exponential ease rate toward the prediction
const MAX_PREDICT_SECONDS = 1.5;   // s: stop extrapolating this long after the last sample
const MAX_BELIEVABLE_SPEED = 400;  // units/s: horizontal speed above this is rejected

interface Track {
  server: V3;        // last authoritative sample
  serverAt: number;  // render-clock time that sample arrived
  rendered: V3;      // where we draw it
  velocity: V3;      // measured from consecutive samples, not from a reported heading
  lastSeen: number;
}

interface Motion { pos: V3; measuredSpeed: number; }

function dist2(a: V3, b: V3): number {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

class RemoteMotion {
  private tracks = new Map<number, Track>();

  resolve(id: number, server: V3, now: number, dt: number): Motion {
    let t = this.tracks.get(id);
    if (t === undefined) {
      t = { server, serverAt: now, rendered: [server[0], server[1], server[2]], velocity: [0, 0, 0], lastSeen: now };
      this.tracks.set(id, t);
    }
    t.lastSeen = now;

    // A changed sample is a fresh update: measure velocity from it, then re-anchor.
    if (dist2(t.server, server) > 0.01) {
      if (dist2(t.server, server) > SNAP_DISTANCE * SNAP_DISTANCE) {
        t.rendered = [server[0], server[1], server[2]];
        t.velocity = [0, 0, 0];
      } else {
        const gap = Math.max(now - t.serverAt, 1e-3);
        const v: V3 = [
          (server[0] - t.server[0]) / gap,
          (server[1] - t.server[1]) / gap,
          (server[2] - t.server[2]) / gap,
        ];
        const speed = Math.hypot(v[0], v[1]);
        t.velocity = speed <= MAX_BELIEVABLE_SPEED ? v : [0, 0, 0];
      }
      t.server = server;
      t.serverAt = now;
    }

    // Predict along the measured velocity, capped so a stale track does not wander off.
    const elapsed = Math.min(Math.max(now - t.serverAt, 0), MAX_PREDICT_SECONDS);
    const predicted: V3 = [
      t.server[0] + t.velocity[0] * elapsed,
      t.server[1] + t.velocity[1] * elapsed,
      t.server[2] + t.velocity[2] * elapsed,
    ];

    // Ease toward the prediction; the fraction is frame-rate independent.
    const k = 1 - Math.exp(-CORRECTION_PER_SEC * Math.max(dt, 0));
    for (let i = 0; i < 3; i++) t.rendered[i] += (predicted[i] - t.rendered[i]) * k;

    const stale = now - t.serverAt > MAX_PREDICT_SECONDS;
    const measuredSpeed = stale ? 0 : Math.hypot(t.velocity[0], t.velocity[1]);
    return { pos: [t.rendered[0], t.rendered[1], t.rendered[2]], measuredSpeed };
  }

  prune(now: number, keep: number): void {
    for (const [id, t] of this.tracks) {
      if (now - t.lastSeen > keep) this.tracks.delete(id);
    }
  }
}
```

Typecheck: `tsc --noEmit --strict --target es2020` on the VPS, file with `export {}` appended, exit 0.

## 5. Lands in

- TARGET `src/fight/remote-motion.ts` (new, client-side view of server actors). It draws remote actors only. It never decides hits, kills or loot; those stay server-verified and read the server position.
- Parity-checklist row 18 (loot roll and XP award), sub-line "server tick: fixed step, input intake, per-tick NPC budget". Honest scope: this is the client half of server-to-client sync (how often samples arrive and how they are shown), not the server tick itself. The server tick has no code in this donor.
- Locomotion: the measured speed should drive the creature walk clip (row 7 territory, not cited here as the parity row).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the view is a client projection; kills stay server-verified); addendum post-K item 3 sub-line named above.

Best transferable idea: Draw remote enemies by dead-reckoning their MEASURED velocity from the last two server samples, cap the extrapolation at about 1.5 s, and ease toward it with a frame-rate-independent rate, so a sparse feed looks continuous without ever being used to decide a hit.

Decision (proposed): adapt - take the shape (measured velocity, capped prediction, snap over a big jump, exponential ease, speed from motion) but keep it a view of zone actors only and never use the predicted point for hits, since our kills are server-verified and the donor predicts without any server authority.

Acceptance: a server-side test asserts that hit and kill resolution reads only the authoritative sample; a browser check shows a mob sent every 500 ms at 100 units/s moving every frame at 60 fps, a jump over 2000 units drawn at once, and a mob with no update for 1.5 s standing idle.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the Rust lines.
- The donor's own comments say the 12-per-second ease is their tuning, and that DAoC's speed ceiling is about 191 units/s. Frankendom's numbers must come from our own measured feed, not copied.
- The donor claims the server sends NPC positions "every few hundred milliseconds at best" (motion.rs 3). That is the donor's claim; I did not measure DAoC's rate, and it does not hold for our server.
- The donor argues against heading-based prediction (motion.rs 60-63). A mob that turns sharply is drawn wrong until the next sample. Accepted by the donor; we must accept it knowingly.
- The snap threshold is on the jump between two server samples, not on prediction error. A late packet that moves a long way is cut, not eased.
- Client only: no server tick, no rollback, no lag compensation in this repo. Our one-engine, server-verified rule means this donor gives us the view, not the authority.
- Player exclusion: the donor skips smoothing for the player's own entity (lib.rs 508), because the client integrates its own movement. Frankendom's Pit and zones must keep the same split or the local player will rubber-band.
- Stale rule: after 1.5 s the entity stops being predicted and reports zero speed, but it is not snapped back. It holds at the capped prediction point. A stalled server would leave every remote mob hovering short of its real position until the next sample.
- `MAX_BELIEVABLE_SPEED` is one number for every actor. A zone or class with faster mounts would need it as data; I did not read how mounts are handled (not read).

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine; client view only; kills server-verified)
