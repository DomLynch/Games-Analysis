# angband-angband: status effects (SE002)

Half read: both (code and data). Angband is one C program with its data tables in lib/gamedata, so there is no separate server or client split. The render half (src/ui-effect.c) was not read. Depth: full for the timed-effect system, cut and stun ladders, fear, and monster stun and fear. Not read: the message strings themselves and the effect handlers in effect-handler-general.c.

Donor root: /mnt/frankendom-donors/angband-angband (read-only, VPS). Asset audit: AU004/angband-angband.assets.md (licence and asset classes).

## 1. What the player sees and feels (inferred from the data, not from a rendered screen)
A single status word sits on the status line, in a letter colour per grade: Graze, Light Cut, Bad Cut, Nasty Cut, Severe Cut, Deep Gash, Mortal Wound for bleeding; Stun, Heavy Stun, Knocked Out for stun. The word changes as the timer climbs, so the danger reads from the name, not from a number. When a monster lands a cut, the message tells you the new grade ("You have been given a deep gash."). Stun costs you accuracy and damage. Heavy stun is -20 to hit and -20 to damage, and at Knocked Out you lose your turn. Fear is "Afraid" on the line and blocks melee ("You are too afraid to attack"). On a 375-wide phone the status line is a row of short words, so one word per effect is the right unit.

## 2. Why it works / is striking
- Readable at 375 wide: each status is one word, and the grade name carries the danger level.
- One signature behaviour: a bleed that gets worse with each hit, through named grades, not a bar.
- One signature sound or effect: the message change at each grade ("deep gash", "mortal wound") plays as the cue.
- Could be made ours at 20-30 percent resemblance: yes. Keep the grade ladder and the one-word tags; change the names, the count of grades and the numbers.

## 3. The rule behind it
- Each timed effect is one integer timer (player) or one timer per monster effect. Setting, increasing, decreasing and clearing go through one set of functions (src/player-timed.c: player_inc_timed at line 1050; src/mon-timed.c: mon_inc_timed at line 242).
- Grade ladders: a status has several grades, each with a turn threshold. The status word is the grade the timer currently sits in. Counts: 53 player timed effects (lib/gamedata/player_timed.txt, 53 name: entries; src/list-player-timed.h, 53 TMD entries).
- Player cut ladder: 7 grades at 10, 25, 50, 100, 200, 1000, 10000 turns (lib/gamedata/player_timed.txt lines 255-263). Player stun ladder: 3 grades at 50, 150, 10000 (lines 268-272).
- Cut damage per turn by grade: 1 for light grades, 2 for Severe Cut, 3 for Deep Gash and Mortal Wound (src/game-world.c lines 522-535). Rock-skinned characters take 0.
- Stun penalties: Stun gives -5 to hit and damage; Heavy Stun gives -20 each (src/player-calcs.c lines 2137-2150 region).
- Stun on the player: Knocked Out gives no turn (src/game-world.c around line 892).
- Stacking on the player: each increase adds the amount to the timer (player_inc_timed). Only the flag NONSTACKING blocks an increase while the effect is active. Paralysis carries that flag (lib/gamedata/player_timed.txt line 217).
- Amount added per hit: monster blows roll a cut or stun amount by critical tier (src/mon-attack.c). Cut tiers (8 values): 0, 1-5, 6-10, 21-40, 51-100, 101-200, 300, 500 turns. Stun tiers (8 values): 0, 1-5, 11-20, 21-40, 31-60, 41-80, 100, 200 turns (lines 676-714). These are the numbers a designer would tune.
- Stun on a monster from a player blow: randint0(level/5) + 4 turns, on a roll of bash quality plus player level against 200 plus 8 times the monster level (src/player-attack.c lines 960-961).
- Monster stacking has three kinds, set per effect in src/list-mon-timed.h: NO (ignore a second application), MAX (keep the larger timer, used by stun, confusion, hold), and INCR (add, used by fear, slow and haste). Stun is MAX with a cap of 50 (line 18). Fear is INCR with a cap of 10000 (line 20).
- Monster resist check (src/mon-timed.c lines 74-100): chance = min(90, monster level + max(0, 25 - timer/2)). Uniques roll twice. A monster race flag (for example no-stun) auto-resists. Only effects with a save (sleep, fear) roll the save.
- Minimum for a new monster effect: 2 turns (src/mon-timed.c line 230).
- Stunned monster: misses its turn 1 in 10 (src/mon-timed.h line 25), and its accuracy and damage drop by 25 percent (lines 26-27).
- Monster fear: each turn the timer drops by a random 1 to (level/10 + 1) (src/mon-move.c lines 1824-1825). Stun drops by 1 per turn (line 1813). A fleeing monster does not fight in the same way (the state logic was not read).
- Blows that carry status: 1,701 blow: lines in lib/gamedata/monster.txt. Counted by word in those lines: HURT 1019, CONFUSE 48, PARALYZE 35, TERRIFY 22, BLIND 16, HALLU 6. Blow effects are declared in lib/gamedata/blow_effects.txt.

