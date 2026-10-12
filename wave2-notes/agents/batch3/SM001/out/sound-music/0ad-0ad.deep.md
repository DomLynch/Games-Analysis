# 0ad-0ad (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/BattleDetection.js` | Licence: GPL-2.0-or-later (LICENSE.txt: `binaries/data` and `source` are "GPL version 2 (or later)"; the audio folders are CC-BY-SA 3.0 and no audio file is used here) | JavaScript (sim component and GUI scripts) with C++ engine (`source/soundmanager`) | symbol `BattleDetection`

Checked: Read end to end: `BattleDetection.js` (153 lines), `gui/common/music.js` (206 lines), `gui/session/Ambient.js` (17 lines), `simulation/components/Sound.js` (53 lines), `template_player.xml` 9-14, the three ambience XML files (`amb_farm.xml`, `day_temperate.xml`, `river_med.xml`). Read the call sites and paths: `session.js` 284-290, 700-760 (partial); `GuiInterface.js` 698-712; `SoundManager.cpp` 96-140 (worker loop, partial), 372-440, 532-560, 600-690, 755-822, the playlist part of `IdleTask`; `CSoundBase.cpp` 92-120; `SoundGroup.cpp` 64-105, 196-300, 370-445 (partial); `CCmpSoundManager.cpp` 63-86; `UnitAnimation.cpp` 262-282 (partial). Grep-only: the other `source/soundmanager` items, `maps/` (no sound selection by maps found). Not read: `shouldPlaySound` condition in `UnitAnimation.cpp`, `CFastRand`, the rolloff model, what the caller does when no source is returned, the `Looping` tag, and `timer_Time`'s unit (inferred to be seconds because fade durations of 2.00 and 1.00 are added to it). Confidence: high on the battle-state mechanism, the damage-window arithmetic and the defects listed in section 6 (read directly); high on "priority and threshold fields are never read" (grep over all of `source/` for `m_Priority` and `m_IntensityThreshold`: only the declaration, default and parse). camera_scope: not applicable (sound topic).

