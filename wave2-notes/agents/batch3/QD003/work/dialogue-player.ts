// Licence: Apache-2.0 (donor, Friday Night Funkin' source). Adapted shape; this is a fresh expression of the same state flow.
type DState = "start" | "opening" | "speaking" | "idle" | "ending";

interface Entry {
  text: string[];   // lines shown in one box; each advance appends the next line
  speed: number;    // 1.0 = 0.05 s per character
}

interface Player {
  entries: Entry[];
  entry: number;      // current box
  line: number;       // current line inside the box
  state: DState;
  screen: string;     // text on screen in the current box
  pending: string;    // text still being typed
  secPerChar: number;
  acc: number;        // time banked toward the next character
}

function newPlayer(entries: Entry[]): Player {
  return { entries, entry: 0, line: 0, state: "start", screen: "", pending: "", secPerChar: 0, acc: 0 };
}

// Start the box for the current entry. The box animation runs in the "opening" state.
function openEntry(p: Player): void {
  p.state = "opening";
  p.screen = "";
  p.line = 0;
}

// Frame tick. Opening ends when the box animation has finished; speaking reveals characters
// on a time budget and goes idle when nothing is pending.
function tick(p: Player, dt: number, boxAnimDone: boolean): void {
  if (p.state === "opening" && boxAnimDone) {
    const e = p.entries[p.entry];
    p.pending = e.text[p.line];
    p.secPerChar = e.speed * 0.05;
    p.acc = 0;
    p.state = "speaking";
    return;
  }
  if (p.state === "speaking") {
    p.acc += dt;
    while (p.pending.length > 0 && p.acc >= p.secPerChar) {
      p.acc -= p.secPerChar;
      p.screen += p.pending[0];
      p.pending = p.pending.slice(1);
    }
    if (p.pending.length === 0) p.state = "idle";
  }
}

// Advance while typing: reveal the rest of the line at once (no line change).
function completeLine(p: Player): void {
  p.screen += p.pending;
  p.pending = "";
  p.state = "idle";
}

// Advance while idle: next line in this box, or the next box, or the end.
function nextLine(p: Player): void {
  const e = p.entries[p.entry];
  p.line += 1;
  if (p.line >= e.text.length) {
    p.entry += 1;
    if (p.entry >= p.entries.length) {
      p.state = "ending";
      return;
    }
    openEntry(p);
    return;
  }
  p.pending = e.text[p.line];
  p.secPerChar = e.speed * 0.05;
  p.acc = 0;
  p.state = "speaking";
}

// One advance press (a key or a tap). The hook can hold the step, as a cancelled event does.
function advance(p: Player, held: (step: "complete" | "line") => boolean): void {
  if (p.state === "speaking") {
    if (!held("complete")) completeLine(p);
    return;
  }
  if (p.state === "idle") {
    if (!held("line")) nextLine(p);
  }
}

// Begin the conversation: the first box opens.
function begin(p: Player): void {
  openEntry(p);
}
