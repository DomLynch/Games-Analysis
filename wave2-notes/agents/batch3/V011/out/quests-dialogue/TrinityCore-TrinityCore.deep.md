# TrinityCore-TrinityCore (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 16704-16920 (plus 16630-16662, 14515-14560, 17100-17190, 14785-14811) | Licence: GPL-2.0-or-later (QuestDef.cpp header: "either version 2 of the License, or (at your option) any later version"; the root `COPYING` is the GPL version 2 text) | C++ | symbol `Player::UpdateQuestObjectiveProgress`

Checked: Symbol `Player::UpdateQuestObjectiveProgress` starts at 16704. Read 16704-16920 (the loop body and the tail up to the update calls); the function's last lines after 16920 were not read. The kill path `Player::KilledMonster` / `KilledMonsterCredit` (16630-16662) and `KillRewarder::_RewardPlayer` / `_RewardKillCredit` / `Reward` (KillRewarder.cpp 177-281) were read in full. Completion gate `Player::CanCompleteQuest` (14515-14560), `Player::IsQuestObjectiveCompletable` (17100-17157) and the MONSTER case of `Player::IsQuestObjectiveComplete` (17175-17191) were read. The bodies of `Player::CompleteQuest` (14893) and `Player::IncompleteQuest` (14921) were NOT read. Confidence: high on the order of operations for the kill path (every step is a read line); medium-high on the sequencing rule (read in full, not traced through a live quest). Files opened: Player.cpp, Player.h (640), KillRewarder.cpp, QuestDef.h (266, 354, 384, 483), QuestDef.cpp (header and XP area), CreatureData.h (426, 492), COPYING.

## 1. Mechanism

- Entry. A quest kill credit only comes from the kill-reward code on the server. `KillRewarder::_RewardPlayer` (KillRewarder.cpp 190) gives kill credit only on the branch that is not PvP-only and not battleground (203-215). `KillRewarder::_RewardKillCredit` (177-187) calls `Player::KilledMonster` only when the player has no group, or is alive, or has no corpse (180 and 184). Group members reach `_RewardPlayer` when they are at reward distance (246). The comment at 173 says reputation goes to dead players and corpses, but the kill-credit gate at 180 does not, so a dead group member with a corpse gets no kill credit. The solo killer goes through `_RewardPlayer(killer, false)` (279). `Reward()` loops over every killer (256).
- Per kill, `Player::KilledMonster` (16630-16644) credits the creature's own entry with its GUID (16636). Then, for each of the template's kill-credit slots (`i < MAX_KILL_CREDIT`, 16638) that is non-zero (16639), it credits that proxy entry with an empty GUID (16640). Then each creature label is credited with the GUID (16642-16643). I read only one caller of `KilledMonster` (KillRewarder.cpp 184); `KilledMonsterCredit` also has two other callers at Player.cpp 26368 and 26372 (not read).
- `Player::KilledMonsterCredit` (16646-16662) adds exactly 1 (16661) to the MONSTER objective keyed by that entry. Its criteria call (16658) is not part of this note.
- `Player::UpdateQuestObjectiveProgress` (16704) runs per call, in this order for each matching objective:
  1. Find every objective registered under the key (objective type, object id) (16738). The registry is a multimap filled when a quest is added: `Player::AddQuest` (14785) inserts one entry per objective (14811). The same registry is rebuilt from the database on login (19639; not read in full). So one kill reaches every active quest that counts that creature.
  2. Raid rule: for types that cannot always progress in a raid (16745), skip when the player is in a raid group and the quest is not allowed in that raid (16746-16747). Which types are exempt was not read.
  3. Skip the objective if `IsQuestObjectiveCompletable` is false (16751). That check holds the sequence rule (17118-17150): a sequenced objective is not completable until the objectives before it, back to the previous sequenced one, are complete or optional, and that previous sequenced objective is complete. A progress-bar objective is delegated to the bar (17100-17114).
  4. Proxy rule: if the quest has `QUEST_FLAGS_EX_NO_CREDIT_FOR_PROXY` (16754), a MONSTER objective with an empty victim GUID is skipped (16755). So proxy kill-credit counts only on quests without the flag.
  5. If the objective was already complete and the change is non-negative, skip (16758-16759).
  6. Store: for a count objective (MONSTER is one), the new progress is `clamp(current + addCount, 0, Amount)` (16776), written to the quest-log slot (16777). The current value is only changed if it is below Amount for a positive change, or above 0 for a negative one (16774). A progress message is sent unless the objective hides it (16778; `SendQuestUpdateAddCredit` at 16788, body not read).
  7. Recompute completion: for MONSTER, complete means progress is at least Amount (16793 calls `IsQuestObjectiveComplete`, which for MONSTER returns false while progress is below Amount, 17189-17190).
  8. Effects: when the objective becomes complete and has a completion effect (16888), it may trigger a game event, a spell, a conversation, a phase update or a zone-aura update. Read in outline only.
  9. Quest state: if the objective is now complete and `CanCompleteQuest(questId, objective->ID)` is true, call `CompleteQuest` (16902-16905). Otherwise, if the objective is required (not optional) and the quest is in the complete state, call `IncompleteQuest` (16907-16908). So a negative change can take a finished quest back to incomplete.
