# id-Software-Quake (boss-staging, feel note, thin, with MG011 dragons and boss abilities)

Donor: /mnt/frankendom-donors/id-Software-Quake (VPS, read-only). Tree contains WinQuake (engine C), QW (QuakeWorld client and server), qw-qc (QuakeWorld QuakeC source) and a compiled QW progs file.
Licence: gnu.txt in the tree is GPL v2. Treat as GPL: shape only, no code copied.

Checked: WinQuake/cl_parse.c 930-955 (svc_intermission, svc_finale, svc_cutscene); WinQuake/screen.c 40 and 125-150 (centre text, print speed); WinQuake/sbar.c 1315-1323 (finale overlay); WinQuake/view.c 833-860 (intermission camera); WinQuake/cl_tent.c 65-101 and 194-290 (beams, explosions); WinQuake/menu.c 2385-2440 (level-name table); qw-qc/doors.qc 425-440 and 527-565 (door data); qw-qc/combat.qc 150-180 (armour absorb); qw-qc/items.qc 405-430 (armour types); qw-qc/client.qc around 223 (intermission sender); qw-qc/defs.qc and QW/progs/defs.qc (message ids); a grep of every .c, .h and .qc in the tree for boss, shambler, chthon, shub, tarbaby, finale and svc_finale. Candidates opened: 11 files. Confidence: high on the code quoted; the boss part is a clear gap, not a finding.

Not read: the single-player game code and its monsters. Verdict for boss-staging: PARTIAL (thin). Half read: both. Client C (WinQuake) and the QuakeWorld server QuakeC (qw-qc). The single-player progs source with the monsters and bosses is not in this tree: no monsters.qc in qw-qc or QW/progs, and the grep found no single-player boss code (only QW stubs, see section 7). Those names appear only as level titles in menu.c.

## 1. What the player sees and feels (375 wide)
At the end of a level the screen goes full-screen and the camera stops moving; the view just idles. Centre text is typed out one character at a time. A finale picture is drawn centred near the top. A lightning bolt is a beam that lasts 0.2 seconds and only stays up while the server keeps sending it again; the local player's own beam follows the player's live position each frame. An explosion flashes a bright light of radius 350 for half a second and plays a blast sound. None of this is a boss fight in this tree.

## 2. Why it works, or is striking
- Readable beat at 375 wide: a typed card after a kill is a clean stop between fights.
- One signature behaviour: a beam that dies on its own unless the server keeps re-sending it, so it stops the moment the server stops.
- One signature sound: the explosion sound with its light flash.
- Could be made ours at 20-30 percent resemblance: a typed end-of-zone card whose text rate is data, and a caster-bound lightning beam for a mage-type foe.
- Weak here: no boss monsters in the tree, so no boss attack or phase behaviour to learn from.

## 3. The rule behind it
Intermission state machine (client, WinQuake/cl_parse.c 937-951): svc_intermission sets the state to 1, svc_finale sets it to 2 and carries a text string, svc_cutscene sets it to 3 and carries a text string. Each one resets the completed time and forces the full-screen view. The QuakeWorld intermission sender is at qw-qc/client.qc:223 and sends the intermission message to all clients.

Centre text (WinQuake/screen.c 135): characters shown = print speed x (time now - time the text started). The print speed is a cvar with default 8 characters per second (screen.c:40). Text types for any nonzero intermission state (SCR_DrawCenterString, screen.c 134-135: `if (cl.intermission)`), so both the finale (2) and cutscene (3) states type it; centre text outside an intermission shows at once.

Lightning beam (WinQuake/cl_tent.c 65-101): a beam message sets an end time 0.2 seconds ahead (cl_tent.c 88 for a beam already on the same entity, 101 for a free beam slot). A new beam message for the same entity resets it, so the beam stays up only while the server keeps sending. In the per-frame update, the start point follows the player's live position only for the local player's own beam (cl_tent.c 330-345 region, not receipted). Three bolt models exist (cl_tent.c 216-227).

Explosion (WinQuake/cl_tent.c 194-203): a particle burst at the point, a light of radius 350, decay 300, dying after 0.5 seconds, and one explosion sound.

Door data (qw-qc/doors.qc 533-562; documented 437-440): speed 100 by default, wait 3 seconds by default (-1 means never return), lip 8 by default, damage 2 when blocked. Key doors always use wait -1.

Armour absorb (qw-qc/combat.qc 160-165; types in qw-qc/items.qc 412, 418, 424): save = ceil(armour fraction x damage), capped at the armour value. Three armour types with fractions 0.3, 0.6 and 0.8. When the armour value runs out, the armour type is cleared.

Data fields (names, unit; donor value null because the donor is GPL):
- finale_print_rate: characters per second. Donor 8. Donor value: null.
- lightning_beam_life: seconds. Donor 0.2. Donor value: null.
- explosion_light_radius: map units. Donor 350. Donor value: null.
- explosion_light_decay: units per second. Donor 300. Donor value: null.
- explosion_light_life: seconds. Donor 0.5. Donor value: null.
- door_speed: units per second. Donor 100. Donor value: null.
- door_wait: seconds (-1 = never return). Donor 3. Donor value: null.
- door_lip: units. Donor 8. Donor value: null.
- armour_fraction: fraction of damage absorbed per type. Donor 0.3, 0.6, 0.8. Donor value: null.

