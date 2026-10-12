// Licence: GPL-2.0 (donor, freeciv client/music.c and client/audio.c). Clean-room sketch from the described mechanism, not a translation.
// clean-room
type Mood = "peaceful" | "combat";

interface Loop {
  mood: Mood;
  index: number; // index of the alternative now playing
}

interface Director {
  peacefulTracks: string[];
  combatTracks: string[];
  mood: Mood;
  loop: Loop | null;
  fadeMs: number;                              // crossfade length (donor: 2000)
  fadeStartMs: number;                         // when the current crossfade began
  fading: boolean;                             // true while the old loop fades out
  stingerEndMs: number;                        // 0 when no stinger is playing
}

// Random alternative, never the one just played (when there is a choice).
function pickAlternative(count: number, exclude: number): number {
  if (count <= 0) return -1;
  if (count === 1) return 0;
  const candidates = count - (exclude >= 0 ? 1 : 0);
  let r = Math.floor(Math.random() * candidates);
  if (exclude >= 0 && r >= exclude) r += 1;
  return r;
}

function startLoop(d: Director, mood: Mood, nowMs: number): void {
  const group = mood === "combat" ? d.combatTracks : d.peacefulTracks;
  const prev = d.loop;
  const exclude = prev !== null && prev.mood === mood ? prev.index : -1;
  d.loop = { mood, index: pickAlternative(group.length, exclude) };
  if (prev !== null) {            // crossfade: old loop fades out while the new one fades in
    d.fading = true;
    d.fadeStartMs = nowMs;
  }
}

// Mood flips (peace <-> combat) change the group at once; no restart when the mood is unchanged.
function setMood(d: Director, mood: Mood, nowMs: number): void {
  if (mood === d.mood) return;
  d.mood = mood;
  if (d.stingerEndMs > nowMs) return; // the stinger is playing: the loop resumes at the current mood
  startLoop(d, mood, nowMs);
}

// One-shot cue (victory, ambush). The loop is not discarded: it resumes at the current mood when the cue ends.
function playStinger(d: Director, durationMs: number, nowMs: number): void {
  d.stingerEndMs = nowMs + durationMs;
  d.loop = null;
}

function tick(d: Director, nowMs: number): void {
  if (d.stingerEndMs > 0 && nowMs >= d.stingerEndMs) {
    d.stingerEndMs = 0;
    startLoop(d, d.mood, nowMs);
  }
}

// Gains for the old and new loop at time nowMs. Both ramps use the same window, so the sum stays 1.
function crossfadeGains(d: Director, nowMs: number): { fromGain: number; toGain: number } {
  if (!d.fading) return { fromGain: 0, toGain: 1 };
  const t = Math.min(1, Math.max(0, (nowMs - d.fadeStartMs) / d.fadeMs));
  if (t >= 1) {
    d.fading = false;
    return { fromGain: 0, toGain: 1 };
  }
  return { fromGain: 1 - t, toGain: t };
}

interface Voice { id: number; priority: number; endMs: number; }

// Voice cap with priority (not in the donor). A full pool only gives up its lowest-priority voice
// to a strictly higher-priority sound; otherwise the new sound is dropped.
function takeVoice(pool: Voice[], cap: number, priority: number, endMs: number, nowMs: number, id: number): Voice | null {
  const live = pool.filter((v) => v.endMs > nowMs);
  pool.splice(0, pool.length, ...live);
  if (live.length < cap) {
    const v: Voice = { id, priority, endMs };
    pool.push(v);
    return v;
  }
  let lowest = live[0];
  for (const v of live) {
    if (v.priority < lowest.priority) lowest = v;
  }
  if (priority <= lowest.priority) return null;
  lowest.id = id;
  lowest.priority = priority;
  lowest.endMs = endMs;
  return lowest;
}

export {}
