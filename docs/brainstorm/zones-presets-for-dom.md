# Zone presets for Dom (one page)

**Nothing is built.** No code, no data files, no tests, no server change. This is a design proposal. Every number is our own starting guess, worked out from a formula, and none has been tried. Full detail: `zones-brainstorm-v2.md`.

## The idea
A zone is one data record. A preset is one switch that changes how busy and how forgiving every zone is. Flipping it changes data only. The Pit stays frozen in every preset. Kills are server-verified, a mob can never be hit by more than 3 attackers at once, and everything is written to the one ledger.

## The 5 presets
1. **Cautious world.** Few creatures (about 5 in a mid zone), slow refills (80-160 s), spawns well away from you. An empty zone clears out after 2 minutes. Calm and easy to read on a phone.
2. **Standard world (proposed default).** About 10 creatures, refills in 40-80 s, an empty zone clears after 1 minute. The normal feel.
3. **Busy world.** About 17 creatures, refills in 20-40 s, the zone tops itself up quickly, an empty zone clears after 30 s. Crowded and fast, a stress test for the ledger.
4. **Persistent world.** Like standard, but when you leave, the creatures and their positions are saved and put back when you return. Kills stay dead until the respawn clock says otherwise.
5. **Lazy dungeon.** A generated run: waves of 3, 4, 5, 6, then 7 creatures (8 at most at once), the way onward stays locked until each wave is cleared, and the whole thing collapses a minute after everyone leaves.

## Questions for you
1. When a zone is empty, what should happen: creatures vanish and refill fresh (despawn, our default), stay where they were (store), or just stand still (freeze)?
2. Should killed creatures stay dead until the respawn timer, even if the zone empties? (We say yes.)
3. Do you want generated zones in the first slice? We suggest authored zones first and generation switched off.
4. Two small rules: if a unique encounter is cancelled, does it count as used? If a spawn roll fails, does that spawn point stay used until you leave and return, or does it roll again at the next check?
5. If the zone-control part is ever switched on: on a tie, does the earlier claim win, the lower player id win, or nobody owns it?
6. Is Standard the right default, and should Busy be a live option on the real server or only in headless test runs?
