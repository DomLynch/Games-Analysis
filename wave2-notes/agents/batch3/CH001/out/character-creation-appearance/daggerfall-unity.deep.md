# daggerfall-unity (character-creation-appearance, cell 31)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/UserInterfaceWindows/CreateCharClassQuestions.cs` (the class quiz); also `DaggerfallStartNewGameWizard.cs` (flow), `Assets/Scripts/Game/UserInterface/FacePicker.cs`, `Assets/Scripts/Game/Utility/PaperDollRenderer.cs`, `Assets/Scripts/Game/Utility/NameHelper.cs` (secondary) | Licence: MIT (LICENSE line 1 "MIT License"; line 3 "Copyright (c) 2009-2023 Daggerfall Workshop") | C# | symbol `CreateCharClassQuestions.AnswerAndPlayAnim`

Checked: Read CreateCharClassQuestions.cs 42-66 and 81-135 (setup), 213-290 (question pick and display), 295-430 (weights, result, lookup, confirm), 520-530 and 560-568 (table head and tail). Counted: the answer table is 40 rows of three values (lines 526-565, 120 values). Read DaggerfallStartNewGameWizard.cs 113-130 and 292-380 (flow, class file, bio step). Read FacePicker.cs (whole file), PaperDollRenderer.cs 297-357, NameHelper.cs 24-120 and 160-300 and 370-395, CreateCharNameSelect.cs 120-176 (random name, field clearing, accept). Grep-level only: NameGen.txt (11 banks and 56 sets counted by grep, not read in full); no scar or wound term in Scripts (whole-word search, no hits). Not read: the CLASSn.CFG loader and the bio step. CLASSES.DAT is not in the donor box (find, Assets, depth 5). Confidence: high on the quiz order of operations and the lookup; medium on what the results-table scan does on a real file, because the data file is not here. Not a camera note.

## 1. Mechanism

- Where it sits: race, then gender, then a choice of "generate" or "pick from list" (wizard 318-328). "Generate" opens the quiz (wizard 322). A quiz result loads the class file for that index (wizard 333-344). No result, or answering No in the confirm box, falls back to the class list (wizard 346-348; quiz 426-427).
- Question pick: a library of 40 questions (quiz 217). Ten are picked, each distinct (quiz 240-250). The donor draws a random index and, on a repeat, steps forward by one until it finds a free index (quiz 242-245). That makes questions that follow a run of picks more likely: a defect, see section 6.
- Each question shows three answers, a/b/c. The answer table has one row per question and three columns (quiz 307; the table comment at 521-524 gives the codes 00 Warrior, 01 Rogue, 02 Mage). The chosen answer's path gets one more point in a three-slot weight array that starts at zero (quiz 66, 315-316). Ten answers give ten points in total (the code does not check this sum).
- After the tenth answer (quiz 318): the three weights are packed into one 24-bit value (quiz 295-298, `WeightsToUint`). `GetHeaderIndex` scans the results area of CLASSES.DAT: start at byte 18 (quiz 363), a loop bound of 18 plus 48 (quiz 364, 369), three bytes per step (quiz 378). The first match at scan index i gives header index i / 4 (quiz 365, 375). `GetClassIndex` reads the class byte at that header index; for indices above 3 it keeps only the low nibble (quiz 394-395).
- Then the confirm box shows the class description (token 2100 plus the class index, quiz 409). YES keeps it; NO clears it (quiz 426-427). The wizard then loads `CLASS` plus the two-digit index plus `.CFG` from the Arena2 folder (wizard 335-336), sets the career and class index (wizard 342-343), and goes to the bio step (wizard 344).
- Tick: none. Everything runs on answer clicks, keys A, B, C or the mouse (quiz 176-181).

## 2. Key functions

