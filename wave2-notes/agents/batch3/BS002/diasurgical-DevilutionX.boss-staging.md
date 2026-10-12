# diasurgical-DevilutionX (boss-staging + MG011, cell 1)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/` (main files: `Source/monster.cpp`, `Source/quests.cpp`, `Source/qol/monhealthbar.cpp`, `Source/dead.cpp`, `Source/tables/monstdat.cpp`, `assets/txtdata/monsters/unique_monstdat.tsv`) | Licence: Sustainable Use License 1.0 (`LICENSE.md`; restricted, not MIT/Apache/BSD, so shape only) | C++ | symbols `PrepareUniqueMonst`, `PlaceQuestMonsters`, `MonsterDeath`, `DiabloDeath`, `GargoyleAi`, `DrawMonsterHealthBar`

Checked: read these ranges. `monster.cpp` 3325-3410 (unique prep), 504-612 (placement), 2880-2925 and 2985-3000 (Lazarus and Warlord talk gates), 4358-4383 and 1480-1490 (leash), 3922-3924 (talker check), 875-910 (Diablo death setup), 1499-1520 (death camera), 3997-4030 (death order), 2480-2530 (gargoyle AI), 4976-4985 and 1045-1060 (gargoyle lift and heal). Also `quests.cpp` 118-134, 227-290, 555-575; `monhealthbar.cpp` (all 188 lines); `dead.cpp` 70-110; `unique_monstdat.tsv` (all 100 rows, tallied with awk). Confidence high on order of operations and on counts. Medium on the Lazarus cutscene path, which I read but did not trace through `movie.cpp`.

Half read: **both** code and data for uniques (`monster.cpp`, `quests.cpp`, the table). The client half (draw code) is read only for the health bar. The matching server half is not separate here: this is a single-process game, so the "server" logic and the "client" logic sit in the same files.

## 1. What the player sees and feels

- Most bosses ("uniques") stand still until you come close. Their stand animation starts on a random frame, so a room of idle bosses does not move in step.
- Some bosses speak when they come into view. The Warlord is the clearest case: it stays in talk mode until its speech sound stops, and only then starts to attack.
- The boss's name shows in gold-white on the enemy bar at the top of the screen. Resistance and immunity icons show for every unique. For ordinary monsters they show only after you have killed 15 of that kind, so the information is earned.
- In the single-player story path, the Lazarus boss plays a cutscene when you step on one specific floor tile (`monster.cpp` 2889). While the movie plays, the boss sits in talk mode.
- A unique's corpse stays on the floor in its own tint, and its light moves onto the corpse. Killing the Warlord makes your hero say a short line.
- Killing Diablo freezes the player, switches off the other monsters' fights (they fall to death animations at once), plays a death sound, and moves the view one tile per game tick toward the boss for 140 ticks. The run then ends. At the default 20 ticks per second (`options.cpp` 843) that is 7 seconds. The tick rate is a player setting, so the real time can differ.

## 2. Why it works, or why it is striking

- Readable at 375 wide: the name bar is one line, centred, top of screen, and the colour says "unique" before you read the word.
- One signature behaviour per boss: a talk gate that holds the first attack until the line ends. The player gets a beat to read the threat.
- One signature sound: the death sound and the speech lines. The speech sound is also the timer for the gate (see the defect in section 3).
- It could be made ours at 20-30 percent resemblance: a gold name bar, a timed intro hold, a per-boss corpse that keeps its tint, and a death camera that drifts to the body.

## 3. The rule behind it (order of operations and numbers)

**Placement.** Each unique has a row in `unique_monstdat.tsv`. The level number on that row decides where it spawns (`PlaceUniqueMonsters`, `monster.cpp` 504-528). Story-quest bosses are only placed when their quest is available (Garbud, Zhar, Snotspill, Lachdan, Warlord; `monster.cpp` 515-525). A boss pack is placed with pack size 8 (`monster.cpp` 526), and the pack is leashed when the table says `Leashed` (`monster.cpp` 3403).

**Counts in the table (100 unique rows, tallied):** pack mode Leashed 70, None 29, Independent 1 (Skeleton King). The three `customToHit` values and the twelve `customArmorClass` values are non-zero. The nine `reducePlayer*` columns are zero in every row (the code path exists, no row uses it).