Best transferable idea: Battle music switches on a sustained damage rate, not a single hit: a per-player alertness counter rises one step per window while the damage rate beats a threshold and falls one step otherwise, with separate enter and exit thresholds.
Decision (proposed): adapt - take the alertness counter with hysteresis as the client's battle-music trigger, fed by server-verified hit damage counted both dealt and taken (the donor counts only dealt), with the three defects in section 6 fixed in the sketch.
Acceptance: A scripted hit log where the hero takes hits from three attackers and lands none reaches BATTLE after about 7 s of sustained damage over 0.04 per ms and returns to PEACE about 19 s after the last hit when alertness was at its maximum (both figures computed by hand from the donor's template values, not run).

## 1. Mechanism

- Per-player battle detector. `BattleDetection` is a component on each player entity (`BattleDetection.js` 1, 25-40). Its state is "PEACE" or "BATTLE" (39, 42-50); a change posts a message (49).
- Input (`OnGlobalAttacked`, 132-150). A hit counts only when the attacker belongs to this player (137-138) and the target belongs to another player who is not gaia (140-142). The first counted hit starts a repeating timer (145-146). Its damage is added to the current period counter (148-149). Damage the player takes is not counted.
- Timer period (`TimerHandler`, 57-93). Each tick pushes the period's damage to the front of `damageRecord` (65), trims it to `recordLength` (66-67), and resets the period counter (68).
- When to judge (71). While alertness is 0, every tick is judged. While alertness is above 0, a judgement happens once per full window (`recordControl` counts to `recordLength - 1`).
- The rate and the step (73-79). The rate is the summed record divided by `recordLength * interval` (73-74), i.e. damage per ms over the window. Above the threshold, alertness rises by one up to its maximum (76-77). At or below it, alertness falls by one toward zero (78-79).
- Stop and state (82-88). At zero alertness the timer stops (82-83). At or above the battle threshold the state becomes BATTLE (85-86). At or below the peace threshold it becomes PEACE (87-88). Between the two thresholds the state holds (hysteresis).
- Template values (`template_player.xml` 9-14): period 200 ms, window 12 periods (2.4 s), threshold 0.04 damage per ms (8 damage per 200 ms period), BATTLE at alertness 4, PEACE at alertness 0, maximum 8.
- Consumer (GUI). `updateGUIObjects` in `session.js` (732-753) reads the viewed player's battle state (749) and forwards it to the music manager (751). How often it runs was not read. `Music.setState` returns early if nothing changed (`music.js` 108-109 compare, 97-104 set). The sim exposes the state through `GuiInterface.GetBattleState` (700-706).
- Music states (`music.js`). Each state starts a looping playlist with its own track list, shuffled on entry (123, 127; BATTLE list at 67-70). The fade period argument is passed (123, 127) but `startPlayList` never reads it (176-183), so the fade is the engine's.
- Engine crossfades (`SoundManager.cpp`). A music change fades the old track out over 2.00 s (766) and fades the new one in over 1.00 s starting at the same time (788). This is an overlapping crossfade. An ambience change fades the old bed out over 3.00 s (805) and the new one in over 2.00 s (817), also overlapping.
- Playlist advance (`IdleTask`). When a track ends, the next starts after a 15 s gap (573). Track order is list order (shuffled on entry by the script).
- Ambience. `Ambient.js` plays one dayscape track, chosen from a fixed one-item list (8, 15-17). Its comment says the map should decide (12-13). The folders for water and building ambience exist with their own XML (`amb_farm.xml` 4 Priority 50; `river_med.xml` and `day_temperate.xml` 4 Priority 100), but nothing in the donor selects them by biome.
- Sound groups (`SoundGroup.cpp`). `PlayNext` picks one file with `rand(0, size)` (264; the distribution of `rand` was not read). `Reload` shuffles the list when RandOrder is set (287-288). Off-screen sources are skipped unless the group is distanceless or omnipresent (204-205). Pitch is drawn per play when RandPitch is set (240); the defaults are pitch 0.9-1.1 (96-97) and gain 0.8-1.0 (98-99), with gain 0.7 as the base.
- Gates on who hears a sound (`CCmpSoundManager.cpp` 63-86). A sound group plays only if the source is line-of-sight VISIBLE to the viewed player (68-71). Owner-only groups play only for sources owned by the viewed player (78, 84; `SoundManager.cpp` 675).
- Voice pool (`SoundManager.cpp`). The engine creates 64 OpenAL sources at start (40, 329). `GetALSource` hands out the first free one (414) and returns 0 when all are in use, after recording a shortage (420-421). `InitOpenAL` returns false in that case (`CSoundBase.cpp` 97-101). There is no priority and no per-entity cap: each play creates a new item (544).
- Distress. A shortage marks distress for 10 s (378). While in distress the worker thread ticks every 50 ms instead of 500 ms (125-126). It does not drop or prioritise anything; the caller's behaviour on a missing source was not read.
- Unit sounds (`Sound.js` 33-49; `UnitAnimation.cpp` 277). A unit template maps action names to sound groups; `{lang}` and `{phenotype}` in the path are replaced from the unit's identity (45-46). The sound is fired from the animation update (277), not from the hit resolution.

## 2. Key functions

- `TimerHandler`: `BattleDetection.js` 57-93. The window, the rate, the alertness step and the state change.
- `OnGlobalAttacked`: `BattleDetection.js` 132-150. What counts as a hit for battle detection (dealt only).
- `StartTimer` / `StopTimer`: `BattleDetection.js` 100-130. The record is not cleared by either (108-109, 122-130).
- `Music.startPlayList`: `music.js` 176-183. Playlist start; the fade argument is unused.
- `SetMusicItem` / `SetAmbientItem`: `SoundManager.cpp` 759-790 and 799-820. Overlapping fades.
- `GetALSource`: `SoundManager.cpp` 410-422. The 64-source pool.
- `CCmpSoundManager::PlaySoundGroup`: `CCmpSoundManager.cpp` 63-86. Visibility and ownership gates.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Damage rate over a sliding window | 12 periods of 200 ms; rate = damage / (12 x 200) (`template_player.xml` 9-10; `BattleDetection.js` 74) |
| Threshold that counts as fighting | 0.04 damage per ms, i.e. 8 damage per period (`template_player.xml` 11) |
| Alertness with hysteresis | BATTLE at 4, PEACE at 0, maximum 8 (`template_player.xml` 12-14; `BattleDetection.js` 77, 79, 85, 87) |
| Music crossfade on track change | old out 2.00 s, new in 1.00 s, overlapping (`SoundManager.cpp` 766, 788) |
| Ambience crossfade on bed change | old out 3.00 s, new in 2.00 s, overlapping (`SoundManager.cpp` 805, 817) |
| Playlist gap | 15 after a track ends (`SoundManager.cpp` 573) |
| Voice pool | 64 sources, first free (`SoundManager.cpp` 40, 414) |
| Distress | 10 s window, 50 ms worker tick (`SoundManager.cpp` 378, 126) |
| Sound pitch and gain spread | pitch 0.9-1.1, gain 0.8-1.0 defaults (`SoundGroup.cpp` 96-99) |
| Parsed but never read | Priority default 60 (95), IntensityThreshold default 3 (105), Decay default 3 (103); parsed at 382, 437, 441 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's alertness counter (one step per judged window, clamped at zero and at the maximum), the two thresholds with hysteresis, the stop at zero, and the window rate. It changes three things on purpose. It clears the record on every start (the donor does not). It divides by the measured time of the periods it actually holds (the donor divides by the full nominal window, so a fresh fight reads low for its first 2.4 s; the donor's `lateness` argument is unused). It leaves the choice of which hits to report to the caller (the donor reports only damage dealt). It does not reproduce the donor's timer, the message posting, the `recordControl` counter, the `splice` trim (which works but reads oddly), the GUI polling, or the music playlists.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type MusicState = "PEACE" | "BATTLE";

