# xu4-engine-u4 (quests-dialogue, cell 12)
Donor: /mnt/frankendom-donors/xu4-engine-u4/src/codex.cpp (quest ladder, read in full) + /mnt/frankendom-donors/xu4-engine-u4/src/discourse_tlk.cpp (dialogue VM: parked question, read in full) + /mnt/frankendom-donors/xu4-engine-u4/src/party.cpp (karma gains and throttle, join gate) | Licence: GPL-3.0 (COPYING line 2: "Version 3, 29 June 2007") -> copyleft, clean-room, shape only | C | symbol codexStart / codexHandleVirtues / runTalkDialogue
Checked: camera_scope not applicable (quests). Read in full: src/codex.cpp (1-421), src/discourse_tlk.cpp (1-551), src/codex.h enum (8-24), src/discourse.cpp (120-160 dispatch). Read in part: src/party.cpp (519-528 throttle; 532-570 adjustKarma; 622-640 adjustVirtues, negative branch not read; 785-797 canPersonJoin; 805-812 donate; 986-1013 join). Not read: xu4_random (declaration xu4.h:75 only), item.cpp:334 (caller of codexStart, grep only), avatar.exe string tables (the data side: counts taken from the calls at codex.cpp:43-45, the file itself was not opened), discourse_castle.cpp, the Boron script blocks. Grep of src/ for quest/objective found no quest or objective record; the quest state is the codex ladder and the karma record. Confidence: high on the ladder and the parked question; medium on the karma throttle's behaviour in play (read only the code). Depth: full for the ladder; the reward side is thin (karma and party only). The hint file (discourse_tlk.cpp) is the dialogue half, not the ladder.

## 1. Mechanism
The Codex is a staged gate ladder, entered only with the three-part key (codex.cpp:96-97). Stage 1 is the Word of Passage: three tries (214), then a 'passage' check that the party has eight members (235) and every virtue karma is zero (241-242). Stage 2 asks the eight virtues in order, then three base virtues: 11 questions (current runs 0 to VIRT_MAX+2, 271-298). Each question gets three tries (307); a correct answer resets the miss count and advances (283-298). A third miss ejects the player to that virtue's start point (316, and the table at 129-138, applied in codexEject at 192-195). Base-virtue failures use codes after HUMILITY, so no teleport happens for them (codex.h:13-21, 192). Stage 3 asks one final question with three tries (323); a miss ejects with BAD_INFINITY (340). Success plays the reveal (344-376) and then the endgame pages (385-421), each waiting for a key, and reports the move count (412). Each ejection ends the attempt (codexEject returns control to the game at 200); a new attempt restarts from stage 1.

The dialogue half is a parked question. A keyword that matches the TLK record's ask trigger sets nextOp = OP_PAUSE_ASK (346-347, 355). The loop then waits for a key (121), asks the question (123) and reads yes or no (125, talkYNResponse at 42-67). The answer changes karma through adjustKarma: yes gives KA_BRAGGED, no gives KA_HUMBLE, only when the record's questionHumility byte is set (387-392, 496). The Boron variant does the same from a script block (456-468, 487-503). Turn-away is a per-NPC probability byte (turnAway, 275, 101-109).

Karma gains (party.cpp): honor +5 is direct (539); beggar donation +2 compassion sits behind the throttle (552); humble +10 humility sits behind the throttle (558-559); bragged -5 humility is direct (555). The throttle (519-523) lets a positive gain through once per 16-move bucket: bucket = moves/16 (520-521). Positive karma is capped at 99 (633).

Join (party.cpp:986-1000): the avatar must have members+1 at most hpMax/100 (994-995), and the candidate class's karma must not be between 1 and 39 (998-1000).

## 2. Key functions
- codexStart (codex.cpp:76-120): checks the key, runs codexHandleWOP, codexHandleVirtues, codexHandleInfinity, then codexHandleEndgame; any failure goes to codexEject. Callers: item.cpp:334 (grep only, not opened).
- codexHandleWOP (211-252): three tries (214), party-size and karma checks after a correct word (235-245).
- codexHandleVirtues (258-318): the 11-question ladder; the tries counter (307) and the advance (284, 298).
- codexEject (126-200): one message per code (switch 140-173), a two-second hold (177), exit to parent map (184), per-virtue teleport (192-195), turn finish (199-200).
- codexHandleInfinity (320-378): final question, three tries (323-340), reveal (344-376).
- runTalkDialogue (69-195): the keyword loop, turn-away roll (100-111), reply and parked question (113-125), standard responses give, join, name, look (127-192).
- U4Talk_dialogue (340-397): keyword match with QUEUE_ASK (345-347, 355), karma on answers (387-392).
- Party::virtueIncreaseTimeout (519-523) and Party::adjustKarma (532-570), adjustVirtues (622-).

## 3. Numbers vs mechanism
- Ladder: 3 tries on the word of passage (214), 3 tries per virtue question (307), 3 tries on the final question (323). 11 questions (8 virtues plus 3 base; codex.cpp:43 reads 11 strings). Endgame: 10 key-paged screens (385).
- Entry: party of 8 (235), karma 0 in each of 8 virtues (241-242).
- Eject: eight start points, one per virtue (129-138); base virtue codes do not teleport (192).
- Waits: 2 s after a wrong ejection message (177), 2 s before the reveal (344), 3 s rumble hold (304), 42 ms per reveal step (372).
- Dialogue: TLK record 288 bytes (263); turn-away roll drawn by xu4_random(0x100) (101; the 0..255 range is assumed, xu4_random not read); the attack zone is a roll with turnAway - roll at or above 0x40 (103-109).
- Karma: honor +5 (539), compassion +2 (552, throttled), humility -5 (555), humility +10 (559, throttled), cap 99 (633).
- Throttle: 16 moves per bucket (520-521).

