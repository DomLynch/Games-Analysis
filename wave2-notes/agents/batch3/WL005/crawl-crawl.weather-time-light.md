# Dungeon Crawl Stone Soup (weather-time-light, feel note, WL005)

Donor/Licence: crawl-crawl (crawl-ref/source), GPL-2 per the library matrix. The donor LICENSE header was read (Dungeon Crawl Stone Soup, copyright lines); the GPL version line itself was not re-read in the file. Shape only, clean-room. No code, text or tile is carried over.

Checked: duration-data.h (Nightfall record 743-746; table has 230 records by grep), player.cc (update_vision_range 1061-1112; robe of Night 1088-1089; nightstalker and daystalker 1065-1072; nightfall curve 1091-1112; stealth 3606, 3632-3636, 3655), player-reacts.cc (1429-1430, per-turn refresh), god-abil.cc (dithmenos_nightfall 3098-3106), ability.cc (2567-2573 no-stack rule), defines.h (149 BASELINE_DELAY), attack.h (16-19 to-hit constants), attack.cc (268-280 defender backlit and umbra modifiers), beam.cc (3495-3502 beam doubling), monster.cc (2957-2972 backlit, umbra, nightvision), areas.cc (573-640 halo and umbra, umbra_radius for player and monster), god-passive.cc (112-114, Yredelemnul umbra), cloud.cc (table 216-262, 44 entries by grep; spread and dissipation 459-622; maybe_leave_water 697-708; actor_apply_cloud 1585-1600). Confidence: high on the code facts quoted. A weather cycle and any wall-clock day were searched for (weather, rain, snow, dusk, dawn, daylight, night, fog) and not found as a cycle; rain is a cloud type, and the only night is Nightfall plus the stalker mutations.

Half read: game source only (C++ roguelike, single player, no server half in the box). dat/ text was checked by grep only (dat/descript/status.txt has a Nightfall status entry, dat/descript/ability.txt has the Nightfall ability entry, both not read in full).

## 1. What the player sees and feels
Dithmenos' Nightfall darkens your own view. The screen narrows fast to almost nothing, you stay nearly blind for the first few turns, and then your sight creeps back on a soft S-curve, slow at first, fastest in the middle, easing in at the end. The effect ends early the moment your sight is back to normal. While it lasts your stealth is held at a floor, so monsters notice you less. On a 375-wide phone the narrowing field is the whole effect, and it reads as a single sweep of dread and return.

## 2. Why it works / is striking
- Readable at 375 wide: the signature is the sight radius itself, a single number the player sees as the edge of the visible area.
- One signature behaviour: the S-curve return (not linear), which makes the dark front-loaded and the dawn feel earned. One signature sound: none found in the code read (the message is text). Halo and umbra (below) add a second readable signal: a ring around a lit target or an umbra shadow.
- Could be made ours at 20-30 percent resemblance: yes. A timed vision curve with an end-early cut and a stealth floor is a small, checkable rule and needs no new art.

## 3. The rule behind it
Nightfall: duration in game time is (16 to 24, plus a term from the Invocations skill about two-thirds, rounded) times BASELINE_DELAY (10). Each refresh t is the elapsed percent of max duration. Sight is a percent of normal sight given by 3t squared minus 2t cubed (a smoothstep, in percent). For the first 5 turns (50 game-time units) sight may be 0; after that sight is at least 1. If the curve reaches normal sight, nightfall ends at once. Stealth is at least 100 while it lasts. A second cast while active is refused ("Night has already fallen.").

Light as modifiers (non-Nightfall): a backlit (halo) defender gives attackers +5 to-hit; an umbra defender gives -3 to-hit to attackers without nightvision; beams double both. A backlit player has stealth multiplied by 2/5; an umbra player by 3/2 (when umbra radius is 0 or more). Umbra radius for the player comes from the Yredelemnul passive by piety breakpoints (2, 3 or 4), with a minimum of 3 from two unique items and a mutation level for Foul Shadow (other sources not read).

Sight modifiers: Daystalker adds +1 base sight; Nightstalker subtracts 1 to 3 and adds stealth; robe of Night multiplies sight by 3/4; scarf of shadows subtracts 1.

Storms (clouds): each turn a storm cell first applies the rain part (damage only to fiery monsters, base 0 plus up to 9), then a coin flip decides whether the storm's lightning part also applies. Rain leaves shallow water on floor cells with a chance of one in five per turn, for a temporary duration (units as in code; 500 to 1000 in code units, not converted).

Cloud spread and decay: decay drops by time taken each tick. A cloud spreads with chance 80 percent when decay is above 30, 50 percent above 20, otherwise 30 percent. A spread child gets decay halved plus one (capped to decay minus one), and the parent loses 8 decay per spread. The spread rate drops by about a tenth after each spread. A player-made non-opaque cloud vanishes at once when it is outside line of sight.

