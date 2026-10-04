# Handoff para Sonnet · Ejecuta el plan

Lee esto primero y luego, en este orden: GAME_DESIGN.md, ART_BIBLE.md, TECH_ARCHITECTURE.md, IMPLEMENTATION_PLAN.md,
ACCEPTANCE_CHECKLIST.md y ASSET_MANIFEST.json. **No rediseñes.** Si algo es imposible, decide lo mínimo para resolverlo,
anótalo en `docs/DECISIONS.md` y sigue adelante.

Rick escribe en español venezolano casual, sin rayas largas ni punto y coma y de forma directa. Dale actualizaciones breves en español.
No le pidas trabajo artístico. No escondas errores. "Archivo creado" no es lo mismo que "función terminada".

## 1. Decisiones cerradas

| Tema | Decisión | Quién |
|---|---|---|
| Carpeta | `copa-arcoiris/`. **No tocar `uni-salta/`** (solo se puede leer o copiar de ahí) ni el `index.html` raíz | Rick |
| Rivales | La familia: los personajes no elegidos, manejados por IA | Rick |
| Jugadores | 1P o **2P local en la misma pantalla**. En 2P hay 2 rivales de IA | Rick |
| Dispositivos | Táctil y teclado con la misma prioridad. Además, mando | Rick |
| 2P táctil | **Una tablet compartida** partida a la mitad, cada mitad con joystick y 3 botones, con opción de espejo | Rick |
| Colores | Sophie verde, Alana rosado, Mamá morado y Papá rojo. Thor azul cielo (propuesto por Opus) | Rick y Opus |
| Mamá | Poder **Estrellas guía** (no escudo) | Rick |
| Unicornio | **No hay.** Juego nuevo. **Thor es el anfitrión** (gorra azul cielo y silbato) | Rick |
| Fotos | Se suben a Higgsfield como referencia (alineación y maestras). **Nunca en Git** | Rick |
| Thor | La referencia es el bóxer de uni-salta (copiado en `reference/thor_identity_ref.png`) | Rick |
| Caras | Las fotos son de pasaporte: **todos sonríen** en el juego | Rick |
| Presupuesto | **200 créditos** de tope (unos USD 12,5). Plan de ~102 y el resto como reserva. Aviso a los 170 | Rick |
| Resolución | Lógica mínima 480×270 con escala entera, celdas de 48×48 y tiles de 16. Se verifica con la comparación 32/48 en M2 | Opus |
| Stack | Phaser 4.2.1, Vite 8.3.2, TypeScript 5.9.3, Vitest 5.0.3 y Playwright 1.63.0, versiones exactas | Opus |
| Sin trepar | La Piñata se alcanza con hongos y plataformas | Opus |
| Audio | Todo por código (ZzFX y secuenciador propio). Higgsfield no tiene audio en el API | Opus (verificado) |
| Idioma | Solo español, con textos en `text.es.json` | Opus |

## 2. Reglas de juego

Están completas en GAME_DESIGN.md §4–§12, con valores numéricos. Lo esencial:
X, Y y Z separados. 4 verbos (Mover, Saltar, Acción contextual y Poder). Nadie queda eliminado: burbuja de rescate y protección.
Puntos de prueba 10/7/5/3. Siempre se termina (burbuja de meta, cierre de sala, piñata que se rompe sola y rondas fijas).
La IA usa el mismo `InputFrame` que los humanos.

## 3. Orden de ejecución

M0 → M1 → (M2 en paralelo) → M3 → M4 → M5 → M6 → M7 → M8 → M9. Detalle y verificaciones en IMPLEMENTATION_PLAN.md.
**Haz commit y push al terminar cada hito** en la rama `claude/downtown-nekketsu-game-1nzc8v` con `git push -u origin claude/downtown-nekketsu-game-1nzc8v`.
No abras PR. No publiques en GitHub Pages ni en ningún servicio sin una instrucción explícita de Rick.

## 4. Dependencias y entorno

- `bash tools/setup.sh` instala Tiled, Krita, Pillow, numpy y scipy, y luego `npm ci`. **El contenedor es efímero**: córrelo al empezar.
- **Clave de Higgsfield**: está en `~/.config/higgsfield/key` (chmod 600), con formato `id:secreto`. Rick la pegó en el chat y la eliminará al terminar.
  **Nunca la imprimas, nunca la copies al repo y nunca la mandes al frontend.** Si el contenedor se reinició y falta,
  pídele a Rick que la agregue como variable de entorno `HF_KEY` en la configuración del entorno. No le pidas que la pegue en el chat.
