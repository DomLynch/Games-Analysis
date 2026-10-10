// Licence: Sustainable Use License 1.0 (restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Critter {
  pid: number;
  id: number;          // stable party id: PARTY_ID_BASE + (pid & 0xffffff)
  team: number;
  alive: boolean;
  hidden: boolean;
  isCritter: boolean;
  noRemove: boolean;   // true while a party member, so it cannot be removed by ordinary means
}

const PARTY_ID_BASE = 18000;
const SLACK = 20;      // fixed slack above the data-driven base count

// roster[0] is the player and is never removed.
class Party {
  private roster: Critter[] = [];
  private locked = false;   // set while a save is being prepared; blocks join and leave

  constructor(player: Critter, private baseCount: number) {
    this.roster.push(player);
  }

  get capacity(): number {
    return this.baseCount + SLACK;
  }

  // Full roster refuses first; then a member already present is a no-op success; then the lock.
  add(c: Critter): number {
    if (this.roster.length >= this.capacity) return -1;
    if (this.roster.some((m) => m === c || m.pid === c.pid)) return 0;
    if (this.locked) return -1;
    c.id = PARTY_ID_BASE + (c.pid & 0xffffff);
    c.noRemove = true;
    c.team = 0;
    this.roster.push(c);
    return 0;
  }

  // The player (slot 0) is never found here. Removal swaps the last member into the gap.
  remove(c: Critter): number {
    if (this.roster.length === 0) return -1;
    let i = -1;
    for (let k = 1; k < this.roster.length; k++) {
      if (this.roster[k] === c) {
        i = k;
        break;
      }
    }
    if (i < 0) return -1;
    if (this.locked) return -1;
    const last = this.roster.length - 1;
    if (i < last) this.roster[i] = this.roster[last];
    this.roster.pop();
    c.noRemove = false;
    return 0;
  }

  // Counts the player plus members that are alive, visible critters.
  activeCount(): number {
    let n = this.roster.length;
    for (let k = 1; k < this.roster.length; k++) {
      const m = this.roster[k];
      if (!m.isCritter || !m.alive || m.hidden) n--;
    }
    return n;
  }

  // Ids below the base can never be members: quick reject, then a scan.
  isMember(c: Critter): boolean {
    if (c.id < PARTY_ID_BASE) return false;
    return this.roster.includes(c);
  }

  // A member killed in combat leaves the party.
  onKill(c: Critter): void {
    this.remove(c);
  }

  prepSave(): void {
    this.locked = true;
  }

  unprepSave(): void {
    this.locked = false;
  }

  // Unlock first, then remove every member except the player.
  reset(): void {
    this.locked = false;
    for (let n = this.roster.length; n > 1; n--) this.remove(this.roster[1]);
  }
}

export {};
