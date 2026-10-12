# Gap check WF (world fiction: names, signs, rumours, barks, standing words, journal and ending cards)
Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 517b32248 (read-only). Donor notes: 20 (WF001 to WF010, two donors each), grouped by theme below.

## Summary for Dom
1. Frankendom already has the plumbing for world fiction: a choice-list talk module with once-only lines, a quest journal, faction standing with attitude words, a legends table of original backstories, and a zone-name event on the phone preview. What is missing is the voice: no name grammar, no signs, no rumours, no zone cards, no barks on a schedule.
2. Counts (21 table rows; Angband is split in two): REUSE 5, REUSE plus a small add 1, ADD 12, SKIP 3. The notes fold into 5 builds (G1 to G5).
3. Top 3 additions: (a) G1 name pools as data (two-word place names, a tier prefix that also appears on the drop, shopkeeper names), seeded so the same zone always reads the same; (b) G2 rumours and barks: one server schedule, a no-repeat cycle per creature, a weighted pick that favours live news, a rumour that points at a real nearby entrance; (c) G3 a 2-3 line zone card and template signs placed by category, on the existing zone event.
4. Rulings that cut donor ideas: no free text where a player can write into the world (living-world.md:72) kills the editable shared book (ACE); collect-N stays banned (living-world.md:12) kills the running kill-count line; legends must come from public-domain sources (src/legends.ts:3-7).
5. Licence note: EQEmu, ACE, AzerothCore, CMaNGOS, ModernUO, OpenDAoC, l1j, OpenMW, Cataclysm (CC BY-SA) and AAEmu (conflicting) are copyleft; the two Fallout engines carry a restricted Sustainable Use licence; shape only, no donor numbers or text in this file. Evennia (BSD), 2004Scape and Daggerfall Unity and OpenTESArena (MIT) code could be named with numbers, but their game text is unlicensed, so all words must be ours. Licence lines for Angband, Crawl, Shattered Pixel Dungeon and OpenGothic were not in my extract.

