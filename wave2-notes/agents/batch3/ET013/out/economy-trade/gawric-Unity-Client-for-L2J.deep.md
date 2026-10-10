# gawric-Unity-Client-for-L2J (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/UI/Game/Trade/TradeRequestWindow.cs` (`ShowWindow` 89-98, `CountdownTimer` 118-134, `OnTimeout` 148-152, `SendAcceptResponse` 154-160, `SendDeclineResponse` 162-168, `HideWindow` 170-179) | Licence: Apache-2.0 (the repo LICENSE file, line 2: "Version 2.0, January 2004") | C# (Unity UI Toolkit client) | symbol `TradeRequestWindow.ShowWindow` / `CountdownTimer`

Checked: Read in full: `TradeRequestWindow.cs` (30-190; 1-29 declarations only), `TradeWindow.cs` (1-378, all), `ShopItemEvaluator.cs` (1-90, all), `SendTradeRequestIncoming.cs` (the one call site of `TradeRequestWindow.ShowWindow`), `TradeOwnAddIncoming.cs`, `TradeOtherAddIncoming.cs`, `TradeDoneIncoming.cs`, `TradeStartIncoming.cs`. Partly read: `TradeItemMover.cs` (1-60), `DealerWindow.cs` (grep only), `BuyListDto.cs` (Product price and count properties). Callers: `TradeRequestWindow.ShowWindow` has one call site (SendTradeRequestIncoming.cs 11, default timeout). Not read: the server, which is not in this repo (the L2J game server is a separate project; any trade rules, prices, adena checks, item transfer and server-side expiry are therefore absent here). Confidence: high for the client invite timer and for the two trade-state gaps (both read end to end). Medium that this is a true STRONG: the mechanism is only the client half of an invite handshake, so depth is thin; the economy topic itself is mostly absent (see Section 6). This is not a camera topic.

## 1. Mechanism

- A player-trade invite opens a popup for 20 seconds. The invite packet carries only the sender id (`AddData`, TradeRequestWindow.cs 47-54, reads `request.SenderId` at 49). The window is opened with the default timeout (`ShowWindow(float timeoutSeconds = 20f)`, 89; called from SendTradeRequestIncoming.cs 11). The server does not send an expiry, so the 20 s is a client constant.
- Order of steps when the window is shown: store the timeout (91), open the base window, set the text, reset the bar to full, and start one countdown coroutine (`StartCountdown` stops any old coroutine first, then starts `CountdownTimer`, 110-116).
- Countdown (118-134): `currentTime` starts at the timeout (120). While it is above 0 (122), it subtracts `Time.deltaTime` each frame (124), sets the bar fraction `currentTime / timeout` (125), and draws the bar at that percentage (128). When the loop ends it calls `OnTimeout` (133).
- Three ways out. Accept: the confirm button sends `AnswerTradeRequestCommand(1)` (157 via SendAcceptResponse 154-160), raises the response event with true, and hides the window (`OnConfirmClicked` 136-140). Decline: the cancel button sends `AnswerTradeRequestCommand(0)` (165 via SendDeclineResponse 162-168) and hides. Timeout: `OnTimeout` sends decline (150) and hides (151).
- Hide (170-179) stops the countdown coroutine (174) and then hides the base window. So a timeout that hides the window stops its own coroutine; a confirm or cancel sends the answer first (`SendAcceptResponse` or `SendDeclineResponse`) and then calls `HideWindow`, which stops the countdown (OnConfirmClicked and OnCancelClicked, TradeRequestWindow.cs 136-146). A timeout also sends decline first, then hides (148-152).
- Tick: per frame, in a Unity coroutine. The clock is `Time.deltaTime`, which Unity scales by `Time.timeScale` (Unity behaviour; not read in this repo). The client does not know the server's clock.

Trade window, for context (not a timer): `TradeWindow` has eight exchange slots (119). Adding an item sends `AddTradeItemCommand(0, item.ObjectId, item.Count)` (170). Removing an item clears the slot and the local list only (`RemoveExchangeItem` 178-186; no send; the RemoveAll at 184 is the only change). OK sends `TradeDoneCommand(1)` (208) and cancel sends `TradeDoneCommand(0)` (216). The server's replies for the trade's own adds and other side's adds are empty stubs (see Section 6).

