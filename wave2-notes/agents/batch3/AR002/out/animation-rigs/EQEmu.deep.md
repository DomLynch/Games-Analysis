# EQEmu (animation-rigs, cell 1)

Donor: `/mnt/frankendom-donors/EQEmu/zone/mob.cpp` (`Mob::DoAnim`, 3545-3565) | Licence: GPL-3.0 (LICENSE.md is version 3, 29 June 2007; source headers say "either version 3 of the License, or (at your option) any later version") | C++ | symbol `Mob::DoAnim`

Checked: Hint file `zone/gm_commands/set/set_animation.cpp` is the GM command `#set animation`; it only calls `SetAppearance` (line 69), so it is not the animation mechanism. The real code is `Mob::DoAnim` (mob.cpp 3545-3565, read in full), its caller `Mob::AttackAnimation` (attack.cpp 45-143, read in full) called from `Mob::Attack` (attack.cpp 1564, read to 1640), the client relay `Client::Handle_OP_Animation` (client_packet.cpp 3001-3013, read in full), and the timer (`common/timer.cpp` 82-93, read in full). `Mob::Attack` itself was read only at lines 1618-1640, not from its start at 1564. Callers of `DoAnim` were checked by grep over `zone/` (about 30 call sites: special_attacks.cpp, merc.cpp, bot.cpp, dialogue_window.cpp, questmgr.cpp, spell_effects.cpp, gm_commands/doanim.cpp, client_packet.cpp, attack.cpp); the Lua and Perl wrappers were not read. Confidence: high that the server-side cue gate is as described. Topic fit is partial: a grep of `zone`, `common` and `world` for skinning, ragdoll, kinematic, blend, skeletal animation and bone found only race, spell, zone and pet-name strings. So the donor has no skeleton, skinning, clip blending, IK, ragdoll or attachment-point code. Client-side playback is not in this repo (not read). `SetAppearance` (mob.cpp 4448-4460) was read in full but is a persistent pose state, described in section 1 only as a sibling channel.

## 1. Mechanism

- The server does not simulate any skeleton. It sends animation cues: one-shot "play action X at speed Y on spawn Z" messages (`OP_Animation`), plus a persistent pose value (`SetAppearance`) and a run-animation number carried in the position update.
- One-shot cue, order of steps in `Mob::DoAnim`: (a) if the mob's `attack_anim_timer` has not expired, return with nothing sent (mob.cpp 3547-3549); (b) build the packet with spawn id, action and speed (3553-3555), where speed 0 becomes 10 (3555); (c) queue it to clients within the range rule `RuleI(Range, Anims)` (3557-3561). The timer is built with `attack_anim_timer(100)` (mob.cpp 127). `Timer::Check()` defaults to reset-on-success (timer.h 38), and the non-accurate branch restarts the window from the moment of the successful send (timer.cpp 89). So a cue is sent at most once per 100 ms per mob, and a cue inside that window is dropped, not queued. The same gate covers every action type (swing, kick, spell projectile, GM test, dialogue greeting).
- Swing cue, in `Mob::Attack` (attack.cpp 1564): line 1628 calls `AttackAnimation`, and its comment says it also sends the packet to nearby clients (1627). Damage code starts at line 1631 ("Now figure out damage"). So the swing cue goes out before the damage of that swing is computed. (Where the hit/miss decision sits relative to 1631 was not read in full.)
- Weapon to clip, in `Mob::AttackAnimation` (attack.cpp 45-143): one switch on the weapon item type (or NPC skill) sets both the animation `type` and `skillinuse`, and it returns `skillinuse` (143). The return value becomes `my_hit.skill` (1628). So one table gives the swing clip and the skill that the hit uses. Off-hand swings always use `animDualWield` (attack.cpp 122-124).
- Dual-wield flourish, same function (attack.cpp 120-141): an off-hand swing moves a small state value from 2 to 3 (the meaning of 2 and 3 is not read). On a later primary-hand swing in state 3, `zone->random.Roll(50)` picks a 50 percent chance to play `animDualWield` and sets the state back to 2. The state is reset to 2 on every primary-hand swing. This roll only chooses the clip (the damage effect of the clip choice was not read).
- Client relay: `Client::Handle_OP_Animation` takes the client's `action` and `speed` from the packet and calls `DoAnim` (client_packet.cpp 3011-3012). The code comment says the spawn id is not checked, and that it "wouldent affect anything". The action id is not range-checked. So a client can make its own character broadcast any action id in range, subject to the same 100 ms gate.
- Persistent channels (not cues): `Mob::SetAppearance` (mob.cpp 4448-4460) returns early if the value is unchanged, stores `_appearance`, and broadcasts it once with the `Animation` appearance type. Its values are the pose enum `eaStanding`, `eaSitting`, `eaCrouching`, `eaDead`, `eaLooting` (eq_constants.h 80-84). For the position update, `MakeSpawnUpdate` puts `animation` in the field for clients and `pRunAnimSpeed` for NPCs (mob.cpp 1743-1745). `pRunAnimSpeed` is set from the fear speed when a mob flees (fearpath.cpp 67). So for NPCs, the number in that field is a run-animation playback speed, not a clip name.
- Tick: none of this runs in a per-frame loop of its own. Cues are synchronous calls from attack, spell and script code. The gate's clock is `current_time`, which is set elsewhere (`SetCurrentTime`, not read).

