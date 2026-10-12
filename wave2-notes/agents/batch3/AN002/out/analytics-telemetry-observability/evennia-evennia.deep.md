# evennia-evennia (analytics-telemetry-observability, cell 40)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/server/throttle.py` (with `evennia/accounts/accounts.py` 66-78, 725-765; `evennia/settings_default.py` 840-843, 1088-1097; `evennia/utils/logger.py` 103-120 read in part) | Licence: BSD 3-Clause (LICENSE.txt, "Copyright 2012- Griatch ... Gregory Taylor"; permissive) | Python (Django) | symbol `Throttle`

Checked: Opened in full: server/throttle.py (225 lines). Opened accounts.py 66-78 and 722-766 (login path; creation path only grep hits at 1039 and 1136). Opened settings_default.py 838-845 and 1088-1098. Opened utils/logger.py 20-120 (sensitive-input mask, `_log`), plus the function list of the file (log_sec at 218). Other candidates opened for the topic: evennia/server/profiling/dummyrunner.py (grep hit only, load tester, not read), evennia/server/portal/mssp.py (grep hit only, not read), evennia/utils/logger.py rotation classes (WeeklyLogFile 349-437, EvenniaLogFile 439-470; read by grep line only). Not read: the other Throttle callers (accounts.py 1039, 1136, 2022: grep lines only), the Django cache backend code, and whether two server processes ever share one throttle (settings say LocMemCache, per process). Confidence: high on the throttle flow and defects (read end to end); medium on how often the login path runs in practice. camera_scope: n/a.

## 1. Mechanism

A failed-action throttle keyed by IP. Login (and account creation) use one instance each. It is an abuse signal, and it is also the telemetry: each failure is logged, and the lock is logged once when it turns on.

Order of steps on a login attempt (accounts.py 725-765):
1. Before any password work, `LOGIN_THROTTLE.check(ip)` (729). If locked, return an error at once (735), with no ban check, no authentication and no log line. The comment says why: continued hits are not logged, because logging them could fill the disk (732-734).
2. Ban check (738). A banned IP or name updates the throttle (748) and returns.
3. `authenticate` (752). On failure: `logger.log_sec` writes the username and IP (758), then `update(ip)` records the failure (762).

What `update(ip)` does (throttle.py 100-135): (a) `check` first to remember whether it was locked (116); (b) read the stored failure list, default empty (119); (c) append the current time (120); (d) store a deque with `maxlen = cache_size` (default equal to the limit) under the cache timeout (123), so the list never holds more than `limit` failures; (e) `check` again (126); (f) only if the state changed from open to locked, log one line "Throttle Activated" with the limit and timeout (129-133); (g) record the IP in a key register (135).

What `check(ip)` decides (189-225): limit None means off (203). If the stored list has `limit` entries (214) and its newest entry is less than `timeout` seconds old (216), the IP is locked. If the list is full but the newest entry is older than the timeout, the record is removed (222) and the IP is open again. Otherwise open (224-225).

Two subtleties from the code. (1) The window is a chain, not a fixed window: the list keeps the last `limit` failure times with no age pruning, and the cache key lives `timeout` seconds after the last update, so failures spaced less than `timeout` apart accumulate. (2) The lock turns on at the `limit`-th failure, because `update` appends before the second `check` (126).

Numbers in section 3.

## 2. Key functions

- `Throttle.__init__` (25-48): reads limit (46), cache_size (47), timeout (48); the storage is the Django cache named "throttle", with a fallback to "default" (39-43).
- `Throttle.get_cache_key` (50-56): key = name + "-" + args joined with dashes (56).
- `Throttle.touch` (58-69): refreshes a key's expiry and records it in the key register (68-69).
- `Throttle.update` (100-135): append, store bounded, log on lock transition, record key (116-135).
- `Throttle.check` (189-225): lock test, expiry clear, and one refresh call (218, the defect in section 6).
- `Throttle.remove` (137-154), `record_ip` (156-170), `unrecord_ip` (172-187): key register maintenance.
- `LOGIN_THROTTLE` / `CREATION_THROTTLE` instances (accounts.py 69-76); login path (accounts.py 722-766).
- Config: settings_default.py 840-843 (limits and timeouts), 1089-1097 (cache backend, timeout, max entries).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (theirs) |
|---|---|
| Failure limit before the lock | login 5 (settings_default.py 842); account creation 2 (840) |
| Lock length from the newest failure | login 5 min (843); creation 10 min (841) |
| Bounded record (never more than the limit) | deque maxlen = cache_size = limit (throttle.py 47, 123) |
| Cache lifetime for the record | 5 min default (settings_default.py 1095); explicit timeout passed to each set (123) |
| Cache size cap | 2000 entries, LocMemCache (1096; backend at 1091) |
| Logging rule | log once per lock; no log for blocked attempts (throttle.py 129; accounts.py 732-734) |

Which numbers suit a phone and a small Node server: the 5-failure, 5-minute login lock is a sensible size for a small server; the cap of 2000 entries is small enough for one Node process. Nothing here measures the client, so no phone budget comes from this donor. Note the donor's LocMemCache is per process: two server processes would each keep their own counts.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (check first, record bounded, log only when the lock turns on, clear an expired record on check) and adds a counter pair (`fails`, `locks`) for the metrics store. It omits the Django cache backend (the Map lives in one process), the key register that lets the server list every key (`record_ip`, `unrecord_ip`), the ban check, the account-creation path, and the defective `touch` refresh (section 6). It differs from the donor in one place on purpose: the caller must check `isLocked` first and return before `fail`, which the donor does in accounts.py 729-735.

