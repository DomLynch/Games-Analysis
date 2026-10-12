# OpenGothic (sound-music, cell 2)

Donor: `/mnt/frankendom-donors/OpenGothic/common/world/worldsound.cpp` (zone and mode selection, emitters) with `/mnt/frankendom-donors/OpenGothic/common/gamemusic.cpp` (theme hand-off and transitions) and `/mnt/frankendom-donors/OpenGothic/common/dmusic/mixer.cpp` (pattern switch) | Licence: MIT (root LICENSE, "Copyright (c) 2019 Try"; no separate licence header in these files) | C++ | symbols `WorldSound::tickSoundZone`, `WorldSound::setMusic`, `GameMusic::setMusic`, `OpenGothicMusicProvider::updateTheme`, `WorldSound::tick`

Checked: The list's hint file `common/gamemusic.h` is the interface (55 lines: `Tags` Day/Ngt, Std/Fgt/Thr; `setMusic` overloads). It was opened. The implementation is in `common/gamemusic.cpp` (413 lines, read in full) and the selection in `common/world/worldsound.cpp` (read lines 52-70, 78-130, 160-260, 281-345 and the emitter parts). The pattern switch is in `common/dmusic/mixer.cpp` (read 16-80, 160-200, 250-300). Also read: `common/game/gamesession.cpp` 305-320 and `gamesession.h` 101 (tick unit), `common/world/world.cpp` 376-384 (caller), `common/world/worldobjects.cpp` 442-459 (what "targeted" means), `common/mainwindow.cpp` 900-922 (frame dt). Confidence: high on the zone/mode selection, the transition choice and the emitter model, all read end to end. Medium on the mixer: I read the switch points but did not trace what the mixer plays when a theme has no pattern for the requested embellishment (mixer.cpp 174-185 keeps the old `pattern` value; not traced, "(not read)"). Not read: the theme parameters (`Gothic::musicDef()` entries, file, volume, transition type, which come from the game's script data, not in the box), `soundOclusion` in the physics code, the GothicKit provider beyond its update path, and the tinysoundfont synthesis code. camera_scope: not applicable (sound topic).

## 1. Mechanism

- Music is a theme per (zone, daytime, fight mode). The theme name is built as `zone_DAY|NGT_STD|FGT|THR` (worldsound.cpp 332, `string_frm name(zone,'_',(isDay ? "DAY" : "NGT"),'_',smode);`). The theme data is looked up in the game's music definitions by that name (not read).
- Daytime: day is 04:00 to 21:00 inclusive (worldsound.cpp 241). Fight mode: `isFgt = owner.isTargeted(player) || player.isDead()` (242). If fight is set and the player has no weapon drawn, mode is THR; with a weapon drawn it is FGT; otherwise STD (244-250, the weapon test at 246).
- "Targeted" (worldobjects.cpp 451-459): some NPC has the player as its target, is in AI-normal policy, is armed, and is attacking. A dead player also counts as fight (242).
- Zone (worldsound.cpp 229-237): keep the current zone while the player is still inside it (230-231); otherwise scan all zones and take the last one that contains the player (233-237, there is no `break`). Falls back to the world's default zone (229, `def`).
- Re-evaluation is throttled: `tickSoundZone` returns early until `nextSoundUpdate` (225-226) and then sets it to `tickCount() + 5*1000` (227). `tickCount` is in milliseconds at normal speed (gamesession.h 101 `timeMul = 1000`; gamesession.cpp 309-313 divides by 1000 after multiplying by timeMul, so at 1000 the division returns the ms value). So a change of fight state is noticed within about 5 s of game time.
- No change means no work: if zone and tags are unchanged the function returns (254-255).
- Fallback chain (260-279): the zone then the default zone; for each, the night theme then the day theme; for each, the mode then the weaker mode (THR tries FGT, then STD; FGT and STD try STD). The first theme that exists is played (276-277). The zone tag is the zone name after its first underscore (270-273).
- Hand-off (gamemusic.cpp): `setMusic(theme, tags)` stores the theme and tags (118-122) and calls `playTheme`, which replaces any pending request (44-50; `pendingMusic` is overwritten, so the latest request wins). On the audio render callback, `updateTheme` takes the pending request once (53-66; take at 57-61).
- Transition choice (gamemusic.cpp 68-88): moving into STD from a fight gives a BREAK embellishment (74-77); moving into FGT from THR gives a FILL (78-81); moving into THR from FGT gives none (82-85). Other moves give none.
- OpenGothic provider (106-148): each render call takes the pending theme (111, 115-119), computes the effect (133), maps it to an embellishment (134, `computeEmbellishment`, 154-172) and calls `mix.setMusic(m, em)` (135). The mixer stores the next pattern and the embellishment (dmusic/mixer.cpp 33-39). On the next mix call it adopts the new theme (166-172), cuts the active notes when the embellishment is not NORMAL (191-194), picks the pattern whose embellishment matches (174-185), and moves to the next pattern as soon as a new theme is pending (295-296). So the switch happens on the next audio chunk, not on a bar line.
- The GothicKit provider (249-279) also reads the transition timing field (`theme.transsubtype`, measure, beat or instant: `computeEmbellishmentAndTiming`, 178-220, called at 261). The OpenGothic provider does not read that field.
- Emitters (`WorldSound::addSound` 87-113 and `tick` 160-212): each sound vob has a radius, a loop flag, an optional day-variant sound (start and end time, 99-110), and a random repeat delay (`random_delay`, `random_delay_var`, 92-93, converted to ms). After a play, the next allowed time is `tickCount + delay` plus `rand % delayVar` (199-202). Emitters only play while the listener is inside `radius + 800` (177 and `isInListenerRange` 340-343, squared-distance compare). The day or night variant is picked by the clock (184-188).
- Emitter gain: a non-ambient emitter inside `maxDist` is attenuated by occlusion from the physics; ambient emitters are never occluded (303-304 and 311-312, read in full). Gain is `occ * vol` (`setOcclusion` 52-55, `setVolume` 57-60).
- Frame order for one fight start: the world tick calls `wsound.tick(player)` (world.cpp 382); `WorldSound::tick` runs the emitter pass and then `tickSoundZone` (211); `tickSoundZone` returns early until the 5 s timer runs out; then it computes the new tags and the fallback chain; `GameMusic::setMusic` stores the theme; the next audio render takes it, picks the embellishment and cuts over.

