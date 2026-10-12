# pmbstyle-L2Solo (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/TownNpcSlots.js` | Licence: Apache License 2.0 (repo root LICENSE, header read: "Version 2.0, January 2004"; code may be adapted) | JavaScript (Node, CommonJS) | symbol `reserve`

Checked: Hint file `src/GameServer/World/World.js` was not opened; it is the wrong file for this topic. Real mechanism found by grep for town, slot and landmark words. Read in full: TownNpcSlots.js (37 lines), TownNpcApproach.js (363), TownNpcCatalog.js (48), TownServiceCatalog.js (211), TownRespawn.js (153). Read in part: BotChatLocation.js 20-62 (landmark naming), ShoppingState.js 144-156 and FollowingState.js 262-272 (two callers of `targetFor`, both pass `from`), data/Npcs/Spawns/c4_heine.json (first 500 bytes and a count of selfId lines). Not read: GeodataEngine (line-of-sight and height are inputs to the slot ring; not read), TownPathfinder.js, BotAI.js, the WorldObserver map viewer beyond 25 lines. camera_scope: n/a. Confidence: high on the slot lease (read end to end, callers checked). Medium on the wider town-catalog layer because the geodata calls were not read. The donor has no procedural city, road or building generator that I found: a grep of src for road, building, procedural and layout words hit chat, comment and bot-behaviour files (first 12 listed by grep, not opened). No in-game minimap; the layout is static data (see section 1).

Best transferable idea: Give each target a small ring of slot points that each attacker leases for a short, refreshed time, so no two attackers hold the same point and a fourth attacker waits.
Decision (proposed): adapt — the lease ring is the shape MAX_ATTACKERS = 3 needs, but the 30 s lease, the coordinate-based keys and the eviction bug must change first.
Acceptance: With one target and MAX_ATTACKERS = 3, a fourth attacker gets no slot while three leases are live; it gets one within a tick after one of the three disengages or dies; a server test with 300 targets never gives one live slot to two attackers.

## 1. Mechanism

