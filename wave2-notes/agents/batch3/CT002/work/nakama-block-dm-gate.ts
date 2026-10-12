// Licence: Apache-2.0 (donor). Shape re-expressed from the described mechanism; not a translation of the Go source.
type EdgeState = "friend" | "invite" | "blocked";

interface PresenceHub {
  untrackStream(stream: string): void; // donor: tracker.UntrackByStream(stream)
}

class SocialGraph {
  // One state per ordered pair: "src>dst". A block is stored on the blocker's side only.
  private edges = new Map<string, EdgeState>();

  constructor(private users: Set<string>, private presence: PresenceHub) {}

  private key(src: string, dst: string): string {
    return `${src}>${dst}`;
  }

  state(src: string, dst: string): EdgeState | undefined {
    return this.edges.get(this.key(src, dst));
  }

  // Canonical DM stream: the smaller id is always the first part, so both sides compute the same key.
  dmStream(a: string, b: string): string {
    const [lo, hi] = a < b ? [a, b] : [b, a];
    return `dm.${lo}.${hi}`;
  }

  // Block: replace my edge to them with "blocked"; drop their invite/friend edge toward me unless it is a block;
  // then remove both users from the open DM stream.
  block(me: string, other: string): void {
    if (!this.users.has(other)) return; // donor: silent no-op when the target does not exist
    this.edges.set(this.key(me, other), "blocked");
    if (this.state(other, me) !== "blocked") this.edges.delete(this.key(other, me));
    this.presence.untrackStream(this.dmStream(me, other));
  }

  // Donor gate checks only whether the target blocked the sender.
  // Fix: refuse when either side has blocked the other. Unknown and blocked get the same error (no enumeration).
  canJoinDm(sender: string, target: string): { ok: true } | { ok: false; error: string } {
    if (!this.users.has(target)) return { ok: false, error: "User ID not found" };
    if (this.state(target, sender) === "blocked" || this.state(sender, target) === "blocked") {
      return { ok: false, error: "User ID not found" };
    }
    return { ok: true };
  }

  // A user who was blocked by the target cannot add the target as a friend.
  canAddFriend(sender: string, target: string): boolean {
    return this.state(target, sender) !== "blocked";
  }
}

export {};
