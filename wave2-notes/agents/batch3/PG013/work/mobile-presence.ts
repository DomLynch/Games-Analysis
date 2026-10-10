// Licence: GPL-3.0 (donor LICENSE). Clean-room: shape only, written from the described rules, not a translation.
// clean-room
interface Friend { id: string; name: string; title: string | null; patronColor: number | null; playing: boolean }

type PresenceEvent =
  | { topic: 'snapshot'; raw: string[]; patronColors: number[]; playingIds: string[] }
  | { topic: 'enters'; raw: string; patronColor: number | null; playing: boolean }
  | { topic: 'leaves'; raw: string }
  | { topic: 'playing'; raw: string }
  | { topic: 'stopped_playing'; raw: string };

// "TITLE Name" or "Name". Only the first two words are used, as in the donor.
function parseName(raw: string): { id: string; name: string; title: string | null } {
  const parts = raw.split(' ');
  const name = parts.length > 1 ? parts[1] : parts[0];
  const title = parts.length > 1 ? parts[0] : null;
  return { id: name.toLowerCase(), name, title };
}

function snapshotList(ev: Extract<PresenceEvent, { topic: 'snapshot' }>): Friend[] {
  return ev.raw.map((r, i) => {
    const colorRaw = ev.raw.length === ev.patronColors.length ? ev.patronColors[i] : null;
    const patronColor = colorRaw !== null && colorRaw > 0 ? colorRaw : null; // 0 means not a patron
    const p = parseName(r);
    return { ...p, patronColor, playing: ev.playingIds.includes(p.id) };
  });
}

class PresenceList {
  private list: Friend[] = [];
  private listening = false;

  constructor(private readonly send: (topic: string) => void) {}

  // Called when the screen gains focus: listen, then ask for a full snapshot.
  resume(): void {
    this.listening = true;
    this.send('following_onlines');
  }

  // Called when the screen loses focus: stop applying events. The list is kept.
  pause(): void {
    this.listening = false;
  }

  // Called on every socket (re)connect; only while listening, as in the donor.
  onConnected(): void {
    if (this.listening) this.send('following_onlines');
  }

  apply(ev: PresenceEvent): Friend[] {
    if (!this.listening) return this.list;
    switch (ev.topic) {
      case 'snapshot':
        this.list = snapshotList(ev); // the snapshot replaces everything
        break;
      case 'enters': {
        const p = parseName(ev.raw);
        // Appended without a duplicate check, as in the donor.
        this.list = [...this.list, { ...p, patronColor: ev.patronColor, playing: ev.playing }];
        break;
      }
      case 'leaves': {
        const id = parseName(ev.raw).id;
        this.list = this.list.filter((f) => f.id !== id);
        break;
      }
      case 'playing':
      case 'stopped_playing': {
        const id = parseName(ev.raw).id;
        const on = ev.topic === 'playing';
        this.list = this.list.map((f) => (f.id === id ? { ...f, playing: on } : f));
        break;
      }
    }
    return this.list;
  }
}

export {};
