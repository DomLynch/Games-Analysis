# daggerfall-unity (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Internal/DaggerfallMobileUnit.cs` (with `Internal/Base/MobileUnit.cs` and `Game/EnemyAttack.cs`) | Licence: MIT ("MIT License", `/mnt/frankendom-donors/daggerfall-unity/LICENSE`, Copyright (c) 2009-2023 Daggerfall Workshop; code may be adapted with the notice kept) | C# (Unity) | symbol `DaggerfallMobileUnit.AnimateEnemy` (coroutine), `ApplyEnemyState`

Checked: The INFERRED hint was not a file: no animation file was named. Found by grep for attack, frame and hit terms. Read: `Internal/DaggerfallMobileUnit.cs` 72-95 (frame-divisor and flag properties), 150-330 (state change, attack roll, hit marker, frame list set-up, orientation), 500-625 (animation coroutine, one-shot exit, next state); `Internal/Base/MobileUnit.cs` 60-200 (state fields, one-shot states, ChangeEnemyState); `Game/EnemyAttack.cs` 40-140 and 152-178 (speed divisor, damage flag consumer, melee start; the melee timer field at 32 by grep); `DaggerfallUnityStructs.cs` 205-230 (enemy attack fields, read) and 165-167 (animation record fields, by grep); `Game/Utility/Dice100.cs` 1-13; `Utility/EnemyBasics.cs` (grep for sequences); `LICENSE`. Candidates opened: five files above plus the grep results for billboard and mobile units. Not read: `MeleeDamage()` body (the damage itself, a combat-sim topic), `GetStateAnims`, the Seducer transform states, `Billboard.cs`, `DaggerfallBillboard.cs`, `MobilePersonBillboard.cs` (grep only). No skeleton, skinning, blending, IK, ragdoll or attachment point exists in this donor: it is 2D sprite frames on billboards. Confidence: high on the attack roll, the marker, the cursor and the fps arithmetic; moderate on the stale-cursor tick at the end of an attack (read only, not run). camera_scope: n/a (not a camera cell).

Best transferable idea: Put the damage moment in the attack's own frame list as a marker, so the hit lands on a named frame of the clip instead of a timer.

Decision (proposed): adapt - take the marker-in-sequence hit timing and the weighted choice of attack variant, but move both to the server (the hit tick is a clip data field, the variant roll is a server roll), and keep the client as a viewer that draws the frame the server says. Reject the donor's client-side dice roll and its damage flag, which the donor consumes on the next Unity Update.

Acceptance: A creature's attack sequence declares its hit tick as data; a server test asserts damage lands once, on the tick the marker is reached, for each attack; a client test asserts the frame after the marker is drawn at that same tick; and two clients show the same attack variant for the same roll.

## 1. Mechanism

- States: `MobileUnit.cs` marks attack, ranged attack, hurt, spell and seducer transforms as one-shot (`IsPlayingOneShot`, 153-168); a one-shot ends by going to the next state, usually idle (`NextStateAfterCurrentOneShot`, `DaggerfallMobileUnit.cs` 598-610, and 567-571). A frozen unit ignores state changes (`MobileUnit.cs` 140).
- Attack entry: `EnemyAttack.MeleeAnimation` calls `ChangeEnemyState(PrimaryAttack)` (`EnemyAttack.cs` 167) when the target is in sight and within 22.5 degrees of yaw (155) and in range (163-164). The state change runs `ApplyEnemyState`, which picks the sequence (`DaggerfallMobileUnit.cs` 218-243): one roll of 1 to 100 (`Dice100.Roll`, `Dice100.cs` 12; 220), then each variant takes its own bucket width in turn: if the roll is at most `ChanceForAttack2` (222), take `PrimaryAttackAnimFrames2`; else subtract it (226) and test `ChanceForAttack3` (227); and so on up to 5. What is left goes to the default `PrimaryAttackAnimFrames` (240).
- Entry frame: the first entry is shown (246) and the cursor `frameIterator` is set to 1 (247). If that first entry is the hit marker -1, the damage flag is raised and the next entry is read (301-305).
- Each animation step (`AnimateEnemy`, 521-592): if the attack's cursor has reached the end, return to idle and reset the cursor to 0 (541-544). Otherwise read the next entry (552). If it is -1, raise the damage flag (555-558) for `PrimaryAttack`, and read the entry after it in the same step (562-563). Then if the frame is past the record's frame count the one-shot ends (567-571).
- Damage consumption: `EnemyAttack.Update` (90-101) runs each Unity frame; if `DoMeleeDamage` is set it calls `MeleeDamage()` and clears the flag (97-100). So the damage runs on the first Unity Update after the marker's step, not in the step itself.
- Cadence: `fps = FramePerSecond / FrameSpeedDivisor` (530), where `FramePerSecond` is an int in the animation record (`DaggerfallUnityStructs.cs` 165) and the divisor is set by the attack component each FixedUpdate: `PermanentSpeed / max(LiveSpeed, 8)` (`EnemyAttack.cs` 53, 71-77). The divisor setter keeps it at least 1 (`DaggerfallMobileUnit.cs` 77). When the divisor is above 1, fps is floored at 4 (533-534). The loop waits `1 / fps` seconds between steps (590). Both divisions are integer divisions in C#, so the fps truncates.
- Attack trigger rhythm (context, not the animation): `EnemyAttack.FixedUpdate` counts `MeleeTimer` down by `Time.deltaTime` (64); a classic-mode attempt needs the timer at 0 and `DFRandom.rand() % speed >= (speed >> 3) + 6` (81). This belongs to the combat and AI topics; not expanded here.

