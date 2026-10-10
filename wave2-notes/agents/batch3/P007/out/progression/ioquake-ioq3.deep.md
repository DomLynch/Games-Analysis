# ioquake-ioq3 (progression, cell 10)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/ui/ui_atoms.c` (with `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_arenas.c` for the sender) | Licence: GPL-2.0-or-later (per ui_atoms.c header line 10: "or (at your option) any later version."; COPYING.txt is GPL v2) | C | symbol `UI_CalcPostGameStats`

Checked: `UI_CalcPostGameStats` is defined at ui_atoms.c 240 and read end to end (240-340). Sender `UpdateTournamentInfo` read at g_arenas.c 40-134. Confidence high on the score and record formula (read in full). Confidence medium-high on the base-build field mismatch (both sides read; the tokeniser was not run). Not read: where the match score (`PERS_SCORE`) is computed; the caller of `UpdateTournamentInfo`; `UI_ShowPostGame`; cgame's handling of server commands (only the dispatch in qcommon/cmd.c 808 was read); `Cbuf_ExecuteText` internals. No XP, levels or unlocks exist in this donor; the topic reached is the post-match score and personal-best record, which is the only progression-like ledger I found. Searches: grep for experience/xp/levelup/unlock/medal/award/rank across code/ (non-thirdparty) and ui/game/cgame/qcommon for BestScore, tier, unlock.

## 1. Mechanism

- Trigger: when the match ends, the game builds one console line `postgame ...` (g_arenas.c 110-134). Its fields are the player's counters, the base score, a perfect flag, the team scores and the match time. In the non-MISSIONPACK branch (`#else` at g_arenas.c 115) the line has 8 values; the client list (`n rank score` per non-spectator client, g_arenas.c 126-127) is appended in the same console text. The UI handles the line in `UI_ConsoleCommand` (ui_atoms.c 341; the `postgame` branch is at 382-383), which calls `UI_CalcPostGameStats`.
- Order of steps inside `UI_CalcPostGameStats` (ui_atoms.c 240):
  (a) Load the old record for this map and game type from `games/<map>_<gametype>.game` (255-266). If the file is missing the old record is zeroed (257).
  (b) Read the fields from argv 3 to 14 (268-279). Time is argv 13 in milliseconds.
  (c) Time in whole seconds since match start: `(time - ui_matchStartTime) / 1000` (281). Time bonus: if that is under the map's time to beat, bonus = (time to beat - seconds) x 10; otherwise 0 (282-287).
  (d) Shutout: 100 if red is ahead and blue has 0 (289-291).
  (e) Skill: multiplier = `g_spSkill`, floored at 1 (295-298).
  (f) Score = (base + shutout + time bonus), then multiplied by skill (299-300).
  (g) New high only if red is ahead AND the new score is above the old one (303). If so, the whole new record (including its time) overwrites the file (306-314), and a 20-second "new high" banner timer starts (307).
  (h) New best time flag if the new seconds value is lower than the stored one (316-318). It is not gated on winning and an absent record counts as 0 seconds (see section 6).
  (i) Cvars for the post-game screen are restored, both the new and the stored values are pushed (329), and the post-game screen is shown with the new-high flag (330).
- Tick: none. This runs once per match end, from a console command. The clock is the client's: `ui_matchStartTime` is set from `cg.time` (cgame/cg_servercmds.c 492).

## 2. Key functions

