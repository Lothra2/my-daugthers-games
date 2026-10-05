import { fx, type EventRules, type HudModel, type Item, type World } from '../world';
import { spawnItem } from '../items';

const STEPS = [
  '¡Corre hasta la bandera!',
  '¡Salta el tronco!',
  'Recoge la pelota con ACCIÓN y ¡lánzala al blanco!',
  '¡Junta estrellas y usa tu PODER!',
  '¡Listo! ¡A la copa!',
];

export function createWarmup(): EventRules {
  return {
    id: 'warmup', chargeMult: 1, maxTime: 600,
    setup(w) {
      w.data.step = 0; w.data.doneT = 0; w.data.hit = {} as Record<number, boolean>; w.data.used = {} as Record<number, boolean>;
      for (const o of w.map.objects) {
        if (o.tipo === 'pelota') spawnItem(w, 'ball', o.x, o.y);
        else if (o.tipo === 'estrella') spawnItem(w, 'star', o.x, o.y, 8);
        else if (o.tipo === 'blanco') { const t = spawnItem(w, 'target', o.x, o.y); t.hp = 999; }
        else if (o.tipo === 'bandera') w.data.flag = { x: o.x, y: o.y };
      }
      w.data.log = w.map.boxes.find((b) => b.id === 'tronco_tutorial');
    },
    step(w, dt) {
      const humans = w.actors.filter((a) => a.control === 'human' || a.charId);
      const hs = w.humans.length ? w.actors.filter((a) => w.humans.includes(a.id)) : humans;
      for (const a of hs) { if (a.powerT > 0 || (a.act && a.act.kind === 'power')) w.data.used[a.id] = true; a.progress = a.x; }
      const step = w.data.step as number;
      let ok = false;
      if (step === 0) { const f = w.data.flag; ok = hs.every((a) => Math.abs(a.x - f.x) < 26); }
      else if (step === 1) { const l = w.data.log; ok = hs.every((a) => a.x > l.x + l.w + 8); }
      else if (step === 2) ok = hs.every((a) => w.data.hit[a.id]);
      else if (step === 3) ok = hs.every((a) => w.data.used[a.id]);
      if (ok && step < 4) { w.data.step = step + 1; fx(w, 'cp', hs[0].x, hs[0].y, 0, undefined, step + 1); w.data.doneT = 0; }
      if (w.data.step === 4) w.data.doneT += dt;
    },
    standings(w) { return w.actors.map((a, i) => ({ actorId: a.id, rank: 1, value: 0, detail: '' })).slice(0, w.actors.length); },
    isOver(w) { return w.data.step === 4 && w.data.doneT >= 2.2; },
    hud(w): HudModel { return { title: 'Calentamiento', timer: '', lines: [`Paso ${Math.min(4, (w.data.step ?? 0) + 1)} de 4`], goalText: STEPS[w.data.step ?? 0] }; },
    onBallHit(w: World, item: Item) {
      const t = w.items.find((i) => i.kind === 'target');
      if (!t || item.thrownBy === null || item.hitIds.has(-5)) return false;
      if (Math.abs(item.x - t.x) < 16 && Math.abs(item.y - t.y) < 14 && item.z < 46) {   // generous: the warmup is for a 5 year old
        item.hitIds.add(-5); w.data.hit[item.thrownBy] = true; fx(w, 'pinata', t.x, t.y, 12, item.thrownBy); item.vx *= -0.3;
        return true;
      }
      return false;
    },
    aiGoal(_w, a) { return { x: a.x, y: a.y, hold: true }; },
    respawnPoint(w, a) { return a.safe2 ? { x: a.safe2.x, y: a.safe2.y } : { x: 60, y: 224 }; },
  };
}
