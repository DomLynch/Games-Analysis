# l1j-en-classic (parties-guilds-chat, cell 3)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Party.java` | Licence: GPL-2.0-or-later (per the L1Party.java header, "either version 2, or (at your option) any later version"; the repo `COPYING` is the GPL v2 text) | Java | symbols `L1Party.addMember`, `leaveMember`, `kickMember`; invite `C_CreateParty`; accept `C_Attr` case 953

Checked: Read in full `L1Party.java` (184 lines: `addMember` 38-55, `removeMember` 57-67, `createMiniHp` / `deleteMiniHp` / `updateMiniHP` 101-128, `breakup` 130-137, `leaveMember` 139-159, `kickMember` 161-170, `sendLeftMessage` 180-182). Read in full `C_CreateParty.java` (party invite branch 35-71; the chat-party branch 73-101 was read but not analysed), `C_BanParty.java`, `C_LeaveParty.java`. Read `C_Attr.java` 370-439 (the party accept and decline branch, case 953; the chat-party branch 951 was read only as far as line 412). `L1PcInstance.java`: `_partyID` field (804), getter (1821), setter (3033-3035); grep finds `setPartyID` called only from `C_CreateParty` and `C_Attr`, and reads only at C_Attr 391 and 416; no timer or timeout touches it. Cap: `Config.java` 899 (default "8") and `config/altsettings.properties` 41 (`MaxPT = 8`); the same key is read again at Config.java 1350-1351. Callers: `leaveMember` and `kickMember` callers located by grep (`Client.java` 179 disconnect path, `L1DeathMatch.java` 196, `C_LeaveParty`, `C_BanParty`, `C_ChatParty`); only the two client handlers were read. Hint file `command/executor/L1Chat.java` (66 lines) is a GM command class; a grep for party|clan|friend|guild finds nothing, not read in full. Not read: `L1ChatParty.java` (a separate chat group with its own cap), `L1Clan.java` and `L1Buddy.java` (guilds and friends), and the chat-party branch 951 in full. Confidence: high on the party roster, the invite and accept order, leave and kick; moderate on "no timeout" (grep only). camera_scope not applicable. Depth: full for the party mechanism.

## 1. Mechanism

- A party is an in-memory roster (`L1Party._membersList`) with a leader (`_leader`). The first member added becomes leader (`addMember` 47-48). Members point back to the party (`pc.setParty(this)`, 54).
- Invite (`C_CreateParty`, type 0 or 1 by target id): the sender and target must be different (47-49), on the same map, within `getTileLineDistance` 5 (51-54; the distance function is not read); a target already in a party gets refused with message 415 (56-59); if the sender is in a party it must be the leader or it gets 416 (61-67); then the target's `_partyID` is set to the sender's id (63 or 69) and the target gets the yes/no dialog 953 (64 or 70). The pending invite is ONE slot per target: a second invite overwrites the first.
- Accept (`C_Attr` 953, c = 1): the inviter is read back from the pending slot (415). If the inviter is in a party, the accepter joins only if that party has a vacancy or the INVITER is a GM (425-426); otherwise the accepter gets 417 (428). If the inviter is not in a party, a new `L1Party` is created with the inviter as first member (leader) and the accepter second (431-433). Decline (c = 0) clears the slot (421) and tells the inviter 423 (420).
- `addMember` (38-55): when the party is at `Config.MAX_PT` and the leader is not a GM, or the person is already a member, it returns with no message (42-44). Otherwise it adds the member and, for each existing member, sends HP meters both ways (createMiniHp 101-110). The meter value is `100 * currentHp / maxHp` (integer math, 105-108); removal sends 0xff (deleteMiniHp 112-119).
- Leave (`C_LeaveParty` -> `leaveMember`, 139-159): if the leaver is the leader, the whole party breaks up (141-142; `breakup` 130-137 removes each member and sends 418). Otherwise, with two members, the leaver and the other member (the leader) are both removed and the party ends (144-150). With three or more, only the leaver is removed and the remaining members get 420 (151-156).
- Kick (`C_BanParty`, by name): the sender must be the leader (36-39; 427 otherwise), the name is matched case-insensitively against the members (41-46), and `kickMember` runs (161-170). With two members both are removed (162-165); with more, only the kicked member (167); the kicked member gets 419 (169).
- No tick and no network timing: all changes are event-driven by client packets.

## 2. Key functions

