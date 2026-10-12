# luanti-org-luanti (sound-music, cell 2)

Donor: `/mnt/frankendom-donors/luanti-org-luanti/src/client/sound/sound_manager.cpp` (with `playing_sound.cpp`, `sound_constants.h`, `proxy_sound_manager.cpp`) | Licence: LGPL-2.1-or-later (SPDX header in sound_manager.cpp line 2; repo COPYING.LESSER; sound and texture assets have their own terms in LICENSE.txt, not read in full) | C++ | symbol `OpenALSoundManager::doFades` / `PlayingSound::fade` / `PlayingSound::doFade`

Checked: The hint file `games/devtest/mods/soundstuff/sound_event_items.lua` is the WRONG file for this topic: it is a test-mod demo that maps node and tool events to a sound name (read 1-120 and 150-209; 121-149 only grepped). The real mechanism is in the engine: `src/client/sound/` (read: `sound_manager.cpp` 1-70, 92-118, 130-240, 237-260, 336-360, 440-500, 540-589; `playing_sound.cpp` 178-230; `sound_constants.h` all; `proxy_sound_manager.cpp` 140-146; `src/sound_spec.h` 10-45; `doc/lua_api.md` 1385-1391 and 7664-7684; `builtin/client/misc.lua` 14-22). Confidence: high on the fade ramp and the variant pick (read end to end, including the thread loop that drives them). Medium on what OpenAL does at its source limit (the limit is the driver's; not read). Not read: ogg decode and stream bodies beyond the bigstep scheduling, `reportRemovedSound`, `al_extensions`. camera_scope: not applicable (sound). Scope: the donor has a crossfade primitive and a variant pool. It has NO voice cap, NO priority, NO stinger, NO layering policy and NO biome-keyed bed (the engine has no biome concept; biome choice would be Lua's). Grep over `src/client/sound/` for fade, max, priority, voice, crossfade, ambien, biome, stinger and loop turned up no priority, voice-cap, stinger or biome logic; `builtin/` and `games/devtest/` were grepped for fade calls only.

Best transferable idea: a bed crossfade is two gain ramps on two voices: each step adds rate times real elapsed seconds, clamps at the target, and a new fade re-targets mid-flight with its direction set from the current gain.
Decision (proposed): adapt - take the ramp rule (integrate by real time, clamp, re-target from current gain, stop at zero) for zone-border ambience beds; Frankendom plays audio through the browser, so the ramp runs on the Web Audio clock or a per-frame tick, not the donor's sound thread.
Acceptance: when a player crosses a zone border the old bed fades to silence and the new bed rises to full in the zone's crossfade seconds; a client test asserts both gains reach their targets within one tick of that time and never overshoot.

## 1. Mechanism

