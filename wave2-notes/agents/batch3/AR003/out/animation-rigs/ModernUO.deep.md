# ModernUO (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Base/Spell.cs` (cast pose pulse: 524-560, Disturb 397-422, AnimTimer 904-940; broadcast `Mobile.Animate` in `Projects/Server/Mobiles/Mobile.cs` 6772-6835) | Licence: GNU GPL version 3, 29 June 2007 (LICENSE line 4; header "Copyright 2019-2020 ModernUO Development Team") | C# | symbol `AnimTimer` (cast pose pulse), with `Mobile.Animate` as the broadcast it calls

Checked: Read in full: the cast-pulse path (Spell.cs 524-560 cast start and pulse set-up, 397-422 Disturb, 904-940 AnimTimer, 20 AnimateDelay), the timer wheel's Execute (Timer.TimerWheel.cs 146-178), Timer constructor and Start (Timer.cs 40-44, 83-118), `Mobile.Animate` (Mobile.cs 6772-6835, the broadcast loop), `CreateMobileAnimation` (OutgoingMobilePackets.cs 318-337), the client bow/salute request (Animations.cs 1-20, whole file), pick-up cooldown (Mobile.cs 961, 5179). Not read: `GetCastDelay` (Spell.cs 691, the source of castDelay), `GetClientsInRange`, `CanSee`, `ProcessDelta`, and the client's own clip playback. The hint file `Mobile.cs` is correct: `Animate` is there. camera_scope: not applicable (not a camera cell). Confidence: high on the pulse count, the guard and the stop rule; medium on what the client does with each 7-frame pulse (not read).

Best transferable idea: while a cast runs, re-send the wind-up pose at a fixed interval for ceil(cast time / interval) pulses, and stop the chain the moment the cast is disturbed or superseded, so a one-shot pose never gets stuck.
Decision (proposed): adapt - take the pulse count, the guard before each pulse and the stop-on-disturb rule for a hero's charged special. Do not take the re-send itself unless the wind-up clip is one-shot (a looping clip needs no pulses).
Acceptance: A hero's charged special holds its wind-up pose for the whole charge; a hit that disturbs the charge (the server decides this) stops the pose within one pulse interval, and no pose is left playing after the special is cancelled. A server test shows the special is cancelled and no further pulse is requested.

## 1. Mechanism

- Start: a cast that passes its checks sets the state to Casting (Spell.cs 527), then gets `castDelay = GetCastDelay()` (537). If the caster is a human, or a player on a monster body, and `ShowHandMovement` is true (539), it computes `count = ceil(castDelay / AnimateDelay)` with `AnimateDelay` = 1.5 s (541, 20). When `count != 0` it creates an `AnimTimer(this, count)` and starts it (545-546). Hand effects are spawned and the hands are cleared if the spell asks (549-563; not part of the pose logic).
- The timer: `AnimTimer` is a `Timer` with delay 0, interval 1.5 s, and count = `count` (908). The wheel runs the first `OnTick` on its next pass (AddTimer with delay 0, Timer.cs 115), re-adds an unfinished timer at its interval (TimerWheel.cs 169), and marks the last run as finished when `Index + 1 >= Count` (148). So `count` ticks in total, at 0, 1.5 s, 3.0 s ...
- Each tick (`OnTick`, Spell.cs 913-939): (a) guard: if the spell is no longer Casting, or the caster's current spell is a different one, stop the timer and return (917-921). (b) If the caster is not mounted and the spell has an action id (923): a human plays the spell's own action (`Info.Action`) with 7 frames, one repeat, forward, delay 0 (925-927); a player on a monster body plays action 12 with the same frame numbers (929-931). (c) When the timer is no longer running, the reference is cleared (935-937).
- Stop: `Disturb` (397) stops the pulse timer only when the cast was in progress (`wasCasting`, 415-418, with `_castTimer?.Stop()` at 417). A disturbed cast therefore sends no further pulses; a pulse already sent is not recalled.
- Broadcast: `Mobile.Animate` (6772) returns if the mobile has no map (6774-6779), calls `ProcessDelta()` on itself (6781), then for each client in range (6785) skips clients that cannot see the mobile (6787-6790), flushes that client's delta (6792), remaps action ids for gargoyles (6794-6821; a flying gargoyle maps 9-11 to 71, 12-14 to 72, 20 to 77, 31 to 71, 34 to 78, 200-270 to 75; a ground gargoyle maps 200-259 to 17 and 260-270 to 16, and forces `frameCount = 10`), then writes one packet and sends it (6823-6834).
- Packet: 0x6E, mobile serial, action (2 bytes), frame count (2), repeat count (2), reverse flag (the inverse of forward), repeat flag, delay (1 byte) (OutgoingMobilePackets.cs 329-336).
- Client request: the client may ask for "bow" or "salute" (Animations.cs 9-10, mapped to 32 and 33). The server plays it only if the mobile is alive, not mounted and has a human body (14), with 5 frames, one repeat, forward, delay 0 (16). Unknown names map to 0 and are ignored.
- Timing unit: all delays are wall-clock milliseconds in the donor's timer (Timer.cs 115 converts `Delay` to ms; TimerWheel.cs 169 uses `Interval` in ms). They are not tied to a fixed game tick.

