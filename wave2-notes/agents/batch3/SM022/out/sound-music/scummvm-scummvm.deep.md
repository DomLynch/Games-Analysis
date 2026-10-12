# scummvm-scummvm (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/scummvm-scummvm/engines/wintermute/base/base_game.cpp` | Licence: GPL-3.0-or-later (file header line 9: "either version 3 of the License, or (at your option) any later version"; `COPYING` is GPL v3) | C++ | symbol `BaseGame::updateMusicCrossfade`

Checked: Cell 15 = category_no from the cells file. Read in full: `BaseGame::updateMusicCrossfade` (base_game.cpp 5352-5422), the script start `MusicCrossfade` (1536-1560), the per-frame caller `BaseGame::initLoop` (745-776). Read in part: `BaseGame::freeze` and `unfreeze` (4903-4932), and the mixer's channel insert and duplicate-id check (`audio/mixer.cpp` 270-335). Candidates opened or searched for this topic: `audio/mixer.cpp`, `audio/mixer_intern.h`, `engines/wintermute/base/base_game.cpp`, `engines/wintermute/base/base_game.h`, and a grep for crossfade across `audio`, `engines`, `common`. The hint file `engines/icb/footstep.cpp` was not read (size checked only); the crossfade is not there. Not read: the `BaseSound` play, stop and setVolume bodies (used as a black box), and the FoxTail single-channel variant `MusicCrossfadeVolume` (1578-1600, behind `ENABLE_FOXTAIL`). Confidence: high on the crossfade order of operations and the numbers. Medium on the freeze defect in section 6: the code allows it, and I did not trace how the game's scripts call freeze during a fade. camera_scope: n/a (sound cell).

Best transferable idea: Crossfade two music slots on a fixed-length clock with a linear level split (outgoing from 100 to 0, incoming from 0 to 100), then swap the slots so the live track always sits in the same slot, and drive the clock from game time that pauses with the game.
Decision (proposed): adapt - the shape fits zone bed changes at a border (one fade length, two beds, one swap), but the fade clock must not run while the game is frozen, and an equal-power curve should replace the linear split.
Acceptance: Walking from the forest bed into the swamp bed fades the forest out and the swamp in over the zone's crossfade length (default 2000 ms in the client), and opening a menu mid-fade and closing it resumes the same fade with no jump; a client test asserts the levels at start (100 / 0), and that a 10 s freeze at the midpoint leaves the midpoint unchanged on resume.

## 1. Mechanism

- Two slots are used out of 5 music channels (`engines/wintermute/base/base_game.h` 77). The script command `MusicCrossfade` (1536-1560) reads the swap flag (default true, 1543), refuses a second crossfade while one runs (1545-1548), records the start as the live timer (1551), the two channels (1552-1553) and the length (1554), and sets the final levels V1 = 0 and V2 = 100 (1559-1560). By default channel1 is the outgoing track (it starts at V2 = 100 and ends at V1 = 0) and channel2 is the incoming track.
- Once per frame, `BaseGame::initLoop` (745) calls `updateMusicCrossfade` (752) before it advances the live timer (772). Order inside `updateMusicCrossfade` (5352): (a) return if no crossfade is running (5353-5355); (b) return if the game is frozen (5356-5358); (c) cancel if either channel index is out of range or empty (5360-5367); (d) call play() on any of the two channels that is not playing (5369-5374); (e) currentTime = live timer - start (5376).
- End of fade (5378): when currentTime reaches the length, the crossfade is cancelled. Channel2 is set to V2; if V2 is 0 it is stopped and reset to volume 100. Channel1 is then set to V1 the same way (skipped when both channels are the same slot). If swap is set, the two slot contents (the track object and its start time) are exchanged, so the incoming track is now in channel1.
- During the fade (5409-5415): progress = currentTime / length; delta = int((V1 - V2) x progress); channel2 volume = V1 - delta; channel1 volume = V2 + delta. At progress 0, channel1 = 100 and channel2 = 0 by default; at progress 1 they reach their final levels. The two levels always add to V1 + V2, so the split is linear in volume.
- Clock: `_liveTimer += MIN((uint32)1000, _deltaTime)` (772). Each frame adds the frame time, capped at 1000 ms. This line is before the frozen-only block (774), so the clock keeps running while the game is frozen.
- Freeze: `BaseGame::freeze` (4903-4915) pauses script and sound (4905-4906, music only when asked), sets the state to GAME_FROZEN (4911), and counts nesting. `unfreeze` (4918-4932) restores the saved state when the count returns to zero.

## 2. Key functions