- Who calls: the game side does not call the sound object directly. `ProxySoundManager::fadeSound` sends a `FadeSound` message (proxy_sound_manager.cpp 142-144). The sound thread's loop pops messages and calls `fadeSound` (sound_manager.cpp 538-539). The gain itself is written by `doFade` on that thread (playing_sound.cpp 220).
- Loop that drives it: the sound thread (sound_manager.cpp 551-582) waits for messages with a timeout of `SOUNDTHREAD_DTIME` = 16 ms (sound_constants.h 97; wait computed at 557-565). Then `dtime` = real milliseconds since the last step, in seconds (579), and `step(dtime)` runs (581). So the step is VARIABLE and measured, not fixed.
- Request: `OpenALSoundManager::fadeSound(id, step, target)` (476-487). A zero step is ignored (479-480). It finds the playing sound by handle; if none, it returns (481-483). Otherwise `PlayingSound::fade` decides whether to add the sound to the fading list (485-486).
- Set the ramp: `PlayingSound::fade` (180-190). Target is clamped to zero or above, NaN becomes 0 (184). Direction: if the target is above the current gain, step = +|step|; otherwise step = -|step| (185). The new ramp replaces any old one (187). It returns true only if the sound was not already fading (189), so the fading list does not get a duplicate entry.
- Integrate: `PlayingSound::doFade(dtime)` (192-228). Dead or paused sounds return early (194-198). `current_gain += step * dtime` (204). Falling ramp: max(gain, target) (206-207). Rising ramp: min(gain, target) (208-209). So the gain never overshoots. If gain <= 0: stop the source and mark dead (211-217). If gain equals the target: the ramp ends (222-224). Otherwise keep fading (226).
- Sweep: `doFades` (51-68) walks the fading list each step, calls `doFade` and removes finished entries by swap-with-last (63-66). It runs once per step (358), before the stream step (359).
- Start with a fade-in: `playSoundGeneric` (180-235) starts the voice at gain 0 when `fade > 0` (203-205) and requests the ramp to the saved target after registering the voice (233-234).
- Variant pool: `getLoadedSoundNameFromGroup` (92-118). Pick a uniform random index (103). If the chosen file fails to open, it is removed from the group (113-114) and the pick repeats (101 loop). An empty group returns "" (117). There is no no-repeat rule.
- Long sounds: sounds longer than 3 s are streamed (sound_constants.h 91; sound_data.cpp 32 decides). Stream bigstep 0.3 s (95).
- Dead sounds: swept every `REMOVE_DEAD_SOUNDS_INTERVAL` = 2 s (sound_constants.h 89; sound_manager.cpp 338-355).

## 2. Key functions

- `PlayingSound::fade`: `/mnt/frankendom-donors/luanti-org-luanti/src/client/sound/playing_sound.cpp` 180-190 (direction and replace).
- `PlayingSound::doFade`: same file, 192-228 (integrate, clamp, stop at zero, end at target).
- `OpenALSoundManager::fadeSound`: `/mnt/frankendom-donors/luanti-org-luanti/src/client/sound/sound_manager.cpp` 476-487.
- `OpenALSoundManager::doFades`: same file, 51-68; called from `step` at 358; the thread loop is 551-582.
- `OpenALSoundManager::playSoundGeneric`: same file, 180-235 (fade-in start at 203-205, ramp request at 233-234; pitch warning at 207-209).
- `OpenALSoundManager::getLoadedSoundNameFromGroup`: same file, 92-118 (variant pick).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Gain change per second, ramp clamped at target | `fade` in gain per second (doc/lua_api.md 1388, 7674-7676); clamp 206-209 |
| Zero or negative target clamped to 0; NaN to 0 | `MYMAX(target_gain, 0.0f)` (playing_sound.cpp 184) |
| Gain at or below 0 stops the voice | 211-213 (theirs) |
| Sound thread wait per loop | `SOUNDTHREAD_DTIME` 0.016 s (sound_constants.h 97) |
| Dead-sound sweep | `REMOVE_DEAD_SOUNDS_INTERVAL` 2.0 s (sound_constants.h 89; sound_manager.cpp 355) |
| Single buffer vs stream | `SOUND_DURATION_MAX_SINGLE` 3.0 s (sound_constants.h 91) |
| Stream scheduling | `STREAM_BIGSTEP_TIME` 0.3 s (sound_constants.h 95) |
| Variant choice | uniform: `myrand() % size` (sound_manager.cpp 103) |
| Devtest emitter period | 0.7 s (games/devtest/mods/soundstuff/sound_event_items.lua 189; a test value, not an engine rule) |
| Max hear distance | from node param2, 0 = default (sound_event_items.lua 183-187) |

## 4. TypeScript sketch

simplified: keeps the donor's rules: direction chosen from the current gain at request time, a re-target replaces the previous ramp, the gain is integrated with real elapsed seconds, clamped at the target, and a voice that ramps to zero is dead. It omits the sound-data loading, the OpenAL source, the streaming, the fading list (one voice is ticked at a time), the handle map, the positional audio and the stop call. It also drops the donor's "already fading" return value. A crossfade helper is added to show the two-voice use the addendum asks about; the donor has no such helper (the caller does it).

