# levy-street-world-of-claudecraft (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/game/music.ts` | Licence: MIT (read from `LICENSE`: "MIT License", Copyright (c) 2026 Levy Street; package.json "license": "MIT") | TypeScript | symbol `MusicDirector`

Checked: Class `MusicDirector` (music.ts 4290) read for the parts that drive crossfades: `update` (4670-4714), `setStreamTarget` (4576-4591), `streamKeeper` (4606-4626), `init` interval (4505), constants (3442-3458). Also read in full: `music_mix_policy.ts`, `minigame_music_layer.ts`, `music_tracks.ts`, `music_zones.ts`, `render/ambience_state_core.ts`; read `instance_music.ts` 100-147 (the caller of `update`); read `sfx.ts` 612-660 (voice cap and cooldown), 936-1024 (loop ramp and unloop), 1706-1816 (`ambient` helper and `ambience()` bed table). Confidence: high on the music crossfade and keeper (read end to end, one caller traced). Medium on the SFX voice and bed side (read the cap, cooldown and bed table; `loop()` body from its start at sfx.ts 877 was not read). Not read: the composition functions (`composeX`), the boss file track path, the `renderer.ts` call site of `sink.ambience` at line 12358 (grep only), `audio.ts` UI cues (grep only). Camera scope: not applicable.

## 1. Mechanism

- One director owns every music cue. Each cue is a looping media element behind its own gain node. A cue is only ever changed by setting a target (0 or 1) and a time constant; the gain then approaches the target exponentially (the WebAudio `setTargetAtTime` shape). Nothing is switched hard.
- Zone and fight are mutually exclusive. `update(zone, inCombat)` (music.ts 4670) turns the zone cue on only when not in combat (4686), and turns one of two battle cues on only while in combat (4707). The donor comment says the zone is silenced for combat and fades back in when combat ends (4680-4682), so combat replaces the zone rather than layering over it.
- Order of steps in `update` (as the code runs): (a) early return if zone and combat are unchanged (4673); (b) compute `combatStarting` (4675); (c) record the new zone and combat flags (4676-4678); (d) return if a minigame track is active, which the minigame layer overrides (4679); (e) if not in combat, make sure the zone's stream exists (4684); (f) set each zone cue's target (1 only for the current zone, not in combat) with time constant `FADE_SECONDS / 3` (about 0.733 s) when rising and 0.35 s when falling (4686-4687); (g) on `combatStarting`, pick one battle cue at random with `Math.random` and hold that pick for the whole fight (4695-4696; the pick is uniform over `COMBAT_STREAM_URLS`, music_tracks.ts 81-82); (h) set each battle cue's target (1 only for the picked cue while in combat) with time constant 0.35 s when rising and about 0.733 s when falling; the fall is also 0.35 s when on a crucible floor (`crucibleFloor !== null`, 4707-4711).
- Result (0.35 s and 0.733 s are time constants, not durations; gain after t seconds is exp(-t/tau) of the way left): entering a fight, the zone is down to about 6 percent of its gain after 1 s (tau 0.35 s) while a battle cue rises at the same tau. Leaving a fight, the battle cue is about 37 percent left after 0.73 s and under 5 percent after about 2.2 s (three taus); the zone rises with the same tau, to about 95 percent after 2.2 s. A battle cue that is still audibly fading out (not yet paused) is not rewound when a new pull arrives, so rolling combat continues from position (comment 4692-4694; rewind 4698-4703).
- Keeper (every 500 ms via `window.setInterval`, music.ts 4505; also called directly on unmute, menu close and volume restore): for each cue, if the mix is audible and the cue's target is above 0, the cue is revived (pause cleared, element started). Otherwise, the cue's silence timer starts; once a cue has been silent for more than 4 s and its element is playing, the element is paused (4606-4626; constants 3453-3454). The donor comment (3448-3452) justifies the 4 s figure: the slowest time constant, about 0.73 s, has decayed under 0.5 % by then. I checked the arithmetic: exp(-4 / 0.733) is about 0.0043, so the claim holds. A paused element keeps its position, so re-entering a zone resumes mid-phrase.
- Audibility (music_mix_policy.ts 16-26): the master target is 0 when the mix is disabled, menu-paused, or the boss file track owns the mix; otherwise `STREAM_LEVEL * vol` (STREAM_LEVEL = 0.5, music.ts 3447). Streams are not started (no download) while the mix is inaudible (music.ts 4584).
- Minigame layer (minigame_music_layer.ts 57-94): one activity track overrides the zone and battle cues. Its own cue rises with tau 0.4 s and falls with 0.3 s (75). The zone and battle cues are silenced with tau 0.35 s (78, 81). When the layer ends, it clears its cues with tau 0.5 s and re-runs `update` for the previous zone.
- Other side of the same file, ambience beds (sfx.ts). `ambience()` (1756-1816) is called every frame with the player's biome, indoor flag, precipitation and water proximity (the readout is `sampleAmbienceInto`, render/ambience_state_core.ts 41-56, sampled at the player). Each bed calls `ambient(key, target)` (1706-1709): when the target is above 0 the bed loop is ensured and its gain ramps with tau 0.25 s (988) only when the target changes; when the target is 0 the bed is unloop-ed with a 0.7 s fade (1708; `unloop` uses tau = fade / 3 = 0.233 s, sfx.ts 1014).
- Voice limits (sfx.ts): at most 24 concurrent one-shot sources (`MAX_VOICES`, 46). `playAt` returns false when the cap is reached (644), so the new request is dropped; there is no priority ranking. Each key has a cooldown (default 0.03 s, 645) with a namespace option. Ability synth one-shots have their own pool of 8 (52), so ability spam cannot starve footsteps or UI sounds.

