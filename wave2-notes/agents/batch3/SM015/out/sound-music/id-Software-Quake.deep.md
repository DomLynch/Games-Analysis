# id-Software-Quake (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/snd_dma.c` (with `sound.h`, `snd_mix.c`, `bspfile.h`, `cd_audio.c`; the list's hint `sound.h` is the type header only) | Licence: GPL-2.0-or-later. `gnu.txt` is the GPL version 2 text; `sound.h` lines 5-7 and the `snd_dma.c` header say "either version 2 of the License, or (at your option) any later version". Copyleft: clean-room, shape only. | C | symbol `S_UpdateAmbientSounds`, `SND_PickChannel`

Checked: Read in full: `snd_dma.c` SND_PickChannel (354-391), SND_Spatialize (398-444), S_StartSound (451-517), S_StaticSound (620-654), S_UpdateAmbientSounds (664-711), S_Update (721-808, the listener update and the static-merge loop); `sound.h` channel struct and constants (130-139, 79); `cd_audio.c` CDAudio_Play (495-567, the start of the function). Read by grep only: `snd_mix.c` clamp (353-356), `bspfile.h` ambient constants (204-209, 224), `model.c` 935 (copies leaf levels; not read in full), `snd_dma.c` S_Init cvars (78-79) and precache (237-238). Callers: S_StartSound and S_StaticSound are called from the server and progs sound builtins, which were NOT read, so the claims apply to the function for the callers that pass an entity, a channel, an origin and a volume. `Mod_PointInLeaf` (the leaf lookup) and the map compiler that writes leaf ambient levels were not read. The mixer loop body was not read. Confidence: high for the ambience code and the channel code as written; high for the int truncation (types read: `sound.h` 79 `int master_vol`, `quakedef.h` 299 `double host_frametime`); the frame-rate figure is arithmetic from those types, not run. Nothing was run or built. No hit or spell sound logic and no music layering or stinger code exist in these files.

Best transferable idea: Give each zone a per-kind ambience level as data and let each bed ramp toward its target at a fixed rate per second of frame time, so walking between zones cross-fades instead of cutting, with a silent gate under a small threshold.
Decision (proposed): adapt - the zone-level bed with a time-based ramp is the mechanism to keep; the donor's integer ramp, the unused slime and lava beds and the hard cut out of a zone are defects to fix in the sketch.
Acceptance: A client test with a fake clock: a zone set to level 255 ramps its bed up at the configured rate, and the same rate at 60 fps and at 120 fps; leaving the zone ramps the bed to 0 over the same time (no cut). A zone whose target is under the gate plays nothing.

## 1. Mechanism

The donor's sound engine has three parts that matter here. Only the first is the ambience-bed mechanism; the other two are the voice pool and the music track.

Ambience beds (S_UpdateAmbientSounds, 664-711, called once per S_Update at 737):
- The listener's BSP leaf is found from its position (`Mod_PointInLeaf`, 679; not read). Each leaf stores four bytes, one per ambience kind (water, sky, slime, lava; `bspfile.h` 204-209, 224). Those bytes are the zone data.
- If there is no leaf, or the `ambient_level` cvar is 0, every ambient channel's sound is set to NULL and the function returns (679-684). That is a hard cut: no ramp.
- Otherwise, for each of the four channels (686-709): the channel's sound is set to the precached bed for that kind (689; only water and sky have one, 237-238). The target volume is `ambient_level` (0.3, cvar at 78) times the leaf byte (691). A target under 8 becomes 0 (692-693, constant on line 692). Then the volume moves toward the target by `host_frametime x ambient_fade` per call (ambient_fade 100, cvar at 79): up at 698, down at 704, and it is clamped to the target on arrival. Both channels of the bed get the same volume (leftvol = rightvol = master_vol, 709). Beds are not spatialised.
- Result: the bed for a zone rises as the listener enters it and falls as the listener leaves; two zones with different levels blend over the ramp time, not over a distance.

Voice pool (SND_PickChannel, 354-391; S_StartSound, 451-517):
- Channels 0-3 are the ambient beds; 4-11 are the eight dynamic voices (MAX_DYNAMIC_CHANNELS 8, sound.h 131); the rest are static sounds up to 128 in total (sound.h 130, 134, 136-137; S_StaticSound checks 628).
- Pick order (SND_PickChannel): a channel already holding the same entity and entchannel (not channel 0) is taken at once (365-369). Otherwise the scan skips channels owned by the player when the new sound is from another entity (373-374). The victim is the channel with the least life left, `end - paintedtime` smallest (377-380). The victim is cut (388).
- S_StartSound then sets the volume `fvol x 255` (468), distance scale `attenuation / 1000` (478, clip nominal 1000 at 54), spatialises, and returns if both sides are 0 (484-485). If the sound plays, an identical sound that has not mixed yet gets a random start offset of up to 0.1 s (499-508).
- SND_Spatialize (398-444): the view entity is always full volume (406-411). Otherwise distance is the normalised distance times `dist_mult` (419); the side scales are 1 plus and 1 minus the dot product with the listener's right vector (430-431); each side is `master_vol x (1 - dist) x side` (435), floored at 0. The mixer clamps each side at 255 (snd_mix.c 353-356).

