// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Phases come from zone data (donor: the [time] children of a scenario).
interface Phase { id: string; lightBonus: number; }

// Phase index for a turn: wraps around the schedule, anchored to the current turn.
function phaseIndex(n: number, currentIndex: number, currentTurn: number, turn: number): number {
  if (n === 0) return 0;
  return (((currentIndex + turn - currentTurn) % n) + n) % n;
}

function boundedAdd(base: number, inc: number, maxSum: number, minSum = 0): number {
  if (inc >= 0) return Math.min(base + inc, Math.max(base, maxSum));
  return Math.max(base + inc, Math.min(base, minSum));
}

interface Illuminator { distance: number; radius: number; delta: number; min: number; max: number; }

// Light at one tile: terrain light plus nearby sources. The larger total push sets the direction;
// each source is bounded by its own min and max; the most extreme result in that direction wins.
function tileLight(terrainLight: number, sources: Illuminator[]): number {
  const inRange = sources.filter(s => s.distance <= s.radius);
  let mostAdd = 0;
  let mostSub = 0;
  for (const s of inRange) {
    if (s.delta > mostAdd) mostAdd = s.delta;
    else if (s.delta < mostSub) mostSub = s.delta;
  }
  const netDarker = mostAdd < -mostSub;
  const base = terrainLight + (netDarker ? mostAdd : mostSub);
  let best = terrainLight;
  for (const s of inRange) {
    const r = boundedAdd(base, s.delta, s.max, s.min);
    if (netDarker ? r < best : r > best) best = r;
  }
  return best;
}

// Once per turn: turn events fire on the first side that starts the turn; side events fire for every side.
class TurnClock {
  private latched = false;
  constructor(public turn: number) {}

  startSide(sideId: string, fire: (name: string) => void): void {
    if (!this.latched) {
      fire(`turn_${this.turn}`);
      fire("new_turn");
      this.latched = true;
    }
    fire("side_turn");
    fire(`side_${sideId}_turn`);
  }

  advance(): void {
    this.turn += 1;
    this.latched = false;
  }
}
export {};
