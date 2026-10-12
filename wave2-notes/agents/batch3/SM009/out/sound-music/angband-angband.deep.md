# angband-angband (sound-music, cell 3)

Donor: `/mnt/frankendom-donors/angband-angband/src/sound-core.c` | Licence: GNU GPL version 2, or the "Angband licence" (dual; `docs/copying.rst`, read) | C | symbol `play_sound` (sound-core.c 309-334)

Checked: The hint file `src/sound-core.c` is the core dispatch (438 lines). Read in full or in ranges: sound-core.c 127-170 (load_sound), 170-272 (message_sound_define), 305-345 (play_sound and preload setting), grep for the constants and registration (35, 47, 55, 193, 245, 320-332, 383). `src/message.c` 362-381 (sound()) and 425-446 (msgt()). `src/snd-sdl.c` 36-60 (file types), 118-145 (load), 170-200 (play), grep of all Mix_ calls. `src/player-attack.c` 396-437 (critical_melee), 690-730 (melee hit-type table), 940-960 (shield bash message). `src/game-world.c` 250-276 (play_ambient_sound), 466-476, 925-934. `lib/gamedata/constants.txt` 207-266 (melee critical constants) and 101 (day-length). `lib/customize/sound.prf` read by grep (149 `sound:` lines; the lines used are cited). `src/init.c` 741-752 and 804-813 (parser, grep only). Not read: the sound.prf table as a whole; the spell cast message trigger (only the SPELL data line 304 is cited, so the spell path is thin); the ranged critical path (player-attack.c 309-395, melee only); SDL_mixer itself (its Mix_PlayMusic and channel defaults are cited as library behaviour, not verified in the box); `snd-sdl.c` init lines 60-100. Confidence: high on the event-to-sound path, the melee critical tiers and the ambient timer (read end to end); medium on the spell path (data only); high on the single-stream finding (file list and extension order read). camera_scope: not a camera topic.

## 1. Mechanism

The donor's sound is an event system. One message type drives both the log line and the sound.

(a) One event, two outputs. `msgt(type, fmt, ...)` adds the log line (message.c 440) and then calls `sound(type)` (443). `sound()` returns at once if the player's `use_sound` option is off (371), and otherwise signals `EVENT_SOUND` with the message type (374). The sound-core module registered its `play_sound` handler on that event (sound-core.c 383).

(b) Message to variant list, from data. `message_sound_define` (sound-core.c 179-270) parses a space-separated list of sound names for a message type. Each new name gets one entry in a global sound table (deduplicated by a hash and a string compare inside the same function), and its index is added to the message's list (245-247). The cap is 16 slots with one kept spare (`MAX_SOUNDS_PER_MESSAGE` 35, the check at 245), so 15 variants per message. The data is `lib/customize/sound.prf`, lines of the form `sound:NAME:file1 file2 ...` (149 lines, e.g. HIT at line 86, SPELL at 304, AMBIENT_DAY at 33).

(c) Dispatch. `play_sound` (309-334) picks one of the message's variants uniformly with `randint0` (320), loads it on first use if still unknown (327), and passes it to the platform hook (332) only if it loaded. There is no weighting, no repeat avoidance, no voice count, no priority and no cooldown in the core.

(d) Platform. The file type is found by trying extensions in order (`load_sound`, sound-core.c 145; the list is in snd-sdl.c 54-56): `.mp3` first, mapped to `SDL_MUSIC`, then `.ogg`, mapped to `SDL_CHUNK`. Playback: a chunk goes to `Mix_PlayChannel(-1, ...)` (snd-sdl.c 185), any free channel; music goes to `Mix_PlayMusic(..., 1)` (190), one loop on the single music stream. The donor's `lib/sounds` folder holds 213 `.mp3` files and no `.ogg`, so in this donor every cue uses the music-stream path, and by SDL_mixer's documented behaviour a new music play replaces the one already playing. That makes cues one at a time (SDL_mixer behaviour, not read in the box). `snd-sdl.c` never calls `Mix_AllocateChannels`, so the chunk path would use the library default channel count (not read).

(e) Hit quality: a critical chance and a power tier. `critical_melee` (player-attack.c 399-437): the normal case is `randint1(5000) > chance` (418 is the test line; 417-418 read). The chance is `1*weight + 5*to_h + 1*skill_to_hit - 60` (constants.txt 222 weight scale 1, 226 to-hit scale 5, 233 skill scale 1, 236 offset -60). If the roll is not above the chance, the blow is a plain `MSG_HIT`. Otherwise `power = 1*weight + randint1(650)` (422; constants 245-248), and a walk over the tier list (426) picks the first tier whose cutoff is above the power, with the last tier catching the rest. The tiers (constants.txt 261-265; fields are cutoff:mult:add:message): 400:2:5 HIT_GOOD; 700:2:10 HIT_GREAT; 900:3:15 HIT_SUPERB; 1300:3:20 HIT_HI_GREAT; catch-all 4:20 HIT_HI_SUPERB. Damage becomes `add + mult * dam` (430). The tier's message type is the same event that plays the sound (msgt at the end of the blow, player-attack.c 847-860, which uses the melee hit-type table at 704-712 for the text). The attack message type starts as `MSG_HIT` (736) and is changed by the critical call (807).

