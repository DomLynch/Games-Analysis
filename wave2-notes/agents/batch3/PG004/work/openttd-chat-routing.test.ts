import { routeChat, Conn } from "./openttd-chat-routing";
const conns: Conn[] = [
  { id: 1, authorized: true, company: 1 },
  { id: 2, authorized: true, company: 2 },
  { id: 3, authorized: true, company: 2 },
  { id: 4, authorized: false, company: 2 },
  { id: 5, authorized: true, company: null },
];
const lines: string[] = [];
lines.push("team from company 2: " + JSON.stringify(routeChat(conns[1], { kind: "team" }, "hi", conns).ids));
lines.push("team from spectator: " + JSON.stringify(routeChat(conns[4], { kind: "team" }, "hi", conns).ids));
lines.push("private to 3 from 1: " + JSON.stringify(routeChat(conns[0], { kind: "private", to: 3 }, "yo", conns).ids));
lines.push("private to unauthorized 4: " + JSON.stringify(routeChat(conns[0], { kind: "private", to: 4 }, "yo", conns).ids));
lines.push("broadcast: " + JSON.stringify(routeChat(conns[0], { kind: "broadcast" }, "all", conns).ids));
lines.push("length cap: " + routeChat(conns[0], { kind: "broadcast" }, "x".repeat(1000), conns).text.length);
console.log(lines.join("\n"));
