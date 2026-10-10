import sys,csv
G="freeorion-freeorion"; R="/mnt/frankendom-donors/freeorion-freeorion/"
rows=[
("queue spend allocator signature","Empire/ResearchQueue.cpp",21,"void SetTechQueueElementSpending("),
("epsilon tolerance 0.01","Empire/ResearchQueue.cpp",15,"constexpr float EPSILON = 0.01f;"),
("only researchable, unpaused elements get RP","Empire/ResearchQueue.cpp",46,"if (researchable && !elem.paused) {"),
("remaining need = cost minus progress","Empire/ResearchQueue.cpp",58,"const auto RPs_needed = tech_cost - progress*tech_cost;"),
("per-turn cap = cost / max(1, min turns)","Empire/ResearchQueue.cpp",59,"const auto RPs_per_turn_limit = tech_cost / std::max(1, tech_min_turns);"),
("spend the smaller of need and cap","Empire/ResearchQueue.cpp",60,"return static_cast<float>(std::min(RPs_needed, RPs_per_turn_limit));"),
("full allocation while the pool fits","Empire/ResearchQueue.cpp",63,"if (total_RPs_spent + RPs_to_spend <= RPs - EPSILON) {"),
("full allocation assigned","Empire/ResearchQueue.cpp",64,"elem.allocated_rp = RPs_to_spend;"),
("partial allocation takes the leftover","Empire/ResearchQueue.cpp",68,"elem.allocated_rp = RPs - total_RPs_spent;"),
("not researchable this turn gets 0","Empire/ResearchQueue.cpp",75,"// item can't be researched this turn"),
("cost and min-turns pair (min 1 turn)","Empire/ResearchQueue.cpp",210,"return {static_cast<float>(cost), std::max(1, time)};"),
("ETA horizon 500 turns","Empire/ResearchQueue.cpp",165,"constexpr int TOO_MANY_TURNS = 500;"),
("queue Update signature","Empire/ResearchQueue.cpp",137,"void ResearchQueue::Update(float RPs,"),
("per-turn cost = cost / max(1, time)","universe/Tech.cpp",396,"return ResearchCost(empire_id, context) / std::max(1, ResearchTime(empire_id, context));"),
("PerTurnCost signature","universe/Tech.cpp",395,"float Tech::PerTurnCost(int empire_id, const ScriptingContext& context) const"),
("cheap-and-fast rule forces cost 1","universe/Tech.cpp",371,"if (GetGameRules().Get<bool>(\"RULE_CHEAP_AND_FAST_TECH_RESEARCH\")"),
("completion check in CheckResearchProgress","Empire/Empire.cpp",2289,"if (tech_cost - EPSILON <= progress * tech_cost) {"),
("progress stored as a fraction of cost","Empire/Empire.cpp",2287,"progress += elem.allocated_rp / std::max(EPSILON, tech_cost);"),
("CheckResearchProgress signature","Empire/Empire.cpp",2262,"std::vector<std::string> Empire::CheckResearchProgress("),
("sanitise queue before progress","Empire/Empire.cpp",2266,"SanitizeResearchQueue(m_research_queue);"),
("leftover RP after queue","Empire/Empire.cpp",2296,"float rp_left_to_spend = total_rp_available - spent_rp;"),
("auto-fill skips finished techs","Empire/Empire.cpp",2327,"if (progress_fraction >= 1.0)"),
("auto-fill sorted by remaining cost","Empire/Empire.cpp",2342,"std::stable_sort(costs_to_complete_available_unpaused_techs.begin(),"),
("auto-fill loop cheapest first","Empire/Empire.cpp",2347,"for (auto const& [tech_cost, tech_name] : costs_to_complete_available_unpaused_techs) {"),
("auto-fill stops when no RP is left","Empire/Empire.cpp",2348,"if (rp_left_to_spend <= EPSILON)"),
("auto-fill per-turn limit from PerTurnCost","Empire/Empire.cpp",2358,"const float RPs_per_turn_limit = tech->PerTurnCost(m_id, context);"),
("auto-fill increase is the minimum of three limits","Empire/Empire.cpp",2369,"const float progress_increase = std::min("),
("auto-fill adds fraction to progress","Empire/Empire.cpp",2375,"m_research_progress[tech_name_str] += progress_increase;"),
("research pool update then queue update","Empire/Empire.cpp",2942,"UpdateResearchQueue(context, research_costs);"),
("UpdateResearchQueue passes pool total","Empire/Empire.cpp",3001,"m_research_queue.Update(m_research_pool.TotalAvailable(), m_research_progress,"),
("progress fraction to RP for UI","Empire/Empire.cpp",636,"return it->second * tech_cost;"),
("server applies progress after allocation","server/ServerApp.cpp",4512,"const auto new_techs = empire->CheckResearchProgress(m_context, costs_times);"),
("GPL version 2 or later in default/COPYING","default/COPYING",111,"as published by the Free Software Foundation; either version 2"),
("README states source is GPL v2","README.md",148,"The FreeOrion *source code* is licensed under the terms of [GPL v2],"),
]
out=[]
for claim,f,line,q in rows:
    out.append((G,claim,R+f,str(line),q))
with open(sys.argv[1],"w") as fh:
    fh.write("note\tclaim\tdonor_file\tline\tquote\n")
    for r in out: fh.write("\t".join(r)+"\n")
for r in out:
    if not (15<=len(r[4])<=90): print("LEN",len(r[4]),r[1])
print(len(out),"receipts")
