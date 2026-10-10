# crawl-crawl (Dungeon Crawl Stone Soup): status effects (SE002)

Half read: both (code and data). The status tables are C++ source (duration-data.h), not a separate data pack, so "data" and "code" are the same files here. There is no separate server or client in the donor. Read: duration and status tables, the duration increase and daze code, monster enchant merge and expiry, the fearmonger list, melee stagger and knockback, and the status-light text. Not read: the render code that draws the status lights on screen, and most spell files that apply statuses.

Donor root: /mnt/frankendom-donors/crawl-crawl/crawl-ref/source (read-only, VPS). Asset audit: AU011/crawl-crawl.assets.md (art only; this topic is code).

## 1. What the player sees and feels (inferred from the status tables, not from a rendered screen)
Each active status has a short tag, for example Conf for confused, Para for paralysed, Fear for afraid, Agi for agility and Vexed for vexed (the rendering of the tag row was not read, so its position is not confirmed). Most negative statuses are red; most positive ones are blue or green. As a status runs out, its tag gets the suffix " (expiring)", and its long text gets an "Expiring:" prefix, so the warning survives without colour. Fear is the striking one: each new fearmonger in view adds to it, and the status ends only when all of them are gone. On a 375-wide phone the row needs short tags; the donor's tags run from three to about eight characters (Agi, Vexed, Berserk), so eight is the upper limit to copy.

## 2. Why it works / is striking
- Readable at 375 wide: a short tag per status with a sign colour and an expiry suffix.
- One signature behaviour: fear is a sum of sources, not one timer. Each fearmonger adds 5 turns up to a cap of 12, and the fear ends only when the list of sources is empty (fearmonger.cc lines 24-45, 98, 148).
- One signature sound or effect: a concussive hit stumbles the defender a tile and staggers it (melee-attack.cc lines 651-659). The message is "is staggered" (monster.cc line 5955).
- Could be made ours at 20-30 percent resemblance: yes. Keep the source-count fear and the expiry suffix; change the names, the tag text and the numbers.

## 3. The rule behind it
- Player durations: one turn value per status in a table of 230 rows (src/duration-data.h, rows begin "{ DUR_"; enum of 231 in src/duration-type.h). Each row has a short tag, a colour, a short name, a long name, a start message, flags (D_NEGATIVE, D_DISPELLABLE, D_EXPIRES, D_COOLDOWN and others), and optional end messages.
- Time unit: 10 aut per game turn (src/defines.h line 149, BASELINE_DELAY = 10). Durations are stored as turns times 10 and capped as turns times 10 (src/player.cc lines 8613-8626).
- Cap on increase: each call names a cap. Confusion: increase by the amount, cap 40 turns (src/player.cc line 4714). Blindness and slowness also use caps (lines 5205, 5278). Fear: 7 turns on first application, +5 for each further fearmonger, cap 12 (src/fearmonger.cc lines 26 and 33).
- Fear ends when the fearmonger list is empty (fearmonger.cc lines 44-45, invariant; lines 98 and 148 clear).
- Stun immunity: after certain effects, the player gets immunity for a random span of turns, which blocks further paralysis, sleep, and daze from others (src/player.cc line 7870 sets the immunity; lines 7746-7748, 7834-7836, 8379, 8403 check it). Vexed grants stun immunity of 3 to 5 turns when it ends (src/duration-data.h line 328).
- Daze on the player: adds 1 to 2 turns (melee-attack.cc line 4574 calls daze with random_range(1, 2); src/player.cc line 8803 converts to aut). A daze cannot stack on top of an active daze (player.cc lines 8794-8796).
- Monster enchantments: a table of 193 enum entries (src/enchant-type.h). Merging two of the same kind adds the degree, caps it at 4 (src/mon-ench.h line 9, MAX_ENCH_DEGREE_DEFAULT), and adds the duration, capped at 30000 aut (src/mon-ench.h line 8; src/mon-ench.cc lines 2280-2290).
- Monster daze: applied by the trickster property (melee-attack.cc lines 4555-4575): one of drained, confused or dazed, picked at random, and only one in three hits. A dazed monster snaps out only once the game clock passes a mark stored in its daze degree field (src/mon-behv.cc lines 1228-1241), so a fresh daze is protected from being shaken off at once.
- Stagger: a concussive weapon stumbles the defender one tile and removes energy: 1 + random2(min(10, attack delay)) * 3 / 4 (melee-attack.cc lines 651-659; src/monster.cc lines 5948-5956). Stagger only applies if the stumble succeeds.
- Knockback: chance is x_chance_in_y(size difference + 3, 6), unless the attack is slippery; the target tile must be habitable (src/melee-attack.cc lines 4961-4975; src/actor.cc line 1055).
- Bleed: the enum has ENCH_BLEED, but it sits under a TAG_MAJOR_VERSION == 34 guard (src/enchant-type.h lines 66-67; src/mon-ench.cc lines 2082-2083). Nothing else in the source tree refers to it. Treat bleed as a retired status in this donor, not a live rule.

