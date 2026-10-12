# Anuken-Mindustry (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/audio/SoundControl.java` | Licence: GPL-3.0 (repo `LICENSE` is GNU GPL version 3, 29 June 2007; per-file headers not read) | Java | symbol `SoundControl` (the ambient aggregator is `updateLoops` and the inner `AudioThread`; the priority table is `SoundPriority`)

Checked: Read `SoundControl.java` at 21-70 (fields, wave trigger), 119-190 (per-frame update and track choice), 194-262 (playMusic, playRandom, dark choice, volume), 263-340 (play, playOnce, silence), 355-470 (loop calls and updateLoops), 471-585 (SoundData, AudioThread). Not read: 72-118 (reset, stop, setupFilters, reload), 340-355 (findMusic), the enclosing function of `Control.java` 688 (only the call site was seen). Read end to end: `SoundPriority.java` (115 lines), `SoundLoop.java` (56 lines), `AmbientSource.java`, `MusicContainer.java`. Call sites by grep: `BuildingComp.java` 132 (buildings register as ambient sources), `UnitComp.java` 762-766 (moving units loop a sound per unit). Not in the donor: the `arc` library (no `arc` folder in the box), so `Sound.setPriority`, `setMaxConcurrent`, `calcFalloff`, `calcPan`, `lerpDelta`, `Core.audio.loop/set/stop` were not read; `Mathf.chance` and `Time.toMinutes` not read. Confidence: high on the aggregation and music-scheduling logic (read directly); high on the defect in the music roll (direct reading of three lines); medium on the two "possible" defects in section 6, which depend on `arc` semantics not in the donor. camera_scope: not applicable (sound topic).

Best transferable idea: Many sources that share one sound become one looping voice per sound name: each source adds its falloff-weighted volume, the sum is clamped to one, the pan comes from the weighted centroid, and the voice eases toward its target and starts or stops on thresholds.
Decision (proposed): adapt - take the one-voice-per-sound aggregate for ambient zone beds (fires, water, a crowd, a camp), not for combat hits, which must stay one cue per server-verified hit; the sketch fixes the pause carry-over.
Acceptance: Forty ambient fires in one zone play one looping voice whose volume never exceeds full and whose pan points at the weighted centroid of the fires; a unit test asserts exactly one start command for that sound name, and that the eased volume settles at 1.0 and stays there while the fires remain.

## 1. Mechanism

