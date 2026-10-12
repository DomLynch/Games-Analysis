# id-Software-DOOM (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/s_sound.c` (with `i_sound.c`, `sounds.c`, `sounds.h`, `m_misc.c`, `doomdef.h`, `d_main.c`, and `sndserv/soundsrv.c`) | Licence: unclear. `LICENSE.TXT` is the GPL v2 text and `README.TXT` line 81 says "Licensed under the GNU General Public License 2.0."; the `s_sound.c` header (lines 8-10) says "only under the terms of the DOOM Source Code License as published by id Software". Treated as unclear: clean-room, shape only. | C | symbol `S_StartSoundAtVolume`, `S_getChannel`

Checked: Read in full: `s_sound.c` S_StartSoundAtVolume (254-395), S_StopSound (471-484), S_UpdateSounds (519-613), S_ChangeMusic (649-686), S_StopChannel (708-730), S_AdjustSoundParams (752-818), S_getChannel (827-875); `i_sound.c` addsfx (264-381), I_StartSound (470-501), I_StopSound (505-514), I_SoundIsPlaying (517-520); `d_main.c` main loop (384-400). Read `sndserv/soundsrv.c` addsfx opening (419-480) and its call site (689); the sndserv command loop was not read. Callers: S_StartSoundAtVolume is reached from S_StartSound (397) and from many game sites (p_mobj.c, p_plats.c, p_map.c, f_finale.c, found by grep only, not read in full); the claims about the function apply to every caller, which pass only an origin and a sound id. Confidence: high for the order of steps and the numbers on the game side and in addsfx; medium-high for the defect where the shipped build releases game-side voices almost at once (read from the code, not run). Nothing was run or built. Not read: the I_UpdateSound mix body (539 onward), the sndserv command loop, the sounds.c table beyond the entries cited. Fade, crossfade, layer, ambience, stinger, biome and spell terms: grepped in `s_sound.c`, `i_sound.c`, `sounds.c`, `sndserv/*.c`; none found (the only hits were "player").

Best transferable idea: Cap the number of live voices; when a new cue is more important than the least important live voice, stop that voice, otherwise drop the new cue; one voice per emitter, and a singleton flag restarts one-at-a-time cues.
Decision (proposed): adapt - the voice cap, priority steal and per-emitter rule suit a client-side cue pool, but the donor's game-side count is released every frame and the mixer ignores priority, so take the shape and fix the defects listed in section 6.
Acceptance: A client test with a fake clock: with a cap of 4, six cues in one frame leave the four most important voices live; a stop(slot) silences that voice in the same frame; voices stay counted across frames until their end tick, so no voice is released early.

## 1. Mechanism

The donor has two layers. The game side (`s_sound.c`) decides which sound gets a voice. The mixer (`i_sound.c`, or the `sndserv` process in the shipped build, see section 6) mixes the voices that were granted.

Order of steps for one sound start, S_StartSoundAtVolume (254-395):
- (a) Linked sounds (`sfx->link` set, for example `chgun` linked to `pistol`) copy pitch and priority from the table and add the link's volume offset; if the total volume is below 1 the sound is dropped (283-296). Unlinked sounds take pitch 128 and priority 64 locally (298).
- (b) If the origin is not the player's own object, S_AdjustSoundParams (752-818) computes distance and volume. Past the clip distance of 1200 map units it returns 0 and the sound is dropped. Volume falls linearly from full at 160 units to 0 at 1200 units (812-817). Stereo separation is 128 minus 96 times the sine of the angle between the listener's facing and the source (793). A source at the player's exact position gets centre separation (312-315).
- (c) Pitch jitter: `8 - (rand & 15)` for the saw sounds (330), so an offset from +8 down to -7 of 128; `16 - (rand & 31)` for other sounds (340), from +16 down to -15; `itemup` and `tink` get no jitter (337-338).
- (d) S_StopSound(origin) (349) stops the first existing voice with the same origin, so one emitter keeps one voice.
- (e) S_getChannel (352). (i) Take the first free slot, or reuse a slot with the same origin (838-845). (ii) If none is free, take the first slot whose table priority is greater than or equal to the new sound's table priority and stop it (850-865). (iii) If none qualifies, return -1 and the new sound is dropped (850-859). Lower number means more important.
- (f) I_StartSound calls addsfx in the mixer. addsfx (264-381) cuts an existing voice of a singleton id first (285-290: chainsaw sounds, `stnmov`, `pistol`). Otherwise it takes the first free of 8 mixer channels, or else the channel with the oldest start tick (308-323). The priority argument is discarded by I_StartSound (480).

