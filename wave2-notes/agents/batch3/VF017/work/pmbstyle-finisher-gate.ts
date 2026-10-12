// Licence: Apache-2.0 (donor LICENSE; package.json says "SEE LICENSE IN LICENSE"). Rewritten from the described rule, no lines copied.
// adapt: idea only
interface Me { hp: number; maxHp: number; speed: number; }
interface Foe { id: number; hp: number; dmgEst: number; swingMs: number; casting: boolean; }
interface Option { kind: "basic" | "skill"; finishMs: number; hpCost: number; estDamage: number; }

const MAX_FINISH_MS = 4000;     // donor BotEmergencyFinisher.js 11
const DAMAGE_MARGIN = 0.70;     // donor 12
const HEADROOM = 1.5;           // donor 105
const RESERVE_RATIO = 0.10;     // donor 107
const SKILL_PAD_MS = 1000;      // donor 80 (a fixed pad in the donor; here it is a data field)
const BASIC_MAX_HITS = 2;       // donor 55

// Swing time in ms from attack speed (donor Formulas.js 241)
function swingMs(speed: number): number {
  return speed < 2 ? 2700 : 470000 / speed;
}

function basicOption(hp: number, rawDmg: number, mySpeed: number): Option | null {
  const dmg = rawDmg * DAMAGE_MARGIN;
  const hits = dmg > 0 ? Math.ceil(hp / dmg) : Infinity;
  if (hits > BASIC_MAX_HITS) return null;
  return { kind: "basic", finishMs: (hits + 1) * swingMs(mySpeed), hpCost: 0, estDamage: dmg };
}

function skillOption(hp: number, rawDmg: number, castMs: number, hpCost: number): Option | null {
  const dmg = rawDmg * DAMAGE_MARGIN;
  if (dmg < hp) return null;               // one-shot only
  return { kind: "skill", finishMs: castMs + SKILL_PAD_MS, hpCost, estDamage: dmg };
}

// Engine-side choice. `threat` must be the engine's real attacker list (Frankendom MAX_ATTACKERS = 3).
function chooseFinisher(me: Me, target: Foe, options: Option[], threat: Foe[]): Option | null {
  const quick = options
    .filter(o => o.finishMs <= MAX_FINISH_MS)   // time window
    .sort((a, b) => a.finishMs - b.finishMs);   // fastest first
  if (quick.length === 0) return null;

  const attackers = new Map<number, Foe>([[target.id, target]]);
  for (const f of threat) attackers.set(f.id, f);

  const reserve = Math.max(1, me.maxHp * RESERVE_RATIO);
  for (const o of quick) {
    let incoming = 0;
    for (const f of attackers.values()) {
      if (f.casting || f.dmgEst <= 0 || f.swingMs <= 0) { incoming = Infinity; break; }
      // immediate hit + every swing inside the window, with headroom
      incoming += f.dmgEst * HEADROOM * (1 + Math.ceil(o.finishMs / f.swingMs));
    }
    if (me.hp - o.hpCost - incoming > reserve) return o;
  }
  return null;
}

export {};
