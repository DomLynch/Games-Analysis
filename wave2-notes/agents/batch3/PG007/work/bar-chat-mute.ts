// Licence: GNU GPL v2 or later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Key = string; // "acc:<accountId>" or "name:<playerName>"

type Scope = "ALL" | "TEAM" | "SPEC" | "PRIVATE";

interface ChatLine {
  keys: Key[];      // the sender's keys: account id (when known) and name
  scope: Scope;
  text: string;
  hidden: boolean;  // hidden, never deleted: unmuting shows the history again
}

// The channel comes from a prefix on the raw line; no prefix means ALL.
function parseLine(raw: string): { scope: Scope; text: string } {
  if (raw.startsWith("Allies: ")) return { scope: "TEAM", text: raw.slice(8) };
  if (raw.startsWith("Spectators: ")) return { scope: "SPEC", text: raw.slice(12) };
  if (raw.startsWith("Private: ")) return { scope: "PRIVATE", text: raw.slice(9) };
  return { scope: "ALL", text: raw };
}

class MuteList {
  private keys = new Set<Key>();

  constructor(private inGame: Set<number>) {}

  // An account id is used only for accounts present in this game; the name is always added as an alias.
  mute(accountId: number | null, name: string): void {
    if (accountId !== null && this.inGame.has(accountId)) this.keys.add(`acc:${accountId}`);
    if (name !== "") this.keys.add(`name:${name}`);
  }

  unmute(accountId: number | null, name: string): void {
    if (accountId !== null) this.keys.delete(`acc:${accountId}`);
    if (name !== "") this.keys.delete(`name:${name}`);
  }

  isMuted(keys: Key[]): boolean {
    return keys.some((k) => this.keys.has(k));
  }

  snapshot(): Set<Key> {
    return new Set(this.keys);
  }
}

// Diff the mute set between two checks and flip only the lines whose state changed.
function resyncHidden(log: ChatLine[], before: Set<Key>, after: Set<Key>): void {
  for (const line of log) {
    const wasMuted = line.keys.some((k) => before.has(k));
    const isMuted = line.keys.some((k) => after.has(k));
    if (!wasMuted && isMuted) line.hidden = true;       // newly muted: hide the history
    else if (wasMuted && !isMuted) line.hidden = false; // unmuted: show it again
  }
}

class ChatView {
  private acc = 0;
  private snap: Set<Key>;

  constructor(private log: ChatLine[], private mutes: MuteList) {
    this.snap = mutes.snapshot();
  }

  // New lines are checked once on arrival.
  receive(line: ChatLine): void {
    line.hidden = this.mutes.isMuted(line.keys);
    this.log.push(line);
  }

  // Runs in the UI update, but the mute diff is checked once per second, not per frame.
  update(dt: number): void {
    this.acc += dt;
    if (this.acc <= 1) return;
    this.acc = 0;
    const now = this.mutes.snapshot();
    resyncHidden(this.log, this.snap, now);
    this.snap = now;
  }

  visible(): ChatLine[] {
    return this.log.filter((l) => !l.hidden);
  }
}

export {};
