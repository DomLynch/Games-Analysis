// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

type Kind = "npc" | "gui";
interface Candidate { id: number; kind: Kind; distance: number; }
interface Focus { target: Candidate | null; holdUntil: number; }

const NPC_HOLD_MS = 300;        // data: hold after the last hit on a talkable NPC
const GUI_HOLD_MS = 500;        // data: hold after the last hit on an interactive panel
const AIM_RANGE_UNITS = 80;     // data: aim reach from the eye

// fix (the donor has no sort): the nearest candidate in range wins, not the first in list order.
function pickNearest(hits: Candidate[]): Candidate | null {
  let best: Candidate | null = null;
  for (const h of hits) {
    if (h.distance > AIM_RANGE_UNITS) continue;
    if (best === null || h.distance < best.distance) best = h;
  }
  return best;
}

// hits: everything the aim ray touched this tick. Donor order: expire the hold, search, refresh the hold on a hit.
function updateFocus(prev: Focus, now: number, hits: Candidate[], attackHeld: boolean): Focus {
  const hadNpc = prev.target !== null && prev.target.kind === "npc"; // donor reads the NPC focus before the expiry clear
  const f: Focus = prev.holdUntil > now ? prev : { target: null, holdUntil: 0 };
  const eligible = hits.filter(h => !(h.kind === "npc" && attackHeld && !hadNpc));
  const hit = pickNearest(eligible);
  if (hit === null) return f; // miss: keep the old target until its hold runs out
  const hold = hit.kind === "npc" ? NPC_HOLD_MS : GUI_HOLD_MS;
  return { target: hit, holdUntil: now + hold };
}
