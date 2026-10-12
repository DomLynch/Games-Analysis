# AAEmu-AAEmu (chat-social-moderation, cell 3)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/CrimeManager.cs` (with Models/Game/Skills/Effects/SpecialEffects/ReportBot.cs and ReportBotExpired.cs, Models/Game/JusticeConfig.cs, Configurations/Justice.json, Core/Packets/C2G/CSSendChatMessagePacket.cs, Models/Game/Chat/ChatChannel.cs, Core/Managers/ChatManager.cs) | Licence: LGPL-3.0 as stated in README.md:33-46 ("GNU Lesser General Public License ... version 3"). Also present at repo root: LICENSE.GPL (GPL v3) and LICENSE.MIT (MIT, "Copyright (c) 2019 Rain0Ash"). The file that covers this code is not clear from the box, so it is treated as copyleft, clean-room | C# | symbol `CrimeManager.ReportBot`

Checked: Read in full: CrimeManager.ReportBot (CrimeManager.cs 387-424) and ReportBotExpired (426-444), the in-memory reporter set (33), Load and Save outlines (48, 85; the set is not referenced by either, per grep), the skill special effect ReportBot.cs 12-60 and ReportBotExpired.cs 11-38, JusticeConfig.cs 9-16, Justice.json 91, ErrorMessageType.cs 555-558 (definitions only; grep found no caller), CSSendChatMessagePacket.cs 13-141, ChatChannel.cs 66-129, ChatManager.cs 426-434. Confidence: high for the report-threshold path (every step above was opened). Medium overall for the verdict: the mechanism is social moderation (player reports of bots), not chat moderation. The donor has no mute, word filter, chat rate limit or chat report; its chat gating is thin: a command-prefix intercept and a cross-faction whisper refusal (see 1(e)). Not read: the buff effects (BuffConstants SuspectedUser and TransformingIntoPrimeSuspect), the skill that calls ReportBot and the one that calls ReportBotExpired, SusManager.LogActivity body (only its signature, SusManager.cs 56), ReportBotArrested (special effect 84), TrialData and TrialManager sentencing, and whether two threads can call ReportBot at once. camera_scope: not a camera cell.

Best transferable idea: count distinct reporters per suspect (a set, so one player counts once), turn the suspect into a prime suspect at a fixed count, and keep each report as a row with its reason.
Decision (proposed): adapt - take the distinct-reporter threshold and the tiered suspect state; store the reporter set and the reason as rows (the donor keeps the set in memory and only logs the reason); enforce a per-reporter daily cap (the donor defines the error code and never raises it).
Acceptance: five different players report one player and the suspect state turns on at the fifth; a sixth report from player 1 is refused as a duplicate; after a server restart the same five rows exist and the state is rebuilt from them.

## 1. Mechanism

Shape: a player-filed report against a player, counted by distinct reporter, with a fixed threshold that changes the suspect's state. The report arrives as a skill special effect, not a chat command.

Order of steps, as the code runs:

(a) Entry. The ReportBot special effect (ReportBot.cs 12-60). Only a Character caster counts (25-33). The target must be a unit that resolves to a Character (37-44). The reason text is the skill text object's Msg (46). A failed report is logged as a warning and does nothing else (48-52). A success broadcasts a packet naming reporter and suspect (54).

(b) Dedupe and count, CrimeManager.ReportBot (387-424):
- The suspect's reporter set is created on first use (389-393).
- `reportedSuspectList.Add(reporter.Id)` returns false if the reporter already reported this suspect; the function then returns false (395, 421-423). One reporter counts once.
- On a new reporter: the report is logged with the reason text (397).
- The suspect gets the SuspectedUser buff once, sourced from the reporter (400-403).
- When the set count reaches BotReportPrimeSuspectCount (406), the suspect gets TransformingIntoPrimeSuspect unless the TagSuspects buff is already present (408-411). The threshold is logged once, when the count equals it (413-416).
- The reporter's BotReportedCount and the suspect's ReportedAsBotCount are incremented (418-419). Both are stored on the character row (Character.cs 2285, 2417 read; 2744-2745 write).

