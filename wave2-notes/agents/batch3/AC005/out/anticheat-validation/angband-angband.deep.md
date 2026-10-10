# angband-angband (anticheat-validation, cell 1)

Donor: `/mnt/frankendom-donors/angband-angband/src/score.c` | Licence: dual, "GNU General Public License ... version 2, or" OR the "Angband licence" (educational, research and not-for-profit copies only), as read in the score.c header lines 9-15; clean-room only | C | symbol `enter_score`

Checked: `enter_score` (score.c 272) read in full through its closing brace (I printed score.c 255-320). Also read: `option_set` and `options_init_cheat` (option.c 96-110 and 146-190), the option toggle (ui-options.c 140-170), the option load (load.c 452-465), the death handler `death_knowledge` (player-util.c 240-316 and 1296-1307), the NOSCORE setters (cmd-misc.c 36-54 and 116-132, savefile.c 640-655, wiz-debug.c 26-35, cmd-wizard.c 1358-1368), the jump flag clear (generate.c 818-832), the bit defines (player.h 88-100), the option table entries (list-options.h 50-75), and the birth clear (player-birth.c 1226-1240). Not read: the bodies of `highscore_add`, `highscore_write`, `build_score`; the "Die?" prompt handler; the EVENT_CHEAT_DEATH handler; the save-side option writer (save.c 330, one grep hit only). Confidence: high on the gate order and on the shadow-twin rule (both read in code); medium on the save/load round trip (the noscore write and read and the load-side setter were read; the option writer was not). camera_scope: n/a.

Best transferable idea: Mark a run tainted with a sticky flag that the server sets in the same write as the cheat action, and refuse XP, loot and leaderboard credit at award time while play continues.
Decision (proposed): adapt - the shadow-twin and sticky-mark shape is worth taking; Angband's trust model (a flag in a local savefile the player controls) is not, because Frankendom's ledger is server-held.
Acceptance: A server test: a character flagged by an admin debug action wins a fight; the server writes the ledger entry with the taint set, credits no XP and no loot, and the taint survives a reconnect and a server restart; a client message that tries to set the taint is rejected.

## 1. Mechanism

- Two kinds of sticky flag. (a) Cheat switches: each cheat option has a shadow "score" twin in the same options table, the entry right after it (list-options.h 70 `"Cheat: Allow player to avoid death"`, twin on 72 `"Score: Allow player to avoid death"`; four pairs, lines 58-73). The setter `option_set` (option.c 156-170) writes the value and, when the option is a cheat type and the value is true, sets the twin to true in the same call (option.c 166-167). The setter never clears the twin. The only clear is `options_init_cheat` (option.c 178-187), which runs once at character accept (player-birth.c 1234). (b) Mark bits in `player->noscore`: NOSCORE_WIZARD 0x0002, NOSCORE_DEBUG 0x0008, NOSCORE_BORG 0x0020 (player.h 95-99). Each is set once by the action that is cheating, after a confirmation: wizard mode (cmd-misc.c 43-51, warns "This is a form of cheating, and your game will not be scored!" then marks), the debug command (player-util.c 1298-1303), cheat death (wiz-debug.c 32; savefile.c 647-650), and the borg commands (cmd-misc.c 116-130).
- Both kinds persist with the character. `noscore` is written and read as a 16-bit value (save.c 623, load.c 981). Options are restored by name through `option_set` (load.c 462), so loading a save re-sets any twin that is on.
- The gate runs at the end of a run, not during play. On death, `death_knowledge` (player-util.c 281) calls `enter_score` (313). `enter_score` (score.c 272) checks in this order: (1) loop over every option; any SCORE-type option that is true prints "Score not registered for cheaters." and returns (277-285); (2) noscore WIZARD or DEBUG bit prints "Score not registered for wizards." and returns (289-293); (3) BORG bit, only in builds with ALLOW_BORG and without SCORE_BORGS (294-298); (4) if the character is not a total winner, a death cause of "Interrupting" or "Retiring" is refused (299-304); (5) otherwise build the entry and add it to the table.
- Play is never blocked. Cheats keep working; the only effect is that the score is refused. The taint is sticky: nothing except birth clears a shadow, and turning a cheat switch off does not clear it (option.c 166-167 sets only on true).

## 2. Key functions

- `enter_score`: `/mnt/frankendom-donors/angband-angband/src/score.c` 272-310 (read 255-320). The gate order in section 1.
- `option_set`: `/mnt/frankendom-donors/angband-angband/src/option.c` 156-170. One setter for every route: menu toggle (ui-options.c 155 and 165), key y/n/t, and savefile load (load.c 462). The twin is set only inside the `if (val && option_is_cheat(opt))` branch (166-167).
- `options_init_cheat`: `/mnt/frankendom-donors/angband-angband/src/option.c` 178-187. The only clear of either flag; called from `do_cmd_accept_character` (player-birth.c 1234).
- `player_can_debug_prereq`: `/mnt/frankendom-donors/angband-angband/src/player-util.c` 1296-1307. Returns early if the DEBUG bit is set (1298); otherwise asks to confirm and sets the bit (1303).
- `death_knowledge`: `/mnt/frankendom-donors/angband-angband/src/player-util.c` 281-316. Calls `enter_score` at 313.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| A shadow flag is set in the same write as the cheat switch, and is never cleared mid-run | Twin is opt+1 (option.c 167); four switch and twin pairs (list-options.h 58-73) |
| A sticky mark is set once, after an explicit confirmation, by the action that breaks fair play | Bits 0x0002 (wizard), 0x0008 (debug), 0x0020 (borg) (player.h 95-99); the borg bit exists only under ALLOW_BORG (player.h 98-100) |
| The gate is checked once, at the end of the run, and refuses the record only | Order of refusal: any shadow, then wizard or debug, then borg, then interrupt or retire (score.c 277-304) |
| A total winner is exempt from the interrupt and retire refusal only | total_winner is read only at score.c 299 and 302; the cheat and wizard checks come first and are not exempted |
| Bit 0x0010 (jump) is set and cleared around a profile prompt but is not a gate | cmd-wizard.c 1366 sets it; generate.c 825-829 clears it; enter_score does not read it |

