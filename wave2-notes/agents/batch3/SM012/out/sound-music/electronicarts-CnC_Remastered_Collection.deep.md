# electronicarts-CnC_Remastered_Collection (sound-music, cell 2)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/THEME.CPP` (with `THEME.H`, `AUDIO.CPP`, `DLLInterface.cpp`, `SOUNDDLG.CPP`) | Licence: GPL v3 "with permitted additional restrictions under Section 7" (file headers, e.g. THEME.CPP line 7; `LICENSE.md` lines 1-3: EA released the DLLs and source "under the GPL V3 below, with additional terms at the bottom"; the additional terms at line 601 forbid use of EA trademarks, forbid misrepresenting origin, and require indemnity for assumed liability) | C++ | symbol `ThemeClass::Queue_Song`

Checked: read `THEME.CPP` in full for the music director: `Next_Song` (228-257), `Queue_Song` (280-288), `Play_Song` (307-330), `Track_Length` (383-389), `Stop` (407-416), `Still_Playing` (434-438), `Is_Allowed` (459-475), `AI` (187-205), the track table (57-96). Read `THEME.H` (the class and the `THEME_DELAY` enum). Read `AUDIO.CPP` 59-130 (stub driver and effect-name table head), 255-300 (`Sound_Effect` host forward), 299-337 (`#if (0)` distance fade, disabled), 336-420 (live `Sound_Effect` and priority), 521-560 (`Speak`), 600-636 (`Stop_Speaking`, `Is_Speaking`). Outline only: `SCORE.CPP` (it is the end-of-mission score screen, not music; `ScoresPresent` is set in INIT.CPP 479 and 541), `DLLInterface.cpp` 392-446 and 2084-2100 (host hooks). Grep only: `CONQUER.CPP` 1140 (`Theme.AI()` in the main loop), `INIT.CPP` (`Theme.Queue_Song` and `Fade_Out` call sites), `SOUNDDLG.CPP` 245 (duration shown in the sound options). Not read: `Theme_File_Name`, `Full_Name`, `From_Name`, `Scan`, `Sim_IRandom` (RAND.CPP:104, body not read), `AUDIO.CPP` 130-255 (table body) and 420-520 (speech table), `DLLInterface` 2100-2140. Checked the layering, stinger, biome and crossfade topics across TIBERIANDAWN and REDALERT: 10 grep hits, all unrelated (a missile name, OLE ambient properties, a comment); no ambience-bed or stinger code exists here. Confidence: high on the queue, pick and stop logic; medium on the fade timing, because `Fade_Sample` and `Sample_Status` are empty stubs in this donor (`AUDIO.CPP` 70 and 77), so the playback half that makes the crossfade audible is not in the box. camera_scope: n/a (sound).

## 1. Mechanism

One streamed music track at a time, driven by a single pending slot.

- `Queue_Song(theme)` (280-288): if nothing is pending (`Pending` is NONE or PICK_ANOTHER) and the score option is on, store the request in `Pending` and fade the current sample with `THEME_DELAY` (286). `THEME_DELAY` is `TIMER_SECOND` (THEME.H 61; DEFINES.H 2149 gives 60). A request made while another one is pending is dropped (282; see defect D1). `Fade_Out()` is a request for THEME_NONE (THEME.H 77).
- `AI()` (187-205), called once per main-loop pass (CONQUER.CPP 1140): when the current sample has stopped (`!Still_Playing()`, 190) and `Pending` is not NONE, it resolves PICK_ANOTHER to the next track (`Next_Song(Score)`, 196), starts it with `Play_Song` (203), and re-arms the slot to PICK_ANOTHER (204). So a track that ends picks its own successor. The new track starts only after the old one has stopped, so the handover is fade-out then start, not a mixed crossfade.
- `Play_Song` (307-330) first calls `Stop()`, which cuts the current sample at once (its own header says so). It then starts the file with `File_Stream_Sample_Vol` and records the theme as `Score`.
- `Next_Song` (228-257): a request for a specific track that is not a repeat track (and the option IsScoreRepeat is off) moves on. For shuffle (234), it draws a random theme between FIRST and LAST with the simulation RNG (`Sim_Random_Pick`, 242) until it is not the current track and is allowed (243). For sequential play (251-256), it steps forward with wrap-around until a track is allowed. A repeat track (the flag) returns itself (233), so WIN1, MAP1 and VALKYRIE loop.
- `Is_Allowed` (459-475): available, and either flagged for normal play, or (in a variation) the variation flag is set and the scenario is reached. JURASSIC-only track (J1) needs the mode flag.
- `Stop()` (407-416) stops the sample and resets `Score` and `Pending` to NONE (413-414).
- `Still_Playing()` (434-438) returns the driver's status for the current handle (437). Here that is always 0 (see the stub note).