## 2. Key functions

- `MusicDirector.update` (music.ts 4670-4714): zone and battle target logic, combat start pick, crossfade time constants. Only caller read: `InstanceMusicController.update` (instance_music.ts 133-145), which passes `musicCombat = crucibleFloor === null && (inCombat || inRaidArena || inBattleground)` (121) and calls `update` every frame (140-142). Other callers not read.
- `MusicDirector.setStreamTarget` (music.ts 4576-4591): if the target changes, sets the gain ramp, marks silence start, and starts or ensures the element only when audible (4579, 4584).
- `MusicDirector.streamKeeper` (music.ts 4606-4626): revive or pause rule (4609, 4622).
- `musicMixMasterTarget` and `isMusicMixAudible` (music_mix_policy.ts 16-27): pure audibility rules.
- `pickCombatTrackIndex` (music_tracks.ts 79-83): `Math.floor(rand() * trackCount)` clamped to range.
- `musicZoneForLocation` (music_zones.ts 122-135): chooses the zone cue: dungeon first (130), then hub town cue (133), then zone override, then the biome table (62-80, `BIOME_MUSIC`).
- `SoundFx.playAt` voice cap and cooldown (sfx.ts 644-653) and `ambient` (1706-1709): the two gates on every one-shot and bed.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Each cue has a gain that approaches its target exponentially, with a separate time constant for rise and fall | Base `FADE_SECONDS` = 2.2 s (music.ts 3442); zone rise 2.2/3 = 0.733 s and zone fall 0.35 s (4687); battle rise 0.35 s and battle fall 0.733 s (4711) |
| A cue silent for a while is paused so it costs nothing | Pause after 4 s silent (3453); keeper every 500 ms (3454) |
| Mix master: zero when disabled, menu-paused or boss-ducked; otherwise level x volume | `STREAM_LEVEL` 0.5 (3447); minigame cue rise 0.4 s, fall 0.3 s (minigame_music_layer.ts 75); minigame silencing 0.35 s (81) |
| Pick one of N opening tracks at random when the event starts, then hold it | 2 battle tracks, uniform (music_tracks.ts 71-74, 81) |
| Zone and battle cues are mutually exclusive | Zone silenced in combat (music.ts 4686); crucible floors handled separately (4684, 4711) |
| Ambience bed: target from state each frame, ramp on change, fade out when off | Ramp tau 0.25 s (sfx.ts 988); off fade 0.7 s (1708); vale and beach wind 0.12 (1768); marsh-family bed 0.05 to 0.14 by biome (1779-1798, the values are in the table); rain 0.11 (1814); snow 0.13 (1815); shore 0.18 (1816) |
| One-shot voice cap with no priority | `MAX_VOICES` 24 (46); ability pool 8 (52); cooldown default 0.03 s (645) |

## 4. TypeScript sketch

simplified: keeps the donor's time constants (fast rise into a fight, slow rise back to the zone), the mutual exclusion of zone and battle, the random battle pick at combat start, the four-second pause rule and the audibility gate. Omits: the WebAudio nodes and media elements (the gain is simulated), the element rewind on a fresh pick, the crucible floor and boss file overrides, the minigame layer, the master level and volume, the early-return check on the crucible floor, and the 500 ms timer itself (the keeper is a plain function here). The sketch does not reorder the donor steps; the donor sets targets, then the keeper runs on its own timer.