- Sources register. A building is an ambient source (`BuildingComp.java` 132). `addAmbientSource` starts a daemon `AudioThread` on first use and queues later sources (386-404).
- Two producers feed one table. Direct sound loops (`loop(sound, pos, volume, pitch)`, 355-371) and the audio thread both add into a per-sound `SoundData`, keyed by the sound object. Moving units call the direct path (`UnitComp.java` 762-766).
- The aggregate (`static void loop`, 373-383). For each call: `baseVol = sound.calcFalloff(x, y)` (374), `vol = baseVol * volume` (375). `data.volume += vol` (377), `data.pitch += pitch * vol` (378), `data.volume` is clamped to [0, 1] after each add (379), `data.total += baseVol` (380), `data.totalVolume += vol` (381), `sumX += x * baseVol` and `sumY` likewise (382-383). So the summed volume saturates at one, while the pan and pitch are weighted averages.
- Per frame (`updateLoops`, 410-438). Stop early in the menu (412-415). Return early when paused (417), without clearing the sums. Ease the voice toward target: `curVolume = lerpDelta(curVolume, volume * ambientvol, 0.11)` (422). A loop is wanted when `curVolume > 0.01` (424). Pan is `calcPan` of the centroid (425); pitch is the volume-weighted mean (426). If no instance is playing, a loop starts when wanted (427-431). If one is playing and `curVolume <= 0.001`, the voice is stopped and its id cleared (433-435). Otherwise pan and volume are set on the live voice (438), with pitch set when it is not 1 (439-441). The sums are then cleared (444-449).
- Pull from the thread (453-462). The main thread copies the thread's output into the same table, for sounds the thread reported this pass. The next frame's `updateLoops` processes those values together with the frame's direct calls.
- Audio thread (`AudioThread`, 490-585). Runs at 20 passes per second (491-492). Each pass: copy queued sources into the list (506-512); for each valid source that `shouldAmbientSound()` (518) with volume above 0.00001 (519-520), add it to the per-sound sums (528) and mark the sound active the first time it becomes non-zero (529-531); remove invalid sources by swap (536-538); clone the active sums into the output under a lock (548); reset the sums (552-559). The run loop stops in the menu (569) and sleeps for the rest of its 50 ms slot (577).
- Music. Wave trigger (`SoundControl` 56-63): after each `WaveEvent`, a delay of 8 to 15 s (`Mathf.random(8f, 15f) * 60f` ticks at 60 ticks per second, assumed), then boss music once if a boss group of the wave offset spawned (59, 62), otherwise a 0.46 chance to pick a track (63).
- Music choice (`playRandom`, 214-222). Boss pool if a boss is alive; else the dark pool if `isDark()`; else the ambient pool. `getAmbientMusic`, `getDarkMusic` and `getBossMusic` (228-241) prefer the rules' pools, then the planet's, then the defaults (94-96). Donor defect: `getBossMusic` (228-231) reads `state.rules.darkMusic` and `planet.darkMusic`, a copy-paste slip; only the final fallback is the boss pool. Fix: read the boss fields.
- Dark choice (`isDark`, 244-256). Dark if the player's core is below 85 percent health (244-248, not receipted), or by a wave-based chance (251: `(log10((wave - 17) / 19) + 1) / 4`), or by an enemy-count chance (256: `enemies / 70 + 0.1`).
- Track scheduling (`update`, 172-180). Outside the menu and editor, and when music is not disabled: if music is not set to always play, a track is rolled when `timeSinceMillis(lastPlayed) > 1000 * musicInterval / 60` (177, with `musicInterval = 3 * Time.toMinutes`, 23). The roll uses `musicChance` = 0.8 (179). `lastPlayed` is set only when the roll succeeds (180).
- Crossfade (`play`, 265-314). Fade-out and fade-in both move by frame delta over 120 ticks (294, 297, `finTime` and `foutTime` at 23). The old track fades to near zero (299), then stops, and the new track starts at zero volume and fades in. This is a dip through silence, not an overlap.
- One-shot tracks (`playOnce`, 317-329). Does nothing while a track plays (318). A one-shot starts at full volume with no fade-in (326).
- Per-object loops (`SoundLoop.java`). A loop fades by 0.05 per tick in and out (10, 35, 37). It starts silent and fades in (30), stops at or below 0.001 (38).
- Priority table (`SoundPriority.java`). Priority 3 for launch and core sounds (20-23), 2 for long weapon loops and large explosions (26-37), 1.5 for big weapon sounds (40-57), 1 for ambient loops (59-71), -1 for repair (94), -2 for footsteps (96-97). Maximum concurrent counts: lancer 5 (74), shield hit 4 (89), mech and walker steps 5 (91), and a shared max of 7 over beam plasma, shoot meltdown and beam meltdown (`SoundPriority.java` 18). Concurrency groups share one id (107-110; used at 76-78). Minimum interrupt fractions are set for every loaded sound to 0.25 and 0.5 (81), and for mech steps to 0.5 and 0.6 (84-87).

## 2. Key functions

- `loop(data, sound, pos, volume, pitch)` (static): `SoundControl.java` 373-383. The aggregate that every source goes through.
- `updateLoops`: `SoundControl.java` 410-462. Eased volume, start and stop thresholds, centroid pan, weighted pitch, pull from the thread.
- `AudioThread.doLoop`: `SoundControl.java` 505-560. Source list, falloff sums, output copy at 20 passes per second.
- `update`: `SoundControl.java` 119-188. Track roll and interval; calls `updateLoops` at line 187 (line 69 is in the constructor). `Control.java` 688 calls `sound.update()`; the enclosing function and its frequency were not read.
- `play` and `playOnce`: `SoundControl.java` 265-329. Dip-through-silence fade and one-shot start.
- `SoundPriority.init`: `SoundPriority.java` 14-101. The policy table; enforcement is not in the donor.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Per-sound summed volume, saturating at one | Clamp to [0, 1] after each add (`SoundControl.java` 379) |
| Pan from the falloff-weighted centroid | Falloff as the weight (374, 382-383); pan via `calcPan` (425, not read) |
| Pitch as a volume-weighted mean | Weighted by `vol` (378, 426) |
| Ease toward target per frame | 0.11 per frame, `lerpDelta` (422; the Arc definition not read) |
| Start and stop thresholds | Start above 0.01 (424), stop at or below 0.001 (433) |
| Audio thread rate | 20 passes per second (491) |
| Per-object loop fade | 0.05 per tick (`SoundLoop.java` 10) |
| Crossfade between tracks | Fade out and in over 120 ticks each (23), a dip, not an overlap |
| Music roll interval | 3 minutes (23, assuming 3600 ticks per minute; `Time.toMinutes` not read) |
| Music roll chance | 0.8 for tracks (23), 0.46 for wave music (23) |
| Dark chance from core health | Below 0.85 (244-248) |
| Dark chance from wave | Log term, `(log10((wave - 17)/19) + 1) / 4` (251) |
| Dark chance from enemies | `enemies / 70 + 0.1` (256) |
| Priority levels | 3, 2, 1.5, 1, -1, -2 (`SoundPriority.java` 20-97) |
| Max concurrent | Lancer 5 (74), shield hit 4 (89), mech and walker steps 5 (91), beam/meltdown group 7 (18) |

