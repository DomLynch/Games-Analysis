# ModernUO (chat-social-moderation, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Help/PageQueue.cs` | Licence: GPL-3.0 (ModernUO `LICENSE`: "Version 3, 29 June 2007"; copyleft, clean-room, shape only) | C# | symbol `PageQueue.Enqueue` (with `PageEntry` constructor and `SpeechLog`)

Checked: Read in full: `Engines/Help/PageQueue.cs` (report queue and `PageEntry`), `Engines/Help/SpeechLog.cs` (rolling heard-line log and staff view), and the chat engine `Engines/Chat/` (`Channel.cs`, `ChatUser.cs`, `ChatActionHandlers.cs`, `ChatPackets.cs`, `ChatActionHandler.cs`, `Chat.cs`). Read in part: `Engines/Help/HelpGump.cs` 236-262, `Engines/Help/SpeechLogGump.cs` 10-31 (constructors only), `Mobiles/PlayerMobile.cs` 4143-4153, `Server/Mobiles/Mobile.cs` 6945-6960, `Misc/PacketThrottles.cs`, `Server/Network/NetState/NetState.cs` 1100-1125 and 1225-1250, `NetState.Network.cs` 706-736, `Server/Main.cs` 722-734. Filters read: `Misc/ProfanityProtection.cs`, `Misc/NameVerification.cs` (full). Not read: `PageDiscord.cs`, `PageQueueGump.cs`, `PagePrompt*.cs`, the body of `SpeechLogGump`, the `Email.cs` send path beyond the log loop, and what dispatches `OnSpeech`. Grep confirmed `.Clean()` has no caller outside `SpeechLog` itself. Confidence: high on the report flow and on the stale-line defect (read end to end, and checked by grep); medium on the throttle detail (not run). Not run as a program. Camera scope: not applicable.

Best transferable idea: A report should carry the reporter's own server-stamped window of heard lines, copied at filing time, attached only to harassment reports, with one open report per reporter.
Decision (proposed): adapt — keep the filing-time copy, the harassment-only attachment and the one-open-report guard; write the report as a row through the writer (one ledger); prune before copying; drop the email and Discord copies of the transcript.
Acceptance: A player files a verbal-harassment report; the server attaches only the lines it stored for that player in the last 20 minutes (server timestamps, not client-supplied); a second open report by the same player is refused with a message; a stuck report carries no attachment.

## 1. Mechanism

- Heard-line log. Each `PlayerMobile` with a live connection appends speech it receives to its own `SpeechLog` (`PlayerMobile.cs` 4145-4152). The log is created on first use. It is a queue of `(speaker, text, created time)`. It is limited by time, not count: `MaxLength = 0` means no count cap (`SpeechLog.cs` 17, 20).
- Expiry. `Clean()` drops entries older than `EntryDuration` (20 minutes) from the front of the queue (`SpeechLog.cs` 63-78). `Add` is the only caller of `Clean()` in the donor (`SpeechLog.cs` 58); nothing prunes on read.
- Filing. The `PageEntry` constructor stamps the time and location, then copies the sender's whole log into the entry, but only when the page type is in `SpeechLogAttachment`, which is `VerbalHarassment` alone (`PageQueue.cs` 25-28, 34-46). Other page types get a null log. The constructor starts a status timer.
- Guards before filing. A squelched-for-paging player is refused (`PageQueue.cs` 147-151). A player who already has an open page gets a menu instead of a new form (`HelpGump.cs` 246-248), because `PageQueue` keys open pages by sender.
- Queue. `Enqueue` appends to the list and to the sender-keyed dictionary (`PageQueue.cs` 247-250). It notifies staff who have auto-notify on. A staff member counts as online if they moved in the last 600000 ms (`PageQueue.cs` 263). With no staff online, the sender is told to wait (269-274).
- Status ping. Each entry's timer fires once after 1 s, then every 2 minutes (`PageQueue.cs` 85-89). It tells the sender the queue position and, if a handler is set and disconnected, clears the handler.
- Side channels. A harassment page with a log sends the log by email (`PageQueue.cs` 276-279, `Email.cs` 55-75) and posts to Discord (281). Removal on handled or cancelled happens in `Remove` (211-234).
- Staff review. A staff member targets a player and gets the log unless the viewer is neither the player nor Owner and is not above the player's access level (`SpeechLog.cs` 97: the refusal branch). Each view is written to the command log (121-124). The gump copies the queue as it is (`SpeechLogGump.cs` 19).

## 2. Key functions

