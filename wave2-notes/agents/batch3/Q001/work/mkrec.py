import sys
FO='/mnt/frankendom-donors/freeorion-freeorion/'
TE=FO+'default/python/turn_events/turn_events.py'
UT=FO+'default/python/universe_generation/universe_tables.py'
MO=FO+'default/python/universe_generation/monsters.py'
MF=FO+'default/scripting/monster_fleets.inf'
SF=FO+'server/ServerFramework.cpp'
SA=FO+'server/ServerApp.cpp'
EO=FO+'default/scripting/buildings/EXPERIMENTOR_OUTPOST.focs.py'
CP=FO+'default/COPYING'
N='freeorion-freeorion'
rows=[
("per-turn monster roll: chance = systems x monster_freq x 0.01",TE,39,"if monster_freq > 0 and random() < len(systems) * monster_freq * 0.01:"),
("monster_freq read from galaxy setup value through the table",TE,36,"monster_freq = MONSTER_FREQUENCY[gsd.monsterFrequency]"),
("donor example comment uses 1/30 for low (150 systems gives 0.05); table low is 0.03 (gives 0.045)",TE,38,"(example: low monsters and 150 Systems results in 150 / 30 * 0.01 = 0.05)"),
("species roll passes every time (random() < 1)",TE,41,"if random() < 1:"),
("spawned kind hard-coded to SM_KRILL_1",TE,42,'monster_type = "SM_KRILL_1"'),
("candidate systems: no planets (and fleets filtered on next line)",TE,47,"candidates = [s for s in systems if len(fo.sys_get_planets(s)) <= 0"),
("one candidate chosen uniformly at random",TE,51,"system = choice(candidates)"),
("empty fleet created first at the chosen system",TE,55,"monster_fleet = fo.create_monster_fleet(system)"),
("monster created in that fleet; failure leaves the fleet",TE,61,"monster = fo.create_monster(monster_type, monster_fleet)"),
("frequency table: extremelyLow value",UT,122,"fo.galaxySetupOptionMonsterFreq.extremelyLow: 0.002,"),
("frequency table: low value",UT,124,"fo.galaxySetupOptionMonsterFreq.low: 0.03,"),
("frequency table: high value",UT,126,"fo.galaxySetupOptionMonsterFreq.high: 0.2,"),
("frequency table: extremelyHigh value",UT,128,"fo.galaxySetupOptionMonsterFreq.extremelyHigh: 0.999,"),
("game-start director: basic chance from the same table",MO,91,"basic_chance = universe_tables.MONSTER_FREQUENCY[monster_freq]"),
("game-start director: per-plan spawn counter dict",MO,108,"spawn_limits = {"),
("game-start director: one shuffled pass over systems",MO,166,"random.shuffle(systems)"),
("game-start director: one plan picked uniformly per system",MO,190,"fleet_plan = random.choice(suitable_fleet_plans)"),
("game-start director: roll is basic_chance x plan spawn_rate",MO,193,"if random.random() > basic_chance * fleet_plan.spawn_rate():"),
("game-start director: populate on success",MO,210,"populate_monster_fleet(fleet_plan, system)"),
("game-start director: decrement the plan's counter",MO,212,"spawn_limits[fleet_plan] -= 1"),
("plan data: SM_KRILL_1 spawnrate",MF,6,"spawnrate = 0.5"),
("plan data: SM_KRILL_1 spawnlimit",MF,7,"spawnlimit = 9999"),
("plan data: SM_FLOATER spawnlimit",MF,75,"spawnlimit = 50"),
("server calls execute_turn_events through the Python module",SF,323,'py::object f = m_python_module_turn_events.attr("execute_turn_events");'),
("server calls ExecuteScriptedTurnEvents in turn processing",SA,4546,"ExecuteScriptedTurnEvents();"),
("ExecuteScriptedTurnEvents calls the Python turn events function",SA,1614,"success = m_python_server.ExecuteTurnEvents();"),
("experimentor: frequency factor from max AI aggression",EO,54,"EXPERIMENTOR_MONSTER_FREQ_FACTOR: float = (1 + GalaxyMaxAIAggression) / 5.0"),
("experimentor: base start turn plus 50 per aggression tier below 5",EO,63,"EXPERIMENTOR_SPAWN_BASE_TURN + 50 * (5 - GalaxyMaxAIAggression)"),
("experimentor: start turn scales with planet density and galaxy size",EO,69,"EXPERIMENTOR_SPAWN_CALC_A * (1.2 - GalaxyPlanetDensity / 10)"),
("experimentor tier 1: start..start+35 window",EO,142,"Turn(low=(EXPERIMENTOR_SPAWN_START_TURN), high=(EXPERIMENTOR_SPAWN_START_TURN + 35))"),
("experimentor tier 1: roll 0.2 x factor",EO,143,"& Random(probability=(0.2 * EXPERIMENTOR_MONSTER_FREQ_FACTOR))"),
("experimentor tier 1: spawns Black Kraken",EO,146,'CreateShip(designname="SM_BLACK_KRAKEN", empire=Source.Owner),'),
("experimentor tier 2: from start+36, roll 0.1 x factor",EO,166,"& Random(probability=(0.1 * EXPERIMENTOR_MONSTER_FREQ_FACTOR))"),
("experimentor tier 3: start+36..start+70 window",EO,188,"Turn(low=EXPERIMENTOR_SPAWN_START_TURN + 36, high=EXPERIMENTOR_SPAWN_START_TURN + 70)"),
("experimentor tier 3: roll 0.2 x factor, spawns Bloated Juggernaut",EO,189,"& Random(probability=0.2 * EXPERIMENTOR_MONSTER_FREQ_FACTOR)"),
("experimentor tier 4: from start+71, roll 0.1 x factor",EO,212,"& Random(probability=0.1 * EXPERIMENTOR_MONSTER_FREQ_FACTOR)"),
("licence: content scripts are GPL v2 as well as CC-BY-SA",CP,6,"Game content scripts are also licensed under the GNU General Public License, Version 2"),
]
out=['note\tclaim\tdonor_file\tline\tquote']
for claim,f,l,q in rows:
    assert '\t' not in q and 15<=len(q)<=90, (claim,len(q))
    out.append('\t'.join([N,claim,f,str(l),q]))
open(sys.argv[1],'w').write('\n'.join(out)+'\n')
print(len(out)-1,'rows')
