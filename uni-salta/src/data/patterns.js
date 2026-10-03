// Authored gameplay chunks. Positions are in tiles (32 px) from the chunk start, heights in px above the floor.
// Every non-special chunk keeps its first 6 and last 6 tiles hazard free, so chunk joins are always fair.
// Hazard item types:
//   sf slime_flat, ss slime_spiky, ssh slime_spiky (hopping), fly snake_fly, hang snake_hang,
//   snail, beeH (high bee: crouch), beeL (low bee: jump), owl, storm, jelly
//   plat {w tiles, h px}, block {h px}
// Candy: coins {shape, x, n, h, peak}  power markers: powerAt (tile)

const ALL = [1, 2, 3, 4, 5, 6];
const W2 = [2, 3, 4, 5, 6];
const W3 = [3, 4, 5, 6];
const W4 = [4, 5, 6];
const BOTH = ['normal', 'easy'];
const NORMAL = ['normal'];
const EASY = ['easy'];

export const CHUNKS = [];
function add(id, o) {
  CHUNKS.push({ id, tier: 1, worlds: ALL, modes: BOTH, len: 24, weight: 3, cd: 2, floor: null, items: [], powerAt: null, tags: [], ...o });
}
const c = (shape, x, n, h = 30, extra = {}) => ({ t: 'coins', shape, x, n, h, ...extra });
const arc = (x, n, peak) => c('arc', x, n, 30, { peak });

// ---------------- breathers (tier 0)
add('breather_line_01', { tier: 0, len: 22, weight: 4, cd: 0, items: [c('line', 5, 10, 34)], powerAt: 11 });
add('breather_line_02', { tier: 0, len: 22, weight: 3, cd: 0, items: [c('line', 5, 6, 34), arc(14, 5, 130)], powerAt: 15 });
add('breather_wave_01', { tier: 0, len: 24, weight: 3, cd: 0, items: [c('wave', 5, 12, 60)], powerAt: 12 });
add('breather_arc_01', { tier: 0, len: 22, weight: 3, cd: 0, items: [arc(6, 7, 150), arc(14, 5, 120)], powerAt: 11 });
add('breather_empty_01', { tier: 0, len: 14, weight: 1, cd: 1, items: [] });

// ---------------- tier 1: single hazards
for (let i = 0; i < 4; i++) {
  const sx = 12 + (i % 2) * 2;
  add(`easy_slime_0${i + 1}`, { tier: 1, len: 26, items: [{ t: 'sf', x: sx }, arc(sx, 7, 140), c('line', 3, 3, 34)], powerAt: i === 2 ? 20 : null });
}
for (let i = 0; i < 3; i++) {
  add(`easy_fly_0${i + 1}`, { tier: 1, len: 26, items: [{ t: 'fly', x: 12 + i }, c('line', 9 + i, 7, 20)] });
}
add('soft_slime_01', { tier: 1, len: 30, modes: EASY, items: [{ t: 'sf', x: 15 }, arc(15, 7, 130)] });
add('soft_slime_02', { tier: 1, len: 32, modes: EASY, items: [{ t: 'sf', x: 14 }, { t: 'sf', x: 25 }, arc(14, 5, 120), arc(25, 5, 120)] });
add('soft_fly_01', { tier: 1, len: 30, modes: EASY, items: [{ t: 'fly', x: 15 }, c('line', 12, 7, 20)] });
add('soft_fly_02', { tier: 1, len: 32, modes: EASY, items: [{ t: 'fly', x: 14 }, { t: 'sf', x: 25 }, c('line', 11, 6, 20), arc(25, 5, 120)] });
add('soft_candy_01', { tier: 0, len: 24, modes: EASY, weight: 3, cd: 0, items: [c('line', 4, 14, 34)], powerAt: 12 });