- `BaseGame::updateMusicCrossfade`: `/mnt/frankendom-donors/scummvm-scummvm/engines/wintermute/base/base_game.cpp` 5352-5422. The whole fade step: guards, play-if-stopped, end snap with optional swap, linear split.
- `MusicCrossfade` script command: `/mnt/frankendom-donors/scummvm-scummvm/engines/wintermute/base/base_game.cpp` 1536-1560. Start record and defaults.
- `BaseGame::initLoop`: `/mnt/frankendom-donors/scummvm-scummvm/engines/wintermute/base/base_game.cpp` 745-776. Per-frame caller and the live timer step.
- `BaseGame::freeze` / `unfreeze`: `/mnt/frankendom-donors/scummvm-scummvm/engines/wintermute/base/base_game.cpp` 4903-4932.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Final level of the outgoing slot | 0 (theirs, 1559); 0 means stop and reset the slot to 100 |
| Final level of the incoming slot | 100 (theirs, 1560) |
| Start levels | outgoing at 100, incoming at 0 (derived from 5410-5415 at progress 0; the defaults at 1559-1560) |
| Fade length | the script argument; no donor default (1554). Unit: ms on the live clock |
| Clock step per frame | min(1000, frame ms) (theirs, 772) |
| Swap at the end | default true (theirs, 1543) |
| Music slots | 5 (theirs, base_game.h 77) |
| Mixer voices (for the gap in section 6) | 32 (theirs, `audio/mixer_intern.h` 61) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (guard, start each track once, advance the fade clock, end snap with settle and optional swap, otherwise the linear split). It fixes two donor defects: the fade clock does not advance while frozen, and a track is started once instead of being restarted each frame when it has ended. It omits the actual sound calls, the script argument parsing, the FoxTail single-channel variant, the case where both channels are the same slot (the donor skips the channel1 settle there), the start-time bookkeeping of the slot objects, and the 1000 ms cap on the frame delta (the caller applies it).

```ts
// Licence: GPL-3.0-or-later (donor file header). Clean-room sketch written from the described mechanism, not a translation.
interface Slot {
  track: string | null;
  playing: boolean;
  volume: number; // 0..100
}

interface Crossfade {
  running: boolean;
  started: boolean;
  ch1: number;      // outgoing slot (donor channel1)
  ch2: number;      // incoming slot (donor channel2)
  vol1: number;     // final volume of ch1 (donor default 0)
  vol2: number;     // final volume of ch2 (donor default 100)
  lengthMs: number;
  swap: boolean;
  elapsedMs: number; // fade clock; advances only while not frozen
}

// Start a crossfade. Refuses to start a second one while one runs.
function startCrossfade(x: Crossfade, ch1: number, ch2: number, lengthMs: number, swap: boolean): boolean {
  if (x.running) {
    return false;
  }
  x.running = true;
  x.started = false;
  x.ch1 = ch1;
  x.ch2 = ch2;
  x.vol1 = 0;
  x.vol2 = 100;
  x.lengthMs = lengthMs;
  x.swap = swap;
  x.elapsedMs = 0;
  return true;
}

// Set a slot's final level: 0 means stop and reset the slot to full, as the donor does.
function settle(s: Slot, finalVolume: number): void {
  if (finalVolume === 0) {
    s.playing = false;
    s.volume = 100;
  } else {
    s.volume = finalVolume;
  }
}

// Once per frame. dtMs is the frame delta, already capped by the caller.
function stepCrossfade(x: Crossfade, slots: Slot[], frozen: boolean, dtMs: number): void {
  if (!x.running || frozen) {
    return; // fix: a frozen game does not advance the fade clock
  }
  if (!x.started) {
    slots[x.ch1].playing = true; // start each track once, never restart a finished one
    slots[x.ch2].playing = true;
    x.started = true;
  }
  x.elapsedMs += dtMs;
  if (x.elapsedMs >= x.lengthMs) {
    settle(slots[x.ch2], x.vol2);
    settle(slots[x.ch1], x.vol1);
    if (x.swap) {
      const a = slots[x.ch1];
      const b = slots[x.ch2];
      const tmp = { track: a.track, playing: a.playing, volume: a.volume };
      a.track = b.track; a.playing = b.playing; a.volume = b.volume;
      b.track = tmp.track; b.playing = tmp.playing; b.volume = tmp.volume;
    }
    x.running = false;
    return;
  }
  const progress = x.elapsedMs / x.lengthMs;
  const delta = Math.trunc((x.vol1 - x.vol2) * progress);
  slots[x.ch1].volume = x.vol2 + delta;
  slots[x.ch2].volume = x.vol1 - delta;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/bed-crossfade.ts` (new client-only module; it changes the zone bed when the listener crosses a border and never writes engine state). Parity-checklist row 12 (combat sound cues) is the nearest row for sound; zone beds are not a combat row, so this is a gap against the checklist, not a clean fit.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine; the client is a view); addendum sound-music fold-ins (border crossfades)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- Freeze defect (keep the idea, fix the defect): the fade clock is the live timer, which advances every frame (772), outside the frozen check. `updateMusicCrossfade` returns early while frozen (5356). So a freeze longer than the remaining fade time makes the fade finish at once on unfreeze. Fix: advance a fade clock only in unfrozen frames (the sketch does this). Not traced: whether the game's own scripts freeze during a fade.
- Restart defect (not run): the step calls play() on any channel that is not playing (5369-5374). A short incoming track that ends before the fade ends is restarted from the top until the fade ends. Fix: start each track once (the sketch does this).
- Loudness dip: the split is linear in volume (5410-5415). With unrelated tracks the midpoint is quieter than either end. Fix: an equal-power curve; the donor does not have one (a design note, not a bug claim).
- Volumes are whole numbers 0..100 and the delta is truncated with int() (5410). This is a small quantisation, not a defect for music.
- Not written up here, but relevant to the ryzom note: the mixer has 32 channel slots (`audio/mixer_intern.h` 61). A new sound takes the first free slot, and a full mixer drops the new sound with a warning (`audio/mixer.cpp` 285). There is no priority, and a second play with an id that is already in a slot is dropped (`audio/mixer.cpp` 319-322). A fight sting dropped this way is silent, so Frankendom needs an explicit priority rule.
- Not verified: no runtime test. The sketch typecheck passed on the VPS (`tsc --noEmit --strict --target es2020`, exit 0).
