# afritz1-OpenTESArena (quests-dialogue, cell 12)
Donor: /mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src | Licence: MIT License (LICENSE.txt, read: "The MIT License (MIT)"; code may be adapted, none copied here) | C++ | symbol GameWorldUI::onNpcWhoAreYouButtonSelected
Checked: opened Interface/GameWorldUiState.cpp (1665-1675, 3431-3452, 4318-4326), Interface/DialogueManager.h (67-70), Interface/DialogueManager.cpp (150-160, 190-196, 268-325), Interface/DialogueFunctions.h (14-25), Interface/DialogueFunctions.cpp (20-25, 186-200, 489-512), Entities/EntityChunkManager.h (154-160), Entities/EntityChunkManager.cpp (290-297, 367-372, 600-615), Assets/ArenaTypes.h (466-500, 545-556), Assets/ArenaTypes.cpp (200-250). camera_scope: n/a. Confidence: medium that the greeting gate is the whole mechanism it covers. Not read: TEMPLATE.DAT loader contents, the chunk unload/reload path (so I cannot say whether the flag survives a reload), the "Where is" and rumour branches (only their call sites were seen), save/load of dialogue state. Quest runtime: grep over src for active-quest state, objectives, rewards and quest flags found none in runtime code; this topic is covered only by the greeting gate below.

## 1. Mechanism
Entry. The Citizen conversation box puts "who are you" on button 0 (GameWorldUiState.cpp:1671). The input action calls the same handler (GameWorldUiState.cpp:4324). I read these two callers only.

Order of operations in the handler (GameWorldUiState.cpp:3431-3452):
1. Disable the top UI context.
2. Read the NPC's dialogue state and remember whether it was already introduced (3442).
3. If not, set it to introduced now (3443-3445).
4. Entry index = 100 + 15 if it was already introduced + the NPC's personality index (3448, 3450). So the first-meet block and the repeat block are two rows of one bank, 15 apart.
5. Draw one random line from that entry (3451).
6. Run %token substitution on the line (3452) and show it in a popup. The popup callback reopens the Citizen box.

Substitution (DialogueManager.cpp:285-324). Find each '%'. Take a window of up to 4 characters (298) and try the longest prefix first, shrinking to 2 characters (299, 318). If a mapped function matches, replace the token with its result (313) and resume the search at the token start plus the token length (314, 321). Finally wrap the text (324); the header default width is 65 (DialogueManager.h:70).

Quest content is largely absent at runtime. 53 of the 80 token functions in DialogueFunctions.cpp return their own token literal (grep count; get_da at line 188 is one example, its body returns "%da"). The "active quest" tokens are among them (get_a is documented as "Active quest reward" at DialogueFunctions.h:14). The save format declares quest records: BaseQuest with startDate, dueDate and reward (ArenaTypes.h:475), and arrays cityQuests and palaceQuests (ArenaTypes.h:552-553). The MainQuestData parser reads nextStep and the other main-quest flags (ArenaTypes.cpp:243-249), but grep finds no runtime code that reads them. So this donor has no quest state, objectives or rewards that run.

## 2. Key functions
- GameWorldUI::onNpcWhoAreYouButtonSelected: GameWorldUiState.cpp:3431-3452 (the gate above).
- DialogueManager::getRandomTemplateDatEntryValue: DialogueManager.cpp:276-283. Picks index game.random.next(entry size) from the shared game RNG (281).
- DialogueManager::hasEntityBeenIntroduced: DialogueManager.cpp:190-196, reads the entity's dialogue state (195).
- DialogueManager::getSubstitutedText: DialogueManager.cpp:285-324 (substitution above).
- EntityChunkManager::initializeEntity: EntityChunkManager.cpp:367. The introduced flag is set to false here inside the dialogue-state block (610). The flag is one bool on the entity state (EntityChunkManager.h:157, 154-160).

Callers: I read the two callers of the handler (1671 and 4324). getSubstitutedText is called once inside the handler (3452); I did not read its other callers (GameWorldUiState.cpp 3538, 3576, 3912, 3938).

## 3. Numbers vs mechanism
- 100: base row of the greeting block (3450).
- 15: row offset added when the NPC was already introduced (3448). The number of personalities per block is not read.
- 4: token window size (298). Tokens shorter than 2 characters are not tried (299).
- 65: default wrap width (DialogueManager.h:70).
- Line choice: uniform over the bank entry (281). No weighting is in the code I read.
- The flag is set before the line is picked (3445 before 3451), so a second call for the same NPC takes the repeat block.

Defects (keep the idea, fix the defect):
- The introduced flag sits on the NPC entity, so it is shared by every player who talks to that NPC. In Frankendom each player needs their own. fix: keep a met-set keyed by (player id, NPC id) in the one ledger.
- The scan resumes at the token start plus the token length (314, 321), not after the replacement. Replacement text is therefore partly rescanned. Today this is harmless for the quest stubs, because each stub returns a literal of the same length as its token, but it is wrong for any real replacement that contains '%'. fix: resume after the replacement (the sketch does this).
- The 100 and 15 are magic numbers in engine code (3448, 3450). fix: move both to the bank definition as zone data.

## 4. TypeScript sketch
simplified: the sketch keeps Arena's order (mark met, then pick a line, then substitute) and the longest-prefix token scan. It omits the text wrap (distributeNewlines), the shared game RNG (rand is injected instead), the 100/15 offsets (replaced by two explicit banks), and any persistence. It re-keys the met flag per player and NPC, and resumes the scan after the replacement.

```ts
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
```

Typecheck: VPS, `npx -p typescript tsc --noEmit --strict --target es2020` on the file with `export {}` appended: exit 0.

## 5. Lands in
Target: origins/dialogue/greeting-gate.ts (new module, proposed). Parity row 20 (catalogue as runtime source): the greeting lines are a runtime data bank read by the engine, not literals in client code.

## 6. Gaps and risks
- Per-entity versus per-player: Arena's flag is one bool per NPC. Frankendom needs the met-set per (player, NPC) in the one ledger, server-side, so a second player does not inherit a first meeting. A server test must assert this.
- No quest state: this donor has no runtime quest state, objectives or rewards. Quest progress needs its own design under the one-ledger ruling; nothing here supplies it.
- Dialogue is a single step: the Arena flow has no choice tree. Frankendom "dialogue trees" would need a separate design; this gate does not give one.
- RNG: the line pick uses a shared game RNG (DialogueManager.cpp:281). Greetings are cosmetic, so the client may pick the line, but the server must still own the met flag.
- Reset and persistence: the flag is reset at entity initialisation (EntityChunkManager.cpp:610). Whether it resets on chunk unload or save/load is not read. The server ledger avoids the question.

Reuse tag: adapt (idea only; the sketch is written from the described order, nothing copied; MIT allows adaptation with the licence kept).
Brief rule served: judge the idea, not the genre (a per-visit gate with banks is a real mechanism); confidence stated in Checked; defects kept with a fix line; sections 5-6 against the Frankendom rulings.

Best transferable idea: Gate NPC greetings on a per-player "already met" bit so first meetings and repeat meetings draw from different personality-indexed line banks, with %tokens resolved after the pick.
Decision (proposed): adapt - the first-meet/repeat gate is cheap, cosmetic and fits zones-as-data (the banks are zone data), but the met state must sit per (player, NPC) in the one ledger, not on the NPC as Arena does.
Acceptance: two players meet the same citizen: each gets a first-meet line once; a second visit by the same player gets a repeat line; a server test asserts the met-set is keyed by player id and NPC id and survives a zone chunk reload.
