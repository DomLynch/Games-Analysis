
## 5. Lands in

- TARGET `origins/client/actor/clip-channel.ts` (new file, client only). Parity-checklist row 6 (hero actor/animation); creature clips use the same channel under row 7. The channel never decides damage or hit frames.
- today: no clip channel is named in the rulings. The current hero animation code was not read in this pass.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients: the clip is presentation, the hit window is engine data); row 6.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism; no donor line is translated.
- Clip timing must not decide hits. The donor has no hit windows; it is a render-side player. Frankendom takes hit frames from the engine duel step (row 1, row 10) and only presents them. Kills stay server-verified.
- No cross-fade in the donor. The transition time is read from the file and never used, so a blend between clips is not in this code. Frankendom needs its own blend, not in this pass.
- One-tick hold: when a timed clip ends and the idle roll repeats the current idle, the channel returns without sampling (animationchannel.cpp:143-146), so the previous pose holds for one tick (traced, not run). Frankendom should sample the idle in that tick.
- Idle roll is random per client. Idle variety is cosmetic only, and it must come from a seeded RNG per actor so a replay (row 19) shows the same idle sequence. The donor uses a global RNG.
- Speed and length are playback multipliers. A speed of 0.5 doubles the real time of a clip (length / speed), so an attack's real duration is not a fixed number. The engine must read timing from its own data.
- Distance throttle: the result is a uint8 with no clamp (animationthread.cpp:166-167; animationthread.h:75). Above 255 the float-to-uint8 conversion is out of range, which is undefined behaviour in C++ (distance above about 2040 units). Frankendom must clamp. The throttle must never skip the hero or the three Pit attackers (MAX_ATTACKERS = 3), and it must keep the dt carry.
- Stale bone inverse: the bone matrix uses the base inverse from the previous call (modelnode.cpp:1053-1054). It is harmless while the bind pose is static, but the first call uses whatever value was there. Frankendom should compute bind inverses once at load.
- Efficiency: the whole node tree is recomputed once per skinned node (skeletalanimation.cpp:58), and the base transform is multiplied inside the per-bone loop (skeletalanimation.cpp:126). Frankendom should recompute once per frame and cap the bone count per vertex.
- The GR2 hint file (gr2file.cpp) reads the bind-pose skeleton (line 302) and leaves animations as "TODO" (line 210). It gives no runtime to reuse.
- Not read: the skin-mesh build in model_kotor.cpp (only the grep hit at 411-413), `setBufferedPosition`, the body of `flushNodeBuffers`, and the KotOR head-channel behaviour beyond the grep.
