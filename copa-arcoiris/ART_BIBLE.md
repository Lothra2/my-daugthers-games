# Biblia de arte · La Copa del Bosque Arcoíris

## 1. Tono

Un festival deportivo dentro de un bosque mágico que se siente como una tarde de domingo feliz. La luz es cálida y viene de arriba a la izquierda.
Los verdes del bosque tiran a **azul verdoso**, para que el verde lima de Sophie resalte. Hay acentos arcoíris en banderines,
flores y hongos. Todo es suave y redondo. No hay nada filoso ni oscuro ni da miedo.

Referencias de sensación, **no de copia**: el ritmo y la escala de los cabezones del Kunio-kun de NES con el colorido de un SNES tardío.

## 2. Resolución y escala (decisión cerrada, con una verificación visual en M2)

| Elemento | Valor |
|---|---|
| **Resolución lógica** | Mínimo **480 × 270**. Se calcula `scale = min(floor(devW/480), floor(devH/270))` en **píxeles de dispositivo**. Luego `W = min(floor(devW/scale), 640)` y `H = min(floor(devH/scale), 384)`. El sobrante se rellena con el color de borde |
| Ejemplos | 1920×1080 da ×4 y 480×270. iPad 2048×1536 da ×4 y 512×384. iPhone 2532×1170 da ×4 y 633×292 |
| **Escalado** | Entero siempre. Canvas a resolución de dispositivo con CSS `image-rendering: pixelated`. Phaser con `pixelArt: true` y `roundPixels: true` |
| **Celda de personaje** | **48 × 48 px**, pivote en los pies `(24, 46)` |
| **Alturas dentro de la celda** | Papá 44, Mamá 42, Sophie 38, Alana 33 px. La cabeza mide unos 17 px (16 en Alana), alrededor del 40–48% del cuerpo |
| **Thor** | Celda 48 × 48. Cuerpo de unos 40 px de largo y 26 de alto (29 con gorra de anfitrión). Pivote `(24, 46)` |
| **Tiles** | **16 × 16 px** |
| **Retratos de UI** | 64 × 64 px, escalados ×2 o ×3 en la UI |
| **Banda de suelo** | 96 px de profundidad (y de 176 a 272 en el mapa) |

**Por qué 48 y no 32:** con 32 la cabeza mide unos 12 px y Sophie y Mamá (las dos con pelo negro largo) se confunden.
Tampoco caben los ganchos de Alana ni la barba de Papá. En uni-salta, bajar un sprite de ~88 px a 48 borró la cara. Aquí la cara
se **diseña** para 17 px desde el prompt, en vez de reducirla después. Antes de producir, M2 genera la **comparación 32 contra 48**
desde la misma alineación (`docs/art/res_compare.png`) y anota el resultado en §9. Si 48 falla, se sube a 56 con la misma lógica.

**Anti-vibración:** la cámara se redondea a entero antes de dibujar. Los sprites se colocan en `round(x)` y `round(y − z)`.
La física usa floats y solo se redondea el dibujo. Ningún sprite se escala salvo los retratos de UI, que van en múltiplos enteros.

## 3. Paleta maestra (≤ 64 colores)

Archivo fuente: `art-src/palette/copa_arcoiris.gpl`, que también exporta a JSON en `src/data/palette.json`.

