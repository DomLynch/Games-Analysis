# alexbatalov-fallout1-ce (sound-music, cell 1)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/gsound.cc` | Licence: Sustainable Use License 1.0 (LICENSE.md, "Version 1.0"; not an OSI licence; use limited to internal business, non-commercial or personal use, and distribution only free of charge for non-commercial purposes) | C++ | symbol `gsound_load_sound`

Checked: The cell's hint file `src/int/support/intextra.cc` is a script-op wrapper (op_play_sfx 243-247, op_reg_anim_play_sfx 3564-3576, op_sfx_build_ambient/weapon_name 3627-3670), so the real code is in `src/game/gsound.cc`. Read in full or in the stated ranges: gsound.cc 1-168 (constants and the effect-type tables), 329, 357, 513-600, 632-790, 824-840, 1158-1290, 1355-1398, 1400-1560, 1747-1751, 1977-2003, 2073-2140; `src/game/actions.cc` 586-626 (one caller of the weapon names); `src/game/anim.cc` 1330-1360 (register_object_play_sfx); `src/plib/gnw/rect.cc` 220-250; `src/game/sfxcache.h` 1-30; `src/int/sound.cc` 481-560 and 711-760 (soundAllocate, soundPlay); `src/game/worldmap.cc` 531-570 (table; entries 571-598 counted by awk) and 3743-3756; `src/game/map.cc` 870-935. Grep only (not read in full): gsound.cc 319-320 and 1630, int/sound.cc 864 and 1314 (callback fire points), gmovie.cc 135, loadsave.cc 1511. Not read: the sound-manager callback bodies, the ambient one-shot scheduling (it lives in map scripts as compiled bytecode), the animation delay value `v17` (actions.cc 618), `stat_level`, `obj_dist`, and `item_w_sound_id`. Callers: register_object_play_sfx has many callers (actions.cc, inventry.cc, protinst.cc, intface.cc); only actions.cc 586-626 was read as a caller. gsound_background_play callers were listed by grep (map.cc 925, worldmap.cc 3749, main.cc 110, endgame.cc, gdialog.cc 887). Confidence: high on the voice pool, the cue-name grammar and the distance volume (all read end to end); medium on the cue's queue-time versus play-time order (v17 not read). Spell sounds: none searched; Fallout 1 has no spell system in the code read. camera_scope: not a camera topic.

## 1. Mechanism

Sound here is a client-side reaction to combat events. The engine never waits on it. Four pieces matter.

(a) Cue names are built, then queued on the attacker's animation timeline. When an attack resolves, `actions.cc` builds an attack cue name from the weapon and hit mode (597-598) for armed attacks; unarmed punch and kick use a character-sound builder instead (`gsnd_build_character_sfx_name`, 600 and 612). The hit cue is built and queued only on the hit path (`attackerFlags & 0x0300`, 607-618); on a miss the attack cue is queued with delay -1 (621-623). The rest of this note describes the armed-weapon hit path. The attack cue ignores the target: only an effect of type 'H' reads the target material (see (e)). It then builds a hit cue from the same weapon with the defender as target (610) and queues it on the attacker with a delay `v17` (618; value not read).

(b) Queuing claims a voice and fixes the volume. `register_object_play_sfx` (anim.cc 1330) computes the volume from distance at queue time (`gsound_compute_relative_volume`) and loads the file at once (1343). If the load returns NULL, the animation step becomes a no-op (1347, 1350). No retry and no fallback cue. If it loads, the step's callback is `gsnd_anim_sound` (1345), which calls `soundPlay` when the animation reaches that step.

(c) The voice pool is four first-come slots with refusal. `gsound_load_sound` (1158) returns NULL first if sfx is disabled, then if the active-effect counter is already at `SOUND_EFFECTS_MAX_COUNT` = 4 (1172; sfxcache.h:8). There is no queue, no priority and no stealing. Otherwise it allocates a sound (`gsound_get_sound_ready_for_effect`, 2087, `soundAllocate(5, 10)`), increments the counter (1189), and builds the path `sound\sfx\NAME.ACM` (1192). If the file is missing it tries aliases: for critter cues beginning H or N, a gender alias (HA resolves to HF or HM by stat; HF falls back to HM), and for MALIEU/MAMTN2 an alias to MAMTNT. On total failure it decrements (1263), deletes the sound and returns NULL. Release: the effect callback decrements when it receives 1 (1749-1750); the sound manager fires that callback with 1 at int/sound.cc:864 (context not read); `gsound_delete_sfx` also decrements (1311). Net effect: a voice is held from queue time until the sound ends, so a cue that is queued but waiting out its delay holds a voice.

