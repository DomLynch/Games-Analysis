# FWGS-xash3d-fwgs (sound-music, cell 1)

Donor: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/client/sound/s_main.c` | Licence: GPL-3.0-or-later (s_main.c header: "either version 3 of the License, or (at your option) any later version") | C | symbol `S_UpdateAmbientSounds`

Checked: Confidence high on the ambience-bed path (`S_UpdateAmbientSounds`, s_main.c 1096-1146, called once per frame from `SND_UpdateSound` 1610-1627) and on the voice pick (`SND_PickDynamicChannel`, 342-380); medium on the soundfade defects (traced by hand, not run). Read: s_main.c 49-54, 136-148, 219-256, 324-380, 1078-1146, 1474, 1596-1640; s_load.c 120-175, 240-270; s_stream.c 28-130, 160-170; sound.h 25-60; common/com_model.h 39, 219; common/bspfile.h 247; engine/common/mod_bmodel.c 3605-3640; common/sound_api.h 87 (grep only). Candidates opened (9): s_main.c, s_load.c, s_stream.c, sound.h, com_model.h, bspfile.h, mod_bmodel.c, sound_api.h, and the list hint `engine/client/soundlib/snd_main.c`, which is the file loader (`FS_LoadSound` at 57), not the mechanism. Not read: s_mix.c (mixer), `SND_Spatialize`, `Mod_PointInLeaf`, the `bound()` macro, `S_AdjustLoopedSamplePosition`, the stream read loop that plays intro then loop, the game-info ambient names (which slot is water or wind). Stingers: none found in the files read (the intro track is the closest). Camera scope: not applicable (sound).

Best transferable idea: a zone's ambience is a few looping slots whose gains ramp toward per-zone targets at a fixed rate, so a border crossing is a target change, not a restart.
Decision (proposed): adapt - take the per-zone bed slots and the rate-limited gain ramp, fix the donor's rounding (defect D1) and express the crossfade as seconds per zone instead of units per second; the zone data already loads on the client, the server never decides what plays.
Acceptance: a player walking from a forest zone into a cave hears the forest bed fall and the cave bed rise over the same 2.0 s on a 30 fps and a 144 fps client, with no click; a headless test steps 2.0 s of simulated time in 60 and 144 steps and asserts both gains equal their targets within 0.001.

## 1. Mechanism

Two mechanisms in this module matter here. (A) Ambience beds, which is the topic's "beds per biome with crossfades". (B) The voice pool and steal rules. Music and sound fades are covered in short paragraphs at the end.

(A) Ambience beds (per BSP leaf):
- Each BSP leaf carries four byte levels, one per ambient slot, 0 to 255 (`common/bspfile.h` 247). They are copied into the engine leaf at `engine/common/mod_bmodel.c` 3616. The four slot sounds are registered at level start from the game info names (`s_load.c` 258); `have_ambient_sfx` is set when any slot loads.
- Once per frame `SND_UpdateSound` (1610) calls `S_UpdateAmbientSounds` (1627). That is the only call to it in the file. It finds the leaf under the listener (1105).
- If there is no leaf or the ambient cvar is zero (1107), every slot's sound is set to NULL at once. There is no fade in that case, so the bed is cut.
- Otherwise, for each slot: if its sound is registered (1118), the target is the ambient cvar (default 0.3, line 53) times the leaf level (1128), clamped at zero (1129-1130). The channel's master volume (a 0 to 255 short) moves toward the target: up by `round(frametime x ambient_fade)` if below (1133-1135), down by the same step if above (1141), clamped at the target. The default `ambient_fade` is 1000 per second (line 54). Then left and right gains are set to the master volume (1146).
- The four slot channels are looping and static (`S_InitAmbientChannels`, 1078-1088, flags at 1084). The per-frame spatialise loop in `SND_UpdateSound` starts after them (1630), so that loop does not re-pan or re-attenuate them; the mixer path that uses the gains was not read.
- A border crossing is therefore a change of target on the same four looping channels. Nothing restarts. Each slot ramps at the same fixed rate. At the default rate a full 0 to 76.5 ramp takes about 0.08 s (76.5 / 1000), so the donor's crossfade is close to a cut by default. A designer who wants a 2 s crossfade needs about 38 units per second, which is in the range where defect D1 stalls.

(B) Voice pool and steal rules (`SND_PickDynamicChannel`, 342):
- Pool size: 60 dynamic channels plus the 4 ambient slots, so 64 dynamic (`sound.h` 44). The total cap with static sounds is 256 more (`sound.h` 45). Static channels start after the dynamic count (1474).
- The steal loop runs only over the dynamic channels from `NUM_AMBIENTS` (356), so the ambient slots are never stolen.
- Inside the loop, in order: a playing stream is skipped (363). A channel already on the same entity and entchannel is taken at once (366-369; the `break` follows the match, not line-cited). A player's own sound is protected from non-player sounds (374). Otherwise the channel with the least time left is the candidate (377-380).
- Time left is `samples - position` (`SND_GetChannelTimeLeft`, 324-327): zero for a finished or missing channel, and for a sentence the sum of the words left. It is counted in raw samples (see D2).
- After the pick: if the victim is a looping sound with the same entity, channel and clip, the call returns NULL and does not restart it (the block after 380, not line-cited). Otherwise the victim is freed (`S_FreeChannel`).
- Priority: this module has no numeric priority field (no "priority" in `engine/client/sound` or `sound.h`). The priority is the ordered rule list above.

Music (`s_stream.c`):
- `S_StartBackgroundTrack` (96) opens an intro track; if there is no intro, the main track is used (112). The loop name is kept separately (116). The loop logic itself was not read.
- Timed fade: the music scale is `(fade_end - realtime) / fade_time` (86), with `fade_end` set from the real-time clock (169). The fade therefore does not depend on frame rate. The cvar default is 2.0 s (`s_main.c` 49).

Sound fade envelope (`soundfade` command, `S_SoundFade` 136-148, `S_UpdateSoundFade` 219-256):
- A percent envelope: ramp up to the start percent over the out time, hold, then ramp back. The volume scale is `1 - percent/100`, clamped (131-132). Evaluated on the real-time clock.

## 2. Key functions

- `S_UpdateAmbientSounds`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/client/sound/s_main.c` 1096-1146 (leaf lookup, level target, fixed-rate ramp, output gain).
- `SND_UpdateSound`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/client/sound/s_main.c` 1610-1630 (the per-frame caller; ambient update at 1627, spatialise loop from `NUM_AMBIENTS` at 1630).
- `SND_PickDynamicChannel`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/client/sound/s_main.c` 342-380 (steal rules), with `SND_GetChannelTimeLeft` at 324-327.
- `S_InitAmbientChannels`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/client/sound/s_main.c` 1078-1088.
- `S_SoundFade` and `S_UpdateSoundFade`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/client/sound/s_main.c` 136-148 and 219-256.
- `S_StartBackgroundTrack` and the timed music fade: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/client/sound/s_stream.c` 96-130 and 160-170.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-zone gain beds: a fixed set of looping slots, each with a target set by the zone level x master volume, ramping toward it | 4 slots (`common/com_model.h` 39); levels 0 to 255 per leaf (`common/bspfile.h` 247); master 0.3 (`s_main.c` 53) |
| Fixed-rate ramp in frame time | Rate 1000 units per second (`s_main.c` 54); the step is `round(frametime x rate)` (1135, 1141). Defect D1 |
| Output gain copied from the master volume, no panning for the beds | None (1146; spatialise loop starts at `NUM_AMBIENTS`, 1630) |
| Voice steal by least time left, with same-owner override, stream and player protection | 60 dynamic channels (`sound.h` 44), 256 static (`sound.h` 45) |
| Timed music fade on the wall clock | 2.0 s default (`s_main.c` 49); `fade_end` from realtime (`s_stream.c` 169) |
| Sound fade percent envelope | Out / hold / in times in seconds from the console (1865); defect D3 |

Defects, each with its fix:
- D1 (ambience ramp): the step is `round(cl_clientframetime() x ambient_fade)` (1135, 1141), and the master volume is a 0 to 255 short (`common/sound_api.h` 87). When the product is below 0.5, the step rounds to zero and the bed never reaches its target. At 60 fps that means any rate below 30 units per second (arithmetic, not run). A slow crossfade stalls. Fix: keep the gain as a float, step by `rate x dt`, and clamp. The sketch does this.
- D2 (voice steal across sample rates): the steal compares raw sample counts (324, 327). Clips are kept at native 11025, 22050 or 44100 Hz (`s_load.c` 130-134). Example: a 44100 Hz clip with 30000 samples left (0.68 s) against a 22050 Hz clip with 20000 left (0.91 s). The steal picks the 22050 Hz clip, which lasts longer. Fix: compare seconds (`samples / rate`). The sketch does this.
- D3 (sound fade): the fade-back ramp divides by `out_seconds` (235), not `in_seconds`. `in_seconds` only sets when the envelope ends (224). If in is shorter than out, the ramp is cut and snaps back. If in is longer than out, the percent goes negative; the scale clamp at 132 then gives full volume early if `bound()` clamps below zero to zero (`bound()` not read). Traced, not run. Fix: use `in_seconds` as the ramp length.
- D4 (sound fade divide by zero): the console default for `out` is 0 (1865). With out = 0 and in > 0, the fade-back divides by zero at 235 (`f / 0`). The percent becomes -infinity (NaN at the exact boundary), and the volume that results depends on `bound()` (not read). Traced, not run. Fix: guard the divisor, and fix D3 at the same time.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's shape (a target from the zone level times master, a fixed-rate ramp per slot, a steal that skips streams and protects player sounds, and a same-owner override) and fixes D1 (float ramp, no rounding) and D2 (steal by seconds). It omits the donor's immediate cut when there is no zone (the sketch fades to zero instead), the no-restart rule for looping sounds, the spatialised static sounds, sentence (word-list) channels, the raw channel and stream playback, the pitch, and the sample-position adjustment for looped clips. The `fadePerSec` argument is in 0 to 255 units to match the donor, not seconds; section 6 proposes seconds for the designer knob.

```ts
// Licence: GPL-3.0-or-later (donor header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Ambience beds: a fixed number of looping slots. Each slot's gain ramps toward the target for the listener's zone.
export const AMBIENT_SLOTS = 4;
export const LEVEL_MAX = 255; // zone levels and the master level are 0..255 (byte-like)

