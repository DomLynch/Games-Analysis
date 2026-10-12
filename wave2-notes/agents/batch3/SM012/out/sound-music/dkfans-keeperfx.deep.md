# dkfans-keeperfx (sound-music, cell 1)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/bflib_sound.c` (with `src/bflib_sndlib.cpp`, `src/sounds.c`, `src/config_sounds.c`) | Licence: GNU GPL v2 (`LICENSE` file, line 2: "Version 2, June 1991"; the donor's `sound_manager.h` is a thin wrapper and not the mechanism) | C and C++ | symbol `find_slot`

Checked: read in full `find_slot` (bflib_sound.c 567-603), `start_emitter_playing` (862-893), `play_sample` (bflib_sndlib.cpp 1061-1198), `apply_duck_gain` (480-500), `MonitorStreamedSoundTrack` (927-945), `play_music` (689-724), `play_music_track` (853-883), `stop_music` (901-919), `parse_stack_token` (config_sounds.c 453-491), `find_nearest_rooms_for_ambient_sound` and `set_room_playing_ambient_sound` (sounds.c 192-276), the atmos block of `update_player_sounds` (sounds.c 357-384), `play_atmos_sound` (bflib_sound.c 658-692). Not read: `init_spiral_steps` (map_utils.c 104, so "nearest first" for the room search is taken from the loop shape and the name only), the speech path, the Redbook (CD) music branch, the emitter pan and volume maths, and the rate at which `update()` (game_update.cpp:472, caller at 541) runs. Confidence: high on the voice pool and the stack policy; medium on the room-ambience order. Data checked: config/fxdata/terrain.cfg (room ambience rows), config/keeperfx.cfg (atmos options), config/fxdata/sounds.cfg (grep: only comment lines carry `STACK=`, so no shipped sample uses a stack policy in this release). camera_scope: n/a (sound).

## 1. Mechanism

Three layers, each with its own rule.

**(a) 3D voice pool (bflib_sound.c).** A fixed pool of voices. The requested size is clamped to `SOUNDS_MAX_COUNT` (16), `S3DSetNumberOfSounds` at bflib_sound.c 96-97. The game asks the backend for 100 samples (sounds.c 416), and the backend's source pool is sized from that (bflib_sndlib.cpp 989). `find_slot` (567-603) allocates a voice in this order:
1. For `ctype` 2 or 3, if the same emitter is already playing the same sample, reuse its slot (573-584).
2. Otherwise the first free slot wins (589-590).
3. Otherwise the victim is the playing voice with the lowest priority, found by a strict `>` scan so the first lowest one wins (591-595).
4. If the victim's priority is not strictly below the new sound's priority, the new sound is refused (597-599). Otherwise the victim is kicked (601) and its slot returned.

Higher number means more important: non-3D ambience uses priority 0x7FFFFFFE (bflib_sound.c 685), so it displaces nearly anything.

Order of steps in `start_emitter_playing` (862-893): `find_slot` (868) → kick inside it (601) → `play_sample` on the backend (872) → if the backend says no (873-874), return 0. The victim has already been silenced at that point (see defect D1).

**(b) Backend stacking (bflib_sndlib.cpp `play_sample`, 1061-1198).** Applied per sample ID, after the same-emitter restart path (1116-1137):
- No registered policy: at most one start per sample ID per audio tick. The tick counter is `g_audio_tick_counter`, advanced in `MonitorStreamedSoundTrack` (928), not the game turn. The mark is recorded before the voice search (1145-1149), so the gate works in menus where the game turn does not advance (comment at bflib_sndlib.h 103).
- `STACK=limit:N` (parsed in config_sounds.c 456-477; default max 1 when no policy, bflib_sndlib.cpp 474): a new trigger is dropped when N instances of that sample are already active (1153-1159).
- `STACK=duck[:max]`: no drop unless max > 0. Every active instance's gain is set to `base_gain / sqrt(count)` (480-500). The gain is recomputed when a new instance starts (1129-1133, 1184-1186) and when one ends (931-938), so the survivors come back up.
- If no free backend source exists, play fails and logs "too many samples playing at once" (1190-1191).

