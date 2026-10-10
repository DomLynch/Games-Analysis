# Replica of LootManager::checkLoot selection (LootManager.cpp 346-388), item_find=0, level/status pass.
# Entry: (name, chance, max_drops_left). Pushed only if max_drops_left != 0, but the threshold update
# (lines 364-371) runs BEFORE that check, so an exhausted entry still narrows the threshold.
def pick_candidates(entries, roll, item_find=0.0):
    threshold = item_find + 100.0
    possible = []
    for name, chance_base, max_left in entries:
        real = chance_base * (item_find + 100.0) / 100.0
        if real >= roll:
            if real <= threshold:
                if real != threshold:
                    possible.clear()
                threshold = real
            if roll <= threshold and max_left != 0:
                possible.append(name)
    return possible

cases = [
  ("A50,B30,C80 (C after min)", [("A",50,-1),("B",30,-1),("C",80,-1)]),
  ("C80,B30 (min last)",        [("C",80,-1),("B",30,-1)]),
  ("A50,B30 exhausted (max 0)", [("A",50,-1),("B",30,0)]),
]
for label, ents in cases:
    print(f"{label:30s} roll=20 -> {pick_candidates(ents, 20.0)}")
