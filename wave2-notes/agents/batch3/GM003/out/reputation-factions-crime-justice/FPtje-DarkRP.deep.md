# FPtje-DarkRP (reputation-factions-crime-justice, cell 27)

Donor: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/hitmenu/sv_init.lua` (`plyMeta:requestHit` 17-39 in sv_init; `placeHit` 41-58; `cancelHit` 92-102; `abortHit` 81-90; `questionCallback` 110-134; `PlayerDeath` hook 222-237) | Licence: MIT (`/mnt/frankendom-donors/FPtje-DarkRP/LICENSE.txt`, Copyright (c) 2014 Falco Peijnenburg; code may be adapted) | Lua | symbol `plyMeta:placeHit`

Checked: Read in full: `modules/hitmenu/sv_init.lua` 1-271 and `modules/hitmenu/sh_init.lua` 1-60 (gates, price, cooldowns; DarkRPVars). Read in full: `modules/police/sh_init.lua` 1-215 (checks and commands) and `modules/police/sv_init.lua` 1-463 (warrant, wanted, arrest, jail timers, admin commands, hooks). Read: `modules/base/sv_gamemode_functions.lua` 470-482 and 536-570 (the wanted flag clears on death; the `PlayerDeath` signature at 519 seen by grep) and 945-1032 (disconnect). Config: hitman keys (524-536), jail, wanted and warrant keys (13, 97, 214, 278, 300, 121, 168-171). Callers: `placeHit` is called from `questionCallback` (sv_init.lua:133) in the files read; I did not run a donor-wide grep for other callers. Not read: `hitmenu/sv_interface.lua` (hook names only), `hitmenu/cl_menu.lua` (UI), `police/sv_commands.lua` (lottery, lockdown, laws), `police/sv_interface.lua`. Confidence: high on the bounty order of operations and every number listed; high on the jail-timer behaviour from the code (not run); medium on the death-clears-wanted rule (read, not run). The donor has no murder count, karma, fame or faction reputation: a donor-wide grep of `gamemode/` for murder, killcount, karma, fame and reputation returned no hits. `camera_scope` not applicable (crime and reputation).

## 1. Mechanism

- A bounty is a "hit": a contract on one target, ordered from a hitman (a job the donor marks as a hitman team, `DarkRP.addHitmanTeam`). The hitman posts a price with `/hitprice`; the customer orders with `/requesthit` (sv_init.lua:150-164), and pays the hitman's posted price (161).
- Order of the request (`plyMeta:requestHit`, sv_init.lua 17-39; gates in `DarkRP.hooks:canRequestHit`, sh_init.lua 30-40), in donor order:
  (a) the hitman must be on a hitman team (31);
  (b) customer within 150 units of the hitman, compared squared (32; 3);
  (c) customer alive (33); target is not the hitman (34); customer is not the hitman (35);
  (d) customer can afford the price (36); price at least the minimum of 200 (37);
  (e) the hitman has no active hit (38);
  (f) the target was not the victim of a completed hit in the last 120 s (39);
  (g) the customer has not accepted a hit in the last 240 s (40).
- Then a question goes to the hitman with a 20-second answer window (sv_init.lua:26-34). A decline ends it (`questionCallback` 124-126). An accept runs `questionCallback` (110-134): it re-checks that the customer, the hitman and the target are valid (111-122) and that the hitman has no hit (129), then calls `placeHit` (133). It does not re-run the distance or cooldown gates.
- `placeHit` (41-58): the customer must afford the price (44); the record stores the price, customer and target (49-53); the hitman is paid the full price now (55). There is no escrow. `onHitAccepted` then stamps the customer's accept time (186).
- Completion: when the hitman kills the named target, `PlayerDeath` calls `onHitCompleted` (227-229, 191-208). It stamps the target's kill time (205) and clears the record (207). No money moves at completion; the money already went at accept.
- Abort (`abortHit` 81-90): no money moves. Triggers: the hitman dies (223-224); the target dies to anyone other than the hitman (233-234); the hitman disconnects (240-241); the customer or target disconnects (245-250); the hitman is arrested (255-264); the hitman changes team (267-269).
- Cancel (`cancelHit` 92-102): the hitman may refund the customer, but only if the hitman can afford the refund (94-99); then the hit aborts.

Numbers in play: minimum price 200 and maximum 50000 (config 524, 526; the posted price is clamped at sv_init.lua:68; the default posted price is the minimum, sh_init.lua:18); distance 150 (config 528); target cooldown 120 (config 534); customer cooldown 240 (config 536); accept window 20 s (sv_init.lua:29).

Related crime code in the same cell (read, not sketched): warrants (police/sv_init.lua 8-47; search lasts `searchtime`, 13, default 30); wanted (49-94; a wanted timer of `wantedtime` 120 s, 55-60, cleared by `unWanted`; re-wanting is refused, police/sh_init.lua:60, so the timer cannot be extended); arrest (96-108, 337-365, 367-395; the jail timer is per SteamID64, 388, default 120 s, 97); rejoin in jail (429-441). A death caused by someone else, or a slay, clears the wanted flag unless `wantedrespawn` is on (gamemode sv_gamemode_functions.lua 564-566; default off, config 169).

## 2. Key functions

- `requestHit` in `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/hitmenu/sv_init.lua` 17-39 (accept question 26-34).
- `canRequestHit` (gates) in `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/hitmenu/sh_init.lua` 30-43.
- `placeHit` in `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/hitmenu/sv_init.lua` 41-58 (afford 44; payment 55).
- `cancelHit`, `abortHit`, `finishHit` in the same file 81-108.
- `questionCallback` in the same file 110-134.
- Hooks in the same file: `onHitCompleted` 191-208, `PlayerDeath` 222-237, `PlayerDisconnected` 239-253, `playerArrested` 255-265, `OnPlayerChangedTeam` 267-271.
- Police (related): `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/police/sv_init.lua` 8-47 (warrants), 49-94 (wanted), 96-108 (arrest), 337-365 (`canArrest`), 367-395 (`playerArrested` and jail timer 388), 397-427 (`playerUnArrested`), 429-441 (rejoin re-arrest).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Bounty price band | min 200, max 50000 (config.lua:524, :526); clamp at sv_init.lua:68 |
| Default posted price = band minimum | sh_init.lua:18 |
| Hit range | 150 units, squared 22500 (config.lua:528; sh_init.lua:3, :32) |
| Accept window | 20 s (sv_init.lua:29) |
| Per-target cooldown after a completed kill | 120 s (config.lua:534; stamped at sv_init.lua:205; checked at sh_init.lua:39) |
| Per-customer cooldown after an accepted order | 240 s (config.lua:536; stamped at sv_init.lua:186; checked at sh_init.lua:40) |
| Concurrent hits per hitman | 1 (sh_init.lua:38; sv_init.lua:42, :129) |
| Warrant lifetime | 30 s (config.lua:278; sv_init.lua:13) |
| Wanted lifetime | 120 s (config.lua:300; sv_init.lua:56) |
| Jail sentence default | 120 s (config.lua:214; sv_init.lua:97) |
| Refund on cancel | only if the hitman can afford it (sv_init.lua:94); no refund on any abort |

## 4. TypeScript sketch

simplified: the sketch keeps the donor gate order and both cooldowns, with one contract per hitman. It omits the `canRequestHit` override point, the 20-second question and its notification, the three-player validity check, the `cancelHit` refund, and the team-change and arrest triggers (all collapse into `abortContract`). Time is in milliseconds where the donor uses CurTime seconds. It changes the money path on purpose: the customer's money goes to an escrow account at accept and pays out only on the named kill; every abort refunds the customer. The donor pays the hitman at accept and refunds nothing on abort. The sketch does not re-run the distance and cooldown gates at accept; section 6 records that gap.

```ts
// Licence: MIT (donor FPtje-DarkRP). Shape adapted; written from the mechanism, not copied line by line.

