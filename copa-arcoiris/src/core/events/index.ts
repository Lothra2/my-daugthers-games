import type { EventRules } from '../world';
import type { EventId } from '../types';
import { createRace } from './race';
import { createCircuit } from './circuit';
import { createPinata } from './pinata';
import { createArena } from './arena';
import { createWarmup } from './warmup';

const REGISTRY: Record<EventId, () => EventRules> = { race: createRace, circuit: createCircuit, pinata: createPinata, arena: createArena, warmup: createWarmup };
export function createRules(id: EventId): EventRules {
  const f = REGISTRY[id];
  if (!f) throw new Error(`Rules for event ${id} are not registered`);
  return f();
}