```ts
// clean-room: written from the mechanism in evennia-evennia server/throttle.py (BSD-3-Clause), not a translation.
export interface FailThrottleOpts {
  name: string;
  limit: number; // failures that lock a key; also the size of the bounded window
  timeoutMs: number; // lock length, measured from the newest recorded failure
  log: (line: string) => void; // one line when a lock turns on
  now?: () => number;
}

// Failed actions per key (player id or IP). Keeps only the last `limit` failure times.
export class FailThrottle {
  private readonly rec = new Map<string, number[]>();
  readonly stats = { fails: 0, locks: 0 }; // telemetry counters for the metrics store

  constructor(private readonly o: FailThrottleOpts) {}

  private t(): number {
    return this.o.now ? this.o.now() : Date.now();
  }

  // Locked = the window is full and the newest failure is still inside the timeout.
  // An expired record is cleared here (donor check(): remove when the timeout has passed).
  isLocked(key: string): boolean {
    const r = this.rec.get(key);
    if (r === undefined || r.length < this.o.limit) return false;
    if (this.t() - r[r.length - 1] < this.o.timeoutMs) return true;
    this.rec.delete(key);
    return false;
  }

  // Record one failed action. Returns true only on the call that turns the lock on (logged once).
  // Callers must check isLocked() first and return early while locked, so blocked attempts are not recorded.
  fail(key: string, reason: string): boolean {
    const wasLocked = this.isLocked(key);
    const r = this.rec.get(key) ?? [];
    r.push(this.t());
    if (r.length > this.o.limit) r.splice(0, r.length - this.o.limit); // bounded, like the donor deque maxlen
    this.rec.set(key, r);
    this.stats.fails += 1;
    const nowLocked = this.isLocked(key);
    if (!wasLocked && nowLocked) {
      this.stats.locks += 1;
      this.o.log(`${this.o.name} lock: ${reason} (key ${key}; ${this.o.limit} hits in ${this.o.timeoutMs} ms)`);
      return true;
    }
    return false;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS at `/tmp/AN002-evennia-fail-throttle.ts`: exit 0 (no output). The Mac hook could not run tsc (no project dev dependencies), so only the VPS run counts.

## 5. Lands in

- TARGET `src/fight/intake-throttle.ts` (new module: a rejected-input counter with a log-once lock on the server input path, for example repeated rejected engage or attack commands). Parity-checklist row 4 (the topic hint). The fit is loose: the reject happens at intake, which is row 5 (controls/input); the lock never touches kills, which stay server-verified in the engine.
- Reuse tag: rewrite-from-idea (BSD-3-Clause; code may be adapted, and this sketch is written from the mechanism)
- Brief rule served: 1 (one engine: the throttle refuses input before state changes and never writes kills or loot); addendum rule 6 (licence); "keep the idea, fix the defect" (2026-10-10)

Best transferable idea: a bounded record of recent rejected actions per player that refuses input and logs once when it locks, instead of logging every refused attempt.
Decision (proposed): adapt — keep the counting, the bounded record and the log-once rule as anti-cheat telemetry; do NOT copy the login lock as a player-facing rule (a fight lock must be a short, visible state with a reason, never a silent drop). Fix the defective refresh and the cross-process caveat in the sketch.
Acceptance: a server test sends five rejected engage commands from one player; the fifth returns the lock reason; a sixth attempt is refused without a new record or log line; after the lock time a valid engage passes; the log holds exactly one lock line for the episode.

## 6. Gaps and risks

- BSD-3-Clause: code may be adapted. The sketch is written from the mechanism; the donor lines are not copied.
- Defect 1 (fix: call `touch` with the bare IP): `check` calls `self.touch(cache_key)` at line 218, with a key that already has the name prefix. `touch` prefixes again (line 67), so it refreshes `login-login-<ip>`, which does not exist. The refresh does nothing and `record_key` is never called (68-69). The practical effect is small, because the lock already ends `timeout` after the newest failure. Fix: `self.touch(ip)` or delete the call; test it, because a working refresh keeps the record alive after the lock and then `check` clears it.
- Defect 2 (fix: one writer or an atomic add): `update` reads, appends and writes the list (119-123), and `record_ip` does the same for the key register (166-169). Two failures handled at the same time can lose one. In a single Node event loop this is safe only while no `await` sits between the read and the write. Fix: keep it that way in the sketch, or route all fails for a key through the engine's single writer.
- Gap 1 (privacy): every failed login writes the username and the IP to the security log (accounts.py 758). Frankendom should log a player id or a hash, not a name, and set a retention for that log. Retention and rotation in evennia are in utils/logger.py (weekly and size-based rotation at 349-470; read in part only).
- Gap 2 (rule): this throttle is per process (LocMemCache, settings_default.py 1091). Frankendom's one-engine rule means one writer per zone; the throttle must live with that writer, not in a shared cache.
- Gap 3: the lock is a player-facing rule. The donor locks login only. In the fight, a lock must be visible and short, and must never hide a kill. Frankendom decides the reject list and the lock length; the donor gives only the shape.
- Not read: the other Throttle callers (accounts.py 1039, 1136, 2022); the Django cache code; the dummyrunner load tester (server/profiling/dummyrunner.py, grep hit only); the mssp status export (server/portal/mssp.py, grep hit only); the logger rotation classes beyond their definitions.