// ---------------- World 2+: hanging snake, gaps, platforms, snail
for (let i = 0; i < 3; i++) {
  add(`hang_0${i + 1}`, { tier: 2, worlds: W2, len: 26, items: [{ t: 'hang', x: 13 + i }, c('line', 10 + i, 7, 20)] });
}
add('snail_intro_01', { tier: 1, worlds: W2, len: 26, items: [{ t: 'snail', x: 13 }, arc(13, 7, 120)] });
add('snail_stomp_01', { tier: 2, worlds: W2, len: 30, items: [{ t: 'snail', x: 12 }, { t: 'snail', x: 20 }, c('column', 12, 3, 100), c('column', 20, 3, 100)] });
add('gap_small_01', { tier: 2, worlds: W2, modes: NORMAL, len: 28, floor: [[0, 12], [16, 28]], items: [arc(13, 5, 120), c('line', 3, 4, 34)] });
add('gap_small_02', { tier: 2, worlds: W2, modes: NORMAL, len: 30, floor: [[0, 13], [17, 30]], items: [arc(14, 5, 130), c('line', 4, 4, 34), c('line', 20, 5, 34)], powerAt: 22 });
add('gap_wide_01', { tier: 3, worlds: W3, modes: NORMAL, len: 32, floor: [[0, 13], [19, 32]], items: [arc(16, 7, 150)] });
add('gap_platform_01', { tier: 3, worlds: W3, modes: NORMAL, len: 38, floor: [[0, 12], [27, 38]], items: [{ t: 'plat', x: 16, w: 6, h: 80 }, c('line', 16, 6, 125), arc(12, 5, 110)] });
add('platform_high_01', { tier: 1, worlds: W2, len: 28, items: [{ t: 'plat', x: 11, w: 6, h: 110 }, c('line', 11, 6, 155), c('line', 4, 4, 34)], powerAt: 14 });
add('platform_steps_01', { tier: 2, worlds: W2, len: 32, items: [{ t: 'plat', x: 9, w: 4, h: 70 }, { t: 'plat', x: 15, w: 4, h: 120 }, { t: 'plat', x: 21, w: 4, h: 70 }, c('line', 9, 4, 115), c('line', 15, 4, 165), c('line', 21, 4, 115)] });

// ---------------- stomp
add('stomp_single_01', { tier: 1, len: 26, items: [{ t: 'sf', x: 13 }, c('column', 13, 3, 100), c('line', 4, 3, 34)] });
add('stomp_chain_02', { tier: 2, len: 38, items: [{ t: 'sf', x: 12 }, { t: 'sf', x: 22 }, c('column', 12, 3, 100), c('column', 22, 3, 100)] });
add('stomp_chain_03', { tier: 3, modes: NORMAL, len: 48, items: [{ t: 'sf', x: 12 }, { t: 'sf', x: 22 }, { t: 'sf', x: 32 }, c('column', 12, 2, 100), c('column', 22, 3, 110), c('column', 32, 4, 120)], powerAt: 40 });

// ---------------- tier 2-3: doubles and combos
add('double_slime_01', { tier: 2, len: 32, items: [{ t: 'sf', x: 12 }, { t: 'sf', x: 22 }, arc(12, 6, 130), arc(22, 6, 130)] });
add('double_slime_02', { tier: 2, len: 34, items: [{ t: 'ss', x: 12 }, { t: 'sf', x: 24 }, arc(12, 6, 140), arc(24, 6, 130)] });
add('double_fly_01', { tier: 2, len: 34, items: [{ t: 'fly', x: 12 }, { t: 'fly', x: 23 }, c('line', 10, 5, 20), c('line', 21, 5, 20)] });
for (let i = 0; i < 2; i++) {
  add(`spiky_0${i + 1}`, { tier: 2, worlds: W3, len: 28, items: [{ t: 'ss', x: 13 + i }, arc(13 + i, 7, 150)] });
}
add('spiky_double_01', { tier: 3, worlds: W3, len: 38, items: [{ t: 'ss', x: 12 }, { t: 'ss', x: 25 }, arc(12, 6, 150), arc(25, 6, 150)] });
add('combo_fly_slime_01', { tier: 3, len: 34, modes: NORMAL, items: [{ t: 'fly', x: 10 }, { t: 'sf', x: 21 }, c('line', 8, 5, 20), arc(21, 6, 130)] });
add('combo_fly_slime_02', { tier: 3, len: 36, modes: NORMAL, items: [{ t: 'fly', x: 10 }, { t: 'ss', x: 22 }, c('line', 8, 5, 20), arc(22, 6, 150)] });
add('combo_slime_fly_01', { tier: 3, len: 36, modes: NORMAL, items: [{ t: 'sf', x: 10 }, { t: 'fly', x: 23 }, arc(10, 6, 130), c('line', 21, 5, 20)] });
add('combo_hang_slime_01', { tier: 3, worlds: W2, len: 36, modes: NORMAL, items: [{ t: 'hang', x: 10 }, { t: 'sf', x: 22 }, c('line', 8, 5, 20), arc(22, 6, 130)] });
add('combo_hang_gap_01', { tier: 4, worlds: W3, len: 40, modes: NORMAL, floor: [[0, 22], [27, 40]], items: [{ t: 'hang', x: 10 }, c('line', 8, 5, 20), arc(24, 6, 130)] });
add('combo_pair_snakes_01', { tier: 4, worlds: W4, len: 38, modes: NORMAL, items: [{ t: 'fly', x: 10 }, { t: 'hang', x: 21 }, c('line', 8, 5, 20), c('line', 19, 5, 20)] });

// ---------------- blocks
add('block_single_01', { tier: 1, worlds: W3, len: 26, items: [{ t: 'block', x: 13, h: 130 }, c('line', 4, 4, 34)], powerAt: 20 });
add('block_row_01', { tier: 2, worlds: W3, len: 32, items: [{ t: 'block', x: 11, h: 130 }, { t: 'block', x: 14, h: 130 }, { t: 'block', x: 17, h: 130 }, { t: 'sf', x: 25 }, arc(25, 5, 130)] });

