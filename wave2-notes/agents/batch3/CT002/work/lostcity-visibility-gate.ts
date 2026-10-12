// Licence: MIT (donor). Shape re-expressed from the described rule; adapted with the donor gaps fixed.
enum ChatMode {
  ON = 0,
  FRIENDS = 1,
  OFF = 2,
}

interface SocialView {
  isStaff(id: string): boolean;                      // donor: playerStaff set (staff level above 1 at register)
  ignores(owner: string, other: string): boolean;    // owner's ignore list contains other
  chatMode(owner: string): ChatMode | undefined;     // undefined = not known (not online or not loaded)
  friends(owner: string, other: string): boolean;    // owner's friend list contains other
}

// Donor precedence, kept: staff, then ignore, then the owner's mode (unknown = OFF), then friends-only, then on.
function canSee(v: SocialView, viewer: string, owner: string): boolean {
  if (v.isStaff(viewer)) return true;
  if (v.ignores(owner, viewer)) return false;
  const mode = v.chatMode(owner) ?? ChatMode.OFF;
  if (mode === ChatMode.OFF) return false;
  if (mode === ChatMode.FRIENDS) return v.friends(owner, viewer);
  return true;
}

// Fix 1: a saved value outside 0..2 becomes OFF. The donor falls back to ON (open) at login and at set-mode.
function parseChatMode(raw: number): ChatMode {
  return raw === 0 || raw === 1 || raw === 2 ? (raw as ChatMode) : ChatMode.OFF;
}

// Fix 2: private messages use the same gate. The donor's delivery path never calls it.
function canDeliverPm(v: SocialView, from: string, to: string): boolean {
  return canSee(v, from, to);
}

export {};
