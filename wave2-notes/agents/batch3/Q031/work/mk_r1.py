G='/mnt/frankendom-donors/levy-street-world-of-claudecraft/server/game.ts'
M='/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/types.ts'
S='/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/sim.ts'
R='/mnt/frankendom-donors/levy-street-world-of-claudecraft/server/tick_rate_meter.ts'
C='/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/main.ts'
note='levy-street-world-of-claudecraft'
rows=[
('GameServer.start() is the world loop entry',G,2541,'start(): void {'),
('loop clock is hrtime, read at start',G,2542,'let last = process.hrtime.bigint();'),
('the tick body runs on setInterval',G,2548,'this.interval = setInterval(() => {'),
('wall dt is measured from hrtime',G,2556,'let dt = Number(now - last) / 1e9;'),
('dt is clamped to 0.5 s per callback',G,2560,'if (dt > 0.5) dt = 0.5;'),
('accumulator loop runs sim ticks while acc >= DT',G,2581,'while (acc >= DT) {'),
('stale input clear is the first step inside the tick loop',G,2582,'this.clearStaleInputs();'),
('sim.tick() is called once per fixed step',G,2594,'const events = this.sim.tick();'),
('ticks committed per callback are reported to the meter',G,2634,'this.tickRateMeter.record(nowMs, ticksRun);'),
('snapshots are broadcast once per callback, after the step loop',G,2636,'this.broadcastSnapshots();'),
('liveness stamp is the last statement of the body',G,2659,'this.lastTickCompletedAt = Date.now();'),
('stale input threshold is 0.75 s',G,552,'const STALE_INPUT_SECONDS = 0.75;'),
('stale input comment: 750ms, intent streamed every 50ms',G,551,'forever. 750ms leaves room for normal jitter and short browser stalls.'),
('clearStaleInputs drops movement once sim time since last input exceeds the threshold',G,3161,'if (this.sim.time - session.lastInputAt <= STALE_INPUT_SECONDS) continue;'),
('tickHz is broadcast on the head at most every 0.5 s',G,513,'const TICK_HZ_HEAD_INTERVAL_S = 0.5;'),
('broadcastSnapshots returns early with no clients',G,7910,'if (this.clients.size === 0) return;'),
('broadcastSnapshots is the per-callback snapshot function',G,7909,'private broadcastSnapshots(): void {'),
('TICK_RATE is 20 sim ticks per second',M,32,'export const TICK_RATE = 20; // sim ticks per second'),
('DT is 1/TICK_RATE seconds',M,33,'export const DT = 1 / TICK_RATE;'),
('interest drop radius is 100',M,62,'export const PLAYER_INTEREST_DROP_RADIUS = 100;'),
('sim.tick() is the main tick entry',S,5933,'tick(): SimEvent[] {'),
('sim time advances by DT per tick',S,5939,'this.time += DT;'),
('mob loop calls the idle-skip gate before updateMob',S,6057,'if (this.shouldSkipIdleMobTick(e)) continue;'),
('mob AI update call',S,6058,'this.updateMob(e);'),
('idle-skip gate signature',S,6219,'private shouldSkipIdleMobTick(mob: Entity): boolean {'),
('idle-skip radius comes from cfg, 0 disables',S,6220,'const radius = this.cfg.idleMobTickRadius ?? 0;'),
('idle-skip: owned, non-idle, in combat or aura mobs always tick',S,6234,'mob.ownerId !== null ||'),
('idle-skip: any aura keeps the mob ticking',S,6237,'mob.auras.length > 0'),
('idle-skip: no players at all means the mob is skipped',S,6241,'if (this.players.size === 0) return true;'),
('idle-skip: skipped unless a player is within the radius',S,6242,'return !this.playerGrid.hasInRadius(mob.pos.x, mob.pos.z, radius);'),
('tick rate meter default window 3000 ms and 1000 ms minimum',R,35,'constructor(windowMs = 3000, minElapsedMs = 1000, capacity?: number) {'),
('meter straddle cap 250 ms',R,26,'private readonly straddleCapMs = 250;'),
('meter returns null until minElapsed',R,64,'if (nowMs - this.anchorMs < this.minElapsedMs) return null;'),
('meter window start',R,65,'const windowStart = nowMs - this.windowMs;'),
('meter rate is ticks times 1000 over elapsed ms',R,102,'return (sum * 1000) / elapsed;'),
('second caller of sim.tick: offline client loop',C,4391,'events = offlineSim.tick();'),
]
out='/private/tmp/p2/wave2-haiku/batch3/Q031/receipts.tsv'
with open(out,'w',newline='') as f:
    f.write('note\tclaim\tdonor_file\tline\tquote\n')
    for claim,fn,ln,q in rows:
        assert '\t' not in claim and '\t' not in q
        f.write('\t'.join([note,claim,fn,str(ln),q])+'\n')
print('wrote',len(rows))
