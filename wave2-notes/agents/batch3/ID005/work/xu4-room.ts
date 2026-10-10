// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export type Side = "north" | "east" | "south" | "west";
export interface Pt { x: number; y: number; }

const MAX_FOES = 16;      // data: room foe table size
const SLOTS_PER_SIDE = 8; // data: party start slots per entry side
const STEP: Record<Side, Pt> = {
  north: { x: 0, y: -1 }, east: { x: 1, y: 0 }, south: { x: 0, y: 1 }, west: { x: -1, y: 0 },
};

export interface RoomData {
  id: string;
  foeKinds: string[];                // at most MAX_FOES; spawned again on every entry
  foeStarts: Pt[];                   // same length as foeKinds
  partyStarts: Record<Side, Pt[]>;   // SLOTS_PER_SIDE entries per side
}
export interface Member { id: number; alive: boolean; pos: Pt | null; } // pos null = not in the room
export interface Foe { kind: string; pos: Pt; }
export interface RoomRun {
  data: RoomData;
  parentPos: Pt;          // where the party stands on the parent map (kept while inside)
  winOrLose: boolean;     // false for rooms: clearing the foes does not end the fight
  exitSide: Side | null;  // set by the first member to leave
  members: Member[];
  foes: Foe[];
}

// Enter: the party is placed on the side it came in from.
export function enterRoom(data: RoomData, parentPos: Pt, members: Member[], from: Side): RoomRun {
  const living = members.filter(m => m.alive);
  if (data.foeKinds.length > MAX_FOES || living.length > SLOTS_PER_SIDE) {
    throw new Error("bad room data or party size");
  }
  let slot = 0;
  for (const m of members) {
    m.pos = m.alive ? { ...data.partyStarts[from][slot++] } : null;
  }
  return {
    data, parentPos, winOrLose: false, exitSide: null, members,
    foes: data.foeKinds.map((kind, i) => ({ kind, pos: { ...data.foeStarts[i] } })),
  };
}

// A member steps off the room edge. The first leaver picks the side; later leavers must use the same side.
export function leaveByEdge(run: RoomRun, m: Member, side: Side): "left" | "must-use-same-exit" {
  if (run.exitSide !== null && run.exitSide !== side) return "must-use-same-exit";
  run.exitSide = side;
  m.pos = null;           // removed from the room
  return "left";
}

// Turn end, in donor order: no member left in the room ends it; a foe-free room ends it only when winOrLose is set.
export function turnEnd(run: RoomRun): "continue" | "end" {
  if (run.members.every(m => m.pos === null)) return "end";
  if (run.winOrLose && run.foes.length === 0) return "end";
  return "continue";
}

// Exit: read the win flag first, clear the room's foes, then return the side to face and the step out.
export function exitRoom(run: RoomRun): { won: boolean; facing: Side | null; step: Pt | null } {
  const won = run.foes.length === 0;
  run.foes = [];          // the room is reset on exit; the next entry spawns foes from data again
  if (run.exitSide === null) return { won, facing: null, step: null };
  const s = STEP[run.exitSide];
  return { won, facing: run.exitSide, step: { x: run.parentPos.x + s.x, y: run.parentPos.y + s.y } };
}

export {};
