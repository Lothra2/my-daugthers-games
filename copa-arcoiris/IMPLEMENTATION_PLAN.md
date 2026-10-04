# Plan de implementación · Fase Sonnet

Regla de oro: **hay un circuito jugable con figuras de prueba antes de gastar fuerte en arte.** El arte entra por capas sobre un juego que ya funciona.
Cada hito termina con una verificación concreta y un commit. Ningún hito se marca "hecho" porque exista un archivo: se marca cuando pasa su verificación.

## Estimación honesta de tiempo

Son unas **15 a 17 horas de trabajo del agente** para todo el alcance, incluidos 2 jugadores locales. Es posible que no termine el mismo día.
Las primeras 6 horas dejan una copa de 4 pruebas jugable con figuras simples y el resto es arte, audio y pulido.
Si se acorta el tiempo, se aplica el **orden de recorte** del final. Nunca se recortan los 5 personajes, las 4 pruebas, los controles ni los resultados.

## Hitos

| # | Hito | Horas | Verificación (gate) |
|---|---|---|---|
| **M0** | Preparación | 0,5 | `bash tools/setup.sh` OK. Proyecto Vite + TS + Phaser con versiones exactas. `npm run dev` muestra un canvas con escala entera. `npm test` corre un test. `npm run build` crea `dist/`. Smoke de Playwright sin errores de consola. Se prueba `krita --export` headless y se anota el resultado en `docs/DECISIONS.md` |
| **M1** | Núcleo de simulación | 2,5 | Pasan las pruebas unitarias de movimiento, salto, agua, plataformas, huecos y rescate, empujón, pelota, voltereta, protección, barra de poder y los 5 poderes. Los valores son los de GAME_DESIGN §5–6 |
| **M2** | Identidad visual (en paralelo a M1 y M3) | 1,0 | `lineup_family` y las 5 maestras generadas. `docs/art/res_compare.png` creada con la resolución confirmada en ART_BIBLE §9. Se le **envía la alineación a Rick** (SendUserFile) y **se sigue con el código sin esperar**. Las hojas de animación salen cuando Rick aprueba o, si no responde, 30 min después de enviarla, anotándolo |
| **M3** | Carrera del Bosque jugable | 2,0 | `race.tmx` generado, exportado y validado. 1P con 3 IA y figuras de prueba (cápsulas del color de identidad con sombra) recorre las 5 zonas, nada, usa arcos, llega a la meta y muestra el podio. La simulación sin cabeza con 4 IA termina en menos de 4:00 con 20 semillas |
| **M4** | Entrada completa | 1,0 | Táctil 1P y 2P con multitouch probado por CDP (4 puntos a la vez). Teclado 1P y 2P. Mando simulado. Pausa por blur, visibilidad y desconexión. Cambio de tamaño con escala entera en la matriz de viewports |
| **M5** | Circuito, Piñata y Arena | 3,0 | Cada prueba se juega de principio a fin en 1P y 2P con figuras de prueba. Reglas y puntuación según GAME_DESIGN §7. La simulación sin cabeza termina las 3 con 20 semillas. Thor (IA) completa cada una |
| **M6** | Copa, calentamiento, menús, progresión y guardado | 1,5 | Flujo completo menú → selección (1P y 2P) → calentamiento → 4 pruebas → copa final → otra copa. XP, niveles, trajes, medallas y récords guardados. Guardado corrupto y storage bloqueado manejados. **Primer hito "copa jugable completa"** |
| **M7** | Producción de arte e integración | 3,0 | Las hojas P0 procesadas pasan `check_sprites.py`, tienen hoja de contacto revisada y `docs/qa/identity.md` marcado. Tiles, props y fondos integrados en los 5 mapas. **No queda ninguna figura de prueba visible** |
| **M8** | Audio | 1,0 | 7 músicas y todos los efectos de la lista. Volúmenes y silencio funcionan y se guardan. El audio arranca tras el primer gesto. Cada sonido se puede oír en `?sounds` |
| **M9** | QA y entrega | 1,5 | ACCEPTANCE_CHECKLIST completo. Capturas por evento y video. `npm run build` y `npm run preview` OK. README, LICENSES, GENERATIONS y DECISIONS al día. `dist/` commiteado. Push a la rama |

## Paralelismo recomendado

- La generación de Higgsfield (M2 y M7) es lenta en reloj pero barata en atención. Se lanzan los lotes en segundo plano
  (`run_in_background`) y se programa mientras tanto. **Nunca se reenvía un trabajo por timeout**: se usa `tools/hf.py resume <id>`.
- Orden de lotes de arte: (1) alineación y maestras, (2) hojas `run`, `walk_idle` y `jump_pickup` de los 5, (3) el resto de hojas P0, (4) tiles y props P0,
  (5) fondos `lejos`, (6) P1. Se verifica el primer personaje completo (Sophie) en el juego **antes** de generar las 40 hojas,
  para ajustar el prompt una sola vez.

## Dependencias

```
M0 → M1 → M3 → M5 → M6 → M9
M0 → M2 → (aprobación o 30 min) → M7 → M9
M1 → M4 (en paralelo con M3)
M6 → M8
```

## Orden de recorte si falta tiempo (de arriba hacia abajo)

1. `props_audience`, `bg_*_medio`, `fx_sheet_b` (P2 y P1 decorativos). Las partículas por código los cubren.
2. Traje "Estrellas" (queda solo "Arcoíris") y celebración dorada.
3. Música propia de Circuito, Piñata y Arena (se usa la de Carrera con otro tempo y transposición).
4. Retratos alternativos (se queda solo `portrait_happy`, y "¡gané!" usa un frame de celebración).
5. `ui_title_scene` (el título usa la alineación pixelada con los fondos).
6. Ruta difícil en la sala 4 del Circuito.

Nunca se recortan: 5 personajes con todas sus animaciones P0, 4 pruebas, 1P y 2P, táctil, teclado y mando, resultados de prueba y copa, guardado, calentamiento ni audio básico.
Todo recorte se anota en `docs/DECISIONS.md` con el motivo.

## Primer personaje de referencia

Sophie va primero en todo el pipeline (maestra → `run` → integrada en la carrera). Se mira en el juego a escala real ×3 o ×4 junto a una figura de prueba.
Si la cara o el pelo no se leen, se corrige el prompt o el post-proceso **antes** de producir a los demás. Es la mejor forma de no gastar 40 hojas en un error.
