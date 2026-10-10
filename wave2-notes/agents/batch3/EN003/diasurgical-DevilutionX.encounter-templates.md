# diasurgical-DevilutionX - encounter-templates (EN003)

Donor root: /mnt/frankendom-donors/diasurgical-DevilutionX/ (VPS, read-only). Asset audit read first: AU015/diasurgical-DevilutionX.assets.md (art is Blizzard-copyright, class C; no audio files in the tree). Code licence: Sustainable Use License 1.0, non-commercial only (LICENSE.md line 1). Shape only: no code, names or art taken.

Checked: Source/monster.cpp (CanPlaceMonster 282-290, PlaceGroup 308-380, PrepareUniqueMonst 3325-3410, PlaceUniqueMonsters 504-531, InitMonsters 3686-3740, SpawnMonster 3791-3810, ActivateSkeleton 4702-4724, FollowTheLeader 1674-1690, GroupUnity 1696-1722, M_UpdateRelations 4066-4073, DirOK 4356-4383, wake block 4276-4318, AiPlanPath 1856-1870), Source/levels/themes.cpp (PlaceThemeMonsts 349-370, Theme_MonstPit 422-447, SpawnObjectOrSkeleton 449-456, Theme_SkelRoom 465-511, Theme_GoatShrine 700-716), Source/engine/random.cpp 105-109, Source/options.cpp 843, Source/monster.h 38, levels/gendung_defs.hpp 15-22. Data: assets/txtdata/monsters/unique_monstdat.tsv and monstdat.tsv. Confidence: high on order of operations and the numbers quoted; medium on the wake clock (one wake-timer step per monster update, assumed to run once per game tick; not traced further).

Half read: both. Engine (Source/monster.cpp, Source/levels/themes.cpp) and data tables (assets/txtdata/monsters/). No separate server process: multiplayer sends the spawn as a command (monster.cpp 3805, NetSendCmdSpawnMonster), so the host-authoritative half is not read beyond that call. flareteam-flare-engine in the same box is the other encounter donor, see its note.

Best transferable idea: a leashed pack whose leader will not step until every bodyguard is inside a small gate box, with the wake timer shared across the pack.
Decision: adapt (idea). Three code defects (section 4) are fixed in the sketch; the idea itself is sound.

## 1. What the player sees and feels
A level starts quiet. Most monsters stand still on the map, dormant, and only act once they are in view: the wake rule is sight, not distance. Once a monster is hit or a missile reaches it, it stays awake for a long memory and keeps acting after it loses sight. Monsters arrive as knots of one species. On the first level a group is one body. After that it is one body half the time, otherwise two or three (second level or crypt) or three to five (other levels). A themed room is full of a single kind of thing: a monster pit where the room's one species appears on roughly one open tile in three to nine (tileset dependent), a skeleton room where most of the banner slots hold skeletons, and a shrine ringed by up to eight of one species. A unique boss comes with eight bodyguards of its own base type. They are doubled in hit points and stay within three tiles of the boss, and the boss does not step until they are close. On a 375 wide screen the readable thing is one silhouette in one knot, not nine different bodies at once.

## 2. Why it works / is striking
- Readable silhouette: one species per group or room, so the crowd reads as one thing from the door. Normal groups are three to five bodies, so a cap of three active attackers is close to the donor's own group size.
- One signature behaviour: a leashed pack moves as a block. The leader will not step until its leashed bodyguards are within three tiles of its new tile (monster.cpp DirOK, 4363 and 4381). A bodyguard behind a wall stops counting, so the leader does not wait for it.
- One signature sound or effect: not in this donor. AU015 found no audio files in the tree, and the sound table only names effects. The only sound cue read is a per-monster greeting for certain uniques (monster.cpp 4279 onward).
- Could be made ours at 20-30 percent resemblance: yes. The leash gate and the species-per-room rule transfer directly. The Diablo sprites, names and boss rosters do not.