## 2. Key functions

- `DaggerfallMobileUnit.ApplyEnemyState`: `DaggerfallMobileUnit.cs` 214-310. Variant roll, sequence set-up, entry hit marker.
- `DaggerfallMobileUnit.AnimateEnemy` (coroutine): `DaggerfallMobileUnit.cs` 521-592. Step, marker, one-shot exit, fps.
- `DaggerfallMobileUnit.ApplyEnemyStateChange`: `DaggerfallMobileUnit.cs` 183-200. Frame reset on change (186-197).
- `EnemyAttack.FixedUpdate` and `EnemyAttack.Update`: `EnemyAttack.cs` 51-112. Speed divisor, melee start, damage flag consumer.
- `EnemyAttack.MeleeAnimation`: `EnemyAttack.cs` 152-178. Start condition (partial read; the distance branch at 157-164 read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Weighted variant choice: roll 1 to 100, each bucket takes its width in turn, the rest is the default | Bucket widths per enemy (examples in data: 50 for variant 2 at `EnemyBasics.cs` 488 and 522; 33 and 33 at 620-622; 20 and 20 at 954-956; theirs). Roll range 1 to 100 (theirs, `Dice100.cs` 12) |
| Hit marker inside a clip's frame list: marker never shown, damage flag raised, next frame shown | Marker value -1 (theirs, `DaggerfallMobileUnit.cs` 301, 555). Example sequence `0, 1, 2, -1, 3, 4, 5` (theirs, `EnemyBasics.cs` 261) |
| One-shot clip returns to a fallback state at its end | Return state idle (theirs, 608) |
| Playback rate divided by a speed divisor, floored | Live speed floor 8 (theirs, `EnemyAttack.cs` 53); fps floor 4 when divided (theirs, 533) |
| Frame rate per clip record | `FramePerSecond` int per record (theirs, `DaggerfallUnityStructs.cs` 165) |

Trap in the donor: the comments on `ChanceForAttack4` and `ChanceForAttack5` (`DaggerfallUnityStructs.cs` 222 and 224) say "PrimaryAttackAnimFrames3". The code uses 4 and 5 (`DaggerfallMobileUnit.cs` 232-238). Copy the code, not the comments.

## 4. TypeScript sketch

simplified: the sketch models the sequence as a list of frame indices with the marker -1, and the roll as a 1 to 100 number passed in. It keeps the donor order: the entry frame is shown and the marker handled at entry (301-305), then each step reads the next entry and handles a mid-sequence marker (552-563), and the end is checked before a read (541). It returns "ended" at the end without the donor's stale read (see Gaps), and it does not model the animation record, the one-shot to idle table, the frame count wrap, bounce playback, the coroutine wait, the attack trigger, or `MeleeDamage`. `fpsFor` keeps the integer division and the floors.

```ts
// Licence: MIT (donor, Daggerfall Unity). Clean-room sketch of the mechanism, not a translation of the donor lines.
const HIT_MARK = -1;                 // frame index that marks the damage moment; it is never shown

interface AttackVariant { weight: number; frames: number[]; }   // weight in percent (a bucket width, not a threshold)
interface AttackDef { variants: AttackVariant[]; fallback: number[]; }

type Phase =
  | { kind: "idle" }
  | { kind: "attack"; frames: number[]; next: number };          // next = index of the next frame to read

interface Creature {
  phase: Phase;
  frame: number;                     // frame currently shown
  hitRaised: boolean;                // read by the attack component, which clears it
}

// Roll 1..100. Each variant takes its own bucket width in turn; the fallback takes what is left.
function pickVariant(def: AttackDef, roll: number): number[] {
  let r = roll;
  for (const v of def.variants) {
    if (r <= v.weight) return v.frames;
    r -= v.weight;
  }
  return def.fallback;
}

// Called once on entering the attack state. Shows the first frame; if that is the hit marker, raise it and show the next.
function beginAttack(c: Creature, def: AttackDef, roll: number): void {
  const frames = pickVariant(def, roll);
  c.phase = { kind: "attack", frames, next: 1 };
  c.frame = frames[0];
  if (c.frame === HIT_MARK) {
    c.hitRaised = true;
    if (c.phase.next < frames.length) c.frame = frames[c.phase.next++];
  }
}

// One animation tick. Returns "ended" when the sequence is used up; the caller then returns to idle.
function stepAttack(c: Creature): "playing" | "ended" {
  if (c.phase.kind !== "attack") return "ended";
  const p = c.phase;
  if (p.next >= p.frames.length) {
    c.phase = { kind: "idle" };
    return "ended";
  }
  c.frame = p.frames[p.next++];
  if (c.frame === HIT_MARK) {
    c.hitRaised = true;
    if (p.next < p.frames.length) c.frame = p.frames[p.next++];
  }
  return "playing";
}

// Playback rate: base fps divided by the speed divisor (at least 1), with a 4 fps floor when slowed.
// The donor divides ints, so the division truncates; the sketch keeps that.
function fpsFor(baseFps: number, permanentSpeed: number, liveSpeed: number): number {
  const speed = Math.max(liveSpeed, 8);
  const divisor = Math.max(1, Math.trunc(permanentSpeed / speed));
  let fps = Math.trunc(baseFps / divisor);
  if (divisor > 1 && fps < 4) fps = 4;
  return fps;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/dfu-attack-frames.ts`), exit 0. Not run: the sketch was not executed.

