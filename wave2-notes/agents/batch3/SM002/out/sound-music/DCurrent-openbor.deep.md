# DCurrent-openbor (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/DCurrent-openbor/engine/source/gamelib/soundmix.c` (with `sound_channel.c`, `sound_channel.h`, `soundmix.h`, `engine/openbor.c`, `engine/openborscript.c`, `engine/openbor.h`) | Licence: BSD-style, three clauses (`LICENSE`: "Redistribution and use in source and binary forms, with or without modification, are permitted", plus the no-endorsement clause at line 11), so permissive; code may be adapted, and this sketch is still written clean-room | C | symbols `sound_play_sample_internal` (soundmix.c 2370), `sound_find_lowest_priority_channel` (2280), `sound_open_sample_music` (3432), `frame_sound_execute_collection` (openbor.c 10032), `frame_sound_select_random_status` (openbor.c 9927)

Checked: confidence high for the channel pool, steal rule, chance and delay gates, group and owner stop, music channel, and the frame-sound random range (read in full: soundmix.c 1535-1586, 2280-2370, 2370-2540, 2795-2832 start, 3275-3288, 3432-3486, 3773-3840, 4040-4041; sound_channel.h 27-29, 34, 44-63, 168-169; sound_channel.c 97-106, 362-402; openbor.c 9340-9420, 9919-9946, 9990-10004, 10026-10096; openbor.h 2422; LICENSE). camera_scope: n/a (sound cell). Not read: `mixaudio` (soundmix.c 1586-1760) and the stream readers (1271-1408), so how the mixer adds each voice's samples is not claimed; `sound_channel_pool_allocate_bank` body; the script-side sample commands except 12846-12858 (openborscript.c). The data half is absent: `media/` holds only `_DUMMY`, so the per-animation frame-sound tables and any ambient or biome bed lists are not in the box. Biome beds: none in the code (the grep for fade, crossfade and bgm found no fade in the sound files). Priority values: I read four call sites (openbor.c 31955, 32020, 36817, 44718) and the first 12 lines of a grep for sample calls; I did not list all call sites.

## 1. Mechanism

- A fixed pool of voices. `sound_channel_pool_acquire` (sound_channel.c 365-402) takes the lowest free channel in the first bank with a free slot, skipping reserved channels (394), and allocates a new bank of 64 channels only when every current bank is full. The pool is 64 banks of 64 channels, so the hard maximum is 4096 (sound_channel.h 27-29; `maxchannels()` returns it, soundmix.c 4040-4041).
- Steal rule when no voice is free. `sound_find_lowest_priority_channel` (2280-2309) walks every active, non-reserved channel and keeps the one with the lowest `priority`. The test is strict (2299: `record->priority < *lowest_priority`), so on a tie the first channel found wins, which is the lowest index, not the oldest. The newcomer is refused only if that lowest priority is above its own (2443: `priority_low > priority` returns -1). Equal priority therefore steals.
- Priority values. Gameplay calls pass 0 (jump 44718, death 36817, the generic playback helper `PLAYBACK_PRIORITY 0`, openbor.c 31955). The music passes `UINT_MAX` (soundmix.c 3465), so it is never refused and never stolen while playing.
- Music channel. Channel 0 is reserved at init (soundmix.c 4000, `reserve_mask(pool, 0, 1)`) and forced for music (3473). Opening a new music file first closes the old one (3449, `sound_close_music`), which calls `sound_stop_sample` on channel 0 (3832); that call takes no fade time (soundmix.h 167). No fade exists anywhere in the sound files (grep returned nothing for fade or crossfade).
- Delay. Each play carries a delay in caller units. The donor divides by `delay_rate` (the game speed, openbor.c 10079-10081) to get whole units, multiplies whole units by the output rate, and adds the partial unit rounded up to a frame (soundmix.c 2343-2358). The mixer keeps the channel silent until the countdown ends (1556-1563), then starts the sound.
- Chance. Each play carries an integer chance 0 to 100 (sound_channel.h 168). A 32-bit random roll is drawn at play time (2509-2511). When the delay ends, the mixer compares the roll with `chance / 100 * 2^32` (1573-1576) and deactivates the channel if the roll is at or above the threshold (1577). So a sound with chance 30 plays about 30 percent of the time, decided once per play, not per frame.
- Start phase. With no start offset supplied, the first sample frame is `((channel * 4) / channels) % framecount` (2494). The donor calls this "legacy phase staggering" (2487-2491). The donor gives no reason; the likely purpose is to stop identical copies started on the same frame from summing into one peak. That purpose is my inference, not the donor's.
- Groups and owners. Each voice has a 64-bit group mask and an owner id (sound_channel.h 34, 44-63; soundmix.c 2503-2504). `sound_channel_matches_group` matches when any group bit is shared and the owner id is equal, or when the requested owner is all ones (sound_channel.c 97-106). `sound_group_stop` (soundmix.c 2832; its body was not read) and the frame action at openbor.c 10001 call the same match, so an entity's loop can be stopped by its own owner id.
- Frame sound collections. One animation frame can carry up to 64 sound slots (openbor.h 2422). Each active slot is submitted in ascending index order (openbor.c 10061-10064) with its own delay, group, owner, loop and offset (10070-10088). A random range (10053-10058) is the one exception: one slot inside the range is chosen uniformly and every slot outside it always plays. The choice uses rejection sampling on a 32-bit random value so that the modulo does not bias the pick (9927-9946).

