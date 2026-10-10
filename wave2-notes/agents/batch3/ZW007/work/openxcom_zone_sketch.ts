// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Rect { lonMin: number; lonMax: number; latMin: number; latMax: number; }
export type Rand = (min: number, max: number) => number;     // continuous uniform, [min, max]
export type RandInt = (min: number, max: number) => number;  // integer, inclusive at both ends
export interface RouteLeg { zone: Rect[]; ground: boolean; speedPct: number; }

// Two-stage zone pick: a rectangle chosen uniformly by COUNT (not by area), then a uniform point inside it.
export function pickPointInZone(zone: Rect[], rndInt: RandInt, rnd: Rand): [number, number] {
  const r = zone[rndInt(0, zone.length - 1)];
  return [rnd(r.lonMin, r.lonMax), rnd(r.latMin, r.latMax)];
}

// Bounded rejection sampling. After maxTries the last sample is kept even if it fails ok(), and fellBack is set.
export function pickValidPoint(zone: Rect[], ok: (lon: number, lat: number) => boolean,
                               rndInt: RandInt, rnd: Rand, maxTries = 100): { point: [number, number]; fellBack: boolean } {
  let p = pickPointInZone(zone, rndInt, rnd);
  let tries = 1;
  while (!ok(p[0], p[1]) && tries < maxTries) {
    p = pickPointInZone(zone, rndInt, rnd);
    tries++;
  }
  return { point: p, fellBack: !ok(p[0], p[1]) };
}

// Next destination on a route of zones. Returns null when the route is finished (the donor destroys the UFO).
export function nextDestination(route: RouteLeg[], next: number, ok: (lon: number, lat: number) => boolean,
                                rndInt: RandInt, rnd: Rand): { point: [number, number]; fellBack: boolean } | null {
  if (next >= route.length) return null;
  const leg = route[next];
  const landCheck = next + 1 < route.length && route[next + 1].ground;
  if (landCheck) return pickValidPoint(leg.zone, ok, rndInt, rnd);
  return { point: pickPointInZone(leg.zone, rndInt, rnd), fellBack: false };
}

// Wave clock in game minutes. spawnTimerMin is the wave's nominal spacing (zone or mission data).
// The countdown is jittered over floor(S/2) .. floor(S/2)+S thirty-minute units, S = spawnTimerMin/30 (about 0.5x to 1.5x of the spacing).
export function startWaveCountdown(spawnTimerMin: number, rndInt: RandInt): number {
  const units = Math.floor(spawnTimerMin / 30);
  return (Math.floor(units / 2) + rndInt(0, units)) * 30;
}

// Called once per 30 game minutes. Fires when the countdown is already at or below 30.
export function tickWave(countdown: number): { countdown: number; fire: boolean } {
  if (countdown > 30) return { countdown: countdown - 30, fire: false };
  return { countdown, fire: true };
}

// A shot-down wave pushes the next spawn out by 30 * (rndInt(0, 400) + 48) minutes.
export function onWaveShotDown(countdown: number, rndInt: RandInt): number {
  return countdown + 30 * (rndInt(0, 400) + 48);
}

// Weighted pick with a half-open draw [0, total). The donor draws the inclusive range [0, total],
// which gives the first id in its map order one extra slot; this version does not copy that.
export function pickWeighted(items: [string, number][], rndInt: RandInt): string {
  const total = items.reduce((s, [, w]) => s + w, 0);
  if (total === 0) return "";
  let v = rndInt(0, total - 1);
  for (const [id, w] of items) {
    if (v < w) return id;
    v -= w;
  }
  return items[items.length - 1][0];
}

export {};