- `GetQuestions()`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/UserInterfaceWindows/CreateCharClassQuestions.cs` 214-253. Builds the 40-question library from text tokens and picks ten distinct indices.
- `AnswerAndPlayAnim(int choice)`: same file, 310-354. Order: weight increment (315-316), final-answer branch and lookup (318-333), progress (335), constellation brightness and animation (336-353).
- `GetHeaderIndex(byte[] classData)`: same file, 361-382. Scan for the packed weight triple.
- `GetClassIndex(int index, byte[] data)`: same file, 390-398. Nibble rule.
- `ConfirmDialog_OnButtonClick`: same file, 424-430. NO clears the class.
- `CreateCharClassQuestions_OnClose` and `ChooseClassGen_OnClose`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/UserInterfaceWindows/DaggerfallStartNewGameWizard.cs` 318-350.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ask k distinct questions out of N | k = 10 (quiz 44); N = 40 (quiz 217) |
| Each answer adds one point to one of three paths | three paths (quiz 66); three answers per question (quiz 307; table 526-565) |
| Packed path weights look up a result | results scan from byte 18 (quiz 363); 48 (quiz 364) as the bound; four weight sets per class (quiz 365) |
| Result index maps to a class | high-nibble mask above index 3 (quiz 394-395) |
| Result and question data | answer table: 120 values, "Ripped from FALL.EXE v1.07.213" (quiz 524); results in CLASSES.DAT, not in the donor box |
| Confirm the result | class description token base 2100 (quiz 409) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: pick ten, one point per answer, the lookup only after the tenth answer, and a missing match is an error rather than a class. It changes three things on purpose: the pick is a partial Fisher-Yates shuffle (the donor's linear probe is replaced); the answer table and results come in as our own data (no game-binary table, no CLASSES.DAT, no packed bytes, no nibble mask); and the sketch returns a class id or null, with no UI, animation, confirm box or class-file load. It does not check the weight sum, because the donor does not either and the table is ours.

```ts
// Licence: MIT (donor). Clean-room sketch of the mechanism; no donor lines or donor data copied.
// clean-room
type PathId = 0 | 1 | 2; // three paths; names and meaning come from our catalogue, not the donor

interface QuizData {
  questionCount: number;             // size of the question library (donor: 40)
  answers: PathId[][];               // one row per question, one entry per answer choice (our data)
  results: Map<string, number>;      // weight triple "w0,w1,w2" -> class id (our data)
}

interface QuizState {
  picked: number[];                  // question indices, in ask order
  answered: number;
  weights: [number, number, number];
}

// Pick `pick` distinct indices from `total`. Partial Fisher-Yates: each subset is equally likely.
// The donor steps to the next free index on a repeat, which makes questions after a run of picks more likely.
function pickQuestions(total: number, pick: number, rand: () => number): number[] {
  const idx = Array.from({ length: total }, (_, i) => i);
  for (let i = 0; i < pick; i++) {
    const j = i + Math.floor(rand() * (total - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, pick);
}

function startQuiz(data: QuizData, rand: () => number): QuizState {
  return { picked: pickQuestions(data.questionCount, 10, rand), answered: 0, weights: [0, 0, 0] };
}

// One answer. Returns the class id after the last answer, null while asking, and null with no match
// (the caller must treat a no-match as an error, not as a class).
function answer(state: QuizState, data: QuizData, choice: 0 | 1 | 2): number | null {
  const q = state.picked[state.answered];
  const path = data.answers[q][choice];
  state.weights[path] += 1;
  state.answered += 1;
  if (state.answered < state.picked.length) return null;
  return data.results.get(state.weights.join(",")) ?? null;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS at /tmp/ch001-daggerfall-quiz.ts exited 0.

## 5. Lands in

- TARGET `origins/catalogue/archetype-quiz.ts` (proposed, new file): the ten-question quiz data (questions, answer-to-path rows, path-triple results) and the pure function that turns ten answers into a playstyle hint. The hint is client-side text; it never writes a class field. The server gets the ten answers and computes the same hint.
- Parity-checklist row 20 (catalogue as runtime source): the answer and result tables are read at run time from catalogue data, not hard-coded.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; the donor's tables are game data from the original binary and are not to be reused)
- Brief rule served: one character and one ledger (the quiz writes a hint, never a class field on the start record); rule 7 (MIT: adapt allowed, licence kept in the file header)

## 6. Gaps and risks

- The answer table and the results live in the original game's data (table comment at quiz 524: "Ripped from FALL.EXE"; CLASSES.DAT and the CLASSn.CFG files are read from the player's Arena2 folder, wizard 335-336). Frankendom must author its own table. Do not copy the donor's numbers or the data file.
- Defect 1, pick bias (quiz 243-245): a repeat steps forward by one, so questions after a run of picks come up more often. Fix: shuffle the library and take the first ten, as the sketch does. The idea (ten random questions) is kept.
- Defect 2, results scan (quiz 363-369): the loop reads 66 three-byte entries from byte 18 and divides the hit index by four. Whether that bound stays inside the real table depends on the data file, which is not in the box, so this is not verified. Fix: store the entry count in our data and fail loud when the triple is missing (the sketch returns null and the caller must throw).
- Defect 3, no sum check (quiz 318): the weights are not checked to total ten. Fix: a test that every result table row sums to the question count.
- Unseeded random (quiz 242): the question draw uses the engine's random source. That is fine on the client. The server must not re-roll the questions; it should store the ten chosen questions with the answers, one ledger.
- "class-free start": I did not have the ruling text. The decision assumes "class-free" means no class is set at creation. If the ruling is stricter than that, reject the whole quiz.
- Appearance parts (thin, read but not written up): FacePicker shows ten faces per race and gender from one image sheet and wraps at both ends (FacePicker.cs 33, 91, 117-118, 126-127). The paper-doll draws the nude body, then clothed parts, then the head last (PaperDollRenderer.cs 312, 340, 356). This is 2D, so no 3D body family and no shared rig. Scars: none in the donor. Names: NameHelper builds a first name from one part of set A and one of set B (sets 0 and 1 for men, 2 and 3 for women, NameHelper.cs 194-200), a surname from sets 4 and 5 (218), a Nord suffix, and a Redguard fourth part at 75% for men (280). NameGen.txt has 11 banks and 56 sets (counted). The name box is cleared when race or gender changes (CreateCharNameSelect.cs 148, 158), and accept needs text (139). A name grammar of this kind is a candidate for a separate cell.

Best transferable idea: ten random questions from a library of 40, each answer adds a point to one of three paths, and only the final weight triple is looked up, so the quiz gives a starting hint without choosing a class by hand.
Decision (proposed): adapt - keep the ten-of-forty shape and the three-path weights, but shuffle the pick, use our own tables, and show the result as a playstyle hint that never writes a class; reject the class-file load and the game-binary table.
Acceptance: a new player answers ten questions, sees one playstyle hint, and the saved character has no class field; a server test asserts the hint is a pure function of the ten chosen paths and the start record has no class id.

Reuse tag: rewrite-from-idea (MIT: code may be adapted; donor tables are game data and are not reused)
Brief rule served: one character and one ledger (the quiz writes a hint, never a class field); rule 7 (MIT, licence kept)
