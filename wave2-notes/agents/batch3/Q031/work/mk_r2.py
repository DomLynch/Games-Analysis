E = '/mnt/frankendom-donors/EQEmu/'
note = 'EQEmu'
rows = [
('zone loop is a lambda run by an EQ timer', E + 'zone/main.cpp', 512, 'auto loop_fn = [&](EQ::Timer *t) {'),
('loop advances the cached clock once per firing', E + 'zone/main.cpp', 514, 'Timer::SetCurrentTime();'),
('frame_time is the raw wall delta between firings', E + 'zone/main.cpp', 520, 'frame_time = std::chrono::duration_cast<std::chrono::duration<double>>'),
('zone loop timer repeats every 32 ms', E + 'zone/main.cpp', 636, 'process_timer.Start(32, true);'),
('mob processing runs inside the zone-loaded block', E + 'zone/main.cpp', 604, 'entity_list.MobProcess();'),
('zone process (movement manager) is called from the loop', E + 'zone/main.cpp', 611, 'if (!zone->Process()) {'),
('worldserver process is on a 1000 ms timer', E + 'zone/main.cpp', 474, 'Timer WorldserverProcess(1000);'),
('quest timers are on a 100 ms timer', E + 'zone/main.cpp', 504, 'Timer quest_timers(100);'),
('zone process calls the movement manager', E + 'zone/zone.cpp', 1698, 'mMovementManager->Process();'),
('movement step uses frame_time times speed times 0.4 times 1.45', E + 'zone/mob_movement_manager.cpp', 221, 'distance_moved = frame_time * current_speed * 0.4f * 1.45f;'),
('movement snaps to target when the step passes it', E + 'zone/mob_movement_manager.cpp', 223, 'if (distance_moved > len) {'),
('movement clock is the cached timer clock in seconds', E + 'zone/mob_movement_manager.cpp', 155, 'static_cast<double>(Timer::GetCurrentTime()) / 1000.0;'),
('rotation step is rotate speed times 19 times frame_time', E + 'zone/mob_movement_manager.cpp', 100, 'auto td = rotate_to_speed * 19.0 * frame_time;'),
('move command sends a heartbeat every 5.0 s', E + 'zone/mob_movement_manager.cpp', 197, 'if (current_time - m_last_sent_time >= 5.0) {'),
('move command correction: FixZ every 1 unit engaged, 10 not', E + 'zone/mob_movement_manager.cpp', 252, 'if (m_distance_moved_since_correction > (mob->IsEngaged() ? 1 : 10)) {'),
('fly command heartbeat is 0.5 s', E + 'zone/mob_movement_manager.cpp', 346, 'if (current_time - m_last_sent_time >= 0.5) {'),
('swim command heartbeat is 1.5 s', E + 'zone/mob_movement_manager.cpp', 466, 'if (current_time - m_last_sent_time >= 1.5) {'),
('legacy timer fires when the period has elapsed', E + 'common/timer.cpp', 84, 'if (enabled && current_time-start_time > timer_time) {'),
('accurate timers advance start by one period, else restart from now', E + 'common/timer.cpp', 87, 'start_time += timer_time;'),
('legacy clock advances by wall-clock delta', E + 'common/timer.cpp', 191, 'current_time += this_time - last_time;'),
('Check resets by default', E + 'common/timer.h', 38, 'bool Check(bool iReset = true);'),
('accurate timing is off by default in the constructor', E + 'common/timer.h', 34, 'Timer(uint32 timer_time, bool iUseAcurateTiming = false);'),
('movement timer default is 100 ms', E + 'common/features.h', 146, 'AImovement_duration = 100,'),
('think timer default is 50 ms', E + 'common/features.h', 147, 'AIthink_duration = 50,'),
('target check timer default is 500 ms', E + 'common/features.h', 150, 'AItarget_check_duration = 500,'),
('NPC think timer is built from the think duration', E + 'zone/mob_ai.cpp', 434, 'AI_think_timer = std::make_unique<Timer>(AIthink_duration);'),
('NPC movement timer is built from the movement duration', E + 'zone/mob_ai.cpp', 438, 'std::make_unique<Timer>(AImovement_duration);'),
('NPC AI runs on the think timer or the attack timer', E + 'zone/mob_ai.cpp', 969, 'if (!(AI_think_timer->Check() || attack_timer.Check(false)))'),
('NPC AI entry point', E + 'zone/mob_ai.cpp', 965, 'void Mob::AI_Process() {'),
('mob loop: idle-when-empty gate', E + 'zone/entity.cpp', 471, 'if (zone->IsIdleWhenEmpty()) {'),
('mob loop: process when clients, quest override or path-while-idle', E + 'zone/entity.cpp', 514, 'numclients > 0 || zone->quest_idle_override ||'),
('mob loop: depop check when the zone is empty and idle', E + 'zone/entity.cpp', 522, 'mob_dead = mob->CastToNPC()->GetDepop();'),
('mob loop entry point', E + 'zone/entity.cpp', 457, 'void EntityList::MobProcess()'),
('event-loop timer repeats at the given period', E + 'common/event/timer.cpp', 58, '}, duration_ms, duration_ms);'),
('licence: GPL version 3 or later (zone/main.cpp)', E + 'zone/main.cpp', 7, 'either version 3 of the License, or'),
('licence: GPL version 3 or later (common/event/timer.cpp)', E + 'common/event/timer.cpp', 7, 'either version 3 of the License, or'),
]
out = '/private/tmp/p2/wave2-haiku/batch3/Q031/receipts.tsv'
with open(out, 'a', newline='') as f:
    for claim, fn, ln, q in rows:
        assert '\t' not in claim and '\t' not in q
        f.write('\t'.join([note, claim, fn, str(ln), q]) + '\n')
print('appended', len(rows))
