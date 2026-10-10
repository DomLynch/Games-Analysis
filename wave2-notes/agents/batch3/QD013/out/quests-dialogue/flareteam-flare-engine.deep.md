# flareteam-flare-engine (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/QuestLog.cpp` (with `CampaignManager.cpp`, `NPC.cpp`, `MenuTalker.cpp`, `EventManager.cpp`, `MapRenderer.cpp`, `Utils.cpp`) | Licence: GPL-3.0-or-later (`src/QuestLog.cpp` header, line 10: "either version 3 of the License, or (at your option) any later version"; the repo `COPYING` is the GPL version 3 text) | C++ | symbol `QuestLog::createQuestList`

Checked: Read in full: `QuestLog.h` (61 lines) and `QuestLog.cpp` (263 lines). Read in full or near it: `CampaignManager.cpp` 43-340 (status registry, set/check, currency and item checks, rewards, requirement dispatch; the random-status and save-parse functions 341-378 not read), `CampaignManager.h` (typedefs and declarations, by grep). `NPC.cpp` 96-200 (dialog parse, start only), 598-732 (node selection, responses, topics), 789-937 (processDialog, processEvent). `MenuTalker.cpp` 153-186 and 500-553 (topic choice, advance). `EventManager.cpp` 177-186 (duration loading), 925-1000 (event dispatch start), 1140-1200 (rewards and loot), 1328, 1370-1396; `MapRenderer.cpp` 305-329; `Utils.h` 88-108 and `Utils.cpp` 188-244 (Timer); `UtilsParsing.cpp` 242-262; `Settings.cpp` line 84. Callers: grep across `src/` for `setStatus`, `unsetStatus`, `checkRequirementsInVector`, `checkAllRequirements`, `rewardXP`, `getDialogNodes`, `processDialog`, `delayed_events`; the callers listed in section 1 are the full set outside the functions themselves. Not read: `EventManager.cpp` 1000-1140 and 1200-1370 (most event types); the context of the status writes at `GameStatePlay.cpp` 283, `StatBlock.cpp` 914 and 1318, `Map.cpp` 1421 and `SaveLoad.cpp` 663 (the status name is read, the surrounding code is not); `MenuTalker.cpp` 187-492 (drawing). Data: `mods/default/` has no `quests/` or `npcs/` folder (the content is not in this donor), and `mods/default/languages/data.pot` has 21 `msgid` lines including the header. Quest text and quest flows are therefore not read. Confidence: high for the status ledger, the shared requirement predicate, the quest views and the delayed-event timer; medium for dialogue (MenuTalker control flow partly read). Camera: not applicable.

## 1. Mechanism

