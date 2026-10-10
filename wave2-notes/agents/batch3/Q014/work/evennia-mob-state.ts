// Licence: BSD-3-Clause (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type State = "idle" | "roam" | "combat" | "flee";
type Action = "hold" | "attack" | "stunt" | "item" | "flee";

// Donor table (npcs.py 259-265). Weights are normalised before the roll (ai.py 94-99).
const COMBAT_TABLE: Record<Action, number> = { hold: 0, attack: 0.85, stunt: 0.05, item: 0, flee: 0.05 };

// Cumulative walk over the table sorted high to low (ai.py 95-106), using a given roll r in [0, 1).
export function rollAction(table: Record<Action, number>, r: number): Action | undefined {
  const total = Object.values(table).reduce((a, b) => a + b, 0);
  const sorted = (Object.keys(table) as Action[])
    .map((k): [Action, number] => [k, table[k] / total])
    .sort((a, b) => b[1] - a[1]);
  let acc = 0;
  for (const [k, p] of sorted) {
    acc += p;
    if (r <= acc) return k;
  }
  return undefined;
}

interface Room { players: string[]; exits: string[]; }   // exits = destination room ids
interface Mob {
  state: State;
  room: string;
  pastRoom?: string;      // where it came from (donor: ai_state "past_room")
  inCombat: boolean;      // intended: a combat handler exists (donor: obj.ndb.combathandler)
}

export type Step =
  | { kind: "none" }
  | { kind: "attack"; target: string }
  | { kind: "move"; to: string };

const pick = <T>(xs: T[], rng: () => number): T => xs[Math.floor(rng() * xs.length)];

// One tick of the mob state machine. The donor's attack key is "attack" in the table; the sketch maps it
// to the attack step so the 85% weight does something (see simplified line).
export function tick(mob: Mob, world: Map<string, Room>, rng: () => number): Step {
  const here = world.get(mob.room);
  if (!here) return { kind: "none" };
  switch (mob.state) {
    case "idle":
      return { kind: "none" };
    case "roam":
      if (here.players.length > 0) {
        mob.state = "combat";
        return { kind: "attack", target: pick(here.players, rng) };
      }
      {
        const exits = here.exits;
        return exits.length ? { kind: "move", to: pick(exits, rng) } : { kind: "none" };
      }
    case "combat": {
      if (mob.inCombat) {
        const action = rollAction(COMBAT_TABLE, rng());
        if (action === "flee") mob.state = "flee";
        if (action === "attack") return { kind: "attack", target: pick(here.players, rng) };
        return { kind: "none" };
      }
      if (here.players.length === 0) { mob.state = "roam"; return { kind: "none" }; }
      return { kind: "attack", target: pick(here.players, rng) };
    }
    case "flee": {
      const exits = here.exits.filter(e => e !== mob.pastRoom);
      if (exits.length === 0) { mob.state = "roam"; return { kind: "none" }; }
      mob.pastRoom = mob.room;
      return { kind: "move", to: pick(exits, rng) };
    }
  }
}

export {};
