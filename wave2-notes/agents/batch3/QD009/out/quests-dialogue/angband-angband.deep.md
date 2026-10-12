# angband-angband (quests-dialogue, cell 2)

Donor: /mnt/frankendom-donors/angband-angband | Licence: dual, "either a) the GNU General Public License ... version 2, or b) the Angband licence" (read in src/player-quest.c lines 7-16; the Angband licence option is non-profit, educational and research use) | C | symbol quest_check
Checked: opened src/player-quest.c (all 258 lines), lib/gamedata/quest.txt (all), src/mon-util.c 952-1010 (monster_death, call at 1008), src/cmd-cave.c 110-130, src/player-util.c 40-90, src/generate.c 836-848, src/trap.c 300-315, src/effect-handler-general.c 1100-1125 and 2895-2910. NOT read: scatter() in src/cave.c:551 (used by the stairs placement loop), the other monster_death callers (grep only: src/main-stats.c:545, src/mon-util.c:1111, src/mon-util.c:1229, src/project-mon.c:1076), the town (depth 0) death path, and the savefile code (rd_quests/wr_quests). Confidence: high on the kill -> complete -> stairs -> win order and the two quest entries; medium on exactly where the stairs land when the death tile fails the test (scatter not read). The donor has only two fixed quests, so this is a small mechanism; it is STRONG because the whole mechanism (data, count, gate, reward, final win) is real and readable, not because it is large.

## 1. Mechanism
The donor has a kill-count quest. Each quest is a row of data: a name, a level (the dungeon depth it counts on), a monster race, and a number of kills. At birth the fixed table is copied into the player's own quest list, with the kill counter at zero (player_quests_reset, player-quest.c:157-171, copies name, level, race and max_num in the loop at 165-170; cur_num stays zero from the allocation). A kill of the quest race on the quest depth adds one to the counter. When the counter equals the target, the quest's level is set to 0, which closes it. In the dungeon the match then cannot fire again, because it needs a dungeon depth and the closed level is 0. The closing kill drops one down staircase at the death tile, or at a nearby passable tile if the death tile fails the donor's test (scatter loop), with a message, so the player can leave through it. Quest levels are also fenced: the level generator forces the classic profile on them, trapdoor traps are skipped on them, a teleport-level effect will not force a player downward onto a quest level it cannot leave (effect-handler-general.c:2899-2900), and a stair-skip jump stops at the first quest level in its path. When the last open quest closes, the player is flagged as the winner.

The donor's own file header says the design is limited: lib/gamedata/quest.txt:3-8 says the table is "the fixed (and only) quests" and that the system "could be improved". I treat that as the author's admission, not as a flaw in the reading.

## 2. Key functions
- `quest_check(p, m)` (src/player-quest.c:219-258): called once per dead monster. Loops the quest array in order. For each quest it tests depth and race, increments cur_num, and on equality closes the quest. Then counts the quests still open. If any closed, it builds the staircase at the monster's death grid. If none are open, it sets the winner flag.
- `build_quest_stairs(p, grid)` (src/player-quest.c:188-212): moves the grid off a bad tile with scatter() in a loop (lines 192-199), pushes objects off the tile, prints "A magical staircase appears...", sets a down staircase (FEAT_MORE), and asks for a view and monster redraw. The exact loop test is not interpreted here (scatter not read).
- `is_quest(p, level)` (src/player-quest.c:140-152): returns true if any player quest row has that level. Used by the gating call sites below.
- `dungeon_get_next_level` (src/player-util.c:54-74): computes a stair-skip target, then returns the first quest level between the current level and the target (lines 68-71).
- `monster_death` (src/mon-util.c:952): calls quest_check at line 1008, after drops are rolled. The return value of quest_check is ignored there.

## 3. Numbers vs mechanism
- Data (lib/gamedata/quest.txt): Sauron, level 99, number 1 (race line 12); Morgoth, level 100, number 1 (race line 17). Two entries, so z_info->quest_max is 2 (the parser counts entries at src/player-quest.c:98).
- The kill counter starts at 0 and the completion test is an equality test (`cur_num == max_num`, player-quest.c:231). With number 1 the first kill completes.
- The win test is `total == 0` after the loop (player-quest.c:246), where total counts rows whose level is non-zero. The count is taken per row inside the same loop, so a row is only counted as open at its own index; a closure at a later index cannot stale it.
- The stairs have no numbers: one down staircase per completion.
- No XP, loot or currency is awarded by this code. The reward is access (a staircase) and, for the last quest, the win.

