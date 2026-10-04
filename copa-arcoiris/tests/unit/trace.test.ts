import { it } from 'vitest';
import { createRace } from '../../src/core/events/race';
import { createWorld, step } from '../../src/core/world';
import { CHAR_IDS } from '../../src/core/types';
import { scanAhead, pathBlocked } from '../../src/core/ai';
import { loadMap } from './sim';

it('trace', () => {
  const seed = Number(process.env.SEED ?? 4);
  const who = Number(process.env.WHO ?? 2);
  const t0 = Number(process.env.T0 ?? 17);
  const skip = seed % 5;
  const chars = CHAR_IDS.filter((_, i) => i !== skip);
  const w = createWorld(loadMap('race'), createRace(), chars.map((c, i) => ({ charId: c, control: 'ai' as const, slot: i })), { seed, skipIntro: true, difficulty: seed % 2 ? 'tranquilo' : 'campeon' });
  const rows: string[] = [];
  for (let i = 0; i < 60 * 60 && w.phase !== 'over'; i++) {
    step(w);
    const a = w.actors[who];
    if (process.env.ALL && i % 300 === 0) rows.push(`${Math.round(w.eventT)}s ` + w.actors.map((q) => `${q.charId.slice(0,3)} ${Math.round(q.x)},${Math.round(q.y)} ${q.state.slice(0,5)}`).join(' | '));
    if (!process.env.ALL && w.eventT > t0 && i % 15 === 0 && rows.length < 24) {
      const g = w.rules.aiGoal(w, a);
      const sc = scanAhead(w, a, 1, 60);
      rows.push(`${w.eventT.toFixed(1)} x=${a.x.toFixed(0)} y=${a.y.toFixed(0)} in=(${a.input.mx.toFixed(1)},${a.input.my.toFixed(1)}) goal=(${g.x.toFixed(0)},${g.y.toFixed(0)}) blk=${pathBlocked(w, a, g.x, g.y)} scan=${sc.kind}@${sc.d}h${sc.h} st=${a.ai?.stuckStage} lane=${a.ai?.lane}/${a.ai?.laneT.toFixed(1)} act=${a.act?.kind} pw=${a.powerT.toFixed(1)}`);
    }
  }
  console.log('\n' + rows.join('\n'));
});
