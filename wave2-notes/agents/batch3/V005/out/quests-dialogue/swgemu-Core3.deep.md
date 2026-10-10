# swgemu-Core3 (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature/conversation/ConversationObserverImplementation.cpp` | Licence: AGPL-3.0 (per-file header "See file COPYING"; COPYING read at the repo root: GNU Affero GPL v3) | C++ | symbol `ConversationObserverImplementation::notifyObserverEvent`

Checked: `ConversationObserverImplementation::notifyObserverEvent` (starts at 16; read to just before `createConversationSession` at 146), `getNextConversationScreen` (starts at 180; read to 206), `runScreenHandlers` (208-236, read in full), `sendConversationScreenToPlayer` (237-251, read in full). `ConversationScreen::sendTo` and `getOptionLink` (read, ConversationScreen.h 158-232). `ConversationTemplate::readObject` (read). `DeliverMissionScreenHandler::handleScreen` (122-178, read in full). `DeliverMissionObjectiveImplementation::updateMissionStatus` (169-225, read in full; `complete()` itself not read, only called). `CreatureObjectImplementation::checkInConversationRange` (read) and `CONVERSATION_MAX_DISTANCE` (CreatureObject.idl 240). Candidates opened and not used: `InformantMissionScreenHandler.cpp`, `PetTrainingScreenHandler.cpp`, `LuaConversationTemplate.cpp`, `QuestTasks.h` (not read in full). camera_scope not applicable. Confidence: high for the dialogue state machine and the deliver-mission states. Not read: the quest task engine (`QuestTasks.h`, `LuaQuestTask.cpp`), which is a separate system; the Lua screen data for a real NPC (only the loader code). Callers: I read the observer's event path for STARTCONVERSATION, POSITIONCHANGED and STOPCONVERSATION; I did not read the code that fires CONVERSE.

## 1. Mechanism

- A talk is a session between one player and one NPC, stored on the player (`addActiveSession`, 147). The session holds the last screen shown. The NPC's dialogue is a graph of screens keyed by id (`ConversationTemplate`, screens put by id at 46), with an initial screen (6).
- Start: STARTCONVERSATION cancels any old session, creates a new one, and registers a position observer (`createPositionObserver`).
- Each choice: the player's selected index is looked up on the last screen's option (`getOptionLink`, `ConversationScreen.h` 161). The link names the next screen (`getNextConversationScreen`, 200). With no session the initial screen is used (203). An index with no option gives an empty id, which finds no screen and ends the talk (the `else` at 138 cancels the session).
- Screen handlers run before a screen is sent (`runScreenHandlers`, 133, 216-222). A handler gets a copy of the screen and the choice; it either returns a screen (its text can change) or returns nothing, and the chain moves to the handler's `nextScreenId` (221-222). The loop has no hop limit (`while (modifiedScreen == nullptr)`, line 212).
- Send: `sendTo` sends the text and the option labels; null options are skipped in the label list (189-192). The screen is saved as the session's last screen (232), unless the screen ends the talk (`stopConversation`, 214 and 226, which clears the saved screen).
- Leash: on every move (POSITIONCHANGED), if the NPC is an AI agent and the player is out of range, the session is cancelled with a forced close (71-72). The range is `CONVERSATION_MAX_DISTANCE` = 7 (CreatureObject.idl 240), compared as squared distance with a strict less-than (4769-4771).
- Deliver mission (the handler for `DELIVER` and `CRAFTING` missions): the objective has three states, init 0, picked up 1, delivered 2 (DeliverMissionObjective.idl 25-27). The pickup NPC's talk at init creates a data-disk item in the inventory, moves the waypoint to the destination, and sets picked up (182-208). The destination NPC's talk at picked up checks the item is still in the inventory (212); if it is, the item is destroyed, the objective completes and the state becomes delivered (221-223). If the item is missing, the state does not change and the line is give-item (162).
- The line the player sees is chosen from the state after the update: delivered gets the delivered line; picked up with no item gets give-item; a talk after delivery gets already-dropped-off (171); no relevant mission gets one of five random lines (128).
- Tick: none. Event-driven: each talk and each move is one event. No per-frame loop.

