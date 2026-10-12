# LostCityRS-Engine-TS (gods-legends-favour, cell 2): GL table

Donor root: `/mnt/frankendom-donors/LostCityRS-Engine-TS/` (engine half, `src/engine` and `src/cache`; `data/` holds only the word filter and keys, so no content scripts). Licence MIT: adaptable.

| name | effect | formula | number ranges | gain/loss events | decay | file:line |
|---|---|---|---|---|---|---|
| 1. Favour/piety resource | No favour stat. Closest: the damage-contribution ledger (top hitter credited, nothing is spent). The prayer stat exists as a plain stat, counted in combat level | ledger add = damage (<1 ignored); top = highest points. Combat level uses floor(prayer base / 2) | ledger 16 slots per player and per NPC | gain: damage via BOTH_HEROPOINTS, NPC_HEROPOINTS. Loss: cleared when hit points reach base in add, boost or heal (PlayerOps 527, 566, 624), and at Player.ts 461 and Npc.ts 301 (enclosing methods not read) | none | HeroPoints.ts 20-46; PlayerOps.ts 527, 1204, 1232; NpcOps.ts 130, 494; Player.ts 1348, 461 |
| 2. Blessings and curses as timed rows | Five ops on one current-vs-base ladder: boost (raise, never lower), heal (to base), sub (curse by base), drain (curse by current), add (raise, no base cap) | boost: current toward base + d; heal: to base; sub: current - (c + base x p/100); drain: current - (c + current x p/100); all truncated (| 0) | cap 255 (PlayerOps 525, 564); floor 0 (545, 584) | gain/loss: script calls (content not in repo) | NPC only: one step toward base every regenrate ticks (default 100); player decay not in this donor | PlayerOps.ts 514-630; Npc.ts 528-546; NpcType.ts 99 |
| 3. Patron choice and switching | Not in donor | (not read) | (not read) | (not read) | (not read) | (not read) |
| 4. Divine domains as tags | Not in donor as tags. The ladder has 21 stat slots (Uint8Array) | (not read) | 21 slots (Player.ts 298) | (not read) | (not read) | Player.ts 298 |
| 5. Boons at favour thresholds | Level-up refills a drained stat by the gain. No rank-gated boon found | if current < old base after XP gain: current += gain | gain = new base - old base | level-up event | none | Player.ts 1839-1848 |
| 6. Legend signature powers | Not read. NPC stat ops exist as opcodes; handlers not read | (not read) | (not read) | (not read) | (not read) | ScriptOpcode.ts 248, 250 |
| 7. Shapeshifting | Not read | (not read) | (not read) | (not read) | (not read) | (not read) |
| 8. Avatars and summons | Not read | (not read) | (not read) | (not read) | (not read) | (not read) |
| 9. Fate, luck, oaths | Level-scaled luck roll: odds slide from low (level 1) to high (level 99). Oaths not found | value = floor(low x (99 - L)/98) + floor(high x (L - 1)/98) + 1; success if value > floor(rand x 256) | level clamped to 99 above only; odds 0-255 scale | gain/loss: per call (script) | none | PlayerOps.ts 591-600 |
| 10. Underworld and death rules | Hit points are a ladder stat (damage path sets 0 at 0 HP). Death handler not read. Top hitter in the ledger is the credit target for FINDHERO | (not read) for death; hero = max points | HP ladder floor 0 | (not read) | none | Player.ts 1940-1945 (grep only); PlayerOps.ts 1204 |
| 11. Divine mounts as rewards | Not read | (not read) | (not read) | (not read) | (not read) | (not read) |
| 12. Relics and artifacts | Not read | (not read) | (not read) | (not read) | (not read) | (not read) |
| 13. Temples and shrines as zone rows | None found: grep of src and data for altar, shrine, prayer, bless finds only stat code | n/a | n/a | n/a | n/a | (grep only) |
| 14. Pantheon factions and realm pride | Not read | (not read) | (not read) | (not read) | (not read) | (not read) |

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
CLEAN
- No material misses (Player.ts:706 is run energy recovery, so 'player decay not in this donor' holds).
