// Licence: GPL-3.0 (donor; repository LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface DispTuning {
  raceMod: number;          // same-race bonus (donor GMST fDispRaceMod default 5)
  personalityBase: number;  // personality pivot (donor fDispPersonalityBase default 50)
  personalityMult: number;  // per point off the pivot (donor fDispPersonalityMult default 0.5)
  factionMod: number;       // scale on the faction term (donor fDispFactionMod default 3)
  factionRankBase: number;  // donor fDispFactionRankBase default 1
  factionRankMult: number;  // donor fDispFactionRankMult default 0.5
  diseaseMod: number;       // donor fDispDiseaseMod default -10
  weaponDrawnMod: number;   // donor fDispWeaponDrawn default -5
}

export interface FactionStanding { rank: number; expelled: boolean; }

export interface PlayerState {
  race: string;
  personality: number;
  factions: Map<string, FactionStanding>;
  diseased: boolean;
  weaponDrawn: boolean;
  charm: number;
}

export interface NpcState { race: string; faction: string; baseDisposition: number; crimeModifier: number; }

// Donor: the player's reaction is the WORST (lowest) of their non-expelled factions, with that faction's rank.
// The donor starts from reaction 0 and seeds with "first entry", which can be an expelled faction; this sketch uses a flag.
export function worstFactionReaction(
  npcFaction: string,
  player: PlayerState,
  reactionTo: (a: string, b: string) => number,
): { reaction: number; rank: number } {
  const own = player.factions.get(npcFaction);
  if (own !== undefined) {
    if (own.expelled) return { reaction: 0, rank: 0 };
    return { reaction: reactionTo(npcFaction, npcFaction), rank: own.rank };
  }
  if (npcFaction === '') return { reaction: 0, rank: 0 };
  let found = false;
  let reaction = 0;
  let rank = 0;
  for (const [pf, standing] of player.factions) {
    if (standing.expelled) continue;
    const r = reactionTo(npcFaction, pf);
    if (!found || r < reaction) { reaction = r; rank = standing.rank; found = true; }
  }
  return { reaction, rank };
}

// Donor getDerivedDisposition: base + crime modifier + race + personality + faction term - disease - weapon drawn + charm, clamp 0..100.
export function derivedDisposition(
  npc: NpcState,
  player: PlayerState,
  t: DispTuning,
  reactionTo: (a: string, b: string) => number,
): number {
  let x = npc.baseDisposition + npc.crimeModifier;
  if (npc.race === player.race) x += t.raceMod;
  x += t.personalityMult * (player.personality - t.personalityBase);
  const { reaction, rank } = worstFactionReaction(npc.faction, player, reactionTo);
  x += (t.factionRankMult * rank + t.factionRankBase) * t.factionMod * reaction;
  if (player.diseased) x += t.diseaseMod;
  if (player.weaponDrawn) x += t.weaponDrawnMod;
  x += player.charm;
  return Math.min(100, Math.max(0, Math.trunc(x)));
}

// Donor getPersuasionDispositionChange (Admire-style branch): chance falls away from disposition 50.
export function admireTarget(disposition: number, playerRating: number, npcRating: number): number {
  const d = 1 - 0.02 * Math.abs(disposition - 50);
  return d * (playerRating - npcRating + 50);
}

// Donor reportCrime (theft branch): a witness loses base disposition, clamped so the result stays 0..100.
export function theftPenalty(npc: NpcState, currentDisposition: number, dispTerm: number, alarmTerm: number, permanent: boolean): NpcState {
  const current = currentDisposition;
  let mod = Math.trunc(dispTerm * alarmTerm);
  mod = Math.min(Math.max(mod, -current), 100 - current);
  if (permanent) return { ...npc, baseDisposition: npc.baseDisposition + mod };
  return { ...npc, crimeModifier: npc.crimeModifier + mod };
}

// Donor actors.cpp: when the player has paid the witness's crime id, the temporary crime modifier is cleared.
export function forgiveIfPaid(npc: NpcState, npcCrimeId: number, playerCrimeId: number): NpcState {
  if (npcCrimeId <= playerCrimeId) return { ...npc, crimeModifier: 0 };
  return npc;
}

export {};
