# heroiclabs-nakama (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/heroiclabs-nakama/server/login_attempt_cache.go` | Licence: Apache License 2.0 (`/mnt/frankendom-donors/heroiclabs-nakama/LICENSE`, line 3 "Version 2.0, January 2004"; adaptation permitted, sketch is clean-room anyway) | Go | symbol `LocalLoginAttemptCache.Add` (with `Allow`, `Reset`, `lockoutStatus.trim`)

Checked: The list hint was INFERRED, so I searched the donor for rate-limit, cheat, replay and tamper words. Read in full: `login_attempt_cache.go` (175 lines). Callers read: `console_authenticate.go` 93-98 (Allow), 145-153 (Add on admin failure), 157 (lookupConsoleUser call), 163-167 (Reset on password success), 427-480 (`lookupConsoleUser`); `main.go` 185 (construction); `console.go` 575 and 664 (one Allow line each; `checkAuth` and `checkAuthCustom` not read in full). Not read: the MFA path after line 167, and the callers in `api_*.go` (grep found no reference, so player login has no lockout). Also searched by grep, not read: `match_handler.go` and `match_presence.go` (join markers, 15 s default), `session_ws.go` (read limit at 193), `config.go` (message size defaults). Confidence: high on the order of operations and the numbers. High on scope: the lockout guards only the admin console, not player sign-in. Medium on the whole-system rate limit: this is one in-memory counter, not a shared limiter.

Best transferable idea: Count rejected attempts per key in a sliding window, lock the key for a short fixed time once the count hits a limit, and check the lock (not the count) at the gate.

Decision (proposed): adapt - Frankendom has no login failures to count, but it can count server-rejected fight intents per character (an engage with an impossible target, a stale or forged action id). Five in 60 seconds triggers a 60-second refusal of further intents. The donor does not flag or record a ban; that part must be added.

Acceptance: A character that sends five impossible engage intents within 60 s has its next intent refused with "try again later" until 60 s pass, while another character's intents are unaffected; a server test asserts an honest character with one or two stale-turn rejects never reaches the lock.

## 1. Mechanism

- Per key, two sub-tables: accounts (`accountCache`) and IPs (`ipCache`). Each entry holds `lockedUntil` and a list of attempt times.
- Gate (`Allow`, 121-132): if the account has a lock that is still in the future, refuse. Then the same for the IP. The gate never reads the attempt count. An attempt is refused only once a lock has been recorded.
- Failure (`Add`, 140-175): for a non-empty account name, append `now` to its attempts (152), trim attempts older than the 1-minute window (153), and if the count is at least 5 (154), set `lockedUntil = now + 1 min` (155) and report an account lockout. The count is re-checked on every failure, so the lock is re-armed each time the count is still at 5 or more.
- The IP branch (160-173) is commented out. Only the account branch runs. `Add` returns the lock type and time (174). Nothing is ever added to `ipCache`, so the IP gate in `Allow` never refuses.
- Trim (`lockoutStatus.trim`, 55-67): clear `lockedUntil` if it is in the past (56-58); walk attempts from newest to oldest and keep only those younger than the retention period (59-63); the entry is empty when there is no lock and no attempt (66).
- Success (`Reset`, 134-138): delete the account entry. In the console flow, `Reset` is called at `console_authenticate.go:167` once the password has been accepted and the role is not none, before the MFA check (MFA path not read).
- Cleanup: a goroutine ticks every 10 minutes (90) and trims every entry, deleting those that are empty (96-108).
- Caller order for admin console login (`Authenticate`, `console_authenticate.go` 93-160): gate first (96, returns ResourceExhausted "Try again later." at 97), then the password check, then on failure `Add` (145) and Unauthenticated "Invalid credentials." (153). For other console users (`lookupConsoleUser`, 427-480): an unknown name calls `Add("", ip)` (436), which does nothing for the account table; a dummy bcrypt compare keeps timing similar (442-443). A second gate with the real username follows (454) because a login can arrive by email. A wrong password calls `Add(uname, ip)` (469).

## 2. Key functions

