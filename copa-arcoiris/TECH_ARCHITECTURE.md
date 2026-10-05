# Arquitectura técnica · La Copa del Bosque Arcoíris

> **Actualización de la Fase 2 (lo que cambió respecto a este documento).** Las rutas de la IA son un grafo de puntos (`rutas_ia` con `siguiente`). Los objetos de decoración son `type="deco"` con el nombre del frame del atlas de props (`props_fondo`, `props_suelo`, `props_frente`);
> la propiedad `split` parte un árbol entre copa y tronco. Los tiles animados usan la animación nativa de Phaser 4. Tiled 1.8 exporta `type`, no `class`. El audio es propio (`src/audio`: `sfx.ts`, `songs.ts`, `engine.ts`, `board.ts`) y no usa ZzFX.
> `RenderTexture.drawFrame` no existe en Phaser 4: se usa `stamp`. `manualChunks` de Vite 8 debe ser una función. Las pruebas de navegador están en `tests/e2e/` y se lanzan con `npm run e2e`. Ver [docs/DECISIONS.md](docs/DECISIONS.md).


## 1. Stack (versiones exactas, verificadas el 2026-10-04 con un proyecto de prueba que compiló, pasó un test y arrancó en Chromium con WebGL)

| Paquete | Versión | Nota |
|---|---|---|
| phaser | **4.2.1** | La misma de uni-salta, estable. Se usa por npm, sin CDN |
| vite | **8.3.2** | Node ≥ 22.12 (hay 22.22) |
| typescript | **5.9.3** | Se evita TS 7 (nativo) por compatibilidad de tooling. Solo sirve para el chequeo de tipos, Vite transpila |
| vitest | **5.0.3** | Peer `vite ^8` OK |
| @playwright/test | **1.63.0** | Su navegador no está instalado. **Usar** `executablePath: /opt/pw-browsers/chromium-1194/chrome-linux/chrome` con `--use-angle=swiftshader --enable-unsafe-swiftshader`. Nunca correr `playwright install` |

Se instala con `npm i -E` y se commitea `package-lock.json`. El build hace `vite build` con `base: './'` (rutas relativas, sirve desde cualquier subcarpeta) y `build.target: 'es2019'`.

**Lecciones de uni-salta que aplican:** no usar `structuredClone`, `replaceAll` ni `||=` (tablets viejas). Recargar ante `webglcontextlost`.
Envolver `update` en try/catch con recuperación. **Reiniciar todos los campos perezosos en `create()`**, porque Phaser reutiliza el objeto Scene al reiniciar.

## 2. Estructura de carpetas

```
copa-arcoiris/
  index.html  package.json  package-lock.json  vite.config.ts  tsconfig.json  README.md
  GAME_DESIGN.md ART_BIBLE.md TECH_ARCHITECTURE.md ASSET_MANIFEST.json IMPLEMENTATION_PLAN.md ACCEPTANCE_CHECKLIST.md SONNET_HANDOFF.md
  src/
    main.ts                 arranque, tamaño lógico, pérdida de contexto, router de escenas
    core/                   SIMULACIÓN PURA: sin Phaser, sin DOM, sin Math.random
      types.ts rng.ts world.ts movement.ts terrain.ts states.ts combat.ts items.ts camera.ts
      abilities/  sophie.ts alana.ts papa.ts mama.ts thor.ts index.ts
      ai/         brain.ts profiles.ts routes.ts
      events/     types.ts race.ts circuit.ts pinata.ts arena.ts warmup.ts
      competition/ cup.ts scoring.ts
      progression/ xp.ts unlocks.ts records.ts
    maps/         tiled.ts (JSON de Tiled a MapData), validate.ts
    view/         escenas de Phaser y render
      scenes/     Boot.ts Preload.ts Title.ts EventScene.ts Podium.ts CupFinal.ts
      CharacterView.ts ItemView.ts Fx.ts TiledRenderer.ts Parallax.ts Hud.ts Offscreen.ts
    ui/           DOM: menús, selección, ajustes, pausa, controles táctiles, tarjetas de Thor (ui.css)
    input/        keyboard.ts gamepad.ts touch.ts router.ts focus.ts
    audio/        engine.ts sfx.ts music.ts songs/*.ts
    save/         save.ts migrations.ts
    data/         characters.json events.json palette.json text.es.json
  public/assets/  sprites/ tiles/ props/ bg/ ui/ fx/ fonts/ maps/   (lo que carga el juego)
  maps-src/       *.tmx *.tsx (editables en Tiled)
  art-src/        higgsfield/<grupo>/*.png+json · krita/*.kra · ase/*.ase · palette/*.gpl · generations.jsonl
  reference/      README.md · thor_identity_ref.png · private/ (ignorado por Git)
  tools/          setup.sh hf.py pixlib.py build_sprites.py check_sprites.py build_tiles.py build_props.py build_bg.py
                  build_maps.py make_kra.py write_ase.py build_font.py (si hace falta)
  tests/unit/  tests/e2e/
  docs/        GENERATIONS.md LICENSES.md DECISIONS.md qa/ art/
  dist/        build de distribución (se commitea)
```

