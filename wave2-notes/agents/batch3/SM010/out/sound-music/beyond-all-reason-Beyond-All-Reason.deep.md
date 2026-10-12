# beyond-all-reason-Beyond-All-Reason (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luaui/Widgets/gui_advplayerslist_music_new.lua` (with `luarules/gadgets/gfx_atmosphere.lua` and `gamedata/sounds.lua`) | Licence: GNU GPL v2 or later (widget header line 9; repo `LICENSE.md` says "GPL v2"; the music audio is CC BY-NC-ND and is not reused) | Lua (Recoil/Spring widget and gadget) | symbol `widget:GameFrame` / `updateFade` / `UnitDamaged`

Checked: Opened the in-game music director in full for the logic that matters (thresholds 44-120, fade 480-640, track picker 1440-1530, damage and per-frame logic 1270-1300 and 1675-1834); opened `gfx_atmosphere.lua` (212 lines, read in full) and `gamedata/sounds.lua` (396 lines, read in full). Also opened `luaintro/Addons/music.lua` (loading-screen track pick, 214 lines) and `luarules/gadgets/api_music.lua` (34 lines, a relay only). Confidence high on the music numbers and order of operations; medium on how the engine enforces `maxconcurrent` and `priority` (engine code not read). Not read: per-weapon hit and spell sound selection (lives in unit and weapon defs, not in these files), and the mid-section of the weapon sound custom table (lines 100-137 partly). camera_scope: not a camera cell.

## 1. Mechanism

- A war meter (`warMeter`) is the battle-intensity number. Each damage event adds to it: a hit of damage 1 or less is ignored, and a hit larger than the victim's max health counts only as max health (1676-1682). Only a hit above 1 damage resets the quiet counter to 0 (1675-1677); a hit of 1 or less changes neither the meter nor the counter.
- The meter decays by 4 percent once per 30 game frames (1707-1708, about once a second at the sim rate). It is capped at 3 times warHigh (1709-1710). If the quiet counter passes 40 decay ticks with no damage, the meter is set to 0 (1713-1714).
- Track levels: peace (default), warLow (meter >= 1000), warHigh (meter >= 32500), plus a boss track (spawn flag), victory / defeat / neutral / game-over tracks, event tracks and an interlude track (see `PlayNewTrack`, from 1454). Victory, defeat and boss are whole tracks, not short stingers.
- Track start picks the level from the meter: boss first, then warHigh (branch at 1499), then warLow (branch at 1514), then peace.
- Mid-track switching happens on the 30-frame tick (1719) and only when no fade is running. A hysteresis switch needs the track to have played for its random hold (20-60 s, 1660), and it also needs the local frame to be within 300 frames of the server's last progress report (1763). Event tracks never get interrupted (1658). Boss-state switches (a boss spawning, or its flag clearing while the boss track plays) are checked first and ignore both the random hold and the lag gate (1757-1761); only a running fade blocks them. The hold and lag gate apply to the hysteresis switches below. Switch rules use hysteresis: peace goes up to warLow above (high+low)/2 (1766); warLow goes to warHigh only above 2 x high (1767); warLow goes down to peace at or below 0.25 x low (1769); warHigh goes down to peace at or below 0.5 x low (1768).
- A switch is a fade. Switch and boss fades use direction -2 (1760, 1773), about 5 s at normal speed; the end-of-track fade (direction -1) starts when 12 s remain (1775-1776); game over uses -5 with the fast speed (1701-1703), about 1 s. The new track fades in when the game is running (PlayNewTrack, 1469-1476).
- Ambience (`gfx_atmosphere.lua`) is not a music bed. It places one-shot sounds at randomly sampled map points, each family with its own cooldown. Wind tries a random point and plays only if the point is above a height (`wind_minHeight`, 34, 99) and in view (99); if the sample fails, the cooldown is not set, so it retries next frame (120, 198). Sea needs a point at or below -23 (41, 128); beach needs a point with depth from -19 up to 0 (47, 159). Geo vents play round-robin: the sound delay is divided by the vent count once (78), and a vent is skipped when it lies within 64 units of one already listed (67-68), so each vent comes round about every 125 frames.
- Voice limits and priority are data, not code: `gamedata/sounds.lua` gives each folder a `maxconcurrent` (for example ui 1, weapons-mult 15, atmos 10) and a `priority` (atmos -10, atmos-local -5, atmos-geovents -3; the donor does not say what the engine does with a negative value, and the engine was not read). Per-file overrides come from a pattern table (for example `["^minigun"] = 12`, 143). The loader resolves overrides with `pairs` (380).
- Layering: none. One music track plays at a time. There are no stems and no crossfade between two beds.

