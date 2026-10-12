# swgemu-Core3 (chat-social-moderation, cell 3)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/name/NameManager.cpp` (with `RegexData.h`, data in `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/bin/scripts/managers/name/name_manager.lua`) | Licence: GNU Affero General Public License v3 (read from `/mnt/frankendom-donors/swgemu-Core3/COPYING`, "GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007") | C++ (plus Lua data) | symbol `NameManager::checkNamingFilter`

Checked: Read in full: NameManager.cpp 227-290 (isProfane and checkNamingFilter), 190-216 (table loader), 597-625 (resource-name retry loop), 452-457 (chat room name check, in part), 477-490 (ship name check, in part); ChatManagerImplementation.cpp 158-200 (spatial distance loader, in part), 702-758 (room message path), 1116-1135 (range and space multiplier), 1170-1200 (imperial keyword fine, in part), 1406-1459 (spatial chat handler), 1596-1625 (instant message mute gate, in part), 1722-1760 (friend presence, in part); ChatRoomImplementation.cpp 158-217 (room broadcast with ignore check); IgnoreList.h, PlayerList.h 1-80, PlayerObjectImplementation.cpp 1598-1624 and 3706-3712, AddIgnoreCommand.h (full), FreezePlayerCommand.h 20-100, UnfreezePlayerCommand.h 40-80, ReportCommand.h (full). Data: name_manager.lua lines 1-32 and 879-890 read; the 1,479 pattern lines counted by grep (not read line by line). Confidence: high on the name-filter control flow and the chat-side facts (read); medium on the over-matching claim for plain rows (it follows from `std::regex_search` semantics, not tested on a name). Not read: RegexData.h beyond line 16, the species and resource tables in the Lua file, the spatial chat type data (`chat/spatial_chat_types.iff` is not in the donor's bin, so per-type distances are not read), the rest of the IM and tell paths. Depth: full for the name-filter path; the chat-side findings come from grep and partial reads (thin).

Best transferable idea: a write-time name blocklist kept as data (one ordered list of {pattern, reason class} rows, compiled case-insensitively, first match wins) where a class argument lets one table answer "profane?", "developer?" and "fiction?" and a bounded retry generates clean random names.
Decision (proposed): adapt - Frankendom already rules a write-time display-name blocklist (TOPICS-FOCUS5 CT line), so keep rows-as-data, reason classes, class selection and first-match; add a word-boundary rule for short plain patterns, and check the final generated name instead of returning the last one unchecked.
Acceptance: Loading the table rejects a plain `dev` row with no word boundary; with the row written as a boundary pattern, a character named `Devon` is accepted and `Dev Team` is declined with the developer reason; a generated name that still matches a profane row is never returned (the generator returns nothing and the UI asks for another name).

## 1. Mechanism

- Data: the table is a Lua table (name chosen by config `Core3.NameManager.FilterTable`, default `oldFilterWords`, NameManager.cpp 192). Each row is `{ pattern, reason }` (name_manager.lua 879-890; the reason names are defined at lines 3-6: DECLINED_DEVELOPER = 1, DECLINED_FICT_RESERVED = 2, DECLINED_PROFANE = 3, DECLINED_RESERVED = 6).
- Load (NameManager.cpp 194-216): rows are read in table order. Each pattern string and reason int is read (204-205), wrapped in a RegexData (211) and appended to the list (213). Order is preserved, so earlier rows win.
- Compile (RegexData.h 16): every pattern is compiled with `std::regex_constants::icase`, so the match is case-insensitive.
- Check (checkNamingFilter, NameManager.cpp 243-290): the loop walks the list in order (251). A caller can pass a result class; when that class is above 0, rows of any other class are skipped (268). The first row whose regex matches the name sets the result to that row's class and stops (277-283). No match returns ACCEPTED.
- Callers: `isProfane` is `checkNamingFilter(name, DECLINED_PROFANE) != ACCEPTED` (227-229). `isDeveloper`, `isFiction` and `isReserved` are the same with another class (231-241). Chat room names reject profane names first (452-453). Room titles and persistent paths are checked for profanity in ChatManagerImplementation.cpp 2235 and 2239. Random resource names are retried while profane (613-622).

## 2. Key functions

- `NameManager::checkNamingFilter`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/name/NameManager.cpp` 243-290. Ordered regex scan with class selection.
- `NameManager::isProfane`: same file, 227-229. Class-selected check.
- Loader: same file, 190-216. Reads the Lua table into RegexData rows.
- `NameManager::generateResourceName`: same file, 597-625. Retry loop with a limit of 10.
- `RegexData` constructor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/name/RegexData.h` 16. icase compile.

## 3. Numbers vs mechanism

| Rule | Donor value | Where |
|---|---|---|
| Reason classes | developer 1, fiction 2, profane 3, reserved 6 | name_manager.lua 3-6 |
| Rows in the table | 1,479 pattern lines in the file (grep count); about 567 tagged profane, 764 fiction, 129 reserved, 19 developer (grep counts minus the 4 constant-definition lines; the file also holds other tables) | name_manager.lua (grep) |
| Rows with a word boundary | 823 of 1,479 (grep count of `\\b` in the pattern) | name_manager.lua (grep) |
| Plain rows with no word boundary | 656 of 1,479 (grep count); examples `dev` (880), `ct` (886), `mod` (887) | name_manager.lua 880, 886, 887 |
| Case sensitivity | icase on every row | RegexData.h 16 |
| Retry limit for a generated name | 10 tries, then the last name is returned unchecked | NameManager.cpp 614, 618-624 |
| Chat room name length | strspn character set plus the profane check | NameManager.cpp 452-457 |
| Spatial chat default range | read from the spatial table, default entry (value not read) | ChatManagerImplementation.cpp 196, 1119 |
| Spatial chat per-type range | override from the table if not -1 | ChatManagerImplementation.cpp 1120-1123 |
| Space zone range multiplier | 20 | ChatManager.idl 112; ChatManagerImplementation.cpp 1127-1128 |
| Instant and spatial message limit | 255 characters | ChatManager.idl 99; ChatManagerImplementation.cpp 1438 |
| Imperial keyword reaction | keyword `jedi`, within 20 m (squared distance 400), once per 5 s per speaker | ChatManagerImplementation.cpp 1181-1194 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: rows loaded in list order, compiled case-insensitively, a class argument that skips other classes, the first match wins, and a profanity helper that calls the class-selected check. It differs in three places. (1) It rejects a plain row shorter than 4 characters that has no word boundary at load time, which the donor does not do. Longer plain rows are left as they are, so that is a partial fix. (2) It returns null from the random-name loop after the tries run out, where the donor returns the last name unchecked (NameManager.cpp 618-624). (3) It uses JavaScript RegExp in place of std::regex, which has the same first-match behaviour here. It omits the strspn character checks, the length limits, the vendor, ship and resource validators, the species and resource name tables, the Discord-free logging and the Lua loader. The chat-side handlers (room message, spatial chat, instant message, freeze) are described in section 1 and are not in the sketch.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

// Reason classes (donor name_manager.lua lines 3-6).
export const ACCEPTED = 0;
export const DEVELOPER = 1;
export const FICTION = 2;
export const PROFANE = 3;
export const RESERVED = 6;

export interface FilterRow { pattern: string; reason: number; }
export interface CompiledRow { re: RegExp; reason: number; }

// Load-time check (fix): a short plain pattern with no word boundary matches inside longer names.
// The rule only rejects plain patterns under 4 characters. The donor has 656 plain lines of 1,479 (section 6);
// longer plain lines are left as they are here, and that is a gap, not a fix.
export function compileRows(rows: FilterRow[]): CompiledRow[] {
  return rows.map((r) => {
    if (!r.pattern.includes('\\b') && r.pattern.length < 4) {
      throw new Error(`filter row "${r.pattern}" needs a word boundary`);
    }
    // Case-insensitive, as donor RegexData.h line 16 compiles every row with icase.
    return { re: new RegExp(r.pattern, 'i'), reason: r.reason };
  });
}

// First match wins. resultClass 0 checks every row; any other value checks only rows of that class
// (donor NameManager.cpp checkNamingFilter 251-284).
export function checkName(name: string, rows: CompiledRow[], resultClass = 0): number {
  for (const row of rows) {
    if (resultClass > 0 && row.reason !== resultClass) continue;
    if (row.re.test(name)) return row.reason;
  }
  return ACCEPTED;
}

export function isProfane(name: string, rows: CompiledRow[]): boolean {
  return checkName(name, rows, PROFANE) !== ACCEPTED;
}

// Generate-until-clean for a random name (donor loop NameManager.cpp 613-624), with the fix that the
// final result is checked: after maxTries the function returns null, not an unchecked name.
export function generateClean(gen: () => string, rows: CompiledRow[], maxTries = 10): string | null {
  for (let i = 0; i < maxTries; i++) {
    const candidate = gen();
    if (candidate.length > 0 && !isProfane(candidate, rows)) return candidate;
  }
  return null;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/ct005-core3-name-filter.ts` (copy of `/private/tmp/p2/wave2-haiku/batch3/CT005/work/core3-name-filter.ts`): exit 0.

## 5. Lands in

- TARGET `origins/server/name-filter.ts` (new; the write-time name and room-title check on the server, used by character creation and room creation). Not in src/fight.
- Parity row 5 (controls/input; the intake sub-line, since a name is checked when it is submitted). The task hint "35" is the category number, not a parity row; the addendum's rows run 1-23 and none covers chat or names. Strategy should confirm row 5 or add one.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: display names are a write-time blocklist (TOPICS-FOCUS5 CT ruling); server-side only.

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism.
- Defect (unchecked generated name): `generateResourceName` leaves its loop after 10 failed tries and returns the last generated name without checking it (NameManager.cpp 613-624). A profane name can be returned. Fix: return nothing and retry on the caller's side (sketch `generateClean`).
- Defect (plain rows over-match): 656 of 1,479 rows have no word boundary (name_manager.lua 880, 886, 887 are examples). By the semantics of `regex_search`, a plain `dev`, `ct` or `mod` row matches inside longer names. This was not tested on a live name. Fix: require a boundary on every short row (sketch rule covers only rows under 4 characters).
- Gap (no chat text filter): the chat side has no profanity filter for messages. `isProfane` is called for room titles and paths (ChatManagerImplementation.cpp 2235, 2239), for a sui text callback (AdBarkingPhraseSuiCallback.h 85), for names, for the squad-leader free-text commands (SetWarcry, SetFormup, SetRetreat, SetIntimidate, SetSteadyaim, SetBoostmorale, SquadLeader) and NameStructureCommand. So free text is filtered on several command paths; only public chat is not. The room message path (702-758) and the spatial chat path (1406-1459) do not call it.
- Gap (report is a stub): `/report` is registered (CommandConfigManager3.cpp 462) and its handler does nothing but return SUCCESS (ReportCommand.h 16-25). No report record, reason or recency check exists.
- Gap (no chat rate limit): no per-player flood or cooldown check was found in `src/server/chat` (grep for flood, throttl, cooldown, rate). The only chat cooldown is the imperial keyword reaction (1181-1194).
- Gap (ignore list is by name, not by id): `PlayerList` stores lowercase names (PlayerList.h 50; PlayerObjectImplementation.cpp 1599, 3709), and the room check passes the sender's first name (ChatManagerImplementation.cpp 752-753; ChatRoomImplementation.cpp 202). A rename is not handled by this code (not verified beyond these lines).
- Gap (ignore list cap not enforced in the add path): `PlayerList.MAXSIZE` is 100 (PlayerList.h 19), but `addIgnore` (PlayerObjectImplementation.cpp 1606) and `AddIgnoreCommand` (35-56) do not check it. The `DeltaVector.add` behaviour was not read.
- Risk (freeze is a combined state): `/freezePlayer` sets the mute, roots the target for 3600 and sets the FROZEN state in one call (FreezePlayerCommand.h 71-74). Unfreeze clears all three (UnfreezePlayerCommand.h 65-73). The mute has no expiry; only an unfreeze ends it. Frankendom should give the mute an expiry and keep the freeze as a separate effect.
- Risk (mute message names the reason): the muted player is told the reason (ChatManagerImplementation.cpp 716). The donor does this on every channel. Frankendom must decide whether a reason is shown (Ruling 2).
- Ruling against Frankendom: one ledger. The name table is a Lua file read when the name manager loads (NameManager.cpp 190-216; the caller of the loader was not read). Frankendom: the blocklist is a catalogue row, edited through the writer.

## 7. As-data shape

- Row fields, name filter row: `pattern: string` (regex, case-insensitive); `reason: int` (class code, name_manager.lua 3-6); list order is significant (first match wins).
- Row fields, reason class: `code: int`, `name: string` (the DECLINED_ constant).
- Table selector: a config string (`Core3.NameManager.FilterTable`, NameManager.cpp 192).
- A new bad word is one row: yes, one `{ pattern, reason }` line (name_manager.lua). It is a new row, not code. A new reason class is code: the classes are fixed constants (lines 3-6) and the rows must name one of them.
- Per-row boundary flag: not a field. The boundary is written into each pattern by hand (823 rows have `\b`).
- Chat channel and spatial range: a table file (`chat/spatial_chat_types.iff`, ChatManagerImplementation.cpp 158) with a default distance and one row per chat type (196-200). The IFF file is not in the donor's bin, so its row fields are not read. A new chat type is one row in that file (inferred from the loader at 196-200; not verified).

## 8. Provenance

- Donor repo: swgemu-Core3 (`/mnt/frankendom-donors/swgemu-Core3`), MMOCoreORB subtree.
- Licence: `COPYING` in the donor root, GNU Affero General Public License v3. Copyleft. Shape only; the word list and its wording may not be copied.
- Per claim: name-filter loader, check and retry from `MMOCoreORB/src/server/zone/managers/name/NameManager.cpp` and `RegexData.h`; data from `MMOCoreORB/bin/scripts/managers/name/name_manager.lua`; chat facts from `MMOCoreORB/src/server/chat/` and `MMOCoreORB/src/server/zone/objects/`. Receipts give the line numbers.

## 9. What they patched later

- No history available. The donor has no `.git` in `MMOCoreORB` and `MMOCoreORB/ChangeLog` and `NEWS` are empty (0 lines).
- Code comments that record intent (no dates): ChatManagerImplementation.cpp 701 "// Not spatial" (the room path); 752 "// All chat should adhere to player ignore list" (the room fan-out applies the ignore list); 1193 "// Check for fine only once every 5s" (the imperial reaction cooldown); 1531 "// Avoid telling ignored people about online/offline status" (presence).
- NameManager.cpp 613-620: the retry loop logs "Failed to create suitable resource name" after 10 tries. The log is the only sign of the limit; the name is still returned.

## 10. Rulings for Dom

1. Plain short rows: should every pattern under 6 letters need a word boundary? Recommendation: yes; the donor's `dev`, `ct` and `mod` rows are the kind that match inside ordinary names.
2. Chat text profanity: should public chat text be masked for profane rows, as the name table is for names? Recommendation: yes, mask rather than block, and log the hit for staff review (Open-RSC cell 1 does this on the chat path).
3. Report button: the donor's `/report` does nothing. Should Frankendom ship a report with reason rows and a recency gate? Recommendation: yes, using the reason list and the 60-second speech window from the Open-RSC cell 1 note.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: display names are a write-time blocklist (TOPICS-FOCUS5 CT ruling); server-side only.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Reason-class row counts were off by the 4 constant-definition lines (real about 567/764/129/19): fixed.
- "Gap: no chat text filter" undercounted isProfane callers (squad-leader commands, NameStructureCommand): fixed; public spatial/room chat still unfiltered.
- Missed: two-letter developer rows (gm, ec, qa, ct) are the worst over-match cases with the icase `\b` patterns; keep such rows exact-match in ours.
Fixed 2026-10-12: row counts, isProfane caller list.
