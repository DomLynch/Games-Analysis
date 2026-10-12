// Licence: MIT (donor, OpenTESArena). Code may be adapted; this sketch is written from the described mechanism.
interface Instance { id: number; name: string; oneShot: boolean; source: number | null }

// Fixed pool of sources (donor: maxChannels sources, free list mFreeSources).
class VoicePool {
  private free: number[];
  private instances = new Map<number, Instance>();
  private nextId = 1;
  private singleInstance: Set<string>;

  constructor(sourceCount: number, singleInstanceNames: string[]) {
    this.free = Array.from({ length: sourceCount }, (_, i) => i);
    this.singleInstance = new Set(singleInstanceNames);
  }

  allocate(name: string, oneShot: boolean): number {
    const id = this.nextId++;
    this.instances.set(id, { id, name, oneShot, source: null });
    return id;
  }

  private anyPlaying(name: string): boolean {
    for (const inst of this.instances.values()) {
      if (inst.name === name && inst.source !== null) return true;
    }
    return false;
  }

  // Donor playSound: no free source means drop (never steal); a single-instance name already
  // playing means skip. Otherwise take a source from the back of the free list.
  play(id: number): boolean {
    const inst = this.instances.get(id);
    if (!inst) return false;
    if (inst.source !== null) return true; // already holds a source: restart (donor rewinds)
    if (this.free.length === 0) return false;
    if (this.singleInstance.has(inst.name) && this.anyPlaying(inst.name)) return false;
    inst.source = this.free.pop() as number;
    return true;
  }

  // Donor freeSound: give the source back to the front of the free list and drop the instance.
  release(id: number): void {
    const inst = this.instances.get(id);
    if (!inst) return;
    if (inst.source !== null) {
      this.free.unshift(inst.source);
      inst.source = null;
    }
    this.instances.delete(id);
  }

  // Fix for a donor defect: a one-shot that cannot start is released at once. The donor keeps such
  // an instance forever, because its per-frame update only destroys one-shots whose source ran.
  playOneShot(name: string): boolean {
    const id = this.allocate(name, true);
    if (this.play(id)) return true;
    this.release(id);
    return false;
  }

  // Per frame (donor updateSources): a source whose sound has stopped is recycled;
  // a one-shot instance is destroyed when its sound ends.
  update(isStopped: (source: number) => boolean): void {
    for (const inst of [...this.instances.values()]) {
      if (inst.source === null || !isStopped(inst.source)) continue;
      this.free.unshift(inst.source);
      inst.source = null;
      if (inst.oneShot) this.instances.delete(inst.id);
    }
  }

  freeCount(): number {
    return this.free.length;
  }
}

// Stinger-then-bed: an optional stinger plays once; the bed is staged and starts when the stinger ends.
class MusicStage {
  private current: string | null = null;  // donor mCurrentSong
  private staged: string | null = null;   // donor mNextSong

  constructor(
    private startStream: (file: string, loop: boolean) => boolean,
    private isStreamPlaying: () => boolean,
  ) {}

  set(bed: string, stinger?: string): void {
    if (stinger !== undefined) {
      this.play(stinger, false);
      this.staged = bed;
    } else {
      this.staged = null;
      this.play(bed, true);
    }
  }

  // Donor playMusic: the same file already playing is a no-op; otherwise stop, then start.
  private play(file: string, loop: boolean): void {
    if (this.current === file) return;
    this.current = null;
    if (this.startStream(file, loop)) this.current = file;
  }

  // Fix for a donor defect: stopping all music also clears the staged bed. (The donor's stopMusic
  // leaves it set, so the old bed starts on the next frame.) The caller stops the stream itself.
  stopAll(): void {
    this.staged = null;
    this.current = null;
  }

  // Per frame (donor updateSources): when nothing is playing and a bed is staged, start the bed looping.
  // Fix for a donor defect: the staged name is cleared only when the bed really started (the donor
  // clears it even when there was no free source, so the bed is lost).
  update(): void {
    if (this.staged !== null && !this.isStreamPlaying()) {
      const bed = this.staged;
      this.play(bed, true);
      if (this.current === bed) this.staged = null;
    }
  }

  nowPlaying(): string | null {
    return this.current;
  }
}

export {};
