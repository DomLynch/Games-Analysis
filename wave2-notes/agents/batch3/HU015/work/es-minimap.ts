// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const LERP_FRAMES = 150;     // donor LERP_DURATION (MiniMap.cpp line 43)
const LINGER_FRAMES = 300;   // donor displayMinimap = 300 on a jump command (MiniMap.cpp line 77)
const FADE_FRAMES = 30;      // donor fade length (MiniMap.cpp lines 108-111, 163)
const MAX_ALPHA = 0.5;       // donor alpha = .5f (MiniMap.cpp line 158)

interface V2 { x: number; y: number; }
interface Zone { id: string; pos: V2; }

const lerpV = (a: V2, b: V2, t: number): V2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const midpoint = (a: V2, b: V2): V2 => ({ x: 0.5 * (a.x + b.x), y: 0.5 * (a.y + b.y) });

interface WorldMap {
  currentId: string | null;
  targetId: string | null;
  centre: V2;
  from: V2;
  goal: V2;
  lerpFrame: number;   // LERP_FRAMES means settled
  linger: number;      // frames left to show the map after a jump command
  fade: number;        // 0..FADE_FRAMES
}

// Initial state (donor constructor, MiniMap.cpp lines 48-51): current is unset, so the first step retargets.
function newWorldMap(here: Zone): WorldMap {
  return {
    currentId: null,
    targetId: null,
    centre: { ...here.pos },
    from: { ...here.pos },
    goal: { ...here.pos },
    lerpFrame: LERP_FRAMES,
    linger: 0,
    fade: 0,
  };
}

// One frame. The caller resolves `next`: the jump target, or the travel-plan next hop (donor lines 69-85).
function stepWorldMap(
  m: WorldMap,
  here: Zone,
  next: Zone | null,
  jumpCommanded: boolean,   // donor: Command::JUMP or entering hyperspace
  jumpingIn: boolean,       // donor: enteringHyperspace
  zones: Map<string, Zone>,
): void {
  // 1. Retarget (donor lines 65-102). A jump command sets the linger before the target is chosen.
  let retarget = false;
  if (m.currentId !== here.id) { m.currentId = here.id; retarget = true; }
  if (jumpCommanded) m.linger = LINGER_FRAMES;
  const nextId = next ? next.id : null;
  if (nextId !== m.targetId && (next !== null || m.linger === 0)) {
    m.targetId = nextId;
    retarget = true;
  } else if (m.targetId === m.currentId) {
    m.targetId = null;
  }

  // 2. Linger and fade (donor lines 105-114).
  if (m.linger > 0) {
    m.linger -= 1;
    if (m.linger < FADE_FRAMES && m.fade > 0) m.fade -= 1;
    else if (m.fade < FADE_FRAMES) m.fade += 1;
  } else {
    m.fade = 0;
  }

  // 3. Centre (donor lines 116-136). The donor reads target->Position() on line 131 with no null check;
  //    this sketch adds the `tgt !== null` guard.
  const tgt = m.targetId !== null ? (zones.get(m.targetId) ?? null) : null;
  if (retarget) {
    m.lerpFrame = 0;
    m.from = m.centre;
    m.goal = tgt ? midpoint(here.pos, tgt.pos) : { x: here.pos.x, y: here.pos.y };
  } else if (jumpingIn && tgt !== null && (m.goal.x !== tgt.pos.x || m.goal.y !== tgt.pos.y) && m.lerpFrame >= LERP_FRAMES) {
    m.lerpFrame = 0;
    m.from = m.centre;
    m.goal = { x: tgt.pos.x, y: tgt.pos.y };
  }

  // 4. Lerp (donor lines 138-143): linear over LERP_FRAMES frames.
  if (m.lerpFrame < LERP_FRAMES) {
    m.centre = lerpV(m.from, m.goal, m.lerpFrame / LERP_FRAMES);
    m.lerpFrame += 1;
  }
}

// Draw alpha (donor lines 155-164). OFF draws nothing; WHEN_JUMPING needs linger and fades; ALWAYS_ON is flat.
type Pref = "OFF" | "WHEN_JUMPING" | "ALWAYS_ON";
function alphaFor(pref: Pref, m: WorldMap): number {
  if (pref === "OFF") return 0;
  if (pref === "ALWAYS_ON") return MAX_ALPHA;
  if (m.linger === 0) return 0;
  return MAX_ALPHA * Math.min(1, m.fade / FADE_FRAMES);
}

export {};
