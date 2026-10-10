# pmbstyle-L2Solo (parties-guilds-chat, cell 3)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Clan/ClanPartyService.js` | Licence: Apache-2.0 (repo `LICENSE` line 2: "Version 2.0, January 2004"; full Apache 2.0 text) | JavaScript (Node, `invoke` module loader) | symbol `prepareOperationRoster`, `operationRoster`, `reclaimRequiredRoleParties`, `resolveClan`, `resolveBatch`

Checked: Read in full: `ClanPartyService.js` 1-549. Read: `ClanGoalPolicy.js` 1-72 (`operationMembers`, `hasReadyRoles`, `operationLevelThreshold`, `operationAvailable`); `ClanSimulationPolicy.js` 66-71 (`rosterRole`); `ClanSimulationConfig.js` 1-40 (defaults) and clamps at 126-152 (grep); `ClanActionService.js` 1-120, 128, 170-180, 407-408, 556-600 (dispatch, not-ready retry, batch budget loop); `ClanRules.js` 1-54 (whole file: member limits, privilege bits). Not read: `ClanActionService.js` 121-169 and 181-555; `LifeState.clanOperationCandidates`, `BackgroundPartyState`, `BackgroundDropResolver.rollForFight`, all `Database.*` calls, `GoalService.recordCatastrophicFailure`, `BotRoles.inferRole` (role for non-spoiler, non-crafter classes), `ClanInviteService.js`, `ClanMembershipPolicy.js` (grep hits only), `CLAN_SOCIAL.md`. Camera: not applicable (camera_scope not applicable). Confidence: high on roster selection, the ready rule and the reclaim (code read end to end); the candidate query and the drop roll are used as black boxes. Hint file `ClanActionService.js` is a dispatcher: it routes a `farm` goal to the party action (`ClanActionService.js` 128, 407-408), and the real roster code is `ClanPartyService.js`.

Best transferable idea: Build a group by ranking free candidates on role order and then level, take one of each support role first, and refuse to start until the required roles are present (no silent fallback).
Decision (proposed): adapt - take the ranked role-first roster and the guest backfill; reject the donor's fallback that starts without tank, healer or buffer, and do not port the forced success.
Acceptance: a server test with candidates dps 80, dps 79, healer 40, tank 30 and a cap of 4 builds the group tank, healer, dps 80, dps 79 in that order; a group with no healer is not started unless the zone sets allow_role_fallback.

## 1. Mechanism

- A clan (guild) runs bot "operations" (a farming party for one target). It builds a roster from its own members and, if needed, from other bots, then runs the operation and resolves it. Mechanically: rank candidates, fill the roster with support roles first, backfill missing roles from outside, then start.
- Order of steps, as the code runs (`resolveClan` 411-475 -> `prepareOperationRoster` 207-286 -> `startOperation` 288-313):
  - (a) Gate. `resolveClan` runs only for a level-2 clan (or a player-managed goal) with a farm goal that is not done (414-419). If the goal has no `partyId`, the clan first reclaims support parties (422-446).
  - (b) Reclaim. `reclaimRequiredRoleParties` (134-148): for each support role (tank, healer, buffer) that no ready clan member covers, it takes the highest-level cold member with that role who is in an active, unprotected party that is not already chosen (107-132), marks that party `dissolved`, and releases its members (139-146). Player-ordered goals use the same idea by assignment (150-174).
  - (c) Refresh. `refreshOperationRoster` (176-200) recomputes the assigned ids from eligible clan members and writes the goal only if the list changed.
  - (d) Candidates. `prepareOperationRoster` (207-286): the minimum level is `operationLevelThreshold(sourceLevel)` = floor(source level - 5), minimum 1 (`ClanGoalPolicy.js` 60-61; `ClanPartyService.js` 65-68). Candidates come from `LifeState.clanOperationCandidates` (216-221, limit 64; not read).
  - (e) Roster without fallback. `operationRoster` (76-97): assigned ids (or eligible clan members) plus guests go to `operationMembers` (83). `operationMembers` (`ClanGoalPolicy.js` 24-51): keep cold, not-partied members (18-22); sort by role rank tank 0, healer 1, buffer 2, dps 3, mage 4, crafter 5, spoiler 6, then higher level, then lower id (33-35); take one of each support role first (39-44), then fill in rank order (45-49), up to the cap clamped to 1..9 (36). `ready` = count >= 3 and, unless the goal is player-controlled (`playerControlled`, 88 and 95) or fallback is allowed, `hasReadyRoles` (3 available and tank, healer and buffer all present) (`ClanPartyService.js` 94-95).
  - (f) Join. For each support role missing from the roster, the first unaffiliated candidate (clan id 0) with that role is added to this clan with `joinAutonomousClan`, using `memberLimit(clan level)` and `maxBotMemberShare` (226-239). If any joined, the projection reloads and the roster is refreshed (241-268).
  - (g) Guests. For each support role still missing, the first candidate with that role becomes a guest (277-279). Then candidates are added in order until the roster reaches the minimum of 3 (280-283).
  - (h) Fallback. The final roster is built with `allowRoleFallback: true` (284). So after step (g), `ready` is true whenever the roster has at least 3 members, even with no tank, healer or buffer. The role check only decides who is recruited, not whether the operation starts.
  - (i) Start. `resolveClan` refuses when `ready` is false (454-457). Otherwise `startOperation` calls `startAutonomousClanOperation` with clan members and guests kept apart (294-303). A reservation conflict is counted (308-310).
  - (j) Resolve. When an operation is active, `resolveActiveOperation` (315-409) averages the members' hydrated levels (318-322), rolls drops once for the whole operation with `maxItems: 1` (327-336), and sets `success = !forceFailure` (338). So without the forced flag, the operation always succeeds. A failure calls `recordCatastrophicFailure` and replans (359-363). If the roll gave a blood-mark item and the clan is level 2, the market demand is marked fulfilled and the clan advances to level 3 (373-407).
