import type { CharId, EventId } from './types';

export const LEVEL_XP = [0, 60, 150, 280, 450];
export const MAX_LEVEL = 5;
export type Outfit = 'base' | 'arcoiris' | 'estrellas';

/** XP for finishing an event: 20 for taking part, plus 20/14/10/6 by rank, plus one per star collected (at most 10). */
export const XP_STAR_CAP = 10;
export const xpForEvent = (rank: number, stars: number): number => 20 + [20, 14, 10, 6][Math.min(4, Math.max(1, rank)) - 1] + Math.min(XP_STAR_CAP, Math.max(0, stars));
export const levelForXp = (xp: number): number => { let l = 1; for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) l = i + 1; return l; };
export const xpToNext = (xp: number): number | null => { const l = levelForXp(xp); return l >= MAX_LEVEL ? null : LEVEL_XP[l] - xp; };

export interface Unlock { level: number; id: string; name: string; description: string }
export const UNLOCKS: Unlock[] = [
  { level: 2, id: 'outfit:arcoiris', name: 'Traje Arcoíris', description: 'Un traje nuevo con otros colores' },
  { level: 3, id: 'power+', name: 'Poder +', description: 'Tu poder dura un 15% más' },
  { level: 4, id: 'outfit:estrellas', name: 'Traje Estrellas', description: 'Otro traje brillante' },
  { level: 5, id: 'gold-celebration', name: 'Celebración dorada', description: 'Corona y confeti dorado en el podio' },
];
export const unlocksUpTo = (level: number): Unlock[] => UNLOCKS.filter((u) => u.level <= level);
export const unlocksBetween = (from: number, to: number): Unlock[] => UNLOCKS.filter((u) => u.level > from && u.level <= to);
export const outfitsFor = (level: number): Outfit[] => ['base', ...(level >= 2 ? ['arcoiris' as const] : []), ...(level >= 4 ? ['estrellas' as const] : [])];

export type Medal = 'oro' | 'plata' | 'bronce';
export const medalForRank = (rank: number): Medal | null => (rank === 1 ? 'oro' : rank === 2 ? 'plata' : rank === 3 ? 'bronce' : null);
export const betterMedal = (a: Medal | undefined, b: Medal | null): Medal | undefined => {
  const v = { oro: 3, plata: 2, bronce: 1 } as const;
  if (!b) return a;
  if (!a) return b;
  return v[b] > v[a] ? b : a;
};
export type { CharId, EventId };
