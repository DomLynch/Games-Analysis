# beyond-all-reason-Beyond-All-Reason (economy-trade, cell 1)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/game_tax_resource_sharing.lua` | Licence: GNU GPL v2 or later (gadget header line 9: `license = "GNU GPL, v2 or later",`; repo LICENSE.md line 2 says the game code is GPL v2) | Lua (Recoil/Spring synced gadget) | symbols `AllowResourceTransfer` (54-87), `GameFrame` (102-243), `AllowFeatureBuildStep` (246-273), `AllowUnitBuildStep` (276-313)

Checked: read the whole gadget (313 lines) on the VPS. Confidence high on the player-to-player transfer path (54-87) and on the overflow pass (102-243): I traced both by hand and ran the transfer arithmetic in the sketch on the VPS (three cases, output matched). Not read: the engine calls `Spring.UseTeamResource`, `ShareTeamResource`, `AddTeamResource`, `SetTeamResource` (RecoilEngine, not in the donor), so how the engine clamps a request before the callin is unknown. Not read: `game_prevent_excessive_share.lua` (the fallback when this gadget is off, see section 6). Grep only, not read: `luaui/Widgets/gui_advplayerslist.lua` (display of the tax). camera_scope: n/a (economy topic).

## 1. Mechanism

- A sink tax on every transfer of metal or energy between allied players, plus two build-side taxes. The donor takes the tax out of the economy: it is charged to the sender and nothing receives it. The sender pays a gross amount, the receiver gets a net amount, and the difference is burned.
- Player-to-player transfer, `AllowResourceTransfer` (54-87). Order of steps: (a) map the engine's `m`/`e` names to metal/energy, and let any other resource through untouched (57-65); (b) read the receiver's stock, storage and share slider (69); (c) headroom = storage x share slider - current stock (72); (d) if the request is zero or the headroom is zero or less, refuse and move nothing (74-76); (e) net credit = min((1 - tax) x requested, headroom) (78); (f) gross debit = net / (1 - tax) (79); (g) set the receiver to current + net (81); (h) re-read the sender and set it to its stock - gross (82-83); (i) return false, which blocks the engine's own transfer (85-86). The tax is gross - net, so it is never credited to anyone.
- The function does not compare the sender's stock with the gross debit. Its body (54-87) has no such check. The engine may clamp the request before calling the callin (not read). The sketch adds the check.
- Build taxes, when a player builds or resurrects for an ally. Wreck resurrection (246-273): the tax is `featureMaxMetal x part x tax` (263), paid by the builder, and the step is refused if the builder cannot pay tax plus step cost (264-267). Ally construction assist (276-313): metal and energy tax are `cost x part x tax` (301-302), and the step is refused if either stock is short (305-308).
- Overflow share, `GameFrame` (102-243). Fixed cadence: it runs when `(f - 1) % 30 == 0` (101-103), i.e. every 30 engine frames, not every frame. For each team: (a) its excess = stock above its own share slider (138-139); (b) allied headroom = storage x min(0.99, ally share) - ally stock, summed over living allies (116-135); (c) `de = min(1, excess / headroom)` (143-148); (d) each ally gets `edif = max(0, min(ally headroom x de, team stock))` (loop from 151, before the comment at 187); (e) first pass: the sender pays `edif x tax` (178-179) and the ally gets `edif x (1 - tax)` (181-182). Second pass (190-238): the engine's own overflow (`teamEnergyExcess`, 193), taxed to `x (1 - tax)` (197), is added to allies with `spAddTeamResource` (237-238). Nothing is debited from anyone in the second pass. The donor comment says these are "resources that we technically already wasted" (187) and that they "erroneously count as produced resources" (236).
- The tax rate is one modoption, `tax_resource_sharing_amount`, 0 to 0.99, default off, step 0.01 (modoptions.lua 407-419; description at 412: "Set to [0] to turn off. Recommended: [0.4]."). If it is 0 and easytax is off, the gadget returns at load (21-23). Easytax fixes it at 0.3 (47).
- Tick: the transfer is event-driven (one call per request, synchronous). The overflow share is a fixed-step tick on a 30-frame gate. There is no accumulator and no wall-clock timer.

## 2. Key functions

- `AllowResourceTransfer`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/game_tax_resource_sharing.lua` 54-87. The player-to-player transfer with the gross/net/burn split. Callers: the engine (callin); I did not read which engine commands reach it. Other gadgets define the same callin (grep only: `game_prevent_excessive_share.lua:28`, `cmd_idle_players.lua:234`, not read), so this note does not claim this gadget is the only one that acts.
- `GameFrame`, overflow share: same file 102-243. Two passes (the first 138-185, the second 187-238). The second pass is the one that credits without a debit.
- `AllowFeatureBuildStep`, wreck tax: same file 246-273 (tax at 263, refusal at 267).
- `AllowUnitBuildStep`, ally assist tax: same file 276-313 (tax at 301).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Gross/net/burn split: the sender pays net / (1 - t), the receiver gets net, the sink is the difference (78-83) | Tax t from the modoption, 0 = off (21), easytax 0.3 (47), recommended 0.4 (modoptions.lua:412, the description text), max 0.99 (modoptions.lua 416, the receipt quote is too short) |
| Receiver cap: headroom = storage x share - current (72), applied after the tax (78) | Share slider per team (rShare, line 69). No 0.99 clamp in this function. The 0.99 clamp (`math_min(0.99, share)`, 126) is used only in the overflow pass |
| Refuse at zero headroom or zero amount, move nothing (74-76) | None (the rule) |
| Overflow share: take only what is above the sender's own slider, and split it over allies by their headroom (138-148) | Tick period 30 frames (101), gate `(f - 1) % 30` (103); the donor says it matches the engine (comment at 101, engine not read) |
| Build-side tax on a step: `cost x part x t` (263, 301) | Same tax t as above (the same modoption) |
| Second-pass credit with no debit (237-238) | None. This is the part to reject (section 6) |

## 4. TypeScript sketch

simplified: the sketch models only the player-to-player transfer (donor 54-87) with the gross/net/burn split. It omits the overflow pass (102-243), the wreck and ally-assist build taxes (246-313), the engine's share-slider and stock clamps (not read), the statistics counters, the easytax preset and the team-alive check. It adds a sender-balance clamp, which the donor's function does not show (54-87 has no such check). It reads the receiver ceiling as the donor's storage x share (72), not the 0.99 clamp, and it keeps floats, as the donor does.

```ts
// Licence of donor: GNU GPL v2 or later (copyleft). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Wallet {
  balance: number;        // stock held by the team or player
  capacity: number;       // maximum stock (storage in the donor)
  receiveCeiling: number; // ratio: transfers may fill the wallet only up to capacity * receiveCeiling
}

