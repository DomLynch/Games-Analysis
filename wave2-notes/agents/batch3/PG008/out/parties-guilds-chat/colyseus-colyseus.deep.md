# colyseus-colyseus (parties-guilds-chat, cell 2)

Donor: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/rooms/QueueRoom.ts` | Licence: MIT (root LICENSE line 5 "Permission is hereby granted, free of charge, to any person obtaining a copy"; packages/core/package.json line 32 `"license": "MIT",`) | TypeScript | symbol `QueueRoom.reassignMatchGroups`

Checked: QueueRoom.ts read in full (442 lines). Tick driver read: `Room.ts` `setTimestep` (936) and its `setInterval` (950). Callers: `reassignMatchGroups` is called only from the `setTimestep` line in this file (205); the class is exported at `packages/core/src/index.ts` line 92; a grep of `packages/` finds no test that exercises QueueRoom or `maxTeamSize`. Also skimmed for other social code (headers only, no numbers used): `rooms/LobbyRoom.ts`, `matchmaker/Lobby.ts`, `utils/UserSessionIndex.ts`. Confidence: high on order of operations and constants (all receipted). The team-mode averaging error and the lone-team case are hand traces from lines 297, 302, 310, 314 and 340-341; not executed. Not camera.

Best transferable idea: a fixed 1 Hz queue cycle that re-sorts waiting players by rank, widens the accepted rank gap as they wait, and forces them into a group after a set number of cycles, with the wait counter kept on each queued player.
Decision (proposed): adapt - keep the wait-based widening and the cycle re-sort; reject the client-supplied rank and team id (join options) and the team-mode averaging as written.
Acceptance: a player queued for a duel sees the queue count change at most once a second and is matched or released within about 16 s; a server test sends a join message with a made-up rank and asserts the server ignores it and uses the profile rank.

## 1. Mechanism

- A client joins a queue room with options. The room takes `rank` and `teamId` straight from the join options (`onJoin`, lines 208-212) and stores the client with `currentCycle = 0` (`addToQueue`, 216-219). The client gets a `clients` message with 1 (223).
- The matching loop is a timer, not the game frame. `onCreate` calls `setTimestep(() => this.reassignMatchGroups(), this.cycleTickInterval)` (205) with `cycleTickInterval = 1000` (143). `setTimestep` starts a `setInterval` at that delay (Room.ts 936-950). So one matching pass runs per second at defaults.
- Each pass rebuilds everything from scratch (`reassignMatchGroups`, 232-266):
  1. clear the group lists (234-235);
  2. keep only queued clients that have queue data and are not already in a ready group (237-246);
  3. sort them by rank ascending (247-252);
  4. call `redistributeTeams` when `maxTeamSize` is set (258), otherwise `redistributeClients` (261);
  5. `evaluateHighPriorityGroups` (264), then `processGroupsReady` (265).
- `redistributeClients` (317-371) walks the sorted list once. For each client:
  - it reads the cycle count before adding one (325), so the thresholds below compare the count from before this pass;
  - if the open group is non-empty (its average is above 0) and the compare test fails and the client is not high priority, it closes the open group and opens a new one (327-334);
  - it adds the client and updates the group's running sum and average (336-341);
  - when the group reaches `maxPlayers` it is marked ready and a new group is opened (344-349);
  - otherwise, if the pre-increment count is at least `maxWaitingCycles` and `allowIncompleteGroups` is set, the open group goes on `highPriorityGroups` (351-357);
  - otherwise, if the count is at least `maxWaitingCyclesForPriority`, the client's `highPriority` flag is set (360-367), and it is never cleared in this file.
- The compare test (`DEFAULT_COMPARE`, 125-130): gap = |client rank - group average| (126); accepted when gap < 10 or gap / average <= 2 (127-129). The rank window is wide; see section 6.
- `evaluateHighPriorityGroups` (373-384): an incomplete group on the high-priority list becomes ready only when every member has `currentCycle > 1` (380). New arrivals therefore get one more pass before a bot-filled group is released.
- `processGroupsReady` (386-441): for each ready group, `onGroupReady` creates the match room (395), `reserveMultipleSeatsFor` reserves seats (401), and each client gets a `seat` message (414). If any step throws, every client leaves with code 1011 (422). For groups that are not ready, each client gets a `clients` message with the group size, only when that number changes (427-437).
- Timeline at defaults (one pass per tick, counted from the first pass after joining): the priority flag is set on pass 11 (about 11 s; the check sees 10 earlier passes), and an incomplete group can be released on about pass 16 (about 16 s; the check sees 15 earlier passes, plus one more pass for the newer members).

## 2. Key functions

- `reassignMatchGroups`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/rooms/QueueRoom.ts` 232-266. The whole tick: clear, filter, sort by rank, group, evaluate, process.
- `redistributeClients`: same file 317-371. Greedy grouping in rank order against the running group average; ready at `maxPlayers`; the two wait thresholds.
- `redistributeTeams`: same file 268-315. Team mode, chosen when `maxTeamSize` is set. Read in full, but its averaging is wrong (section 6).
- `DEFAULT_COMPARE`: same file 125-130. The default compatibility test.
- `evaluateHighPriorityGroups`: same file 373-384. Releases an incomplete high-priority group once its members have had one more pass.
- `processGroupsReady`: same file 386-441. Creates the match room, reserves seats, sends `seat` or the queue count, and fails the group with 1011.
- Tick driver: `setTimestep`, `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` 936-950 (read to the `setInterval` call only).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sort waiting players by rank, then fill groups in that order, closing a group when the next player is incompatible with its average | Group size 4 (`maxPlayers = 4;`, line 133) |
| Compatibility against the running group average, not each member | Accepted gap: under 10 or up to 2x the average (lines 126-129) |
| Wait counter on each queued player, +1 per pass; threshold forces the player in | Force after 10 passes (line 138); incomplete release after 15 passes (line 137), only when `allowIncompleteGroups` is set |
| Fixed-rate matching loop separate from the game frame | 1000 ms (line 143) |
| Incomplete group waits one more pass before release | Members must have count > 1 (line 380) |
| Team mode: teams kept together, teams fill groups | Averaging is wrong as written (lines 297, 302, 340-341); do not port |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's shape (rank-sorted greedy grouping against the group average, forced entry after a wait, ready at group size, one release rule for incomplete groups). It changes four things: (a) a party is always one block and is never split across groups (the donor splits teams by `maxTeamSize`); (b) the average is taken from the members actually in the group, which fixes the team-mode error; (c) wait counts go up once per cycle before grouping, and the force flag is set at the end of the cycle (the donor sets it during the pass), so the sketch's force threshold falls one pass earlier than the donor's; (d) an empty group is handled explicitly instead of the donor's `averageRank > 0` test. It omits the room creation and seat reservation, the confirm counter, the queue-count messages, the bot filling, the 1011 failure path, and the `maxTeamSize` split. Rank and party id are inputs here; the donor reads them from the join message. Typechecked with `tsc --strict` (no run).

