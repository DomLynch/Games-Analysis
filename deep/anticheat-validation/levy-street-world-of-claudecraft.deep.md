# levy-street-world-of-claudecraft (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/move_input.ts` | Licence: MIT | TypeScript | symbol `sanitizeMoveInput / parseMoveInputFrame` at 35 and 68 (verified: `sanitizeMoveInput` opens at 35 and ends at 48; `parseMoveInputFrame` at 68 and ends at 75). The whole file (75 lines) was read.

## 1. Mechanism

- Server-side intake filter. Input is untrusted JSON from the client. Output is a clean `MoveInput` and a clean facing and client tick, or safe empties.
- `parseMoveInputFrame` (68-75): non-object input gives an empty frame (no movement, facing null, client tick null). Otherwise it sanitises the `mi` field, the `facing` field (bound only, with `sanitizeMoveFacing`; `normalizeMoveFacing` is not called here), and the `ct` field (client tick, must be a safe integer and at least 0; else null). A non-object `mi` gives an empty input (37).
- `sanitizeMoveInput` (35-48): starts from an empty input. Each of nine boolean moves (forward, back, turn left and right, strafe left and right, jump, dive, surface; the table at lines 3-13) reads its long key or short key, and is true only if the value is exactly `true` or `1` for either key (38-40, `isMoveFlag` 22-24); anything else is false (fail closed). `swimSteer` (or its short key `ss`) is clamped to 0..1 if it is a finite number, else undefined (which means full rate). `gliderPitch` (or `gp`) is clamped to -1..1 if finite, else undefined.
- `sanitizeMoveFacing` (50-54): accepts a finite number whose magnitude is at most 1000; otherwise null. `normalizeMoveFacing` (56-60): wraps a finite angle to the range with `atan2(sin, cos)`; otherwise null.
- Inputs: raw JSON. Outputs: typed fields only. Tick: per client input message.

## 2. Key functions

- `parseMoveInputFrame`: `move_input.ts` 68-75. Frame-level entry: object check, then the three field sanitisers.
- `sanitizeMoveInput`: `move_input.ts` 35-48. Boolean flags (true or 1 only) and clamped analogue fields.
- `sanitizeSwimSteer`: `move_input.ts` 29-33. Finite-number clamp with absent meaning full.
- `sanitizeMoveFacing`: `move_input.ts` 50-54. Magnitude bound on facing.
- `normalizeMoveFacing`: `move_input.ts` 56-60. Angle wrap.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Booleans accept only true or 1; everything else is false (fail closed) | The accepted values (the rule) |
| Analogue inputs clamp to a range; non-finite becomes absent | Ranges 0..1 for swim steer (line 32), -1..1 for glider pitch (line 45) (theirs) |
| Long key and short key read the same field (wire compaction) | Key names (theirs, MOVE_FIELDS lines 3-13) |
| Facing with a magnitude bound, then an angle wrap | Bound 1000 (theirs, `MAX_FACING_MAGNITUDE`, line 14) |
| Client tick must be a non-negative safe integer | Integer rule (the rule) |

## 4. TypeScript sketch

simplified: the sketch handles three of the nine move flags (forward, back, jump) and drops `swimSteer`, `gliderPitch` and `normalizeMoveFacing`; it builds a plain object instead of calling `emptyMoveInput()`. The control flow matches the donor's `parseMoveInputFrame`: non-object gives an empty frame, `mi` is sanitised, facing is bounded at 1000, and `ct` must be a non-negative safe integer.

```ts
// Licence: MIT (donor). Sketch written from the described mechanism; lifting the real lines is permitted (move_input.ts 35-75).
interface Move { forward: boolean; back: boolean; jump: boolean; }
type Raw = Record<string, unknown>;

const isRecord = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFlag = (v: unknown): boolean => v === true || v === 1; // fail closed: anything else is false

// Boolean flags: true or 1 only, under a long key or a short key.
function readFlag(raw: Raw, long: string, short: string): boolean {
  return isFlag(raw[long]) || isFlag(raw[short]);
}

// Analogue: finite numbers clamp to a range; anything else is absent.
function clampOrAbsent(v: unknown, lo: number, hi: number): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return Math.min(hi, Math.max(lo, v));
}

// Facing: a finite number inside a magnitude bound, else null.
function facing(v: unknown, bound: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= bound ? v : null;
}

// Frame: the whole input is untrusted; a non-object gives a safe empty frame.
function parseFrame(raw: unknown): { move: Move; facing: number | null; ct: number | null } {
  if (!isRecord(raw)) return { move: { forward: false, back: false, jump: false }, facing: null, ct: null };
  const mi = isRecord(raw.mi) ? raw.mi : {};
  const ct = Number.isSafeInteger(raw.ct) && Number(raw.ct) >= 0 ? Number(raw.ct) : null;
  return {
    move: { forward: readFlag(mi, 'forward', 'f'), back: readFlag(mi, 'back', 'b'), jump: readFlag(mi, 'jump', 'j') },
    facing: facing(raw.facing, 1000),
    ct,
  };
}
```

## 5. Lands in

- Frankendom target: NEW `src/fight/intake.ts` (TARGET), a `sanitizeIntent(raw): Intent` for the intents a server receives, serving parity row 5 (controls and input; "intake -> row 5"). Today: `Intent` is defined in `src/duel.ts` (moving to `src/fight/duel.ts`) as move (x, z, yaw, run), a nullable action, guard, optional held, optional guard direction, lock and optional cancel; `src/input.ts` (moving) builds it on the client; and the presence service already rejects malformed frames with `decodeUp` (`origins/presence/wire.ts`, wrong length or type gives null). All on the VPS snapshot /root/work-k7 (not main).
- Parity-checklist row: 5 (controls and input). Feature-map section: `docs/specs/origins/one-shard.md` §2 (the server clamps what the client claims).
- Reuse tag: adapt
- Brief rule served: 2 (engage is a state change; kills server-verified); rules 7-9 n/a

## 6. Gaps and risks

- The filter is for a free-movement walk. Frankendom's duel intents are already typed (`Intent` in `src/duel.ts`, moving to `src/fight/duel.ts`); a server must validate those with the same fail-closed rule, with enumerated action names and a finite, bounded move vector and yaw.
- Fail-closed booleans mean a missing flag is "not pressed". For a duel that drops a press; the rollback path (`src/net/rollback.ts`) must still see the press, so the filter must not drop edge presses silently.
- The donor bounds facing at magnitude 1000 and then (separately) wraps it; Frankendom's yaw units must be checked against the engine before any bound is reused (the bound is the donor's, not ours).
- Anti-cheat authority: the filter cleans input, it does not decide outcomes. Kill and result authority stays with `src/net/verify-duel.ts` and the encounter verifier.
- The client tick `ct` is only range-checked here (73); the donor does not show what uses it. Frankendom's tick comes from the server (post-K item 3), so a client tick would only be used for lag compensation.
- Pit is a client only and one engine runs both: the sanitiser lives in the shared engine/server path. MAX_ATTACKERS = 3 is not enforced by this donor.
- Not read: `emptyMoveInput` and the `MoveInput` type (`./types`), and the caller of `parseMoveInputFrame`.
