# Revisión de identidad de los personajes

Fecha: 2026-10-04. Revisión hecha por el modelo mirando las capturas y hojas de contacto de `docs/qa/` y comparándolas con las fotos de referencia y las decisiones de Rick.
**Esto es una revisión técnica, no la aprobación de Rick.** Que se parezcan a ustedes de verdad solo lo puede decir Rick. Si algún personaje no gusta, se regenera con `python3 tools/gen_masters.py <personaje>` y se reprocesa con `tools/build_sprites.py` (hace falta una clave de Higgsfield y las fotos en `reference/private/`, que no están en Git). Quedan 124,48 créditos del tope de 200.

Fuentes: `docs/qa/portraits.png`, `docs/qa/sprites/<personaje>.png`, `docs/qa/outfits.png`, `docs/art/res_compare.png`, capturas de `docs/qa/shots/`.

| Personaje | Rasgo clave pedido | Resultado en el juego | Sonríe |
|---|---|---|---|
| Sophie | pelo largo y liso, cintillo verde, camiseta verde | Se ve en todos los retratos y en los sprites. El cintillo se lee incluso a 48 px | Sí en idle, run y los 4 retratos |
| Alana | melena con dos ganchos, uno rosado y otro morado, camiseta rosada | Los dos ganchos se distinguen en el retrato. En el sprite pequeño se ven como dos puntos de color | Sí |
| Papá | barba canosa, pelo corto oscuro, camiseta roja | Barba y cejas bien marcadas. La barba canosa se ve más oscura que gris en el sprite pequeño | Sí. El retrato "tres cuartos" es más una media sonrisa |
| Mamá | pelo largo ondulado, ropa morada | Ondas visibles en retrato y sprite | Sí |
| Thor | boxer con máscara negra, pecho blanco, collar celeste | Se reconoce como boxer. Cola corta. El anfitrión lleva gorra celeste y silbato plateado | Sí, con la lengua afuera en el retrato "ganador" |

## Cosas que se revisaron y se arreglaron durante la producción
- La alineación familiar contaminó las maestras de Alana y Papá (cintillo verde en Alana, una niña dentro de la hoja de Papá). Las hojas de animación usan solo recortes limpios (`ref_<personaje>.png`).
- Hojas con 9 o 10 poses en lugar de 8 se regeneraron con la lista de cuadros enumerada (6 hojas).
- La altura de cada personaje usa una sola escala, así que las poses de correr no cambian de tamaño entre hojas.

## Qué no se verificó
- Parecido real con las personas. Las fotos de pasaporte son serias y se pidió hacerlas más felices, y el estilo es de dibujo animado, no un retrato fiel.
- Cada animación en movimiento por un ojo humano. Se revisaron hojas de contacto y capturas, más un video de 34 s (`docs/qa/gameplay.mp4`).
- Pierna y brazos de Thor en `swim_paddle` y `headpush`: se ven bien en la hoja pero no hay un caso de prueba que fuerce esas poses en pantalla más que el nado y el empujón del juego normal.