- One campaign ledger. `CampaignManager` keeps a map from a status id to a (set flag, name) pair (`CampaignManager.h` 38). The id is a hash of the status name (`CampaignManager.cpp` 48-52). `setStatus` does nothing if the status is already set (110), otherwise sets the flag and marks a title re-check (113). `unsetStatus` clears the flag (116-122). Writers found by grep: event SET_STATUS and UNSET_STATUS (`EventManager.cpp` 980-984), defeat status (`StatBlock.cpp` 914), a pickup status (`GameStatePlay.cpp` 283), a class status on load (`SaveLoad.cpp` 663), a procedural-map status (`Map.cpp` 1421), the random status (`CampaignManager.cpp` 366, 373), and the savefile parse (`setAll`, 69-77; its caller was not read). Nothing is stored per quest.
- One predicate system. Requirements are event components (status, not-status, level, not-level, currency, item, class, tile and their negations). `checkAllRequirements` evaluates one (`CampaignManager.cpp` 269-330). A component that is not a requirement counts as passing (322-326). `checkRequirementsInVector` is an AND over a list (332-339). The same predicate gates: quests (`QuestLog.cpp` 176), dialogue nodes (`NPC.cpp` 625), invincibility (`Entity.cpp` 356), map NPC spawns (`NPCManager.cpp` 87), entity spawns (`EntityManager.cpp` 148), and event components (`EventManager.cpp` 1328).
- Quests are views. Each `[quest]` section is a list of requirement components plus `quest_text` lines (`QuestLog.cpp` 68-161). Every logic tick, `createQuestList` (163-170) computes the active list (quests whose requirements pass, 175-180) and the complete list (quests whose `complete_status` is set, 183-189). The log is rebuilt only if either id list changed (193-199). Nothing about a quest is saved; the quest is recomputed from the ledger. Complete quests are listed in their own section above the active ones (204-221). The two lists are computed independently, so a quest can appear in both unless its requirements exclude its complete status (the content decides this; not read).
- Rewards go through one funnel. Event REWARD_XP calls `rewardXP` (`EventManager.cpp` 1150), and so does kill XP (`StatBlock.cpp` 924). `rewardXP` (`CampaignManager.cpp` 207-221): returns if XP gain is blocked (208); adds `amount * (100 + XP_GAIN) / 100` to `bonus_xp` (211); awards the whole part (213-214); keeps the fraction (215). Items go through `rewardItem` (182-197), currency is an item (199-205), and loot tables roll a random count and call `rewardItem` or `rewardCurrency` (`EventManager.cpp` 1162-1186).
- Dialogue is a list of nodes. Each node is a flat list of event components: `id`, `topic`, `him`/`her`/`you` lines, `response`, `response_only`, `group`, a voice, portraits, a visual effect, and ordinary events (`NPC.cpp` 106-195). `getDialogNodes` (598-662) walks nodes last-defined first. A node is offered if its requirements pass (625). A response-only node is offered only when responses are allowed (618-620). Grouped nodes contribute one random pick per group (`rand() % n`, 658), inserted at the front of the result (659). `getDialogResponses` (664-706) takes the response ids that precede the current line and matches them to available response-only nodes by `id` (673-703).
- A dialogue node is a parked script. `processDialog(node, cursor)` (789-915) skips requirement and metadata components, plays voice, portraits, party and visual-effect components, and returns true at a them or you line (838-843). The cursor stays on that line. `processEvent(node, cursor)` (917-933) runs the non-dialog components between that line and the next line through `EventManager::executeEvent` (932). The menu owns the cursor (`MenuTalker.cpp`): `chooseDialogNode` sets it to 0 (154), calls `processEvent` and then `processDialog` (174-175). `nextDialog` runs `processEvent` for the current line, increments the cursor, and calls `processDialog` again (529-531). When `processDialog` returns false (a NONE component, or no more components), the dialogue ends.
- Delayed events are parked scripts too. An event may carry a `delay` and a `cooldown` Timer (`EventManager.cpp` 177-186). When a triggered event has a delay, a copy is pushed to `mapr->delayed_events` (956-958), and the original starts its cooldown (959). Each frame, `MapRenderer` walks `delayed_events` from the end, ticks each delay (317-320), and when a delay ends runs `executeDelayedEvent` (323) and erases the entry (324). An event cannot run while its delay or cooldown is running (943). A `chance_exec` percentage is rolled before the components run (970).
- Timer units. A Timer is a frame countdown (`Utils.cpp` 212-220). Durations in the data are seconds or milliseconds: seconds become `s * max_frames_per_sec` (`UtilsParsing.cpp` 252-253), and milliseconds become `round(ms * max_frames_per_sec / 1000)`, with a minimum of 1 (257, 261). The default frame cap is 60 (`Settings.cpp` 84).

## 2. Key functions

- `QuestLog::createQuestList`: `/mnt/frankendom-donors/flareteam-flare-engine/src/QuestLog.cpp` 170-263.
- `QuestLog::load` (requirements and quest text): `QuestLog.cpp` 68-161.
- `CampaignManager::checkAllRequirements` and `checkRequirementsInVector`: `/mnt/frankendom-donors/flareteam-flare-engine/src/CampaignManager.cpp` 269-339.
- `CampaignManager::setStatus` / `checkStatus` / `unsetStatus`: `CampaignManager.cpp` 99-122.
- `CampaignManager::rewardXP`: `CampaignManager.cpp` 207-221.
- `NPC::getDialogNodes` / `getDialogResponses`: `/mnt/frankendom-donors/flareteam-flare-engine/src/NPC.cpp` 598-706.
- `NPC::processDialog` / `processEvent`: `NPC.cpp` 789-933.
- `MenuTalker::chooseDialogNode` / `nextDialog`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuTalker.cpp` 153-182, 525-553.
- `EventManager::executeEventInternal`: `/mnt/frankendom-donors/flareteam-flare-engine/src/EventManager.cpp` 941-984 (start), 1149-1186 (rewards).
- `MapRenderer::logic` delayed-event walk: `/mnt/frankendom-donors/flareteam-flare-engine/src/MapRenderer.cpp` 316-326.
- `Timer::tick` / `Timer::reset`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Utils.cpp` 212-235.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One ledger of named boolean statuses; set is idempotent; set and unset have one code path each | Status id is a hash of the name (`CampaignManager.cpp` 52); id 0 means "no status" (`QuestLog.cpp` 184) |
| One AND-list of predicates gates quests, dialogue, spawns, invincibility, events | Level: "at least" for `requires_level` (`CampaignManager.cpp` 295), "under" for `requires_not_level` (299). The list is AND only; there is no OR in the donor |
| A quest is a view: active if its requirements pass, complete if its status is set | No numbers |
| One XP funnel: amount times (100 + XP gain) / 100, whole part granted, fraction carried | Multiplier (100 + XP_GAIN) / 100 (`CampaignManager.cpp` 211); carry is the fraction (215) |
| Timed event: delay copy parked in a list, ticked per frame, erased when run | ms to frames: round(ms * fps / 1000), minimum 1 (`UtilsParsing.cpp` 257, 261); default fps 60 (`Settings.cpp` 84) |
| Random pick per group | `rand() % n` (`NPC.cpp` 658), global unseeded `rand` |
| Chance gate on an event | `percentChanceF` (`EventManager.cpp` 970) |