## 3. Núcleo de simulación (`src/core`)

- **Paso fijo de 1/60 s** con acumulador y máximo 4 pasos por frame (si el frame tarda más, se descarta tiempo, no se acelera). Las vistas leen el estado sin modificarlo.
- **Determinista**: `rng.ts` es un mulberry32 con semilla. Así cualquier prueba se reproduce con `?seed=N`.
- **Entidades**: `Actor { id, charId, slot, control: 'human'|'ai', pos:{x,y,z}, vel:{x,y,z}, facing, state, stateT, power, carrying, protectT, lastHitBy, lastHitT, checkpoint, progress, finished }`.
- **Entrada**: `InputFrame { mx, my, jump, jumpPressed, action, actionPressed, power, powerPressed }`. Lo producen igual el teclado, el mando, el táctil y la IA, que **no tiene otra interfaz**.
- **Estados** (`states.ts`, máquina explícita con tiempos): `idle, walk, run, jumpRise, jumpFall, land, swim, pickup, carry, throw, push, bop, stagger, tumble, getup, power, celebrate, rescue, finished`. Cada estado declara qué verbos acepta.
- **Movimiento** (`movement.ts`): normaliza el vector y luego aplica el factor 0,65 en y. Rampa de caminar a correr por tiempo sostenido. Integra z con gravedad. Usa reglas de terreno con consultas a `terrain.ts`.
- **Colisiones**: huella (x, y) de 14×6 (Thor 22×6) contra sólidos y plataformas con altura. Los golpes comprueban `|dx| ≤ alcance`, `|dy| ≤ 10` y solapamiento de z (`[z, z+alto]`). Nunca se usa la imagen.
- **Eventos** (`events/*.ts`) implementan
  `interface EventRules { setup(world, map, roster): void; step(world, dt): void; standings(world): Standing[]; isOver(world): boolean; hud(world): HudModel }`.
  El rescate en burbuja, los arcos, las salas, la piñata y las rondas viven aquí. Todo lo demás es compartido.
- **Cámara** (`core/camera.ts`) se calcula en el núcleo (es lógica de juego: rescate por quedar fuera de cuadro) y se redondea al dibujar.

## 4. Render (Phaser 4.2.1)

- Config: `type: AUTO`, `pixelArt: true`, `roundPixels: true`, `antialias: false`, `scale.mode: NONE` (se redimensiona con `game.scale.resize(W,H)` y el CSS escala por entero), `input: { keyboard:false, mouse:false, touch:false }` (la entrada es propia), `audio: { noAudio: true }` (Web Audio propio).
- **Orden de dibujo**: `depth = y_pies` para actores, props de suelo e items. Las sombras van en una capa bajo los actores. `frente` va por encima con alfa dinámico.
- `CharacterView` elige la animación según `state` y `facing` (con flip X). El objeto llevado se dibuja aparte en el ancla de manos o de hocico. La sombra es una elipse pixelada que se achica con z.
- La posición dibujada es `round(x − camX)`, `round(y − z − camY)`, con la cámara ya redondeada.

## 5. Entrada (`src/input`)

