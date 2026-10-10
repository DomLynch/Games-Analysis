## 5. Lands in

- TARGET `src/fight/progression.ts` (new module; the engine owns XP, level and the level-up offer; the Pit and zones are clients). Parity-checklist row 18 (loot roll and XP award): the XP award and the level-up it triggers.
- Sub-line for row 18: XP award is applied once, server side, after the kill is verified; the level-up log is derived from the XP before and after.

## 6. Gaps and risks

- Licence GPL-2.0: clean-room only. The sketch is written from the described mechanism; no donor line is translated.
- The donor's hash uses `std::hash` (engine/rand.h 263), which is implementation-defined, and its draw is PCG32 with a bounded integer method (engine/rand.cpp 33-83). Frankendom needs one fixed, portable integer hash and PRNG shared by server and client, or the offers will differ between them.
- The catch-up loop writes temporary XP values into the hero (heroes.cpp 1490) before each level-up. That is a side effect on the ledger. Frankendom should compute the level-up list as a pure function of (XP before, XP after, seed) and write the final XP once.
- Server-verified: the donor has no server. Frankendom must check that a human's pick is one of the offers the server sent (the offer is recomputed from state, so the server must hold the same state the client saw).
- The seed mixes current stats, so any other rule that changes stats (items, buffs, a stat reset) changes all later offers. Frankendom must list the mixing order in the catalogue (rows 20-21) and test it, or offers will drift.
- Zones as data: the XP threshold table and the 1.2 growth rule are one progression curve for every zone, so they are engine constants. Primary weights, boundary level, secondary weights and the 8-skill cap are per class and belong in the class catalogue, not in zone data. These are the donor's values; Frankendom's curve and caps are its own ruling and must be set by a designer.
- The forced Wisdom rule removes a player choice on a schedule. Frankendom should decide whether any forced offer is wanted before it copies the rule.
- Not read: the human dialog body (`Dialog::LevelUpSelectSkill`) and the AI planner (`AI::Planner::pickSecondarySkill`). The AI and human choice rules are therefore unknown from this read.
- Frankendom's MAX_ATTACKERS = 3 has no counterpart here; not applicable to progression.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: one ledger (XP is stored once and level-ups are derived from XP and a seed); server-verified progression (the server re-derives the offer and rejects a pick outside it).
