# Open-RSC-Core-Framework (netcode-session-integrity, cell 2)

Donor: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/net/RSCPacketFilter.java` | Licence: GNU AGPL-3.0 (`LICENSE` line 2: "Version 3, 19 November 2007") | Java | symbol `RSCPacketFilter.shouldAllowPacket`

Checked: opened in full `RSCPacketFilter.java` 345-470, 474-520, 562-700 (read); `RSCConnectionHandler.java` 85-145; `Player.java` 440, 838-844, 2185-2192, 2378-2394, 2401-2421; `LoginRequest.java` 48, 66-76, 166-297; `RecoveryAttemptRequest.java` 30-100; `SpellHandler.java` 91-100, 189-215, 258-275; `ServerConfiguration.java` 426-432, 455 (defaults); `LoginPacketHandler.java` 77 and 596-600 (IP source, login gate call sites). Callers checked by grep: `shouldAllowPacket` (RSCConnectionHandler 97, 110); `shouldAllowConnection` (129, doIpBans false); `shouldAllowLogin` (LoginRequest 172, LoginPacketHandler 598-940, RecoveryAttemptRequest 94, CharacterCreateRequest, BankPin*); `getPasswordAttemptsCount` is read only at LoginRequest 208 and CharacterCreateRequest 231; `addPasswordAttempt` at LoginRequest 236, 266 and RecoveryAttemptRequest 92. Not read: `processIncomingPackets` (the per-tick drain, Player.java), the packet decoder and ISAAC code, `DataConversions.checkPassword`, the `LoginLog` insert and its schema (the UNIQUE claim is from a comment only), the ip-ban file loader, Discord logging, `PayloadValidator` beyond its first 30 lines. Confidence: high on the packet, connection and login gates and their numbers; high on the recovery-path defect (three lines plus the grep of counter readers); medium on the per-tick drain (not read).

Best transferable idea: Count every request first, check it against a sliding window, refuse or ban on violation, and make one password-guess lock that every credential path must read before the password is compared.
Decision (proposed): adapt — the count-then-check windows, the per-IP guess lock and the bounded queue fit our rulings; the donor's defects (recovery path keyed by ip:port and never locked, queue admitting cap+1, state revealed before the password) are fixed in the design; AGPL, so shape only.
Acceptance: A server test sends 101 packets from one socket in one second: the 101st is refused and the socket closes; a host banned for flood is refused for 5 minutes; after 10 failed guesses in 5 minutes the correct password is refused, and the password-recovery path is refused by the same lock.

## 1. Mechanism

Three layers, one shared idea: count first, then check against a sliding window, then refuse or ban.

**Layer A, packet flood gate (per socket).**
- Every inbound packet is first recorded with a timestamp for its channel (`RSCPacketFilter.java` 348, `addPacket` 449-458). Then the packets-per-second count is taken: timestamps younger than 1000 ms are kept and older ones pruned (`getPacketsPerSecond` 601-621, window at 611).
- Check (`shouldAllowPacket` 345-379): admin hosts pass; otherwise allowed while `pps <= MAX_PACKETS_PER_SECOND` (362; default 100, `ServerConfiguration.java` 428). Before that the banned host check (350) refuses if `doIpBans` is set.
- On a violation, if `doIpBans` is set, the host is banned for `NETWORK_FLOOD_IP_BAN_MINUTES` (default 5) (371-373). The caller closes the channel (`RSCConnectionHandler.java` 110-112). Pre-login packets use `doIpBans = false` (97-101): they are refused and the channel is closed, with no ban.
- Admin and loopback hosts are exempt from bans (`ipBanHost` 199-208).

**Layer B, connection gate (per IP, at channel registration).**
- `channelRegistered` calls `shouldAllowConnection(..., false)` (`RSCConnectionHandler.java` 129). That method records the attempt, then refuses if connections in the last second exceed 20 (`cps > MAX_CONNECTIONS_PER_SECOND`, 398) or total connections from that IP exceed 20 (`connectionCount > MAX_CONNECTIONS_PER_IP`, 397). The ban is applied by the caller (131), not by the check. Connection counts are incremented on add (`addConnection` 487-498) and decremented on remove (`removeConnection` 501-517).

**Layer C, login and password gate (per IP, then per account).**
- Logins per second per IP: `shouldAllowLogin` counts, then refuses above `MAX_LOGINS_PER_SECOND` (default 2; 430-431). A refusal here is not a ban (the method does not call `ipBanHost`).
- The login path (`LoginRequest.validateLogin`, read in order): the login gate (172-173); then a password-guess lock (208-210): if the host has 10 or more failed guesses in the last five minutes (`getPasswordAttemptsCount` 645-666, window 656), refuse before the password is compared; then an IP ban (212); client version (218-228); a 30 s shutdown window (230-233); unknown username counts as a guess and refuses (235-237); world full (240-242); already logged in on this world (244-246); players per IP (248-252); account ban (254-263); password compare, wrong password counts as a guess (265-268); nonce replay log insert (270-273); admin host registration (276-278); reconnect with a client at version 204 or below returns success without session tracking (286-288); session recorded per IP and account (289).
- The guess counter is not reset on success. It is a five-minute sliding count of failures per IP (`addPasswordAttempt` 438-447).

**Layer D, per-player queue and per-tick drain (after the gates).**
- `RSCConnectionHandler` hands each accepted packet to `player.addToPacketQueue` (117). That method refreshes activity, then admits the packet while `incomingPackets.size() <= PACKET_LIMIT` (2405; default 100, `ServerConfiguration.java` 455). Packets over the limit are dropped with no log and no counter (2401-2411 has no else branch).
- `processTick` drains the queue once per tick (2413-2414; the drain loop was not read).

**Layer E, action limits and suspicion signals (game logic, not socket).**
- Cast timer: `canCast` refuses while `castTimer(RAPID_CAST_SPELLS)` is false (`SpellHandler.java` 91-100). `castTimer` compares elapsed time with `MILLISECONDS_BETWEEN_CASTS` unless rapid cast is on (`Player.java` 841-844). The default is `GAME_TICK * 3 - 20` (`ServerConfiguration.java` 410) with `GAME_TICK = 640` (28, 408): 1900 ms.
- Report throttle: one report per 60 s unless the player is a moderator (`Player.java` 838).
- Suspicion flags: `setSuspiciousPlayer` logs and sets a flag (2185-2187). Its IP-ban branch is commented out with the note "Disabled because this is currently overzealous" (2188-2191). Callers include a magic-level check (`SpellHandler.java` 207-208) and a mouse-still check: 30 or more still actions and one minute or more since the mouse moved (`Player.java` 2378-2393).

## 2. Key functions

- `RSCPacketFilter.shouldAllowPacket`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/net/RSCPacketFilter.java` 345-379.
- `RSCPacketFilter.shouldAllowConnection`: same file, 381-420.
- `RSCPacketFilter.shouldAllowLogin` and `addPasswordAttempt`: same file, 422-447.
- Sliding-window counters `getPacketsPerSecond` 601-621, `getConnectionsPerSecond` 623-643, `getPasswordAttemptsCount` 645-666, `getLoginsPerSecond` 674-694: same file.
- `LoginRequest.validateLogin` gate order: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/login/LoginRequest.java` 166-291.
- `RSCConnectionHandler` gate calls: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/net/RSCConnectionHandler.java` 94-134.
- `Player.addToPacketQueue` and `processTick`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/entity/player/Player.java` 2401-2414.
- Recovery path (the defect in section 6): `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/login/RecoveryAttemptRequest.java` 39, 92-98.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Count first, then check a sliding window; a violation refuses and may ban | Packets 100 per 1000 ms per socket (`ServerConfiguration.java` 428; window `RSCPacketFilter.java` 611) |
| Ban for a fixed time on flood, admins and loopback exempt | 5 minutes (`ServerConfiguration.java` 432) |
| Connections per second per IP | 20 per 1000 ms (`ServerConfiguration.java` 427) |
| Total connections per IP | 20 (`ServerConfiguration.java` 426) |
| Logins per second per IP, refuse only | 2 per 1000 ms (`ServerConfiguration.java` 429) |
| Password-guess lock: failures per IP in a sliding window, checked before the compare | 10 in 5 minutes (`ServerConfiguration.java` 431; window `RSCPacketFilter.java` 656) |
| Bounded per-player queue, drop when full | 100 entries; donor admits 101 (`Player.java` 2405) |
| Cast hold timer | 3 ticks minus 20 ms, tick 640 ms = 1900 ms (`ServerConfiguration.java` 410, 28) |
| Report throttle | 60 s (`Player.java` 838) |

## 4. TypeScript sketch

simplified: keeps the donor order for packets (count, then ban check, then limit) and for logins (count, then limit). The password-guess lock is checked before the password compare, as in the donor. One change: the queue admits up to `cap` entries, not `cap + 1` (donor `<=`), and returns false so the caller can count the drop. Omitted: the connections-per-second and per-IP connection checks, the channel close and Discord logging, the ban file, the admin host registry (kept only as the exempt set), the nonce log, and the suspicion flags. The recovery path is not in the sketch; section 6 says what it must share.

```ts
// Licence: AGPL-3.0 (Open-RSC-Core-Framework). Clean-room sketch written from the described mechanism, no donor lines copied.

