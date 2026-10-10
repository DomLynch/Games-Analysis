// Licence: MIT (donor, LICENSE: "MIT License", Copyright (c) 2023-2026 Lost City). Shape adapted; written from the described mechanism, not a translation of the TypeScript lines.
const FRIEND_CAP = 100;          // non-member accounts
const FRIEND_CAP_MEMBER = 200;   // member accounts
const IGNORE_CAP = 100;
const TICK_MS = 600;

type ChatMode = 'on' | 'friends' | 'off';

interface Online { world: number; mode: ChatMode; staff: boolean; }

class Presence {
  private online = new Map<string, Online>();     // only logged-in accounts
  private friends = new Map<string, string[]>();  // loaded at login, removed at logout
  private ignores = new Map<string, string[]>();
  private actedThisTick = new Set<string>();      // the donor's socialProtect flag

  login(name: string, world: number, mode: ChatMode, staff: boolean, friendList: string[]): void {
    this.online.set(name, { world, mode, staff });
    this.friends.set(name, friendList.slice());
  }

  logout(name: string): void {
    this.online.delete(name);
    this.friends.delete(name);
  }

  // Donor: isVisibleTo. Order: staff viewer sees all; an ignored viewer is hidden; a missing record is OFF; FRIENDS shows only to viewers on the other's list; ON shows all.
  visibleTo(viewer: string, other: string): boolean {
    if (this.online.get(viewer)?.staff === true) return true;
    if (this.ignores.get(other)?.includes(viewer)) return false;
    const mode: ChatMode = this.online.get(other)?.mode ?? 'off';
    if (mode === 'off') return false;
    if (mode === 'friends') return this.friends.get(other)?.includes(viewer) ?? false;
    return true;
  }

  // The world id the viewer is shown for `other`: 0 means offline (also used for hidden).
  worldSeenBy(viewer: string, other: string): number {
    const rec = this.online.get(other);
    if (rec === undefined || !this.visibleTo(viewer, other)) return 0;
    return rec.world;
  }

  // Donor: getFollowers. Online accounts that have `name` in their friend list.
  followersOf(name: string): string[] {
    const out: string[] = [];
    for (const [who, list] of this.friends) {
      if (list.includes(name)) out.push(who);
    }
    return out;
  }

  // Donor: addFriend cap check (count read before the push). Returns false when refused.
  addFriend(name: string, target: string, isMember: boolean, currentCount: number): boolean {
    const list = this.friends.get(name) ?? [];
    if (list.includes(target)) return false;
    const limit = isMember ? FRIEND_CAP_MEMBER : FRIEND_CAP;
    if (currentCount >= limit) return false;
    list.push(target);
    this.friends.set(name, list);
    return true;
  }

  addIgnore(name: string, target: string, currentCount: number): boolean {
    const list = this.ignores.get(name) ?? [];
    if (list.includes(target) || currentCount >= IGNORE_CAP) return false;
    list.push(target);
    this.ignores.set(name, list);
    return true;
  }

  // Donor: socialProtect. One social action per player per tick; the flag clears at the end of each tick.
  tryAct(name: string): boolean {
    if (this.actedThisTick.has(name)) return false;
    this.actedThisTick.add(name);
    return true;
  }

  endTick(): void {
    this.actedThisTick.clear();
  }
}

export {};
