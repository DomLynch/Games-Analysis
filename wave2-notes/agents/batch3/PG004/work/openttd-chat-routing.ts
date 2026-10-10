// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Conn {
  id: number;
  authorized: boolean;
  company: number | null;   // null = spectator / no company
}

export type Route =
  | { kind: "broadcast" }
  | { kind: "team" }                 // the sender's own company, read from server state
  | { kind: "private"; to: number }; // one client by id

export const CHAT_MAX_CHARS = 900;   // donor cap is in bytes incl. terminator; this sketch counts characters

export interface Delivery { ids: number[]; text: string; }

// Server routing for one inbound chat line from one connection.
export function routeChat(sender: Conn, route: Route, text: string, conns: Conn[]): Delivery {
  if (!sender.authorized) return { ids: [], text: "" };
  const body = text.slice(0, CHAT_MAX_CHARS);
  switch (route.kind) {
    case "broadcast":
      return { ids: conns.filter(c => c.authorized).map(c => c.id), text: body };
    case "team":
      if (sender.company === null) return { ids: [], text: "" };
      return { ids: conns.filter(c => c.authorized && c.company === sender.company).map(c => c.id), text: body };
    case "private": {
      const target = conns.find(c => c.id === route.to && c.authorized);
      return { ids: target ? [target.id] : [], text: body };
    }
  }
}

export {};
