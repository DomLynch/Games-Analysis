# freeciv-freeciv (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/common/achievements.c` | Licence: GPL-2.0-or-later (COPYING: GNU GPL version 2, "either version 2, or (at your option) any later version" in the file headers) | C | symbol `achievement_check` / `achievement_plr`

Checked: Read in full: `common/achievements.c` (398 lines), the `struct achievement` in `common/achievements.h`, the achievement loop and culture victory in `server/srv_main.c` (end_turn at 1609; achievement loop 1686-1730; culture victory 591-620), `common/culture.c` 25-71, the achievement loader `server/ruleset/ruleload.c` 7496-7552 and the defaults in `server/ruleset/ruleload.h` 76-77, the data tables in `data/civ2civ3/game.ruleset` 517-589 and `data/granularity/game.ruleset` 465-472, and the hint file `data/granularity/script.lua` (22 lines, read in full). Callers: `achievement_plr` has one caller (`srv_main.c:1694`); `achievement_check` has one caller (`achievements.c:147`), both found by grep. Not read: the achievement type enum (only its definition site `fc_types.h:847` by grep), `fc_rand`, the `history_interest_pml` value in any ruleset, the `achievement_gained` signal payload (`common/scriptcore/luascript_signal.c`, `server/scripting/script_server.c`), `server/report.c` (achievement report), client display. Dialogue trees: none in this donor; the only dialogue-like code is the Lua hook in `data/granularity/script.lua`, which pays infrapoints on a city-built signal. Confidence: high on the claim mechanics and the defaults; medium on the statement that the win-check and the achievements interact (they share the same culture counter; the order between them within end_turn was read only as far as line 1730). camera_scope: not applicable.

Best transferable idea: A quest is a state predicate checked once per turn over the world, with a claim set per player so a repeatable reward is paid once; a world-first objective is a separate unique flag that the first qualifying player (random tie-break on the same turn) claims, and every reward lands in one history ledger.
Decision (proposed): adapt - the unique world-first flag and the claim set fit Frankendom's zones-as-data and one-ledger rules; adapt it to run on the server's verified events (kill counts, zone entry) instead of a turn sweep, and let zone data set unique/repeatable per objective. Reject the compounding history interest on the same ledger (it is progression, not a quest, and no Frankendom ruling asks for it).
Acceptance: In a zone with a world-first objective, when two players reach the server-verified threshold in the same tick, exactly one is recorded as the first holder and gets one ledger row; the other gets nothing (no second row, no "first" text); a repeatable objective pays each player once, not on every tick after the threshold.

## 1. Mechanism

- Data: each achievement is a table row with a type, a value, a `unique` flag, a `culture` reward and two messages (`data/civ2civ3/game.ruleset:517-589`). The loader reads `unique` with default TRUE (`ruleload.h:76`), `value` with default 1 (`ruleload.h:77`) and `culture` with default 0 (`ruleload.c:7520`). A repeatable achievement must have a consecutive-gainer message (`ruleload.c:7536-7541`).
- Where it runs. Once per turn, in `end_turn`, after disasters, as a loop over all achievements (`srv_main.c:1686-1694`). The comment says it is not inside a phase so simultaneous achievers get equal opportunity (`srv_main.c:1688-1690`).
- Per achievement, the check (`achievement_plr`, `achievements.c:141-178`). It loops over every player (`146`). If `achievement_check` is true for that player: a repeatable achievement adds its culture to that player's history at once and sets that player's bit in `achievers` (`148-150`). Every qualifier is collected into a list either way.
- The world-first race (`156-175`). If a first holder already exists, return nothing (`156-158`). Otherwise if anyone qualified, one qualifier is picked with `fc_rand` (`164`), stored as `first` (`166`), and, for a unique achievement only, gets the culture (`168-170`). Only that winner's bit is set in `achievers` (`174`). The other qualifiers in the same turn get nothing for a unique achievement.
- The per-player guard (`achievement_check`, `183-189`). It returns false if the achievement is unique and already has a first holder, or if this player already holds it. So a repeatable reward is paid once per player, and a unique one is never checked again after the race is decided.
- The tests (`achievement_check`, `191-335`). State reads, not events: spaceship launched (`193`); map known as a percent, where the max unknown tiles is `(total x (100 - value)) / 100`, rounded down, and the required known count is the rest (`210-211`); cultured nation, nation culture at or above value (`275`); killer, units killed at or above value (`330`); rich, gold at or above value (`332`); lucky, a random roll out of 10000 below value (`281`). The rest (cities, literacy, land ahoy, huts, metropolis, multicultural) are in the same switch.
- Messages and signals (`srv_main.c:1698-1728`). The first holder gets `first_msg` and an `achievement_gained` signal with a first flag (`1700-1708`). For a repeatable achievement, each other qualifier gets `cons_msg` and the same signal with first false (`1714-1726`). A unique loser gets no message at all.
- Culture, the ledger the rewards land in. A player's culture is `history` plus performance plus cities' culture (`common/culture.c:49-60`). History grows each turn by the nation's history effect plus interest on the stored history, in per mille (`culture.c:66-71`, `70`). So every achievement reward is a one-off addition to the same stored number that drives the culture victory.
- Culture victory, a second objective on the same ledger. Top culture must reach `culture_vic_points` and lead the second by `culture_vic_lead` percent (`srv_main.c:611-612`). Barbarians and dead players are skipped in that loop (`598`); the achievement loop does not skip them (`achievements.c:146` iterates all players; the alive test is not there).