Data fields (donor values null, because the donor licence is GPL and not MIT, Apache or BSD):
- status_cap_confusion: unit turns; null (40 as read)
- fear_first_application: unit turns; null (7 as read)
- fear_per_extra_source: unit turns; null (5 as read)
- fear_cap: unit turns; null (12 as read)
- daze_turns_range: unit turns; null (1 to 2 as read)
- stun_immunity_after_vexed: unit turns; null (3 to 5 as read)
- monster_enchant_degree_cap: unit degree; null (4 as read)
- monster_enchant_duration_cap: unit aut; null (30000 as read)
- stagger_energy_roll: unit aut; null
- knockback_chance_size_offset: unit ratio; null

## 4. For Frankendom
- Shape: 700 zones as data and 100 Pit characters reused across zones. The status rows should be data rows (tag, colour, cap, flags), so one row serves every zone and every character.
- Many-vs-one (max 3 attackers): the fear sum is the piece to take. Three attackers each add a bounded amount and the fear ends when none is left. That matches the phone duel shape and reads as "three of them are scaring me" at a glance.
- Server-verified: the source list (which attackers are scaring the player) and the caps live on the server. The client shows the count and the time left, as the server sends them.
- Keep: source-count fear, the expiry suffix, the sign colour, the cap per status, the stun immunity after a disable, and the stagger that costs energy but does not lock.
- Change: the donor's trickster roll (one in three, random effect) is too random for a fast duel; choose the effect in data. Drop bleed from our plan, because the donor retired it. Do not copy the tag text.

## 5. Five-minute look test (Dom, on the phone)
On the existing duel scene, spawn three enemies in view. Each one adds to a single Fear chip. Show the chip with a count (x1, x2, x3) and the turns left, and let it turn to an "(expiring)" form in its last turns. Compare: (a) the summed fear chip with a count, (b) a single fear chip that ignores the count. Dom judges whether he can tell how many are scaring him, and when it will end, at 375 wide without reading a number.

## 6. Licence and IP
- Code: GPL version 2 or later (/mnt/frankendom-donors/crawl-crawl/README.md line 96: "Crawl is licensed as GPLv2+."; the full text is the top-level LICENSE file, not opened). Dat text under the general GPL statement.
- Inspiration stays at category level: "a fear that adds per source and ends when the sources end" and "a concussive hit that staggers". No copied code, tables, tag text or numbers as-is. Recreate: keep the source-sum shape, change the names, the tag text and the caps; use our own numbers.
- GPL copyleft: do not paste any table row or code block into our repo. No legal conclusion.

## 7. Gaps
- Not read: the render half for the status row (status.cc lines 178-1113 beyond the expiry and colour helpers).
- Not read: where afraid() is checked in combat or movement (only the set and clear sites were traced).
- Not read: the spell files that apply statuses beyond the cited call sites.
- Half read: both code and data, with the status tables read in full for the rows cited. Art and audio are out of scope for this topic.