Music (cd_audio.c CDAudio_Play, 495-): one CD track at a time. Asking for the track already playing returns at once (509-510); a different track stops the current one (511), then plays at `bgmvolume x 255` (530). No fade, no layering. Lines 541-567 of CDAudio_Play were not read, and so is the music file-to-track mapping.

## 2. Key functions

- `S_UpdateAmbientSounds`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/snd_dma.c` 664-711. Leaf lookup and cut (679-684), per-kind target and gate (689-693), ramp (696-706).
- `S_Update` (ambient call and static merge): `/mnt/frankendom-donors/id-Software-Quake/WinQuake/snd_dma.c` 721-808. Ambient update (737); static channels with the same sound are merged into one mixed voice (752-786).
- `SND_PickChannel`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/snd_dma.c` 354-391. Same-entity override (365-369), player-owned protection (373-374), least-life steal (377-388).
- `S_StartSound`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/snd_dma.c` 451-517. Pick (471), spatialise (476-482), audible test (484-485), identical-sound offset (499-510).
- `SND_Spatialize`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/snd_dma.c` 398-444. View entity (406-411), distance and panning (419-449).
- `CDAudio_Play`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/cd_audio.c` 495-567. Same-track return (509-510), stop-then-play (511).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Per-zone ambience level, times a global level, gated, ramped at a fixed rate per second | Four kinds (bspfile.h 209). Level byte 0-255 per leaf (bspfile.h 224). Global `ambient_level` 0.3 (snd_dma.c 78). Gate under 8 (692). Ramp `ambient_fade` 100 per second (79; applied at 698 and 704) |
| Blend by time, not by distance: old bed ramps down while the new one ramps up | No distance term in the bed code; the bed reads only the leaf the listener is in (679) |
| Dynamic voice pool with a steal of the voice that ends soonest | 8 dynamic voices (sound.h 131), 128 total (sound.h 134). Steal = least `end - paintedtime` (377) |
| Same sound stacked in one tic: small random offset | Up to 0.1 s of the sample rate (508) |
| Distance falloff over a nominal clip distance | Nominal clip 1000 (snd_dma.c 54); attenuation divided by it (478); static sounds use attenuation / 64 (650) |
| Stereo from the listener's right vector | Side scales 1 plus and 1 minus the dot product (430-431) |
| Music: same track is a no-op | cd_audio.c 509-510 |

## 4. TypeScript sketch

simplified: keeps the donor's bed mechanism (zone level times a global level, a silent gate under a threshold, a rate-limited ramp per second of frame time, one bed per kind, non-positional) but keeps the volume as a float, rounds only for output, and drops the hard cut: a listener with no zone is given level 0 by the caller, so the bed ramps out. It omits the leaf lookup, the voice pool and the static merge, the donor's `ambient_level == 0` shortcut (replaced by the same ramp), and the mixer. The voice steal that the donor does first (SND_PickChannel) is not in this sketch.

```ts
// Licence: GPL-2.0-or-later (sound.h and snd_dma.c headers; gnu.txt is GPL v2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface AmbientBed {
  kind: string;     // one bed per ambience kind (water, sky, slime, lava)
  level: number;    // zone data: 0-255 for the zone the listener is in, 0 when outside any zone
  volume: number;   // current volume, kept as a float so small per-frame steps are not lost
}

interface BedTuning {
  levelScale: number;  // engine constant: donor's ambient_level cvar (0.3)
  gateBelow: number;   // engine constant: targets under this are silent (donor: 8, on the 0-255 scale)
  rampPerSec: number;  // engine constant: volume units per second (donor: ambient_fade 100)
}

// One step of one bed. dt is seconds since the last frame. Returns the volume to mix this frame, 0-255.
function stepBed(bed: AmbientBed, t: BedTuning, dt: number): number {
  let target = bed.level * t.levelScale;
  if (target < t.gateBelow) target = 0;

  const step = t.rampPerSec * dt;
  if (bed.volume < target) {
    bed.volume = Math.min(target, bed.volume + step);   // rise at the ramp rate, never past the target
  } else if (bed.volume > target) {
    bed.volume = Math.max(target, bed.volume - step);   // fall at the same rate
  }
  return Math.round(bed.volume);
}

