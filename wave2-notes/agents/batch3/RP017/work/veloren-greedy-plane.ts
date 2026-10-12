// Licence: GPL-3.0 (donor, LICENSE file; greedy.rs has no licence header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Greedy rectangle merge for one plane of faces: a face is a key (material plus flags) or null. Equal-key faces that touch merge into one quad.
interface Quad { x: number; y: number; w: number; h: number; key: number; }

function rowMatches(m: (number | null)[], nx: number, row: number, i: number, w: number, key: number): boolean {
  for (let k = i; k < i + w; k++) {
    if (m[row * nx + k] !== key) return false;
  }
  return true;
}

function greedyPlane(mask: (number | null)[], nx: number, ny: number): Quad[] {
  const m = mask.slice(); // work copy; cells are cleared as quads are emitted
  const out: Quad[] = [];
  for (let j = 0; j < ny; j++) {
    let i = 0;
    while (i < nx) {
      const key = m[j * nx + i];
      if (key === null) { i += 1; continue; }
      let w = 1;
      while (i + w < nx && m[j * nx + i + w] === key) w += 1;
      let h = 1;
      while (j + h < ny && rowMatches(m, nx, j + h, i, w, key)) h += 1;
      out.push({ x: i, y: j, w, h, key });
      for (let l = j; l < j + h; l++) {
        for (let k = i; k < i + w; k++) m[l * nx + k] = null;
      }
      i += w;
    }
  }
  return out;
}

const demo = [1, 1, 2, null, 1, 1, 2, null, null, null, 2, 2];
console.log(JSON.stringify(greedyPlane(demo, 4, 3)));
