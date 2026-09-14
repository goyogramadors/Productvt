# Red de pruebas de regresión — invariantes que ninguna funcionalidad nueva puede romper

## Qué es esto y qué NO es

Esto **no** reemplaza las matrices de test de dominio ya escritas o por escribir en el canon (`docs/03-CRONOMETRO.md` §13, 42 casos; `docs/07-CALENDARIO-ESTADISTICAS-METAS.md` §6, 20 casos pendientes; los tests de Vitest que BC Orquestador escribe módulo por módulo). Esas matrices prueban que **un módulo funciona bien por dentro**.

Esto es distinto: es la lista de **invariantes transversales** — reglas ya decididas que atraviesan varios módulos a la vez — que una funcionalidad nueva puede romper **sin que nadie lo note**, precisamente porque toca dos módulos que normalmente nadie revisa juntos. Ya pasó una vez en este proyecto: la Galaxia introdujo un color de meta que rompió silenciosamente D6 ("color de categoría, sin excepción") hasta que alguien preguntó explícitamente. Esta lista existe para que la próxima vez se detecte *antes* de escribir código, no después.

**Cómo usarla**: cuando se proponga o se documente una funcionalidad nueva (una `nueva-funcionalidad-*.md`, una sección nueva del canon, una fase nueva del build), repasar esta lista y marcar qué invariantes toca. Si toca alguno y no está claro cómo coexisten, es una pregunta para el creador o para quien mantenga `decisiones-tomadas.md` — no una suposición.

Cada fila: el invariante, de dónde sale, un escenario concreto que lo rompería si se implementa mal, y qué funcionalidades nuevas ya lo pusieron a prueba.

## 1. Cronómetro y máquina de estados

| Invariante | Fuente | Se rompe si... | Ya puesto a prueba por |
|---|---|---|---|
| `session_completed` solo se alcanza completando el ciclo natural del preset — no hay salida anticipada con crédito desde cualquier estado | D1 | Cualquier UI agrega un botón "terminar ahora" visible durante `study_running`/`break_running` que no sea el punto de decisión entre bloques | — |
| Cancelar y expirar pierden **solo el tramo/bloque en curso**, los bloques previos completados en la sesión conservan su `effectiveStudySeconds` | D1.b, D2 | Cualquier nueva forma de terminar una sesión (ej. "abandonar desde Amigos", "salir de la app durante X") no pasa por `CONFIRM_CANCEL`/`EXPIRE_SESSION` y en cambio pone `effectiveStudySeconds = 0` | Confirmado ya corregido en `03-CRONOMETRO.md` T16 |
| Las ventanas de respuesta (30s/10min) se deciden por **tamaño del tramo**, no por qué estado es | D3 | Una funcionalidad nueva agrega un estado de espera propio (ej. algo de Amigos, algo de Tienda) sin definir explícitamente su ventana | — |
| Cooldown de almuerzo: 1 uso cada 3 ciclos de estudio completados en la sesión activa | D5 | Cualquier funcionalidad que permita "regalar" o "comprar" almuerzos extra (pensar en la Tienda) sin pasar por el mismo contador de ciclos | Vale la pena vigilar cuando se diseñe la Tienda — un ítem "almuerzo extra" comprable rompería esto si no se conecta al mismo cooldown |
| Una sola sesión de estudio activa por usuario (modelo dominante/espectador) | D14 | Cualquier funcionalidad nueva permite "ver" o "interactuar" con el timer sin pasar por el rol espectador (ej. una vista de Amigos que muestre datos en vivo del timer de otro usuario tendría que ser SIEMPRE de solo lectura, nunca un segundo dominante) | Relevante para "Amigos" (ver sección 4) |

## 2. Colores (categoría / meta / supermeta)

| Invariante | Fuente | Se rompe si... | Ya puesto a prueba por |
|---|---|---|---|
| Un bloque **sin** meta asociada (`goalId` ausente) usa siempre el color **vigente** de su categoría, en Cronómetro/Calendario/Estadísticas | D6 | Cualquier vista nueva que pinte bloques usa un color guardado (snapshot) en vez de resolverlo en vivo por `categoryId` | Historial, snapshots — ya resuelto explícitamente en el modelo de datos |
| Un bloque **con** meta asociada usa el color de la **meta** (no el de categoría) en el Cronómetro; en Calendario usa el color de la meta como relleno + el de la **supermeta** como segunda raya | D6.b | Una funcionalidad nueva de visualización (ej. una vista de Estadísticas por meta, un widget de racha) pinta por categoría en vez de por meta cuando el ítem tiene `goalId` | **Todavía no implementado en ningún lado** — cuidado, es el invariante más nuevo y el que más fácil se puede olvidar al construir cada pantalla nueva |
| Cambiar el color de una categoría o de una meta propaga retroactivamente a todo lo ya guardado que la usa | D6 | Cualquier vista cachea un color en vez de resolverlo en el momento de renderizar | — |

## 3. Banco de descanso