// Sliding window: a hit counts for windowMs after it happens.
// Donor windows: 1000 ms for packets, logins and connections; 5 minutes for password guesses.
class SlidingCounter {
  private stamps: number[] = [];
  constructor(private readonly windowMs: number) {}

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.stamps.length > 0 && this.stamps[0] <= cutoff) this.stamps.shift();
  }

  hit(now: number): number {
    this.stamps.push(now);
    this.prune(now);
    return this.stamps.length;
  }

  count(now: number): number {
    this.prune(now);
    return this.stamps.length;
  }
}

interface GateConfig {
  maxPacketsPerSec: number;    // donor: 100
  maxLoginsPerSec: number;     // donor: 2
  maxGuessesPerWindow: number; // donor: 10 per 5 minutes
  banMs: number;               // donor: 5 minutes
  queueCap: number;            // donor: 100 (donor admits cap + 1; fixed here)
}

const GUESS_WINDOW_MS = 5 * 60 * 1000;
const ONE_SECOND_MS = 1000;

class IngressGate {
  private packetsByChannel = new Map<string, SlidingCounter>();
  private loginsByHost = new Map<string, SlidingCounter>();
  private guessesByHost = new Map<string, SlidingCounter>();
  private bannedUntil = new Map<string, number>();

  constructor(private readonly cfg: GateConfig, private readonly exempt: ReadonlySet<string>) {}

