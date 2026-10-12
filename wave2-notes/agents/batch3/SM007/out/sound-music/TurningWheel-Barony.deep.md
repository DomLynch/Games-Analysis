# TurningWheel-Barony (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/engine/audio/music.cpp` | Licence: BSD 2-Clause (LICENSE.txt: "is licensed under the BSD 2-Clause License:", open-source release) | C++ (FMOD branch) | symbol `handleLevelMusic` (with `playMusic`; fade steps in `sound_update`, sound.cpp 139)

Checked: read in full: `playMusic` (music.cpp 101-168) and `handleLevelMusic` (music.cpp 187 to the end of the FMOD block, 593); the music section of `sound_update` (sound.cpp 139, 213-221 flags, 267-323 live track, 369 outgoing track, 650-652 constants); the frame accumulator and call sites (game.cpp 4098, 4128-4139, 5276-5313; game.hpp 389). Read the ambient and environment cull blocks in `playSoundPosLocal` (sound_game.cpp 159-245). Confidence high on the state ladder, fade constants and the reversal defect; medium on the fade clock (computed from the call sites, not measured). Not read: the OpenAL copy of `handleLevelMusic` (sound_game.cpp 686, only its first lines); the meaning of "ensemble" playback (player.hpp 2442 is an identifier only); the track arrays and loading; the call block around game.cpp 7758 (so the rate at which `handleLevelMusic` runs is not established). Not a camera cell.

Best transferable idea: a music state chosen by a fixed priority ladder (boss over combat over shop over level), each state with its own fade speed, switched by a two-track crossfade that also ducks under notifications to a floor.
Decision (proposed): adapt - keep the ladder, the per-state fade speeds, the two-track crossfade and the notification duck; change the crossfade so a returning track resumes at its current volume (the donor drops it to 0), keeps fading tracks to silence instead of cutting them, and steps by real time instead of by render pass.
Acceptance: in the browser with a fake clock: entering a combat zone rises the combat track to full in 1.25 s; a notification drops the live music to 0.5 within 0.4 s and restores it within 2.5 s at the level rate; walking back into the level track during its fade-out resumes it at the same volume, with no dip (the test asserts the gain never falls on the way back).

## 1. Mechanism

- The level track is chosen by map name in `handleLevelMusic`. Several maps have a pool of tracks; when the playing track stops (`!playing`), a new index is drawn from the pool with `local_rng` (music.cpp 262, and the same pattern for the other pools). Other maps play one fixed track, always with crossfade and resume on (for example `playMusic(minetownmusic, true, true, true)`).
- The state ladder runs as an if/else chain. The level branch is first, and it fires only when no boss is present, no combat is on, and the player is not in a shop (254-255). After it, in order: devil (479), herx, minotaur (512 region), sanctum, combat (528), shop (580). Each branch calls `playMusic` with crossfade and resume on, sets every state flag exclusively, and sets the fade speeds. Bosses therefore outrank combat, which outranks shop, which outranks level.
- `playMusic` (101-168) resets the fade speeds to the defaults (113-114). If the wanted track is the one still fading out on the second channel, the channels swap (resume path, 120-127); otherwise the second channel is stopped (132 or 142) and the old live channel becomes the second channel. With crossfade on, the new live track starts at volume 0 (150-153). This reset also runs on the resume path, which is the defect in section 6.
- The fade is stepped in `sound_update` (sound.cpp 139), in this order, once per call (`if (music_channel)`, 267):
  (a) notification playing and volume above 0: volume falls by fade-out x 5 per step, to the notification floor (296-301);
  (b) else ensemble playing: volume falls by fade-out x 5, to the ensemble floor (305-312);
  (c) else volume below 1: volume rises by fade-in x 2 per step, capped at 1 (314-321).
  The outgoing channel falls by fade-out x 2 per step to 0 (369).
- Constants: base fade-in 0.002 and base fade-out 0.005 per step (sound.cpp 650-652). State multipliers: level 1/1 (476-477); devil 2/2 (488-489); herx 2/2 (500-501); minotaur 5/5 (512-513); sanctum 2/2 (525-526); combat fade-in 4, fade-out 1 (577-578); shop fade-in 4, fade-out 1 (589-590).
- Clock: `handleEvents` adds the real elapsed time to an accumulator (game.cpp 4128), converts it to 20 ms ticks (4129; TICKS_PER_SECOND 50, game.hpp 389), caps a pass at 5 ticks (4137-4139), calls `sound_update` once if at least one tick ran (5276-5281), then runs `gameLogic` once per tick (5309-5313). So the music fade moves once per pass that ran a tick, not once per tick.
- Secondary mechanism (read, not written up in the sketch): ambient cull. In `playSoundPosLocal`, a new sound in the ambient group (195) is dropped if an existing channel in that group has a volume within 0.05 of the new one (211) and its position within 2.25 squared tiles (213). The environment group (223) uses 4.5 squared tiles (241). The older voice keeps its place; the newer near-duplicate is culled.

