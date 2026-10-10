type Marker =
  | { kind: 'spawn'; at: number; archetype: string; minPlayers: number; hp?: readonly number[] }
  | { kind: 'wait'; at: number }
  | { kind: 'group'; at: number; groupMin: number; groupMax: number };

interface Director {
  queue: Marker[];          // sorted by `at`, consumed in order
  cursor: number;
  groupMin: number;         // refill only when live < groupMin
  groupMax: number;         // fill up to this many
  waiting: boolean;         // blocks progress until the field is clear
}

interface World {
  progress: number;                         // scroll position / player progress
  liveEnemies(): number;                    // corpses excluded
  players(): number;
  spawn(archetype: string, hp: number | undefined): void;
}

function directorTick(d: Director, w: World): void {
  if (d.waiting) {
    if (w.liveEnemies() === 0) d.waiting = false;
    return;
  }
  if (d.cursor >= d.queue.length) return;            // queue done
  if (w.liveEnemies() >= d.groupMin) return;         // enough on the field
  while (
    w.liveEnemies() < d.groupMax &&
    d.cursor < d.queue.length &&
    w.progress >= d.queue[d.cursor]!.at
  ) {
    const m = d.queue[d.cursor]!;
    if (m.kind === 'wait') d.waiting = true;
    else if (m.kind === 'group') { d.groupMin = m.groupMin; d.groupMax = m.groupMax; }
    else if (w.players() >= m.minPlayers) {
      const n = Math.max(1, w.players());
      w.spawn(m.archetype, m.hp ? m.hp[Math.min(n, m.hp.length) - 1] : undefined);
    }
    d.cursor++;                                       // advances even if skipped
  }
}
export {}
