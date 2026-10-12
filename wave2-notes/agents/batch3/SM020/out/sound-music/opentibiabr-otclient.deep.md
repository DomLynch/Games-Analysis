# opentibiabr-otclient (sound-music, cell 3)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/src/framework/sound/soundmanager_protocol.cpp` | Licence: MIT (`/mnt/frankendom-donors/opentibiabr-otclient/LICENSE`: "OTClient is made available under the MIT License") | C++ (OTClient framework) | symbol `SoundManager::playProtocolSoundMain`

Checked: The hint file `combinedsoundsource.cpp` (131 lines, read in full) only fans every call out to each child source (34-35); it holds no mechanism. The real mechanism is the server-triggered cue path. Read: `src/client/protocolgameparse.cpp` 1964-1981 (event parse); `soundmanager_protocol.cpp` 34-46, 90-123, 166-200 (partly), 264-426 (gates, cooldown, variant pick, distance, pan, lanes; lines 1-33, 47-89, 124-165 and 200-254 not read); `soundmanager.cpp` 352-385, 395-414, 434-444; `soundchannel.h` (read in full) and `soundchannel.cpp` 23-140; `soundsource.cpp` 131-171 (fades); `soundmanager_itemambience.cpp` 83-95 and 161-186 (partly); `src/client/position.h` 184; `soundmanager.h` 111-115, 156-161, 221-223, 274. Candidate files opened: 10. Confidence: high for the cue path as read. The server sender is not in the box. The settings loader (lines 47-89 and 124-165) was not read, so how the volume values are stored is (not read). Not a camera cell.

Best transferable idea: Each server sound event plays one random variant from its id's pool, gated by a one-second per-id cooldown that is stamped only when the cue plays, with linear distance falloff to 8 tiles, stereo pan from the x offset, and a per-group volume.
Decision (proposed): adapt — take the server-cue-by-id path with per-id cooldown, distance falloff, variant pick and pan for hit and spell cues, and fix the donor's lane stacking by pre-empting the previous voice on each lane.
Acceptance: In a 3-on-1 fight, three hits with the same cue id inside one second play one hit sound, not three; a cue from 9 tiles away is silent; a cue from 4 tiles plays at about half volume; a server-side or unit test asserts that the cooldown key is the effect id and that an out-of-range cue does not start the cooldown.

## 1. Mechanism

The server sends a magic-effect sound event with a source group (one byte), a sound id (two bytes) and a position (`protocolgameparse.cpp` 1965-1968). The main event goes to lane `CHANNEL_EFFECT_MAIN` (3, `soundmanager.h` 113). The secondary event carries an extra enum byte (1974), which the client reads and then discards (`soundmanager_protocol.cpp` 399), and plays on `CHANNEL_EFFECT_SECONDARY` (12, `soundmanager.h` 115).

Order of operations in `playProtocolSoundMain` (367-395); the secondary path (397-426) is the same with the other lane:
1. Gate (369; 264-275): audio enabled; the group or type volume must be above 1 (271; volume table 90-123: sound types first, e.g. ambience at 99; then the source group: own battle 115, other players 117, creatures 119, anything else 100); and the sub-channel flag for the sound type must be on (274; 166-200, events are always on at 198).
2. Cooldown (372; 277-296): a per-effect-id timestamp. If the last play of this id was under 1000 ms ago, skip (292). The table is cleaned of entries older than 10 s (281).
3. Variant (375; 298-316): one id with no pool plays that id; a single pool entry plays that; otherwise a uniform random pick from the pool with the shared engine (314-315).
4. Play (383; 318-346): needs a local player and map positions (321-326) and a file name (328). Distance is Euclidean in tiles (position.h 184). Beyond 8 tiles the cue is dropped (333-334). Gain is `max(0.001, (1 - d/8) * volume/100)` (336; 381). Pan is `clamp(dx / 8, -1, 1)` (337). The cue starts through `playChannelSound` (339). The cooldown is stamped only after the start succeeds (344).