## 2. Key functions

- `WorldSound::tickSoundZone`: `/mnt/frankendom-donors/OpenGothic/common/world/worldsound.cpp` 224-279. Throttle, zone pick, mode, fallback loop.
- `WorldSound::setMusic(zone, tags)`: `/mnt/frankendom-donors/OpenGothic/common/world/worldsound.cpp` 324-337. Theme name and hand-off.
- `GameMusic::setMusic(theme, tags)` and `MusicProvider::playTheme`: `/mnt/frankendom-donors/OpenGothic/common/gamemusic.cpp` 118-122 and 44-50.
- `MusicProvider::computeTransitionEffect`: `/mnt/frankendom-donors/OpenGothic/common/gamemusic.cpp` 68-88.
- `OpenGothicMusicProvider::updateTheme` and `renderSound`: `/mnt/frankendom-donors/OpenGothic/common/gamemusic.cpp` 106-148.
- `Mixer::setMusic`, the pattern adoption and the cut: `/mnt/frankendom-donors/OpenGothic/common/dmusic/mixer.cpp` 33-39, 164-196, 295-296.
- `WorldSound::tick` and `tickSlot`: `/mnt/frankendom-donors/OpenGothic/common/world/worldsound.cpp` 160-212, 281-316 (emitter pass and the per-slot removal and gain).
- Tick unit: `/mnt/frankendom-donors/OpenGothic/common/game/gamesession.cpp` 305-320 with `gamesession.h` 101.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Music state = (zone, daytime, fight mode), name-keyed theme table | Theme names `zone_DAY|NGT_STD|FGT|THR` (worldsound.cpp 332); zone tag is the text after the first `_` (270-273) |
| Fight mode from "engaged" plus "weapon drawn" (thr when no weapon) | Fight flag = targeted by an armed AI NPC or player dead (242, worldobjects.cpp 451-459) |
| Fallback chain, most specific first | zone, default zone; night, day; mode, weaker mode, std (260-279) |
| Embellishment on mode change (break into std, fill into fgt from thr) | BREAK, FILL, NONE (gamemusic.cpp 74-85) |
| Daytime window | 04:00 to 21:00 inclusive (worldsound.cpp 241) |
| Throttle for re-evaluation | 5 s, `5*1000` ms (worldsound.cpp 227) |
| Emitter repeat with random variance | Base delay from vob seconds x 1000; variance `rand % delayVar` (92-93, 199-202) |
| Emitter audibility radius | `radius + 800` units (worldsound.cpp 341) |
| Day/night emitter variant | Clock window from the vob (99-110, 184) |
| Zone change | Last matching zone wins; no break (233-237) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's selection shape: fight mode from engaged, dead and weapon state; the theme-name fallback chain; the mode-change embellishment table; a latest-wins hand-off to the audio side; and the emitter repeat, radius gate and day/night variant. It changes three things on purpose: (a) the mode is an input the caller sets when the engage state changes, so the caller re-evaluates on that event (the donor waits up to 5 s); (b) the hand-off takes the latest request at the next audio chunk, which is what the donor does, but the sketch does not model the mixer; (c) the emitter has no voice cap in either case, so the sketch also has none, and that gap is listed in section 6. It omits: the zone search (the sketch takes the zone name as input), occlusion, the GothicKit timing field, the actual theme data lookup (the caller passes `has(name)`), and the mixer's pattern choice.

