import type { CharId, PowerKind, AIProfile } from './types';

/** Physics and rules. Numbers come from GAME_DESIGN sections 5 and 6. Units: px, seconds. */
export const PHYS = {
  dt: 1 / 60,
  walk: 56,
  run: 96,
  accel: 600,
  runDelay: 0.3,
  depthFactor: 0.65,
  jumpV: 230,
  gravity: 760,
  airControl: 0.6,
  stepUp: 4,
  swimSpeed: 50,
  strokeV: 30,
  strokeT: 0.3,
  strokeCd: 0.5,
  bounceV: 380,
  footW: 14,
  footH: 6,
  bodyH: 28,
  pushReach: 18,
  pushDy: 10,
  pushDz: 22,
  pushWind: 0.08,
  pushHit: 0.1,
  pushRecover: 0.2,
  pushCd: 0.5,
  pushKnock: 36,
  pushKnockT: 0.25,
  staggerT: 0.35,
  tumbleChain: 3,
  tumbleChainWindow: 2.0,
  tumbleFall: 0.35,
  tumbleLie: 0.3,
  tumbleGetup: 0.3,
  protectAfterTumble: 1.0,
  protectAfterRescue: 1.5,
  fallT: 0.5,
  rescueT: 1.0,
  pickupReach: 16,
  pickupT: 0.25,
  carrySlow: 0.85,
  throwSpeed: 220,
  throwVz: 120,
  throwT: 0.3,
  throwRelease: 0.12,
  ballBounceV: 70,
  starPower: 25,
  maxPower: 100,
  hitWindow: 3.0, // seconds a push or ball counts as the cause of a fall
};

export interface CharStats {
  id: CharId;
  name: string;
  color: string;
  colorHex: number;
  run: number;
  runDelay: number;
  jump: number; // vz multiplier
  swim: number;
  throwMult: number;
  pushRecv: number; // knockback received
  pushGive: number; // knockback given
  charge: number; // seconds to fill the power bar
  getup: number; // multiplier on tumble recovery time (smaller is faster)
  protectRescue: number;
  airControl: number;
  footW: number;
  autoPickup: boolean;
  instantPickup: boolean;
  carrySlow: number;
  power: PowerKind;
  powerName: string;
  isDog: boolean;
  defaultProfile: AIProfile;
}

export const CHARS: Record<CharId, CharStats> = {
  sophie: { id: 'sophie', name: 'Sophie', color: '#5DDB43', colorHex: 0x5ddb43, run: 100, runDelay: 0.3, jump: 1.12, swim: 1.0, throwMult: 0.85, pushRecv: 1.0, pushGive: 0.85,
    charge: 12, getup: 1, protectRescue: 1.5, airControl: 1.0, footW: 14, autoPickup: false, instantPickup: false, carrySlow: 0.85, power: 'rainbow', powerName: 'Impulso arcoíris', isDog: false, defaultProfile: 'explorador' },
  alana: { id: 'alana', name: 'Alana', color: '#FF6FB5', colorHex: 0xff6fb5, run: 92, runDelay: 0.3, jump: 1.0, swim: 1.35, throwMult: 0.9, pushRecv: 1.2, pushGive: 0.9,
    charge: 14, getup: 1, protectRescue: 1.5, airControl: 0.6, footW: 14, autoPickup: false, instantPickup: true, carrySlow: 0.85, power: 'bubble', powerName: 'Burbuja protectora', isDog: false, defaultProfile: 'jugueton' },
  papa: { id: 'papa', name: 'Papá', color: '#E8423A', colorHex: 0xe8423a, run: 96, runDelay: 0.45, jump: 0.92, swim: 1.0, throwMult: 1.3, pushRecv: 0.6, pushGive: 1.0,
    charge: 13, getup: 1, protectRescue: 1.5, airControl: 0.6, footW: 14, autoPickup: false, instantPickup: false, carrySlow: 0.85, power: 'charge', powerName: 'Carga deportiva', isDog: false, defaultProfile: 'jugueton' },
  mama: { id: 'mama', name: 'Mamá', color: '#9B5DE5', colorHex: 0x9b5de5, run: 96, runDelay: 0.3, jump: 1.0, swim: 1.05, throwMult: 1.0, pushRecv: 1.0, pushGive: 1.0,
    charge: 16, getup: 0.6, protectRescue: 2.5, airControl: 0.6, footW: 14, autoPickup: false, instantPickup: false, carrySlow: 0.85, power: 'stars', powerName: 'Estrellas guía', isDog: false, defaultProfile: 'prudente' },
  thor: { id: 'thor', name: 'Thor', color: '#3FB6F2', colorHex: 0x3fb6f2, run: 108, runDelay: 0.25, jump: 0.85, swim: 0.9, throwMult: 0.7, pushRecv: 1.1, pushGive: 0.9,
    charge: 13, getup: 1, protectRescue: 1.5, airControl: 0.6, footW: 22, autoPickup: true, instantPickup: false, carrySlow: 1.0, power: 'zoom', powerName: 'Carrera loca', isDog: true, defaultProfile: 'veloz' },
};

/** Power durations and strengths (GAME_DESIGN section 6). */
export const POWER = {
  rainbow: { dur: 1.0, speed: 190, maxGap: 48 },
  bubble: { dur: 4.0, swimMult: 1.6, floatZ: 70 },
  charge: { dur: 0.6, speed: 170 },
  stars: { dur: 0.4, count: 3, speed: 150, stun: 0.6 },
  zoom: { dur: 2.5, mult: 1.5 },
};

export const DIFFICULTY = {
  tranquilo: { reactMin: 0.3, reactMax: 0.45, err: 0.12, rubberAhead: 400, rubberBehind: 500, slow: 0.92, fast: 1.04 },
  campeon: { reactMin: 0.18, reactMax: 0.3, err: 0.05, rubberAhead: 9999, rubberBehind: 9999, slow: 1, fast: 1 },
} as const;
export type Difficulty = keyof typeof DIFFICULTY;

export const EVENT_POINTS = [10, 7, 5, 3];