interface Ledger {
  balance(accountId: string): number;
  // The one money door: every change of balance is a signed row, applied together.
  settle(rows: ReadonlyArray<{ accountId: string; delta: number; reason: string }>): void;
}

interface BountyRules {
  minPrice: number;          // donor: minHitPrice 200 (config.lua:524)
  maxPrice: number;          // donor: maxHitPrice 50000, clamp in setHitPrice (sv_init.lua:68)
  maxDistance: number;       // donor: minHitDistance 150 (config.lua:528), compared squared (sh_init.lua:3, :32)
  targetCooldownS: number;   // donor: hitTargetCooldown 120 (config.lua:534), starts at the kill (sv_init.lua:205)
  customerCooldownS: number; // donor: hitCustomerCooldown 240 (config.lua:536), starts at accept (sv_init.lua:186)
}

interface Contract {
  id: string;
  hitmanId: string;
  customerId: string;
  targetId: string;
  price: number;
}

interface BountyState {
  byHitman: Map<string, Contract>;   // donor: hits[hitman]; one active contract per hitman (:129)
  lastKillAt: Map<string, number>;   // donor: target lastHitTime
  lastAcceptAt: Map<string, number>; // donor: customer.lastHitAccepted
}

interface Request {
  hitmanId: string; customerId: string; targetId: string; price: number;
  distance: number; hitmanIsHitman: boolean; customerAlive: boolean; customerBalance: number;
}

