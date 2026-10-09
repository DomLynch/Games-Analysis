# endless-sky-endless-sky (camera, cell 14)

Donor: /mnt/frankendom-donors/endless-sky-endless-sky/source/Camera.cpp | Licence: GPL-3.0-or-later (per Camera.cpp header) | C++ | symbol Camera::MoveTo
Symbol check: Camera::SnapTo (31-42) and Camera::MoveTo (46-75) confirmed on the VPS. The input line 46 is the start of MoveTo.

## 1. Mechanism
- A camera that follows a moving target point (the player's ship) in world coordinates. MoveTo(target, hyperspaceInfluence) runs once per frame and updates the centre and velocity.
- It keeps the previous target (oldTarget). The target's per-frame motion is baseVelocity = target minus oldTarget.
- If the acceleration option is off, the centre jumps to the target, velocity is the base velocity, and accel is zero.
- Otherwise there are two lerps. First, the lead (accel) moves toward the base velocity by 0.1 (velocity tracking). Second, the centre moves to the centre plus that lead, then toward the target by 0.01 (position centring). This gives a camera that leads a moving ship and settles on it.
- Hyperspace: when the influence is non-zero (the donor tests truthiness, line 67; the sketch tests above zero), the centre is pulled further toward the target by the square root of the influence (faster centring), and the lead is set to the base velocity instead of being blended.
- An accel-reversed option (multiplier -1, line 58) mirrors the stored lead about the base velocity (lines 61 and 74: the stored value is lerped with the base velocity by the multiplier), so the lead pushes the other way. In the normal mode the multiplier is 1 and the stored value is the lead itself.
- SnapTo(target, keepVelocity) sets the centre and oldTarget to the target. With keepVelocity, both the centre and oldTarget are set to the target minus the current velocity (centre = target minus velocity) so the camera keeps moving through a jump, and velocity and accel are zeroed (MoveTo recomputes them later in the frame).
- Inputs: target point, hyperspace influence, the acceleration preference. Output: centre, velocity, accel. Runs once per frame.

## 2. Key functions
- Camera::SnapTo (endless-sky) | /mnt/frankendom-donors/endless-sky-endless-sky/source/Camera.cpp | 31-42 | hard jump; optional keep-velocity offset.
- Camera::MoveTo (endless-sky) | /mnt/frankendom-donors/endless-sky-endless-sky/source/Camera.cpp | 46-75 | per-frame lead and centre update; hyperspace and accel-off branches.
- Camera::Center and Camera::Velocity (endless-sky) | /mnt/frankendom-donors/endless-sky-endless-sky/source/Camera.cpp | 79-89 | read-only getters for the centre and the per-frame velocity the caller uses.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Lead tracking: blend the lead toward the target's velocity | CAMERA_VELOCITY_TRACKING = 0.1 (theirs; Camera.cpp line 25) |
| Centring: ease the centre onto the target | CAMERA_POSITION_CENTERING = 0.01 (theirs; line 26) |
| Faster centring when a special state needs it, by the square root of the state strength | pow(influence, .5) exponent on hyperspace influence (theirs; line 68) |
| Jump that keeps velocity through a cut | none (algorithm) |
| Accel off: centre equals target | a user preference (theirs) |

## 4. TypeScript sketch
simplified: the accel-off branch (centre = target, velocity = base velocity, early return, lines 50-56) and the reversed-accel multiplier (lines 58-61, 74) are omitted, so the multiplier is fixed at 1; hyperspace influence is treated as a plain number, and the stored lead is the donor's accel.

```ts
// Licence: GPL-3.0-or-later (endless-sky-endless-sky). CLEAN-ROOM: written from the mechanism, no donor lines.
type P = { x: number; y: number };
const add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: P, b: P): P => ({ x: a.x - b.x, y: a.y - b.y });
const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const TRACK = 0.1;             // velocity tracking (theirs)
const CENTRE = 0.01;           // position centring (theirs)

class Follow {
  centre: P = { x: 0, y: 0 };
  velocity: P = { x: 0, y: 0 };
  lead: P = { x: 0, y: 0 };
  private old: P = { x: 0, y: 0 };

  snapTo(target: P, keepVelocity: boolean): void {
    this.old = keepVelocity ? sub(target, this.velocity) : target;
    this.centre = this.old;
    this.velocity = { x: 0, y: 0 };
    this.lead = { x: 0, y: 0 };
  }

  moveTo(target: P, hyper = 0): void {
    const base = sub(target, this.old);
    this.old = target;
    const newLead = lerp(this.lead, base, TRACK);                 // lead follows target velocity
    let c = lerp(add(this.centre, newLead), target, CENTRE);      // ease centre onto target
    if (hyper > 0) c = lerp(c, target, Math.sqrt(hyper));         // faster centring in hyperspace
    this.velocity = sub(c, this.centre);
    this.centre = c;
    this.lead = hyper > 0 ? base : newLead;                       // no lead blend while in hyperspace
  }
}
```

## 5. Lands in
- Frankendom target: src/fight/camera.ts (today: src/camera* (moving)). The lead-and-centre pattern is a candidate for the fight camera's follow.
- Parity row: 11 (fight camera, camera kick, standoff; Zone 1 has its own follow cam today).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later)
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- Space-flight specific: the hyperspace branch and the velocity-lead model suit a ship that moves fast in one direction. A melee fight camera may need a different lead, and has no use for the hyperspace branch.
- The reversed-accel and accel-off options are player preferences with no reuse value here.
- Frame-based constants (0.1, 0.01 per frame) are not time-based. Frankendom's engine steps at 60 Hz, so they can stay per tick only if the camera runs in the same fixed loop; otherwise convert to dt.
- One engine, zones as data: this would be one shared src/fight/camera.ts used by the Pit client and every zone, replacing Zone 1's own follow cam (row 11), not a per-zone copy.
- Server-verified kills and replay (row 19): camera state is presentation only and must never feed the sim or the record. The donor camera reads target state and does not change it.
- Single target only: no framing for the hero plus up to MAX_ATTACKERS = 3 attackers.