**Health.** Max HP is the table value shifted left by 6 bits (`monster.cpp` 3328). In single-player the max is halved, with a floor of 64 units (`monster.cpp` 3331). Nightmare then multiplies by 3 and adds 100 HP (3366, non-Hellfire branch). Hell multiplies by 4 and adds 200 HP (3377, non-Hellfire branch). Damage on nightmare is 2 x (min+2) and 2 x (max+2). On hell it is 4 x min + 6 and 4 x max + 6.

Derived for Lazarus (table: 600 HP, damage 30-50): single-player normal about 300 HP. Nightmare about 1000 HP, damage 64-104. Hell about 1400 HP, damage 126-206. These are my arithmetic on the code, not donor values to copy.

**Leash.** A leashed minion may step only to tiles within walking distance 3 of its leader's future position (`monster.cpp` 4363). A leader moves only when the number of its leashed minions standing within 3 tiles equals its pack size (4381). A leader's death releases all leashed minions (`ReleaseMinions`, 1486). A minion's death shrinks the leader's pack size by one.

**Talk gate.** A boss with a speech line waits in "Inquiring" until it is visible (`monster.cpp` 2992-2993 for the Warlord). It then enters the talk mode. Its attack state is set only when the speech sound is no longer playing (2994-2999). While it talks, other monsters skip it as a target (`monster.cpp` 715).

**Death order** (`MonsterDeath`, 3997-4030): award XP (3999), count the kill (4001), spawn loot (4006), run the Diablo branch if this is Diablo (4008), set the death animation, then run `CheckQuestKill` (4027). So the reward lands before the death animation begins, and the quest state changes after it.

**Death camera** (Diablo only, `MonsterDeath` tick, 1499-1514): each tick the view moves one tile on each axis toward the boss (1503). After 140 ticks (1514) the game ends (`PrepDoEnding`, 4121).

**Seeded boss pool** (`quests.cpp` 118-134): at game start, one quest is removed from each of four groups by a seeded random pick. Three of the groups can remove a boss: one of {Butcher, Snotspill, Gharbad}; one of {Mushroom, Zhar, Anvil} (Zhar is a unique); one of {Veil, Warlord}. The Blind/Rock/Blood group removes no boss. The four picks give 54 combinations (3 x 3 x 3 x 2, derived). A special seed value skips the first pick.

**Gargoyle heal (MG011).** A gargoyle retreats when its HP is under half of max (`GargoyleAi`, 2480-2500). It heals when the enemy is at least `intelligence + 2` tiles away. The heal amount is `max HP / (16 x (rand 0-4 + 4))`, which is max/64 to max/128 per heal (`monster.cpp` 1057). The comment above it (1045) says 1.47 to 25 percent. The comment and the code disagree. The code is the one I trust, but how many times the heal repeats is not read.

**Bar** (`monhealthbar.cpp`, `DrawMonsterHealthBar`): the bar draws only for the monster under the cursor or target (`pcursmonst`, returns early at -1). Unique name in gold-white (148). Resistance icons shown for uniques, or for any monster after 15 kills (159). Lifesteal over max shows an "x2" style multiplier. Multiplayer tags show who hit it. Touch targeting is not read (`controls/touch` not read), so on a phone it is unknown what sets `pcursmonst`.

**Corpses** (`dead.cpp` 81-86): each unique gets its own corpse slot and keeps its own palette index, so its tint survives death.

**Speech and seeds in the table:** 52 boss speech keys in `textdat.tsv` (Banner 12, Vile 14, Veil 11, Warlord 9, Garbud 4, Zhar 2) out of 338 text rows. Quest table has 24 rows. I counted these but did not open the string text (copyright and no need to quote).

**Numbers as designer data fields** (donor values not copied; `donor_value_or_null` for all fields, see JSON):

| field | unit | donor reference (not for copying) |
|---|---|---|
| trigger_radius_tiles | tiles | donor: talk triggers on visible tile (not a radius) |
| intro_hold_ms | ms | donor: no timer, ends on sound end (defect) |
| boss_max_hp_base | hp | table, 1 row per boss |
| hp_mul_by_difficulty | x | 1 normal, 3 nightmare, 4 hell |
| hp_add_by_difficulty | hp | 0 normal, 100 nightmare, 200 hell |
| active_attacker_cap | count | donor: none (pack of 8 with no cap) |
| pack_size | count | donor: 8 |
| leash_range | tiles | donor: 3 |
| death_cam_ms | ms | donor: 140 ticks |
| resist_reveal_kills | count | donor: 15 |

