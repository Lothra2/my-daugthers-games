# La Copa del Bosque Arcoíris · Diseño de juego

Versión 1.0 · 2026-10-04 · Fase Opus. Las decisiones marcadas como **[Rick]** las tomó Rick en el chat y no se reabren.

## 1. Visión en una frase

Una familia (Sophie, Alana, Papá, Mamá y Thor) compite con cariño en un festival deportivo dentro de un bosque mágico.
Son cuatro pruebas cortas que se juegan con el mismo control, empujones de broma, pelotas blandas y poderes de colores.
Thor presenta la copa con gorra y silbato.

Pilares, en orden de prioridad:
1. **Reconocer a la familia.** Cada personaje se identifica de lejos por su silueta, su pelo y su color.
2. **Caer da risa, no castiga.** Nadie queda eliminado y en 2 segundos se vuelve a jugar.
3. **Un solo control para todo.** Moverse, Saltar, Acción y Poder sirven en las cuatro pruebas.
4. **Siempre se termina con un premio.** Hay puntos, XP y trofeo para todos, también para el cuarto lugar.

## 2. Qué tomamos del original y qué cambia

Fuente: Wikipedia japonesa de *ダウンタウン熱血行進曲 それゆけ大運動会* (Technōs, Famicom, 12-10-1990), revisada el 2026-10-04.
En el NES compiten 4 equipos (Nekketsu, Hanazono, Reihō y la Unión de escuelas) y hay **4 eventos**:

| Original (NES) | Cómo funciona allá | Nuestra adaptación |
|---|---|---|
| 夢見町クロスカントリー, cross country por la ciudad | Calles, casas ajenas, jardines, techos y alcantarillas donde se nada. Da puntos por el orden de paso en cada checkpoint y más en la meta. Caer a la alcantarilla elimina | **A. Carrera del Bosque**. Zonas, rutas que se separan y se juntan, río para nadar y arcos de recuperación. Caer al agua honda o a un hueco **nunca elimina**: una burbuja te devuelve al último arco |
| 障害部屋競争, salas de obstáculos | Varias salas de **una sola pantalla**, cada una con trampas distintas. Da puntos por el orden de salida de cada sala | **B. Circuito de Juegos**. 4 salas de una pantalla con patrones visibles y una ruta fácil y otra difícil con estrella dorada. Puntos por orden de salida de cada sala |
| 棒の上の玉割り, romper la kusudama en un poste | Dos rivales trepan postes y se golpean para ser el primero en romper una bola de papel | **C. Piñata de Estrellas**. Piñata colgante que se balancea, con acceso por hongos, cajas y nube. Cada golpe suelta estrellas y **gana quien junte más**, no quien da el último golpe |
| 勝ち抜き格闘大会, batalla real en un ring | El último que queda en pie gana y se usan técnicas especiales (必殺技) | **D. Arena de Burbujas**. Isla flotante con empujones, pelotas blandas y poderes. Caer al agua da un punto a quien te empujó y vuelves en burbuja. **No hay eliminación** |

También conservamos: vista lateral con profundidad del suelo (X, Y y Z), personajes cabezones, objetos que se recogen
y se lanzan, nado dentro del recorrido, técnicas distintas por personaje y puntos acumulados en un torneo.

Para no confundirlo con otros títulos: la "carrera de pan" y la "bomba" que aparecen en algunos resúmenes son de versiones
posteriores, no del NES de 1990. El dodgeball, el hockey y los RPG de calle son de otros juegos de Kunio-kun. No se usa
nada de eso. El tamaño exacto de los sprites del NES **no se midió** en una fuente fiable, así que la resolución de este juego
es una decisión propia (ver ART_BIBLE §2).

No copiamos gráficos, mapas, nombres de equipos ni música.

## 3. Modos y estructura