- Budget. `resolveBatch` (481-519) sets a deadline from `resolveBudgetMs` (483) and checks it between clans (497-501); it counts each stop (499). `ClanActionService.resolveBatch` (560-600) does the same for queued actions, and starts its deadline after bootstrap and queue telemetry (582-586), with the comment that starting it earlier made a live queue claim and release the same action forever.
- Retry. A party action that is not ready is retried after `actionRetryMs` (`ClanActionService.js` 173-178; 60000 ms by default, `ClanSimulationConfig.js` 40).
- Tick: a batch scheduler (`resolveIntervalMs` 60000 is in the config; the caller that uses it was not read). Not a per-frame loop.

## 2. Key functions

- `prepareOperationRoster`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Clan/ClanPartyService.js` 207-286. Join, refresh, guests, fallback.
- `operationRoster`: same file, 76-97. Candidate set, ranking call, ready rule.
- `reclaimRequiredRoleParties`: same file, 134-148 (and `requiredRoleParties` 107-132).
- `resolveClan`: same file, 411-475. Gate, reclaim, refresh, prepare, start or resolve.
- `operationMembers` and `hasReadyRoles`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Clan/ClanGoalPolicy.js` 24-51 and 53-58.
- Batch budget: `ClanPartyService.js` 481-519 and `ClanActionService.js` 560-600.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rank candidates by role, then level, then id; take one of each support role first, then fill | Role order tank 0, healer 1, buffer 2, dps 3, mage 4, crafter 5, spoiler 6 (theirs, `ClanGoalPolicy.js` 15) |
| Cap the group size, clamped to 1..9 | Max 9 (theirs, `ClanSimulationConfig.js` 22; clamp 134-136); min 3 (theirs, line 21; clamp 133, floor 2) |
| Level floor relative to the target level | Gap 5 (theirs, line 23): floor(source - 5), minimum 1 |
| Recruit a missing role from unaffiliated candidates, capped by share | Bot share cap 0.70 (theirs, line 6); member limit by clan level 10, 15, 20, 30, 40 for levels 0 to 4+ (theirs, `ClanRules.js` 18-22) |
| Reclaim a support party: highest level first, only active and unprotected | Candidate limit 64 (theirs, `ClanPartyService.js` 220, 266) |
| Batch deadline, checked between items | 80 ms budget (theirs, line 34); batch size 16 (line 33) |
| Retry a not-ready action later | 60000 ms (theirs, line 40); lease 120000 ms (line 39) |
| Drop roll once per completed operation | `maxItems: 1` (theirs, `ClanPartyService.js` 335) |

Clamps (theirs, `ClanSimulationConfig.js` 133-136): minimum member count is held between 2 and 9; the cap is held between the minimum and 9.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's ranking (role rank, then higher level, then lower id), the one-of-each-support-role pass before the fill, the cap clamp to 1..9, the filter to free candidates (cold, not in a group) and the ready rule with the fallback flag. It takes the role-fallback choice as a parameter, which the donor sets to true at the end of its prepare step (`ClanPartyService.js` 284). It omits the candidate query and its level floor (the helper is shown; the caller that applies it is not), the clan joins, the guest backfill loop, the roster persistence, the reclaim of support parties, the drop roll, the success or failure branch and the batch budget. The sketch was typechecked with `tsc --strict --target es2020` on the VPS (exit 0).

