# l1j-en-classic (status-effects, SE008)

Donor/Licence: l1j-en-classic, Java server emulator for Lineage 1 (English). Code GNU GPL v2 (COPYING line 1; README.md line 115). README line 84 calls it a clean-room implementation. No client art, sound or models are in the box. Decision: adapt the idea (shape only, clean-room re-expression with our own numbers, no code or table values carried over).

Checked: src/l1j/server/server/model: L1Bleed.java, L1CurseParalysis.java, L1Paralysis.java, L1Character.java (skill-effect setters and poison setter), L1Attack.java (poison proc, resist-fear term, skill adjustment), L1SkillUse.java (shock stun, mass shock stun, bleed trigger, curse paralysis trigger), skill/L1SkillTimer.java, skill/L1SkillTimerTimerImpl.java, skill/executor/L1Panic.java, L1Weakness.java, L1Disease.java, L1WindShackle.java, L1BuffSkillExecutorImpl.java, poison/L1Poison.java, poison/L1DamagePoison.java, poison/L1ParalysisPoison.java; db/l1jdb_m10.sql (skills table header). Confidence: high on the timers, the poison slot, the bleed and shock-stun tables and the telegraph order (read in full). Medium on the curse lockout bug (read the set and kill lines; the killSkillEffectTimer body not read). Searched all 775 Java files for fear, knockback and stagger: no mechanic by those names in the server half.

Best transferable idea: a telegraphed two-step lock (visible windup, then a fixed lock) on one status slot per target, with a weighted random duration table for short stuns and bleeds.

## 1. What the player sees and feels (375 wide)
A curse paralysis starts with a server message to a player (message id 212, text not read) and a poison tint on the target (S_Poison effect 2, sent on curse). That is a windup: the target is not yet locked. Then the paralysis-on packet fires and the target is locked. The lock ends with a paralysis-off packet. For a shock stun, a spawned effect (id 81162) sits on the target for the stun length. A bleed opens with a hindered-movement system message, then the target takes a small hit every second, each with a damage-reaction animation, until a healed message closes it. Poison ticks as a timed flag with a repeating hit. A wind shackle shows a timed icon with seconds on it. Icons and the actual tint art are client-side and not in this box (not read).

## 2. Why it works, or is striking
- Readable beat at 375 wide: the windup then the lock is two beats on one target: a tint, a pause, a hard freeze. That reads on a phone without text.
- One signature behaviour: a short random stun (1, 2, 3 or 4 seconds, weighted) that the target cannot predict. The bleed is a per-second tick that shrinks.
- One signature effect: a spawned effect on the stunned target for exactly the stun length (L1SkillUse.java:2111).
- 20-30 percent resemblance: a curse that tints the target during a windup (8 s for players in the donor, 0 s for monsters), then freezes it for 16 s; our version would shorten both phases. A bleed as a one-second wound pulse.
- Sound: none in the box, so the sound axis is not verifiable here.

## 3. The rule behind it
(a) One status slot per target for poison. A target carrying a poison cannot take another (L1Poison.java:35). A monster cannot poison its own family (L1Poison.java:39-46). Some equipment and one skill block poison outright (L1Poison.java:54-56). The poison proc from an NPC attack is 12 percent per hit (L1Attack.java:1188). The NPC normal poison is a 3,000 ms span with 5 damage (L1Attack.java:1193).
(b) Curse paralysis is a three-phase state: windup flag, then lock, then cure. Windup for players is 8,000 ms and lock 16,000 ms; for monsters windup 0 and lock 16,000 ms (L1SkillUse.java:2057, :2059). It is refused while an earth bind, ice lance, freezing blizzard or freezing breath flag is set (L1SkillUse.java:2054). Re-curse is refused while the windup or the lockout flag is set (L1CurseParalysis.java:120-121).
(c) Poison paralysis: same shape for players only. The windup flag and tint 2 are set in the timer (L1ParalysisPoison.java:50, :53), and the paralysis-on packet fires at lock (L1ParalysisPoison.java:58). An NPC paralytic poison uses a 20,000 ms windup and 45,000 ms lock (L1Attack.java:1200).
(d) Shock stun: a weighted random duration from one draw of 400, in four buckets: 4, 3, 2, 1 seconds, with bucket sizes 65, 125, 130 and 80 (L1SkillUse.java:2101-2108). Mass shock stun uses the same table (L1SkillUse.java:2137-2146). The comments on those lines give percentages that do not match the bucket sizes; the code draw is what counts.
(e) Bleed: one draw of 400 picks 1, 4, 6 or 8 seconds (L1Bleed.java:55-64). Damage is 5 per second (L1Bleed.java:83). Damage is clamped so a bleed never brings HP below one (L1Bleed.java:85-89). A bleed does not stack or refresh while one is active (L1Bleed.java:51). The bleed is started only for player targets (L1SkillUse.java:2132, the cast to L1PcInstance). The comment on the 4-second bucket says 2 seconds (L1Bleed.java:63); the value is 4.
(f) Skill-effect timers tick once per second on a fixed-rate schedule, and the remaining time is whole seconds (L1SkillTimerTimerImpl.java:21, :38-39). On each tick the remaining time drops by one and the effect is removed at zero or below (:27, :29). A 1,500 ms effect therefore lasts one second, which is a granularity defect for short effects.
(g) Refresh rule: a re-application replaces the timer only when the new time is longer than what remains, or the new time is zero (L1Character.java:402, :407). An untimed flag has no timer, so the remaining-time read gives -1 seconds, which fails the "remaining is zero or more" check; no timed effect replaces the flag until the flag is killed (L1Character.java:450-460).
(h) Stat debuffs add straight into the stat fields, with no categories and no caps. Panic: minus 1 to all five stats, removed by adding them back (L1Panic.java:7, :18, :30). Weakness: minus 5 damage and minus 1 hit (L1Weakness.java:6-7). Disease: minus 6 damage and plus 12 to AC (L1Disease.java:6-7, :13). The damage and hit values keep the true sum, and only the used value is clamped to a signed byte (L1Character.java:900-902).
(i) Restore: each buff's remaining time is handed back on login through restoreEffect (L1BuffSkillExecutorImpl.java:10).
(j) Resist fear is a +5 term in a skill-adjustment sum that uncanny dodge and mirror image each take -5 from (L1Attack.java:479-483). The direction of the term was not traced beyond the sum.
(k) Defect, keep the idea: the curse and poison paralysis write a lockout flag and kill it in the same call (L1CurseParalysis.java:82, :84; L1ParalysisPoison.java:74, :75). The lockout that the re-curse check reads (L1CurseParalysis.java:121) is therefore gone at once. Fix: keep the lockout as a timed flag that ends when its own timer ends.
(l) Defect, keep the idea: the windup uses Thread.sleep(_delay) on a pool thread (L1CurseParalysis.java:56). An interrupted windup returns without calling cure() (L1CurseParalysis.java:58-59), so the curse tint and the paralysis object set earlier are not cleared on that path (not traced further). Fix: schedule the lock as a second scheduled step; on interrupt, call cure().
(m) Defect, keep the idea: the bleed comment and the bucket sizes disagree in a few places (L1Bleed.java:63; L1SkillUse.java:2102-2106). Fix: make the table data with the percentages computed from the sizes.