```ts
// Licence: MIT (donor). clean-room sketch of the rules, written from the described mechanism.
// clean-room
const FADE_SECONDS = 2.2;
const STREAM_PAUSE_AFTER_S = 4;

// Time constants (seconds) per direction.
const ZONE_IN_TAU = FADE_SECONDS / 3; // zone returns slowly after a fight
const ZONE_OUT_TAU = 0.35; // zone is silenced fast when combat starts
const BATTLE_IN_TAU = 0.35; // battle cue rises fast
const BATTLE_OUT_TAU = FADE_SECONDS / 3; // battle cue falls slowly

export interface Cue {
  gain: number; // current linear gain 0..1 (simulated, not a WebAudio node)
  target: number; // 0 or 1
  tau: number; // time constant of the ramp in progress
  silentSince: number; // -1 while the cue has a target above 0
  paused: boolean;
}

export function newCue(): Cue {
  return { gain: 0, target: 0, tau: 1, silentSince: 0, paused: true };
}

// Exponential approach to target, the same shape as WebAudio setTargetAtTime.
export function stepGain(c: Cue, dt: number): void {
  c.gain = c.target + (c.gain - c.target) * Math.exp(-dt / c.tau);
}

// Sets a new target and time constant; no-op when the target is unchanged.
export function setTarget(c: Cue, target: number, tau: number, now: number): void {
  if (c.target === target) return;
  c.target = target;
  c.tau = tau;
  if (target > 0) {
    c.silentSince = -1;
    c.paused = false;
  } else {
    c.silentSince = now;
  }
}

export interface Mix {
  zone: string | null;
  combat: boolean;
  battleIdx: number;
  zoneCues: Map<string, Cue>;
  battleCues: Cue[];
}

export function newMix(zones: string[], battleCount: number): Mix {
  return {
    zone: null,
    combat: false,
    battleIdx: 0,
    zoneCues: new Map(zones.map((z) => [z, newCue()])),
    battleCues: Array.from({ length: battleCount }, () => newCue()),
  };
}

// Called on zone or combat change. In combat the zone is silent and one
// battle cue is up; the battle cue is picked once, at combat start.
export function update(m: Mix, zone: string, inCombat: boolean, rand: () => number, now: number): void {
  if (zone === m.zone && inCombat === m.combat) return;
  const combatStarting = inCombat && !m.combat;
  m.zone = zone;
  m.combat = inCombat;
  for (const [name, c] of m.zoneCues) {
    const target = name === zone && !inCombat ? 1 : 0;
    setTarget(c, target, target > 0 ? ZONE_IN_TAU : ZONE_OUT_TAU, now);
  }
  if (combatStarting && m.battleCues.length > 0) {
    const idx = Math.floor(rand() * m.battleCues.length);
    m.battleIdx = Math.min(m.battleCues.length - 1, Math.max(0, idx));
  }
  m.battleCues.forEach((c, idx) => {
    const target = inCombat && idx === m.battleIdx ? 1 : 0;
    setTarget(c, target, target > 0 ? BATTLE_IN_TAU : BATTLE_OUT_TAU, now);
  });
}

// The mix is audible only when enabled, not menu-paused, not boss-ducked and volume > 0.
export function mixAudible(enabled: boolean, menuPaused: boolean, bossActive: boolean, vol: number): boolean {
  return enabled && !menuPaused && vol > 0 && !bossActive;
}

// Runs on a timer. Revives cues that should play; pauses cues silent for longer than the limit.
export function keeper(cues: Cue[], audible: boolean, now: number): void {
  for (const c of cues) {
    if (audible && c.target > 0) {
      c.silentSince = -1;
      c.paused = false;
    } else if (c.silentSince < 0) {
      c.silentSince = now;
    } else if (!c.paused && now - c.silentSince > STREAM_PAUSE_AFTER_S) {
      c.paused = true;
    }
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/sm018-levy-cue-crossfade.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/cues.ts` (new): the engine emits fight-state events (engage, disengage, zone change, attacker count). The mix director that plays the cues stays client-side; `src/fight/` only decides which cue applies. Parity-checklist row 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; the sketch above is clean-room)
- Brief rule served: addendum rules 2 and 4 (judged the idea; one best transferable idea line)

## 6. Gaps and risks

