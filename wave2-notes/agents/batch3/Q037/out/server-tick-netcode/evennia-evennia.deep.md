# evennia-evennia (server-tick-netcode, cell 2)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/scripts/tickerhandler.py` | Licence: BSD-3-Clause (LICENSE.txt line 1 "BSD 3-Clause License"; copyright 2012- Griatch and Gregory Taylor) | Python (Twisted, Django) | symbol `Ticker._callback`

Checked: Read in full: tickerhandler.py 96-234 (Ticker class), 252-268 (TickerPool.add), 310-322 (handler init), 362-398 (store key), 400-487 (save and restore), 489-535 (TickerHandler.add), scripts.py 20-135 (ExtendedLoopingCall start, __call__, next_call_time), combat_twitch.py 186-200 (its use of the handler). Hint file amp_client.py: header and def list only; it is the AMP link between the Server and the Portal, not a tick loop. Not read: TickerHandler.remove, clear, all (538-652); the body of the utils.py `repeat` wrapper (1232 is only its return line, seen by grep); Twisted's LoopingCall (external, not in the donor). Candidate files opened: 3 or more (tickerhandler.py, scripts.py, combat_twitch.py, amp_client.py, utils.py 1232 line). Confidence high on subscription, pass, mutation-deferral and save/restore order; low on what happens when a hook runs longer than its interval, because that is decided by Twisted LoopingCall, which I did not read. camera_scope not applicable.

## 1. Mechanism

This is a generic timer service, not a game tick loop. It has no fixed step, no frame, no input or snapshot handling, and no netcode.

- One shared timer per interval value. `TickerPool.add` (252-268) looks up the interval (261) and, the first time a value is seen, creates one `Ticker` (266-267). Every later subscriber on that interval joins the same `Ticker`. A `Ticker` owns one `ExtendedLoopingCall` (170).
- Interval rule: `TickerHandler._store_key` (362-398) truncates the interval to an integer (393) and refuses anything under 1 second (390-391), with the message that sub-second tickers "are not supported" (88-90).
- Subscribing: `TickerHandler.add` (489-535) resolves the callback (529), stores the subscription (533), hands it to the pool (534) and saves the storage (535). The default interval is 60 seconds (489) and subscriptions are persistent by default (489).
- Starting and stopping: `Ticker.validate` (172-186) starts the looping task when the first subscriber arrives (186) and stops it when none are left (182-184).
- The pass, `Ticker._callback` (104-152): set `_is_ticking` (122); walk the subscriptions (123) one by one. For a plain callable, call it and await it (129). For a method on an object, check the object still exists (132-134) and, if not, queue its removal (134); otherwise call the method and await it (137). An object that raises `ObjectDoesNotExist` is queued for removal and logged (139-140). Any other exception is traced and the walk goes on (141-142). A `finally` restores the stored kwargs. After the walk: clear `_is_ticking` (148), apply queued removals (149-150), then apply queued adds (151-152).
- Changes during a pass: `Ticker.add` and `Ticker.remove` check `_is_ticking` (201, 218) and queue the change (204, 221). A subscriber who joins or leaves inside a pass therefore does not change the list being walked; the change applies after the pass.
- Save: `TickerHandler.save` (400-434) builds a map from interval to `task.next_call_time()` (410-411), and writes that value into each stored subscription as `_start_delay` (428), then saves to ServerConfig. It is called when a subscription is added (535) and, per the docstring, by the server at shutdown (docstring 401-407; not separately read).
- Restore: `TickerHandler.restore` (435-487) rebuilds each store key, skips non-persistent subscriptions on a cold boot (459), and re-adds the rest to the pool (487). Each re-added subscription carries its `_start_delay`; `Ticker.add` pops it (206) and passes it to `validate`, which starts the task with it (186), so the group resumes at the same phase.
- Resume phase: `ExtendedLoopingCall.start` with `now=False` and a `start_delay` swaps the interval for the first wait (scripts.py 80-84, with the clamp at 71), then restores the real interval. On the first call, `__call__` clears `start_delay` and resets `starttime` (97-99). `next_call_time` returns the time until the next call, using `start_delay` until it has been used (131-132).
- Tick driving: a Twisted `LoopingCall` drives the pass (scripts.py 101 delegates to it). Its scheduling after a long pass is not read (external library, not in the donor). No accumulator and no catch-up logic appear in the code read.
- Game use (caller, read in part): `combat_twitch.py` cancels the previous timer with `unrepeat` (192) and schedules the next action with `repeat(dt, self.execute_next_action, id_string="combat")` (199), where `dt` is the action delay. `repeat` is a wrapper in `evennia/utils/utils.py` whose body was not read; its return line at 1232 hands to `_TICKER_HANDLER.add` (grep only). Assumed (not read): `repeat` passes `dt` as the interval.