- `UI_CalcPostGameStats`: `/mnt/frankendom-donors/ioquake-ioq3/code/ui/ui_atoms.c` 240-340. The whole sequence above.
- `UI_SetBestScores`: ui_atoms.c from 114. Copies one record into the screen cvars (the post-game screen and the best-score screen). Read to its end.
- `UI_LoadBestScores`: ui_atoms.c from 149 (reads the stored record for the menu; the file name is at 157; read through the demo-file check).
- Callers: `UI_CalcPostGameStats` has one caller in the file, the `postgame` dispatch at 382-383. The console path into the UI is qcommon/cmd.c 808 (`UI_GameCommand`) and client/cl_ui.c 1167 (`UI_CONSOLE_COMMAND`). The sender's callers were not read.
- Map timing: `timeToBeat` is parsed per game-type digit in the arena file (ui/ui_main.c 4848). Read only at that line.
- Skill names: ui/ui_main.c 46-54, five levels (`I Can Win` ... `Nightmare`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Score = (base + win bonus + time under par) x difficulty | Time bonus 10 per second under par (theirs, ui_atoms.c 284) |
| Win bonus only for a clean win | Shutout bonus 100 (theirs, ui_atoms.c 290) |
| Difficulty multiplier with a floor of 1 | Skill from `g_spSkill`, 5 named levels (theirs, ui_main.c 46-54; floor at ui_atoms.c 296-297) |
| Keep the stored record only when the new score is higher and the run was won | Win test is red ahead of blue (theirs, ui_atoms.c 303) |
| Banner timer after a new record | 20000 ms (theirs, ui_atoms.c 307 and 317) |

## 4. TypeScript sketch

simplified: the sketch settles one finished run in the donor order (time bonus, shutout, skill, then the new-high test and record write). It differs in three ways, all stated here. (1) The best-time flag needs an existing record; the donor compares against a zeroed record when none exists, so a first run never sets it. (2) The best-time flag is still not gated on winning, as in the donor. (3) It omits the banner timers, the screen cvars, the demo-file check, the client list and the perfect flag. It also takes seconds directly rather than computing them from a clock.

```ts
// Licence: GPL-2.0-or-later (donor header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface RunInput {
  won: boolean;        // the player's side finished ahead
  baseScore: number;   // points from the match itself (where the match score is computed was not read)
  opponentScore: number;
  seconds: number;     // run length in whole seconds
  parSeconds: number;  // zone data: time to beat (0 = no par, so no time bonus)
  difficulty: number;  // 1..5; values <= 0 count as 1
}

interface Record { score: number; seconds: number }

interface Settled {
  score: number;
  record: Record | null;   // what is kept after this run
  newHigh: boolean;
  newBestTime: boolean;
}

// One finished run. Score is settled once; the stored record only moves on a winning, higher score.
export function settleRun(run: RunInput, prev: Record | null): Settled {
  const timeBonus = run.parSeconds > 0 && run.seconds < run.parSeconds ? (run.parSeconds - run.seconds) * 10 : 0;
  const shutoutBonus = run.won && run.opponentScore <= 0 ? 100 : 0;
  const multiplier = run.difficulty > 0 ? run.difficulty : 1;
  const score = (run.baseScore + shutoutBonus + timeBonus) * multiplier;

  const newHigh = run.won && score > (prev ? prev.score : 0);
  // Donor compares against a zeroed record when none exists; this sketch requires a record first (fixes the quirk).
  const newBestTime = prev !== null && run.seconds < prev.seconds;
  const record = newHigh ? { score, seconds: run.seconds } : prev;
  return { score, record, newHigh, newBestTime };
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file copied to /tmp/ioq3-progression.ts).

## 5. Lands in

- TARGET `src/fight/award.ts` (new module, post-fight settlement). It runs once on the server when a fight ends, computes the score and the XP award from zone data (par seconds, difficulty multiplier), and writes the personal best to the one ledger. The client only displays the result.
- Parity-checklist row 18 (loot roll and XP award). Par seconds per zone and the difficulty multiplier are zone data fields with defaults.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (the record is settled in one place on the server); zones as data (par and multipliers are zone fields)

Best transferable idea: settle a finished fight once on the server: score = (base + win bonus + 10 per second under the zone's par) x difficulty, and keep only a personal best per zone and mode that the new score beats.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Base-build field mismatch (verified by reading both sides): the non-MISSIONPACK sender writes 8 values (g_arenas.c 117) and then the client triples (126-127), but `UI_CalcPostGameStats` reads fixed positions 3 to 14 (ui_atoms.c 268-279). In a base build, argv 6 to 8 are gauntlets, score and the perfect flag, and argv 9 to 14 are client indices, ranks and scores from the appended list. So the base score, team scores, time and captures are not what their names say. The MISSIONPACK layout (g_arenas.c 110) matches the reader. Frankendom must not copy the text protocol: the server computes the numbers and sends a typed result.
- The client writes the record file itself (ui_atoms.c 311) and computes the score from numbers the client receives. In Frankendom the server computes the score, owns the record and the ledger, and the client only shows it.
- Absent record = zero: the first run never sets the best-time flag (ui_atoms.c 257 and 316). Frankendom needs an explicit "no record" state.
- The whole record is overwritten on a new high, including the time (ui_atoms.c 311). A higher score that is slower replaces an earlier faster time. The donor does this on purpose or by accident; Frankendom must choose one rule and test it.
- The time bonus uses seconds derived from the client clock (cgame/cg_servercmds.c 492). Frankendom uses the server clock.
- Difficulty multiplies the whole score, including the time bonus. Frankendom should express difficulty as a zone or difficulty data field with a default, not a constant.
- This donor has no XP, level or unlock system. Searches for experience, xp, levelup, unlock, medal, award and rank in code/ (non-thirdparty) found only the award counters (g_combat.c 519-535; g_weapon.c 548) and bot ranking (ai_main.c 564-611). Those are not read in full and are not part of this note.
