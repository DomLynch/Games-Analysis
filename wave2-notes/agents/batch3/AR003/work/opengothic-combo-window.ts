// Licence: MIT (donor). Clean-room sketch written from the described mechanism; no line is translated.
// clean-room
interface ComboWindow {
  start: number; // ms after the swing started; window is open for start < t <= end
  end: number;
}

interface Swing {
  clip: string;             // clip name
  startedAt: number;        // ms; can be rewound when a combo step continues
  windows: ComboWindow[];   // one window per combo step (index = combo length)
  hitEnd: number[];         // ms at which each combo step ends
}

interface ComboState {
  len: number;     // steps already chained
  broken: boolean; // once broken, no further continuation until a new swing starts
}

interface Continue {
  accepted: boolean;
  combo: ComboState;
  startedAt: number;
}

// Try to chain `nextClip` onto the running swing at time `now`.
function continueCombo(prev: Swing, nextClip: string, nextHasHitEnd: boolean, combo: ComboState, now: number): Continue {
  const t = now - prev.startedAt;
  if (prev.windows.length === 0 || prev.hitEnd.length === 0) {
    return { accepted: true, combo: { len: 0, broken: false }, startedAt: now }; // no combo data: plain start
  }
  if (!nextHasHitEnd) {
    return { accepted: true, combo: { len: 0, broken: false }, startedAt: now }; // not an attack clip: forced start
  }
  const w = prev.windows[combo.len];
  if (w === undefined) {
    return { accepted: false, combo: { len: combo.len, broken: true }, startedAt: prev.startedAt }; // out of steps
  }
  if (!(w.start < t && t <= w.end)) {
    const broken = prev.clip === nextClip ? true : combo.broken;
    return { accepted: false, combo: { len: combo.len, broken }, startedAt: prev.startedAt };
  }
  if (combo.broken) {
    return { accepted: false, combo, startedAt: prev.startedAt };
  }
  if (prev.clip !== nextClip) {
    return { accepted: true, combo: { len: 0, broken: false }, startedAt: now }; // different clip: new swing
  }
  // Same clip: rewind the start so the clip continues from this step's hit end.
  const startedAt = combo.len < prev.hitEnd.length ? now - prev.hitEnd[combo.len] : prev.startedAt;
  return { accepted: true, combo: { len: combo.len + 1, broken: false }, startedAt };
}

export {};
