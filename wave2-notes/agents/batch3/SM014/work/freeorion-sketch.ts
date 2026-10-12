// Licence: GPL-2.0-or-later as read from a sibling header (UI/Hotkeys.h); UI/Sound.cpp has no licence header. Clean-room sketch from the described mechanism, not a translation.
// clean-room

// Cue guard: a depth counter. Code that changes controls programmatically mutes feedback (UI) cues for the
// length of the scope. World cues are not affected.
class CueGuard {
  private depth = 0;

  muted(): boolean {
    return this.depth > 0;
  }

  // Start a scope. The returned function ends it; call it exactly once (use try/finally).
  mute(): () => void {
    this.depth += 1;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.depth -= 1;
      }
    };
  }
}

type CueKind = "ui" | "world";

interface Voice {
  cue: string;
  priority: number;
  endMs: number;
}

// Voice pool with a cap (the donor uses 15 effect voices and keeps one source for music).
// Donor behaviour: first free voice, otherwise the cue is dropped (no priority).
// Fix in this sketch: a full pool gives up its lowest-priority voice only to a strictly higher-priority cue.
function playCue(
  guard: CueGuard,
  pool: Voice[],
  cap: number,
  cue: string,
  kind: CueKind,
  priority: number,
  durationMs: number,
  nowMs: number,
): boolean {
  if (kind === "ui" && guard.muted()) return false;
  const live = pool.filter((v) => v.endMs > nowMs);
  pool.splice(0, pool.length, ...live);
  if (live.length < cap) {
    pool.push({ cue, priority, endMs: nowMs + durationMs });
    return true;
  }
  let lowest = live[0];
  for (const v of live) {
    if (v.priority < lowest.priority) lowest = v;
  }
  if (priority <= lowest.priority) return false;
  lowest.cue = cue;
  lowest.priority = priority;
  lowest.endMs = nowMs + durationMs;
  return true;
}

// Example use: a list rebuilt in code must not click every row.
function rebuildWithoutCues(guard: CueGuard, rebuild: () => void): void {
  const release = guard.mute();
  try {
    rebuild();
  } finally {
    release();
  }
}

export {}
