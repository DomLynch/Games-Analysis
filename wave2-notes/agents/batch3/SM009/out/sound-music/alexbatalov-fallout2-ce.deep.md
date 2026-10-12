# alexbatalov-fallout2-ce (sound-music, cell 2)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/game_sound.cc` | Licence: Sustainable Use License 1.0 (LICENSE.md, "Version 1.0"; not an OSI licence; use limited to internal business, non-commercial or personal use, and distribution only free of charge for non-commercial purposes) | C++ | symbol `ambientSoundEffectEventProcess`

Checked: The hint file `src/audio.cc` is the file-open and decoder wrapper (audioOpen 61, audioRead 130, audioSeek 147), not the cue logic. The cue logic is in `src/game_sound.cc` (2155 lines, same structure as fallout1-ce cell 1, with renamed symbols). Read in full: game_sound.cc 2096-2155 (ambient event chain), 1272-1317 (relative volume), 1374-1450 (weapon cue name), 1527-1547 (soundPlayFile), 1674-1680 (effect callback), 1915-1920 (fade-in); worldmap.cc 6071-6160 (ambient picker, car or foot, night remap), 2586-2660 (map config loader: music and ambient keys), 6488-6535 (map music start and runtime change), 4455-4465 (world map bed); map.cc 815-820 and 1020-1026; scripts.h 18; sound_effects_cache.h 8; animation.cc 1265-1290; geometry.cc 208-225; input.cc 562-565 (ticker); queue.cc 60-70 (event table entry, grep). Partly read: game_sound.cc 598-640 (background load start), 1072-1090 (effect load head only: the cap check; the claim, alias and refund branches were not read, but the fallout1-ce cell read the same shape end to end). Grep only: actions.cc 623 and 635 (cue builders). Grep only: game_sound.cc 2051 (callback registration), 333, 360, 59 (fade flag), and the callers of `ambientSoundEffectEventProcess` (map.cc 1024, queue.cc 67). Not read: the time-of-day bounds of `randomBetween` (inclusive upper bound assumed, not verified), the queue's ownership of event data (queue.cc), `isInCombat` body, `getTicksBetween`, and the animation delay value (actions.cc). Confidence: high on the ambient chain, the weighted pick, the combat mute and the cooldown behaviour (all read); high on the voice cap and cue volume (identical shape to cell 1); medium on the queue ownership (leak claim below is from the code path, not from the queue code). Spell sounds: none searched. camera_scope: not a camera topic.

## 1. Mechanism

Fallout 2 CE has the same cue system as cell 1 (named weapon cues, four-voice pool, off-screen distance volume, background music on one track). It adds a fifth piece that matters for ambience: a per-map, weighted random list of one-shot ambient sounds, scheduled as a self-rescheduling game-time event.

(a) Per-map data. The world map loader (worldmap.cc 2640-2660) reads two keys for each map section: `music` (one track name) and `ambient_sfx` (a list of `name:chance` pairs). The list is capped at seven entries (worldmap.cc:61). The data file is not in the donor box; only the loader is (see Checked).

(b) Weighted pick (worldmap.cc 6083-6110). `wmSfxRollNextIdx` sums the chances, draws `chance = randomBetween(0, totalChances)` (6098), then walks the list: if the draw is below an entry's chance it returns that entry, otherwise it subtracts the chance and moves on (6101-6102). If the walk runs out, it returns -1.

(c) Name remap by time of day (worldmap.cc 6113-6160). `wmSfxIdxName` returns the entry's name. Two bird names (brdchir1, brdchirp) are remapped at night to a two-entry cricket list (755, 6155). Night is game hour <= 600 or >= 1800 (6146; the unit of `gameTimeGetHour` was not read, the 600 and 1800 bounds are as written).

(d) The chain (game_sound.cc 2102-2150). On map entry, `_gsound_sfx_q_start` (map.cc 1024) calls `ambientSoundEffectEventProcess` with no data. The function: clears any queued event of its own type (2104); takes the index passed in, or rolls one if none (2109-2112); allocates the node for the next event (2116); returns early if no map is loaded (2121); sets the next delay to `10 * randomBetween(15, 20)` ticks (2125), which is 15 to 20 game seconds at 10 ticks per second (scripts.h:18, GAME_TIME_TICKS_PER_HOUR 36000). If the map has entries it rolls the next index into the node and queues the event (2126-2128). If in combat, the index is cleared (2133-2134): the timer keeps running but nothing plays. If an index is set and the name resolves, it checks a 5000 ms gate on the ticker clock (2141; `_get_bk_time` returns `gTickerLastTimestamp`, input.cc 562-565; whether that is wall-clock was not verified): if the gate is open it plays through `soundPlayFile` (2142), which uses the same effect loader and the same four-voice pool as combat cues (game_sound.cc 1527-1547, 1537). The gate timestamp `_lastTime_1` is set after the check (2148), so it is refreshed on every attempt, including ones the gate blocked.

