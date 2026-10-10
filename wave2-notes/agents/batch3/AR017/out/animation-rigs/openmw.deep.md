# openmw (animation-rigs, cell 1)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/animation.cpp` | Licence: GPL-3.0 (character.cpp header: "GNU General Public License version 3"; LICENSE file is GPL v3) | C++ (OpenSceneGraph) | symbol `Animation::resetActiveGroups` (with `Animation::play` and `AnimBlendController::calculateInterpFactor`)

Checked: Read in full: `animblendcontroller.cpp` (393 lines, both halves), `animblendrules.cpp` 112-160 (matcher), `files/data/animations/animation-config.yaml` (all 69 lines), `animation.cpp` `play` 887-974 (ends at the closing `resetActiveGroups();`), `handleBlendTransform` 1075-1110, `resetActiveGroups` 1116-1160, `upperBodyReady` 1851-1860, `character.cpp` 267-283, 420-500, 1349-1358, 2609-2620 (dispatch), `character.hpp` 30-43, `blendmask.hpp`, `animationpriority.hpp`, `camera.cpp` 130-138 and 220-230 (the one caller of `upperBodyReady`). Callers: I read the hit/block/knockdown, movement, weapon and shield callers in `character.cpp` and the one dispatch function; the Lua path (`animationbindings.cpp`) is not read. Not read: `Animation::reset` (text-key parsing), `handleTextKey`, `animationEnded`, the movement mask choice at `character.cpp` 662-753, the Frankendom repo. Confidence: high on layering and the blend order; medium on the whole-frame order (which callback runs first was not traced). Not a camera note (the camera lines are only the upper-body gate).

Best transferable idea: Pick each body group's clip separately by a per-group priority, so a block lifts only the arm while the legs keep walking, and ease from the pose on screen when the switch happens.
Decision (proposed): adapt - take the per-group winner and the snapshot-then-ease blend, but key the priorities by named hero state in data instead of OpenMW's integer enum; the engine owns the state, the layers only draw it.
Acceptance: Headless test with walk (all four groups, priority 5) and block (left arm 8, lower body 1, torso and right arm 6) active and no weapon clip: lower channel reports walk, left arm, torso and right arm report block; switching walk to block eases over the rig's rule duration (no snap) while the legs keep stepping.

## 1. Mechanism

- Each playing clip is a "state" with two things: a priority vector (one integer for each of four body groups: lower body, torso, left arm, right arm) and a blend mask (which groups the clip drives). `BlendMask_All` covers all four (`blendmask.hpp` 15-20 defines the upper-body union and the four-mask count).
- Selection, once per update, runs for each group on its own. The winner for a group is the playing state whose mask covers that group and whose priority for that group is highest. Ties keep the first state in name order, because the states live in a `std::map` (`animation.hpp` 183) and the loop only replaces the winner on a strict `<` (`animation.cpp` 1132-1143). Only the winner's tracks drive that group.
- Starting a clip (`Animation::play`, 887): if a different state has exactly the same full priority vector, that state is ended and erased (909-911). If the clip is already playing, only its priority is updated and it is not restarted (900-905). Then the active groups are re-resolved (974).
- Blending (`AnimBlendController`): when a group's winning clip changes (its group name or start key differs, `animblendcontroller.cpp` 167), the blend records the bone matrix at that moment (223, via `handleBlendTransform` 1104). The blend duration and easing come from the first matching rule, searched last-to-first (`animblendrules.cpp` 134; a later rule overrides an earlier one, 115). With no match the duration stays 0 and the blend snaps (171, 185). Default easing is sineOut (172; body at 26).
- Per frame while blending: factor = easing(min((now - start) / duration, 1)) (205). Rotation is slerped from the snapshot to the live sample (257), translation is lerped, and scale is copied from the live sample, not lerped (263). When the factor reaches 1 the bones are the clip's own output.
- Priorities the character controller sets:
  - Hit (recovery): `Priority_Hit` on all four groups (`character.cpp` 444).
  - Block: `Priority_Hit` by default, left arm `Priority_Block`, lower body `Priority_WeaponLowerBody` (449-451). The block is played with `BlendMask_All` (484).
  - Knockdown or knockout: `Priority_Knockdown` by default (429).
  - Movement: `Priority_Movement` on its mask (753).
  - Biped weapons: `Priority_Weapon`, with lower body `Priority_WeaponLowerBody` (1354-1355).
  - Enum order (`character.hpp` 30-43): Default 0, WeaponLowerBody 1, SneakIdleLowerBody 2, SwimIdle 3, Jump 4, Movement 5, Hit 6, Weapon 7, Block 8, Knockdown 9, Torch 10, Storm 11, Death 12, Scripted 13.