Defects and gaps (keep the idea, fix each):
- Timers count frames, not time (`Utils.cpp` 212-220), and the frame count is fixed at load from the frame cap (`UtilsParsing.cpp` 253, 257). A delay in ms is therefore late when the real frame rate is below the cap. fix: store the duration in ms and tick by elapsed time on the server's fixed step.
- The XP message prints the base amount, not the whole XP granted (`CampaignManager.cpp` 220 uses `amount`; the award is 213-214 after the multiplier). fix: print the whole XP granted by that call.
- The tile requirement dereferences `mapr` before its null check (`CampaignManager.cpp` 311 uses `mapr->layernames_hashed`; the check `if (mapr && ...)` is at 312). The same order repeats at 317-318. fix: test `mapr` first.
- The group pick uses the global `rand()` (`NPC.cpp` 658), so the roll is not seeded per encounter and cannot be replayed. fix: a server RNG seeded per encounter, with the roll recorded.
- `MenuTalker::nextDialog` (`MenuTalker.cpp` 547) compares `dialog_node` with `prev_node` after `chooseDialogNode(-1)` has already set `dialog_node` to -1 (154-158). As written this check looks unreachable (traced by reading, not run). fix: remove it, or state the case it is meant to catch.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for dialogue node selection (last-defined first; response-only nodes gated by a flag; one roll per group; group picks placed before plain nodes, in reverse group-name order, because the donor inserts each pick at the front) and the quest view (complete if the complete status is set, else active if the requirements pass). It keeps one status ledger with idempotent set. It omits the tile, currency, item and class requirements; the title re-check on status change; the quest text lines and their grouping; portraits, voice and visual effects; the event execution inside the dialogue (processEvent); the parked cursor; and the response matching. The group roll uses an injected rng, where the donor uses the global `rand()`. The file ends with its own checks, which were compiled with `tsc --strict --target es2020` and run with `node` on the VPS: exit 0.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Req =
  | { kind: "status"; id: string }
  | { kind: "not_status"; id: string }
  | { kind: "level"; min: number }
  | { kind: "not_level"; max: number };

interface Hero { level: number; }

// One ledger for campaign state: a set of status ids. Setting an id twice changes nothing.
class StatusLedger {
  private ids = new Set<string>();
  setStatus(id: string): boolean {
    if (this.ids.has(id)) return false;
    this.ids.add(id);
    return true;
  }
  unsetStatus(id: string): boolean {
    return this.ids.delete(id);
  }
  has(id: string): boolean {
    return this.ids.has(id);
  }
}

function passes(r: Req, ledger: StatusLedger, hero: Hero): boolean {
  switch (r.kind) {
    case "status": return ledger.has(r.id);
    case "not_status": return !ledger.has(r.id);
    case "level": return hero.level >= r.min;
    case "not_level": return hero.level < r.max;
  }
}

// A requirement list is an AND over its predicates.
function allPass(reqs: Req[], ledger: StatusLedger, hero: Hero): boolean {
  return reqs.every((r) => passes(r, ledger, hero));
}

// A quest is a view over the ledger, not a stored state machine.
interface Quest { name: string; reqs: Req[]; completeStatus?: string; }
type QuestView = "active" | "complete" | "hidden";
function questView(q: Quest, ledger: StatusLedger, hero: Hero): QuestView {
  if (q.completeStatus !== undefined && ledger.has(q.completeStatus)) return "complete";
  return allPass(q.reqs, ledger, hero) ? "active" : "hidden";
}

// Dialogue nodes: the same requirement lists gate what the player can be offered.
interface DialogNode { id: string; group?: string; responseOnly: boolean; reqs: Req[]; }

// Last-defined node first; a group contributes one random pick, placed before the plain nodes.
function availableNodes(
  nodes: DialogNode[], ledger: StatusLedger, hero: Hero, allowResponses: boolean, rng: () => number,
): DialogNode[] {
  const plain: DialogNode[] = [];
  const groups = new Map<string, DialogNode[]>();
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (n.responseOnly && !allowResponses) continue;
    if (!allPass(n.reqs, ledger, hero)) continue;
    if (n.group === undefined) {
      plain.push(n);
    } else {
      const bucket = groups.get(n.group);
      if (bucket) bucket.push(n); else groups.set(n.group, [n]);
    }
  }
  const picks: DialogNode[] = [];
  for (const key of [...groups.keys()].sort()) {
    const bucket = groups.get(key);
    if (bucket && bucket.length > 0) picks.push(bucket[Math.floor(rng() * bucket.length)]);
  }
  return [...picks.reverse(), ...plain];
}