- Completion gate, `Player::CanCompleteQuest` (14515): a quest can complete only when every required objective (not optional, not progress-bar) is complete (14540-14545). The objective that was just changed is skipped in this check (14540) because it was just found complete. It also returns false when the quest needs an explore event that has not happened and when it has a time limit whose timer is 0 (14550-14554).
- Other types also call `UpdateQuestObjectiveProgress`: learned spells (Player.cpp 3125), items (16589), kill labels and player kills (16643, 16667), and currency, reputation and money (16687-16701). Only the MONSTER path above was read end to end.
- Tick: none. This is event-driven. Each server kill calls the chain once. There is no per-frame loop in this code.

Numbers in one place: per kill, the victim's own entry gets +1, each non-zero proxy slot (at most 2) gets +1, each label gets +1 (16636-16643, 16661). Each objective is clamped to the range 0 to Amount (16776). Amount is the quest's data field (QuestDef.h 483, default 0). A finished objective takes no further positive credit (16759).

## 2. Key functions

- `Player::UpdateQuestObjectiveProgress`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 16704-16920. The whole fan-out: index lookup, raid skip, completable skip, proxy skip, finished skip, clamp and store, completion effects, complete or reopen.
- `Player::KilledMonster` and `Player::KilledMonsterCredit`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 16630-16662. Main entry, then proxy slots, then labels, each as one progress call.
- `KillRewarder::_RewardKillCredit` and `_RewardPlayer`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/KillRewarder.cpp` 177-218. The credit gate (180) and the PvE branch (203-215).
- `KillRewarder::Reward` and `_RewardGroup`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/KillRewarder.cpp` 220-281. Loops over killers (256), group members at reward distance (246), solo killer (279).
- `Player::CanCompleteQuest`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 14515-14560. Completion gate with the ignored objective id (14540).
- `Player::IsQuestObjectiveCompletable`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 17100-17157. Sequence rule and progress-bar delegation.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One kill fans out to every active objective that counts that target | Registry keyed by (objective type, object id), a multimap (theirs, Player.h 640) |
| Credit per kill is a fixed count of 1 | `1` in `KilledMonsterCredit` (theirs, Player.cpp 16661) |
| A creature can credit up to two other entries with no victim | `MAX_KILL_CREDIT = 2` (theirs, CreatureData.h 426; field at 492) |
| Proxy credit can be switched off per quest | Quest flag bit `QUEST_FLAGS_EX_NO_CREDIT_FOR_PROXY` (theirs, QuestDef.h 266) |
| Progress is clamped to [0, target]; the target is the objective's Amount | `Amount` default 0 (theirs, QuestDef.h 483); no other constant |
| A finished objective ignores positive credit, but a negative change can reopen it | The `addCount >= 0` test (16759); no constant |
| Quest completes only when all required objectives are done | Optional and progress-bar flags (theirs, Player.cpp 14543) |
| Sequenced objective counts only after the objectives before it | Flag `QUEST_OBJECTIVE_FLAG_SEQUENCED` (theirs, QuestDef.h 384; check at Player.cpp 17142) |
| Kill credit gate: no group, or alive, or no corpse | Rule only, not a number (KillRewarder.cpp 180) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: index lookup, completable (sequence) skip, proxy skip, finished skip, clamp and store, then complete or reopen. It is for ONE player (the donor stores progress per player in quest-log slots; the sketch keeps the count on the objective). It omits the raid skip, progress-bar objectives, spawn tracking, completion effects (spells, game events, conversations), the same-faction player-kill filter, the other objective kinds (items, currency, reputation, money, area triggers), the client progress message, the quest time-limit and explore checks in `CanCompleteQuest`, and the donor's walk back to the last sequenced objective (the sketch checks only the previous one in list order). The proxy rule is written for monster objectives only, which is all the index holds here.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Obj = {
  id: number;
  targetId: number;      // creature entry this objective counts
  amount: number;        // count required (data)
  optional: boolean;
  sequenced: boolean;    // counts only after the previous objective is done
  progress: number;
};

type Quest = {
  id: number;
  objectives: Obj[];
  complete: boolean;
  noProxyCredit: boolean; // quest flag: proxy credit (no real victim) is ignored
};

type KillEvent = {
  creatureEntry: number;
  killCredit: number[];   // proxy entries on the creature template (at most 2)
  victimId: string | null; // null for proxy credit
};

// One index for all active quests: target id -> every objective that counts it.
const index = new Map<number, Array<{ quest: Quest; obj: Obj }>>();

