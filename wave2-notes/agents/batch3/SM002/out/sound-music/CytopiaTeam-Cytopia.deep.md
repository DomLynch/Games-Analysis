# CytopiaTeam-Cytopia (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/CytopiaTeam-Cytopia/src/services/AudioMixer.cxx` (with `src/services/AudioMixer.hxx`, `src/engine/audio/Soundtrack.cxx`, `src/engine/audio/AudioConfig.cxx`, `src/Game.cxx`, `src/MainMenu.cxx`, `src/services/GameClock.cxx`, data `data/resources/data/AudioConfig.json`) | Licence: GNU GPL v3 (`license.txt`, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | C++ with OpenAL | symbols `AudioMixer::play`, `AudioMixer::prune`, `AudioMixer::playSoundtrackWithEffect`, and the timer block inside `Game::run` (Game.cxx 106-141)

Checked: confidence moderate-high that the trigger, timer and stinger mechanism is read correctly (read in full: `AudioMixer.cxx` 1-415, `AudioMixer.hxx` 1-220, `Soundtrack.hxx` 1-100, `Soundtrack.cxx` 1-46, `AudioConfig.hxx/.cxx`, `GameClock.cxx` 1-50 and 76-89, `GameClock.inl.hxx` 1-20, `Game.cxx` 38-50 and 95-141, `MainMenu.cxx` 20-70, `SettingsMenu.cxx` 140-166, the data table `AudioConfig.json` 1-170). camera_scope: n/a (sound cell). Not read: `Randomizer::choose` (only the template signature, `Randomizer.hxx` 29; its distribution is not claimed here); `ResourceManager` decoding and cache eviction beyond the constructor (`m_Age`, `m_CacheSize` seen, not read); the audio files themselves (ogg). Negative claims were checked by grep on the whole `src` tree: `onTrackFinished` has no caller, `AL_LOOPING` does not appear, no effect is passed by any caller (every `play` call uses the default `AL_EFFECT_NULL`).

## 1. Mechanism

- A trigger table, not a playlist. `AudioConfig.json` maps each track to one or more triggers (`MainMenu`, `MainTheme`, `NatureSounds`). The mixer builds `m_Triggers`, a per-trigger list of track ids, at construction (`AudioMixer.cxx` 31-36). The data has 9 music entries (8 with `MainTheme`, 1 with `MainMenu`) and 18 sound entries, 2 of which carry `NatureSounds` (`AudioConfig.json` 47, 85, 112 with the trigger lines below them; `"triggers": []` at 72 and others).
- Play one, at random. `getTrack( trigger )` takes the list for the trigger, warns if it is empty (116), and picks one entry with `Randomizer::instance().choose` (119). Play is not chained: the next trigger starts a new pick.
- Two timers, two layers. `Game.cxx` 106-141 registers two real-time clock tasks: `MainTheme` on an 8-minute period and `NatureSounds` on a 3-minute period (115 and 122 for the periods). Both fire at registration (0 s delay runs the callback at once, `GameClock.inl.hxx` 13-15) and then repeat. The music and the nature bed are therefore two independent timers that overlap by design; neither waits for the other or for the previous track to finish.
- Positional mode. With `audio3DStatus` set (107), each trigger plays at a fixed 3D point: `MainTheme` at `{0, 0.5, 0.1}` (129), `NatureSounds` at `{0, 0, -2}` (136). The menu trigger is at `{0, 3, 0.5}` (`MainMenu.cxx` 54).
- Two buses per track. `Soundtrack` holds two OpenAL sources: `source[0]` for effects and `source[1]` for music (`Soundtrack.hxx` 71, 73), and binds its buffer to whichever one its `isMusic` flag selects (`Soundtrack.cxx` 37). Live volume changes set the gain of the matching source on every playing track (`AudioMixer.cxx` 139-156).
- Stingers are hard cuts. The main-menu opening stops everything, then plays `MajorSelection` (`MainMenu.cxx` 26, 28). Quit does the same and plays `NegativeSelect` (`Game.cxx` 43, 46). Both use `stopAll()`, which calls `alSourceStop` on both sources of every playing track (`AudioMixer.cxx` 223-224).
- Playing list and prune. Each play pushes a pointer onto `m_Playing` (269, 374) without checking whether the track is already playing. A prune task runs on a 5-minute real-time period (80-86) and removes entries whose source is no longer in `AL_PLAYING` (240-241). Between prunes, finished entries stay on the list.
- Clock semantics (`GameClock.cxx` 10-14). A real-time task that returns `false` is re-queued with its period. The re-queue time is the tick time plus the period (14), not the scheduled time, so each repeat drifts by the tick latency.