## 2. Key functions

- Damage intake: `widget:UnitDamaged`, `gui_advplayerslist_music_new.lua` 1675-1686.
- Meter decay and cap: the `if warMeter > 0` block inside `widget:GameFrame` (from 1692), 1706-1716.
- Mid-track switch rules and fades: the `if not fadeDirection` block after 1719 (switch table at 1763-1770, end-of-track fade at 1775-1776).
- Track picker at start: `PlayNewTrack` from 1454 (the warHigh branch at 1499, the warLow branch at 1514).
- Fade step: `fadeChange` 581-582 (`0.33 / gameSpeed` per call), `updateFade` 593-618, with the call from `widget:GameFrame` (1698) and, while paused, from `widget:Update` (1299-1300, the Update function starts at 1271).
- Ambience scheduler: `gadget:GameFrame` in `gfx_atmosphere.lua`, 186-212, with `PlayWindSound` 95-123, `PlaySeaSound` 124-152, `PlayBeachSound` 153-185, and `CollectGeoVentPositions` 58-80.
- Voice limits: `gamedata/sounds.lua` family table 26-363 and loader `loadSoundFiles` 365-390.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Intensity meter fed by hit damage, clamped to the victim's max health | warLow 1000, warHigh 32500 (theirs, 54-55); max-health clamp (1679-1680) |
| Decay by a fraction per interval, capped | 4 percent per 30 frames (1708); cap 3 x warHigh (1710) |
| Reset after a quiet spell | 40 decay ticks (56, 1713) |
| Enter and leave thresholds (hysteresis) | up at (high+low)/2 (1766) and 2 x high (1767); down at 0.5 x low (1768) and 0.25 x low (1769) |
| Minimum hold before a mid-track switch | random 20-60 s (57-58, 1660); event tracks never interrupted (1658) |
| Fade by a rate over time, with a switch when it reaches zero | 0.33 per update over game speed (582); fast 1.5 x 0.33 (574); directions -1, -2, -5 (1760, 1703) |
| Volume from ambience strength | wind strength / 25 (100) x 0.6 (104); beach 0.20 + 0.6 x strength (166) |
| Ambience sample gated by height or depth | wind min height from ground extremes (34); sea -23 (41); beach band -19 (47) |
| Per-family voice limit with a priority | ui 1 (26), weapons-mult 15 (168), atmos 10 (333), priority -10 (329) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's hit clamp, decay, cap, quiet reset, track picker and hysteresis table, and the fade. It adds the boss switch (no hold) and the raptor/scavenger anger floor. It omits the playlists and shuffle, the event and interlude tracks and their counter, the victory, defeat and game-over selection, the spectator x1.5 thresholds, the local-vs-server frame gate (1763), the file loading and the 2-second retry. It uses real seconds (dt) for decay and fades, where the donor steps once per game frame, and it keeps the meter as a float (the donor floors it). It shapes the fade in decibels (the donor's own slider curve, 557), where the donor fades a straight line of percent (590).

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch from the described mechanism, not a translation.
export type Track = "peace" | "warLow" | "warHigh" | "boss" | "gameOver";

export interface MusicConfig {
  warLow: number;        // donor 1000
  warHigh: number;       // donor 32500
  decayPerSec: number;   // donor 0.04 per second
  capMultiple: number;   // donor 3 (times warHigh)
  quietResetSec: number; // donor 40
  minHoldSec: number;    // donor 20
  maxHoldSec: number;    // donor 60
}