// Donor gate order (sh_init.lua:31-40). Returns a refusal reason, or null if the request may proceed.
export function requestBlock(r: Request, rules: BountyRules, st: BountyState, now: number): string | null {
  if (!r.hitmanIsHitman) return "not a hitman";
  if (r.distance > rules.maxDistance) return "too far";
  if (!r.customerAlive) return "customer dead";
  if (r.targetId === r.hitmanId) return "no suicide";
  if (r.customerId === r.hitmanId) return "no self order";
  if (r.customerBalance < r.price) return "cannot afford";
  if (r.price < rules.minPrice) return "price too low";
  if (st.byHitman.has(r.hitmanId)) return "hitman busy";
  const lastKill = st.lastKillAt.get(r.targetId);
  if (lastKill !== undefined && now - lastKill < rules.targetCooldownS * 1000) return "target cooling down";
  const lastAccept = st.lastAcceptAt.get(r.customerId);
  if (lastAccept !== undefined && now - lastAccept < rules.customerCooldownS * 1000) return "customer cooling down";
  return null;
}

// Accept: the customer's money goes into an escrow account, not to the hitman (fix; donor pays the hitman here).
export function acceptContract(c: Contract, st: BountyState, ledger: Ledger, now: number): boolean {
  if (st.byHitman.has(c.hitmanId)) return false;                       // donor :129
  if (ledger.balance(c.customerId) < c.price) return false;            // donor :44
  ledger.settle([
    { accountId: c.customerId, delta: -c.price, reason: "bounty escrow " + c.id },
    { accountId: "escrow:" + c.id, delta: c.price, reason: "bounty escrow " + c.id },
  ]);
  st.byHitman.set(c.hitmanId, c);
  st.lastAcceptAt.set(c.customerId, now);                              // donor :186
  return true;
}

// Kill: paid out only when the hitman kills the named target (donor :227-229, completion).
export function onKill(killerId: string, victimId: string, st: BountyState, ledger: Ledger, now: number): void {
  const c = st.byHitman.get(killerId);
  if (!c || c.targetId !== victimId) return;
  ledger.settle([
    { accountId: "escrow:" + c.id, delta: -c.price, reason: "bounty paid " + c.id },
    { accountId: c.hitmanId, delta: c.price, reason: "bounty paid " + c.id },
  ]);
  st.lastKillAt.set(victimId, now);                                    // donor :205
  st.byHitman.delete(c.hitmanId);
}

