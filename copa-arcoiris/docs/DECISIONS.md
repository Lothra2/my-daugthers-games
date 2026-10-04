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
