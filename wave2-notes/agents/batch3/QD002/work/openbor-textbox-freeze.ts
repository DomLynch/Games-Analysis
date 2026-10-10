// Licence: BSD-3-Clause (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const SKIP = 1; // one bit for "any skip key pressed this tick" (donor: attack, jump, special bits)

interface Actor {
  id: number;
  kind: "fighter" | "textbox";
  alive: boolean;
  nextMoveAt: number;   // absolute tick stamp; 0 = unset
  cooldownAt: number;   // absolute tick stamp; 0 = unset
}

interface TextBox extends Actor {
  kind: "textbox";
  frame: number;
  frameCount: number;
  dir: 1 | -1 | 0;      // 0 = animation finished
  loop: boolean;
  noSkip: boolean;      // donor SUBTYPE_NOSKIP
  nextFrameAt: number;  // absolute tick stamp for the next page
  frameDelay: number;   // ticks per page (from data)
}

interface World {
  tick: number;
  actors: Actor[];
  textbox: TextBox | null;   // the single active box
}

// Donor is_frozen: a live text box freezes every other actor.
function isFrozen(w: World, a: Actor): boolean {
  return w.textbox !== null && a.kind !== "textbox";
}

// Donor expand_time: while frozen, each stamp moves forward one tick per frozen tick, so the wait is held.
function holdTimers(a: Actor): void {
  if (a.nextMoveAt > 0) a.nextMoveAt += 1;
  if (a.cooldownAt > 0) a.cooldownAt += 1;
}

// Donor spawn: the newest text box becomes the active one.
function spawnTextBox(w: World, tb: TextBox): void {
  w.actors.push(tb);
  w.textbox = tb;
}

// Donor kill_entity: clear the pointer if the active box dies, then re-elect the first live text box in list order.
function killActor(w: World, victim: Actor): void {
  victim.alive = false;
  if (w.textbox === victim) {
    w.textbox = null;
    const next = w.actors.find((a): a is TextBox => a.alive && a.kind === "textbox");
    if (next !== undefined) w.textbox = next;
  }
}

// Donor update_animation for a text box: a page advances on its timer or on a skip press.
// Returns true only when a page was actually drawn; the caller then clears the keys (donor sets bothnewkeys = 0).
function updateTextBox(w: World, tb: TextBox, keys: number): boolean {
  const skipPressed = !tb.noSkip && (keys & SKIP) !== 0;
  const timerDue = tb.nextFrameAt <= w.tick;
  if (tb.dir === 0 || !(timerDue || skipPressed)) return false;

  let f = tb.frame + tb.dir;
  if (f >= tb.frameCount || f < 0) {
    if (!tb.loop) {
      tb.dir = 0;            // hold the last page and stop; no page drawn
      return false;
    }
    f = tb.dir < 0 ? tb.frameCount - 1 : 0;
  }
  tb.frame = f;
  tb.nextFrameAt = w.tick + tb.frameDelay;
  return true;
}

// One logic tick. Frozen actors only hold their timers; the text box removes itself when its sequence ends.
function tickWorld(w: World, keys: number): number {
  let keysLeft = keys;
  for (const a of w.actors) {
    if (!a.alive) continue;
    if (a.kind === "textbox") {
      const tb = a as TextBox;
      if (updateTextBox(w, tb, keysLeft)) keysLeft = 0; // one skip press advances one page
      if (tb.dir === 0) killActor(w, tb);
      continue;
    }
    if (isFrozen(w, a)) {
      holdTimers(a);
      continue;
    }
    // ordinary actor update (movement, attacks, AI) is not modelled here
  }
  w.tick += 1;
  return keysLeft;
}

export {};
