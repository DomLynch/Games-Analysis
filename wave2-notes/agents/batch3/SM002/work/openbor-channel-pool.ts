// Licence: BSD-3-Clause (donor LICENSE, read). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Ideas kept: fixed priority channel pool with a reserved music slot; steal the lowest priority that is not above the newcomer; one chance roll per play; delay in game-speed units; group and owner masks for stop; one-of-range pick by rejection sampling.
// Defects fixed: equal-priority steal takes the oldest voice, not the lowest index; a real voice cap; music switch fades instead of closing.

const VOICE_CAP = 32;          // proposed; donor cap is 4096 = 64 banks x 64 (sound_channel.h 27-29)
const MUSIC_FADE_MS = 1000;    // proposed; donor has no fade (soundmix.c 3449 closes the old music at once)
const ALL_OWNERS = -1;         // donor uses UINT64_MAX (sound_channel.c 105)

interface Slot { id: number; priority: number; startedAt: number; group: number; owner: number; }

// Acquire a free voice, else steal. The donor steals the lowest priority and drops the newcomer when that
// lowest is above it (soundmix.c 2440-2446). Fix: among equal priorities steal the oldest (donor: lowest index).
function acquire(slots: Slot[], incoming: Slot): boolean {
  if (slots.length < VOICE_CAP) { slots.push(incoming); return true; }
  let victim = 0;
  for (let i = 1; i < slots.length; i++) {
    const s = slots[i], v = slots[victim];
    if (s.priority < v.priority || (s.priority === v.priority && s.startedAt < v.startedAt)) victim = i;
  }
  if (slots[victim].priority > incoming.priority) return false;
  slots.splice(victim, 1);
  slots.push(incoming);
  return true;
}

// One chance roll per play, rolled at start and tested when the delay ends (soundmix.c 2509-2511, 1566-1579).
interface Gate { chance: number; roll: number; }   // chance 0..100, roll in [0, 1)
function passesChance(g: Gate): boolean {
  return g.chance >= 100 || g.roll < g.chance / 100;
}

// Delay in game-speed units, converted to output frames with a rounded-up partial (soundmix.c 2343-2358).
function delayFrames(delay: number, rate: number, outRate: number): number {
  const whole = Math.floor(delay / rate);
  const rem = delay % rate;
  return whole * outRate + Math.ceil((rem * outRate) / rate);
}

// Stop every voice that shares a group bit and matches the owner (sound_channel.c 97-106).
function stopGroup(slots: Slot[], group: number, owner: number): Slot[] {
  return slots.filter((s) => !((s.group & group) !== 0 && (owner === ALL_OWNERS || s.owner === owner)));
}

// Pick one candidate uniformly by rejection sampling (openbor.c 9927-9946). Others always play.
function pickOne(candidates: number[], rand32: () => number): number {
  const n = candidates.length;
  if (n <= 1) return candidates[0];
  const limit = 2 ** 32 - (2 ** 32 % n);
  let r = rand32();
  while (r >= limit) r = rand32();
  return candidates[r % n];
}

// Music switch: start the new track while the old one fades (donor closes the old one at once).
function switchMusic(old: { fadeOut(ms: number): void } | null, startNew: () => void): void {
  if (old !== null) old.fadeOut(MUSIC_FADE_MS);
  startNew();
}

export {};
