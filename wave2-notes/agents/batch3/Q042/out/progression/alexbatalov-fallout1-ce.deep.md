# alexbatalov-fallout1-ce (progression, cell 1)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/stat.cc` | Licence: Sustainable Use License 1.0 (`LICENSE.md`, read: use and modify only for internal business or non-commercial or personal use; restricted, so clean-room and shape only) | C++ | symbol `stat_pc_add_experience`

Checked: The list hint was INFERRED (no file named), so I grepped the donor for `xp`, `experience`, `level` and `combat_exps`. Read in full: `stat_pc_add_experience` (stat.cc 575-617), `stat_pc_min_exp` (stat.cc 495-524), `combat_over` (combat.cc 1803-1862), `combat_give_exps` (combat.cc 1871-1890, read to the XP call), kill credit in `damage_object` (combat.cc 3594, kill block 3628-3639), `critter_kill_exps` (critter.cc 798-803), the XP block of `report_explosion` (actions.cc 1698-1767), `show_skill_use_messages` (skill.cc 398-430). Not read: how skill_use computes the value it passes as `v1` (skill.cc 644-770 call sites only), the per-monster XP values in the proto data files, the body of the critter.cc routine that contains lines 780-795 (name not read), the bodies of the other four `stat_pc_add_experience` callers (intextra.cc 224, inventry.cc 4035, worldmap.cc 2468 and 2502), and the enclosing functions of the three `damage_object` call sites (combat.cc 3483, 3505, 3529). Camera scope: not applicable (progression). Confidence: high on the award and level path; medium on the skill path.

## 1. Mechanism

- Two stages. (a) During a fight, each kill credited to the player's side adds the victim's XP to a pending total, `combat_exps`. A kill is credited only if the victim's recorded attacker (`whoHitMe`) is the player or is on the player's team (combat.cc 3630), and only if the victim's script does not override the award (3637). The XP value is a field of the victim's prototype (critter.cc 802). The kill count is bumped in the same branch (3639). (b) At the end of the fight, `combat_over` (combat.cc 1803) pays the pending total once, but only if the global quit flag is 0 (1830-1831), then zeroes it (1834). The pending total is saved and loaded with the combat state (combat.cc 1643, 1706).
- Death drops the pending XP. The routine that sets the victim's hit points to 0 and the dead flag (critter.cc 780-781) also sets the quit flag to 2 when the victim is the player (critter.cc 792-793). Since combat_over only pays when the flag is 0, a player death means the fight's XP is never paid.
- `combat_give_exps` (combat.cc 1871): returns if the amount is 0 or less (1879) or if the player is dead (1883). Otherwise it calls `stat_pc_add_experience` (1887) and then prints a message.
- `stat_pc_add_experience` (stat.cc 575), order of steps: (a) Swift Learner perk: adds 5 percent of the incoming amount per perk rank, integer product then divide by 100 (577). (b) Adds the stored total (578). (c) Clamps to the stat's minimum (0) and maximum (INT_MAX) (580-586). (d) Stores the total (588). (e) Level loop (590): while the level is below the cap and the total is at or above the threshold for the current level, the level goes up by one, the level-up message is shown, the level-up flag is set (601), a sound plays, hit points rise by `END / 2 + 2` plus 4 per Lifegiver rank (606-607), the hit points are raised through `critter_adjust_hits` (608; its body not read), and the max-hit-point bonus goes up by the same amount (610). Because the loop checks again after each level, one award can grant several levels, each giving its own hit-point gain.
- Thresholds (stat.cc 495-524): the threshold for leaving level L is `1000 x exp[L]`, where the 21-entry table at stat.cc 498 has the values L(L+1)/2 for L = 0..20 (checked by arithmetic against the listed values: the last entry, index 20, is 210 = 20 x 21 / 2). At the cap (PC_LEVEL_MAX, 21, stat_defs.h 19) the function returns -1 (523), and the loop's own `level < PC_LEVEL_MAX` test stops it (590).
- Skill XP is a second source on the same pipe. `show_skill_use_messages` (skill.cc 398) returns early unless the acting critter is the player (400), then computes `xpToAdd = a4 * baseExperience` (419), where `a4` is the value skill_use passes as `v1` (how `v1` is computed was not read), then calls `stat_pc_add_experience` (423) and prints message 505. It runs at skill.cc 644, 686 and 770 (the `giveExp` gate at 769 wraps the 770 call).
- Timing: all of this is event-driven. Kill credit happens inside `damage_object` when a hit kills; payout happens once in `combat_over`; skill XP happens on each skill use. No per-frame or per-tick loop is involved.

