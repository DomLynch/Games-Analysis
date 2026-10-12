# keldaanCommunity-pokemonAutoChess (sound-music, cell 2)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/pages/utils/audio.ts` (with `pages/after-game.tsx` 89-101 and `game/components/board-manager.ts` 832-859) | Licence: GPL-3.0 (donor `LICENSE`, title "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007") | TypeScript (Phaser client) | symbol `playMusic`

Checked: Read in full: `audio.ts` (108 lines) and `config/game/music.ts` (14 lines). Read in part: `after-game.tsx` 84-101 (end jingle and end bed), `board-manager.ts` 825-862 (region and encounter music), `game-container.ts` 780-800 (evolution sound), `town-encounters.ts` 109-115, `config/maps/regions.ts` (grep count only: 145 `music:` fields; values not read). Not read: the Phaser sound object internals (`destroy`, `stop` events) and the endMusic lifecycle. Confidence: high on the stinger-then-bed order and the encounter-return; medium on the lifecycle of the end bed. Hit and spell sounds: none found. A grep of `public/src` for `.ogg`, `.wav` and `.mp3` finds the 18 SOUNDS names in `pages/utils/audio.ts` (lines 8-25, 44 for music) and `after-game.tsx` line 98; `playSound` is called from preparation.tsx, game-store.tsx, game-choice.tsx, game-scene.ts, pokemon-avatar.ts and game-container.ts with those 18 keys only. The catalogue has no attack, hit or spell cue. The topic's hit/spell part is therefore NONE in this donor; the note covers the stinger, bed and music-switch mechanisms only. Camera scope: n/a (sound topic).

Best transferable idea: play a short result stinger first, then start a quieter bed a fixed delay after the stinger ends, with the bed chosen by the result tier; and for a boss or encounter, play its track for one loop and then return to the zone track.
Decision (proposed): adapt — the stinger-then-bed and the encounter-return fit the victory/finisher and boss-intro staging, but the donor cuts instantly and has no layering; adapt keeps the order and fixes the missing-stinger silence (the bed still starts).
Acceptance: after a won Pit or world fight the victory stinger plays and the zone bed starts 1000 ms after it ends at one third of loop volume; with the stinger file missing, the bed still starts (a client test asserts the bed call happens).

## 1. Mechanism

- Sound catalogue: 18 keys (`audio.ts` 7-26), each made into an HTML audio element at module load (`preloadSounds` 32-36, called at 64). Global UI cues: body-level listeners play BUTTON_HOVER on a button mouseover and BUTTON_CLICK on a click on or inside a button (48-62, 65).
- Sound effect: `playSound(key, volume)` (67-76) rewinds the clip, sets volume to `volume * sfxVolume / 100` (71), and plays it; an unknown key returns null (75).
- Music: `playMusic(scene, name)` (82-108). It returns at once if the scene already plays the same key (83). Otherwise it destroys the current music object (84) before it creates the next one as a looped Phaser sound (87-89). The music volume follows the musicVolume preference live (91-95), and that subscription is removed on the sound's stop event (96). `pauseOnBlur` follows the playInBackground preference (99). Playback starts at `musicVolume / 100` with loop (101-104). Errors are logged (105-107). The switch is a hard cut: the old track is destroyed before the new one exists.
- Region music: `playMusic(this.scene, RegionDetails[this.player.map].music)` (`board-manager.ts` 832). Each region carries a `music` field (`config/maps/regions.ts` 8; 145 fields by grep).
- Encounter stinger with return: when the town encounter has an entry in `MusicByTownEncounter` (845), it plays that track first (847), then registers `once("looped")` on it (848). The region track plays again at the first loop boundary (849-851).
- Treasure-town variants: stages 0, 10 and 20 go through `getMusicAlt` (855-859). `getMusicAlt` returns the `alt` variant only for those three tracks (`config/game/music.ts` 5-13), and `alt` is `new Date().getHours() % 2 === 0`, evaluated once when the module loads (3).
- End of game: for the local player's entry (after-game 84-101): jingle = `playSound("FINISH" + rank, musicVolume / 100)` (89-92); `playSound` multiplies that again by sfxVolume / 100 (audio 71), so the stinger volume is musicVolume x sfxVolume (each 0-100, over 10000), while the bed is `musicVolume / 300` directly with no sfx scaling; the end bed is chosen by rank: rank 4 or below gets AT_THE_END_OF_THE_DAY, otherwise IN_THE_HANDS_OF_FATE (94-98); the bed volume is `musicVolume / 300` (99); the bed starts 1000 ms after the jingle's `ended` event (100-101). So the order is stinger, a short pause, then a quieter bed; the bed tier depends on rank.
- Evolution cue: the `stars > 1` branch plays EVOLUTION_T2 when the stars are 2 and EVOLUTION_T3 otherwise (`game-container.ts` 790).
- Tick: none. Everything is event-driven: a state change or a scene event starts a sound. The only timing is the 1000 ms bed delay and the loop event.