- **Jugadores [Rick]**: 1 jugadora o **2 jugadores locales en la misma pantalla**. Los rivales de IA completan 4 participantes.
- **Rivales [Rick]**: la propia familia. Los personajes que no eligió nadie se convierten en rivales. Con 1 jugadora hay 3 rivales
  (elegidos al azar entre los 4 que quedan y rotando en cada copa). Con 2 jugadores hay 2 rivales.
- **Dificultad**: *Tranquilo* (predeterminada) y *Campeón*. Se cambia en Ajustes.

### Flujo

```
Arranque → "Toca para empezar" (activa el audio)
→ Menú: [Jugar la Copa] [Calentamiento] [Récords] [Vestuario] [Ajustes]
→ ¿Cuántos juegan? [1] [2]
→ Elegir personaje (J1 y luego J2, retratos grandes con aro de color)
→ Calentamiento (obligatorio la primera vez, después se puede saltar)
→ Por cada prueba: tarjeta de Thor (1 frase + íconos de control) → 3, 2, 1, ¡Ya! → prueba → podio de la prueba
→ Copa final: podio total, trofeos, XP, subidas de nivel, desbloqueos y récords
→ [Otra copa] [Menú]
```

### Duración objetivo: unos 12 minutos

| Tramo | Minutos |
|---|---|
| Elegir personaje y calentamiento (primera vez) | 1,5 |
| A. Carrera del Bosque | 3,0 |
| B. Circuito de Juegos | 2,5 |
| C. Piñata de Estrellas | 1,7 |
| D. Arena de Burbujas | 1,8 |
| Tarjetas, podios y copa final | 1,5 |
| **Total** | **≈ 12** |

## 4. Controles [Rick: táctil y teclado con la misma prioridad, 2P en tablet compartida]

Cuatro verbos y pausa. **Ningún salto exige dos botones.**

| Verbo | Qué hace |
|---|---|
| **Mover** | 8 direcciones sobre el suelo. Mantener la dirección 0,3 s pasa de caminar a correr, sin doble toque |
| **Saltar** | Salto. En el agua es una brazada (impulso corto) |
| **Acción** | Contextual: si hay un objeto cerca lo recoge, si llevas algo lo lanza y si no hay nada empuja. En el aire, cerca de la piñata, da un golpe de juguete |
| **Poder** | Usa el poder cuando la barra está llena (el botón brilla) |
| **Pausa** | Botón arriba en el centro, Esc/P o Start |

### Táctil, 1 jugadora (horizontal)
- Mitad izquierda: **joystick flotante** que aparece donde se apoya el pulgar, con radio de 48 px CSS y zona muerta del 18%.
- Mitad derecha: **Saltar** (el más grande, 88 px CSS), **Acción** (72 px) y **Poder** (72 px, con anillo de carga) en arco.
- Cada dedo queda ligado a la zona donde tocó por primera vez (`pointerId`). Mover y saltar a la vez funciona.

### Táctil, 2 jugadores en la misma tablet
- La pantalla se divide en dos mitades verticales con una línea sutil. Cada mitad tiene su joystick a la izquierda y sus 3 botones a la derecha,
  con el mismo diseño que en 1P para que no haya que aprender otra cosa. Los botones son de 60 a 64 px CSS. Hay una opción de **Espejo** para J2 en Ajustes.
- Un toque que empieza en una mitad pertenece a ese jugador hasta que se levanta el dedo, aunque cruce la línea.
- Admite hasta 4 toques simultáneos (2 por jugador).

### Teclado (se usa `KeyboardEvent.code`, así funciona con teclado español o inglés)
| | Mover | Saltar | Acción | Poder | Pausa |
|---|---|---|---|---|---|
| 1 jugadora | WASD o flechas | Espacio o J | K | L | Esc o P |
| J1 en 2P | WASD | F | G | H | Esc |
| J2 en 2P | Flechas | `Comma` | `Period` | `Slash` | Esc |