Track table (THEME.CPP 57-96): 37 active rows (58-95; one more row, J1, is commented out at line 69). Each row has the file base name, a text id for the full name, a scenario number (the mission at which the track first becomes available, 0 to 13), a duration in seconds (41 for WIN1, 306 for VALKYRIE and VOIC226M), and four flags: normal play, variation, repeat, available. Three rows (WIN1 at 93, MAP1 at 94, VALKYRIE at 95) carry the repeat flag. Duration is used only by the sound options screen (SOUNDDLG.CPP 245; the only caller of Track_Length in TIBERIANDAWN), not by the director.

Sound effects (AUDIO.CPP): a table of 110 active rows (14 more are commented out), each with a file base name, a priority (10 for the dino rows, 20 for the Commando voice lines, for example 255 and 117), and a context: no variation, juvenile alternate, or infantry variation (`IN_NOVAR`, `IN_JUV`, `IN_VAR`). The live `Sound_Effect(voc, coord, variation)` (292-298) forwards the request to the host hook `On_Sound_Effect` (297) and does nothing else. The second `Sound_Effect` (360-405) picks the extension (`.AUD`, `.JUV`, or `.V00`/`.V02` for odd/even negative variation, `.V01`/`.V03` for positive), looks the file up, and calls `Play_Sample` with the table priority scaled by the volume (403). `Play_Sample` is a stub that returns 1 (AUDIO.CPP 73), so no voice pool exists in this donor. The distance and pan logic (299-337) is inside `#if (0)`, so it is not built: off-screen sounds would be quieter with distance (halved, floor 25) and panned by the horizontal offset from the view.

Speech (AUDIO.CPP 521-560, 605-636): `Speak` forwards to the host (`On_Speech`, `On_Ping`). The speech queue is inside `#if (0)` (538-542). `Stop_Speaking` clears the queue and stops the speech buffer; `Is_Speaking` reports the queue or the buffer.

Not found in this donor: layered music stems, stingers, ambience beds per biome, border crossfades, a voice limit or per-sample concurrency rule (the driver is a stub).

## 2. Key functions

- `ThemeClass::Queue_Song`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/THEME.CPP` 280-288 (pending slot, fade request).
- `ThemeClass::AI`: same file, 187-205 (wait for stop, pick, start, re-arm).
- `ThemeClass::Next_Song`: same file, 228-257 (repeat flag, shuffle without repeats, sequential wrap; both loops at 243 and 256).
- `ThemeClass::Play_Song`: same file, 307-330 (cut, then stream the file).
- `ThemeClass::Is_Allowed`: same file, 459-475 (availability, normal and variation rules).
- `ThemeClass::Stop` and `Still_Playing`: same file, 407-416 and 434-438.
- Track table: same file, 57-96. Flags and durations in `THEME.H` 48-55.
- `Sound_Effect` (live forward and priority): `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/AUDIO.CPP` 292-298 and 360-405.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants (theirs) |
|---|---|
| Fade the old track for a fixed time, start the new one after it stops | THEME_DELAY = TIMER_SECOND = 60 ticks (THEME.H 61; DEFINES.H 2149) |
| One pending slot; newest request wins (intended), first request wins (as coded) | Guard at THEME.CPP 282 |
| Repeat flag keeps a track looping | WIN1 41 s, MAP1 61 s, VALKYRIE 306 s (THEME.CPP 93-95) |
| Shuffle never plays the same track twice in a row | Draw from FIRST..LAST (THEME.CPP 242-243) |
| Track availability by scenario number | 0 to 13 per track (scenario column, e.g. RAIN 7 at THEME.CPP 72) |
| Effect priority scaled by loudness | Table values 10 and 20 (AUDIO.CPP 255, 117); scaling via Fixed_To_Cardinal (definition not read) (AUDIO.CPP 403) |
| Stop resets the score and pending slot | None (the reset at 413-414) |

## 4. TypeScript sketch

simplified: the sketch keeps the pending slot, the wait for the old track to stop, the shuffle that never repeats a track when another is allowed, the sequential wrap, the repeat flag and the stop reset. It changes three things on purpose: the newest request replaces the pending one even during a fade (the donor drops it, THEME.CPP 282); an empty or single-track pick returns NONE instead of looping forever (the donor's do-while loops at 243 and 256 never exit when nothing is allowed); and `update()` is a per-tick poll on an injected backend, not the donor's Sample_Status poll (the donor's status and fade are stubs here). It omits the scenario and mode details inside Is_Allowed (passed in as `allowed`), the DEMO build, the `.VAR` variation files, the file lookup, the Full_Name text and the speech queue.

```ts
// Licence: GPL-3.0 with Electronic Arts additional terms under GPL section 7 (donor LICENSE.md). Clean-room sketch written from the described mechanism, not a translation of the donor.
// clean-room
export const NONE = -1; // no track
export const PICK_ANOTHER = -2; // choose the next track when the current one ends