(f) Sound per tier (data). The sound map gives: plain hit HIT one of two variants (plc_hit_hay, plc_hit_body; sound.prf 86); HIT_GOOD plc_hit_anvil (89); HIT_GREAT plc_hit_groan (92); HIT_SUPERB plc_hit_grunt (95); HIT_HI_GREAT plc_hit_grunt2 (98); HIT_HI_SUPERB plc_hit_anvil2 (101). So each tier has its own cue family, and the plain hit has two variants.

(g) Ambient. `play_ambient_sound` (game-world.c 257-275) picks one ambient message by place: town by day or night (depth 0), and the dungeon by depth band (depth <= 20, 40, 60, 80, else; 264-273). It is called every `(10 * day_length) / 4` game turns (472-473; `world:day-length:10000`, constants.txt 101, gives 25000 turns) and on each change of level (931-932). Ambient is one-shot sounds through the same event path: bell, gong, door, thunder; there is no bed and no crossfade.

(h) Spells (thin). The spell success cue is data: `sound:SPELL:plm_spell1 plm_spell2 plm_spell3` (sound.prf 304; three variants). Per-monster spell cues exist as data (CAST_FEAR at 389, SUM_UNDEAD at 405, SUM_HI_UNDEAD at 426). The code that sends the cast message was not read.

(i) Missing: no layered music (one stream, and everything is on it), no stingers as a class (a death cue is an ordinary event, `DEATH` at sound.prf 116), no priority, no voice limit in the code, no ducking, no crossfade. A grep of the whole donor src for stinger, crossfade and ambient found no crossfade and no stinger code; the ambient hits are the game-world.c calls above and the music hits are the snd-sdl.c music path.

## 2. Key functions

- `play_sound`: `/mnt/frankendom-donors/angband-angband/src/sound-core.c` 309-334 (variant pick, lazy load, platform hook).
- `message_sound_define`: same file, 179-270 (sound map from data).
- `load_sound`: same file, 127-170 (extension order).
- `sound` and `msgt`: `/mnt/frankendom-donors/angband-angband/src/message.c` 368-375 and 428-446.
- SDL playback: `/mnt/frankendom-donors/angband-angband/src/snd-sdl.c` 54-56, 170-200.
- Critical melee: `/mnt/frankendom-donors/angband-angband/src/player-attack.c` 399-437; melee hit types 704-712.
- Ambient: `/mnt/frankendom-donors/angband-angband/src/game-world.c` 257-275, 472-473, 931-932.
- Data: `/mnt/frankendom-donors/angband-angband/lib/gamedata/constants.txt` 207-266 and 101; `/mnt/frankendom-donors/angband-angband/lib/customize/sound.prf` (149 lines).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One event drives the log line and the cue | msgt() calls sound(type) (message.c 443) |
| Event to a list of variants, uniform pick | 15 variants max per event (sound-core.c 35, 245); randint0 (320) |
| Critical chance as a range roll against a weighted sum | range 5000; weight 1, to-hit 5, skill 1, offset -60 (constants.txt 222-236) |
| Power tiers with a catch-all top tier | cutoffs 400, 700, 900, 1300, catch-all (constants.txt 261-265) |
| Tier damage as add plus multiplier times damage | mult 2, 2, 3, 3, 4; add 5, 10, 15, 20, 20 (constants.txt 261-265) |
| Tier to cue family | HIT_GOOD anvil, GREAT groan, SUPERB grunt, HI_GREAT grunt2, HI_SUPERB anvil2 (sound.prf 89-101) |
| Ambient on a fixed interval | (10 * day_length) / 4 = 25000 game turns with day_length 10000 (game-world.c 472; constants.txt 101) |
| Ambient by depth band | bands at 20, 40, 60, 80 levels (game-world.c 264-273) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's critical order (chance roll first, then a power roll that walks the tiers, damage as add plus multiplier times damage), the event that carries both the tier name and the cue, and the plain-hit variant pick. It changes two things: (1) the random source is passed in (the donor calls randint0 and randint1 directly), so the sketch can be tested; (2) it returns the cue name and does not play it, so the playback path can be the channel pool from the cell 1 sketch (the donor's single music stream is the defect). It omits the ranged path, the weapon-weight and to-hit inputs beyond the parameters, the sound map loader, the ambient timer and the log line. Only the first variant of a tier is ever used by the donor for crit tiers, so the sketch's `cues` arrays keep one entry each, as the data does.

