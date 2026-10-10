# ACEmulator-ACE: creature-grammar (CG003)

Depth: thin. Half read: server (code only). The data half is not in the repo.
Donor tree (VPS, read-only): /mnt/frankendom-donors/ACEmulator-ACE/
Asset audit used first: AU002 (no creature art or audio in the repo; client data absent).

## Why thin
- The creature rows (stats, body parts, loot lists, spawn tables) are world content. The repo does not carry them: Database/Base/WorldBase.sql holds 29 CREATE TABLE statements and no INSERT statements (count by grep). Database/Updates/World has one file (updates.txt). Database/Updates/Shard has 33 patch files; the ones read by name are item or spell fixes, none is a creature family.
- So the family grammar below is what the server code supports. It is not a census of ACE's monsters.

## 1. What the player sees and feels (375 wide)
Not read as a visual: the repo has no creature art. What the code says a player sees is a creature whose attack picks a visible zone (a cone aimed at a body part) and whose corpse keeps the same look (palette and shade copied on death). The feel, from code only, is "the thing you hit is the thing that dies, with its colours still on it". Not verified on a screen.

## 2. Why it works / is striking
- Readable telegraph: an attack cone that names one zone can be shown as a single highlight at 375 wide.
- One signature: the look carries over to the corpse and to the loot, so a kill reads as a continuation.
- Could be made ours at 20-30 percent resemblance: a species list plus per-species rows is a generic grammar. Our species and zones are ours.

## 3. The rule behind it
- A creature is one species id plus a set of per-creature rows (biota), not one class per creature. The server classes (Creature, Monster, Creature_Melee, Monster_Melee) are generic and read the rows.
- Species list: CreatureType enum, 103 entries including Invalid, so 102 species (Source/ACE.Entity/Enum/CreatureType.cs, line 3 onwards).
- Body parts: each creature carries body parts. Each part has a damage type, a damage value, a variance fraction, a base armour, eight armour values by damage type, a hit-height weight, and twelve hit-zone weights (three heights by two sides by front or back). 25 fields in total (Source/ACE.Entity/Models/PropertiesBodyPart.cs, lines 7-33).
- Attack choice: if the attack cone names a part index, that part is used. Special attacks use the breath part. Otherwise a random part with non-zero damage is used (Source/ACE.Server/WorldObjects/Monster_Melee.cs, around lines 590-602).
- Look: palette template and shade are set on the creature and copied to the corpse on death (Source/ACE.Server/WorldObjects/Creature_Death.cs, lines 473-476). Clothing sets the same two properties (Source/ACE.Server/WorldObjects/Clothing.cs, lines 41-42).
- Shade as drop chance: on create-list rows whose destination is treasure, a non-zero shade is used as a probability, handled in 0-1 chunks (Source/ACE.Server/WorldObjects/Creature_Equipment.cs, around lines 645-700).
- Combat body parts: the CombatBodyPart enum has 28 entries including Undefined, with wings, tails, tentacles, horns and so on (Source/ACE.Entity/Enum/CombatBodyPart.cs, line 4 onwards).
- Factories/Tables holds 27 table files for chances (armour type, gear rating, spell level, treasure profiles, weapon type and so on). Names only were read.

## 4. Frankendom mapping
- 700 zones as data: a species row plus a body-part table is the right shape for "100 Pit characters reused across zones", if each character is one species row with its own palette and zones.
- Many vs one (max 3 attackers): a three-zone body (head, body, legs) is the phone-sized version of the 12-zone hit map. Keep the telegraph, drop the 12-zone math.
- Server verified: attack zone and damage are decided on the server; the client draws the telegraph and the hit. The look (palette id and shade) is data the client reads.
- Keep: species id plus palette; corpse inherits look; attack cone telegraph; a small damage variance per part; shade as a 0-1 drop probability on loot rows.
- Change: 12 hit zones become 3 on a phone; 8 armour types become our 3 damage families; world rows live in our store, not in SQL patch files; species names are not reused.

## 5. Five-minute look test (for Dom, on his phone)
One creature at 375 wide, shown twice: once with a plain strike, once with a three-zone telegraph (head, body, legs) that lights the zone 0.5 seconds before the hit. Dom answers: can he tell which zone is coming in under one second, and does the corpse look like the same creature. Build only the telegraph and the palette copy; no new art.

## 6. Licence and IP
- Code: GNU AFFERO GPL v3 (LICENSE lines 1-2; Source/lib/README.md line 1 says the ACE DLLs are AGPLv3). The Lifestoned DLL is MIT (Source/lib/README.md line 9).
- Assets and content: no asset licence anywhere in the repo; SQL content has no licence line (AU002). Client data is not in the repo.
- README statements (AU002): "educational and non-commercial purposes only" (README line 19); trademark line recorded as the file states (line 20). No legal reading.
- Status: class C for the content; class D for client data. Inspiration only, at category level: "a three-zone telegraph", "a corpse that keeps its palette". No species names, no stat rows, no SQL values, no body-part numbers as donor values.

## 7. Gaps
- Not read: any creature row (absent), the Factories/Tables bodies beyond names, Monster AI and Monster_Tick bodies, Creature_BodyPart armour arithmetic beyond signatures, Mods folder, Lifestoned DLL and ACE DLLs (code, not inspected), the 107 .txt files, client data (not in repo).
- Counts above are grep or enum-line counts, not a runtime census.