- **Fotos privadas**: `reference/private/*.png` (ignorado por Git). Si faltan, pídeselas a Rick (detalle en `reference/README.md`).
- Chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, con `--use-angle=swiftshader --enable-unsafe-swiftshader`.

## 5. Referencias recibidas

| Referencia | Ruta | Uso |
|---|---|---|
| 4 fotos de pasaporte (Sophie, Alana, Papá y Mamá) | `reference/private/` | Alineación y maestras. Rasgos en `reference/README.md` |
| Thor bóxer | `reference/thor_identity_ref.png` | Identidad del perro |
| Pipeline de pixel art probado | `tools/pixlib.py` (copiado de uni-salta) | Rejilla, fondo y paleta |
| Fuente Pixelify Sans y su OFL | `uni-salta/assets/fonts/` | Copiar a `public/assets/fonts/` |
| Unicornio | ninguna | No se usa (decisión de Rick) |

## 6. Presupuesto acordado y reglas de gasto

- Tope de **200 créditos**, forzado en `tools/hf.py` (rechaza si se pasaría). Hay aviso desde 170. `python3 tools/hf.py spent` muestra el saldo del proyecto.
- Costo medido: **1,44 créditos** por hoja 2k con referencia y **1,28** sin referencia (`xai/grok-imagine-image-2.0`, `quality: medium`).
- Plan: ~102 créditos (ver `budget` en ASSET_MANIFEST.json). Antes de cada lote, estima con `hf.py estimate` y anota el total del lote en la conversación.
- Como máximo **3 intentos por asset** (el primero y 2 regeneraciones, forzado por `--asset`). Todo P0 antes de cualquier P1 o P2.
- **Timeout**: `hf.py` registra la solicitud como pendiente. Usa `python3 tools/hf.py resume <request_id>` y **nunca reenvíes**.
- El saldo real de la cuenta API no se puede consultar (no hay endpoint). Si el API responde con un error de saldo, detente y avísale a Rick.
- Si una foto de las niñas provoca un rechazo de moderación, reintenta una vez con un prompt más neutro. Si vuelve a fallar, usa solo la descripción de texto para ese personaje y anótalo.
- AutoSprite no existe en el API (`model_not_found`). **No lo intentes por el MCP**: esa cuenta tiene 0,51 créditos y es otra facturación.

## 7. Comandos comprobados en Fase 1 (2026-10-04)

```bash
# Higgsfield (gratis, solo estimación)
python3 tools/hf.py spent
python3 tools/hf.py estimate xai/grok-imagine-image-2.0 --args '{"prompt":"x","resolution":"2k","aspect_ratio":"2:1","quality":"medium","image_urls":["https://example.com/a.png"]}'
#  -> {"credits": "1.440", "usd": "0.090"}

# Generar (se usa en M2, gasta créditos)
python3 tools/hf.py upload reference/private/sophie_photo.png --private
python3 tools/hf.py gen xai/grok-imagine-image-2.0 --asset lineup_family --out art-src/higgsfield/identity/lineup_family.png \
  --purpose "alineación familiar" --args '{"prompt":"...","resolution":"2k","aspect_ratio":"2:1","quality":"medium","image_urls":[...]}'

# Tiled (verificado con un mapa de prueba: tilesets incrustados, animación de tiles y polilíneas)
QT_QPA_PLATFORM=offscreen tiled --embed-tilesets --export-map json maps-src/race.tmx public/assets/maps/race.json

# Stack (verificado en un proyecto de prueba: build OK, vitest OK, Phaser arranca con WebGL en Chromium headless)
npm i -E phaser@4.2.1 && npm i -E -D vite@8.3.2 typescript@5.9.3 vitest@5.0.3 @playwright/test@1.63.0
```
No se verificó: el export headless de Krita (solo el dry-run de apt) y la API de Tilemap de Phaser 4 con un JSON real. Los dos se prueban en M0.

## 8. Prompts iniciales (usar la plantilla de ART_BIBLE §9)

**Alineación familiar** (`lineup_family`, 2:1, 2k, referencias en este orden: papá, mamá, sophie, alana y thor):
```
16-bit Super Nintendo style pixel art character lineup, chunky hard square pixels, a clean 1-pixel dark plum outline (#2A1B3D),
flat cel shading with one highlight and one shadow tone, light from the top left, no anti-aliasing, no gradients, no blur,
no text, no labels, no watermark. A joyful family team at a magical forest sports festival: five characters standing side by
side on one ground line, front three-quarter view, everyone smiling warmly, cute chibi proportions with BIG heads (about 40 percent
of body height) and compact bodies. From left to right: {PAPA}, {MAMA}, {SOPHIE}, {ALANA}, {THOR}. Relative heights: the dad is
tallest, the mom slightly shorter, Sophie reaches the mom's shoulder, Alana is the smallest, the boxer dog stands knee-high to the dad.
Use the reference photos only for faces, hairstyles and features, and make every face look happy. Solid flat cyan (#00C8FF)
background, nothing else.
```
Los `{BLOQUES}` están en ART_BIBLE §4.

