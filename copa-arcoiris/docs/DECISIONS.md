# Decisiones y desviaciones

Se anota aquí todo cambio respecto a los documentos de diseño, con su motivo. Lo más nuevo va abajo.

## Fase 1 (Opus, 2026-10-04)
- Juego nuevo en `copa-arcoiris/`. uni-salta no se modifica.
- Higgsfield API: `grok-imagine-image-2.0` disponible (1,28 créditos sin referencia y 1,44 con referencia, 2k). AutoSprite, Sonilo y Mirelo dan `model_not_found`. El MCP de Higgsfield tiene 0,51 créditos en otra cuenta y no se usa.
- LibreSprite no se puede descargar (GitHub 403 por la política de red). Su papel lo cumple el pipeline Python con export `.ase`.
- Tiled 1.8.2 instalado y export CLI verificado. Krita 5.2.2 se puede instalar con apt, pero el export headless no se verificó.
- Stack verificado en un proyecto de prueba: Phaser 4.2.1, Vite 8.3.2, TS 5.9.3, Vitest 5.0.3 y Playwright 1.63.0 con el Chromium preinstalado.
- Decisiones de Rick: rivales de la familia, 1P y 2P local en tablet compartida, 200 créditos, Estrellas guía para Mamá, colores (Sophie verde, Alana rosado, Mamá morado y Papá rojo), sin unicornio, Thor anfitrión, fotos a Higgsfield pero fuera de Git, Thor según la referencia de uni-salta.
- Propuestas de Opus aceptadas por defecto: Thor azul cielo, sin trepar en la Piñata, celdas de 48 px y audio por código.

## Fase 2 (Sonnet)
- **Krita headless (verificado M0):** `QT_QPA_PLATFORM=offscreen` no funciona (Krita fuerza xcb). `xvfb-run -a krita --export --export-filename out.kra in.png` SÍ funciona y escribe un `.kra` real (zip con `maindoc.xml` y capas). Importa `.ora` con capas, así que `tools/make_kra.py` arma un `.ora` multicapa con Pillow y Krita lo convierte a `.kra`. Lo que se diga "hecho con Krita" pasó por ese comando.
- **Vite 8 usa Rolldown:** `manualChunks` debe ser una función (el objeto del plan falla). Corregido en `vite.config.ts`.
- **Costo real de Higgsfield:** la alineación con 5 referencias costó 2,08 créditos. Las maestras con 2 referencias, 1,6. Con 1 referencia, menos. Los créditos se llevan en `art-src/generations.jsonl`.
- **Referencias limpias:** la alineación contaminó las maestras de Alana y Papá (cintillo verde, niña dentro de la hoja de Papá). Las hojas de animación usan solo un recorte limpio de los 4 primeros frames de la maestra (`art-src/higgsfield/identity/ref_<personaje>.png`).
- **Resolución:** se queda 48 × 48 (ver ART_BIBLE §9).
- **Pantalla lógica 426 × 240 (mínimo) a 640 × 384 (máximo), escala entera.** Se cambió el 480 × 270 del plan porque en 1280 × 720 sobraba medio cielo vacío. Las pantallas únicas (Piñata, Arena) y las salas del Circuito miden 416 px de ancho. `computeLayout` está probado (`tests/unit/layout.test.ts`) y en navegador a 1920 × 1080, 1024 × 768, 844 × 390 @3 y 2048 × 1536 @2.
- **Tiles dibujados por código, no con IA.** Las hojas de tiles de Higgsfield tenían costuras visibles. `tools/build_tiles.py` dibuja los 64 tiles de 16 px con la paleta maestra, sin costuras por construcción. El agua y la orilla se animan con la animación nativa de tiles de Phaser 4. Los fondos (cielo, nubes, colinas) también son código (`Backdrop.ts`).
- **Props con IA sí.** Cinco kits de 8 objetos (árboles, casas, banderas, objetos de las pruebas, agua) por 6,4 créditos en total. `tools/build_props.py` los recorta, los escala a una altura fija y los empaqueta en un atlas. En el mapa son objetos `type="deco"` con el nombre del frame. La propiedad `split` dibuja la parte baja de un árbol delante de los personajes y la copa detrás (el Árbol Abuelo de la Piñata).
- **Rutas de la IA como grafo de puntos** (`rutas_ia`, cada nodo con `siguiente="id:peso"`), no como polilíneas. Permite bifurcaciones fáciles y atrevidas con pesos según el riesgo de cada personaje.
- **Tiled 1.8 usa `type`, no `class`** en los objetos. El contrato de capas y propiedades está en `src/maps/tiled.ts`.
- **Duración de las pruebas.** La carrera dura 1 a 1,5 min (no 3) porque el mapa se acortó para que se sienta ágil. Una copa entera con pantallas, tarjetas de Thor y resultados dura unos 8 a 9 minutos (simulado en 50 copas, `tests/unit/cups.sim.test.ts`), por debajo de los 10 a 15 del plan. Si Rick la quiere más larga, lo más barato es agregar una segunda vuelta al Circuito o una cuarta ronda en la Arena.
- **Sin "agacharse" en el Molino de burbujas.** La mecánica se cortó: con salto y empuje alcanza y es más fácil de entender para una niña de 5 años.
- **Trajes por rotación de tono.** Los trajes Arcoíris y Estrellas de cada personaje salen de rotar los tonos de la ropa en `tools/build_outfits.py`, sin generar nada nuevo.
- **Retratos desde las poses.** Los retratos (feliz, ganador, saludo, tres cuartos) se recortan de las hojas de animación y la maestra, no se generaron aparte (`tools/build_portraits.py`). Thor lleva gorra celeste y silbato plateado en el retrato de anfitrión.
- **LibreSprite no estuvo disponible**, así que no hay archivos `.ase`. Los `.kra` sí existen (`art-src/krita/`, `tools/make_kra.py`) y pasaron por Krita 5.2.2 real.
- **Audio por código, sin ZzFX.** Se escribió un sintetizador propio (`src/audio/sfx.ts`) y las canciones como datos (`songs.ts`). Ver docs/LICENSES.md.
- **Bugs de IA encontrados por las 50 copas simuladas** (ya corregidos): (1) una IA se quedaba parada para siempre al llegar a un nodo de la ruta cuando el siguiente quedaba "bloqueado", porque el re-planeo volvía a elegir el nodo en el que estaba (`followRoute`). (2) La detección de atascos no corría dentro del agua, así que una IA pegada al borde de una piedra nadaba contra ella 8 s. Ahora corre también nadando.
- **Calentamiento más generoso.** El blanco acepta pelotas hasta 46 px de altura y 16 px de margen. Con 26 px una pelota lanzada de lejos pasaba por encima y no se podía completar. Lo encontró el bot de teclado (`tests/e2e/warmup.mjs`).
- **Mejor ver el estado de protección.** El parpadeo de un personaje protegido pasó de 45 % a 72 % de opacidad: en tumultos se veía fantasmal.