- The brief hint named parity row 14. Row 14 is HUD. This mechanism is sound, so I cited row 12 (combat sound cues). The HUD does not own the mix.
- The mix, the media elements and the WebAudio graph are client code. Frankendom's rulings say sound is client-only, so the engine must only emit cue events and never call audio. The Pit is a client too: it must read the same cue events, not its own music rules.
- The battle pick uses `Math.random` (music_tracks.ts 81; music.ts 4696). A replay of the same fight can open on the other track. Frankendom's fight record (parity row 19) should store the pick or derive it from the fight seed.
- Combat replaces the zone; there is no layering and no intensity change with the number of attackers. Frankendom caps attackers at MAX_ATTACKERS = 3, and the donor has no equivalent. A stinger or intensity step at the third attacker is new work, not in the donor.
- Zone changes during combat are recorded but not played until combat ends (update, 4673-4684 and 4686). A border crossing mid-fight is therefore silent-by-design in the donor. Confirm this is what we want.
- Ambience beds switch on the biome sampled at the player (render/ambience_state_core.ts 49). A walk across a border switches the bed in one frame, then ramps over 0.25 s. There is no spatial blend across the border. The donor has no border blend, so "border crossfade" here means time smoothing only.
- The two beds in a switch both ramp in gain with no equal-power curve in the code, so the sum can dip or peak during the ramp. Not measured.
- The SFX cap drops the newest one-shot with no priority (sfx.ts 644). A death or kill cue (parity row 17) can be dropped under spell spam. Frankendom needs a priority for kill and death cues. The donor's `priority` grep hit (sfx.ts 353) is a variant weight, not a voice priority.
- Defects: none found in the code I read that changes the mechanism. The four-second rule was checked against the comment's arithmetic and holds.
- Not read: `loop()` body (sfx.ts 877-935), the composition functions, the boss file track, the `renderer.ts` call site (grep only), `audio.ts` UI cues (grep only).

Reuse tag: rewrite-from-idea (MIT; clean-room sketch above)
Brief rule served: addendum rules 2, 4 and 6

Best transferable idea: Give every music or ambience cue its own rise and fall time constant (fast rise into a fight, slow return), and pause any cue silent for four seconds so an inaudible track costs nothing.

Decision (proposed): adapt - keep the asymmetric time constants and the silent-pause keeper (cheap, client-only, no engine change), but replace `Math.random` with the fight seed so a replay opens on the same track, and add a stinger or intensity step for the third attacker, since the donor has neither.
Acceptance: Pull a mob in the open world or in the Pit: the zone music is under about 6 percent of full gain after 1 s, one battle cue starts with the fight, and after the last kill the battle cue is under about 5 percent of gain by about 2.2 s (it is still about 37 percent at 0.7 s) while the zone theme returns to about 95 percent at 2.2 s; a client test that replays the same fight seed asserts the same battle cue index.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Verified OK: MIT, FADE_SECONDS 2.2 (3442), STREAM_LEVEL 0.5 (3447), STREAM_PAUSE_AFTER_S 4 and KEEPER 500 (3453-3454), update 4670, setStreamTarget 4576, streamKeeper 4606, zone tau FADE/3 in and 0.35 out, battle 0.35 in and FADE/3 out, random pick held for the fight with no rewind while still playing, pickCombatTrackIndex clamp, mix policy, minigame taus 0.4/0.3/0.35/0.5, MAX_VOICES 24 line 46, ability pool 8 line 52, cooldown 0.03 line 645, ambient()/unloop 0.7, ramp tau 0.25. Errors: (1) ACCEPTANCE confuses time constant with duration: 'after the last kill it fades out over about 0.7 s' and Result line 'battle cue falls over about 0.73 s'. 0.733 s is the setTargetAtTime tau; after 0.7 s the gain is still ~38%, reaching <5% takes ~2.2 s. A test asserting near silence at ~0.7 s would fail the correct sketch (stepGain with tau 0.733). Same wording 'zone falls to near silence within about a second' is marginal (5.7% left at 1 s at tau 0.35). (2) Step (h) omits that battle fall tau is 0.35 (not FADE/3) when crucibleFloor !== null (music.ts ~4711). (3) 'tau 0.233 s' for the 0.7 s unloop fade is inferred (fade/3), not read - unloop body 993+ not cited.
Missed: none

Fixed 2026-10-12 (Sonnet fixer): acceptance and Result line now treat 0.35 s and 0.733 s as time constants (gain left is exp(-t/tau): 6 percent of the zone at 1 s, battle cue 37 percent at 0.7 s and under 5 percent at 2.2 s), so a correct sketch passes; step (h) notes the 0.35 s fall on crucible floors (music.ts 4707-4711). The 0.233 s unloop tau was read (unloop uses fade / 3) and kept, not an error. No missed mechanism.
