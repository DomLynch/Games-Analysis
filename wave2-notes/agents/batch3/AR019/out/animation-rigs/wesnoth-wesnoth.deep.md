# wesnoth-wesnoth (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth/src/animated.tpp` (with `src/animated.cpp`, `src/animated.hpp`, `src/units/animation.cpp`, `src/units/animation_component.cpp`, `src/units/frame_private.hpp`, `src/units/udisplay.cpp`, `data/core/macros/animation-utils.cfg`, `data/core/macros/animation-utils2.cfg`, `data/core/units/undead/Skeleton.cfg`) | Licence: GNU GPL version 2 or later per the file headers (`src/animated.hpp` line 8, read) and `COPYING` (GPL-2.0 text, version 2 June 1991, read) | C++ with WML data | symbol `animated<T>::advance_to_current_frame`, `unit_animation::matches`, `unit_attack`

Checked: The evidence hint (`Skeleton.cfg`) is the unit's data; the mechanism is in the macros and the engine. Read in full: `Skeleton.cfg` (67 lines); `animated.hpp` 1-200; `animated.cpp` (52 lines); `animated.tpp` 74-236 (frame add, start, pause, resume, advance, the playback queries and time offset); `units/frame_private.hpp` 24-140 (the ramp parser and lookup); `units/animation_component.cpp` 46-68 (choice); `units/animation.cpp` 379-486 (scoring), 1044-1069 (start), 1307-1343 (add), 1382-1447 (animator start and wait); `units/udisplay.cpp` 598-765 except the leadership and resistance loops (654-740, read only their outline); the macros for attack (`animation-utils2.cfg` 39-54), defend (`animation-utils.cfg` 156-180) and the idle filter (240-246). Not read: `animated.tpp` 1-74 (constructors) and 236-410; `animation.cpp` 255-300 (constructor, `base_score` default) and 904-1000 (particles); `frame.cpp` (how offset, alpha and sound are drawn on screen); `MOVING_ANIM_DIRECTIONAL_12_FRAME` (macro at `animation-utils2.cfg` 226); what calls the recruit event; the leadership and resistance branches. Confidence: high on the timeline arithmetic and the choice rule; medium on the sound time base (the sound element's zero is not traced).

## 1. Mechanism

