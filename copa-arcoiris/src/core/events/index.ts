import type { EventRules } from '../world';
import type { EventId } from '../types';
import { createRace } from './race';

const REGISTRY: Partial<Record<EventId, () => EventRules>> = { race: createRace };
export function registerRules(id: EventId, f: () => EventRules): void { REGISTRY[id] = f; }
export function createRules(id: EventId): EventRules {
  const f = REGISTRY[id];
  if (!f) throw new Error(`Rules for event ${id} are not registered`);
  return f();
}