(d) Distance volume is applied only off-screen. `gsound_compute_relative_volume` (1355-1398) starts at 0x7FFF. It only changes the value for object types 0, 1 and 2 (enum not read), and only when the object's bound does not intersect the viewport: `rect_inside_bound` returns -1 when there is no intersection (rect.cc 222), checked at gsound.cc 1380. Then, with distance d from the player (obj_dist) and P = the player's Perception stat (1382): d <= P gives 0x7FFF; P < d < 2P (1384) gives 0x7FFF - 0x5554 * (d - P) / P (1385), integer math; d >= 2P gives 0x2AAA (1387). On-screen objects always get full volume. At load the value is scaled by the sfx volume setting (1280).

(e) The hit cue is named by weapon and by target material. `gsnd_build_weapon_sfx_name` (1453-1526) builds "W" + effect letter + weapon sound id + hit-mode digit + material letter + "XX" + "1" (1522). The effect letter comes from the `snd_lookup_weapon_type` table (R ready, A attack, O out of ammo, F firing, H hit). Hit-mode digit: 1 for the primary attack modes and punch, 2 otherwise; ready and out-of-ammo always 1. Material letter: X when the effect is not a hit, there is no target, or the damage type is explosion, plasma or EMP (1479-1480). For a hit, the target's proto material picks the letter: metal, glass, plastic give M (1506); wood gives W (1509); dirt, stone, cement give S (1514); anything else gives F (1517). Creature targets have no material in the donor's switch, so they get F.

(f) Background music is one track, hard-cut, with a fade path that is compiled in and switched off. `gsound_background_play` (632) stops the current track first (653), allocates a sound on stereo channel 3 (677), loads from the music path, loops when the loop code is 16 (`gsound_background_play_level_music` (784) passes 14 and 16), sets the callback and starts it (`gsound_background_start`, 1977). Start sets volume to background_volume x 0.94 (1989). A 2000 ms fade exists in two places: stop fades the old track to 0 (828) and start fades the new one in from volume 1 (1985-1987). Both are gated by `gsound_background_fade` (83). That flag is set only by `gsound_background_fade_set` (574), and the only calls in the donor pass 0 (329, 357). So the crossfade is never switched on in this donor.

(g) Music per map, and one wind bed. `CityMusic[MAP_COUNT]` (worldmap.cc 531-598) names one track per map: 66 entries counted from the table. `PlayCityMapMusic` (3743-3752) looks the map up and calls `gsound_background_play_level_music(name, 12)` (3749). `map_load_idx` (900-913) calls `map_load` (911) and then `PlayCityMapMusic` (913). `map_load_file` starts a looped "wind2" bed as a loading sound (map.cc 925). On the map_load_idx path, the city track replaces the wind bed because each play stops the previous track first (653). The donor therefore has one track per map and no per-biome ambience bed.

(h) Layering and what is missing. Three lanes run at once and do not share a limit: background music (one track, channel 3), speech (one tag, its own counter), and effects (mono, four voices). Inside gsound.cc nothing lowers music for speech lines (background volume is written only in the setter 513-554 and config load 319-320), but the dialogue screen does: `gdialog.cc` 824-829 halves the music volume when a dialogue opens without a talking head and stops the track when there is a head; 886-889 restores the volume or restarts the track. Background pauses for movies (gmovie.cc 135) and save or load (loadsave.cc 1511). No stingers were found (grep for fanfare, jingle and stinger: no hits). No priority levels exist: the only rule is first-come, refuse when full.

Tick: none in the cue path. Effects are started by the animation system (anim.cc callbacks). `gsound_bkg_proc` (gsound.cc 1630-1632) calls `soundUpdate`; who registers it was not read.

## 2. Key functions

