# id-Software-wolf3d (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/ID_SD.C` (with `WL_GAME.C`, `WL_PLAY.C`, `WL_DRAW.C`) | Licence: LIMITED USE SOFTWARE LICENSE AGREEMENT, id Software, Inc. (`WOLFSRC/README/LICENSE.DOC:1-12`; restricted, clean-room only) | C (DOS, Borland C++ era) | symbol `SD_PlaySound`

Checked: `SD_PlaySound` (ID_SD.C:2123) read in full through 2201; `SD_PlayDigitized` (1130-1190) and `SD_SetPosition` (1109-1119) read; `SD_StartMusic` (2309-2325) read; `SetSoundLoc`, `PlaySoundLocGlobal`, `UpdateSoundLoc` (WL_GAME.C 113-188) read; `StartMusic` (WL_PLAY.C 1023-1042) and the `PlayLoop` call site (1432) read; `CalcTics` (WL_DRAW.C 1236-1266) read. Confidence: high on the voice priority gate and the release path; high on the re-pan path; medium on which stereo side the donor's `lefttable` maps to (axis convention not read). Not read: the bodies of `PlaySoundLocActor` and `PlaySoundLocTile` (WL_ACT*.C), `StartCPMusic`, the numeric pan table rows beyond the first few, the per-sound priority values (they live in the compiled audio chunks, `SoundCommon.priority` at ID_SD.H:32), and the digitised sound map header near WL_MAIN.C 872-935.

Best transferable idea: give each sound channel one priority slot, so a cue plays only if its priority is at least that of the cue now holding the slot, and re-pan a positioned cue from its stored point every frame.
Decision (proposed): adapt - keep the one-slot-per-kind priority gate and the per-frame re-pan, but fix the donor's equal-priority restart, the synth-path position loss and the fixed-source defect (see section 6), because a boss spell cue must outrank a hit cue while a burst of same-cue hits must not restart the clip.
Acceptance: a client unit test on `VoiceSlot` shows a priority-3 spell cue starts while a priority-1 hit clip plays, a priority-1 hit started during the spell returns false, and a same-cue hit burst inside its cooldown plays only once.

## 1. Mechanism

- Two voice slots, one priority each. The sample slot (`DigiNumber`/`DigiPriority`) carries digitised clips. The synth slot (`SoundNumber`/`SoundPriority`) carries PC-speaker or AdLib sounds for cues with no digitised version. Each slot holds one cue. That is the whole voice limit: at most one sample and one synth voice, plus the music.
- Order of steps in `SD_PlaySound` (2123):
  1. Take the staged left/right position left by `SD_PositionSound` (2110-2114), clear the staged state, and check the cue number (`-1` returns false).
  2. If digitised output is on and the cue has a digitised version (2144), go to the sample path. On the PC-speaker digitised mode the gate is against the synth priority (2148), the PC note is stopped, and the clip starts. Otherwise the gate is against the sample priority (2169); if the cue is not refused, the sample priority is stored (2175), `SD_PlayDigitized` starts it, and the call returns true (2178).
  3. Else the synth path. Gate against the synth priority (2185), play on PC or AdLib, store the priority (2199), return false (2201).
- A new sample always stops the one playing: `SD_PlayDigitized` calls `SD_StopDigitized` first (1138), and `SD_StopDigitized` clears the sample number and priority (1057).
- Release: the ISR path `SDL_DigitizedDone` (1165) clears the sample slot when the last segment has played (1175-1184). If the next page is not ready it sets `DigiMissed` instead (1188). The synth slot is cleared when a PC or AdLib sound ends, through the `SDL_SoundFinished` macro (48), and also in one other place (1763).
- Positional audio: `PlaySoundLocGlobal` (WL_GAME.C:170) calls `SetSoundLoc` (113), which takes the world offset from the view, shifts it by `TILESHIFT` into tile units (129), clamps it to the 15-tile table (138-145, `ATABLEMAX` 15 at line 76), and reads a left and right channel value from `lefttable` and `righttable` (146-147). It stages them with `SD_PositionSound`, plays the cue, and stores the world point only if the cue started on the sample path (174-176).
- Re-pan: once per `PlayLoop` pass (WL_PLAY.C:1432), `UpdateSoundLoc` (WL_GAME.C:181) re-runs `SetSoundLoc` from the stored point if `SoundPositioned` is set (183-186). So a positioned clip follows the listener turning or moving. It does not follow a moving source: the stored point is fixed when the cue is triggered.
- Loop: `PlayLoop` (WL_PLAY.C:1368) is variable-step. `CalcTics` (WL_DRAW.C 1236-1266) takes `tics` as the real time since the last pass (1249) and clamps it to `MAXTICS` (1265). The re-pan runs once per pass, so its rate follows the frame rate.
- Music: `StartMusic` (WL_PLAY.C:1023) stops the sequencer, picks `songs[mapon + episode*10]` (1028), and calls `SD_StartMusic` (2309). That stops the old song and starts the new one with no crossfade (2311). Music only starts when the mode is AdLib (ID_SD.C:2315). `SD_FadeOutMusic` is called in one place, the music-mode switch (1834).
- Stingers: the end-of-level song `ENDLEVEL_MUS` is started from WL_INTER.C:561 (through `StartCPMusic`, body not read). The player death cue is an ordinary `SD_PlaySound` (WL_GAME.C:1121).
- Ambience: none. A grep for `ambien` and `ambient` in the `*.C` and `*.H` files returned nothing. There is no biome or ambience bed.

