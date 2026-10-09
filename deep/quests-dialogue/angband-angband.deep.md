# angband-angband (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/angband-angband/src/player-quest.c | Licence: GPL-2 or the Angband licence (dual, file header lines 10-16; the Angband licence is educational / research / non-profit only; treated as clean-room only) | C | symbol quest_check / is_quest (input line 219 verified: `quest_check`; `is_quest` at 140)

## 1. Mechanism
- A kill-count quest tied to dungeon depth. Each quest record holds a name, the depth it applies to (level), a monster race, a max count (max_num) and a current count (cur_num). The quest list is parsed from the data file quest.txt (name, level, race, number; lines 36-135) into a global array, and `player_quests_reset` (157-171) copies name, level, race and max_num into each player's own array; the current count starts at zero (`mem_zalloc`, 163).
- quest_check (219-258) runs once for each dead monster. For every quest whose level equals the current depth and whose race equals the monster's race, cur_num goes up by one (227-229). When cur_num becomes equal to max_num, the quest's level is set to 0 (done) and a local `completed` flag is set (231-234). In the same loop, each quest whose level is still non-zero (after that update) adds one to `total` (238).
- If any quest completed, stairs are built once after the loop at the monster's grid (243). `build_quest_stairs` (188-214) first runs a loop that, while the grid is not changeable and is passable and not a door (as written, 193-195), scatters one square and tries again; then it pushes any objects off the grid, prints "A magical staircase appears...", sets the grid to a down staircase and flags a view update.
- If `total` is zero after a completion, the player is marked the winner, the title is redrawn, and three congratulation messages are shown (246-252). `quest_check` returns true when a quest completed, false otherwise.
- is_quest(player, level) (140-152) returns whether a depth is any open quest level (town, level 0, is never a quest).
- Inputs: the player's quest table, the monster race and grid, the current depth. Outputs: updated counts, stairs, win flag. Runs in the kill path, not on a tick.

## 2. Key functions
- quest_check (angband) | /mnt/frankendom-donors/angband-angband/src/player-quest.c | 219-258 | counts kills per quest, completes a quest at its max, builds stairs, and checks for the win.
- is_quest (angband) | /mnt/frankendom-donors/angband-angband/src/player-quest.c | 140-152 | tests whether a depth is an open quest level.
- player_quests_reset (angband) | /mnt/frankendom-donors/angband-angband/src/player-quest.c | 157-171 | copies the static quest table into the player's record.
- build_quest_stairs (angband) | /mnt/frankendom-donors/angband-angband/src/player-quest.c | 188-214 | places the reward staircase at the kill spot.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Counter per quest keyed on (location, target type), completes at a max | Depth as the location key, race as the target key (theirs, lines 227-228) |
| Completion closes the quest by zeroing its location | Zero as the done marker (theirs, line 232) |
| "All quests done" as the win condition | Total open count equal to zero (theirs, lines 238 and 246) |
| Reward placed at the kill location | Stairs down as the reward (theirs, line 210) |

## 4. TypeScript sketch
simplified: omits the data-file parse and per-player copy, the stairs placement and message, the win effects (title redraw, messages), and the return value. The sketch counts open quests after the loop; the donor counts them inside the loop as it goes, which gives the same total because a quest's level is updated before it is counted. The donor's `cur_num` keeps no cap other than the equality test; the sketch matches that.

```ts
// Licence: GPL-2 or Angband licence (angband-angband). CLEAN-ROOM: written from the mechanism description,
// no donor lines were translated.
interface Quest { name: string; depth: number; race: number; max: number; cur: number; }

function onKill(quests: Quest[], depth: number, race: number): { completed: boolean; allDone: boolean } {
  let completed = false;
  for (const q of quests) {
    if (q.depth === depth && q.race === race) {
      q.cur += 1;
      if (q.cur === q.max) {
        q.depth = 0;             // zero marks the quest done
        completed = true;
      }
    }
  }
  const open = quests.filter((q) => q.depth !== 0).length;
  return { completed, allDone: completed && open === 0 };
}

function isQuestDepth(quests: Quest[], depth: number): boolean {
  if (depth === 0) return false;  // the town is never a quest
  return quests.some((q) => q.depth === depth);
}
```

## 5. Lands in
- Frankendom target: `origins/server/quest-advance.ts` (server-side quest progress; it exists on the VPS snapshot /root/work-k7, not main, and only its header comment was read) fed by the server-verified kill record, not by `src/fight/`. A kill-count objective is a quest condition in the contracts' data (`origins/quests/journal.ts`).
- Parity-checklist row: 18 (loot roll and XP award; post-K item 3, rewards unified on the server) is the nearest row for a kill event. Feature-map section: Origins O2 quests (`docs/specs/origins/modernuo-quests.md` on the snapshot).
- Reuse tag: rewrite-from-idea (GPL-2 / non-profit Angband licence, so the mechanism only)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Kill counting runs in the game's own process on its own state. Frankendom's server-verified kills mean the count must be taken from the server kill record, never the client, and the reward written once to the ledger.
- Depth as a quest key is a dungeon-only concept. Frankendom zones are data, so a zone id (or an encounter id) is the equivalent key.
- The win check ends the game (246-252). Frankendom has no such end state; do not copy it.
- The count is per player and the match is on depth and race only; two players killing the same monster would each need their own count. A Frankendom kill credit follows the server's attacker record (MAX_ATTACKERS = 3), not whoever called the check.
- The quest list is loaded from a data file (quest.txt), which fits zones-as-data; the stairs reward is code. Frankendom rewards are data on the stage (granted once).
- Pit is a client only and has no quests.
- Licence is GPL-2 or the non-profit Angband licence, so the sketch is clean-room only.
- Not read: `quest.txt`, `player_quests_free`, `scatter`, and the kill path that calls `quest_check`.
