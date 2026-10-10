// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Loco = string;
interface Clip { duration: number; rate: number; }
interface Blend { prev: Loco; w: number; }
interface Inst { objectId: number; speed: number; want: Loco; phase: number; blend?: Blend; paletteBase: number; }
interface BlendJob { prev: Loco; prevT: number; w: number; }
interface Job { loco: Loco; t: number; blend?: BlendJob; }

const BUCKET_HZ = 30;   // sample-time quantisation for the dedup key

// Clip time for one instance. Stride-matched when stride and speed are known, else the authored rate.
function sampleTime(clip: Clip, strideUnits: number, speed: number, phase: number, animTime: number): number {
  const d = Math.max(clip.duration, 0.001);
  const rate = strideUnits > 0 && speed > 0 ? speed / strideUnits : Math.max(clip.rate, 0.001) / d;
  return Math.abs(((animTime + phase * d) * rate * d) % d);
}

// One model's visible instances -> unique palette jobs. Each instance gets the base offset of its job.
function discoverJobs(
  insts: Inst[],
  clipFor: (loco: Loco) => { clip: Clip; stride: number },
  animTime: number,
  paletteStride: number,
): Job[] {
  const jobs: Job[] = [];
  const dedup = new Map<string, number>();   // key: loco and 30 Hz bucket, scoped to this model
  for (const inst of insts) {
    const cur = clipFor(inst.want);
    const t = sampleTime(cur.clip, cur.stride, inst.speed, inst.phase, animTime);
    if (inst.blend !== undefined) {
      // Cross-fade: unique per instance, because the previous clip and the weight are not in the key.
      const prev = clipFor(inst.blend.prev);
      const prevT = sampleTime(prev.clip, prev.stride, inst.speed, inst.phase, animTime);
      jobs.push({ loco: inst.want, t, blend: { prev: inst.blend.prev, prevT, w: inst.blend.w } });
      inst.paletteBase = (jobs.length - 1) * paletteStride;
      continue;
    }
    const bucket = Math.floor(t * BUCKET_HZ);
    const key = `${inst.want}|${bucket}`;
    let idx = dedup.get(key);
    if (idx === undefined) {
      idx = jobs.length;
      jobs.push({ loco: inst.want, t });
      dedup.set(key, idx);
    }
    inst.paletteBase = idx * paletteStride;
  }
  return jobs;
}