## 2. Key functions

- `playSound`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/pages/utils/audio.ts` 67-76.
- `playMusic`: same file, 82-108 (same-key return at 83; destroy at 84; loop volume at 102).
- End jingle and bed: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/pages/after-game.tsx` 89-101.
- Region and encounter music: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/board-manager.ts` 832-855.
- `getMusicAlt`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/config/game/music.ts` 3-14.
- `MusicByTownEncounter`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/config/game/town-encounters.ts` 109-115.
- Evolution cue: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/game-container.ts` 790.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Result stinger, then a bed after the stinger ends | Bed delay 1000 ms (after-game 101) |
| Bed at one third of loop volume | Divisor 300 for the bed, 100 for loops (after-game 99; audio 102) |
| Bed chosen by result tier | Rank 4 or below vs the rest (after-game 95) |
| Stinger chosen by rank | FINISH1 to FINISH8 (audio 13-20); no key above 8 |
| Encounter track: one loop, then return to the zone track | The loop event (board-manager 848) |
| Same key: no restart; old music destroyed first | Key check (audio 83-84) |
| Treasure-town alt variant | Hour parity, read once at load (music 3) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the stinger plays first and the bed starts 1000 ms after the stinger ends, at one third of the loop volume (donor `/300`, after-game 99-101). It also keeps the encounter-return (on the encounter handle's loop end, only if it is still current) and the same-key check before a restart. Fix: the bed starts even when the stinger did not load. In the sketch `playSting` is an abstract callback, so the donor's double volume scaling is not modelled. The donor only attaches the bed to a loaded stinger (`jingle?.addEventListener`, after-game 100), so a missing stinger silences the bed. It omits: the Phaser sound object, the HTML audio element, the preference subscriptions and the stop-event cleanup, the pauseOnBlur setting, the hour-parity alt flag, the rank-tier bed choice (the sketch takes the bed key as input), and the per-region table.

```ts
// Licence: copyleft (GPL-3.0, per donor LICENSE). Clean-room sketch from the described mechanism.
export interface Handle {
  key: string;
  onLoopEnd(fn: () => void): void; // one-shot per loop boundary (donor: once("looped"))
  stop(): void;
}

export interface Mixer {
  start(key: string, volume: number): Handle;
}

export class BedDirector {
  private handle: Handle | null = null;

  constructor(private mixer: Mixer) {}

  // Same key: no restart (donor: scene.music?.key === "music_" + name returns early).
  play(key: string, volume: number): void {
    if (this.handle !== null && this.handle.key === key) return;
    if (this.handle !== null) this.handle.stop(); // donor destroys the old music object first
    this.handle = this.mixer.start(key, volume);
  }

  // Encounter track plays one loop, then the region track returns (donor: once("looped") on the encounter handle).
  playEncounter(encounterKey: string, regionKey: string, volume: number): void {
    this.play(encounterKey, volume);
    const h = this.handle;
    if (h !== null) {
      h.onLoopEnd(() => {
        if (this.handle === h) this.play(regionKey, volume);
      });
    }
  }
}

export interface Sound {
  onEnded(fn: () => void): void;
}

// Stinger then bed: the bed starts 1000 ms after the stinger ends; bed volume is musicVolume / 300 (loop volume is / 100).
export function stingerThenBed(
  playSting: (key: string, volume: number) => Sound | null,
  startBed: (key: string, volume: number) => void,
  schedule: (ms: number, fn: () => void) => void,
  stingerKey: string,
  bedKey: string,
  musicVolume: number, // 0-100
): void {
  const sting = playSting(stingerKey, musicVolume / 100);
  const startIt = () => schedule(1000, () => startBed(bedKey, musicVolume / 300));
  // Fix: donor only attaches the bed to a stinger that loaded (jingle?.addEventListener); a missing stinger silenced the bed.
  if (sting !== null) sting.onEnded(startIt);
  else startIt();
}

export {};
```

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (client-only, new): result stinger then bed, and boss or encounter intro with return. Parity-checklist row 12 (combat sound cues). Boss intro and finisher staging also sit under this row.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine; sound is a client-only consumer); row 12 cue sub-line