**(c) Ambience and music.**
- *Room bed* (sounds.c 233-276): on every `update_player_sounds` call, the donor walks an 11 x 11 block of map slabs around the camera (251). The first owned room whose kind has a non-zero `ambient_snd_smp_id` (262) is chosen and the search returns (270). No such room: the bed stops (275). Data: `AmbientSndSample` per room kind in config/fxdata/terrain.cfg (for example `[room6]` at 1262 = 85, `[room8]` at 1299 = 86; most rows are 0). A bed change is a hard cut: old samples are deleted (215) and the new one starts.
- *Atmos random layer* (sounds.c 357-384; `play_atmos_sound` bflib_sound.c 658-692): only when the ATMOSPHERIC_SOUNDS feature is on (config/keeperfx.cfg 45 is `OFF` in the shipped file). Each call draws `k = SOUND_RANDOM(atmos_sound_frequency)` (363). `k == 1` starts a random one-shot from ids `AtmosStart`..`AtmosEnd` (1014 to 1034, config_keeperfx.c 59-60) after game turn 3600 (364-369). Otherwise, after turn 600 (374), `k % 40 == 0` plays the repeating water-drop bed `AtmosRepeat` (1013) (377-379). All atmos goes through one shared emitter that only starts a sample it is not already playing (687). Frequency: default 800 (sounds.c 69), LOW 3200, MEDIUM 800, HIGH 400 (config_keeperfx.c 121-125; shipped `ATMOS_FREQUENCY=MEDIUM`, keeperfx.cfg 47).
- *Music* (bflib_sndlib.cpp 689-724, 853-883, 901-919): one streamed track at a time. `play_music` swaps the audio on the track (711) and starts it at once (716). `stop_music(fade_out)` fades over 1000 ms (910-911). Level music is track 3 to 6 chosen from the level number mod 4 (player_utils.c 918; sounds.c 514).
- *Audible radius*: 5120 normally, widened toward 27648 as the view zooms out (sounds.c 292), with receiver sensitivity lowered to match (not quoted).

Not found in this donor: stems or layered music, stingers, and any fade between two music tracks or two room beds. A grep of the sound and music sources for stinger, layer and crossfade returned no hits; the only fade is the stop fade above and the palette fades in the renderer.

Timing: the gates use game turns (600, 3600), a per-call draw (`k % 40`), and an audio tick. None uses elapsed time.

## 2. Key functions

