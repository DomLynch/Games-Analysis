// Clean-room sketch: friend-list presence with a privacy rule and follower fan-out, plus a one-social-packet-per-tick gate.
// Donor licence: MIT (Lost City, 2023-2025; LICENSE). Written from the described mechanism; no donor lines copied.
// clean-room
export enum ChatPrivate { ON = 0, FRIENDS = 1, OFF = 2 }

interface Presence {
  world: number;
  chat: ChatPrivate;
  friends: string[];
  ignores: Set<string>;
  staff: boolean;
}

class PresenceBook {
  private online = new Map<string, Presence>();

  constructor(private readonly friendCap = 100) {}

  login(name: string, world: number, chat: ChatPrivate, friends: string[], ignores: string[], staff: boolean): void {
    this.online.set(name, { world, chat, friends, ignores: new Set(ignores), staff });
  }

  logout(name: string): void {
    this.online.delete(name);
  }

  setChat(name: string, chat: ChatPrivate): void {
    const p = this.online.get(name);
    if (p) p.chat = chat;
  }

  // Ordered checks, first match wins: staff viewer; ignored by the subject; subject OFF; subject FRIENDS (viewer must be on the subject's list); else visible.
  isVisibleTo(viewer: string, other: string): boolean {
    if (this.online.get(viewer)?.staff) return true;
    const o = this.online.get(other);
    if (o?.ignores.has(viewer)) return false;
    const chat = o?.chat ?? ChatPrivate.OFF;
    if (chat === ChatPrivate.OFF) return false;
    if (chat === ChatPrivate.FRIENDS) return o?.friends.includes(viewer) ?? false;
    return true;
  }

  // The friend list a viewer is sent at login: visible online friends with their world, then every other friend with world 0.
  friendListFor(viewer: string): [number, string][] {
    const friends = this.online.get(viewer)?.friends ?? [];
    const out: [number, string][] = [];
    for (const f of friends) {
      const p = this.online.get(f);
      if (p && this.isVisibleTo(viewer, f)) out.push([p.world, f]);
    }
    for (const f of friends) {
      if (!out.some(x => x[1] === f)) out.push([0, f]);
    }
    return out;
  }

  // When `who` changes (login, logout, chat mode, friend or ignore edit), every online player who lists `who` gets one entry.
  fanOut(who: string): { viewer: string; entry: [number, string] }[] {
    const updates: { viewer: string; entry: [number, string] }[] = [];
    for (const [viewer, p] of this.online) {
      if (!p.friends.includes(who)) continue;
      const subject = this.online.get(who);
      const world = this.isVisibleTo(viewer, who) && subject ? subject.world : 0;
      updates.push({ viewer, entry: [world, who] });
    }
    return updates;
  }

  canAddFriend(name: string): boolean {
    const p = this.online.get(name);
    return !!p && p.friends.length < this.friendCap;
  }
}

// One social packet per player per tick: the first is taken, the rest of the tick are refused, the flag clears at tick end.
class SocialGate {
  private used = new Set<string>();

  tryUse(name: string): boolean {
    if (this.used.has(name)) return false;
    this.used.add(name);
    return true;
  }

  endTick(): void {
    this.used.clear();
  }
}

export {};
