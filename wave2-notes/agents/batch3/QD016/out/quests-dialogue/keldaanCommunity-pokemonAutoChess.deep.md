# keldaanCommunity-pokemonAutoChess (quests-dialogue, cell 3)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/expeditions.ts` (board and mission data), `app/models/expeditions.ts` (completion and reward), `app/rooms/game-room.ts` (call site), `app/models/colyseus-models/player.ts` (per-game stats) | Licence: GPL-3.0 (`LICENSE` line 2: "Version 3, 29 June 2007") | TypeScript | symbol `getPlayerExpeditions`, `getExpeditionTier`, `getExpeditionData`, `updatePlayerExpeditionsAfterGame`, `checkExpeditionCompletion`

Checked: Read in full: `core/expeditions.ts` 37-60 and 58-100 (tier), 166-352 (mission data for all four types); `models/expeditions.ts` 1-108 (settle pass and completion predicates); `config/game/expeditions.ts` (12 lines; E = 250 at line 6, other ranks in the same object); `types/enum/Expedition.ts` 26 and the mission types. Call site read: `rooms/game-room.ts` 1150-1190. Per-game stats: `colyseus-models/player.ts` 169 and 1088 (running maxima). Helper: `utils/number.ts` 5-8. Candidates opened for the quests topic: `services/cronjobs.ts` (grep found no expedition code there), `components/*` dialog file (`public/src/game/components/game-dialog.tsx`, the list hint: 46 lines, a DOM box with portrait, title and text, no quest logic). Not read: the rescue, explore and delivery pools in full (only the lookup lines), the events menu UI, the `giveUserExp` body, `updatePlayerTitlesAfterGame`, `gameStats` reset between games (where the schema is created per game is not read), the notification service. Confidence: high on the board, the settle pass and the completion checks (read end to end); the per-game reset of gameStats is not read, so "per game" rests on the schema being on the in-game player. Note the donor's own comment on the board hash: "this is a placeholder implementation and should be replaced with actual logic" (line 41).

Best transferable idea: A three-slot bounty board that is recomputed, not stored, from (player id hash, completed count), with each bounty judged at game end from that game's own maxima and the count as the only stored number.
Decision (proposed): adapt - take the stateless board, the per-slot rank from the count and the per-game maxima check; replace the placeholder hash with a seeded hash, keep the count separate from the slot level, and make the event window a zone setting, not a constant. Reason: Frankendom wants server-verified side goals with one stored number per player, and this donor already judges goals from server match records.
Acceptance: A player sees three bounties; they change only after one completes. A server test asserts that the same (uid, count) gives the same three bounties, that a battle bounty is judged from the match's own maxima at game end, and that slot 0's rank rises only with the count.

## 1. Mechanism

Board. `getPlayerExpeditions` (37) makes the three bounties for a player with no stored list. The hash is the sum of the uid's character codes plus `user.eventPoints` (43-45), which is the completed count. The four types are listed twice (47), and a slice of three starts at `hash % 4` (48). Because the list is four types doubled and the window is three long, the three types on any board are always distinct. Each slot's rank comes from `getExpeditionTier(eventPoints, slot)` (50): slot 0 steps at 3, 6, 10, 15, 20 (64-); slot 1 at 5, 10, 15, 20, 30 (80-); slot 2 at 6, 12, 18, 25 (97-). Each slot climbs on its own schedule: slot 0 reaches S at a count of 20, slot 1 at 30, and slot 2 tops out at A (its last step is 25). All three ranks rise with the count, so one completion moves the whole board, not only the finished slot.

Mission data (`getExpeditionData`, 166). The details are derived from the same hash and rank: rescue picks a pokemon from a rank pool (196); exploration picks a region (202) and a synergy and a level, where the level is the synergy threshold at index min(len-1, rankIndex); battle picks a stat by hash (220) and an amount from a rank-by-stat table (310); delivery picks an item from a rank pool by hash (341) and a quantity from a rank table.

Completion, checked at game end (`models/expeditions.ts`). For each of the three bounties, `checkExpeditionCompletion` reads the player's facts from that game: rescue needs the pokemon on the board (schema values); exploration needs the region in `player.regions` and the synergy level at or above the target (78); battle needs `player.gameStats[stat] >= amount` (87), where `gameStats` holds running maxima during the game (`player.ts` 1088 uses `Math.max`); delivery counts the item on board and bench (100).