## 2. Key functions

- `ConversationObserverImplementation::notifyObserverEvent`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature/conversation/ConversationObserverImplementation.cpp` 16-145 region. Event switch, leash, screen selection, handler chain, send.
- `getNextConversationScreen`: same file, 180-206. Option link on the last screen, or the initial screen.
- `runScreenHandlers`: same file, 208-236. Handler chain by next screen id.
- `ConversationScreen::sendTo` and `getOptionLink`: `.../conversation/ConversationScreen.h` 158-232.
- `DeliverMissionScreenHandler::handleScreen`: `.../screenhandlers/DeliverMissionScreenHandler.cpp` 122-178. Talk gate and line choice by state.
- `DeliverMissionObjectiveImplementation::updateMissionStatus`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/mission/DeliverMissionObjectiveImplementation.cpp` 169-225. The state machine.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Dialogue as a graph: screen, options, each option links to a screen id | Screen ids and text come from Lua data (ConversationTemplate.cpp 6 and 46) |
| Handler chain: a handler may rewrite the screen or pass it on by id | Handlers are keyed by the screen id they handle (`screenHandlers.get(...)`, line 216) |
| Leash: end the talk when the player moves out of range | Talk range 7 units (CreatureObject.idl 240); squared-distance strict less-than (4769-4771) |
| Three-state objective: init, picked up, delivered, moved only by talk | States 0, 1, 2 (DeliverMissionObjective.idl 25-27) |
| Line chosen from the state after the change | Five random no-mission lines (`System::random(4)`, 128) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the option link from the last screen (or the initial screen with no session), the handler chain (a handler may rewrite the screen or pass it on by id), the squared-distance leash with a strict less-than, and the deliver objective's state gates (talk at init gives the item and moves to picked up; talk at picked up with the item delivers; without the item it changes nothing). It omits: the session objects and the observer registration; the stopConversation flag and the spaceship timer path; the null-option label skip; the random no-mission lines; the item creation and the waypoint update; `complete()`; the datapad lookup that finds the relevant mission. It adds `MAX_HOPS` = 16, a hop limit the donor does not have (the donor loops until a handler returns a screen). That changes behaviour for a pathological chain: the donor would loop forever, the sketch ends the talk.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Option { label: string; link: string; }   // link "" = no screen behind this option
interface Screen { id: string; text: string; options: Option[]; stop: boolean; }

interface Pos { x: number; z: number; }
interface PlayerState { pos: Pos; }
interface NpcState { pos: Pos; }

type Handler = (p: PlayerState, npc: NpcState, choice: number, screen: Screen) => Screen | null;
interface Chain { handler: Handler; nextScreenId: string; }  // null from handler = pass to nextScreenId

interface Template { initial: string; screens: Map<string, Screen>; handlers: Map<string, Chain>; }
interface Session { lastScreen: Screen | null; }

const TALK_RANGE = 7;     // units; compared as squared distance, strictly less than
const MAX_HOPS = 16;      // sketch guard; the donor has no hop limit

function inRange(a: Pos, b: Pos): boolean {
  const dx = a.x - b.x, dz = a.z - b.z;
  return dx * dx + dz * dz < TALK_RANGE * TALK_RANGE;
}

// The player's choice selects a link from the last screen; no session means the initial screen.
function nextScreen(t: Template, s: Session | null, choice: number): Screen | undefined {
  if (s !== null && s.lastScreen !== null) {
    const link = s.lastScreen.options[choice]?.link ?? "";
    return t.screens.get(link);
  }
  return t.screens.get(t.initial);
}

// Screen handlers may rewrite the screen (return it) or pass it on to the next screen id.
function runHandlers(t: Template, p: PlayerState, npc: NpcState, choice: number, screen: Screen): Screen | null {
  let cur: Screen | undefined = screen;
  for (let hop = 0; cur !== undefined && hop < MAX_HOPS; hop++) {
    const chain = t.handlers.get(cur.id);
    if (chain === undefined) return cur;
    const out = chain.handler(p, npc, choice, { ...cur, options: cur.options.slice() });
    if (out !== null) return out;
    cur = t.screens.get(chain.nextScreenId);
  }
  return null;  // no next screen: the conversation ends
}

