# Nueva funcionalidad: Galaxia de metas + Tienda

**Fecha:** 2026-09-05 (creación) — **actualizado 2026-09-06** con la ampliación de la pantalla principal.
**Origen:** requerimiento directo del creador (Gregorio), dado en vivo a productvt-cb/productvt-9b (sesión de diseño Front End). No estaba en el prompt original ni en SPEC.md/ARCHITECTURE.md/IMPLEMENTATION_PLAN.md — es una ampliación de alcance sobre el sistema de "metas" ya existente, que hoy solo contempla una estrella mensual/anual gamificada (ver `decisiones-tomadas.md` punto 7). Ya scopeado como **V1.1** por `productvt-eb` (no bloquea el V1/MVP) — ver sección "Alcance" más abajo en `decisiones-tomadas.md`.

## Qué pidió el creador (cita, limpiada solo de tipeo)

> El sistema de galaxia de planetas que permite ver las metas y supermetas debe tener cierto nivel de interactividad, dejándote moverlas un poco y teniendo diversas vistas — por ejemplo, una vista que al clickear una meta te abra una subgalaxia, o que puedas mover en la vista principal las galaxias por alrededor, similar a Obsidian, pero que puedas igualmente restablecer a un orden default. Es importante que tanto el fondo del theme en la página principal como dentro de una supermeta sea personalizable, y lo mismo con la skin del planeta. Esto va con la sección de Tienda, que cuente con los sistemas de skins, fondos y colecciones de las rachas y sistemas de recompensa.

## Ampliación 2026-09-06: layout de la pantalla principal (estilo Clash Royale) y economía del juego

Cita (limpiada de tipeo):

> El layout es similar a Clash Royale. Un botón abajo bastante grande de crear meta, un panel interactivo que por defecto tiene una vista pequeña que usa la mitad de la pantalla y está a la misma altura; arriba, a la izquierda y a la derecha, etiquetas y botones de opciones, etc. El botón de crear es un popup que te pregunta si quieres crear meta o iniciar bloque. En crear meta te pregunta si es supermeta o meta, si la meta pertenece a una supermeta, o te deja entrar también a tu lista de metas para crearlas directamente ahí — teniendo las opciones para elegir color (los colores de bloque de estudio tienen por defecto el color mismo de la meta). También te permite definir tanto tareas recurrentes como de un momento específico y atemporales, y poder definir el nivel de importancia de la meta o tarea en particular, que define los puntos que ganarás de la currency del propio "juego", con la cual puedes comprar skins en la tienda. El botón de bloque te redirige al Cronómetro. El sistema de rachas y el botón de amigos deben estar arriba. Con el sistema de cofres, que también te dan dinero por cada 7 días de racha, con un cofre que se abre.

### Desglose de la ampliación

**Layout general de la pantalla principal**
- Panel de la galaxia: por defecto ocupa **la mitad de la pantalla** (no pantalla completa), enmarcado como un panel/viewport propio.
- Barra superior, dividida izquierda/derecha: racha (🔥) y botón de amigos a un lado; moneda del juego, cofres y otras etiquetas/opciones al otro.
- Botón grande de acción al fondo (equivalente al botón "Batalla" de Clash Royale) — abre un popup con dos caminos: **"Crear meta"** o **"Iniciar bloque"** (este último redirige al Cronómetro).

**Sistema de creación de metas, ampliado**
- Al crear, se pregunta explícitamente **Meta o Supermeta** (aunque en el modelo de datos ya confirmado por `productvt-90`, "supermeta" sigue siendo puramente relacional — la pregunta en la UI decide si se muestra o no el selector "pertenece a").
- Si es una **Meta** (no supermeta), se puede elegir si pertenece a una supermeta existente.
- Existe también una **lista de metas** navegable (no solo la galaxia) desde donde se pueden crear metas directamente.
- **Color propio por meta**: cada meta tiene su propio color (paleta + selector RGB), independiente del de su categoría. **Resuelto por `productvt-90`**: este color es puramente cosmético y vive **solo dentro de la vista de galaxia/Tienda** (skin y color del planeta) — chocaba con D6 (color vivo de categoría siempre, sin excepción, en Cronómetro/calendario/estadísticas). El Cronómetro y todo lo demás siguen pintando únicamente con el color vigente de la categoría; nunca con el de una meta, salvo que Gregorio confirme explícitamente lo contrario (rompería D6). El mockup ya implementaba esta separación (el color de meta solo se usa en el canvas de la galaxia).
- **Tipo de temporalidad de la tarea/meta**: recurrente, de un momento específico (con fecha/hora), o atemporal (sin fecha).
- **Nivel de importancia**: define cuántos puntos de la moneda del juego se ganan (no se especifica todavía si se gana al crear, al completar, o de forma recurrente — ver preguntas abiertas).

