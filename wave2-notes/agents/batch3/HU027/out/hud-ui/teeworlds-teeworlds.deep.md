# teeworlds-teeworlds (hud-ui, cell 2)

Donor: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/components/hud.cpp` | Licence: permissive zlib-style notice (`license.txt`: "Copyright (C) 2007-2024 Magnus Auvinen", three numbered conditions; the file does not name a licence; `datasrc/` is CC-BY-SA 3.0 and was only read for one field name, not used) | C++ | symbol `CHud::RenderCheckpoint`

Checked: Symbol `CHud::RenderCheckpoint` is defined at 902 and closes at 935 (verified, read in full). Read in full: hud.cpp 902-935 (the banner), 958-973 (the message hook), 975-1031 (`OnRender`, the caller), 874-900 (race timer, for context), gameclient.cpp 83-90 (formatter), datasrc/network.py 465-467 (wire field). Callers: `RenderCheckpoint` has two call sites in `OnRender` (998 for the local player, 1009 for a spectated player), both read. Not read: `OnMessage`'s dispatcher (the engine code that calls it). The sender of the checkpoint message is NOT in this box: a grep of `src/game/server` for checkpoint code finds only collision checks, so the server computes nothing here that we could read. So the server half of the split (how the diff is computed) is "(not read)". Confidence: high on the client banner (order, numbers, colours); medium on the unit of `m_Diff` (ms, inferred from the formatter dividing by 1000 at gameclient.cpp 88). Camera: not applicable.

Best transferable idea: Show a signed split (behind red, ahead green, always with a sign character) for 2 s at full strength and then fade it over 2 s, clear it on death, and take the number from the server.
Decision (proposed): adapt - take the banner rules for timed zone runs and boss-phase splits; use the game clock, not the wall clock (the donor's defect, fixed in the sketch); the server computes and sends one signed number, and the client only shows it.
Acceptance: In a timed zone trial, after a checkpoint the player sees a green "-0.42" banner at top centre for 2 s, then a 2 s fade; a server test asserts the shown number equals the number the server sent; dying clears the banner; a test pauses the game clock and asserts that the hold time does not run.

## 1. Mechanism

- A split arrives as a server message carrying one signed integer `m_Diff` (`OnMessage`, hud.cpp 960-964). The client stores the value and stamps the arrival time with the wall clock (`time_get()`, 964). Nothing else happens at arrival: no state change beyond these two fields.
- Death clears it, but only in race mode: a kill message whose victim is the local client, in a race game, sets the stamp to 0 (966-971). A zero stamp means "nothing to show" (905).
- Each frame, `OnRender` draws the race block only when the game is not in round-over or game-over state and a local character exists (992-993), or for a spectated character (1001-1010), and only in race mode (984, 995, 1006). Inside that block, the order is: health and ammo (994), race timer (997), then the checkpoint banner (998).
- The banner shows if the stamp is non-zero and the age is under 4 s (904-905). Age = wall clock minus stamp.
- Text: the signed diff, formatted to 2 decimals (908).
- Opacity: 1.0 while age is 2 s or less (911, 912); after that it falls linearly to 0 at 4 s (915). The alpha is continuous at 2 s.
- Colour from the sign (918-923): positive is red (1.0, 0.5, 0.5), negative is green (0.5, 1.0, 0.5), zero is white. The alpha from the fade is the fourth channel.
- Position: centre-top at x = half the HUD width and y = 33 in the HUD space (925-930). The HUD space is 300 units high (986-987) and the width scales with the screen aspect.
- The colour is reset to opaque white after the draw (933).

## 2. Key functions

- `CHud::RenderCheckpoint`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/components/hud.cpp` 902-935. Age check, text, fade, colour, draw.
- `CHud::OnMessage` (checkpoint branch): `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/components/hud.cpp` 958-973. Stores the diff and the wall-clock stamp; clears the stamp on the local player's death in race mode.
- `CHud::OnRender` (caller): `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/components/hud.cpp` 975-1031. Gates the race block, then draws the banner after the race timer.
- `FormatTimeDiff`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/gameclient.cpp` 83-90. Sign (default forced on, gameclient.h 347), then seconds from `Time / 1000` and decimals (`AppendDecimals`, not read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Show a signed delta vs best, colour by sign, sign character always present | Red for positive (theirs, hud.cpp 919), green for negative (theirs, hud.cpp 921), white for zero (theirs, hud.cpp 922-923) |
| Full strength for a hold, then a linear fade to zero | Hold 2 s (theirs, hud.cpp 912); fade ends at 4 s (theirs, hud.cpp 905 and 915) |
| Banner cleared on death | Race mode only (theirs, hud.cpp 966) |
| Fixed text precision | 2 decimals (theirs, hud.cpp 908) |
| Fixed banner height in the HUD space | y = 33 in a 300-unit-high space (theirs, hud.cpp 930, 987) |
| Timing source | Wall clock (theirs, hud.cpp 904, 964) |

## 4. TypeScript sketch

simplified: the sketch keeps the stamp, the 2 s hold, the 2 s linear fade, the sign colour rule, the death clear and the signed text. It uses the game clock (a value passed in) instead of the wall clock, which is the one change to the donor's timing. It omits the colour values, the position, the race-mode gate, the spectator path, the HUD units, the health and race-timer draw order, and the `AppendDecimals` rule (the sketch formats with `toFixed`, which is not the donor's formatter; the donor's rule was not read). The 2-second hold and fade are written as constants here, as in the donor; they are data fields for us.

```ts
// Licence: permissive zlib-style notice (donor license.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Data fields: hold and fade times are zone or engine data; the donor fixes them at 2 s and 2 s.
const SPLIT = { holdS: 2, fadeS: 2, precision: 2 } as const;