### Mando (Gamepad API, mapeo estándar)
Stick izquierdo o cruceta para mover, A/Cruz para saltar, X/Cuadrado para acción, B/Círculo o Y/Triángulo para poder y Start para pausar.
El primer mando conectado es de J1 si J1 no está usando táctil. Si no, va a J2.

### Robustez
- Si la ventana pierde el foco, se cambia de pestaña o se gira a vertical, el juego **pausa** y suelta todas las teclas y toques.
- Si se desconecta un mando, pausa con el mensaje "Se desconectó el mando. Conéctalo o toca para seguir". Se puede reasignar a táctil o teclado.
- El audio arranca en el primer gesto ("Toca para empezar").

## 5. Movimiento 2.5D (valores para la simulación a 60 Hz)

Coordenadas del mundo: **x** es el avance, **y** la profundidad en el plano del suelo (en px) y **z** la altura sobre el suelo.
En pantalla: `sx = x − camX` y `sy = y − z − camY`. El orden de dibujo usa `y` de los pies. La sombra se dibuja en `(x, y)`.

| Parámetro | Valor base |
|---|---|
| Caminar | 56 px/s |
| Correr | 96 px/s, se alcanza tras mantener 0,30 s con aceleración de 400 px/s² |
| Factor de profundidad | velocidad en y = 0,65 de la horizontal, después de normalizar el vector |
| Salto | vz₀ = 230 px/s, gravedad 760 px/s², altura máxima ≈ 34,8 px, 0,6 s en el aire |
| Control en el aire | 60% de la aceleración en tierra |
| Escalón automático | 4 px |
| Nado | 50 px/s. Saltar da una brazada de +30 px/s por 0,3 s con 0,5 s de espera. z = 0 |
| Hongo saltarín | vz = 380 px/s, altura ≈ 95 px |

**Reglas de nivel para no bloquear a nadie:** las alturas obligatorias miden **≤ 22 px** (Thor llega a ~25).
Las rutas difíciles opcionales pueden pedir hasta 32 px. Todo lo más alto se alcanza con hongos.

### Terrenos (definidos en Tiled)
- **Suelo**: normal.
- **Agua**: nado. Se entra caminando y se sale por la orilla. Nadie se ahoga.
- **Hueco o agua honda fuera del recorrido**: animación de caída de 0,5 s y luego **burbuja de rescate** que te lleva al último punto seguro.
  La penalización total es de unos 1,6 s y luego hay 1,5 s de protección.
- **Plataforma**: caja con huella en el suelo y altura `alto`. Se para encima si aterrizas dentro de la huella con z ≥ alto − 2.
  Por los lados bloquea si z < alto − 4.
- **Rebote**: hongo saltarín.
- **Obstáculo móvil**: tronco, molino o plataforma móvil con patrón fijo y aviso visual de 0,8 s.

### Interacciones
| Interacción | Regla |
|---|---|
| **Empujón** (Acción sin objeto) | Anticipación de 0,08 s, golpe de 0,10 s y recuperación de 0,20 s. Alcance de 18 px con tolerancia de ±10 px en y y solapamiento en z. Empuja 36 px en 0,25 s y causa 0,35 s de tambaleo. 3 empujones recibidos en 2 s hacen voltereta. 0,5 s de espera |
| **Pelota blanda** | Se recoge con Acción si está a ≤ 16 px. Llevarla reduce la velocidad a ×0,85. Se lanza a 220 px/s con vz 120. Si da en el blanco causa **voltereta cómica**. Rebota una vez y queda en el piso |
| **Voltereta** | Caída de 0,35 s, en el piso con estrellitas 0,30 s y levantarse 0,30 s. Luego 1,0 s de protección con parpadeo |
| **Estrella** | +25 de poder y +1 XP. Se recoge con solo tocarla |
| **Caja de regalo** | Se rompe con una pelota, la carga de Papá o 2 empujones. Suelta una pelota o 2 estrellas |