## 3. The rule behind it (order of operations)
Level population, InitMonsters (monster.cpp 3686-3740), in this order:
1. Count open tiles in the 80 by 80 window from 16 to 95 (not solid). Monster budget = open tiles / 30 (monster.cpp 3713). Multiplayer adds half again (3715). The budget is capped at MaxMonsters minus 10 (3717). MaxMonsters is 200 (monster.h 38).
2. Pick a scatter species at random from the level's PLACE_SCATTER list. Group size: 1 on the first level or on a 50 percent coin flip (3730, FlipCoin is one in two, random.cpp 105-108); 2 or 3 on the second level or in the crypt (3733); 3 to 5 otherwise (3735).
3. PlaceGroup (308): pick an anchor tile that is not visible and not occupied (CanPlaceMonster, 282-290). Walk outward from the anchor one random step at a time, placing members only on free tiles with the same dTransVal value as the anchor (the donor's transparency value, used here as a region id). Ten anchor tries; each anchor allows up to 100 failed steps (the step counter only rises on a failed step).
4. Theme rooms (levels/themes.cpp). The room picks ONE species at random from the scatter list (360). Then each open tile of the theme's region gets a monster with a one-in-f chance (363-365). f comes from a per-tileset table: 6, 7, 3, 9 for the cathedral, catacombs, caves and hell sets (Theme_MonstPit, 424, indexed by leveltype minus one; the enum is gendung_defs.hpp 15-22). The goat-shrine theme places the species on the eight tiles around a shrine (707).
5. Uniques by level (PlaceUniqueMonsters, 504-531). A unique whose pack type is not None gets PlaceGroup with leader set to the boss and eight members (526), each member copying the boss's intelligence and getting twice the base type's hit points (352). Pack type Leashed sets the leash (3403). Single-player boss hit points are halved with a floor of 64 (3331). Nightmare multiplies boss hit points by 3 (3366) and hell by 4 (3377).
6. Wake (4276-4318): a monster that is in view has its wake timer set to 255 (4315). Out of view, the timer goes down one per monster update (4317). Zero means dormant: AiPlanPath returns false (1863-1864). Being hit sets the timer to 255 (1139), and so do some monster attacks (2616 and onward).
7. Pack links: a leashed member's wake timer copies the leader's (FollowTheLeader 1683-1686), so the pack wakes together. GroupUnity (1696-1722): if the line between member and leader is blocked, a leashed member becomes separated and the pack count drops (1715). A separated member reunites when its walking distance to the leader is under four and the line is clear (1709). Leash distance for members: walking distance under four from the leader's future tile (DirOK 4363). Leader death: M_UpdateRelations (4067-4073) releases the leashed members, so they no longer follow anyone.

Data fields (designer-tunable; donor values are not copied because the donor licence is not MIT, Apache or BSD, so every donor_value is null):
- scatter_open_tiles_per_monster (tiles): donor 30 (monster.cpp 3713).
- mp_budget_bonus (fraction): donor 0.5 (3715).
- zone_monster_cap (count): donor MaxMonsters minus 10 (3717).
- group_size_first_level (count): donor 1 (3730).
- group_single_chance (fraction): donor 0.5 (3730).
- group_size_low (count range): donor 2 to 3 (3733).
- group_size_default (count range): donor 3 to 5 (3735).
- theme_one_in_f (1 in N per open tile): donor 6, 7, 3, 9 for the pit table (themes.cpp 424); other themes use slightly different values.
- pack_leash_tiles (tiles): donor 3 (4363).
- pack_gate_tiles (tiles, 7 by 7 box): donor 3 (4381).
- escort_hp_mult (multiplier): donor 2 (352).
- wake_memory_updates (updates): donor 255 (4315).
- tick_rate (updates per second): donor 20 (options.cpp 843).

Counts (computed over the data files with awk, not measured in play): unique_monstdat.tsv has 100 rows: pack None 29, Leashed 70, Independent 1 (column 17). monstdat.tsv has 112 species rows. A 6400-tile window that is half open would give about 107 monsters from the budget (3200 divided by 30); that is arithmetic, not a measured level.

## 4. For Frankendom
- 700 zones as data: each zone row carries its open-tile count (computed at build time), a monsters-per-open-tile knob, a cap, and a list of group templates (family tag, size range, leash flag). The donor's budget rule is a good zone-data shape.
- 100 Pit characters reused: a template picks one species family per group or per room by tag, as the donor does with one species per theme. Recolour and one swapped ability give variants (the donor has no such table; this is our reuse).
- Many-vs-one: a boss with eight bodyguards is nine bodies, over the three-attacker cap. Keep the pack gate and the leash so the pack moves as a block, but only three attack at once and the rest hold at the leash radius. A normal group of three to five is already at or just over the cap.
- Server-verified: the server rolls group size, species and anchor from the zone seed, and emits spawn and wake events. The client presents. The donor's own spawn is a command from the host (3805), so the shape is right.
- Server tick: fixed step at a set rate; wake memory counted in updates (255 updates is 12.75 s at the default 20 per second, which is a number to tune, not a truth). Per-tick NPC budget: the donor processes every monster each update with no budget. We add one.
- Row 23 (zone population): the donor has a cap but no respawn and no despawn. grep found no respawn in monster.cpp or levels/*.cpp; the spawn cap is the only population rule. Our origins/server/world-spawns.ts needs respawn and despawn-on-empty with a grace timer from elsewhere.
- Keep: the leash gate (DirOK), the reunite rule (GroupUnity), the wake timer shared by the pack (FollowTheLeader), one species per room, and the density knob per open tile.
- Change: the Y-step bug, unbounded retry loops, the Hellfire multiplier tables, Diablo-specific boss rosters and the goat-shrine ring as a fixed eight.

Defects found, with fixes (Decision: adapt the idea, with the defects fixed in the sketch):
- Defect 1, line 341: the group walk moves the Y coordinate by the DeltaX of a second random direction (the code comment says it should be the Y step). Effect: the group steps on an odd distribution, not a true random walk. Fix: pick one direction and move X by its DeltaX and Y by its DeltaY.
- Defect 2, lines 328-331: the anchor search loops with no cap (do while not CanPlaceMonster). If no free tile exists it never returns. Fix: cap the tries and report the failure.
- Defect 3, line 3728: the scatter fill loops while the count is under the budget with no cap; if PlaceGroup places nothing, it spins. Fix: cap the rounds (for example 4 times the budget) and stop.

Sketch (typechecked on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020`, exit 0). It is the rule in TypeScript, not the donor's code.

simplified: keeps the budget, group size, anchor walk with leash, pack gate and wake timer in the donor's order. It drops the animation, the difficulty and Hellfire multipliers, the networking, and the real tile tests (the caller supplies isFree and region). Leash uses the square distance, not walking distance. The donor's dTransVal check becomes a region id. Fixes defects 1 to 3 (one direction moves x and y; the anchor and scatter loops are capped).

```ts
export {};

type Pt = { x: number; y: number };
type RandInt = (n: number) => number; // integer in [0, n)

const DIRS: Pt[] = [
  { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
  { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 },
];

interface Tuning {
  tilesPerMonster: number; // donor 30
  mpBonus: number;         // donor 0.5
  zoneCap: number;         // donor 190 (MaxMonsters - 10)
  leashTiles: number;      // donor 3 (walking distance under 4)
  gateTiles: number;       // donor 3 (7 by 7 box)
  wakeUpdates: number;     // donor 255
  maxAnchorTries: number;  // donor 10
  maxFailedSteps: number;  // donor 100
  maxRounds: number;       // our cap (donor has none)
}

interface Level {
  isFree(p: Pt): boolean;  // not solid, not occupied, not visible
  region(p: Pt): number;   // donor dTransVal, used as a region id
}

function monsterBudget(openTiles: number, multiplayer: boolean, alive: number, tn: Tuning): number {
  let n = Math.floor(openTiles / tn.tilesPerMonster);
  if (multiplayer) n += Math.floor(n * tn.mpBonus);
  return Math.max(0, Math.min(n, tn.zoneCap - alive));
}

function groupSize(firstLevel: boolean, lowLevel: boolean, rnd: RandInt): number {
  if (firstLevel || rnd(2) === 0) return 1;
  return lowLevel ? 2 + rnd(2) : 3 + rnd(3);
}

// One direction per step moves both x and y (donor line 341 moved y by a second deltaX).
// Anchor loop and walk are both bounded (donor lines 328-331 and 341 are not).
function placeGroup(want: number, leashed: boolean, level: Level, tn: Tuning, rnd: RandInt): Pt[] {
  for (let t = 0; t < tn.maxAnchorTries; t++) {
    const anchor: Pt = { x: 16 + rnd(80), y: 16 + rnd(80) };
    if (!level.isFree(anchor)) continue;
    const r0 = level.region(anchor);
    const placed: Pt[] = [];
    let cur: Pt = { ...anchor };
    let failed = 0;
    while (placed.length < want && failed < tn.maxFailedSteps) {
      const d = DIRS[rnd(8)];
      cur = { x: cur.x + d.x, y: cur.y + d.y };
      const tooFar = leashed && (Math.abs(cur.x - anchor.x) > tn.leashTiles || Math.abs(cur.y - anchor.y) > tn.leashTiles);
      if (!level.isFree(cur) || level.region(cur) !== r0 || tooFar) {
        failed++;
        continue;
      }
      placed.push({ ...cur });
    }
    if (placed.length === want) return placed;
  }
  return [];
}

// Scatter fill: the donor loops until the budget is met with no cap; this stops after maxRounds.
function populate(openTiles: number, multiplayer: boolean, firstLevel: boolean, lowLevel: boolean,
  level: Level, tn: Tuning, rnd: RandInt): Pt[][] {
  const budget = monsterBudget(openTiles, multiplayer, 0, tn);
  const groups: Pt[][] = [];
  let total = 0;
  for (let round = 0; round < tn.maxRounds && total < budget; round++) {
    const want = Math.min(groupSize(firstLevel, lowLevel, rnd), budget - total);
    const g = placeGroup(want, false, level, tn, rnd);
    if (g.length > 0) {
      groups.push(g);
      total += g.length;
    }
  }
  return groups;
}

interface Member { pos: Pt; leaderId: number | null; leashed: boolean }

// Donor DirOK: the leader steps only if every leashed member is inside the gate box around the new tile.
function leaderMayStep(leaderId: number, next: Pt, members: Member[], tn: Tuning): boolean {
  const pack = members.filter(m => m.leaderId === leaderId && m.leashed);
  const inBox = pack.filter(m =>
    Math.abs(m.pos.x - next.x) <= tn.gateTiles && Math.abs(m.pos.y - next.y) <= tn.gateTiles).length;
  return inBox === pack.length;
}

interface Mob { wake: number; visible: boolean }

// Donor wake rule: seen sets the timer to the maximum; unseen counts down; zero is dormant.
function tickWake(m: Mob, tn: Tuning): void {
  if (m.visible) m.wake = tn.wakeUpdates;
  else if (m.wake > 0) m.wake -= 1;
}

function mayPlan(m: Mob): boolean {
  return m.wake > 0;
}

// Keep: sizes, gate, leash, wake. Dropped: animation, difficulty multipliers, networking.
const tuning: Tuning = {
  tilesPerMonster: 30, mpBonus: 0.5, zoneCap: 190, leashTiles: 3, gateTiles: 3,
  wakeUpdates: 255, maxAnchorTries: 10, maxFailedSteps: 100, maxRounds: 200,
};
const check: Level = { isFree: () => true, region: () => 0 };
void populate(3200, false, false, false, check, tuning, () => 0);
void leaderMayStep(0, { x: 0, y: 0 }, [], tuning);
const mob: Mob = { wake: 0, visible: true };
tickWake(mob, tuning);
void mayPlan(mob);
```

## 5. Five-minute look test (Dom, on his phone)
Target file: src/fight/pack.ts, row 4 (fight loop: aggro, chase, leash).
Stub one portrait room at 375 wide with three setups: (a) a boss with two bodyguards of the same species, pack gate on; (b) the same four bodies roaming with the gate off; (c) a one-species room at one-in-three density, then at one-in-nine. Walk in and answer: did the boss's wait for its bodyguards read as a squad or as a bug; did the room read as one thing from the door; at which density did it stop feeling like one crowd. Then set the cap to 3 attackers and say whether the held bodies still feel present.

## 6. Licence and IP
Code: Sustainable Use License 1.0, use limited to internal business, non-commercial or personal use (LICENSE.md line 1; the licence text lines per AU015). Not an open-source licence, so clean-room shape only: no code, table row, monster or boss name, sprite or sound copied. Assets: Blizzard copyright notice, class C (AU015). Kept: the shape of a leash gate, a per-room species pick, a density knob per open tile. Changed: the species list, the boss roster, names, sprite logic and every number (our numbers are our own tuning). No legal conclusions drawn.

## 7. Gaps
- Half read: engine and data both, but the multiplayer command path only at the spawn call (monster.cpp 3805).
- Not read: Source/mods/hf (Hellfire overrides); the level monster-type lists in InitLevelMonsters (monster.cpp 3434-3515) beyond the names of the calls; Source/lua/modules/dev/monsters.cpp beyond its two PLACE_SCATTER calls; the Stand animation frame data; the boss talk texts; death presentation; readability at 375 wide (the donor is a fixed-size desktop view, not measured).
- Idle and ambient: minions start their Stand animation at a random frame (monster.cpp 362 and 3408), so a pack does not blink in unison. What idle monsters do beyond that was not read.
- Death and respawn: none found in monster.cpp or levels/*.cpp (grep). Not read: any other file for respawn.
- Walk density per twenty seconds of walking: not in the donor. Density is per level from the open-tile budget, not per distance walked.
- Boss intro: uniques with talk messages start with goal Inquiring (monster.cpp 3359-3362) and speak when first reached. The text was not read.
- Not verified: the exact cadence of the wake timer (one update per game tick is assumed). The dTransVal meaning is read from the donor comment (transparency value) and used as a region id; a room claim is not made.