interface SplitBanner {
  diffMs: number;           // signed: positive = behind the best, negative = ahead
  shownAtMs: number | null; // game clock stamp when the split arrived; null = nothing to show
}

// Server split message arrives. nowMs is the game clock (fix: the donor reads the wall clock here).
function onSplit(b: SplitBanner, diffMs: number, nowMs: number): void {
  b.diffMs = diffMs;
  b.shownAtMs = nowMs;
}

// Local player died: the banner is cleared at once (donor: race mode only).
function onDeath(b: SplitBanner): void {
  b.shownAtMs = null;
}

// Opacity for this frame: full for holdS, then linear to zero over fadeS, then hidden.
function alphaAt(b: SplitBanner, nowMs: number): number {
  if (b.shownAtMs === null) return 0;
  const ageS = (nowMs - b.shownAtMs) / 1000;
  const totalS = SPLIT.holdS + SPLIT.fadeS;
  if (ageS < 0 || ageS >= totalS) return 0;
  if (ageS <= SPLIT.holdS) return 1;
  return (totalS - ageS) / SPLIT.fadeS;
}

type Tone = "behind" | "ahead" | "even";
function toneOf(diffMs: number): Tone {
  return diffMs > 0 ? "behind" : diffMs < 0 ? "ahead" : "even";
}

// "+1.25" or "-0.40": sign always shown, seconds with fixed decimals.
function formatDiff(diffMs: number): string {
  const sign = diffMs < 0 ? "-" : "+";
  return sign + (Math.abs(diffMs) / 1000).toFixed(SPLIT.precision);
}

export {};
```

## 5. Lands in

- TARGET (client view, name only; the Frankendom repo was not opened) `src/fight/hud.ts`: the split banner state and its alpha and tone as pure functions of the server split message and the game clock. The draw stays in the client. Parity-checklist row 14 (HUD).
- Server side (not row 14): the split is computed on the server and sent as one signed integer. That belongs to the server tick sub-line of post-K item 3 (row 18 is the loot and XP award row, so it is not the row for this). The donor's server half is not in this box, so this line is our design, not theirs.
- today: none checked (not read).
- Reuse tag: rewrite-from-idea (zlib-style permissive notice; the code may be adapted, but the sketch is written from the mechanism)
- Brief rule served: HUD is client-only; the number is server-verified and the client shows only what it received (kills and results are server-verified). Rule 1 n/a.

## 6. Gaps and risks

- Wall clock (hud.cpp 904, 964): the donor ages the banner in real time. In Frankendom a pause, hitstop or a loading stall would eat the hold. Fix: age the banner on the game clock (sketch) and test it with a paused clock.
- The sender is not in this box, so the sign convention, the unit (ms is inferred from gameclient.cpp 88) and the rule for when a split is sent are not verified. Frankendom must define the sign and unit in the message schema and test them on the server.
- One slot: a new split replaces the old one at once (hud.cpp 963-964). Two checkpoints within 4 s show only the last. That is fine for one ledger; say so in the spec.
- Death clears the banner only in race mode and only for the local client (hud.cpp 966-971). In a many-on-one fight the rule would need its own trigger; do not copy the race gate.
- Accessibility: the sign is always in the text, so the meaning is not carried by colour alone. Keep that rule. Contrast of the red and green tints was not checked against the background.
- Readability at 375 wide: the banner text is size 10 (hud.cpp 927) at y = 33 in the donor's 300-unit-high space (hud.cpp 930, 987). The size is in the donor's own units, not pixels, so at Frankendom's 375 width it needs a check on a phone frame. Not verified here.
- Also read, not written up as notes: the donor's health and ammo frame (hud.cpp 710-777: 10 pips for health, 10 for armour, one ammo row; values above 10 are not drawn) and the ninja buff bar (641-708: fill from remaining ticks over the maximum, with the maximum from the weapon duration, hud.cpp 729-730). Both are candidates for a later pass; this cell is the banner only.
- The donor's `AppendDecimals`, `RenderCheckpoint`'s text cursor sizes and the outline routine were not read.

## Reuse tag

rewrite-from-idea (zlib-style permissive notice; code may be adapted, sketch written from the mechanism)

Brief rule served: HUD client-only; server sends the number; game-clock timing (rule 14 HUD only).
