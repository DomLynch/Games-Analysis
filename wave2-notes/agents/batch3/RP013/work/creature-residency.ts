// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Tint = "normal" | "shiny";

interface AssetIO {
  // loads the species atlas; resolves false when the file is missing or fails to load
  loadAtlas(species: string): Promise<boolean>;
  makeAnims(species: string, tint: Tint): void;
  dropAnims(species: string, tint: Tint): void;
  dropAtlas(species: string): void;
}

export class CreatureResidency {
  private refs = new Map<string, number>(); // key: species/tint
  private anims = new Set<string>();
  private atlas = new Map<string, Promise<boolean>>();

  constructor(private io: AssetIO) {}

  // one atlas load per species, shared by every caller; a failed load is forgotten so a later acquire retries
  private loadAtlas(species: string): Promise<boolean> {
    let p = this.atlas.get(species);
    if (!p) {
      p = this.io.loadAtlas(species).then((ok) => {
        if (!ok) this.atlas.delete(species);
        return ok;
      });
      this.atlas.set(species, p);
    }
    return p;
  }

  // ref-count up; the first holder of a key creates its animations once the atlas is ready.
  // resolves false when the caller should show the fallback texture instead.
  async acquire(species: string, tint: Tint): Promise<boolean> {
    const key = `${species}/${tint}`;
    this.refs.set(key, (this.refs.get(key) ?? 0) + 1);
    const ok = await this.loadAtlas(species);
    // re-check the count after the await: a release may have happened while the atlas loaded
    if (ok && (this.refs.get(key) ?? 0) > 0 && !this.anims.has(key)) {
      this.io.makeAnims(species, tint);
      this.anims.add(key);
    }
    return ok;
  }

  // ref-count down, floored at zero. Last holder of a key drops its animations;
  // when no tint of the species is held any more, the atlas is dropped too.
  release(species: string, tint: Tint): void {
    const key = `${species}/${tint}`;
    const n = Math.max(0, (this.refs.get(key) ?? 0) - 1);
    this.refs.set(key, n);
    if (n === 0 && this.anims.delete(key)) this.io.dropAnims(species, tint);
    const stillHeld = (["normal", "shiny"] as Tint[]).some(
      (t) => (this.refs.get(`${species}/${t}`) ?? 0) > 0
    );
    if (!stillHeld) {
      this.atlas.delete(species);
      this.io.dropAtlas(species);
    }
  }
}

export {};
