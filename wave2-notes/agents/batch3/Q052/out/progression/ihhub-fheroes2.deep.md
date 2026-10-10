# ihhub-fheroes2 (progression, cell 10)

Donor: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/heroes/heroes.cpp` (with `heroes/skill.cpp`, `game/game_static.cpp`, `engine/rand.cpp`, `engine/rand.h`) | Licence: GPL-2.0 (LICENSE file is GNU GPL version 2; source headers say "either version 2 of the License, or (at your option) any later version") -> copyleft, clean-room only | C++ | symbol `Heroes::IncreaseExperience`

Checked: Opened in full: `Heroes::IncreaseExperience` (heroes.cpp 1482-1499), `GetLevelFromExperience` (1501-1510), `GetExperienceFromLevel` (1512-1602, the whole table and the growth rule), `_levelUp` (1848-1859), `_getSeedsForLevelUp` (2201-2232), `_levelUpSecondarySkill` (1862-1915). Opened in full: `Skill::Primary::LevelUp` (skill.cpp 217-260), `SecondaryPriorityFromRace` (99-116), `FindSkillsForLevelUp` (782-850), `GetTotalLevel` (708-716). Opened: `Rand::GetWithSeed` and `Rand::Queue::Get` (engine/rand.cpp 102-144), `combineSeedWithValueHash` and `Queue::GetWithSeed` (engine/rand.h 251-265), the knight row of the faction table (game/game_static.cpp 36-44). Not read: body of `Dialog::LevelUpSelectSkill` (human choice), body of `AI::Planner::pickSecondarySkill` (AI choice), the high-level primary weight row (game_static.cpp 43, seen but not receipted), the other five faction rows, `Race::isMagicalRace` beyond its first cases (kingdom/race.cpp 110-123). Callers: grep found about 25 call sites of `IncreaseExperience` (heroes_action.cpp, ai_hero_action.cpp, heroes.h:291); I read only the Tree of Knowledge call (heroes_action.cpp 2955-2970) and the two map-load replay call sites (heroes.cpp 584-590 and 717-724). Confidence: high on the XP-to-level path and the seeded level-up path; medium on the wisdom edge at total secondary level 0 (the condition is read; not run). Licence confirmed by reading LICENSE and the source header.

Best transferable idea: Make a level-up a pure, replayable function of (world seed, hero id, stats, XP before and after): the offer is a seeded weighted pick with a blacklist, and multi-level XP gains run one level-up per level crossed.

Decision (proposed): adapt - the level-up log can be derived from XP and a seed, so the server can re-derive and check every level-up without a second stored record (one ledger), but Frankendom needs its own portable integer hash and PRNG (the donor uses `std::hash`, which is implementation-defined, and PCG32), and the human choice must be validated by the server against the offer it sent.
Acceptance: A server test grants 2500 XP to a level-1 hero in one call and, separately, in 100-XP steps, with autoselect on and the same world seed; both runs produce the same ordered level-up log (level, primary stat, secondary offer, pick) and a re-run with the same seed reproduces it again.

## 1. Mechanism

- Entry point: `Heroes::IncreaseExperience` adds XP (heroes.cpp 1482-1499). It computes the old level and the new level from XP with `GetLevelFromExperience` (1484-1485). If the gain crosses more than one level, it loops over the intermediate levels: for each one it sets the hero's XP to that level's threshold (1490), runs `_levelUp` (1491), and afterwards restores the real XP and runs one final `_levelUp` (1497) if the level rose. Net effect: one level-up per level crossed, each evaluated while the hero's level reads as the new level.
- Level from XP: `GetLevelFromExperience` returns the first level L (from 1) whose threshold is above the XP (1503-1505), so a hero at exactly 1000 XP is level 2. Thresholds come from `GetExperienceFromLevel`: a hard-coded table for levels 0-39 (1000 at level 1, 2990600 at level 39; 1516-1594). Above the table the next threshold is the previous one plus the previous step times 1.2, rounded to the nearest 100 (1600-1601).
- Each `_levelUp` (1848-1859) first builds three or four seeds (`_getSeedsForLevelUp`, 2201-2232): the world map seed is mixed with hero id, race, attack, defense, power, knowledge and every secondary skill level, in a fixed order (2215-2223). Seeds are then `hash`, `hash+1`, `hash+2`, `hash+3` (2228-2230). Because the seeds come from current stats, two level-ups in a row get different seeds, and a given hero state always gets the same seeds for a given map.
- Primary skill: `Skill::Primary::LevelUp` (skill.cpp 217-260) reads the faction's weights. Low-level weights apply while the level is below `boundaryBetweenLowAndHighLevels` (10 for every faction, game_static.cpp 41); high-level weights otherwise. It draws one stat with the seeded weighted queue (239) and increments that stat.
- Secondary offer: `FindSkillsForLevelUp` (skill.cpp 782-850) builds a blacklist: (a) every skill already at expert (789-791); (b) if the hero already has 8 secondary skills (796), every skill the hero does not have yet. Wisdom is forced as the first offer when the race is magical (`Race::isMagicalRace`), the total secondary level is a multiple of 3 (including 0, since 0 % 3 == 0; 813-815), and wisdom is not blacklisted (817-819). Otherwise the first offer is a seeded pick weighted by the race's secondary weights (`SecondaryPriorityFromRace`, 99-116), excluding the blacklist. The second offer is another seeded pick excluding the first (846-847).
- Selection: autoselect picks with a seeded coin between the two offers, or the single valid one (heroes.cpp 1878-1883). An AI-controlled hero uses `AI::Planner::pickSecondarySkill` (not read). A human gets `Dialog::LevelUpSelectSkill` (1891, body not read).
- Applying the choice: if the hero already has the skill, its level goes up one step; otherwise the skill is added at basic (heroes.cpp 1900-1907). The Scouting case triggers an immediate scout unless the level-up happens during map load (1913-1916, read in part).
- Map load: a hero placed on a map with level L is replayed L-1 times through `_levelUp` with autoselect on (584-590 and 717-724). The skipSecondary flag passed there is `doesHeroHaveCustomSecondarySkills`; where that flag is set was not read.

## 2. Key functions

- `Heroes::IncreaseExperience`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/heroes/heroes.cpp` 1482-1499. Catch-up loop, one level-up per level crossed, then the final level-up.
- `Heroes::GetLevelFromExperience`: same file, 1501-1510. First level whose threshold exceeds the XP.
- `Heroes::GetExperienceFromLevel`: same file, 1512-1602. Table for 0-39; growth rule beyond it.
- `Heroes::_levelUp`: same file, 1848-1859. Primary pick, then secondary pick.
- `Heroes::_getSeedsForLevelUp`: same file, 2201-2232. Seed = world map seed mixed with identity, stats and secondary levels.
- `Skill::Primary::LevelUp`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/heroes/skill.cpp` 217-260. Low/high weight split and seeded draw.
- `Skill::SecSkills::FindSkillsForLevelUp`: same file, 782-850. Blacklists, forced wisdom, two seeded offers.
- `SecondaryPriorityFromRace`: same file, 99-116. Seeded weighted queue over the non-blacklisted skills.
- `Rand::GetWithSeed`, `Rand::Queue::Get`: `/mnt/frankendom-donors/ihhub-fheroes2/src/engine/rand.cpp` 102-110 and 121-144. Seeded PCG32 draw over the weight sum, then a walk of the cumulative weights.
- `Rand::combineSeedWithValueHash`, `Rand::Queue::GetWithSeed`: `/mnt/frankendom-donors/ihhub-fheroes2/src/engine/rand.h` 251-265.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| XP threshold table; first level whose threshold exceeds XP | 1000, 2000, 3200, 4500 ... 2990600 for levels 1-39 (theirs, heroes.cpp 1516-1594; levels 1 and 39 receipted at 1518 and 1594) |
| Growth above the table: previous step x 1.2, rounded to 100 | 1.2 and 100 (theirs, heroes.cpp 1601) |
| Seed = map seed mixed with identity, race, stats, secondary levels (order matters) | Mixing function is `std::hash`-based (donor, rand.h 263-264); not portable |
| Primary weights split at a level boundary | Boundary 10 (theirs, game_static.cpp 41); knight low weights 35 / 45 / 10 / 10 for attack / defense / power / knowledge (theirs, game_static.cpp 42) |
| Secondary offer from race weights with blacklist | Knight secondary weights 2, 4, 3, 1, 3, 5, 3, 1, 1, 2, 0, 3, 2, 2 in the donor's struct order (theirs, game_static.cpp 44) |
| Full-slot rule: a full hero only gets upgrades | Max 8 secondary skills (theirs, heroes.h 85) |
| Forced wisdom every third total secondary level for magic races | Every 3 levels (theirs, skill.cpp 813); magic races per `Race::isMagicalRace` (kingdom/race.cpp 110) |
| One level-up per level crossed on a multi-level gain | None (the loop) |

## 4. TypeScript sketch

simplified: stand-ins for the donor's `std::hash` mix and PCG32 bounded draw (a modulo draw here, so it has slight bias the donor avoids); one faction table is passed in rather than the six donor rows; only the autoselect branch is kept (the donor's human dialog and AI planner are omitted, so the caller chooses from `offer`); the scouting side effect, map-load replay and the Tree of Knowledge are omitted; the donor's `round()` rounds halves away from zero, Math.round rounds them up (differs only on exact halves); the expert cap is written as a `Math.min(3, ...)` clamp, not the donor's assertion; the donor sums the secondary vector and this sketch sums a Map; the order of the catch-up loop, the primary bump before the secondary offer, and the seeds taken before the bump are kept as in the donor.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type PrimaryStat = "attack" | "defense" | "power" | "knowledge";
type Level = 0 | 1 | 2 | 3; // 0 not known, 1 basic, 2 advanced, 3 expert

interface FactionTable {
  magical: boolean;
  boundaryLevel: number; // low-level primary weights apply while level < boundaryLevel
  primaryLow: Record<PrimaryStat, number>;
  primaryHigh: Record<PrimaryStat, number>;
  secondary: Record<string, number>; // race weight per secondary skill name
}

interface HeroState {
  id: number;
  xp: number;
  primary: Record<PrimaryStat, number>;
  secondary: Map<string, Level>; // known skills only
}

interface LevelUpChoice {
  primary?: PrimaryStat;
  offer: [string | undefined, string | undefined];
  picked?: string;
}

const PRIMARY_ORDER: PrimaryStat[] = ["attack", "defense", "power", "knowledge"];
const SECONDARY_ORDER: string[] = ["archery", "ballistics", "diplomacy", "eagleeye", "estates", "leadership", "logistics", "luck", "mysticism", "navigation", "necromancy", "pathfinding", "scouting", "wisdom"];
const MAX_SECONDARY = 8;
const WISDOM_CADENCE = 3;

// XP at which level n+1 starts (index = n). Above the table: next = prev + round((prev - prevPrev) * 1.2 / 100) * 100.
const XP_TABLE: number[] = [0, 1000, 2000, 3200, 4500, 6000, 7700, 9000, 11000, 13200, 15500, 18500, 22100, 26400, 31600, 37800, 45300, 54200, 65000, 78000, 93600, 112300, 134700, 161600, 193900, 232700, 279300, 335200, 402300, 482800, 579400, 695300, 834400, 1001300, 1201600, 1442000, 1730500, 2076700, 2492100, 2990600];

function thresholdFor(level: number): number {
  if (level < XP_TABLE.length) return XP_TABLE[level];
  const l1 = thresholdFor(level - 1);
  const l2 = thresholdFor(level - 2);
  return l1 + Math.round(((l1 - l2) * 1.2) / 100) * 100;
}

function levelFromXp(xp: number): number {
  for (let lvl = 1; lvl < 255; lvl++) {
    if (xp < thresholdFor(lvl)) return lvl;
  }
  return 0;
}

// Stand-in for the donor's hash combine (the donor uses std::hash, which is implementation-defined).
function mix(seed: number, v: number): number {
  let h = (seed ^ Math.imul(v | 0, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca77) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

// Seeds depend on world seed, hero identity, race and current stats: deterministic per hero state, varies with progress.
function levelUpSeeds(worldSeed: number, h: HeroState, race: number): [number, number, number, number] {
  let s = mix(worldSeed >>> 0, h.id);
  s = mix(s, race);
  for (const stat of PRIMARY_ORDER) s = mix(s, h.primary[stat]);
  for (const name of SECONDARY_ORDER) s = mix(s, h.secondary.get(name) ?? 0);
  return [s, (s + 1) >>> 0, (s + 2) >>> 0, (s + 3) >>> 0];
}

// Stand-in for the donor's seeded weighted queue. The donor uses PCG32 with an unbiased bounded draw, not a modulo.
function pickWeighted<T>(items: { value: T; weight: number }[], seed: number): T | undefined {
  const live = items.filter((i) => i.weight > 0);
  if (live.length === 0) return undefined;
  const sum = live.reduce((t, i) => t + i.weight, 0);
  let r = (seed >>> 0) % sum;
  for (const it of live) {
    if (r < it.weight) return it.value;
    r -= it.weight;
  }
  return undefined;
}

function pickPrimary(f: FactionTable, level: number, seed: number): PrimaryStat | undefined {
  const w = level < f.boundaryLevel ? f.primaryLow : f.primaryHigh;
  return pickWeighted(PRIMARY_ORDER.map((s) => ({ value: s, weight: w[s] })), seed);
}

// Offers two secondary skills, or none if all are blocked. Wisdom is forced every third total level for magic races.
function offerSecondaries(f: FactionTable, h: HeroState, seed1: number, seed2: number): [string | undefined, string | undefined] {
  const blocked = new Set<string>();
  for (const [name, lvl] of h.secondary) {
    if (lvl === 3) blocked.add(name); // expert skills are never offered again
  }
  const knownCount = [...h.secondary.values()].filter((l) => l > 0).length;
  if (knownCount >= MAX_SECONDARY) {
    for (const name of SECONDARY_ORDER) {
      if (!h.secondary.has(name)) blocked.add(name); // full: only upgrades remain
    }
  }
  const totalLevel = [...h.secondary.values()].reduce<number>((t, l) => t + l, 0);
  const wisdomDue = f.magical && totalLevel % WISDOM_CADENCE === 0 && !blocked.has("wisdom");

  const pool = (extra: Set<string>, seed: number): string | undefined =>
    pickWeighted(
      SECONDARY_ORDER.filter((n) => !blocked.has(n) && !extra.has(n)).map((n) => ({ value: n, weight: f.secondary[n] })),
      seed,
    );

  const first = wisdomDue ? "wisdom" : pool(new Set<string>(), seed1);
  if (first === undefined) return [undefined, undefined];
  const second = pool(new Set<string>([first]), seed2);
  return [first, second];
}

function levelUp(worldSeed: number, f: FactionTable, race: number, h: HeroState, autoselect: boolean): LevelUpChoice {
  const seeds = levelUpSeeds(worldSeed, h, race); // taken before the primary bump, as in the donor
  const primary = pickPrimary(f, levelFromXp(h.xp), seeds[0]);
  if (primary !== undefined) h.primary[primary] += 1;

  const offer = offerSecondaries(f, h, seeds[1], seeds[2]);
  let picked: string | undefined;
  if (autoselect) {
    if (offer[0] !== undefined && offer[1] !== undefined) picked = seeds[3] % 2 === 1 ? offer[0] : offer[1];
    else picked = offer[0] ?? offer[1];
  }
  if (picked !== undefined) {
    const lvl = h.secondary.get(picked) ?? 0;
    h.secondary.set(picked, Math.min(3, lvl + 1) as Level);
  }
  return { primary, offer, picked };
}

// Grants XP and runs one level-up per level crossed, each evaluated at its own threshold level.
function gainXp(worldSeed: number, f: FactionTable, race: number, h: HeroState, amount: number, autoselect: boolean): LevelUpChoice[] {
  const oldLevel = levelFromXp(h.xp);
  const newLevel = levelFromXp(h.xp + amount);
  const updated = h.xp + amount;
  const log: LevelUpChoice[] = [];
  for (let lvl = oldLevel; lvl < newLevel - 1; lvl++) {
    h.xp = thresholdFor(lvl);
    log.push(levelUp(worldSeed, f, race, h, autoselect));
  }
  h.xp = updated;
  if (newLevel > oldLevel) log.push(levelUp(worldSeed, f, race, h, autoselect));
  return log;
}
```