## 4. TypeScript sketch

simplified: the sketch keeps the aggregate (falloff-weighted sums, volume clamped at one, centroid pan, volume-weighted pitch), the eased voice with start and stop thresholds, and per-frame start, set and stop commands. It omits the Arc audio API (`loop`, `set`, `stop`, `isPlaying`, `protect`), the falloff and pan functions (`calcFalloff`, `calcPan`, not read), the audio thread (20 passes per second, the queue, the output clone and lock), the menu and headless guards, the ambient volume setting, the `soundID` bookkeeping, and the music scheduling. It changes three things on purpose. The ease uses a frame-time form, `1 - (1 - 0.11)^dt`, instead of `lerpDelta` at a fixed 0.11 per frame, so 60 Hz and 144 Hz behave alike. A pause drops this frame's sums instead of carrying them into the next frame (the donor returns at 417 and keeps them). Stop is emitted as a command with the voice name, so the caller never stops a whole sound object. The panScale of 20 is a sketch choice, not a donor value.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Source {
  sound: string;   // which loop this source feeds
  x: number;
  y: number;
  volume: number;  // the source's own ambient volume
  falloff: number; // distance gain supplied by the caller (the donor uses the engine's falloff, not read)
  pitch: number;
}

export type Cmd = {
  sound: string;
  action: "start" | "set" | "stop";
  volume: number;
  pan: number;
  pitch: number;
};

interface Acc {
  volume: number;   // summed gain, clamped to one at frame end
  pitchSum: number;
  volSum: number;
  weight: number;   // falloff sum, for the centroid
  wx: number;
  wy: number;
}