## 4. For Frankendom

- **Maps to our shape:** boss placement is zone data (one row per boss per zone, like the table's level column). The seeded quest pool is a per-seed roster and maps to zone-as-data plus seed discipline. The speech and death timing belong to the engine. The camera drift and the name bar are client only.
- **Keep:** the talk hold before the first attack; the gold name and the earned resist reveal; the corpse that keeps its own tint; the ordering (reward first, then animation, then quest state).
- **Change:**
  1. The attack gate ends on the speech sound in the donor. In our build the server holds a `talking` state for a fixed `intro_hold_ms` timer. The client plays the line and the sound. Gameplay never reads audio.
  2. The 8-minion pack must respect MAX_ATTACKERS = 3. Keep the leash ring; only 3 members attack at once, the rest wait inside the leash radius.
  3. No single-player HP halving. One ledger, one HP value, set by the zone data and the difficulty multipliers.
  4. The Diablo-style death freeze is client only. The server ends the fight at once; the camera drift is presentation for `death_cam_ms`.
- **Parity rows:** row 4 (leash, fight loop), row 9 (finisher staging, death drift), row 11 (fight camera), row 12 (combat sound cues, speech), row 14 (HUD name and resist bar), row 17 (death presentation), row 18 (XP before loot before quest state), row 23 (boss placement per zone, quest-based removal).
- **Sketch (typechecked on VPS: `npx -p typescript@5.6.3 tsc --noEmit --strict --target es2020`, exit 0):** the boss state machine with the timer-based intro hold. The attack gate is a server timer, not the sound.

simplified: omits placement, the leash walk, pack logic, corpses, the camera drift and the damage multipliers. It does not reorder the donor's steps, but it changes one thing on purpose: the donor ends the talk when the sound ends (defect), this sketch ends it when `introHoldMs` runs out.

```ts
export {};
type Difficulty = "normal" | "hard" | "nightmare";
type BossPhase = "dormant" | "talking" | "fighting" | "dying" | "dead";
interface BossStagingData {
  readonly id: string;
  readonly triggerRadiusTiles: number;
  readonly introHoldMs: number;
  readonly deathCamMs: number;
  readonly maxHpBase: number;
  readonly hpMul: Record<Difficulty, number>;
  readonly hpAdd: Record<Difficulty, number>;
  readonly activeAttackerCap: number;
  readonly packSize: number;
  readonly leashRangeTiles: number;
}
interface BossState {
  readonly phase: BossPhase;
  readonly hp: number;
  readonly phaseTimerMs: number;
  readonly activeAttackers: number;
}
export function bossMaxHp(d: BossStagingData, difficulty: Difficulty): number {
  return Math.round(d.maxHpBase * d.hpMul[difficulty] + d.hpAdd[difficulty]);
}
export function stepBoss(d: BossStagingData, s: BossState, dtMs: number, playerTiles: number): BossState {
  const t = s.phaseTimerMs + dtMs;
  switch (s.phase) {
    case "dormant":
      if (playerTiles <= d.triggerRadiusTiles) {
        return { ...s, phase: "talking", phaseTimerMs: 0, activeAttackers: 0 };
      }
      return { ...s, phaseTimerMs: t };
    case "talking":
      if (t >= d.introHoldMs) {
        return { ...s, phase: "fighting", phaseTimerMs: 0 };
      }
      return { ...s, phaseTimerMs: t };
    case "fighting":
      if (s.hp <= 0) {
        return { ...s, phase: "dying", phaseTimerMs: 0, activeAttackers: 0 };
      }
      return { ...s, phaseTimerMs: t, activeAttackers: Math.min(s.activeAttackers, d.activeAttackerCap) };
    case "dying":
      if (t >= d.deathCamMs) {
        return { ...s, phase: "dead", phaseTimerMs: 0 };
      }
      return { ...s, phaseTimerMs: t };
    case "dead":
      return s;
  }
}
```

- **Gargoyle retreat-and-heal (MG011):** a retreat at under half HP, then a heal once the player is far enough away, is a usable boss phase with two data fields (`retreat_hp_frac`, `heal_gap_tiles`). The heal size is a field, and I would use our own value, not the donor's.

## 5. A 5-minute look test Dom can judge on his phone

- Target file: `src/fight/boss-staging.ts` (new module). Parity row 9 (finisher staging).
- Build on the existing fight scene under the look-test flag. No release rows and no lock.
- Three walk-ins on the same boss at 375 wide: intro hold 0.5 s, 2 s, 3.5 s. Each with the gold name card on entry. Dom picks which reads as a threat without feeling slow.
- Two death drifts: 2 s and 7 s, the boss corpse in its own tint at the end.
- Compare: does the hold feel like a threat or a wait, and does the gold name read before the boss attacks.

## 6. Licence and IP

- Code: Sustainable Use License 1.0. Restricted, not MIT/Apache/BSD. Shape only. No code is copied, and no table values are reused as data. Inspiration stays at category level: "a gold-named boss that holds its first attack behind a line". Our own names and numbers.
- Content: the boss names, speech and story belong to the original Diablo game (Blizzard IP). The repo ships the tables. I did not quote the strings. Our bosses are new originals. Name the kept trait (a timed intro hold, an earned resist reveal) and the trait we change (sound-gated attack becomes a server timer; halved single-player HP dropped).
- No legal conclusion is drawn.

## 7. Gaps

- Not read: `Source/controls/touch/*` (touch targeting), `movie.cpp` (cutscene playback), `Source/levels/drlg_l*.cpp` (set-piece room layout for boss rooms), the sound table, `Source/lua/*` boss hooks, the multiplayer Skeleton King pack path in depth (only its placement line, 541), Hellfire content (gbIsHellfire branches).
- Half read: both halves are the same codebase. Data tables read by row count and tally, not every row.
- Dragons and breath cones: absent (see MG011 below).

## MG011 dragons and boss abilities (table, DevilutionX)

| name | effect | formula | number range | cost | cooldown / cast | caps | file:line |
|---|---|---|---|---|---|---|---|
| breath cone | none present | n/a | n/a | n/a | n/a | n/a | not found (grep: no dragon, breath or cone boss) |
| phases | none (no phase table) | n/a | n/a | n/a | n/a | n/a | not found |
| flight phase | Gargoyle "lift" is a one-shot special melee, not flight | sets mode to special melee and clears the allow flag | n/a | n/a | n/a | one use (flag cleared) | `monster.cpp` 4976-4985 |
| armour per body part | none | n/a | n/a | n/a | n/a | n/a | not found |
| taming / bonding | none | n/a | n/a | n/a | n/a | n/a | not found |
| mounts | none | n/a | n/a | n/a | n/a | n/a | not found |
| gargoyle retreat-heal | retreat under 50% HP, heal when far | heal = max/(16 x (rand 0-4 + 4)) | max/64 to max/128 | none | heal anim plus var1 | repeat count not read | `monster.cpp` 2480-2510, 1047-1060 |
| Diablo death camera | view walks to death point | 1 tile per tick | 140 ticks | none | n/a | ends game at 140 | `monster.cpp` 1499-1514 |

Fast mobile fight: the retreat-heal fits (retreat at half HP, heal gap 3-6 tiles). Diablo's 140-tick camera walk is too long for a duel. Keep it at 1-2 s for a phone.

Best transferable idea: a timed talk hold that the server owns, before the first attack, with the boss's name in gold.

Reuse tag: adapt (idea) for the talk hold and leash ring; shape only for everything else.

Brief rule served: boss-staging feel note (FEEL-TASK sections 1-7) with MG011 fold-in (the donor has few dragon mechanics, so the table is mostly "not found").

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN. HP shift/halve/NM x3+100/Hell x4, leash, talk gate, death order, 140-tick camera, gargoyle heal, 70/30 split, quest-pick groups, licence all match.
- Missed (minor): Diablo's death also sets the single-player `pDiabloKillLevel` (max of kill level, difficulty+1) and adds light/vision at the death tile (monster.cpp 898-909); not covered by the note, not needed for the staging idea.