| Grupo | Colores |
|---|---|
| Contorno y sombras | `#2A1B3D` contorno · `#4A3560` sombra fría · sombra en el suelo con `#2A1B3D` al 35% |
| Piel A (niñas y Mamá) | `#F6D2B5` · `#E8B48F` · `#C98C6B` · rubor `#FF9DB0` |
| Piel B (Papá) | `#F0C29E` · `#DDA27E` · `#B97B5C` |
| Pelo negro | `#1E1626` · `#3A2A45` · brillo `#5E4C7A` |
| Barba canosa | `#9A8C92` · `#6B5E66` |
| Blancos | `#FFF7EC` · `#E6DCCF` |
| **Sophie, verde** | `#B8F27A` · **`#5DDB43`** · `#33A33A` |
| **Alana, rosado** | `#FFB3D9` · **`#FF6FB5`** · `#D2448F` |
| **Papá, rojo** | `#FF8A6B` · **`#E8423A`** · `#B02A2E` |
| **Mamá, morado** | `#C9A5F7` · **`#9B5DE5`** · `#6E3DB8` |
| **Thor** | Pelaje `#F2B47A` · `#D98A4A` · `#A9612F` · máscara `#2B1D1A` · **azul cielo `#9BDCFF` · `#3FB6F2` · `#2283C4`** |
| Pasto (verde azulado) | `#8AD8B4` · `#4AA88E` · `#2F7F72` · `#1F5559` |
| Camino | `#F2CC93` · `#E3B27A` · `#C08655` · `#8E5A3C` |
| Agua | `#E8FBFF` espuma · `#7FDBF2` · `#4CC9E8` · `#2E93C9` · `#1D5E9C` |
| Madera | `#D99A5B` · `#B9773F` · `#8A5230` · `#5C3524` |
| Arcoíris y flores | `#FF5E7E` · `#FFB23F` · `#FFE45C` · `#7BE3FF` · `#B98CFF` |
| Cielo | `#C7F0FF` · `#9FE3FF` · `#FFC9E0` atardecer · `#FFFFFF` nubes |
| Hongos | `#F2556B` · `#B83A55` · `#A06BE0` · motas `#FFF7EC` |
| UI | panel `#FFF4DE` · botón `#FFD447` / `#E0A82E` · OK `#5DDB43` · texto `#2A1B3D` |

Los colores de identidad también se usan en el aro bajo los pies, el marco del retrato, la flecha fuera de pantalla y la barra de poder.

## 4. Personajes: identidad (bloques de texto para los prompts)

Reglas comunes: **todos sonríen** (las fotos son de pasaporte y Rick pidió que se vean más felices). Llevan uniforme deportivo del festival
con camiseta del color de identidad, ribete blanco y una **estrella blanca en el pecho**, short del tono oscuro de su color, zapatillas
blancas y medias del color claro. Cabeza grande, ojos de 2×3 px con brillo de 1 px, rubor de 1–2 px y boca de 3–4 px.

### Sophie (7) · verde
`a cheerful 7-year-old girl, long straight jet-black hair falling loose past her shoulders with a slightly off-center part, a lime-green sports headband, dark brown eyes, straight defined eyebrows, light tan skin, tiny stud earrings, big happy open smile, lime green t-shirt with white trim and a white star, dark green shorts, white sneakers, adventurous energetic pose`
Silueta: pelo largo y liso que se mueve detrás al correr. Es más alta que Alana y más baja que Mamá.

### Alana (casi 5) · rosado
`a playful 4-year-old girl, chin-length fluffy black bob with a side part, TWO butterfly hair clips (one pink on her left, one purple on her right), big round dark brown eyes, round chubby cheeks with blush, light tan skin, giggling smile, pink t-shirt with small flutter sleeves, white trim and a white star, dark pink shorts, white sneakers`
Silueta: la más pequeña, con cabeza redonda, melena ancha y los dos ganchos visibles de lado (2×2 px cada uno).

### Papá · rojo
`a friendly enthusiastic dad in his early 40s, short dark brown-black hair with a slightly receding hairline, thick dark eyebrows, short salt-and-pepper full stubble beard, warm brown eyes, tan skin, big grin, red sports polo with white trim and a white star, dark red shorts, white sneakers, sturdy athletic build`
Silueta: el más alto y ancho de hombros, pelo corto y barba gris en la parte baja de la cara.

### Mamá (Stephanie) · morado
`an elegant determined mom in her late 30s, long wavy jet-black hair with a center part falling past her shoulders, thin arched eyebrows, light brown eyes, light tan skin, small silver earrings, warm confident smile, purple sports jacket with white trim and a white star, dark purple leggings-shorts, white sneakers, graceful posture`
Silueta: pelo largo **ondulado**, a diferencia del de Sophie que es liso. Es alta y esbelta. Los aretes plateados se ven como 1 px brillante.