## 2. Key functions

- Cast pulse set-up: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Base/Spell.cs` 537-546 (castDelay, count, timer start).
- Pulse tick: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Base/Spell.cs` 913-939 (`AnimTimer.OnTick`).
- Disturb stop: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Base/Spell.cs` 397-422.
- Wheel execution: `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.TimerWheel.cs` 146-178.
- Broadcast: `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` 6772-6835.
- Packet: `/mnt/frankendom-donors/ModernUO/Projects/Server/Network/Packets/OutgoingMobilePackets.cs` 318-337.
- Client request: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/Animations.cs` 5-18.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Pulse interval | 1.5 s (Spell.cs 20) |
| Pulse count for a cast: ceil(cast time / interval); 0 means no timer | ceil (Spell.cs 541). Example: 3.0 s gives 2 pulses (0 s, 1.5 s); 4.0 s gives 3 (0, 1.5, 3.0 s). Worked from the formula, not from a run. |
| Pulse frames and repeat | 7 frames, 1 repeat (Spell.cs 927, 931) |
| Player-monster pulse action | 12 (Spell.cs 931) |
| Human pulse action | the spell's own `Info.Action` (Spell.cs 927; SpellInfo.cs 93 defines it) |
| Client bow/salute | 32 and 33, 5 frames (Animations.cs 9-10, 16) |
| Pick-up cooldown | 500 ms, `ActionDelay` (Mobile.cs 961, 5179) |
| Packet delay field | one byte (OutgoingMobilePackets.cs 336) |

## 4. TypeScript sketch

simplified: the sketch turns the live timer into a list of pulse times, so it runs without a clock. It keeps the donor's count formula, the guard before each pulse and the stop at a disturbance. It leaves out the Timer wheel, the Stop call in Disturb as a real cancel (here a disturbance is only a time cut), the mount and monster-body branches, the human action id, the frame and repeat numbers, the gargoyle remap, the broadcast, and the hand effects. `castMs` is an input (GetCastDelay is not read).

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation.
// clean-room
const PULSE_MS = 1500; // donor AnimateDelay

interface CastState {
  casting: boolean;      // false once the cast ends or is disturbed
  activeCastId: number;  // the caster's current cast; a different id makes this cast stale
}

// Donor: count = ceil(castDelay / AnimateDelay); a count of 0 means no pulse timer.
function pulseCount(castMs: number): number {
  return Math.ceil(castMs / PULSE_MS);
}

// Times (ms after cast start) at which a pulse is attempted: the first at 0, then every PULSE_MS.
function pulseTimes(castMs: number): number[] {
  const n = pulseCount(castMs);
  const times: number[] = [];
  for (let i = 0; i < n; i++) times.push(i * PULSE_MS);
  return times;
}

// Donor OnTick guard: play only while this cast is still the caster's casting spell.
function pulseAllowed(state: CastState, castId: number): boolean {
  return state.casting && state.activeCastId === castId;
}

// Pulses that actually play: a disturbance at disturbMs stops the chain before later pulses.
function firedPulses(castMs: number, castId: number, state: CastState, disturbMs: number | null): number[] {
  const fired: number[] = [];
  for (const t of pulseTimes(castMs)) {
    if (disturbMs !== null && t >= disturbMs) break;
    if (!pulseAllowed(state, castId)) break;
    fired.push(t);
  }
  return fired;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/actor-pose.ts` (new): the wind-up pose for a hero's charged special. Presentation only. Parity-checklist row 6 (hero actor/animation). Specials (row 13) decide when a charge starts and ends; the pose does not decide anything.
- today: not located in this pass (the Frankendom repo is not on this Mac and was not read).
- Reuse tag: adapt-shape (GPL-3.0; clean-room only: the sketch is written from the described mechanism, no line is translated)
- Brief rule served: presentation is client-only; the engine decides whether the charge is disturbed and the pose only follows that decision.

## 6. Gaps and risks

- GPL-3.0: the shape can be used, the code cannot be copied. The sketch is clean-room.
- The re-send is a workaround for one-shot clips. If the hero's wind-up clip loops, the pulse chain is not needed and should not be added. Check the clip length in the catalogue first (parity row 21).
- Disturb is server-side in the donor (the spell system decides and then stops the timer). In Frankendom the disturbance must be a server-verified state change, and the client should stop the pose only when that state arrives. A client-only timer that cancels a charge would break the server-verified kill rule.
- The donor's pulses are wall-clock timers in milliseconds, not a fixed server tick. A Frankendom pulse should use the client's clock for presentation. If it needs to line up with the server tick (row 18 sub-line), the server must send the tick, and the client should not count its own.
- The gargoyle remap table is a per-body action map. It fits Frankendom's creature catalogue as data (row 7 / row 21), keyed by creature form, not as code in the animation call.
- The client request whitelist (bow, salute) is a pattern worth keeping for emotes: a named list, a state check (alive, not mounted, human body), then a fixed frame count. It is not combat, so no combat rule rides on it.
- Not read: `GetCastDelay` (the source of the charge time), `CanSee` and `GetClientsInRange` (the visibility rule), and the client's clip length, so the pulse count is only as good as the time it is fed.
