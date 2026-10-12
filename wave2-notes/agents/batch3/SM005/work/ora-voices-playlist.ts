// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Policy = "doNotPlay" | "interrupt" | "overlap";

export interface Voice { done: boolean; stop(): void; }

// Per-pool voice policy. Slots are keyed by actor; selected actors share slot 0.
export class VoiceSlots {
  private slots = new Map<number, Voice>();

  // Returns true if the clip started. play() starts the clip and returns its voice, or null on failure.
  admit(slotKey: number, policy: Policy, play: () => Voice | null): boolean {
    if (policy === "overlap") return play() !== null;

    const cur = this.slots.get(slotKey);
    if (cur && !cur.done) {
      if (policy === "doNotPlay") return false;
      cur.stop(); // interrupt
    }

    const v = play();
    if (v === null) return false;
    this.slots.set(slotKey, v);
    return true;
  }

  // Not in the donor: drop finished voices so the map does not keep old handles.
  prune(): void {
    for (const [k, v] of this.slots) if (v.done) this.slots.delete(k);
  }
}

export function slotKeyFor(actorId: number, selected: boolean): number {
  return selected ? 0 : actorId;
}

// Stable variant per actor: the same unit always gets the same accent.
export function variantFor(actorId: number, variants: readonly string[]): string {
  return variants[actorId % variants.length];
}

// Shuffle bag: each clip plays once before any repeats; refills when empty.
export class ShuffleBag<T> {
  private live: T[] = [];
  constructor(private readonly clips: readonly T[], private readonly rnd: () => number) {}

  next(): T | null {
    if (this.live.length === 0) this.live = [...this.clips];
    if (this.live.length === 0) return null;
    const i = Math.floor(this.rnd() * this.live.length);
    const [picked] = this.live.splice(i, 1);
    return picked;
  }
}

// Playlist state. background plays when nothing else is chosen; a stinger can replace it.
export interface PlaylistState { current: string | null; background: string | null; isBackground: boolean; }

// Next track after the current one in the list, wrapping to the first after the last.
export function nextTrack(list: readonly string[], current: string | null): string | null {
  if (list.length === 0) return null;
  const i = current === null ? -1 : list.indexOf(current);
  return list[(i + 1) % list.length];
}

// Game over: the victory or defeat track becomes the background and replaces the current track.
export function onGameOver(st: PlaylistState, won: boolean, victory: string | null, defeat: string | null): void {
  const t = won ? victory : defeat;
  if (t !== null) {
    st.background = t;
    st.current = null;
    st.isBackground = true;
  }
}

// Stop: fall back to the background track when one is set.
export function stopTrack(st: PlaylistState): void {
  st.current = st.background;
  st.isBackground = st.background !== null;
}

export {};