### Thor · azul cielo · perro bóxer
`a happy boxer dog, light fawn short coat, black muzzle mask, white chest bib and white paws, floppy folded ears, short tail, sky-blue collar, tongue out, mischievous friendly eyes`. Anfitrión: `+ a small sky-blue cap and a silver whistle on a cord`.
Silueta: cuadrúpedo horizontal. **Su animación es propia de perro**: galope de 4 tiempos, sentarse, nado de perrito, recoger con la boca y voltereta rodando sobre el lomo.
**Colisión**: huella de 22 × 6 px (los humanos tienen 14 × 6) y altura de 26 px.

## 5. Animaciones

Todos los frames de un personaje comparten celda, pivote, escala, línea de pies (fila 46), paleta e identidad.
**El sprite nunca se desplaza dentro de su celda**: el avance lo pone la simulación. Al alinear, el eje X se fija con el centro del torso
(la mediana de las columnas de la cabeza y el torso) y el eje Y con la fila de pies en los frames apoyados.

### Humanos (8 hojas de 8 frames, una fila cada una)
| Hoja | Frames | fps / loop |
|---|---|---|
| H1 `run` | correr ×8 | 14, loop |
| H2 `walk_idle` | caminar ×6 · quieto ×2 (respirar) | 10 loop / 3 ping-pong |
| H3 `jump_pickup` | impulso (agacharse) · subir · cima · bajar · aterrizar (aplastado) · recoger ×3 | por estado / 12 una vez |
| H4 `carry_throw` | llevar quieto ×1 · llevar corriendo ×4 (brazos arriba, manos vacías porque el objeto se dibuja aparte) · lanzar ×3 (preparar, soltar, seguir) | 4 / 14 loop / 14 una vez |
| H5 `swim_push` | nadar ×4 (cabeza y hombros sobre el agua) · empujar ×3 (preparar, empujar, recuperar) · golpe de juguete en el aire ×1 (churro de piscina) | 8 loop / 14 una vez |
| H6 `hit_tumble` | tambaleo ×2 · voltereta: salir volando, caer, en el piso, levantarse ×2 · pose de burbuja de rescate ×1 | 10 / 10 una vez |
| H7 `power_celebrate` | poder ×4 (preparar, lanzar, sostener, recuperar) · celebración propia ×4 | 12 una vez / 10 loop |
| H8 `portraits` | 4 bustos de 64 px: feliz, ¡gané! (ojos cerrados de alegría), ánimo, sorpresa graciosa | UI |

### Thor (8 hojas)
| Hoja | Frames |
|---|---|
| T1 `run` | galope ×8 |
| T2 `walk_idle` | trote ×6 · sentado moviendo la cola ×2 |
| T3 `jump_fetch` | impulso · salto · cima · bajar · aterrizar · recoger con la boca ×3 |
| T4 `carry_toss` | correr con la pelota en la boca ×6 · tirarla con la cabeza ×2 (la pelota va aparte, pegada al hocico) |
| T5 `swim_push` | nado de perrito ×4 · empujar con la cabeza ×3 · golpecito en el aire ×1 |
| T6 `hit_tumble` | tambaleo ×2 · rodar sobre el lomo ×5 · pose en burbuja ×1 |
| T7 `zoom_celebrate` | carrera loca ×4 (orejas al viento) · perseguir la cola ×4 |
| T8 `host_portraits` | anfitrión: silbato, señalar con la pata, sostener el trofeo, levantar la gorra · 4 bustos de 64 px |

No hay trepar: la Piñata usa hongos y plataformas, como se decidió en la planificación.

## 6. Escenarios

- **Mapas por datos en Tiled** (ver TECH_ARCHITECTURE §6). Nunca una imagen única como nivel.
- **Capas de profundidad**: parallax lejano (cielo y colinas) a 0,2, parallax medio (árboles lejanos y casitas) a 0,5, fachada del mapa (setos, cercas y fachadas) a 1,0, la banda de suelo con los personajes y el primer plano a 1,0 o 1,15.
- **Zonas reconocibles** por color y prop distintivo:
  Pradera (pasto claro y banderines arcoíris), Jardín de las casitas (casitas-hongo y flores), Río Cristal (agua turquesa y puente de madera),
  Colina de los Hongos (hongos gigantes y atardecer rosado), Plaza de la Meta (piedra crema, arco de meta y público de animalitos).
  El Circuito tiene carpas de feria de tela a rayas pastel. La Arena es un estanque con nenúfares y nubes reflejadas.