interface Voice {
  cur: number;
  playing: boolean;
  pan: number;
  pitch: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class AmbientMix {
  private acc = new Map<string, Acc>();
  private voices = new Map<string, Voice>();
  private lx = 0;
  private ly = 0;

  constructor(
    private readonly ease = 0.11,       // per frame at 60 Hz
    private readonly startAt = 0.01,    // a loop starts above this
    private readonly stopAt = 0.001,    // and stops at or below this
    private readonly panScale = 20,     // sketch choice: distance that reaches full pan
  ) {}

  setListener(x: number, y: number): void {
    this.lx = x;
    this.ly = y;
  }

  // One contributing source this frame.
  add(s: Source): void {
    if (s.volume <= 0 || s.falloff <= 0) return;
    const gain = s.falloff * s.volume;
    let a = this.acc.get(s.sound);
    if (!a) {
      a = { volume: 0, pitchSum: 0, volSum: 0, weight: 0, wx: 0, wy: 0 };
      this.acc.set(s.sound, a);
    }
    a.volume += gain;
    a.pitchSum += s.pitch * gain;
    a.volSum += gain;
    a.weight += s.falloff;
    a.wx += s.x * s.falloff;
    a.wy += s.y * s.falloff;
  }

  // Once per frame. dtFrames is frame time in 60 Hz frames, so the ease is frame-rate independent.
  frame(dtFrames: number, paused: boolean): Cmd[] {
    // Fix: a pause drops this frame's sums instead of carrying them into the first frame after resume.
    if (paused) {
      this.acc.clear();
      return [];
    }
    const alpha = 1 - Math.pow(1 - this.ease, dtFrames);
    const out: Cmd[] = [];
    const names = new Set<string>([...this.acc.keys(), ...this.voices.keys()]);

    for (const name of names) {
      const a = this.acc.get(name);
      const v = this.voices.get(name) ?? { cur: 0, playing: false, pan: 0, pitch: 1 };
      const target = a ? Math.min(1, a.volume) : 0;
      v.cur += (target - v.cur) * alpha;
      if (a && a.weight > 0) v.pan = clamp((a.wx / a.weight - this.lx) / this.panScale, -1, 1);
      if (a && a.volSum > 0) v.pitch = a.pitchSum / a.volSum;
      this.voices.set(name, v);

      if (!v.playing && v.cur > this.startAt) {
        v.playing = true;
        out.push({ sound: name, action: "start", volume: v.cur, pan: v.pan, pitch: v.pitch });
      } else if (v.playing && v.cur <= this.stopAt) {
        v.playing = false;
        out.push({ sound: name, action: "stop", volume: 0, pan: v.pan, pitch: v.pitch });
      } else if (v.playing) {
        out.push({ sound: name, action: "set", volume: v.cur, pan: v.pan, pitch: v.pitch });
      }
    }
    this.acc.clear();
    return out;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/sm-cell15-mindustry-ambient-mix.ts`, exit 0.

## 5. Lands in

- TARGET `origins/client/ambience-mix.ts` (new, client-only; the zone's ambient sources are data, the client mixes them into one voice per sound). The addendum's checklist has no ambience row; the nearest sound row is parity-checklist row 12 (combat sound cues), so row 12 is cited, with this caveat stated here.
- The priority table, if adopted later, belongs with the combat cues (row 12), not here.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room only)
- Brief rule served: ruling "camera/HUD/sound are client-only" (the engine emits the zone's ambient sources as data; the client mixes them); ruling "zones are data" (the source list and the pools are zone data); licence rule (clean-room).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism and reproduces no donor line.
- Defect, music roll (`SoundControl.java` 177-180): `lastPlayed` is set only when the roll succeeds. When the roll fails, the check runs again on the next frame, so the 0.8 chance is effectively a one-frame delay after the interval. `musicChance` does not do what its comment says ("chance to play it per interval"). Fix: stamp `lastPlayed` on every roll, not only on success.
- Possible defect, stale index in the audio thread (`SoundControl.java` 506-507, 511-512, 536): `items` and `size` are captured before queued sources are added. If the list grows during the add, `items` points at the old array while `remove(i)` edits the new one, so the swap can remove a different source. Whether this bites depends on `arc`'s `Seq` growth, which is not in the donor. Fix: drain the queue before capturing `items` and `size`.
- Possible defect, pause carry-over (`SoundControl.java` 417): `updateLoops` returns early when paused and keeps the sums. Any direct `loop()` call made during a pause is read on resume. Whether any call happens during a pause was not checked. Fix: drop the sums while paused (sketch).
- Possible issue, whole-sound stop (`SoundControl.java` 434): the stop path calls `sound.stop()` on the sound object, not on the stored voice id (line not receipted; the quote is short). Whether that silences other instances of the same sound depends on `arc`, not read. Fix: stop by voice id.
- Pause muffle: `update()` fades a lowpass filter on the sound bus whenever the game is paused or a dialog is open (`SoundControl.java` 129-132, wet 1 when paused else 0, over 0.4 s, polled every 30 ticks). A cheap rule worth taking for our pause and menu states.
- Gap, priority and voice limits: the donor has a policy table (`SoundPriority.java`) but no enforcement in this box. `setPriority`, `setMaxConcurrent`, `setConcurrentGroup` and `setMinConcurrentInterruptFraction` are `arc` calls. Frankendom needs its own cap on concurrent combat cues (the hero's cues first); the table shows the shape, not the behaviour.
- Gap, crossfades: music fades to zero, then starts at zero volume (`SoundControl.java` 294-307). Frankendom's zone-border crossfade needs overlap; this donor does not show it.
- Gap, biome beds: no per-biome ambient bed. The ambient music pool is chosen per rules or planet (233-236), which is the nearest analogue; there is no ambient loop bed per zone.
- Gap, layering: one music track at a time; no stingers beyond the boss pool and one-shot start. Layered stingers are not in this donor.
- Unverified wave index: `group.getSpawned(state.wave - 2)` (59) uses an offset of 2 that was not checked against how `state.wave` is advanced. Do not copy the offset without a test.
- Dark chance from wave (251): the log term is undefined for waves below 17 (log of a negative number). The donor's `Mathf.chance` (not read) presumably treats NaN as false; this was not confirmed.
- Not read: `Mathf.chance`, `Time.toMinutes`, the `arc` audio classes, `calcFalloff` and `calcPan`, the reset and stop paths (72-118), `findMusic` (340-355).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Key functions said `update()` calls `updateLoops` at line 69; the call is at 187 (line 69 is the constructor). Confirmed.
- Section 1 said all three music getters follow the same order; `getBossMusic` (228-231) reads the darkMusic fields (copy-paste bug), only the fallback is bossMusic. Confirmed.
- Missed (confirmed): pause lowpass filter on the sound bus (`SoundControl.java` 129-132).
- Missed (confirmed): `max(7, beamPlasma, shootMeltdown, beamMeltdown)` at `SoundPriority.java` 18 was absent from the max-concurrent list.

Fixed 2026-10-12: update() call line, getBossMusic defect, pause muffle line, max-concurrent entry. Sketch unchanged.
