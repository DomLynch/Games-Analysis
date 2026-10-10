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