// Abort (hitman died or left, target died to someone else, customer left, hitman arrested or changed team).
// Donor: abortHit moves no money (sv_init.lua:81-90). Fix: refund the customer from escrow.
export function abortContract(hitmanId: string, st: BountyState, ledger: Ledger): void {
  const c = st.byHitman.get(hitmanId);
  if (!c) return;
  ledger.settle([
    { accountId: "escrow:" + c.id, delta: -c.price, reason: "bounty refund " + c.id },
    { accountId: c.customerId, delta: c.price, reason: "bounty refund " + c.id },
  ]);
  st.byHitman.delete(hitmanId);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file with `export {}` appended: exit 0.

## 5. Lands in

- TARGET `origins/server/bounty.ts` (new, proposed): one bounty contract per hitman, escrowed through the one money door, settled by the server's kill record. Parity-checklist row 21 (catalogue fields), from the list hint: the price band and the two cooldowns are row fields. This is a weak fit, because the bounty is a contract on a player, not a catalogue entry; the row is the nearest hint.
- today: (not read; this lane did not open the Frankendom repo).
- Reuse tag: adapt-idea (MIT; code may be adapted; this sketch is written clean from the mechanism)
- Brief rule served: one ledger (escrow is a ledger account; payout and refund are rows); server-verified kills (the payout waits for the server's kill record); zones as data (price band and cooldowns as fields).

## 6. Gaps and risks

- Pay-up-front with no escrow (sv_init.lua:55): the customer's money is with the hitman before anything happens. The abort paths move no money back (`abortHit` 81-90): a hitman who dies, disconnects, is arrested, changes team, or whose target is killed by someone else leaves the customer with nothing. Fix: escrow and refund on every abort (the sketch).
- The hitman is the only refund route: `cancelHit` refunds only if the hitman can afford it (sv_init.lua:94-99). A poor hitman cannot refund.
- Distance and cooldowns are checked at request only. The 20-second accept window does not re-run `canRequestHit`; `questionCallback` (110-134) checks validity and the hit slot only. A customer can accept after walking away or after re-ordering. Fix: re-run the gates at accept.
- The customer does not choose the price: `requestHit` uses the hitman's posted price (sv_init.lua:161). That is fine for a market but must be stated in the UI.
- The target cooldown starts only at a completed kill (sv_init.lua:205). A target whose hits are aborted can be ordered again at once. Decide whether an aborted hit should start a cooldown.
- Kill attribution is by the killer object only (`attacker:getHitTarget() == ply`, sv_init.lua:227). Frankendom must bind the payout to the server kill record, not to the engine's attacker field.
- Wanted and jail (related, read, not sketched). The donor's jail record is kept in memory by SteamID (police/sv_init.lua:102, 114). The jail timer is per SteamID64 (388) and is not removed on disconnect (only the job and property-tax timers are removed, gamemode sv_gamemode_functions.lua:1002-1003). When it expires offline it clears the record (390). A rejoin before expiry re-arrests with the full jail time (431), so time served is lost. A second arrest returns before the timer is set (377), so re-arrest does not extend the sentence although the comment at line 104 says it always sends the player to jail (that comment covers teleport only). Keep the idea (a fixed sentence with a record), fix both defects: store remaining time and reset the timer on re-arrest.
- Death clears the wanted flag when someone else kills the player (gamemode sv_gamemode_functions.lua 564-566; `wantedrespawn` off, config 169). That is the donor's way to make a hostile flag short-lived; it is a design choice for Frankendom's PvP flag, not a bug.
- DarkRP has no murder counter, karma, fame, or faction reputation (grep, donor-wide). Frankendom's reputation must be designed from scratch; this donor offers only the wanted flag, the warrant, the jail record and the bounty.
- Guards as spawns (zone rows) are not in this code: the cops are players with job rules. Nothing here supports row 23.
- MIT: code may be adapted. The sketch is clean.

Reuse tag: adapt-idea (MIT)
Brief rule served: one ledger, server-verified kills, zones as data (price band and cooldowns as fields)

Best transferable idea: a bounty is one contract record per hitman with a 20-second accept window, a posted price inside a fixed band, and per-target and per-customer cooldowns, which the server can settle through an escrow account and pay out only on the named kill.

Decision (proposed): adapt - the one-contract record with the two cooldowns and the price band is a clean, checkable bounty shape for PvP-flagged players; reject the donor's pay-at-accept with no refund on abort, and re-run the gates at accept.

Acceptance: a server test: a customer orders a 1000-unit bounty on target T; the 1000 moves into escrow on accept; if a third player kills T, the customer's balance returns to its pre-order value and the hitman's is unchanged; if the hitman kills T, the hitman gains 1000, and a new bounty on T is refused for 120 s; a second order from the same customer within 240 s is refused.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Error: header put requestHit 17-39 in sh_init; it is in sv_init.lua:17-39 (sh_init holds canRequestHit 30-43). Confirmed.
- Missed: none significant.

Fixed 2026-10-12: header file attribution of requestHit.
