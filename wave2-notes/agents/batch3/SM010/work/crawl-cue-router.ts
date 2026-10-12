// Licence: GPL-2.0-or-later (donor). Clean-room sketch from the described mechanism, not a translation.
export interface CueRule {
  key: string;      // event key, e.g. "MEMORISE_SPELL" (donor matches regex over message text instead)
  file: string;     // sound file path
  hold: boolean;    // donor: interrupt flag; not used by the SDL playback path
}

export interface CueOptions {
  soundsOn: boolean;   // donor: sounds_on
  pickRule: "first" | "last"; // donor code takes the first match; donor guide says the last
  oneVoice: boolean;   // donor: one_SDL_sound_channel, default false
}

export interface CueDecision {
  play: string | null;     // file to play, or null
  stopPrevious: boolean;   // true when the single voice must cut the sound still playing
}

// Donor order: rules are checked in list order; one rule is taken per event.
export function routeCue(
  rules: CueRule[],
  key: string,
  opts: CueOptions,
  playing: string | null,
): CueDecision {
  if (!opts.soundsOn) return { play: null, stopPrevious: false };
  const hits = rules.filter((r) => r.key === key);
  if (hits.length === 0) return { play: null, stopPrevious: false };
  const rule = opts.pickRule === "first" ? hits[0] : hits[hits.length - 1];
  return { play: rule.file, stopPrevious: opts.oneVoice && playing !== null };
}

// Fix: the guide and the code disagree on first vs last; the sketch makes it an explicit option with a test.
export const exampleRules: CueRule[] = [
  { key: "MEMORISE_SPELL", file: "sounds/memorise.wav", hold: false },
  { key: "MEMORISE_SPELL", file: "sounds/memorise_alt.wav", hold: false },
];
