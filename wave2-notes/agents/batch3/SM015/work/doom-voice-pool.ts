// Licence: GPL-2.0 per README.TXT; source headers cite the DOOM Source Code License (unclear). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface SfxDef {
  name: string;
  priority: number;       // lower number = more important (donor convention)
  singleton: boolean;     // only one live voice of this sound at a time
  durationTicks: number;  // clip length in ticks; "still playing" is a clock, not a handle
}

interface Voice {
  sfx: SfxDef;
  emitter: string | null; // null = non-positional (menus, UI)
  startSeq: number;       // start order; breaks ties in the steal
  endTick: number;
}

class VoicePool {
  private slots: (Voice | null)[];
  private seq = 0;

  constructor(maxVoices: number) {
    this.slots = new Array<Voice | null>(maxVoices).fill(null);
  }

  // Returns the slot used, or -1 when every live voice is at least as important as the new sound.
  start(sfx: SfxDef, emitter: string | null, nowTick: number): number {
    this.expire(nowTick);
    if (emitter !== null) this.stopEmitter(emitter);  // one voice per emitter
    if (sfx.singleton) this.stopSfx(sfx.name);        // restart rule for one-at-a-time sounds

    let slot = this.slots.indexOf(null);
    if (slot < 0) {
      slot = this.pickVictim(sfx.priority);
      if (slot < 0) return -1;                        // drop the new sound
    }
    this.slots[slot] = { sfx, emitter, startSeq: ++this.seq, endTick: nowTick + sfx.durationTicks };
    return slot;
  }

  // Least important voice that is strictly less important than the new one; ties go to the oldest.
  private pickVictim(newPriority: number): number {
    let victim = -1;
    for (let i = 0; i < this.slots.length; i++) {
      const v = this.slots[i];
      if (v === null || v.sfx.priority <= newPriority) continue;
      if (victim < 0) { victim = i; continue; }
      const w = this.slots[victim] as Voice;
      if (v.sfx.priority > w.sfx.priority || (v.sfx.priority === w.sfx.priority && v.startSeq < w.startSeq)) {
        victim = i;
      }
    }
    return victim;
  }

  stop(slot: number): void {
    this.slots[slot] = null;
  }

  private stopEmitter(emitter: string): void {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i]?.emitter === emitter) this.slots[i] = null;
    }
  }

  private stopSfx(name: string): void {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i]?.sfx.name === name) this.slots[i] = null;
    }
  }

  private expire(nowTick: number): void {
    for (let i = 0; i < this.slots.length; i++) {
      const v = this.slots[i];
      if (v !== null && v.endTick <= nowTick) this.slots[i] = null;
    }
  }

  active(): number {
    return this.slots.filter(v => v !== null).length;
  }
}

// Full volume inside closeDist, linear fall to 0 at clipDist, silent beyond. maxVol is 15 in the donor's scale.
function attenuate(dist: number, closeDist: number, clipDist: number, maxVol: number): number {
  if (dist >= clipDist) return 0;
  if (dist <= closeDist) return maxVol;
  return Math.floor((maxVol * (clipDist - dist)) / (clipDist - closeDist));
}

export {};