## 2. Key functions

- `stat_pc_add_experience`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/stat.cc` 575-617. The single entry point for every XP grant, including the level loop.
- `stat_pc_min_exp`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/stat.cc` 495-524. Threshold for the next level, from the table at 498.
- `combat_over`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combat.cc` 1803-1862. The payout point; the XP call is at 1830-1834 inside it. Called from combat.cc 1863 and 2444 (the enclosing function at 2444 not read).
- `combat_give_exps`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combat.cc` 1871-1890. Two callers, both read: combat_over (1831) and `report_explosion` (actions.cc 1767).
- Kill credit, inside `damage_object`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combat.cc` 3594; the XP block is 3628-3639. Called from combat.cc 3483, 3505 and 3529 (enclosing functions not read).
- `critter_kill_exps`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/critter.cc` 798-803. Returns the prototype's experience field. Called from combat.cc 3638 and actions.cc 1722 and 1735.
- Explosion XP: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/actions.cc` 1698-1767. Adds XP for other critters the explosion killed (1722, 1735) when `a2` is the player (1717-1735), then pays it through `combat_give_exps` (1767).
- Skill XP: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/skill.cc` 398-430. Base experience times the result value, through the same pipe.
- Other `stat_pc_add_experience` callers, call line only (not read): intextra.cc 224, inventry.cc 4035 (XP for a theft), worldmap.cc 2468 and 2502 (a fixed 10000).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A pending pool filled by credited kills, paid once at fight end | None (control flow). Payout gated by a quit flag: `game_user_wants_to_quit == 0` (combat.cc 1830) |
| Kill credit only for the killer's side (player or player's team, by the recorded attacker `whoHitMe`) | Team test on `whoHitMe` (combat.cc 3630). No damage-share or assist rule in this code |
| Per-enemy XP value set in data | Field `critter.data.experience` on the prototype (critter.cc 802). Values not read |
| Perk-based percentage bonus on incoming XP | 5 percent per rank (stat.cc 577) |
| Cumulative threshold table, one step per level | `1000 x L(L+1)/2` for L = 0..20 (stat.cc 498-523). Shape is triangular numbers scaled by 1000 |
| Level cap | 21 (stat_defs.h 19) |
| Multi-level loop in a single award | None (control flow, stat.cc 590) |
| Hit points per level | `END / 2 + 2` plus 4 per Lifegiver rank (stat.cc 606-607) |
| XP floor and ceiling | Floor 0, ceiling INT_MAX (stat.cc 89), so the ceiling never binds in practice |
| Death voids the pending XP | Quit flag set to 2 on player death (critter.cc 793); any non-zero flag skips the payout (combat.cc 1830) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the award: Swift-style bonus on the incoming amount, add to the stored total, clamp at 0, then the level loop. It also keeps the pending-pool gate, the payout skipped on quit or death, and the script-override suppression. It omits the level-up message and sound, the current-hit increase that goes with the max-hit-point gain (stat.cc 608; `critter_adjust_hits` body not read), the explosion path that credits non-main kills, the kill counters, the save and load of the pending total, and the XP ceiling (INT_MAX in the donor, which never binds). Threshold values are inputs, not the donor's table.