// ---------------- bees (world 3+)
add('bee_high_01', { tier: 2, worlds: W3, len: 28, items: [{ t: 'beeH', x: 13 }, c('line', 10, 6, 20)] });
add('bee_low_01', { tier: 2, worlds: W3, len: 28, items: [{ t: 'beeL', x: 13 }, arc(13, 6, 130)] });
add('bee_mix_01', { tier: 3, worlds: W3, modes: NORMAL, len: 38, items: [{ t: 'beeH', x: 11 }, { t: 'beeL', x: 23 }, c('line', 9, 5, 20), arc(23, 6, 130)] });

// ---------------- owl (world 4+)
add('owl_intro_01', { tier: 2, worlds: W4, len: 30, items: [{ t: 'owl', x: 14 }, c('line', 11, 6, 20)] });
add('owl_combo_01', { tier: 3, worlds: W4, modes: NORMAL, len: 40, items: [{ t: 'owl', x: 12 }, { t: 'sf', x: 25 }, c('line', 9, 5, 20), arc(25, 6, 130)] });

// ---------------- storm (world 5+)
add('storm_intro_01', { tier: 2, worlds: [5, 6], len: 32, items: [{ t: 'storm', x: 15 }, arc(15, 7, 140)] });
add('storm_double_01', { tier: 3, worlds: [5, 6], modes: NORMAL, len: 42, items: [{ t: 'storm', x: 12 }, { t: 'storm', x: 28 }, arc(12, 6, 140), arc(28, 6, 140)] });
add('hop_spiky_01', { tier: 3, worlds: [5, 6], modes: NORMAL, len: 32, items: [{ t: 'ssh', x: 15 }, arc(15, 7, 160)] });
add('hop_spiky_02', { tier: 4, worlds: [5, 6], modes: NORMAL, len: 40, items: [{ t: 'ssh', x: 13 }, { t: 'sf', x: 27 }, arc(13, 6, 160), arc(27, 6, 130)] });
add('moving_platform_01', { tier: 3, worlds: [5, 6], modes: NORMAL, len: 36, floor: [[0, 12], [24, 36]], items: [{ t: 'plat', x: 15, w: 5, h: 90, move: 30 }, c('line', 15, 5, 135)] });

// ---------------- jelly (world 6)
add('jelly_intro_01', { tier: 2, worlds: [6], len: 30, items: [{ t: 'jelly', x: 14, phase: 0 }, c('line', 12, 6, 20)] });
add('jelly_pair_01', { tier: 4, worlds: [6], modes: NORMAL, len: 40, items: [{ t: 'jelly', x: 12, phase: 0 }, { t: 'jelly', x: 24, phase: 3 }, c('line', 10, 5, 20), c('line', 22, 5, 20)] });
add('jelly_gap_01', { tier: 5, worlds: [6], modes: NORMAL, len: 42, floor: [[0, 20], [26, 42]], items: [{ t: 'jelly', x: 11, phase: 3 }, arc(23, 6, 140)] });

// ---------------- master gauntlets (world 6)
add('master_gauntlet_01', { tier: 5, worlds: [6], modes: NORMAL, len: 52, items: [{ t: 'fly', x: 10 }, { t: 'sf', x: 20 }, { t: 'hang', x: 31 }, { t: 'ss', x: 41 }, c('line', 8, 5, 20), arc(20, 5, 130), c('line', 29, 5, 20), arc(41, 5, 150)] });
add('master_gauntlet_02', { tier: 5, worlds: [6], modes: NORMAL, len: 58, floor: [[0, 14], [19, 58]], items: [{ t: 'owl', x: 28 }, { t: 'sf', x: 42 }, arc(16, 5, 120), c('line', 24, 5, 20), arc(42, 6, 130)] });
add('master_gauntlet_03', { tier: 5, worlds: [6], modes: NORMAL, len: 54, items: [{ t: 'storm', x: 10 }, { t: 'jelly', x: 22, phase: 0 }, { t: 'sf', x: 34 }, { t: 'beeH', x: 44 }, arc(10, 5, 140), c('line', 20, 5, 20), arc(34, 5, 130), c('line', 42, 5, 20)] });

// ---------------- sprint (only while the yellow candy FAST power is active)
for (let i = 0; i < 3; i++) {
  add(`sprint_rain_0${i + 1}`, { tier: 0, len: 30, weight: 3, cd: 0, tags: ['sprint'], items: [c('wave', 3, 20, 70), c('line', 5 + i, 10, 130)] });
}

export const CHUNK_BY_ID = Object.fromEntries(CHUNKS.map((x) => [x.id, x]));