## 2. Key functions

- `AudioMixer::AudioMixer` (`AudioMixer.cxx` 21-89): reads the JSON, builds the trigger table (31-36), opens the device and context, sets the listener, registers the 5-minute prune task (80-86).
- `AudioMixer::play(AudioTrigger)` path: `getTrack` (106-121) picks one track at random; `play` (170-180) plays it or applies the effect path.
- `AudioMixer::playSoundtrack` (259-271): starts the source chosen by `isMusic`, pushes the track onto `m_Playing`, sets `isPlaying`.
- `AudioMixer::prune` (230-251): the only path that removes finished tracks in normal play.
- `AudioMixer::stopAll` (213-228): the stinger hard cut.
- `Game::run` timer block (`Game.cxx` 106-141): the two layers and their periods.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Trigger name maps to a list of tracks; one is chosen at random per trigger | 3 trigger names (theirs, `AudioConfig.hxx` 20); 9 music and 18 sound entries (theirs, `AudioConfig.json`) |
| Two independent repeat timers make two layers | Music every 8 min (theirs, `Game.cxx` 115); nature every 3 min (theirs, 122) |
| Prune finished voices on a slow poll | 5 min (theirs, `AudioMixer.cxx` 86) |
| 3D placement per trigger | `{0, 0.5, 0.1}` music, `{0, 0, -2}` nature, `{0, 3, 0.5}` menu (theirs, `Game.cxx` 129, 136; `MainMenu.cxx` 54) |
| Stinger: stop everything, then play a cue | No fade time (theirs, `AudioMixer.cxx` 223-224: stop at once) |
| Voice limit | None found |
| Priority | None found |

## 4. TypeScript sketch

simplified: the sketch keeps the trigger table, the per-trigger random pick and the independent timers, and adds four things the donor does not have: a drift-free timer (scheduled time plus period, skipping missed periods), a stinger that fades the bed before the cue, a finish event that removes a voice when it ends, and a voice cap that steals the oldest non-music voice. It omits the 3D positions, the effect slots, the gain buses, the listener setup and the ogg decoding. `VOICE_CAP` and `STINGER_FADE_MS` are proposals, not donor values. Typechecked on the VPS with `tsc --strict --target es2020` (exit 0).

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Ideas kept: trigger -> pick-one table (data), per-trigger repeat timers that run independently (music and nature layers), stinger that stops the bed first.
// Defects fixed: next time = scheduled time + period (no drift); the bed fades before a stinger instead of a hard cut; finished voices are removed on the finish event; a voice cap.

type Trigger = "MainMenu" | "MainTheme" | "NatureSounds";
type TriggerTable = Record<string, string[]>;   // data: resources/data/AudioConfig.json "triggers"

interface ScheduledTrigger { trigger: Trigger; periodMs: number; nextAtMs: number; }

const VOICE_CAP = 32;          // proposed; the donor has no cap (AudioMixer.hxx 161 holds an unbounded list)
const STINGER_FADE_MS = 300;   // proposed; the donor stops at 0 ms (AudioMixer.cxx 223-224)

// Pick one track for a trigger. The donor uses a random choice (AudioMixer.cxx 119); its distribution was not read.
function pickTrack(table: TriggerTable, trigger: Trigger, rand: () => number): string | null {
  const list = table[trigger] ?? [];
  if (list.length === 0) return null;
  return list[Math.floor(rand() * list.length)];
}

// Drift-free timer. The donor re-queues from the tick time plus the period (GameClock.cxx 14).
// This keeps the scheduled time, and skips missed periods so a long stall fires once.
function advance(s: ScheduledTrigger, nowMs: number): ScheduledTrigger {
  let next = s.nextAtMs + s.periodMs;
  while (next <= nowMs) next += s.periodMs;
  return { ...s, nextAtMs: next };
}