## 2. Key functions

- `sound_play_sample_internal` (`soundmix.c` 2370-2535): the one play path. Checks the sample, takes a channel (forced or acquired, else stolen), fills the record (delay, chance, group, owner, phase, volume, priority), opens a stream if the sample is streamed, and activates the channel.
- `sound_find_lowest_priority_channel` (2280-2309): the steal search.
- `sound_play_delay_frames_calculate` (2321-2359): delay to output frames.
- `sound_channel_prepare_mix` (1535-1582): the mixer-side delay countdown and chance test.
- `sound_group_stop` and `sound_channel_matches_group` (2832; sound_channel.c 97-106): stop by group and owner.
- `sound_open_sample_music` (3432-3486): music on the reserved channel at top priority, after a hard close.
- `frame_sound_execute_collection` (openbor.c 10032-10096) and `frame_sound_select_random_status` (9927-9946): per-frame sound slots and the one-of-range pick.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed voice pool, lowest free slot first, banks grown on demand | 64 banks of 64 channels, max 4096 (theirs, sound_channel.h 27-29) |
| Steal the lowest priority, refuse a newcomer only when the lowest is above it | Priority is a caller value; gameplay uses 0 (theirs, openbor.c 31955, 36817, 44718); music uses UINT_MAX (theirs, soundmix.c 3465) |
| Reserved slot for music, never stolen | Channel 0 (theirs, soundmix.c 4000) |
| Delay in game-speed units converted to output frames | delay_rate = game speed (theirs, openbor.c 10079-10081); partial unit rounds up (theirs, soundmix.c 2352) |
| Percent chance decided by one roll per play | Chance 0 to 100 (theirs, sound_channel.h 168); threshold scaled to 2^32 (theirs, soundmix.c 1573) |
| Start phase by channel index | Factor 4 (theirs, soundmix.c 2494) |
| Stop by group bit and owner | Owner all ones matches any owner (theirs, sound_channel.c 105) |
| One-of-range variant per frame | Up to 64 slots per frame (theirs, openbor.h 2422) |
| Voice limit | Effectively 4096 (theirs); no per-entity or per-zone cap |
| Crossfade | None found |

## 4. TypeScript sketch