No numeric thresholds are in this mechanism. The numbers are the bit values and the count of switch pairs.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order of refusals and the set-on-enable, never-clear-mid-run rule. It replaces the option table with three sets, drops the per-option loop, the high-score file, `build_score`, the savefile load path, the death prompt, the cheat-death paths and the ALLOW_BORG and SCORE_BORGS compile conditions (the borg taint is an unconditional mark in the sketch), and drops the jump bit, which the donor does not gate on. It is clean-room, written from the described mechanism.

```ts
// Licence: donor is GPL-2 or "Angband licence" (dual). clean-room sketch of the pattern, not a translation of the donor lines.
type CheatSwitch = 'live' | 'room' | 'xtra' | 'hear';
type Taint = 'wizard' | 'debug' | 'borg';
type EndKind = 'death' | 'retire' | 'interrupt';

interface RunLedger {
  cheats: Set<CheatSwitch>;   // cheat switches the player has on right now
  shadows: Set<CheatSwitch>;  // sticky twin of each switch: set when a switch is turned on, cleared only at birth
  taints: Set<Taint>;         // sticky marks, each set by a one-time confirmation
  totalWinner: boolean;
}

function newRun(): RunLedger {
  return { cheats: new Set(), shadows: new Set(), taints: new Set(), totalWinner: false };
}

// One setter for every route (menu, key, load). Turning a switch on also sets its shadow in the same write.
// Turning it off clears only the switch, never the shadow.
function setCheat(run: RunLedger, sw: CheatSwitch, on: boolean): void {
  if (on) {
    run.cheats.add(sw);
    run.shadows.add(sw);
  } else {
    run.cheats.delete(sw);
  }
}

// A one-time confirmation marks the run. Declining marks nothing.
function confirmTaint(run: RunLedger, taint: Taint, confirmed: boolean): boolean {
  if (!confirmed) return false;
  run.taints.add(taint);
  return true;
}

// Gate at record time only. Play is never blocked by this function.
// Order of checks follows the donor: any shadow, then wizard/debug, then borg, then interrupt/retire.
function mayRecordScore(run: RunLedger, end: EndKind): { recorded: boolean; reason: string } {
  if (run.shadows.size > 0) return { recorded: false, reason: 'cheaters are not scored' };
  if (run.taints.has('wizard') || run.taints.has('debug')) return { recorded: false, reason: 'wizards are not scored' };
  if (run.taints.has('borg')) return { recorded: false, reason: 'bots are not scored' };
  if (!run.totalWinner && end === 'interrupt') return { recorded: false, reason: 'interrupted' };
  if (!run.totalWinner && end === 'retire') return { recorded: false, reason: 'retired' };
  return { recorded: true, reason: 'recorded' };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/award.ts` (proposed new module, not yet in the repo): the one place XP and loot are credited after a server-verified kill, and it reads the sticky taint on the character's ledger first. Parity-checklist row 18 (loot roll and XP award, server-verified).
- today: (not read) - I did not open the Frankendom tree for this note, so I make no claim about an existing award module.
- Reuse tag: rewrite-from-idea (GPL-2 or Angband licence; clean-room only)
- Brief rule served: ruling "one ledger" (the taint is one field on the character's ledger) and "server-verified kills" (only server code paths set it; the client cannot)

## 6. Gaps and risks

- Trust model. The donor trusts the local savefile. Its gate is a record of honesty, not a security boundary: a player can edit the save. Frankendom must hold the taint on the server and never accept it from the client.
- One-way stickiness. Turning a cheat switch off does not clear the shadow (option.c 166-167). Frankendom must decide whether an admin can clear a taint, and if so that action needs its own audit record. The donor has no such path.
- The gate runs only when `enter_score` is called (death, player-util.c 313). The interrupt and retire paths are refused by name (score.c 299-304); no other end path was read (not read). The donor checks the taint once per run; a Frankendom award step runs per kill (assumed from the brief, not checked), so the taint check must run per award, not once per character.
- Donor inconsistency. NOSCORE_JUMPING (player.h 97) is set at cmd-wizard.c 1366 and cleared at generate.c 829, but enter_score never reads it. Do not copy the name and do not treat a jump as a taint without deciding it; whether the jump command requires the debug bit was not read (not read).
- Borg branch is compile-time conditional (score.c 293-298, player.h 98-100). Frankendom has no such build split; if we ever need a bot taint, it is a runtime flag.
- Frankendom has no leaderboard in this pass, so the record-time gate maps only to award time (row 18). This is not a parity claim about Angband's score table.
- The donor's only player feedback is a one-line message. Our suggestion, not a donor fact: show the tainted state visibly on the character rather than refusing the award silently.
- Clean-room only: GPL-2 or Angband licence (dual). The sketch copies no donor line.