- `router.ts` asigna dispositivos a slots (J1 y J2) y entrega un `InputFrame` por slot en cada paso.
- **Táctil**: Pointer Events sobre una capa DOM con `touch-action: none`. Usa `Map<pointerId, Zona>`. Una zona se define al **pointerdown** y no cambia hasta **pointerup/cancel**. Joystick flotante con zona muerta del 18%. Botones con estado presionado y "pressed this step". En 2P la pantalla se divide por la mitad.
- **Teclado**: `KeyboardEvent.code` y mapas por modo (1P y 2P), ver GAME_DESIGN §4. Se hace `preventDefault` para flechas y espacio.
- **Mando**: se sondea `navigator.getGamepads()` en cada frame, con `gamepadconnected/disconnected`. Una desconexión dispara pausa.
- **Foco** (`focus.ts`): `blur`, `visibilitychange`, `pagehide` y la orientación vertical llevan a pausa. Además se limpian todas las teclas y toques.

## 6. Mapas Tiled → Phaser

**Fuente:** `maps-src/<evento>.tmx` (ortogonal, finito, tiles de 16×16, CSV) generado por `tools/build_maps.py` desde especificaciones de zona en Python, editable a mano en Tiled.
**Export verificado:** `QT_QPA_PLATFORM=offscreen tiled --embed-tilesets --export-map json maps-src/race.tmx public/assets/maps/race.json`.
Conserva tilesets incrustados, animaciones de tiles, propiedades y polilíneas.

### Capas (nombres fijos)
| Capa | Tipo | Contenido |
|---|---|---|
| `parallax_lejos`, `parallax_medio` | image layer con `parallaxx` | fondos |
| `fachada` | tiles | setos, cercas y fachadas detrás de la banda de suelo |
| `suelo` | tiles | pasto, camino, agua (tile animado), madera |
| `deco_suelo` | tiles | flores y piedritas, sin colisión |
| `props_fondo`, `props_suelo`, `props_frente` | objetos con gid (tileset de colección de imágenes `props`) | casitas, árboles, arcos, banderas. `props_suelo` se ordena por y |
| `frente` | tiles | ramas y hojas en primer plano |
| `colision` | objetos rect | sólidos. Propiedad `alto` (px, 999 = muro) |
| `plataformas` | objetos rect | huella más `alto`. Si se mueve: `mueve` (x/y), `rango`, `periodo`, `fase` |
| `agua` | objetos rect | `corriente` (px/s en x) |
| `huecos` | objetos rect | caída con rescate |
| `rebote` | objetos rect | hongos, `fuerza` |
| `moviles` | objetos rect | troncos y aspas: `tipo`, `periodo`, `fase`, `ruta` |
| `checkpoints` | objetos punto | `orden` (arco 1..3) y punto de respawn |
| `salidas` | objetos punto | `slot` 0..3 |
| `meta` | objeto rect | línea de meta |
| `rutas_ia` | polilíneas | `id`, `tipo` (principal, atajo, dificil, agua), `siguiente` ("id:peso,id:peso") |
| `activadores` | objetos rect | `evento` ("tip:salta", "zona:rio", "sala_fin:2"...) |
| `objetos` | objetos punto | `tipo` (pelota, estrella, caja, estrella_dorada, canasta, parachoques) |
| `salas` | objetos rect | Circuito: `orden` y su `puerta` (rect) |

Las coordenadas del mapa son las del mundo: `x` es el avance y `y` la profundidad (pies). Tiled 1.8 escribe `type`. Si Rick lo abre en Tiled ≥ 1.9 aparece como `class`, y el parser **acepta los dos**.

### Qué no soporta Phaser directamente y cómo se resuelve (`view/TiledRenderer.ts`)
| Función de Tiled | Soporte en Phaser | Adaptador |
|---|---|---|
| Animación de tiles (agua y banderines) | No se reproduce | Se leen `tilesets[].tiles[].animation`, se agrupan posiciones por id y se cambia el índice con un temporizador |
| Image layers y `parallaxx` | No se crean solas | Se crea un `TileSprite` por capa con `scrollFactor = parallaxx` y repetición horizontal |
| Objetos-tile de colección de imágenes | No hay mapeo fiable | `gid` → archivo del tile → clave de textura. Sprite con origen (0,1) en (x, y) y profundidad por y |
| Objetos y propiedades | Solo datos crudos | `maps/tiled.ts` los convierte en `MapData` tipado, que es lo único que ve el núcleo |