- `gsound_load_sound`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/gsound.cc` 1158-1273 (voice cap, file load, aliases, refund). Next function starts at 1275.
- `gsound_get_sound_ready_for_effect`: same file, 2083-2140 (soundAllocate(5, 10), file IO, end callback, volume).
- `gsound_internal_effect_callback`: same file, 1747-1751 (release on end).
- `gsound_compute_relative_volume`: same file, 1355-1398 (off-screen distance falloff).
- `gsnd_build_weapon_sfx_name`: same file, 1453-1526 (cue name grammar, material letter).
- `register_object_play_sfx`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/anim.cc` 1330-1353 (queue-time load and no-op fallback).
- Attack and hit scheduling: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/actions.cc` 586-626.
- Background: `gsound_background_play` 632-783, `gsound_background_stop` 824-838, `gsound_background_start` 1977-2003 (same gsound.cc).
- City music: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/worldmap.cc` 531-598 (table), 3743-3752 (PlayCityMapMusic). Map load: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/map.cc` 900-925.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed voice pool, refuse when full, claim on load, release on end | 4 voices (sfxcache.h:8); +1 at gsound.cc:1189; -1 at 1750 |
| Off-screen falloff: full inside radius P, slope to 2P, floor after | Full 0x7FFF; slope 0x5554 (2/3 of full, gsound.cc:1385); floor 0x2AAA (1/3, gsound.cc:1387); radius = Perception stat (1382) |
| Viewport test as the switch for distance volume | rect_inside_bound == -1 means no intersection (rect.cc:222; gsound.cc:1380) |
| Hit cue named by weapon, hit mode and target material | Material letters M, W, S, F, X (gsound.cc:1506, 1509, 1514, 1517, 1480) |
| Track fade in and out over a fixed time | 2000 ms (gsound.cc:828, 1987), gated by a flag that is always 0 (83, 329, 357) |
| Background level scaling | x 0.94 (gsound.cc:1989) |
| One loop per map as a load bed | "wind2" (map.cc:925) |
| Per-map track table | 66 entries (worldmap.cc:531-598) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's cue-name grammar (weapon id, hit mode, material letter, X for attacks, explosions and no target), the off-screen distance falloff (full inside P, slope to 2P, floor at 1/3) and the four-voice pool. It changes three things: (1) it adds a priority and steals the lowest-priority voice when the pool is full, where the donor refuses; (2) it claims a voice at play time, where the donor claims it when the animation is queued; (3) it uses float math instead of the donor's integer division, and it takes the on-screen flag from the caller instead of calling a viewport test. It omits the sfx volume setting, the alias file lookups, the speech and background channels, the 2000 ms fade and the callback plumbing. Weapon ids are strings here; the donor uses one character.

```ts
// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room sketch written from the described mechanism, not a translation of the donor.

// Off-screen cue volume by distance vs perception (donor: full volume on screen; falloff beyond the viewport).
// Full scale = 1.0. Donor: 0x7FFF full, falls by 2/3 over [P, 2P], floor 1/3 (0x2AAA) from 2P on.
const FULL = 1.0;
const FLOOR = 1 / 3;
const FALLOFF = FULL - FLOOR;

function cueVolume(distance: number, radius: number, onScreen: boolean): number {
  if (onScreen || distance <= radius) return FULL;
  if (distance < 2 * radius) return FULL - (FALLOFF * (distance - radius)) / radius;
  return FLOOR;
}

interface Cue {
  id: string;
  priority: number; // higher wins a voice
  volume: number;
  stop: () => void;
}

// Donor: a fixed pool of 4 voices, refuse when full, no priority, no stealing.
// Fix: when full, steal the lowest-priority live cue if the new one outranks it.
class CuePool {
  private live: Cue[] = [];

  constructor(private readonly cap: number = 4) {}

  // Claim at play time, not at schedule time (donor claims when the animation is queued).
  request(cue: Cue): boolean {
    if (this.live.length < this.cap) {
      this.live.push(cue);
      return true;
    }
    let low = 0;
    for (let i = 1; i < this.live.length; i++) {
      if (this.live[i].priority < this.live[low].priority) low = i;
    }
    if (this.live[low].priority >= cue.priority) return false;
    this.live[low].stop();
    this.live.splice(low, 1);
    this.live.push(cue);
    return true;
  }

  release(id: string): void {
    this.live = this.live.filter((c) => c.id !== id);
  }

  count(): number {
    return this.live.length;
  }
}

// Donor weapon cue name: "W" + effect + weapon sound id + hit mode + material + "XX" + "1".
// Material comes from the target only for a hit; explosions and no-target use X.
type Material = "metal" | "wood" | "stone" | "flesh" | "none";
const MATERIAL_CODE: Record<Material, string> = { metal: "M", wood: "W", stone: "S", flesh: "F", none: "X" };

function hitCueId(effect: "A" | "H", weaponSoundId: string, hitMode: 1 | 2, target: Material): string {
  const material: Material = effect === "H" ? target : "none";
  return `W${effect}${weaponSoundId}${hitMode}${MATERIAL_CODE[material]}XX1`;
}

// Demo: four voices are busy with ambient cues, a player hit (priority 9) still plays.
const pool = new CuePool(4);
for (let i = 0; i < 4; i++) {
  pool.request({ id: `amb${i}`, priority: 1, volume: cueVolume(10, 8, false), stop: () => {} });
}
const playerHit = pool.request({ id: "hero-hit", priority: 9, volume: FULL, stop: () => {} });
const name = hitCueId("H", "1", 1, "metal");
const cnt = pool.count();

export { playerHit, name, cnt, cueVolume };
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/sm009-fallout1-sound-cues.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (new client module; sound is client-only): the cue pool with priority, the off-screen distance volume as zone-data radius, and the hit cue named from the target's catalogue material. Parity-checklist row 12 (combat sound cues). Note: the cell hint said row 14, but row 14 is HUD in the addendum, so row 12 is used.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0 is restricted: clean-room, shape only)
- Brief rule served: 1 (one engine; the cues react to engine hit events, which stay server-verified; the cue layer is never a server decision)