interface TransferResult { sent: number; received: number; burned: number; }

// Player-to-player transfer with a sink tax.
// The sender is debited the gross amount, the receiver is credited the net amount,
// and the difference (the tax) leaves the economy. Nothing is created here.
function transfer(from: Wallet, to: Wallet, requested: number, taxRate: number): TransferResult {
  if (taxRate < 0 || taxRate > 0.99) throw new Error("taxRate must be in [0, 0.99]");
  const none = { sent: 0, received: 0, burned: 0 };
  if (requested <= 0) return none;

  const headroom = to.capacity * to.receiveCeiling - to.balance;   // what the receiver may still take
  if (headroom <= 0) return none;

  // Cap the NET credit by the receiver's headroom and by what the sender can gross-up to.
  const net = Math.min((1 - taxRate) * requested, headroom, from.balance * (1 - taxRate));
  const gross = net / (1 - taxRate);                               // what the sender pays

  from.balance -= gross;
  to.balance += net;
  return { sent: gross, received: net, burned: gross - net };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, passed (no output errors). Run of the same function on the VPS, three cases: (1) sender 1000, receiver room 500, request 100, tax 0.3 gives sent 100, received 70, burned 30, balances 900 and 70; (2) receiver room 50 gives sent 71.43, received 50, burned 21.43, balances 928.57 and 500; (3) sender holding 50 gives sent 50, received 35, burned 15, balance 0. Every case conserves stock: sent = received + burned.

## 5. Lands in

- TARGET `origins/server/ledger.ts` (proposed new module; I did not check the Frankendom tree, and no existing file is named here). The transfer runs only on the server. The client shows the result (sent, received, burned) and never writes a balance.
- Parity-checklist row: none. The closest row is 18 (loot roll and XP award), but a transfer tax is not a loot or XP rule, so I did not file it there. No row 1-23 covers player trade or sinks. Flagged for Lead to decide on whether a new row is wanted.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (every coin moved is either credited to someone or counted as burned); server-verified (the server computes the split, the client only reads it)

## 6. Gaps and risks

- Licence: GPL. Clean-room only. The sketch was written from the described mechanism and not from the donor's lines.
- One ledger, the overflow pass: the second pass (237-238) credits allies with no debit, and the donor's own comment says so (236). That breaks Frankendom's one-ledger rule. Reject that part. If Frankendom ever wants overflow sharing, it must name a source account that pays for it.
- Stale stock: the overflow pass reads the team's stock once (106-109). The first pass caps credits by that variable (165) and then spends part of the stock (178-182), without refreshing the variable. The second pass caps credits by the same variable again (224). Nothing in the donor refreshes it. A ledger must use live balances at every step.
- No sender check: the transfer (54-87) does not check that the sender can pay the gross amount. Frankendom must refuse or clamp a transfer the sender cannot cover, on the server. The sketch does this (clamp on the gross).
- Floats vs integer coins: the donor uses floats. Frankendom will need integer coins, so one rounding rule has to decide how gross and net are rounded, and the test has to show that sent = received + burned for every case.
- Two gadgets define the same callin (`game_prevent_excessive_share.lua:28`, `cmd_idle_players.lua:234`, grep only). The donor's layer comment (10) says the tax must run before "Prevent Excessive Share" because of how it restricts the same callin. How the handler combines them is not read.
- The tax rate is a per-match modoption in the donor. In Frankendom it is zone data (a trade zone or a hub sets it; 0 means off). The modoption default is 0 (off), and the donor's easytax preset is 0.3.
- The donor's `SetTeamResource` and `AddTeamResource` calls write the engine's stock directly. In Frankendom there is no engine ledger; the server ledger is the only store. The shape transfers, the calls do not.
- Synced-code guard: the gadget runs only in synced code (line 18-20). That is the engine's authoritative simulation, not a client check. The equivalent in Frankendom is the server.
- The donor has no rule for who may trade with whom beyond the allied-team check in the overflow pass. The transfer callin itself does not check alliance (54-87); the engine may check it before the callin (not read). Frankendom's trade rules must be explicit.

Best transferable idea: a player-to-player transfer that debits the sender gross, credits the receiver net after a sink tax, caps the credit by the receiver's remaining room, and counts the difference as burned, so every coin is accounted for.

Decision (proposed): adapt — the gross/net/burn split is a clean currency sink for player trade and fits one server ledger, but the overflow pass mints credit with no debit and the donor's transfer has no sender check, so only the transfer shape is taken, not the overflow pass.
Acceptance: a server test asserts that a 100 transfer at tax 0.3 with room gives the receiver +70, the sender -100 and 30 burned, that a full receiver gets +50 with the sender paying 71.43 and 21.43 burned, and that the total of all balances plus burned is unchanged in every case.