Data fields (designer-tunable; donor values null because GPL-2):
- nightfall_min_turns, unit: turns, value 16 (base range low), 24 (base range high)
- nightfall_skill_term, unit: ratio, value two-thirds of the Invocations skill, rounded
- game_time_unit, unit: aut per normal turn, value 10
- nightfall_zero_sight_window, unit: game-time units, value 50
- nightfall_sight_floor, unit: tiles, value 1
- nightfall_stealth_floor, unit: stealth points, value 100
- halo_to_hit, unit: to-hit points, value +5
- umbra_to_hit, unit: to-hit points, value -3
- beam_to_hit_multiplier, unit: ratio, value 2
- backlit_stealth_ratio, unit: ratio, value 2/5
- umbra_stealth_ratio, unit: ratio, value 3/2
- umbra_radius_tiers, unit: tiles, values 2, 3, 4 by piety breakpoint
- robe_of_night_sight_ratio, unit: ratio, value 3/4
- daystalker_sight_add, unit: tiles, value +1
- nightstalker_sight_sub, unit: tiles, value -1 to -3
- rain_damage_fiery_only, unit: hp, value base 0, random up to 9
- rain_shallow_water_chance, unit: chance, value 1 in 5
- cloud_spread_chance_tiers, unit: percent, values 80 (decay above 30), 50 (above 20), 30 (else)
- cloud_spread_parent_cost, unit: decay, value 8
- cloud_spread_rate_decay, unit: fraction, value about 1/10 per spread

## 4. For Frankendom
- Zones as data: each zone can carry a light and weather profile (sight ratio, sight floor, storm tags, rain flood chance). 700 zones means these are fields, not code.
- Sight is an engine number in src/fight (per character), with a timed curve (nightfall) and end-early rule, plus a stealth floor that feeds aggro. The client draws the edge from that number.
- Many-vs-one: a dark sight curve is exactly where three attackers can arrive unseen. Keep the rule that at most three can be visible at the fog edge in any state.
- Halo and umbra as duel modifiers: a lit target gets a +5 to-hit for attackers and a visible ring; an umbra gives -3 to attackers without nightvision. This is the cheapest readable telegraph on a phone: the ring is the cue.
- Storms: a tag-gated hazard (fiery targets only) plus a coin-flip second effect is a clear rule for zones; the flood is a server-side terrain change, so the visible puddle must come from server state.
- Cloud spread rule: server-verified clouds that cannot be created outside a player's view stop hidden-hazard exploits. This matches "server-verified" for kills and hazards.
- Keep: S-curve sight return, end-early rule, stealth floor, halo/umbra as signed to-hit and the ring cue, tag-gated storm damage, out-of-view cloud removal.
- Change: game-time becomes server ticks (parity row 18 budget); the Invocations term becomes a Pit or zone rank field; no mutation or unique-item stacking beyond data fields.

## 5. Five-minute look test (Dom, phone)
Fight camera with a dark sweep: a 16-second nightfall where the visible radius follows 3t squared minus 2t cubed of normal sight, floor 1 after 5 seconds, ending early if normal is reached. Take three 375-wide stills at 0, 30, 60 and 90 percent of the sweep with a monster at 2, 4 and 6 tiles. Dom picks which still he can still react in. Target file: src/fight/sight.ts (new); parity row 4 (fight loop: aggro, chase, leash), because aggro needs the sight number. Halo and umbra to-hit belong to src/fight/duel-step.ts, parity row 1, and can be a second test later.

## 6. Licence and IP
GPL-2 code. Clean-room: keep the shape (smoothstep sight curve, end-early cut, stealth floor, signed halo and umbra to-hit, tag-gated storm damage, out-of-view cloud removal). Do not copy the text ("lightless night"), the to-hit constants as code, or the tile art. Recreate under a different name ("dusk tide" or similar) and say which trait is kept and which changed (sight curve kept; name, numbers and skill term changed).

## 7. Gaps
- Not read: the rendering side of darkness (view.cc, tilecell.cc beyond grep), skill_rdiv semantics (rounding), whether monsters' sight changes during Nightfall (only the player's LOS is set in the code read), umbra radius sources beyond the passive and the two items, the storm's lightning effect (only the coin flip read), the flood duration units, timed-effects.cc end handling, dat/descript text beyond grep.
- Not in the half read: no server half in the box.
- Half read: game source, plus grep of dat/. The rules above are from the source half; the descriptions are unread.
- Gaps against Frankendom rulings: rule 4 (sight and aggro) is the nearest engine row; the rest are not in the parity rows yet and are recorded as ideas only.

Best transferable idea: a sight number that follows a smoothstep curve over the duration of a timed darkness, ends early when it reaches normal, and holds a stealth floor, gives the fog edge a dread-and-dawn shape with no lighting pass.

Verdict: STRONG (read the code and the numbers; self-contained; the halo and umbra to-hit rule is also STRONG and self-contained).
Decision: adapt (idea), with the Invocations term replaced by a zone rank field.
