# Criterios de aceptación · Primera entrega

Cada línea se marca con evidencia: nombre del test, captura en `docs/qa/` o nota de prueba manual con fecha.
**"Probado"** significa que se ejecutó aquí. Lo que no se pudo probar se marca **PENDIENTE** con el motivo
(por ejemplo, un mando físico o un iPad real). Nunca se marca algo como probado en un dispositivo que no estuvo disponible.

## A. Entrega
- [ ] `npm ci && npm run build` funciona desde cero y `dist/` arranca con `npm run preview` en http://localhost:4173
- [ ] El juego funciona sin red tras cargar y sin claves (no hay ninguna llamada a Higgsfield en `src/` ni en `dist/`, verificado con grep)
- [ ] La clave de Higgsfield no aparece en ningún archivo del repo ni en el historial de Git (grep del id de la clave)
- [ ] Las fotos de la familia no están en Git (`git ls-files | grep -i photo` vacío)
- [ ] README con cómo jugar, comandos, controles, estructura y acceso local
- [ ] `docs/LICENSES.md` (Phaser MIT, ZzFX MIT, Pixelify Sans OFL y assets generados con Higgsfield) y `docs/GENERATIONS.md` completos
- [ ] Mapas `.tmx` editables en `maps-src/`, `.kra` en `art-src/krita/` (si Krita headless funcionó) y `.ase` en `art-src/ase/`
- [ ] Ninguna figura de prueba visible en la build final

## B. Reglas (pruebas unitarias o simulación sin cabeza, sobre `src/core`)
- [ ] El movimiento diagonal tiene la misma rapidez de suelo que el recto, tras normalizar y aplicar el factor de profundidad
- [ ] La altura máxima del salto y el tiempo en el aire de cada personaje coinciden con GAME_DESIGN §5–6 (±1 px, ±1 frame)
- [ ] Todas las alturas obligatorias de los 5 mapas miden ≤ 22 px y **Thor** las supera (validación de mapas)
- [ ] Entrar al agua cambia a nado, saltar en el agua es brazada y salir por la orilla vuelve a tierra. Alana nada ×1,35
- [ ] Caer en un hueco lleva a la burbuja de rescate en el último punto seguro con ≤ 1,7 s de penalización y 1,5 s de protección (Mamá 2,5)
- [ ] El empujón falla si |dy| > 10 aunque dx esté en rango. Acierta dentro de rango. 3 empujones en 2 s hacen voltereta
- [ ] La pelota voltea al objetivo. Papá lanza más lejos. Un actor protegido no se voltea
- [ ] Cada poder produce su efecto observable (dash con cruce de agua, burbuja inmune, carga que rompe una caja, 3 estrellas que persiguen, carrera loca ×1,5)
- [ ] Puntos de prueba 10/7/5/3, desempate de la copa y empates compartidos en la Arena
- [ ] Burbujazo: +1 a quien empujó dentro de 3 s. Caer solo da 0. Nunca hay puntos negativos
- [ ] Circuito: puntos por orden de salida de cada sala más la estrella de la ruta difícil. La sala cierra a los 15 s
- [ ] Piñata: gana quien tiene más estrellas. Se rompe sola a los 100 s
- [ ] Carrera: los que faltan llegan en burbuja 40 s después del primero, en orden de progreso
- [ ] XP y niveles según GAME_DESIGN §11. Los desbloqueos aparecen en el nivel correcto
- [ ] Guardado: ida y vuelta, migración desde una versión anterior simulada, JSON corrupto con backup y storage que lanza excepción → modo memoria
- [ ] 50 copas simuladas con 4 IA (semillas 1..50): todas terminan, ningún actor queda atascado más de 6 s sin rescate y la duración simulada queda entre 9 y 15 min

## C. Juego real (E2E en Chromium headless y revisión visual de capturas)
- [ ] Arranque sin errores de consola ni recursos 404
- [ ] Los 5 personajes se pueden elegir en 1P y la copa completa termina con cada uno (`autoplay&ff`)
- [ ] 2P: dos personajes distintos y la copa completa termina. La cámara encuadra a los dos y el rezagado vuelve en burbuja de arrastre
- [ ] Cada prueba tiene captura en `docs/qa/shots/` con los personajes legibles y nada tapado por el primer plano
- [ ] Un video de gameplay de ~30 s en `docs/qa/gameplay.mp4`
- [ ] Hitboxes revisadas con `?hitboxes` en las 4 pruebas (captura)
- [ ] Indicadores fuera de pantalla visibles para la IA fuera de cuadro
- [ ] El podio de cada prueba y la copa final muestran puntos, trofeos (incluido el Trofeo Corazón), XP y desbloqueos
- [ ] "Otra copa" reinicia limpio (sin restos de la anterior: test de reinicio de la escena dos veces seguidas)
- [ ] El calentamiento se completa paso a paso y se puede saltar después de la primera vez

## D. Controles y robustez
- [ ] Teclado 1P y 2P (KeyboardEvent.code) probado en E2E
- [ ] Multitouch: en 1P, joystick y botón de salto a la vez. En 2P, 4 toques simultáneos repartidos sin interferencia (CDP `Input.dispatchTouchEvent`)
- [ ] Un dedo que cruza la línea central en 2P sigue siendo de su jugador
- [ ] Mando: **simulado** en E2E (`mockpad`). Mando físico: PENDIENTE salvo que haya uno disponible
- [ ] Desconectar el mando pausa con mensaje
- [ ] Pausa por `blur`, `visibilitychange` y orientación vertical. Al volver no queda ninguna tecla pegada
- [ ] Cambio de tamaño con escala entera y sin vibración en 1920×1080, 1024×768, 844×390 y 2048×1536 con dpr 2 (capturas)
- [ ] El audio no suena antes del primer gesto. Música, efectos y silencio se ajustan y se guardan

## E. Arte (revisión visual documentada en `docs/qa/identity.md`)
- [ ] Comparación 32/48 hecha y resolución documentada en ART_BIBLE §9
- [ ] Rick aprobó la alineación familiar (o se anotó que no respondió en 30 min)
- [ ] Cada personaje se reconoce: el pelo largo y liso de Sophie con cintillo verde, la melena de Alana con ganchos rosado y morado, la barba canosa de Papá, el pelo ondulado de Mamá y la máscara negra y el pecho blanco de Thor
- [ ] Todos sonríen en idle, run y retratos
- [ ] `check_sprites.py` pasa en todos los personajes: pivote, fila de pies, paleta, deriva ≤ 2 px y continuidad del ciclo
- [ ] Thor usa animaciones de perro en todos los estados (ninguna pose humana)
- [ ] Sin blur ni mezcla de resoluciones: todo dibujado a 1:1 en la cuadrícula lógica
- [ ] Agua animada, banderines y flores con movimiento moderado, y zonas reconocibles en la carrera

## F. Pendiente declarado al cierre
Lista explícita de lo que no se pudo probar o se recortó, con su motivo (por ejemplo: iPad real, mando físico, escucha humana del audio).