- **Señales de orientación**: flechas de madera, banderines del color de cada arco y un brillo en las bifurcaciones.
- **Movimiento ambiental moderado**: el agua es un tile animado de 4 frames a 6 fps. Banderines y flores se mueven con 2 frames a 3 fps. Las hojas caen con partículas, máximo 6 en pantalla.
- **Primer plano**: nunca tapa obstáculos ni personajes. Si un personaje queda detrás, baja al 45% de opacidad en 0,15 s.

## 7. Efectos (cortos y legibles, máximo 40 partículas)

Polvo al correr o aterrizar (3–5 bolitas crema, 0,3 s), salpicadura (gotas y anillo, 0,4 s), destellos de estrellas,
burbujas (rescate, Alana y pompas), estrellitas girando en la voltereta, confeti en la meta y el podio, estela arcoíris de Sophie,
estrellas guía de Mamá con cola, polvo de embestida de Papá y nube de velocidad de Thor.
Todos usan la paleta, sin blur ni modos de mezcla aditiva que laven el color. Se dibujan detrás del personaje cuando
nacen de los pies y delante solo si duran menos de 0,2 s.

## 8. UI

- Fuente: **Pixelify Sans** (SIL OFL 1.1, se copia con su licencia). Mínimo 16 px CSS en el texto de juego y 20 en los botones.
- Botones grandes: mínimo **64 px CSS** en táctil (60 en 2P), esquinas redondeadas pixeladas y contorno `#2A1B3D` de 2 px lógicos.
- Íconos de control dibujados (pie que salta, mano que agarra, estrella de poder) más la tecla o botón del dispositivo activo.
- Retratos de 64 px en la selección y el podio. El HUD muestra 4 mini retratos en orden de carrera con un aro de color.
- Textos cortos. Ejemplos: "¡Corre!", "¡Salta!", "¡Lánzala!", "¡Arco 2 de 3!", "¡Burbujazo!", "¡Qué carrera!".

## 9. Pipeline de assets y papel de cada herramienta

| Herramienta | Estado verificado el 2026-10-04 | Función real |
|---|---|---|
| **Higgsfield API** (`xai/grok-imagine-image-2.0`) | OK: 1,28 créditos por hoja 2k 2:1 y 1,44 con referencia | Alineación familiar, hojas maestras, hojas de animación, props, fondos, tiras de suelo, FX y UI |
| Higgsfield AutoSprite | **No disponible**: `model_not_found` en el API. El MCP lo lista, pero esa cuenta tiene 0,51 créditos | Bloqueo registrado. Se usan hojas de poses (flujo probado en uni-salta) |
| Higgsfield audio | **No disponible en el API** | El audio va por código |
| **Krita 5.2.2** | Se instala con apt (dry-run OK). El export headless queda por verificar en M0 | `art-src/krita/direccion_arte.kra` (paleta, alineación, comparación 32/48 y moodboards por zona) y `art-src/krita/fondos_<zona>.kra` (una capa por plano de parallax). Los arma `tools/make_kra.py` y se validan con `krita --export` |
| **LibreSprite** | **No disponible**: la descarga desde GitHub da 403 por la política de red | Limpieza, alineación, paleta, transparencia, etiquetas y export se hacen con `tools/build_sprites.py` (Python). Se escriben `.ase` con etiquetas (`tools/write_ase.py`), formato que LibreSprite abre, para que Rick los edite en su máquina. **No se dirá que se usó LibreSprite** |
| **Tiled 1.8.2** | Instalado. `tiled --embed-tilesets --export-map json in.tmx out.json` verificado | Los `.tmx` se generan con `tools/build_maps.py` desde especificaciones de zona. Tiled exporta y valida el JSON que lee Phaser. Quedan editables |
| ImageMagick 6, FFmpeg 6.1, Python + Pillow/numpy/scipy | OK (los paquetes de pip se instalan en `setup.sh`) | Conversión, hojas de contacto y video de gameplay |

