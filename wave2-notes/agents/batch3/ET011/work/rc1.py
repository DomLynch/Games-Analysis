import csv
N="electronicarts-CnC_Remastered_Collection"
F="/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/"
rows=[
("claim: AI is the per-tick production step", F+"FACTORY.CPP", 231, "void FactoryClass::AI(void)"),
("claim: the step is taken only when the stage timer fires", F+"FACTORY.CPP", 266, "if (!Has_Completed() && Graphic_Logic()) {"),
("claim: cost per step is Cost_Per_Tick", F+"FACTORY.CPP", 269, "int cost = Cost_Per_Tick();"),
("claim: cost is capped at remaining balance", F+"FACTORY.CPP", 271, "cost = MIN(cost, Balance);"),
("claim: funds check before paying", F+"FACTORY.CPP", 279, "if (cost > House->Available_Money()) {"),
("claim: insufficient funds rolls the stage back one", F+"FACTORY.CPP", 280, "Set_Stage(Fetch_Stage()-1);"),
("claim: installment is spent from the house", F+"FACTORY.CPP", 282, "House->Spend_Money(cost);"),
("claim: balance reduced by installment", F+"FACTORY.CPP", 283, "Balance -= cost;"),
("claim: completion check at STEP_COUNT", F+"FACTORY.CPP", 291, "if (Fetch_Stage() == STEP_COUNT) {"),
("claim: completion spends any remainder", F+"FACTORY.CPP", 294, "House->Spend_Money(Balance);"),
("claim: human acceleration uses factory count", F+"FACTORY.CPP", 254, "stages = House->UnitFactories;"),
("claim: at least one stage per call", F+"FACTORY.CPP", 261, "stages = MAX(stages, 1);"),
("claim: price = cost x CostBias at creation", F+"FACTORY.CPP", 402, "Balance = object.Cost_Of() * house.CostBias;"),
("claim: start check: humans start without funds, AI needs one installment", F+"FACTORY.CPP", 540, "if (House->IsHuman || House->Available_Money() >= Cost_Per_Tick()) {"),
("claim: rate = build time / STEP_COUNT", F+"FACTORY.CPP", 549, "time /= STEP_COUNT;"),
("claim: rate bounded 1..255", F+"FACTORY.CPP", 550, "time = Bound(time, 1, 255);"),
("claim: rate set on start", F+"FACTORY.CPP", 552, "Set_Rate(time);"),
("claim: abandon refund basis is full price x CostBias", F+"FACTORY.CPP", 588, "int money = Object->Class_Of().Cost_Of() * Object->House->CostBias;"),
("claim: abandon refunds price minus balance", F+"FACTORY.CPP", 589, "House->Refund_Money(money - Balance);"),
("claim: cost per tick divides balance by remaining steps", F+"FACTORY.CPP", 724, "int steps = STEP_COUNT - Fetch_Stage();"),
("claim: divide by remaining steps", F+"FACTORY.CPP", 726, "return(Balance / steps);"),
("licence: GPL v3 statement in header", F+"FACTORY.CPP", 5, "software: you can redistribute it and/or modify it under the terms of"),
("licence: version 3 with later versions", F+"FACTORY.CPP", 7, "either version 3 of the License, or (at your option) any later version."),
("theirs constant: STEP_COUNT=108", F+"FACTORY.H", 97, "// Number of steps to break production down into."),
("claim: stage timer advances stage when it expires", F+"STAGE.H", 71, "bool Graphic_Logic(void) {"),
("claim: timer expiry test", F+"STAGE.H", 74, "if (!StageTimer) {"),
("claim: expiry advances stage and resets timer to rate", F+"STAGE.H", 76, "StageTimer = Rate;"),
("claim: Set_Rate sets rate and timer", F+"STAGE.H", 69, "void Set_Rate(unsigned char rate) {Rate = StageTimer = rate;};"),
("claim: harvest adds to storage, capped", F+"HOUSE.CPP", 1722, "Tiberium += tiberium;"),
("claim: storage cap", F+"HOUSE.CPP", 1723, "if (Tiberium > Capacity) {"),
("claim: overflow sets maxed flag", F+"HOUSE.CPP", 1725, "IsMaxedOut = true;"),
("claim: stat counts full harvest even when storage capped", F+"HOUSE.CPP", 1727, "HarvestedCredits += tiberium;"),
("claim: money = storage + credits", F+"HOUSE.CPP", 1750, "return(Tiberium + Credits);"),
("claim: spend takes storage first", F+"HOUSE.CPP", 1775, "if ((int)money > Tiberium) {"),
("claim: remainder comes from credits", F+"HOUSE.CPP", 1776, "money -= (unsigned)Tiberium;"),
("claim: credits debited", F+"HOUSE.CPP", 1778, "Credits -= money;"),
("claim: refund goes to credits", F+"HOUSE.CPP", 1808, "Credits += money;"),
("theirs constant: cost bias from difficulty", F+"HOUSE.CPP", 251, "CostBias = hptr->CostBias * Rule.Diff[handicap].CostBias;"),
("theirs constant: cost bias from difficulty (no house type)", F+"HOUSE.CPP", 261, "CostBias = Rule.Diff[handicap].CostBias;"),
("theirs constant: REDALERT STEP_COUNT=54 (grep only)", "/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/REDALERT/FACTORY.H", 96, "// Number of steps to break production down"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/ET011/receipts.tsv","w",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    w.writerow(["note","claim","donor_file","line","quote"])
    for claim,fp,ln,q in rows:
        assert "\t" not in q and 15<=len(q)<=90, (claim,len(q))
        w.writerow([N,claim,fp,ln,q])
print(len(rows))
