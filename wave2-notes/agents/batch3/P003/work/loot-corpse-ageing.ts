// Licence: Sustainable Use License 1.0 (donor). Clean-room: written from the described mechanism, not translated.
interface Stack { id: string; units: number; }
interface Body { tile: string; dead: boolean; robot: boolean; player: boolean; stacks: Stack[]; }

// Donor: a map unvisited for more than 6 days (144 h) ages its dead bodies (map.cc 1134).
const AGE_AFTER_HOURS = 6 * 24;

// A death leaves the inventory on the corpse; nothing drops at the moment of death (sketch of the donor's show_death rule).
function onDeath(body: Body): void {
  body.dead = true;
}

// On re-entry, every dead non-robot, non-player body drops ALL its units on its tile and leaves the world.
// Donor intent per map.cc 1150-1215; the donor drops only ceil(n/2) units per stack and skips the next stack (see note section 6).
function ageBodies(world: Body[], hoursSinceVisit: number): { ground: Map<string, Stack[]>; kept: Body[] } {
  const ground = new Map<string, Stack[]>();
  const kept: Body[] = [];
  if (hoursSinceVisit <= 0 || hoursSinceVisit <= AGE_AFTER_HOURS) {
    return { ground, kept: world.slice() };
  }
  for (const b of world) {
    if (!b.dead || b.robot || b.player) {
      kept.push(b);
      continue;
    }
    const pile = ground.get(b.tile) ?? [];
    for (const s of b.stacks) pile.push({ id: s.id, units: s.units });
    ground.set(b.tile, pile);
  }
  return { ground, kept };
}
export {};
