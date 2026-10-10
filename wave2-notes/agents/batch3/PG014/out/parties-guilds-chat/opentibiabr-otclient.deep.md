# opentibiabr-otclient (parties-guilds-chat, cell 1)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_analyser/classes/PartyHuntAnalyser.lua` | Licence: MIT (repo `LICENSE` line 1: "OTClient is made available under the MIT License") | Lua | symbol `PartyState` (`PartyState:scheduleUpdate`, `PartyState:performUpdate`, `onShieldChange`)

Checked: Read in full: `PartyState` table 579-582, `PartyState:scheduleUpdate` 585-601, `PartyState:performUpdate` 603-743, `onShieldChange` 745-784, `onPartyMembersChange` 786-789. Also read: `modules/gamelib/player.lua` 615-633 (party helpers), `modules/gamelib/const.lua` 13-24 (shield values). Grep only, not read end to end: `modules/game_analyser/analyser.lua` (event wiring at 184-185), `modules/game_console/console.lua` (the hint file: `grep -ci "party\|guild"` returns 0, so it holds no party logic). Not read: `modules/game_viplist/viplist.lua` (friend list), the console channel code beyond its function names, the server side of the party packets (`onPartyAnalyzer` at 279 was not read in full), `PartyHuntAnalyser:reset`. Camera: not applicable (camera_scope not applicable). Confidence: high on the client code paths above; the server's shield semantics are not in this donor and are not read. Hint-file note: the list hint `modules/game_console/console.lua` is the wrong file for this topic.

Best transferable idea: Refresh a roster with a leading run plus one trailing run per debounce window, so a burst of membership events costs at most two redraws.
Decision (proposed): adapt - the debounce shape fits, but membership must come from the server roster (one ledger), not from visible shields as in the donor.
Acceptance: a server test shows that a member who leaves while out of view is gone from the next roster snapshot; a client test shows 5 join/leave events inside one 500 ms window cause at most 2 roster renders.

## 1. Mechanism

- A client-side party tracker for the loot-split analyser. It does not receive a party roster to hold as truth. It infers party membership from the visible shield (the party icon) on each creature: the leader test uses the yellow shields ShieldYellow, ShieldYellowSharedExp and ShieldYellowNoSharedExpBlink (4, 6, 8), and member tests use the yellow and blue party shields; `ShieldNone` means not in a party.
- Order of steps, as the code runs:
  - (a) Trigger. `onShieldChange` runs for any creature whose shield changes (745). For the local player it schedules a refresh only when the roster state flips: no roster and now in a party, roster and now not in a party, or leader status changed (759-761). For another player it stores `lastKnownShield` (766-767) and schedules a refresh only when party membership flips (769-782). `onPartyMembersChange` (786-789) always schedules a refresh.
  - (b) Debounce. `scheduleUpdate` returns early if a refresh is already pending (586-588). If the last run was less than `updateDebounceMs` (500, line 582) ago, it sets pending and schedules `performUpdate` for the remaining time (591-596). Otherwise it runs `performUpdate` at once (597-599). So the first change in a quiet period runs at once (leading edge), and a burst inside the window collapses to one trailing run.
  - (c) `performUpdate` clears the pending flag and stamps the run time (604-605). If the local player is missing it stops (607-608). It reads the local shield and derives `localIsInParty` and `localIsLeader` from the shield lists (610-619). If the local player is not in a party and the analyser still has a leader or members, it calls `PartyHuntAnalyser:reset()` and returns (622-625).
  - (d) If the local player is in a party: sets the leader flag from the local shield (630-633), adds the local player to `membersData` with a zeroed stats row (636-639), then takes `spectators` around the local player (642). Each visible player with a party shield is added to `visiblePartyMembers` (659-660), a yellow-shield creature becomes `leaderID` (664-666), and new ids get a stats row (668-671).
  - (e) Removal. A tracked id that is not in `visiblePartyMembers` (684) is removed only if it is seen again in `spectators` with a shield that is not a party shield and is not `ShieldNone` (702-717). A tracked id that is not in view at all is kept. Removed ids are deleted from `membersData` and `membersName` and their widget is destroyed (723-736). If anything was added or removed, the window is redrawn (739-741).
- Tick: event-driven, not a per-frame loop. No accumulator; the only timer is the one-shot `scheduleEvent` used by the debounce.

## 2. Key functions

