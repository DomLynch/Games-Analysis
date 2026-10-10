// Licence: Sustainable Use License 1.0 (donor fallout1-ce). Clean-room: shape only; no donor code or tables copied.
type Roll = (sides: number) => number; // returns 1..sides
type Encounter = { kind: "none" } | { kind: "terrain" } | { kind: "special"; id: number };
type SpecialRange = { id: number; lo: number; hi: number }; // d100 range that picks this special

// Ledger for one character: which unique specials have already fired (donor: a bitmask saved with the game).
interface Ledger { usedSpecials: Set<number>; }

function dice3d6(roll: Roll): number {
  return roll(6) + roll(6) + roll(6);
}

// Travel steps between checks: a skill raises the interval (donor: 60 plus 0.6 x skill, skill capped at 100).
function stepsPerCheck(skill: number, base: number, perSkillPoint: number): number {
  return Math.floor(base + perSkillPoint * Math.min(skill, 100));
}

// Called once per check. Zone tier is zone data: a 3d6 sum below tierLimit starts an encounter.
function checkEncounter(
  ledger: Ledger,
  roll: Roll,
  inTown: boolean,
  tierLimit: number,
  luck: number,
  explorerLevel: number,
  specials: SpecialRange[],
): Encounter {
  if (dice3d6(roll) >= tierLimit || inTown) {
    return { kind: "none" };
  }

  // Rare gate: the 3d6 sum, shifted by luck and a perk, must reach 18 before a special can fire.
  for (let attempt = 0; attempt < 1000; attempt++) {
    const gate = dice3d6(roll) - 5 + luck + 2 * explorerLevel;
    if (gate < 18 || ledger.usedSpecials.size === specials.length) {
      return { kind: "terrain" };
    }
    const pick = roll(100);
    const hit = specials.find((s) => pick >= s.lo && pick <= s.hi);
    if (hit !== undefined && !ledger.usedSpecials.has(hit.id)) {
      ledger.usedSpecials.add(hit.id);
      return { kind: "special", id: hit.id };
    }
    // Range already used (or none matched): the donor starts the gate again.
  }
  return { kind: "terrain" };
}

// Normal encounter: take one of the terrain's map slots at random, rerolling empty slots.
function pickTerrainMap(slots: (string | null)[], roll: Roll): string {
  if (slots.every((s) => s === null)) {
    throw new Error("terrain has no encounter map");
  }
  for (;;) {
    const name = slots[roll(slots.length) - 1];
    if (name !== null) {
      return name;
    }
  }
}

const ledger: Ledger = { usedSpecials: new Set<number>() };
const fixedRoll: Roll = (sides) => Math.min(sides, 4);
console.log(stepsPerCheck(50, 60, 0.6), checkEncounter(ledger, fixedRoll, false, 10, 5, 1, []).kind, pickTerrainMap(["A", null, null], fixedRoll));
