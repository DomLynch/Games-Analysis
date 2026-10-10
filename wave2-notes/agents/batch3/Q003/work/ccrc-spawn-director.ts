// Licence: GPL-3.0 (+ EA Section 7 terms) in the donor. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Roll an inclusive integer in [lo, hi]. The caller supplies the RNG.
type Roll = (lo: number, hi: number) => number;

interface GroupDef {
  id: string;
  cap: number;        // max live groups of this kind (zone data)
  priority: number;   // higher wins when several are eligible (zone data)
  alertOnly: boolean; // true: only spawns while the zone is alerted
}

interface Director {
  alerted: boolean;
  live: Map<string, number>; // live groups per def id
  pulseLeft: number;         // ticks until the next idle pulse
  alertLeft: number;         // ticks until the next alert batch
  batchMax: number;          // largest alert batch (zone or engine data)
}

const PULSE_TICKS = 90;      // donor TEAM_DELAY = TICKS_PER_MINUTE/10 at 15 ticks per second

// alerted is the selection flag: the alert batch passes true, the idle pulse passes false (as in the donor).
function eligible(d: Director, g: GroupDef, alerted: boolean): boolean {
  const cap = alerted || !g.alertOnly ? g.cap : 0;
  return (d.live.get(g.id) ?? 0) < cap;
}

// Highest priority among eligible defs. The first eligible def wins a tie.
function pickGroup(d: Director, defs: GroupDef[], alerted: boolean): GroupDef | undefined {
  let best: GroupDef | undefined;
  for (const g of defs) {
    if (!eligible(d, g, alerted)) continue;
    if (!best || best.priority < g.priority) best = g;
  }
  return best;
}

function spawn(d: Director, g: GroupDef): void {
  d.live.set(g.id, (d.live.get(g.id) ?? 0) + 1);
}

function despawn(d: Director, id: string): void {
  const n = d.live.get(id) ?? 0;
  if (n > 0) d.live.set(id, n - 1);
}

// One logic tick. The alert batch runs first, then the idle pulse.
function step(d: Director, defs: GroupDef[], roll: Roll, alertRange: [number, number]): void {
  // An expired alert timer stays expired until a batch runs, as in the donor.
  if (d.alertLeft <= 0) {
    if (d.alerted) {
      const batch = roll(2, Math.max(2, d.batchMax)); // clamp: donor min>max case not read
      for (let i = 0; i < batch; i++) {
        const g = pickGroup(d, defs, true);
        if (g) spawn(d, g);
      }
      d.alertLeft = roll(alertRange[0], alertRange[1]);
    }
  } else {
    d.alertLeft -= 1;
  }

  if (d.pulseLeft <= 0) {
    const g = pickGroup(d, defs, false);
    if (g) spawn(d, g); // at most one group per idle pulse
    d.pulseLeft = PULSE_TICKS;
  } else {
    d.pulseLeft -= 1;
  }
}

export {};