## 2. Key functions

- `Mob::DoAnim`: `/mnt/frankendom-donors/EQEmu/zone/mob.cpp` 3545-3565. Gate, packet, range broadcast.
- `Mob::AttackAnimation`: `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` 45-143. Weapon type to clip and skill; off-hand clip; dual-wield roll; send at 141.
- `Mob::Attack` (caller): `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` 1564-1628 (the call at 1628, damage from 1631).
- `Client::Handle_OP_Animation`: `/mnt/frankendom-donors/EQEmu/zone/client_packet.cpp` 3001-3013 (client-sent cue relayed unchecked).
- `Timer::Check` and reset: `/mnt/frankendom-donors/EQEmu/common/timer.cpp` 82-93; `Timer::Check(bool iReset = true)` declared at `/mnt/frankendom-donors/EQEmu/common/timer.h` 38.
- `Mob::SetAppearance` (persistent pose, sibling channel): `/mnt/frankendom-donors/EQEmu/zone/mob.cpp` 4448-4460.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Per-actor cue cooldown: a cue inside the window is dropped; the window restarts at each send | 100 ms (mob.cpp 127); restart on send (timer.cpp 89) |
| Default playback speed when the caller passes 0 | 10 (mob.cpp 3555) |
| Range-limited cue broadcast | `RuleI(Range, Anims)` default 135 (common/ruletypes.h 757). The rule's description text says "begin cast messages", which does not match its use here. Its unit is not stated in the donor. |
| Weapon type to swing clip and to hit skill, from one switch | Per item type (attack.cpp 45-143) |
| Dual-wield flourish chance | `Roll(50)` = 50 percent (attack.cpp 134); `Roll` is `Int(0, 99) < required` (common/random.h 75) |
| Persistent pose change sent once, only on change | `if (_appearance == app)` early return (mob.cpp 4449) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's gate (drop inside the window, restart the window from the send) and its default speed. It omits the second channel (`SetAppearance`), the dual-wield state machine (the sketch only maps an off-hand swing to the dual-wield clip), the donor's `QueueCloseClients` filter (replaced by a plain distance check; not read), the ACK flag, and the skill return. Clip names are placeholders for Frankendom's catalogue. The block below is what is in the typechecked file; the file adds `export {}` at the end.