// Checks.
const ledger = new StatusLedger();
const hero: Hero = { level: 3 };
const boss: Quest = { name: "Bandits", reqs: [{ kind: "level", min: 2 }, { kind: "not_status", id: "bandits_done" }], completeStatus: "bandits_done" };
if (questView(boss, ledger, hero) !== "active") throw new Error("quest should be active");
if (ledger.setStatus("bandits_done") !== true) throw new Error("first set changes");
if (ledger.setStatus("bandits_done") !== false) throw new Error("second set is a no-op");
if (questView(boss, ledger, hero) !== "complete") throw new Error("quest should be complete");

const nodes: DialogNode[] = [
  { id: "greet", responseOnly: false, reqs: [] },
  { id: "bandit_tip", responseOnly: false, reqs: [{ kind: "not_status", id: "bandits_done" }] },
  { id: "thanks", responseOnly: false, reqs: [{ kind: "status", id: "bandits_done" }] },
  { id: "pick_a", group: "rumour", responseOnly: false, reqs: [] },
  { id: "pick_b", group: "rumour", responseOnly: false, reqs: [] },
  { id: "secret", responseOnly: true, reqs: [] },
];
const lowRoll = () => 0;
const ids = availableNodes(nodes, ledger, hero, false, lowRoll).map((n) => n.id);
if (ids.join(",") !== "pick_b,thanks,greet") throw new Error("order: " + ids.join(","));

export {};
```

## 5. Lands in

- TARGET `origins/quests/requirements.ts` (new file, proposed): one status ledger and one AND-list predicate check, shared by quests, dialogue nodes, spawn gates and event gates. A quest is a view over the ledger; nothing per quest is saved.
- Parity-checklist row: 18 (loot roll and XP award). The XP funnel is the row 18 sub-point: quest XP and kill XP both go through one award function (`CampaignManager.cpp` 207-221; callers `EventManager.cpp` 1150 and `StatBlock.cpp` 924).
- Reuse tag: adapt-idea (GPL-3.0-or-later: clean-room only; the sketch is written from the mechanism)
- Brief rule served: one ledger (campaign statuses are the one ledger); zones as data (quest and dialogue lists are data); server-verified (the view and the gates must be computed on the server)

## 6. Gaps and risks

- Clean-room only: GPL-3.0-or-later. No line-by-line translation.
- The donor is a single-player client. The ledger, the predicate checks, the timers and the dialogue cursor are all client memory (`MapRenderer::logic` runs per frame). Frankendom's ledger and gates must be computed on the server, and the client shows the server's view.
- Timers count frames (see defect 1 in section 3). Frankendom's server tick must count time at a fixed step, so the same delay means the same time for every client.
- The dialogue cursor lives in the menu (`MenuTalker` `event_cursor`), not with the NPC or the character. Closing the menu loses the parked line. Frankendom should store the parked dialogue step with the character (one ledger), so a reconnect resumes at the same line.
- The donor's requirement list is an AND only. OR must be written as separate quests or nodes.
- A quest can appear in both the complete and active lists when its requirements still pass after its complete status is set (`QuestLog.cpp` 175-189). The donor leaves this to the content. Frankendom should make complete and active exclusive by rule.
- The random group pick is unseeded and not recorded (`NPC.cpp` 658). Frankendom needs a server roll that is seeded per encounter and recorded with the encounter.
- Not verified: the status writers' context (`StatBlock.cpp` 914, `GameStatePlay.cpp` 283, `Map.cpp` 1421, `SaveLoad.cpp` 663); the random-status functions (`CampaignManager.cpp` 341-375); event types in `EventManager.cpp` 1000-1140 and 1200-1370. Quest text and quest content are not in the donor.
- Not relevant to Frankendom's fight rulings (MAX_ATTACKERS, hate lists, the Pit), except that invincibility uses the same predicate list (`Entity.cpp` 356).

Best transferable idea: one status ledger and one AND-list of requirement predicates decide quests, dialogue lines, spawns and event gates, so a quest is a view over the ledger (nothing per quest is saved) and every XP award goes through one funnel.
Decision (proposed): adapt — keep the one ledger, the shared predicate list, quests as views and the single XP funnel; express the lists as zone data; replace the frame-count timers with ms on the server's fixed step; reject the menu-held dialogue cursor and the unseeded group roll.
Acceptance: a server test: quest bandits is active at level 2 with no bandits_done status; a kill sets bandits_done once; the quest log then shows it complete, the tavern line gated on bandits_done appears on the next talk, and the kill XP is granted once through the XP funnel with a log line showing the whole XP granted. A client check: the quest log lists active and completed quests in separate sections.