Settle pass (`updatePlayerExpeditionsAfterGame`, 19). The board is read once (23). For each bounty that passes: `usr.eventPoints++` (28), the max counter is raised, a notification is sent, the XP for the rank is paid through `giveUserExp` (31-37), and a title is added for the type (rank S adds one more). Because the board is recomputed from the new count, the next board is new.

Gate and call site (`game-room.ts`). The pass runs only when the current game event is `GameEvent.EXPEDITIONS`, the player is eligible for XP, and the room is not a custom lobby (1164), and it is called at 1168 after the game's results are written.

## 2. Key functions

- `getPlayerExpeditions`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/expeditions.ts` 37-56. Board from uid hash and count.
- `getExpeditionTier`: same file, 58-~120. Per-slot rank thresholds.
- `getExpeditionData`: same file, 166-352. Mission details by type, rank and hash.
- `updatePlayerExpeditionsAfterGame`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/models/expeditions.ts` 19-40. Settle pass.
- `checkExpeditionCompletion`: same file, 60-108. Per-type completion predicate.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Board of three slots, recomputed from a seed and a counter | Three slots (theirs, `core/expeditions.ts` 48 `+ 3`); seed = uid char-code sum + count (theirs, 44-45, a placeholder per line 41) |
| Four types doubled, window of three never repeats a type | Doubled list (theirs, 47) |
| Rank per slot from the counter, each slot with its own thresholds | Slot 0: 3, 6, 10, 15, 20 (theirs, 64-); slot 1: 5, 10, 15, 20, 30 (theirs, 80-); slot 2: 6, 12, 18, 25 (theirs, 97-) |
| Clamp an index to the list length | `max(n)(x)` is Math.min(n, x) (theirs, `utils/number.ts` 5-8; the name is a trap) |
| Per-game maxima decide a stat goal | Running maxima per stat (theirs, `player.ts` 1088) |
| XP per rank | E 250, D 300, C 400, B 500, A 750, S 1000 (theirs, `config/game/expeditions.ts` 6 for E, same object for the rest) |
| Count moves the board by one | +1 per completed bounty (theirs, `models/expeditions.ts` 28) |
| Battle amount per rank and stat | Table at `core/expeditions.ts` 225- (E: win streak 5, damage stats 500, HP 400; S: win streak 10, damage stats 2000, HP 1500) |

## 4. TypeScript sketch

simplified: the sketch keeps the stateless board (three slots from a seed and a count), the rank per slot from thresholds on the count, the per-type completion check against the game's facts, and one settle pass that reads the board once and then moves the count. It omits the donor's pools (which pokemon, region, item or stat is picked by hash: the caller passes the target through `targetFor`), the synergy threshold table, the titles, the notifications, the database save, the event-window gate and the XP grant itself (the sketch returns the XP list). It takes the seed as a number, where the donor sums the uid character codes (44). The order is the donor's: the board is read once before the loop, and each passing bounty adds one to the count, so a later bounty in the same pass still sees the old board.