## 6. Gaps and risks

- Restricted licence (Sustainable Use License 1.0): clean-room only. The sketch is written from the mechanism and copies no donor code.
- The donor refuses a cue silently when the pool is full (gsound.cc:1172) and when a load fails (anim.cc:1347). For Frankendom a player's own hit cue must never vanish. Fix: priority plus steal (in the sketch).
- The voice is claimed at queue time, so a queued hit holds a voice until it plays. The donor's cancel path was not read. Fix: claim at play time and release on cancel; test the cancel.
- The distance rule uses the viewport as its switch. Frankendom's Pit is a fixed camera (every cue on screen, so full volume), and the zones use a third-person camera, so the radius must be zone data and the on-screen test must come from the camera, not the donor's viewport.
- The donor's integer falloff truncates. The sketch uses floats. This does not change the shape.
- Dialogue ducks the music (halve, or stop and restart) in gdialog.cc, so Frankendom can lower music under talk as a data flag rather than invent it.
- The crossfade is dead code in this donor. Do not cite it as a shipped feature. For zone borders, the 2000 ms out-then-in shape is a design idea only, with no evidence from this donor that it was ever played.
- Per-map music is a hard cut (gsound.cc:653). Frankendom should choose hard cut or crossfade per zone as data.
- Cue names use fixed 8.3 filenames in the donor (one-character codes). Frankendom reads the material from the catalogue (row 21), not from a file grammar.

Best transferable idea: keep a small fixed voice pool, but let the player's own hit outrank ambient and enemy cues, and name the hit cue from the target's material.
Decision (proposed): adapt — keep the four-voice pool shape and the off-screen distance falloff, add priority and steal, claim at play time, and never refuse a player cue; the donor's silent refusal is the defect we fix.
Acceptance: In a three-attacker fight with four ambient voices busy, the player's own hit cue still plays (the lowest-priority ambient cue is stopped), and a unit test asserts that a cue cancelled before it plays gives its voice back.

Reuse tag: rewrite-from-idea (restricted licence; clean-room only)
Brief rule served: 1


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: 1) Sec 1(h) 'Background volume is not lowered during speech / no ducking' is too strong: gdialog.cc 824-829 halves the music volume when a dialogue opens without a talking head (gsound_background_volume_get_set(gDialogMusicVol/2)) and stops the track when there is a head; gdialog.cc 886-889 restores it. The note's claim is true only inside gsound.cc and in the speech path it read; it lists gdialog.cc:887 as a play caller but did not read it. 2) Sec 1(a): the attack cue is only built via gsnd_build_weapon_sfx_name for non-punch/kick (actions.cc 597-601); unarmed punch/kick use gsnd_build_character_sfx_name (600, 612). The hit cue is built and queued only on the hit path (attackerFlags & 0x0300, 607-618); the miss path queues the attack cue with delay -1 (621-623). Note describes only the armed-weapon, hit path. All other sampled lines matched: gsound_load_sound 1158-1272 (cap 1172, counter 1189, alias 1203-1243 and 1247, decrement 1263), callback decrement 1749-1750, delete_sfx 1311, get_sound_ready 2083-2138 (soundAllocate(5,10)), relative volume 1355-1398 (0x7FFF, 0x5554, 0x2AAA, perception, rect check 1380), name builder 1453-1525 (hit-mode digit, X rule, M/W/S/F, format 1522), register_object_play_sfx 1330-1353, bg play 653/677/784, fade flag 83 and set only with 0 at 329/357, fade 2000 ms at 828/1987, x0.94 at 1989, CityMusic 531-598 = 66 entries, PlayCityMapMusic 3743-3752, map_load_idx 911-913, wind2 at map.cc 925, gmovie 135 / loadsave 1511 pauses, SOUND_EFFECTS_MAX_COUNT 4 (sfxcache.h 8), licence text.
Missed: gdialog.cc 824-829 / 886-890 music halving and restore around dialogue (see error 1). Also the sfx cache independently caps open files at SOUND_EFFECTS_MAX_COUNT (sfxcache.cc 156, 402), a second limit besides the gsound counter. loadsave.cc has several unpause paths (1535-1583), relevant to the pause claim but consistent.

Fixed 2026-10-12 (Sonnet fixer): (1) corrected the no-ducking claim: gdialog.cc 824-829 and 886-889 halve or stop the music around dialogue, added to gaps. (2) Sec 1(a) now says the weapon cue builder is armed-only, unarmed uses the character builder, and the hit cue is queued only on the hit path (miss queues the attack cue with delay -1). Also found: the sfx cache has its own cap of SOUND_EFFECTS_MAX_COUNT open files (sfxcache.cc 156, 402), a second limit beside the gsound counter. Both errors verified over ssh; sketch unchanged.