## 6. Personajes [colores de Rick]

Todos comparten el movimiento base. Cada uno tiene un poder activo, una ventaja pasiva, un límite, un color y una celebración.

| | Sophie | Alana | Papá | Mamá | Thor |
|---|---|---|---|---|---|
| **Color de identidad** | **Verde** lima `#4FD65C` | **Rosado** `#FF6FB5` | **Rojo** `#E8423A` | **Morado** `#9B5DE5` | **Azul cielo** `#3FB6F2` (propuesto por Opus, Rick no le dio color) |
| **Personalidad** | Aventurera | Juguetona | Entusiasta | Elegante y decidida | Simpático y travieso |
| **Correr (px/s)** | 100 | 92 | 96 | 96 | 108 |
| **Tiempo hasta correr** | 0,30 s | 0,30 s | 0,45 s | 0,30 s | 0,25 s |
| **Salto ×** | 1,12 | 1,00 | 0,92 | 1,00 | 0,85 |
| **Nado ×** | 1,00 | **1,35** | 1,00 | 1,05 | 0,90 |
| **Lanzar ×** | 0,85 | 0,90 | **1,30** | 1,00 | 0,70 (con la cabeza) |
| **Empuje recibido ×** | 1,00 | 1,20 | **0,60** | 1,00 | 1,10 |
| **Carga del poder** | 12 s | 14 s | 13 s | 16 s | 13 s |
| **Poder** | **Impulso arcoíris**: dash de 1,0 s a 190 px/s, inmune a empujones, deja una estela. Cruza agua y huecos de hasta 48 px | **Burbuja protectora**: 4 s de inmunidad. En el agua nada ×1,6 y en el aire **flota hacia arriba** hasta z 70 | **Carga deportiva**: embestida de 0,6 s a 170 px/s. Rompe obstáculos ligeros y voltea a los rivales que toca | **Estrellas guía [Rick]**: 3 estrellas que persiguen a los 3 rivales más cercanos de adelante. Al tocarlos los hacen tropezar 0,6 s y soltar lo que llevan | **Carrera loca**: 2,5 s a ×1,5, ignora el terreno lento y recoge todo lo que pisa |
| **Ventaja pasiva** | Control en el aire del 100% | Nada más rápido y recoge al instante | Lanza más lejos y fuerte, casi no lo mueven | Se levanta un 40% más rápido y tiene 2,5 s de protección al volver | Recoge objetos al pasar y llevarlos no lo frena |
| **Límite** | Lanza y empuja más suave | Pequeña, la empujan más lejos | Arranca lento y salta menos | Su poder carga más lento | Salta poco, lanza corto y nada lento |
| **Celebración** | Voltereta lateral con destellos verdes | Sopla una burbuja gigante, la revienta y salta riendo | Pose de campeón y pulgares arriba | Giro elegante y beso que suelta estrellas | Persigue su cola y aúlla feliz |

### Poderes según la prueba (mismo botón, efecto con sentido en cada una)
- **Piñata**: el dash aéreo de Sophie golpea 2 veces. La burbuja de Alana la eleva a la piñata. La carga de Papá contra el **tronco del árbol** sacude la piñata y cuenta 2 golpes. Cada estrella de Mamá es 1 golpe. Thor rebota más alto en los hongos y atrae las estrellas cercanas.
- **Arena**: el poder carga ×1,5 más rápido.

### Thor anfitrión [Rick]
Thor presenta la copa en las tarjetas de cada prueba, hace sonar el silbato en la cuenta regresiva y entrega los trofeos en el podio.
Su versión de anfitrión lleva **gorra azul cielo y silbato**. Si alguien elige a Thor para competir, también aparece corriendo:
"¡Thor presenta y compite!". Ese chiste se dice una vez en la tarjeta inicial.

## 7. Las cuatro pruebas