(c) Clear, CrimeManager.ReportBotExpired (426-444): with no set, return true (428-430). If the suspect has the TagSuspects buff, remove the bad buffs with that tag, clear the reporter set (434-437), log, return true (438-439). Otherwise return false (442-443). The ReportBotExpired special effect calls this (ReportBotExpired.cs 34).

(d) Numbers. Threshold 5 (JusticeConfig.cs:15 default; Justice.json:91). Error codes for "already reported by you" (570), "already reported by other" (571), "cannot report bot" (572) and "exceeded daily limit" (573) are defined (ErrorMessageType.cs 555-558). No caller raises any of them (grep).

(e) Chat-adjacent part, for completeness. Chat channels are routed by key (ChatManager.cs 26 and following; GetTrialChat 426-433). A channel is created on first use and holds a member list (ChatChannel.cs 66-83 join, 118-129 send). The judge chat branch of the chat packet (CSSendChatMessagePacket.cs 134-135) sends to the court channel with no check that the sender is a member (ChatChannel.SendMessage 118-129 has no membership test). The 'need a check so only defendant and jury can talk' TODO at 120-127 sits inside a commented-out old Judge case (a /* */ block using GetNationChat), so it is dead code, not a comment on the live branch. Chat rules that do exist in the same packet file: a message starting with the command prefix is handed to CommandManager first (26-30), and a whisper to a player of another faction is refused with ChatCannotWhisperToHostile (42-46, with a 'proper hostile check' TODO). No mute, word filter, rate limit or chat report was found in the donor.

## 2. Key functions

- CrimeManager.ReportBot: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/CrimeManager.cs` 387-424.
- CrimeManager.ReportBotExpired: same file, 426-444.
- ReportBot special effect: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Skills/Effects/SpecialEffects/ReportBot.cs` 12-60.
- ReportBotExpired special effect: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Skills/Effects/SpecialEffects/ReportBotExpired.cs` 11-38.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (file:line) |
|---|---|
| Distinct reporter set per suspect (one reporter counts once) | HashSet add result (CrimeManager.cs 395) |
| Prime suspect at a fixed distinct count | 5 (JusticeConfig.cs 15; Justice.json 91) |
| First report gives a light suspect buff | SuspectedUser, once (CrimeManager.cs 400-403) |
| Threshold gives a heavier suspect buff | TransformingIntoPrimeSuspect (410), unless TagSuspects (408) |
| Reporter and suspect counters | +1 each, persisted (418-419; Character.cs 2744-2745) |
| Clear only when prime | TagSuspects check (434), set cleared (437) |
| Daily report cap | not in donor: error 573 defined (ErrorMessageType.cs 558), never raised |
| Reason text | TODO at ReportBot.cs 35 "Where does it save the reported message?"; only logged (CrimeManager.cs 397) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's core (a set of distinct reporters per suspect, a fixed prime threshold, a clear path). It adds what the donor lacks: a rebuild from persisted rows (the donor's set is memory only, CrimeManager.cs:33), a stored reason row (donor has a TODO at ReportBot.cs:35), a self-report refusal, and an enforced per-reporter daily cap (donor defines the code, never raises it). It omits the buffs themselves, the broadcast packet, the expiry clear by a judge, the SusManager log and the arrest step. The daily cap value of 5 and the 120-character reason limit are our choices, not donor values.

```ts
// Licence: LGPL-3.0 per README (donor). Clean-room sketch written from the described mechanism (a per-suspect set of distinct reporters, a prime-suspect threshold, a reason row), not a translation of the donor lines.
// Frankendom fix: the reporter set is rebuilt from persisted report rows (donor keeps it in memory only), the reason text is stored as a row (donor has a TODO for this), a self-report is refused, and a per-reporter daily cap is enforced (donor defines the error codes but never raises them).

