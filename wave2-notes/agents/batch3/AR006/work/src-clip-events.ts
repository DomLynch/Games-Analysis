// Licence: Valve Source 1 SDK LICENSE (restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface ClipEvent { cycle: number; id: string; }   // cycle in 0..1 of the clip

interface Playback {
  seq: number;            // current clip id
  cycle: number;          // 0..1 position in the clip
  rate: number;           // playback rate multiplier
  durationS: number;      // clip length in seconds
  looping: boolean;
  finished: boolean;
  prevEventCycle: number; // cycle at the end of the last event pass
  eventSeq: number;       // clip the event pass last ran for
}

// Advance the cycle by elapsed time: cycles per second = 1 / duration, times the rate.
function advanceCycle(p: Playback, dt: number): void {
  if (dt <= 0.001) return;                       // donor: skip tiny intervals
  let next = p.cycle + dt * (1 / p.durationS) * p.rate;
  if (next < 0 || next >= 1) {
    if (p.looping) next -= Math.trunc(next);     // donor: (int) truncation, so a negative next is not wrapped
    else next = next < 0 ? 0 : 1;
    p.finished = true;
  }
  p.cycle = next;
}

// Fire each event whose cycle was crossed this update: prev < e.cycle <= cur.
// A wrap (cur moved back by more than 0.5) fires the old pass's tail first, then the new head.
function fireCrossed(p: Playback, events: ClipEvent[], fire: (e: ClipEvent) => void): void {
  let cur = p.cycle;
  let prev = p.prevEventCycle;
  if (p.eventSeq !== p.seq) {       // new clip: restart at -0.01 so cycle-0 events fire
    p.eventSeq = p.seq;
    cur = 0;
    prev = -0.01;
  }
  if (cur === prev) return;         // stalled
  let looped = false;
  if (cur <= prev) {
    if (prev - cur > 0.5) looped = true;
    else return;                    // small backwards step: fire nothing
  }
  if (looped) {
    for (const e of events) if (e.cycle > prev) fire(e);  // tail of the old pass
    prev = cur - 0.001;             // donor: m_flPrevEventCycle = flEventCycle - 0.001
  }
  for (const e of events) if (e.cycle > prev && e.cycle <= cur) fire(e);
  p.prevEventCycle = cur;
}

// Demo: a 0.5 s looping clip with three events, stepped at 60 Hz.
const clip: ClipEvent[] = [
  { cycle: 0.02, id: "swish" },
  { cycle: 0.4, id: "strike" },
  { cycle: 0.9, id: "dust" },
];
const p: Playback = { seq: 1, cycle: 0, rate: 1, durationS: 0.5, looping: true, finished: false, prevEventCycle: -0.01, eventSeq: 1 };
const seen: string[] = [];
for (let i = 0; i < 40; i++) {
  advanceCycle(p, 1 / 60);
  fireCrossed(p, clip, (e) => seen.push(e.id));
}

export {};