## What we have today (shared by all rows)
- Talk: origins/talk/talk.ts. Lines carry priority, `once`, conditions; `available` hides said once-lines (talk.ts:83-85), `choices` lists them (88), `pick` plays one reply and applies effects (92-106). Example NPC in origins/talk/fixtures.ts (Orla the smith).
- Journal: origins/quests/journal.ts, `Journal` type (:16), append-only `entries` text per stage (:31), `advance` along transitions (:38).
- Standing and attitude: origins/contracts/world.ts. Faction definition with directional `reactions` (:255-263), `FactionStanding` with an `expelled` flag (:265-273), `adjustStanding` clamps (339), `attitudeFor` bands to hostile / angry / neutral / friendly (341), `attitudeOf` makes an expelled member at best angry (349).
- Feuds and alerts: origins/feuds/feuds.ts: notoriety bands SUSPECT, WANTED, HUNTED (:46-48), decay 100 a day (:44), same-trade alert spread (:76), `Town` and `Npc` rows (:85-87).
- Legends: src/legends.ts. 10 opponents x 10 rungs of original backstory (:16, :22), `legendAt` and `legendForLevel` (:146-151). Header states public-domain-source rule and "text only; no fight number reads this".
- Region 1 figures with a source line: origins/region1/content.ts:29 (`figure` helper), e.g. :87-93. Zone names are data: origins/region1/world.ts (names on each zone row).
- Zone announcement on the phone preview: origins/preview/main.ts:289-294 (`showZone` dispatches `origins:zone` with the zone's name and ambience preset).
- Seeded determinism: origins/world/generate.ts:1-4 (same template and seed give the same zone). 
- Ending-style line today: src/victory-headline.ts (look test: first line that holds wins; nothing earned means nothing said).
- Spec only: town history book (living-world.md section 6), plaques and statues from templates (section 7.4), `book-has` bark condition (section 5), faction standing and notoriety records (section 5).
- Nothing found for: name pools, signs, rumour pools, zone cards, crier schedule, map reveal. Grep of origins and src for rumour/rumor and bark found only spec text and the patron data comments, not a system.

## Gap table
| Donor note | Idea in 8 words | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| Angband (1) | Unknown item shows a pool word | No unidentified items in code or specs read | Identification not a feature | SKIP (not ruled; take-one loot shows the item) | n/a |
| Angband (2) | Race-chain backstory; named shop owners | legends.ts backstories (:22) | Owners and chained backstory for town NPCs | REUSE legends.ts; shopkeeper names via G1 | origins/region1/content.ts figure rows |
| Crawl | Heard-versus-seen wording of one event | none | Off-screen cue line becomes named creature when seen | ADD (G2) | new origins/fiction/barks data; hook on origins:zone pattern (main.ts:293) |
| Shattered Pixel | 2-3 line zone card; chained note set | showZone name only (main.ts:289-294); journal entries (journal.ts:31) | No card text; no per-NPC chained notes | ADD card (G3); journal REUSE | origins/preview/main.ts; origins/quests/journal.ts |
| Cataclysm | Signs placed by map category; weighted name templates | none | No sign rows; no name templates | ADD (G1, G3) | origins/world/schema.ts new `signs` group |
| EQEmu | One action ripples a web of linked standings | reactions are directional data (world.ts:263), adjustStanding (339) | No function that moves linked factions | ADD (G4) | origins/contracts/world.ts next to adjustStanding |
| Evennia | Two-voice sign; world remembers what you looked at | talk state flags per character (talk.ts:84-85) | Needs a sign template with a second voice | REUSE flags; sign text via G3 | origins/talk/talk.ts |
| AAEmu | Five-seat jury sets sentence grade | fixed jail seconds in feuds.ts (JAIL_S, :71) | PvP jury is a different game | SKIP | n/a |
| ACE | Shared editable book; running kill-count line | none | Free text banned (living-world.md:72); collect-N banned (:36) | SKIP | n/a |
| AzerothCore | Per-creature no-repeat bark cycle | none (talk.ts has said-once lines only, :83) | No random bark with memory of last | ADD (G2) | new bark pool + `told` set pattern from talk.ts |
| CMaNGOS | Team-wide alarm when the other side hurts the city | alert spread (feuds.ts:76) | Mechanism exists; no player-visible alarm line | REUSE feuds alert; line comes from history book (G2) | origins/feuds/feuds.ts |
| ModernUO | Crier bulletin on a fixed schedule; barkeeper rumour slots | none | One server schedule, not a timer per NPC | ADD (G2) | new origins/fiction/ ; server tick |
| OpenDAoC | Standing word on examine; zone-entry line | attitudeFor (world.ts:341); showZone (main.ts:289) | Words exist; examine card does not show them | REUSE; small UI add (G4) | origins/preview/main.ts |
| 2004Scape | Sign = name + one line; rumour as topic choice | talk.ts choice list (:88-92) | Zone voice rows (world rule, identity, gate) missing | REUSE talk.ts; ADD zone voice (G3) | origins/talk/talk.ts + zone row |
| l1j | Corruption prefix on creature and its drop | none | Tier prefix not carried onto loot names | ADD (G1) | origins/mobs/kits.ts (not opened); loot names in src/loot.ts (not opened) |
| Daggerfall Unity | Two-word names; rumour weighted to live news; reputation propagates | none; reputation propagation not in contracts/world.ts (read 255-360) | Name pools, rumour weight, propagation | ADD (G1, G2, G4) | as G1, G2, G4 |
| OpenMW | Signed pair table; worst standing wins; expelled drops out | reactions + expelled rule (world.ts:263, 349) | "Worst standing wins" for an NPC with many factions | REUSE; ADD the rule (G4) | origins/contracts/world.ts |
| OpenTESArena | Two-list sign names; rumour names real nearby entrance | none | Needs landmark names (schema layout, world/schema.ts:52) | ADD (G1, G2) | origins/world/schema.ts landmarks |
| Fallout 1 | Town appears on map after visit or story flag | none | No discovery state or map | ADD (G5) | origins/quests/journal.ts flag; map UI new file |
| OpenGothic | Witness reacts one beat later; two-section journal | journal.ts entries (:31) | Witness delay presentation | ADD delay (G4); journal REUSE | origins/feuds/feuds.ts events |
| Fallout 2 | Stacked data rows write the ending card | victory-headline.ts first-wins (src/victory-headline.ts:1-5) | Cards stack instead of first-wins | ADD small (G5); SKIP the voiced movie | src/victory-headline.ts |

## Merged additions (one build each)
- G1 Name and sign grammar (Cataclysm, l1j, Daggerfall Unity, OpenTESArena, Angband owners). Word pools as data rows, drawn with the seeded generator (origins/world/generate.ts), so a zone reads the same every visit. Place name = two-part grammar; a short label that fits 375 wide; a tier prefix on the creature that is repeated on its drop. Words are original and public-domain (legends rule, src/legends.ts:3-7). No real-place or living-religion names.
- G2 Rumours and barks (Crawl, AzerothCore, ModernUO, Daggerfall Unity, OpenTESArena, CMaNGOS). One server schedule for criers; per-creature no-repeat; pick weighted toward live events (rifts, war goals); rumour points at a real nearby landmark; heard-versus-seen wording pair; templates filled with ids, no free text.
- G3 Zone card and placed signs (Shattered Pixel, 2004Scape, Evennia, Cataclysm). A 2-3 line card on the zone event; signs and plaques from fixture templates by category (living-world.md section 7.4); one prop line per prop; second-voice sign as a template field.
- G4 Standing ripple and witnesses (EQEmu, Daggerfall Unity, OpenMW, OpenGothic, OpenDAoC). Linked-faction ripple function, worst standing wins, attitude word on the examine card, witness reaction one tick later as presentation. Server clamps, client only draws; no NPC changes power from a meeting (living-world.md design line).
- G5 Discovery and cards (Fallout 1 and 2). Zone shows on the map after a visit or a flag; end-of-fight card rows stack; no voiced movie.

## Could not verify
- Whether src/loot.ts or origins/mobs/kits.ts has any naming or tier-prefix code: not opened.
- Whether a death or post-fight card exists beyond victory-headline.ts (src/scorecard.ts, src/first-loss.ts): names seen, files not opened.
- Licence for Angband, Crawl, Shattered Pixel Dungeon, OpenGothic: not in my extract of the notes.
- The note sections beyond Keep/Change and "what the player sees" were read as extracts, not in full.
