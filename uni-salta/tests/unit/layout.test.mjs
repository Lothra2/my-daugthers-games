import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout } from '../../src/systems/layout.js';

const cases = [
  ['iPhone 15 Pro Max landscape', 932, 430, 3, { W: 932, H: 430, zoom: 3 }],
  ['Galaxy S23 landscape', 780, 360, 3, { W: 780, H: 360, zoom: 3 }],
  ['iPad landscape', 1180, 820, 2, { zoom: 4 }],
  ['desktop 1080p browser', 1920, 945, 1, { zoom: 2 }],
  ['laptop browser', 1366, 650, 1, { zoom: 2 }],
];
for (const [name, w, h, dpr, want] of cases) {
  test(`layout: ${name}`, () => {
    const L = computeLayout(w, h, dpr);
    for (const [k, v] of Object.entries(want)) assert.equal(L[k], v, `${k}`);
    assert.ok(L.W >= 576 && L.H >= 324, 'never smaller than the design safe area');
    assert.ok(Math.abs(L.cssW * dpr - L.W * L.zoom) < 1e-6, 'canvas is an exact integer multiple of internal pixels');
  });
}
test('portrait is detected', () => { assert.equal(computeLayout(430, 932, 3).portrait, true); assert.equal(computeLayout(932, 430, 3).portrait, false); });
