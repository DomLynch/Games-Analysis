// Licence: MIT (donor LICENSE.txt). Shape only; written from the mechanism, not copied line by line.
// Timed HUD message lines and vitals bars.

export interface LineTiming {
  floorSeconds: number;   // minimum on-screen time
  secondsPerChar: number; // reading time per character
}

// Trigger and effect lines use 2.50 s; action lines use 2.25 s. Both 0.050 s per character.
export const TRIGGER_TIMING: LineTiming = { floorSeconds: 2.5, secondsPerChar: 0.05 };
export const ACTION_TIMING: LineTiming = { floorSeconds: 2.25, secondsPerChar: 0.05 };

export function lineSeconds(text: string, t: LineTiming): number {
  return Math.max(t.floorSeconds, text.length * t.secondsPerChar);
}

export interface HudLine {
  remaining: number; // seconds left; 0 = hidden; Infinity = stays until cleared
  text: string;
}

export function showLine(line: HudLine, text: string, t: LineTiming): void {
  line.text = text;
  line.remaining = lineSeconds(text, t);
}

export function clearLine(line: HudLine): void {
  line.remaining = 0;
}

// Called once per logic step. The step is clamped first so a long hitch does not skip a message.
export function tickLines(lines: HudLine[], dt: number, maxStep: number): void {
  const step = Math.min(dt, maxStep);
  for (const line of lines) {
    if (line.remaining > 0) {
      line.remaining = Math.max(line.remaining - step, 0);
    }
  }
}

export function isVisible(line: HudLine): boolean {
  return line.remaining > 0;
}

// Vitals bar: fill height in whole pixels from the bottom, clamped to the bar.
export function barPixels(current: number, max: number, heightPx: number): number {
  if (max <= 0) {
    return 0;
  }
  const percent = current / max;
  return Math.min(Math.max(Math.round(heightPx * percent), 0), heightPx);
}

export const CRITICAL_HEALTH_RATIO = 0.15;

export type StatusGradient = "nearDeath" | "poisoned" | "diseased" | "healthy";

// Priority order: near death beats poisoned, which beats diseased.
export function statusGradient(healthRatio: number, drunk: boolean, diseased: boolean): StatusGradient {
  const clamped = Math.min(Math.max(healthRatio, 0), 1);
  if (clamped <= CRITICAL_HEALTH_RATIO) {
    return "nearDeath";
  }
  if (drunk) {
    return "poisoned";
  }
  if (diseased) {
    return "diseased";
  }
  return "healthy";
}

// Hit flash: one frame at 25 fps, held as a timer so it survives the frame rate.
export const HURT_FLASH_SECONDS = 1 / 25;

export function triggerHurtFlash(flash: { remaining: number }): void {
  flash.remaining = HURT_FLASH_SECONDS;
}

export function sampleBarPixelsDemo(): number[] {
  return [barPixels(0, 100, 26), barPixels(15, 100, 26), barPixels(100, 100, 26), barPixels(5, 0, 26)];
}

export {};