```ts
// Licence: MIT (donor). Shape adapted and rewritten from the mechanism; not a line translation.
export interface QueuedPlayer {
  id: string;             // server-issued session id
  rank: number;           // read from the server profile, never from the join message
  partyId?: string;       // read from the server party record, never from the join message
  waitedCycles: number;   // +1 on every cycle spent in the queue
  highPriority: boolean;  // sticky once waitedCycles reaches widenAfter
}

export interface QueueRules {
  groupSize: number;       // players per match (donor default 4)
  widenAfter: number;      // cycles before a player may be forced into a group (donor 10)
  giveUpAfter: number;     // cycles before an incomplete group may be released (donor 15)
  allowIncomplete: boolean;
  rankAbs: number;         // rank gap that is always compatible (donor 10)
  rankRatio: number;       // gap allowed as a multiple of the group average (donor 2)
}

export interface Block { members: QueuedPlayer[]; }     // a solo player or a whole party
export interface MatchGroup { members: QueuedPlayer[]; sum: number; ready: boolean; }

function blockAverage(b: Block): number {
  return b.members.reduce((s, p) => s + p.rank, 0) / b.members.length;
}

function groupAverage(g: MatchGroup): number {
  return g.members.length === 0 ? 0 : g.sum / g.members.length;
}

// Compatibility is tested against the average of the ranks actually in the group.
function compatible(b: Block, g: MatchGroup, r: QueueRules): boolean {
  if (g.members.length === 0) return true;
  const avg = groupAverage(g);
  const gap = Math.abs(blockAverage(b) - avg);
  return gap < r.rankAbs || gap <= r.rankRatio * avg;
}

// A party is one block, so it is never split across groups.
function toBlocks(queue: QueuedPlayer[]): Block[] {
  const byParty = new Map<string, Block>();
  const out: Block[] = [];
  for (const p of queue) {
    if (p.partyId === undefined) { out.push({ members: [p] }); continue; }
    let b = byParty.get(p.partyId);
    if (b === undefined) { b = { members: [] }; byParty.set(p.partyId, b); out.push(b); }
    b.members.push(p);
  }
  return out;
}

// One cycle, called on a fixed step (donor: 1000 ms). The caller removes ready players from the queue.
export function matchCycle(queue: QueuedPlayer[], r: QueueRules): MatchGroup[] {
  for (const p of queue) p.waitedCycles += 1;
  const sorted = toBlocks(queue).sort((a, b) => blockAverage(a) - blockAverage(b));

  const groups: MatchGroup[] = [];
  let cur: MatchGroup = { members: [], sum: 0, ready: false };
  for (const b of sorted) {
    if (b.members.length > r.groupSize) continue; // oversize party waits in the queue
    const forced = b.members.some((p) => p.highPriority);
    const fits = cur.members.length + b.members.length <= r.groupSize;
    if (cur.members.length > 0 && (!fits || (!forced && !compatible(b, cur, r)))) {
      groups.push(cur);
      cur = { members: [], sum: 0, ready: false };
    }
    for (const p of b.members) { cur.members.push(p); cur.sum += p.rank; }
    if (cur.members.length === r.groupSize) {
      cur.ready = true;
      groups.push(cur);
      cur = { members: [], sum: 0, ready: false };
    }
  }
  if (cur.members.length > 0) groups.push(cur);

  // An incomplete group is released only when allowed, one member has waited giveUpAfter cycles,
  // and every member has waited more than one cycle (the donor's "give new players a second pass").
  for (const g of groups) {
    if (g.ready || !r.allowIncomplete) continue;
    const longWaiter = g.members.some((p) => p.waitedCycles >= r.giveUpAfter);
    if (longWaiter && g.members.every((p) => p.waitedCycles > 1)) g.ready = true;
  }

  for (const p of queue) {
    if (p.waitedCycles >= r.widenAfter) p.highPriority = true;
  }
  return groups.filter((g) => g.ready);
}

export {};
```

