// Licence: AGPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Persona { looseness: number; aggression: number; bluffRate: number; } // each about 1.0

interface Spot {
  equity: number;          // 0..1, estimated chance to win the exchange against all remaining foes
  foes: number;            // remaining hostiles
  costRatio: number;       // cost of joining / (stake + cost): the "pot odds" analogue
  foeAggression: number;   // observed attack share 0..100, or -1 if unknown
  freeToWait: boolean;     // waiting costs nothing
  inPosition: boolean;     // we act last among the foes
  escalations: number;     // pushes already made in this exchange
  finalRound: boolean;
}

type Act = "press" | "hold" | "wait" | "back-off";
interface Stance { act: Act; size: number; } // size: fraction of the stake

function decideStance(s: Spot, p: Persona, roll: () => number): Stance {
  const fair = 1 / (s.foes + 1);                       // share due to us if all were equal

  if (s.freeToWait) {
    if (s.equity > (fair * 1.5) / p.looseness) {
      const size = (s.equity > fair * 2.2 ? 0.75 : 0.55) * p.aggression;
      return { act: "press", size };
    }
    if (s.foes <= 2 && s.inPosition && roll() <= 0.18 * p.bluffRate) return { act: "press", size: 0.5 };
    return { act: "wait", size: 0 };
  }

  let margin = s.finalRound ? 0 : 0.03;
  if (s.foeAggression >= 0) {
    const shift = Math.max(-0.03, Math.min(0.03, (s.foeAggression - 40) / 1000));
    margin = Math.max(-0.02, margin - shift);          // aggressive foes bluff more: call a little cheaper
  }

  if (s.equity >= s.costRatio + margin) {
    if (s.equity > fair * 1.9 && s.escalations < 3) return { act: "press", size: 0.7 * p.aggression };
    return { act: "hold", size: 0 };
  }

  if (s.foes === 1 && s.inPosition && s.equity > 0.25 && roll() <= 0.12 * p.bluffRate) {
    return { act: "press", size: 0.6 };
  }
  return { act: "back-off", size: 0 };
}

export {};
