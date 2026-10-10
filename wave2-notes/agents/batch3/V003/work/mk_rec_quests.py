import sys
Q="/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/QuestManager.cs"
E="/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Managers/EmoteManager.cs"
D="/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Database/Models/World/Quest.cs"
P="/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/PropertyManager.cs"
C="/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Chest.cs"
G="/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Network/GameAction/Actions/GameActionTalkDirect.cs"
rows=[
("CanSolve is the gate entry point and returns true only when the wait is MinValue",Q,273,"var canSolve = nextSolveTime == TimeSpan.MinValue;"),
("CanSolve entry point is public bool CanSolve(string questFormat)",Q,266,"public bool CanSolve(string questFormat)"),
("GetNextSolveTime returns MaxValue (cannot solve) when the quest is not in the world catalogue",Q,340,"return TimeSpan.MaxValue;   // world quest not found - cannot solve it"),
("GetNextSolveTime returns MinValue (solve now) when the player has no record of the quest",Q,344,"return TimeSpan.MinValue;   // player hasn't completed this quest yet"),
("max-solves cap is checked before the cooldown",Q,346,"if (quest.MaxSolves > -1 && playerQuest.NumTimesCompleted >= quest.MaxSolves)"),
("cooldown: next solve = LastTimeCompleted + MinDelta times the quest_mindelta_rate scale",Q,353,"(uint)(quest.MinDelta * PropertyManager.GetDouble(\"quest_mindelta_rate\", 1).Item)"),
("ColoArena quests are exempt from the rate scale (unscaled MinDelta)",Q,355,"nextSolveTime = playerQuest.LastTimeCompleted + quest.MinDelta;"),
("ColoArena exemption test is by quest name prefix",Q,325,"if (quest.Name.StartsWith(\"ColoArena\"))"),
("cooldown elapsed test is currentTime >= nextSolveTime",Q,357,"if (currentTime >= nextSolveTime)"),
("Update creates the record with NumTimesCompleted = 1 on first solve (entry point)",Q,172,"public void Update(string questFormat)"),
("Update refuses a further solve once IsMaxSolves is true",Q,196,"if (IsMaxSolves(questName))"),
("Update increments the solve count on a repeat solve",Q,204,"quest.NumTimesCompleted++;"),
("Stamp calls Update and does not itself check the cooldown (caller must)",Q,487,"Update(questName);  // ??"),
("SetQuestCompletions clamps the count to MaxSolves when MaxSolves is set",Q,226,"Math.Min(questCompletions, maxSolves)"),
("SetQuestBits reuses NumTimesCompleted as a bit field",Q,677,"questBits |= bits;"),
("SetQuestBits writes back through SetQuestCompletions",Q,684,"SetQuestCompletions(questFormat, questBits);"),
("catalogue field MinDelta is documented as minimum time between completions",D,22,"Minimum time between Quest completions"),
("catalogue field MaxSolves is documented as maximum completions",D,27,"Maximum number of times Quest can be completed"),
("global cooldown scale quest_mindelta_rate defaults to 1.0",P,662,"new Property<double>(1.0, \"scales all quest min delta time between solves, 1 being normal\")"),
("InqQuest/InqMyQuest success is has-quest AND on cooldown",E,631,"success = hasQuest && !canSolve;"),
("the InqQuest success rule carries its own verify comment",E,630,"QuestSuccess = player has quest, but their quest timer is currently still on cooldown"),
("UpdateQuest on an existing quest stamps only when CanSolve is true",E,1482,"var canSolve = questTarget.QuestManager.CanSolve(questName);"),
("emote-set RNG keeps sets with Probability above the roll and orders them ascending",E,1549,"emoteSet.Where(e => e.Probability > rng).OrderBy(e => e.Probability)"),
("GetEmoteSet returns the first of that ordering (lowest threshold above the roll)",E,1553,"return emoteSet.FirstOrDefault();"),
("non-nested emote sets are dropped while the NPC is busy",E,1584,"if (IsBusy && !nested) return false;"),
("loop guard: Nested > 75 on a self-named branching quest set aborts the chain",E,1607,"if (Nested > 75 && !string.IsNullOrEmpty(emoteSet.Quest)"),
("talk-to-NPC text routes to the ReceiveTalkDirect emote category keyed by the message",E,2049,"ExecuteEmoteSet(EmoteCategory.ReceiveTalkDirect, message, player);"),
("talk entry point is OnTalkDirect(Player player, string message)",E,2047,"public void OnTalkDirect(Player player, string message)"),
("the direct-talk game action calls OnTalkDirect",G,50,"creature.EmoteManager.OnTalkDirect(session.Player, message);"),
("quest chest gate: opens only if CanSolve is true, else HandleSolveError",C,154,"if (player.QuestManager.CanSolve(Quest))"),
("OnQuest is the item/NPC quest-interaction entry point",E,2021,"public void OnQuest(Creature initiator)"),
("kill-task path stamps after a has-quest check only (no cooldown check)",Q,608,"Stamp(killQuestName);"),
("SetQuestBits starts from the same NumTimesCompleted field",Q,674,"if (quest != null) questBits = quest.NumTimesCompleted;"),
]
out=["note\tclaim\tdonor_file\tline\tquote"]
for claim,path,line,quote in rows:
    assert "\t" not in quote and "\t" not in claim
    out.append("\t".join(["ACEmulator-ACE",claim,path,str(line),quote]))
open(sys.argv[1],"w").write("\n".join(out)+"\n")
print(len(rows))