export interface TrackInfo {
  name: string;
  repeat: boolean; // loop this track instead of moving on
}

export interface AudioBackend {
  isPlaying(): boolean; // donor: Sample_Status (a stub in this donor)
  start(name: string): void; // donor: File_Stream_Sample_Vol
  fadeOut(ms: number): void; // donor: Fade_Sample (a stub in this donor)
  stop(): void; // donor: Stop_Sample
}

export interface DirectorOptions {
  rng: () => number; // donor: Sim_Random_Pick (the simulation's own RNG), returns [0, 1)
  allowed: (track: number) => boolean; // donor: Is_Allowed (flags, scenario, mode)
  shuffle: boolean; // donor: Options.IsScoreShuffle
  repeatAll: boolean; // donor: Options.IsScoreRepeat
  fadeMs: number; // donor: THEME_DELAY = TIMER_SECOND = 60 ticks
}

export class MusicDirector {
  private current: number = NONE;
  private pending: number = NONE;
  private fading = false;

  constructor(
    private readonly tracks: TrackInfo[],
    private readonly audio: AudioBackend,
    private readonly opts: DirectorOptions,
  ) {}

  // simplified: this follows the donor's pending-slot order, with three intended differences.
  // (1) the newest request replaces the pending one even while a fade is running (donor: the
  // request is dropped unless Pending is NONE or PICK_ANOTHER, THEME.CPP 282);
  // (2) an empty or single-track pick returns NONE instead of looping forever (donor: the
  // do-while loops at THEME.CPP 243 and 256);
  // (3) update() is a per-tick poll with the audio backend passed in, not the donor's Sample_Status poll.
  // It omits the scenario and mode checks inside Is_Allowed (passed in as allowed()), the DEMO
  // build, the .VAR variation files, and the file lookup.
  request(track: number): void {
    this.pending = track;
    if (this.current !== NONE && !this.fading) {
      this.audio.fadeOut(this.opts.fadeMs);
      this.fading = true;
    }
  }

  // Call once per tick. A pending track starts only when the old one has stopped.
  update(): void {
    if (this.pending === NONE) return;
    if (this.current !== NONE && this.audio.isPlaying()) return;
    let next = this.pending;
    if (next === PICK_ANOTHER) next = this.pickFrom(this.current);
    if (next === NONE) {
      this.pending = NONE;
      this.current = NONE;
      this.fading = false;
      return;
    }
    this.audio.start(this.tracks[next].name);
    this.current = next;
    this.pending = PICK_ANOTHER; // when this one ends, pick the next
    this.fading = false;
  }

  stop(): void {
    this.audio.stop();
    this.current = NONE;
    this.pending = NONE;
    this.fading = false;
  }