export interface AlertConfig {
  periodMs: number;       // timer period, donor value 200
  windowPeriods: number;  // periods in the damage window, donor value 12
  rateThreshold: number;  // damage per ms that counts as fighting, donor value 0.04
  battleAt: number;       // alertness at or above this is BATTLE, donor value 4
  peaceAt: number;        // alertness at or below this is PEACE, donor value 0
  alertMax: number;       // alertness ceiling, donor value 8
}

interface Period {
  dmg: number;
  ms: number;
}

export class BattleAlertness {
  private dmgThisPeriod = 0;
  private window: Period[] = [];
  private alertness = 0;
  private state: MusicState = "PEACE";
  private ticksSinceCheck = 0;
  private running = false;

  constructor(private cfg: AlertConfig) {}

  // True while the caller should keep a period timer running.
  get active(): boolean {
    return this.running;
  }

  // Report damage that this player is part of (the caller chooses dealt, taken or both).
  onDamage(amount: number): void {
    if (!this.running) this.start();
    this.dmgThisPeriod += amount;
  }

  // One period tick. elapsedMs is the measured time since the previous tick, not the nominal period.
  tick(elapsedMs: number): MusicState {
    this.window.unshift({ dmg: this.dmgThisPeriod, ms: elapsedMs });
    this.window.length = Math.min(this.window.length, this.cfg.windowPeriods);
    this.dmgThisPeriod = 0;
    this.ticksSinceCheck++;

    // Idle: judge every period. Alert: judge once per full window.
    if (this.alertness === 0 || this.ticksSinceCheck >= this.cfg.windowPeriods) {
      this.ticksSinceCheck = 0;
      let dmgSum = 0;
      let msSum = 0;
      for (const p of this.window) {
        dmgSum += p.dmg;
        msSum += p.ms;
      }
      const rate = msSum > 0 ? dmgSum / msSum : 0;

      if (rate > this.cfg.rateThreshold) {
        this.alertness = Math.min(this.cfg.alertMax, this.alertness + 1);
      } else {
        this.alertness = Math.max(0, this.alertness - 1);
      }
      if (this.alertness === 0) this.running = false;

      // Hysteresis: between the two thresholds the state holds.
      if (this.alertness >= this.cfg.battleAt) this.state = "BATTLE";
      else if (this.alertness <= this.cfg.peaceAt) this.state = "PEACE";
    }
    return this.state;
  }

