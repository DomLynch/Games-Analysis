import csv, os
C="/mnt/frankendom-donors/colyseus-colyseus/"
R=C+"packages/core/src/Room.ts"
rows=[
("setFixedTimestep is the fixed-step entry point","setFixedTimestep signature",R,1021,"public setFixedTimestep(step: FixedTimestepCallback"),
("default tick rate derives from the 60 Hz simulation interval","default tickRate",R,1021,"tickRate: number = Math.round(1000 / DEFAULT_SIMULATION_INTERVAL)"),
("default simulation interval is 60 Hz","DEFAULT_SIMULATION_INTERVAL",R,58,"const DEFAULT_SIMULATION_INTERVAL = 1000 / 60;"),
("default patch rate is 20 Hz (50 ms)","DEFAULT_PATCH_RATE",R,57,"const DEFAULT_PATCH_RATE = 1000 / 20;"),
("sub-steps default to 1 when not declared","subSteps default","%s",1028,"?? this._inputController?.options.subSteps ?? 1;"),
("step ms derives from tickRate","stepMs",R,1024,"const stepMs = 1000 / tickRate;"),
("tick rate advertised to predicting clients","options.tickRate set",R,1032,"this._inputController.options.tickRate = tickRate;"),
("catch-up cap is 5 steps","MAX_CATCHUP_STEPS",R,1051,"const MAX_CATCHUP_STEPS = 5;"),
("sub-step dt is dt divided by subSteps","subDt",R,1049,"subDt: stepSeconds / subSteps"),
("fixed-step loop is a setInterval","setInterval for fixed step",R,1053,"this._simulationInterval = setInterval(() => {"),
("each fire ticks the clock and accumulates the delta","accumulate",R,1055,"acc += this.clock.deltaTime;"),
("whole fixed steps run while the accumulator holds a step","while loop",R,1059,"while (acc >= stepMs && ran < MAX_CATCHUP_STEPS) {"),
("accumulator subtracts one step per run","subtract",R,1061,"ctx.tick = tick++;"),
("hitch drops the backlog after the cap","backlog drop",R,1065,"// hitch: drop backlog, don't spiral"),
("variable-step contrast passes the measured delta","setTimestep callback",R,952,"onTickCallback(this.clock.deltaTime);"),
("variable timestep is documented as the measured delta","doc: variable timestep",R,926,"the MEASURED wall-clock delta since the previous tick (a VARIABLE timestep)."),
("patch loop is a separate interval","patch interval",R,540,"this.#_patchInterval = setInterval(() => this.broadcastPatch()"),
("doc: hitch runs a few catch-up steps then drops the backlog","doc hitch",R,991,"On a hitch the accumulator runs at most a few catch-up steps then drops the"),
("doc: one input per entity per step","doc input consume",R,1000,"Shared world* (one solver step advances every body): consume exactly one"),
("take(n) reads the oldest inputs","InputBuffer take",C+"packages/core/src/input/InputBuffer.ts",353,"Consume up to `n` oldest inputs"),
("example room uses setFixedTimestep at 30 Hz","caller example",C+"packages/testing/test/app1/RoomWithFixedTimestep.ts",17,"this.setFixedTimestep((_ctx: StepContext) => { this.state.steps++; }, 30);"),
("Room imports the clock from @colyseus/timer","clock import",R,9,"import { ClockTimer as Clock } from '@colyseus/timer';"),
("licence: MIT copyright line","licence",C+"LICENSE",1,"Copyright (c) 2015-2026 Endel Dreyer"),
("licence: MIT permission text","licence text",C+"LICENSE",5,"Permission is hereby granted, free of charge, to any person obtaining a copy"),
]
out="/private/tmp/p2/wave2-haiku/batch3/Q040/receipts.tsv"
with open(out,"a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    for claim,name,path,ln,q in rows:
        if path=="%s": path=R
        w.writerow(["colyseus-colyseus",claim,path,ln,q])
print("rows",len(rows))
