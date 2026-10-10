// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type PlayerId = number;
type Channel = "all" | "observers" | number[]; // number[] = 0-based side indexes

interface ChatMsg { text: string; channel: Channel; side?: number }

interface RoomState {
  players: PlayerId[];              // join order
  observers: PlayerId[];
  sideOwner: (PlayerId | null)[];   // index = side, value = controlling player
  muted: Set<PlayerId>;             // muted observers
  muteAll: boolean;
}

type Route =
  | { ok: true; to: PlayerId[]; from: PlayerId; side: number | undefined; text: string }
  | { ok: false; error: string };

// One chat message. The server stamps who sent it and from which side, then picks recipients by channel.
function routeChat(room: RoomState, from: PlayerId, msg: ChatMsg): Route {
  // 1. Identity: the sender's name is always the logged-in one. A player's side is corrected if it is not theirs.
  let side: number | undefined = msg.side;
  if (room.players.includes(from)) {
    const idx = msg.side ?? -1;
    if (room.sideOwner[idx] !== from) side = room.sideOwner.indexOf(from); // -1 if the player owns no side
    if (side !== undefined && side < 0) side = undefined;
  }

  // 2. Mute: a muted observer may write only to the observer channel.
  const muted = room.observers.includes(from) && (room.muteAll || room.muted.has(from));
  if (muted && msg.channel !== "observers") {
    return { ok: false, error: "You have been muted, others can't see your message!" };
  }

  // 3. Recipients by channel, never including the sender.
  let to: PlayerId[];
  if (msg.channel === "all") {
    to = room.players.concat(room.observers);          // donor: all_game_users()
  } else if (msg.channel === "observers") {
    to = room.observers;
  } else {
    const sides: number[] = msg.channel;
    to = room.players.filter(p => sides.some(i => room.sideOwner[i] === p));
  }
  return { ok: true, to: to.filter(p => p !== from), from, side, text: msg.text };
}

export {};