## 4. TypeScript sketch
simplified: question and answer text come from a data table (the donor reads avatar.exe string tables); screen, sound and shake calls are omitted; the eight-member and zero-karma entry checks are left to the caller; the donor's 42 ms reveal is omitted; the throttle compares the bucket as a plain number (the donor masks it to 16 bits in one branch and drops the throttle once moves/16 reaches 0x10000).
```ts
// Staged quest ladder: three tries per stage; a third miss ejects the player to that stage's respawn point.
// Plus a positive-gain throttle (once per 16-move bucket) with the donor's wrap defect fixed.
// Clean-room shape of xu4 codex.cpp (codexHandleVirtues, codexHandleWOP, codexEject) and party.cpp
// (virtueIncreaseTimeout), in Frankendom terms.
// simplified: question and answer text come from a data table (the donor reads avatar.exe string tables); screen,
// sound and shake calls are omitted; the eight-member and zero-karma entry checks are left to the caller;
// the donor's 42 ms reveal is omitted; the throttle compares the bucket as a plain number (the donor masks it to 16 bits
// in one branch and drops the throttle once moves/16 reaches 0x10000).
export const MAX_TRIES = 3;

export interface Stage {
  answers: string[]; // accepted answers, compared case-insensitively
  respawn: { x: number; y: number }; // where a third miss ejects the player
}

export interface LadderState {
  index: number; // current stage
  tries: number; // misses on the current stage; reset on a correct answer
  done: boolean;
  ejectedTo?: { x: number; y: number }; // set when the attempt ends in ejection
}

export function answerStage(s: LadderState, stages: Stage[], text: string): LadderState {
  if (s.done || s.ejectedTo !== undefined) return s;
  const stage = stages[s.index];
  const given = text.trim().toLowerCase();
  if (stage.answers.some((a) => a.toLowerCase() === given)) {
    const index = s.index + 1;
    return { index, tries: 0, done: index >= stages.length };
  }
  const tries = s.tries + 1;
  if (tries < MAX_TRIES) {
    return { ...s, tries }; // wrong but not out: the same stage is asked again
  }
  return { ...s, tries, ejectedTo: stage.respawn };
}

// Positive gains are allowed once per 16-move bucket. Negative changes are not passed through this gate.
export interface Throttle {
  ok: boolean;
  lastBucket: number;
}

export function positiveGainAllowed(moves: number, lastBucket: number): Throttle {
  const bucket = Math.floor(moves / 16);
  if (bucket !== lastBucket) {
    return { ok: true, lastBucket: bucket };
  }
  return { ok: false, lastBucket };
}

export {};
```
Typecheck: /tmp/QD020-xu4-quest-ladder.ts on the VPS, `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in
origins/quests/stage-ladder.ts (proposed new module; stage ladder as zone data, answer check on the server) | parity row 18 (the loot roll and XP award is where the ladder's reward is written to the one ledger; karma gains are the ledger entries). Row 18 only; the ladder itself is quest state, not a fight rule.

## 6. Gaps and risks
- Text answers do not suit a fast browser fight. Keep the ladder shape and replace the typed answer with a state check (kill, item, position) that the server verifies.
- Respawn per stage: the donor ejects to a fixed coordinate per virtue (129-138). In zones-as-data each stage should name its own respawn point in the zone file.
- One ledger: karma is a party record here. Frankendom's ledger should hold it once; no second copy on the character.
- The donor's throttle has a defect: once moves/16 reaches 0x10000 the first test is always true (520), so the once-per-bucket rule stops applying. Fix: compare the full bucket, as in the sketch. Keep the idea (positive gains rate-limited, negatives not).
- The donor ends the whole attempt on any ejection (codexEject returns control at 200). A Frankendom quest should decide per stage whether a miss restarts the stage or the attempt; not copied as is.
- Pit as client: the ladder and gains are server state. Messages, shake and reveal are client only.
- MAX_ATTACKERS = 3: no link. The party-of-eight rule is a quest precondition, not an attacker cap.

Reuse tag: new for Frankendom (the Frankendom repo was not searched by this reader; reuse-first not checked).
Brief rule served: judge the idea, not the genre (addendum rule 2): a three-try stage ladder with per-stage soft-fail respawn and a bucketed positive-gain throttle are both checkable; the defect in the throttle is listed with its fix.
Best transferable idea: a quest is a ladder of stages with three misses per stage, each stage ejecting to its own respawn point, and positive reward gains allowed once per fixed time bucket while losses always apply.
Decision (proposed): adapt - keep the three-try ladder with per-stage respawn and the bucketed positive-gain throttle, with the wrap defect fixed; replace typed answers with server-verified state checks, since text answers do not fit a fast fight.
Acceptance: a server test shows three misses on one stage eject the player once to that stage's respawn point and end the attempt; a correct answer resets the miss count; a second positive karma gain inside the same 16-move bucket is refused while a negative change still applies.