// Deliver objective: 0 init, 1 picked up, 2 delivered. Pickup NPC and destination NPC are the only two talk points.
const INIT = 0, PICKED = 1, DELIVERED = 2;
interface Deliver { status: number; hasItem: boolean; }

function talkToPickup(d: Deliver): "give-item-now" | "already-picked-up" {
  if (d.status === INIT) { d.hasItem = true; d.status = PICKED; return "give-item-now"; }
  return "already-picked-up";
}

function talkToDestination(d: Deliver): "delivered" | "give-item" | "already-dropped-off" {
  if (d.status === PICKED) {
    if (!d.hasItem) return "give-item";   // state unchanged: the item must be in the inventory
    d.hasItem = false;
    d.status = DELIVERED;
    return "delivered";
  }
  if (d.status === INIT) return "give-item";
  return "already-dropped-off";
}

// Leash: on each move, the session ends if the NPC is out of range.
function leashOk(p: PlayerState, npc: NpcState): boolean { return inRange(p.pos, npc.pos); }

export {};
```

## 5. Lands in

- TARGET `origins/dialogue/conversation.ts` (new): the talk graph as data, the leash, and the quest objective gates. The state changes run in the server engine; the client only renders screens. Parity row 20 (catalogue as runtime source: conversation templates are Lua data loaded at runtime). No parity row covers quests or dialogue: rows 1-22 are fight and zone rows, and row 23 is zone population. Lead should decide whether quests need their own row.
- today: not read in Frankendom (no Frankendom dialogue code was opened in this pass).
- Reuse tag: rewrite-from-idea (AGPL-3.0: clean-room, shape only; no line-by-line translation)
- Brief rule served: server-verified kills (the quest state is changed only on the server, in the talk handler, never by the client); zones as data (the screen graph is data, not code).

## 6. Gaps and risks

- AGPL-3.0 is copyleft: the sketch is written from the described mechanism, not translated.
- The handler chain has no hop limit (the loop at line 212 ends only when a handler returns a screen or the next id is missing). A handler whose next id leads back to itself would loop. Frankendom must add a guard (the sketch's MAX_HOPS is a choice, not the donor's).
- Option index and display can disagree. `sendTo` skips null options when it builds the label list (189-192), but `getOptionLink` indexes the raw list (161). If a null option is ever stored, the player picks label 2 and the link is read from the raw position 2. Whether the Lua loader can store a null option was not read.
- The deliver state can get stuck: if the player loses the item at picked up, the destination talk only says give-item (162) and nothing reissues it. Frankendom needs a rule for a lost item (re-issue, fail, or hold), tested.
- The random no-mission lines (128) make the same NPC say different things to the same player. Frankendom should prefer a fixed line per state.
- `complete()` (called at 221) was not read, so the rewards and any ledger writes it does are unknown. Do not treat the state change alone as the reward.
- The reward path (`complete()`, not read) is unverified, so whether it writes through one ledger is unknown. Frankendom must check that before a quest reward is built.

Best transferable idea: run NPC dialogue as a server-side graph of screens whose text is chosen from the same quest state the talk changes, with a range leash that ends the talk when the player walks away.

Decision (proposed): adapt. Take the data-driven screen graph, the per-talk session with a range leash, and the state-gated lines (the text comes from the state after the change); change the handler chain to have a hop limit, drop the random no-mission lines in favour of one fixed line per state, and decide the lost-item rule before building.
Acceptance: a server test: talking to the pickup NPC once gives one item and moves the state to picked up; a second talk says already picked up with no second item; a destination talk without the item says give-item and leaves the state; with the item it delivers, removes the item, and the state is delivered; walking 8 units away ends the talk.

Reuse tag: rewrite-from-idea (AGPL-3.0, clean-room). Brief rule served: server-verified state changes; zones as data.
