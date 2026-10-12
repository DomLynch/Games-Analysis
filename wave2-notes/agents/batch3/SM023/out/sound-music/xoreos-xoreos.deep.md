# xoreos-xoreos (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn/area.cpp` | Licence: GPL-3.0-or-later (source header lines 9-10: "either version 3" ... "any later version"; `COPYING` is GPL version 3) | C++ | symbol `Area::show`, `Area::playAmbientMusic`, `Area::playAmbientSound`, `Object::playSound`, `SoundManager::newChannel`

Checked: read by cited range: `engines/nwn/area.cpp` 171-192, 193-267, 340-367; `engines/nwn/object.cpp` 244-254; `engines/aurora/util.cpp` 83-115; `common/random.cpp` 36-44; `sound/sound.cpp` 140-143, 589-600, 668-684, 808-845, 924-931; `sound/sound.h` 199; `sound/xactsoundbank.cpp` 186-253; `sound/xactsoundbank.h` 100-110 and 372-462; `engines/jade/area.cpp` 120-175 and `area.h` 100-105; `engines/nwn/script/functions_sound.cpp` 38-83; `aurora/ssffile.h` (comment). Grep only, not read in full: `kotorbase/area.cpp` (same code as nwn), witcher and nwn2 area files (battle track write only), `sound/fmodeventfile.*`, `sound/xactsoundbank_ascii.cpp`, `sound/xactsoundbank_binary.cpp`, and the hinted `sound/wwisesoundbank.h/.cpp` (a bank container reader: lookup by id and index, no cue, priority or playback policy). Not read: the ARE/GIT parse that feeds `loadProperties` (only its call site), the 2DA rows (`ambientmusic`, `ambientsound` are not in the donor tree), the XACT wave bank decode, the OpenAL stream body. Camera scope: not a camera cell. Confidence: high on the area bed and the one-voice-per-object rule (read end to end); medium on the negatives (no hit or spell cue, no stinger playback, no priority, no voice cap), which come from grep over `src/` and `engines/`. Depth: thin, because the donor builds only a fragment of this topic.

Best transferable idea: give each zone a small data record (day bed, night bed, battle track, up to three stingers, a 0..127 bed volume) and crossfade beds on zone change, while a voice pool gives each enemy one voice and steals the weakest voice when the pool is capped.
Decision (proposed): adapt — keep the zone-bed record, the 0..127 curve and the one-voice-per-object rule; the donor's hard stop-then-start, its unplayed battle data and its unused priority are defects, fixed in the sketch.
Acceptance: a client test asserts `bedGain(127) = 1.0` and `bedGain(0) = 0`, that a forest-to-swamp zone change fades the old bed to zero over the fade time while the new bed rises, that a hit cue on enemy B never stops enemy A's voice, and that the first stinger plays once before the battle track when a fight starts.

## 1. Mechanism

