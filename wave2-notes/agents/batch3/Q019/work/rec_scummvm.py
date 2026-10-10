import csv
B="/mnt/frankendom-donors/scummvm-scummvm/engines/bladerunner/"
A=B+"actor_combat.cpp"
N="scummvm-scummvm"
rows=[
("combatOn sets the state, the ratio constants and the waypoint counts",A,52,"void ActorCombat::combatOn(int actorId, int initialState, bool rangedAttackFlag"),
("cover ratio is zeroed when the actor has no cover waypoints",A,93,"if (_coversWaypointCount == 0) {"),
("melee attack ratio: distance term weight 0.20",A,606,"2 * (50 - MIN(actor->distanceFromActor(_enemyId) / 12.0f, 50.0f));"),
("melee attack ratio: aggression weight 0.30",A,622,"aggressivenessFactor * 0.30f;"),
("ranged attack ratio: angle weight 0.25",A,610,"angleFactor          * 0.25f +"),
("angle factor divides by 512",A,605,"(100 * abs(enemy->angleTo(_actorPosition))) / 512;"),
("cover ratio (ranged): aggression weight 0.50",A,645,"aggressivenessFactor * 0.50f;"),
("cover ratio (melee): aggression weight 0.50",A,652,"aggressivenessFactor * 0.50f;"),
("flee ratio: actor HP weight 0.4",A,670,"actorHpFactor * 0.4f +"),
("tick: attack ratio recomputed unless a constant is set",A,138,"_attackRatio = calculateAttackRatio();"),
("tick: cover or flee wins only when strictly above attack",A,160,"if (_attackRatio < _fleeRatio || _attackRatio < _coverRatio) {"),
("tick: cover beats flee on a tie",A,161,"if (_coverRatio >= _fleeRatio && _coverRatio >= _attackRatio) {"),
("tick: close attack when within 36 units",A,178,"if (dist > 36.0f) {"),
("tick: approach close attack beyond 36 units",A,179,"_state = kActorCombatStateApproachCloseAttack;"),
("tick: retired enemy sends the actor to idle",A,186,"if (enemy->isRetired()) {"),
("tick guard: static reentrancy counter",A,116,"static int processingCounter = 0;"),
("tick decrement after dispatch",A,225,"--processingCounter;"),
("hit attempt: McCoy not in control blocks the hit",A,232,"if (_enemyId == kActorMcCoy && !_vm->playerHasControl() && !_unstoppable) {"),
("hit roll is 1..100",A,251,"int random = _vm->_rnd.getRandomNumberRng(1, 100);"),
("hit when roll is at or below coefficient",A,253,"if (random <= attackCoefficient) {"),
("damage uses roll and coefficient",A,269,"damage = getDamageCloseAttack(random, attackCoefficient);"),
("enemy HP floors at zero",A,272,"int enemyHp = MAX(enemy->getCurrentHP() - damage, 0);"),
("death retires the enemy with parameters 6 and 3",A,289,"enemy->retire(true, 6, 3, _actorId);"),
("flee function entry",A,497,"void ActorCombat::flee() {"),
("close coefficient: still enemy base 33",A,540,"aggressiveness = 33;"),
("close coefficient: running enemy base 11",A,536,"aggressiveness = 11;"),
("close coefficient: actor aggression divided by 3",A,543,"aggressiveness += actor->getCombatAggressiveness() / 3;"),
("close coefficient: angle beyond 128 returns no attack",A,547,"if (angle > 128) {"),
("close coefficient: angle term abs(angle-128)/3.7",A,551,"return aggressiveness + (abs(angle - 128) / 3.7f);"),
("ranged coefficient: distance capped at 900",A,562,"int distance = MIN(actor->distanceFromActor(_enemyId), 900.0f);"),
("ranged coefficient: distance term and intelligence",A,574,"return aggressiveness + abs((distance / 30) - 30) + actor->getIntelligence() / 5;"),
("damage margin formula",A,584,"return ((MIN(max - min, 30) * 100.0f / 60.0f) + 50) * _damage / 100;"),
("McCoy easy halves damage",A,579,"return _damage / 2;"),
("tickCombat calls combat tick for non-player combatants",B+"actor.cpp",915,"if (_id != kActorMcCoy && !_isRetired && _inCombat) {"),
("tickCombat calls ActorCombat::tick",B+"actor.cpp",916,"_combatInfo->tick();"),
("default aggression is 50",B+"actor.cpp",115,"_combatAggressiveness        = 50;"),
("aggression is clipped to 0..100 on change",B+"actor.cpp",1197,"_combatAggressiveness = CLIP(_combatAggressiveness + change, 0, 100);"),
("main loop calls tickCombat on every actor",B+"bladerunner.cpp",1234,"_actors[i]->tickCombat();"),
("gameTick is called from the game loop",B+"bladerunner.cpp",1165,"} while (_gameIsRunning);"),
("hit attempt is a script call",B+"script/script.cpp",268,"_vm->_actors[actorId]->_combatInfo->hitAttempt();"),
("example: hit attempt fires on animation frame 9",B+"script/ai/izo.cpp",639,"if (_animationFrame == 9) {"),
("example: hit attempt call for Izo",B+"script/ai/izo.cpp",640,"Actor_Combat_AI_Hit_Attempt(kActorIzo);"),
("licence: GPL version 3 or later",A,9,"the Free Software Foundation, either version 3 of the License, or"),
]
out=[["note","claim","donor_file","line","quote"]]
for claim,path,ln,q in rows:
    assert "\t" not in q
    out.append([N,claim,path,str(ln),q])
with open("/private/tmp/p2/wave2-haiku/batch3/Q019/work/scummvm_rec_new.tsv","w",newline="") as f:
    csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n").writerows(out)
print(len(out)-1)