`maps/validate.ts` se corre en los tests: 4 salidas, la meta existe, las rutas de IA están conectadas desde la salida hasta la meta, **alturas obligatorias ≤ 22 px**, cada agua tiene orilla de salida, los checkpoints están ordenados y no hay sólidos sobre las salidas.

## 7. UI DOM

Los menús, la selección, los ajustes, la pausa, las tarjetas de Thor, los podios con texto y los **controles táctiles** son DOM sobre el canvas,
con Pixelify Sans y botones grandes. El HUD dentro del juego (retratos en orden, barras de poder, flechas fuera de cuadro, "¡Arco 2 de 3!")
se dibuja en Phaser en píxeles. Las transiciones de UI usan CSS (no hace falta Motion).

## 8. Audio (`src/audio`)

`engine.ts` usa un `AudioContext` que se crea o reanuda en el primer gesto, con buses `music` y `sfx` (GainNode) y un `master`.
Volúmenes de 0 a 1 que se guardan, más silencio total. `sfx.ts` usa ZzFX (MIT, se copia en `src/audio/zzfx.ts` con su licencia) con parámetros por efecto.
`music.ts` es un secuenciador de pasos (cuadrada, triángulo, ruido) con canciones originales en `songs/*.ts`.
Se suspende al pausar o al perder el foco.

## 9. Guardado (`src/save`)

```ts
interface SaveV1 { version: 1; settings: { music: number; sfx: number; muted: boolean; difficulty: 'tranquilo'|'campeon'; mirrorP2: boolean };
  characters: Record<CharId, { xp: number; level: number; outfit: 'base'|'arcoiris'|'estrellas' }>;
  records: { raceBestMs?: number; circuitBest?: number; pinataBest?: number; arenaBest?: number; cupsWon: number };
  medals: Record<CharId, Partial<Record<EventId, 'oro'|'plata'|'bronce'>>>; stats: { cupsPlayed: number; warmupDone: boolean } }
```
`load()` hace try/catch en cada acceso, valida la forma, aplica `migrations[v]` y si está corrupto hace backup y arranca limpio.
Si el storage falla, usa un objeto en memoria y lo avisa una vez.

## 10. Banderas de depuración (solo lectura de la URL, inofensivas en producción)

`?event=warmup|race|circuit|pinata|arena` `&players=1|2` `&chars=sophie,papa` `&seed=N` `&ff=N` (avance rápido ×N)
`&autoplay` (los humanos los maneja la IA) `&hitboxes` `&fps` `&skipIntro` `&difficulty=tranquilo|campeon` `&mockpad=1` (mando simulado para e2e).

## 11. Pruebas

- **Unitarias (Vitest, sobre el núcleo puro)**: ver ACCEPTANCE_CHECKLIST §B. Comprueban reglas observables (alturas, tiempos, quién puntúa y qué pasa al caer), no repiten la implementación.
- **Simulación sin cabeza**: copas completas con 4 IA y semillas 1..50, sin Phaser. Comprueban que todos terminan las 4 pruebas, que no hay atascos de más de 6 s sin rescate y que la duración queda entre 9 y 15 min simulados.
- **E2E (Playwright + Chromium preinstalado)**: arranque sin errores de consola, la copa completa en 1P y 2P con `autoplay&ff`, multitouch real por CDP `Input.dispatchTouchEvent` con 4 puntos, teclado, mando simulado (se reporta como **simulado**), cambios de tamaño (1920×1080, 1024×768, 844×390 y 2048×1536 con dpr 2), pausa por `visibilitychange`, guardado tras recargar y guardado corrupto.
- **Capturas** por evento en `docs/qa/shots/` y un **video** de ~30 s (`recordVideo` de Playwright convertido con ffmpeg) en `docs/qa/gameplay.mp4`.

## 12. Comandos (los define `package.json` en M0)

```bash
bash tools/setup.sh              # dependencias del sistema, pip y npm ci
npm run dev                      # http://localhost:5173
npm test                         # unitarias y simulaciones sin cabeza
npm run e2e                      # playwright (usa CHROMIUM_PATH)
npm run build                    # tsc --noEmit && vite build -> dist/
npm run preview                  # http://localhost:4173 (prueba local de la build)
npm run maps                     # build_maps.py + export de Tiled + validación
npm run assets                   # build_sprites/tiles/props/bg + check_sprites
```
