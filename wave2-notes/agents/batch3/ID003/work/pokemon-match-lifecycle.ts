// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Phase = "prep" | "loading" | "live" | "after" | "disposed";

interface Config {
  maxPlayers: number;       // donor: 8 (config/server/network.ts:6)
  loadingMs: number;        // donor: 3 min, then the match starts regardless (network.ts:13)
  liveReconnectMs: number;  // donor: 5 min (config/game/game.ts:3)
  prepReconnectMs: number;  // donor: 10 s (preparation-room.ts onDrop)
  afterReconnectMs: number; // donor: 20 s (after-game-room.ts onDrop)
  afterLifeMs: number;      // donor: 120 s, then disconnect (after-game-room.ts onCreate)
  countStage: number;       // donor: 10 (config/game/elo.ts:4)
  earlyLeaveStage: number;  // donor: 5 (game-room.ts onLeave: stage <= 5 and not consented)
  quitPenaltyMs: number;    // donor: 5 min, no joining another match (givePlayerTimeout)
}

interface Slot {
  id: string;
  isBot: boolean;
  alive: boolean;
}

interface Instance {
  phase: Phase;
  stage: number;                      // game stage reached
  finished: boolean;
  endsAt: number;                     // deadline for the current timed phase, ms
  players: Map<string, Slot>;
  reconnectUntil: Map<string, number>; // per player, set on drop
  quitUntil: Map<string, number>;      // per player, blocks the next join
}

// Admission gate on match start. fix: the donor passes heapUsed as "free" memory, which inverts the check;
// here the caller passes real free bytes (total minus used).
function admitStart(
  freeBytes: number,
  totalBytes: number,
  humans: number,
  maxPlayers: number,
): "ok" | "no-memory" | "no-bots" | "no-solo" {
  const freeRatio = freeBytes / totalBytes;
  if (freeRatio < 0.1) return "no-memory";
  if (freeRatio < 0.2 && humans < maxPlayers) return "no-bots";
  if (freeRatio < 0.4 && humans === 1) return "no-solo";
  return "ok";
}

function startMatch(inst: Instance, cfg: Config, now: number, freeBytes: number, totalBytes: number, humans: number): boolean {
  if (inst.phase !== "prep") return false;
  if (admitStart(freeBytes, totalBytes, humans, cfg.maxPlayers) !== "ok") return false;
  inst.phase = "loading";
  inst.endsAt = now + cfg.loadingMs;
  return true;
}

// Loading ends when everyone reports 100%, or when the loading clock runs out.
function tickLoading(inst: Instance, now: number, allLoaded: boolean): void {
  if (inst.phase !== "loading") return;
  if (allLoaded || now >= inst.endsAt) inst.phase = "live";
}

// Drop: the player keeps a reconnect window that depends on the room they are in.
function onDrop(inst: Instance, cfg: Config, id: string, now: number): void {
  const window =
    inst.phase === "prep" ? cfg.prepReconnectMs : inst.phase === "after" ? cfg.afterReconnectMs : cfg.liveReconnectMs;
  inst.reconnectUntil.set(id, now + window);
}

function canRejoin(inst: Instance, id: string, now: number): boolean {
  const until = inst.reconnectUntil.get(id);
  return until !== undefined && until > now;
}

// Leave: an early technical drop removes the player with no reward; a leave during play is a surrender.
function onLeave(inst: Instance, cfg: Config, id: string, consented: boolean, now: number): void {
  const slot = inst.players.get(id);
  if (!slot) return;
  if (inst.stage <= cfg.earlyLeaveStage && !consented) {
    inst.players.delete(id);
    return;
  }
  if (slot.alive && !inst.finished) {
    slot.alive = false; // donor sets life to -99, which ranks last
    const otherHumans = [...inst.players.values()].filter((p) => !p.isBot && p.id !== id).length;
    if (!slot.isBot && otherHumans >= 1) inst.quitUntil.set(id, now + cfg.quitPenaltyMs);
  }
}

function canJoinNext(inst: Instance, id: string, now: number): boolean {
  const until = inst.quitUntil.get(id);
  return until === undefined || until <= now;
}

function finish(inst: Instance, cfg: Config, now: number): void {
  inst.finished = true;
  inst.phase = "after";
  inst.endsAt = now + cfg.afterLifeMs;
}

// Dispose rule: an unfinished match is not rated; a finished one is rated only from countStage on.
function disposeOutcome(inst: Instance, cfg: Config): "skip" | "rate" | "unrated" {
  const alive = [...inst.players.values()].filter((p) => p.alive);
  const aliveHumans = alive.filter((p) => !p.isBot);
  if (alive.length >= 2 && aliveHumans.length >= 1) return "skip";
  return inst.stage >= cfg.countStage ? "rate" : "unrated";
}

// The after-game room closes itself when its clock runs out.
function tick(inst: Instance, now: number): void {
  if (inst.phase === "after" && now >= inst.endsAt) inst.phase = "disposed";
}

export {};
