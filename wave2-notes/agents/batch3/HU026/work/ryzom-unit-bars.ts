// Licence of donor: GNU AGPL-3.0-or-later. Clean-room sketch from the described mechanism, not a translation of the donor lines.
export interface BarConfig {
  targetRange: number;   // metres: the "targeting you" marker shows inside this range
  barsRange: number;     // metres: the HP bar shows only inside this range (the server keeps values fresh here)
  hideBeyond: number;    // metres: hysteresis; once shown, the bar hides only beyond this (proposed, not in donor)
  barLength: number;     // pixels at full scale
  scale: number;         // server score that maps to a full bar
}

export interface UnitSnapshot {
  dx: number;            // offset from the viewer, metres
  dy: number;
  targetsViewer: boolean;
  hp: number;
  dead: boolean;
  isPlayer: boolean;
}

export interface UnitView { targetMarker: boolean; barsShown: boolean; hpWidth: number; }

// wasShown = the previous frame's bar state, which is what makes the band hysteretic.
export function unitView(u: UnitSnapshot, cfg: BarConfig, wasShown: boolean): UnitView {
  if (cfg.hideBeyond < cfg.barsRange) throw new Error("hysteresis band is inverted");
  const dist = Math.abs(u.dx) + Math.abs(u.dy); // XY Manhattan distance, height ignored
  const targetMarker = u.targetsViewer && dist <= cfg.targetRange;
  const barsShown = wasShown ? dist <= cfg.hideBeyond : dist < cfg.barsRange;
  if (!barsShown) return { targetMarker, barsShown: false, hpWidth: 0 };
  let hp = u.hp;
  if (u.dead && !u.isPlayer) hp = 0;                  // a dead non-player always reads as empty
  const raw = Math.floor((cfg.barLength * Math.max(0, hp)) / cfg.scale);
  const hpWidth = Math.min(cfg.barLength, Math.max(0, raw)); // clamp to the track
  return { targetMarker, barsShown: true, hpWidth };
}

export {};
