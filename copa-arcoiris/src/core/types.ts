export type CharId = 'sophie' | 'alana' | 'papa' | 'mama' | 'thor';
export type EventId = 'warmup' | 'race' | 'circuit' | 'pinata' | 'arena';
export const CHAR_IDS: CharId[] = ['sophie', 'alana', 'papa', 'mama', 'thor'];
export const EVENT_ORDER: EventId[] = ['race', 'circuit', 'pinata', 'arena'];

export interface InputFrame {
  mx: number; my: number;
  jump: boolean; jumpPressed: boolean;
  action: boolean; actionPressed: boolean;
  power: boolean; powerPressed: boolean;
}
export const emptyInput = (): InputFrame => ({
  mx: 0, my: 0, jump: false, jumpPressed: false, action: false, actionPressed: false, power: false, powerPressed: false,
});

export type State =
  | 'idle' | 'walk' | 'run' | 'jumpRise' | 'jumpFall' | 'land' | 'swim' | 'pickup' | 'carry' | 'throw'
  | 'push' | 'bop' | 'stagger' | 'tumble' | 'getup' | 'power' | 'celebrate' | 'fall' | 'rescue' | 'finished';

export type PowerKind = 'rainbow' | 'bubble' | 'charge' | 'stars' | 'zoom';
export type AIProfile = 'veloz' | 'prudente' | 'jugueton' | 'explorador';

export interface Rect { x: number; y: number; w: number; h: number }

/** One-shot facts for the view and the audio. Drained by the view each frame. */
export interface GameFx {
  k: string; // 'jump' | 'land' | 'splash' | 'push' | 'tumble' | 'pickup' | 'throw' | 'star' | 'power' | 'bubble' | 'cp' | 'finish' | 'hit' | 'bounce' | 'whistle' | ...
  x: number; y: number; z: number;
  who?: number; // actor id
  v?: number;
}