**Economía del juego (nueva, no existía antes)**
- Moneda virtual propia del juego (no dinero real — coherente con el no-objetivo de SPEC §3.3 y con la respuesta 7 del creador sobre recompensa por constancia).
- Se gana según la **importancia** asignada a cada meta/tarea.
- Se gasta en la **Tienda** para comprar skins (de planeta, de fondo).
- **Sistema de cofres**: cada 7 días de racha otorga un cofre que el usuario abre (interacción de apertura) y que entrega moneda (posiblemente también otros premios, no especificado).

**Sistema social (nuevo, no existía antes)**
- Botón de "Amigos" en la barra superior. **No se especificó su funcionalidad** — solo su existencia y ubicación. Es la pieza con más preguntas abiertas de toda esta ampliación (ver abajo).

## Preguntas abiertas para el creador

*De la versión anterior (siguen sin resolver):*
- ¿Qué determina si una meta es "supermeta" vs. meta simple, más allá de tener hijas? *(Actualización: ya resuelto por `productvt-90` — es puramente relacional, `parentGoalId`, máx. 2 niveles, y toda meta incluida una supermeta necesita su propia categoría+meta semanal.)*
- ¿El layout de la galaxia se sincroniza entre dispositivos? *(Resuelto: sí, por usuario en Firestore — brief §11.)*
- ¿Hay skins/fondos gratis por defecto? *(Resuelto: sí, skin "Papel" y fondo base — brief §11.)*

*Nuevas, de la ampliación de hoy:*
- ¿Los puntos de importancia se ganan al **crear** la meta, al **completarla**, o de forma **recurrente** mientras esté vigente (p. ej. cada semana que se cumple su meta de estudio)?
- ¿Existe una tasa de conversión fija entre minutos efectivos de estudio y moneda, o la moneda depende **solo** de la importancia asignada, sin relación con el tiempo realmente estudiado?
- ¿Qué es exactamente el sistema de "Amigos"? ¿Ver el progreso de otros usuarios, comparar rachas, regalar cofres, un chat? Esto tiene implicancia de arquitectura fuerte (relaciones entre usuarios, privacidad, posible necesidad de backend adicional) que no estaba contemplada en ningún documento previo — todo el proyecto asumía hasta ahora un solo usuario por cuenta sin funcionalidades sociales.
- El cofre de racha de 7 días: si se rompe la racha, ¿se pierde el progreso hacia el próximo cofre, o es acumulativo por otra vía?
- ¿El color propio de la meta reemplaza al color de la categoría en el Cronómetro, o coexisten (p. ej. la categoría sigue pintando el calendario, pero el bloque activo del Cronómetro usa el color de la meta)?

## Ampliación 2026-09-06 (segunda parte): medallas, colección de historia, y personalización visual de planetas y cables

Cita (limpiada de tipeo), dada directamente a esta sesión (BC Orquestador):

> El sistema de tienda tendrá también medallas por máximos días logrando rachas, así como "coleccionar" las supermetas que ya completaste como historia. El sistema de crear supermetas tendrá skins default de planetas y la posibilidad de personalizar con tres colores, definiendo una skin vectorial con continentes que cambian de color, así como nubes igualmente. Las metas lo mismo (además de las skins premium que se añadan en un futuro), y el diseño de meta no será el mismo que supermeta en términos de las plantillas de planeta. También los cables que unen la galaxia podrán ser invisibles, elegir color, o poner skin también.

### Desglose

**Tienda — medallas y colección (además de skins/fondos ya descritos arriba)**
- **Medallas por récord de racha**: la Tienda otorga/exhibe medallas según el máximo de días de racha alcanzado alguna vez (no la racha actual — es un logro histórico, no se pierde si la racha se corta).
- **Colección de supermetas completadas**: al completar una supermeta, queda "coleccionable" como parte de un historial/galería propia (tipo trofeo) — persiste como registro aunque la supermeta ya no esté activa en la galaxia principal.

**Skins de planeta — supermetas y metas**
- Existe una **skin default** de planeta al crear una supermeta.
- Personalización propia: **3 colores** que definen una skin **vectorial** con "continentes" que cambian de color según esos 3 colores, y **nubes** que también cambian de color (sistema paramétrico, no una imagen fija por color).
- Las **metas** (no supermetas) tienen el mismo sistema de personalización de 3 colores/continentes/nubes, **pero con una plantilla de planeta visualmente distinta** de la de supermeta — meta y supermeta nunca se ven iguales aunque compartan la misma paleta.
- A futuro (no en el alcance de esta ampliación) se sumarán **skins premium** adicionales, más allá del sistema paramétrico de 3 colores.

**Cables de la galaxia (las conexiones/edges entre nodos del grafo)**
- Pueden configurarse **invisibles** (sin línea visible entre nodos).
- Se puede elegir un **color** para el cable.
- Se puede aplicar una **skin** al cable (más allá de un color plano — no se especifica el mecanismo exacto).

### Preguntas abiertas nuevas de esta parte

