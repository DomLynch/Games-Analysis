// Licence: none declared in the donor (clean-room). Sketch written from the described mechanism, not a translation of donor lines.
type Side = 'living' | 'spec';
type Phase = 'pre' | 'live' | 'post';

interface Member { id: string; side: Side; role: string; special: boolean; }
interface Line { text: string; teamOnly: boolean; speaker: Member; }
type Route =
  | { kind: 'say'; text: string }
  | { kind: 'role'; role: string; text: string };

interface Config {
  phase: Phase;
  limitSpectatorChat: boolean;
  strict: boolean; // donor "detective mode": hide spectator text from the living instead of mumbling it
}

// Own word list (not the donor's). Output keeps the shape of the input: one token per word, punctuation kept.
const MUMBLES = ['mmm', 'hmm', 'mrh', 'hum'];

function mumble(text: string, rnd: () => number): string {
  const out: string[] = [];
  for (const tok of text.split(' ')) {
    const m = /^([A-Za-z]*)([.,;!?]*)/.exec(tok);
    if (m === null || m[1] === '') continue; // no leading letters: the token is dropped
    out.push(MUMBLES[Math.floor(rnd() * MUMBLES.length)] + m[2]);
  }
  if (out.length === 0) out.push(MUMBLES[Math.floor(rnd() * MUMBLES.length)]);
  return ['[MUMBLED]', ...out].join(' ');
}

// Decided once on the server, so every listener gets the same routed text.
function route(cfg: Config, line: Line, rnd: () => number): Route {
  if (cfg.phase === 'live' && line.speaker.side === 'spec') {
    if (!cfg.strict) return { kind: 'say', text: mumble(line.text, rnd) };
    return { kind: 'say', text: line.text }; // the audience gate below hides it
  }
  if (cfg.phase === 'live' && line.teamOnly && line.speaker.side === 'living' && line.speaker.special) {
    return { kind: 'role', role: line.speaker.role, text: line.text }; // role channel only, not the public say
  }
  return { kind: 'say', text: line.text };
}

// Audience gate for a 'say' line: may this listener see it?
function canSee(cfg: Config, line: Line, listener: Member): boolean {
  if (cfg.phase !== 'live' || !cfg.limitSpectatorChat || !cfg.strict) return true;
  const speakerSpec = line.speaker.side === 'spec';
  const listenerSpec = listener.side === 'spec';
  if (speakerSpec && listenerSpec) return true;   // spectators hear spectators
  if (speakerSpec) return false;                  // live text from spectators is hidden from fighters
  if (!line.teamOnly || !line.speaker.special) return true;
  return line.speaker.role === listener.role;
}

export {};
