// Licence: CC-BY-SA 3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Ideas kept: independent layer channels, group fades (1000 ms out, 1000 ms in), hostile-count danger tiers.
// Defects fixed: no hysteresis at tier edges; no voice cap (donor has none).

const TIER_ENTER: number[] = [5, 10, 15, 20];   // donor thresholds (sounds.cpp 1626-1649), zone data
const TIER_LEAVE_MARGIN = 2;                     // fix: a tier is left only when the count falls 2 below its entry (proposed)
const THEME_FADE_MS = 1000;                      // donor (sounds.cpp 1631, 1633)
const VOICE_CAP = 32;                            // proposed; the donor has no cap (sound_backend_sdl3.cpp 343)

// Tier 0 = quiet. Tier n = the n-th danger theme.
function tierFor(hostiles: number, current: number): number {
  let tier = 0;
  for (let t = 0; t < TIER_ENTER.length; t++) {
    const holding = current >= t + 1;            // already in this tier or higher
    const threshold = holding ? TIER_ENTER[t] - TIER_LEAVE_MARGIN : TIER_ENTER[t];
    if (hostiles >= threshold) tier = t + 1;
  }
  return tier;
}

interface Step { op: "fadeGroup" | "playIn"; group: string; ms: number; id?: string; }

// Crossfade plan: fade the old theme out and bring the new one in over the same window.
function crossfadePlan(group: string, nextId: string | null): Step[] {
  const steps: Step[] = [{ op: "fadeGroup", group, ms: THEME_FADE_MS }];
  if (nextId !== null) steps.push({ op: "playIn", group, ms: THEME_FADE_MS, id: nextId });
  return steps;
}

// Voice admission with priority. Priority = donor sound_t order (sounds.h 24-38); the donor records it but never steals voices with it.
const PRIO: Record<string, number> = {
  background: 0, weather: 1, sensory: 2, music: 3, movement: 4, speech: 5, electronic_speech: 6,
  activity: 7, destructive_activity: 8, alarm: 9, combat: 10, alert: 11, order: 12,
};

interface Voice { id: string; prio: number; startedAt: number; }

function admit(voices: Voice[], v: Voice): boolean {
  if (voices.length < VOICE_CAP) { voices.push(v); return true; }
  let low = 0;
  for (let i = 1; i < voices.length; i++) {
    const a = voices[i], b = voices[low];
    if (a.prio < b.prio || (a.prio === b.prio && a.startedAt < b.startedAt)) low = i;
  }
  if (voices[low].prio >= v.prio) return false;  // newcomer is not louder in rank: drop it
  voices.splice(low, 1);
  voices.push(v);
  return true;
}

export {};