## 5. Lands in

- TARGET `src/fight/progression.ts` (new module; the engine owns XP, level and the level-up offer; the Pit and zones are clients). Parity-checklist row 18 (loot roll and XP award): the XP award and the level-up it triggers.
- Sub-line for row 18: XP award is applied once, server side, after the kill is verified; the level-up log is derived from the XP before and after.

- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: one ledger (XP is stored once and level-ups are derived from XP and a seed); server-verified progression (the server re-derives the offer and rejects a pick outside it).

## 6. Gaps and risks

- Licence GPL-2.0: clean-room only. The sketch is written from the described mechanism; no donor line is translated.
- The donor's hash uses `std::hash` (engine/rand.h 263), which is implementation-defined, and its draw is PCG32 with a bounded integer method (engine/rand.cpp 33-83). Frankendom needs one fixed, portable integer hash and PRNG shared by server and client, or the offers will differ between them.
- The catch-up loop writes temporary XP values into the hero (heroes.cpp 1490) before each level-up. That is a side effect on the ledger. Frankendom should compute the level-up list as a pure function of (XP before, XP after, seed) and write the final XP once.
- Server-verified: the donor has no server. Frankendom must check that a human's pick is one of the offers the server sent (the offer is recomputed from state, so the server must hold the same state the client saw).
- The seed mixes current stats, so any other rule that changes stats (items, buffs, a stat reset) changes all later offers. Frankendom must list the mixing order in the catalogue (rows 20-21) and test it, or offers will drift.
- Zones as data: the XP threshold table and the 1.2 growth rule are one progression curve for every zone, so they are engine constants. Primary weights, boundary level, secondary weights and the 8-skill cap are per class and belong in the class catalogue, not in zone data. These are the donor's values; Frankendom's curve and caps are its own ruling and must be set by a designer.
- The forced Wisdom rule removes a player choice on a schedule. Frankendom should decide whether any forced offer is wanted before it copies the rule.
- Not read: the human dialog body (`Dialog::LevelUpSelectSkill`) and the AI planner (`AI::Planner::pickSecondarySkill`). The AI and human choice rules are therefore unknown from this read.
- Frankendom's MAX_ATTACKERS = 3 has no counterpart here; not applicable to progression.
