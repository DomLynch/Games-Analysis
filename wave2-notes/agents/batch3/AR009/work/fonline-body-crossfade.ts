// Licence: MIT (donor, cvet/fonline). Clean-room sketch of the mechanism, not a translation of the donor lines.
type EventType = "enable" | "speed" | "weight";
type Slot = 0 | 1;

interface TimelineEvent {
  type: EventType;
  valueTo: number;       // enable: 1 = on, -1 = off
  start: number;         // seconds on the controller's event clock
  smooth: number;        // 0 = jump at start
  from?: number;         // captured on the first frame the event is active
}

interface TrackState {
  enabled: boolean;
  speed: number;         // scales the timeline step for this slot
  weight: number;        // 0..1
  position: number;      // seconds into the clip
  clip: number;          // -1 = none
  events: TimelineEvent[];
  suppressed: Set<string>;
}

function makeTrack(): TrackState {
  return { enabled: false, speed: 0, weight: 0, position: 0, clip: -1, events: [], suppressed: new Set<string>() };
}

function currentValue(t: TrackState, type: EventType): number {
  if (type === "speed") return t.speed;
  if (type === "weight") return t.weight;
  return 0;
}

function applyValue(t: TrackState, type: EventType, value: number): void {
  if (type === "enable") t.enabled = value > 0;
  else if (type === "speed") t.speed = value;
  else t.weight = value;
}

class BodyController {
  readonly tracks: [TrackState, TrackState] = [makeTrack(), makeTrack()];
  current: Slot = 0;
  private eventsTime = 0;

  resetEvents(): void {
    this.eventsTime = 0;
    for (const t of this.tracks) t.events = [];
  }

  addEvent(slot: Slot, type: EventType, valueTo: number, start: number, smooth: number): void {
    this.tracks[slot].events.push({ type, valueTo, start, smooth });
  }

  // dt is already scaled by the global speed before this call.
  advance(dt: number): void {
    this.eventsTime += dt;
    for (const t of this.tracks) {
      t.events = t.events.filter((e) => {
        if (this.eventsTime < e.start) return true;
        let value = e.valueTo;
        let keep = false;
        if (this.eventsTime < e.start + e.smooth) {
          if (e.from === undefined) e.from = currentValue(t, e.type);
          value = e.from + (e.valueTo - e.from) * ((this.eventsTime - e.start) / e.smooth);
          keep = true;
        }
        applyValue(t, e.type, value);
        return keep;
      });
      if (t.enabled) t.position += dt * t.speed;
    }
  }
}

// Fast-transition bones: the outgoing slot stops driving them, so the incoming clip takes them at once.
function resetBonesTransition(c: BodyController, skip: Slot, bones: readonly string[]): void {
  for (const i of [0, 1] as const) {
    if (i === skip) continue;
    for (const b of bones) c.tracks[i].suppressed.add(b);
  }
}

// Body clip switch: the outgoing slot fades out while the other slot fades in over `smooth` seconds.
function switchBody(c: BodyController, clip: number, startTime: number, stopAfter: number | null, smooth: number, fastBones: readonly string[]): void {
  const old = c.current;
  const next: Slot = old === 0 ? 1 : 0;

  if (fastBones.length > 0) resetBonesTransition(c, next, fastBones);
  c.resetEvents();

  if (smooth > 0) {
    c.addEvent(old, "enable", -1, smooth, 0);
    c.addEvent(old, "speed", 0, 0, smooth);
    c.addEvent(old, "weight", 0, 0, smooth);
  } else {
    c.tracks[old].enabled = false;
  }

  c.current = next;
  const n = c.tracks[next];
  n.enabled = true;
  n.clip = clip;
  n.position = startTime;
  n.suppressed.clear();
  c.addEvent(next, "speed", 1, 0, 0);
  if (stopAfter !== null) c.addEvent(next, "speed", 0, stopAfter, 0);
  c.addEvent(next, "weight", 1, 0, smooth);
  c.advance(0);
}

function present(t: TrackState, bone: string): boolean {
  return t.enabled && t.weight > 0 && t.clip >= 0 && !t.suppressed.has(bone);
}

// One scalar per bone stands in for a joint transform. Both slots present: linear mix by slot 1's weight.
// One slot present: that slot alone (full weight). Neither: rest pose.
function blendBody(
  c: BodyController,
  bones: readonly string[],
  sample: (clip: number, pos: number, bone: string) => number,
  rest: (bone: string) => number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const bone of bones) {
    const p0 = present(c.tracks[0], bone);
    const p1 = present(c.tracks[1], bone);
    const s0 = p0 ? sample(c.tracks[0].clip, c.tracks[0].position, bone) : 0;
    const s1 = p1 ? sample(c.tracks[1].clip, c.tracks[1].position, bone) : 0;
    if (p0 && p1) {
      const w1 = c.tracks[1].weight;
      out[bone] = (1 - w1) * s0 + w1 * s1;
    } else if (p0) {
      out[bone] = s0;
    } else if (p1) {
      out[bone] = s1;
    } else {
      out[bone] = rest(bone);
    }
  }
  return out;
}

export {};