- Clip data (WML). A clip is a `start_time` (its first frame's time, may be negative) plus a list of frames, each with a duration in ms and a sprite name. The skeleton's clips come from macros: `ATTACK_ANIM_DIRECTIONAL_10_FRAME` (`Skeleton.cfg` 65), `DEFENSE_ANIM_DIRECTIONAL` (20), `STANDING_ANIM_DIRECTIONAL_8_FRAME` (21), `MOVING_ANIM_DIRECTIONAL_12_FRAME` (22). Per-direction variants are picked with `[if]`/`[else]` on facing (`animation-utils2.cfg` 42-53). Sprite ranges like `[1~10]` expand to frame lists at parse time.
- Clip time zero is the impact. The attack clip starts at -450 ms and has ten frames of 100 ms each (`animation-utils2.cfg` 40, 45), so it runs -450 to +550 ms and frame 5 spans -50 to +50 ms, straddling zero. The defend clip starts at -126 ms and has three frames: base (1 ms), reaction (250 ms), base (1 ms) (`animation-utils.cfg` 158-170), so the reaction runs -125 to +125 ms, centred on zero. The attack sound plays at -100 ms (`animation-utils2.cfg` 41); the defender's hit sound at -25 ms (`animation-utils.cfg` 173). The attack's frame 5 being the strike art is inferred from the timing, not read in the artwork.
- Per-frame parameters can ramp. A value like `alpha="0~1:300"` (`Skeleton.cfg` 28) is a piecewise-linear ramp: each comma-separated piece gives a start value, an end value and a duration in ms; a missing duration splits the total evenly (`frame_private.hpp` 89, 96). The lookup clamps the time to the total and interpolates inside the piece (122-140). So the recruit's first frame fades from alpha 0 to 1 over 300 ms.
- Clip choice. When an event happens (`attack`, `defend`, `standing`, `idling`, ...), every clip on the unit is scored (`units/animation.cpp` 379-484). A clip starts at its `base_score` (383). Each satisfied condition adds one point: event (391), terrain, value, facing direction, unit filter, hit kind (`hits_`, 446-450), second-unit filter, attack filter (467-470). Any failed condition returns `MATCH_FAIL` (-10, `units/animation.hpp` 32), for example the event at 387-388 or the attack filter at 468. A random gate with `frequency_` skips the clip with probability 1 in N (441). The best score wins; equal best scores form a list and one is picked at random (`animation_component.cpp` 52-67). If nothing scores above `MATCH_FAIL`, no clip is returned and the add is skipped (`units/animation.cpp` 1322-1324): the event plays nothing.
- A filter makes a clip specific. `Skeleton.cfg` 62-63 filters the attack clip to the axe attack (`[filter_attack] name=axe`). Against any other attack that clip fails and no attack animation plays. The score is what makes the axe clip win over a generic clip: a filtered clip gets one point per filter that passes.
- Two clocks. `update_animation_timers(acceleration)` advances the normal clock by real time and the accelerated clock by real time times the acceleration (`animated.cpp` 38-47). Each clip reads one or the other (`set_uses_acceleration`, `units/animation.cpp` 1051). The header describes the accelerated clock for unit movement and attacks, and the normal clock for UI effects (`animated.hpp` 17-20); `wait_until` advances the accelerated clock by the turbo speed (`udisplay.cpp` 1425-1442). Which clips are started on the accelerated clock for attacks is not traced.
- Anchored timeline. `start_animation(offset)` sets the anchor to now minus the offset (`animated.tpp` 104), so the elapsed time starts at the offset, for example -450 ms. The first frame ends at anchor + its start time + its duration (106). `advance_to_current_frame` steps frames while the current tick is past the frame boundary (158-170); a non-looping clip stops on its last frame (162-165); a looping clip that is more than one whole cycle behind skips whole cycles first (149-155).
- Pause and resume shift time. `pause_animation` keeps the paused tick (`animated.tpp` 111-118). `resume_animation` measures the pause (128) and moves both the anchor and the next frame boundary forward by that amount (131-132). Nothing is skipped: the rest of the clip keeps its order and runs later.
- Choreography of one hit (`udisplay.cpp` 598-765): the damage is an input (the caller decided it, not read here). The hit kind is `kill` if damage reaches the defender's current hit points (640-641), `hit` if above zero, else `miss` (642-646). The attack clip and the defend clip are chosen with that kind (650-656). Both are added to one animator (`unit_animator`), all clips start at the earliest begin time (`units/animation.cpp` 1389-1398), and the animator runs to elapsed 0, the impact (741-742). Then the displayed hit points drop in 50 ms slices (753-759): each slice removes `damage_left / steps` (at least 1) where `steps` is the time left to the animator's end in 50 ms units. The defender's defend clip is then handed back to the unit to play from the animator's end time (654-655, 763). Hit points are restored to the pre-attack value (765); the real change is applied by a caller not read here.
- Driving loop: no fixed tick. The clock is wall time (normal) or scaled wall time (accelerated); frames advance when the clock passes a boundary; the HP drain steps in fixed 50 ms slices (`udisplay.cpp` 753, 759).

## 2. Key functions

- `animated<T>::start_animation`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/animated.tpp` 95-108. Anchor and first boundary.
- `animated<T>::pause_animation` and `resume_animation`: `animated.tpp` 110-135. Pause tick and time shift.
- `animated<T>::advance_to_current_frame`: `animated.tpp` 137-171. Frame stepping, end of clip, cycle catch-up.
- `update_animation_timers`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/animated.cpp` 38-47. Two clocks.
- `progressive_pair::get_current_element` (the ramp): `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/frame_private.hpp` 111-141.
- `unit_animation::matches` (scoring): `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/animation.cpp` 379-484.
- `unit_animation_component::choose_animation` (best score, random tie): `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/animation_component.cpp` 46-68.
- `unit_attack` (one hit's choreography and HP drain): `/mnt/frankendom-donors/wesnoth-wesnoth/src/units/udisplay.cpp` 598-765.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Clip time zero is the impact; a clip starts before it by its pre-roll | Attack pre-roll -450 ms (theirs, `animation-utils2.cfg` 40); defend pre-roll -126 ms (theirs, `animation-utils.cfg` 158) |
| Frames of fixed duration | 100 ms per attack frame, 10 frames (theirs, `animation-utils2.cfg` 45); 100 ms death and idle frames (theirs, `Skeleton.cfg` 37, 58) |
| Reaction pose held in the middle, base pose at each end | Reaction 250 ms with 1 ms base frames (theirs, `animation-utils.cfg` 162) |
| Sound cue at a time offset from the impact | Attack sound -100 ms (theirs, `animation-utils2.cfg` 41); defend hit sound -25 ms (theirs, `animation-utils.cfg` 173) |
| Value that ramps over a frame | Recruit alpha 0 to 1 over 300 ms (theirs, `Skeleton.cfg` 28) |
| Score per satisfied condition, reject on any failure | Fail -10, default -9 (theirs, `units/animation.hpp` 32) |
| Fixed-step HP drain | 50 ms slices (theirs, `udisplay.cpp` 753, 759) |

## 4. TypeScript sketch

simplified: keeps the donor's order: (1) a clip is chosen by a score in which any failed condition rejects it, an optional random gate can skip it, and a random pick breaks ties; (2) a timeline anchored on a clock with a pre-roll offset, a pause that shifts the anchor and the next boundary, frame stepping, and cycle catch-up; (3) a piecewise-linear ramp per frame; (4) the cosmetic HP drain in 50 ms slices after the server verdict; (5) all clips starting at the earliest pre-roll. It omits: the terrain, value, second-unit and second-attack conditions; the particles, halo, sound and text; the accelerated clock (the caller passes the time it wants); the leadership and resistance branches; the directional variants; the ramp's even split of a missing duration (the ramp takes explicit segments); and the rest of the unit code. It differs from the donor in one place: `Timeline.advance` takes the clock value as an argument rather than reading it, and the verdict is an input (the sketch never computes kill, hit or miss). The sample numbers are ours.

```ts
// Licence: clean-room sketch written from the mechanism in the donor note (donor is GPL-2.0-or-later; no donor lines copied).
// Numbers below are our sample values, not the donor's.

export type Ms = number;
export interface Frame<T> { duration: Ms; value: T; }
export interface Clip<T> { preRoll: Ms; frames: Frame<T>[]; cycles: boolean; } // preRoll: time of the first frame, negative = starts before impact
export interface Seg { from: number; to: number; ms: Ms; }                    // one piece of a per-frame parameter ramp

// 1) Clip choice: specificity score; any failed condition rejects the clip; best score wins; random tie-break.
export const MATCH_FAIL = -10;

export interface Ctx { event: string; hit: "miss" | "hit" | "kill"; facing: string; attackName: string; }
export interface Rule<T> {
  clip: Clip<T>;
  base: number;
  event?: string;
  hit?: Ctx["hit"];
  facing?: string[];
  attackName?: string;
  oneIn?: number;   // random gate: the clip is skipped with probability 1/oneIn
}

function score<T>(r: Rule<T>, c: Ctx, roll: (n: number) => number): number {
  let s = r.base;
  if (r.event !== undefined) { if (c.event !== r.event) return MATCH_FAIL; s++; }
  if (r.hit !== undefined) { if (c.hit !== r.hit) return MATCH_FAIL; s++; }
  if (r.facing !== undefined) { if (!r.facing.includes(c.facing)) return MATCH_FAIL; s++; }
  if (r.attackName !== undefined) { if (c.attackName !== r.attackName) return MATCH_FAIL; s++; }
  if (r.oneIn !== undefined && roll(r.oneIn) === 0) return MATCH_FAIL;
  return s;
}

export function choose<T>(rules: Rule<T>[], c: Ctx, roll: (n: number) => number): Rule<T> | null {
  let best = MATCH_FAIL;
  let options: Rule<T>[] = [];
  for (const r of rules) {
    const s = score(r, c, roll);
    if (s > MATCH_FAIL && s === best) options.push(r);
    else if (s > best) { best = s; options = [r]; }
  }
  if (best === MATCH_FAIL) return null;
  return options[roll(options.length)];
}

// 2) Timeline: an anchor on a clock, pause shifts the anchor, frames advance by time, cycles skip whole loops when far behind.
export class Timeline<T> {
  private anchor = 0;
  private pausedAt: number | null = null;
  private index = 0;
  private next = 0;
  private finished = false;
  private cycles = false;

  constructor(private readonly clip: Clip<T>) {}

  start(now: number, offset: Ms, cycles = false): void {
    this.cycles = cycles;
    this.index = 0;
    this.finished = false;
    this.pausedAt = null;
    this.anchor = now - offset; // elapsed starts at offset (for example -450 ms: impact is at elapsed 0)
    this.next = this.anchor + this.clip.preRoll + this.clip.frames[0].duration;
  }

  elapsed(now: number): Ms { return (this.pausedAt ?? now) - this.anchor; }

  pause(now: number): void { if (this.pausedAt === null) this.pausedAt = now; }

  resume(now: number): void {
    if (this.pausedAt === null) return;
    const d = now - this.pausedAt;
    this.anchor += d; // hitstop: the rest of the clip keeps its frame order, just later
    this.next += d;
    this.pausedAt = null;
  }

  private total(): Ms { return this.clip.frames.reduce((a, f) => a + f.duration, 0); }

  advance(now: number): void {
    if (this.pausedAt !== null || this.clip.frames.length === 0) return;
    const total = this.total();
    if (this.cycles && total > 0 && now > this.next + total) {
      this.next += Math.floor((now - this.next) / total) * total; // skip whole loops
    }
    while (now >= this.next) {
      const nextIndex = this.index + 1;
      if (!this.cycles && nextIndex === this.clip.frames.length) { this.finished = true; return; }
      this.index = nextIndex % this.clip.frames.length;
      this.next += this.clip.frames[this.index].duration;
    }
  }

  current(): T { return this.clip.frames[this.index].value; }
  isFinished(): boolean { return this.finished; }
}

// 3) A per-frame parameter (for example alpha 0 to 1 over 300 ms) as a piecewise-linear ramp.
export function rampAt(segs: Seg[], t: Ms): number {
  const total = segs.reduce((a, s) => a + s.ms, 0);
  const clamped = Math.min(Math.max(t, 0), total);
  let acc = 0;
  let i = 0;
  while (acc < clamped && i < segs.length) { acc += segs[i].ms; i++; }
  if (i !== 0) { i--; acc -= segs[i].ms; }
  const s = segs[i];
  if (!s) return 0;
  return s.ms > 0 ? s.from + ((clamped - acc) / s.ms) * (s.to - s.from) : s.to;
}

// 4) Cosmetic HP drain: the server already decided the damage; the display removes it in slices until the clip ends.
export function drainStep(damageLeft: number, clipEnd: Ms, elapsed: Ms, slice: Ms = 50): { remove: number; left: number } {
  let steps = Math.floor((clipEnd - elapsed) / slice);
  if (steps < 1) steps = 1;
  let remove = Math.floor(damageLeft / steps);
  if (remove < 1) remove = 1;
  return { remove, left: damageLeft - remove };
}

// 5) Shared clock: all clips start at the earliest preRoll, so the impact (elapsed 0) lines up across attacker and defender.
export function sharedStart(clips: Clip<unknown>[]): Ms {
  return Math.min(...clips.map((c) => c.preRoll));
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {};` appended, exit 0.

## 5. Lands in

- TARGET `src/fight/anim-clips.ts` (new client-side module: clip choice, the impact-anchored timeline, the cosmetic HP drain). It reads the server verdict and the fight state and writes only the display; the engine never reads it. Parity-checklist row 7 (creature actor/clips); the same module serves the hero under row 6. The pause shift is also the hitstop of row 10, so the hitstop lands in row 10 when it is built.
- today: not read (no Frankendom file was opened in this pass).
- Decision (proposed): adapt. Take the impact-anchored clip (time zero is the server's resolution), the scored clip choice with hard rejects and a random tie-break, the pause that shifts the rest of the clip, and the display-only HP drain after the server verdict. Do not take the 2D sprite frames, the rule that no matching clip means no animation, or the separate sound offsets as they are.
- Acceptance: a client test: a clip with a matching attack filter beats a generic clip by one point; a hit verdict and a kill verdict choose different defend clips when both exist; with no matching clip the attack still resolves and an error is logged, not silent; the impact frame is shown at server resolution time; a 60 ms hitstop makes the clip end 60 ms later with no frame skipped; the HP bar drains in 50 ms steps and ends at the server's hit points.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later: clean-room only; sketch written from the mechanism; no donor lines copied)
- Brief rule served: 1 (one engine, two clients: the clip chooser and the timeline are client views; kills and HP come from the server)

## 6. Gaps and risks

- The donor allows "no clip, no animation" (`units/animation.cpp` 1322-1324): the attack resolves silently. For us a strike must always show something; the chooser needs a fallback clip.
- The HP drain subtracts from the live unit (`udisplay.cpp` 623, 757) and then restores the pre-attack value (765). That is a display trick that only works because the caller applies the real change later. Our version must keep the drain as a display-only number and never touch the server's hit points.
- The clip choice uses a random tie-break and a random gate (`animation_component.cpp` 67; `animation.cpp` 441). Two clients can choose different clips for the same hit. For a fight record (row 19) the chosen clip must be derived from the server data (a seed or a stored id), or the replay will differ.
- Hit kind decides the defend clip, but the defend clip in `Skeleton.cfg` has no hit filter (`Skeleton.cfg` 20 uses the same clip for every outcome; only the sound has `hits=hit`). Kill and hit look the same unless a clip is written for them.
- Sound time base is not traced: the attack sound at -100 and the defend sound at -25 are data on the same clip time base, but the code that places a sound element was not read. Verify before we depend on the offsets.
- The impact is elapsed 0 by convention (`udisplay.cpp` 742): the attacker's art decides where the strike looks like it lands. Our server verdict is at one tick; the clip must be authored so frame timing matches the server tick, or the strike will look early or late.
- Accelerated and normal clocks: the donor's attack wait advances the accelerated clock by the turbo speed (`udisplay.cpp` 1425-1442). A global speed-up would change every timer; our hitstop must be on the fight clock only.
- The ramp takes explicit segments in the donor, with an even split when the duration is missing (`frame_private.hpp` 89). Our data must always give durations, or the even split will silently change the timing.
- Not read: `frame.cpp` (how offset, alpha and sound are drawn), the particle path, the recruit trigger, `MOVING_ANIM_DIRECTIONAL_12_FRAME`, and the constructor default for `base_score` (`units/animation.cpp` 255-300).
- Licence: GPL-2.0-or-later. Clean-room only.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine, two clients)