## 6. Gaps and risks

- GPL-3.0: clean-room, shape only. The sketch is written from the described order, not from the donor lines.
- Two volume scalers mix: the stinger is scaled by both music and sfx preferences, the bed by music only. Fix in the port: pick one rule (stinger = music bus, bed = music bus, both with the 1:3 ratio).
- Encounter return falls back to the town track: `RegionDetails[...].music ?? DungeonMusic.TREASURE_TOWN` (board-manager 851), so a region with no music field returns to TREASURE_TOWN.
- Hit and spell sounds are absent: no attack, hit or spell cue in `public/src` (the SOUNDS catalogue has 18 keys, none for combat). Not claimed here.
- Defect: a missing stinger silences the end bed (after-game 100). Fixed in the sketch.
- Ranks above 8: the FINISH keys stop at FINISH8 (audio 13-20), so `playSound` returns null, and with the defect above the bed would not start. The maximum player count was not read.
- Hard cut between tracks: no crossfade (the old music is destroyed before the new one is created, audio 84-87).
- End bed lifecycle: `endMusic` is a raw HTML audio element and `playMusic` does not stop it. Not read whether it is stopped when the after-game page closes.
- Preference cleanup depends on Phaser emitting `stop` (audio 96). Phaser internals not read; whether `destroy()` emits `stop` is unverified.
- Frankendom rule: kills are server-verified. Stingers and beds are client presentation only and must never gate a server result or the duel step.
- The region and encounter tables are zone data. The 145 region entries were counted by grep; the values were not read one by one.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Error: the grep claim ('finds only after-game.tsx') was wrong; audio.ts holds 18 .ogg names (8-25, 44) and after-game.tsx 98, and six other files call playSound with those keys. The conclusion (no hit/spell cue) still holds. Confirmed.
- Error: jingle volume presented as plain musicVolume/100; playSound multiplies by sfxVolume/100 again (audio.ts:71), so the stinger is musicVolume*sfxVolume while the bed is musicVolume/300. Confirmed.
- Missed: the encounter return falls back to DungeonMusic.TREASURE_TOWN when the region has no music field (board-manager.ts:851). Added.
- Verified OK: audio.ts 7-26/32-36/48-65/67-76/82-108, after-game 94-101, board-manager 832/845-859, music.ts alt at load, town-encounters 109-115, game-container 790, 145 music fields, GPL-3.0.

Fixed 2026-10-12: replaced the grep claim, split the stinger and bed volume chains, added the volume-scaler gap and the TREASURE_TOWN fallback. No sketch code change.