Layers: sounds on different lanes (main 3, secondary 12, plus music 1, ambient 2, UI 10 in `soundmanager.h` 111-115) are separate channels. `SoundChannel` (read in full) is a playlist with one current voice (`soundchannel.cpp` 27-80).

Sibling mechanisms (read, not the main note):
- Fades (`soundsource.cpp` 131-171): a fade in is `elapsed / T * gain` (161); a fade out falls linearly to zero over T (170). A fade reversed mid-way shifts the start time (134-141) so the level continues. The arithmetic was checked by hand for the on-to-off case only; not run.
- Item ambience (`soundmanager_itemambience.cpp` 83-94, 161-185): the scan distance is the larger of the tracked item distance and 8 (85). A tile is in range when it is on the same floor (92) and within the scan distance (93). Each effect keeps its nearest tile (161-185).

## 2. Key functions

- `playProtocolSoundMain` 367-395 and `playProtocolSoundSecondary` 397-426 (`soundmanager_protocol.cpp`).
- `shouldPlayProtocolSound` 264-275 and `shouldSkipProtocolCooldown` 277-296.
- `chooseProtocolAudioFileId` 298-316 and `playProtocolAudioFileId` 318-346.
- `getProtocolVolumeSetting` 90-123 and `isProtocolSubChannelEnabled` 166-200 (partly read).
- `SoundManager::play` 352-385, `playChannelSound` 395-414, `stopChannelSounds` 434-444 (`soundmanager.cpp`).
- `SoundChannel::play` 27-39, `enqueue` 59-67, `update` 69-80 (`soundchannel.cpp`).
- Event parse: `protocolgameparse.cpp` 1964-1981.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Per-effect-id cooldown, stamped only on success | 1000 ms (`soundmanager.h` 222); table cleanup 10000 ms (223) |
| Distance falloff to a floor, then drop | 8 tiles (`soundmanager.h` 221); gain floor 0.001 (`soundmanager_protocol.cpp` 336) |
| Stereo pan from the x offset | scale 8 tiles (337) |
| Per-group volume, 0 to 100, at or below 1 mutes | default 100 for other players (`soundmanager.h` 156) and ambience (161) |
| Variant pool, uniform pick | pool size is data (`randomSoundId`, 304-315) |
| Two lanes | channel 3 main (`soundmanager.h` 113), channel 12 secondary (115) |

## 4. TypeScript sketch

simplified: keeps the donor order (volume gate, cooldown, variant pick, distance gate, stamp on success), the gain and pan formulas, and the two-lane split. It adds the lane pre-empt that the donor lacks (`replaces`). It omits the sub-channel flags, the type-first volume table, the settings loader, the local-player null checks, the channel enable state, the cooldown table cleanup (the map grows in the sketch; the donor cleans it every 10 s), the debug log, and item ambience. The caller resolves `volume` from the group and type table.

