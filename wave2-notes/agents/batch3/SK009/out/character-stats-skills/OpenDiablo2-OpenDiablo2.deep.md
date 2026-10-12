# OpenDiablo2-OpenDiablo2 (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2map/d2mapentity/player.go` | Licence: GPL-3.0 (LICENSE file, read: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; copyleft) | Go | symbol `Player.Advance` (stamina block, lines 125-146), with `HeroStatsState` (`d2core/d2hero/hero_stats_state.go`)

Checked: `Player.Advance` read at player.go 91-147 (stamina block 125-146 read in full). `hero_stats_state.go` 1-56 read in full. `charstats_record.go` and `charstats_loader.go` read in full. `hero_state_factory.go` 112-148 read. `stat.go` 276-310, `statlist.go` 70-120 read. Callers: `ReduceStats` has one caller (item.go 693), which is inside `GetStatStrings` (item.go 668-706); no caller of `GetStatStrings` was found in the repo (grep). `Item.StatList()` has no caller outside the item package (grep). NOT read: the map loop that calls `Player.Advance` (game_controls.go 717 calls `mapRenderer.Advance(elapsed)`; the call chain below it was not followed). Data files (charstats.txt, skills.txt, experience table values) are not in the repo: no class numbers were read. Confidence: high on the code paths and on what is NOT wired; medium on the tick unit (seconds, from `d2util.Now` and `app.go`, not from the caller of `Player.Advance`). camera_scope: n/a.

## 1. Mechanism

- Stamina is one float pool per hero (`Stats.Stamina`; the refill is only guarded by `< MaxStamina`, with no clamp, so it can overshoot by one tick, player.go 140-142). It is changed once per frame by `Player.Advance(tickTime)` (player.go 91), which calls the stamina block after movement and animation (125-146).
- Order of steps in that block: (a) read the class drain rate `StaminaRunDrain` (126); (b) if the hero is running and not at its target and not in town, subtract `drain * tickTime / 5` (135-136); if stamina is now <= 0, clamp it to 0 and set walk speed 9.0 (137-139); (c) otherwise, if stamina is below max, add the same amount (141-142); if the run toggle is still on, set run speed 13.0 (143-145).
- The run toggle itself is not changed by this block. A hero who runs out of stamina keeps the run flag on; each frame the drain branch clamps stamina to 0 and sets walk speed. The flag stops mattering only when the hero stops (regen branch), and there is no threshold that must be reached before running again.
- Derived pools are set once, at creation (`CreateHeroStatsState`, hero_stats_state.go 33-53): max health = initial Vitality x LifePerVitality; max mana = initial Energy x ManaPerMagic; max stamina = initial stamina; health, mana and stamina start full.
- Attribute spending (hero_stats_panel.go 204-248): each button adds 1 to one of Strength, Dexterity, Vitality or Energy and subtracts 1 from `StatsPoints`, then refreshes labels. Nothing recomputes max health or max mana (see the table).
- Tick: fixed-step is NOT used. The step is the elapsed time of the frame (variable step). `d2util.Now()` returns seconds (timeutils.go 10-12) and the app scales it by `timeScale` (app.go 405-406). Rates are therefore per second; the donor's divisor 5 is a fixed number in the code, not a data field (player.go 128-132, with the comment that it was tuned by trying it out).

## 2. Key functions