```ts
// Licence: MIT (donor, root LICENSE, Copyright (c) 2019 Try). Shape adapted and rewritten here; no donor line is copied.
export type Mode = "std" | "fgt" | "thr";
export type Embellish = "none" | "fill" | "break";

// Fight state -> music mode. Engaged or dead: a drawn weapon is fgt, no weapon is thr. Otherwise std.
export function modeOf(engaged: boolean, dead: boolean, weaponDrawn: boolean): Mode {
  if (!engaged && !dead) return "std";
  return weaponDrawn ? "fgt" : "thr";
}

// Day runs from 04:00 to 21:00 inclusive (clock minutes from midnight).
export function isDay(clockMin: number): boolean {
  return clockMin >= 4 * 60 && clockMin <= 21 * 60;
}

// Theme names are zone_DAY|NGT_STD|FGT|THR. Fallback order: the zone, then the default zone;
// night then day; the mode, then the weaker mode (thr -> fgt -> std).
export function themeCandidates(zone: string, defZone: string, day: boolean, mode: Mode): string[] {
  const dayOrder = day ? ["DAY"] : ["NGT", "DAY"];
  const modeOrder: string[] = [mode.toUpperCase()];
  if (mode === "thr") modeOrder.push("FGT");
  if (mode !== "std") modeOrder.push("STD");
  const out: string[] = [];
  for (const z of [zone, defZone]) {
    for (const d of dayOrder) {
      for (const m of modeOrder) out.push(`${z}_${d}_${m}`);
    }
  }
  return out;
}

export function pickTheme(candidates: string[], has: (name: string) => boolean): string | null {
  for (const c of candidates) if (has(c)) return c;
  return null;
}

// Embellishment on a mode change: into std from a fight = break; into fgt from thr = fill; else none.
export function embellishFor(cur: Mode, next: Mode): Embellish {
  if (next === "std") return cur !== "std" ? "break" : "none";
  if (next === "fgt") return cur === "thr" ? "fill" : "none";
  return "none";
}

// Hand-off from the game thread to the audio thread: the latest request wins, the audio side takes it once.
export class PendingTheme<T> {
  private pending: T | null = null;
  set(v: T): void { this.pending = v; }
  take(): T | null {
    const v = this.pending;
    this.pending = null;
    return v;
  }
}

// Ambient emitter with a random repeat delay, a radius gate and a day/night variant.
export interface Emitter {
  x: number; y: number; z: number;
  radius: number;
  delayMs: number;      // base repeat delay
  delayVarMs: number;   // random extra, uniform in [0, delayVarMs)
  nextAt: number;       // ms, game clock
  dayFrom: number;      // clock minutes
  dayTo: number;        // clock minutes, end exclusive
}

// Plays only when the listener is inside radius + 800 units (squared-distance compare).
export function inRange(e: Emitter, lx: number, ly: number, lz: number): boolean {
  const d = e.radius + 800;
  const dx = e.x - lx;
  const dy = e.y - ly;
  const dz = e.z - lz;
  return dx * dx + dy * dy + dz * dz < d * d;
}

export function scheduleNext(e: Emitter, nowMs: number, rnd: () => number): void {
  e.nextAt = nowMs + e.delayMs + (e.delayVarMs > 0 ? Math.floor(rnd() * e.delayVarMs) : 0);
}

export function variantFor(e: Emitter, clockMin: number, dayName: string, nightName: string): string {
  return clockMin >= e.dayFrom && clockMin < e.dayTo ? dayName : nightName;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/sm005-og-music-state.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/music-state.ts` (new, client-side). It reads the engage and dead state from the engine and never decides it. Parity-checklist row 12 (combat sound cues).