**Maestra por personaje** (8 poses en una fila, referencias: su foto y la alineación):
`Frames: (1) front view standing, (2) three-quarter view, (3) side view facing right, (4) back view, (5) cheering with both arms up,
(6) laughing with eyes closed, (7) ready-to-race crouch, (8) waving hello.` Thor: `(1) standing side view, (2) three-quarter, (3) sitting,
(4) back view, (5) tongue-out happy, (6) host pose with sky-blue cap and silver whistle, (7) ready-to-run crouch, (8) wagging tail.`

**Hojas de animación**: la lista de frames de cada hoja está en ART_BIBLE §5. Describe cada frame en el prompt, como en
`uni-salta/art-src/higgsfield/h4/thor_v1.json`, que salió muy consistente.

## 9. Riesgos y alternativas

| Riesgo | Señal | Alternativa decidida |
|---|---|---|
| Parecido insuficiente a 48 px | Rick o la revisión no reconocen a alguien | Ajustar el bloque de identidad y regenerar (máximo 2 veces). Reponer la cara desde la maestra en los frames clave. Si sigue fallando, pasar a celdas de 56 (ART_BIBLE §2) |
| Hojas inconsistentes entre sí | `check_sprites` falla en deriva o continuidad | Pasar la maestra como referencia en cada llamada y usar una escala única por personaje. Reordenar o descartar frames. Sacar walk del run a menor fps si hace falta (anotarlo) |
| Tiles de IA con costuras | Falla la prueba de wrap | Espejar y fundir en la paleta con `build_tiles.py`. Último recurso: tile procedural con la paleta, solo en ese tile |
| API de Tilemap de Phaser 4 distinta | M0 no carga el JSON de prueba | Dibujar las capas desde el JSON propio (Blitter o RenderTexture). El núcleo ya usa `MapData`, así que no cambia nada más |
| Krita no exporta headless | `krita --export` falla con `QT_QPA_PLATFORM=offscreen` | Probar con `xvfb-run` (instalar `xvfb`). Si no funciona, generar el `.kra` (zip con `maindoc.xml` y capas PNG) sin validarlo con Krita y **decirlo así** |
| 2P táctil incómodo en una tablet | Pruebas por CDP OK, pero falta el dispositivo real | Opción de espejo, botones de 60 px y joystick flotante. Prueba real con Rick: PENDIENTE declarado |
| Tiempo | Un hito pasa del doble de su estimación | Aplicar el orden de recorte de IMPLEMENTATION_PLAN.md |
| Contenedor reiniciado | Falta la clave o las fotos | `setup.sh` lo detecta. Pedir la clave como variable de entorno y las fotos otra vez |
| Texto o etiquetas dentro de las hojas | Componentes pequeños sueltos | `build_sprites` descarta los componentes conectados que no son frames |

## 10. Criterios de aceptación

ACCEPTANCE_CHECKLIST.md completo, con evidencia. El cierre incluye la lista **F. Pendiente declarado**.

## 11. Primeras acciones concretas

1. `cd copa-arcoiris && bash tools/setup.sh` y revisa que reporte la clave y las 4 fotos.
2. Crea el proyecto (M0): `package.json` con versiones exactas, `vite.config.ts` (`base: './'`, `build.target: 'es2019'`), `tsconfig.json` estricto,
   `index.html` y `src/main.ts` con el cálculo de tamaño lógico y la escala entera de ART_BIBLE §2. Copia la fuente con su OFL.
3. Prueba Krita headless y un mapa Tiled mínimo cargado en Phaser 4. Anota los dos resultados en `docs/DECISIONS.md`.
4. Lanza M2 en segundo plano: `upload --private` de las 4 fotos y de la referencia de Thor, y luego `lineup_family` (1,44 créditos).
5. Mientras tanto, escribe `src/core` (M1) con sus tests.
6. Cuando llegue la alineación: genera `res_compare.png`, envíale a Rick la alineación y la comparación con SendUserFile y sigue con las maestras.
7. Commit y push de M0 y M1.