- Consequences of those values, read from the code:
  - A hit (6) outranks movement (5) in every group it covers, so it also takes the legs when its mask is all groups.
  - During a block the legs stay on movement when the movement clip covers the lower body (lower body: block 1 loses to movement 5; movement's mask defaults to `BlendMask_All` at `character.cpp` 662, where it is set, not fully read). Torso and right arm go to the block (6 beats movement 5) unless a weapon clip (7) covers them. The left arm goes to the block (8) even against a weapon clip (7).
  - `Animation::upperBodyReady` (1851) returns false while any state has Hit, Weapon, Knockdown or Death in any group (1855-1858). The camera uses it: a first-person switch waits (`camera.cpp` 135, 226), because "Changing the view will stop all playing animations" (228).

## 2. Key functions

- `Animation::resetActiveGroups`: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/animation.cpp` 1116-1160. Per-group winner loop (1132-1143); attaches the winner's controllers for that mask; snapshots bones on change (1104, inside `handleBlendTransform`).
- `Animation::play`: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/animation.cpp` 887-974. Same-priority replacement (909), reuse of an already-playing state (900-905), state creation from the reverse-ordered animation sources, and a final `resetActiveGroups()`.
- `AnimBlendController::setKeyframeTrack`: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/animblendcontroller.cpp` 163-200. Change detection, rule lookup, duration and easing.
- `AnimBlendController::calculateInterpFactor` and `BoneAnimBlendController::applyBoneBlend`: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/animblendcontroller.cpp` 202-215 and 233-274. Factor, slerp and lerp, scale copy.
- `findBlendingRule`: `/mnt/frankendom-donors/openmw/components/sceneutil/animblendrules.cpp` 127-158. Last matching rule wins.
- `CharacterController::playBlendedAnimation`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/character.cpp` 2609-2619. Dispatch to `mAnimation->play` (2617) unless the Lua path is active.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per body group, the highest-priority clip whose mask covers that group wins | Enum order (`character.hpp` 30-43); per-state values Hit 6, Movement 5, Block 8 (left arm), 1 (lower body) (`character.cpp` 444-451) |
| A clip with the same full priority vector ends the older one; re-playing the same clip only updates priority | None (rule, `animation.cpp` 909, 900-905) |
| Snapshot on switch, ease to the live sample; duration from the first matching rule, last rule wins | General rule 0.25 s (`animation-config.yaml` 10; rule at 6-9 is "*" to "*", sineOut); sneak 0.4 s (15); attack-swing prep 0.1 s (28); start to attack 0.05 s (45); from no state 0 s (65-69) |
| No matching rule means snap | Duration 0 (`animblendcontroller.cpp` 171) |
| Easing sineOut | sin(x * pi / 2) (`animblendcontroller.cpp` 26) |
| Scale is copied, not eased | Rule, not a number (`animblendcontroller.cpp` 263) |
| Upper-body gate: wait while hit, weapon, knockdown or death layers play | Same enum values; used by camera at `camera.cpp` 226 |

## 4. TypeScript sketch

simplified: one scalar stands in for a bone transform (no slerp, no matrices, no scale rule); it keeps the donor's order (winner per group, play replaces same-priority clips, snapshot on switch, last-matching rule, sineOut default, snap at duration 0). It omits text keys and start/stop markers, loop counts, autodisable, the Lua path, the non-skinned NIF path, and rule keys (only clip names are matched). Ties resolve by list order, the donor by name order. The caller must not call `stepChannel` for a group with no winning clip; the donor's behaviour there was not read.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Group = "lower" | "torso" | "leftArm" | "rightArm";
const GROUPS: Group[] = ["lower", "torso", "leftArm", "rightArm"];
type Priority = Record<Group, number>;

interface Clip {
  name: string;                 // e.g. "walk", "block", "hit1"
  priority: Priority;           // one priority per body group
  groups: Group[];              // body groups this clip drives (its blend mask)
  time: number;                 // seconds into the clip
  pose: (t: number) => number;  // one scalar stands in for a bone transform
}

interface Rule { from: string; to: string; duration: number; easing: "linear" | "sineOut"; }

// Wildcard match: "*" alone, or a leading or trailing star.
function fits(pattern: string, s: string): boolean {
  return pattern === "*" || s === pattern
    || (pattern.startsWith("*") && s.endsWith(pattern.slice(1)))
    || (pattern.endsWith("*") && s.startsWith(pattern.slice(0, -1)));
}

// The last matching rule wins: later rules override earlier ones.
function findRule(rules: Rule[], from: string, to: string): Rule | undefined {
  for (let i = rules.length - 1; i >= 0; i--) {
    if (fits(rules[i].from, from) && fits(rules[i].to, to)) return rules[i];
  }
  return undefined;
}

const EASE: Record<Rule["easing"], (x: number) => number> = {
  linear: (x) => x,
  sineOut: (x) => Math.sin((x * Math.PI) / 2),
};

const samePriority = (a: Priority, b: Priority): boolean => GROUPS.every((g) => a[g] === b[g]);

// Starting a clip: an older clip with the same full priority vector ends.
// A clip that is already playing only takes the new priority and is not restarted.
function play(clips: Clip[], next: Clip): Clip[] {
  const kept = clips.filter((c) => c.name === next.name || !samePriority(c.priority, next.priority));
  const same = kept.find((c) => c.name === next.name);
  if (same) {
    same.priority = next.priority;
    return kept;
  }
  return [...kept, next];
}

// Per body group: the clip with the highest priority for that group among clips whose mask includes it.
// Ties keep the earlier clip in the list (donor: strict less-than over a name-sorted map).
function activeFor(clips: Clip[], g: Group): Clip | undefined {
  let best: Clip | undefined;
  for (const c of clips) {
    if (!c.groups.includes(g)) continue;
    if (!best || best.priority[g] < c.priority[g]) best = c;
  }
  return best;
}

interface Channel {
  current: string;   // clip name this group last switched to ("" = none)
  shown: number;     // value this group output last frame
  from: number;      // snapshot taken when the group switched
  start: number;     // seconds: time the blend began
  duration: number;  // seconds; 0 = snap
  ease: (x: number) => number;
}

// One group, one frame. On a switch, snapshot what the group shows, then blend to the new clip's sample.
function stepChannel(ch: Channel, clip: Clip, rules: Rule[], now: number): number {
  const sample = clip.pose(clip.time);
  if (clip.name !== ch.current) {
    const rule = findRule(rules, ch.current, clip.name);
    ch.from = ch.shown;
    ch.start = now;
    ch.duration = rule ? rule.duration : 0;
    ch.ease = rule ? EASE[rule.easing] : EASE.sineOut;
    ch.current = clip.name;
  }
  const t = ch.duration === 0 ? 1 : Math.min((now - ch.start) / ch.duration, 1);
  ch.shown = ch.from + (sample - ch.from) * ch.ease(t);
  return ch.shown;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/anim-layers.ts` (new client module; proposed path). The layers hold no fight state: they read the engine's state (which hit, block on or off, knockdown) and draw it. Lead to confirm whether client animation should sit under the client tree rather than `src/fight/`. Parity-checklist row 6 (hero actor/animation).
- today: not read. The Frankendom repo was not opened in this pass, so there is no current hero animation code to compare.
- Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room, shape only)
- Brief rule served: 1 (one engine: fight state stays with the engine; the layers are a client view of it). Licence rule: GPL, so no line-by-line port.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism, and the donor's numbers are cited, not copied as code.
- The donor's priorities are a closed integer enum. Frankendom should key priorities by named hero state in data (idle, walk, block, hit, knockdown, death), so a designer can change one row without touching the code.
- A hit at priority 6 outranks movement at 5 in every group it covers, so an all-group hit freezes walking legs. Frankendom must decide whether a hit should stop the legs (a design choice, not a donor fact).
- Many-on-one (MAX_ATTACKERS = 3): the donor's `play()` replaces an older clip at the same full priority vector, and does not restart a clip that is already playing. Three attackers landing close together would show one hit clip, not three. Frankendom needs one explicit rule for simultaneous hits, and a test for it.
- Interrupting a blend: the snapshot is the bone's matrix at the moment of the switch, so a hit during a block blend starts from the mid-blend pose. The sketch does the same (`ch.shown`). Not tested against a real rig.
- Ties resolve by name order in the donor. Frankendom must pick a fixed order and test it.
- Animation is presentation only. The donor's camera gate (`upperBodyReady`, `camera.cpp` 226) delays view switches while hit or knockdown layers play. The owner's world camera may want a similar gate for mode changes. That is a camera rule, not written up here (camera cell not read).
- Tunable data: the rule table (from, to, duration, easing) and the per-state priority table. Engine constants: the same-priority replacement rule, the snap-when-no-rule default, and the four-group mask. The schema has no third `where` value, so the rule durations are marked `engine constant` in the sidecar; they are rig content in practice.
- Not searched: hitstop or any pause of animation time during a hit (row 10 territory). Not read: the Lua animation path.

Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room, shape only)
Brief rule served: 1 (one engine: state stays with the engine; layers are client-only)
