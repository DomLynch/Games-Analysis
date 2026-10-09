# Dawn-of-Light-DOLSharp (parties-guilds-chat, cell 18)

Donor: /mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/Guild.cs | Licence: GPL-2 | C# | symbol Guild.AddPlayer / SetGuildBank / SendMessageToGuildMembers (input line 587 verified: `AddPlayer(GamePlayer)`; rank overload at 598, `SetGuildBank` at 242, `SendMessageToGuildMembers` at 833)

## 1. Mechanism
- A guild is an in-memory `Guild` object wrapping a DB record (`m_DBguild`), with a list of online members (`m_onlineGuildPlayers`) and ranks.
- Join: `AddPlayer(player)` (587-590) joins at `GetRankByID(9)` (the donor's default; the rank table behind ID 9 is not read). `AddPlayer(player, rank)` does the work. It refuses a null player or a player already in a guild. Otherwise it adds the player to the online list, sets the player's guild name, ID, rank and guild reference, saves the player, registers them in the global guild-players list, sends two system messages to the joiner, and sends a "has joined" message to members.
- Bank deposit: `SetGuildBank(donor, amount)` (242-272) returns silently on a null player or a player with no guild (244-245). It refuses a negative amount (247) and refuses if bank plus amount is >= 1,000,000,001 (252), each with a message to the player. Then it removes the copper from the donor's wallet (258, amount converted with `long.Parse(amount.ToString())`; a failed removal sends "You don't have this amount of money !" and returns). On success it sends the deposit message, updates the guild window, adds the double amount to `m_DBguild.Bank` (267), logs the inventory action (269) and refreshes the donor (270). Zero is accepted (only `< 0` is refused). There is no database save of the guild in this method (not seen in 242-272).
- Broadcast: `SendMessageToGuildMembers(msg, type, loc)` loops every online member and sends only to those whose rank passes `HasRank(..., GcHear)`.
- `HasRank` (669-791) first checks the player is in the online list (674; a miss is logged and fails). Accounts with PrivLevel above 1 pass automatically (681). A null `GuildRank` is logged as a warning and fails (684). Otherwise a switch on the needed rank returns the matching boolean flag on the player's rank (`Leader` is `RankLevel == 0`); an unknown value logs and fails. Exceptions are caught and return false. Note the `Demote` case returns the `Promote` flag (706-709), a donor quirk.
- Inputs: a GamePlayer and an amount or message. Outputs: messages to clients, a DB save, and a changed bank value. No tick; all calls are event-driven from player commands.

## 2. Key functions
- `Guild.AddPlayer(GamePlayer)` - /mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/Guild.cs lines 587-589. Default-rank join.
- `Guild.AddPlayer(GamePlayer, DBRank)` - same file lines 598-627. Full join path.
- `Guild.SetGuildBank` - same file lines 242-272. Deposit path with cap and wallet debit.
- `Guild.GetGuildBank` - same file line 205. Reads the bank value.
- `Guild.HasRank` - same file lines 669-791. Membership and rank gate.
- `Guild.SendMessageToGuildMembers` - same file lines 833-846. Rank-gated broadcast over the online list.
- `Guild.WithdrawGuildBank` - same file lines 273-297. Withdraw path (read now): refuses negative, refuses if it would go below zero, then subtracts from the bank, credits the player's copper, logs, and saves the player and the guild.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Guard-then-join: reject null or already-in-group, set both sides, save, announce | Default join rank ID 9 (theirs, line 589) |
| Cap a shared bank before accepting a deposit | Bank cap: refuse at >= 1,000,000,001 copper (theirs, line 252) |
| Debit the wallet first, then credit the shared pool, then log | Currency is copper (theirs, line 258) |
| Rank-gated broadcast over the online list | Gate flag GcHear (theirs, line 839) |
| Privilege bypass for staff | PrivLevel above 1 bypasses rank (theirs, line 681) |

## 4. TypeScript sketch
Sketch type: clean-room (GPL-2 donor). Written from the mechanism above, no lines translated.

simplified: omits the null-player guard, the zero-amount case (donor accepts 0, sketch refuses), the wallet-first ordering is kept but the donor sends player messages and a window refresh between steps, no persistence or inventory log, no join announcement or two joiner messages, no HasRank flag table or staff bypass (broadcast gates on a numeric rank instead of the GcHear flag), and no rollback if a save fails.

```ts
// Licence: GPL-2 - clean-room sketch, no lines translated
type Member = { id: string; guildId: string | null; rank: number };
type Guild = { id: string; members: Map<string, Member>; bankCopper: number; bankCap: number };
type Result = { ok: true } | { ok: false; reason: string };

function joinGuild(g: Guild, p: Member, rank: number): Result {
  if (p.guildId !== null) return { ok: false, reason: 'already in a guild' };
  p.guildId = g.id;
  p.rank = rank;
  g.members.set(p.id, p);
  return { ok: true };
}

function depositToBank(g: Guild, p: Member, amountCopper: number, wallet: { copper: number }): Result {
  if (p.guildId !== g.id) return { ok: false, reason: 'not a member' };
  if (!Number.isInteger(amountCopper) || amountCopper <= 0) return { ok: false, reason: 'bad amount' };
  if (g.bankCopper + amountCopper > g.bankCap) return { ok: false, reason: 'bank full' };
  if (wallet.copper < amountCopper) return { ok: false, reason: 'insufficient funds' };
  wallet.copper -= amountCopper;
  g.bankCopper += amountCopper;
  return { ok: true };
}

function broadcast(g: Guild, minRank: number, msg: string, send: (id: string, msg: string) => void): void {
  for (const m of g.members.values()) {
    if (m.rank >= minRank) send(m.id, msg);
  }
}
```

## 5. Lands in
- Frankendom target: NEW module `origins/server/guild.ts` (does not exist today; guilds are a later-phase feature, server side only). Neighbouring server modules `origins/server/holdings.ts` and `origins/presence/server.ts` exist on a VPS snapshot (/root/work-k7, not main); their contents were not read.
- Parity-checklist row: none of rows 1 to 22. Feature-map section: parties, guilds and chat (later phase). The bank deposit touches the ledger ruling (one ledger).
- Reuse tag: rewrite-from-idea (GPL-2 donor; the sketch is clean-room)
- Brief rule served: (category default, not per-cell) 10 (zone copies); rules 7-9 n/a

## 6. Gaps and risks
- One ledger: the donor debits the wallet (258) and credits `m_DBguild.Bank` (267) as two separate writes with no transaction and no guild save inside `SetGuildBank`. Frankendom's one-ledger ruling needs a single atomic debit-and-credit entry; do not copy the two-step shape.
- Server-verified: the donor trusts the `amount` double handed in. `long.Parse(amount.ToString())` (258) throws a format error for a fractional amount (e.g. 1.5) or one that prints in exponent form; there is no try block in `SetGuildBank`, so the exception leaves the method before any debit. Read from the code, not run. Frankendom takes integer copper only and rejects anything else at the server edge.
- The donor does not check that the caller is the player named (it takes `donating` as given). Frankendom must derive the player from the authenticated session, never from the request.
- Bank and online-list access: the bank path takes no lock; the broadcast locks `m_onlineGuildPlayers` (835). Frankendom's single-threaded server tick makes this moot, but the deposit must still be ordered inside the tick.
- Join writes in-memory fields (608-612) before the save (613); if the save throws the catch returns false with those fields already set (partial state). Frankendom joins should apply all-or-nothing.
- Pit is a client only: guild and bank logic has no place in the Pit client. Zones are data: a guild must be keyed to the account, not to a zone.
- Conflict with one engine, server-verified kills and MAX_ATTACKERS = 3: none directly (no combat code in this donor path).
- Not read: the rank table (`DBRank`, `GetRankByID` body at 798), `AddOnlineMember` internals (only its call at 608 and the dictionary at 107 and 511 seen).
