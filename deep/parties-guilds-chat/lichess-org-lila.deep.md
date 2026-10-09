# lichess-org-lila (parties-guilds-chat, cell 18)

Donor: /mnt/frankendom-donors/lichess-org-lila/modules/chat/src/main/ChatApi.scala | Licence: AGPL-3.0 | Scala | symbol ChatApi.userChat.write (input line 68 verified: `def write`)

## 1. Mechanism

- Server-side write of one chat line (`write`, 68-98). The pipeline runs in order: build the line (`makeLine`, 220-233: speaker lookup, enabled, not timed out in that chat, input cleaned by `Writer.preprocessUserInput` 322-326, then the flood check, or for bots a no-links check), then check that the chat is still open for posting (`isChatFresh`, public sources only), then run the link check (public sources only, via a bus ask), then persist (unless `persist` is false, or the source is public and the garbage detector flags the text, line 81), then, only if it was persisted, invalidate the cached public chat and run the side effects (abuse monitoring through `shutupApi`, and a metrics counter, 84-91), then publish the line (92). If `makeLine` returns nothing the write ends silently.
- Inputs: chat id, user id, text, the public source (a source type, or none for private chat), the bus channel, and a persist flag (default true).
- The line is built only if the speaker is found and enabled, is not timed out in that chat, the cleaned text is non-empty (the cleaner also strips shouting, private URLs and self-mentions and truncates to `Line.textMaxSize`), and the text passes the flood gate (bots are checked for links instead). The line carries the speaker's troll flag (231).
- Posting checks are cached per source for three minutes (105-109), so a closed chat is refused quickly. A closed chat and a link-check rejection each log an info line and publish nothing (93-98). Private chat (no source) skips both checks.
- Persist (`persistLine`, 301-316) pushes the line onto the chat document, keeping only the last 150 lines (`$slice -150`), upserting if absent. A public line that the garbage detector flags is not stored and gets no side effects, but is still published (line 92 sits outside the `if actuallyPersist` block).
- Output: a stored line (when persisted) and a message published to both the bus channel passed in and the chat's own channel (`publish`, 289-291; `publishLine` adds the JSON, 293-295).

## 2. Key functions

- `ChatApi.write`, `/mnt/frankendom-donors/lichess-org-lila/modules/chat/src/main/ChatApi.scala`, lines 68-98. Full pipeline: build, freshness, link check, persist, side effects, publish.
- `makeLine` (user chat), same file, lines 220-233. Speaker, timeout and enabled checks; preprocess; flood or bot link check. `Writer.preprocessUserInput` is at 322-326.
- `isChatFresh`, same file, lines 104-109 (cache with a three-minute expiry). Chat open or closed for a source.
- `linkCheck`, same file, lines 100-103. Asks the bus for a link check on public text.
- `publish` and `publishLine`, same file, lines 289-291 and 293-295. Publishes to the bus channel and the chat's own channel.
- `persistLine`, same file, lines 301-316. Appends and keeps the last 150 lines.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Gate a write on speaker state, then on channel state, then on content checks | Gate order (theirs) |
| Cache the open-or-closed state per source with a short expiry | Three-minute expiry; 256-entry cache (theirs, lines 105-106); keep the last 150 lines per chat (theirs, line 310) |
| Persist and publish as separate decisions | Garbage detector, public sources only (theirs, line 81) |
| Side effects only after persistence | Counter names (theirs, lines 89-91) |

## 4. TypeScript sketch

simplified: omits the input cleaner (shouting, URLs, self-mention, length cap), the async speaker and timeout lookups (passed in as plain values), the troll flag, the cache invalidation, the abuse-monitoring and metrics side effects (which the donor runs only when the line was persisted), the 150-line cap, the `persist` argument, and the log lines. The sketch applies the garbage test to every line, where the donor applies it only for public sources. The sketch's `writeLine` takes `linkOk` and `channelOpen` as already-computed booleans, so the donor's order (open check, then link check) is not visible in it.

```ts
// Licence: AGPL-3.0 - clean-room sketch, no lines translated
// Clean-room: a chat write that gates on speaker and channel, checks content, persists when allowed, and publishes either way.
type Speaker = { id: string; enabled: boolean; timedOut: boolean; isBot: boolean };
type Line = { user: string; text: string };

// Ordered gates before any line is built.
function buildLine(speaker: Speaker | null, text: string, flood: (t: string) => boolean, hasLinks: (t: string) => boolean): Line | null {
  if (!speaker || !speaker.enabled || speaker.timedOut) return null;
  const ok = speaker.isBot ? !hasLinks(text) : flood(text);
  return ok ? { user: speaker.id, text } : null;
}

// Write: channel open, then link check for public text, then persist if allowed, then publish either way.
function writeLine(
  line: Line | null,
  channelOpen: boolean,
  linkOk: boolean,
  garbage: boolean,
  store: (l: Line) => void,
  publish: (l: Line) => void,
): 'published' | 'refused' {
  if (!line || !channelOpen || !linkOk) return 'refused';
  const persist = !garbage;
  if (persist) store(line);
  publish(line);
  return 'published';
}

// Open-or-closed state per source, cached for a short window.
function cachedOpen(cache: Map<string, { open: boolean; at: number }>, source: string, now: number, ask: (s: string) => boolean): boolean {
  const hit = cache.get(source);
  if (hit && now - hit.at < 3 * 60_000) return hit.open;
  const open = ask(source);
  cache.set(source, { open, at: now });
  return open;
}
```

## 5. Lands in

- Frankendom target: NEW `origins/presence/social.ts` (server-side speech intake: say and shout; does not exist today). The presence service header (`origins/presence/server.ts` line 4, VPS snapshot /root/work-k7, not main) says speech arrives with its own PR.
- Parity-checklist row: none of rows 1 to 22. Feature-map section: `docs/specs/origins/one-shard.md` §6a (chat: server-side filter, mute and block, strikes) and §1 (speech radius).
- Reuse tag: rewrite-from-idea (AGPL-3.0, clean-room sketch only).
- Brief rule served: (category default, not per-cell) 10 (zone copies); rules 7-9 n/a

## 6. Gaps and risks

- The donor publishes a line even when it is not stored (92). For Frankendom's one-ledger rule, anything that changes inventory or fight state must store first and publish only on success; chat text is not ledger data, so publish-anyway is acceptable only for speech.
- Frankendom's spec (§6a) wants a server-side filter on a word list with mute, block and strikes from day one. This donor path has the flood gate, link check and garbage detector, but the filter, spam and shutup services (`FloodApi`, `SpamApi`, `shutupApi`) are external and not read, so their rules are unknown here.
- The three-minute cache (106) means a chat closed mid-window still accepts a line.
- A flagged public line skips storage and the abuse side effects (81-91) but is still shown to everyone; Frankendom must log the drop and decide whether a flagged line is shown at all.
- Identity is the user id passed into `write`; Frankendom must derive it from the verified session, never from the message.
- Zones are data and the Pit is a client only: speech intake is a server module keyed to the account and the layer, not to a zone or the Pit client. Nothing here touches kill authority, one engine or MAX_ATTACKERS.
- Not read: `Chat.scala` models (`Line.textMaxSize`), `GarbageDetector`, the bus link-check responder, and the timeout code (125-200).
