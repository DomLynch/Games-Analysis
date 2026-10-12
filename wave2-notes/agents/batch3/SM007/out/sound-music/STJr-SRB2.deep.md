# STJr-SRB2 (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/STJr-SRB2/src/s_sound.c` | Licence: GPL-2.0 (LICENSE file read: "GNU GENERAL PUBLIC LICENSE Version 2, June 1991"; source headers say "version 2") | C | symbol `S_getChannel` (with `S_StartSoundAtVolume`, `S_UpdateSounds`, `S_AdjustSoundParams`)

Depth: thin for the cell as a whole. The voice mechanism is read end to end; the music half of the topic is not. Checked: read in full: `S_getChannel` (190-259), `S_StartSoundAtVolume` (519-721, split-screen branch read but the main path is the one described), `S_UpdateSounds` (831-990), `S_StopChannel` (1041-1057), `S_CalculateSoundDistance` (1065-1085), `S_AdjustSoundParams` (1093-1207), `SetChannelsNum` (296-322), the sfx table header and rows (sounds.c 28 onward; row counts by grep), the `sfxinfo` struct (sounds.h 53-66), the flags (s_sound.h 60-74), and the mixer's `I_StartSound` (sdl/mixer_sound.c 621-630). Frame call site: d_main.c 928. Confidence high on the allocation order and the distance numbers; medium on the frame loop (only its call site was read). Not read, so NOT covered: the music side (`I_FadeSong` and `music_fade` in sdl/mixer_sound.c, `S_ChangeMusicEx` at s_sound.c 2240, the jingle stack at 1831-2110). Those were seen by grep only, so the layered-music, stinger and crossfade parts of this cell are not written up here.

Best transferable idea: a fixed pool of voices where each sound carries a priority and a few rule flags (one copy anywhere, no duplicate, no re-trigger from the same source), audibility is checked before a voice is taken, and a per-frame pass frees voices whose sound has ended or gone out of range.
Decision (proposed): adapt - keep the pool, the rule flags and the audible-before-voice order, but steal the lowest-priority voice instead of the first one at or below the new priority, check the duplicate rules across every voice, and normalise the distance ramp so it starts at full volume at 160 units (the three defects are in section 6).
Acceptance: a client test in a fight with a pool of 8 voices: 12 grunt hits (priority 64) and one boss telegraph (priority 200) start in one frame; the telegraph always plays, the stopped voices are the lowest-priority and oldest, and a second copy of a no-multiple sound never starts while one plays.

## 1. Mechanism

- One fixed pool of voices (channels). Pool size is the console variable `snd_channels`, default 32 (s_sound.c 91). `SetChannelsNum` (296-322) allocates it. Each voice records its sound, its origin (the emitting object) and the mixer handle.
- Each sound is one row in a table (sounds.c 28 onward): name, a singularity flag, a priority, and flags (`SF_*`). The priority is an integer; the default is 64 (`NORM_PRIORITY`, s_sound.c 149). Most of the 736 rows use 64 (grep count); the lowest real sound seen is 8 (the dummy row sfx_none is 0, sounds.c 37) (`fire`, sounds.c 88) and the highest 256.
- The start path (`S_StartSoundAtVolume`) checks audibility first (`S_AdjustSoundParams` at 675) and only then asks for a voice (`S_getChannel` at 687), then starts the mixer on that voice (720). A sound that cannot be heard takes no voice.
- `S_getChannel` (190-259), in this order:
  1. Scan voices in index order and stop at the first free one (200). On the way: a copy of the same sound anywhere is refused if `noMultiple` (205-207); with `singularity`, the old copy is stopped and its voice reused (210-212); same origin and same sound: refused if `noInterrupt` (217-218), otherwise the old voice is stopped and reused (220-222); same origin and a different sound, both `totallySingle`: the other is stopped and the voice reused (223-229).
  2. If the scan found no free voice (233): take the first voice, in index order, whose priority is at or below the new sound's (237), stop it and reuse it (247-248). If none qualifies, the new sound is dropped (240-243).
- The mixer ignores the priority argument: "priority and channel management is handled by SRB2" (sdl/mixer_sound.c 628). Priority only decides who loses a voice.
- Each frame, after drawing, the main loop calls `S_UpdateSounds` (d_main.c 928). For each voice: if the mixer says the sound has ended, the voice is freed (982-983). If the origin is not the local player, audibility is recomputed with `S_AdjustSoundParams`; an inaudible voice is stopped (965, 976); an audible one gets its new volume and pan (`I_UpdateSoundParams`). In split-screen the closer listener decides (dist1 <= dist2).
- Distance (`S_AdjustSoundParams`, 1093-1207): the distance is the approximate 3D distance (1065-1085). The X2/X4/X8 "away" flags divide it by 2, 4 or 8 (1163-1171), so the sound is heard from that many times farther. Past 1536 units (`S_CLIPPING_DIST`, 133) the sound is inaudible (1173). From 160 units (`S_CLOSE_DIST`, 140) the volume is `vol * 15 * (1536 - d) / (255 * 86)` (1199-1203; the divisor 86 is `S_ATTENUATOR`, 143). Pan comes from the angle to the listener (not receipted here).

