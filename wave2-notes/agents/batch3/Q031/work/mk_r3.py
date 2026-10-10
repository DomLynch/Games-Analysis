V = '/mnt/frankendom-donors/veloren-veloren/'
note = 'veloren-veloren'
rows = [
('licence field is GPL-3.0-or-later (workspace)', V + 'Cargo.toml', 34, 'license = "GPL-3.0-or-later"'),
('licence text is GPL version 3 (LICENSE)', V + 'LICENSE', 1, 'GNU GENERAL PUBLIC LICENSE'),
('Clock::new takes the target dt', V + 'common/src/clock.rs', 56, 'pub fn new(target_dt: Duration) -> Self {'),
('smoothing weight for busy, dt and variance averages', V + 'common/src/clock.rs', 48, 'const SMOOTH_WEIGHT: f64 = 0.05;'),
('nudge rate of game time toward real time', V + 'common/src/clock.rs', 51, 'const NUDGE_RATE: f64 = 0.05;'),
('game dt is capped at 1/5 s', V + 'common/src/clock.rs', 53, 'const MAX_GAME_DT: f64 = 1.0 / 5.0;'),
('tick entry point', V + 'common/src/clock.rs', 97, 'pub fn tick(&mut self) {'),
('busy time since last work', V + 'common/src/clock.rs', 137, 'let busy_time = self.last_work.elapsed();'),
('measured tick interval', V + 'common/src/clock.rs', 140, 'let tick_time = (this_tick - self.last_tick).as_secs_f64();'),
('sleep for the remainder of the target dt', V + 'common/src/clock.rs', 149, 'if let Some(sleep_dur) = self.target_dt.checked_sub(busy_time) {'),
('spin sleep call', V + 'common/src/clock.rs', 150, 'spin_sleep::sleep(sleep_dur);'),
('real time advances by the last real dt', V + 'common/src/clock.rs', 159, 'self.real_time += Duration::from_secs_f64(self.last_real_dt);'),
('game time never passes real time', V + 'common/src/clock.rs', 163, 'self.game_time = self.game_time.min(self.real_time);'),
('comment: nudge game time toward real time over several ticks', V + 'common/src/clock.rs', 171, 'Instead, we gradually nudge the game time back toward real time over'),
('last real dt is the measured interval', V + 'common/src/clock.rs', 173, 'self.last_real_dt = tick_time;'),
('game dt = average dt plus a nudge toward real time', V + 'common/src/clock.rs', 174, 'self.last_game_dt = (self.average_dt'),
('the nudge term: (real - game) times NUDGE_RATE', V + 'common/src/clock.rs', 175, '+ (self.real_time.as_secs_f64() - self.game_time.as_secs_f64()) * NUDGE_RATE)'),
('game dt is min of that and MAX_GAME_DT', V + 'common/src/clock.rs', 176, '.min(MAX_GAME_DT);'),
('dedicated server target: 30 ticks per second', V + 'server-cli/src/main.rs', 49, 'const TPS: u64 = 30;'),
('dedicated server clock uses target 1/TPS', V + 'server-cli/src/main.rs', 299, 'let mut clock = Clock::new(Duration::from_secs_f64(1.0 / TPS as f64));'),
('dedicated server ticks once per loop with game dt', V + 'server-cli/src/main.rs', 324, '.tick(Input::default(), clock.game_dt())'),
('dedicated server loop waits in clock.tick', V + 'server-cli/src/main.rs', 436, '// Wait for the next tick.'),
('singleplayer server uses the same clock and TPS', V + 'voxygen/src/singleplayer/mod.rs', 199, 'let mut clock = Clock::new(Duration::from_secs_f64(1.0 / TPS as f64));'),
('singleplayer TPS constant', V + 'voxygen/src/singleplayer/mod.rs', 25, 'const TPS: u64 = 30;'),
('server tick takes the game dt', V + 'server/src/lib.rs', 792, 'pub fn tick(&mut self, _input: Input, dt: Duration)'),
('server tick: state tick call', V + 'server/src/lib.rs', 877, 'self.state.tick('),
('server tick: sync step comment', V + 'server/src/lib.rs', 910, '// 6) Synchronise clients with the new state of the world.'),
('server tick: sync systems run', V + 'server/src/lib.rs', 911, 'sys::run_sync_systems(self.state.ecs_mut());'),
('server tick: world tick with the same dt', V + 'server/src/lib.rs', 916, 'self.world.tick(dt);'),
('client tick takes the game dt', V + 'client/src/lib.rs', 2348, 'pub fn tick(&mut self, inputs: ControllerInputs, dt: Duration)'),
('client tick order comment', V + 'client/src/lib.rs', 2350, 'This tick function is the centre of the Veloren universe.'),
('client pings once per second', V + 'client/src/lib.rs', 2475, '// Send a ping to the server once every second'),
('client ping timer check', V + 'client/src/lib.rs', 2476, 'if self.state.get_program_time() - self.last_server_ping > 1. {'),
('client rolling average ping accessor', V + 'client/src/lib.rs', 3316, 'pub fn get_ping_ms_rolling_avg(&self) -> f64 {'),
]
out = '/private/tmp/p2/wave2-haiku/batch3/Q031/receipts.tsv'
with open(out, 'a', newline='') as f:
    for claim, fn, ln, q in rows:
        assert '\t' not in claim and '\t' not in q
        f.write('\t'.join([note, claim, fn, str(ln), q]) + '\n')
print('appended', len(rows))