(e) Music per map and at runtime. `wmMapMusicStart` (6489-6506) plays the map's `music` track as a looped background track (6502; the loop flags come from `_gsound_background_play_level_music`, game_sound.cc 750). `wmSetMapMusic` (6515-6536) changes the track of a map at runtime: it stores the name (6529), and if that map is current it deletes the background track and starts the new one (6533-6534). No fade. On the world map, the bed is "20car" when the player is in the car and "23world" on foot (4461-4462).

(f) Cues (same as cell 1, checked): voice cap 4 (sound_effects_cache.h:8; game_sound.cc:1086 refuses, 1103 claims, 1677 releases on finish); queue-time load with the volume computed at queue time (animation.cc 1277; failed load becomes ANIM_KIND_CONTINUE at 1281); relative volume is full on screen and falls off off-screen by perception (1297-1304, with rectIntersection == -1 meaning no overlap, geometry.cc 212); hit cue name "W" + effect + weapon id + variant + material + "XX1" (1444), material X for non-hit, no target, explosion, plasma, EMP (1401-1402), M, W, S, F by target material (1428-1439). The fade flag `_gsound_background_fade` is declared 0 (59), reset to 0 (333, 360), and read (757-758, 1915-1917), but nothing in the donor sets it non-zero: the crossfade is dead here too. Background is stopped before a new track loads (619 in backgroundSoundLoad). The wind bed plays on map load (map.cc 819).

No stingers: a grep of the whole donor src for fanfare, jingle and stinger returns nothing. No priority levels: the only rule is first come, refuse when full, and combat mutes ambient one-shots.

## 2. Key functions

- `ambientSoundEffectEventProcess`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/game_sound.cc` 2102-2150 (chain, roll, combat mute, gate, play).
- `_gsound_sfx_q_start`: same file, 2096-2099 (map entry start).
- `wmSfxRollNextIdx`, `wmSfxMaxCount`, `wmSfxIdxName`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/worldmap.cc` 6071-6160.
- Map config (music, ambient_sfx): same file, 2586-2660. Runtime music change: same file, 6488-6535.
- `soundEffectLoad` (cap check, claim, file load): same game_sound.cc, 1072-1110; `_gsound_compute_relative_volume` 1272-1317; `sfxBuildWeaponName` 1374-1450; `soundPlayFile` 1527-1547; `soundEffectCallback` 1674-1680.
- Register of an animation sound: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc` 1265-1290.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Weighted one-shot pick from a per-zone list | Chances are integer weights per entry; list capacity 7 (worldmap.cc:61; 6098-6102) |
| Self-rescheduling ambient timer, next roll made one interval early | Delay 10 * randomBetween(15, 20) ticks (game_sound.cc:2125); 10 ticks per game second (scripts.h:18) |
| Mute ambience during combat, keep the timer running | isInCombat() clears the index (game_sound.cc:2133) |
| Minimum gap between ambient plays, on the ticker clock | 5000 ms (game_sound.cc:2141), gap stamped on every attempt (2148) |
| Night remap of a sound name | Two entries, 600 and 1800 hour bounds (worldmap.cc:6146, 755) |
| Music per map by config key; runtime change | "music" key (worldmap.cc:2640); 12 as the loop argument (6502) |
| Off-screen distance volume and voice cap | Same as cell 1: 4 voices (sound_effects_cache.h:8); 0x2AAA floor (game_sound.cc:1304) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's weighted pick, the self-rescheduling chain with the next roll made one interval early, the 10-ticks-per-second delay of 15 to 20 seconds, and the combat mute with the timer still running. It changes two things: (1) the gap timestamp is refreshed only when a sound plays (the donor refreshes it on every attempt, so a blocked attempt resets the gap); (2) the roll draws from [0, total - 1] so a non-empty list always yields an entry (the donor draws [0, total], which can match nothing and return -1). It omits the donor's queue (the chain is a plain object with a due tick instead), the night remap, the map config loader, the four-voice pool (see cell 1 sketch), the callback plumbing and the sound file load. Entry names are plain strings.

```ts
// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room sketch written from the described mechanism, not a translation of the donor.

// Donor data: per-map list of "name:chance" pairs (capacity 7). Weighted pick: draw once, walk the list.
interface AmbientEntry {
  name: string;
  chance: number; // integer weight
}

// rand(lo, hi) returns an integer in [lo, hi] inclusive.
// Sketch: draw from [0, total - 1] so every roll on a non-empty list picks an entry.
// Donor draws randomBetween(0, total); if that can return total, no entry matches and it returns -1 (see note gaps).
function rollAmbient(list: AmbientEntry[], rand: (lo: number, hi: number) => number): number {
  const total = list.reduce((sum, e) => sum + e.chance, 0);
  if (total <= 0) return -1;
  let r = rand(0, total - 1);
  for (let i = 0; i < list.length; i++) {
    if (r < list[i].chance) return i;
    r -= list[i].chance;
  }
  return -1;
}

const TICKS_PER_SECOND = 10; // donor: GAME_TIME_TICKS_PER_HOUR 36000
const MIN_GAP_MS = 5000; // donor: 5000 ms gate on the ticker clock between plays

// One self-rescheduling chain per map (donor: a queue event that queues its own next event).
class AmbientChain {
  private nextIdx = -1; // rolled one interval ahead, as the donor does
  private dueTick = -Infinity;
  private lastPlayMs = -Infinity;

