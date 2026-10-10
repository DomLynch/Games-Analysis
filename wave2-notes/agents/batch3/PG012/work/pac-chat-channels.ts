// Licence: GPL-3.0 (donor LICENSE). Clean-room sketch from the described mechanism, not a translation of the donor.
type Role = "ADMIN" | "MODERATOR" | "BASIC" | "BOT" | "BOT_MANAGER";
interface Author { uid: string; name: string; role: Role; anonymous: boolean; banned: boolean; }
interface ChatMsg { id: string; authorId: string; author: string; payload: string; time: number; }
interface ChannelRules { maxLen: number; canPost: (u: Author) => boolean; }
interface ChatStore {
  save(m: ChatMsg): Promise<void>;
  deleteById(id: string): Promise<void>;
  deleteByAuthor(uid: string): Promise<void>;
}

const RETENTION_S = 7 * 24 * 60 * 60; // data field: store expiry in seconds
const LOBBY: ChannelRules = { maxLen: 250, canPost: (u) => u.role === "ADMIN" || u.role === "MODERATOR" };
const PREP: ChannelRules = { maxLen: 250, canPost: (u) => !u.anonymous };

const isStaff = (u: Author): boolean => u.role === "ADMIN" || u.role === "MODERATOR";

class Channel {
  readonly messages: ChatMsg[] = [];
  private nextId = 0;

  constructor(
    private readonly rules: ChannelRules,
    private readonly profanity: (s: string) => string,
    private readonly store: ChatStore
  ) {}

  // donor order: truncate, filter, role check, memory push, then fire-and-forget store write
  post(u: Author, raw: string, now: number): ChatMsg | null {
    const text = this.profanity(raw.slice(0, this.rules.maxLen));
    if (text === "" || !this.rules.canPost(u)) return null;
    const m: ChatMsg = { id: String(++this.nextId), authorId: u.uid, author: u.name, payload: text, time: now };
    this.messages.push(m);
    void this.store.save(m); // a failed save leaves the message in memory (donor behaviour)
    return m;
  }

  // donor order: role check, store delete, then memory splice
  async remove(actor: Author, id: string): Promise<void> {
    if (!isStaff(actor)) return;
    await this.store.deleteById(id);
    const i = this.messages.findIndex((m) => m.id === id);
    if (i >= 0) this.messages.splice(i, 1);
  }

  // donor order: memory first (synchronous), then store delete by author
  async purgeAuthor(uid: string): Promise<void> {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].authorId === uid) this.messages.splice(i, 1);
    }
    await this.store.deleteByAuthor(uid);
  }
}

// donor order: role check, admin protection, banned flag, purge messages, then disconnect
async function ban(
  actor: Author,
  target: Author,
  channel: Channel,
  setBanned: (uid: string) => Promise<void>,
  disconnect: (uid: string) => void
): Promise<boolean> {
  if (!isStaff(actor) || target.role === "ADMIN") return false;
  await setBanned(target.uid);
  target.banned = true;
  await channel.purgeAuthor(target.uid);
  disconnect(target.uid);
  return true;
}

export { LOBBY, PREP, RETENTION_S, Channel, ban };