export interface ReportRow {
  suspectId: number;
  reporterId: number;
  reason: string;
  atMs: number;
}

interface SuspectState {
  reporters: Set<number>;
  prime: boolean;
}

// Data fields: prime threshold 5 (donor Justice.json:91, JusticeConfig.cs:15); daily cap is a Frankendom choice, not a donor value.
const PRIME_SUSPECT_COUNT = 5;
const DAILY_REPORT_CAP = 5;
const REASON_MAX_CHARS = 120;

export type ReportOutcome =
  | { ok: true; distinctReporters: number; prime: boolean }
  | { ok: false; why: "self" | "duplicate" | "daily-cap" };

// Rebuild the in-memory view from rows (called at load time, so a restart keeps every report).
export function rebuildSuspects(rows: ReadonlyArray<ReportRow>): Map<number, SuspectState> {
  const map = new Map<number, SuspectState>();
  for (const r of rows) {
    let s = map.get(r.suspectId);
    if (!s) {
      s = { reporters: new Set<number>(), prime: false };
      map.set(r.suspectId, s);
    }
    s.reporters.add(r.reporterId);
    if (s.reporters.size >= PRIME_SUSPECT_COUNT) s.prime = true;
  }
  return map;
}

export function fileReport(
  suspects: Map<number, SuspectState>,
  rows: ReportRow[],
  suspectId: number,
  reporterId: number,
  reason: string,
  nowMs: number,
  reporterReportsToday: number,
): ReportOutcome {
  if (suspectId === reporterId) return { ok: false, why: "self" };
  if (reporterReportsToday >= DAILY_REPORT_CAP) return { ok: false, why: "daily-cap" };

  let s = suspects.get(suspectId);
  if (!s) {
    s = { reporters: new Set<number>(), prime: false };
    suspects.set(suspectId, s);
  }
  if (s.reporters.has(reporterId)) return { ok: false, why: "duplicate" };

  s.reporters.add(reporterId);
  rows.push({ suspectId, reporterId, reason: reason.slice(0, REASON_MAX_CHARS), atMs: nowMs });
  if (s.reporters.size >= PRIME_SUSPECT_COUNT) s.prime = true;
  return { ok: true, distinctReporters: s.reporters.size, prime: s.prime };
}

