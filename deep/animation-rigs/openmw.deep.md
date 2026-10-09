# openmw (animation-rigs, cell 3)

Donor: /mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/character.cpp | Licence: GPL-3 | C++ | symbol CharacterController::refreshCurrentAnims

Symbol check: refreshCurrentAnims (829-842) and refreshHitRecoilAnims (381-486) opened in full; refreshJumpAnims (488-526), refreshMovementAnims (635-755), refreshIdleAnims (757-827) and playDeath (844-862) also opened.

## 1. Mechanism
- The controller holds several state slots: movement (mMovementState), idle (mIdleState), jump (mJumpState), hit or recoil (mHitState), death (mDeathState) and upper body or weapon (mUpperBodyState). Each slot names a current animation group string (mCurrentMovement, mCurrentIdle, mCurrentJump, mCurrentHit, mCurrentDeath, mCurrentWeapon) played at a priority.
- refreshCurrentAnims(idle, movement, jump, force) (829-842) does nothing while a scripted animation plays. Otherwise it calls, in order: refreshHitRecoilAnims (381), refreshJumpAnims (488), refreshMovementAnims (635), and refreshIdleAnims (757) last, because idle depends on the others. The dependence is real: refreshIdleAnims resets and returns for a non-biped actor while an upper-body state, a movement state or a hit clip is active (761-767), so a hit clip suppresses idle for creatures. isScriptedAnimPlaying itself was not read.
- refreshHitRecoilAnims (381-486) reads the actor's fatigue and flags (knockout, hit recovery, knocked down, blocking, swimming; 388-392). Knockout is current fatigue below 0 or base fatigue equal to 0; block counts only when not knocked out, recovering or knocked down. It always clears the stored block flag (394). For a non-NPC in an upper-body state past weapon-equipped, recovery is cancelled (402-406). While a hit state is set: if its clip stopped, then (unless knocked out with an empty clip and knockout still true, which returns and keeps the state, 412-413) the hit state clears, the knocked-down and recovery flags reset and idle is reset (415-419); if the clip is still playing and the actor is knocked out, looping is enabled only while knockout holds (421-422). With no hit state set, it returns if none of knockout, knockdown, recovery or block holds (426-427); otherwise it picks, in order, knockout (sets the knocked-down flag, priority Priority_Knockdown), knockdown, recovery (Priority_Hit) or block (Priority_Hit with left arm Priority_Block and lower body Priority_WeaponLowerBody, keys "block start"/"block stop"), with swim variants, picks a random recovery group, cancels the weapon clip when knocked out or down, and plays the clip blended (429-485). For the player, a held block state clears when block is no longer asserted (396-400).
- refreshJumpAnims (488-526) returns when the state is unchanged unless forced; JumpState_None clears jump and resets idle if a jump clip was set; otherwise it picks "jump" plus the weapon suffix with fallbacks and plays start, loop or landing keys at Priority_Jump. refreshMovementAnims (635-755) maps the state to a group, drops "swim" and then "run" from the name when the clip is missing, adds a weapon suffix, keeps the playback point when the same clip repeats, and sets a speed from the clip's own velocity (creature walk velocity used for running ones, fallback constants 33.5452 / 222.857 / 154.064 otherwise). refreshIdleAnims (757-827) plays the idle group with fallbacks and, for the weapon idle, loops a random 1 + rollDice(4) times (807; the comment at 804 says 2 to 5; rollDice not read).
- playDeath (844-862) sets the death state and group, records the death animation index on the creature stats (848), resets movement, weapon, hit, idle and jump (854-858), and plays the death blend at Priority_Death with start and stop keys and zero loops (860-861).
- Inputs: actor flags, current states, requested states. Outputs: which group plays at which priority. Per frame for each actor.

