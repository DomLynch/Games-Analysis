# open-duelyst-duelyst (sound-music, cell 1)

Donor: `/mnt/frankendom-donors/open-duelyst-duelyst/app/audio/audio_engine.js` | Licence: CC0-1.0 (package.json `"license": "CC0-1.0"`; the root COPYING is the CC0 1.0 Universal legal code) | JavaScript (cocos2d-js 3.x era) | symbol `play_effect_for_interaction`

Checked: The hint file `SoundEffectSequence.js` (158 lines) was read in full, but it is only a sequencer. The real mechanism is in `audio_engine.js` (read in full, 703 lines), with `audio_object.js` (read in full, fade and play path), `sound_effect_object.js` and `music_object.js` (read in full), `app/common/config.js` 562-572 and 1222-1246, and the bundled cocos2d audio: `vendor/cocos2d-html5/cocos2d/audio/CCAudio.js` 760-816, `vendor/cocos2d-html5/lib/cocos2d-js-v3.3-beta0.js` 33665-33711, and a grep of the whole lib for `getElapsed` and `getDuration`. Eight candidate files opened. Confidence: high for the desktop (`window.isDesktop`) path of the engine; the web branch was read, but I did not check which build ships; the `EaseInOut(3.0)` formula was not read. Not a camera cell. Grep for ambien, biome, stinger and crossfade in `app/` found no biome bed, no stinger and no layering code (only cocos internals).

Best transferable idea: Collect near-simultaneous hit or spell cues for about 60 ms, play only the highest-priority one, let a playing cue block equal or lower priority for 0.5 s, and attenuate by the count of fresh cues so a burst does not stack into noise.
Decision (proposed): adapt — take the cue slot and the stacking gain for hit and spell cues, drop the cocos and desktop split and the sequence dedupe, and do not copy the defects listed in section 6.
Acceptance: Three hits landing in one 60 ms window play one hit cue, the heaviest, and a finisher cue of higher priority cuts into a playing hit cue; a unit test asserts that three requests inside 0.06 s give one start and that a lower-priority request during the 0.5 s block is dropped.

## 1. Mechanism

Three separate mechanisms in one engine, plus a sequencer.

(a) Interaction cue slot. `play_effect_for_interaction(src, priority)` (578) defaults priority to 0 (579, config 1244). If an interaction cue is playing and started less than 0.5 s ago (581, config 1242), a new request is parked as "waiting" and played only if its priority is strictly higher than the playing cue's (614). Otherwise it is dropped, because the waiting slot is reset (611). When nothing is blocking, the first request starts a 0.06 s collect window (601, config 1231) that is polled every animation frame (604). Inside the window a higher-priority request replaces the waiting cue, and the window does not restart (592-596). When the window closes, the waiting cue is played only if it is not blocked by an equal or higher priority cue (613-614), and a higher-priority cue stops the cue that is playing (617). Priority ladder: 0 default, 1 click, 2 select (config 1244-1246); other levels such as error are passed per call (GameLayer.js 1019).

Order of operations: request, then (blocked? park only if higher : collect 60 ms and keep the highest priority), then at window end re-check the block, stop any replaced cue, play.

(b) Polyphony gain. `_update_sfx_volume` (286-326) counts sounds still playing and younger than 0.35 s (293, config 1234). The modifier is `(1/max(1,n))^0.3` (297, config 1239). Each sfx gain is base x master x modifier (163). In `play_effect` the new sound is started with the current gain (553) and the modifier is recounted afterwards (566), so the newest sound starts with a gain that does not count itself (defect 2).

(c) Crossfades. `play_music` (398-416): when the source differs, `stop_music(fade)` (404) moves the old track into `_music_stopping` (427) and fades it out, while the new track fades in from volume 0 (310-311, through `audio_object.fade_to`, 402-434) over `MUSIC_CROSSFADE_DURATION` = 0.5 s (config 568). Voice uses the same code with `VOICE_CROSSFADE_DURATION` = 0 (config 569), which is an instant change (421-431). The tween uses a cocos `actionTween` with `EaseInOut(3.0)` (424).