## 5. Lands in

- TARGET `origins/server/matchQueue.ts` (new, server side). Not `src/fight/`: the queue only hands a ready group to a fight room; the fight itself stays in the engine.
- Parity row: 1 (duel step/sim), the nearest row. Plain statement: no row in the 1-23 checklist covers matchmaking or the queue, so this is a stretch. Lead should decide whether to add a row for queue and party formation.
- today: (not read) for Frankendom; this pass did not read the Frankendom queue or party code.
- Reuse tag: adapt (MIT: code may be adapted; the sketch is rewritten from the mechanism and only the shape is kept)
- Brief rule served: 1 (one engine: the queue only creates the room); server-verified (rank and party id come from the server, not the client). Rules 7-9 n/a.

## 6. Gaps and risks

- Client-supplied rank and team id: `rank: options.rank` and `teamId: options.teamId` (210-211). Frankendom's rulings say the server verifies. The port must read rank and party id from the server profile and party record. This is the main reason the donor is not a copy.
- Team-mode averaging is wrong (hand trace, not run). Line 297 computes the team total before the split, and line 302 passes that total into `redistributeClients`, which adds each member's rank again (340-341). Example: one team with ranks 10 and 20 gives a group average of 30 after the second member (true average 15). Do not port `redistributeTeams` as written; the sketch sums members once.
- Lone team never fills (hand trace, not run). A party with more members than `maxTeamSize`, queueing with no other team in the queue, keeps `maxTeamSize` members in an unready group every pass, because the loop stops below two teams (314). Such a party never forms a ready group.
- The default compare is very loose (`options.compare` can replace it). The accepted gap is up to twice the group average (129): with an average of 50, any rank up to 150 is compatible. For a skill duel this is no window. Frankendom needs the window per mode as data.
- Rank 0 bypass (hand reading): the close check needs the group average above 0 (327), so a group with an average of 0 accepts anyone. The sketch uses an explicit empty-group check instead.
- Force flag is sticky: `userData.highPriority = true` (366) and nothing in this file clears it (grep). A player forced at about 11 s can then join any group. Frankendom should expire the flag, or cap how many forced players one group takes. The default group size of 4 is not a Frankendom number. Frankendom's MAX_ATTACKERS = 3 caps attackers at once, so any group size must be set per mode as data and checked against the rulings, not inherited from `maxPlayers = 4`.
- The waiting message sends the group's size, not the queue's size: line 433 (`group.clients.length`), while the comment at 427 says "how many players are in the queue". The client sees a misleading count.
- The confirm counter (162, 389) is incremented, but nothing in this file compares it with the group size, so a match is not gated on confirmations here.
- No test in the repo exercises the queue (grep). A port needs its own tests: rank widening over time, team split, lone team, forced entry, and the failure path.
- Bots: the class doc says incomplete groups are meant to be filled with bots by the room (line 38). Not read beyond that doc line; Frankendom has no bot filler in this pass.
- The tick is one second. That is fine for a party queue; it is too slow to be the duel step, which stays at the engine's tick (row 1).
