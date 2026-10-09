# levy-street-world-of-claudecraft (sound-music, cell 15)

Donor: /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/game/music_zones.ts | Licence: MIT | TypeScript | symbol musicZoneForLocation / riftMusicZoneForTheme

## 1. Mechanism

- Pure function, no state, no tick. Called when the player's location or dungeon context changes. It returns a music zone key; playback is not in this file.
- Inputs to `musicZoneForLocation`: zone id, biome id, `inHub`, `inDungeon`, and an optional dungeon id. Rift floors use `riftMusicZoneForTheme(themeName)`, keyed by the floor's display name.
- Priority order, first match wins:
  1. In a dungeon: the dungeon's cue if a dungeon id is given, else a default crypt cue.
  2. In a hub: the town cue for the zone id, else the zone override, else the biome default.
  3. Overworld: the zone override, else the biome default.
- The biome table is exhaustive over the biome enum (checked by the compiler). Paint-only biomes (beach, desert, volcano, cave) borrow the nearest mood, so every zone resolves to a cue.
- `riftMusicZoneForTheme` looks up the display name; an unknown name falls back to a void cue. A comment (lines 84-85) says `tests/music.test.ts` pins the table against `RIFT_THEMES`; that test was not read.
- `shouldResetMusicForDungeonEntry` (114-119) returns true only when the next dungeon id is non-null and differs from the previous one. It tells the playback layer when to restart music.
- Output: a string key from the `MusicZone` union. Nothing is written to game state.

## 2. Key functions

- `riftMusicZoneForTheme`, `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/game/music_zones.ts`, lines 106-108. Display name to rift cue, void fallback.
- `shouldResetMusicForDungeonEntry`, same file, lines 114-119. Restart music only on a real dungeon change.
- `musicZoneForLocation`, same file, lines 122-135. Layered priority: dungeon, then hub, then overworld.
- `dungeonMusicZoneForDungeon` (called at line 130; defined at line 15 of `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/game/dungeon_music_zones.ts`, body not read). Dungeon id to cue.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Layered lookup: specific override, then group default, then biome default | Town map `eastbrook_vale` to `town_eastbrook`, `mirefen_marsh` to `town_fenbridge`, `thornpeak_heights` to `town_highwatch` (lines 39-43) (theirs) |
| Table with a fallback key for unknown input | Void default `rift_void` (line 107); crypt default `dungeon_hollow_crypt` (line 130) (theirs) |
| Exhaustive map over an enum, checked at compile time | Biome to cue, e.g. beach to jungle, desert to ember, cave to dusk (lines 62-80) (theirs) |
| Rift name to cue table with an authored override | `Infernal Citadel` to `rift_ember`; cave bosses borrowed from the archetype (lines 86-103) (theirs) |
| Restart the track only when the dungeon id changes | Track names such as `vale`, `dusk`, `rift_frost` (theirs) |

## 4. TypeScript sketch

Licence MIT: the selection logic is lifted from the donor (music_zones.ts, lines 106-135), with the tables trimmed to a few entries and the dungeon lookup passed in as a function so the sketch has no imports.

simplified: tables are trimmed to a few entries; the `MusicZone` union (33 members, lines 4-37) is a plain string; `dungeonZone` is passed in; `dungeonId` has no default of null; `shouldResetMusicForDungeonEntry` (114-119) is not in the sketch; the sketch computes the biome layer before the dungeon branch (the donor does too, line 129), so an unknown biome yields undefined where the donor's compile-time check forbids it.

```ts
// Licence: MIT
// Lift: selection logic from /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/game/music_zones.ts (riftMusicZoneForTheme 106-108, musicZoneForLocation 122-135). Tables trimmed.
type BiomeId = string;
type MusicZone = string;

const TOWN_MUSIC: Record<string, MusicZone> = { eastbrook_vale: 'town_eastbrook' };
const ZONE_MUSIC: Record<string, MusicZone> = { farshore_isle: 'farshore', proving_shore: 'proving_shore' };
const BIOME_MUSIC: Record<BiomeId, MusicZone> = { vale: 'vale', marsh: 'marsh', beach: 'jungle' };
const RIFT_MUSIC: Record<string, MusicZone> = { Frostbound: 'rift_frost', Emberforge: 'rift_ember' };

export function riftMusicZoneForTheme(themeName: string): MusicZone {
  return RIFT_MUSIC[themeName] ?? 'rift_void';
}

export function musicZoneForLocation(
  zoneId: string,
  biome: BiomeId,
  inHub: boolean,
  inDungeon: boolean,
  dungeonId: string | null,
  dungeonZone: (id: string) => MusicZone,
): MusicZone {
  const biomeLayer = BIOME_MUSIC[biome];
  if (inDungeon) return dungeonId ? dungeonZone(dungeonId) : 'dungeon_hollow_crypt';
  if (inHub) return TOWN_MUSIC[zoneId] ?? ZONE_MUSIC[zoneId] ?? biomeLayer;
  return ZONE_MUSIC[zoneId] ?? biomeLayer;
}
```

## 5. Lands in

- Frankendom file(s): TARGET `src/fight/sound.ts` (the layered lookup in code); the tables become fields of the zone catalogue (zones as data).
- Parity-checklist row: 20 (catalogue as runtime source) and 21 (catalogue fields) for the music-cue field per zone; 12 (combat sound cues) for the playback side.
- Reuse tag: adapt. The layered lookup and fallbacks are reusable. The tables are theirs and must become Frankendom zone data.
- Brief rule served: zone-schema rule (every property is a data field with a default); rules 7-9 n/a

## 6. Gaps and risks

- Conflict with a Frankendom ruling: zones as data. The donor hard-codes zone ids, biome ids and rift names in TypeScript tables. Port the tables to data, not the literals.
- No playback in this file: no crossfade, duration, combat override or ducking. Those live in the playback layer, which was not read here.
- Rift names are display strings. A rename silently falls back to the void cue unless the test catches it.
- Dungeon entry reset only fires on an id change. Re-entering the same dungeon does not restart the track.
- Licence MIT: lift allowed with the path cited (done above).
- Client only. The zone cue is cosmetic and takes no part in server-verified kills; it must only read the zone id and flags the server already sent.