Sketch (typechecked with tsc --strict, es2020):
simplified: the telegraph state machine only. It omits the message sends, the tint, the damage ticks and the family and equipment checks. The donor's windup and lock use thread-pool timers; here each phase is one timestamp check.
```ts
export {};

type Phase = "none" | "windup" | "locked" | "lockout";
type Status = { phase: Phase; untilMs: number };

// Telegraph state machine: windup (visible, no lock), then lock, then a timed lockout that blocks re-application.
export function step(s: Status, nowMs: number, windupMs: number, lockMs: number, lockoutMs: number): Status {
  switch (s.phase) {
    case "none":
      return { phase: "windup", untilMs: nowMs + windupMs };
    case "windup":
      return nowMs >= s.untilMs ? { phase: "locked", untilMs: nowMs + lockMs } : s;
    case "locked":
      return nowMs >= s.untilMs ? { phase: "lockout", untilMs: nowMs + lockoutMs } : s;
    case "lockout":
      return nowMs >= s.untilMs ? { phase: "none", untilMs: 0 } : s;
  }
}

export function canApply(s: Status): boolean {
  return s.phase === "none";
}
```

## 4. For Frankendom
- Shape: the status is server state on the target (one slot), and the client gets only tint, icon and seconds. That matches a server-verified engine and client-only presentation.
- Target file: src/fight/status-effects.ts (proposed new module). Parity row: 1 (duel step and sim).
- Many-vs-one (max 3 attackers): the one-slot-per-target rule holds up with three attackers. Pack members that cannot poison their own family is a direct fit for mobs in a group (L1Poison.java:39-46). The NPC poison chance (12 percent per hit) is a data field, so three attackers do not multiply poison per swing.
- Keep: the telegraphed windup then lock; the weighted short-stun table as data; the per-second bleed with a floor at one HP; one slot per target; the true-sum-then-clamp rule for stat debuffs (L1Character.java:900-902); the untimed flag concept for states that end on an event, not on a clock.
- Change: use a single server tick clock in milliseconds, not whole-second timers (f); timed lockouts that really exist (k); no blocking sleep (l); the stun and bleed tables as data with computed percentages (m); bleed for all targets, not only players (the cast at L1SkillUse.java:2132 limits it to players).

## 5. Five-minute look test (Dom, on a phone)
Debug-only, no release rows. One target, one windup then lock: show a tint for two seconds (windup), then a hard freeze for four seconds, versus an instant four-second freeze. Dom judges whether the windup reads as a warning at 375 wide. Second part: a bleed on one target for eight seconds with a one-per-second tick, judged against a tick every two seconds, for readability and whether the floor at one HP is felt.

## 6. Licence and IP
Code: GPL v2 per COPYING line 1 and README.md line 115. Clean-room statement: README.md line 84. The shape-only rule applies: no code copied, no table values used as data. Our own values only. No content assets in the box. No legal conclusion is drawn.

## 7. Gaps
- Half read: server (src/l1j, db, config). Client half: absent by design (the existing asset audit). No paired donor in this box.
- Data read: db/l1jdb_m10.sql skills table header (CREATE TABLE at line 1772; buffDuration at line 1782) and a count of 440 INSERT statements (statements, not rows). The skill row values were not read. L1SkillId.java holds 278 constants; the status ones were read only by name.
- Not read: L1SkillStop.java (600 lines), L1SilencePoison.java, L1PoisonTrap.java beyond its call at line 52, L1Cube, Earth Bind, Ice Lance and freezing executors, haste and slow paths, mob-skill execution, L1SkillTimerCreator.java (36 lines), the connector zip and tool folder.
- Read and confirmed: killSkillEffectTimer removes the key from the effect map at once (L1Character.java:430-441), which is what makes the lockout defect (k) real.
- Fear: none in the server half read. RESIST_FEAR appears only as a skill-adjustment term (L1Attack.java:482-483). No knockback, knockdown or stagger mechanic in any of the 775 Java files (grep, case-insensitive).
- Idle and ambient behaviour, death and respawn presentation, loot ceremony, walk density: not in these files (not read).
