// Licence: GPL-2.0-or-later (donor). Clean-room sketch from the described mechanism, not a translation.
export type Track = "peace" | "warLow" | "warHigh" | "boss" | "gameOver";

export interface MusicConfig {
  warLow: number;        // donor 1000
  warHigh: number;       // donor 32500
  decayPerSec: number;   // donor 0.04 per second
  capMultiple: number;   // donor 3 (times warHigh)
  quietResetSec: number; // donor 40
  minHoldSec: number;    // donor 20
  maxHoldSec: number;    // donor 60
}

export interface MusicState {
  meter: number;
  quietSec: number;
  track: Track;
  heldSec: number;       // seconds the current track has played
  holdUntilSec: number;  // random in [minHoldSec, maxHoldSec], drawn per track
  fader: number;         // 0..1 fade position, 1 = full volume
  fading: "none" | "out" | "in";
}

// Donor: a hit adds its damage, clamped to the victim's max HP, and is ignored at 1 or less.
export function addDamage(s: MusicState, dmg: number, victimMaxHp: number): void {
  if (dmg <= 1) return;
  s.meter += Math.ceil(Math.min(dmg, victimMaxHp));
  s.quietSec = 0;
}

// Per real second (fix: donor steps every 30 game frames). Cap, decay, then zero after a quiet spell.
export function decay(s: MusicState, dtSec: number, cfg: MusicConfig): void {
  if (s.meter <= 0) return;
  s.meter = Math.min(s.meter * Math.pow(1 - cfg.decayPerSec, dtSec), cfg.warHigh * cfg.capMultiple);
  s.quietSec += dtSec;
  if (s.quietSec > cfg.quietResetSec) s.meter = 0;
}

// Track picked when a new track starts (donor order: boss, then warHigh, then warLow, then peace).
export function trackForMeter(meter: number, cfg: MusicConfig, bossUp: boolean): Track {
  if (bossUp) return "boss";
  if (meter >= cfg.warHigh) return "warHigh";
  if (meter >= cfg.warLow) return "warLow";
  return "peace";
}

// Donor 1757-1761: a boss spawn (or its end) forces a switch at once: no random hold, no lag gate,
// only the rule that no fade is already running.
export function bossSwitch(s: MusicState, cfg: MusicConfig, bossUp: boolean): Track | null {
  if (s.fading !== "none") return null;
  if (bossUp && s.track !== "boss") return "boss";
  if (!bossUp && s.track === "boss") return trackForMeter(s.meter, cfg, false);
  return null;
}

// Donor 1721-1733: on PvE-driven fights (raptors, scavengers) the boss anger sets a minimum meter every 30 frames.
export function angerFloor(s: MusicState, cfg: MusicConfig, anger: number): void {
  if (anger > 60 && s.meter < cfg.warHigh + 1) s.meter = cfg.warHigh + 1;
  else if (anger > 20 && s.meter < cfg.warLow + 1) s.meter = cfg.warLow + 1;
}

// Mid-track switch with hysteresis: entering a level and leaving it use different thresholds.
export function wantedSwitch(s: MusicState, cfg: MusicConfig): Track | null {
  if (s.fading !== "none" || s.heldSec < s.holdUntilSec) return null;
  const m = s.meter, lo = cfg.warLow, hi = cfg.warHigh;
  switch (s.track) {
    case "peace":   return m > (hi + lo) * 0.5 ? "warLow" : null;
    case "warLow":  return m > hi * 2 ? "warHigh" : m <= lo * 0.25 ? "peace" : null;
    case "warHigh": return m <= lo * 0.5 ? "peace" : null;
    default:        return null;
  }
}

// Fade position moves over fadeSec real seconds. Returns true when a fade-out has reached silence,
// so the caller switches the track and sets fading to "in".
export function stepFade(s: MusicState, dtSec: number, fadeSec: number): boolean {
  if (s.fading === "none") return false;
  const dir = s.fading === "out" ? -1 : 1;
  s.fader = Math.min(1, Math.max(0, s.fader + (dir * dtSec) / fadeSec));
  if (s.fading === "out" && s.fader === 0) return true;
  if (s.fading === "in" && s.fader === 1) s.fading = "none";
  return false;
}

// Fix: the fade is shaped in decibels (donor already has this curve for its volume slider), not a straight line.
export function gainOf(fader: number, rangeDb = 45): number {
  if (fader <= 0) return 0;
  return Math.pow(10, (rangeDb * (fader - 1)) / 20);
}

export const exampleConfig: MusicConfig = {
  warLow: 1000, warHigh: 32500, decayPerSec: 0.04, capMultiple: 3,
  quietResetSec: 40, minHoldSec: 20, maxHoldSec: 60,
};
