# levy-street-world-of-claudecraft (parties-guilds-chat, cell 18)

Donor: /mnt/frankendom-donors/levy-street-world-of-claudecraft/server/guild_roster.ts | Licence: MIT | TypeScript | symbol readGuildRoster / guildRosterCached (input line 40 verified: `readGuildRoster`)

## 1. Mechanism
- Input: a guild name from GET /api/guilds/roster?name=... (route table 141-148, handler 122-139). The rate limit is checked first (123-126, 429 when spent), then the name is trimmed; empty or longer than 64 characters answers 400 (129-132). The route is anonymous and sits on the shared per-IP public read budget.
- guildRosterCached (89-115) keys the cache by the lowercased name (90). A cached entry younger than 30 s is returned as is (92).
- On a miss, one single-flight read per key runs readGuildRoster: one SQL statement under the heavy statement timeout. It joins guilds, guild_members and characters, and keeps only characters whose account passes ELIGIBLE_ACCOUNT_SQL, so banned or suspended members drop off without delisting the guild. It matches realm, a case-insensitive guild name, and `c.state IS NOT NULL` (52); level and lifetime XP are read from the character's state JSON, defaulting to 0 (45-46).
- Order: rank (leader, then officer, then member), then lifetime XP descending, then character name ascending. The row count is capped at GUILD_ROSTER_MAX_MEMBERS (55, which is 1,000 in src/sim/guild_roster.ts lines 110-111).
- Output (59-69): { guild, members: [{ name, rank, class, level, lifetimeXp }] }, or null when no row matches. The guild name comes from the first row. Any rank other than leader or officer is reported as member (64).
- Only non-null results are stored (98-101). The cache holds up to 512 keys and clears entirely at the cap (99), so name probing cannot grow it. One in-flight thunk per key is kept in `rosterInFlight` and removed when the read settles (103-105, 107).
- On a read error the caller logs (112) and returns the stale cached entry (the one read at 91, possibly expired), or null (113). The route answers 404 for null and 200 otherwise (134-138).
- No tick. Request-driven, and the answer is the same for every viewer.

## 2. Key functions
- readGuildRoster: /mnt/frankendom-donors/levy-street-world-of-claudecraft/server/guild_roster.ts, lines 40-70. One ranked SQL read; returns the roster or null.
- guildRosterCached: /mnt/frankendom-donors/levy-street-world-of-claudecraft/server/guild_roster.ts, lines 89-115. 30 s TTL cache, single-flight, bounded cache, stale fallback on error.
- rosterHandler (route GET /api/guilds/roster): /mnt/frankendom-donors/levy-street-world-of-claudecraft/server/guild_roster.ts, lines 122-139. Rate limit, name validation, 404 or 200.
- singleFlight: /mnt/frankendom-donors/levy-street-world-of-claudecraft/server/deeds_board_warm.ts, lines 71-86. Coalesces concurrent calls into one in-flight promise; the optional epoch is not used by this roster.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
| Single-flight coalescing of one read per key | Cache TTL 30 s (theirs, `GUILD_ROSTER_TTL_MS`, line 22) |
| TTL cache keyed by lowercased name; misses never stored | Cache cap 512 keys, clear-all at cap (theirs, `ROSTER_CACHE_MAX`, line 26) |
| Ranked, bounded row read with an explicit cap | Rank order leader, officer, member (theirs); row cap GUILD_ROSTER_MAX_MEMBERS = 1,000 (theirs, src/sim/guild_roster.ts line 110; used at guild_roster.ts line 34 and 55); rank order is in the SQL CASE at lines 53-54 |
| Eligibility filter on the account state of each member | ELIGIBLE_ACCOUNT_SQL (theirs, server/db.ts line 378: not banned, not currently suspended) |
| Length-checked name input | 64 characters maximum (theirs, line 129) |
| Anonymous public read on a per-IP budget | Shared per-IP public read budget (theirs) |

## 4. TypeScript sketch
Lift. The cache, single-flight and stale-fallback logic is lifted from guildRosterCached and singleFlight (MIT); the SQL and rank rules are not in the sketch.

simplified: the donor wraps each read in `singleFlight` (deeds_board_warm.ts 71-86, a thunk with an optional epoch) and keeps a map of those thunks; the sketch keeps a plain map of promises. The sketch has no error log, takes the reader as a parameter, and omits the SQL, the rank mapping, the route (rate limit, 400 and 404 handling) and the exported test reset. It also drops `class` and `level` from the roster type.

```ts
// Licence: MIT
// Lifted from /mnt/frankendom-donors/levy-street-world-of-claudecraft/server/guild_roster.ts (guildRosterCached) and server/deeds_board_warm.ts (singleFlight).

type Roster = { guild: string; members: { name: string; rank: string; lifetimeXp: number }[] };

const TTL_MS = 30_000;
const CACHE_MAX = 512;

const cache = new Map<string, { at: number; info: Roster }>();
const inFlight = new Map<string, Promise<Roster | null>>();

export async function cachedRoster(
  name: string,
  read: (guild: string) => Promise<Roster | null>,
  now: () => number = Date.now,
): Promise<Roster | null> {
  const key = name.toLowerCase();
  const hit = cache.get(key);
  if (hit && now() - hit.at < TTL_MS) return hit.info;

  let flight = inFlight.get(key);
  if (!flight) {
    flight = read(name)
      .then((info) => {
        if (info) {
          if (cache.size >= CACHE_MAX) cache.clear();
          cache.set(key, { at: now(), info });
        }
        return info;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, flight);
  }
  try {
    return await flight;
  } catch {
    return hit?.info ?? null;
  }
}
```

## 5. Lands in
- Frankendom target: NEW `origins/server/guild-roster.ts` (a cached, server-side read; does not exist today). The cache and single-flight part is a generic helper that could live in `origins/shared/` (a directory exists on the VPS snapshot /root/work-k7, not main; its content was not read).
- Parity-checklist row: none of rows 1 to 22. Feature-map section: `docs/specs/origins/one-shard.md` §1 (name tag and guild tag are synced; stats and standing are read from the database on inspect, never pushed); parties, guilds and chat are a later phase.
- Reuse tag: adapt
- Brief rule served: (category default, not per-cell) 10 (zone copies); rules 7-9 n/a

## 6. Gaps and risks
- Read path only. There is no live roster, no invite, no join or leave, no rank change, no guild chat in guild_roster.ts. Frankendom needs those from its own design, through the one ledger.
- The 30 s cache is stale by design. A kick, promotion or ban shows up up to 30 s late. The one-shard spec says standing is read from the database on inspect, never pushed; a cached public roster is a compatible read path.
- The public route exposes every member's character name, class, level and lifetime XP to anonymous callers, limited only by the IP budget (123, 129). That is a privacy decision Frankendom has to make for itself.
- The stale fallback on error can serve an old roster with no signal to the client (113).
- The cache is process-local. Frankendom runs one shard on one VPS (one-shard spec), so this is acceptable; a second host would need its own copy or a shared cache.
- The data is read from the character `state` JSON (45-46), so level and XP shown are whatever the writer last saved, not live values. Under server-verified progression, Frankendom would read them from the ledger rather than a state blob.
- Rule check: nothing here conflicts with one engine, zones as data, server-verified kills, MAX_ATTACKERS = 3 or Pit as a client. The file is a server data read.
- Not read: `runWithStatementTimeout`, `publicReadRateLimited`, `GuildRosterInfo`, and the route types.
