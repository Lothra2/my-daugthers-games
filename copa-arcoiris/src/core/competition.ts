import { EVENT_POINTS } from './data';
import type { CharId, EventId } from './types';

export interface EventRank { charId: CharId; rank: number }
export interface CupEntry { charId: CharId; control: 'human' | 'ai'; total: number; wins: number; ranks: Partial<Record<EventId, number>>; points: Partial<Record<EventId, number>> }

/** Points for a rank. Ties share the best rank, so (1,1,3,4) gives 10,10,5,3. Nobody gets zero. */
export const pointsForRank = (rank: number): number => EVENT_POINTS[Math.min(EVENT_POINTS.length, Math.max(1, rank)) - 1];

export class Cup {
  entries: CupEntry[];
  order: EventId[] = [];
  constructor(roster: { charId: CharId; control: 'human' | 'ai' }[]) {
    this.entries = roster.map((r) => ({ charId: r.charId, control: r.control, total: 0, wins: 0, ranks: {}, points: {} }));
  }
  /** Records one event. `ranks` has one entry per participant, with shared ranks for ties. */
  addEvent(id: EventId, ranks: EventRank[]): void {
    this.order.push(id);
    for (const r of ranks) {
      const e = this.entries.find((x) => x.charId === r.charId);
      if (!e) continue;
      const p = pointsForRank(r.rank);
      e.total += p; e.ranks[id] = r.rank; e.points[id] = p;
      if (r.rank === 1) e.wins++;
    }
  }
  /** Final order: total points, then events won, then rank in the last event. */
  standings(): (CupEntry & { place: number })[] {
    const last = this.order[this.order.length - 1];
    const sorted = [...this.entries].sort((a, b) => b.total - a.total || b.wins - a.wins || ((a.ranks[last] ?? 9) - (b.ranks[last] ?? 9)));
    return sorted.map((e, i) => ({ ...e, place: i + 1 }));
  }
}

export type Trophy = 'oro' | 'plata' | 'bronce' | 'corazon';
export const trophyForPlace = (place: number): Trophy => (place === 1 ? 'oro' : place === 2 ? 'plata' : place === 3 ? 'bronce' : 'corazon');
export const placeMessage = (place: number): string =>
  place === 1 ? '¡Campeona de la Copa!' : place === 2 ? '¡Qué carrera! Casi casi' : place === 3 ? '¡Bien hecho!' : '¡Gracias por jugar con tanto cariño!';
