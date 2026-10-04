# Estado del proyecto (para retomar en una sesión nueva)

Última actualización: 2026-10-04. Léelo primero. Después `README.md`, `ACCEPTANCE_CHECKLIST.md` (sección F) y `docs/DECISIONS.md`.

## Qué es
**La Copa del Bosque Arcoíris**, juego familiar de pixel art para Rick (Ricardo Gutierrez) y sus hijas Sophie (7) y Alana (5). Personajes: Sophie, Alana, Papá, Mamá y Thor (el perro, anfitrión). Cuatro pruebas (Carrera del Bosque, Circuito de Juegos, Piñata de Estrellas, Arena de Burbujas) más un Calentamiento. 1 o 2 jugadores, teclado, táctil o mando. Todo en español.

## Dónde está
- **Jugar:** https://lothra2.github.io/my-daugthers-games/copa-arcoiris/dist/ (GitHub Pages sirve `main`).
- **Código:** repo `Lothra2/my-daugthers-games`, carpeta `copa-arcoiris/`. `main` ya tiene todo (PR 1, 2 y 3 mezclados). Rama de trabajo: `claude/downtown-nekketsu-game-1nzc8v`.
- **Copia en Claude** (versión vieja, sin los arreglos): https://claude.ai/artifact/5FckAW1PLo2YJpRtXJ3LG4. Ya no se mantiene.
- **Reglas del repo:** nunca tocar `uni-salta/` ni el `index.html` de la raíz (otros juegos de Rick que Pages también sirve). Antes de cada mezcla a `main`, comprobar que el diff solo cambia `copa-arcoiris/`.

## Cómo se trabaja
```bash
cd copa-arcoiris && npm ci
npm test                 # 127 pruebas unitarias, incluye 50 copas completas simuladas
npm run build            # tsc + vite, escribe dist/ (dist/ SE COMMITEA: es lo que sirve Pages)
npm run preview          # http://localhost:4173
npm run e2e              # smoke, ui, warmup, input, audio, events (Chromium del entorno, no instalar nada)
npm run maps             # regenera los mapas Tiled (tools/build_maps.py + export con Tiled)
```
Para publicar un cambio: `npm run build`, commit con `dist/`, push a la rama, PR a `main`, mezclar, esperar 1 o 2 minutos y comprobar el link. Pages no se configura desde aquí: ya estaba activo para `main`.

## Qué se probó y qué no
Todo se probó con bots y capturas en Chromium. **Nadie ha jugado ni escuchado el juego en serio.** Sin mando físico. Safari de iPhone real no probado (Rick lo abrió y vio cosas raras que se arreglaron en lo posible). El audio se midió con instrumentos, no de oído. Detalle en `ACCEPTANCE_CHECKLIST.md`.

## Últimos cambios (ronda de Rick en tablet e iPhone)
Bordes vacíos en pantallas anchas rellenados, árboles redondos en las colinas, isla de la Arena alineada a la cuadrícula, botón de pausa táctil arreglado (lo tapaba la capa táctil), pantalla completa con pasos para iPhone, menús compactos en teléfonos acostados, ilustración de título con la familia.

## Pendiente, por orden de valor
1. Que Rick juegue con Sophie y Alana y reporte qué les cuesta o aburre. Arreglar solo eso.
2. Modo fácil para Alana (rivales más lentos, más protección, rescate más rápido). Hoy solo hay Tranquilo y Campeón.
3. Ajustar el sonido de oído (`/?sounds` en local o en la web de Pages).
4. Confirmar el iPhone con una captura de Rick.
5. Detalles menores conocidos: Alana en la ilustración de título lleva dos ganchos morados (debería ser uno rosado y uno morado). En teléfonos muy pequeños los botones de la portada tapan un poco los pies. La copa dura 8 a 9 minutos con pantallas, menos de los 10 a 15 pedidos.
6. No hacer: más pruebas, personajes nuevos, multijugador en línea.

## Presupuesto y arte
- Higgsfield (API `xai/grok-imagine-image-2.0`): **gastados 79,68 de 200 créditos, quedan 120,32**. Registro en `art-src/generations.jsonl` y `docs/GENERATIONS.md`. Se genera con `tools/hf.py` (tiene tope de gasto).
- **La clave de Higgsfield NO está en el repo** y vivía en el contenedor de la sesión original (`~/.config/higgsfield/key`). Rick dijo que la borraría. Para generar más hace falta que Rick dé una clave nueva.
- **Las fotos de pasaporte de la familia tampoco están en el repo** (`reference/private/` está ignorado). Regenerar un personaje desde las fotos necesita que Rick las vuelva a subir. Sin ellas se puede partir de `art-src/higgsfield/identity/` (alineación y recortes limpios).
- Lo que Rick tiene en Claude es poco (le quedaban unos 8 dólares). Sesiones nuevas y cortas salen más baratas que seguir esta, que es muy larga.

## Cómo le gusta trabajar a Rick
Español venezolano casual, directo, sin rodeos. Sin em dash, sin punto y coma, sin hedging. Es crítico: prefiere que se le discuta una idea antes de hacerla. Quiere cosas listas para usar y que se diga con honestidad qué se probó y qué no. No publicar nada nuevo en sitios externos sin que lo pida (aquí sí pidió publicar en GitHub Pages y no dañar `uni-salta/`).
