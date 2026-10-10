// Behaviour check of the compiled sketch (not the donor).
const { observe } = require('/tmp/q013/js/ondemand_respawn.js');
const mk = () => ({
  startedAt: 0,
  stages: [{ atS: 0, name: 'seedling' }, { atS: 50, name: 'bud' }, { atS: 150, name: 'flower' },
           { atS: 300, name: 'wilted' }, { atS: 400, name: 'dead' }],
  cycleS: 500, cycles: 0,
});
let t = mk();
console.log('at 500 (wrap):', JSON.stringify(observe(t, 500)), 'cycles', t.cycles, 'startedAt', t.startedAt);
console.log('at 500 again:', JSON.stringify(observe(t, 500)));
t = mk();
console.log('at 10250 (20 wraps, unseen):', JSON.stringify(observe(t, 10250)), 'cycles', t.cycles);
t = mk();
console.log('at 180:', JSON.stringify(observe(t, 180)));
t = { startedAt: 0, stages: [{ atS: 0, name: 'a' }, { atS: 100, name: 'b' }], cycleS: null, cycles: 0 };
console.log('no loop at 5000:', JSON.stringify(observe(t, 5000)));