Data half (read): the town layout is static. Each NPC spawn row (data/Npcs/Spawns/*.json, 41 files; each row has selfId, name, a coords list of locX/locY/locZ/head) is read as data. A fixed table of 16 town hub points (name plus locX/locY/locZ) lives in World/TownRespawn.js, lines 3-20, and says it is based on C4 L2J data (line 1).

Server half, four parts:

(a) Hub services are indexed, not placed. TownServiceCatalog.build() (lines 46-114) takes spawn rows whose NPC is a seller, warehouse keeper or gatekeeper, assigns each coords entry to a hub with TownRespawn.getClosestTown (line 76; regional lookup first, nearest hub as fallback), and drops it when it is more than MAX_TOWN_DISTANCE = 7500 from that hub (line 77). Rows are then sorted by town, npcSelfId and position, and indexed per role and town.

(b) One counter, one bot at a time. When a bot is more than 48 units from the counter's interaction point (INTERACTION_READY_RADIUS), TownNpcApproach.plan (201-283) asks Slots.reserve for a point. The candidate ring is the base point plus up to four shifts of -80, -40, +40 and +80 units perpendicular to the NPC-to-counter line, each kept only if it has line of sight and a reachable cell (lines 213-223). TownNpcSlots.reserve (13-35) walks the ring from index |actorId| modulo the ring length, skips any point whose lease is live (until > now), and claims the first free point with a fresh Symbol token and a 30 s expiry. If every point is leased it returns null, and plan returns {ready: false, waiting: true} (line 226).

(c) Leases refresh and release. A holder whose token still matches refreshes its expiry on each call (TownNpcSlots 22-24). release() clears the point only when the token still matches (line 9), so a stale holder cannot free someone else's point. reset() and a change of target key release the lease (TownNpcApproach 185-190 and 207).

(d) Approach geometry (what a bot aims at). The interaction point sits 72 units from the NPC along its heading, the staging point 240 units out. pointsFor (120-149) tries distances 72, 48 then 32, each with 32 angular steps, and keeps the first point with line of sight to the NPC; if none passes it falls back to the plain heading points. Open-air NPCs (planOpen, 289-341) use an 8-point ring at 72 units with line of sight (lines 314-316), and leases one ring point per bot. Without a lease, openPointFor (151-171) spreads bots by actor id: the slot is (actorId modulo 9) minus 4, at 15 degrees (PI/12) per slot, so bots fan out on both sides of the preferred direction.

Landmark naming (one related piece): BotChatLocation.landmark (23-34) returns the town name when the position is within 3500 units of its hub, and otherwise "the area <one of 8 compass words> of <town>". The town comes from the region lookup in TownRespawn.getRegionGroup (97-111): a Z-aware dungeon override first, then polygon respawn zones, then a 2^15-unit grid cell with a +20/+18 origin. getClosestTown (113-122) falls back to the nearest hub by squared distance.

Tick: none. These are called from the bot brain each time it wants to approach; there is no fixed-step loop in this file. Lease time is wall-clock (Date.now() default, TownNpcSlots 13).

## 2. Key functions

- `reserve`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/TownNpcSlots.js` 13-35 (ring walk, lease claim, refresh).
- `release`: same file, 5-11 (token-checked free).
- `plan` (counter approach, leased ring at 208-230): `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/TownNpcApproach.js` 201-283.
- `planOpen` (open-air, 8-point leased ring at 311-322): same file, 289-341.
- `pointsFor` (distance and angle search): same file, 120-149.
- `build` (town service index): `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/TownServiceCatalog.js` 46-114.
- `getRegionGroup` and `getClosestTown`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/TownRespawn.js` 97-122.
- `landmark`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/BotChatLocation.js` 23-34.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Lease a point in a ring; a point is free when its lease has lapsed; refresh while in use | 30000 ms lease (TownNpcSlots.js line 2); pool cap of 256 buckets (line 1) |
| Ring walk starts at the holder's own index (actor id) so holders spread out | Index = `Math.abs(preferred)` (line 27) |
| Approach point set at fixed distances from the target, searched inward for line of sight | Interaction 72 (TownNpcApproach.js line 5); staging 240 (line 4); ready radius 48 (line 14); hard cap 300 (line 18); search distances 72, 48, 32 (line 19); 32 angular steps (line 20) |
| Open-air ring of 8 points, spread by actor id | 8 points (line 314); spread steps 9 (line 16); spread angle Math.PI / 12 (line 17) |
| Service rows dropped beyond a radius of their hub | 7500 units (TownServiceCatalog.js line 6) |
| Landmark name: hub name inside a radius, else a compass phrase | 3500 units (BotChatLocation.js line 30); 8 compass words (line 31) |
| Region grid cell | 2^15 units with a +20 / +18 origin (TownRespawn.js line 98) |
| Gatekeeper restart offset | 50 units (TownRespawn.js line 24) |
| Timeout by time | Expiry = now + LEASE_MS; no tick, wall clock |

## 4. TypeScript sketch

simplified: keeps the donor's ring walk, lease refresh, token-checked release and 30 s expiry. It omits the geodata line-of-sight filter that builds the ring, the counter side-shift candidates, the navigation-revision cache key, the session field and the reset path, and the `planOpen` spread. One thing is changed on purpose: the eviction is fixed (see section 6), so a bucket with a live lease is never dropped. The attacker is a plain object, not a bot session.

```ts
// Licence: Apache-2.0 (donor LICENSE). Adapted shape, rewritten here; not a line-by-line copy.
// Fix applied: the donor evicts the oldest bucket even when its leases are still live.

interface Pt { x: number; y: number; }
interface Owner { token: symbol; until: number; }
interface Bucket { points: Pt[]; owners: (Owner | null)[]; }
interface Lease { key: string; index: number; token: symbol; }
interface Attacker { id: number; lease: Lease | null; }

const MAX_BUCKETS = 256;
const LEASE_MS = 30_000;
const buckets = new Map<string, Bucket>();

function isLive(owner: Owner | null | undefined, now: number): boolean {
  return (owner?.until ?? 0) > now;
}

function release(a: Attacker): void {
  const lease = a.lease;
  if (!lease) return;
  const bucket = buckets.get(lease.key);
  if (bucket && bucket.owners[lease.index]?.token === lease.token) bucket.owners[lease.index] = null;
  a.lease = null;
}

// Make room for one new bucket: drop the oldest bucket with no live lease.
// If every bucket still has a live lease, refuse rather than hand out held slots again.
function makeRoomFor(now: number): boolean {
  if (buckets.size < MAX_BUCKETS) return true;
  for (const [key, bucket] of buckets) {
    if (!bucket.owners.some((o) => isLive(o, now))) {
      buckets.delete(key);
      return true;
    }
  }
  return false;
}

// Claim one ring point for one attacker. A lease is refreshed on every call and lapses after LEASE_MS.
function reserve(a: Attacker, key: string, makeRing: () => Pt[], now: number): Pt | null {
  if (a.lease && a.lease.key !== key) release(a);
  let bucket = buckets.get(key);
  if (!bucket) {
    if (!makeRoomFor(now)) return null;
    bucket = { points: makeRing(), owners: [] };
    buckets.set(key, bucket);
  }
  const lease = a.lease;
  if (lease && bucket.owners[lease.index]?.token === lease.token) {
    (bucket.owners[lease.index] as Owner).until = now + LEASE_MS;
    return bucket.points[lease.index] ?? null;
  }
  const n = bucket.points.length;
  for (let step = 0; step < n; step++) {
    const index = (Math.abs(a.id) + step) % n;
    if (isLive(bucket.owners[index], now)) continue;
    const token = Symbol('attack-slot');
    bucket.owners[index] = { token, until: now + LEASE_MS };
    a.lease = { key, index, token };
    return bucket.points[index] ?? null;
  }
  return null;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/CM020-pmbstyle-slot-lease.ts: exit 0.

## 5. Lands in

- TARGET `src/fight/attack-slots.ts` (new module, engine side): a slot ring per target, so that at most MAX_ATTACKERS = 3 attackers hold a point. Ring size is 3, not the donor's 8. Parity-checklist row 4 (fight loop: aggro, chase, leash).
- Sub-finding, not built here: the zone-membership lookup (grid cell, polygon overrides, Z-aware dungeon override, nearest-hub fallback; TownRespawn.js 97-122) would land in `origins/server/world-spawns.ts` under parity row 23 (zone population). Noted only.
- Reuse tag: adapt (Apache-2.0: code may be adapted; this sketch rewrites the shape)
- Brief rule served: one engine (many-on-one slot logic lives in the engine, MAX_ATTACKERS = 3); parity row 4

## 6. Gaps and risks

- Defect, keep the idea and fix it: TownNpcSlots.js line 17 drops the oldest bucket when the pool is full, even when its owners still hold live leases. Holders in a dropped bucket stop being counted, so their points can be leased again. fix: evict only a bucket with no live lease, and refuse a new bucket if none is idle (`makeRoomFor` in the sketch). I did not run a test that triggers it; this is from reading the code.
- Latent defect, not on any live path: TownNpcCatalog.js line 28 returns `candidates(town, options)[0]`. Without `options.from`, TownServiceCatalog sorts by npcSelfId, not distance (lines 135-136). closestSeller has no caller in the donor src (grep). fix: require `from` or sort by distance.
- The donor has no road grammar, building grammar or minimap. The only "minimap" hits are a packet name, `ShowMiniMap` (Session.js line 130, grep only, not opened), and a comment in PartyMemberPosition.js line 4. The WorldObserver map viewer (src/WorldObserver/public/mapViewport.js) is an observer tool; 25 lines read.
- Keys differ from fight needs. The donor keys leases by geodata revision and target coordinates (TownNpcApproach.js 103-112). The fight key must be the target id and the attacker set, with no coordinates. A 30 s lease is a town-walk value; a fight lease must refresh on every attack-intent tick, so its length is tuned as data.
- The donor's ring uses line-of-sight and geodata checks. Whether Frankendom's fight has world geodata was not checked; if not, the engine uses a fixed angular ring. The engine picks the points, not the client (Frankendom ruling: many-on-one logic lives in the engine).
- Provenance: TownRespawn.js line 1 says the hub table is based on C4 L2J data. The L2J licence was not read. Do not copy the coordinates into zone data without checking that. The slot mechanism does not use them.
- Frankendom data fields: ring size (= MAX_ATTACKERS), lease length, refresh rule and ring radius per encounter (zone data), see the JSON sidecar.

Reuse tag: adapt (Apache-2.0)
Brief rule served: one engine; MAX_ATTACKERS = 3; parity row 4
