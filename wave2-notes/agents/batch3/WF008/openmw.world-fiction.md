# openmw (world-fiction, cell WF008)

Donor: /mnt/frankendom-donors/openmw (read-only, VPS). Code licence: GPLv3 (README.md:9; LICENSE:1 is the GPL v3 text), per AU039. Shape only, clean-room: no code, names or text may be copied. Asset licences per AU039 (fonts OFL or custom; textures and layouts have no licence of their own).
Checked: opened apps/openmw/mwmechanics/mechanicsmanagerimp.cpp (disposition code, about lines 490-545), apps/openmw/mwdialogue/dialoguemanagerimp.cpp (setFactionReaction and getFactionReaction, lines 706-743), components/esm3/loadfact.hpp (faction record shape: the struct declarations at lines 20-35 and 55-92), apps/openmw/mwmechanics/npcstats.hpp (declarations, by grep). npcstats.cpp: grep hits only for expell, getExpelled, the reputation accessors and the clamp line; I did not read those bodies in full. Grep only (not read in body): apps/openmw/mwlua/factionbindings.cpp, apps/opencs/model/world/nestedcoladapterimp.cpp, components/esm3/loadfact.cpp. Confidence: high on the faction-reaction code I opened; the defect below reads correctly from the code but I did not run it.
Verdict: STRONG for the faction-reaction map (one piece of the cell). NONE for naming grammar, rumour pool and sign text in this box: the Morrowind records that hold them are not in the box, and grep found no rumour or name-generation code in the engine paths I searched (components/esm4 has rumour-type dialogue, but that is another game's record reader and I did not read it).
Half read: client (engine code and Lua and UI files). Data half (Morrowind ESM records, including FACT, BOOK, names and rumour topics): not in the box (AU039). Server half: not applicable (single-player).

## 1. What the player sees and feels
An NPC's attitude toward you is not one number. It is set by the player's standing with the NPC's faction: a faction you have joined and not been expelled from speaks for the NPC directly; otherwise the NPC looks at the player's least-liked faction and reacts to that. You see it as a shift in how willing someone is to talk, trade or help, with a faint personality term added. Being expelled from one faction makes that faction stop counting in the next attitude calculation.

## 2. Why it works, or is striking
- Readable at 375 wide: the result is a single disposition number. Whatever the faction logic, the player sees a short label, not the arithmetic.
- One signature behaviour: a faction pair table holds a signed reaction per pair, so a rival faction can be liked by one group and hated by another without any extra rule.
- One signature sound: not in this topic.
- Could be made ours at 20-30 percent resemblance: yes. The idea is a signed table plus "take the worst of your standings". Keep the shape, change every value.

## 3. The rule behind it
- Record shape (components/esm3/loadfact.hpp): each faction holds ten rank records (mRankData, line 61) with two attribute levels, a primary and a favoured skill level and a required faction reputation; a reaction map from faction id to a signed int (mReactions, line 80); ten rank names (mRanks, line 83); a flag for hidden factions.
- Player standing (mechanicsmanagerimp.cpp, about 496-527): if the NPC's primary faction is one the player is in and not expelled, the reaction is the faction's reaction to itself and the rank is the player's rank. Otherwise the code walks every faction the player belongs to, skips expelled ones (line 518: "Ignore the faction, if a player was expelled from it."), and keeps the one with the smallest reaction (line 524) and its rank.
- Attitude term (line 540): x += (fDispFactionRankMult * rank + fDispFactionRankBase) * fDispFactionMod * reaction. The GMST values are data and not in the box, so the constants are unknown here.
- Reaction lookup (dialoguemanagerimp.cpp:706-743): a changed value set at runtime (setFactionReaction line 714-722, which writes map[faction2] = absolute) wins; otherwise the faction's own reactions list is searched, and 0 is returned if no entry exists.
- Expulsion (npcstats.cpp:128-132, from grep and a short read): expell() inserts the faction into the expelled set and prints a message; getExpelled() reads it.
- Reputation (npcstats.cpp:328): a single global reputation clamped to 0 through 255 (the code comment says the original engine caps it there).

## 4. For Frankendom
- One ledger: a faction pair table (signed int per pair) lives in data, one row per pair, and the server holds the player's standing per faction. The client gets the derived attitude only.
- 100 Pit characters reused across 700 zones: the attitude of a character to the player comes from its faction, so each character needs one faction id, not a per-zone copy.
- The "least-liked faction wins" rule suits many-vs-one: the group that attacks you can use the worst standing among the group's members, without adding a new combat rule.
- Keep: signed pair table; worst standing wins; expulsion removes a faction from the count; standing changes show as one short label.
- Change: our own ids and values; a clamp on the server; the attitude term is a server formula, not a client value.

## 5. Look test (5 minutes, Dom's phone)
Two NPCs from different factions in one zone, one greeting line each. Change the player's standing with one faction on the server and reload. Dom should see the greeting change in the same direction for both NPCs, and the change should be visible at 375 wide without reading numbers. Compare "worst standing wins" against "primary faction only". No release rows; a style flag only.

## 6. Licence and IP
- Code is GPLv3. Shape only: a signed pair table, worst-standing rule, expulsion. Write our own code from the rule, not from the lines above.
- Content (Morrowind records, names, rumour topics) is not in the box and must not be sought or copied.
- No legal conclusions.

## 7. Gaps, defects and fixes (keep the idea, fix the defect)
Defect (read from the code, not run):
1. mechanicsmanagerimp.cpp:496 starts reaction at 0 and decides "first candidate" by iterator position (line 524: playerFactionIt == begin() || itReaction < reaction). If the first faction in map order is expelled (skipped at line 518-519), the next valid faction is never the first candidate, so it is compared against the starting 0. A valid faction with a reaction above 0 is then ignored, and the result stays reaction 0, rank 0. Fix: keep a found flag and take the first non-expelled faction as the candidate.

Gaps:
- Morrowind data (FACT, GMST values, names, rumours, books) absent from the box.
- Body of npcstats.cpp beyond the sections above; body of factionbindings.cpp (Lua binding for reactions, grep only); components/esm3/loadfact.cpp (grep only).
- Lua scripts (files/data/scripts/omw) do not contain faction logic that I found; I did not read them.
- components/esm4 (other games) has rumour-type records; not read.
- Half read: client engine code and record-reader headers. Data half: absent.

Counts (no Morrowind counts available): mRankData 10 rank records per faction; mRanks 10 names; two attribute levels per rank; skills list of 7 in FADTstruct (loadfact.hpp, mSkills). Those are struct sizes, not content counts.

Best transferable idea: one signed reaction per faction pair, with the NPC's attitude taken from the worst standing among the player's non-expelled factions.
