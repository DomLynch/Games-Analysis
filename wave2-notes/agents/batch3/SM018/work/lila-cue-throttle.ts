// Licence: AGPL-3.0 (donor). clean-room sketch of the shape only, written from the described mechanism.
// clean-room
type Play = (name: string, volume: number) => Promise<void>;

// Latest-wins throttle: the first call in a window runs at once; while the
// window is open a newer call replaces the single waiting call; the waiting
// call runs when the window closes.
export function latestWinsThrottle(delayMs: number, play: Play): (name: string, volume: number) => void {
  let busy = false;
  let waiting: { name: string; volume: number } | undefined;
  const run = (name: string, volume: number): void => {
    busy = true;
    void play(name, volume);
    setTimeout(() => {
      busy = false;
      const next = waiting;
      waiting = undefined;
      if (next) run(next.name, next.volume);
    }, delayMs);
  };
  return (name, volume) => {
    if (!busy) run(name, volume);
    else waiting = { name, volume }; // an older waiting call is dropped
  };
}

// Fix for the donor's shape: one shared slot lets a routine hit replace a
// waiting kill or death sting. Priority cues get their own lane.
export function combatCueLanes(play: Play): {
  hit: (name: string, volume: number) => void;
  priority: (name: string, volume: number) => void;
} {
  return {
    hit: latestWinsThrottle(100, play),
    priority: latestWinsThrottle(100, play),
  };
}

// Which cues a move plays. An explicit name wins; otherwise capture or move,
// then check or checkmate from the notation suffix (# before +).
export function moveCues(san: string | undefined, name?: string): string[] {
  if (name) return [name];
  const cues = [san?.includes('x') ? 'capture' : 'move'];
  if (san?.includes('#')) cues.push('checkmate');
  else if (san?.includes('+')) cues.push('check');
  return cues;
}

// Countdown: each beat lasts at least the interval and at least the clip.
// The next beat is loaded while the current one plays; a closing stinger follows.
export async function countdown(
  count: number,
  beat: (n: number) => Promise<void>,
  preload: (n: number) => Promise<void>,
  stinger: () => Promise<void>,
  intervalMs = 500,
): Promise<void> {
  let n = count;
  while (n > 0) {
    const waits: Promise<void>[] = [new Promise<void>((resolve) => setTimeout(resolve, intervalMs)), beat(n)];
    n -= 1;
    if (n > 0) waits.push(preload(n));
    await Promise.all(waits);
  }
  await stinger();
}

export {};
