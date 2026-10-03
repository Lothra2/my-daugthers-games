# Phaser 4 en este juego

Versión fija: `4.2.1` (jsDelivr y `src/vendor/phaser.min.js`). Documentación local: `node_modules/phaser/skills/*/SKILL.md`
y `docs/Phaser 4 Pixel Art Guide`.

* **Pixel art**: `render: { pixelArt: true }` implica `antialias: false` y `roundPixels: true`. Escalamos con CSS entero
  (`image-rendering: pixelated`), nunca con `Phaser.Scale.FIT`. `scale.mode = NONE` y redimensionamos con `game.scale.resize(W, H)`.
* **Posiciones**: todo se coloca en píxeles enteros (`Math.round`) y los sprites no se escalan, salvo el unicornio del título (×2).
* **Animaciones**: `this.load.spritesheet(key, url, {frameWidth, frameHeight})` + `anims.create` con `generateFrameNumbers`
  (misma API que v3). Los metadatos (celda, frames, fps, pivote) viven en `src/data/anims_*.json`.
* **Texturas procedurales**: `textures.createCanvas` para cielos con dithering Bayer, partículas, arco y rayo (`src/view/gfx.js`).
* **Texto**: `BitmapText` con fuente generada (`tools/build_font.py`) para números y avisos dentro del mundo.
* **Entrada**: `input: { keyboard:false, mouse:false, touch:false }`. Leemos DOM y gamepad nosotros (`src/systems/input.js`).
* **Audio**: `audio: { noAudio: true }`. Web Audio propio (`src/audio/`).
* Se probó en Chromium con WebGL (SwiftShader) y sin errores de consola en el avance rápido de 4 vueltas.