- `LocalLoginAttemptCache.Allow`: `/mnt/frankendom-donors/heroiclabs-nakama/server/login_attempt_cache.go` 121-132. Refuses only while a lock is in the future.
- `LocalLoginAttemptCache.Add`: same file, 140-175. Counts a failure in a 1-minute window and sets the lock at 5.
- `lockoutStatus.trim`: same file, 55-67. Drops the lock when expired and drops attempts older than the retention period.
- Caller, admin login: `/mnt/frankendom-donors/heroiclabs-nakama/server/console_authenticate.go` 93-160 (`Authenticate`).
- Caller, other console users: same file, 427-480 (`lookupConsoleUser`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sliding-window failure count per key | Window and lock length both 1 minute (theirs, `lockoutPeriodAccount = time.Minute * 1`, login_attempt_cache.go line 34) |
| Lock after N failures in the window | N = 5 (theirs, `maxAttemptsAccount = 5`, line 33) |
| Lock is re-armed by every failure at or above N | None (the `>=` test at 154 and the re-set at 155) |
| Gate checks the lock, not the count | None (the check at 125) |
| Clear the count on success | None (`Reset`, 134-138; called at console_authenticate.go 167) |
| Periodic sweep of idle entries | Sweep every 10 minutes (theirs, line 90) |
| IP table with a longer lock | Max 10 and 10 minutes (theirs, lines 36-37), but the code that would use them is commented out (160-173) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order: the gate checks only the lock, a failure appends, trims and locks at the limit, success deletes the entry, and a sweep drops idle entries. It omits the mutex (the donor takes a read lock in `Allow` and a write lock in `Add`; the sketch is single-threaded), the IP table (dead in the donor), the account-name guard (`account != ""`), the lock-type return value, the log lines, the cancellation context, and the MFA path. It rebuilds the attempt array with a filter rather than trimming from the back; the result is the same window.

```ts
// Licence: Apache-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const MAX_ATTEMPTS = 5;        // donor: maxAttemptsAccount = 5
const WINDOW_MS = 60_000;      // donor: lockoutPeriodAccount = time.Minute * 1 (also the retention window)

type Entry = { lockedUntil: number; attempts: number[] };
const table = new Map<string, Entry>();

// Gate: checks only whether the key is locked, not how many attempts it has (as in the donor's Allow).
export function allow(key: string, now: number = Date.now()): boolean {
  const e = table.get(key);
  return !(e !== undefined && e.lockedUntil > now);
}

// Record one failed attempt. Returns the lock end time if this failure locks the key, else 0.
export function recordFailure(key: string, now: number = Date.now()): number {
  let e = table.get(key);
  if (e === undefined) {
    e = { lockedUntil: 0, attempts: [] };
    table.set(key, e);
  }
  e.attempts.push(now);
  // Sliding window: keep attempts younger than the window (donor: trim drops age >= retention).
  e.attempts = e.attempts.filter((t) => now - t < WINDOW_MS);
  if (e.attempts.length >= MAX_ATTEMPTS) {
    e.lockedUntil = now + WINDOW_MS; // re-set on every failure at or above the limit
    return e.lockedUntil;
  }
  return 0;
}

// Reset on successful login (donor: Reset deletes the whole entry).
export function reset(key: string): void {
  table.delete(key);
}

// Periodic sweep (donor: every 10 minutes). Drop entries with no live lock and no live attempts.
export function sweep(now: number = Date.now()): void {
  for (const [k, e] of table) {
    e.attempts = e.attempts.filter((t) => now - t < WINDOW_MS);
    if (e.lockedUntil <= now && e.attempts.length === 0) table.delete(k);
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/intent-gate.ts` (new, server intake): counts server-rejected fight intents per character in a window and refuses further intents while locked. It never changes a hit or a kill; it only refuses intake and reports.
- Parity-checklist row: 5 (controls/input, intake). This is the closest row. Rows 18 and 19 (loot/XP, fight record) do not fit a rate limit. The donor's lockout is not a server-tick mechanism, so it does not cite the tick sub-line.
- Reuse tag: rewrite-from-idea (Apache-2.0; adaptation permitted, sketch written clean-room)
- Brief rule served: Frankendom ruling that kills are server-verified and the server is the only validator; the lock is an intake refusal, not a second judge of hits.

## 6. Gaps and risks

- Scope: the lockout guards only the admin console (`main.go` 185 constructs it and only the console server takes it). Player sign-in has no lockout in this donor (grep, no reference in `api_*.go`). Do not cite this donor as a player-login protection.
- Unknown usernames are never counted: the unknown-user branch calls `Add("", ip)` (436), which skips the account table, and the IP table that would count them is commented out. Enumeration by name is not rate-limited here.
- Burst race: `Allow` checks only the lock (125), so requests already in flight pass the gate before the fifth failure is recorded. The effective limit is roughly five plus the number of in-flight requests (inference from the code, not run).
- Lock is in-memory and per process (`NewLocalLoginAttemptCache`, main.go 185). A multi-node deployment has one count per node (inference; only the local implementation was found).
- Wall-clock time (`time.Now().UTC()`, 122 and 141): a clock step can shorten or extend a lock. Frankendom should use server ticks, so a lock is counted in ticks, not seconds.
- No flag or ban: the cache returns a lock type and time; the caller only logs (console_authenticate.go 147-150 and 471-474). Frankendom needs a real flag pipeline (record, review, action) that the donor does not provide.
- False positives: an honest player whose intent is rejected for a stale reason (a lag-delayed turn) could reach the lock. Count only intent types that cannot be honest (an engage on a target that is out of range by a large margin), not stale ones. The donor does not distinguish; the sketch does not either.
- Numbers are fixed in code. Frankendom should make the limit, window and lock length zone or engine data with defaults (the donor has no config for them).
- MFA: `Reset` runs at 167 before the MFA check. MFA failures are not counted by this cache (MFA path not read).
- Apache-2.0: adaptation is allowed. If code is later copied, keep the Apache notice.