```ts
// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Ramp {
  step: number;   // gain per second; sign set from the direction of the ramp
  target: number; // gain the ramp stops at
}

class BedVoice {
  gain: number;
  dead = false;
  private ramp: Ramp | null = null;

  constructor(startGain: number) {
    this.gain = Math.max(0, startGain);
  }

  // Start or replace a ramp. The direction comes from the current gain, so a re-target mid-ramp reverses cleanly.
  fadeTo(gainPerSecond: number, targetGain: number): void {
    if (gainPerSecond === 0) return; // a zero rate is ignored
    const target = Math.max(0, Number.isNaN(targetGain) ? 0 : targetGain);
    const rate = Math.abs(gainPerSecond);
    this.ramp = { step: target - this.gain > 0 ? rate : -rate, target };
  }

  // Called once per step with the real elapsed seconds (variable step). Clamps at the target, so no overshoot.
  tick(dtime: number): void {
    if (this.dead || this.ramp === null) return;
    const r = this.ramp;
    let g = this.gain + r.step * dtime;
    g = r.step < 0 ? Math.max(g, r.target) : Math.min(g, r.target);
    if (g <= 0) {
      this.gain = 0;
      this.dead = true; // fading to zero ends the voice
      this.ramp = null;
      return;
    }
    this.gain = g;
    if (g === r.target) this.ramp = null;
  }
}

// Crossfade: the old bed falls to silence and the new bed rises to full, both over `seconds`.
function crossfade(oldBed: BedVoice, newBed: BedVoice, seconds: number): void {
  const rate = 1 / Math.max(seconds, 0.001);
  oldBed.fadeTo(rate, 0);
  newBed.fadeTo(rate, 1);
}

const oldBed = new BedVoice(1);
const newBed = new BedVoice(0);
crossfade(oldBed, newBed, 2);
oldBed.tick(0.5); // 0.5 s elapsed: old at 0.75
newBed.tick(0.5); // new at 0.25

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (new client-only module): ambience-bed and cue ramps for zone borders, driven from the client frame with real elapsed time. Parity-checklist row 12 (combat sound cues). Bed choice per zone has no row of its own; see section 6.
- Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room only)
- Brief rule served: 8 (target file and parity row named); 7 (licence read, copyleft, clean-room)

## 6. Gaps and risks

- No voice cap and no priority in this donor. A new sound is dropped only when OpenAL cannot allocate a source (sound_manager.cpp 163-168, `AL_OUT_OF_MEMORY`), and then the lingering-sound list is printed at most once per 10 s (262-264; `PLAYING_SOUNDS_PRINT_INTERVAL` 10 in sound_constants.h 99). Frankendom needs a cap per class (hit, spell, ambience, stinger) with priority; this donor gives neither.
- No stinger, no layering policy (two beds at once are just two handles), no biome-keyed bed. The engine has no biome; the devtest emitter (sound_event_items.lua 173-190) is one node that replays its sound every 0.7 s, which is a timer shape, not a bed policy.
- Variant pick has no repeat avoidance (`myrand() % size`, sound_manager.cpp 103), so the same hit can play twice in a row. Frankendom should avoid the last choice per class.
- A crossfade is two voices that the caller must coordinate. The donor has no crossfade call; `core.sound_fade` is a thin wrapper (builtin/client/misc.lua 16-17).
- Latency: a fade request reaches the sound thread as a message and takes effect on its next step, up to 16 ms later (proxy 143-144; sound_constants 97). Acceptable for beds; note it for stingers.
- Defect (log text only): the pitch warning prints `start_time` instead of `pitch` (sound_manager.cpp 207-209). Fix: print `pitch`. No defect found in the ramp itself after reading it end to end.
- Ruling: sound is client-only. The zone the bed follows must be the one the server confirms for the player; the client must never decide a fight result from audio state.
- Licence LGPL-2.1-or-later: clean-room only. The sketch is written from the described rule, not from the donor lines.

Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room only)
Brief rule served: 8 (target file and parity row named); 7 (licence, clean-room)