## 2. Key functions

- `TradeRequestWindow.ShowWindow`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/UI/Game/Trade/TradeRequestWindow.cs` 89-98. Sets the timeout, opens the window, resets the bar, starts the countdown.
- `TradeRequestWindow.CountdownTimer`: same file, 118-134. The per-frame drain and the timeout.
- `TradeRequestWindow.OnTimeout`: same file, 148-152. Timeout is a decline.
- `TradeRequestWindow.HideWindow`: same file, 170-179. Stops the countdown on any close.
- `SendTradeRequestIncoming.Apply`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Networking/ClientLibrary/Packet/Incoming/Game/SendTradeRequestIncoming.cs` 6-11 (the only caller of the invite window).
- `TradeWindow` (trade slots, adds, removes): `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/UI/Game/Trade/TradeWindow.cs` 115-219 (for the gaps).
- `ShopItemEvaluator.UpdateAllPrice`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/UI/Game/Merchant/Support/ShopItemEvaluator.cs` 41-70 (basket total; display only).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| An open invite expires after a fixed window, and the bar shows time left as a fraction | 20 seconds (theirs, TradeRequestWindow.cs 89, default argument) |
| Expiry counts as a decline | Decline value 0 (theirs, AnswerTradeRequestCommand 0 at 165) |
| Accept is a separate value | Accept value 1 (theirs, AnswerTradeRequestCommand 1 at 157) |
| Closing the window stops its timer | None (mechanism, 174) |
| Trade slots per side | 8 slots (theirs, TradeWindow.cs 119) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's three outcomes (accept, decline, timeout as a decline) and the drain fraction. It moves the expiry decision to the server clock, because the donor has no server expiry and Frankendom's rulings require the server to decide. It omits the Unity coroutine and frame-time countdown, the UI and text, the one-window-at-a-time reuse (the donor restarts the countdown when a new invite arrives), the name lookup, and the hide-on-timeout. The `sweep` function is an addition (the donor has no server side in this repo).

```ts
// Licence: Apache-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const INVITE_SECONDS = 20; // data: the donor's default window (ShowWindow default 20 s)

type InviteState = "pending" | "accepted" | "declined" | "expired";

interface Invite {
  id: number;
  from: number;
  to: number;
  expiresAt: number; // server clock, seconds
  state: InviteState;
}

function openInvite(id: number, from: number, to: number, now: number, seconds: number = INVITE_SECONDS): Invite {
  return { id, from, to, expiresAt: now + seconds, state: "pending" };
}

// Server-side answer. The server clock decides; a late accept is refused even if the client showed a live bar.
function respond(inv: Invite, accept: boolean, now: number): InviteState | "already-closed" {
  if (inv.state !== "pending") return "already-closed";
  if (now >= inv.expiresAt) {
    inv.state = "expired";
    return "expired";
  }
  inv.state = accept ? "accepted" : "declined";
  return inv.state;
}

// Server-side sweep: every invite past its time closes as expired (the donor's client sends decline on its timer).
function sweep(invites: Invite[], now: number): number {
  let closed = 0;
  for (const inv of invites) {
    if (inv.state === "pending" && now >= inv.expiresAt) {
      inv.state = "expired";
      closed += 1;
    }
  }
  return closed;
}