- The unit is the area (Aurora's zone). `Area::show` (232) loads the tiles and objects, then calls `playAmbientSound()` and then `playAmbientMusic()` (255-256). `Area::hide` (261) calls `stopSound()` (267), which stops the music channel and then the sound channel (193-196). An area switch is therefore stop-then-start: no overlap and no fade.
- Bed sound: `playAmbientSound` (219-229) stops the current bed, takes the day resource when the argument is empty, and plays it looping on the SFX type at volume `_ambientDayVol` (229). The night resource is never chosen (TODO at 222).
- Bed music: `playAmbientMusic` (206-217) has the same shape on the Music type. An empty argument falls back to the day track (210-211). A script override reaches it through `Game::playMusic`, which calls `area->playAmbientMusic(music)` (`engines/nwn/game.cpp:132`). Day/night is a TODO (209).
- Bed data: `loadProperties` (340-367) reads `AmbientSndDay` and `AmbientSndNight` as row numbers of the `ambientsound` 2DA (345-349), clamps the two volumes to 0..127 (351-352), and converts with `1.25 * (1 - 5^(-v/127))` (354-355). The curve gives 127 -> 1.0 and 0 -> 0, and about 0.69 at 63 (hand arithmetic). `MusicDay`, `MusicNight` and `MusicBattle` are rows of the `ambientmusic` 2DA (362-367).
- Battle data: `setMusicBattleTrack` (171-192) stores `_musicBattle` and up to three stingers (`Stinger1`..`Stinger3`) in `_musicBattleStinger`. Nothing reads either. `getMusicBattleTrack` has no caller, and the `MusicBattlePlay`, `MusicBattleStop` and `MusicBattleChange` script rows are 0 (unimplemented) at `engines/nwn/script/function_tables.h` 566-568. KotOR (`kotorbase/area.cpp`) has the same code. In this donor the battle bed and the stingers are parsed and never played.
- Object voice: `Object::playSound` (248-253) first stops the object's own voice (244-246, called at 249), then plays on the Voice type with a pitch flag. Pitch is `1 + (r/5 - 0.1)` where `r` is an integer in [0, 1000] from the RNG, so pitch runs from 0.9 to 1.1 (`aurora/util.cpp:104`, `common/random.cpp:37`). The script passes an SSF sound-set slot (`functions_sound.cpp:43-51`, PlayVoiceChat). The SSF comment says slot meaning differs by game (`aurora/ssffile.h:45-49`). No engine code triggers a hit or spell cue on its own: a grep for hit or spell with sound in `engines/` found nothing.
- Mix: four buses (music, sfx, voice, video) take their gain from config (`sound/sound.cpp:140-143`). A channel's source gain is the channel gain times its bus gain (599, 681).
- Voice pool: `kChannelCount = 65535` (`sound/sound.h:199`). `newChannel` (831) takes the first empty slot by linear scan (834) and throws "All sound channels occupied" when the pool is full (839). `playSound` (`aurora/util.cpp:83-115`) catches the throw and returns no channel. There is no priority, no per-class cap and no steal. `update` (808-822) frees finished channels. The thread waits up to 100 ms or a signal between updates (924-931).
- Cue data: XACT `playCue` (208-219) picks the first variation whose weight range contains the integer state. Jade plays its area music that way: `playCue(0, _ambientMusicState, ...)` (`engines/jade/area.cpp:150`), with the state read from `MusicState` (170). `CombatMusicState` is read (171) and stored (`area.h:104`), and no code reads it.
- Parsed, not played: the XACT cue crossfade flag and in/out parameters (`xactsoundbank.h:457-462`), the interactive flag (459), transitions with fade times in ms (421-433), and sound priority with default 255 (397). The XACT binary reader reads the crossfade flag (`xactsoundbank_binary.cpp:176`). FMOD event priority and fade times are read (`fmodeventfile.cpp:213`, 268-269), but no engine builds an FMOD event. XACT playback warns on more than one track and plays only the first (`xactsoundbank.cpp:227`), and always plays `waves[0]` (237-239).

## 2. Key functions

- `Area::show` and `Area::hide`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn/area.cpp` 232-267 (start and stop of the bed).
- `Area::playAmbientMusic` and `Area::playAmbientSound`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn/area.cpp` 206-230 (stop, fallback, play at volume).
- `Area::loadProperties`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn/area.cpp` 340-367 (bed rows, 0..127 volumes, curve, music rows).
- `Area::setMusicBattleTrack`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn/area.cpp` 171-192 (battle track and stingers; never read).
- `Object::playSound`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn/object.cpp` 244-254 (stop previous voice, then play).
- `playSound` helper: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/aurora/util.cpp` 83-115 (pitch jitter; channel gain set to the passed volume before start).
- `SoundManager::newChannel`, `update`: `/mnt/frankendom-donors/xoreos-xoreos/src/sound/sound.cpp` 808-845 (linear pool, throw when full).
- `XACTSoundBank::playCue(Cue&, variation)`: `/mnt/frankendom-donors/xoreos-xoreos/src/sound/xactsoundbank.cpp` 208-219 (weight range pick).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Zone bed: stop the old bed, start the new one at a volume | Bed volume 0..127 per area (clamped, `area.cpp:351-352`); the donor has no fade time (hard stop) |
| Bed gain curve `1.25 * (1 - 5^(-v/127))`, 127 -> 1.0 | The 1.25 and the base 5 are the donor's (`area.cpp:354`); the curve is a numeric fact, re-expressed in our own code |
| Day/night pick with fallback to day when the night entry is empty | Day/night TODO at 209 and 222 (not built); fallback at 210-211 |
| Stinger list of up to three, one per battle | Three columns `Stinger1..3` (`area.cpp:182-184`); never played |
| One voice per object: stop the old voice first | No count; the rule is structural (`object.cpp:245`) |
| Pitch jitter band | r in [0,1000] gives pitch 0.9..1.1 (`aurora/util.cpp:104`, `random.cpp:37`) |
| Bus gain times channel gain | Bus default 1.0, from config (`sound.cpp:140-143`) |
| Pool with a total size | 65535 slots (`sound.h:199`); no per-class cap, no priority, no steal |
| Cue variation by weight range over the state | Weight maximum 10000 (`xactsoundbank.h:105`); first match wins |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's bed curve, the day fallback, the one-voice-per-object rule and the pitch band. It changes three things the donor leaves open: a bed switch is a crossfade in delta time (the donor stops and starts), the night entry is picked (the donor's TODO), and a stinger plays once at fight start before the battle track (the donor parses stingers and never plays them). It adds a voice pool with per-class caps and a priority steal, which the donor does not have. Omitted: file loading, OpenAL sources, the ARE/GIT parse, the 2DA lookups, XACT variation decode, and the stream threading. A switch that starts during a fade drops the older outgoing bed at once.

