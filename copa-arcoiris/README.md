# La Copa del Bosque Arcoíris

Juego familiar de pixel art en el espíritu de los festivales deportivos de Kunio-kun (Famicom, 1990), con personajes, mundo, música y reglas originales.
Sophie, Alana, Papá, Mamá y Thor compiten con cariño en cuatro pruebas dentro de un bosque mágico. Se puede jugar solo o de a dos en la misma pantalla,
con teclado, mando o dedos. Todo está en español, nadie queda humillado y todas las pruebas se pueden terminar.

**Estado:** primera versión jugable de punta a punta. Lo que se probó y lo que no se pudo probar está en [ACCEPTANCE_CHECKLIST.md](ACCEPTANCE_CHECKLIST.md), sección F.

## Jugar ahora

```bash
cd copa-arcoiris
npm ci
npm run build
npm run preview        # abre http://localhost:4173
```

`dist/` ya viene construido en el repositorio. Para jugar en una tablet de la misma red wifi: `npm run preview` ya escucha en todas las interfaces,
abre `http://IP-DEL-COMPUTADOR:4173` en la tablet. Después de cargar no necesita internet.

Para desarrollo: `npm run dev` (recarga en caliente).

## La copa

Cuatro pruebas de 1 a 3 minutos. Los puntos de cada una son 10, 7, 5 y 3 según el puesto. Quien suma más gana la copa. El empate se decide por pruebas ganadas y luego por la última prueba.

| Prueba | Qué se hace |
|---|---|
| **Carrera del Bosque** | Una carrera por la pradera, el jardín de las casitas, el río, la colina de los hongos y la plaza. Hay rutas fáciles y rutas atrevidas. Los que se quedan atrás llegan en burbuja |
| **Circuito de Juegos** | Cuatro salas cortas: troncos rodantes, arroyo de hongos, plataformas columpio y molino de burbujas. Cuenta el orden de salida de cada sala |
| **Piñata de Estrellas** | Salta, golpea la piñata con la pelota y recoge las estrellas que caen. Gana quien junta más |
| **Arena de Burbujas** | Tres rondas de 30 s en una isla que se achica. Empuja a los demás al agua. Caer no resta, empujar suma |

Antes de la primera copa hay un **Calentamiento** de 4 pasos con Thor: correr, saltar un tronco, lanzar la pelota al blanco y usar el poder.

### Personajes y poderes

| | Color | Poder (la barra se llena con el tiempo y con las estrellas) |
|---|---|---|
| Sophie | verde | **Impulso arcoíris**: corre con un dash que cruza el agua |
| Alana | rosado | **Burbuja protectora**: nada te voltea durante unos segundos. Nada más rápido |
| Papá | rojo | **Carga deportiva**: embiste y rompe cajas. Lanza más lejos |
| Mamá | morado | **Estrellas guía**: tres estrellas que persiguen a los demás. Se levanta rápido y la rescatan con más protección |
| Thor | celeste | **Carrera loca**: se vuelve un cohete. Recoge solo las pelotas y es el anfitrión |

Cada prueba da XP. Con el nivel se desbloquean trajes (Arcoíris en el nivel 2, Estrellas en el 4), el poder mejorado (nivel 3) y la celebración dorada (nivel 5). Todo se guarda en el navegador.

## Controles

| | Teclado 1 jugador | Teclado 2 jugadores | Mando |
|---|---|---|---|
| Mover | WASD o flechas | J1: WASD · J2: flechas | Stick izquierdo o cruceta |
| Saltar | Espacio o J | J1: F · J2: `,` | A |
| Acción (empujar, recoger, lanzar) | K | J1: G · J2: `.` | X |
| Poder | L | J1: H · J2: `/` | Y |
| Pausa | Esc o P | Esc o P | Start |

**Táctil:** joystick a la izquierda y tres botones a la derecha. En 2 jugadores la pantalla se divide en dos mitades y cada una tiene sus controles, pensado para una tablet compartida. En Ajustes se puede espejar al jugador 2.

## Cómo está hecho