### A. Carrera del Bosque (≈ 3 min)
Mapa de unos **3.400 × 270 px** (213 × 17 tiles de 16 px). La banda de suelo tiene 96 px de profundidad.

| Zona | Largo | Contenido |
|---|---|---|
| 1. Pradera de salida | 520 px | Salida con 4 carriles, 2 estrellas y una caja. Tutorial implícito |
| 2. Jardín de las casitas | 900 px | **Bifurcación**: *arriba* por cercas y techitos de setas (plataformas de 16 a 20 px, más rápida, 3 estrellas) o *abajo* por el jardín de flores (más larga y plana). Se juntan en la fuente |
| 3. Río Cristal | 760 px | **Tramo de natación** de 420 px con corriente suave. Hay un puente estrecho alternativo con troncos rodantes que tiene ritmo visible. Alana gana mucho aquí |
| 4. Colina de los Hongos | 700 px | Subida con **hongos saltarines**, cajas y pelotas. Un atajo por hongos tiene un hueco con rescate |
| 5. Plaza de la Meta | 520 px | Arco de meta, banderas y público de animalitos de decoración |

- **3 arcos de recuperación** (inicio del jardín, antes del río y al pie de la colina). Son puntos de respawn y avisan "¡Arco 2 de 3!".
- **Puntuación de la prueba**: orden de llegada.
- **Siempre se termina**: 40 s después de que cruza el primero, los que faltan suben a una **burbuja de meta** y llegan flotando en el orden de su progreso.
  Hay un tope de 4:00.
- **Rutas de IA**: polilíneas en Tiled con nodos de bifurcación (`ruta_arriba` o `ruta_abajo`, `puente` o `rio`).

### B. Circuito de Juegos (≈ 2,5 min)
Son 4 salas de **480 × 270** (una pantalla, como en el original). Se entra por la izquierda y se sale por la puerta de la derecha.

| Sala | Patrón visible | Ruta fácil | Ruta difícil (+1 estrella dorada) |
|---|---|---|---|
| 1. Troncos rodantes | 2 carriles de troncos, uno cada 2,0 s. Cada carril tiene su sombra-línea y un ícono de rumble 0,8 s antes | Esperar el hueco y cruzar | Cercas elevadas de 20 px por arriba de los troncos |
| 2. Arroyo de hongos | Arroyo de 120 px de ancho | Nadar, que es lento | Cadena de 3 hongos sobre el agua |
| 3. Plataformas columpio | Hueco con 2 plataformas que van y vienen cada 3 s | Puente largo que da la vuelta por la profundidad | Saltar entre las plataformas móviles |
| 4. Molino de burbujas | Aspas de espuma que barren el suelo, una vuelta cada 4 s | Pasar agachado en el hueco entre aspas | Fardos de heno de 20 y 32 px por encima de las aspas |

- Las aspas y los troncos causan **voltereta cómica**, nunca te sacan de la sala.
- **Puntos por sala**: 4, 3, 2 o 1 según el orden de salida, más la estrella dorada si tomaste la ruta difícil.
  El ranking de la prueba es la suma.
- **Cierre de sala**: cuando salen todos los humanos, o 15 s después de que sale el primero. A los que faltan los lleva una burbuja hasta la puerta.
- En cada sala hay 1 o 2 pelotas para molestar con cariño.

### C. Piñata de Estrellas (≈ 1,7 min)
Una pantalla. Es la plaza con el **Árbol Abuelo** al centro, del que cuelga una piñata con forma de estrella a z 60–90.
La piñata se mueve **±40 px cada 4 s**, de forma predecible.

