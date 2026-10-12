// Sketch: first-meet vs repeat greeting gate with %token substitution (adapted from OpenTESArena idea, MIT).
// Frankendom: the met-set lives in the player ledger keyed by NPC id, not on the NPC.

export type PlayerID = string;
export type NpcID = string;

export interface GreetingContext {
  playerId: PlayerID;
  npcId: NpcID;
  personality: number; // index into the line banks (zone data)
}

// Zone data: one bank per personality for each state.
export interface GreetingBank {
  firstMeet: string[][];
  repeat: string[][];
}

export type TokenFn = (ctx: GreetingContext) => string;

// Engine ledger: which NPCs each player has already met.
export class MetLedger {
  private readonly met = new Map<PlayerID, Set<NpcID>>();

  hasMet(playerId: PlayerID, npcId: NpcID): boolean {
    return this.met.get(playerId)?.has(npcId) ?? false;
  }

  markMet(playerId: PlayerID, npcId: NpcID): void {
    let set = this.met.get(playerId);
    if (set === undefined) {
      set = new Set<NpcID>();
      this.met.set(playerId, set);
    }
    set.add(npcId);
  }
}

// Replace %tokens. Longest prefix first (up to maxTokenLen), then resume AFTER the replacement.
export function substitute(
  text: string,
  ctx: GreetingContext,
  tokens: Map<string, TokenFn>,
  maxTokenLen = 4,
): string {
  let out = text;
  let i = out.indexOf('%');
  while (i !== -1) {
    let advance = 1;
    for (let len = Math.min(maxTokenLen, out.length - i); len > 1; len--) {
      const fn = tokens.get(out.slice(i, i + len));
      if (fn !== undefined) {
        const rep = fn(ctx);
        out = out.slice(0, i) + rep + out.slice(i + len);
        advance = Math.max(1, rep.length); // fix: skip the replacement, not just the token
        break;
      }
    }
    i = out.indexOf('%', i + advance);
  }
  return out;
}

// simplified: the Arena code marks the flag before picking the line (same order here);
// it omits the text wrap (distributeNewlines), the shared game RNG (rand is injected here),
// the 100 and 15 base offsets (replaced by two explicit banks), and per-player keying (Arena keeps the flag per entity).
export function pickGreeting(
  bank: GreetingBank,
  ledger: MetLedger,
  ctx: GreetingContext,
  rand: (n: number) => number,
  tokens: Map<string, TokenFn>,
): string {
  const prevMet = ledger.hasMet(ctx.playerId, ctx.npcId);
  if (!prevMet) {
    ledger.markMet(ctx.playerId, ctx.npcId);
  }
  const lines = prevMet ? bank.repeat[ctx.personality] : bank.firstMeet[ctx.personality];
  if (lines === undefined || lines.length === 0) {
    throw new Error(`empty greeting bank for personality ${ctx.personality}`);
  }
  const raw = lines[rand(lines.length)];
  return substitute(raw, ctx, tokens);
}

export {};