## 2. Key functions
- refreshCurrentAnims | /mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/character.cpp | 829-842 | ordered refresh: hit, jump, movement, then idle.
- refreshHitRecoilAnims | /mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/character.cpp | 381-486 | hit, knockdown and block state machine; holds while the clip plays.
- refreshJumpAnims | /mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/character.cpp | 488-526 | jump clip start, loop and landing.
- refreshMovementAnims | /mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/character.cpp | 635-755 | movement group choice with fallbacks and speed scaling.
- refreshIdleAnims | /mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/character.cpp | 757-827 | idle group choice, suppressed by hit, movement and upper-body states for non-bipeds.
- playDeath | /mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/character.cpp | 844-862 | clears every state slot and plays the death blend.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed refresh order, with the dependent state last | Priority enum values (theirs) |
| Hit state holds until its clip stops, then resets dependents | Knockout when fatigue is below zero or base fatigue is zero (theirs, Morrowind stat; line 388) |
| Death clears all state slots, then plays one blend | Death blend start and stop keys "start" and "stop" (theirs; line 861) |

## 4. TypeScript sketch
simplified: the donor's refreshHitRecoilAnims also starts new hit states when none is set (knockout, then knockdown, recovery, block, with priorities, swim variants and weapon-clip cancel; 426-485), clears the stored block flag every call (394), returns early for a knocked-out actor with an empty clip (412-413), and sets knockout looping only while a hit clip is still playing (421-422); the sketch computes the looping flag before the hit-active check and only models the clear path. Jump, movement and idle refresh bodies are callbacks.

```ts
// Licence: GPL-3 (openmw) | clean-room: written from the mechanism, no donor lines.
interface ActorFlags { fatigue: number; fatigueMax: number; hitRecovery: boolean; knockedDown: boolean; blocking: boolean; }  // flags are cleared by the hit refresh
interface Controller { hitActive: boolean; hitClipPlaying: boolean; idleReset: boolean; knockoutLoop: boolean; }

// Hit state first. While the hit clip plays it holds; when it stops it clears and asks for an idle reset.
function refreshHit(c: Controller, a: ActorFlags): void {
  c.knockoutLoop = a.fatigue < 0 || a.fatigueMax === 0; // theirs: strictly below zero, or zero base fatigue; keeps the knockout clip looping
  if (!c.hitActive) return;
  if (!c.hitClipPlaying) {
    c.hitActive = false;
    a.knockedDown = false;   // the knocked-down and recovery flags reset together with the hit state
    a.hitRecovery = false;
    c.idleReset = true;
  }
}

// Ordered refresh: hit, then jump, then movement, then idle (idle reads the others).
function refreshCurrentAnims(
  c: Controller, a: ActorFlags, scripted: boolean,
  refreshJump: () => void, refreshMove: () => void, refreshIdle: () => void,
): void {
  if (scripted) return;
  refreshHit(c, a);
  refreshJump();
  refreshMove();
  refreshIdle();
}
```

## 5. Lands in
- Frankendom file(s): TARGET src/fight/anim-state.ts (proposed: hero state-to-clip refresh order; K3). The creature side is the origins' own copy at origins/preview/mob-clips.ts (row 7).
- Parity-checklist row: 6 hero actor/animation. Block state touches row 3 (guard/parry/stamina). The hit clip touches row 10.
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- The donor's clip state is driven by actor flags set elsewhere (hit recovery, knocked down, block). In Frankendom the engine (one engine, rows 1 and 3) must own those flags; the animation layer only reads them, so a client never decides a stagger or a kill (server-verified kills).
- Idle is suppressed by a hit clip for non-biped actors (verified, 761-767). Creature clips (row 7) must keep that order or a stagger will play over an idle.
- Knockout uses a fatigue rule from the donor's stat system. Frankendom's stamina (row 3) needs its own rule.
- Zones are data: weapon-suffix clip names and fallbacks (movement, idle, jump) should come from the catalogue (rows 20 and 21), not per-zone code.
- Scripted animation override (833) has no Frankendom counterpart; isScriptedAnimPlaying and the caller of playDeath were not read.
