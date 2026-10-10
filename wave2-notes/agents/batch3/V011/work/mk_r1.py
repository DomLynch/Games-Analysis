import csv
N="TrinityCore-TrinityCore"
P="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/"
rows=[
("kill entry credited through KilledMonsterCredit","Entities/Player/Player.cpp",16636,"KilledMonsterCredit(cInfo->Entry, creature->GetGUID());"),
("proxy KillCredit entries credited with empty guid","Entities/Player/Player.cpp",16640,"KilledMonsterCredit(cInfo->KillCredit[i], ObjectGuid::Empty);"),
("MONSTER objective credited by 1 per call","Entities/Player/Player.cpp",16661,"UpdateQuestObjectiveProgress(QUEST_OBJECTIVE_MONSTER, entry, 1, guid);"),
("kill credit gate: no group, or alive, or no corpse","Entities/Player/KillRewarder.cpp",180,"if (!player->GetGroup() || player->IsAlive() || !player->GetCorpse())"),
("kill credit calls KilledMonster on the victim","Entities/Player/KillRewarder.cpp",184,"player->KilledMonster(target);"),
("kill credit only on the non-PvP, non-BG branch","Entities/Player/KillRewarder.cpp",203,"if (!_isPvP || _isBattleGround)"),
("kill credit is one call inside the non-BG branch","Entities/Player/KillRewarder.cpp",215,"_RewardKillCredit(player);"),
("group members in reward distance get rewarded","Entities/Player/KillRewarder.cpp",246,"if (killer == member || member->IsAtGroupRewardDistance(_victim))"),
("every killer is iterated","Entities/Player/KillRewarder.cpp",256,"for (Player* killer : _killers)"),
("solo killer path","Entities/Player/KillRewarder.cpp",279,"_RewardPlayer(killer, false);"),
("index type: multimap keyed by (type, object id)","Entities/Player/Player.h",640,"using QuestObjectiveStatusMap = std::unordered_multimap<"),
("index filled when quest is added","Entities/Player/Player.cpp",14811,"m_questObjectiveStatus.emplace(std::make_pair(QuestObjectiveType(obj.Type), obj.ObjectID)"),
("AddQuest function that fills the index","Entities/Player/Player.cpp",14785,"void Player::AddQuest(Quest const* quest, Object* questGiver)"),
("fan-out: every objective matching (type, id)","Entities/Player/Player.cpp",16738,"MapEqualRange(m_questObjectiveStatus, { objectiveType, objectId })"),
("update function signature","Entities/Player/Player.cpp",16704,"void Player::UpdateQuestObjectiveProgress(QuestObjectiveType objectiveType"),
("raid restriction skip","Entities/Player/Player.cpp",16746,"if (GetGroup() && GetGroup()->isRaidGroup() && !quest->IsAllowedInRaid"),
("skip objective that is not completable (sequence, progress bar)","Entities/Player/Player.cpp",16751,"if (!objective || !IsQuestObjectiveCompletable(logSlot, quest, *objective))"),
("proxy credit blocked by the quest flag","Entities/Player/Player.cpp",16754,"if (quest->HasFlagEx(QUEST_FLAGS_EX_NO_CREDIT_FOR_PROXY))"),
("proxy credit has no victim guid in the skip","Entities/Player/Player.cpp",16755,"if (objective->Type == QUEST_OBJECTIVE_MONSTER && victimGuid.IsEmpty())"),
("finished objective takes no more positive credit","Entities/Player/Player.cpp",16759,"if (objectiveWasComplete && addCount >= 0)"),
("current progress read from the quest slot","Entities/Player/Player.cpp",16773,"int32 currentProgress = GetQuestSlotObjectiveData(logSlot, *objective);"),
("progress clamped to [0, Amount]","Entities/Player/Player.cpp",16776,"int32 newProgress = std::clamp<int32>(currentProgress + addCount, 0, objective->Amount);"),
("progress stored","Entities/Player/Player.cpp",16777,"SetQuestObjectiveData(*objective, newProgress);"),
("quest completes only if other required objectives are done","Entities/Player/Player.cpp",16904,"if (CanCompleteQuest(questId, objective->ID))"),
("CompleteQuest call","Entities/Player/Player.cpp",16905,"CompleteQuest(questId);"),
("reopen branch for a required objective","Entities/Player/Player.cpp",16907,"else if (!(objective->Flags & QUEST_OBJECTIVE_FLAG_OPTIONAL)"),
("IncompleteQuest call","Entities/Player/Player.cpp",16908,"IncompleteQuest(questId);"),
("MONSTER completion: progress below Amount is not complete","Entities/Player/Player.cpp",17189,"if (GetQuestSlotObjectiveData(slot, objective) < objective.Amount)"),
("CanCompleteQuest ignores the objective just completed","Entities/Player/Player.cpp",14540,"if (ignoredQuestObjectiveId && obj.ID == ignoredQuestObjectiveId)"),
("CanCompleteQuest requires every other objective complete","Entities/Player/Player.cpp",14545,"if (!IsQuestObjectiveComplete(q_status.Slot, qInfo, obj))"),
("sequence: previous objective must be done or optional","Entities/Player/Player.cpp",17137,"objectiveSequenceSatisfied = IsQuestObjectiveComplete(slot, quest, previousObjective)"),
("sequence flag branch","Entities/Player/Player.cpp",17142,"if (objective.Flags & QUEST_OBJECTIVE_FLAG_SEQUENCED)"),
("objective Amount field","Quests/QuestDef.h",483,"int32  Amount       = 0;"),
("sequenced flag bit","Quests/QuestDef.h",384,"QUEST_OBJECTIVE_FLAG_SEQUENCED"),
("MONSTER objective type value 0","Quests/QuestDef.h",354,"QUEST_OBJECTIVE_MONSTER                 = 0,"),
("no-proxy-credit quest flag bit","Quests/QuestDef.h",266,"QUEST_FLAGS_EX_NO_CREDIT_FOR_PROXY"),
("two kill-credit slots on the creature template","Entities/Creature/CreatureData.h",492,"uint32  KillCredit[MAX_KILL_CREDIT];"),
("MAX_KILL_CREDIT is 2","Entities/Creature/CreatureData.h",426,"const uint8 MAX_KILL_CREDIT = 2;"),
("kill credit addKillCount is 1","Entities/Player/Player.cpp",16648,"uint16 addKillCount = 1;"),
]
out=[]
for claim,f,line,q in rows:
    assert 15<=len(q)<=90 or len(q)<15 and False, (claim,len(q))
    out.append((N,claim,P+f,str(line),q))
with open("/private/tmp/p2/wave2-haiku/batch3/V011/receipts-part1.tsv","w") as fh:
    fh.write("note\tclaim\tdonor_file\tline\tquote\n")
    for r in out:
        fh.write("\t".join(r)+"\n")
for r in out:
    flag = "" if 15<=len(r[4])<=90 else "  <-- LEN"
    print(len(r[4]), r[3], r[4][:60], flag)
