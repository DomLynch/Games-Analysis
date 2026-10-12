// Licence: Valve Source 1 SDK LICENSE (restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Vec3 = { x: number; y: number; z: number };
type Rng = () => number;

// Donor ReadInterval stores start and range (max - min); RandomInterval = start + uniform(0, range).
interface Interval { start: number; range: number }

interface Loop { wave: string; pitch: number; volume: number }
interface OneShotData { time: Interval; volume: Interval; waves: string[] }

// A zone is data: a sphere (radius < 0 = everywhere), a bed of stacked loops, and one-shot schedules.
interface BedData {
  zoneId: number;
  centre: Vec3;
  radius: number;
  loops: Loop[];
  oneShots: OneShotData[];
}

interface Out {
  set(wave: string, pitch: number, volume: number): void;
  stop(wave: string, pitch: number): void;
}

const FADE_S = 3.0; // donor default for soundscape_fadetime (seconds)

function dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function randomIn(i: Interval, rnd: Rng): number {
  return i.start + (i.range !== 0 ? rnd() * i.range : 0);
}

function approach(target: number, current: number, step: number): number {
  if (current < target) return Math.min(target, current + step);
  return Math.max(target, current - step);
}

// Zone pick: a zone is "in" when the listener is inside its radius and it is visible.
// The holder (current zone) keeps the slot while in range; a challenger needs to be
// in range and visible, and (if the holder is still in range) strictly nearer than the holder.
interface Pick { zoneId: number | null; distance: number }

function pickZone(cur: Pick, zones: BedData[], listener: Vec3, visible: (z: BedData) => boolean): Pick {
  let next: Pick = { zoneId: cur.zoneId, distance: cur.distance };
  let holderIn = false;
  let holderDist = 0;
  const holder = zones.find(z => z.zoneId === cur.zoneId);
  if (holder) {
    holderDist = dist(holder.centre, listener);
    holderIn = (holder.radius < 0 || holderDist < holder.radius) && visible(holder);
    next = { zoneId: holder.zoneId, distance: holderDist };
  }
  for (const z of zones) {
    if (holder && z.zoneId === holder.zoneId) continue;
    const d = dist(z.centre, listener);
    const inRange = z.radius < 0 || d < z.radius;
    if ((!holderIn || d < holderDist) && inRange && visible(z)) {
      next = { zoneId: z.zoneId, distance: d };
      holderIn = true;
      holderDist = d;
    }
  }
  return next;
}

interface Slot { wave: string; pitch: number; bed: number; current: number; target: number }

// Crossfade: a new bed fades every old loop to 0; a matching wave+pitch from the new bed
// reuses its slot so the level continues from where it was (no restart, no pop).
class BedMixer {
  private slots: Slot[] = [];
  private bed = 0;
  constructor(private fadeS: number = FADE_S) {}

  startBed(loops: Loop[]): void {
    this.bed++;
    for (const s of this.slots) s.target = 0;
    for (const loop of loops) {
      let slot = this.slots.find(s => s.bed !== this.bed && s.wave === loop.wave && s.pitch === loop.pitch);
      if (!slot) {
        slot = { wave: loop.wave, pitch: loop.pitch, bed: this.bed, current: 0, target: loop.volume };
        this.slots.push(slot);
      }
      slot.bed = this.bed;
      slot.target = loop.volume;
    }
  }

  // Frame-rate independent: each level moves toward its target by dt / fadeS per call.
  update(dtS: number, out: Out): void {
    const step = this.fadeS > 0 ? dtS / this.fadeS : dtS;
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const s = this.slots[i];
      if (s.current === s.target) continue;
      s.current = approach(s.target, s.current, step);
      if (s.target === 0 && s.current === 0) {
        out.stop(s.wave, s.pitch);
        this.slots.splice(i, 1);
      } else {
        out.set(s.wave, s.pitch, s.current);
      }
    }
  }
}

// One-shot schedule: first play after half an interval, then a full interval each time.
class OneShot {
  private next: number;
  constructor(private data: OneShotData, now: number, rnd: Rng) {
    this.next = now + 0.5 * randomIn(data.time, rnd);
  }
  tick(now: number, rnd: Rng, play: (wave: string, volume: number) => void): void {
    if (now < this.next) return;
    const wave = this.data.waves[Math.floor(rnd() * this.data.waves.length)];
    play(wave, randomIn(this.data.volume, rnd));
    this.next = now + randomIn(this.data.time, rnd);
  }
}

class SoundscapeClient {
  private cur: Pick = { zoneId: null, distance: 0 };
  private mixer = new BedMixer();
  private oneShots: OneShot[] = [];
  constructor(private zones: BedData[], private rnd: Rng) {}

  // Order: zone pick, then bed change (new one-shots), then loop fades, then one-shot timers.
  update(dtS: number, now: number, listener: Vec3, visible: (z: BedData) => boolean, out: Out, play: (wave: string, volume: number) => void): void {
    const next = pickZone(this.cur, this.zones, listener, visible);
    const changed = next.zoneId !== this.cur.zoneId;
    this.cur = next;
    if (changed) {
      const zone = this.zones.find(z => z.zoneId === next.zoneId);
      this.mixer.startBed(zone ? zone.loops : []);
      this.oneShots = zone ? zone.oneShots.map(o => new OneShot(o, now, this.rnd)) : [];
    }
    this.mixer.update(dtS, out);
    for (const s of this.oneShots) s.tick(now, this.rnd, play);
  }
}

export {};
