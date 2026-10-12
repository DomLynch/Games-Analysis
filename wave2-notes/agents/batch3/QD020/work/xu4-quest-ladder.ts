// Staged quest ladder: three tries per stage; a third miss ejects the player to that stage's respawn point.
// Plus a positive-gain throttle (once per 16-move bucket) with the donor's wrap defect fixed.
// Clean-room shape of xu4 codex.cpp (codexHandleVirtues, codexHandleWOP, codexEject) and party.cpp
// (virtueIncreaseTimeout), in Frankendom terms.
// simplified: question and answer text come from a data table (the donor reads avatar.exe string tables); screen,
// sound and shake calls are omitted; the eight-member and zero-karma entry checks are left to the caller;
// the donor's 42 ms reveal is omitted; the throttle compares the bucket as a plain number (the donor masks it to 16 bits
// in one branch and drops the throttle once moves/16 reaches 0x10000).
export const MAX_TRIES = 3;

export interface Stage {
  answers: string[]; // accepted answers, compared case-insensitively
  respawn: { x: number; y: number }; // where a third miss ejects the player
}

export interface LadderState {
  index: number; // current stage
  tries: number; // misses on the current stage; reset on a correct answer
  done: boolean;
  ejectedTo?: { x: number; y: number }; // set when the attempt ends in ejection
}

export function answerStage(s: LadderState, stages: Stage[], text: string): LadderState {
  if (s.done || s.ejectedTo !== undefined) return s;
  const stage = stages[s.index];
  const given = text.trim().toLowerCase();
  if (stage.answers.some((a) => a.toLowerCase() === given)) {
    const index = s.index + 1;
    return { index, tries: 0, done: index >= stages.length };
  }
  const tries = s.tries + 1;
  if (tries < MAX_TRIES) {
    return { ...s, tries }; // wrong but not out: the same stage is asked again
  }
  return { ...s, tries, ejectedTo: stage.respawn };
}

// Positive gains are allowed once per 16-move bucket. Negative changes are not passed through this gate.
export interface Throttle {
  ok: boolean;
  lastBucket: number;
}

export function positiveGainAllowed(moves: number, lastBucket: number): Throttle {
  const bucket = Math.floor(moves / 16);
  if (bucket !== lastBucket) {
    return { ok: true, lastBucket: bucket };
  }
  return { ok: false, lastBucket };
}

export {};
