import { updateTimeout, onEnemyMoveSeen, phaseExpired, Escalation, PhaseClock, MAX_TIMEOUT_SEC } from './timer';
const e: Escalation = { timeoutSec: 60, incSec: 30, incMult: 1, everyTurns: 2, everyTurnsInc: 0, counter: 1 };
const seen: number[] = [];
for (let t = 1; t <= 5; t++) seen.push(updateTimeout(e)); // called at end of turns 1..5 -> timeout for turns 2..6
console.log('timeout for turns 2..6:', seen.join(' '));
const c: Escalation = { timeoutSec: MAX_TIMEOUT_SEC - 5, incSec: 30, incMult: 2, everyTurns: 1, everyTurnsInc: 0, counter: 1 };
console.log('cap:', updateTimeout(c), 'everyTurns', c.everyTurns, 'incSec', c.incSec);
const p: PhaseClock = { elapsedSec: 10, deadlineSec: 50 };
onEnemyMoveSeen(p, 60, 20); console.log('enemy move at 10s, +20 -> deadline', p.deadlineSec);
p.elapsedSec = 45; onEnemyMoveSeen(p, 60, 20); console.log('enemy move at 45s, +20 -> deadline', p.deadlineSec);
p.elapsedSec = 64; console.log('expired at 64s?', phaseExpired(60, p));
p.elapsedSec = 66; console.log('expired at 66s?', phaseExpired(60, p));
const z: Escalation = { timeoutSec: 60, incSec: 30, incMult: 1, everyTurns: 0, everyTurnsInc: 0, counter: 1 };
console.log('schedule off:', updateTimeout(z), updateTimeout(z));