- Emitter model (ambient one-shots with random repeat and radius gate) lands in the same client module, with the zone data (theme table per zone) as zone data (not read in the Frankendom tree).
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; keep the Copyright notice if any line is taken literally; this note takes the shape only)
- Brief rule served: one engine decides the state (fight, engage, dead); the client picks the theme; zones as data.

## 6. Gaps and risks

- The donor waits up to 5 s for a fight start (worldsound.cpp 225-227). Frankendom engage is a state change: the client should change music on the engage event itself. Fix: event-driven, with the sketch's `modeOf` input.
- Zone pick is last-match-wins with no break (233-237). Frankendom zones are data on one runtime: pick the zone the server names, or the smallest enclosing zone, never the last.
- The donor reads "targeted" from the NPC side (worldobjects.cpp 451-459). Frankendom's hate list and engage are engine state: map thr to "on a hate list, not engaged", and fgt to "engaged with a weapon drawn", from the engine.
- Death counts as fight (worldsound.cpp 242). That gives the death moment the fight theme. Keep it as a choice for Frankendom, not a default: it is a death and respawn presentation question (checklist row 17) and the owner should decide it.
- The OpenGothic provider always reloads the pattern (gamemusic.cpp 127 `if(/*reloadTheme*/true)`), so the reload flag set at 46 is never used. Fix: honour the flag and skip the reload when the file is unchanged.
- The embellishment is not quantised to a bar in the OpenGothic path (mixer.cpp 295-296): the theme switches on the next audio chunk. The timing field (`transsubtype`) is read only by the GothicKit path (gamemusic.cpp 261). Fix: quantise to the next beat or bar in the client when the theme gives a timing.
- If a theme has no pattern for the requested embellishment, the mixer keeps the old pattern pointer (mixer.cpp 174-185). I did not trace what that sounds like (not read). Fix: fall back to the normal pattern explicitly.
- Emitters have no voice cap: the playing list grows as emitters start (worldsound.cpp 195 `effect.emplace_back`), and only finished ones are removed (281-293). Fix: cap per cue class, with priority, the same as the OpenDiablo2 cap.
- `stopTheme` in the OpenGothic path only clears the pending request (gamemusic.cpp 20-23, 150-152); playback is silenced by the render path when disabled (107-110). Minor: Frankendom should stop the voice explicitly.
- Adopt the layering: a zone or mode change is a new theme, and the emitters are a separate layer that keeps running. That matches the OpenDiablo2 layering in the other cell.

Reuse tag: rewrite-from-idea (MIT; shape only in this note)
Brief rule served: one engine decides the fight state; the client chooses the theme (rule 1 and the sound-is-client-only ruling); zones as data.
Best transferable idea: pick music from (zone, day or night, fight mode) through a fallback chain of named themes, and play a short fill or break when the fight mode changes, so the change is musical and not a hard cut.
Decision (proposed): adapt - take the mode-and-fallback selection and the embellishment table, drive the change from the engage event instead of a 5-second poll, and use the server's zone name instead of the last-match scan.
Acceptance: when a creature engages the player, the combat theme starts within one render chunk of the engage event (a client test asserts the mode change is handled in the event handler, not in a timer), with a fill played first; when the player leaves the fight, a break plays and the standard theme resumes.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN. 04:00-21:00 day, fight rule, THR with no weapon, last-zone-wins, 5s throttle, fallback chain, BREAK/FILL/NONE table, emitter radius+800, delay+rand%delayVar, mixer cut all match.
- Missed: in `updateTheme` an empty `theme.file` calls `stopTheme()` and returns (gamemusic.cpp 121-124), so a theme with no file is silence, not a fallback. Keep as a feature: allow explicit silent themes in data.
- The `playTheme` reloadTheme flag is dead code (the always-true reload is already listed as a defect).