- `PartyState:scheduleUpdate`: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_analyser/classes/PartyHuntAnalyser.lua` 585-601. Pending gate plus 500 ms leading/trailing debounce.
- `PartyState:performUpdate`: same file, 603-743. Reset on local leave, shield-derived leader, visible scan, removal of members seen with a non-party shield.
- `onShieldChange`: same file, 745-784. Decides when a shield change is worth a refresh (local flip, or other-player membership flip).
- Wiring: `modules/game_analyser/analyser.lua` 184-185 connects `onShieldChange` to the `Creature` class (seen by grep, not read in full).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Debounced roster refresh: leading run, one trailing run per window, pending gate | 500 ms window (theirs, line 582; a UI constant, not zone data) |
| Roster from a status flag that the server sends for each entity (here a shield) | Leader = ShieldYellow, ShieldYellowSharedExp, ShieldYellowNoSharedExpBlink (theirs, PartyHuntAnalyser 619 and 663); ShieldYellowNoSharedExp (10) counts as a party shield but not as leader here (theirs, 614-617 vs 663) |
| Leave detection from an entity that is still in view | Removal requires a non-party, non-none shield (theirs, line 711) |
| Local leave resets all tracking | None |

Shield values (theirs, `modules/gamelib/const.lua`): ShieldWhiteYellow = 1, ShieldBlue = 3, ShieldYellow = 4, ShieldYellowNoSharedExp = 10, ShieldGray = 11. ShieldWhiteBlue = 2 is also defined there.

## 4. TypeScript sketch

simplified: the sketch keeps the debounce shape (leading run, one trailing run, pending gate) exactly as the donor orders it. It changes the membership source: the roster is reconciled against a server party snapshot, not against visible shields, and a member who is not in the server list is removed even when out of view (the donor keeps those). It omits the leader-from-shield rule, the local-leave reset, the per-creature `lastKnownShield` bookkeeping, the loot, supplies and damage counters, the widget removal and the window redraw. The sketch was typechecked with `tsc --strict` on the VPS (exit 0).

```ts
// Licence: MIT (donor). Clean-room sketch written from the described mechanism; not a translation.
type PartyStatus = 'none' | 'member' | 'leader';

interface RosterEntry { id: number; name: string; status: PartyStatus; }

// Leading-edge plus one trailing refresh per debounce window.
class RosterRefresher {
  private pending = false;
  private lastRun = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly debounceMs: number,
    private readonly run: () => void,
    private readonly now: () => number,
    private readonly later: (fn: () => void, ms: number) => void,
  ) {}

  request(): void {
    if (this.pending) return;                 // a trailing run is queued and will read the latest state
    const elapsed = this.now() - this.lastRun;
    if (elapsed < this.debounceMs) {
      this.pending = true;
      this.later(() => this.flush(), this.debounceMs - elapsed);
    } else {
      this.flush();
    }
  }

  private flush(): void {
    this.pending = false;
    this.lastRun = this.now();
    this.run();
  }
}

// The roster follows the server's party list. Anyone who is no longer in it is removed,
// including members out of view (the donor keeps those).
function reconcile(roster: Map<number, RosterEntry>, serverMembers: RosterEntry[]): void {
  const live = new Set(serverMembers.map(m => m.id));
  for (const id of Array.from(roster.keys())) {
    if (!live.has(id)) roster.delete(id);
  }
  for (const m of serverMembers) roster.set(m.id, m);
}
```

## 5. Lands in

- TARGET `origins/server/party-roster.ts` (new, proposed path; the repo layout was not checked). The server owns the roster; the client only renders it. The debounced refresh belongs in the client HUD/roster module.
- Parity-checklist row 18 (loot roll and XP award). This is the closest row: the donor's roster exists to attribute loot and supplies per member. The donor does not show the XP share rule (not read; it is server-side).
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, but the sketch is clean-room and the donor shape is small enough that a rewrite is cleaner).
- Brief rule served: one ledger (party roster is server state, not a client guess) and server-verified state.

## 6. Gaps and risks

- Membership is inferred from visible shields. A tracked member who leaves while out of view is never removed by `performUpdate` (684-719 only act on members still in `spectators`). Frankendom's one-ledger rule needs the roster to come from the server, so the donor's inference must not be ported.
- Leave with shield `none` is not removed. Line 711 requires a shield that is not `ShieldNone`, so a member whose shield clears to none stays in `membersData` until the local player leaves. Whether the server clears to `none` on leave is not read.
- The two party helpers disagree. `Player:isPartyMember` counts `ShieldWhiteYellow` as a party shield (`modules/gamelib/player.lua` 621-625), but `PartyState` does not (614-617, 769-777). A member who shows a white-yellow shield would be removed (non-party and not none, line 711). The meaning of the white shields on the server is not read.
- Leader is the last visible yellow-shield creature (665). There is no check for two leaders and no reconciliation with the server's `leaderID` from `onPartyAnalyzer` (279, not read in full).
- The leader test disagrees with `Player:isPartyLeader`. PartyState's leader tests (619, 663) leave out ShieldYellowNoSharedExp (10), but `Player:isPartyLeader` includes it (`modules/gamelib/player.lua` 617-618). A leader with shield 10 is a party member here, never a leader.
- The 500 ms debounce is a fixed UI constant. In Frankendom it would be a client constant; it does not need to be zone data.
- Chat channels and friend lists were not covered by this cell. `viplist.lua` and the console channel code were not read beyond names.

Reuse tag: rewrite-from-idea (MIT; clean-room sketch)
Brief rule served: one ledger (roster owned by the server); server-verified state