export {};
```

## 5. Lands in

- TARGET `origins/server/moderation-reports.ts` (new module): report intake (server-side, through the writer), distinct-reporter threshold, reason rows, daily cap, suspect state rebuilt from rows at load. Parity-checklist row 5 (controls/input, intake): the report arrives as a player action. No parity row covers moderation; see ruling 3 in the rAthena note.
- today: not checked (no Frankendom report code was opened for this pass).
- Reuse tag: rewrite-from-idea (LGPL-3.0 per README; clean-room only)
- Brief rule served: rule 8 (target and parity row named); CT ruling 2026-10-12 (report path with a reason row; mute and ban tiers; one character and one ledger).

## 6. Gaps and risks

- Reporter set is memory only. ReportedSuspects (CrimeManager.cs:33) is not referenced by Load (48) or Save (85), and grep found no other use of the field. The counters survive a restart (Character.cs 2285, 2417 read; 2744-2745 write), but the set does not. After a restart the threshold and the prime state are lost. Fix: rebuild from report rows (sketch).
- Reason is not stored. ReportBot.cs:35 is a TODO asking where the message is saved. The text reaches only the log line at CrimeManager.cs:397 (SusManager.LogActivity, body not read). Fix: a row with a reason code and a note of up to 120 characters.
- Daily cap not enforced. The four bot-report error codes (ErrorMessageType.cs 555-558) have no caller. A reporter can file against any number of suspects per day, and a failed report is only a server warning (ReportBot.cs 48-52), with no message to the player. Fix: enforce a cap and tell the player.
- Self-report not refused in the code path read (CrimeManager.cs 387-395 does not compare ids). The skill may prevent it; the skill was not read.
- No reporter reputation. CrimeKind.cs:11 defines FalseBotReport and nothing in the report path raises it. Frankendom should count false reports against the reporter (not read further).
- Clear by judge. The log text at CrimeManager.cs:438 says a suspect clears "by talking to a judge", but the code clears on the ReportBotExpired special effect (ReportBotExpired.cs 34). The skill that fires it was not traced. Fix: a moderator action that writes a row.
- Concurrency. The reporter set is a HashSet inside a ConcurrentDictionary (CrimeManager.cs 33). The dictionary is thread-safe, but the set is not, and whether two threads can reach ReportBot was not checked.
- Chat route. The judge chat sends without a membership check (CSSendChatMessagePacket.cs 134-135; ChatChannel.cs 118-129; the TODO at 120-127 is in dead commented-out code). Also ChatManager.GetTrialChat (432-433) dereferences `trial.CourtRegion` where GetParticipatingTrial (TrialManager.cs 1003) can return null, so a non-participant sending Judge chat can hit a null reference. Fix: null-check and refuse. This is outside the report mechanism. Frankendom's chat gate should check membership on send.
- LGPL-3.0 (README), with GPL and MIT files also present. Clean-room only.

Reuse tag: rewrite-from-idea (LGPL-3.0 per README; clean-room only)
Brief rule served: rule 8 (target and parity row named); CT ruling 2026-10-12 (report path with a reason row, mute and ban tiers).

As-data shape (PASS2 1):
- The donor has no table for reports. The state is an in-memory set (CrimeManager.cs:33) plus two counters on the character row (Character.cs 2285-2417, 2744-2745). Threshold is a config value (Justice.json:91, JusticeConfig.cs:15). Buffs are rows in the buff system (BuffConstants, not read).
- Row fields as the donor would express them: `report: {suspectId, reporterId, reasonCode, note(120), atMs}`; `suspect: {id, primeFlag, distinctReporters}`; config `justice.primeSuspectCount: int`.
- A new reason code is one row: yes, if a reason table is added (the donor has none, the text is free).
- A new prime threshold for one zone is one row: yes, if moved from the global JusticeConfig to zone data (the donor has it global, Justice.json:91).

Provenance per claim: every receipt in receipts.tsv names the donor file and line. Licence as stated in the Licensing section above.

What they patched later: no history available (no .git directory in /mnt/frankendom-donors/AAEmu-AAEmu). Hidden rules in comments: the TODO at ReportBot.cs:35; the "possible multiple reports" warning at ReportBot.cs:50 (shows the duplicate case is expected); the "talking to a judge" clear log at CrimeManager.cs:438.

Rulings for Dom:
1. Should a report need a reason from a fixed list? Recommend: yes, a reason code from a short fixed list, plus an optional 120-character note stored as a row.
2. Should one reporter count once per suspect forever, or again after a window? Recommend: once per suspect until a moderator closes the case, so a player cannot re-file to reach the threshold.
3. Who clears a prime suspect: a judge NPC conversation (donor's log wording) or a moderator action that writes a row? Recommend: a moderator action with a row, because a self-clear cannot be audited.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- The cited 'code comment at 122' is inside a /* */ commented-out old Judge case (lines 120-127); the live case (134-135) has no such comment. The no-membership-check claim on ChatChannel.SendMessage is still true.
- Missed: whisper refused across factions (CSSendChatMessagePacket.cs 42-46, ChatCannotWhisperToHostile) and command-prefix interception (26-30); note said the donor has no chat gating at all.
- Missed defect: ChatManager.GetTrialChat 432-433 dereferences a possibly null trial (NRE for a non-participant sending Judge chat).
- Everything else verified (CrimeManager.ReportBot/Expired lines, JusticeConfig, Justice.json, error codes, Character.cs, licence, as-data shape, no history).

Fixed 2026-10-12: Mechanism 1(e) and Checked header now describe the real chat gating and drop the dead-code comment cite; Gaps chat-route line corrected and null-dereference defect added (keep the report mechanism). No TypeScript changed.