## 5. Lands in

- TARGET `src/fight/creature-attack.ts` (proposed new module name; the Frankendom repo was not read, so this path is not checked against it). Server-side attack timeline: the hit tick and variant roll are server facts. The client draws the frames; the creature clip data holds the sequences.
- Parity-checklist row 7 (creature actor/clips). The hit tick is a clip field; the damage itself is row 10 (hit impact) and is out of scope for this note.
- Reuse tag: adapt-idea (MIT: code may be adapted with the notice kept; this sketch is clean-room, written from the mechanism)
- Brief rule served: one engine (the server decides the hit tick and the variant; the client never decides damage); zones as data (the sequences, bucket widths and fps are per-creature data).

## 6. Gaps and risks

- Client roll: the donor rolls the attack variant on the client (`Dice100.Roll`). Frankendom must roll on the server, from the fight seed, so two clients see the same attack. Reject the client roll.
- Damage flag: the donor sets a flag in the animation step and the attack component reads it on the next Unity Update, so the damage timing depends on frame timing. Frankendom's hit must be a server tick (row 18 / post-K item 3: "server tick: fixed step, input intake, per-tick NPC budget"). Use the marker as a data tick, not as a flag.
- Stale cursor at the end of an attack (read only, not run): when the sequence is used up, `AnimateEnemy` calls `ChangeEnemyState(Idle)` (543), which resets the frame to 0 (195) and then the cursor to 0 (544). Because the local `doingAttackAnimation` is still true (536), the same step reads the old sequence's first entry (552) and the idle loop then counts on from that index. The sequences grepped in `EnemyBasics.cs` (261 onward) all start at 0, so this is usually invisible; a sequence that starts on another index would shift the idle loop. Frankendom's version must return to idle without reading the old sequence.
- A marker that is the first entry (the donor's comment at line 300 says a frost daedra set starts with -1) is handled at entry (301-305) and not counted again in the step. A marker as the last entry still raises the hit (555-558) but leaves the frame index at -1 for one step (562 has nothing to read). The data validator should reject a marker in the last position.
- Integer division: fps truncates (530), so a record of 5 fps at divisor 2 plays at 2 fps, not 2.5. Frankendom should use one float rule and state it in the data.
- The 22.5-degree yaw gate and the melee distance are AI and combat rules (`EnemyAttack.cs` 155-164). They belong to the AI row, not this note.
- No skeleton, blending, IK, ragdoll or attachment exists in this donor. Do not cite it for those. The flip and the billboard alignment are sprite-only (`DaggerfallMobileUnit.cs` 202-205 and orientation code, not read in full).
- Licence: MIT. Adapting code is allowed with the notice; this note does not copy it.
