import type { Difficulty } from '../core/data';
import type { EventId } from '../core/types';
import type { RosterEntry, Standing } from '../core/world';

export interface EventConfig {
  eventId: EventId;
  roster: RosterEntry[];
  seed: number;
  difficulty: Difficulty;
  debug?: { hitboxes?: boolean; ff?: number; autoplay?: boolean };
}
export interface ActorResult { id: number; charId: string; slot: number; control: 'human' | 'ai'; stars: number; gold: number; points: number; falls: number; bursts: number; hits: number; finishT: number | null }
export interface EventResult { eventId: EventId; seconds: number; standings: Standing[]; actors: ActorResult[] }
