# Decisiones visuales — Atlas de Metas (galaxia-metas.html)

Anotaciones para formalizar en `docs/10-GALAXIA-Y-TIENDA.md`. Esto documenta decisiones de **diseño visual/interacción**, no de negocio ni de datos — eso sigue en `nueva-funcionalidad-galaxia-tienda.md` y lo que resuelva productvt-90/Gregorio.

## Concepto

Atlas celeste dibujado en tinta sobre papel — no el cliché de "espacio sci-fi" (degradado morado-azul, fondo negro genérico). Usa los mismos tokens/tipografías que el Cronómetro (skin "Papel"): Fraunces para nombres de metas, Archivo para chrome de UI, IBM Plex Mono para contadores/etiquetas. Elegido para que la galaxia se sienta parte del mismo producto, no una feature aislada con su propia identidad visual.

## Layout por defecto

Espiral áurea (ángulo dorado ≈137.5°, radio ∝ √índice — distribución tipo phyllotaxis/girasol). No se superponen nodos, se ve orgánico sin ser aleatorio. "Restablecer orden" recalcula esta espiral y la física (ver abajo) los lleva ahí suavemente.

## Física de arrastre

Cada nodo tiene una posición "home" (la espiral por defecto, o la última posición arrastrada si el usuario la movió). En cada frame: repulsión suave entre nodos cercanos (evita que se apilen) + resorte débil hacia "home" + amortiguación. Arrastrar un nodo fija su posición al puntero; al soltar, esa posición se vuelve su nuevo "home" y se persiste (hoy en `localStorage`, key por vista). Esto es lo que da la sensación "tipo Obsidian".

## Supermeta cerrada vs. abierta

- **Cerrada** (vista desde la galaxia que la contiene): planeta más grande (26px vs. 18px de una meta simple), anillo orbital elíptico punteado alrededor, badge circular arriba-derecha con el número de metas que contiene.
- **Abierta** (dentro de su propia subgalaxia): sus metas hijas llenan el canvas como su propia mini-galaxia. **Decisión abierta, no resuelta todavía**: hoy NO hay un nodo central que represente a la supermeta misma dentro de su subgalaxia — solo queda su nombre en el breadcrumb superior. Falta decidir si conviene un "sol" central ancla (como en un sistema planetario real) o si el breadcrumb alcanza.

## Metas cumplidas y fallidas

Implementado y visible en la demo (`calc-2` = cumplida, `lectura-2` = fallida):
- **Cumplida**: resplandor suave (glow) detrás del planeta con el color de acento, más un badge circular abajo-izquierda con un check en tinta clara.
- **Fallida/vencida**: el planeta se ve "lavado" (overlay semitransparente del color de papel encima), más un badge circular con una X en vez del check.
- **Activa** (sin `status` o `status:"activa"`): sin badge, tratamiento normal.

**Conflicto de layout sin resolver**: el badge de cumplida/fallida y el badge de conteo de una supermeta comparten la misma esquina (arriba/abajo-izquierda vs. arriba-derecha están cerca en radios pequeños). En la demo no colisionan porque ninguna supermeta de ejemplo tiene `status`, pero si una supermeta puede tener estado propio, hay que separar posiciones o fusionar ambos badges en una sola pastilla.

## Fondo/tema personalizable

5 presets tinta/papel (Papel crema, Pergamino, Tinta añil, Musgo, Papel noche) — nunca fotografías de nebulosas ni degradados genéricos, para mantener la coherencia con el resto del producto. Se eligen por vista (la galaxia principal y cada supermeta recuerdan el suyo), vía swatches en la barra superior. El de "Papel noche" además sirve de sustituto razonable del modo oscuro dentro de esta pantalla.

## Skin de planeta

5 tratamientos, pensados como técnicas de grabado antiguo, no colores planos: liso, anillado (estilo Saturno), rayado (bandas horizontales), puntillado (stippling) y cometa (con estela) — estos dos últimos marcados como bloqueados/Tienda en la demo, sin lógica de desbloqueo real todavía.

## Lo que NO está resuelto en esta exploración

- Nodo ancla dentro de una subgalaxia abierta (ver arriba).
- Colisión de badges cumplida/fallida vs. conteo de supermeta.
- Cómo se define/edita el `status` de una meta desde la UI (hoy es solo data seed, no hay interacción para marcar cumplida/fallida).
- Todo lo de la Tienda real (moneda/desbloqueo) — intencionalmente fuera de esta exploración, es V1.1 y depende de decisiones de producto todavía abiertas.
