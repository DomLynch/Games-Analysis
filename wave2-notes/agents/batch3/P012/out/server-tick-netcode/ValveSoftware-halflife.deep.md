# ValveSoftware-halflife (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/ValveSoftware-halflife/pm_shared/pm_shared.c` (`PM_Move`, `PM_PlayerMove`, `PM_CheckParamters`, `PM_ReduceTimers`), `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/client.cpp` (`CmdStart`, `CmdEnd`, `StartFrame`, `AllowLagCompensation`), `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/util.cpp` (`UTIL_SharedRandomFloat`), `/mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/cdll_int.cpp` (`HUD_PlayerMove`), `/mnt/frankendom-donors/ValveSoftware-halflife/common/usercmd.h` (`usercmd_s`) | Licence: Valve, "Half Life 1 SDK LICENSE" (root `LICENSE`: may copy, modify and distribute the SDK free of charge with its notices; the `pm_shared.c` header adds "All other use, distribution, or modification is prohibited without written permission from Valve LLC."). Valve rule: treat as clean-room, shape only. | C / C++ | symbols `PM_Move`, `PM_PlayerMove`, `PM_CheckParamters`, `PM_ReduceTimers`, `CmdStart`, `UTIL_SharedRandomFloat`

Checked: Read in full: `CmdStart` (client.cpp 1783-1803) and `CmdEnd` (1812-1822); `AllowLagCompensation` (1928-1936) and its contract comment; `StartFrame` (794-804); `PM_CheckParamters` (2833-2890, to the frozen check; the rest of that function not read); `PM_ReduceTimers` (2916-2942); `PM_PlayerMove` head (2954-2972); `PM_Move` (3326-3340); `UTIL_SharedRandomFloat` (112-138); `HUD_PlayerMove` (cdll_int.cpp 138-143); `usercmd_s` fields (usercmd.h 21-25). The hint file `GameStudioModelRenderer_Sample.cpp` is a model renderer sample with no tick or netcode logic; not used. Searched the donor with grep for `msec`, `lerp_msec`, `frametime`, `lag comp`, `sv_unlag`, `sys_ticrate`, `CmdStart`, `StartFrame`, `UTIL_SharedRandom`: the engine that owns the server loop and the client send loop is NOT in this donor (`engine/` holds headers only: `eiface.h`, `cdll_int.h`, `APIProxy.h`). Confidence: medium. The per-input mechanism is read end to end; the server tick loop that calls it (fixed or variable step, accumulators, packet rate, lag rewind) is not in the donor and was not read. Not read: `CL_CreateMove` body past the key-to-velocity part (cl_dll/input.cpp 660-700), `pfnCmdStart` call site (engine), `cl_dll/hl/hl_weapons.cpp` weapon prediction (grep only: it runs the same `cmd->msec / 1000.0` decrements at 969-974), `dlls/monsters.cpp` think scheduling.

## 1. Mechanism

The unit of simulation is the input command, not a tick. Each `usercmd_s` carries the input's velocities (`forwardmove`, `sidemove`, `upmove`), view angles, buttons, and `msec`, the input's duration in ms (common/usercmd.h 24). The client fills the velocities from its keys in `CL_CreateMove` (cl_dll/input.cpp 660-700, partly read); the `msec` value is not set anywhere in the donor's client or pm_shared code (grep), so the engine sets it (not read). `lerp_msec` (usercmd.h 23, "Interpolation time on client") is declared but no donor code reads it (grep).

Per input, in the order the donor code shows:

(a) Bracket. The engine calls `CmdStart` before the input runs (the comment says it "happens even if think does not", client.cpp 1783-1788). `CmdStart` stores the input's `random_seed` on the player (1802). `CmdEnd` undoes group-trace flags (1812-1822). The engine call order between these and `PM_Move` is documented only by the comment; the engine code is not in the donor.

(b) Move. The engine calls the game's `pfnPM_Move` (dlls/cbase.cpp 79; declared at 26). On the client the same function is exported through `HUD_PlayerMove` (cl_dll/cdll_int.cpp 138-142), which calls `PM_Move(ppmove, server)`. So one function serves client prediction and server simulation; the `server` flag says which (pm_shared.c 3326-3332, 2959).

(c) Input clamp, in `PM_CheckParamters` (2837-2880): compute the length of the input vector; if it is above `pmove->maxspeed`, scale all three components by `maxspeed / length` (2868-2869). `maxspeed` is first capped by the client's max speed (2848-2851, `clientmaxspeed`) and, when USE is held on the ground, cut to one third (2861). Then if the player is frozen, on a train, or dead, the input is zeroed (2878).