- ¿Las medallas de racha son solo cosméticas (se exhiben en la Tienda/perfil) o desbloquean algo (p. ej. un skin exclusivo por alcanzar cierto récord)?
- ¿La "colección" de supermetas completadas es solo visual/de consulta, o una supermeta completada y coleccionada puede reabrirse/reactivarse?
- ¿El sistema paramétrico de 3 colores (continentes + nubes) es el mismo motor visual para meta y supermeta, solo con plantilla de planeta distinta, o son dos sistemas de personalización separados?
- ¿Las skins de cable son también paramétricas (colores) o son assets prediseñados como las de planeta/fondo?

## Respuestas del creador, 2026-09-06 (ronda 2, dadas directo a productvt-7b)

**Puntos e importancia**: se ganan **al completar** la meta o tarea específica (no al crear, no solo por existir). Una meta vale intrínsecamente más que una tarea. La moneda depende **solo** de la importancia asignada — no hay tasa fija minutos↔moneda. Las **tareas recurrentes** valen bastante menos por cada cumplimiento individual que una meta/tarea única, precisamente porque se van sumando cada vez que se cumplen (mecanismo de acumulación, no de pago único). **Nota para quien modele esto**: esta respuesta distingue explícitamente "meta" de "tarea" como dos unidades de importancia distinta — no estaba claro antes si eran sinónimos en este contexto; vale la pena confirmar con productvt-90/9b si "tarea" ya tiene modelo propio o si hace falta uno nuevo (más chico que `WeeklyGoal`) para las tareas recurrentes/de un momento específico/atemporales que la ampliación del layout principal ya mencionaba.

**Cofre de racha de 7 días**: si se rompe la racha, **se pierde el progreso** hacia el próximo cofre (no es acumulativo por otra vía).

**Colección de supermetas completadas**: es una consulta histórica que muestra un mini-mapa de la supermeta como popup, **y sí se debe poder reabrir/reactivar** (el creador aclara "meta primero" — no del todo claro para productvt-7b si se refiere al orden de apertura dentro del popup o a que solo se puede reabrir a nivel de meta y no más profundo; que quien lo construya lo confirme con el creador si hace falta precisión antes de implementarlo).

**Amigos, ya definido — SÍ es social real, con implicancia de arquitectura**: se muestra únicamente **quién está en línea** en el sentido de "estudiando ahora / con la app abierta" (similar a Clash Royale). Al presionar sobre un amigo se pueden ver sus estadísticas. En el hub aparece además una mini etiqueta por amigo con la racha vigente que lleva. **Esto confirma que Amigos requiere**: relación de amistad entre cuentas, algún mecanismo de presencia ("en línea ahora", que Firestore no resuelve nativamente tan bien como Firebase Realtime Database — probablemente haga falta evaluar RTDB además de Firestore, ambos dentro del plan gratuito pero es una pieza nueva de infraestructura no contemplada hasta ahora), y reglas de seguridad para que un usuario pueda leer estadísticas/racha de otro usuario que sea su amigo (hoy todo el modelo de seguridad asume que cada usuario solo lee `users/{uid}` propio). Sigue siendo V1.1, pero ya no es un signo de interrogación de producto — es una pieza de arquitectura real que hay que diseñar cuando le toque.

**Compartir insignias/medallas por WhatsApp** (detalle nuevo, no preguntado explícitamente): debe poder compartirse una medalla vía WhatsApp con una imagen generada (foto/composición) y el nickname del usuario — funcionalidad de compartir nativa, a diseñar en la fase de Tienda.

**Medallas de racha**: son solo estéticas en el sentido de que no dan ventaja de juego, pero **sí desbloquean algo concreto**: un **borde de ícono/avatar** equipable, visible para otros usuarios en listados y perfil (relevante para el sistema de Amigos de arriba).

**Sistema paramétrico de 3 colores (continentes + nubes)**: es el **mismo motor** para meta y supermeta, con **plantillas exclusivas distintas** por tipo (confirma y precisa lo ya intuido: mismo sistema, skin visual diferenciada).

**Skins de cable**: **ambas** — paramétricas (color) y assets prediseñados. Idealmente incluyendo también modelos vectoriales propios con "continentes y remolinos" (mismo lenguaje visual que los planetas, aplicado a las conexiones).

**Sin respuesta todavía**: si el color propio de una meta reemplaza o coexiste con el color de categoría en el Cronómetro (pregunta original 5). Sigue abierta.

## Impacto en secuenciación

Esto profundiza (no reduce) el alcance ya marcado como V1.1: además de la galaxia y la Tienda de skins, ahora incluye una economía de puntos/moneda con reglas de generación (importancia), un sistema de cofres con periodicidad propia, y un sistema social completamente nuevo (Amigos) sin ninguna definición previa de producto ni de arquitectura. Recomendación: mantener todo esto en V1.1, y tratar "Amigos" como su propia pieza de descubrimiento de producto separada — es la que más se aleja del alcance original de "app de estudio personal, un usuario, sin backend propio".

---
Actualizado por productvt-9b (diseño Front End) a pedido directo del creador, reenviado a `productvt-90` para que quede en SPEC.md/canon y se factore en la arquitectura cuando corresponda.