- **Cómo se llega**: 2 hongos a los lados (z ≈ 95), cajas apiladas de 20 y 40 px y una nube que gira lento a z 50.
- **Cómo se golpea**: Acción en el aire cerca de ella (golpe de juguete, con churro de piscina), lanzándole una pelota (una canasta suelta una cada 6 s, máximo 3 en el piso) o con los poderes (§6).
- **Vida**: 36 golpes. Cada golpe suelta 1 o 2 estrellas, que caen rebotando. Con 24 y con 12 se agrieta y suelta 5 estrellas. Al romperse llueven 20.
- **Regla de victoria**: **gana quien junte más estrellas**. Si te voltean, sueltas 1 estrella (solo si tienes) y cualquiera la puede recoger.
- **Siempre se termina**: si no se rompió a los 100 s, Thor toca el silbato y la piñata se rompe sola. Después hay 6 s para recoger.

### D. Arena de Burbujas (≈ 1,8 min)
Una pantalla. La **isla flotante** es elíptica (320 × 90 px de suelo) en un estanque, con un hongo-parachoques al centro.

- **3 rondas de 30 s**, con 3 s de marcador entre una y otra. En la ronda 3 la isla se encoge un 15% (la orilla se hunde con animación).
- Si caes al agua: chapuzón, la burbuja te devuelve al centro en 1,5 s y tienes 1,5 s de protección.
- **Puntos**: "¡Burbujazo!" da **+1 a quien te empujó o golpeó** dentro de los 3 s previos. Caerse solo no le da puntos a nadie. **No hay puntos negativos.**
- Aparecen pelotas en el centro cada 5 s, con un máximo de 2.
- Los empates se comparten: los dos reciben el puesto más alto.

### Calentamiento (tutorial práctico, ≈ 75 s)
Es una plaza pequeña. Thor da una instrucción por paso, con el ícono del botón de cada dispositivo:
1. "¡Corre hasta la bandera!" 2. "¡Salta el tronco!" 3. "Recoge la pelota con Acción y ¡lánzala al blanco!"
4. "Junta estrellas para llenar tu poder y ¡úsalo!" 5. "¡Listo! ¡A la copa!".
Cada paso avanza al cumplirse, sin tiempo límite. En 2P los dos lo hacen al mismo tiempo.

## 8. Puntuación de la copa

- Puntos por prueba: **1º 10, 2º 7, 3º 5, 4º 3**. Nadie se queda con 0.
- El total decide el podio. Desempate: más pruebas ganadas y luego mejor puesto en la última prueba.
- Trofeos: Oro, Plata, Bronce y **Trofeo Corazón** para el 4º, con el mensaje "¡Gracias por jugar con tanto cariño!".
- Mensajes siempre positivos. Nunca se dice "perdiste". Se usan frases como "¡Qué carrera!", "¡Casi casi!", "¡La próxima es tuya!" o "¡Bien hecho!".

## 9. Rivales (IA)

Usan **la misma simulación y las mismas reglas** que el jugador. Producen el mismo `InputFrame` (mover, saltar, acción, poder).

| Perfil | Comportamiento |
|---|---|
| **Veloz** | Toma la ruta más corta, salta tarde y se arriesga |
| **Prudente** | Toma rutas seguras, espera patrones y casi nunca se cae |
| **Juguetón** | Recoge pelotas y empuja o lanza a quien tenga cerca, aunque eso lo frene |
| **Explorador** | Busca estrellas y rutas difíciles opcionales |

- Perfil por defecto según personaje: Thor Veloz, Mamá Prudente, Alana Juguetona, Sophie Exploradora y Papá Juguetón. En cada copa se puede rotar con la semilla.
- Reacción: Tranquilo 300–450 ms y Campeón 180–300 ms. Errores (saltar tarde, elegir mal): Tranquilo 12% y Campeón 5%.
- Poder: lo usan como máximo una vez por carga y con 1–3 s de demora tras llenarse.
- **Atascos**: si avanza menos de 8 px en 2 s, prueba saltar, luego cambiar de carril y luego retroceder 0,5 s. Si sigue atascado 6 s, la **burbuja de rescate** lo lleva al último punto seguro. Es visible, como la de los humanos.
- **Ajuste suave**: en *Tranquilo*, una IA que va más de 400 px delante del último humano corre ×0,92. Una que va más de 500 px detrás del humano líder corre ×1,04. No hay teletransporte ni ventajas ocultas mayores a eso.

