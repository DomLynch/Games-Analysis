// Licence: GPL-3.0-or-later (donor, copying.md). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Verb = "send" | "queue" | "clear";

interface BufferedCommand {
  verb: Verb;
  atMs: number;      // when the input was pressed
  payload: string;   // the command the simulation receives
}

interface InputBuffer {
  items: BufferedCommand[];
  maxItems: number;  // Frankendom choice, not a donor number
  windowMs: number;  // Frankendom choice, not a donor number
}

// Returns the commands to hand to the simulation now.
function onInput(buf: InputBuffer, cmd: BufferedCommand, nowMs: number): string[] {
  buf.items = buf.items.filter((c) => nowMs - c.atMs <= buf.windowMs);
  switch (cmd.verb) {
    case "queue":
      buf.items.push(cmd);
      if (buf.items.length > buf.maxItems) {
        buf.items.splice(0, buf.items.length - buf.maxItems);
      }
      return [];
    case "send": {
      const out = [...buf.items.map((c) => c.payload), cmd.payload];
      buf.items = [];
      return out;
    }
    case "clear":
      buf.items = [];
      return [];
  }
}
export {};
