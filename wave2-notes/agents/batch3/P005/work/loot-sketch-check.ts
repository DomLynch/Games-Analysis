// Licence: MIT (donor repo LICENSE; adaptation allowed). This sketch is written from the described mechanism, not a translation of the donor lines.
// clean-room
type Pos = { x: number; y: number; z: number };
interface Corpse { pos: Pos; name: string; tries: number; dist: number; }
interface LootItem { id: number; count: number; stackable: boolean; tries: number; }
interface Bag { slots: { id: number; count: number }[]; }

const MAX_QUEUE = 20;          // queue is full: no more corpses are added
const CORPSE_RADIUS = 6;       // the monster must have died this close to the player
const PATH_LIMIT = 6;          // path length to the corpse tile
const MAX_TRIES = 30;          // walk attempts per corpse before it is dropped
const STACK_CAP = 100;         // a stack is merged only while below this count
const ITEM_TRIES = 5;          // the fifth attempt on one item skips it
const MOVE_WAIT_MS = 300;      // pause after a move

function cheb(a: Pos, b: Pos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

// Step 1, at the moment a monster vanishes: gate on protection zone, loot config and distance.
function onMonsterVanished(me: Pos, deathPos: Pos, dontLoot: boolean, inPz: boolean): boolean {
  if (inPz || dontLoot) return false;
  if (me.z !== deathPos.z || cheb(me, deathPos) > CORPSE_RADIUS) return false;
  return true; // caller schedules the corpse check ~20 ms later
}

// Step 2, 20 ms later: is there a corpse on that tile, and is it reachable?
function onCorpseCheck(queue: Corpse[], me: Pos, deathPos: Pos, name: string,
                       hasCorpse: boolean, pathLen: number | null): void {
  if (!hasCorpse || queue.length >= MAX_QUEUE) return;
  if (pathLen === null || pathLen > PATH_LIMIT) return;
  queue.push({ pos: deathPos, name, tries: 0, dist: cheb(me, deathPos) });
  queue.sort((a, b) => b.dist - a.dist); // farthest first; index 0 is the farthest
}

// Ownership is not computed here: the server's refusal text removes the head or tail entry.
function onServerText(queue: Corpse[], text: string, lootLast: boolean): void {
  if (queue.length === 0) return;
  if (!text.toLowerCase().includes("you are not the owner")) return;
  queue.splice(lootLast ? queue.length - 1 : 0, 1);
}

type Step = "idle" | "high-danger" | "no-cap" | "wait" | "no-space" | "loot-open-bag"
  | "dropped" | "walk" | "open";

interface Ctx {
  now: number; waitTill: number;
  danger: number; maxDanger: number;
  freeCap: number; minCap: number;
  maxRange: number; /* default 40 in the donor */ lootLast: boolean; adjacentOnly: boolean;
  hasLootBag: boolean; openLootBag: boolean; corpseTileHasBag: boolean;
}

// One pass of the loot step, in the donor's order. The caller acts on the returned step.
function processStep(queue: Corpse[], me: Pos, c: Ctx): Step {
  if (c.danger > c.maxDanger) return "high-danger";
  if (c.freeCap < c.minCap) { queue.length = 0; return "no-cap"; }
  if (queue.length === 0) return "idle";
  if (c.now < c.waitTill) return "wait";
  if (!c.hasLootBag) return "no-space";
  if (c.openLootBag) return "loot-open-bag";
  const i = c.lootLast ? queue.length - 1 : 0;
  const e = queue[i];
  const d = cheb(me, e.pos);
  if (e.tries > MAX_TRIES || e.pos.z !== me.z || d > c.maxRange) { queue.splice(i, 1); return "dropped"; }
  if (d > (c.adjacentOnly ? 1 : 2)) { e.tries += 1; return "walk"; }
  if (!c.corpseTileHasBag) { queue.splice(i, 1); return "dropped"; }
  return "open";
}

// Where one item goes. Stackable items merge into a stack below STACK_CAP; otherwise one unit is moved to the first bag.
function itemMove(item: LootItem, bags: Bag[]): { bag: number; slot: number; count: number; waitMs: number } | null {
  item.tries += 1;
  if (item.tries >= ITEM_TRIES) return null;
  if (item.stackable) {
    for (let b = 0; b < bags.length; b++) {
      const slot = bags[b].slots.findIndex((s) => s.id === item.id && s.count < STACK_CAP);
      if (slot >= 0) return { bag: b, slot, count: item.count, waitMs: MOVE_WAIT_MS };
    }
  }
  return { bag: 0, slot: bags[0].slots.length, count: 1, waitMs: MOVE_WAIT_MS };
}

export {};
