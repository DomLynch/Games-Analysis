import { chatIntake, FloodState, FloodConfig } from "./openra-chat-flood";
const cfg: FloodConfig = { joinCooldownMs: 5000, intervalMs: 5000, maxInWindow: 5, cooldownMs: 15000 };
const st: FloodState = { stamps: [] };
const log: string[] = [];
const send = (t: number) => { const v = chatIntake(st, t, 60000, false, cfg); log.push(`t=${t} blocked=${v.blocked} remaining=${v.remainingMs} pause=${v.uiPauseMs}`); };
for (const t of [0, 1000, 2000, 3000, 4000]) send(t);   // 5 accepted; 5th sets penalty
send(6000);   // expect blocked, remaining 13000 (stamps held to 4000 + 15000 - the 5th message time)
send(18900);  // expect blocked
send(19100);  // expect accepted
console.log(log.join("\n"));