Data fields (all donor values null, because the donor licence is GPL or the Angband licence, not MIT, Apache or BSD):
- cut_grade_thresholds: 7 values; unit turns; null
- stun_grade_thresholds: 3 values; unit turns; null
- cut_tier_roll_by_crit: 8 tiers; unit turns; null
- stun_tier_roll_by_crit: 8 tiers; unit turns; null
- heavy_stun_to_hit_penalty: unit points; null (Stun -5, Heavy Stun -20 as read)
- monster_stun_miss_chance: 1 in N; unit turns; null (N = 10 as read)
- monster_stun_damage_reduction: unit percent; null (25 as read)
- monster_effect_resist_cap: unit percent; null (90 as read)
- monster_effect_min_turns: unit turns; null (2 as read)

## 4. For Frankendom
- Shape: 700 zones as data and 100 Pit characters reused across zones. A status ladder should be a data row (name, grades, thresholds, flags), so one row serves every zone and every character.
- Many-vs-one (max 3 attackers): a stun or fear that stacks per attacker is risky on a phone. Angband's rule is INCR for fear and MAX for stun. Use MAX for stun (three attackers do not add up to a long lock) and keep a cap for fear.
- Server-verified: the timer, the grade and the miss chance live on the server. The client shows the grade word and colour the server sends with the event.
- Keep: the one-word grade name, the grade-by-threshold model, NONSTACKING for hard disables, the monster resist roll with a unique double check, and the minimum-turns floor.
- Change: 7 cut grades is too many for a 375 phone. Use 3 or 4. Do not roll a new random tier per hit on top of a critical; one roll per hit, with the server doing it.

## 5. Five-minute look test (Dom, on the phone)
Build one demo on the existing duel scene: one enemy hits the player, the player gets a bleed that goes from its first word to its second after two hits, and one enemy stun shows Stun, then Heavy Stun after two more hits. Show the word chip above the health bar at 375 wide. Compare: (a) the grade word chip, (b) an icon with a number. Dom judges whether he can read how bad the status is at a glance, with no number.

## 6. Licence and IP
- Code: GPL version 2, or the Angband licence (docs/copying.rst line 5; src/z-file.c header). The Angband licence allows copying "for educational, research, and not for profit purposes" (copying.rst line 10). Treat the code as restricted for our use: take the category, write our own tables and code.
- The data tables in lib/gamedata fall under the same dual licence, and the file headers say other copyrights may apply.
- Inspiration stays at category level: "a bleed with graded names" and "a stun with three grades". Do not copy grade names, message strings or the numbers as-is. Recreate: keep the grade-ladder shape, change the names and the count of grades, and set our own thresholds. No legal conclusions drawn.

## 7. Gaps
- Not read: src/ui-effect.c (the render half), the message texts for monster effects, src/effect-handler-general.c beyond the lines cited, and the player timed grade parser (src/player-timed.c lines 244-342).
- Not read: the fleeing and confused monster behaviour in mon-move.c beyond the timer lines.
- Read in part: monster.txt (blow counts only); blow_effects.txt (names only).
- Half read: both code and data. Rendered look not seen; the 375-wide read is inferred from the word lengths in the data.