- `L1Party.addMember`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Party.java` 38-55. Cap, GM bypass, duplicate guard, leader choice, meter sync.
- `L1Party.leaveMember`: same file 139-159. Breakup, two-member dissolve, notices.
- `L1Party.kickMember`: same file 161-170.
- Invite: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/clientpackets/C_CreateParty.java` 35-71.
- Accept and decline: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/clientpackets/C_Attr.java` 413-439.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Roster cap with a vacancy test | `MAX_PT` = 8 (altsettings.properties 41; Config.java 899) |
| Invite range check (same map, tile distance) | 5 tiles (C_CreateParty.java 52) |
| One pending invite per target, overwritten by the next | slot is `_partyID` (L1PcInstance.java 804) |
| Leader-only invite and kick | leader = first member (L1Party.java 47-48) |
| HP meter as integer percent | `100 * cur / max` (L1Party.java 105-108); clear = 0xff (116-117) |
| Two-member party ends when either leaves or is kicked | rule, no number |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for invite (same map, range, target not in a party, leader-only), accept (vacancy or inviter-GM check, else new party), add (cap with GM-leader bypass, duplicate guard, meters both ways), leave (leader breakup, two-member dissolve, notices) and kick (two-member rule, 419). It DIFFERS on purpose in four places: notices are sent once per member (the donor sends the leaver two 420 notices, because its member snapshot includes the leaver, L1Party.java 140, 153-156); a silent refusal in `add` is reported to the caller as "party-full" (the donor shows the accepter no message); the pending slot is kept on accept as in the donor (no reset), which Frankendom must change; and the distance function, the GM and chat-party branches, the 415/416/417 messages and the disconnect path are not modelled. Map and distance come in as parameters.

```ts
// Licence: GPL-2.0-or-later (per the L1Party.java header; COPYING is the GPL v2 text). Clean-room sketch from the described mechanism, not a translation of the donor.
const MAX_PT = 8;             // data field: altsettings MaxPT (default 8)
const INVITE_RANGE_TILES = 5; // data field: invite distance (donor limit is 5)

type PartyEvent =
  | { kind: "hp"; of: number; pct: number }   // mini HP meter, 0..100
  | { kind: "clear"; of: number }             // meter removed
  | { kind: "notice"; code: 418 | 419 | 420; name: string };

interface Player {
  id: number; name: string; mapId: number; x: number; y: number;
  isGm: boolean; hp: number; maxHp: number;
  party: Party | null;
  pendingFrom: number; // one pending invite slot (donor partyID); 0 = none
}

type InviteResult = "sent" | "ignored" | "target-in-party" | "not-leader";
type AcceptResult = "joined" | "new-party" | "party-full" | "no-invite";

const hpPct = (p: Player): number => Math.floor((100 * p.hp) / p.maxHp);

class Party {
  private members: Player[] = [];
  private leader: Player | null = null;

  constructor(private readonly cap: number, private readonly emit: (to: Player, e: PartyEvent) => void) {}

  vacancy(): boolean { return this.members.length < this.cap; }
  isLeader(p: Player): boolean { return this.leader === p; }

  // donor addMember: a full party refuses unless the leader is a GM; a duplicate is refused; both silently
  add(p: Player): "added" | "ignored" {
    if ((this.members.length === this.cap && !this.leader?.isGm) || this.members.includes(p)) return "ignored";
    if (this.members.length === 0) this.leader = p;
    const others = [...this.members];
    this.members.push(p);
    p.party = this;
    for (const m of others) { // meters both ways, as createMiniHp
      this.emit(p, { kind: "hp", of: m.id, pct: hpPct(m) });
      this.emit(m, { kind: "hp", of: p.id, pct: hpPct(p) });
    }
    return "added";
  }

  // donor removeMember: drop, clear party link, clear meters both ways (no notices here)
  private remove(p: Player): void {
    if (!this.members.includes(p)) return;
    this.members = this.members.filter((m) => m !== p);
    p.party = null;
    for (const m of this.members) {
      this.emit(p, { kind: "clear", of: m.id });
      this.emit(m, { kind: "clear", of: p.id });
    }
  }

  // donor leaveMember: leader leaving disbands everyone (418); with two members both leave; else 420 to all
  leave(p: Player): void {
    if (this.isLeader(p)) {
      for (const m of [...this.members]) { this.remove(m); this.emit(m, { kind: "notice", code: 418, name: p.name }); }
      return;
    }
    if (this.members.length === 2 && this.leader) {
      const l = this.leader;
      this.remove(p); this.remove(l);
      this.emit(p, { kind: "notice", code: 420, name: p.name });
      this.emit(l, { kind: "notice", code: 420, name: p.name });
      return;
    }
    const others = [...this.members];
    this.remove(p);
    for (const m of others) this.emit(m, { kind: "notice", code: 420, name: p.name });
    this.emit(p, { kind: "notice", code: 420, name: p.name });
  }

