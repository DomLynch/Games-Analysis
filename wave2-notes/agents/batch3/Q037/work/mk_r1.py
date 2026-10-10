import csv
D='/mnt/frankendom-donors/pmbstyle-L2Solo/'
B=D+'src/GameServer/Bot/Population/BackgroundJobRegistry.js'
G=D+'src/GameServer/Bot/Population/BackgroundWorkGovernor.js'
P=D+'src/GameServer/Bot/Population/PopulationService.js'
C=D+'src/GameServer/Bot/Population/PopulationConfig.js'
M=D+'src/GameServer/Bot/Population/PopulationMetrics.js'
T=D+'tests/test_background_job_registry.js'
L=D+'LICENSE'
R=D+'README.md'
N='pmbstyle-L2Solo'
rows=[
('registry tick floor 50 ms, default 250 ms',B,10,'this.tickMs = Math.max(50, Math.floor(finiteNumber(options.tickMs, 250)));'),
('registry clock defaults to wall clock Date.now',B,11,'this.now = typeof options.now === \'function\' ? options.now : Date.now;'),
('job interval floored to the tick',B,28,'const intervalMs = Math.max(this.tickMs, Math.floor(finiteNumber(options.intervalMs'),
('job offset is the initial phase',B,32,'const offsetMs = Math.max(0, Math.floor(finiteNumber(options.offsetMs, 0)));'),
('start sets first due time from offset',B,58,'job.nextDueAt = this.startedAt + job.offsetMs;'),
('start runs one immediate tick',B,59,'this.tick(this.startedAt);'),
('recurring fixed-step timer calls tick',B,60,'this.timer = this.setInterval(() => this.tick(), this.tickMs);'),
('timer is unref so it does not hold the process',B,61,'this.timer.unref();'),
('tick signature takes timestamp',B,71,'tick(timestamp = this.now()) {'),
('job skipped until its due time',B,76,'if (now < job.nextDueAt) continue;'),
('due count from elapsed time over interval',B,77,'const dueCount = Math.floor((now - job.nextDueAt) / job.intervalMs) + 1;'),
('next due advanced by whole due count',B,78,'job.nextDueAt += dueCount * job.intervalMs;'),
('in-flight job defers its due passes',B,81,'if (job.inFlight) {'),
('deferred count increments by due count',B,82,'job.deferred += dueCount;'),
('coalesced passes counted after stall',B,87,'job.coalesced += dueCount - 1;'),
('job flagged in flight before run',B,90,'job.inFlight = true;'),
('run is deferred to a microtask',B,95,'.then(() => job.run())'),
('error path calls onError',B,108,'this.onError(job.name, error);'),
('in-flight cleared in finally',B,112,'job.inFlight = false;'),
('governor window default 1000 ms floor 100',G,83,'return Math.max(100, Math.floor(number(Config.backgroundGovernorWindowMs, 1000)));'),
('governor budget cap 50 ms player vs 250 idle',G,89,'playerProtected ? 50 : 250)));'),
('window rolls over and resets usedMs',G,94,'if (!state.windowStartedAt || now < state.windowStartedAt'),
('pressure lag read from event loop metric',G,106,'lagMs = Math.max(0, number(Metrics.currentEventLoopLag()));'),
('pressure DB pending read from Database.stats',G,115,'dbPending = Math.max(0, number(Database.stats().pending));'),
('admit entry point',G,144,'function admit(options = {}) {'),
('minimum budget is min of requested and minimum',G,146,'const minimumBudgetMs = Math.max(1, Math.min(requestedBudgetMs'),
('governor bypass when disabled',G,152,'if (Config.backgroundGovernorEnabled === false) {'),
('lag gate defers when lag at or above abort',G,171,'if (pressure.lagMs >= lagAbortMs) return defer(job, \'event_loop_lag\''),
('lag abort default from Config',G,170,'const lagAbortMs = Math.max(1, number(Config.backgroundGovernorLagAbortMs'),
('DB queue gate defers',G,176,'if (pressure.dbPending > dbQueueMax) return defer(job, \'database_queue\''),
('resource lock defers when busy',G,177,'if (resource && state.resources.has(resource)) return defer(job, \'resource_busy\''),
('cap chosen by player protection',G,179,'const capMs = budgetMs(pressure.playerProtected);'),
('budget exhausted gate',G,181,'if (availableMs < minimumBudgetMs) return defer(job, \'budget_exhausted\''),
('granted = max(min, min(requested, available))',G,183,'const grantedBudgetMs = Math.max(minimumBudgetMs, Math.min(requestedBudgetMs'),
('usedMs grows by granted budget',G,193,'state.usedMs += grantedBudgetMs;'),
('complete refunds grant and adds actual time',G,209,'state.usedMs = Math.max(0, state.usedMs - number(lease.budgetMs) + durationMs);'),
('complete only in same window generation',G,208,'if (lease.generation === state.generation) {'),
('overrun counted when actual exceeds grant',G,216,'if (durationMs > number(lease.budgetMs)) {'),
('registry start wired at boot',P,1076,'this.startBackgroundJobRegistry();'),
('registry tick from config default 250 ms',P,1548,'tickMs: Math.max(50, Number(Config.backgroundJobTickMs) || 250),'),
('registry started last in startBackgroundJobRegistry',P,1619,'registry.start();'),
('clan actions requests governor admission',P,1639,'const admission = BackgroundWorkGovernor.admit({'),
('clan actions uses sqlite-heavy resource lock',P,1641,'resource: \'sqlite-heavy\','),
('clan actions minimum budget 10 ms or requested',P,1643,'minimumBudgetMs: Math.min(10, requestedBudgetMs),'),
('clan actions completes lease with measured time',P,1666,'BackgroundWorkGovernor.complete(admission.lease, { durationMs: Date.now() - startedAt });'),
('config tick default 250 ms',C,65,'backgroundJobTickMs: 250,'),
('config governor window 1000 ms',C,66,'backgroundGovernorWindowMs: 1000,'),
('config governor idle budget 250 ms',C,67,'backgroundGovernorIdleBudgetMs: 250,'),
('config governor player budget 50 ms',C,68,'backgroundGovernorPlayerBudgetMs: 50,'),
('config idle DB queue max 8',C,69,'backgroundGovernorIdleDbQueueMax: 8,'),
('config player DB queue max 0',C,70,'backgroundGovernorPlayerDbQueueMax: 0,'),
('config lag abort 120 ms',C,71,'backgroundGovernorLagAbortMs: 120,'),
('lag sampler measures expected vs actual',M,161,'const lag = Math.max(0, measuredAt - expectedAt);'),
('lag sampler stores last sample',M,163,'this.eventLoop.lagMs = lag;'),
('lag sampler reschedules from measured time',M,170,'expectedAt = measuredAt + Config.eventLoopSampleMs;'),
('lag sampler interval is eventLoopSampleMs',M,171,'}, Config.eventLoopSampleMs);'),
('currentEventLoopLag returns last sample',M,494,'currentEventLoopLag() {'),
('test: in-flight job must not overlap',T,66,'an in-flight job must not overlap its next due pass'),
('licence: Apache License title',L,1,'Apache License'),
('licence: Apache 2.0 version line',L,2,'Version 2.0, January 2004'),
('README states Apache 2.0 licence',R,290,'L2Solo is licensed under the Apache 2.0 license.'),
]
with open('/private/tmp/p2/wave2-haiku/batch3/Q037/receipts.tsv','a',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
    for claim,path,line,quote in rows:
        assert '\t' not in quote and '\t' not in claim
        w.writerow([N,claim,path,str(line),quote])
print(len(rows),'rows')