## 2. Key functions

- `playMusic`: `/mnt/frankendom-donors/TurningWheel-Barony/src/engine/audio/music.cpp` 101-168. Channel swap, crossfade start volume, loop mode.
- `handleLevelMusic`: music.cpp 187-593. The state ladder and the per-state fade speeds.
- `sound_update` (music section): `/mnt/frankendom-donors/TurningWheel-Barony/src/engine/audio/sound.cpp` 139, with the live track at 267-322 and the outgoing track at 369.
- Frame clock: `/mnt/frankendom-donors/TurningWheel-Barony/src/game.cpp` `handleEvents` 4098, accumulator 4128-4129, sound update 5276-5281, tick loop 5309-5313.
- Ambient cull: `/mnt/frankendom-donors/TurningWheel-Barony/src/engine/audio/sound_game.cpp` `playSoundPosLocal` 159; cull blocks at 195 and 223.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fade-in per step | 0.002 x 2 = 0.004 per step (sound.cpp 650, 316); about 0.2 per second at 50 steps per second (computed) |
| Fade-out per step (outgoing) | 0.005 x 2 = 0.010 per step (652, 369); about 0.5 per second (computed) |
| Notification duck per step | 0.005 x 5 = 0.025 per step (298); about 1.25 per second (computed) |
| Duck floors | notification 0.5 (sound.cpp 135, default cvar); ensemble 0 (136, default cvar) |
| State speed multipliers | level 1/1; devil 2/2; herx 2/2; minotaur 5/5; sanctum 2/2; combat 4 in, 1 out; shop 4 in, 1 out |
| Priority ladder | devil > herx > minotaur > sanctum > combat > shop > level (479 onward) |
| Tick and pass limits | 50 ticks per second (game.hpp 389); at most 5 ticks per pass (game.cpp 4137-4139) |
| Ambient cull | volume within 0.05 (sound_game.cpp 211); 2.25 squared tiles ambient (213), 4.5 environment (241) |

## 4. TypeScript sketch

simplified: the sketch uses per-second rates applied with `dt`, so the fade time does not depend on how many ticks or passes run. It keeps the donor's ladder order (the caller computes the flags, `topState` ranks them) and the per-state fade multipliers. It keeps the reversal, but the returning track keeps its current volume (the donor resets it to 0). It keeps every fading track until it reaches silence, where the donor stops the older one at once when a third track arrives. It keeps the notification and ensemble ducks as floors on the live track only, as the donor does. It omits the track pools and random rotation, the FMOD channel and group objects, the "Hell Boss" and map special cases, the ambient cull, and the donor's per-branch flag resets (folded into `topState`). The caller chooses the track for each state.