// Each trigger timer is checked on every tick and fires when due. Returns the track to play, if any.
function tick(s: ScheduledTrigger, table: TriggerTable, nowMs: number, rand: () => number): { track: string | null; next: ScheduledTrigger } {
  if (nowMs < s.nextAtMs) return { track: null, next: s };
  return { track: pickTrack(table, s.trigger, rand), next: advance(s, nowMs) };
}

interface Mixer { fadeOut(ms: number): void; play(id: string): void; }

// Stinger: fade the bed, then play the cue on top of it.
function stinger(mix: Mixer, id: string): void {
  mix.fadeOut(STINGER_FADE_MS);
  mix.play(id);
}

interface Voice { id: string; isMusic: boolean; }

class Voices {
  private live: Voice[] = [];
  start(v: Voice): boolean {
    if (this.live.length >= VOICE_CAP) {
      // Steal the oldest non-music voice. Music is kept while anything else can go.
      const idx = this.live.findIndex((x) => !x.isMusic);
      if (idx < 0) return false;
      this.live.splice(idx, 1);
    }
    this.live.push(v);
    return true;
  }
  // Fix: remove on the finish event, not on a 5-minute poll.
  finished(id: string): void {
    const i = this.live.findIndex((x) => x.id === id);
    if (i >= 0) this.live.splice(i, 1);
  }
  count(): number { return this.live.length; }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/sound-layers.ts` (new, client-only; shares the same module as cell 15 of CleverRaven-Cataclysm-DDA, so one client sound module serves both). Parity-checklist row 12 (combat sound cues). The trigger table is zone data; the timers and the voice cap are client code. The engine never imports the module.
- Use in the fight: the nature/ambience bed is a zone-data trigger on its own timer; a death or victory stinger fades the bed first, then plays the cue. Both are client-side and are driven by server-verified events (kill, death), never the reverse.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room, shape only; no lines copied)
- Brief rule served: client-only sound layer (one engine; sound reads events and never changes state); rules 7-9 n/a

## 6. Gaps and risks

- Licence is GPL-3.0 (copyleft). Clean-room only.
- No biome or zone beds. The data has three trigger names, none of them biome-keyed (`AudioConfig.hxx` 20). Frankendom's zones-as-data need per-zone beds; they are not in this donor.
- No crossfade. Stingers stop everything at once (`AudioMixer.cxx` 223-224); the next track starts with no fade. Fix: the 300 ms bed fade in the sketch (proposed value).
- Layers are not coordinated. The music and nature timers run without knowledge of each other, so the two can overlap on a fixed beat and a long track can overlap its own next play. The donor never checks whether a track is already playing before `alSourcePlay` and `push_front` (`AudioMixer.cxx` 267-269). Fix: a per-trigger "playing" check and a ducking rule in the client mixer.
- Drift on the timers (defect). The re-queue time is the tick time plus the period (`GameClock.cxx` 14), so each repeat is late by the tick latency. Fix: schedule from the previous scheduled time (`advance` in the sketch).
- Dead finish callback (defect). `onTrackFinished` (`AudioMixer.cxx` 378-394) is never registered (the `onTrackFinishedFunc` global at 19 has no assignment). If it were called with no match, `auto &track = **it;` (386) dereferences `end()`. Fix: remove it, and use the finish event in the new client module.
- Stale playing list (defect). `m_Playing` keeps finished pointers until the next 5-minute prune (`AudioMixer.cxx` 80-86, 240-241). Fix: remove on the finish event.
- Effect slots leak (defect). Each effected play creates an effect slot (`AudioMixer.cxx` 357) and nothing deletes it in this file; `alDeleteAuxiliaryEffectSlots` is declared at 288 and loaded at 322, and never called. No caller passes an effect, so the path is dead in this build. Fix: delete the slot on finish, or drop the path.
- Repeat count not applied (defect). `Soundtrack.Loop` is declared (`Soundtrack.hxx` 46) and documented as 0 to 255 (43-44), but no code sets `AL_LOOPING` or reads `Loop`. Fix: apply it, or remove it.
- No voice cap and no priority. `m_Playing` is an unbounded list (`AudioMixer.hxx` 161). Fix: the cap in the sketch, with music kept while anything else can go.
- The Frankendom fight has no ambience today. Adopting the trigger table and timers only makes sense once the zone bed data exists.
