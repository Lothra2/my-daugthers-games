// URL debug flags: ?seed=N&world=N&lap=N&mode=easy|normal&god&speed=N&hitboxes&fps&autoplay&power=fast|slow|inv&skipTitle&sounds
export function readFlags(search = globalThis.location?.search || '') {
  const q = new URLSearchParams(search);
  const num = (k) => (q.has(k) && q.get(k) !== '' ? Number(q.get(k)) : null);
  return {
    seed: num('seed'), world: num('world'), lap: num('lap'), mode: q.get('mode'), god: q.has('god'),
    speed: num('speed'), hitboxes: q.has('hitboxes'), fps: q.has('fps'), autoplay: q.has('autoplay'),
    power: q.get('power'), skipTitle: q.has('skipTitle'), sounds: q.has('sounds'), tune: q.has('tune'),
    shot: q.get('shot'), lang: q.get('lang'), chunk: q.get('chunk'), ff: num('ff'),
  };
}