  // donor kickMember: two-member rule as leave, kicked member gets 419; no notice to the leader in the two-member case
  kick(p: Player): void {
    if (this.members.length === 2 && this.leader) { const l = this.leader; this.remove(p); this.remove(l); }
    else this.remove(p);
    this.emit(p, { kind: "notice", code: 419, name: p.name });
  }
}

// donor C_CreateParty: same map, within range, target not in a party, only the leader of a party may invite
function invite(from: Player, to: Player, dist: (a: Player, b: Player) => number): InviteResult {
  if (from.id === to.id || from.mapId !== to.mapId || dist(from, to) > INVITE_RANGE_TILES) return "ignored";
  if (to.party) return "target-in-party";
  if (from.party && !from.party.isLeader(from)) return "not-leader";
  to.pendingFrom = from.id; // overwrites any earlier pending invite
  return "sent";
}

// donor C_Attr accept: the inviter's party takes the accepter if it has room or the inviter is a GM; else a new party
// simplified note: a silent refusal in Party.add (GM inviter, non-GM leader, full party) is reported here as "party-full"
function accept(acc: Player, inviter: Player | undefined): AcceptResult {
  if (!inviter) return "no-invite";
  if (inviter.party) {
    if (!(inviter.party.vacancy() || inviter.isGm)) return "party-full";
    return inviter.party.add(acc) === "added" ? "joined" : "party-full";
  }
  const p = new Party(MAX_PT, () => {});
  p.add(inviter);
  p.add(acc);
  return "new-party";
}
export { Party, invite, accept, MAX_PT };
```

Typecheck: the block above (with `export` line kept) passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/l1j-party.ts`, exit 0).

## 5. Lands in

- Parity row: 14 (HUD) for the party HP meters only. NO row fits the roster, the invite or the leader rules; say so in review.
- TARGET `origins/party/roster.ts` (new): roster, cap, invite slot and leader rules as engine state. Not `src/fight/` (the roster is outside the duel step).
- today: no party in Frankendom checked (out of scope for this donor read).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
- Brief rule served: 1 (one engine: cap and invite rules in the engine, not in the client); one ledger (one roster and one pending slot per invitee)

Best transferable idea: a party roster with one pending-invite slot per invitee, invites limited by map and tile range and by the leader's rights, and a leave that disbands a two-member party and sends each member one notice.
Decision (proposed): adapt - take the roster, the one-slot invite and the leader-only invite, but clear the pending slot on accept, re-check that the accepter is not already in a party, and report a full party to the accepter; the donor does none of these three.
Acceptance: a server test: an invite from 6 tiles away is refused; a second invite replaces the first; accepting the first after the second returns no-invite; accepting when the party is full returns party-full and the roster is unchanged; a two-member party is dissolved when either member leaves.

## 6. Gaps and risks

- Pending slot is never cleared on a successful accept (C_Attr 424-436 has no reset; `setPartyID(0)` appears only on decline, C_Attr 395 and 421). The accepter's stored inviter id stays. A client that sends the answer packet again with no dialog can re-enter that party if it has a vacancy. Frankendom must clear the slot on accept and reject any accept without a live pending invite. (Checked with grep and the read branch; not exercised.)
- No check that the accepter is free: the accept branch reads only the inviter's party (C_Attr 424-426). If the accepter is already in another party, `addMember` sets its party link to the new party but does not remove it from the old roster (L1Party.java 53-54). Frankendom needs the accepter check in the engine join.
- Silent failures: a full party with a GM inviter and a non-GM leader makes `addMember` return with no message (L1Party.java 42-44), and the accept code ignores that result (C_Attr 426), so the accepter gets no message at all. Frankendom must return an explicit result.
- The GM bypass uses the INVITER's GM flag at accept (C_Attr 425) but the LEADER's flag inside `addMember` (L1Party.java 42). Two different rules for one cap. Frankendom has one rule; the cap belongs in the engine.
- The cap is a config value (MaxPT, default 8). Frankendom's zone and engine rules should set the party size as data; do not reuse the fight cap MAX_ATTACKERS = 3 for party size.
- The donor sends the leaver two 420 notices (L1Party.java 140, 154, 156). Frankendom should send one notice per recipient.
- Server-verified: this is a server (Java) with client packets, but the checks shown are the only server-side gates read; nothing here was tested against a crafted packet.
- Not read: the chat party (`L1ChatParty.java`), guilds (`L1Clan.java`), friends (`L1Buddy.java`). Do not cite this donor for those topics until they are read.
- Licence GPL-2.0-or-later: clean-room, shape only.