```ts
// clean-room sketch of a server-authored animation cue gate (donor licence GPL-3.0: shape only, not a translation)
export interface AnimCue { actorId: number; clip: string; speed: number; }

export class CueGate {
  private readonly nextAllowed = new Map<number, number>(); // actorId -> earliest ms for the next cue

  constructor(private readonly cooldownMs: number) {}

  // Returns the cue to send, or null while the actor is inside its cooldown (the cue is dropped, not queued).
  tryCue(nowMs: number, actorId: number, clip: string, speed = 0): AnimCue | null {
    const next = this.nextAllowed.get(actorId) ?? 0;
    if (nowMs < next) return null;
    this.nextAllowed.set(actorId, nowMs + this.cooldownMs); // window restarts from the send, as the donor timer does
    return { actorId, clip, speed: speed !== 0 ? speed : 10 };
  }
}

// Clients inside range of the actor get the cue. Simplified: the donor uses QueueCloseClients (not read).
export function cueRecipients(
  actor: { x: number; y: number },
  players: ReadonlyArray<{ id: number; x: number; y: number }>,
  range: number,
): number[] {
  return players
    .filter((p) => Math.hypot(p.x - actor.x, p.y - actor.y) <= range)
    .map((p) => p.id);
}

// Weapon class -> swing clip. Off-hand swings use the dual-wield clip (donor: attack.cpp 122-124).
export type WeaponClass = "oneHandBlunt" | "oneHandPierce" | "twoHand" | "unarmed";
export function swingClip(weapon: WeaponClass, offHand: boolean): string {
  if (offHand) return "dualWield";
  switch (weapon) {
    case "oneHandBlunt": return "oneHandWeapon";
    case "oneHandPierce": return "piercing";
    case "twoHand": return "twoHandSlash";
    case "unarmed": return "handToHand";
  }
}
```

## 5. Lands in

- TARGET `src/fight/anim-cue.ts` (new, engine side): the fight step emits a cue event after the hit is resolved, with the per-actor cooldown and the range filter. The client plays the named clip. No cue ever decides a hit.
- Parity-checklist row 7 (creature actor/clips). The hero's swing cue would also use row 6, but the row-7 creature clip path is the closer fit for this mechanism.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, two clients: the engine emits cues, clients only play them); server-verified kills (the cue is not in the hit path).

Best transferable idea: The server sends a one-shot animation cue per actor on a short cooldown that drops repeats, the weapon class picks the swing clip, and the cue never decides the hit.

Decision (proposed): adapt - keep the cooldown-gated, range-limited server cue and the one weapon-to-clip table, but keep the latest cue pending instead of dropping it, send it after the hit is resolved, and reject the client-relayed animation message outright.

Acceptance: a server test asserts that a second swing cue from the same actor within 100 ms is held as the latest pending cue and sent after the window, and that a client-sent animation message changes nothing; in the browser, the swing clip starts on the server hit event and the hit result is the same with the clip stopped.

## 6. Gaps and risks

- No rig at all: no skeleton, skin, clip blending, IK, ragdoll, retargeting or attachment point. The donor gives an action id and a speed number, not a pose. Blending, hit-reaction clips and state machines must come from elsewhere; this donor gives no evidence for them (grep checked).
- Drop, not queue: a cue inside the 100 ms window is discarded (mob.cpp 3547-3549). In a fast duel, a counter or finisher cue can be lost. Frankendom should keep the latest pending cue for hit reactions and only drop exact repeats.
- Client authority: the donor's client can send any action (client_packet.cpp 3011-3012). Frankendom's rulings put cues on the engine side only. Reject this path.
- Cue before damage: the donor sends the swing before its damage code (attack.cpp 1628, then 1631). Frankendom's kills are server-verified, so a lost cue must never change the hit. The sketch keeps the cue out of the hit path.
- Clock: the cooldown uses a global `current_time` (timer.cpp 84-89) whose update path was not read. Frankendom should use the server tick count, so the cooldown is the same on every run.
- Overloaded field: NPCs carry a run-speed value in the field used for `animation` (mob.cpp 1743-1745). Frankendom should keep the clip name and the playback rate in separate fields.
- Range rule description does not match its use (common/ruletypes.h 757). Do not copy the text; treat the range as an engine constant with a doc line of its own.
- Licence is GPL-3.0: clean-room, shape only. The sketch is written from the described mechanism and not translated from the donor lines.