## 2. Key functions

- `S_getChannel`: `/mnt/frankendom-donors/STJr-SRB2/src/s_sound.c` 190-259. The whole allocation and steal order.
- `S_StartSoundAtVolume`: s_sound.c 519-721. Audibility at 675, channel at 687, mixer start at 720.
- `S_UpdateSounds`: s_sound.c 831-990. Per-frame free and re-check (free at 982-983).
- `S_AdjustSoundParams`: s_sound.c 1093-1207. Audibility, range flags, attenuation, pan.
- `S_CalculateSoundDistance`: s_sound.c 1065-1085.
- `S_StopChannel`: s_sound.c 1041-1057. Stops the mixer handle and clears the slot.
- Data: `/mnt/frankendom-donors/STJr-SRB2/src/sounds.c` 28 onward (736 rows by grep count), `sounds.h` 53-66 (struct), `s_sound.h` 60-74 (flags).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed voice pool, size from settings | `snd_channels` = 32 (s_sound.c 91) |
| Default priority | 64 (s_sound.c 149) |
| Steal threshold: new sound beats a voice at or below its priority | `priority <= sfxinfo->priority` (237) |
| Duplicate rules | `noMultiple` flag 2, `noInterrupt` flag 32, `totallySingle` flag 1, `singularity` boolean (s_sound.h 68-73; checks at s_sound.c 205-225) |
| Priority examples (data) | fire 8 (sounds.c 88, no-interrupt); lightning 16 (sounds.c 101, no-multiple); jump 140 (sounds.c 70); spindash totally single (sounds.c 74) |
| Hearing-range multipliers | X2 / X4 / X8 flags divide distance by 2 / 4 / 8 (s_sound.c 1163-1171) |
| Clip and close distances | 1536 and 160 map units (s_sound.c 133, 140) |
| Attenuation | linear `vol * 15 * (1536 - d) / (255 * 86)` (s_sound.c 1202-1203, 143). At d = 160 this is about 0.94 of full volume (computed from the constants), so the ramp starts with a step of about 6 % |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's rule order (no-multiple, singleton, no-interrupt, same-family totally-single, a free voice, then steal) and its audible-before-voice order (the caller checks the distance gain first). It changes three things: it checks every voice for the duplicate rules before it takes a free slot (the donor stops at the first free slot, so a rule can be skipped); it steals the lowest-priority voice, with ties going to the oldest (the donor steals the first voice at or below the new priority); and it returns the voice it silenced so the caller can stop the audio (the donor stops it inside `S_StopChannel`). It normalises the distance ramp so it starts at exactly 1 at the close distance. It omits the mixer handle, the listener and split-screen logic, pan, closed captions, the Mario-mode sound swaps, the donor's approximate 3D distance (the caller supplies the distance), and the donor's `dontplay` path. The `totallySingle` check follows the code (same origin only), not the flag comment that says "GLOBALLY".