## 2. Key functions

- `Ticker._callback`: `/mnt/frankendom-donors/evennia-evennia/evennia/scripts/tickerhandler.py` 104-152. The pass: sequential hooks, error isolation, deferred changes.
- `Ticker.validate`: same file, 172-186. Start when subscribed, stop when empty.
- `Ticker.add` / `Ticker.remove`: same file, 188-233. Queue during a pass, apply otherwise.
- `TickerPool.add`: same file, 252-268. One shared timer per interval value.
- `TickerHandler.add`: same file, 489-535. Public entry point; interval rule in `_store_key` (362-398).
- `TickerHandler.save` / `restore`: same file, 400-487. Phase is saved as time-to-next-pass and restored as `_start_delay`.
- `ExtendedLoopingCall.start` / `__call__` / `next_call_time`: `/mnt/frankendom-donors/evennia-evennia/evennia/scripts/scripts.py` 31-87, 89-101, 118-132. The delayed first call and the next-call arithmetic.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One shared timer per interval value; subscribers join the group | Interval is whole seconds, minimum 1 (tickerhandler.py 390-393; message 88-90) |
| Hooks run one after another; a failing hook is traced and does not stop the others | None (141-142) |
| Changes made during a pass apply after it | None (201-204, 218-221, 149-152) |
| Save time to next pass, restore so the group keeps its phase | None; the arithmetic is `interval - (runtime % interval)` (scripts.py 131-132) |
| Default subscription interval | 60 seconds (tickerhandler.py 489) |

## 4. TypeScript sketch

simplified: the sketch keeps the pass order (hooks in sequence, errors isolated, queued removals then queued adds after the pass), one timer per interval, and the saved time-to-next-pass restore. It omits: database persistence (`ServerConfig` save and restore), callbacks given as an object method or a module path (the sketch takes functions only), the stored `args` (always empty here), the object-deleted and `ObjectDoesNotExist` checks, the `persistent` flag and cold-boot skip, and `stop()`. It uses the wall clock (`Date.now`) and `setTimeout` instead of Twisted's clock and `LoopingCall`, and it schedules the next pass only after the current pass finishes; how Twisted behaves here was not read, so that choice is the sketch's, not the donor's. The whole-second interval rule is kept.