Per main-loop pass: `d_main.c` 392 calls S_UpdateSounds with the player's object. For each live game voice, if I_SoundIsPlaying is true the voice's volume and separation are recomputed (560) and it is stopped if no longer audible; if it is false the game-side voice is freed (604). S_ChangeMusic (649-686): if the same track is already playing it returns (665-668); otherwise it stops the old track and plays the new one (668-685). There is no fade. Map music is chosen by episode and map (236).

## 2. Key functions

- `S_StartSoundAtVolume`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/s_sound.c` 254-395. Order: priority from link (283-298), distance and separation (304-319), pitch jitter (326-342), stop by origin (349), getChannel (352), I_StartSound (end of function).
- `S_getChannel`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/s_sound.c` 827-875. Free slot or same origin (838-845), eviction by table priority (850-865), claim the slot (871-872).
- `S_AdjustSoundParams`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/s_sound.c` 752-818. Clip test (773-774), stereo (793), linear volume (796-817).
- `S_UpdateSounds`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/s_sound.c` 519-613. Per-voice check (560), free on stopped (604).
- `addsfx`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/i_sound.c` 264-381. Singleton cut (285-290), oldest steal (308-323), per-side volume (352-361).
- `I_SoundIsPlaying`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/i_sound.c` 517-520. Returns `gametic < handle`.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Voice cap; steal the least important voice; drop when none is less important | Game side: 3 voices by default (`snd_channels`, m_misc.c 282). Mixer: 8 channels (i_sound.c 94). Priority table: lower is more important, pldeth 32 (sounds.c 175), itemup 78 (150), posit1 98 (154), sawidl 118 (129), tink 60 (205) |
| One voice per emitter | Stop by origin, first match only (s_sound.c 478, called at 349) |
| Singleton restart for one-at-a-time cues | Mixer list hard-coded: sawup, sawidl, sawful, sawhit, stnmov, pistol (i_sound.c 285-290). The `singularity` field (sounds.h 37-38) is declared and never read |
| Linear distance falloff with a hard cut | Clip 1200 map units (s_sound.c 55), close 160 (61), volume scale 0-15 (113), linear formula (813). Attenuator 1040 = 1200 - 160 (computed, not a donor constant) |
| Stereo from angle | Swing 96 of 128 (s_sound.c 74 and 793); centre 128 (71) |
| Pitch jitter | Normal pitch 128 (69); offset from +16 to -15 (340); offset from +8 to -7 for saws (330) |
| Level exemption from the distance cut | Map 8 skips clipping and is always at full volume (773, 802-806) |

## 4. TypeScript sketch