```ts
// Licence: GPL-2.0 donor (STJr-SRB2). Clean-room sketch of the shape only, not a translation.
export interface SoundDef {
  id: string;
  priority: number;          // higher keeps its voice
  family?: string;           // sounds that may stop each other
  singleton?: boolean;       // a new copy anywhere stops the old copy
  noMultiple?: boolean;      // a copy already playing anywhere blocks this one
  noInterrupt?: boolean;     // a copy from the same origin blocks this one
  totallySingle?: boolean;   // same family, same origin: a new member stops the other member
  rangeMul?: number;         // 1 = normal; 2, 4 or 8 = heard from that many times farther
}

interface Voice {
  def: SoundDef;
  origin: string | null;
  startedAt: number;
}

export interface Grant {
  slot: number;
  stopped: Voice | null;     // the voice that was silenced to make room, if any
}

export class VoicePool {
  private voices: (Voice | null)[];

  constructor(size: number) {
    this.voices = new Array<Voice | null>(size).fill(null);
  }

  // Returns a voice slot, or null when the new sound must not play.
  // The caller checks audibility first, so an inaudible sound never takes a voice.
  request(def: SoundDef, origin: string | null, now: number): Grant | null {
    // 1. Rules against sounds already playing. Every voice is checked, not only the ones before the first free slot.
    for (let i = 0; i < this.voices.length; i++) {
      const v = this.voices[i];
      if (!v) continue;
      const same = v.def.id === def.id;
      const sameOrigin = origin !== null && v.origin === origin;
      if (same && def.noMultiple) return null;
      if (same && def.singleton) return this.grant(i, def, origin, now);
      if (same && sameOrigin) {
        if (def.noInterrupt) return null;
        return this.grant(i, def, origin, now);
      }
      if (
        sameOrigin && !same && def.totallySingle && v.def.totallySingle &&
        def.family !== undefined && def.family === v.def.family
      ) {
        return this.grant(i, def, origin, now);
      }
    }

    // 2. A free voice.
    const free = this.voices.indexOf(null);
    if (free >= 0) return this.grant(free, def, origin, now);

    // 3. Full: silence the lowest-priority voice (ties: the oldest), unless it outranks the new sound.
    if (this.voices.length === 0) return null;
    let victim = 0;
    for (let i = 1; i < this.voices.length; i++) {
      const a = this.voices[i] as Voice;
      const b = this.voices[victim] as Voice;
      if (a.def.priority < b.def.priority || (a.def.priority === b.def.priority && a.startedAt < b.startedAt)) {
        victim = i;
      }
    }
    const weakest = this.voices[victim] as Voice;
    if (weakest.def.priority > def.priority) return null;
    return this.grant(victim, def, origin, now);
  }

  private grant(i: number, def: SoundDef, origin: string | null, now: number): Grant {
    const stopped = this.voices[i];
    this.voices[i] = { def, origin, startedAt: now };
    return { slot: i, stopped };
  }

  // Once per frame: free voices whose sound has ended.
  reap(isPlaying: (slot: number) => boolean): void {
    for (let i = 0; i < this.voices.length; i++) {
      if (this.voices[i] && !isPlaying(i)) this.voices[i] = null;
    }
  }
}

// Linear distance gain: full at closeDist, zero at clipDist (map units). rangeMul divides the distance.
export function distanceGain(dist: number, rangeMul = 1, closeDist = 160, clipDist = 1536): number {
  const d = dist / rangeMul;
  if (d >= clipDist) return 0;
  if (d <= closeDist) return 1;
  return (clipDist - d) / (clipDist - closeDist);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file copied to /tmp): exit 0.

## 5. Lands in

- TARGET `src/fight/sound-voices.ts` (new; a pure client helper that the fight client calls when a hit, telegraph or finisher wants a sound; it changes no fight state). Parity-checklist row 12 (combat sound cues).
- today: not checked in this pass.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: client-only sound (Frankendom ruling); no numbered brief rule applies.

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch takes the rule order and the numbers as described, not the code.
- Steal defect: the donor steals the first voice at or below the new priority (237-248), not the lowest. A grunt hit at 64 can silence a 64-priority telegraph that happened to sit earlier in the array. Fix: lowest priority, ties oldest (sketch step 3).
- Scan defect: the scan for duplicate rules stops at the first free slot (200-201), so a `noMultiple` or `noInterrupt` sound can start twice when a freed low index sits before a busy voice holding the copy. Fix: check every voice first (sketch step 1). This follows from the code order; not reproduced in a running build.
- Comment mismatch: the flag comment says the totally-single rule is "GLOBALLY" (s_sound.h 68), but the check requires the same origin (223-225). The sketch follows the code. Decide which one the design means.
- Close-distance step: at 160 units the donor drops from full volume to about 0.94 (computed from 133-143 and 1199-1203). Fix: normalise by (1536 - 160), as in the sketch.
- Priority only decides steals: it does not decide which sound is quiet. Frankendom's readability rule (375 wide, max enemies per frame) needs a voice cap as well. MAX_ATTACKERS = 3 caps how many enemies attack at once, which bounds the attack sounds from the fight engine, so the pool size should be a client setting (like `snd_channels`), not an engine rule.
- The pool is a client resource: the server never reads voices, so server-verified kills and the one ledger are unaffected.
- Closed captions use the same rows and priority (s_sound.c 477-480). Not written up; a candidate for the accessibility fold-in.
- Not covered: the donor's music fades, stingers and jingle stack (see Checked). The layered-music and ambience-bed parts of this cell need a separate read.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN. 32 channels, 64 default, 736 rows, scan/steal order, X2/4/8, 1536/160/86, 0.94 at 160, mixer ignores priority all match.
- Nit: the note says the lowest priority seen is 8; the placeholder row `sfx_none` (index 0) has priority 0 (sounds.c 37). Real sounds bottom out at 8; 0 is the dummy row only.
Fixed 2026-10-12: lowest-priority wording now excludes the dummy row.