```ts
// Licence: MIT donor (OTClient). Adaptation allowed by MIT; this sketch is written from the described mechanism.
export type Lane = 'main' | 'secondary';

export interface CueSettings {
  cooldownMs: number;        // per effect id; stamped only when the cue actually plays
  maxDistanceTiles: number;  // cues farther than this are dropped and do not stamp the cooldown
  panTiles: number;          // stereo pan scale in tiles
}

export interface Cue {
  effectId: number;
  lane: Lane;
  volume: number;            // 0..100, resolved by the caller from the source group and sound type
  variants: string[];        // one entry, or a random pool
  pos: { x: number; y: number };
}

export interface Play {
  file: string;
  gain: number;
  pan: number;
  lane: Lane;
  voiceId: number;
  replaces: number | null;   // voice this play pre-empts on its lane (the donor does not do this)
}

export class ServerCueMixer {
  private lastPlayedMs = new Map<number, number>();
  private laneVoice = new Map<Lane, number>();
  private nextVoice = 1;

  constructor(private readonly s: CueSettings, private readonly pick: (n: number) => number) {}

  // Order mirrors the donor: volume gate, cooldown, variant pick, distance gate, then stamp on success.
  handle(nowMs: number, me: { x: number; y: number }, cue: Cue): Play | null {
    if (cue.volume <= 1) return null;

    const last = this.lastPlayedMs.get(cue.effectId);
    if (last !== undefined && nowMs - last < this.s.cooldownMs) return null;

    if (cue.variants.length === 0) return null;
    const file = cue.variants[this.pick(cue.variants.length)];

    const dx = cue.pos.x - me.x;
    const dy = cue.pos.y - me.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > this.s.maxDistanceTiles) return null;

    const mul = Math.min(1, Math.max(0, cue.volume / 100));
    const gain = Math.max(0.001, (1 - d / this.s.maxDistanceTiles) * mul);
    const pan = Math.min(1, Math.max(-1, dx / this.s.panTiles));

    this.lastPlayedMs.set(cue.effectId, nowMs);
    const replaces = this.laneVoice.get(cue.lane) ?? null;
    const voiceId = this.nextVoice++;
    this.laneVoice.set(cue.lane, voiceId);
    return { file, gain, pan, lane: cue.lane, voiceId, replaces };
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (client module; the same module as the duelyst cell 1 note). The server sends the cue id, lane and position from the fight record. The client picks the variant, gain and pan and never decides a hit. Parity-checklist row 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (MIT: adaptation allowed; the sketch is written from the mechanism)
- Brief rule served: 1 (one engine; the server sends the cue, the client decides gain and pan); rules 7-9 n/a

## 6. Gaps and risks

- Server-verified: the cue exists because the server sent it. The sound event must come from the one ledger, not from a local timer, so a hit cannot sound without a server hit.
- MAX_ATTACKERS = 3: the one-second cooldown is keyed by effect id. Three hits with the same id merge into one. Three hits with different ids do not merge, and on the donor they stack on one lane (defect 1).
- The cooldown and distance are global constants (`soundmanager.h` 221-222). A spell or a finisher may need its own cooldown, so put the cooldown on the catalogue cue (rows 20 and 21), not in the engine.
- The 8-tile radius and the pan scale are Euclidean tile units. The Pit is a fixed arena, so set both per arena as data, not in the engine.
- Defects in the donor (idea kept, fix in the sketch):
  1. Lane stacking: `playChannelSound` adds a new source on the channel and never stops the previous one (`soundmanager.cpp` 407-413), while `SoundChannel::play` stops it first (`soundchannel.cpp` 32-33). Protocol cues on one lane overlap, and the per-id cooldown does not stop different ids. fix: pre-empt the lane's previous voice (the sketch's `replaces`).
  2. The secondary event's enum is read (`protocolgameparse.cpp` 1974) and discarded (`soundmanager_protocol.cpp` 399). The server cannot choose a lane beyond channel 12. fix: map the enum to a lane, or drop the byte from the protocol.
  3. `SoundChannel::enqueue` reshuffles the whole pending queue on every add (`soundchannel.cpp` 65), so a playlist changes order mid-cycle and a track can repeat early. fix: shuffle once per cycle. This matters for layered music playlists.
  4. The main and secondary functions repeat the same body (367-426). A fix to one can miss the other. fix: one function with a lane argument.
- The fade reversal (134-141) was checked by arithmetic only for on-to-off. The sketch does not include fades.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- All cited lines and values verified.
- Missed (minor): playProtocolAudioFileId distance is 2D (`Position::distance` ignores z, position.h 184), so a cue on another floor plays at full strength; item ambience does check the same floor (itemambience 92). Confirmed (position.h 184); not noted as a gap. Frankendom note: add a floor test if floors exist.