  private start(): void {
    // Clear the record on every start so an old fight cannot colour a new one.
    this.running = true;
    this.window = [];
    this.dmgThisPeriod = 0;
    this.ticksSinceCheck = 0;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/sm-cell15-0ad-battle-alertness.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/battle-state.ts` (new, client-only music trigger; it consumes the engine's server-verified hit events and emits PEACE or BATTLE to the music bed). Parity-checklist row 12 (combat sound cues). The addendum's row 14 is HUD, so row 12 is the row used here.
- Thresholds and the window are zone or encounter data (a boss arena may want a different threshold); the period is an engine constant.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later: clean-room only)
- Brief rule served: ruling "camera/HUD/sound are client-only" (the engine emits events, the client decides the music state); ruling "zones are data" for the thresholds; licence rule (clean-room).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism and reproduces no donor line.
- Defect 1, partial window (`BattleDetection.js` 73-74): the rate divides by the full window even while the record holds fewer periods, so the first 2.4 s of each fight read low. Fix: divide by the measured time of the periods held (sketch).
- Defect 2, stale record (`BattleDetection.js` 108-109 and 122-130): neither start nor stop clears `damageRecord`, so a new fight's first judgement mixes in the old fight's damage. Fix: clear on start (sketch).
- Defect 3, nominal period (`BattleDetection.js` 57, 74): the handler takes `lateness` and never uses it; the rate assumes the timer ran on time. Fix: measured elapsed time per period (sketch).
- Design gap, damage taken (`BattleDetection.js` 137-149): a player who is only hit never reaches BATTLE. For Frankendom's many-on-one fights (MAX_ATTACKERS = 3) the hero is usually the one being hit, so the trigger must count damage taken as well as dealt. Decision above.
- Dead data, priority and threshold (`SoundGroup.cpp` 95, 105, 382, 437, 441): `Priority`, `Threshold` and `Decay` are parsed and stored but no code reads them. The XML values do nothing. Do not add these fields to Frankendom data until a consumer exists.
- Dead argument, fade period (`music.js` 123, 127, 176-183): the 3.0 and 2.0 values never reach the engine. Fix in Frankendom: one fade constant owned by the client bed, not by the caller.
- Gap, ambience per biome: the folders exist (`audio/ambient/water`, `building`, `dayscape`) but `Ambient.js` 15-17 plays one dayscape track from a fixed list. No code selects a bed by biome. Frankendom needs the zone to name its bed (zone data).
- Gap, voice pool: 64 sources, first free, no priority, a missing source is dropped (`SoundManager.cpp` 414-421; `CSoundBase.cpp` 97-101). A 3-on-1 fight with several hit cues per exchange can fill it. Frankendom needs a per-frame cap on concurrent combat cues with the hero's own cues first; the donor has neither.
- Gap, animation-driven hits (`UnitAnimation.cpp` 277; `Sound.js` 49): the hit sound fires from the animation, not from the hit. Frankendom's server-verified hits must drive the cue (the event), with the animation only for timing.
- Gap, audibility by camera: the off-screen cull (`SoundGroup.cpp` 204-205) uses the camera and is client-only, which fits the ruling. The engine-side gate (`CCmpSoundManager.cpp` 71) uses line-of-sight visibility to the viewed player. Frankendom should gate combat cues on the duel's participants being visible to the player, not on the camera framing.
- Note, reads oddly but works: `splice(this.recordLength, this.damageRecord.length-1)` (`BattleDetection.js` 67) removes the one extra element. No fix needed.
- Not read: `shouldPlaySound` in `UnitAnimation.cpp`; the caller's handling of a missing source; `CFastRand`; the rolloff model; the `Looping` tag; the `timer_Time` unit (inferred seconds).
