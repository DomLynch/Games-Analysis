// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Tag = string;

interface Stack { id: string; amount: number; }

interface LootEntry {
  stacks: Stack[];            // one entry = all its stacks drop together
  chance: number;             // 0..1; 1 means always (no roll)
  allowedTags: Tag[] | null;  // null = no tool requirement
  forbiddenTags: Tag[];
}

// Tags of the killing tool, or null when the kill had no tool (bare hands, environment).
type KillTool = Tag[] | null;

function passesToolFilter(e: LootEntry, tool: KillTool): boolean {
  if (tool === null) return e.allowedTags === null;
  const have: Tag[] = tool;
  if (e.forbiddenTags.some((t) => have.includes(t))) return false;
  if (e.allowedTags !== null) {
    const want: Tag[] = e.allowedTags;
    return want.some((t) => have.includes(t));
  }
  return true;
}

// One confirmed kill = one roll pass over the table (donor: drops per event = 1).
function rollKill(table: LootEntry[], tool: KillTool, rng: () => number, rollsPerEvent = 1): Stack[] {
  const out: Stack[] = [];
  for (let n = 0; n < rollsPerEvent; n++) {
    for (const e of table) {
      if (!passesToolFilter(e, tool)) continue;
      if (e.chance === 1 || rng() < e.chance) {
        for (const s of e.stacks) out.push({ ...s });
      }
    }
  }
  return out;
}

// Ground pile: counters move once per server tick (donor: 20 ticks/s); removed when despawn drops below 0.
interface Pile { stacks: Stack[]; pickupCooldown: number; despawn: number; }
const PICKUP_RANGE = 1.0;   // donor itemdrop.zig:53
const PILE_RADIUS = 0.1;    // donor itemdrop.zig:49

function tickPile(p: Pile): boolean {
  p.pickupCooldown -= 1;
  p.despawn -= 1;
  return p.despawn >= 0;    // false = remove now
}

function canPickUp(p: Pile, gap: number): boolean {
  // gap = largest per-axis distance from the pile point to the player's box
  return p.pickupCooldown <= 0 && gap < PILE_RADIUS + PICKUP_RANGE;
}
