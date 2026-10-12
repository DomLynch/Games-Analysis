# keldaanCommunity-pokemonAutoChess (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/mini-game.ts` (with `config/game/town-encounters.ts`, `utils/random.ts`, `rooms/game-room.ts`, `config/game/stages.ts`, `types/enum/TownEncounter.ts`) | Licence: GNU General Public License, version 3 (LICENSE line 1, "GNU GENERAL PUBLIC LICENSE"). Copyleft: clean-room, shape only | TypeScript (Colyseus server) | symbol `MiniGame.initialize`

Checked: The hint file `public/src/pages/component/wiki/wiki-town.tsx` is a wiki renderer (it lists the table by stage); it is not the mechanism. Opened in full: town-encounters.ts (118 lines), TownEncounter.ts (29 lines), wiki-town.tsx (57 lines), utils/random.ts 15-37, config/game/stages.ts (list only). Opened in part: core/mini-game.ts 1-30, 255-430 (the hub set-up, timing and per-service grants), 515-535 (start of the item-pick function), 828-862 (stop rule), game-room.ts 1530-1548 (ranking). Confidence high for the per-stage service pick, the no-repeat rule, the release wait and the hub layout. Not read: the portal carousel (initializePortalCarousel, from line 446), the rest of pickRandomItems, the per-service sell logic (lines 173-184), the per-service effects at 534-610, and the client side (public/src/game/components/board-manager.ts). Coverage note: `rank` is set from a sort of alive players only (game-room.ts:1516-1522 skips dead players; sort 1533-1545). I did not read where `rankPlayers()` is called, so whether a rank is stale after a death is not checked.

Best transferable idea: A town hub that places at most one service per stage from a weighted table, drops a repeat rather than re-rolling it, and releases the players into the hub on a timer that favours the player who is behind.
Decision (proposed): adapt — keep the per-stage service table as zone data, and the no-repeat rule as a per-zone switch (drop or re-roll). Keep the rank-ordered release (the lower-ranked player is released first) as a fair pick order for a shared hub. Reject the bot jitter: a bot's delay has no place in a server-verified fight.
Acceptance: A server test asserts that a stage offers at most one hub service, that a service chosen earlier in the same run is not offered twice when the zone's no-repeat switch is on, and that a player with the higher life total is released after a player with the lower life total.

## 1. Mechanism

- Table. `TownEncountersByStage` maps a stage number to service chances. Only stages 4, 12, 17, 22, 27 and 34 have entries (town-encounters.ts:17-80). Each entry is 1/20 except two rarer entries at 1/40: MAGNEZONE at stage 4 (line 28) and CELEBI at stage 12 (line 42). The sum of each stage's weights is at most 1; the rest is "no service". Stage 4 sums to 0.475, stage 17 to 0.45, stage 27 to 0.30, stage 34 to 0.25 (computed from the table).
- Pick (initialize, mini-game.ts:270-296). If the stage has a table, one weighted pick is made with total 1 (271-274). If the pick repeats a service already in `state.townEncounters` (277-280), the slot is set to null: the repeat is dropped, not re-rolled. A chosen service is stored on the state (282) and added to the set (284). The festival rule (273) passes no total, so the weights are summed, the pick always succeeds, and repeats are allowed (the check at 277-278 is skipped on festival). The set lives on the game state (game-state.ts:64).
- Weighted pick (utils/random.ts:22-37). With no total, the weights are summed. A roll is taken as `Math.random()` times the total; the code subtracts each weight in turn and returns the first item that takes the roll below zero, else null.
- Hub layout. A static circle of radius 20 is placed at the centre when a service is chosen (284-286). Each alive player starts on an ellipse of radius 300 by 250 around the centre (308, 311). Bots move to a smaller ellipse of radius 150 by 125 (CAROUSEL_RADIUS_X and _Y, mini-game.ts:69-70, 339-343). Avatars are radius 25 (71).
- Release wait (312-325). The base wait is 10 s when a service was chosen and 5 s when not (313). It adds 2 s for each place between the player's rank and the count of alive players (314). Stage 0 is fixed at 12 s (317), the portal stages (0, 10, 20 in `PortalCarouselStages`, stages.ts:22) at 8 s (319), and stages below 5 use the base wait only (321). Each of these overrides replaces the whole value, the rank term included. Bots add a random 1000-6000 ms (325).
- Ranking (game-room.ts:1533-1545). Players are sorted by life, highest first, then by level. Rank is the sorted position plus one, so rank 1 is the highest life. The release wait therefore grows with the rank term: the highest life player is released last.
- Grants (set-up, 365-424). A service applies at once: SPINDA starts a timed NPC dialog; REGIROCK adds 15 life to each alive player (380); WOBBUFFET, CROAGUNK, MUNCHLAX, XATU, LAPRAS and CHIMECHO each add one ticket or item to each alive player; MAKUHITA adds a dojo ticket whose tier depends on the stage (400-404: gold when stage >= 15 at 400, silver when >= 10 at 402, else bronze); MAGNEZONE sets an outlaw stage from 5 to 15 and gives a notice; KINGAMBIT gives the highest-life player a crest.
- Stop rule (842-848). When the hub closes, a human player (`!player.isBot`, mini-game.ts:844; bots never get the automatic item) with no item taken is given a random remaining item, unless the service has a sell price and the game is not a festival; then no automatic item is given.

