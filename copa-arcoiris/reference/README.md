# Referencias

## Fotos de la familia (privadas, fuera de Git)

`reference/private/` está en `.gitignore`. Contiene las fotos tipo pasaporte que Rick pasó en el chat el 2026-10-04,
convertidas a PNG sin otros cambios. **Nunca se suben al repositorio.** Se subieron a Higgsfield solo como
referencia de las hojas maestras, con autorización de Rick. Sus URLs viven en `reference/private/uploads.json`, también ignorado.

| Archivo | Quién | Rasgos que hay que conservar |
|---|---|---|
| `private/sophie_photo.png` | Sophie, 7 años | Pelo negro, largo, liso y suelto con raya casi al medio. Cara ovalada, ojos marrón oscuro, cejas rectas y definidas. Aretes pequeños de punto. Piel trigueña clara |
| `private/alana_photo.png` | Alana, casi 5 años | Melena negra a los hombros, algo ondulada y con volumen, raya al lado. **Ganchos mariposa, uno rosado y uno morado.** Ojos grandes y redondos, cara redonda, aretitos |
| `private/papa_photo.png` | Papá (Rick) | Pelo oscuro corto con entradas, **barba corta de candado completo, canosa**, cejas gruesas y oscuras, cara alargada |
| `private/mama_photo.png` | Mamá (Stephanie) | Pelo negro largo y **ondulado**, raya al medio. Cejas finas arqueadas, ojos marrón claro, aretes plateados, rostro delgado |

Las fotos son serias, pero **todos los personajes del juego sonríen**. Es una instrucción explícita de Rick.

Si el contenedor se reinicia, esta carpeta desaparece. Hay que pedirle a Rick las 4 fotos otra vez y guardarlas con esos
nombres. Sumas SHA-256 de las originales convertidas:

```
37b3015da5e7b42faa1f2f0229f11f491e88885014d0292b599a118f1b84cf9c  sophie_photo.png
60020190a9af5150be70bfa727dd1b72cbd9867d1bf39aba5f64b45ebed0fd85  alana_photo.png
e68c81fb974d7369bb96aa6861243cc025a40ada7cbbb72240e0771cdb8aaca0  papa_photo.png
8d3bbc11f0183ffcddbf1245d39026c4240706f41d556697459ff3f42f14891f  mama_photo.png
```

## Thor (en Git)

`thor_identity_ref.png` es una copia de `uni-salta/art-src/higgsfield/h4/thor_v1.png`. Rick confirmó que ese bóxer es Thor:
pelaje leonado claro, hocico y máscara negros, pechito y patas blancas, orejas caídas y cola corta. Solo se usa para la
**identidad** del perro. El estilo, el tamaño y las animaciones se hacen de nuevo para este juego. uni-salta no se toca.

SHA-256: `712a6c6565a630ba6084f6ab12fd9bad834334180fd588151aa79f2eebf59f6f`

## Unicornio

No se usa. Rick decidió que este es un juego nuevo y que el anfitrión es Thor.
