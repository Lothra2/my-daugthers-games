// Visual definition of the six worlds. Prop indices refer to assets/props/w{n}/prop_{i}.png (see tools/build_world.py).
// place: sky = anywhere above the horizon, ground = sits on the horizon behind the floor, float = like sky but bobs.
export const WORLDS = {
  1: {
    sky: ['#8E6FD8', '#9C7FE0', '#B9A3EE', '#C9B8F2'], streak: '#CDBFF4', glow: '#FFEB7A', glowStrength: 1,
    layers: {
      far: { speed: 0.12, items: [{ i: 4, place: 'sky', alpha: 0.85 }, { i: 5, place: 'sky', alpha: 0.85 }, { i: 7, place: 'sky', alpha: 0.8 }], gap: [60, 160] },
      mid: { speed: 0.3, items: [{ i: 0, place: 'sky' }, { i: 1, place: 'sky' }, { i: 2, place: 'sky' }, { i: 3, place: 'sky' }, { i: 6, place: 'sky' }], gap: [90, 260] },
    },
    ambient: 'wisp',
  },
  2: {
    sky: ['#B9A3EE', '#D9CCF7', '#FFD6E8', '#FFE3C8'], streak: '#EADFFB', glow: '#FFD6E8', glowStrength: 0.6,
    layers: {
      far: { speed: 0.1, items: [{ i: 0, place: 'ground', alpha: 0.9 }, { i: 4, place: 'ground', alpha: 0.9 }, { i: 5, place: 'ground', alpha: 0.9 }], gap: [120, 320] },
      mid: { speed: 0.28, items: [{ i: 2, place: 'sky' }, { i: 3, place: 'sky' }, { i: 1, place: 'float' }, { i: 7, place: 'float' }], gap: [100, 280] },
    },
    ambient: 'sparkle',
  },
  3: {
    sky: ['#FF9CC4', '#FFB8D0', '#FFD3C0', '#FFE3C8'], streak: '#FFC9A8', glow: '#FFF3A8', glowStrength: 0.8,
    layers: {
      far: { speed: 0.1, items: [{ i: 4, place: 'ground', alpha: 0.9 }, { i: 7, place: 'sky', alpha: 0.85 }], gap: [100, 300] },
      mid: { speed: 0.3, items: [{ i: 0, place: 'ground' }, { i: 1, place: 'ground' }, { i: 2, place: 'ground' }, { i: 5, place: 'ground' }], gap: [60, 220] },
      near: { speed: 0.55, items: [{ i: 3, place: 'ground' }, { i: 6, place: 'ground' }], gap: [260, 620] },
    },
    ambient: 'sugar',
  },
  4: {
    sky: ['#1B1442', '#2A2159', '#3D2F7E', '#5E48A6'], streak: '#3F2F78', glow: '#FFF3A8', glowStrength: 0.25,
    layers: {
      far: { speed: 0.08, items: [{ i: 4, place: 'sky' }, { i: 7, place: 'sky' }, { i: 6, place: 'sky' }], gap: [80, 220] },
      mid: { speed: 0.25, items: [{ i: 1, place: 'sky' }, { i: 2, place: 'sky' }, { i: 3, place: 'sky' }], gap: [100, 260] },
    },
    ambient: 'stars', fixed: [{ i: 0, x: 0.78, y: 0.16 }],
  },
  5: {
    sky: ['#3A315F', '#584E86', '#7E73AE', '#A79DD0'], streak: '#6B5E80', glow: '#FF9EC7', glowStrength: 0.35,
    layers: {
      far: { speed: 0.1, items: [{ i: 0, place: 'sky' }, { i: 1, place: 'sky' }, { i: 2, place: 'sky' }], gap: [50, 170] },
      mid: { speed: 0.3, items: [{ i: 5, place: 'sky' }, { i: 6, place: 'float' }, { i: 7, place: 'float' }], gap: [140, 340] },
    },
    ambient: 'rain',
  },
  6: {
    sky: ['#140E36', '#2A2159', '#5E48A6', '#9D6BFF'], streak: '#7F63C9', glow: '#FFEB7A', glowStrength: 1,
    layers: {
      far: { speed: 0.08, items: [{ i: 3, place: 'sky' }, { i: 4, place: 'sky' }, { i: 5, place: 'sky' }], gap: [120, 300] },
      mid: { speed: 0.28, items: [{ i: 2, place: 'ground' }, { i: 0, place: 'ground' }, { i: 1, place: 'ground' }], gap: [140, 380] },
      near: { speed: 0.55, items: [{ i: 6, place: 'ground' }, { i: 7, place: 'sky' }], gap: [200, 520] },
    },
    ambient: 'stardust',
  },
};
WORLDS[7] = {
  sky: ['#5CCFE0', '#8FE0E2', '#FFD9B0', '#FFC09A'], streak: '#C8F2EE', glow: '#FFE08A', glowStrength: 1,
  layers: {
    far: { speed: 0.1, items: [{ i: 4, place: 'ground', alpha: 0.9 }, { i: 7, place: 'ground', alpha: 0.85 }, { i: 5, place: 'sky', alpha: 0.9 }], gap: [120, 320] },
    mid: { speed: 0.3, items: [{ i: 0, place: 'ground' }, { i: 2, place: 'ground' }, { i: 3, place: 'ground' }, { i: 1, place: 'ground' }, { i: 6, place: 'float' }], gap: [90, 280] },
  },
  ambient: 'bubbles',
};
WORLDS[8] = {
  sky: ['#9CD3F6', '#C2E4FA', '#E4F3FF', '#F8FCFF'], streak: '#FFFFFF', glow: '#FFFFFF', glowStrength: 0.5,
  layers: {
    far: { speed: 0.1, items: [{ i: 3, place: 'ground', alpha: 0.9 }, { i: 1, place: 'ground', alpha: 0.9 }, { i: 4, place: 'sky', alpha: 0.9 }], gap: [100, 300] },
    mid: { speed: 0.3, items: [{ i: 0, place: 'ground' }, { i: 2, place: 'ground' }, { i: 7, place: 'ground' }, { i: 6, place: 'float' }, { i: 5, place: 'float' }], gap: [90, 260] },
  },
  ambient: 'snow',
};
WORLDS[9] = {
  sky: ['#0F0A2E', '#1A1250', '#2D1B6E', '#4A2A8F'], streak: '#4B2F9A', glow: '#FF4FA8', glowStrength: 0.4,
  layers: {
    far: { speed: 0.08, items: [{ i: 4, place: 'ground', alpha: 0.9 }, { i: 1, place: 'sky', alpha: 0.9 }, { i: 3, place: 'sky', alpha: 0.9 }], gap: [100, 280] },
    mid: { speed: 0.28, items: [{ i: 0, place: 'ground' }, { i: 2, place: 'ground' }, { i: 5, place: 'sky' }, { i: 6, place: 'float' }, { i: 7, place: 'sky' }], gap: [100, 300] },
  },
  ambient: 'neon',
};
export const FLOOR_BOTTOM = {}; // filled from world_assets.json at boot (bottom colour of each floor strip)