## 10. Cámara y fuera de pantalla

- **Carrera, 1P**: sigue a la jugadora con 60 px de adelanto en la dirección de avance y suavizado crítico. La posición se redondea a píxel entero.
- **Carrera, 2P**: apunta al punto medio de los dos humanos y mantiene al líder a ≥ 100 px del borde derecho.
  Si el humano rezagado pasa 1,0 s fuera del borde izquierdo, una **burbuja de arrastre** lo deja en tierra firme a 60 px del borde, con 1,5 s de protección.
  Nunca se elimina a nadie por la cámara.
- **Salas y arenas**: la cámara es fija en la sala. Si la pantalla es más ancha que 480 se ve decoración a los lados.
- **Indicadores**: si alguien queda fuera de cuadro, aparece una flecha de su color en el borde con su mini retrato. La IA fuera de pantalla sigue simulándose igual.

## 11. Progresión (ligera y con efecto real)

- **XP por prueba**: 20 por participar, más el doble de los puntos del puesto (20, 14, 10 o 6), más 1 por estrella.
- **Niveles por personaje**: N2 con 60 XP, N3 con 150, N4 con 280 y N5 con 450. Una copa da entre 80 y 140 XP.

| Nivel | Desbloqueo |
|---|---|
| 2 | Traje **Arcoíris** (paleta alternativa del uniforme) |
| 3 | **Poder +**: el poder dura o alcanza un 15% más. Es la única mejora de stats y es pequeña |
| 4 | Traje **Estrellas** (segunda paleta) |
| 5 | **Celebración dorada**: corona y confeti dorado en el podio |

- **Medallas**: mejor puesto por prueba y por personaje (oro, plata o bronce).
- **Marcas personales**: mejor tiempo en la Carrera, más puntos en el Circuito, más estrellas en la Piñata, más burbujazos en la Arena y copas ganadas.
- **Vestuario**: muestra a cada personaje con sus trajes desbloqueados. Los bloqueados se ven en silueta con el nivel que piden.

## 12. Guardado

Se guarda en `localStorage`, en la clave `copa-arcoiris/save`, con el formato `{ version: 1, settings, characters, records, medals, stats }`.
- Hay migraciones por versión.
- Si el JSON está corrupto, se guarda una copia como `copa-arcoiris/save.bak-<fecha>` y se arranca limpio con un aviso amable.
- Si el almacenamiento está bloqueado (modo privado), se juega en memoria con el aviso "Tu progreso no se guardará en este navegador".
- Se guarda al terminar cada prueba y al cambiar ajustes.

## 13. Audio

Higgsfield **no tiene audio en el API** (verificado el 2026-10-04: `model_not_found`). Todo el audio es **código propio**:
efectos con ZzFX (MIT) y música con un secuenciador chiptune en Web Audio, con composiciones originales.

- Música: Menú (tranquila), Carrera (alegre, 150 bpm), Circuito (juguetona), Piñata (fiesta), Arena (enérgica), Fanfarria de podio y Copa final.
- Efectos: pasos (tierra y madera), salto, aterrizaje, chapuzón, brazada, recoger, lanzar, golpe blando, voltereta, burbuja (aparece y revienta), estrella, cada uno de los 5 poderes, silbato de Thor, 3-2-1-¡Ya!, ladrido feliz, arco, meta, botón de UI y subir de nivel.
- Ajustes: volumen de música, volumen de efectos y silencio total. Se guardan.

## 14. Fuera de alcance en esta entrega

Mundo abierto, multijugador online, tienda o economía, crafting, campaña, más de una copa, voces grabadas e inglés.
El código de textos queda preparado para i18n, pero solo hay español.