Defects found while reading (keep the idea; fix in any port):
- A quest with number 0 can never complete: the counter reaches 1 on the first matching kill and the equality test never fires. The parser does not reject 0 (parse_quest_number, player-quest.c:68-74 reads it with no check). fix: reject number < 1 at load.
- The "already closed" test is implicit: a closed quest has level 0, and the match `cave->depth == level` only fails because dungeon depths are never 0. In the town (depth 0) a closed quest of the same race would match and bump its counter. It cannot re-complete (equality test), so the effect is a counter that drifts. I did not check whether any town monster has these races, and I did not read the town death path. fix: an explicit open flag, as in the sketch.
- The stairs placement loop depends on scatter(), which was not read. (Not a defect claim; a gap in my reading.)

## 4. TypeScript sketch
Clean-room: written from the mechanism above, not translated from the donor.

simplified: omits the stairs/feature placement (replaced by returning the death tile), the scatter() fallback for blocked tiles, the savefile round trip and the UI message; keeps the donor's order (match, count, close, count open, reward, win) and adds an explicit open flag where the donor relies on level 0 never matching a depth.
```ts
// Kill-count quest gate keyed on (zone, enemy type), modelled on Angband quest_check.
type Pos = { x: number; y: number };

export interface QuestDef {
  name: string;
  zone: number;      // zone level the quest counts in (data)
  race: string;      // enemy type id (data)
  number: number;    // kills needed (data); must be >= 1
}

export interface QuestState extends QuestDef {
  cur: number;       // kills so far
  open: boolean;     // false once completed
}

export interface KillOutcome {
  completed: boolean;      // at least one quest completed on this kill
  unlockAt?: Pos;          // where the gate appears (the death tile)
  wonAll: boolean;         // every quest is now closed
}

export function newQuestState(defs: QuestDef[]): QuestState[] {
  return defs.map((d) => ({ ...d, cur: 0, open: true }));
}

// Called once per server-verified enemy death, after drops are rolled.
export function questCheck(
  quests: QuestState[],
  zone: number,
  race: string,
  deathTile: Pos,
): KillOutcome {
  let completed = false;
  for (const q of quests) {
    // simplified: donor relies on level 0 never matching a dungeon depth;
    // this sketch adds an explicit open check so a closed quest cannot be counted again.
    if (q.open && q.zone === zone && q.race === race) {
      q.cur += 1;
      if (q.cur === q.number) {
        q.open = false;
        completed = true;
      }
    }
  }
  const stillOpen = quests.filter((q) => q.open).length;
  return {
    completed,
    unlockAt: completed ? deathTile : undefined,
    wonAll: quests.length > 0 && stillOpen === 0,
  };
}

export {};
```

Typecheck: copied to the VPS /tmp/QD009-angband-quest-progress.ts and `npx -p typescript tsc --noEmit --strict --target es2020` exited 0.

## 5. Lands in
Target: src/fight/quest-progress.ts (proposed, new module; the kill event comes from the engine). Parity row 18 (loot roll and XP award), sub-line: the quest check runs after the drop roll on a server-verified kill. Quest rows are zone data (name, zone, race, number); the gate is an engine rule. Acceptance is in the JSON sidecar.

## 6. Gaps and risks
- Credit rule: the donor credits the single killer. Frankendom fights can have up to MAX_ATTACKERS = 3 attackers on one enemy. The port must choose who gets the kill count (killer only, or every attacker in the hate list) and that choice belongs in the engine, not the client.
- One ledger: the donor has no currency or XP for quests, only access. Any reward we add must go through the one ledger and be server-verified; the donor does not show how.
- Server-verified kills: the donor counts a kill from the local game loop. In Frankendom the count must come from the server's kill event, after the server's loot roll, so a client cannot claim a kill.
- Zones as data: the donor's quest table is global and two rows long. Frankendom needs per-zone rows and a rule for a repeat kill after completion (the donor closes the quest for good).
- Pit as client: the Pit (fixed arena) has no depth, so the zone-level key does not apply there; quest progress must be a world-only path.
- No dialogue, no quest log, no objective text: the donor shows only a staircase and a message. Those are client work and not in this donor.

Best transferable idea: a quest is a data row (zone, enemy type, kill count) that a server-verified kill advances, closing it opens a gate at the death tile, and the last closed quest sets a won flag.
Decision (proposed): adapt - keep the kill-count gate shape with per-zone rows in zone data and the count taken from the server kill event after the loot roll; drop the donor's single-killer credit and the implicit closed test (use an explicit open flag, reject number 0 at load). Keep the gate-as-reward (a world change); any currency or XP reward must go through the one ledger, which the donor does not have.
Acceptance: a server test kills 2 of race X in zone 3 with number 2: the quest completes on the second kill only, a gate appears at that enemy's tile, a kill in zone 4 or of another race leaves progress unchanged, and a kill after completion adds nothing.

Reuse tag: donor game first (Angband quest_check, GPL-or-Angband dual licence, clean-room shape only); no Frankendom reuse found for quest progress in this pass.
Brief rule served: judge the idea (addendum: "Simple is not weak"); a real mechanism (kill count keyed on zone and race, closing gate, final win), read end to end in the core, with the data table opened.