```ts
// Licence: GPL-3.0-or-later (donor, xoreos). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

/** Zone sound data (designer fields). Volume uses the donor's 0..127 scale. */
export interface ZoneSound {
  dayBed: string | null;
  nightBed: string | null;
  battleTrack: string | null;
  stingers: string[];   // donor table allows 3 (Stinger1..3)
  bedVolume127: number; // 0..127
}

/** Donor curve: 0 -> 0, 127 -> 1.0, and the middle of the slider reads louder than linear. */
export function bedGain(volume127: number): number {
  const v = Math.min(127, Math.max(0, volume127));
  return 1.25 * (1 - Math.pow(5, -(v / 127)));
}

export interface MusicState { inCombat: boolean; night: boolean; }

/** Which bed should be playing now. Night falls back to day, as the donor does for an empty track. */
export function pickBed(z: ZoneSound, s: MusicState): string | null {
  if (s.inCombat && z.battleTrack) return z.battleTrack;
  if (s.night && z.nightBed) return z.nightBed;
  return z.dayBed;
}

/** Stinger played once when combat starts, before the battle track. Our selection rule. */
export function stingerFor(z: ZoneSound, encounterNo: number): string | null {
  if (z.stingers.length === 0) return null;
  return z.stingers[encounterNo % z.stingers.length];
}

/** Bed crossfade driven by delta time (ms), never by frame count. */
export class BedCrossfader {
  private inId: string | null = null;
  private outId: string | null = null;
  private inTarget = 0;
  private outStart = 0;
  private t = 1;   // ms into the current fade
  private dur = 1; // fade length in ms

  get bedId(): string | null { return this.inId; }
  get fadingOutId(): string | null { return this.outId; }

  /** Zone enter or day/night change: fade the audible bed out and the new bed in. */
  switchTo(id: string | null, gain: number, fadeMs: number): void {
    if (id === this.inId && gain === this.inTarget) return;
    this.outStart = this.inLevel();
    this.outId = this.inId;
    this.inId = id;
    this.inTarget = gain;
    this.t = 0;
    this.dur = Math.max(1, fadeMs);
  }

  tick(dtMs: number): void {
    this.t = Math.min(this.dur, this.t + Math.max(0, dtMs));
  }

  outLevel(): number { return this.outStart * (1 - this.t / this.dur); }
  inLevel(): number { return this.inTarget * (this.t / this.dur); }
}

/** Donor: pitch = 1 + ((r / 1000) / 5 - 0.1), which is 1 + 0.2 * (r - 0.5) for r in [0, 1]. */
export function pitchJitter(r: number): number {
  return 1 + 0.2 * (r - 0.5);
}

/** Donor: the channel gain is multiplied by the bus (type) gain. */
export function effectiveGain(busGain: number, clipGain: number): number {
  return busGain * clipGain;
}

interface Voice { id: number; cls: string; emitter: number; priority: number; }

/** One-shot voices: per-emitter single voice, per-class caps, and priority steal. Donor has none of these. */
export class VoicePool {
  private voices: Voice[] = [];
  private nextId = 1;

  constructor(private readonly total: number, private readonly caps: Record<string, number>) {}

  get count(): number { return this.voices.length; }

  /** Returns a voice id, or null when refused. emitter 0 means not tied to one object. */
  play(cls: string, emitter: number, priority: number): number | null {
    // Donor Object::playSound stops the previous voice on the same object first.
    if (emitter !== 0) this.voices = this.voices.filter(v => v.emitter !== emitter);

    const cap = this.caps[cls] as number | undefined;
    const sameClass = this.voices.filter(v => v.cls === cls);
    if (cap !== undefined && sameClass.length >= cap && !this.steal(sameClass, priority)) return null;

    if (this.voices.length >= this.total && !this.steal(this.voices, priority)) return null;

    const id = this.nextId++;
    this.voices.push({ id, cls, emitter, priority });
    return id;
  }

  release(id: number): void {
    this.voices = this.voices.filter(v => v.id !== id);
  }

  /** Drop the lowest-priority voice in the pool if it is weaker than the new one. */
  private steal(pool: Voice[], priority: number): boolean {
    if (pool.length === 0) return false;
    let weakest = pool[0];
    for (const v of pool) if (v.priority < weakest.priority) weakest = v;
    if (weakest.priority >= priority) return false;
    const victim = weakest.id;
    this.voices = this.voices.filter(v => v.id !== victim);
    return true;
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (proposed name; the Frankendom repo was not read). Client-only: `BedCrossfader`, `VoicePool`, `pickBed`, `stingerFor`. Zone bed records (day, night, battle, stingers, volume) belong in zone data under `origins/<zone>` (proposed).
- Parity row 12 (combat sound cues). Note for Lead: the zone bed record has no row of its own; row 23 covers spawns and despawns, not music.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: sound is client-only (addendum: camera, HUD and sound are client-only); fold-in "sound-music = layering, stingers, ambience beds per biome and border crossfades". The layering part is not built in this donor.

## 6. Gaps and risks

- Licence is GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism; no donor lines are copied.
- Defects, each with the idea kept and the fix in the sketch:
  1. Area change is a hard stop then start (`area.cpp:193-196`, 219-229). fix: `BedCrossfader` fades the outgoing bed down and the incoming bed up over `fadeMs`, which is zone data.
  2. Day/night is a TODO (209, 222). fix: `pickBed` uses the night record and falls back to day, as the donor does (210-211).
  3. Battle track and stingers are stored and never played (178, 182-189). fix: `stingerFor` plays one stinger at fight start, then the battle bed. The donor has no order for stingers, so round-robin by encounter number is our rule.
  4. `CombatMusicState` is never read (`jade/area.cpp:171`). fix: `MusicState.inCombat` drives `pickBed`, from the engine's own fight state.
  5. No priority, no per-class cap, no steal (`sound.cpp:831-839`). fix: `VoicePool.play` with caps and a steal of the weakest voice. The donor's default priority of 255 is not used, so our scale (higher means more important) is a new choice.
  6. XACT layering is unsupported (`xactsoundbank.cpp:227`). Not adapted: the sketch has one bed per zone. Layered music would need several beds; flagged, not built.
- Rulings: one engine. Bed choice and the stinger come from zone data plus the engine's fight state, not from the Pit client. Server-verified kills: a hit cue plays from the server-confirmed hit event, never from a client guess. Zones as data: bed records live in zone data.
- MAX_ATTACKERS = 3: the per-class cap for hit voices can be set to 3. That is our choice; the donor has no cap.
- The per-object rule cuts an object's previous voice when a new one plays. In a fight a finisher voice could be cut by a hit cue on the same enemy; the priority steal only applies across the pool, so the finisher needs its own class (acceptance to test).
- Not verified: the perceived loudness of the bed curve, and the real 2DA rows (not in the donor tree). Crossfade times, caps and the jitter band must be tuned on a 375 px phone with sound on; the donor has no measured values.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: All 6+ checked claims hold: Area::show plays sound then music (255-256), hide->stopSound stops music then sound, playAmbientMusic/Sound stop-then-play with day fallback and the day/night TODOs, volume CLIP 0..127 and 1.25*(1-5^(-v/127)) curve (0.69 at 63 true), setMusicBattleTrack stores 3 stingers and nothing reads them (getMusicBattleTrack no caller; script rows 430-432 are 0 at function_tables.h 566-568; row 569 also 0), Object::playSound stops previous voice first, pitch 1+((r/1000)/5-0.1) with RNG.getNext(0,1001) giving 0.9..1.1, kChannelCount 65535, newChannel linear scan throws 'All sound channels occupied', type gain config 140-143, update frees finished channels and thread waits 100 ms, XACT playCue weight-range pick, playSound warns on >1 track and plays tracks[0], waves[0], kWeightMaximum 10000, priority default 255, Jade playCue(0,_ambientMusicState) and CombatMusicState stored never used, GPL header. Not-read list is honest.
Missed: NWN does implement script-driven day/night music switching (MusicBackgroundChangeDay/Night, GetDayTrack/GetNightTrack, function_tables.h 564-565 and 694-695), so 'day/night never chosen' is true only for the automatic area start, not for script control; a small nuance the note does not state.
