type Emit = (kind: string, count: number) => void;

// Client-only. Times are seconds of the stack clock (summed dt), never frames.
const TUNE = {
  ring2AfterPlainS: 0.06,     // donor: sequencer.ts:1189 (0.06 plain)
  ring2AfterBoostS: 0.18,     // donor: sequencer.ts:1189 (0.18 crescendo or radial)
  finisherWaveAfterS: 0.12,   // donor: sequencer.ts:1238 (ring3At = t + 0.12)
  sparkBase: 30,              // donor: sequencer.ts:1244 (14 for gentle archetypes)
  sparkBoost: 2.0,            // donor: spectacle.ts:81 (impactSparkCount)
  sparkMax: 60,               // donor clamp: sequencer.ts:1256
  tier1SparkScale: 0.5,       // donor: sequencer.ts:1247
  impactShake: 0.3,           // donor: spectacle.ts:117
  finisherShake: 0.45,        // donor: spectacle.ts:118
  shakeCap: 0.55,             // donor: fx.ts:1896
  shakeDecayPerS: 0.8,        // donor: fx.ts:2342
  shakeFullYd: 18,            // donor: fx.ts:1895
  shakeZeroYd: 50,            // donor: fx.ts:1895 (18 + 32)
};

interface Impact {
  finisher: boolean;
  boost: boolean;        // crescendo archetype, non-filler
  tier: 0 | 1 | 2;       // donor: 2 never reaches the sequencer
  power: number;
  distanceYd: number;
}

class ShakeBudget {
  private recent = 0;

  decay(dt: number): void {
    this.recent = Math.max(0, this.recent - dt * TUNE.shakeDecayPerS);
  }

  // Trauma actually granted for one request: distance falloff, then the rolling cap.
  request(amount: number, distanceYd: number): number {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const span = TUNE.shakeZeroYd - TUNE.shakeFullYd;
    const falloff = distanceYd <= TUNE.shakeFullYd
      ? 1
      : Math.max(0, 1 - (distanceYd - TUNE.shakeFullYd) / span);
    const granted = Math.min(amount * falloff, Math.max(0, TUNE.shakeCap - this.recent));
    if (granted <= 0.01) return 0;
    this.recent += granted;
    return granted;
  }
}

class ImpactStack {
  private now = 0;
  private pending: { at: number; fire: () => void }[] = [];

  constructor(private budget: ShakeBudget, private emit: Emit) {}

  // One landed hit: ground ring and its follow-up are scheduled, sparks fire now,
  // the finisher wave is scheduled, and tier-0 hits request camera trauma.
  start(hit: Impact): void {
    if (hit.tier >= 2) return;
    this.emit('ground-ring', 1);
    const ring2 = hit.boost ? TUNE.ring2AfterBoostS : TUNE.ring2AfterPlainS;
    this.pending.push({ at: this.now + ring2, fire: () => this.emit('ground-ring-2', 1) });
    const sparks = Math.min(
      TUNE.sparkMax,
      Math.max(4, Math.round(
        TUNE.sparkBase * hit.power * (hit.boost ? TUNE.sparkBoost : 1) *
        (hit.tier === 1 ? TUNE.tier1SparkScale : 1),
      )),
    );
    this.emit('sparks', sparks);
    if (hit.finisher) {
      this.pending.push({
        at: this.now + TUNE.finisherWaveAfterS,
        fire: () => this.emit('finisher-wave', 2),
      });
    }
    if (hit.tier === 0 && (hit.boost || hit.finisher)) {
      const amount = hit.finisher ? TUNE.finisherShake : TUNE.impactShake * Math.min(1.3, hit.power);
      this.budget.request(amount, hit.distanceYd);
    }
  }

  // Once per frame: advance the clock, decay the budget, fire every due beat.
  update(dt: number): void {
    this.now += dt;
    this.budget.decay(dt);
    const due = this.pending.filter((b) => this.now >= b.at);
    this.pending = this.pending.filter((b) => this.now < b.at);
    for (const b of due) b.fire();
  }
}

export {};
