import sys
Q="/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Quests/"
C="/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Char/"
K="/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/NPChar/"
P="/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/"
rows=[
("AAEmu-AAEmu","Overall status: non-selective takes the lowest act status, selective the highest",Q+"NewQuestCode.cs",289,"(QuestObjectiveStatus)Math.Min((byte)totalResultStatusMin"),
("AAEmu-AAEmu","Overall status uses Max for selective quests",Q+"NewQuestCode.cs",288,"Math.Max((byte)totalResultStatusMin, (byte)totalResultStatusMax)"),
("AAEmu-AAEmu","No objectives in the Progress step counts as QuestComplete",Q+"NewQuestCode.cs",208,"return QuestObjectiveStatus.QuestComplete;"),
("AAEmu-AAEmu","Overachieved threshold for LetItDone acts is Count * 3 / 2 (integer division)",Q+"NewQuestCode.cs",258,"questComponentAct.Template.Count * 3 / 2)"),
("AAEmu-AAEmu","CanEarlyComplete threshold for LetItDone acts is Count * 1 / 2 (integer division)",Q+"NewQuestCode.cs",271,"questComponentAct.Template.Count * 1 / 2)"),
("AAEmu-AAEmu","Progress step moves to Ready when objectives complete",Q+"NewQuestCode.cs",124,"Step = QuestComponentKind.Ready;"),
("AAEmu-AAEmu","LetItDone quests are forced forward only by report acts",Q+"QuestStep.cs",127,"LetItBeDone type of quests, are always forced forward using the Report Acts"),
("AAEmu-AAEmu","Reward ratio for NotReady is 0 (LetItDone only)",Q+"Quest.cs",356,"QuestRewardRatio = 0f;"),
("AAEmu-AAEmu","Reward ratio for CanEarlyComplete is 0.3",Q+"Quest.cs",359,"QuestRewardRatio = 0.3f;"),
("AAEmu-AAEmu","Reward ratio for Overachieved is 1.2",Q+"Quest.cs",368,"QuestRewardRatio = 1.2f;"),
("AAEmu-AAEmu","XP reward is pool times ratio, rounded with C# Math.Round",Q+"Quest.cs",388,"var xp = (int)Math.Round(QuestRewardExpPool * QuestRewardRatio);"),
("AAEmu-AAEmu","Copper reward is credited through ChangeMoney from SlotType.None",Q+"Quest.cs",399,"Owner.ChangeMoney(SlotType.None, SlotType.Inventory, copper);"),
("AAEmu-AAEmu","MaxObjective: LetItDone cap is ceil(Count * 3 / 2)",Q+"Templates/QuestActTemplate.cs",111,"(int)Math.Ceiling(val * 3f / 2f) : val : 1;"),
("AAEmu-AAEmu","MaxObjective method signature",Q+"Templates/QuestActTemplate.cs",105,"public virtual int MaxObjective()"),
("AAEmu-AAEmu","AddObjective clamps the counter at the maximum",Q+"Templates/QuestActTemplate.cs",165,"quest.Objectives[ThisComponentObjectiveIndex] = maxValue;"),
("AAEmu-AAEmu","Monster hunt adds the kill count to the objective",Q+"Acts/QuestActObjMonsterHunt.cs",46,"AddObjective(questAct, (int)args.Count);"),
("AAEmu-AAEmu","Talk objective sets the counter to 1 when the talk event matches",Q+"Acts/QuestActObjTalk.cs",51,"SetObjective(questAct, 1);"),
("AAEmu-AAEmu","Talk objective has an open TODO for range",Q+"Acts/QuestActObjTalk.cs",72,"// TODO: Range check?"),
("AAEmu-AAEmu","Talk event looks up the NPC by the client-sent object id",P+"Core/Managers/QuestManagerEvents.cs",132,"var npc = ((Character)sourcePlayer).ParentWorld.GetNpc(npcObjId);"),
("AAEmu-AAEmu","Talk packet from the client starts DoTalkMadeEvents",P+"Core/Packets/C2G/CSQuestTalkMadePacket.cs",27,"QuestManager.Instance.DoTalkMadeEvents(Connection.ActiveChar"),
("AAEmu-AAEmu","Early turn-in packet calls TryCompleteQuestAsLetItDone",P+"Core/Packets/C2G/CSTryQuestCompleteAsLetItDonePacket.cs",29,"Connection.ActiveChar.Quests.TryCompleteQuestAsLetItDone(_id, _selected);"),
("AAEmu-AAEmu","Early turn-in target check is skipped when no target or object id 0",P+"Core/Packets/C2G/CSTryQuestCompleteAsLetItDonePacket.cs",25,"&& Connection.ActiveChar.CurrentTarget != null"),
("AAEmu-AAEmu","Early turn-in gate: status must reach CanEarlyComplete",C+"CharacterQuests.cs",653,"if (quest.GetQuestObjectiveStatus() < QuestObjectiveStatus.CanEarlyComplete)"),
("AAEmu-AAEmu","Early turn-in is allowed only for LetItDone quests",C+"CharacterQuests.cs",650,"if (quest.Template.LetItDone == false)"),
("AAEmu-AAEmu","Early turn-in sets Step to Reward",C+"CharacterQuests.cs",658,"quest.Step = QuestComponentKind.Reward;"),
("AAEmu-AAEmu","Quest queue: evaluation is de-duplicated",P+"Core/Managers/QuestManager.cs",144,"if (!EvaluationQueue.Contains(quest))"),
("AAEmu-AAEmu","Quest queue drains on a 1 ms task",P+"Core/Managers/QuestManager.cs",150,"TimeSpan.FromMilliseconds(1));"),
("AAEmu-AAEmu","Evaluation flag enqueues only after initialization",Q+"Quest.cs",172,"if (value && _questInitializationFinished)"),
("AAEmu-AAEmu","RequestEvaluation sets the flag",Q+"Quest.cs",482,"RequestEvaluationFlag = true;"),
("AAEmu-AAEmu","NPC report uses CanEarlyComplete for LetItDone quests",Q+"Acts/QuestActConReportNpc.cs",48,"? QuestObjectiveStatus.CanEarlyComplete"),
("AAEmu-AAEmu","Aggro rank: the rating is read from GetAggroRatingInPercent",Q+"Acts/QuestActObjAggro.cs",68,"var aggroRate = npc.GetAggroRatingInPercent(q.Owner.ObjId);"),
("AAEmu-AAEmu","Aggro rank 1 check",Q+"Acts/QuestActObjAggro.cs",75,"if (aggroRate <= Rank1)"),
("AAEmu-AAEmu","Aggro rank 1 reward ratio is Rank1Ratio / 100",Q+"Acts/QuestActObjAggro.cs",78,"q.QuestRewardRatio = Rank1Ratio / 100.0;"),
("AAEmu-AAEmu","Aggro rating doc: 0 = most aggro (comment)",K+"Npc.cs",1356,"0 = most aggro, 100 = least aggro"),
("AAEmu-AAEmu","Aggro rating sorts ascending by total aggro",K+"Npc.cs",1360,"var sortedAggro = AggroTable.OrderBy(x => x.Value.TotalAggro).ToList();"),
("AAEmu-AAEmu","Aggro rating returns position over count times 100",K+"Npc.cs",1375,"return 1f / sortedAggro.Count * pos;"),
("AAEmu-AAEmu","Total aggro is damage plus heal aggro",K+"Aggro.cs",41,"return _damageAggro + _healAggro;"),
("AAEmu-AAEmu","Heal aggro is 0.6 of the healed amount",K+"Aggro.cs",53,"_healAggro += (int)(amount * 0.6f);"),
("AAEmu-AAEmu","Npc death: base DoDie (which fires OnKill) runs before the aggro table is cleared",K+"Npc.cs",1023,"base.DoDie(killer, killReason);"),
("AAEmu-AAEmu","Npc death: aggro table cleared after base DoDie",K+"Npc.cs",1024,"ClearAllAggroTargetsAndCheckCombatState();"),
("AAEmu-AAEmu","Unit death fires OnKill for the killer",P+"Models/Game/Units/Unit.cs",456,"killerUnit?.Events.OnKill(this, new OnKillArgs"),
]
out=sys.argv[1]
with open(out,"a") as f:
    for r in rows:
        assert all("\t" not in str(x) for x in r), r
        f.write("\t".join(str(x) for x in r)+"\n")
print(len(rows),"appended")
