// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface EngineMsg {
  type: string;        // one-character message type
  hedgehog?: number;   // unit index for 'h' messages
  team?: number;       // team index that owns the unit
  empty: boolean;      // empty message (type '+' in the donor)
  timed: boolean;      // true unless the type is in the non-timed set
  raw: string;         // encoded message, kept for relay and log
}

export interface FightLog {
  entries: string[];   // ordered, append-only replay log
  sync: string | null; // last timed message of the latest batch, only if it was empty
}

const MAX_UNITS_PER_TEAM = 8; // donor constant, passed here as data

export function isValid(m: EngineMsg, allowed: ReadonlySet<string>, ownedTeams: ReadonlySet<number>): boolean {
  if (!allowed.has(m.type)) return false;
  if (m.type === "h") {
    return (
      m.hedgehog !== undefined &&
      m.hedgehog >= 1 &&
      m.hedgehog <= MAX_UNITS_PER_TEAM &&
      m.team !== undefined &&
      ownedTeams.has(m.team)
    );
  }
  return true;
}

export function ingestBatch(
  batch: EngineMsg[],
  inGame: boolean,
  allowed: ReadonlySet<string>,
  ownedTeams: ReadonlySet<number>,
  log: FightLog,
  relay: (msgs: EngineMsg[]) => void,
): void {
  if (!inGame) return;
  const valid = batch.filter((m) => isValid(m, allowed, ownedTeams));
  if (valid.length > 0) relay(valid);
  for (const m of valid) {
    if (!m.empty) log.entries.push(m.raw);
  }
  const timed = valid.filter((m) => m.timed);
  if (timed.length > 0) {
    const last = timed[timed.length - 1];
    log.sync = last.empty ? last.raw : null;
  }
}

export function onTeamLeft(log: FightLog, teamName: string): void {
  if (log.sync !== null) {
    log.entries.push(log.sync);
    log.sync = null;
  }
  log.entries.push("F" + teamName);
}

export {};
