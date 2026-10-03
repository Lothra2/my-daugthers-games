# UNI-SALTA

Un juego de saltos con un unicornio gatito. **Una idea de Sophie.**

Corre, salta y agáchate por seis mundos de cielo, esquiva culebras, slimes y animalitos, come caramelos
(amarillo = rápido, verde = lento, rojo = arcoíris invencible) y llega lo más lejos que puedas.

## Cómo jugar

| | Teclado | Pantalla táctil | Control |
|---|---|---|---|
| Saltar | Espacio, ↑, W | tocar la **mitad derecha** | mantén para saltar más alto |
| Agacharse | ↓, S | mantener la **mitad izquierda** | en el aire, cae más rápido |
| Pausa | Esc, P | botón arriba a la derecha | |

* **Arcoíris**: modo normal, 3 vidas. **Nubecita**: modo fácil para los más chiquitos, sin perder vidas.
* Pisar un slime plano rebota (como en Mario). El slime de púas no se pisa.
* El unicornio lo bautiza quien juega (Ajustes, para cambiarlo).

## Abrirlo

El juego es HTML, CSS y JavaScript sin paso de compilación.

```bash
cd uni-salta
python3 -m http.server 8080      # abre http://localhost:8080
```

En iPad/iPhone/Android: abrir la página publicada y **Añadir a pantalla de inicio** (pantalla completa y sin conexión).
En iPhone el modo "pantalla completa" del navegador no existe, la app instalada sí lo da.

### Publicar con GitHub Pages
Ajustes del repositorio, Pages, "Deploy from a branch", rama con el juego, carpeta `/ (root)`. La URL queda
`https://<usuario>.github.io/my-daugthers-games/uni-salta/`.

## Cómo está hecho

* **Motor**: Phaser 4.2.1 (CDN primero, copia local en `src/vendor/` si no hay red). **Animación de la interfaz**: Motion 14.
* **Núcleo determinista** (`src/core/`): física, enemigos, generador, puntos. No usa Phaser ni el DOM, así se prueba en Node.
* **Niveles**: 64 trozos escritos a mano (`src/data/patterns.js`) y un validador (`npm run validate`) que prueba que
  todos tienen solución con ventanas de reacción de 0,16 a 0,40 s en todas las velocidades.
* **Arte**: generado con la API de Higgsfield a partir de los dibujos de Sophie (`reference/`, intocables),
  convertido a pixel art real con `tools/` (rejilla recuperada, paleta fija de 106 colores, contornos).
* **Audio**: 100 % código. Efectos con ZzFX y música chiptune compuesta en `src/audio/music.js` con capas adaptativas.
* **Sin conexión**: `sw.js` guarda todo tras la primera visita.

## Comandos

```bash
npm test             # pruebas unitarias (núcleo, audio, layout)
npm run validate     # todos los trozos de nivel son resolubles y justos
npm run balance      # 40 partidas de un bot con reflejos humanos
node tests/e2e/flow.mjs      # recorre menús, juego, pausa y resultados con capturas
node tests/e2e/devices.mjs   # iPhone, Galaxy, iPad, escritorio: zoom entero, HUD, táctil
node tests/e2e/offline.mjs   # arranca sin CDN y sin conexión
node tests/e2e/soak.mjs      # avance rápido por 4 vueltas completas, sin errores de consola
```

Banderas de depuración (en la URL): `?seed=N&world=N&lap=N&mode=easy|normal&god&autoplay&ff=20&hitboxes&fps&power=fast|slow|inv&chunk=<id>&sounds&skipTitle&lang=es|en`.
`?sounds` abre un tablero para oír cada efecto y cada canción.

## Estructura

```
index.html  sw.js  manifest.webmanifest
src/core      simulación determinista (sim, bot, config, rng)
src/data      trozos de nivel, mundos, metadatos de animaciones
src/view      escenas de Phaser (Preload, Title, Game), efectos, parallax
src/ui        interfaz DOM + Motion
src/audio     efectos, música, motor de audio
src/systems   layout, input, guardado, i18n
assets        sprites, props, suelos, iconos, fuentes (≈1 MB en total)
reference     los dibujos de Sophie (solo lectura, con sumas de verificación)
art-src       salidas originales de Higgsfield con su prompt y costo
tools         pixelize, extracción, constructores de sprites, validador, bots
tests         unit y e2e
docs          decisiones, créditos de Higgsfield, QA, notas de Phaser 4
```

Licencias: Phaser (MIT), Motion (MIT), ZzFX (MIT), Pixelify Sans (SIL OFL 1.1).