// Client display only: fraction of the bar still shown (the donor's progress = time left / window).
function drainFraction(inv: Invite, now: number, seconds: number = INVITE_SECONDS): number {
  return Math.max(0, Math.min(1, (inv.expiresAt - now) / seconds));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/economy/trade-invite.ts` (new, proposed; the Frankendom repo was not read for this note). The duel invite shape would sit next to it (`src/fight/` engage step; not read). The client drain bar and the accept or decline buttons are client-only.
- Parity row: 5 (controls/input). This is the closest row: the accept or decline click is an input that the server must verify. No row covers invites or their expiry; say so for Lead. Row 18 (loot and XP) and row 21 (catalogue fields) do not fit.
- Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted, but nothing here is worth copying line for line)
- Brief rule served: server-verified transactions (the invite answer and expiry are decided by the server clock; the client only shows the bar); rules 7-9 n/a

Best transferable idea: a trade or duel invite lives for a fixed server-side window, the client shows the time left as a draining bar, and running out of time counts as a decline.
Decision (proposed): adapt - take the expiring-invite shape with the expiry owned by the server; reject the client-side countdown as an authority, because a late accept must be refused on the server.
Acceptance: a server test opens an invite at t=0, has the target accept at t=19.9 s (accepted), and refuses an accept at t=20.1 s as expired, with the requester told and the trade not opened; the client bar reaches empty at 20 s.

## 6. Gaps and risks

- Apache-2.0: code may be adapted, but the value here is the shape only.
- The 20 s is a client default. The server sends no expiry in the invite packet (SendTradeRequestDto is read for the sender id only, TradeRequestWindow.cs 49). If the server's window differs, the bar lies. Frankendom must send the expiry in the packet and make the bar read it.
- Race: the client's bar and the server's expiry run on two clocks. An accept clicked while the client's bar still shows time can reach the server after the server has expired the invite (latency). The donor has no handling for this; it sends whatever the button gives. The client itself cannot send accept after its own timeout, since OnTimeout sends decline and hides the window (TradeRequestWindow.cs 148-152). Frankendom's server must answer "expired" or "already closed", which the sketch does.
- Trade state is not synced in this client. `TradeOwnAddIncoming.Apply` and `TradeOtherAddIncoming.Apply` are empty (TradeOwnAddIncoming.cs 9-11, TradeOtherAddIncoming.cs 9-11), and each `Read` returns a new empty DTO without reading any bytes (TradeOwnAddIncoming.cs 6). So the server's acknowledgement of an add is dropped, and the other side's items never show. Removing an item from the trade window sends no packet (TradeWindow.cs 178-186), so the server's list and the client's list can diverge. Frankendom's one ledger must not rely on this client; the trade list must be the server's, echoed back.
- Confirm semantics are not in the client: there is no "other side confirmed" state, and the OK button sends `TradeDoneCommand(1)` (208) with no check that both sides agreed. Whether the server waits for both is not visible here (server not read).
- The merchant basket total is an int that multiplies price by count (ShopItemEvaluator.cs 54; Product.Price and Count are int, BuyListDto.cs 86-88). C# integer arithmetic wraps silently by default, so a large basket total could show a wrong number. It is a display value only, so it is a UI bug, not an economy bug, but Frankendom's shop must compute price on the server with a range check.
- The client never checks affordability for buy or sell: the basket total is shown and the server answers. The donor's price rule, adena check and weight rule are server-side and not in this repo.
- The recipe success rate is shown as text from server data (UI/Game/Craft/DataProviderCraftItem.cs 19-44); there is no client-side crafting rule to port.
- Not read: the server, the item transfer, `DealerWindow.cs` beyond grep, `TradeItemMover.cs` beyond line 60, the manor (crop and seed) price windows, the multisell window. The economy topic is mostly absent from this donor: the depth is thin and the verdict is STRONG only for the invite timer.

- CountdownTimer can set the bar width negative on its last frame (progress < 0, TradeRequestWindow.cs 125-128) before OnTimeout runs; clamp it.
- TradeDoneIncoming.Apply only hides the trade window: the client has no server-confirmed completion state.
- ShopItemEvaluator.cs updates a client-side weight total and bar (UpdateWeight call at 17, UpdateWeightBar at 24): a client display of weight, not mentioned in the note.

## Checker findings

- Verdict: MINOR
- Corrected:
  - Section 1 hide-order claim: confirm/cancel send the answer first, then HideWindow stops the countdown (was stated as stopping before the send).
- Missed (also added to section 6):
  - CountdownTimer can set the bar width negative on its last frame (progress < 0, TradeRequestWindow.cs 125-128) before OnTimeout runs; clamp it.
  - TradeDoneIncoming.Apply only hides the trade window: the client has no server-confirmed completion state.
  - ShopItemEvaluator.cs updates a client-side weight total and bar (UpdateWeight call at 17, UpdateWeightBar at 24): a client display of weight, not mentioned in the note.
