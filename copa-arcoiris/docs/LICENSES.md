# Licencias y origen

Todo lo que viaja dentro del juego (`dist/`) y de dónde sale. Nada se descarga en tiempo de ejecución: el juego funciona sin red.

## Código y librerías

| Pieza | Licencia | Uso |
|---|---|---|
| Phaser 4.2.1 | MIT | Motor del juego, empaquetado en `dist/assets/phaser-*.js` |
| Vite 8, TypeScript 5.9, Vitest 5, Playwright 1.63 | MIT / Apache-2.0 | Solo herramientas de desarrollo. No van en `dist/` |
| Pixelify Sans | SIL Open Font License 1.1 (`public/assets/fonts/OFL.txt`) | Tipografía de todo el juego, subconjunto latino en `public/assets/fonts/` |
| Código propio (`src/`, `tools/`, `tests/`) | Propiedad de Rick, uso familiar | Simulación, IA, vistas, audio, herramientas |

## Arte

| Pieza | Origen | Notas |
|---|---|---|
| Sophie, Alana, Papá, Mamá y Thor (hojas de sprites, trajes, retratos) | Generados con Higgsfield `xai/grok-imagine-image-2.0` a partir de las fotos de pasaporte de la familia y la referencia de Thor. Procesados con `tools/build_sprites.py` (segmentación, escala, paleta, contorno) | Las fotos **no están en Git**. Solo salen los dibujos. Cada generación consta en [GENERATIONS.md](GENERATIONS.md) |
| Ilustración de título (`public/assets/ui/title.png`) | Higgsfield, mismo modelo, a partir de la alineación familiar y los recortes limpios de los personajes. `tools/gen_title.py` y `tools/build_title.py` | Los dibujos de la familia en estilo del juego |
| Props de escenario (árboles, casas, banderines, piñata, nube, hongo, agua) | Higgsfield, mismo modelo. Procesados con `tools/build_props.py` | Atlas en `public/assets/props/` |
| Tiles de 16 px (pasto, camino, agua, puente, plaza, arena) | Dibujados por código en `tools/build_tiles.py` | Sin IA. Paleta maestra de `ART_BIBLE.md` |
| Cielo, nubes, colinas, bloques, troncos, iconos, partículas | Dibujados por código (`src/view/Procedural.ts`, `Backdrop.ts`, `src/ui/icons.ts`) | Sin archivos de imagen |
| Mapas | Generados por `tools/build_maps.py` como `.tmx` y exportados con Tiled 1.8.2 | Editables en Tiled |
| Archivos de trabajo `.kra` | Armados por `tools/make_kra.py` y convertidos con Krita 5.2.2 | En `art-src/krita/` |

Higgsfield entrega las imágenes generadas para uso del titular de la cuenta. Este juego es de uso familiar y local. Si algún día se publica, hay que releer las condiciones de Higgsfield y del modelo
en ese momento.

## Audio

Todo el sonido se **sintetiza en el navegador** con Web Audio, sin muestras ni archivos:

- 44 efectos definidos como recetas de osciladores y ruido en `src/audio/sfx.ts`.
- 7 canciones compuestas para este juego, escritas como datos en `src/audio/songs.ts`.

No se copió ninguna melodía, muestra ni librería de sonido. (El plan hablaba de ZzFX. Al final se escribió un sintetizador propio más pequeño, así que no hay código de ZzFX en el proyecto.)

## Inspiración

El juego se inspira en el espíritu de *Downtown Nekketsu Koushinkyoku: Soreyuke Daiundoukai* (Technos, 1990): pruebas deportivas cortas, ruta con obstáculos y rivales que empujan.
No usa sus gráficos, mapas, música, nombres ni personajes. Los nombres, el mundo, las reglas y todo el arte son originales.
