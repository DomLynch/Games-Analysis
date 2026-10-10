import csv
S="/mnt/frankendom-donors/Blizzard-s2client-api/src/sc2api/"
rows=[
("StepAgents is the barrier; step then wait per agent","CoordinatorImp::StepAgents","sc2_coordinator.cc",285,"void CoordinatorImp::StepAgents() {"),
("StepAgents sends Step with step_size","step_size request","sc2_coordinator.cc",301,"control->Step(process_settings_.step_size);"),
("StepAgents waits per agent, return value not checked","WaitStep call","sc2_coordinator.cc",302,"control->WaitStep();"),
("single agent steps inline","agents_.size()==1 branch","sc2_coordinator.cc",308,"if (agents_.size() == 1) {"),
("several agents run through RunParallel","RunParallel call","sc2_coordinator.cc",312,"RunParallel(step_agent, agents_);"),
("RunParallel comment: all steps in parallel","RunParallel","sc2_coordinator.cc",22,"// Run all steps in parallel."),
("RunParallel starts one thread per agent","thread per agent","sc2_coordinator.cc",26,"threads[i] = std::thread(std::bind(step, a));"),
("single-thread mode runs OnStep serially after the barrier","serial CallOnStep branch","sc2_coordinator.cc",315,"if (!process_settings_.multi_threaded) {"),
("CallOnStep ends the game for agents not in game","CallOnStep game-over check","sc2_coordinator.cc",122,"if (!control->IsInGame()) {"),
("CallOnStep issues events before sending actions","IssueEvents call","sc2_coordinator.cc",129,"control->IssueEvents(action->Commands());"),
("Update chooses realtime or step path","Coordinator::Update","sc2_coordinator.cc",766,"bool Coordinator::Update() {"),
("Update calls the realtime stepper","realtime branch","sc2_coordinator.cc",769,"imp_->StepAgentsRealtime();"),
("Update calls the step barrier","step branch","sc2_coordinator.cc",772,"imp_->StepAgents();"),
("default step_size 1 and realtime false","ProcessSettings default args","sc2_coordinator.cc",195,"process_settings_(false, 1,"),
("SetTimeoutMS writes the timeout","timeout setter","sc2_coordinator.cc",886,"imp_->process_settings_.timeout_ms = timeout_ms;"),
("realtime path polls observation without a step","GetObservation in realtime","sc2_coordinator.cc",357,"control->GetObservation();"),
("Step sends a RequestStep with a count","Step count","sc2_client.cc",1751,"step->set_count(count);"),
("WaitStep blocks on a response","WaitStep wait","sc2_client.cc",1760,"GameResponsePtr response = WaitForResponse();"),
("WaitStep returns false on a null response","null check","sc2_client.cc",1761,"if (!response.get() || !response->has_step() || response->error_size() > 0) {"),
("IssueEvents is gated on the game loop changing","loop gate","sc2_client.cc",2143,"if (observation_imp_->current_game_loop_ == observation_imp_->previous_game_loop) {"),
("IssueEvents calls the user OnStep last","OnStep call","sc2_client.cc",2160,"client_.OnStep();"),
("proto wait uses the default timeout","Receive with timeout","sc2_proto_interface.cc",126,"if (!connection_.Receive(response, default_timeout_ms_)) {"),
("proto wait comment: timeout means null response","timeout comment","sc2_proto_interface.cc",127,"// If the receive fails, it means a timeout has occurred."),
("default proto timeout is 120000 ms","kDefaultProtoInterfaceTimeout","include/sc2api/sc2_proto_interface.h",13,"const unsigned int kDefaultProtoInterfaceTimeout = 120000;"),
("Receive waits on a condition variable with a timeout","wait_until","sc2_connection.cc",170,"if (condition_.wait_until("),
("Receive timeout path clears the queue","queue clear","sc2_connection.cc",182,"queue_.clear();"),
("Receive timeout path runs the timeout callback","timeout callback","sc2_connection.cc",186,"timeout_callback_();"),
("civetweb websocket timeout option","WEBSOCKET_TIMEOUT_MS","sc2_connection.cc",20,"static const char* WEBSOCKET_TIMEOUT_MS"),
("caller drives the loop with Update","example loop","examples/bot_mp.cc",53,"while (coordinator.Update() && !do_break) {"),
("licence: MIT copyright line","licence","LICENSE",1,"Copyright (c) 2017 Blizzard Entertainment"),
]
import os
out="/private/tmp/p2/wave2-haiku/batch3/Q040/receipts.tsv"
exists=os.path.exists(out)
with open(out,"a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    if not exists: w.writerow(["note","claim","donor_file","line","quote"])
    for claim,name,fn,ln,q in rows:
        path=S+fn if not fn.startswith("LICENSE") and not fn.startswith("examples") and not fn.startswith("include") else "/mnt/frankendom-donors/Blizzard-s2client-api/"+fn
        if fn.startswith("sc2_"): path=S+fn
        if fn.startswith("include/"): path="/mnt/frankendom-donors/Blizzard-s2client-api/"+fn.replace("include/sc2api/","include/sc2api/")
        w.writerow(["Blizzard-s2client-api",claim,path,ln,q])
print("rows",len(rows))