## 2. Key functions

- `SD_PlaySound`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/ID_SD.C` 2123-2201. Priority gate, sample or synth path, return value.
- `SD_PlayDigitized`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/ID_SD.C` 1130-1190. Stop, set position, start the first page.
- `SDL_DigitizedDone`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/ID_SD.C` 1165-1190. End-of-clip release and underrun flag.
- `PlaySoundLocGlobal` and `UpdateSoundLoc`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_GAME.C` 170-188. Stage, play, store the point; per-pass re-pan.
- `SetSoundLoc`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_GAME.C` 113-147. World point to view offset to pan table.
- `StartMusic`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_PLAY.C` 1023-1042. Per-map song choice and hard start.
- `CalcTics`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_DRAW.C` 1236-1266. The tick source for the per-pass re-pan.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One priority slot per channel kind; a cue plays only if priority >= the slot's current priority; release on clip end | Priority values per sound: not read (in the audio chunk header, `SoundCommon.priority`, ID_SD.H:32) |
| Left and right split read from a lookup table, indexed by distance and side (not an equal-power formula) | Table size 15 tiles (`ATABLEMAX`, WL_GAME.C:76); the table cell values (WL_GAME.C 77-107) not read in full |
| Stereo channel range 0-15, illegal (15,15) | Range check at ID_SD.C 1119 (`SD_SetPosition: Illegal position`) |
| Re-pan each frame from a stored world point | Once per `PlayLoop` pass (WL_PLAY.C:1432) |
| One song per map | `songs[mapon + episode*10]` (WL_PLAY.C:1028) |
| Fade only on a mode change | Fade call at ID_SD.C:1834; no crossfade anywhere |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's gate shape (a cue plays only if its priority is at least the slot's current one; equal priority replaces unless the same cue is inside its cooldown) and the release at clip end. It replaces the donor's 15-row pan table with a computed equal-power pan, keeps the sign of the lateral term (the donor takes `abs(x)` first, WL_GAME.C:142-143), stores a source getter for every positioned voice (the donor stores a point only on the sample path, WL_GAME.C:174-176), and adds the same-cue cooldown the donor lacks. It omits the PC-speaker and AdLib split, the sample paging and `DigiMissed` underrun, the staged-position globals, the `SD_SetPosition` 0-15 range check, the `ispos` flag and the donor's music side. The sketch is client-only: the engine never calls it.

```ts
// Donor licence: restricted (id Software LIMITED USE SOFTWARE LICENSE AGREEMENT). Clean-room sketch of the shape of the mechanism, not a translation of the donor lines.
// clean-room
export type CueId = string;

export interface Cue {
  id: CueId;
  priority: number;      // higher wins; the donor reads it from the sound chunk header
  lengthMs: number;      // clip length; the voice is freed after it
  cooldownMs?: number;   // fix: same cue inside this window does not restart the voice
}

export interface Point { x: number; y: number; }

export interface Listener extends Point { facing: number; } // facing in radians

export interface Pan { left: number; right: number; }      // gains 0..1

interface Voice {
  cue: Cue;
  startedAt: number;     // ms
  source?: () => Point;  // live world point of a positioned cue (fix: a getter, so a moving source is re-read every frame)
}

// One slot per channel kind (the donor has one digitised slot and one synth slot).
export class VoiceSlot {
  private playing: Voice | null = null;
  private lastId: CueId | null = null;
  private lastStart = -Infinity;

