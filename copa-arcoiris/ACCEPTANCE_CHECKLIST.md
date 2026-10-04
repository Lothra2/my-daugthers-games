# Criterios de aceptación · Primera entrega

Cada línea tiene su evidencia: nombre del test, captura en `docs/qa/` o comando. **[x]** significa que se ejecutó aquí y pasó. **[~]** es parcial y dice qué falta.
**[ ]** es PENDIENTE y dice por qué. Nada se marca como probado en un dispositivo que no estuvo disponible.

Último recorrido completo: 2026-10-04. `npx vitest run` (9 archivos, 127 pruebas) y `npm run e2e` (6 suites, 0 errores de consola) más 3 copas completas en navegador.

## A. Entrega
- [x] `npm ci && npm run build` funciona desde cero y `dist/` arranca con `npm run preview` en http://localhost:4173 (verificado en un clon limpio de la rama: `npm ci` instala 45 paquetes, el build sale idéntico al `dist/` commiteado y el preview responde 200)
- [x] Sin red y sin claves: no hay ninguna llamada a Higgsfield en `src/` ni en `dist/` (`grep -ril higgsfield src dist` vacío). Las suites e2e fallan ante cualquier `requestfailed` o respuesta ≥ 400 y pasan con 0
- [x] La clave de Higgsfield no está en ningún archivo ni en el historial (`git grep` de su id sobre `git rev-list --all` vacío). `art-src/generations.jsonl` guarda las fotos como `<private-reference-photo>`
- [x] Las fotos de la familia no están en Git (`git ls-files | grep -iE "photo|private|passport"` vacío, `reference/private/` en `.gitignore`)
- [x] README con cómo jugar, comandos, controles, estructura y acceso local
- [x] `docs/LICENSES.md` y `docs/GENERATIONS.md` completos (52 imágenes generadas, 75,52 de 200 créditos gastados según el registro)
- [~] Mapas `.tmx` en `maps-src/` y `.kra` en `art-src/krita/` (5 personajes + props, hechos con Krita 5.2.2 real). **No hay `.ase`**: LibreSprite no se pudo instalar (GitHub 403)
- [x] Ninguna figura de prueba visible en la build (todas las capturas de `docs/qa/shots/` son de la build final)

## B. Reglas (pruebas unitarias o simulación sin cabeza, sobre `src/core`)
- [x] Diagonal = misma rapidez de suelo que el recto y profundidad al 65 %: `movement.test.ts`
- [x] Altura y tiempo de salto de cada personaje: `movement.test.ts` ("altura y tiempo de salto…")
- [x] Alturas obligatorias ≤ 22 px y Thor las supera: `movement.test.ts`, `maps.test.ts`
- [x] Agua: nado, brazada, salida y Alana ×1,35: `rules.test.ts`
- [x] Hueco → burbuja de rescate ≤ 1,7 s, protección 1,5 s (Mamá 2,5 s) y punto fuera del hueco: `rules.test.ts`
- [x] Empujón falla si |dy| > 10, acierta en rango, 3 empujones en 2 s dan voltereta: `rules.test.ts`
- [x] Pelota voltea, Papá lanza más lejos, el protegido no se voltea: `rules.test.ts`
- [x] Cada poder produce su efecto (dash que cruza 44 px, burbuja inmune, carga que rompe obstáculos, 3 estrellas que persiguen, carrera ×1,5): `rules.test.ts`
- [x] Puntos 10/7/5/3, empates compartidos, desempate de la copa y Trofeo Corazón: `progress.test.ts`
- [x] Burbujazo +1 a quien empujó, caer solo da 0, nunca negativo: `events.sim.test.ts` (arena)
- [x] Circuito: puntos de salida suman 40 en 10 semillas, 4 salas, nadie atascado: `events.sim.test.ts`
- [x] Piñata: se rompe sola antes de los 112 s y se reparten estrellas, 10 semillas: `events.sim.test.ts`
- [x] Carrera: 20 semillas, todos llegan por su cuenta, 30 a 150 s, sin atascos: `race.sim.test.ts`
- [x] XP y niveles (0/60/150/280/450), desbloqueos y medallas: `progress.test.ts`
- [x] Guardado: ida y vuelta, migración, JSON corrupto con copia, storage bloqueado → memoria: `progress.test.ts` y `input.mjs`
- [x] Validador de mapas: 5 mapas pasan y 4 mapas malos fallan (pared de 30 px, hueco de 60 px, salida en un sólido, falta de meta): `maps.test.ts`
- [~] **50 copas completas con 4 IA** (semillas 1 a 50): `cups.sim.test.ts`. Todas terminan y ninguna IA se queda atascada más de 8 s. Dos bugs reales de la IA salieron de esta prueba y están corregidos (docs/DECISIONS.md). **La duración sale más corta que la del plan**: unos 8 a 9 minutos con pantallas (solo juego: 4 a 5), no 9 a 15

