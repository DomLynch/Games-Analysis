N="TrinityCore-TrinityCore"
P="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/"
rows=[
("reputation to dead players and corpses (comment)","Entities/Player/KillRewarder.cpp",173,"// Even dead players and corpses are rewarded."),
("registry rebuilt from DB on login","Entities/Player/Player.cpp",19639,"m_questObjectiveStatus.emplace(std::make_pair(QuestObjectiveType(obj.Type), obj.ObjectID)"),
("time limit with timer zero blocks completion","Entities/Player/Player.cpp",14553,"if (qInfo->GetLimitTime() && q_status.Timer == 0)"),
("progress-bar objective delegated","Entities/Player/Player.cpp",17114,"return IsQuestObjectiveCompletable(slot, quest, *progressBarObjectiveItr)"),
("progress changes only in the allowed direction","Entities/Player/Player.cpp",16774,"if (addCount > 0 ? (currentProgress < objective->Amount) : (currentProgress > 0))"),
("progress message sent unless hidden","Entities/Player/Player.cpp",16788,"SendQuestUpdateAddCredit(quest, victimGuid, *objective, newProgress);"),
("completion recomputed after the store","Entities/Player/Player.cpp",16793,"objectiveIsNowComplete = IsQuestObjectiveComplete(logSlot, quest, *objective);"),
("completion effects branch","Entities/Player/Player.cpp",16888,"if (objectiveIsNowComplete && objective->CompletionEffect)"),
("sequence walk: first sequenced objective check","Entities/Player/Player.cpp",17118,"if (!objectiveIndex)"),
("learned spell is another objective type","Entities/Player/Player.cpp",3125,"UpdateQuestObjectiveProgress(QUEST_OBJECTIVE_LEARNSPELL, spell_id, 1);"),
("item objective type call","Entities/Player/Player.cpp",16589,"UpdateQuestObjectiveProgress(QUEST_OBJECTIVE_ITEM, itemTemplate->GetId(), count"),
("player-kill objective call","Entities/Player/Player.cpp",16667,"UpdateQuestObjectiveProgress(QUEST_OBJECTIVE_PLAYERKILLS, 0, 1, victimGuid);"),
("CompleteQuest defined (body not read)","Entities/Player/Player.cpp",14893,"void Player::CompleteQuest(uint32 quest_id)"),
("IncompleteQuest defined (body not read)","Entities/Player/Player.cpp",14921,"void Player::IncompleteQuest(uint32 quest_id)"),
]
out=[]
with open("/private/tmp/p2/wave2-haiku/batch3/V011/receipts.tsv","a") as fh:
    for claim,f,line,q in rows:
        flag = "" if 15<=len(q)<=90 else "  <-- LEN"
        print(len(q), line, flag, q[:50])
        fh.write("\t".join((N,claim,P+f,str(line),q))+"\n")
