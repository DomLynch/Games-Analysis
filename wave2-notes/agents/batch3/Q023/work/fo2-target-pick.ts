// Licence: Sustainable Use License 1.0 (donor, restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Unit {
  id: number;
  team: number;
  alive: boolean;
  hitter: Unit | null; // the unit that last hit this one, or that it last hit
}

interface TargetWorld {
  units: Unit[];
  dist(a: Unit, b: Unit): number;
  inPerception(self: Unit, other: Unit): boolean; // seen, or near enough to hear (donor: isWithinPerception)
  canReach(self: Unit, other: Unit): boolean;     // a path exists
  shotOk(self: Unit, other: Unit): boolean;       // weapon in range with ammo
}

// Target pick for one NPC, in the donor's order:
// 1. a living hitter is kept with no range check;
// 2. else the nearest living unit on a dead hitter's side goes into slot 0;
// 3. three categories fill slots 1-3 (who hits me / who hits my side / my side's hitter is on the other team), stop at 3 found;
// 4. all four slots are sorted together by distance;
// 5. the first slot that is seen and (reachable or shootable) wins.
function pickTarget(self: Unit, w: TargetWorld): Unit | null {
  const hitter = self.hitter;
  if (hitter !== null && hitter !== self && hitter.alive) {
    return hitter;
  }

  const slots: (Unit | null)[] = [null, null, null, null];
  const byDist = (a: Unit, b: Unit): number => w.dist(a, self) - w.dist(b, self);

  if (hitter !== null && hitter !== self && !hitter.alive && hitter.team !== self.team) {
    const side = w.units.filter((u) => u !== self && u.alive && u.team === hitter.team).sort(byDist);
    slots[0] = side.length > 0 ? side[0] : null;
  }

  let found = 0;
  const others = w.units.filter((u) => u !== self).sort(byDist);
  for (const c of others) {
    if (found >= 3) break;
    if (slots[1] === null && c.alive && c.hitter === self) {
      slots[1] = c;
      found++;
      continue;
    }
    if (slots[2] === null && c.team === self.team && c.hitter !== null && c.hitter !== self && c.hitter.team !== self.team && c.hitter.alive) {
      slots[2] = c.hitter;
      found++;
      continue;
    }
    if (slots[3] === null && c.alive && c.team !== self.team && c.hitter !== null && c.hitter.team === self.team) {
      slots[3] = c;
      found++;
      continue;
    }
  }

  const sorted = [...slots].sort((a, b) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return byDist(a, b);
  });

  for (const c of sorted) {
    if (c !== null && w.inPerception(self, c) && (w.canReach(self, c) || w.shotOk(self, c))) {
      return c;
    }
  }
  return null;
}

export {};
