// All tunable numbers live here. Units: pixels (internal), seconds. y points UP in the core.
export const CFG = {
  TICK: 1 / 60,
  TILE: 32,
  METER: 40,            // px per metre of score distance
  PLAYER_X: 150,        // screen x of the unicorn
  FLOOR_H: 84,          // visible height of the ground band at the bottom
  LOOKAHEAD: 1500,      // px of level generated ahead of the camera

  // player movement
  V_JUMP: 690,
  G_UP_HOLD: 1400,
  G_UP_RELEASE: 3800,
  G_DOWN: 2600,
  G_FAST: 4600,
  V_MAX_FALL: 900,
  COYOTE: 0.09,
  BUFFER: 0.13,
  STOMP_BOUNCE: 520,
  STOMP_BOUNCE_HELD: 700,
  BOX_STAND: { w: 28, h: 62 },
  BOX_AIR: { w: 28, h: 58 },
  BOX_CROUCH: { w: 36, h: 34 },
  FLOOR_SNAP: 8,
  FALL_OUT: -150,       // feet height that counts as "fell through a gap"

  // lives and damage
  LIVES: 3,
  INVUL_HIT: 1.6,
  INVUL_RESPAWN: 2.0,
  HITSTOP: 0.08,

  // powers
  FAST_TIME: 4, FAST_MULT: 1.6,
  SLOW_TIME: 5, SLOW_MULT: 0.6,
  INV_TIME: 5,
  POWER_WARN: 1.5,

  // worlds: speeds (px/s), length (m)
  WORLD_SPEED: [[230, 260], [270, 300], [310, 340], [350, 380], [390, 420], [430, 460]],
  WORLD_LEN_M: [360, 400, 440, 480, 520, 560],
  LAP_SPEED_MULT: 1.08,
  SPEED_CAP: 560,
  EASY_SPEED: [150, 200],
  EASY_CAP: 250,
  EASY_LEN_M: 300,

  // scoring
  PTS_COIN: 10, PTS_POWER: 50, PTS_HEART: 100, PTS_PERFECT: 100, PTS_STOMP: [100, 200, 400, 800, 1000],
  PTS_POP: 200, PTS_BLOCK: 50, PTS_WORLD: 1000, PTS_STREAK: 300,
  HEART_EVERY_COINS: 240,

  // sprites (logical px)
  SPRITE: { unicorn: [96, 96] },
};

export const WORLD_NAMES = {
  es: ['Nubes de Algodón', 'Valle Arcoíris', 'Bosque de Chupetas', 'Cielo Estrellado', 'Tormenta Mágica', 'Castillo Cósmico'],
  en: ['Cotton Clouds', 'Rainbow Valley', 'Lollipop Forest', 'Starry Sky', 'Magic Storm', 'Cosmic Candy Castle'],
};
