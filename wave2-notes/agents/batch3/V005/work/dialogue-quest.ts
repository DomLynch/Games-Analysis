// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Option { label: string; link: string; }   // link "" = no screen behind this option
interface Screen { id: string; text: string; options: Option[]; stop: boolean; }

interface Pos { x: number; z: number; }
interface PlayerState { pos: Pos; }
interface NpcState { pos: Pos; }

type Handler = (p: PlayerState, npc: NpcState, choice: number, screen: Screen) => Screen | null;
interface Chain { handler: Handler; nextScreenId: string; }  // null from handler = pass to nextScreenId

interface Template { initial: string; screens: Map<string, Screen>; handlers: Map<string, Chain>; }
interface Session { lastScreen: Screen | null; }

const TALK_RANGE = 7;     // units; compared as squared distance, strictly less than
const MAX_HOPS = 16;      // sketch guard; the donor has no hop limit

function inRange(a: Pos, b: Pos): boolean {
  const dx = a.x - b.x, dz = a.z - b.z;
  return dx * dx + dz * dz < TALK_RANGE * TALK_RANGE;
}

// The player's choice selects a link from the last screen; no session means the initial screen.
function nextScreen(t: Template, s: Session | null, choice: number): Screen | undefined {
  if (s !== null && s.lastScreen !== null) {
    const link = s.lastScreen.options[choice]?.link ?? "";
    return t.screens.get(link);
  }
  return t.screens.get(t.initial);
}

// Screen handlers may rewrite the screen (return it) or pass it on to the next screen id.
function runHandlers(t: Template, p: PlayerState, npc: NpcState, choice: number, screen: Screen): Screen | null {
  let cur: Screen | undefined = screen;
  for (let hop = 0; cur !== undefined && hop < MAX_HOPS; hop++) {
    const chain = t.handlers.get(cur.id);
    if (chain === undefined) return cur;
    const out = chain.handler(p, npc, choice, { ...cur, options: cur.options.slice() });
    if (out !== null) return out;
    cur = t.screens.get(chain.nextScreenId);
  }
  return null;  // no next screen: the conversation ends
}

// Deliver objective: 0 init, 1 picked up, 2 delivered. Pickup NPC and destination NPC are the only two talk points.
const INIT = 0, PICKED = 1, DELIVERED = 2;
interface Deliver { status: number; hasItem: boolean; }

function talkToPickup(d: Deliver): "give-item-now" | "already-picked-up" {
  if (d.status === INIT) { d.hasItem = true; d.status = PICKED; return "give-item-now"; }
  return "already-picked-up";
}

function talkToDestination(d: Deliver): "delivered" | "give-item" | "already-dropped-off" {
  if (d.status === PICKED) {
    if (!d.hasItem) return "give-item";   // state unchanged: the item must be in the inventory
    d.hasItem = false;
    d.status = DELIVERED;
    return "delivered";
  }
  if (d.status === INIT) return "give-item";
  return "already-dropped-off";
}

// Leash: on each move, the session ends if the NPC is out of range.
function leashOk(p: PlayerState, npc: NpcState): boolean { return inRange(p.pos, npc.pos); }

export {};