## 4. For Frankendom
- The finale state is a server event (one ledger): the server says "zone cleared" with a text id, and the client types the card. This matches "server-verified events driving client presentation".
- Typing rate is zone data. Eight characters a second is slow on a phone; test a faster rate.
- The 0.2-second beam that only lives while the server re-sends it is a clean model for a persistent lightning spell: it stops the moment the server stops. Use it for MG011 mage-type bosses, not for dragons.
- Door wait -1 for a boss-locked door, with a server event to open it (zone data: speed, wait, lip).
- The armour-fraction table is a data-driven absorb. It is a candidate for the engine's damage stack, not a per-body-part rule.
- Engine rows: row 14 (HUD) for the centre card; row 9 (finishers) only as a stop beat; row 13 (specials) for the beam; row 17 (death and respawn) for the finale card after a loss; row 18 (loot and XP) if the card follows a kill.
- Server tick: fixed step, input intake, per-tick NPC budget. The beam refresh uses this tick.

## 5. Five-minute look test (Dom, on his phone)
Show one end-of-zone card after a kill in the Pit: type at 8 characters per second, then at 24. Compare on a 375-wide screen. Then show a lightning beam from a caster that refreshes each tick and dies 0.2 seconds after the last refresh. Compare with our current spell beam. Target file: src/fight/ (new finale card, server event, not yet built), row 14 (HUD).

## 6. Licence and IP
GPL v2 (gnu.txt in the tree). Shape only. The level names in menu.c are the donor's titles: do not reuse them. Keep the trait (typed card, refresh-to-live beam, data-driven door wait), change the names, text and numbers.

## 7. Gaps
- Boss-related code that does exist: qw-qc/server.qc:30-36 defines the monster_* spawn functions (monster_boss included) as stubs that just remove the entity, so the QuakeWorld server strips single-player monsters; qw-qc/misc.qc:639-651 func_bossgate is a brush model that appears unless all four episode sigils are held (serverflags & 15 == 15). That sigil gate is the only boss staging rule in the tree: a door that stays until a progression flag completes.
- Not in the tree: the single-player monsters and bosses (no monsters.qc, no boss code), the server that sends the finale message (grep of all .c, .h and .qc found no writer of svc_finale or svc_cutscene; the client parses them and the QuakeWorld QC defines the ids only), the end-of-game cutscene text, the map data (the .pak data is not in the tree).
- Read in part: menu.c. The level table has 38 entries (start, 8 in episode 1, 7 in episode 2, 7 in episode 3, 8 in episode 4, the final level, 6 deathmatch levels). The hipnotic and rogue tables were not counted. Level titles are not quoted beyond one example.
- Idle and ambient behaviour for bosses: not in the half I read (no boss monsters). The view idle at the end card is the only ambient behaviour seen (view.c 837-857: the idle scale is forced to 1 during intermission).
- Death and respawn presentation: not in the half I read. The finale state is the only end-state presentation.
- Loot reveal ceremony, walk density, readability of threat colour at 375 wide: not in the half I read.
- MG011 dragons, breath cones, flight phases, taming and mounts: absent. A grep of the whole tree for dragon, breath, tame, mount, saddle, flight, summon and bonding found only unrelated words (for example "amount", "summon I will", "healamount", "taking breath" in a sound precache). No dragons, no flight, no taming, no mounts, no boss phases in this donor.

## MG011 table: dragons and boss abilities (what this donor has)

| name | effect | formula | number ranges | cost | cooldown or cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Lightning beam | beam alive 0.2 s; server re-send for the same entity resets it | end time = now + 0.2 s | 0.2 s life; 3 bolt models | none in this code | kept up only by server re-sends | per beam slot (MAX_BEAMS, not read) | cl_tent.c:88, 101, 216-227 |
| Explosion light | burst with a bright light and blast sound | light radius 350, decay 300, life 0.5 s | 0.5 s | none | none | none | cl_tent.c:194-203 |
| Armour absorb | absorbs a fraction of damage until the value runs out | save = ceil(fraction x damage), capped at armour value | fractions 0.3, 0.6, 0.8 | none | none | armour value | combat.qc:160-165; items.qc:412, 418, 424 |
| Finale card | typed end-of-zone text, full-screen idle camera | typed chars = rate x elapsed time | 8 chars per second | none | none | none | screen.c:40, 135; cl_parse.c:943-944 |
| Breath cones, dragon flight, taming, mounts, boss phases, resource pools | none in this donor | none | none | none | none | none | grep over the whole tree |

Which numbers suit a fast mobile fight (ours): the finale card at 16-24 characters per second; the lightning beam life at 0.2 s with a server refresh each tick; the explosion light life at 0.4-0.5 s.

Best transferable idea: a finale card typed from a server event, and a 0.2-second beam that dies unless the server keeps re-sending it, so it stops the moment the server does.

Reuse tag: boss-staging (partial) and dragons/boss-abilities (lightning beam only). Brief rule served: server state change first, client typing and light after.

Decision: adapt (idea) for the finale card and the caster-bound beam. The only boss-side rule in the tree is the func_bossgate sigil gate (misc.qc:639-651), which maps onto the boss-locked door above (open the gate when a progress flag set is complete); no boss attack or phase rule exists because the boss code is not in the tree. Defects: none found in the lines read.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Error: note said only the finale state types the text; screen.c:134-135 types for any nonzero cl.intermission, so svc_cutscene (3) types too. Confirmed.
- Error: note said the grep found no boss code; qw-qc/server.qc:30-36 (monster_* stubs, monster_boss = remove(self)) and qw-qc/misc.qc:639-651 (func_bossgate) exist. Confirmed.
- Missed: func_bossgate sigil gate is the only boss staging rule in the tree; the stubs show the QW server removes single-player monsters. Added.

Fixed 2026-10-12: section 3 centre-text rule (types in every intermission state), section 7 gaps and Decision (boss stubs and func_bossgate added).