```ts
// Licence: GPL-2.0 or the Angband licence (donor, copyleft class). Clean-room sketch written from the described mechanism, not a translation of the donor.

// Donor constants (lib/gamedata/constants.txt): chance range 5000, offset -60, power random 650.
const RANGE = 5000;
const OFFSET = -60;
const POWER_RANDOM = 650;

// Tiers in ascending cutoff. The last tier has no cutoff and catches everything else.
interface Tier {
  name: string; // event name, also the log line type
  cutoff: number;
  mult: number;
  add: number;
  cues: string[]; // sound variants, one picked at random
}

const TIERS: Tier[] = [
  { name: "HIT_GOOD", cutoff: 400, mult: 2, add: 5, cues: ["plc_hit_anvil"] },
  { name: "HIT_GREAT", cutoff: 700, mult: 2, add: 10, cues: ["plc_hit_groan"] },
  { name: "HIT_SUPERB", cutoff: 900, mult: 3, add: 15, cues: ["plc_hit_grunt"] },
  { name: "HIT_HI_GREAT", cutoff: 1300, mult: 3, add: 20, cues: ["plc_hit_grunt2"] },
  { name: "HIT_HI_SUPERB", cutoff: Infinity, mult: 4, add: 20, cues: ["plc_hit_anvil2"] },
];
const PLAIN_CUES = ["plc_hit_hay", "plc_hit_body"];

interface Rng {
  int1: (n: number) => number; // 1..n
  int0: (n: number) => number; // 0..n-1
}

interface HitResult {
  event: string; // one event drives the log line and the sound
  damage: number;
  cue: string;
}

// Donor order: chance roll first; a critical then gets a power roll and walks the tiers.
function meleeHit(dam: number, weight: number, toh: number, skill: number, rng: Rng): HitResult {
  const chance = 1 * weight + 5 * toh + 1 * skill + OFFSET;
  if (rng.int1(RANGE) > chance) {
    return { event: "HIT", damage: dam, cue: PLAIN_CUES[rng.int0(PLAIN_CUES.length)] };
  }
  const power = 1 * weight + rng.int1(POWER_RANDOM);
  let i = 0;
  while (i < TIERS.length - 1 && power >= TIERS[i].cutoff) i++;
  const tier = TIERS[i];
  return {
    event: tier.name,
    damage: tier.add + tier.mult * dam,
    cue: tier.cues[rng.int0(tier.cues.length)],
  };
}

// Demo: a plain hit, then a critical with a range roll of 10 (under the chance of 40) and a power roll of 600 (power 700).
const plain = meleeHit(10, 100, 0, 0, { int1: () => 4000, int0: () => 0 });
const crit = meleeHit(10, 100, 0, 0, { int1: (n) => (n === RANGE ? 10 : 600), int0: () => 0 });

export { plain, crit, TIERS };
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/sm009-angband-hit-tiers.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (client module; the engine decides the tier and sends the event, the client maps event to cue). Parity-checklist row 12 (combat sound cues). The cell's hint said row 14, which is HUD in the addendum; row 12 is used. Row 10 (hit impact) is the other place the tier would land, since the tier also sets the damage add and multiplier.
- Reuse tag: rewrite-from-idea (GPL-2.0 or Angband licence: clean-room, shape only)
- Brief rule served: 1 (one engine: the tier is decided by the engine; the client only picks the cue for the event it receives)

## 6. Gaps and risks

- Licence: GPL-2.0 or the Angband licence. Clean-room shape only. The sketch copies no donor code.
- Single-stream playback is the defect that matters most. In this donor every cue is an mp3 and goes through `Mix_PlayMusic`, so a second cue replaces the first. For Frankendom, three attackers plus the hero's own hit must all sound in one beat: use channel playback with a voice pool (cell 1 sketch), not one music stream. The donor's own `.ogg` chunk path (snd-sdl.c 55, 185) is the shape to use, and no shipped file uses it.
- The critical chance is built from to-hit (5 per point) and to-hit skill. Frankendom's duel has no to-hit. Map the chance terms to the duel's own stats as catalogue fields (row 21), not as donor names.
- The tier decision must stay on the server: a client that rolls its own tier would show a cue the kill record does not match. Keep the tier in the engine (src/fight) and send the tier name in the event.
- The event carries the log line and the cue together (msgt). That is good: one event keeps the text, colour and sound in step. Keep it, but the text must come from the same server event.
- Ambient is one-shot, timed by game turns, banded by depth. Frankendom zones are data, so the ambient bank is a zone field; the depth bands are not a rule to copy. Ambient is not a combat row, so Lead should decide whether it needs its own row.
- Spell cues are data only in what was read. Do not claim a spell sound system until the cast path is read (not read).
- The donor's critical tiers are tuned for a 1990s-style weapon-weight model. Frankendom needs its own tier numbers as data; the shape (chance roll, power roll, tiers) transfers.

Best transferable idea: one combat event carries the outcome tier, its log text and its cue family, so a critical sounds different from a plain hit by construction.
Decision (proposed): adapt — keep one event for text, tier and cue, and the tier ladder (chance roll, then power roll, then tiers), but play cues on channels (not one music stream) and keep the tier decision on the server.
Acceptance: A critical that the engine tiers as HIT_GREAT plays the great-hit cue and shows its line from the same event, while two other attackers' cues in the same beat still sound (separate channels); a server test asserts the tier name in the fight record matches the cue the client chose.

Reuse tag: rewrite-from-idea (GPL-2.0 or Angband licence; clean-room only)
Brief rule served: 1