(d) Time. `frametime = cmd.msec * 0.001` (2968). Then `PM_ReduceTimers` (2916-...) subtracts `cmd.msec` from the step-sound, duck and swim timers (step sound at 2920, duck at 2928, swim at 2936) and clamps each at 0. So every timer in the movement code counts in the input's own duration, not in wall-clock ticks.

(e) Move over the same `frametime`, then the rest of `PM_PlayerMove` (not read past the timers).

Random: `UTIL_SharedRandomFloat(seed, low, high)` (util.cpp 112-138) reseeds a generator from the seed plus the bit patterns of `low` and `high` (117), discards two outputs, takes 16 bits (132), and maps them to [low, high) (134-136). Same seed gives the same value on client and server. The player's seed is the input's seed set in `CmdStart` (player.h 104). Example consumer: the Python's holster sets its idle timer to `UTIL_SharedRandomFloat(random_seed, 10, 15)` (python.cpp 119-129).

Lag: `AllowLagCompensation` returns 1 (client.cpp 1934-1936; the contract comment at 1927 says the DLL "should return 1 if lag compensation should be allowed", and eiface.h 507-508 says the same and mentions the `sv_unlag` cvar). What the engine then rewinds is not in the donor.

Tick: `StartFrame` (client.cpp 794-804) is the per-frame server hook. It runs `g_pGameRules->Think()` (797), returns early on game over, and bumps `g_ulFrameCount`. Nothing in it steps the players; that happens per input in (b).

## 2. Key functions

- `PM_Move` and `PM_PlayerMove`: `/mnt/frankendom-donors/ValveSoftware-halflife/pm_shared/pm_shared.c` 3326-3332 and 2954-2972. The shared entry and the head of the step: server flag, clamp, frametime from msec, timers.
- `PM_CheckParamters`: `/mnt/frankendom-donors/ValveSoftware-halflife/pm_shared/pm_shared.c` 2837-2880. Speed-ratio clamp and the frozen zeroing.
- `PM_ReduceTimers`: `/mnt/frankendom-donors/ValveSoftware-halflife/pm_shared/pm_shared.c` 2916-2942. Timers run down by the input's msec.
- `CmdStart` / `CmdEnd`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/client.cpp` 1789-1822. Per-input bracket; stores the seed.
- `UTIL_SharedRandomFloat`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/util.cpp` 112-138.
- `StartFrame`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/client.cpp` 794-804.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Simulate each input for the time it claims: the input carries its own duration, and every movement timer runs down by that duration | `msec * 0.001` seconds per input (theirs, pm_shared.c 2968); no tick rate in the donor's code |
| Clamp the requested velocity to the state's max speed by scaling the whole vector, so direction is kept | Ratio `maxspeed / length` (theirs, pm_shared.c 2868-2869) |
| Slow movement while holding the use key on the ground | One third (theirs, pm_shared.c 2861) |
| Zero all input when the actor cannot act | Frozen, on a train, or dead (theirs, pm_shared.c 2878) |
| Timers clamp at zero after subtracting the input's msec | Clamp at 0 (mechanism; pm_shared.c 2920-2924) |
| One seeded roll per input, the same on both sides | 16 bits of output, scaled to the range (theirs, util.cpp 132-136) |
| Range of the idle roll for a holstered weapon | 10 to 15 (theirs, python.cpp 129) |

Worked check (my arithmetic from the lines above): an input with `msec` 16 and `forwardmove` 400 when `maxspeed` is 320 has length 400, so the ratio is 0.8 and forward becomes 320. Its frametime is 0.016 s, so a step-sound timer of 100 ms drops by 16 to 84 after this input.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one input: speed-ratio clamp, then frozen zeroing, then timers run down by the input's msec, then the move over the same msec. It is a 1-D position stand-in and omits the 3-D move, collision, ladders, water, the duck and swim timers, punch angles, the use-key speed cut (one third), the client max-speed cap, the group-trace bracket (`CmdStart`/`CmdEnd`), `lerp_msec` (declared, not used in the donor), lag compensation, and the engine's tick loop. The seeded roll is a clean-room hash, not the donor's generator, so its values differ from the donor's.

```ts
// Licence: Valve Half-Life 1 SDK (root LICENSE; pm_shared.c header: "All other use, distribution, or modification is prohibited"). Clean-room sketch of the mechanism only.
interface InputCmd {
  msec: number;                  // duration of this input in ms (donor: usercmd_s.msec)
  forward: number;               // requested velocities (donor: forwardmove, sidemove, upmove)
  side: number;
  up: number;
  seed: number;                  // per-input random seed (donor: CmdStart random_seed)
}