(d) Sound sequence (`SoundEffectSequence.js`). A list of cues played in order: each step waits `cc.delayTime(duration)` (138) and then calls `playNext` (55-76). The last cue loops by re-queuing itself (71) when flagged as looping.

Caller evidence (grep only, these files were not opened): interaction cues from UI layers and GameLayer.js 1019; `play_music` on per-faction start screens (MainFrostfireLayer.js 250; the grep shows the same track `music_ageofdisjunction` in five start layers); a per-challenge music override (BattleMap.js 343); one sequence use (MatchmakingLayer.js 270). No layered music and no biome ambience bed exist in this donor.

## 2. Key functions

- `play_effect_for_interaction` 578-598: entry point, block and collect logic (`audio_engine.js`).
- `_update_waiting_effect_for_interaction` 600-606: polls each frame until the 0.06 s window closes.
- `_play_waiting_effect_for_interaction` 608-639: re-checks the block, compares priority, stops the replaced cue, plays.
- `_update_sfx_volume` 286-326: polyphony modifier (desktop branch 287-303, web branch 304-325).
- `play_effect` 538-569: start, then recount.
- `play_music` 398-416 and `stop_music` 423-432: the crossfade pair.
- `audio_object.fade_to` 402-434 and `audio_object.play` 266-315 (`audio_object.js`).
- `SoundEffectSequence.playNext` 55-76, `SoundEffectData.play` 128-146, `SoundEffectData.getDuration` 118-127 (`SoundEffectSequence.js`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Collect near-simultaneous cues for a short window, play the highest priority | 0.06 s (config.js 1231) |
| A playing cue holds the slot for a block window; equal or lower priority is dropped | 0.5 s (config.js 1242) |
| Gain falls as a power of the count of fresh cues | Count window 0.35 s (config.js 1234); power 0.3 (config.js 1239). From the formula (computed, not run): 2, 3 and 4 fresh cues give gains of about 0.81, 0.72 and 0.66 |
| Music handover with overlap; voice is a hard cut | Music 0.5 s (config.js 568); voice 0 s (config.js 569) |
| Priority ladder | 0 default, 1 click, 2 select (config.js 1244-1246); other levels passed per call (not all read) |
| Starting volumes | Music 0.04 (config.js 1226); sfx 0.3 (config.js 1228) |

## 4. TypeScript sketch

simplified: keeps the interaction cue slot (collect window, block window, priority replace), the count-based gain and the linear music handover. It omits playback, the stop call (the caller must stop the cue reported as replaced; the donor stops it at audio_engine.js 617), the per-frame polling (time is passed in), the count of all sfx (only slot cues are counted), the sequence chain, and the cocos ease (linear used). It fixes defect 2 (the count includes the new cue before its gain is chosen). Defect 1 (the array used as a loop bound) does not appear in the sketch. Typecheck passed on the VPS: `npx -p typescript tsc --noEmit --strict --target es2020`, exit 0.

```ts
// Licence: CC0-1.0 (donor open-duelyst-duelyst). Written from the described mechanism, not a translation of the donor lines.
export interface CueConfig {
  cueWindowS: number;    // requests inside this window collapse to the highest-priority one
  blockingS: number;     // a playing cue blocks equal or lower priority cues for this long
  stackWindowS: number;  // only cues younger than this count towards attenuation
  stackPower: number;    // gain = (1 / max(1, n)) ** stackPower
}

// Donor values (config.js 1231-1242): seconds, except stackPower (ratio).
export const CUE_DEFAULTS: CueConfig = { cueWindowS: 0.06, blockingS: 0.5, stackWindowS: 0.35, stackPower: 0.3 };

interface Playing { id: string; priority: number; startedAt: number; }

export class CueSlot {
  private pending: { id: string; priority: number; since: number } | null = null;
  private current: Playing | null = null;
  private recent: Playing[] = [];

  constructor(private readonly cfg: CueConfig) {}

  // Called by gameplay code whenever a hit or spell cue fires.
  request(id: string, priority: number, now: number): void {
    if (this.pending === null) {
      this.pending = { id, priority, since: now };
    } else if (priority > this.pending.priority) {
      this.pending = { id, priority, since: this.pending.since }; // the window keeps its start time
    }
  }

  // Called once per frame. Returns the cue to start now with its gain, or null.
  flush(now: number): { id: string; gain: number } | null {
    const p = this.pending;
    if (p === null || now - p.since < this.cfg.cueWindowS) return null;
    this.pending = null;

    const cur = this.current;
    const blocked = cur !== null && now - cur.startedAt < this.cfg.blockingS;
    if (blocked && cur !== null && p.priority <= cur.priority) return null; // dropped

    // Count the new cue before choosing its gain.
    this.current = { id: p.id, priority: p.priority, startedAt: now };
    this.recent = this.recent.filter((c) => now - c.startedAt < this.cfg.stackWindowS);
    this.recent.push(this.current);
    const n = this.recent.length;
    return { id: p.id, gain: (1 / Math.max(1, n)) ** this.cfg.stackPower };
  }
}

// Crossfade gains for a track handover. fadeS = 0 is a hard cut (the donor's voice case).
export function crossfadeGains(elapsedS: number, fadeS: number): { incoming: number; outgoing: number } {
  if (fadeS <= 0) return { incoming: 1, outgoing: 0 };
  const t = Math.min(1, Math.max(0, elapsedS / fadeS));
  return { incoming: t, outgoing: 1 - t };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (new client module: `CueSlot` and `crossfadeGains`). Sound is client-only, so this module never decides a hit. Parity-checklist row 12 (combat sound cues). The batch hint said row 14, but in the addendum row 14 is HUD; sound cues are row 12.
- Reuse tag: rewrite-from-idea (CC0-1.0, permissive; the sketch is written from the mechanism)
- Brief rule served: 1 (one engine; the cue slot is a client module); rules 7-9 n/a

## 6. Gaps and risks

- Sound is client-only (camera, HUD and sound ruling). The slot chooses what to play, but the cue trigger must come from a server-verified fight event, never from a local timer that decides damage.
- MAX_ATTACKERS = 3: three hits in one moment give about 0.72 gain each (computed, not run). The collect window should merge simultaneous hits instead of stacking them.
- Priority has to come from hit tier (a heavier hit gets a higher priority). The donor has no damage tier, so this is a rule we must add.
- The donor is a card game. Its cue files are UI sounds, not hit or spell sounds; I read the mechanism, not the assets. No layered music, stingers or biome ambience exist here.
- Defects in the donor (idea kept, fix applied in the sketch):
  1. The loop bound is the array, not its length: audio_engine.js 270, 279 and 301 (`i < il` with `il` set to the array). The loop never runs, so stopping music and voice never get a volume update, and on desktop playing sfx never get the master volume change. fix: `il = arr.length`.
  2. Stale gain: a new sfx starts at 553 with a gain computed before the count that includes it (566). fix: count it, then start it with that gain (done in the sketch).
  3. A sequence cannot repeat a sound: `SoundEffectSequence.js` 27-30 keys entries by identifier, so a second add of the same hit sound is ignored. fix: key by entry index.
  4. Zero duration is cached: `getDuration` (119-121) caches the value once it is not null, and `audio_object.js` 150 returns 0 until metadata loads, so a step can advance at once and never re-read the real length. fix: read the duration on metadata load and do not cache 0.
  5. Web branch calls methods the bundled cocos audio class lacks. The web branch of `_update_sfx_volume` calls `getElapsed()` on a pooled cue that is still playing (audio_engine.js 315), and `SoundEffectData.getDuration` calls `getDuration()` on `cc.Audio` (`SoundEffectSequence.js` 123). In the bundled build, `cc.Audio` (lib 33665) has `getPlaying` (33711), but a grep of the whole lib file found no `getElapsed` or `getDuration` on it (the only `getElapsed` definitions are in action code, 20667). On web these read as TypeErrors when reached (not run). fix: keep our own start time and duration for each cue; never call undocumented methods on the engine's audio handle.
- Crossfade is one old-and-new pair. A biome border needs zone data for the bed names and the fade; the 0.5 s is the donor's value, not a tuned one.
- The cocos `EaseInOut(3.0)` formula was not read; the sketch uses a linear ramp.
