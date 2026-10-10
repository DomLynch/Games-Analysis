// Licence: GPL-2.0 (donor). Clean-room shape only: written from the described mechanism; no donor line is copied.

type SpeedState = 0 | 1 | 2;   // 0 normal, 1 hasted, 2 slowed (the three states the donor's switch covers)
type ActionKind = 'move' | 'attack' | 'magic';

interface NpcSpeed { moveState: SpeedState; brave: boolean; windShackled: boolean; }

const DEFAULT_SLEEP_MS = 300;    // every pass starts by setting this
const ITEM_GONE_SLEEP_MS = 1000; // the ground item it was heading for has vanished
const PARALYSIS_POLL_MS = 200;   // while paralysed or asleep, poll this often

// Java int arithmetic truncates after each step, so truncate after each one here too.
function scaledSleepMs(baseMs: number, kind: ActionKind, s: NpcSpeed): number {
  let ms = baseMs;
  if (s.moveState === 1) ms = Math.trunc(ms - ms * 0.25);
  else if (s.moveState === 2) ms = Math.trunc(ms * 2);
  if (s.brave) ms = Math.trunc(ms - ms * 0.25);
  if (s.windShackled && (kind === 'attack' || kind === 'magic')) ms = Math.trunc(ms + ms * 0.25);
  return ms;
}

type PassResult =
  | { kind: 'stop' }                                      // AIProcess returned true: nothing to do or hidden
  | { kind: 'wait' }                                      // no action this pass: default sleep
  | { kind: 'item-gone' }                                 // target item vanished: idle sleep
  | { kind: 'act'; action: ActionKind; baseMs: number };  // move, attack or magic with a base delay

interface NpcState { dead: boolean; hidden: boolean; destroyed: boolean; paralysed: boolean; asleep: boolean; }

// Returns the delay until the next pass, or null to stop until something restarts the AI.
function nextWakeMs(npc: NpcState, result: PassResult, speed: NpcSpeed): number | null {
  if (npc.destroyed || npc.dead || npc.hidden) return null;
  if (npc.paralysed || npc.asleep) return PARALYSIS_POLL_MS;
  switch (result.kind) {
    case 'stop': return null;
    case 'wait': return DEFAULT_SLEEP_MS;
    case 'item-gone': return ITEM_GONE_SLEEP_MS;
    case 'act': return scaledSleepMs(result.baseMs, result.action, speed);
  }
}

// Helper pool sizing: one monitor thread per 20 online players, plus one (integer division).
function monitorPoolSize(maxOnlineUsers: number): number {
  return 1 + Math.trunc(maxOnlineUsers / 20);
}

export {};
