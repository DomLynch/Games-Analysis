# endless-sky-endless-sky (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/endless-sky-endless-sky/source/Mission.cpp | Licence: GPL-3 | C++ | symbol Mission::Do (input line 1262 verified: the trigger overload `Do(Trigger, PlayerInfo&, UI*, ...)`)

## 1. Mechanism
- Donor: Endless Sky mission system. A mission is a data record with trigger-keyed actions (OFFER, ACCEPT, DECLINE, COMPLETE, FAIL, ABORT, WAYPOINT, STOPOVER, and others) and named counters per mission kept on the player.
- Mission::Do(trigger) (1262-1359): first, gates may refuse (1264-1287). A STOPOVER at a planet that is not one of the mission's stopovers falls through to a landing-action check (`Land`); if a ship was left behind, a dialog is shown and it refuses; otherwise the stopover is marked visited and the trigger refuses until the last one is done. ABORT on an already-failed mission refuses (1284); WAYPOINT refuses while waypoints remain (1286). Then ABORT with no action of its own falls back to the FAIL action (1293).
- FAIL and ABORT update counters before the action check (1299-1311), so a blocked fail still records the failure; ABORT also bumps the failed counter "for backwards compatibility". If the trigger has an action and it cannot be done, Do returns false (1314-1315). ACCEPT (offered +1, active +1), DECLINE (offered +1, declined +1) and COMPLETE (active -1, done +1) update counters only after that check passes (1317-1336).
- On ACCEPT it also refreshes the mission's NPCs and caches distance information for the player (`UpdateNPCs`, `CacheMissionInformation`, 1323-1325). An OFFER of a job mission passes no UI (1340-1341). If the trigger has an action it runs (1352-1354; the destination system is passed only for a visible mission). If there is no action and the trigger is OFFER for a non-job mission, the mission is accepted automatically through the player callback (1355-1356).
- Counters are the mission's named state: "<name>: offered", "active", "declined", "done", "failed", "aborted". Other missions and dialogue test these counters.
- Runs on the player's actions and on ship events through its callers (the caller list was not read), not on a timer. The ship-event overload (1424-1487, read) fails the mission if a player ship carrying its cargo or passengers is destroyed or has its mission cargo stolen by boarding (1430-1456), fires DISABLED when the flagship is disabled (1459-1460), and on a flagship jump clears a waypoint and fires WAYPOINT, then tries an on-enter action (1462-1477); it then forwards the event to each NPC (1479-1486).

## 2. Key functions
- Mission::Do (trigger) | /mnt/frankendom-donors/endless-sky-endless-sky/source/Mission.cpp | 1262-1359 | the trigger dispatch: gates, counter updates, action check and run.
- Mission::GetAction | /mnt/frankendom-donors/endless-sky-endless-sky/source/Mission.cpp | 1494-1499 | returns the action for a trigger, or an empty action.
- Mission::Do (ship event) | /mnt/frankendom-donors/endless-sky-endless-sky/source/Mission.cpp | 1424-1487 | ship-event overload: cargo-loss failure, DISABLED, waypoint and on-enter on a flagship jump, NPC forwarding.
- Mission::CanOffer | /mnt/frankendom-donors/endless-sky-endless-sky/source/Mission.cpp | 999-1051 | the offer gate: location and source-filter match, the offer condition, the fail condition, the repeat limit against the "offered" counter, then each of the OFFER, ACCEPT, DECLINE and DEFER actions must be doable.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Trigger table: each event maps to an optional action; the event always updates its counters first | Trigger names (theirs, e.g. lines 1264-1317) |
| Named per-mission counters (offered, active, done, failed, aborted, declined) as shared state | Counter suffixes (theirs, lines 1301-1335) |
| Gate before dispatch (waypoints, stopovers, left-behind ship) | Gate messages (theirs, text) |
| Fail and abort still count when the action is blocked | n/a (rule) |

## 4. TypeScript sketch
simplified: omits the STOPOVER and WAYPOINT gates, the ABORT-on-failed refusal (line 1284), the ABORT-to-FAIL action fallback (1293), the ACCEPT-time NPC refresh and caching, the job-mission UI rule, and the auto-accept of an OFFER with no action (the sketch returns true and does nothing). Counter order is the same as the donor: fail/abort bump first, then the action check, then accept/decline/complete bump, then the action runs.

```ts
// Licence: GPL-3 | clean-room: written from the mechanism, no donor lines.
// Mission trigger dispatch. Each mission keeps named counters. Fail and abort count first, even if the
// action is blocked. Accept, decline and complete count only after the action's conditions pass.
type Trig = "OFFER" | "ACCEPT" | "DECLINE" | "COMPLETE" | "FAIL" | "ABORT";
interface Action { canDo: () => boolean; run: () => void; }
type Counters = Record<string, number>;
// Counter keys look like "<mission>: active"; other missions and dialogue read these same keys.

function doTrigger(t: Trig, name: string, c: Counters, actions: Partial<Record<Trig, Action>>): boolean {
  const bump = (k: string, d: number): void => { c[`${name}: ${k}`] = (c[`${name}: ${k}`] ?? 0) + d; };
  if (t === "FAIL") { bump("active", -1); bump("failed", 1); }
  if (t === "ABORT") { bump("active", -1); bump("aborted", 1); bump("failed", 1); }
  const act = actions[t];
  if (act && !act.canDo()) return false;        // blocked: nothing further counts
  if (t === "ACCEPT") { bump("offered", 1); bump("active", 1); }
  if (t === "DECLINE") { bump("offered", 1); bump("declined", 1); }
  if (t === "COMPLETE") { bump("active", -1); bump("done", 1); }
  if (act) act.run();
  return true;
}
```

## 5. Lands in
- Frankendom target: `origins/quests/journal.ts` (quest state and counters) and `origins/talk/talk.ts` (offer and accept triggers used by dialogue); the server entry is `origins/server/quest-advance.ts`. All exist on the VPS snapshot /root/work-k7 (not main); only header comments and `origins/talk/README.md` were read.
- Parity-checklist row: none of rows 1 to 22. Feature-map section: Origins O2 quests and talk (`origins/talk/README.md`; its `holdsCondition` conditions such as `quest-at` and `flag` play the role of the donor's named counters); zones as data.
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks
- Counters live on the player object in the donor (`player.Conditions()`). Frankendom counters must live in the server state (one ledger), and the client must only read them.
- The donor's ACCEPT path updates NPCs and caches map information (1323-1325) after the counters change; Frankendom needs an explicit rule for what is snapshotted when a quest is taken.
- The donor's auto-accept of a non-job offer (1355-1356) is a convenience. Frankendom must not accept on the client.
- Gates on stopovers and waypoints are a travel model Frankendom does not have.
- FAIL and ABORT count even when blocked (1299-1311) and ABORT also counts as failed: replicate only if Frankendom wants abort to be irreversible; the one-ledger rule needs each counter change written once, atomically with the action it belongs to.
- Quest failure by ship events (cargo lost, 1430-1456) is a trigger from the combat/loss side; in Frankendom a quest failure must come from a server-verified event, never a client message.
- Pit is a client only and has no missions.
- Not read: `MissionAction::Do` and `CanBeDone`, `Land`, `Enter`, the NPC class, and `UpdateNPCs`.