simplified: keeps the donor order (expire finished voices, one voice per emitter, singleton restart, free slot, steal, drop), but steals the least important voice instead of the first lower one, breaks ties by age, and tracks end by tick instead of the donor's `gametic < handle` test. It omits the mixer, the stereo split, the pitch jitter, the self-sound centre rule and the map-8 no-clip case; `attenuate` is included as the distance helper. `stop()` is new, because the donor's I_StopSound is a stub (i_sound.c 510-513).

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/sfx-voices.ts` (new, client-side only: the engine emits cue events, the client owns the voice pool, so a cue never changes a kill). Parity-checklist row 12 (combat sound cues). The list's hint said row 14, but row 14 is HUD in the addendum; the combat cue row is 12.
- Today: no code path in this donor maps to a Frankendom file; the target is new.
- Reuse tag: rewrite-from-idea (licence unclear: clean-room only)
- Brief rule served: rule 1 (one engine, two clients: the engine sends cues, the client voices them); rule 8 (named target and parity row)

## 6. Gaps and risks

- Game-side voices are released every frame in the shipped build. `doomdef.h` 84 defines `SNDSERV 1`, so `I_StartSound` returns the sound id (i_sound.c 486-489) and not an addsfx handle. `I_SoundIsPlaying` returns `gametic < handle` (520). Sound ids are small table indexes, so once gametic passes an id, S_UpdateSounds (560, freed at 602) releases that voice on the next pass. Result, from reading only: the game-side cap of 3 holds within a single pass, and the 8-voice mixer steal is the real limit. Fix: track end by a clock (start tick plus clip length), which the sketch does, or get an acknowledgement from the mixer.
- Stop does nothing in the donor. I_StopSound (505-513) only sets its argument to 0. S_StopChannel (708-730) frees the game slot but the voice keeps playing in the mixer. The only commands written to the sndserv pipe are "p" (play, i_sound.c 485) and "q" (quit, 699), so there is no stop command. Fix: add a stop command, or a handle-based stop in the mixer; the sketch's `stop(slot)` shows the intent.
- Mixer ignores priority. I_StartSound sets `priority = 0` (480) and the comment at 465 says priority is not handled. The mixer steals the oldest of its 8 channels, so a low-importance sound can push out a death cue that the game side protected. Fix: pass priority down, or set the mixer cap equal to the game cap.
- Singleton flag is dead. `singularity` (sounds.h 37-38) is never read; the one-at-a-time list is written out in two places (i_sound.c 285-290 and sndserv/soundsrv.c 438-443). Fix: read the flag in both.
- Ties in the oldest search. addsfx starts from `oldest = gametic` (i_sound.c 276) and uses a strict `<` (311), so voices started in the same tic all tie and slot 0 is overwritten. Fix: use a start sequence number, as the sketch does.
- First-fit eviction. S_getChannel stops the first slot that is equal or less important (854), not the least important one, and equal priority may be evicted. Fix: the `pickVictim` rule in the sketch (strictly less important, least important first, ties to oldest).
- Unused local priority. Linked sounds copy `sfx->priority` into a local (286) and unlinked sounds get 64 (298); the local is discarded by I_StartSound. The eviction uses the table value directly (854), so behaviour is unaffected. Not a defect to fix, only dead code.
- Map 8 is special-cased: the distance cut is skipped and volume is full there (773). In Frankendom this is a per-zone flag (zones as data), not a constant in the function.
- Not in the donor: layered music, crossfades between tracks (music changes are an instant stop and play, 668-685), stingers, ambience beds per biome, and spell sounds. Those need another donor. Music here is per map only (236).
- Clip length is not in the donor (samples are read from lumps), so `durationTicks` has no donor constant; the value must come from the Frankendom asset.
- Licence is unclear, so the sketch is clean-room. The Linux code is from 1996-97 and no build or run was done here.

Reuse tag: rewrite-from-idea (licence unclear: clean-room only)
Brief rule served: rule 1 (one engine, two clients); rule 8 (named target and parity row)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- Errors: none found (one trivial line-number slip, see below).
- Error (trivial): the free-on-stopped line was cited as 602 (the comment); the call is at 604.
- Missed: S_getChannel/S_StopChannel also scans other channels sharing the sfxinfo to adjust usefulness (s_sound.c 720-735); sounds.c itemup/posit1 have singularity=true but it is never read (consistent with the note). Nothing important missed.
- Verified OK: s_sound.c, i_sound.c, doomdef.h SNDSERV, m_misc snd_channels, sounds.c priorities, singularity declared, licence header and README.

Fixed 2026-10-12: free-on-stopped citation corrected to 604.
