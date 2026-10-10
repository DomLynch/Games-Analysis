// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Mode = "sleeping" | "wandering" | "hunting";

interface Foe {
  id: number;
  dist: number;      // distance in tiles from the creature
  inReach: boolean;  // can be attacked this tick (adjacent)
  visible: boolean;  // in the creature's field of view
  alive: boolean;
}

interface Creature {
  mode: Mode;
  target: number | null;  // current foe id; sticky while hunting
  hitBy: number[];        // foe ids that hit us while we were already hunting
  stealth: number;        // 0 unless a stealth effect is active
}

// Target choice: an attackable foe beats a non-attackable one; otherwise the nearer foe wins.
function pickTarget(foes: Foe[]): Foe | null {
  let best: Foe | null = null;
  for (const f of foes) {
    if (!f.alive || !f.visible) continue;
    if (best === null || (f.inReach && !best.inReach) || (f.inReach === best.inReach && f.dist < best.dist)) {
      best = f;
    }
  }
  return best;
}

// Hunting swap: a foe that hit us is taken as target only if it can be attacked now, or is nearer than the current target.
function swapToHitter(c: Creature, foes: Foe[]): void {
  for (const id of c.hitBy) {
    const h = foes.find((f) => f.id === id);
    if (!h || !h.alive || !h.visible) continue;
    const cur = foes.find((f) => f.id === c.target);
    if (h.inReach || !cur || h.dist < cur.dist) c.target = h.id;
  }
  c.hitBy = [];
}

// Notice chance per tick: 1/(dist/2 + stealth) when wandering, 1/(dist + stealth) when sleeping.
export function noticeChance(dist: number, stealth: number, sleeping: boolean): number {
  const d = Math.max(dist, 1); // floor added by the sketch
  return sleeping ? 1 / (d + stealth) : 1 / (d / 2 + stealth);
}

// One AI tick. Returns the action the creature takes this tick.
export function aiTick(c: Creature, foes: Foe[], rand: () => number, justAlerted: boolean): "attack" | "move" | "idle" {
  if (c.mode !== "hunting") {
    const f = pickTarget(foes);
    if (f === null) return "idle";
    const sleeping = c.mode === "sleeping";
    // a mob that was just hit notices at once while wandering; sleepers always roll
    if ((!sleeping && justAlerted) || rand() < noticeChance(f.dist, c.stealth, sleeping)) {
      c.mode = "hunting";
      c.target = f.id;
    }
    return "idle";
  }

  // hunting: attack the current target if it is in reach; otherwise consider the hitters first
  let t = foes.find((f) => f.id === c.target);
  if (t && t.alive && t.visible && t.inReach) {
    c.hitBy = [];
    return "attack";
  }
  swapToHitter(c, foes);
  t = foes.find((f) => f.id === c.target);
  if (!t || !t.alive) {
    const nxt = pickTarget(foes);
    if (nxt === null) {
      c.mode = "wandering";
      c.target = null;
      return "idle";
    }
    c.target = nxt.id;
    t = nxt;
  }
  if (t.visible && t.inReach) return "attack";
  return "move"; // step toward the target or its last known cell (path step not modelled)
}

export {};