interface MoveState {
  maxSpeed: number;
  frozen: boolean;               // frozen, on a train or dead: input is zeroed
  stepSoundMs: number;
  duckMs: number;
  pos: number;                   // 1-D stand-in for the 3-D position
  vel: number;
}

// Shared random: a pure function of the seed, so client prediction and server agree on the result.
function sharedRandom(seed: number, low: number, high: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  const offset = (h & 0xffff) / 65536;
  return low + offset * (high - low);
}

// One input, applied in the donor's order: speed-ratio clamp, frozen zeroing, timers run down by the
// input's own msec, then the move over the same msec.
function applyInput(st: MoveState, cmd: InputCmd): void {
  let f = cmd.forward;
  let s = cmd.side;
  let u = cmd.up;
  const spd = Math.sqrt(f * f + s * s + u * u);
  if (spd !== 0 && spd > st.maxSpeed) {
    const ratio = st.maxSpeed / spd;
    f *= ratio; s *= ratio; u *= ratio;
  }
  if (st.frozen) { f = 0; s = 0; u = 0; }

  const dtS = cmd.msec * 0.001;
  st.stepSoundMs = Math.max(0, st.stepSoundMs - cmd.msec);
  st.duckMs = Math.max(0, st.duckMs - cmd.msec);

  st.vel = f;
  st.pos += st.vel * dtS;
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module: the fixed-step server tick and input intake; each input is applied with the server's own step, never with the client's claimed duration). Parity-checklist row 18, post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget" (the addendum's rule: the server tick has no row of its own).
- Reuse tag: rewrite-from-idea (Valve HL1 SDK licence; clean-room only)
- Brief rule served: server-verified kills (the server applies inputs and decides the outcome; the client's msec and seed are not trusted); one engine (one step function for prediction and server, as `PM_Move` is shared).

Best transferable idea: give each input its own duration and a per-input seed, and run the same move function on client and server, so prediction and the server agree, with the server clamping the input vector (not trusting the claimed time).

## 6. Gaps and risks

- Valve licence: clean-room only. The sketch is written from the described mechanism; do not port the donor lines or the generator.
- The donor's step is variable. Each input carries a client-chosen `msec`, and the server runs movement for that time. In the lines read (pm_shared.c 2837-2972) nothing clamps `msec`; only the speed vector is clamped. Frankendom must run a fixed server step and ignore the client's duration, or clamp it hard. This is the main transfer risk.
- The random seed is supplied with each input (`CmdStart`), so a client can pick its own seed. Shared seeds keep prediction in step but do not stop cheating. For server-verified kills the server must issue or derive the seed (for example from the server tick), and the one ledger must record the roll.
- The donor's `UTIL_SharedRandomFloat` seeds from the bit patterns of float arguments (util.cpp 117), so results depend on float layout. Frankendom's TypeScript should use integer seeds and an explicit hash.
- Lag compensation: the donor's game DLL allows it (client.cpp 1934-1936), but the rewind is in the engine and was not read. Frankendom's rule (kills verified on the server) needs its own rewind rule; do not import the flag as a feature.
- No per-tick NPC budget in this donor: `dlls/monsters.cpp` think scheduling was not read, and the engine loop that calls think is absent. Row 18's sub-line budget has no counterpart here.
- The same msec decrement is repeated in client weapon prediction (`cl_dll/hl/hl_weapons.cpp` 969-974; grep only). Frankendom should keep one timer path (one ledger), not one per client.
- The engine's cvars and tick rate (for example `sv_unlag`, `sys_ticrate`) are not in this donor; the only `sv_unlag` reference is the comment in `engine/eiface.h` 507-508. The `pm_shared.c` copyright header reads 1996-2002.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** none found. Verified: PM_CheckParamters 2837-2880 (clientmaxspeed 2848, 1/3 at 2861, ratio 2868-2869, frozen/train/dead zero 2874+), frametime 2968, PM_ReduceTimers 2920/2928/2936, CmdStart seed 1802, AllowLagCompensation 1934, usercmd msec/lerp_msec, sv_unlag comment eiface.h 508, Valve licence header line 11

**Missed:** UTIL_SharedRandomFloat computes range as unsigned int (high-low), so fractional ranges truncate (and range 0 returns low); note/sketch map to a clean float range and do not mention truncation (util.cpp 112-138)