### Plantilla de prompt (estilo probado en uni-salta y adaptado)
```
16-bit Super Nintendo style pixel art sprite sheet, chunky hard square pixels, a clean 1-pixel dark plum outline (#2A1B3D),
flat cel shading with one highlight and one shadow tone, light from the top left, no anti-aliasing, no gradients, no blur,
no text, no labels, no watermark. Cute chibi sports-festival character with a BIG head (about 40 percent of the body height)
and a compact body, happy smiling face, rosy cheeks. {IDENTITY}. Draw exactly 8 frames in ONE horizontal row, equally spaced,
every frame the same size, all standing on the same invisible ground line, plenty of empty space between frames so no frame
touches another. Frames: {FRAMES}. Side view facing right. Each figure is about {PCT} percent of the image height.
Solid flat cyan (#00C8FF) background, nothing else.
```
`PCT` sale de la altura: Papá 22, Mamá 21, Sophie 19, Alana 17 y Thor 14 (de alto). Así las proporciones llegan correctas desde el modelo.
Siempre se pasan como referencia la **hoja maestra** del personaje y la **alineación familiar** (máximo 10 referencias).
Las fotos se usan solo para la alineación y las hojas maestras.

### Pasos de `tools/build_sprites.py`
1. Quitar el fondo por inundación desde el borde (`pixlib.key_background`).
2. Separar los 8 frames por componentes y huecos de columnas, y ordenarlos por x.
3. Recuperar la rejilla implícita (`pixlib.detect_grid`) y muestrear a píxeles 1:1.
4. **Escala única por personaje**: `escala = alturaObjetivo / alturaQuietoDeLaMaestra`, igual para todas sus hojas. Remuestreo por moda de bloques, nunca bilineal.
5. Ajustar a la sub-paleta del personaje (≤ 24 colores más los compartidos) y forzar el contorno de 1 px `#2A1B3D`. Quitar píxeles huérfanos y halo.
6. Alinear con los pies en la fila 46 (frames apoyados) y el torso en la columna 24.
7. Empaquetar `public/assets/sprites/<char>.png` (tira de 48 × 48) más `<char>.json` (animaciones, fps, loop y pivote), y escribir `art-src/ase/<char>.ase`.
8. Generar la hoja de contacto ×4 en `docs/qa/sprites/<char>.png` para revisión visual.

### `tools/check_sprites.py` (bloquea la integración si falla)
Revisa por frame: tamaño 48×48, transparencia fuera de la silueta, colores ⊆ paleta, pies en la fila 46 en los frames apoyados (±0)
y deriva del centro del torso ≤ 2 px dentro de un ciclo. **Continuidad del ciclo**: la diferencia entre el último y el primer frame
debe ser ≤ 1,5 veces la mediana de diferencias entre frames vecinos. Si falla, se reordena o se descarta un frame, y si no alcanza, se regenera.
Identidad: Sonnet **mira** la hoja de contacto y marca la lista de §4 (pelo, ganchos, barba, color, sonrisa) en `docs/qa/identity.md`.

### Verificación de resolución (M2)
`docs/art/res_compare.png`: los 5 personajes de la alineación a 32 y a 48, ampliados ×4 lado a lado.
**Resultado (2026-10-04, M2): se queda 48 × 48.** A 32 la cabeza mide ~11 px y las caras no se leen. Sophie y Mamá se confunden por el pelo negro largo.
A 48 se leen el cintillo verde y el pelo liso de Sophie, el pelo ondulado y la chaqueta morada de Mamá, el pelo corto y la polo roja de Papá y la silueta de Alana.
**Riesgos a vigilar en el post-proceso:** los ganchos de Alana (rosado y morado) y la barba canosa de Papá se ensucian con el promedio de píxeles.
El remuestreo final usa la **mediana por bloque** y fuerza esos colores. Si fallan en la revisión de identidad, se pasa a celdas de 56.