export interface MusicState {
  meter: number;
  quietSec: number;
  track: Track;
  heldSec: number;       // seconds the current track has played
  holdUntilSec: number;  // random in [minHoldSec, maxHoldSec], drawn per track
  fader: number;         // 0..1 fade position, 1 = full volume
  fading: "none" | "out" | "in";
}

// Donor: a hit adds its damage, clamped to the victim's max HP, and is ignored at 1 or less.
export function addDamage(s: MusicState, dmg: number, victimMaxHp: number): void {
  if (dmg <= 1) return;
  s.meter += Math.ceil(Math.min(dmg, victimMaxHp));
  s.quietSec = 0;
}

// Per real second (fix: donor steps every 30 game frames). Cap, decay, then zero after a quiet spell.
export function decay(s: MusicState, dtSec: number, cfg: MusicConfig): void {
  if (s.meter <= 0) return;
  s.meter = Math.min(s.meter * Math.pow(1 - cfg.decayPerSec, dtSec), cfg.warHigh * cfg.capMultiple);
  s.quietSec += dtSec;
  if (s.quietSec > cfg.quietResetSec) s.meter = 0;
}

// Track picked when a new track starts (donor order: boss, then warHigh, then warLow, then peace).
export function trackForMeter(meter: number, cfg: MusicConfig, bossUp: boolean): Track {
  if (bossUp) return "boss";
  if (meter >= cfg.warHigh) return "warHigh";
  if (meter >= cfg.warLow) return "warLow";
  return "peace";
}

// Donor 1757-1761: a boss spawn (or its end) forces a switch at once: no random hold, no lag gate,
// only the rule that no fade is already running.
export function bossSwitch(s: MusicState, cfg: MusicConfig, bossUp: boolean): Track | null {
  if (s.fading !== "none") return null;
  if (bossUp && s.track !== "boss") return "boss";
  if (!bossUp && s.track === "boss") return trackForMeter(s.meter, cfg, false);
  return null;
}

// Donor 1721-1733: on PvE-driven fights (raptors, scavengers) the boss anger sets a minimum meter every 30 frames.
export function angerFloor(s: MusicState, cfg: MusicConfig, anger: number): void {
  if (anger > 60 && s.meter < cfg.warHigh + 1) s.meter = cfg.warHigh + 1;
  else if (anger > 20 && s.meter < cfg.warLow + 1) s.meter = cfg.warLow + 1;
}

// Mid-track switch with hysteresis: entering a level and leaving it use different thresholds.
export function wantedSwitch(s: MusicState, cfg: MusicConfig): Track | null {
  if (s.fading !== "none" || s.heldSec < s.holdUntilSec) return null;
  const m = s.meter, lo = cfg.warLow, hi = cfg.warHigh;
  switch (s.track) {
    case "peace":   return m > (hi + lo) * 0.5 ? "warLow" : null;
    case "warLow":  return m > hi * 2 ? "warHigh" : m <= lo * 0.25 ? "peace" : null;
    case "warHigh": return m <= lo * 0.5 ? "peace" : null;
    default:        return null;
  }
}

// Fade position moves over fadeSec real seconds. Returns true when a fade-out has reached silence,
// so the caller switches the track and sets fading to "in".
export function stepFade(s: MusicState, dtSec: number, fadeSec: number): boolean {
  if (s.fading === "none") return false;
  const dir = s.fading === "out" ? -1 : 1;
  s.fader = Math.min(1, Math.max(0, s.fader + (dir * dtSec) / fadeSec));
  if (s.fading === "out" && s.fader === 0) return true;
  if (s.fading === "in" && s.fader === 1) s.fading = "none";
  return false;
}

// Fix: the fade is shaped in decibels (donor already has this curve for its volume slider), not a straight line.
export function gainOf(fader: number, rangeDb = 45): number {
  if (fader <= 0) return 0;
  return Math.pow(10, (rangeDb * (fader - 1)) / 20);
}