```ts
// Donor licence: GPL-3.0 (LICENSE, Version 3). Clean-room: written from the described mechanism only, not translated.
type MissionType = "rescue" | "explore" | "battle" | "deliver";
type Rank = "E" | "D" | "C" | "B" | "A" | "S";

interface Mission {
  type: MissionType;
  rank: Rank;
  hash: number;
}

// Per-game facts for the match that just ended (the donor reads the in-game maxima).
interface MatchFacts {
  maxes: Record<string, number>;
  pokemonOnBoard: Set<string>;
  itemCount: Record<string, number>;
  regions: Set<string>;
  synergyLevels: Record<string, number>;
}

// Zone-data target for one mission (the donor picks these from hash-indexed pools).
interface Target {
  stat?: string;
  amount?: number;
  item?: string;
  quantity?: number;
  pokemon?: string;
  region?: string;
  synergy?: string;
  level?: number;
}

const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S"];
const TYPES: MissionType[] = ["rescue", "explore", "battle", "deliver"];
const XP: Record<Rank, number> = { E: 250, D: 300, C: 400, B: 500, A: 750, S: 1000 };

// Thresholds on the completed count, one list per slot index (slot 2 reuses the last list).
const TIER_STEPS: number[][] = [
  [3, 6, 10, 15, 20],
  [5, 10, 15, 20, 30],
  [6, 12, 18, 25],
];

function rankFor(completed: number, slot: number): Rank {
  const steps = TIER_STEPS[Math.min(slot, TIER_STEPS.length - 1)];
  let idx = 0;
  for (const s of steps) {
    if (completed >= s) idx++;
  }
  return RANKS[Math.min(idx, RANKS.length - 1)];
}

// Stateless board: three missions recomputed from (uid hash, completed count); only the count is stored.
export function board(uidHash: number, completed: number): Mission[] {
  const hash = uidHash + completed;
  const doubled: MissionType[] = [...TYPES, ...TYPES];
  const start = hash % TYPES.length;
  const out: Mission[] = [];
  for (let i = 0; i < 3; i++) {
    out.push({ type: doubled[start + i], rank: rankFor(completed, i), hash });
  }
  return out;
}

export function checkMission(m: Mission, f: MatchFacts, t: Target): boolean {
  switch (m.type) {
    case "rescue":
      return f.pokemonOnBoard.has(t.pokemon ?? "");
    case "explore":
      return (
        f.regions.has(t.region ?? "") &&
        (f.synergyLevels[t.synergy ?? ""] ?? 0) >= (t.level ?? Infinity)
      );
    case "battle":
      return (f.maxes[t.stat ?? ""] ?? 0) >= (t.amount ?? Infinity);
    case "deliver":
      return (f.itemCount[t.item ?? ""] ?? 0) >= (t.quantity ?? Infinity);
  }
}

// One settle pass after a game: the board is read once, then each mission is checked.
export function settle(
  uidHash: number,
  completedBefore: number,
  facts: MatchFacts,
  targetFor: (m: Mission) => Target,
): { completed: number; xp: number[] } {
  let completed = completedBefore;
  const xp: number[] = [];
  for (const m of board(uidHash, completedBefore)) {
    if (checkMission(m, facts, targetFor(m))) {
      completed += 1; // the count moves the next board
      xp.push(XP[m.rank]);
    }
  }
  return { completed, xp };
}

export {};
```

Typecheck: `tsc 5.6.3 --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/QD016-board-pokemonautochess.ts`).

## 5. Lands in

- TARGET `origins/server/bounty-board.ts` (new): the stateless three-slot board and the settle pass, run by the server after each finished game; the client only shows the three bounties and the rank. Parity-checklist row 18 (loot roll and XP award: the XP for a completed bounty by rank goes through the one ledger). Row 18 is the reward side; the board itself has no checklist row, so this cites 18 as the closest.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one ledger: one stored count per player; the server verifies each bounty from the match record)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- The donor's own board hash is a placeholder (line 41). Its seed is the sum of uid character codes, so anagram uids get the same board and the spread is poor. Fix: a seeded hash of the uid and count (done as a parameter in the sketch; the hash function itself is not in the sketch).
- The count is used twice: as the board seed and as the slot level. Completing one easy bounty raises the rank of all three slots. Fix: keep a separate level or a per-slot tier, so one completion does not move the whole board's difficulty.
- `max(n)(x)` in the donor is a cap (Math.min), not a maximum. The name is a trap for anyone who reads it as max. Fix: rename to a clamp in Frankendom.
- Battle goals use per-game maxima from the server record, which is right for Frankendom's server-verified kills. But a goal like "reach 400 HP" in one game can be met by a stat that is a maximum, not a final value; Frankendom must say which one each bounty means.
- The donor gates the whole pass on the current event (1164). Frankendom should make the window a zone setting, not a constant in the server.
- Titles, notifications and XP go to separate systems in the donor; Frankendom must keep the XP in the one ledger (row 18), not in a second store.
- Pools (which pokemon, region, item, stat) come from hash indexes into long lists. Frankendom should write the pool as zone data; the hash only picks an index.
- `updatePlayerExpeditionsAfterGame` reads the board once before the loop, so a bounty that becomes passable only after another bounty's count bump is not checked in the same pass. That is the intended order; Frankendom must test it.
- Not read: the rescue, explore and delivery pools in full, `giveUserExp`, the gameStats reset between games.
