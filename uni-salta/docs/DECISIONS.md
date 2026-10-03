# Decisiones y desviaciones del plan

Plan original: `uni-salta/PLAN.md` (revisión 2). Lo construido difiere así:

| Tema | Plan | Realidad | Por qué |
|---|---|---|---|
| Resolución base | 384x216, unicornio ≈ 48 px | **576x324, unicornio ≈ 80 px de alto** | El modelo dibuja ~88 px por sprite. Bajarlo a 48 px destruía la cara (ojitos, cachetes). Todo el plan escala ×1.67 |
| Animación del unicornio | AutoSprite de Higgsfield | **Hojas de poses con `grok-imagine-image-2.0`** (una llamada por animación, referencia = hoja maestra) | El API público no tiene AutoSprite. Los resultados salieron muy consistentes y limpiaron bien |
| Música y efectos | Higgsfield primero | **Código** (ZzFX + secuenciador Web Audio) | El catálogo del API no tiene modelos de audio |
| Voz | Sophie grabada | **Sin voz** | Decisión de Rick: solo efectos. Las frases salen como texto pixelado |
| Motor | Phaser 4.2.1 | Igual, **CDN primero + copia local** | Funciona sin red y en el service worker |
| Mundos | 450 a 700 m | **360 a 560 m** | Los niños llegan antes a los mundos nuevos |
| Suelo | procedural | **Tiras de Higgsfield espejadas** (tile sin costura) | El suelo procedural salió feo |
| Colisiones del validador | solver exhaustivo | **Bot reactivo con 3 a 5 "leads"** | Prueba ventanas de tiempo reales, más fiel a un jugador |
| Espaciado | fijo | **Normalizado por velocidad** (`spacingFactor`) | Mantiene constante el tiempo de reacción entre peligros |
| Puerta de mundo | tarjeta | Arco arcoíris que se cruza + tarjeta + fundido de cielo | Más mágico |
| Aprobación de Sophie | obligatoria antes de animar | **Pendiente**: se muestra a Rick con cada avance | Rick pidió hacerlo todo de una vez. Si Sophie no lo reconoce, se rehace |

## Cambios de reglas

* FAST convierte los peligros de delante en caramelos y el generador pasa a trozos solo de caramelos.
* INVENCIBLE revienta enemigos en caramelitos y tapa los huecos del suelo con puente arcoíris.
* Hay 5 animales nuevos (uno por mundo del 2 al 6) y a Thor (bóxer marrón con pechito blanco).
* El nombre del unicornio lo elige quien juega. Se guarda en el dispositivo.

## As built (final QA)
- Floor gaps render as a violet misty pit (`Game.drawPits`) so the sky horizon never reads as ground.
- Higgsfield spend: about 49 credits (about USD 3.1), see `docs/CREDITS.md`. The key lives only in `~/.config/higgsfield/key` and is not in the repo.
- Not done: moving platforms, December party hat, sleepy title, cloud wink. Audio verified numerically only, needs a human listen via `?sounds`.

## Boss freeze, checkpoints, candy spacing
- Root cause of the boss freeze: lazily created boss objects survived a scene restart as destroyed references and threw every frame. They are now reset in `Game.create` and the frame loop is wrapped so an error can never freeze the screen.
- A finished boss no longer keeps shooting, good orbs are easier to touch, and a fight with no progress for 22 s weakens the boss.
- Two checkpoint flags per world (36% and 70%) plus one at the boss door. Dying with a saved flag rewinds with full hearts and keeps the score, once per flag. Not in easy mode, where nobody can die.
- Power afterimages are cleared when the power ends.
- Candy: never stacked within 30 px, and low candy is skipped within 46 px of a gap edge.