- **Phaser 4 + TypeScript + Vite.** La simulación (`src/core`) es determinista, de paso fijo a 60 Hz y no usa Phaser ni el DOM, así que se prueba sin navegador.
- **Mapas en Tiled** (`maps-src/*.tmx`, exportados a `public/assets/maps/*.json`). Los generan `tools/build_maps.py` y `npm run maps`, y se pueden abrir y editar en Tiled.
- **Arte:** los 5 personajes y la decoración salen de Higgsfield (`xai/grok-imagine-image-2.0`) y pasaron por un pipeline propio (segmentación, escala única por personaje, paleta, contorno). Los tiles, el cielo, las colinas, los iconos y los bloques se dibujan por código. Registro completo en [docs/GENERATIONS.md](docs/GENERATIONS.md).
- **Audio por código:** 44 efectos y 7 canciones originales sintetizadas con Web Audio, sin archivos de sonido. Para escucharlos uno por uno: `http://localhost:4173/?sounds`.
- **IA rival:** la familia. Cada personaje tiene una forma de jugar (Sophie explora, Alana y Papá son juguetones, Mamá es prudente, Thor es veloz). Dificultad Tranquilo o Campeón en Ajustes.
- **Guardado:** `localStorage` con versión, migración y copia de seguridad si el archivo se daña. Si el navegador bloquea el almacenamiento, se juega en memoria y se avisa.

```
src/core      simulación, reglas de las 4 pruebas, IA, progresión (sin Phaser)
src/view      escenas de Phaser, personajes, efectos, fondos, props
src/input     teclado, táctil multitouch, mando y router común
src/audio     efectos, canciones y reproductor
src/app       menús, flujo de la copa, resultados
src/ui        HUD y pantallas en DOM
maps-src      mapas de Tiled (.tmx) y tilesets
art-src       fuentes de arte: hojas de Higgsfield, paletas y archivos Krita (.kra)
tools         pipeline de arte, generación de mapas, helper de Higgsfield con tope de presupuesto
tests         unitarias (Vitest) y de navegador (Playwright)
docs          decisiones, registro de generaciones, licencias, capturas y video de QA
```

## Pruebas

```bash
npm test                          # unitarias: reglas, mapas, IA, 50 copas completas simuladas, progresión, audio
node tests/e2e/smoke.mjs          # arranque sin errores
node tests/e2e/ui.mjs             # ajustes que se guardan, récords, vestuario, pausa (seguir, repetir, salir)
node tests/e2e/warmup.mjs         # un bot juega el calentamiento con teclado real
node tests/e2e/input.mjs          # teclado 1P/2P, multitouch, mando simulado, foco, tamaños, guardado dañado
node tests/e2e/cup.mjs 1 sophie,papa,mama,thor 2   # copa completa en piloto automático, y "Otra copa" limpia
node tests/e2e/events.mjs         # capturas de cada prueba
node tests/e2e/views.mjs          # hitboxes y tamaños de pantalla
node tests/e2e/video.mjs          # regenera docs/qa/gameplay.mp4
npm run e2e                       # smoke, ui, warmup, input, audio y events en fila
node tests/e2e/audio.mjs          # mide el nivel de salida de cada canción y cada efecto
```

Las pruebas de navegador usan el Chromium que ya trae el entorno (`/opt/pw-browsers`). Parámetros útiles en la URL: `?autostart=event&event=race|circuit|pinata|arena|warmup`,
`players=1|2`, `chars=sophie,papa,mama,thor`, `seed=N`, `autoplay` (la IA juega por los humanos), `ff=N` (avance rápido), `skipIntro`, `hitboxes`, `sounds`.

## Qué falta o no se pudo probar

Sin mentiras: esto no se probó en un dispositivo real. Ver [ACCEPTANCE_CHECKLIST.md](ACCEPTANCE_CHECKLIST.md) sección F. Lo principal es que ningún humano ha jugado ni escuchado el juego todavía,
no hubo mando físico, tablet ni iPad, y el audio se verificó midiendo la señal y no con el oído.

## Documentos

| Documento | Para qué |
|---|---|
| [GAME_DESIGN.md](GAME_DESIGN.md) | Reglas, personajes, pruebas, puntuación, IA y progresión |
| [ART_BIBLE.md](ART_BIBLE.md) | Resolución, paleta, identidad de cada personaje y pipeline de assets |
| [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md) | Stack, módulos, simulación 2.5D, mapas de Tiled y pruebas |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Todo lo que cambió respecto al plan y por qué |
| [docs/GENERATIONS.md](docs/GENERATIONS.md) | Cada imagen generada con Higgsfield y su costo |
| [docs/LICENSES.md](docs/LICENSES.md) | Licencias y origen de cada pieza |
| [ASSET_MANIFEST.json](ASSET_MANIFEST.json) | Cada asset con su estado real |
| [ACCEPTANCE_CHECKLIST.md](ACCEPTANCE_CHECKLIST.md) | Qué se probó, con qué evidencia, y qué queda pendiente |
| [docs/qa/](docs/qa) | Capturas, hojas de contacto y video de gameplay |