## 2. Key functions

- `achievement_plr`, `/mnt/frankendom-donors/freeciv-freeciv/common/achievements.c` 141-178. The claim: repeatable payouts, the world-first race with a random tie-break, and the unique winner's reward.
- `achievement_check`, same file 183-340. The guard and the switch of state tests.
- The turn loop, `/mnt/frankendom-donors/freeciv-freeciv/server/srv_main.c` 1609 (end_turn) and 1692-1730 (per achievement: winner, messages, signals).
- Culture victory, same file 591-620.
- Culture ledger, `/mnt/frankendom-donors/freeciv-freeciv/common/culture.c` 49-71.
- Loader, `/mnt/frankendom-donors/freeciv-freeciv/server/ruleset/ruleload.c` 7496-7552 (fields, defaults, required message).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Once-per-turn sweep: each objective checked against state, not the event | One turn (theirs, srv_main.c:1692) |
| Claim set: a repeatable reward is added once per player, then the player is skipped | Set bit on claim (theirs, achievements.c:150); guard (theirs, 185-186) |
| World-first race: a unique objective has one holder; same-turn ties broken at random | `fc_rand` pick over qualifiers (theirs, achievements.c:164); loser gets nothing (mechanism, 168-175) |
| Reward into one history ledger, one number per player | Culture per achievement: spaceship 5000, entire map known 1000, land ahoy 100, literate 1000, multicultural 1000, metropolis 1000, cultured city 1000, cultured nation none (theirs, civ2civ3 game.ruleset:521, 530, 539, 548, 559, 568, 577; the cultured-nation block at 581-587 has no culture line, so it defaults to 0) |
| Threshold objectives on percent, count, size, or amount | Map known value 100 (theirs, civ2civ3 game.ruleset:529); land ahoy 2 (538); literate 100 (547); multicultural 2 (558); metropolis size 20 (567); cultured city 1000 (576); cultured nation 10000 (585) |
| Random chance objective, rolled per check | Lucky: roll out of 10000 (theirs, achievements.c:281); the table value is not read |
| Unique default | TRUE if the table omits the key (theirs, ruleload.h:76); civ2civ3 sets FALSE on every row; granularity sets TRUE on Master Explorer (theirs, granularity game.ruleset:469, value 33 at 468) |

## 4. TypeScript sketch

simplified: The sketch keeps the claim set, the unique world-first race with a random tie-break, the one history ledger, and the once-per-turn check. It omits the lucky roll, the other state tests (map known, killer, rich, metropolis), the messages and signals, the culture victory, and the donor's lack of an alive test (the donor does not exclude dead or barbarian players here; the sketch does not add that test either). It uses a seeded generator where the donor uses `fc_rand`.