```ts
// Licence: Apache-2.0 (donor). Clean-room sketch written from the described mechanism; not a translation.
type Role = 'tank' | 'healer' | 'buffer' | 'dps' | 'mage' | 'crafter' | 'spoiler';

interface Candidate { id: number; role: Role; level: number; cold: boolean; inGroup: boolean; }

interface RosterPolicy { minMembers: number; maxMembers: number; maxLevelGap: number; }

const ROLE_RANK: Record<Role, number> = { tank: 0, healer: 1, buffer: 2, dps: 3, mage: 4, crafter: 5, spoiler: 6 };
const SUPPORT: Role[] = ['tank', 'healer', 'buffer'];

// Free = idle (cold) and not already in a group.
function isFree(c: Candidate): boolean {
  return c.cold && !c.inGroup;
}

// Level floor for the activity: members must be at least sourceLevel minus the gap (floor, minimum 1).
function levelThreshold(sourceLevel: number, gap: number): number {
  return Math.max(1, Math.floor(sourceLevel - Math.max(0, gap)));
}

// Rank free candidates: role rank, then higher level, then lower id.
// Take one of each support role first, then fill in rank order up to the cap.
function pickRoster(pool: Candidate[], p: RosterPolicy): number[] {
  const cap = Math.max(1, Math.min(9, p.maxMembers));
  const ranked = pool.filter(isFree).sort((a, b) =>
    ROLE_RANK[a.role] - ROLE_RANK[b.role] || b.level - a.level || a.id - b.id);
  const picked: Candidate[] = [];
  const taken = new Set<number>();
  for (const role of SUPPORT) {
    const c = ranked.find(x => x.role === role && !taken.has(x.id));
    if (!c || picked.length >= cap) continue;
    picked.push(c);
    taken.add(c.id);
  }
  for (const c of ranked) {
    if (picked.length >= cap || taken.has(c.id)) continue;
    picked.push(c);
    taken.add(c.id);
  }
  return picked.map(c => c.id);
}

// Ready: enough free members, and every support role present unless the caller allows a fallback.
function isReady(roster: Candidate[], p: RosterPolicy, allowRoleFallback: boolean): boolean {
  const free = roster.filter(isFree);
  const roles = new Set(free.map(c => c.role));
  return free.length >= p.minMembers && (allowRoleFallback || SUPPORT.every(r => roles.has(r)));
}

export {};
```

## 5. Lands in

- TARGET `origins/server/group-roster.ts` (new, proposed path; the repo layout was not checked). The engine builds a group for a zone encounter from server-held members, and the ready rule lives there, not in the client.
- Parity-checklist row 18 (loot roll and XP award). This is the nearest row, and it covers the operation's single drop roll and the reward step. The roster selection itself (ranking, role coverage, guest backfill, reclaim) fits no row in 1-23; that part is "none" for the parity list and is a new engine rule to record. Sub-line for the batch budget: "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3).
- Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted, but the sketch is written from the mechanism and the donor's fallback is not adopted).
- Brief rule served: one ledger (roster and reward are one engine state change) and server-verified state (the group is built and started on the server).

## 6. Gaps and risks

- The role check is advisory. The final roster uses `allowRoleFallback: true` (`ClanPartyService.js` 284), so an operation starts with three members and no tank, healer or buffer. Frankendom must make required roles an explicit zone rule and reject a group that lacks them, unless the zone says otherwise.
- The donor's success is forced. `success = !forceFailure` (338) means an operation succeeds unless a test forces failure. There is no combat outcome here, so the donor cannot inform the kill rules. Do not port the success branch as a kill result.
- One drop roll per operation (327-336, `maxItems: 1`). The donor does not split loot per member at this point. The roll internals are not read, so the per-member split question is open for Frankendom's one-ledger rule.
- Size. The donor's cap of 9 is a farming party size, not an attacker count. Frankendom's ruling MAX_ATTACKERS = 3 caps attackers in a fight, so the donor's 9 does not transfer as a fight size.
- The batch budget is checked only between clans (497-501). A clan whose resolve awaits database calls can run past the 80 ms deadline; the code does not cancel it. A per-tick NPC budget in Frankendom must cap the work inside one item, not only between items.
- Member limits by clan level (10 to 40) and the bot share cap (0.70) are clan-size rules, not permissions. Guild privileges are a separate bit mask (`ClanRules.js` 1-7, 37-39): a member's privilege integer is ANDed with each required bit. Frankendom has no such rule yet; if it adds one, the bit mask is the shape to reuse (rewrite from idea).
- Not covered: clan invites (`ClanInviteService.js`, 83 lines, not read), the membership policy (`ClanMembershipPolicy.js`, grep hits only), chat channels (none found in this folder). The guild ranks beyond the privilege bits were not read.
- Player-controlled goals are a distinct branch: `prepareOperationRoster` returns early with no recruiting (ClanPartyService.js 208-210), `eligibleClanMembers` skips the level filter (70-74), and `ready` ignores roles (95). The sketch's ready rule does not model it.

Reuse tag: rewrite-from-idea (Apache-2.0; clean-room sketch)
Brief rule served: one ledger (group state and reward are engine state); server-verified state (the group is built on the server)

## Checker findings

- Verdict: MINOR
- Corrected: ready rule now includes the playerControlled bypass (ClanPartyService.js 88, 95)
- Missed (also added to section 6): player-controlled flow (early return 208-210, no level filter 70-74, ready ignores roles)
