// Event-driven HUD cue sequencer, shape only (clean-room, Valve licence).
// A named event holds timed commands: an animate tweens one variable; a run or stop starts or ends another event.
type Interp = "linear" | "accel" | "deaccel";

type AnimateCmd = { kind: "animate"; variable: string; target: number; interp: Interp; start: number; dur: number };
type EventCmd = { kind: "run" | "stop"; event: string; delay: number };
type Cmd = AnimateCmd | EventCmd;

type Tween = { event: string; variable: string; interp: Interp; start: number; end: number; from: number | null; to: number };
type Posted = { event: string; cmd: EventCmd; at: number };

// theirs: AnimationController.cpp:958-962 (accel = t*t, deaccel = sqrt(t), linear is the default)
function ease(t: number, interp: Interp): number {
  if (interp === "accel") return t * t;
  if (interp === "deaccel") return Math.sqrt(t);
  return t;
}

// Example events (values as in game/mod_hl2mp/scripts/HudAnimations.txt, alpha channel only).
const EVENTS = new Map<string, Cmd[]>([
  ["HudTakeDamageLeft", [
    { kind: "animate", variable: "left.alpha", target: 200, interp: "linear", start: 0, dur: 0.3 },
    { kind: "animate", variable: "left.alpha", target: 0, interp: "deaccel", start: 0.3, dur: 0.5 },
  ]],
  ["HudTakeDamageRight", [
    { kind: "animate", variable: "right.alpha", target: 200, interp: "linear", start: 0, dur: 0.3 },
    { kind: "animate", variable: "right.alpha", target: 0, interp: "deaccel", start: 0.3, dur: 0.5 },
  ]],
  ["HudTakeDamageBehind", [
    { kind: "run", event: "HudTakeDamageLeft", delay: 0 },
    { kind: "run", event: "HudTakeDamageRight", delay: 0 },
  ]],
  ["HudPlayerDeath", [
    { kind: "animate", variable: "full.alpha", target: 96, interp: "deaccel", start: 0.1, dur: 0.2 },
    { kind: "animate", variable: "full.alpha", target: 255, interp: "deaccel", start: 0.3, dur: 4.0 },
  ]],
  ["HealthPulse", [
    { kind: "animate", variable: "health.alpha", target: 255, interp: "linear", start: 0, dur: 0.1 },
    { kind: "animate", variable: "health.alpha", target: 128, interp: "deaccel", start: 0.1, dur: 0.7 },
    { kind: "run", event: "HealthLoop", delay: 0.8 },
  ]],
  ["HealthLoop", [
    { kind: "run", event: "HealthPulse", delay: 0 },
  ]],
]);

export class CueSequencer {
  private values = new Map<string, number>();
  private tweens: Tween[] = [];
  private posted: Posted[] = [];
  private now = 0;

  constructor(private readonly events: Map<string, Cmd[]>) {}

  value(variable: string): number {
    return this.values.get(variable) ?? 0;
  }

  // A re-hit first cancels the event's own queued work, so the cue restarts instead of stacking (theirs: AnimationController.cpp:1063).
  start(event: string): void {
    this.cancel(event);
    for (const c of this.events.get(event) ?? []) {
      if (c.kind === "animate") {
        this.tweens.push({
          event, variable: c.variable, interp: c.interp,
          start: this.now + c.start, end: this.now + c.start + c.dur,
          from: null, to: c.target,
        });
      } else {
        this.posted.push({ event, cmd: c, at: this.now + c.delay });
      }
    }
  }

  cancel(event: string): void {
    this.tweens = this.tweens.filter((t) => t.event !== event);
    this.posted = this.posted.filter((p) => p.event !== event);
  }

  update(now: number): void {
    this.now = now;

    // Run due commands. A run of an event already started this tick is dropped, which ends ping-pong loops within one tick (theirs: AnimationController.cpp:736-741).
    const ranThisTick = new Set<string>();
    for (;;) {
      const i = this.posted.findIndex((p) => p.at <= now);
      if (i < 0) break;
      const [p] = this.posted.splice(i, 1);
      if (p.cmd.kind === "run") {
        if (!ranThisTick.has(p.cmd.event)) {
          ranThisTick.add(p.cmd.event);
          this.start(p.cmd.event);
        }
      } else {
        this.cancel(p.cmd.event);
      }
    }

    // Tween. Start from the value present at the first tick at or after the start time, then ease (theirs: AnimationController.cpp:837-856).
    for (const t of this.tweens) {
      if (now < t.start) continue;
      if (t.from === null) t.from = this.value(t.variable);
      const v = now >= t.end
        ? t.to
        : t.from + (t.to - t.from) * ease((now - t.start) / (t.end - t.start), t.interp);
      this.values.set(t.variable, v);
    }
    this.tweens = this.tweens.filter((t) => now < t.end);
  }
}

// Which cue to play for a hit. First match wins. Typed kinds come first; then angle bins (degrees): 45-135 left, 225-315 right, 135-225 behind.
// heavy = damage above 25 or no suit (theirs: hud_damageindicator.cpp:361-370); heavy hits use the High events.
// theirs: hud_damageindicator.cpp:98-117
export type DamageKind = "drown" | "poison" | "burn" | "radiation" | null;

export function damageEvent(angleDeg: number, heavy: boolean, kind: DamageKind): string {
  if (kind !== null) {
    return "HudTakeDamage" + kind.charAt(0).toUpperCase() + kind.slice(1);
  }
  const within = (lo: number, hi: number): boolean => angleDeg >= lo && angleDeg <= hi;
  if (heavy) {
    if (within(45, 135)) return "HudTakeDamageHighLeft";
    if (within(225, 315)) return "HudTakeDamageHighRight";
    return "HudTakeDamageHigh";
  }
  if (within(45, 135)) return "HudTakeDamageLeft";
  if (within(225, 315)) return "HudTakeDamageRight";
  if (within(135, 225)) return "HudTakeDamageBehind";
  return "HudTakeDamageFront";
}

// Usage: one sequencer per HUD, one call per hit.
export function demo(): number {
  const seq = new CueSequencer(EVENTS);
  seq.start(damageEvent(90, false, null));
  seq.update(0.15);
  return seq.value("left.alpha");
}

export {};
