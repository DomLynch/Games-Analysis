// Licence: GPL-3.0 (repo LICENSE; music.rs has no file header). Clean-room sketch written from the described mechanism, not a translation.
interface NearbyEnemy {
  distance: number;   // metres from the player
  maxHealth: number;  // hit points
}

interface DirectorConfig {
  radius: number;          // metres (manifest 25, code default 40)
  healthFactor: number;    // hit points per extra enemy (manifest 70, code default 100)
  highThresh: number;      // threat count for high (manifest 4, code default 3)
  lowThresh: number;       // threat count for low (manifest 4, code default 1)
  interruptDelayS: number; // seconds between executed changes (manifest and code default 5)
}

type Intensity = 'explore' | 'low' | 'high';

// Each enemy inside the radius weighs ceil(maxHealth / healthFactor); the weights are summed.
function threatCount(enemies: NearbyEnemy[], cfg: DirectorConfig): number {
  let sum = 0;
  for (const e of enemies) {
    if (e.distance < cfg.radius) {
      sum += Math.ceil(e.maxHealth / cfg.healthFactor);
    }
  }
  return sum;
}

function intensityFor(enemies: NearbyEnemy[], cfg: DirectorConfig, playerDead: boolean): Intensity {
  if (playerDead) {
    return 'explore';
  }
  const n = threatCount(enemies, cfg);
  if (n >= cfg.highThresh) {
    return 'high';
  }
  if (n >= cfg.lowThresh) {
    return 'low';
  }
  return 'explore';
}

interface Director {
  current: Intensity;
  lastChangeS: number; // time of the last executed change
}

// Returns the intensity to play now, or null if nothing changes this tick.
// A different target waits until interruptDelayS has passed since the last executed change.
// A site change forces a new pick, except during high combat (as in the donor).
function tick(d: Director, target: Intensity, nowS: number, siteChanged: boolean, cfg: DirectorConfig): Intensity | null {
  const forced = siteChanged && d.current !== 'high';
  if (target === d.current && !forced) {
    return null;
  }
  if (!forced && nowS - d.lastChangeS <= cfg.interruptDelayS) {
    return null; // the change stays pending and is retried next tick
  }
  d.current = target;
  d.lastChangeS = nowS;
  return target;
}

// Fix for a data defect: with low >= high, the low tier can never be chosen.
function validate(cfg: DirectorConfig): void {
  if (cfg.lowThresh >= cfg.highThresh) {
    throw new Error('lowThresh must be below highThresh, or Low is unreachable');
  }
}

export {};
