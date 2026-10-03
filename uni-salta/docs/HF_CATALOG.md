# Catálogo de Higgsfield usado (API Cloud, `https://api.higgsfield.ai`)

Auth: variable `HF_KEY` o `~/.config/higgsfield/key` (fuera del repo). Cliente: `tools/hf.py`.
Precio medido: 1 crédito ≈ USD 0,0625. Estimar antes de cada llamada: `POST /estimate/<endpoint>`.

| Necesidad | Modelo usado | Costo por imagen |
|---|---|---|
| Hoja del unicornio, poses y animaciones | `xai/grok-imagine-image-2.0` (hasta 10 referencias) | 1,6 créditos a 2k 2:1 |
| Enemigos, animales, props, suelos | `xai/grok-imagine-image-2.0` | 1,44 a 1,6 |
| Probado y descartado | `alibaba/qwen-image-3/edit` (1,2) | menos fiel al estilo |
| Música, efectos, AutoSprite | **no existen en el API** | se hacen en código |

Consejos que funcionaron: fondo cian plano, "8 frames en una fila", describir cada frame, pedir "chunky 16-bit SNES",
y pasar la hoja maestra del personaje como referencia en cada llamada.