  private counterFor(map: Map<string, SlidingCounter>, key: string, windowMs: number): SlidingCounter {
    let c = map.get(key);
    if (c === undefined) {
      c = new SlidingCounter(windowMs);
      map.set(key, c);
    }
    return c;
  }

  isBanned(host: string, now: number): boolean {
    const until = this.bannedUntil.get(host);
    return until !== undefined && now < until;
  }

  // Count first, then check (donor order). Over the limit: refuse this packet and ban the host.
  allowPacket(channelId: string, host: string, now: number): boolean {
    const n = this.counterFor(this.packetsByChannel, channelId, ONE_SECOND_MS).hit(now);
    if (this.isBanned(host, now)) return false;
    if (this.exempt.has(host) || n <= this.cfg.maxPacketsPerSec) return true;
    this.bannedUntil.set(host, now + this.cfg.banMs);
    return false;
  }

  // Count first, then check. Logins are refused, not banned.
  allowLogin(host: string, now: number): boolean {
    const n = this.counterFor(this.loginsByHost, host, ONE_SECOND_MS).hit(now);
    return this.exempt.has(host) || n <= this.cfg.maxLoginsPerSec;
  }

  // Lock check runs before the password is compared, so a locked host is refused even with the right password.
  guessLocked(host: string, now: number): boolean {
    if (this.exempt.has(host)) return false;
    return this.counterFor(this.guessesByHost, host, GUESS_WINDOW_MS).count(now) >= this.cfg.maxGuessesPerWindow;
  }

  // Called for every failed password or unknown username.
  recordGuess(host: string, now: number): void {
    this.counterFor(this.guessesByHost, host, GUESS_WINDOW_MS).hit(now);
  }
}

