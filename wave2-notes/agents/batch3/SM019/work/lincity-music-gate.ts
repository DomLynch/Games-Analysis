// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Song {
  title: string;
  file: string;   // data: file name inside the theme folder
  minPct: number; // data: lowest progress percent that may play this song
  maxPct: number; // data: highest progress percent; 0 means no upper limit
}

const PROGRESS_SCALE = 1000000; // raw progress that equals 100 percent (donor MAX_TECH_LEVEL)
const FADE_OUT_MS = 1000;       // fade when music is switched off (not used by this sketch)

// Raw progress -> percent, rounded to one decimal as in the donor.
function progressPct(raw: number): number {
  return Math.round((raw * 100 / PROGRESS_SCALE) * 10) / 10;
}

function fits(song: Song, pct: number): boolean {
  const top = song.maxPct === 0 ? Infinity : song.maxPct;
  return pct >= song.minPct && pct <= top;
}

class MusicPlaylist {
  private index = -1;

  constructor(private readonly songs: readonly Song[]) {}

  // Forward circular scan, at most one lap. Returns null when no song fits, so the caller stays silent.
  next(rawProgress: number): Song | null {
    const pct = progressPct(rawProgress);
    const n = this.songs.length;
    for (let step = 1; step <= n; step++) {
      const i = (this.index + step) % n;
      if (fits(this.songs[i], pct)) {
        this.index = i;
        return this.songs[i];
      }
    }
    return null;
  }

  // Called when the current track ends (donor: musicHalted -> NEXT_OR_FIRST_TRACK).
  onTrackEnded(rawProgress: number): Song | null {
    return this.next(rawProgress);
  }
}

const demoSongs: Song[] = [
  { title: "City Blues", file: "a.ogg", minPct: 0, maxPct: 0 },
  { title: "Contemplations", file: "b.ogg", minPct: 1, maxPct: 0 },
  { title: "Lincity", file: "c.ogg", minPct: 2, maxPct: 0 },
];
const demo = new MusicPlaylist(demoSongs);
const firstAtZero = demo.next(0);
const endedAtTwo = demo.onTrackEnded(20000); // 2 percent of the scale

export {};