  private pickFrom(current: number): number {
    const n = this.tracks.length;
    if (current !== NONE && (this.tracks[current].repeat || this.opts.repeatAll)) {
      return this.opts.allowed(current) ? current : NONE;
    }
    if (this.opts.shuffle) {
      const ok: number[] = [];
      for (let i = 0; i < n; i++) {
        if (this.opts.allowed(i)) ok.push(i);
      }
      if (ok.length === 0) return NONE; // donor would loop forever here
      const others = ok.filter((i) => i !== current);
      const pool = others.length > 0 ? others : ok; // never the same track twice if another exists
      return pool[Math.floor(this.opts.rng() * pool.length)];
    }
    const start = current < 0 ? -1 : current;
    for (let step = 1; step <= n; step++) {
      const cand = (start + step) % n;
      if (this.opts.allowed(cand)) return cand;
    }
    return NONE; // nothing allowed
  }
}

export {};
```

Typecheck: copied to the VPS as `/tmp/cnc-music-director.ts` and run `npx -p typescript tsc --noEmit --strict --target es2020` there: exit 0.

## 5. Lands in

- TARGET `src/fight/music-director.ts` (new, client only): the pending slot, fade-then-start, the no-repeat pick and the per-zone track flags. Zones and the boss or explore state decide what is requested; the director only plays it.
- Parity-checklist row 12 (combat sound cues). Music is not a combat cue, so this is the nearest row; the director sits beside the cue layer and shares its client audio backend.
- Reuse tag: rewrite-from-idea (GPL-3.0 with EA additional terms; clean-room only, shape not code; do not reuse EA names or trademarks)
- Brief rule served: 1 (one engine, two clients: the engine says which track is wanted, the client plays it); 8 (target and parity row named)

## 6. Gaps and risks

- Client only. The track choice must never feed the simulation. The donor picks shuffled tracks with the simulation RNG (`Sim_Random_Pick`, THEME.CPP 242; `Sim_IRandom` in RAND.CPP 104, body not read). That is a desync risk in a multiplayer game if one client has the music option on and another does not, because the draws differ. Frankendom must use a separate client RNG for music.
- Defect D1 (dropped request, THEME.CPP 282): a request made during the one-second fade is ignored, so the zone change the player sees is lost. Fix: the newest request replaces the pending track (in the sketch).
- Defect D2 (no exit from the picker, THEME.CPP 243 and 256): when no track is allowed, or the only allowed track is the current one in shuffle, the loop never ends. Fix: count the allowed tracks first and return NONE (in the sketch).
- Defect D3 (fade timing unverified): the fade is a request to a driver that is a stub in this donor, and the start waits on a status poll. Fix: a timed crossfade driven by the engine's tick, with the fade length as zone data (the sketch shows the hook; the timed gain is not written).
- The donor's handover is fade-out then start, not a mixed crossfade. Frankendom should only promise the first, unless it builds two gains.
- Zones as data: the track flags (normal, repeat, variation, scenario) and fade length belong in zone data. The donor's scenario column is campaign progress, which maps to a zone or mission number in Frankendom.
- The table is global, not per zone. Frankendom needs a per-zone track id plus the fade length, not a copy of this table.
- No layering, stingers, biome beds or border crossfades exist in this donor. Do not present them as coming from it.
- GPL-3.0 with EA additional terms (no trademark use, no misrepresenting origin, indemnity). Clean-room only; do not copy file names or text ids.
- Not read: `Theme_File_Name`, `From_Name`, `Scan`, `Sim_IRandom`, `AUDIO.CPP` 130-255 and 420-520, and `DLLInterface` 2100-2140. The driver behind `File_Stream_Sample_Vol`, `Sample_Status` and `Fade_Sample` is not in the donor.

Best transferable idea: a music director with one pending slot, where a new request fades out the current track and the new one starts only after the old one stops, and the next track is picked from allowed tracks with a no-repeat shuffle and a per-track repeat flag.
Decision (proposed): adapt - take the pending-slot director and the per-track flags, fix D1 (the newest request wins) and D2 (the picker returns NONE instead of looping), and replace the unverified status-poll fade with a timed fade whose length is zone data.
Acceptance: walking from explore music into a boss zone plays the explore track fading out over the zone's fade length, and the boss track starts when that fade ends; a second zone change during the fade replaces the pending track, so the last zone's track plays; a unit test asserts that the picker returns NONE and does not hang when zero or one track is allowed.

Reuse tag: rewrite-from-idea (GPL-3.0 with EA additional terms; clean-room only)
Brief rule served: 1 (one engine, two clients); 8 (target and parity row named)