// Bounded per-tick input queue. Returns false and drops the item when full; the caller counts drops.
function enqueue<T>(queue: T[], item: T, cap: number): boolean {
  if (queue.length < cap) {
    queue.push(item);
    return true;
  }
  return false;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {};` appended in a copy, exit 0 (sketch `NW003/work/Open-RSC-ingress-gate.ts`).

## 5. Lands in

- TARGET `origins/server/ingress-gate.ts` (new module): the socket and login layer in front of the fight intake. It counts packets, connections and login attempts per host, bans on flood, and holds one password-guess lock that every credential check must read. Parity-checklist row 5 (controls/input): the flood limit is the socket-level twin of the per-action cap in the 2004Scape note (`src/fight/intake.ts`).
- today: (not read: the Frankendom repo was not opened in this pass).
- Reuse tag: rewrite-from-idea (AGPL-3.0: clean-room, shape only; no donor line may be copied)
- Brief rule served: 1 (the server decides every request from its own state); rules 7-9 n/a

## 6. Gaps and risks

- **Recovery path bypasses the lock (defect, keep the idea).** `RecoveryAttemptRequest.java` 39 keys the host as `remoteAddress().toString()`, which includes the port. Line 92 records a guess and line 94 applies only the per-second login gate. Nothing in this path reads the guess count: the only readers are `LoginRequest.java` 208 and `CharacterCreateRequest.java` 231. So a recovery attempt is never locked by the guess counter, and even its recorded guesses are keyed by port and never seen by the login lock. Fix: one host key (`getHostAddress`) and one lock check for every credential path.
- **Logged-in key guard never matches (defect).** `RSCPacketFilter.java` 466 tests `loggedInTracker.containsKey(connection.remoteAddress().toString())`, an ip:port string, while `loggedInTracker` is keyed by host address (`Player.java` 440, `LoginRequest.java` 289). The guard is always true, so the removal at 468 always runs. Practical effect looks small (the channel being removed belongs to the player logging out) but this was not run. Fix: key by host.
- **Queue admits cap + 1 and drops silently (defect).** `Player.java` 2405 uses `<=`, and 2401-2411 has no drop counter. Fix: `<` and count drops (the sketch does this).
- **Login state is revealed before the password (design risk).** `LoginRequest.java` 244-246 returns already-logged-in and 254-263 returns ban state before the password compare at 265. An unauthenticated caller learns whether an account is online or banned. Fix: one generic failure until the password checks out, except for the account owner.
- **Per-IP lock only.** There is no per-account lock; a guesser that rotates IPs is not slowed. Shared IPs (cafes, NAT) can lock out honest players. Fix: keep the per-IP lock and add one per account (see ruling 1).
- **Suspicion signals are not enforced.** The auto-ban is disabled as overzealous (`Player.java` 2188-2191). Frankendom's server-verified kills make the ledger the right place for signals; no signal should ban until it is calibrated.
- **Tick is not ours.** This donor's tick is 640 ms (`ServerConfiguration.java` 28). The cast timer in ticks (3 ticks minus 20 ms) is a shape, not a number to copy; Frankendom converts it from its own tick.
- **Donor history is thin.** Idle cleanup was turned off as of Feb 2024 because of "networking issues like appearance issues after logging in" (`RSCPacketFilter.java` 520-523). No record of why 100 packets per second was chosen.

## 7. PASS2 extras

- **As-data shape.** The limits are config rows in `ServerConfiguration.java`: key (string, e.g. `max_packets_per_second`), type (int), default (`orElse`). Rows read: 426-432 and 455 (`MAX_CONNECTIONS_PER_IP` 20, `MAX_CONNECTIONS_PER_SECOND` 20, `MAX_PACKETS_PER_SECOND` 100, `MAX_LOGINS_PER_SECOND` 2, `MAX_PASSWORD_GUESSES_PER_FIVE_MINUTES` 10, `NETWORK_FLOOD_IP_BAN_MINUTES` 5, `PACKET_LIMIT` 100). Ban list: a file named `ipbans.txt` (`RSCPacketFilter.java` 70); its line format was not read. A new limit is one row: yes (one `tryReadInt` line plus its use site). A new gate kind (for example a per-account lock): no, it needs code in `LoginRequest`.
- **Provenance.** Repo Open-RSC-Core-Framework; licence GNU AGPL-3.0 (`LICENSE` line 2). Shape only. Every claim has a file and line in sections 1-3 and in `NW003/receipts.tsv` (verifier passed on all rows).
- **What they patched later.** The donor has no `.git` directory, so no commit history is available. Comments only: "let's turn this off for now as of Feb 2024" (`RSCPacketFilter.java` 520, idle cleanup off); "Disabled because this is currently overzealous" (`Player.java` 2188, suspicion ban off); "Do not IP ban afmans!" (`RSCPacketFilter.java` 199); "spell timer audited, see #3199" (`SpellHandler.java` 94, a ticket reference with no text). A grep of `database`, `SERVER.md` and `globalrules.txt` for exploit, dupe and duplicat found nothing. No exploit history is recorded in the donor.
- **Rulings for Dom.**
  1. Should the wrong-password lock also apply per account, not only per IP? Recommendation: yes, both; per IP alone lets one guesser rotate IPs and punishes shared IPs.
  2. Should suspicion signals ever ban automatically? Recommendation: no; send them to the ledger for review, as the donor did after it disabled its auto-ban.
  3. Should login reveal "already online" or "banned" before the password is checked? Recommendation: no; one generic failure until the password checks out.
- **Core slice.** This feeds parity row 5 (intake) through `origins/server/ingress-gate.ts`. The login and session layer has no row in the 1-23 checklist; flag that to Lead rather than filing it under row 18.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN (about 25 claims checked against real lines; no errors).
- Missed: the lock check at `LoginRequest` 208 also exempts 127.0.0.1 and admin hosts (prose omits it; the sketch covers it through its exempt set).
- Missed: the lock path and the unknown-user path return different codes (LOGIN_ATTEMPTS_EXCEEDED vs INVALID_CREDENTIALS), so the lock state is observable to an attacker. Not a note error; for Frankendom return one code for both.