function acceptQuest(q: Quest): void {
  for (const obj of q.objectives) {
    const list = index.get(obj.targetId) ?? [];
    list.push({ quest: q, obj });
    index.set(obj.targetId, list);
  }
}

function sequenceOpen(q: Quest, obj: Obj): boolean {
  const i = q.objectives.indexOf(obj);
  if (i === 0 || !obj.sequenced) return true;
  const prev = q.objectives[i - 1];
  return prev.optional || prev.progress >= prev.amount;
}

function questCanComplete(q: Quest, ignoredObjId: number): boolean {
  return q.objectives.every(o => o.id === ignoredObjId || o.optional || o.progress >= o.amount);
}

function report(_q: Quest, _o: Obj): void {
  // client progress message would go here
}

function creditObjective(targetId: number, add: number, victimId: string | null): void {
  for (const { quest, obj } of index.get(targetId) ?? []) {
    if (quest.noProxyCredit && victimId === null) continue;
    if (!sequenceOpen(quest, obj)) continue;
    const wasDone = obj.progress >= obj.amount;
    if (wasDone && add >= 0) continue;                      // a finished objective takes no more credit
    obj.progress = Math.min(Math.max(obj.progress + add, 0), obj.amount); // clamp to [0, amount]
    report(quest, obj);
    if (obj.progress >= obj.amount) {
      if (questCanComplete(quest, obj.id)) quest.complete = true;
    } else if (quest.complete && !obj.optional) {
      quest.complete = false;                               // a removed item or undone kill reopens the quest
    }
  }
}

// Called once per server-verified kill: the main entry gets credit with the victim, then each proxy entry without one.
function onKill(ev: KillEvent): void {
  creditObjective(ev.creatureEntry, 1, ev.victimId);
  for (const proxy of ev.killCredit.slice(0, 2)) creditObjective(proxy, 1, null);
}
```

## 5. Lands in

- TARGET `origins/server/quest-objectives.ts` (new module, proposed; the Frankendom tree was not read): one objective index from target id to objectives, credited once per server kill event from the engine's kill step. The brief names `src/fight/` as the fight module; that engine kill step was not read for this note.
- Parity-checklist row 18 (loot roll and XP award): the kill reward step is where this credit is given, and the quest objective is a second consumer of the same server kill.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger and server-verified kills (the credit is written once, on the server, from the kill event); zones as data (objective amounts and flags are zone data, not engine constants).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the lines.
- Progress lives per player in quest-log slots. Frankendom has one character and one ledger, so the per-player map collapses to one count per objective. Do not copy the slot storage.
- Who gets credit differs. The donor credits every party member at reward distance (KillRewarder.cpp 246) who passes the gate at 180, not only the attackers. Frankendom's rule is the attackers of the fight, capped at MAX_ATTACKERS = 3. The donor's distance and group rules must not be ported as they are. Frankendom needs its own rule for who is credited and a test for it.
- Proxy credit (the two kill-credit slots, 16638-16641) only matters if a boss or summon can credit another entry. Leave it out unless zones need it; the flag is data.
- Sequencing: the sketch checks only the previous objective in list order, while the donor walks back over the objectives to the last sequenced one (17118-17150, read in full). A zone contract with a sequence needs the full walk.
- Not read: `CompleteQuest` (14893) and `IncompleteQuest` (14921) bodies, which is what a quest completion does to rewards and the log; `SendQuestUpdateAddCredit` (body); the spawn-tracking block (16840-16871, outline only); completion-effect side effects (16888 onward, outline only); `IsAtGroupRewardDistance` (definition); the list of objective types that can progress in a raid.
- Credit source: in this path credit is written by the server kill reward (KillRewarder), not by a client packet. I did not check every path that calls `UpdateQuestObjectiveProgress`.
- Dialogue was not examined for this note: the gossip menu code (`Entities/Creature/GossipDef.cpp`, `Handlers/NPCHandler.cpp`) and quest offer or request dialogue were not read. The note covers the objective ledger only.
- The quest XP formula (`Quest::XPValue`, QuestDef.cpp 433-476, with `RoundXPValue` at 849-858) is a separate progression mechanism. It is not covered in this note and would need its own cell.

Best transferable idea: One index from a target id to every active objective that counts it, credited exactly once per server kill, clamped to the target, and ignored once finished, with the quest completing only when every required objective is done.

Decision (proposed): adapt — the fan-out index, the clamp and the finished-skip are the shape Frankendom needs for zone contracts (one ledger, server-verified kills); drop the WoW raid, proxy and quest-log-slot parts unless zones need them, and write Frankendom's own attacker-credit rule.

Acceptance: In a zone contract "clear 3 boars", the tracker reads 2/3 after the second boar dies and the contract completes on the server at the third kill; a fourth boar kill leaves it at 3/3 (a server test asserts progress never passes the target and a finished objective takes no more credit).