simplified: the sketch keeps the steal rule (lowest priority, refuse only when it is above the newcomer), the reserved music slot idea, one chance roll per play, the game-speed delay, group and owner stop, and the one-of-range pick by rejection sampling. It fixes two things: equal priorities steal the oldest voice (the donor steals the lowest index), and the voice cap is 32 (the donor's is 4096, effectively none). It also replaces the music hard close with a fade. It omits the bank allocation, the phase stagger, the stream readers, the spatial volumes and the mixer locks. `VOICE_CAP`, `MUSIC_FADE_MS` and the oldest-first tie rule are proposals, not donor values. Typechecked on the VPS with `tsc --strict --target es2020` (exit 0).

```ts
// Licence: BSD-3-Clause (donor LICENSE, read; permissive). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Ideas kept: fixed priority channel pool with a reserved music slot; steal the lowest priority that is not above the newcomer; one chance roll per play; delay in game-speed units; group and owner masks for stop; one-of-range pick by rejection sampling.
// Defects fixed: equal-priority steal takes the oldest voice, not the lowest index; a real voice cap; music switch fades instead of closing.

const VOICE_CAP = 32;          // proposed; donor cap is 4096 = 64 banks x 64 (sound_channel.h 27-29)
const MUSIC_FADE_MS = 1000;    // proposed; donor has no fade (soundmix.c 3449 closes the old music at once)
const ALL_OWNERS = -1;         // donor uses UINT64_MAX (sound_channel.c 105)

interface Slot { id: number; priority: number; startedAt: number; group: number; owner: number; }

// Acquire a free voice, else steal. The donor steals the lowest priority and drops the newcomer when that
// lowest is above it (soundmix.c 2440-2446). Fix: among equal priorities steal the oldest (donor: lowest index).
function acquire(slots: Slot[], incoming: Slot): boolean {
  if (slots.length < VOICE_CAP) { slots.push(incoming); return true; }
  let victim = 0;
  for (let i = 1; i < slots.length; i++) {
    const s = slots[i], v = slots[victim];
    if (s.priority < v.priority || (s.priority === v.priority && s.startedAt < v.startedAt)) victim = i;
  }
  if (slots[victim].priority > incoming.priority) return false;
  slots.splice(victim, 1);
  slots.push(incoming);
  return true;
}

// One chance roll per play, rolled at start and tested when the delay ends (soundmix.c 2509-2511, 1566-1579).
interface Gate { chance: number; roll: number; }   // chance 0..100, roll in [0, 1)
function passesChance(g: Gate): boolean {
  return g.chance >= 100 || g.roll < g.chance / 100;
}

// Delay in game-speed units, converted to output frames with a rounded-up partial (soundmix.c 2343-2358).
function delayFrames(delay: number, rate: number, outRate: number): number {
  const whole = Math.floor(delay / rate);
  const rem = delay % rate;
  return whole * outRate + Math.ceil((rem * outRate) / rate);
}

// Stop every voice that shares a group bit and matches the owner (sound_channel.c 97-106).
function stopGroup(slots: Slot[], group: number, owner: number): Slot[] {
  return slots.filter((s) => !((s.group & group) !== 0 && (owner === ALL_OWNERS || s.owner === owner)));
}

// Pick one candidate uniformly by rejection sampling (openbor.c 9927-9946). Others always play.
function pickOne(candidates: number[], rand32: () => number): number {
  const n = candidates.length;
  if (n <= 1) return candidates[0];
  const limit = 2 ** 32 - (2 ** 32 % n);
  let r = rand32();
  while (r >= limit) r = rand32();
  return candidates[r % n];
}

// Music switch: start the new track while the old one fades (donor closes the old one at once).
function switchMusic(old: { fadeOut(ms: number): void } | null, startNew: () => void): void {
  if (old !== null) old.fadeOut(MUSIC_FADE_MS);
  startNew();
}

export {};
```

## 5. Lands in

- TARGET `src/fight/sound-layers.ts` (new, client-only; the same module as the other sound-music notes, so one client sound module serves them all). Parity-checklist row 12 (combat sound cues). Hit cues are chosen per frame of the attack animation, with a one-of-range variant and a chance gate for flavour; the engine never reads the module.
- Use in the fight: per-frame hit cues with variants and a chance gate; a finisher or death cue at higher priority than hit cues, so it takes a hit cue's voice when the cap is reached; a stop-by-owner when a creature dies, so its loop stops with it.
- Acceptance (the decision line below): with ten hits landing inside one second, no more than 32 hit voices play at once; a death cue at higher priority takes the oldest hit voice; music never cuts out for a hit.
- Reuse tag: rewrite-from-idea (BSD-3-Clause: code could be adapted; this sketch is clean-room)
- Brief rule served: client-only sound layer (one engine; sound reads events and never changes state); rules 7-9 n/a

## 6. Gaps and risks

- Equal-priority steal takes the lowest channel index (defect). `sound_find_lowest_priority_channel` uses a strict `<` (soundmix.c 2299), so on a tie the earliest channel index is stolen, which can be a long loop while a fresh hit survives. Fix: steal the oldest voice on a tie (the sketch's `acquire`).
- No real voice cap (defect). The pool is 4096 voices (sound_channel.h 27-29), so the steal path is effectively never reached in a fight. Fix: a cap of 32 for the client mixer (proposed).
- Music closes at once (defect). `sound_open_sample_music` calls `sound_close_music` first (soundmix.c 3449), which stops channel 0 with no fade (3832). Fix: fade the old track over 1000 ms while the new one starts (proposed value).
- Comment and code disagree on the chance roll (doc defect, no behaviour change). `sound_channel.h` 169 says the roll is "evaluated when delay expires", but the code draws it at play time (2509-2511) and tests it at delay end (1576). Fix: correct the comment before anyone copies it.
- Priority is a caller value with no shared table. The gameplay calls I read pass 0 (openbor.c 36817, 44718 and the generic helper at 31955), so in those paths priority does not separate hit cues from music or finishers. Fix: a named priority table in zone data or an engine constant.
- Ambience beds and crossfades are not in the donor (gap). Frankendom's zones-as-data need per-zone beds; this donor gives the voice machinery only.
- Frame-sound tables are in the packs, not in this box (gap). The one-of-range idea is verified in code only; no real hit table was read.
- The phase stagger purpose is inferred (flagged above). If it is wrong, the stagger is harmless to drop.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- Steal rule, music channel reservation, 64x64 pool, delay math, chance roll timing, phase stagger, group match, 64 frame-sound slots, ordering and licence all hold. The chance_roll comment/code disagreement (header 169) is real.
- Missed: frame sounds carry their own per-slot priority (openbor.c 10090 passes sound->priority; confirmed). The conclusion 'priority does not separate hit cues' is therefore only proven for the three non-frame call sites read, not for authored frame sounds. Left as a caveat; no change to Decision or sketch.
