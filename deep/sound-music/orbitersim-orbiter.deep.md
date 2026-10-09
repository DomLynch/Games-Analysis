# orbitersim-orbiter (sound-music, cell 15)

Donor: /mnt/frankendom-donors/orbitersim-orbiter/Sound/XRSound/src/VesselXRSoundEngine.cpp | Licence: MIT | C++ | symbol VesselXRSoundEngine::FadeVolumeForDistanceAndPressure

## 1. Mechanism
- For each external sound of a vessel, FadeVolumeForDistanceAndPressure(volume, maxLoudnessDistance) scales the sound's volume (0 to 1) by the camera's distance and the air pressure. The max-loudness distance is per playback type (`switch` at 246-280): far 125 m, medium 50 m and close 20 m use the distance-and-pressure fade; wind uses the pressure fade only; internal-only is silent outside the cockpit; radio needs focus; global is not faded. (The code comment at line 380 says the sound is half as loud per distance, but the code is inverse square.)
- Inside the cockpit view nothing changes. Otherwise, if the vessel is in atmosphere or the silence-of-space option is off, the fade runs. If the vessel is in vacuum with silence-of-space on, the volume is zero.
- Distance: the camera distance is taken, with zero replaced by 0.1 to avoid divide-by-zero. Beyond the max-loudness distance, the volume becomes volume times D squared over d squared (inverse square). It is never raised above the input.
- Pressure: FadeVolumeForPressure does nothing when silence-of-space is off. Otherwise the volume is multiplied by the static pressure over one-tenth of standard pressure (101325 over 10), capped at the volume it was given, which is the distance-faded volume (not the original base volume).
- Floor: after the two steps, a volume below 0.04 becomes zero.
- Inputs: base volume, max-loudness distance, camera distance, cockpit flag, atmosphere flag, vessel pressure, silence-of-space option. Output: the adjusted volume. Runs per sound per update.

## 2. Key functions
- VesselXRSoundEngine::FadeVolumeForDistanceAndPressure (Orbiter) | /mnt/frankendom-donors/orbitersim-orbiter/Sound/XRSound/src/VesselXRSoundEngine.cpp | 372-409 | cockpit and vacuum gates, inverse-square distance fade, pressure, floor.
- VesselXRSoundEngine::FadeVolumeForPressure (Orbiter) | /mnt/frankendom-donors/orbitersim-orbiter/Sound/XRSound/src/VesselXRSoundEngine.cpp | 414-433 | scales volume by atmosphere pressure relative to one-tenth standard.
- Call sites (Orbiter) | /mnt/frankendom-donors/orbitersim-orbiter/Sound/XRSound/src/VesselXRSoundEngine.cpp | 258-272 | per sound class: distances 125, 50, 20.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Inverse-square falloff referenced to a loudness distance, never louder than the source | per-class loudness distances 125, 50, 20 metres (lines 259, 263, 267) (theirs) |
| Zero-distance guard | minimum distance 0.1 (line 383) (theirs) |
| Scale by a medium property (pressure) relative to a reference | reference 101325 over 10 Pa (line 426; the comment says 1 atm was too quiet in the upper atmosphere) (theirs) |
| Cut below a floor so distant sounds stop | floor 0.04 (line 401) (theirs) |
| Silence in a medium that carries no sound | silence-of-space option (theirs) |

## 4. TypeScript sketch
simplified: the playback-type switch (internal-only, radio, wind, global) is omitted, and the pressure fade reads the vessel's static pressure through `GetAtmPressure` where the sketch takes `pressurePa` (the donor skips it if the vessel is null); the donor's camera distance falls back to 10 when the vessel is gone (436-440).

```ts
// Licence: MIT (orbitersim-orbiter). Sketch written from the mechanism; donor path cited above.
// Returns the adjusted volume for one sound, 0 to 1.
type Env = { inCockpit: boolean; inAtmosphere: boolean; cameraDist: number; pressurePa: number; silenceOfSpace: boolean };
const FLOOR = 0.04;        // cut-off (theirs)
const MIN_DIST = 0.1;      // zero-distance guard (theirs)
const REF_PA = 101325 / 10; // reference pressure (theirs)

function fadeVolume(vol: number, maxLoudDist: number, e: Env): number {
  if (e.inCockpit) return vol;                              // inside: no change
  if (!e.inAtmosphere && e.silenceOfSpace) return 0;        // vacuum with the silence option: silent
  let v = vol;
  const d = e.cameraDist === 0 ? MIN_DIST : e.cameraDist;
  if (d > maxLoudDist) {
    v = Math.min(v, (v * maxLoudDist * maxLoudDist) / (d * d));   // inverse square, never louder
  }
  if (e.silenceOfSpace) {
    v = Math.min(v, v * (e.pressurePa / REF_PA));            // thin air is quieter; cap at the distance-faded volume
  }
  return v < FLOOR ? 0 : v;
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (distance-fade rule for positional cues, per-cue loudness distance as data). The atmosphere branch has no Frankendom equivalent.
- Parity row: 12 (combat sound cues); the camera distance comes from row 11 (fight camera).
- Reuse tag: adapt (MIT)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Space-flight sound. The pressure branch is for atmospheres and does not apply to a fight arena unless it has a medium rule.
- The reference distances are per sound class and theirs; Frankendom picks its own, as data.
- Inverse-square with a floor is the reusable part; check the feel against the fight's loudest cues.
- Cockpit (first-person) gate has no Frankendom equivalent unless the fight has a first-person view.
- Audio is a client consumer of the one fight state; per-cue loudness distances are zone or catalogue data with a default (zones as data).