```ts
// Licence: BSD-2-Clause donor (TurningWheel-Barony). Clean-room re-expression of the shape, not a translation.
export type MusicState = 'level' | 'shop' | 'combat' | 'sanctum' | 'minotaur' | 'herx' | 'devil';

export interface MusicFlags {
  devil: boolean;
  herx: boolean;
  minotaur: boolean;
  sanctum: boolean;
  combat: boolean;
  shop: boolean;
}

// Priority ladder: the first true flag wins, as in the donor's if/else chain.
export function topState(f: MusicFlags): MusicState {
  if (f.devil) return 'devil';
  if (f.herx) return 'herx';
  if (f.minotaur) return 'minotaur';
  if (f.sanctum) return 'sanctum';
  if (f.combat) return 'combat';
  if (f.shop) return 'shop';
  return 'level';
}

// Per-state fade multipliers (donor values): bosses fade faster; combat and shop rise fast and fall at the base rate.
const TUNING: Record<MusicState, { inMul: number; outMul: number }> = {
  level: { inMul: 1, outMul: 1 },
  shop: { inMul: 4, outMul: 1 },
  combat: { inMul: 4, outMul: 1 },
  sanctum: { inMul: 2, outMul: 2 },
  minotaur: { inMul: 5, outMul: 5 },
  herx: { inMul: 2, outMul: 2 },
  devil: { inMul: 2, outMul: 2 },
};

// Base rates per second. Donor per-step values (0.002 in, 0.005 out, 0.005 duck) x2 or x5 x ~50 steps per second.
const BASE_IN_PER_S = 0.2;
const BASE_OUT_PER_S = 0.5;
const DUCK_PER_S = 1.25;
const FLOOR_NOTIFICATION = 0.5; // donor default for the notification duck floor
const FLOOR_ENSEMBLE = 0.0;     // donor default for the ensemble duck floor

interface Channel {
  track: string;
  volume: number;
}

export class MusicBus {
  private live: Channel | null = null;   // the track that is (or is becoming) the music
  private fading: Channel[] = [];        // tracks on their way to silence; each keeps its own volume
  private inRate = BASE_IN_PER_S;
  private outRate = BASE_OUT_PER_S;

  // Called when the chosen state or its track may have changed. The track is chosen by the caller.
  request(state: MusicState, track: string): void {
    const t = TUNING[state];
    this.inRate = BASE_IN_PER_S * t.inMul;
    this.outRate = BASE_OUT_PER_S * t.outMul;
    if (this.live && this.live.track === track) return;

    // Reversal: the wanted track is still fading out. Bring it back at its current volume (no reset to 0).
    const back = this.fading.findIndex((c) => c.track === track);
    if (back >= 0) {
      const [c] = this.fading.splice(back, 1);
      if (this.live) this.fading.push(this.live);
      this.live = c;
      return;
    }

    // New track: the old live track keeps its volume and fades out. Tracks already fading keep fading too.
    if (this.live) this.fading.push(this.live);
    this.live = { track, volume: 0 };
  }

  // Call every frame with the real frame time in seconds.
  // duck: notification or ensemble playback pulls the live track down to its floor.
  step(dt: number, duck: { notification: boolean; ensemble: boolean }): void {
    if (this.live) {
      const target = duck.ensemble ? FLOOR_ENSEMBLE : duck.notification ? FLOOR_NOTIFICATION : 1;
      if (this.live.volume > target) {
        this.live.volume = Math.max(target, this.live.volume - DUCK_PER_S * dt);
      } else {
        this.live.volume = Math.min(target, this.live.volume + this.inRate * dt);
      }
    }
    for (const c of this.fading) c.volume = Math.max(0, c.volume - this.outRate * dt);
    this.fading = this.fading.filter((c) => c.volume > 0);
  }

  // Gains for the mixer: one entry per track still audible.
  gains(): { track: string; volume: number }[] {
    const out = this.fading.map((c) => ({ track: c.track, volume: c.volume }));
    if (this.live) out.push({ track: this.live.track, volume: this.live.volume });
    return out;
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copied to /tmp): exit 0.

## 5. Lands in

- TARGET `origins/client/music-bus.ts` (new, client-only: music is client-side under the Frankendom rulings). Parity-checklist row 12 (combat sound cues), the nearest row for combat music states; the level and zone ambience has no row of its own.
- today: not checked in this pass.
- Reuse tag: rewrite-from-idea (BSD-2-Clause; code may be adapted, but the sketch re-expresses the shape; the donor's FMOD calls are not reused)
- Brief rule served: client-only sound (Frankendom ruling); no numbered brief rule applies.

## 6. Gaps and risks

- BSD-2-Clause: adaptable. The donor calls FMOD, which is a proprietary library; the Frankendom build should use Web Audio, not FMOD.
- Reversal defect: on the resume path the returning track is set to volume 0 when crossfade is on (music.cpp 150-153), so it drops from its current level to 0 and rises again. Fix: keep its volume on resume (sketch `request`).
- Third-track cut: a track that starts while another is fading is stopped at once (music.cpp 132, 142), so the fading track jumps to silence. Fix: keep every fading track fading to 0 (sketch `fading[]`).
- Frame-rate dependence: the fade moves once per pass that ran a tick (game.cpp 5276-5281), and a pass can cover up to five ticks (4137-4139). At low frame rates the fades stretch, and at high frame rates they run at 50 steps per second. Fix: step by real time (sketch `step`).
- Priority is an if/else chain: each branch repeats the full flag set (for example 479-580), so adding a state means editing every branch. Fix: rank the flags in one place (`topState`).
- No hysteresis on the combat flag (set elsewhere; not read). If it flips, each flip starts a fade. Fix: a short hold (about 1-2 s) before combat music is released; Frankendom's fight engine should own that timer, not the client.
- Ensemble ducking depends on player instrument playback (player.hpp 2442 identifier only; the meaning was not read). The sketch takes it as a plain boolean. Do not port it without reading the source.
- The ambient cull (sound_game.cpp 195-241) drops a newer near-duplicate instead of stealing a voice; that caps overlap in a crowd of identical idle sounds. It is a candidate rule for the voice pool in the STJr-SRB2 note, not built here.
- Frankendom rulings: server-verified kills and the one ledger are unaffected. The server sends state flags (combat, boss present); the client picks the track.
- Not compared: the OpenAL copy of `handleLevelMusic` (sound_game.cpp 686) may differ from the FMOD copy.