  constructor(
    private readonly list: AmbientEntry[],
    private readonly rand: (lo: number, hi: number) => number,
    private readonly inCombat: () => boolean,
    private readonly play: (name: string) => void,
  ) {}

  // Map entry: donor plays one at once (if allowed), then schedules the next.
  start(nowTick: number, nowMs: number): void {
    this.nextIdx = rollAmbient(this.list, this.rand);
    this.tick(nowTick, nowMs);
  }

  // Called as game time advances. Fires when nowTick reaches dueTick.
  tick(nowTick: number, nowMs: number): void {
    if (nowTick < this.dueTick) return;

    const idx = this.nextIdx;
    this.nextIdx = rollAmbient(this.list, this.rand);
    // Donor: delay = 10 * randomBetween(15, 20) ticks, i.e. 15 to 20 game seconds at 10 ticks per second.
    this.dueTick = nowTick + TICKS_PER_SECOND * this.rand(15, 20);

    if (idx < 0 || this.inCombat()) return; // combat mutes the play; the timer keeps running
    // Fix: stamp the gap only when a sound plays (donor stamps on every attempt, so a blocked attempt resets the gap).
    if (nowMs - this.lastPlayMs < MIN_GAP_MS) return;
    this.lastPlayMs = nowMs;
    this.play(this.list[idx].name);
  }
}

// Demo: a fixed sequence stands in for the random source.
const seq = [0.1, 0.9, 0.5, 0.2, 0.7, 0.3, 0.8, 0.6];
let k = 0;
const rand = (lo: number, hi: number): number => {
  const v = seq[k % seq.length];
  k++;
  return Math.floor(lo + v * (hi - lo + 1));
};
const played: string[] = [];
let fighting = false;
const chain = new AmbientChain([{ name: "crow", chance: 3 }, { name: "wind", chance: 1 }], rand, () => fighting, (n) => played.push(n));
chain.start(0, 0);
chain.tick(160, 16000);
fighting = true;
chain.tick(400, 40000);

export { played, chain };
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/sm009-fallout2-ambient-chain.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (client module): the ambient chain's combat mute and gap rule sit next to the cue pool from cell 1. The zone's ambient list is zone data (origins/ zone catalogue, not named here). Parity-checklist row 12 (combat sound cues) is the nearest row: the addendum has no row for ambience, so Lead should decide whether ambience gets its own row.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0 is restricted: clean-room, shape only)
- Brief rule served: 1 (one engine; the ambience and cues are client reactions; combat is the engine's state and the client only mutes sound from it)

## 6. Gaps and risks

- Restricted licence: clean-room only. The sketch copies no donor code.
- Defect: `ambientSoundEffectEventProcess` allocates the next event node (2116) before the early return for no map (2121) and before the check that queues it (2126-2128). On those paths the node is not queued. Whether the queue frees it was not read. Fix: allocate only when queueing, or free on return.
- Defect: the 5000 ms gate is stamped on every attempt (2148). In normal play (game time about the same speed as the ticker) attempts are 15 to 20 game seconds apart, so the gate never blocks. When game time runs faster than the ticker clock (a rest or fast-forward), a blocked attempt resets the gap and can starve plays. Fix: stamp only on play (in the sketch) or gate on game time.
- The donor's weighted pick draws randomBetween(0, total) (6098). If that bound is inclusive (not verified), a draw equal to the total matches no entry and plays nothing. Fix: draw in [0, total - 1] (in the sketch).
- The next index is rolled 15 to 20 seconds before it plays, so a map's sound can change between roll and play (for example after a combat). The donor checks combat at play time (2133), which is the right place. Keep that rule.
- Cues and ambience share the same four voices, and the donor has no priority: an ambient one-shot can take a voice that a player's hit needs. Fix: give ambience the lowest priority (cell 1 sketch).
- The crossfade code is dead (flag never set). Do not cite it. Zone changes are hard cuts in this donor (background stopped before load, 619).
- The donor night remap is by game hour, not by zone. Frankendom zones are data: a night variant should be a field of the zone's ambient list, not a hard-coded name pair.
- The donor ambient list has no per-entry gating by quest or state. Frankendom's ambience should not depend on the hero's state beyond combat (keep the rule simple).

Best transferable idea: a per-zone weighted ambient list driven by a self-rescheduling 15-to-20-second timer that rolls its next sound one interval early and goes silent while combat runs.
Decision (proposed): adapt — keep the weighted per-zone list and the self-rescheduling timer with combat mute, fix the defects (node leak, gap stamped on blocked attempts, inclusive-draw risk) and put the list in zone data.
Acceptance: In a zone with ambient weights crow 3 and wind 1, a crow or wind plays about every 15 to 20 seconds of game time while exploring, and nothing plays while the hero is in combat; a test with a fake clock that advances 4 seconds between plays asserts only one plays.

Reuse tag: rewrite-from-idea (restricted licence; clean-room only)
Brief rule served: 1

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- No errors found; the checker verified the cited line numbers, formulas, numbers and licence against the donor.
- Missed: none.
