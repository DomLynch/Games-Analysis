# veloren-veloren (live-ops-events-lore-delivery, cell 3)

Donor: `/mnt/frankendom-donors/veloren-veloren/rtsim/src/data/report.rs` (also `rtsim/src/rule/report.rs`, `rtsim/src/rule/npc_ai/mod.rs`, `rtsim/src/rule/sync_npcs.rs`, `rtsim/src/rule/cleanup.rs`, `rtsim/src/data/actor.rs`, `rtsim/src/rule/replenish_resources.rs`, `rtsim/src/event.rs`, `common/src/resources.rs`) | Licence: GPL-3.0 (donor `LICENSE`, line 2: "Version 3, 29 June 2007"; the rtsim files read carry no per-file licence header) | Rust | symbols `Report`, `ReportKind`, `Reports::cleanup`, `ReportEvents` rule (`on_death`, `on_theft`), npc_ai `NpcInput::Report` handler, `Actors::nearby`, `ReplenishResources`

Checked: Read in full: `rtsim/src/data/report.rs` 1-86; `rtsim/src/rule/report.rs` 1-74; `rtsim/src/event.rs` 1-90; `rtsim/src/rule/replenish_resources.rs` 1-45. Read in part: `rtsim/src/rule/npc_ai/mod.rs` 1249-1290 and 1366-1414 (the report reaction; sentiment branches not fully traced); `rtsim/src/rule/cleanup.rs` 1-20 and 52-78; `rtsim/src/rule/sync_npcs.rs` 110-126; `rtsim/src/data/actor.rs` 812-838 (`nearby`). Confidence: high for the report record, the witness radii, the memory lengths, the inbox delivery and the response window; medium for the NPC reaction (the sentiment branches were not fully traced; the speech branch was read). Not read: `rtsim/src/data/sentiment.rs` (201 lines), `rtsim/src/data/quest.rs` (423 lines), the chat path from server to client (how the phrase reaches a player's screen), and the grid build behind `actor_grid`. Scheduled events: `rtsim/src/event.rs` lists only `OnSetup`, `OnTick`, `OnDeath`, `OnHelped`, `OnHealthChange`, `OnTheft`, `OnMountVolume`; I found no scheduled-event system in rtsim (grep and the event list). Invasions: no rtsim hit for the word "invasion" in the grep I ran. camera_scope: not applicable.

## 1. Mechanism

- A report is a small record of one event that NPCs can learn about: `ReportKind::Death { actor, killer }` or `ReportKind::Theft { thief, site, sprite }`, with the in-game time it happened (`data/report.rs:25-29, 51-63`). The doc comment says reports are the medium for sharing information, and that feelings are kept elsewhere (sentiment), not in reports (`data/report.rs:13-24`).
- Memory length depends on the kind (`remember_for`, `data/report.rs:33-47`): a death with a killer is kept 15 days ("Murder is less easy to forget", 37-39); a death without a killer 5 days (40-41); a theft 1.5 days (45). `Reports::cleanup` drops a report once `max(now - atTime, 0) >= remember_for()` (73-77), called from the tick event (`rule/cleanup.rs:75`, bound to `OnTick` at 19).
- Order of steps when a death happens (`rule/report.rs` `on_death`, 19-46): (a) skip if the death has no position (22); (b) collect actors within 32 units of the death (23) that have presence (`data/actor.rs:828`, a 3D squared-distance test in neighbouring chunks, `actor.rs:814-830`); (c) create the report once, lazily, when the first witness needs it (`LazyCell`, 25-33); (d) push the report id into each witness's inbox (38-44). A theft is the same with a 24-unit radius (`rule/report.rs:48-74`, radius at 53).
- Reaction (`rule/npc_ai/mod.rs`, inbox handler from 1249): an inbox entry is ignored if the NPC already knows the report (1251). A death report is handled for civilised NPCs only (1259-1260). The NPC marks the report known (1385), then speaks only if the report is younger than the response window of 300 in-game seconds (1256, 1387). The speech is said to the killer (1390). Without a killer the phrase is `npc-speech-witness_death` (1383); with one it is a murder phrase (1376-1380). A theft at the NPC's home lowers its sentiment toward the thief by 0.2 (1402-1409; the code comments that the value is hard-coded, `1406`, "TODO: Don't hardcode sentiment change").
- Diffusion through sites: an NPC at its home site adds its known reports to the site's list, and the site hands unknown reports to its residents' inboxes (`rule/sync_npcs.rs:110-123`, the extend at 116). This is the rumour path that carries news beyond the witnesses.
- Tick: reports are pruned in the `OnTick` rule (`cleanup.rs:19, 75`); what fires the death and theft events was not traced. The NPC inbox is read on the NPC's AI pass (not traced for frequency).
- Second, smaller mechanism (scheduled refill): `ReplenishResources` (`rule/replenish_resources.rs`) runs on every `OnTick` (19). Each tick it refills one slice of 8192 chunks (15, 34): the slice is chosen round-robin by `tick % groups` where `groups = chunks / 8192 + 1` (31, 34), each value gets `worldSize * dt / (3600 * 8192)` (25-27), and the result is clamped to [0, 1] (38). The refill time is 3600 s (9). With `world_size.product()` equal to the chunk count, a full refill takes about one hour; that equality was not checked.

## 2. Key functions

- `Report`, `remember_for`, `ReportKind`: `/mnt/frankendom-donors/veloren-veloren/rtsim/src/data/report.rs` 25-63.
- `Reports::cleanup` (memory expiry): `/mnt/frankendom-donors/veloren-veloren/rtsim/src/data/report.rs` 73-80.
- `on_death` and `on_theft` (witness delivery): `/mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/report.rs` 19-74.
- Inbox handler for reports (response window, speech, home theft): `/mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/npc_ai/mod.rs` 1249-1290 and 1366-1414.
- Site diffusion: `/mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/sync_npcs.rs` 110-126.
- `Actors::nearby` (witness query): `/mnt/frankendom-donors/veloren-veloren/rtsim/src/data/actor.rs` 812-838.
- Pruning schedule: `/mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/cleanup.rs` 7-9, 19, 75.
- `ReplenishResources` (round-robin refill): `/mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/replenish_resources.rs` 9-45.

## 3. Numbers vs mechanism

TABLE (formula | donor numbers and ranges | file:line)

| Reusable algorithm (formula) | Donor numbers and ranges | file:line |
|---|---|---|
| Memory: keep while max(now - atTime, 0) < rememberFor(report) | murder (death with killer) 15 days; death without killer 5 days; theft 1.5 days; day = 86400 in-game s | data/report.rs:33-47, 73-77 |
| Witness radius for death | 32 units, squared-distance test | rule/report.rs:23; actor.rs:828 |
| Witness radius for theft | 24 units | rule/report.rs:53 |
| Witness must have presence | presence is some (boolean) | actor.rs:828 |
| One shared report per event (created lazily once) | count 1 record, N inbox pushes | rule/report.rs:25-33, 42 |
| Response window: speak only if now - atTime < 300 | 300 in-game s (60 * 5) | npc_ai/mod.rs:1256, 1387 |
| Speech goes to the killer | 1 target | npc_ai/mod.rs:1390 |
| Theft at home: sentiment to thief changed by -0.2 | -0.2 (hard-coded, per donor TODO) | npc_ai/mod.rs:1409 |
| Site diffusion: site.known |= npc.known; residents get unknown reports | set union, unbounded | sync_npcs.rs:116-122 |
| Refill slice per tick: 8192 chunks, round-robin group = tick mod (chunks/8192 + 1) | 8192; groups = chunks/8192 + 1 | replenish_resources.rs:15, 31, 34 |
| Refill amount per chunk per tick = worldSize * dt / (3600 * 8192) | refill time 3600 s | replenish_resources.rs:9, 25-27 |
| Clamp after each add | [0, 1] | replenish_resources.rs:38 |
| Tick event pruning cadence (NPCs every 100 ticks, factions and sites every 30; reports every tick event) | 100 / 30 / 30 ticks | cleanup.rs:7-9, 75 |
| Time of day is an f64; report doc says in-game seconds | f64 | common/src/resources.rs:11; data/report.rs:32 |

Notes on the numbers: the memory values are fixed in code (not zone data). The response window and radii are fixed in code. The donor's inline comment flags the O(n) scan of actors for each report (`actor.rs:812-813`, "theoretically O(n^2)"), and the TODO at `rule/report.rs:35-37` says reports should not be pushed into every inbox.

## 4. TypeScript sketch

simplified: keeps the kind-based memory, the squared-distance witness test with presence gating, one shared report pushed into each witness inbox, the once-read known set with the response window, and the round-robin chunk refill with clamp. It omits: sentiment changes, the home-site diffusion, the murder vs death phrase choice, the LazyCell (the sketch creates the report before delivery), the chunk layout (one number per chunk, where the donor refills every resource entry in each chunk), the world-size product (passed in as `worldChunks`), and the chat path. The sketch uses in-game seconds for time.

```ts
// Licence: GPL-3.0 (donor LICENSE, version 3). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

const DAY = 60 * 60 * 24; // in-game seconds

type ReportKind =
  | { t: "death"; victim: number; killer?: number }
  | { t: "theft"; thief: number; site?: number };

interface Report { id: number; kind: ReportKind; atTime: number; }

// How long a report is remembered, in in-game seconds: murder 15 days, other death 5, theft 1.5.
function rememberFor(r: Report): number {
  if (r.kind.t === "death") return r.kind.killer !== undefined ? DAY * 15 : DAY * 5;
  return DAY * 1.5;
}

// Keep a report only while its age is under its memory length.
function pruneReports(reports: Report[], now: number): Report[] {
  return reports.filter(r => Math.max(now - r.atTime, 0) < rememberFor(r));
}

interface Witness { id: number; x: number; y: number; z: number; present: boolean; inbox: number[]; known: Set<number>; }
interface Pos { x: number; y: number; z: number; }

function distSq(a: Pos, b: Pos): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}

// Push one shared report id to every present witness inside the radius (squared-distance test).
function deliverReport(reportId: number, at: Pos, radius: number, witnesses: Witness[]): number {
  const r2 = radius * radius;
  let delivered = 0;
  for (const w of witnesses) {
    if (w.present && distSq(w, at) < r2) {
      w.inbox.push(reportId);
      delivered += 1;
    }
  }
  return delivered;
}

const RESPONSE_WINDOW = 60 * 5; // in-game seconds a witness will still speak about a report

// A witness reads its inbox once: a known report is skipped; a fresh one is marked known and may be spoken.
function handleInbox(w: Witness, reports: Map<number, Report>, now: number): string[] {
  const said: string[] = [];
  for (const id of w.inbox) {
    if (w.known.has(id)) continue;
    const r = reports.get(id);
    if (!r) continue;
    w.known.add(id);
    if (now - r.atTime < RESPONSE_WINDOW) said.push(r.kind.t === "death" ? "witness_death" : "witness_theft");
  }
  w.inbox = [];
  return said;
}

// Lazy replenish of resource chunks: a fixed slice of chunks per tick, round robin, clamped to [0, 1].
const REPLENISH_TIME = 60 * 60;   // seconds for a full refill (donor constant)
const REPLENISH_PER_TICK = 8192;  // chunks touched per tick (donor constant)

function replenishTick(chunks: number[], tick: number, worldChunks: number, dt: number): void {
  const amount = worldChunks * dt * (1 / REPLENISH_TIME / REPLENISH_PER_TICK);
  const groups = Math.floor(chunks.length / REPLENISH_PER_TICK) + 1;
  const start = (tick % groups) * REPLENISH_PER_TICK;
  const end = Math.min(start + REPLENISH_PER_TICK, chunks.length);
  for (let i = start; i < end; i++) {
    chunks[i] = Math.min(1, Math.max(0, chunks[i] + amount));
  }
}
```

## 5. Lands in

- TARGET `origins/server/world-news.ts` (new): a server-side record of kills and thefts with kind-based memory, witness delivery by radius and presence, and a once-read known set. The records sit in the server ledger (one ledger), and the speech is emitted by the server, never decided by the client. Parity-checklist row 19 (fight record / replay: a record of an event that other systems read). The replenish slice is a separate item (server tick sub-line, row 18 / post-K item 3), not part of this target.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: kills are server-verified (a report is written only after a server-verified death); one ledger (the report is a view of the ledger record, not a second store); zones as data (the radii and memory lengths are zone data, see JSON).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- The donor pushes each report into every witness's inbox (`rule/report.rs:35-37` TODO). Frankendom should index reports by zone chunk and let NPCs query them on their own pass, so a big fight does not copy one id into many inboxes.
- The donor has no cap on the number of reports (`data/report.rs:78`, "TODO: Limit global number of reports"). Frankendom needs a cap per zone.
- The witness query is O(n) per event (`actor.rs:812-813` comment). Frankendom's many-on-one fights (MAX_ATTACKERS = 3) make the event count small, but zones with many NPCs need the chunk index above.
- Memory lengths are in in-game seconds in the donor. Frankendom's day and night lengths differ, so use server seconds and keep the lengths as zone data.
- The NPC reply is spoken to the killer (`npc_ai/mod.rs:1390`). A player killer's name would reach witnesses this way, so the phrase keys must come from approved content (legends-rule applies to the lines, not to this mechanism).
- The theft sentiment change is hard-coded (`npc_ai/mod.rs:1406-1409`, donor TODO). Frankendom must not copy the hard-coded value; reputation belongs to the RF topic.
- The "presence" gate (`actor.rs:828`) means only loaded actors learn news. Frankendom zones with no players will not spread news until someone is there, which is the intent for live zones but must be tested.
- The sentiment and quest modules were not read (`data/sentiment.rs`, `data/quest.rs`); any quest hook from reports is unverified.
- The chat path from NPC speech to the client was not read, so how a player sees the phrase is not described here.
- The replenish refill assumes the world size product equals the chunk count (`replenish_resources.rs:25`); not checked. Do not quote the one-hour refill as a fact until that is confirmed.

Decision (proposed): adapt — keep the kind-based memory, the radius witness delivery with presence gating, the once-read known set with a 5-minute response window, and the site rumour path; index the reports by zone chunk, cap them per zone, and keep the speech server-side.
Acceptance: a server test kills a player-side enemy at a fixed point, puts a civilised NPC 20 units away and another 40 units away, and asserts the first gets the report and speaks the death phrase to the killer within 300 in-game seconds while the second does not; a death without a killer is gone after 5 days, a murder after 15 days.
Best transferable idea: a kill or theft becomes one shared record whose memory length depends on its kind and whose witnesses are the loaded actors inside a radius, so news spreads by who was there and fades by kind rather than by a global timer.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: none found. Verified report.rs 25-63 kinds, remember_for 15/5/1.5 days (37-45), cleanup 75-77 (max(...,0) < remember_for), rule/report.rs on_death 19-46 (32.0 at 23, LazyCell 25-33, inbox push 42), on_theft 24.0 at 53, nearby actor.rs 814-830 (presence.is_some + squared distance at 828, O(n^2) comment 812-813), npc_ai REPORT_RESPONSE_TIME 300 (1256), Civilised-only death (1259-60), phrases 1376-1383, known insert 1385, window test 1387, say(killer) 1390, theft at home -0.2 with TODO (1403-1409), sync_npcs 110-123, cleanup.rs skips 30/100/30/30 (6-9) and reports.cleanup 75, replenish 8192 / 3600 / formula 25-27 / group_count 31 / skip-take 34-35 / clamp 38, TimeOfDay f64, event list matches, no 'invasion' hit. GPL-3.
Missed: (1) report.rs on_death/on_theft push to witnesses only if actor.npc_mut() is Some, so player witnesses never get an inbox entry; the note says 'witnesses are the loaded actors inside a radius'. (2) actor.rs 811 doc: nearby is 'not guaranteed to work if radius > 32.0' (neighbour-chunk query); relevant to any Frankendom port that wants a bigger radius. Both are small.