export interface BedSlot {
  sfx: string | null; // loop name for this slot, null = unused
  gain: number;       // current gain 0..1, kept as a float (never rounded)
}

export interface Zone {
  bedLevels: readonly number[]; // length AMBIENT_SLOTS, each 0..255 (zone data)
}

// One client frame. dt is wall-clock seconds for this frame. fadePerSec is in level units per second (0..255 scale).
export function stepBeds(
  slots: BedSlot[],
  zone: Zone | null,
  masterVolume: number,
  fadePerSec: number,
  dt: number,
): void {
  for (let i = 0; i < AMBIENT_SLOTS; i++) {
    const slot = slots[i];
    if (!slot.sfx) {
      slot.gain = 0;
      continue;
    }
    const level = zone ? zone.bedLevels[i] : 0;
    const target = Math.min(1, Math.max(0, (masterVolume * level) / LEVEL_MAX));
    // Fractional step: a slow fade never rounds to zero, so it always reaches its target.
    const step = (fadePerSec * dt) / LEVEL_MAX;
    if (slot.gain < target) slot.gain = Math.min(target, slot.gain + step);
    else if (slot.gain > target) slot.gain = Math.max(target, slot.gain - step);
  }
}

// Voice pool: pick a voice for a new sound.
export interface Voice {
  owner: number;     // entity id that made the sound
  channel: number;   // sound channel on that entity
  rate: number;      // sample rate in Hz (donor keeps 11025, 22050, 44100 native)
  samples: number;   // total samples in the clip
  pos: number;       // samples already played
  playing: boolean;
  stream: boolean;   // long streamed sounds (music, speech) are never stolen
  isPlayer: boolean; // the local player's own sounds
}