- `PageEntry` constructor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Help/PageQueue.cs` 34-50. Snapshot-at-filing and timer start.
- `PageQueue.Enqueue`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Help/PageQueue.cs` 247-284. Queue add, staff notify, email and Discord.
- `SpeechLog.Add` and `Clean`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Help/SpeechLog.cs` 46-78. Append, then drop expired entries from the front.
- `PlayerMobile.OnSpeech`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/PlayerMobile.cs` 4143-4153. Per-listener append (the dispatch that calls it was not read).
- Submit guard: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Help/HelpGump.cs` 241-250.

## 3. Numbers vs mechanism

| Item | Donor value | Where |
|---|---|---|
| Heard-line retention | 20 min (`TimeSpan.FromMinutes(20.0)`) | `SpeechLog.cs` 17 |
| Count cap on log | none (`MaxLength = 0`) | `SpeechLog.cs` 20 |
| Log attached to report | `VerbalHarassment` only | `PageQueue.cs` 25-28, 43 |
| Staff counted online | last move under 600000 ms (10 min) | `PageQueue.cs` 263 |
| Status ping | first at 1 s, then every 2 min | `PageQueue.cs` 85 |
| Speech packet throttle (defaults) | 25 ms for 0xAD (and 0x03); chat window packet 0xB3 is not in the defaults | `PacketThrottles.cs` 43 |
| Rename request throttle | 500 ms | `PacketThrottles.cs` 45 |
| Player name | length 2-16, letters only, one exception character (space, dash, period, quote), never at the start, never two in a row | `NameVerification.cs` 106, `ContainsExceptions` 209-254 |
| Disallowed word match | whole word: no letter or digit directly before or after | `NameVerification.cs` 262, 275 |

The name rule is a write-time check: at character creation (`CharacterCreation.cs` 421) and at name change (`NameChangeDeed.cs` 91, call site only, not read in full). The speech filter (`ProfanityProtection.cs` 142-144) runs on the speech event, and a detected word is blocked (`Disallow`) or leads to another action chosen in config (`ProfanityProtection.cs` 23).

## 4. TypeScript sketch

simplified: keeps the rolling window, the copy taken at filing, the harassment-only attachment and the one-open-report guard. It omits the queue-position ping, the staff-online check, the handler assignment, the squelch and paging checks, the email and Discord copies, and the access-level staff view. It reorders one step on purpose: the snapshot prunes before it copies (the donor copies without pruning, see section 6).

```ts
// Licence: GPL-3.0 (donor, ModernUO). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Shape only: a player's heard-line window, copied into a report at filing time, attached only to harassment reports.
export const WINDOW_MS = 20 * 60 * 1000; // data: retention window (donor EntryDuration 20 min)

export interface HeardLine { speakerId: string; text: string; atMs: number; }

export class HeardWindow {
  private lines: HeardLine[] = [];

  add(line: HeardLine): void {
    this.lines.push(line);
    this.prune(line.atMs);
  }

  // Fix for the donor defect: prune before any read, so a copy never carries lines older than the window.
  snapshot(nowMs: number): HeardLine[] {
    this.prune(nowMs);
    return this.lines.slice();
  }

  private prune(nowMs: number): void {
    while (this.lines.length > 0 && nowMs - this.lines[0].atMs > WINDOW_MS) {
      this.lines.shift();
    }
  }
}

export type ReportKind = 'verbal-harassment' | 'physical-harassment' | 'bug' | 'stuck' | 'other';

export interface Report {
  reporterId: string;
  kind: ReportKind;
  note: string;
  evidence: HeardLine[] | null;
  atMs: number;
}

const openByReporter = new Map<string, Report>();

// One open report per reporter. Evidence is attached only for harassment kinds that need it.
export function fileReport(
  reporterId: string, kind: ReportKind, note: string, heard: HeardWindow, nowMs: number
): Report | 'already-open' {
  if (openByReporter.has(reporterId)) {
    return 'already-open';
  }

  const evidence = kind === 'verbal-harassment' ? heard.snapshot(nowMs) : null;
  const report: Report = { reporterId, kind, note, evidence, atMs: nowMs };
  openByReporter.set(reporterId, report);
  return report;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/ct001-modernuo-report-snapshot.ts`).

## 5. Lands in

- TARGET `origins/server/chat-report.ts` (new). Holds the per-player heard window and the report row. Heard lines reach the window through the writer (the presence-message path from Strategy's additions), never a direct database write.
- Parity-checklist row 19 (fight record / replay: a bounded, server-kept record of recent events). This is the nearest row, a loose fit. No row of 1-23 covers chat; Strategy should decide whether chat gets its own row.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only).
- Brief rule served: server-verified (the evidence is stamped and kept by the server, not supplied by the client) and one ledger (the report is one row written through the writer).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- Defect, confirmed by reading and grep: stale lines can be filed or shown. `Clean()` runs only inside `Add`, so if a player says nothing for a while, older lines stay. The filing-time copy (`PageQueue.cs` 45) and the staff view copy (`SpeechLogGump.cs` 19) both take the queue without pruning. Fix: prune before every copy (the sketch does this in `snapshot`).
- Defect, not run: the whisper parser (`ChatActionHandlers.cs` 87-89) slices the parameter at the first space, and that index is -1 when there is none. Fix: check for -1 and send the usage message.
- Side channels (email, Discord) move transcripts off the server. Reject for Frankendom: privacy, and it breaks the one-ledger rule.
- The donor records what a player heard, including other players' lines. Frankendom should define a report as "what the reporter saw" and say so in the report row.
- Storage is in memory on the player object. Whether ModernUO persists `SpeechLog` was not read. Frankendom would store the window as rows with a time-to-live, not as player state.
- The donor's squelch is a single flag with no duration or tier (`Mobile.cs` 6952-6960). The timed mute in the TrinityCore note covers that gap.
- The report row should carry the reporter's zone, position and time (the donor stores location and map on the entry, `PageQueue.cs` 40-41), so staff can place the evidence.
