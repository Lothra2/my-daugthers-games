/** Small pixel art icons drawn from ASCII and exposed as data URLs. Cached. */
const cache = new Map<string, string>();

const MAP: Record<string, string> = {
  o: '#2A1B3D', g: '#FFD447', G: '#FFF0A0', d: '#E0A82E', s: '#E6E6F0', S: '#9A9AB4', b: '#D99A5B', B: '#8A5230', r: '#FF5E7E', R: '#B83A55',
  w: '#FFFFFF', p: '#FF8FB8', P: '#D2448F', y: '#FFE45C', c: '#7BE3FF',
};
const CUP = [
  '..oooooooooo..',
  '.oGGggggggddo.',
  'ooGgggggggddoo',
  'o.oGggggggdo.o',
  'o.oGggggggdo.o',
  '.oo.Gggggdo.oo',
  '...ooGgggdoo..',
  '.....oggdo....',
  '......ogdo....',
  '......ogdo....',
  '.....ooddoo...',
  '....oGggggdo..',
  '....ooooooooo.',
];
const HEART = [
  '..ooo...ooo..',
  '.opppo.oppwo.',
  'oppwppopppppo',
  'opppppppppppo',
  'opppppppppPpo',
  '.oppppppppPo.',
  '..opppppppPo.',
  '...oppppPPo..',
  '....oppPPo...',
  '.....oPPo....',
  '......oo.....',
];
const MEDAL = [
  '..rr..RR..',
  '..rr..RR..',
  '...rrRR...',
  '..oooooo..',
  '.oGggggdo.',
  'oGgyyyydgo',
  'oGgyyyydgo',
  'oggyyyydgo',
  'oggggggddo',
  '.oddddddo.',
  '..oooooo..',
];
const STAR = [
  '.....o.....',
  '....oyo....',
  '....oyo....',
  'oooooyoooooo'.slice(0, 11),
  'oyyyyyyyyyo',
  '.oyyyyyyyo.',
  '..oyyyyyo..',
  '..oyyooyyo.',
  '.oyo...oyo.',
  'oo.......oo',
];

function draw(rows: string[], tint?: Record<string, string>, scale = 4): string {
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
  const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const col = (tint && tint[ch]) || MAP[ch]; if (ch !== '.' && col) { ctx.fillStyle = col; ctx.fillRect(x * scale, y * scale, scale, scale); } }));
  return c.toDataURL('image/png');
}

export type IconName = 'oro' | 'plata' | 'bronce' | 'corazon' | 'medal-oro' | 'medal-plata' | 'medal-bronce' | 'star' | 'gold-star';
export function icon(name: IconName): string {
  const hit = cache.get(name); if (hit) return hit;
  let url = '';
  switch (name) {
    case 'oro': url = draw(CUP); break;
    case 'plata': url = draw(CUP, { g: '#D5D8E8', G: '#FFFFFF', d: '#9AA0BE' }); break;
    case 'bronce': url = draw(CUP, { g: '#D99A5B', G: '#F2C08A', d: '#8A5230' }); break;
    case 'corazon': url = draw(HEART); break;
    case 'medal-oro': url = draw(MEDAL); break;
    case 'medal-plata': url = draw(MEDAL, { g: '#D5D8E8', G: '#FFFFFF', d: '#9AA0BE', y: '#EEF0FA' }); break;
    case 'medal-bronce': url = draw(MEDAL, { g: '#D99A5B', G: '#F2C08A', d: '#8A5230', y: '#E8B07A' }); break;
    case 'star': url = draw(STAR); break;
    case 'gold-star': url = draw(STAR, { y: '#FFB23F' }); break;
  }
  cache.set(name, url);
  return url;
}
