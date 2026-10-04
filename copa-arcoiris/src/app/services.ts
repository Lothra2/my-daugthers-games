import type { InputRouter } from '../input/router';
import type { GameFx } from '../core/types';
import type { Hud } from '../ui/hud';

export interface AudioApi { onFx(e: GameFx): void }
export interface Services { router: InputRouter | null; hud: Hud | null; audio: AudioApi | null }
/** Shared singletons wired in main.ts. Scenes read them, nothing here talks to the network. */
export const services: Services = { router: null, hud: null, audio: null };