  // A cue plays only if its priority is at least the priority of the voice now playing.
  // Equal priority replaces the voice, as the donor's "<" test does, unless the same cue
  // started inside its cooldown window.
  tryPlay(cue: Cue, now: number, source?: () => Point): boolean {
    this.release(now);
    if (this.playing) {
      if (cue.priority < this.playing.cue.priority) return false;
      if (cue.id === this.lastId && now - this.lastStart < (cue.cooldownMs ?? 0)) return false;
    }
    this.playing = { cue, startedAt: now, source };
    this.lastId = cue.id;
    this.lastStart = now;
    return true;
  }

  // The donor clears the priority when the last segment of the clip finishes.
  release(now: number): void {
    if (this.playing && now - this.playing.startedAt >= this.playing.cue.lengthMs) {
      this.playing = null;
    }
  }

  current(): Voice | null {
    return this.playing;
  }
}

// Equal-power pan from the listener's facing. Keeps the sign of the lateral term.
export function panFor(listener: Listener, src: Point): Pan {
  const dx = src.x - listener.x;
  const dy = src.y - listener.y;
  const dist = Math.hypot(dx, dy);
  const right = dx * Math.sin(listener.facing) - dy * Math.cos(listener.facing); // +ve = source on the right
  const side = dist > 0 ? Math.max(-1, Math.min(1, right / dist)) : 0;
  const atten = Math.max(0, 1 - dist / 15);  // 15 tiles, like the donor's ATABLEMAX
  const t = ((side + 1) / 2) * (Math.PI / 2);
  return { left: atten * Math.cos(t), right: atten * Math.sin(t) };
}

// Once per frame: re-pan the playing positioned voice from its stored source.
export function repan(slot: VoiceSlot, listener: Listener): Pan | null {
  const v = slot.current();
  if (!v || !v.source) return null;
  return panFor(listener, v.source());
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/sm016-wolf3d-voice.ts`) exits 0.

## 5. Lands in

- TARGET `src/fight/cues.ts` (the engine emits a cue event per hit, spell or death; the client maps it to a sound and runs the `VoiceSlot` gate and `repan`). The voice gate itself is client audio, so it does not touch the server.
- Parity-checklist row 12 (combat sound cues). The list hint said row 14, but row 14 is HUD; combat sound cues are row 12. No row covers music or ambience beds, so those are a gap, not a row.
- Reuse tag: rewrite-from-idea (restricted licence; clean-room only, no table or line copied)
- Brief rule served: 1 (one engine emits cues, clients choose the sound); rules 7-9 n/a

## 6. Gaps and risks

- Licence restricted: clean-room only. The sketch has no table and no donor line.
- Defect D1: equal priority replaces (`<` at 2148, 2169, 2185). A burst of the same hit restarts the clip each time, so the player hears only the last one. Fix: a per-cue cooldown (`cooldownMs`, in the sketch). Up to three attackers (MAX_ATTACKERS = 3) can land same-cue hits close together, so the cooldown is needed.
- Defect D2: a synth-path voice never keeps its position. The synth path ends with `return(false)` (2201), and `PlaySoundLocGlobal` stores the point only on true (174-176). So on PC or AdLib output a positioned cue never re-pans. Fix: store the source for every positioned voice (the sketch does).
- Defect D3 (possible, not verified): `x` is made non-negative before the table lookup (WL_GAME.C:142-143). If `x` is the lateral axis, left and right are not told apart for mirrored positions. The axis convention was not read. Fix: keep the signed lateral term (the sketch does), and test it.
- Defect D4: music is a hard cut. `StartMusic` stops the old song and starts the new one (WL_PLAY.C 1023-1041; ID_SD.C:2311). The only fade is on a mode change (1834). Fix (adapt): two tracks with a gain ramp at a zone border, with the crossfade time as zone data. Not in the sketch.
- Defect D5: the stored point is fixed at trigger time (WL_GAME.C:176), so a moving enemy's sound does not follow its body. Fix: pass a live getter (the sketch does), not a copied point.
- Frankendom rule: sound is client-only. The engine must not depend on the voice gate, and the gate must not decide hits.
- Priority values are not in the source. For Frankendom the priority table is zone or catalogue data, and the numbers are not copied.
- Not read: `PlaySoundLocActor` and `PlaySoundLocTile` bodies, `StartCPMusic`, the sound map header near WL_MAIN.C 872-935, the full pan table, and the AdLib synth code. Claims about those are cut.
- Stingers and ambience: the donor has one end-of-level song and no ambience layer. It does not show biome beds or crossfades, so the biome and crossfade parts of the topic come from other donors, not from this one.

Reuse tag: rewrite-from-idea (restricted licence; clean-room only)
Brief rule served: 1 (one engine, clients choose the sound); rules 7-9 n/a