// Steps every bed. Beds are non-positional: the same volume on both channels.
function stepBeds(beds: AmbientBed[], t: BedTuning, dt: number): number[] {
  return beds.map(b => stepBed(b, t, dt));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/sfx-ambience.ts` (new, client-side only: zone ambience levels are zone data, the bed ramp runs in the client, nothing here touches a kill). Parity-checklist row 12 (combat sound cues) is the nearest sound row in the addendum; no row covers ambience, so Lead should decide whether this needs its own row.
- Today: no Frankendom code path is mapped here; the target is new.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: rule 1 (one engine, two clients; zones as data); rule 8 (named target and parity row)

## 6. Gaps and risks

- Integer ramp. `master_vol` is an `int` (sound.h 79) and `host_frametime` is a `double` (quakedef.h 299). `chan->master_vol += host_frametime * ambient_fade.value` (698) stores back into an int, so the step is truncated each frame. When the step is under 1 unit (frame time under 0.01 s at the default fade of 100, that is above 100 fps), the rise adds nothing and the bed never comes up. The fall always moves at least 1 unit per frame. The rise rate is also quantised to whole units per frame. Fix: keep the volume as a float (the sketch does); round only for output.
- Hard cut out of a zone. When there is no leaf or the cvar is 0, the function sets every ambient channel's sound to NULL and returns (679-684). The volume is left where it was and the bed stops at once. Fix: target 0 and ramp out (the sketch does).
- Slime and lava beds are dead. The levels exist per leaf (bspfile.h 207 names the kinds; 224 holds the bytes), but only water and sky are precached and assigned (snd_dma.c 237-238). Grep found no other assignment to `ambient_sfx`. A zone with slime or lava level plays nothing for those kinds. Fix: either precache the two beds or drop those bytes from the zone data.
- Stale layout comment. The comment in `sound.h` 135-137 puts the normal entity sounds at 0 to MAX_DYNAMIC_CHANNELS-1 and the ambient beds after them. The code uses the other order: beds at 0-3 (snd_dma.c 686-689), dynamic voices at 4-11 (SND_PickChannel 363), statics from 12 (S_Update 754). The code is consistent; only the comment is wrong. Fix: correct the comment when the layout is copied.
- Voice steal can cut a voice for a silent sound. SND_PickChannel cuts its victim (388) before S_StartSound tests audibility (484-485). A cue that is out of range still kills a live voice and then plays nothing. Fix: compute the volumes first, then pick a channel only if the sound is audible.
- Static merge end test. The search for an earlier static voice with the same sound ends with `if (j == total_channels)` (770). The loop stops at `j == i`, so the test never fires. The effect is benign: no merge, and the channel stays audible. Fix: compare with `i`.
- Panning overshoot. The right side is `1 + dot` (430) and can reach twice the master volume, which the mixer clamps at 255 (snd_mix.c 353-356). Minor; a loud near sound on one side loses balance at the clamp. Fix only if it is audible in play.
- Frankendom gaps: no per-zone crossfade between two different zones' beds beyond the ramp (there is no distance blend); no layering of music; no stingers; no hit or spell sound logic in these files (the server or progs side that calls S_StartSound was not read).
- Music here is one track at a time with an instant cut (cd_audio.c 511). Lines 541-567 were not read.
- Not read: Mod_PointInLeaf, the map compiler that writes leaf levels, the mixer loop, and the server call sites.
- The gate constant 8 (692) has no receipt: the line holds only `if (vol < 8)`, shorter than the 15-character minimum.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: rule 1 (one engine, two clients; zones as data); rule 8 (named target and parity row)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: All checked claims hold: S_UpdateAmbientSounds 664-711 (leaf cut when no leaf or ambient_level 0, vol<8 gate, ramp host_frametime*ambient_fade, clamp on arrival, leftvol=rightvol), cvars ambient_level 0.3 / ambient_fade 100 (78-79), only water and sky precached (237-238), master_vol is int (sound.h:79) so the compound assignment truncates the sum and the rise stalls when step <1 (>100 fps) while the fall always moves, host_frametime double (quakedef.h:299), SND_PickChannel order and player-protect skip, SND_Spatialize 1+/-dot and floor at 0, mixer clamp 255 (snd_mix.c 353-356), S_StartSound identical-sound 0.1 s offset, static merge 'j == total_channels' never true (benign), S_StaticSound attenuation/64, sound.h comment vs code layout (beds 0-3, dynamic 4-11), CDAudio_Play same-track no-op and stop-then-play, bgmvolume*255, GPL v2-or-later header. Not-read list honest.
Missed: Minor omissions: S_UpdateAmbientSounds also returns early on !snd_ambient and !cl.worldmodel; SND_Spatialize has a mono path (lscale=rscale=1); SND_PickChannel entchannel == -1 matches any channel of the entity; S_StaticSound rejects non-looping sounds; CDAudio_Play remaps the track via remap[] and requires cd.valid.
