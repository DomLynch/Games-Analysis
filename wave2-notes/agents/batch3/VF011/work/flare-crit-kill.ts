// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng = () => number; // uniform in [0, 1), injected instead of rand()

interface Cfg {
  fps: number;            // logic frames per second (donor max_frames_per_sec)
  critMinPct: number;     // donor min_crit_damage, percent (200 = x2)
  critMaxPct: number;     // donor max_crit_damage, percent (clamped up to min)
  shakeStrength: number;  // donor shake_strength (8)
  corpseTimeoutS: number; // donor corpse_timeout, seconds (60)
}

type DeathState = "alive" | "dead" | "critdead";

interface Foe {
  hp: number;
  isHero: boolean;
  hasCritdieClip: boolean;  // donor critdie_enabled (set from the animation set)
  state: DeathState;
  effectsCleared: boolean;
  corpseTimer: number;      // logic frames until the corpse fades
  corpse: boolean;
}

interface Screen {
  shakeTicks: number;       // donor Camera.shake_timer
}

interface HitOut {
  damage: number;
  crit: boolean;
  killed: boolean;
  state: DeathState;
}

// One hit. The crit roll decides damage and, for a killing blow, the death state.
export function resolveHit(
  foe: Foe, screen: Screen, raw: number, critChancePct: number, rng: Rng, cfg: Cfg,
): HitOut {
  if (foe.state !== "alive") {
    return { damage: 0, crit: false, killed: false, state: foe.state };
  }
  const crit = rng() * 100 < critChancePct;   // donor: Math::percentChanceF (body not read)
  let dmg = raw;
  if (crit) {
    const pct = cfg.critMinPct + rng() * (cfg.critMaxPct - cfg.critMinPct);
    dmg = (dmg * pct) / 100;
    if (!foe.isHero) {
      screen.shakeTicks = Math.floor(cfg.fps / 2);   // donor: setDuration(max_frames_per_sec / 2)
    }
  }
  foe.hp -= dmg;
  if (foe.hp > 0) {
    return { damage: dmg, crit, killed: false, state: "alive" };
  }
  foe.hp = 0;
  // Heroes never take the critical death state.
  const state: DeathState = !foe.isHero && crit && foe.hasCritdieClip ? "critdead" : "dead";
  foe.state = state;
  return { damage: dmg, crit, killed: true, state };
}

// Screen shake, once per logic frame. Mirrors the donor order: tick first, zero offset at the end.
export function shakeStep(screen: Screen, rng: Rng, cfg: Cfg): { x: number; y: number } {
  if (screen.shakeTicks > 0) screen.shakeTicks -= 1;
  if (screen.shakeTicks === 0) return { x: 0, y: 0 };
  const span = cfg.shakeStrength * 2;
  const x = (Math.floor(rng() * span) - cfg.shakeStrength) / 128; // donor 0.0078125 = 1/128 tile
  const y = (Math.floor(rng() * span) - cfg.shakeStrength) / 128;
  return { x, y };
}

// Critical death animation, once per logic frame; frames is the clip length in frames.
export function critDeathStep(
  foe: Foe, frame: number, frames: number, cfg: Cfg, firePowerDeath: () => void,
): void {
  if (foe.state !== "critdead") return;
  if (frame === 0) {
    foe.corpseTimer = Math.floor(cfg.corpseTimeoutS * cfg.fps); // donor: corpse timer on first frame
  }
  if (frame === frames - 2 && !foe.effectsCleared) {
    firePowerDeath();            // donor: AI death power at the second-last frame
    foe.effectsCleared = true;   // donor: status effects cleared there too
  }
  if (frame >= frames - 1) {
    foe.corpse = true;           // donor: corpse set on the last frame
  }
}

export {};