## C. Juego real (E2E en Chromium headless y revisión visual de capturas)
- [x] Arranque sin errores de consola ni 404: `smoke.mjs`
- [x] Copa completa en 1P con Sophie, Alana, Papá, Mamá y Thor (los 5 elegidos como humano, la IA juega por ellos): `cup.mjs`, capturas `cup_1p_<personaje>_*.png`
- [x] 2P: copa completa con Sophie+Alana y con Thor+Mamá: `cup.mjs 2 …`, capturas `cup_2p_*`
- [x] Captura de cada prueba con personajes legibles: `docs/qa/shots/ev_*`, `m7_race_*`, `hitbox_*`
- [x] Video de gameplay de 34 s (carrera, circuito, piñata, arena) en `docs/qa/gameplay.mp4`. **Sin sonido** (Playwright graba solo pantalla)
- [x] Hitboxes revisadas con `?hitboxes` en las 4 pruebas: `docs/qa/shots/hitbox_*.png`
- [x] Indicadores fuera de pantalla: visible en `docs/qa/shots/m7_race_60.png` (flecha de Papá a la izquierda)
- [x] Resultados por prueba y copa final muestran puntos, trofeos (incluido Corazón), XP y desbloqueos: `cup_*_result_*.png`, `cup_*_final.png`
- [x] "Otra copa" reinicia limpio: `cup.mjs … 2` juega dos copas seguidas y comprueba resultados = 0, pruebas = 0 y sin pantalla de la copa anterior ("CLEAN")
- [x] Calentamiento paso a paso con teclado real: `warmup.mjs` (un bot sin atajos lo completa en 4 pasos y queda marcado en el guardado). El salto de la prueba tras la primera vez no tiene test propio
- [x] Ajustes que se guardan, récords, vestuario, pausa (seguir, repetir, salir): `ui.mjs`

## D. Controles y robustez
- [x] Teclado 1P y 2P (KeyboardEvent.code): `input.mjs`, `warmup.mjs`
- [x] Multitouch 1P (joystick y salto a la vez) y 2P (4 dedos a la vez, J1 derecha y J2 izquierda): `input.mjs` con eventos táctiles CDP
- [~] Un dedo que cruza la línea central en 2P sigue siendo de su jugador: los dedos están atados a su `pointerId` por diseño (`touch.ts`), pero **no hay un test que arrastre un dedo cruzando la línea**
- [x] Mando **simulado** (`window.__mockPads`): mover, saltar, desconectar → pausa con aviso. **Mando físico: PENDIENTE** (no había uno)
- [x] Pausa por cambio de pestaña y foco, sin teclas pegadas: `input.mjs`
- [~] Pausa por orientación vertical: implementada (`app.ts`), cubierta solo por la prueba de cambio de tamaño, no por una prueba propia de rotación
- [x] Tamaños 1920×1080, 1024×768@2, 844×390@3, 2048×1536@2 y 1280×720: escala entera en píxeles de dispositivo y sin scroll horizontal, `input.mjs` y `views.mjs`, capturas `size_*.png`
- [x] El audio no suena antes del primer gesto, y música, efectos y silencio se ajustan y se guardan: `audio.mjs`, `ui.mjs`

## E. Arte (revisión visual en `docs/qa/identity.md`)
- [x] Comparación 32/48 hecha y resolución documentada (`docs/art/res_compare.png`, ART_BIBLE §9)
- [ ] **Rick no ha dicho si aprueba la alineación familiar ni los personajes.** Es lo primero que hay que mirar
- [x] Rasgos de cada personaje presentes en retratos y sprites (ver `identity.md`). El parecido real con las personas **no lo puede juzgar el modelo**
- [x] Todos sonríen en idle, run y retratos (`docs/qa/portraits.png`). El retrato "tres cuartos" de Papá es una media sonrisa
- [~] Chequeos de sprites: pivote, fila de pies y escala única por personaje se aplican en `build_sprites.py` y se ven en `docs/qa/sprites/`. No hay un `check_sprites.py` automático de deriva y continuidad del ciclo
- [x] Thor usa animaciones de perro en todos los estados (`docs/qa/sprites/thor.png`)
- [x] Todo dibujado a 1:1 en la cuadrícula lógica, sin blur (`pixelArt`, `roundPixels`, escala entera)
- [x] Agua animada (animación nativa de tiles), banderines y zonas reconocibles en la carrera (`m7_race_*.png`)

## F. Pendiente declarado al cierre
Lo que **no** se pudo probar o se recortó, y por qué:

1. **Ningún humano ha jugado ni mirado el juego todavía.** Todo se probó con bots y capturas. Falta saber si es divertido y si Sophie y Alana lo entienden. Es la prueba que más importa.
2. **El audio no se ha escuchado.** `audio.mjs` mide que cada canción y cada efecto produzcan señal (nivel RMS), que el silencio, el volumen y la pausa funcionen, y que nada suene antes del primer gesto. No mide si suena bien, ni si el volumen relativo está bien.
3. **Sin mando físico, tablet ni iPad.** El mando se probó simulado. El táctil, con eventos táctiles de Chromium en un viewport del tamaño de un teléfono. Safari de iOS no se probó.
4. **Parecido de los personajes:** pendiente del ojo de Rick (E).
5. **Duración de la copa:** 8 a 9 minutos con pantallas, bajo los 10 a 15 del plan. Opciones en docs/DECISIONS.md.
6. **No hay `.ase`** (LibreSprite no disponible) ni `check_sprites.py` automático.
7. **Prueba táctil de cruzar la línea central en 2P y prueba de rotación vertical:** implementadas, sin test propio.
8. **Rendimiento en un equipo real** no medido: las pruebas usan render por software (SwiftShader), más lento que una tablet normal.
9. **Cambios de la IA hechos en esta última pasada** (re-planeo de rutas y detección de atascos nadando) se validaron con las 50 copas simuladas, las suites e2e y 3 copas en navegador. No hubo tiempo de mirar a ojo cómo se siente una carrera completa con ellos.
10. Quedan 124,48 créditos de Higgsfield de los 200. Ideas para gastarlos: ilustración de título, fondos pintados, más trajes.
