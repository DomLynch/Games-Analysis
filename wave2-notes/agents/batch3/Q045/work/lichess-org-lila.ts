// Licence: AGPL-3.0 (donor). Clean-room sketch of the rating pipeline shape; not a translation of the donor lines.
type Glicko = { rating: number; deviation: number; volatility: number };
type Perf = { glicko: Glicko; nb: number; recent: number[] };
type PerfKey = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'ultraBullet' | 'atomic' | 'antichess' | 'correspondence';

const MIN_RATING = 400;
const MIN_DEV = 45, MAX_DEV = 500, MAX_VOL = 0.1;
const MAX_RATING_DELTA = 700;      // most a single settled game may move the rating
const DEFAULT: Glicko = { rating: 1500, deviation: 500, volatility: 0.09 };
const RECENT_WINDOW = 10;          // recent list starts once the pre-game count is 10
const RECENT_MAX = 12;
const GAIN_FACTOR: Partial<Record<PerfKey, number>> = {
  rapid: 1.015, classical: 1.01, blitz: 1.005, bullet: 1.01, ultraBullet: 1.013, atomic: 1.02, antichess: 1.02,
};
const RANKABLE_DEV = { standard: 75, variant: 65 };

// The Glicko-2 update is an external library in the donor (not read); the sketch takes it as an input.
type RateGame = (before: [Glicko, Glicko], score: [number, number]) => [Glicko, Glicko];

// Only rating gains are scaled, by mode. Losses and unlisted modes pass through unchanged.
function regulateGain(key: PerfKey, before: Glicko, after: Glicko): Glicko {
  const f = GAIN_FACTOR[key];
  if (f === undefined || f === 1 || after.rating <= before.rating) return after;
  return { ...after, rating: after.rating + (after.rating - before.rating) * (f - 1) };
}

// A human who beat a bot keeps the midpoint of old and new values (midpoint assumed; the library average() was not read).
function halveAgainstBot(before: Glicko, after: Glicko): Glicko {
  return {
    rating: (before.rating + after.rating) / 2,
    deviation: (before.deviation + after.deviation) / 2,
    volatility: (before.volatility + after.volatility) / 2,
  };
}

function cap(g: Glicko): Glicko {
  return {
    rating: Math.max(g.rating, MIN_RATING),
    deviation: Math.min(Math.max(g.deviation, MIN_DEV), MAX_DEV),
    volatility: Math.min(g.volatility, MAX_VOL),
  };
}

function sane(g: Glicko): boolean {
  return g.rating > 0 && g.rating < 4000 && g.deviation > 0 && g.deviation < 1000 &&
    g.volatility > 0 && g.volatility < MAX_VOL * 2;
}

// One settled game: clamp to +-700 of the pre-game rating, sanity check, cap; an insane result resets to the default.
function addOrReset(prev: Perf, next: Glicko): Perf {
  const lo = prev.glicko.rating - MAX_RATING_DELTA;
  const hi = prev.glicko.rating + MAX_RATING_DELTA;
  const clamped: Glicko = { ...next, rating: Math.min(Math.max(next.rating, lo), hi) };
  const glicko = sane(clamped) ? cap(clamped) : DEFAULT;
  const recent = prev.nb < RECENT_WINDOW
    ? prev.recent
    : [Math.round(glicko.rating), ...prev.recent].slice(0, RECENT_MAX);
  return { glicko, nb: prev.nb + 1, recent };
}

// Full rated-game pipeline: rate, gain damping, bot halving, then the per-game clamp for each side.
function settleRated(
  key: PerfKey,
  prev: [Perf, Perf],
  isBot: [boolean, boolean],
  rate: RateGame,
  score: [number, number],
): [Perf, Perf] {
  const before: [Glicko, Glicko] = [prev[0].glicko, prev[1].glicko];
  const computed = rate(before, score);
  const regulated = [0, 1].map(i => regulateGain(key, before[i], computed[i])) as [Glicko, Glicko];
  const halved = [0, 1].map(i => {
    const opp = 1 - i;
    return !isBot[i] && isBot[opp] ? halveAgainstBot(before[i], regulated[i]) : regulated[i];
  }) as [Glicko, Glicko];
  return [addOrReset(prev[0], halved[0]), addOrReset(prev[1], halved[1])];
}

// Leaderboard gate: deviation at or under the mode's threshold, and at least 2 games.
function listed(p: Perf, standard: boolean): boolean {
  return p.glicko.deviation <= (standard ? RANKABLE_DEV.standard : RANKABLE_DEV.variant) && p.nb >= 2;
}

// Rating interval shown to a player: rating -/+ 2 deviations, truncated.
function interval(g: Glicko): [number, number] {
  return [Math.trunc(g.rating - 2 * g.deviation), Math.trunc(g.rating + 2 * g.deviation)];
}

// Overall "standard" rating: game-count-weighted mean of the established standard modes (provisional ones skipped).
type Sub = { perf: Perf; provisional: boolean };
function standardAggregate(subs: Sub[]): Glicko | null {
  const used = subs.filter(s => !s.provisional);
  const nb = used.reduce((a, s) => a + s.perf.nb, 0);
  if (used.length === 0 || nb === 0) return null;
  const wmean = (f: (g: Glicko) => number) =>
    used.reduce((a, s) => a + f(s.perf.glicko) * (s.perf.nb / nb), 0);
  return {
    rating: wmean(g => g.rating),
    deviation: wmean(g => g.deviation),
    volatility: wmean(g => g.volatility),
  };
}

export {};