## 2. Key functions

- `MiniGame.initialize` 265-325: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/mini-game.ts`. The stage pick, the no-repeat rule, the blocker, the start ellipse and the release wait.
- Per-service grants 365-424: same file. One branch per service.
- `MiniGame.stop` 832-850: same file. Automatic item rule.
- `randomWeighted` 15-37: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/utils/random.ts`.
- Ranking 1530-1548: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/game-room.ts`.
- The table 17-81: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/config/game/town-encounters.ts`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One weighted pick per stage against a total of 1; remainder is no service | Chances 1/20 and one 1/40 per stage (town-encounters.ts:21, 28); stages 4, 12, 17, 22, 27, 34 |
| Repeat in one game drops the slot (no re-roll) | Festival override (mini-game.ts:273) |
| Release wait = base + gap-to-rank term | Base 10000 ms with service, 5000 without (313); 2000 ms per rank step (314) |
| Stage-specific waits | Stage 0 12000 ms (317); portal stages 8000 ms (319) |
| Hub ring: start ellipse and bot target ellipse | 300 x 250 px start (308, 311); 150 x 125 bot target (69-70); centre blocker radius 20 (286); avatar radius 25 (71) |
| Grant to every alive player | Life +15 for REGIROCK (380); dojo ticket tiers by stage 10 and 15 (400-404) |
| Rank = sorted position by life | Sort key life, then level (1533) |

## 4. TypeScript sketch

simplified: keeps the donor order: a weighted pick against a total of 1 (festival passes the summed weights), the repeat drop, the start ellipse, and the release wait with its stage overrides (stage 0, then portal stages, then stages below 5) and bot jitter. It omits the grants and item carousel, the sell price rule, the stop rule, the centre blocker body, the NPC dialog timers, the bot target ellipse, and the portal carousel. It changes three things on purpose: the no-repeat rule is a zone switch (the donor always drops), the portal stages are a parameter list (the donor has a fixed list), and the random source is injected (the donor calls Math.random directly).