```ts
// Licence: GPL-2.0-or-later (donor COPYING, version 2). Clean-room shape written from the mechanism, not a translation of the C.
interface Player {
  id: string;
  history: number; // the player's culture ledger (accumulated rewards)
}

interface Achievement {
  id: string;
  unique: boolean;      // true: one world-first winner; false: every player who qualifies
  reward: number;       // culture added to the history ledger on claim
  first: string | null; // unique only: the player who won the race
  claimed: Set<string>; // repeat guard: players who already hold it
  test: (p: Player) => boolean; // reads state; evaluated once per turn, not on the event
}

// One check for one achievement, run once per turn. Returns the world-first winner, if this turn decided one.
function checkAchievement(a: Achievement, players: Player[], rng: () => number): Player | null {
  const claimers: Player[] = [];
  for (const p of players) {
    if ((a.unique && a.first !== null) || a.claimed.has(p.id)) continue;
    if (a.test(p)) claimers.push(p);
  }

  if (!a.unique) {
    for (const p of claimers) {
      p.history += a.reward;
      a.claimed.add(p.id);
    }
    return null;
  }

  if (a.first !== null || claimers.length === 0) return null;
  // Simultaneous qualifiers: one is picked at random as the race winner; the rest get nothing.
  const winner = claimers[Math.floor(rng() * claimers.length)];
  a.first = winner.id;
  a.claimed.add(winner.id);
  winner.history += a.reward;
  return winner;
}

// Example wiring: a repeatable objective and a world-first objective, checked for two turns.
let seed = 7;
const rng = (): number => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

const players: Player[] = [
  { id: "A", history: 0 },
  { id: "B", history: 0 },
];
const mapKnown: Achievement = {
  id: "map_known",
  unique: false,
  reward: 1000,
  first: null,
  claimed: new Set<string>(),
  test: (p) => p.id === "A",
};
const firstLaunch: Achievement = {
  id: "spaceship",
  unique: true,
  reward: 5000,
  first: null,
  claimed: new Set<string>(),
  test: () => true,
};

for (let turn = 0; turn < 2; turn++) {
  checkAchievement(mapKnown, players, rng);
  checkAchievement(firstLaunch, players, rng);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/QD014-freeciv-freeciv-achievements.ts`) exited 0.

## 5. Lands in

- TARGET `origins/server/achievements.ts` (new): the claim-once objective check, run on server-verified events (kill counts, zone entry) and not on a turn sweep, with the world-first flag per zone objective and the reward paid through the single ledger write.
- Parity-checklist row 18 (loot roll and XP award). The culture reward maps to XP; the world-first flag maps to a first-clear award.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, so the sketch is written from the mechanism and not translated from the C).
- Brief rule served: one ledger (every reward is one write into one owner); zones as data (the objective, its unique flag and its reward are zone fields); server-verified kills (the test reads the server's counters).

## 6. Gaps and risks

- Turn sweep vs events. The donor checks once per turn, so a player can meet a condition and lose the race to a player who was only checked later the same turn. Frankendom kills are server-verified events; check on the event and make the tie-break rule explicit (the donor's tie-break is random; Frankendom should use a seeded server draw).
- The unique flag defaults to TRUE in the loader (`ruleload.h:76`). A zone row that forgets the key becomes a world-first objective silently. fix: Frankendom's zone schema must require the flag and fail on a missing key.
- One achievement has no culture (civ2civ3 `cultured_nation` has no culture line; 0 by default, `ruleload.c:7520`). It may be intentional or a missed row; the table does not say. Frankendom should require the reward field on every objective.
- No alive test in the achievement loop (`achievements.c:146`), though the culture victory loop has one (`srv_main.c:598`). Whether dead players can still earn achievements was not checked. Frankendom should define this on the zone objective, not inherit it.
- Shared ledger with interest. The history number compounds by `history_interest_pml` per mille each turn (`culture.c:70`). A quest reward added to a compounding number pays more the later it is earned. Frankendom should not add interest to quest rewards.
- Messages: the donor sends a different message to the winner and to later qualifiers, and a unique loser gets nothing (`srv_main.c:1700-1726`). The loser's silence is a design point; Frankendom's player-facing text should be specified per objective.
- The scripting hook is thin. The only script in this donor is the Lua callback on `city_built` that pays five infrapoints (`data/granularity/script.lua:18-22`). The `achievement_gained` signal exists (`srv_main.c:1708`, `1723`), but its payload and what a script may do with it were not read.
- Not transferable as is: the culture victory (a win condition over a lead percentage) could be a Frankendom zone-end rule later; it is not part of this cell.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: one ledger; zones as data; server-verified kills (Frankendom rulings)