```ts
// Licence: BSD-3-Clause (donor, permissive). Shape only: written from the described mechanism, not a copy of the donor lines.
type Hook = (...args: unknown[]) => Promise<void> | void;

interface Subscription { key: string; hook: Hook; args: unknown[]; }

interface SavedGroup { intervalSec: number; nextInMs: number; keys: string[]; }

// One timer per interval value, shared by every subscriber on that interval.
class IntervalGroup {
  private subs = new Map<string, Subscription>();
  private pendingAdd: Subscription[] = [];
  private pendingRemove: string[] = [];
  private ticking = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private nextAt = 0;

  constructor(readonly intervalMs: number, private readonly onEmpty: () => void) {}

  add(sub: Subscription, firstInMs?: number): void {
    if (this.ticking) { this.pendingAdd.push(sub); return; }   // defer changes made during a tick
    this.subs.set(sub.key, sub);
    if (this.timer === null) this.schedule(firstInMs ?? this.intervalMs);
  }

  remove(key: string): void {
    if (this.ticking) { this.pendingRemove.push(key); return; }
    this.subs.delete(key);
    if (this.subs.size === 0) this.unschedule();
  }

  remainingMs(): number {
    return this.timer === null ? 0 : Math.max(0, this.nextAt - Date.now());
  }

  keys(): string[] { return [...this.subs.keys()]; }

  private schedule(delayMs: number): void {
    this.nextAt = Date.now() + delayMs;
    this.timer = setTimeout(() => { this.timer = null; void this.fire(); }, delayMs);
  }

  private unschedule(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.onEmpty();
  }

  // Hooks run one after another. A throwing hook is logged and the rest still run.
  private async fire(): Promise<void> {
    this.ticking = true;
    for (const sub of [...this.subs.values()]) {
      try { await sub.hook(...sub.args); }
      catch (err) { console.error('ticker hook failed', sub.key, err); }
    }
    this.ticking = false;
    for (const key of this.pendingRemove) this.subs.delete(key);
    this.pendingRemove = [];
    for (const sub of this.pendingAdd) this.subs.set(sub.key, sub);
    this.pendingAdd = [];
    if (this.subs.size === 0) { this.unschedule(); return; }
    this.schedule(this.intervalMs);   // next pass is scheduled only after this pass finished
  }
}

class TickerHub {
  private groups = new Map<number, IntervalGroup>();

  add(intervalSec: number, key: string, hook: Hook, firstInMs?: number): void {
    const seconds = Math.trunc(intervalSec);   // donor: int(interval), so whole seconds only
    if (seconds < 1) throw new RangeError('ticker interval must be at least 1 second');
    let group = this.groups.get(seconds);
    if (!group) {
      group = new IntervalGroup(seconds * 1000, () => { this.groups.delete(seconds); });
      this.groups.set(seconds, group);
    }
    group.add({ key, hook, args: [] }, firstInMs);
  }

  remove(intervalSec: number, key: string): void {
    this.groups.get(Math.trunc(intervalSec))?.remove(key);
  }

  // Save each interval's time-to-next-pass so a restart resumes the same phase.
  snapshot(): SavedGroup[] {
    return [...this.groups.entries()].map(([intervalSec, g]) => ({
      intervalSec, nextInMs: g.remainingMs(), keys: g.keys(),
    }));
  }

  restore(saved: SavedGroup[], resolve: (key: string) => Hook | undefined): void {
    for (const g of saved) {
      for (const key of g.keys) {
        const hook = resolve(key);
        if (hook) this.add(g.intervalSec, key, hook, g.nextInMs);
      }
    }
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/timers.ts` (new, the server timer service), used by `origins/server/world-spawns.ts` for respawn and grace timers. This is the honest fit: the donor is a coarse timer service, not a fixed-step loop.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The fixed-step server tick (row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget") is not supplied by this donor.
- Reuse tag: adapt-allowed (BSD-3-Clause: code may be adapted if the copyright notice and licence text are kept in redistributions)
- Brief rule served: 1 (one engine: one timer service); rule 7 (zones as data: the interval per zone timer is zone data)

## 6. Gaps and risks

- Whole seconds only, minimum 1 second (tickerhandler.py 390-393). The Pit and fight run at sub-second cadence, so this cannot be the fight tick. It fits respawn, grace expiry, cooldown expiry and regen, where a 1 s grain is acceptable.
- A slow hook holds up the rest of its interval group, because hooks are awaited one by one (129, 137). Frankendom's NPC work must not share a group with the fight, or each hook must be bounded (see the budget shape in the pmbstyle-L2Solo note).
- Downtime: the restore resumes each group from the saved time-to-next-pass (410-428). The code read does no catch-up for passes missed while the server was down, so a respawn due during downtime fires after the saved remainder, not at once. Frankendom must decide this per timer and test it.
- One ledger and server-verified kills: subscriptions live in their own ServerConfig storage (ticker_storage, 533, 486-487), separate from game data. A crash between a ledger write and a timer save can disagree. Timers must reference ledger ids, and the kill or respawn must be decided by the server ledger when the timer fires, not by the stored subscription.
- Object checks rely on the database `pk` (132, 139). Frankendom's zones are data, so timers should key on zone and spawn-point ids, not on live objects.
- Twisted behaviour not read: how the next pass is scheduled after a pass that runs longer than the interval. Do not copy the sketch's choice as if it were the donor's.
- Pit as client: the Pit has no server timers; any Pit timers are client presentation only.

Best transferable idea: One timer per interval value, shared by every subscriber on that interval, with changes made during a pass applied after it, and a saved time-to-next-pass so a restart keeps the same phase.
Decision (proposed): adapt - the shape fits zone timers (respawn, grace expiry, cooldowns) under row 23; the whole-second interval, the database storage and the object-based callbacks do not fit the fight.
Acceptance: a server test in which a respawn timer subscribed during a pass first fires on its own interval and not in that pass, a throwing timer does not stop the others in its group, and a restart with 4 s left to the next pass fires that pass 4 s after restart.