```ts
// clean-room sketch from the described mechanism (donor licence: GPL-3.0; shape only, no lines copied).
export {};

type Service = string;
type Weights = Record<Service, number>;

interface HubRules {
  stageWeights: Record<number, Weights>; // stage -> chance per service; the weights sum to at most 1, the rest is "no service"
  festival: boolean;                     // festival rule: always pick a service, repeats allowed
  portalStages: number[];                // stages that use the portal layout (donor: [0, 10, 20])
}

interface HubState {
  used: Set<Service>; // services already placed this game
}

// Weighted pick against a total. Returns null when the roll falls past every weight.
function pickWeighted(weights: Weights, total: number, rnd: () => number): Service | null {
  let r = rnd() * total;
  for (const [item, w] of Object.entries(weights)) {
    if ((r -= w) < 0) return item;
  }
  return null;
}

// One service per stage. A repeat in the same game drops the slot; it is not re-rolled.
function placeService(stage: number, rules: HubRules, hub: HubState, rnd: () => number): Service | null {
  const weights = rules.stageWeights[stage];
  if (!weights) return null;
  const total = rules.festival ? Object.values(weights).reduce((a, b) => a + b, 0) : 1;
  let s = pickWeighted(weights, total, rnd);
  if (s !== null && !rules.festival && hub.used.has(s)) s = null; // no repeat in one game
  if (s !== null) hub.used.add(s);
  return s;
}

// Release delay for one player. Rank 1 = highest life, so a higher-ranked player waits longer.
function releaseDelayMs(
  stage: number,
  rules: HubRules,
  hasService: boolean,
  aliveCount: number,
  rank: number,
  isBot: boolean,
  rnd: () => number
): number {
  let delay = (hasService ? 10000 : 5000) + (aliveCount - rank) * 2000;
  if (stage === 0) {
    delay = 12000;
  } else if (rules.portalStages.includes(stage)) {
    delay = 8000;
  } else if (stage < 5) {
    delay = hasService ? 10000 : 5000;
  }
  if (isBot) delay += 1000 + rnd() * 5000;
  return delay;
}

// Players start on an ellipse around the hub centre (300 by 250 in the donor).
function startPosition(i: number, n: number, cx: number, cy: number): { x: number; y: number } {
  const a = (2 * Math.PI * i) / n;
  return { x: cx + Math.cos(a) * 300, y: cy + Math.sin(a) * 250 };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/cm016-pac-hub-services.ts`; local copy in `work/pac-hub-services.ts`).

## 5. Lands in

- TARGET `origins/zones/hub-services.ts` (new, proposed; does not exist yet): the per-stage service table as zone data, the one-pick rule, the no-repeat switch and the rank-ordered release. The pick is made on the server.
- Parity-checklist row 23 (zone population and zone data). The grants would touch row 18 (loot roll and XP award); not chosen for this cell.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: zones are data on one runtime; server-verified (the service is chosen and granted on the server); one ledger (grants go through the one character ledger).

## 6. Gaps and risks

- GPL-3.0 copyleft: clean-room, shape only. The sketch is written from the mechanism.
- Stage weights are chances per service that are not normalised: the sum sets the chance of any service, and the rest is a silent slot. Frankendom should state the chance of "no service" as its own data field.
- The repeat rule drops a slot instead of re-rolling, so a player can lose a stage with no service. The festival switch removes the rule for the whole game. Frankendom should make the rule a per-zone switch (sketch does this) and test both.
- The release wait depends on the rank term. Ranks come from alive players only, so the term is 0 to alive-1 when the rank is fresh; a stale rank after a death could push it negative (`rankPlayers()` call sites not read). Frankendom should clamp the term at zero and test it.
- The bot jitter (1000-6000 ms) is a fairness fudge for bots. In a server-verified fight it would be a hidden advantage; reject it.
- The grants are hard-coded per service in the server file. Frankendom should move each grant to a zone data row (kind, amount, tier by stage).
- Not covered: the portal carousel, the item carousel (pickRandomItems), the per-service sell logic and the client drawing of the hub.
- The table uses the wiki page only as a renderer; the wiki file itself is not a mechanism (hint file is the wrong file).

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
Brief rule served: 1 (one engine, zones as data); server-verified service and grant; one ledger (grants on the character ledger)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Stop rule was described as applying to any player; donor requires !player.isBot (mini-game.ts:844), so bots never get the auto item.
- MAKUHITA ticket tiers are at mini-game.ts 400-404 (gold >= 15 at 400, silver >= 10 at 402), note cited 400-401.
Fixed 2026-10-12: stop rule now says human players only; ticket tier line range corrected to 400-404.