- `find_slot`: `/mnt/frankendom-donors/dkfans-keeperfx/src/bflib_sound.c` 567-603 (voice choice, priority kick, refusal).
- `start_emitter_playing`: `/mnt/frankendom-donors/dkfans-keeperfx/src/bflib_sound.c` 862-893 (find_slot, then backend start, then bookkeeping).
- `play_sample`: `/mnt/frankendom-donors/dkfans-keeperfx/src/bflib_sndlib.cpp` 1061-1198 (same-emitter restart 1116-1137, once-per-tick gate 1145-1149, limit cap 1153-1159, free source 1163-1186).
- `apply_duck_gain`: `/mnt/frankendom-donors/dkfans-keeperfx/src/bflib_sndlib.cpp` 480-500 (gain = base / sqrt(count)).
- `MonitorStreamedSoundTrack`: `/mnt/frankendom-donors/dkfans-keeperfx/src/bflib_sndlib.cpp` 927-945 (tick counter, prune finished instances, duck re-raise).
- `parse_stack_token`: `/mnt/frankendom-donors/dkfans-keeperfx/src/config_sounds.c` 453-491 (`STACK=limit:N` / `STACK=duck:max` syntax).
- `find_nearest_rooms_for_ambient_sound` / `set_room_playing_ambient_sound`: `/mnt/frankendom-donors/dkfans-keeperfx/src/sounds.c` 192-276.
- atmos block: `/mnt/frankendom-donors/dkfans-keeperfx/src/sounds.c` 357-384. `play_atmos_sound`: `/mnt/frankendom-donors/dkfans-keeperfx/src/bflib_sound.c` 658-692.
- music: `/mnt/frankendom-donors/dkfans-keeperfx/src/bflib_sndlib.cpp` 689-724 (`play_music`), 853-883 (`play_music_track`), 901-919 (`stop_music`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants (theirs) |
|---|---|
| Free voice first, else kick the lowest priority voice strictly below the new one, else refuse | Voice pool 16 (bflib_sound.h 30; clamp at bflib_sound.c 96-97). Backend pool asked for 100 (sounds.c 416). |
| Atmos one-shot priority: top of the scale, nearly never kicked | 0x7FFFFFFE (bflib_sound.c 685) |
| Limit: at most N instances of one sample | N from `STACK=limit:N`, minimum 1 (bflib_sndlib.cpp 633) |
| Duck: share one loudness over the instances | gain = base / sqrt(count) (bflib_sndlib.cpp 490) |
| One start per sample per tick when no policy | audio tick (bflib_sndlib.cpp 1145-1149) |
| Random ambience chance, 1 in X per call | X = 800 medium, 3200 low, 400 high (config_keeperfx.c 121-125; sounds.c 69) |
| Bed repeat chance | k % 40 == 0 (sounds.c 377) |
| Start gates | 600 turns for the bed (sounds.c 374), 3600 turns for one-shots (sounds.c 367) |
| Music fade out | 1000 ms (bflib_sndlib.cpp 910) |
| Room bed search window | 11 x 11 slabs (sounds.c 251) |
| Audible radius | 5120 normal, 27648 zoomed out (sounds.c 292) |

## 4. TypeScript sketch

simplified: the sketch keeps the voice pool with priority kick, the limit and duck policies, the once-per-tick gate, the nearest-owned-bed pick and a linear crossfade. It reorders two donor steps on purpose: it starts the new voice first and stops the victim only if the start succeeds (donor: kick at bflib_sound.c 601, then start, then return 0 at 873-874 with the victim already silenced); and it records the once-per-tick mark only on success (donor: recorded before the voice search, bflib_sndlib.cpp 1149). It omits the same-emitter restart path (1116-1137), the distance cut-off, the Non3D emitter, the pan and volume maths, the speech path, the atmos random roll, and the time-based atmos fix. `pickBed` takes a list already sorted nearest first; the donor's spiral order was not read. `stepFade` is the crossfade the donor does not have.

```ts
// Licence: GPL-2.0 (donor LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor.
// clean-room
export interface Voice {
  readonly key: string;
  readonly priority: number;
  alive(): boolean;
  setGain(g: number): void;
  stop(): void;
}

// null = no explicit policy: legacy once-per-tick gate. limit: hard cap. duck: gain shared out, max 0 = uncapped.
export type Policy = { mode: "limit" | "duck"; max: number } | null;

export class VoicePool {
  private slots: (Voice | null)[];
  private startedOnTick = new Map<string, number>();

  constructor(size: number) {
    this.slots = new Array<Voice | null>(size).fill(null);
  }

  private liveVoices(): Voice[] {
    const out: Voice[] = [];
    for (const v of this.slots) {
      if (v !== null && v.alive()) out.push(v);
    }
    return out;
  }

  private countKey(key: string): number {
    let n = 0;
    for (const v of this.liveVoices()) {
      if (v.key === key) n++;
    }
    return n;
  }

  // A free (or dead) slot wins first. Otherwise the lowest-priority live voice is the victim,
  // but only if it is strictly below the new sound's priority.
  private pickSlot(priority: number): { index: number; victim: Voice | null } {
    for (let i = 0; i < this.slots.length; i++) {
      const v = this.slots[i];
      if (v === null || !v.alive()) return { index: i, victim: null };
    }
    let index = -1;
    let low = Infinity;
    for (let i = 0; i < this.slots.length; i++) {
      const v = this.slots[i];
      if (v !== null && v.priority < low) {
        low = v.priority;
        index = i;
      }
    }
    if (index < 0 || low >= priority) return { index: -1, victim: null };
    return { index, victim: this.slots[index] };
  }

  // simplified: the donor kicks the victim BEFORE the backend starts the new sound and does not
  // check the backend result before kicking. This sketch starts first and kicks only on success.
  // It also omits the same-emitter restart path, the donor's distance cut-off, and the
  // Non3D/ambient emitter that always uses the highest priority.
  play(
    key: string,
    priority: number,
    base: number,
    policy: Policy,
    tick: number,
    start: (gain: number) => Voice | null,
  ): Voice | null {
    if (policy === null) {
      if (this.startedOnTick.get(key) === tick) return null; // legacy: one start per key per tick
    } else if (policy.max > 0 && this.countKey(key) >= policy.max) {
      return null; // limit cap (or duck with a cap)
    }
    const pick = this.pickSlot(priority);
    if (pick.index < 0) return null;
    const duck = policy !== null && policy.mode === "duck";
    const gain = duck ? base / Math.sqrt(this.countKey(key) + 1) : base;
    const voice = start(gain);
    if (voice === null) return null; // backend refused: nothing is kicked
    if (pick.victim !== null) pick.victim.stop();
    this.slots[pick.index] = voice;
    if (policy === null) this.startedOnTick.set(key, tick);
    if (duck) this.rebalance(key, base);
    return voice;
  }

  // Duck mode: every live voice of this key gets base / sqrt(count). Call again when one ends.
  rebalance(key: string, base: number): void {
    const same: Voice[] = [];
    for (const v of this.liveVoices()) {
      if (v.key === key) same.push(v);
    }
    const g = base / Math.sqrt(Math.max(1, same.length));
    for (const v of same) v.setGain(g);
  }
}

// Cells ordered nearest-first around the camera (donor: 11 x 11 spiral). The first owned cell with a bed wins.
export interface BedCell {
  owned: boolean;
  bed: string | null;
}

export function pickBed(nearestFirst: readonly BedCell[]): string | null {
  for (const c of nearestFirst) {
    if (c.owned && c.bed !== null) return c.bed;
  }
  return null;
}

// Frame-rate independent linear fade toward target. fadeMs is zone data. Donor has no fade (hard cut).
export function stepFade(gain: number, target: number, dtMs: number, fadeMs: number): number {
  if (fadeMs <= 0) return target;
  const step = dtMs / fadeMs;
  const d = target - gain;
  if (Math.abs(d) <= step) return target;
  return gain + Math.sign(d) * step;
}

export {};
```

Typecheck: copied to the VPS as `/tmp/dkfans-keeperfx-voices.ts` and run `npx -p typescript tsc --noEmit --strict --target es2020` there: exit 0.

## 5. Lands in

- TARGET `src/fight/sound-voices.ts` (new, client only): the voice pool, the priority kick, the limit and duck policies, the bed pick and the crossfade. Engine events decide which cue fires; this module only decides whether it gets a voice.
- Parity-checklist row 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only, shape not code)
- Brief rule served: 1 (one engine, two clients: the cue comes from the engine's event stream, the voice rule stays on the client); 8 (target and parity row named)

## 6. Gaps and risks

- Client only. Voice drop and kick must never change game state. A cue that loses its voice must not hide a server-verified kill, so the kill stays in the server event and the cue is only a client reaction.
- Priority levels should be engine constants (the same for every zone), with the finisher and the killing blow above routine hit cues. In a MAX_ATTACKERS = 3 fight, a routine hit cue must never silence the finisher.
- The donor's pool is 16 voices. With three attackers plus ambience, the kick rule will shuffle which quiet cue survives. Frankendom should fix the pool size as one engine constant and test it at the worst case.
- Defect D1 (kick before start, bflib_sound.c 601 and 872-874): a voice is silenced even when the new sound never starts. Fix: choose the victim, start the new voice, stop the victim only on success (in the sketch).
- Defect D2 (atmos rate per call, sounds.c 363-379, and the "roughly every 2 seconds" comment at 376): the rate depends on how often `update()` runs and not on elapsed time. Fix: accumulate milliseconds and roll once per 1/rate seconds, so a 30 fps and a 60 fps client match. Frankendom's ambience should use the same roll.
- Defect D3 (hard cuts, sounds.c 215 for the room bed and bflib_sndlib.cpp 711 for music): the change is a click. Fix: fade the old bed to zero over a zone-data `fadeMs` with `stepFade` (in the sketch); for music, fade out over the 1000 ms that `stop_music` already uses (910).
- Duck with max 0 is uncapped (config_sounds.c 478 and 483). In a crowd, that could start many instances of one hit cue. Frankendom should always set a cap, and the once-per-tick default is a sensible floor.
- Zones as data: the donor's bed is keyed per room kind (terrain.cfg), so Frankendom should key it per zone (one field: bed sample id, fade ms, atmos chance) and not per room kind.
- Music: one track, hard swap, no stems and no stingers in this donor. Do not present "layered music" or "stingers" as coming from this donor. The idea is only the fade-out rule.
- The donor's rule "the room bed follows the camera" uses the local camera (sounds.c 233-240). Frankendom's bed should follow the player's zone, not the camera, because the camera is client-only and the zone is server data.
- Licence GPL-2.0: clean-room. The sketch was written from the described mechanism.
- Not read: the S3D pan and volume maths, the Redbook path, the spiral order (`init_spiral_steps`), and the rate of `update()`.

Best transferable idea: keep one fixed voice pool where a new sound kicks the lowest-priority voice only after it has actually started, and cap repeats of one sample with an explicit limit or duck policy.
Decision (proposed): adapt - take the priority-kick pool and the limit/duck shape, but fix D1 (kick after start), D2 (time-based rolls) and D3 (fades) first; it is the only donor found with a real per-sample concurrency rule, and a many-on-one fight needs one.
Acceptance: in a three-attacker fight with all 16 voices busy on routine hit cues (priority 1), a finisher cue (priority 5) plays and exactly one routine voice stops; a routine cue with the pool saturated is refused and stops nothing; a failed backend start stops no voice. A unit test asserts all three.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 1 (one engine, two clients); 8 (target and parity row named)
