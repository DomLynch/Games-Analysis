// Licence: Apache-2.0 (donor repo LICENSE). Clean-room sketch written from the described mechanism; no donor lines copied.
const FADE_DURATION_S = 2;   // donor L2ActorFade.DurationSeconds
const ALPHA_PER_S = 127.5;   // donor L2ActorFade.AlphaPerSecond (255 / 2)

interface CorpseFade {
  id: number;
  elapsed: number;
  alpha: number; // 0..255
}

// Donor AlphaByte: 255 - elapsed * 127.5, clamped to 0..255, truncated to a byte.
function alphaAt(elapsed: number): number {
  const v = 255 - elapsed * ALPHA_PER_S;
  if (v <= 0) return 0;
  if (v >= 255) return 255;
  return Math.floor(v);
}

class CorpseFadeSet {
  private fades = new Map<number, CorpseFade>();

  constructor(private onRemove: (id: number) => void) {}

  // canFade = the body has at least one fadable renderer. If not, the body is removed at once.
  add(id: number, canFade: boolean): void {
    if (this.fades.has(id)) return;          // duplicate id: ignored
    if (!canFade) {
      this.onRemove(id);
      return;
    }
    this.fades.set(id, { id, elapsed: 0, alpha: 255 });
  }

  // dt in seconds. Finished bodies are collected, then removed after the loop.
  tick(dt: number): void {
    const done: number[] = [];
    for (const f of this.fades.values()) {
      f.elapsed += dt;
      if (f.elapsed > FADE_DURATION_S) {
        done.push(f.id);
        continue;
      }
      f.alpha = alphaAt(f.elapsed);
    }
    for (const id of done) {
      this.fades.delete(id);
      this.onRemove(id);
    }
  }
}

export {};