```ts
// Licence: Sustainable Use License 1.0 (donor; restricted). Clean-room sketch of the mechanism, not a translation of the donor lines.
// Threshold values are inputs (designer data), not the donor's numbers.
// clean-room
interface Progress {
  xp: number;             // stored total XP
  level: number;          // starts at 1
  maxHp: number;
  levelUpPending: boolean;
  levelsGained: number;
}

interface ProgressRules {
  maxLevel: number;
  xpToNext: readonly number[]; // index = current level; xpToNext[level] = total XP that reaches level + 1 (index 0 unused)
  swiftRanks: number;          // perk ranks that bonus incoming XP
  swiftPct: number;            // percent bonus per rank
}

interface Hero {
  endurance: number;
  lifegiverRanks: number;
}

// Order: perk bonus on the incoming XP, add to the stored total, clamp at 0, then climb levels in a loop.
function addXp(p: Progress, incoming: number, hero: Hero, rules: ProgressRules): void {
  const bonus = Math.floor((rules.swiftRanks * rules.swiftPct * incoming) / 100);
  p.xp = Math.max(0, p.xp + incoming + bonus);
  while (p.level < rules.maxLevel && p.xp >= rules.xpToNext[p.level]) {
    p.level += 1;
    p.levelsGained += 1;
    p.levelUpPending = true;
    p.maxHp += Math.floor(hero.endurance / 2) + 2 + hero.lifegiverRanks * 4;
  }
}

// One fight's pending XP. Kills by the player's side add here; nothing is paid until the fight settles.
interface Fight {
  pendingXp: number;
}

function onKill(f: Fight, victimXp: number, killerIsPlayerSide: boolean, victimScriptOverrides: boolean): void {
  if (!killerIsPlayerSide || victimScriptOverrides) return;
  f.pendingXp += victimXp;
}

// Pays once at the end. If the player quit or died, the pending XP is dropped (the donor does this too).
function settleFight(f: Fight, p: Progress, hero: Hero, rules: ProgressRules, quitting: boolean): void {
  if (!quitting && f.pendingXp > 0) addXp(p, f.pendingXp, hero, rules);
  f.pendingXp = 0;
}
```

Typecheck: the block plus `export {}` passes `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (exit 0, file `/tmp/alexbatalov-fallout1-ce-xp.ts`).

## 5. Lands in

- TARGET `src/fight/xp.ts` (proposed new module; the Frankendom file tree was not read, so the path is a proposal). Parity-checklist row 18 (loot roll and XP award).
- Kill credit belongs at the server-verified kill event, in the same engine step that resolves the hit, not in a client summary.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0 restricts use; clean-room, shape only)
- Brief rule served: addendum anti-strictness rules 1-6 (real code opened, no genre downgrade, honest licence); Frankendom rulings "one ledger" and "kills are server-verified"

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 limits use to internal business or non-commercial use. Frankendom should not copy the table or the code. Use the shape (a cumulative table, a per-level hit-point rule, a percent bonus per perk rank) and let designers set their own values as engine data.
- Pending XP is lost on player death or quit (combat.cc 1830, critter.cc 793). In a server-verified game this is a silent loss. Decide it explicitly and test it, or settle XP per verified kill and avoid the pending pool.
- Kill credit uses the recorded attacker (`whoHitMe`, set by `critter_set_who_hit_me`; the setter's body not read) plus team membership. It has no damage share and no assist. Frankendom's many-on-one fights (MAX_ATTACKERS = 3, hate list) need a credit rule the donor does not have, so this is a gap, not a transfer.
- The script-override gate (combat.cc 3637) depends on per-object scripts. Frankendom has no per-creature scripts in the duel, so this gate does not transfer.
- The skill XP amount depends on `v1` from skill_use, which was not read. Do not port the skill path until that is read.
- The level loop grants several levels in one call and each level gives its own hit-point gain. Frankendom should keep that behaviour (test: a large award gives every level's gain), not cap it at one level per award.
- The pending total is saved with the combat state (combat.cc 1643, 1706). If Frankendom keeps a pending pool, it belongs in the fight record for replay (checklist row 19).
- Not read: the proto XP values, the level-up sound and message, and `stat_pc_set`'s return value (the level-up branch tests it at stat.cc 591).

Reuse tag: rewrite-from-idea (Sustainable Use License 1.0; clean-room, shape only)
Brief rule served: addendum rules 1-6; Frankendom rulings "one ledger", "kills are server-verified"; parity row 18

Best transferable idea: Credit each kill to the player side by its recorded attacker and pay XP through one cumulative threshold table with a loop that can grant several levels in one award, instead of one level per event.
Decision (proposed): adapt - the credit rule, the cumulative table and the multi-level loop are the useful shape, but Frankendom must award at the server-verified kill into its one ledger, not hold a pool to fight end, and it needs a credit rule for MAX_ATTACKERS = 3 that the donor does not have.
Acceptance: a server test: after verified kills totalling X XP, the level equals the table result; one large award grants every crossed level's hit-point gain; a kill credited to an enemy-side attacker adds 0 XP; a player death voids the fight's pending XP only if the pending pool is kept.