// Time left in seconds, so clips at different sample rates compare fairly.
export function secondsLeft(v: Voice): number {
  if (!v.playing) return 0;
  return Math.max(0, (v.samples - v.pos) / v.rate);
}

// Returns the voice index to use, or -1 when every voice in range is protected.
export function pickVoice(
  voices: Voice[],
  start: number,
  end: number,
  owner: number,
  channel: number,
  autoChannel: boolean,
  incomingIsPlayer: boolean,
): number {
  let best = -1;
  let bestLeft = Number.POSITIVE_INFINITY;
  for (let i = start; i < end; i++) {
    const v = voices[i];
    if (v.playing && v.stream) continue; // never steal a stream
    if (!autoChannel && v.owner === owner && (v.channel === channel || channel === -1)) return i; // same owner and channel: override
    if (v.playing && v.isPlayer && !incomingIsPlayer) continue; // non-player sounds never steal player sounds
    const left = secondsLeft(v);
    if (left < bestLeft) {
      bestLeft = left;
      best = i;
    }
  }
  return best;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/SM003-FWGS-xash3d.ts`).

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (proposed new client module; sound is client-only, so it reads server-confirmed events and zone data and never decides state). Parity-checklist row 12 (combat sound cues). The list hint said row 14; row 14 is the HUD, which does not fit a sound mechanism, so row 12 is cited.
- Zone bed levels belong in zone data (the four levels per zone), not in the engine.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: addendum sound-music fold-in (layering, ambience beds per biome, border crossfades, stingers checked: none found); rule 7 (clean-room for copyleft); rule 8 (target plus row 12)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, and no donor line is translated.
- Biome here is a BSP leaf, a spatial cell. Frankendom zones are data. Whether a zone has a border shape the client can test each frame was not checked in the Frankendom repo (not read here). Without that, the border crossfade has no trigger.
- Frankendom rulings: the donor's audio is client-only, which matches the ruling. The server sends a zone id only and never decides what plays.
- Voice budget: `MAX_ATTACKERS = 3` means at most three attacker voices per fight. The donor's 64-voice pool is far larger. A per-fight voice cap is a proposal, not a ruling.
- Priority: the donor has no numeric priority, only the order in section 1. Copy the order. The donor rule "a non-player sound never steals a player sound" maps to "the local player's hit confirmations are never stolen by enemy ambience".
- Kills are server-verified: a hit or death cue must play only on the server-confirmed event, never on a predicted one. The donor has no prediction, so this is a Frankendom rule, not a donor idea.
- Units: the donor's fade rate is in 0 to 255 units per second. Frankendom should expose a crossfade time in seconds per zone, derived internally.
- Not read: s_mix.c (mixer), `SND_Spatialize`, `Mod_PointInLeaf`, `bound()`, `S_AdjustLoopedSamplePosition`, the stream loop for intro then loop, the game-info ambient slot names.
- Defects D1 to D4 are fixed in the sketch (D1 and D2) or listed with a fix (D3 and D4, traced, not run).

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: addendum sound-music fold-in; rule 7 (clean-room); rule 8 (target plus row 12)