| Invariante | Fuente | Se rompe si... | Ya puesto a prueba por |
|---|---|---|---|
| El descanso ganado se suma **una sola vez** al banco por ciclo completado; nunca se suma "lo ganado" y después "lo no usado" por separado | Aclaraciones técnicas, resuelve REV-ALTA-4 | Cualquier funcionalidad que otorgue descanso extra (ej. una recompensa de la Tienda: "+10 min de banco") lo suma con una función distinta a `consumeBreakBank`/el flujo ya existente, sin pasar por el mismo cálculo | — |
| El banco pertenece solo a la sesión activa — desaparece al terminar, cancelar o expirar | SPEC §17.6, sin cambios | Una funcionalidad de "guardar banco para la próxima sesión" (nadie la pidió, pero vale vigilar si aparece) contradice esto sin que el creador lo confirme explícitamente | — |

## 4. Sincronización multi-dispositivo y privacidad de datos

| Invariante | Fuente | Se rompe si... | Ya puesto a prueba por |
|---|---|---|---|
| Todo el modelo de seguridad asume que un usuario solo lee/escribe bajo `users/{uid}` propio | D15, `02-DOMINIO.md` reglas de seguridad | **Amigos** necesita que un usuario lea presencia/estadísticas de OTRO usuario — esto rompe el supuesto a propósito, ya confirmado por el creador, y debe implementarse como una excepción explícita y acotada (reglas de seguridad nuevas, no aflojar el modelo general) | Ya señalado como pendiente de arquitectura por productvt-90 |
| Zombie a las 24h, resuelto de forma perezosa por el próximo cliente que lee, sin Cloud Functions | D16 | Un mecanismo de presencia para Amigos (¿"en línea ahora"?) que requiera un proceso server-side (Cloud Function, cron) para expirar violaría "costo cero" — si se implementa presencia, debe ser client-driven (heartbeat + lectura, como el resto del proyecto), no un backend nuevo | Vigilar en el diseño de Amigos |
| Costo cero: sin Cloud Functions, sin EAS Build en la nube, sin Storage de pago | D17-19, brief §6 | Cualquier funcionalidad nueva (Amigos, compartir por WhatsApp, subir audio a la nube) agrega un servicio de pago o un límite del plan Spark sin decirlo explícitamente | Vigilar especialmente en Amigos (presencia) y en compartir medallas (¿genera la imagen en el cliente o necesita una función server-side para componerla?) |

## 5. Modelo de datos y nomenclatura

| Invariante | Fuente | Se rompe si... | Ya puesto a prueba por |
|---|---|---|---|
| El código as-built manda sobre cualquier documento para nombres de identificadores | `08-PLAN-IMPLEMENTACION.md` §1 | Un documento nuevo (o esta misma red de pruebas) usa un nombre de campo distinto al ya commiteado en `productvt-beta/src/domain/` | Repasar antes de cerrar cualquier `nueva-funcionalidad-*.md` |
| `WeeklyGoal` es una entidad uniforme (hoja o supermeta), nunca polimórfica; `parentGoalId` es la única señal de jerarquía, máximo 2 niveles | `_brief-orquestador.md` §11 | Una funcionalidad nueva de "Tarea" (ver más abajo) se modela como un tercer nivel de `parentGoalId` en vez de una entidad propia más liviana | **Pregunta abierta real, todavía sin resolver** — ver "meta vs. tarea" en `nueva-funcionalidad-galaxia-tienda.md` |

## 6. Alcance de plataforma y costo

| Invariante | Fuente | Se rompe si... | Ya puesto a prueba por |
|---|---|---|---|
| Android es la única plataforma dominante del cronómetro; web/desktop son espectadores + gestión completa de todo lo demás | "Alcance de plataformas" | Una funcionalidad nueva (Amigos, Tienda) asume que la web puede iniciar o accionar algo que hoy es exclusivo del dominante | — |
| Ninguna funcionalidad nueva es V1 si contradice un no-objetivo de SPEC §3.3 (sin pagos reales, sin marketplace, sin funcionalidades empresariales) sin que el creador lo reconfirme explícitamente | SPEC §3.3, aplicado en el triage de Galaxia+Tienda | La Tienda termina con un "pase premium" o compra real de moneda sin que el creador lo haya pedido así | Vigilar cuando se diseñe el catálogo de la Tienda (`10-GALAXIA-Y-TIENDA.md` §4) |

## Cómo mantener esto vivo

Cada vez que se registre una `nueva-funcionalidad-*.md` nueva en este mismo directorio, o se agregue un punto nuevo a `decisiones-tomadas.md`, repasar esta tabla y: (a) marcar qué filas toca, (b) si introduce un invariante nuevo que otra funcionalidad futura podría romper, agregar una fila. Esta tabla no tiene un "dueño" de código — es responsabilidad de quien mantenga `03-requisitos/` (hoy, productvt-7b) mantenerla actualizada a medida que el resto del equipo decide cosas nuevas.