- `Player.Advance`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2map/d2mapentity/player.go` 91-147. Stamina drain/regen is 125-146; walk and run constants are 38-39.
- `CreateHeroStatsState`: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2hero/hero_stats_state.go` 33-53. Creation-only derived pools.
- Stat point spend: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/hero_stats_panel.go` 204-249 (buttons 209-219; `Vitality++` at 216; `StatsPoints--` at 242). The buttons appear only when `StatsPoints > 0` (251-253).
- Stat-modifier stack (shape only; not wired): `Diablo2Stat.Combine` `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2stats/diablo2stats/stat.go` 276-310 (sum vs static combine per value); `Diablo2StatList.ReduceStats` `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2stats/diablo2stats/statlist.go` 71-103.
- XP to next level: `GetExperienceBreakpoint` `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2records/record_manager.go` 332-334 (per class, per level table). XP bar: `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/hud.go` 529.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A pool that drains while a costly action runs and refills otherwise, clamped to 0..max | Drain divisor 5, fixed in code (player.go 132, "tried it out"); drain rate per class from data, value not in repo |
| Exhaustion forces the slow speed | Walk speed 9.0 and run speed 13.0 (player.go 38-39). The comment at player.go 36 says the original game is 6 yards walk and 9 yards run, and run should be walk x 1.5 (9.0 x 1.5 is 13.5, so 13.0 is a rounded guess). The class record has `VelocityWalk`/`VelocityRun` fields (charstats_record.go 22-23) but `Advance` ignores them and uses the hard-coded constants |
| Derived pools computed from primary stats at creation | Life per vitality, mana per energy (data); the donor comment says the per-level life, mana and stamina values are divided by 256 (charstats_record.go 25-26, which sits on the `*PerLevel` fields, not on LifePerVit/ManaPerEne), while the creation code multiplies raw products (hero_stats_state.go 45-46): units not reconciled, data not read |
| Named stat values combined by a per-value rule (sum, or static that must match) | Combine rule is per value in the stat record (stat.go 290-306: sum adds, static is skipped; the "values must match" test is the separate match check at stat.go 337-341) |

### Stat table (character-stats-skills; fields as the donor defines them)

Values are the donor's own where a number is in code. Where the number lives in a data file that is not in the repo, the row says so.

| name | what it does | formula | number ranges | caps (soft/hard) | file:line |
|---|---|---|---|---|---|
| Strength | primary stat; +1 per spent point | start = class InitStr (data); +1 per spend | start: data not in repo; spend: no max in code | none in code | hero_stats_state.go:13, 33-41; hero_stats_panel.go:210-211 |
| Dexterity | primary stat; +1 per spent point | start = class InitDex (data); +1 per spend | data not in repo | none in code | hero_stats_state.go:15; hero_stats_panel.go:213 |
| Vitality | primary stat; feeds max health | start = class InitVit (data); +1 per spend; max health not recomputed on spend | data not in repo | none in code | hero_stats_state.go:16, 45; hero_stats_panel.go:216 |
| Energy (class column "int") | primary stat; feeds max mana | start = class InitEne (data); +1 per spend; max mana not recomputed | data not in repo | none in code | hero_stats_state.go:14, 46; hero_stats_panel.go:219; charstats_loader.go:47 |
| StatsPoints (unspent) | points to spend on the four stats | +StatPerLevel per level: NOT IMPLEMENTED (no increment anywhere in the repo; only a save-file value or the start 0) | start 0 | none | hero_stats_state.go:18, 42; charstats_loader.go:65 |
| Health (max) | life pool | MaxHealth = InitVit x LifePerVit, set once at creation; no assignment after creation found (grep) | product of two data values | Health starts at MaxHealth | hero_stats_state.go:45, 51-52 |
| Mana (max) | resource pool | MaxMana = InitEne x ManaPerEne, set once at creation | product of two data values | Mana starts at MaxMana | hero_stats_state.go:46, 51 |
| Mana spent on cast | would reduce Mana | NOT IMPLEMENTED: no `Mana -=` in the repo; the cast handler starts the animation and missiles only (game_client.go 296-312) | n/a | n/a | game_client.go:312 |
| Stamina (max) | melee-style economy pool (here: running) | MaxStamina = InitStamina (data); Stamina starts at max | data not in repo | floor 0 (drain clamp); regen guarded by `< MaxStamina` but not clamped | hero_stats_state.go:25-26, 47, 53 |
| Sprint drain | stamina lost while running, not at target, not in town | per frame: Stamina -= RunDrain x tickTime / 5 | RunDrain per class (data not in repo); divisor 5 fixed | floor 0 | player.go:126, 132, 135-136 |
| Stamina regen | refill when not sprinting, at target, or in town | per frame: Stamina += RunDrain x tickTime / 5, only while below max | same as drain | no clamp: one-tick overshoot above MaxStamina possible (defect; the sketch clamps) | player.go:141-142 |
| Exhaustion | at 0 stamina the speed becomes walk; the run flag stays on | speed set to baseWalkSpeed; no re-entry threshold | n/a | none | player.go:137-139 |
| Walk speed | move speed while walking | constant | 9.0 (original game: 6 yards walk per the comment, player.go 36) | none | player.go:38 |
| Run speed | move speed while sprinting | constant | 13.0 (comment: original 9 yards run, run = walk x 1.5; 13.0 is not 13.5) | none; class `VelocityWalk`/`VelocityRun` (charstats_record.go 22-23) unused | player.go:39, 143-145 |
| LifePerLevel, ManaPerLevel, StaminaPerLevel | per-level pool growth (data) | loaded only; no code reads them (grep) | data not in repo | n/a | charstats_loader.go:57-59; charstats_record.go:28-30 |
| Experience | XP points | NOT IMPLEMENTED: no `Experience +=` anywhere; only read by the HUD and panel | start 0 (hero_stats_state.go:36) | n/a | hud.go:529; hero_stats_panel.go:422 |
| NextLevelExp | XP needed for the next level | breakpoint table indexed by [level][class] | per-class table in data (not in repo); max level per class loaded from the same file | max level per class (data) | record_manager.go:332-334; experience_loader.go:35-74 |
| Base skills | skills a class starts with | the class record's Skill 1..10 entries, skill level 1 | up to 10 per class (charstats_record.go:44) | n/a | hero_state_factory.go:115-127 |
| Class skills | skills granted by class token | every skill whose class token matches, at 0 points | data | n/a | hero_state_factory.go:130-138 |
| Attack (default skill) | the basic attack skill | always added at level 1 | 1 | n/a | hero_state_factory.go:140-145 |
| Skill mana fields | cost fields for skills: startmana, minmana, manashift, usemanaondo, nocostinstate | loaded only; no code reads them (grep) | data not in repo | n/a | skill_details_loader.go:194-200 |
| Item stat modifiers | named stat values with sum or static combine | sum: v1 += v2; static: values must match, else no combine (stat.go 290-306, 337-341) | value counts from DescFnID | none | stat.go:290-306; statlist.go:71-103 (NOT WIRED: item statList is never assigned) |
| Block factor | shield block bonus (data) | loaded only (use not checked) | data | n/a | charstats_record.go:38; charstats_loader.go:66 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (drain while sprinting and moving, clamp to 0 and fall back to walk, otherwise refill up to the cap). It changes three things: the drain and regen rates are per-second inputs with no fixed divisor, exhaustion sets an explicit lock that only clears at a relock ratio (the donor has no re-entry threshold), and the sprint flag is returned to the caller instead of a speed being set. It omits the at-target and in-town conditions (the caller passes `moving`), the speed constants, the animation, and the donor's run toggle.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch of the mechanism shape only; not a translation of the donor lines.
// Units: seconds (dt), stamina points. Rates are data (class/zone), not donor constants.
interface StaminaState {
  value: number;   // current stamina, 0..max
  max: number;     // pool cap (class data in donor: InitStamina)
  locked: boolean; // true after exhaustion until the refill threshold is reached (not in donor)
}

interface StaminaConfig {
  runDrainPerSec: number;  // sprint drain per second (donor: StaminaRunDrain / 5 per tick)
  regenPerSec: number;     // regen per second when not sprinting (donor: same rate as drain)
  relockRatio: number;     // fraction of max needed before sprint is allowed again (fix: donor has none)
}

interface TickResult {
  sprint: boolean; // true if this frame moves at sprint speed
}

// One frame. dt is the elapsed time of this frame (variable step, as the donor).
export function staminaTick(
  s: StaminaState,
  cfg: StaminaConfig,
  dt: number,
  wantsSprint: boolean,
  moving: boolean,
): TickResult {
  if (wantsSprint && moving && !s.locked) {
    s.value -= cfg.runDrainPerSec * dt;
    if (s.value <= 0) {
      s.value = 0;
      s.locked = true; // donor keeps the run flag set and only drops speed; here the lock is explicit
      return { sprint: false };
    }
    return { sprint: true };
  }

  // not sprinting: refill up to the cap
  s.value = Math.min(s.max, s.value + cfg.regenPerSec * dt);
  if (s.locked && s.value >= s.max * cfg.relockRatio) {
    s.locked = false;
  }
  return { sprint: false };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/SK009-od2-stamina-tick.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/stamina.ts` (new; the engine's stamina step, one owner for the economy). Parity-checklist row 3 (guard/parry/stamina). The donor's stamina is for world running, so only the pool shape lands; the melee cost per action is not in this donor.
- today: not read (the Frankendom repo was not opened in this pass).
Reuse tag: rewrite-from-idea (GPL-3.0; clean-room shape only)
Brief rule served: 1 (the engine owns stamina state, clients only display it); parity row 3

Best transferable idea: A single stamina pool that drains per second only while sprinting and refills otherwise, with sprint dropping to walk at zero, plus an explicit lock that clears only at a refill ratio.
Decision (proposed): adapt — keep the drain and refill shape and the zero-to-walk fall-back; add the re-entry lock (the donor has none) and move the divisor into the data as a per-second rate, so a fast mobile fight can tune it per class.
Acceptance: the player holds sprint and watches the stamina bar empty; sprint stops, and it does not restart until the bar refills past the relock ratio; a server test asserts sprint is refused while locked and that the refill threshold is respected.

## 6. Gaps and risks

- GPL-3.0 (copyleft): clean-room only. The sketch is written from the mechanism; nothing is translated line by line.
- Data is not in the repo. The class values (StaminaRunDrain, InitStr/Dex/Vit/Energy, LifePerVitality, ManaPerMagic, ExpRatio and the breakpoint table) live in data files the donor loads at runtime; their numbers were not read. Frankendom needs its own table (zones as data), not these values.
- Defect: no re-entry threshold. Exhaustion keeps the run flag and only drops the speed each frame (player.go 137-139). Fix: the lock in the sketch (relockRatio), set per class.
- Defect: the empirical divisor 5 (player.go 132) hides the rate's unit. Fix: put the per-second rate in the data and state the unit in the schema.
- Defect: the comment says the per-level life, mana and stamina values are divided by 256 (charstats_record.go 25-26, on the PerLevel fields), but the code multiplies raw values (hero_stats_state.go 45-47). Not reconciled; the data was not read. Fix: state one unit in the data and test it.
- Defect: max health and max mana are never recomputed when Vitality or Energy is spent (hero_stats_panel.go 216, 219; no assignment to MaxHealth or MaxMana after creation). Fix: an engine function recomputes derived pools on every stat change, and the server tests it.
- Not wired: StatsPoints is never awarded (only a save-file value or the start 0); Experience is never awarded (no `Experience +=`); the level table is loaded and read only for the bar. Frankendom's XP award belongs to row 18 (loot roll and XP award), not this stamina row.
- Not wired: mana is not deducted on cast (no `Mana -=` in the repo; game_client.go 296-312 starts the animation and missiles only). Fix for Frankendom: the engine checks and spends the cost on the server.
- Not wired: the item stat-modifier stack. `item.statList` is never assigned (item.go 75, 248), and `ReduceStats` is reached only through `GetStatStrings`, which has no caller in the repo (item.go 668-693). Shape only.
- Defect in `ReduceStats` (statlist.go 91-97, if the stack were used): the loop at 91-95 discards its result and does nothing; and `lookup[stat.Name()] = len(lookup)` (97) runs after a failed combine, so the index can point at the newest slot. This is reachable when two same-named stats do not combine (the comment at stat.go 331-336 gives the class-skill case). Fix: delete the no-op loop; keep the existing index on a failed combine and append a separate slot.
- Unused data: `StaminaPerVit` and the class velocity fields are loaded but not used by the player code.
- Stamina per action (attack, block, roll) is not in this donor: searched d2core, d2game, d2map and d2common for Stamina; only the running drain/regen and the display were found. d2networking not searched for this.
- Tick: the caller of `Player.Advance` was not followed; the unit is inferred from `d2util.Now` (seconds) and `app.go` 405-406.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- Walk 9.0 / run 13.0 "units not stated": player.go 36 comment gives original 6 and 9 yards and run = walk x 1.5. Confirmed.
- Stamina "capped at MaxStamina": regen has only a `< max` guard, no clamp (player.go 140-142). Confirmed.
- "divided by 256" comment sits on the PerLevel fields (charstats_record.go 25-26), not LifePerVit/ManaPerEne. Confirmed; link reworded.
- "static must match" is stat.go 337-341; Combine at 290-306 skips static values. Confirmed.
- Missed: VelocityWalk/VelocityRun (charstats_record.go 22-23) exist but player.go hard-codes 9/13; StaminaPerVit unused. Added.

Fixed 2026-10-12: speed units and 13.0-vs-13.5 guess; regen overshoot (no clamp); 256-comment scope; static-combine citation split; unused class fields line.