export const exampleConfig: MusicConfig = {
  warLow: 1000, warHigh: 32500, decayPerSec: 0.04, capMultiple: 3,
  quietResetSec: 40, minHoldSec: 20, maxHoldSec: 60,
};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {}` appended, exit 0.

## 5. Lands in

- TARGET `origins/client/music-director.ts` (new, client-only: sound is client-only). Feeds from server-confirmed hit events only, never from local guesses. Parity-checklist row 12 (combat sound cues).
- Second target, later: `origins/client/ambience.ts` for the one-shot ambience scheduler with per-family voice limits as data. Row 12 as well.
- Best transferable idea: Drive the music from a decaying damage-intensity meter with separate enter and leave thresholds and a minimum hold per track, so battle music does not flicker on every hit.
- Decision (proposed): adapt. Take the meter, the hysteresis and the hold; feed the meter from server-confirmed damage only; fix the frame-based decay and fade (use real seconds) and the straight-line fade (use the dB curve); drop the local lag gate (1763).
- Acceptance: a client test feeds one server-confirmed hit list into the director and asserts the track order, the hold before each switch and the quiet reset 40 s after the last hit, using the zone's own thresholds.
- Reuse tag: rewrite-from-idea (GPL v2 or later: clean-room only; the sketch is written from the mechanism).
- Brief rule served: sound is client-only; addendum sound-music fold-in (layering, stingers, ambience beds, crossfades, priority and voice limits); keep the idea and fix the defect.

## 6. Gaps and risks

- GPL: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Layering: BAR has no stems. Frankendom would be building a new layer system, not copying one. The donor's answer is whole-track switching with a hold.
- Stingers: the donor's victory, defeat and boss tracks are full tracks, not short stingers. A short stinger would be new work.
- Ambience beds with crossfades: not found in this donor. `gfx_atmosphere.lua` and `map_atmosphere_cegs.lua` place one-shots only, with no looped bed and no crossfade. Do not claim the donor has per-biome beds.
- Defects to fix (keep the idea):
  1. Frame-based fade and decay (582, 1708, 1698): fix: advance by real dt in the client loop.
  2. Paused fade runs from `widget:Update` once per render frame (1299-1300), divided by game speed floored at 0.01 (577): fix: one clock, real seconds, no game-speed divisor.
  3. Straight-line fade of the percent level (590): fix: `gainOf` in the sketch.
  4. Local lag gate (1763, `serverFrame - 300`): switching depends on local sim lag: fix: drop it; the client has no sim frame to wait for.
  5. Overlapping custom patterns resolved by `pairs` order (380): Lua does not define that order, so two patterns that both match one file can resolve either way. No current overlap was checked (not read: all custom tables). fix: an ordered list with a first-match rule, and a test that fails on overlaps.
  6. The meter is fed by `UnitDamaged` as the widget receives it; which units the widget receives is not read (engine side). fix: feed only server-confirmed damage from the one ledger.
- Rulings: one ledger means the meter reads the same server events that write health, so the music cannot disagree with the kill log. MAX_ATTACKERS = 3 means a 3-on-1 fight is the typical high-intensity case; zone thresholds (warLow, warHigh) belong in zone data, since a boss arena and a walk-through zone should not share them.
- Data-field numbers the designer will want are in the JSON sidecar, not here.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- The quiet counter resets only for damage > 1 (UnitDamaged 1675-1677), not every damage event. Confirmed; note text fixed (the sketch already did this).
- Boss-state switches (1757-1761) ignore the random hold and the serverFrame lag gate; note said every switch needs the hold. Confirmed; text fixed and a bossSwitch function added to the sketch.
- Missed: raptor/scavenger anger forces a minimum war meter every 30 frames (1721-1733: anger >60 floors at warHigh+1, >20 at warLow+1). Confirmed; added as angerFloor in the sketch. Also an interlude branch in the picker (1515-1518) and the interlude switch (1765) remain out of the sketch, as the note already says.

Fixed 2026-10-12: quiet-counter condition, boss-switch exemption from hold, sketch (note and work/bar-music-director.ts) gains bossSwitch and angerFloor.
