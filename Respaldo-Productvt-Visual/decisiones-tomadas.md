# Decisiones tomadas — Productvt Beta

Este documento resuelve las 24 preguntas de [preguntas-para-el-creador.md](preguntas-para-el-creador.md). Tiene **prioridad sobre SPEC.md, ARCHITECTURE.md e IMPLEMENTATION_PLAN.md** en caso de conflicto — son enmiendas, no un documento aparte.

**v2 (2026-09-05)**: reemplaza la v1 con las respuestas definitivas del creador (respondidas directamente, más precisas que la primera pasada). Los puntos 1, 2, 3, 5, 14–17 cambian respecto de v1; el resto se mantiene.

La fase de Mockup queda **superada**: se construye la aplicación real (Expo + Firebase) directamente, como prototipo funcional compilable, no como diseño estático.

## Cronómetro de estudio

1. **No existe "finalizar sesión conservando progreso" a mitad de un bloque** (corrige v1): las únicas formas de cerrar una sesión son completarla normalmente (entre bloques, con "Terminar sesión" en la selección de descanso o al terminar un descanso — sin penalización), cancelarla, o dejarla expirar. No se agrega ninguna acción de "finalizar ahora conservando lo estudiado" disponible en cualquier estado.
1.b **Cancelación = misma severidad que expiración** (CONFIRMADO directamente por Gregorio el 2026-09-06, pregunta 25 de preguntas-para-el-creador.md — corrige v1/v2, que mantenían cancelación como pérdida total): al cancelar, se pierde solo el `effectiveStudySeconds` del bloque/tramo en curso; los bloques previos ya completados en la misma sesión conservan su tiempo efectivo (misma regla que el punto 2 para expiración). La sesión queda `status: 'cancelled'`, `completionReason: 'cancelled_by_user'`. **Fricción de cancelación — resuelto por Front End (productvt-9b, 2026-09-06), pendiente solo de que Gregorio lo objete si quiere pesar distinto**: se mantiene la doble confirmación de 15+15s **sin cambios** — el razonamiento de Front End es que la fricción de "cooling-off" no depende de cuánto se pierde, sino de que cancelar a mitad de bloque es una decisión activa e impulsiva en el momento exacto de la tentación (a diferencia de expirar, que es negligencia pasiva); ese momento merece igual o más fricción, no menos. **Sí se elimina** cualquier elemento punitivo *impuesto por la app* (animación triste, copy de culpa escrito por el equipo) — eso se sentía desproporcionado con el costo ahora más bajo. La `cancellationPhrase` personalizable (SPEC §11.4, ya en `UserProfile`) se mantiene y es, de hecho, el mecanismo correcto para el peso emocional: no es la app regañando, es un compromiso que la persona se escribió a sí misma, así que funciona igual de bien con costo bajo que con costo alto. El banco de descanso de la sesión se pierde igual al cancelar (no cambia — ver "Alcance del banco" en SPEC §17.6, es independiente de esta regla).
2. **Expiración = pérdida solo del ciclo en curso, no de la sesión completa** (CONFIRMADO directamente por el creador tras desambiguación explícita el 2026-09-05 — no es una interpretación nuestra): al expirar por no responder a tiempo, se pierde el `effectiveStudySeconds` del ciclo/tramo que estaba en curso al momento de expirar. Los ciclos **previos ya completados en esa misma sesión mantienen su tiempo efectivo** y sí cuentan para estadísticas. La sesión queda con `status: 'expired'`, pero su `effectiveStudySeconds` final es la suma de los ciclos completados antes de la expiración (no cero). Se descarta explícitamente la lectura alternativa ("bloque" = sesión completa, per glosario SPEC §44) que había planteado productvt-eb.
3. **Ventanas de espera por tamaño del tramo, no por tipo de estado** (corrige v1): **30 segundos** para tramos/descansos pequeños (descanso corto, ciclo de estudio regular). **10 minutos** para tramos o descansos grandes — específicamente el ciclo que da paso al descanso largo y el propio descanso largo (tanto para decidir tomarlo como para el "toca estudiar" al terminarlo). Regla operativa: si el tramo relevante es el descanso largo (o el ciclo que lo antecede), usar 10 min; en cualquier otro caso, 30 s.
4. **Temporizador inverso**: no se autodetiene al llegar a la duración objetivo — sigue corriendo, pero con un **tope superior = 2× la duración objetivo** (el objetivo original más "un bloque más" de margen). Al llegar a ese tope se fuerza el cierre automático (auto-finish) y se guarda el bloque igual. Al alcanzar el objetivo original (antes del tope) suena una notificación de "meta alcanzada" y el botón "Finalizar" se resalta.
5. **Almuerzo: máximo 1 uso cada 3 bloques/ciclos** (corrige v1, no era "1 por sesión"): se necesita un contador de ciclos transcurridos desde el último uso de almuerzo; se rehabilita al llegar a 3.

## Categorías y colores

6. **Colores en cascada, incluyendo histórico** (confirma v1, respuesta directa del creador: "deben actualizarse"): cambiar el color de una categoría actualiza la categoría, sus subcategorías, y **también** lo que ya está guardado — calendario, historial y estadísticas siempre pintan con el color **vigente** de la categoría. Se elimina `colorSnapshot` como fuente de verdad visual (no se usa para pintar en ningún lado).

6.b **Excepción confirmada a D6 — el color de meta manda sobre el de categoría cuando el bloque pertenece a una meta** (respuesta directa del creador, 2026-09-06, cierra la última pregunta abierta de la ampliación Galaxia/Tienda — corrige la resolución anterior de `productvt-90` en `nueva-funcionalidad-galaxia-tienda.md`, que asumía que D6 no tenía excepciones): jerarquía de color, de mayor a menor prioridad:
    - **Supermeta**: tiene su propio color (el más importante, el "primario").
    - **Meta** (hija de una supermeta vía `parentGoalId`): tiene su propio "subcolor" — **por defecto hereda el color de la supermeta al crearse**, pero el usuario puede cambiarlo por meta individual.
    - **Categoría**: sigue siendo el color de fallback — **solo aplica a un bloque de estudio "random"**, es decir, uno que **no** está asociado a ninguna meta. Para esos, D6 sigue vigente tal cual (color vigente de categoría, sin excepción).
    - **Si el bloque SÍ está asociado a una meta**: el color de esa meta **manda por sobre el color de categoría en el Cronómetro** (pantalla del timer activo). Ya no es "sin excepción" — la excepción es exactamente "bloque ligado a una meta".
    - **En el Calendario**, un evento ligado a una meta se pinta con **dos colores**: el color de la **meta** para el evento en sí (relleno principal), y el color de la **supermeta** como una **segunda raya/franja** secundaria (identifica visualmente "a qué calendario/capa pertenece", ej. "Universidad" como supermeta) — coherente con el modelo de "Calendario por capas" ya resuelto (una capa de meta filtra por su categoría, pero visualmente ahora también lleva el acento de color de su supermeta).
    - Esta jerarquía de color es independiente de si la meta está o no vinculada a la Galaxia visualmente — aplica en cuanto una `WeeklyGoal` con `parentGoalId` existe y un `StudySession`/evento se asocia a ella (el mecanismo exacto de esa asociación — un campo `goalId?` nuevo en la sesión, probablemente — queda a definir por quien lo arquitecture).
    - **No es solo un ajuste de color (observación de productvt-9b, 2026-09-06)**: hoy ni el Cronómetro ni el Calendario tienen el concepto de "este bloque/evento está ligado a tal meta" — ambos solo trabajan con categoría. Aplicar esta regla exige una integración funcional real: elegir a qué meta (si alguna) se liga un bloque **al iniciarlo** en el Cronómetro, o dejarlo "random" sin meta — no es retroactivo ni solo visual. productvt-9b se lo está preguntando a Gregorio para ver si se prioriza ahora o se deja para cuando cierre el resto de Galaxia/Metas (V1.1).
7. **Estrella mensual** (confirma v1): un mes **sin ninguna meta configurada NO obtiene estrella**. Solo hay estrella cuando hay constancia real: al menos una semana cerrada con al menos una meta configurada, todas cumplidas.

## Arquitectura de código

Delegación total y explícita del creador para los puntos 8–13, 15, 17, 18, 19, 21 ("ni idea, solucionalo para que tenga coherencia y adáptalo para que sea óptimo, puedes borrar archivos, modificar la estructura o arquitectura para que sea más robusta o completa en general"). Con una restricción dura que aplica a todos ellos: **priorizar estabilidad y funcionalidad sin sumar costo monetario adicional**.

8. Se puebla `src/application/coordinators/` con `StudySessionCoordinator` y `ActiveTimerRecoveryService`. Los "assemblers" de stats/calendar quedan donde el plan ya los puso (`features/*/services/`), por ser más específicos de su feature.
9. **Repositorio obligatorio para todo agregado**: se agregan `CategoryRepository`, `PresetRepository`, `SettingsRepository`. Ningún service habla con Firestore directo, sin excepciones. Todo esto usando solo el plan gratuito de Firebase (Spark) — Auth + Firestore free tier alcanzan para V1 de un solo usuario.
10. Se **elimina la carpeta `screens/`**. Toda la UI vive en `features/*/components/` + `app/(tabs)/*.tsx`.

## Modelo de datos (nombres canónicos)

11. `remindersTriggered` (no `reminderCount`).
12. `status` (no `sessionStatus`) como nombre canónico en todas las entidades de sesión. `StudySession` incluye explícitamente `customBreakSelections[]`, `completionReason`, `deviceInfo?`.
13. Se mantiene la distinción intencional: `startedAt`/`endedAt` para lo que **ya ocurrió** (StudySession, InverseSession) vs. `startAt`/`endAt` para lo **planificado** (InvisibleEvent).

## Sincronización multi-dispositivo — modelo "dominante / espectador" (respuesta directa y más precisa del creador, corrige el modelo genérico de v1)

14. Todo lo que **no** es el timer activo (crear/editar categorías, presets, eventos invisibles, metas, etc.) funciona en **paralelo sin restricciones** en todos los dispositivos — es CRUD normal contra Firestore, sin necesidad de arbitraje.
   Para el **timer activo** específicamente: en un momento dado, un solo dispositivo es **dominante** (puede iniciar/accionar el bloque); los demás son **espectadores** (ven el contador en vivo vía `onSnapshot`, pero sus controles están deshabilitados para accionar). Si un espectador intenta interactuar con un control, se dispara una solicitud de cambio de dominante: aparece un diálogo "¿Quieres tomar el control?" tanto en el espectador como en el dominante actual. Quien confirme primero (resuelto con una transacción atómica de Firestore sobre el campo `dominantDeviceId`) se convierte en el nuevo dominante; el otro pasa a espectador automáticamente.
15. Dado el modelo dominante/espectador, no hay conflicto real de "qué fuente gana": el dominante es siempre la fuente de verdad mientras lo es, y el AsyncStorage local solo importa para el dispositivo que actualmente ostenta el rol dominante (para sobrevivir cierres accidentales de ese mismo dispositivo).
16. **Sesión "zombie" expira a las 24 horas exactas** sin checkpoint nuevo (respuesta directa del creador, con algo de incertidumbre pero con este número concreto). Se resuelve de forma perezosa: el próximo cliente que consulte `activeStudySessionRef` y vea que pasaron 24h desde el último checkpoint, la cierra como `expired` (aplicando la regla del punto 2: solo se pierde el tramo en curso, los ciclos previos completados mantienen su tiempo efectivo).

## Confiabilidad técnica — sin costo monetario adicional (restricción dura, repetida explícitamente por el creador)

17. Se usa un **Development Build LOCAL** (`npx expo run:android` / `expo prebuild` + Android Studio/Gradle en la máquina del creador), **no EAS Build en la nube** (evita consumir cuota paga) y no Expo Go puro (por notificaciones locales confiables en background y `expo-document-picker`/audio personalizado). Esto se configura desde la Fase 4 (núcleo del timer).
18. El audio personalizado por dispositivo es una preferencia **local** (AsyncStorage), no sincronizada entre dispositivos en V1 — limitación aceptada; subir a Firebase Storage queda para V2 (y también evita costo de Storage en V1).

## Aclaraciones técnicas adicionales (revisión de productvt-eb sobre SPEC.md)

- **Ambigüedad del punto 2, ya resuelta**: ver punto 2 arriba — Gregorio confirmó directamente y de forma explícita (2026-09-05) que "bloque" se refiere al ciclo/tramo en curso dentro de la sesión, no a la sesión completa. No queda pendiente.
- **Retorno de `lunch_running`**: al activar el almuerzo desde cualquier estado activo (`study_running` o `break_running`), ese estado se guarda en `lunchReturnState` (campo ya previsto en ARCHITECTURE.md §11.4) y se restaura exactamente al terminar el almuerzo — sin recalcular ni saltar al siguiente ciclo.
- **Campos de persistencia de la sesión activa en Firestore** (no solo en el store local, necesarios para que cualquier dispositivo pueda resolver deadlines y la regla de zombie a 24h sin depender del dispositivo que originó la sesión): el documento de `activeStudySessionRef` debe incluir explícitamente `currentState` (estado de la máquina), `responseDeadlineAt` (deadline de la ventana de espera vigente, si aplica) y `lastCheckpointAt` (timestamp del último checkpoint escrito).
- **Banco de descanso — evitar doble conteo entre SPEC §17.5 y §17.6**: regla operativa única: al finalizar un ciclo de estudio, el descanso "ganado" (corto, o corto+largo cuando corresponde) se suma UNA sola vez al banco disponible de la sesión. Cualquier decisión posterior (saltar, tomar parcial, tomar completo) solo CONSUME de ese banco ya sumado; nunca se vuelve a sumar la parte "no usada" como si fuera un ingreso nuevo — lo no usado es simplemente lo que nunca se restó del banco.

## Alcance de plataformas — web es consulta/gestión, no ejecución del cronómetro (aplica SPEC §7.2, hallazgo de productvt-eb)

El navegador no puede sostener con confiabilidad un cronómetro en vivo con alarmas: los tabs no enfocados throttlean `setInterval`/`setTimeout`, el audio automático requiere gesto de usuario reciente, no hay Web Push sin Service Worker adicional (fuera del free tier de Firebase Hosting), y `react-native-web` no tiene paridad con `expo-audio`/`expo-notifications`/`expo-task-manager`. Aplicando la prioridad que ya fija SPEC §7.2 ("ante diferencias de fiabilidad, prioriza Android para las funciones más sensibles del cronómetro"):
- **Android es la única plataforma que puede ser dominante** (iniciar/accionar un bloque de estudio o temporizador inverso, con alarmas reales). La web **nunca** puede tomar el rol dominante en el modelo del punto 14 — sus controles de iniciar/accionar quedan deshabilitados.
- **Web puede ver el cronómetro activo en modo espectador** (mismo `onSnapshot` del modelo dominante/espectador), sin alarmas de audio propias.
- Calendario, estadísticas, categorías/presets/settings y metas funcionan igual en web (CRUD normal contra Firestore, sin depender de timers en background) — ahí no hay ninguna limitación.

## Autenticación

19. Se documenta aquí: el límite de ~100 usuarios sin verificar de Google Sign-In se acepta conscientemente por ser uso personal/muy reducido. No se debe iniciar un proceso de verificación de app con Google (evita costo/trámite innecesario).

## Personalización futura con imágenes

Se agrega desde ya un campo opcional `imageUrl?: string` en `Category` (y se deja previsto el mismo campo en `Preset`), aunque la UI de V1 no exponga todavía un selector de imagen. Esto evita una migración de datos rota cuando se implemente personalización con imágenes en el futuro.

## Proceso

20–24 (confirma v1, con más énfasis): no hay fase de mockup separada — se construye directamente un **prototipo funcional con código y compilación real**, lo más rápido posible, técnicamente sólido, sobre ARCHITECTURE.md e IMPLEMENTATION_PLAN.md, con **autoridad total para modificar/rediseñar** ambos documentos donde haga falta ("todo tiene que ser recreado y aplicado por ti ahora"). Orden de construcción: a criterio técnico (fundación → auth → timer → sesiones → categorías/presets → calendario → estadísticas → metas → pulido). El flujo ChatGPT + Gemini Code Assist queda reemplazado por completo: Claude Code ejecuta todo.

## Alcance — Galaxia de metas + Tienda (requerimiento nuevo, 2026-09-05)

Gregorio pidió en vivo a productvt-cb un sistema de visualización de metas/supermetas como galaxia de planetas interactiva (arrastrables, subgalaxias al hacer click, reset a layout default, fondo y skin de planeta personalizables — estilo graph view de Obsidian), conectado a una sección Tienda nueva (skins, fondos, colecciones de rachas, sistema de recompensas). Detalle completo, cita textual y preguntas abiertas en [nueva-funcionalidad-galaxia-tienda.md](nueva-funcionalidad-galaxia-tienda.md).

**Decisión de alcance (productvt-eb, como responsable de mantener SPEC.md coherente): queda marcado para V1.1, no entra en el V1/MVP actual.** Razones:
- Contradice o al menos tensiona el no-objetivo explícito de SPEC §3.3 ("no tendrá pagos, marketplace ni funcionalidades empresariales") hasta que se defina si la Tienda usa moneda real, virtual, o solo desbloqueo por rachas — sin esa definición no se puede ni empezar a diseñar sin riesgo de contradecir un no-objetivo ya acordado.
- Es una ampliación de producto grande por sí sola (UI de grafo interactivo + layout persistente + inventario + catálogo + mecánica de recompensas), comparable en esfuerzo al resto del sistema de metas, justo cuando el mandato repetido de Gregorio es "el prototipo funcional lo antes posible" empezando por el núcleo del cronómetro.
- Tiene 4 preguntas de producto sin responder (moneda de la tienda, qué define una supermeta, si el layout sincroniza entre dispositivos, si hay skins gratis por defecto) — construir antes de esas respuestas arriesga rehacer trabajo.
- No está contemplada en ninguna de las 11 fases del plan de implementación ya en curso; insertarla ahora reordenaría un build que todavía no llega ni a la Fase 4 (núcleo del timer).

**Única concesión ahora, para evitar migración rota en V1.1** (mismo patrón ya usado con `imageUrl?` en Category/Preset): al definir la entidad `WeeklyGoal`/goal en ARCHITECTURE.md, agregar desde ya un campo opcional `parentGoalId?: string` (jerarquía meta/supermeta) aunque la UI de V1 no lo use — así la meta simple de hoy es compatible sin cambios cuando se construya la galaxia. Recomendación para quien mantenga ARCHITECTURE.md (BC Orquestador Productvt).

Esto es una llamada de alcance/roadmap, no una regla de negocio ambigua — recomiendo que Gregorio confirme el "V1.1" explícitamente (podría querer priorizarlo antes de lo que yo asumo), pero no bloqueo el build actual mientras tanto.

**Actualización 2026-09-06**: productvt-90 ya fue mucho más allá de la concesión mínima — el modelo completo de supermeta quedó reconciliado (`docs/_brief-orquestador.md` §11: toda `WeeklyGoal` es una meta uniforme con `categoryId`+`targetSeconds` propios, sea hoja o supermeta; `parentGoalId` solo indica agrupación; Estadísticas por categoría es una agregación derivada, no la forma de almacenamiento), con ganchos de esquema completos (`skinId?`, `layouts/galaxy`, `inventory`) documentados en `02-DOMINIO.md`. Sigue siendo V1.1 salvo que Gregorio confirme V1 explícitamente (§10.11 del brief).

## Alcance — Calendario por capas (requerimiento nuevo, 2026-09-06)

Gregorio pidió en vivo a BC Orquestador un calendario con capas activables/desactivables (estilo "Mis calendarios" de Google Calendar): capas de meta (una por `WeeklyGoal`, implícita, filtra por su `categoryId` y muestra histórico completo, no solo la semana vigente) y capas personalizadas (`CalendarLayer`, agrupan por lista de categorías, ej. "Horario"). Amplía las vistas a 5 niveles (año/mes/semana/3 días/día, con franja horaria en día) y hace la vista por defecto configurable. Detalle completo en [nueva-funcionalidad-calendario-por-capas.md](nueva-funcionalidad-calendario-por-capas.md).

**A diferencia de Galaxia+Tienda, esta entra directo a V1** (no hay triage mío aquí, no lo necesitó): no está en la lista de no-objetivos de SPEC §3.3, no requiere resolver preguntas de producto pendientes (las 4 del documento fuente ya se resolvieron), y el build de código todavía no llega a la Fase de Calendario, así que no reordena nada ya construido. Ya resuelto y documentado en `docs/_brief-orquestador.md` §12 y `docs/02-DOMINIO.md` (entidad `CalendarLayer`, campo `WeeklyGoal.layerVisible?`). Sin objeciones de mi parte tras revisarlo contra las reglas de negocio ya fijadas.

## Convención de vocabulario — español de UI/documentos vs identificadores de código (propuesta de productvt-90, adoptada)

Los identificadores de código NO cambian (siguen como ya están commiteados: `StudySession`, `cyclesCompleted`, `StudySegment`, `cycleNumber`, etc.). Lo que sí se fija es el vocabulario en español que ve el usuario (copys de UI, textos de botones, documentos para humanos): Gregorio usa "bloque" para referirse al tramo de 25 min, no a la sesión completa — así lo dijo literalmente ("solo 1 vez cada 3 bloques", "se pierde el tiempo efectivo de ese último bloque", "un bloque más"), y es coherente con el mockup de frontend. Por lo tanto:
- En copys de UI y textos para el usuario: **"sesión"** = el `StudySession` completo (lo que arranca con el formulario inicial y termina completado/cancelado/expirado); **"bloque"** = cada tramo de estudio de ~25 min (`StudySegment`/ciclo en el código).
- Ejemplo concreto, **corregido el 2026-09-06** (mi edición anterior estaba mal — gracias a BC Orquestador por notarlo): el diálogo de cancelación sigue diciendo **"¿Cancelar sesión?"**, no "¿Cancelar bloque?". Cancelar (punto 1.b) sigue siendo una acción **terminal que termina la sesión completa** (`status: 'cancelled'`, no se puede seguir estudiando en esa misma sesión después) — lo único que cambió es cuánto `effectiveStudySeconds` se conserva al hacerlo (antes 0, ahora se conservan los bloques previos ya completados). El copy del cuerpo del diálogo sí puede aclarar eso: algo como "se pierde el tiempo del bloque en curso; los bloques anteriores ya completados se conservan". La sesión no "sigue viva" — termina igual que antes, solo cambia cuánto cuenta.
- Esta es una convención de copy/documentación, no un cambio de modelo de datos ni de arquitectura — no afecta nada ya commiteado en `src/domain/`.

## Robustez ante crash — checkpoints incrementales (punto de coherencia señalado por productvt-90)

Para que la regla del punto 2 (expirar pierde solo el ciclo en curso, los previos se conservan) funcione también si la app crashea a mitad de sesión, cada `StudySegment`/`BreakSegment`/`LunchSegment` completado debe escribirse al checkpoint de Firestore (`activeStudySessionRef` o su sub-estructura) en el momento en que se completa, no solo acumularse en memoria para materializarse recién al final de la sesión. Así, si el dispositivo crashea o se cierra, `ActiveTimerRecoveryService` puede reconstruir exactamente cuántos ciclos ya se completaron (y su tiempo efectivo) a partir de lo último persistido, sin depender de que el proceso llegue vivo al cierre de la sesión.

## Detalles técnicos menores, resueltos por defecto (productvt-eb, 2026-09-06 — para adelantar trabajo a Fase 4/6/9)

Hallazgos de severidad media/baja de revision-spec-beta.md que ya tienen resolución sensata sin necesitar a Gregorio. Marcados como default razonable — cualquiera puede objetar antes de que se implementen (Fase 4 del timer y Fase 6 del inverso todavía no arrancan):

- **Semana e inicio**: la semana empieza el **lunes** (ISO 8601) y la zona horaria de referencia para cerrar semanas/meses es `UserProfile.timezone` (ya existe en el perfil). Afecta `weekKey`, el cierre de semanas para la estrella anual y las comparaciones de período.
- **Las 4 transiciones desde `break_selection`** (SPEC §17.3 vs §15.3, antes solo 2 documentadas): `SKIP_BREAK` → `study_running` (con el descanso completo yendo al banco); `CHOOSE_BREAK_DEFAULT` → `break_running` (con el descanso sugerido del preset); `CHOOSE_BREAK_CUSTOM` → `break_running` (con `chosenSeconds` del banco disponible); `START_LUNCH` → `lunch_running` (si el cooldown de 3 bloques lo permite), guardando `lunchReturnState: 'break_selection'` para volver exactamente ahí al terminar.
- **Taxonomía de `breakType` para un descanso largo tomado parcialmente — corregido el 2026-09-06 según `docs/03-CRONOMETRO.md` §6.2 (productvt-90 refinó mi propuesta original, no la contradice)**: se clasifica como `'long'` solo si `usedSeconds === grantedSeconds` completo (se tomó TODO el descanso ganado en un ciclo de descanso largo); si se tomó cualquier cantidad parcial de ese mismo descanso largo ganado, se clasifica como `'custom'`. Mi propuesta original decía que bastaba con que el descanso *ofrecido* fuera el largo, sin importar cuánto se usara — la versión del canon es más precisa porque el criterio de tamaño para la ventana de respuesta (30s/10min) ya se decide aparte por `usedSeconds` real (punto 3), así que `breakType` puede reservarse para indicar fielmente si se aprovechó el descanso completo o no.
- **La ventana de expiración NO se pausa al abrir el panel de cancelación** (ya estaba en docs/_brief-orquestador.md §3.4 de productvt-90, se replica aquí como fuente compartida): si vence mientras el panel de cancelación está abierto, gana la expiración (con su misma regla de pérdida parcial del punto 2, no la del punto 1.b).
- **`InverseSession.status`, diferencia `cancelled` vs `interrupted`**: `cancelled` = el usuario tocó cancelar explícitamente (confirmación simple, sin doble confirmación — ya aclarado en docs/_brief-orquestador.md §3.5). `interrupted` = el temporizador inverso se cerró por una causa externa a una acción explícita de cancelar, la más probable siendo la exclusión mutua con una sesión de estudio que se inicia mientras el inverso corre (§3.5 de productvt-90, todavía marcada "pendiente de confirmar" — si se confirma que NO hay exclusión mutua, `interrupted` queda sin caso de uso claro y podría eliminarse del enum).
- **Recordatorio para Fase 9 (Metas)**: sigue pendiente agregar `parentGoalId?: string` a `WeeklyGoal` (ver sección "Alcance — Galaxia de metas + Tienda" arriba) — no está en el `weekly-goal.ts` ya commiteado todavía; no bloquea nada hoy, pero hay que acordarse en cuanto se toque esa entidad.

## Coordinación entre sesiones

Existe otra sesión de Claude Code (mockups/UX en 00-vision, 01-mockups; era "productvt-cb", **renombrada a "productvt-9b" el 2026-09-06 tras un reset de cuota**) trabajando en paralelo sobre la misma carpeta de organización pero **sin acceso directo a productvt-beta/**. La sesión BC Orquestador Productvt es la que construye el prototipo funcional real en `productvt-beta/`, siguiendo `docs/`. La sesión que mantenía este archivo era "productvt-eb", **renombrada a "productvt-7b"** el mismo día. Para evitar trabajo duplicado o contradictorio, la construcción de código de producción queda en una sola sesión a la vez. Nota: los nombres de sesión pueden volver a cambiar en futuros resets de cuota — usar `ListAgents` para confirmar el nombre vigente antes de enviar un mensaje de coordinación.

## v3 (2026-09-14) — Feedback del creador tras revisar los mockups interactivos

Fuente: revisión en vivo de Gregorio sobre la preview interactiva (`01-mockups/preview-app.html`, servida con tab bar sobre los mockups de `01-mockups/mobile/`). Mismo estatus que v2: **enmiendas con prioridad sobre todo el canon** hasta que se propaguen a `docs/` (instrucción literal del creador: "guarda todo lo que dije dentro de las especificaciones" — esta sección es esa captura íntegra; la propagación documento por documento queda pendiente, ver G). Se organizó en A–F por tema; nada se parafraseó en contra del texto original.

### A. Dominio y nomenclatura (estandarización)

A1. **Jerarquía canónica**: existen **Calendarios**, **Supermetas**, **Metas**, **Tareas** y **Eventos**. Los calendarios se ven como capas en la UI pero **se llaman calendarios** — no introducir "capa" como entidad de dominio separada.

A2. **Metas y supermetas NO se asocian a categorías**: se asocian a un calendario (capa de calendario).

A3. **Una meta puede estar asociada a más de una supermeta.**

A4. **Cada supermeta puede estar asociada a tareas y eventos.**

A5. **Eventos**: algo que ocurre **una sola vez**; puede ser atemporal o con fecha/hora definida; **no es recurrente**.

A6. **Tareas**: son **recurrentes**; se pueden definir atemporales o temporalmente en ciertos días y horarios con **repetición personalizada, igual que Google Calendar**. Cuando se define atemporalmente se le puede setear un **tiempo objetivo total** — insumo relevante para el funcionamiento de los bloques.

A7. **Antimeta**: al crear una supermeta existe por defecto un botón **"Antimeta"**. Al seleccionarla, no da puntaje ni nada de sus metas internas; constituye una "meta" que **solo tiene eventos atemporales** — es decir, existe como una **categoría invisible** que se puede seleccionar desde el **cronómetro inverso** para que el tiempo quede registrado.

A8. El **sistema de creación de tareas del mockup está defectuoso** y hay que corregirlo. La **nomenclatura general** se repasará con el creador en una pasada aparte para dejarla estandarizada (pendiente, ver G).

### B. Calendario (UI)

B1. La **visualización del calendario para computador está perfecta** (aprobada tal cual). Preocupación explícita del creador: **cómo se ajusta en celular** — resolver el responsive móvil.

B2. **Presionar fuera del popup/panel de crear evento debe cerrarlo por defecto** (comportamiento estándar de dismiss).

B3. **Presionar y arrastrar un evento debe poder moverlo** (drag & drop dentro del panel).

B4. **El día actual debe estar destacado en el panel.**

B5. Falta la **barra de continuidad** (indicador de "ahora") que mantenga el **seguimiento de la hora en la que se está** en las **vistas de 3 días y de 1 día**.

### C. Cronómetro — flujo de inicio por pasos y vínculo con metas

C1. Hoy el cronómetro **no está interconectado** con la creación de metas y tareas de las metas; pasa lo mismo con el mapa galaxia de la pantalla de inicio. Hay que conectarlos.

C2. **El inicio de una sesión se desglosa por pasos**:
   1. Primero se pregunta **si quieres usar un preset**. Si aprietas "sí", se abre una **lista de los presets creados** (teniendo **por defecto el Pomodoro clásico**); abajo un **"+"** que al apretarlo **desglosa el resto del panel** con las definiciones de bloque.
   2. **Ya no se pregunta por categoría arriba.** En su lugar: **listas desglosadas automáticas por supermeta** → al seleccionar la supermeta se muestran **sus metas** → se elige la meta → se pregunta **tarea o evento** → se muestran las opciones.

C3. **Todo bloque de estudio califica como evento o como tarea** — se elige al principio y cambian las opciones:
   - **Si es evento**: pregunta si es un **evento aparte** o si está **asociado a una meta en particular**. En caso de estar asociado, pregunta **respecto a qué evento de esa supermeta califica** y el usuario lo selecciona — el sentido es decir *"estoy cumpliendo este evento que estaba definido en mi meta y en mi calendario"*.
   - **Si es tarea**: permite seleccionar **respecto a qué tarea de qué meta** (obviamente preguntando primero la supermeta y desglosando desde esto) **atemporal** estás usando; **el tiempo se registra a esa tarea atemporal de esa meta en particular de forma exacta**.

C4. **Exceso sobre el objetivo**: si se supera el objetivo, **no se corta abruptamente el bloque** — simplemente queda un **exceso** que se refleja en las **estadísticas**; el **puntaje de ganancia se obtiene simplemente al llegar al tiempo necesario** (el exceso no lo escala).

C5. **El cronómetro inverso está bien** (aprobado). Único ajuste: la **antimeta** (A7) queda **seleccionable desde el cronómetro inverso** como categoría invisible.

### D. Bloques de cronómetro ↔ calendario

D1. **TODO bloque de cronómetro, al ser finalizado, se crea como cuadro en el calendario**, asociado al **calendario que se tenga vinculado**.

D2. **Por defecto**, si la supermeta —sea normal o antimeta— **no está asociada a ningún calendario**, se **crea uno propio con su mismo nombre**. En caso de estar linkeada, el cuadro se crea **dentro de ese calendario**.

D3. **Color**: el **color del calendario** es la máxima prioridad, **incluso superior al color de la supermeta**. Si el calendario se crea desde la supermeta por defecto, **ese sí nace con el color de la supermeta**, y el color afecta la **visualización dentro del propio calendario**.

### E. Galaxia (página de inicio)

E1. El **sistema de galaxias queda exclusivamente asociado a la creación de supermetas y metas**: cada supermeta es un **planeta** con sus **subramas conectadas** que son sus **metas** (mini-planetas).

E2. El **sistema de gravedad y vínculos** debe ser **igual en términos interactivos al de Obsidian con su Graph View**.

E3. La **proporción supermeta:meta en tamaño debe ser considerable**: desde la vista general las metas quedan **apenas visibles, casi como "estrellas"**.

E4. **El sistema planetario se ordena circularmente**: por defecto, en **orden de creación en sentido horario** (ese es el orden que se toma al apretar **"restablecer"**).

E5. **Arrastre de supermeta**: al arrastrar una supermeta se cambia su **posición relativa** respecto de las demás. Mientras se arrastra puede tomar **posiciones anómalas**, pero **al soltarla automáticamente queda en la nueva posición coordinada que tenga más sentido** y, al ser arrastrada, **empuja a las demás**.

E6. **Clic en una supermeta → pantalla completa**: se pasa a una vista donde **no se alcanzan a ver el resto de supermetas**; el **planeta ocupa la mitad de la pantalla** y se ven **las metas de esta super con mayor resolución y tamaño, orbitando el planeta central**.

E7. **Las posiciones en que quedan los planetas orbitando, en ambas vistas, quedan guardadas**, a menos que se apriete el **reseteo de la vista**.

E8. **Por defecto las antimetas no se muestran**; hay un **botón que permite hacerlas aparecer, bien pequeño**.

E9. El **botón "crear" está perfecto** — es solo un hotkey (sin cambios).

### F. Configuración y HUD

F1. Desde **Configuración** debe ser **visible la jerarquía de supermetas y metas**, que sea **editable** y permita **eliminar** también.

F2. **Ajustes y amigos** (HUD de la galaxia): **por ahora son solo decoración** (sin funcionalidad real).

### G. Pendientes de esta v3

1. ~~Mensaje truncado~~ **Resuelto 2026-09-14**: el mensaje del creador estaba completo; la instrucción era respaldar toda la lógica dentro de los archivos de especificaciones para que quede claro ante cualquier chat/IA — hecho vía enmiendas v3 en `docs/01-SPEC.md`, `02-DOMINIO.md`, `03-CRONOMETRO.md`, `07-CALENDARIO-ESTADISTICAS-METAS.md` y `10-GALAXIA-Y-TIENDA.md`.
2. ~~Pase de nomenclatura~~ **Resuelto 2026-09-14**: el creador confirmó que la nomenclatura ya fue entregada — es la definida en A1–A6 (cómo se llaman las funcionalidades: eventos, tareas, metas, supermetas, bloques, calendarios). Se adopta como estándar; corregir usos desviados donde aparezcan.
3. **Propagación a `docs/`**: esta v3 todavía no está absorbida por `01-SPEC.md`, `02-DOMINIO.md`, `03-CRONOMETRO.md`, `07-CALENDARIO-ESTADISTICAS-METAS.md` ni `10-GALAXIA-Y-TIENDA.md` — hacerla siguiendo el proceso del canal (registrar aquí primero, propagar después). Impacto esperado: nuevas entidades (Tarea/Evento/Antimeta), reemplazo de "categoría" por supermeta/meta en el flujo del cronómetro, bloques→calendario, galaxia tipo graph view.
4. **Mockups a rehagar**: calendario (B2–B5 + responsive B1), formulario del cronómetro (C2–C3), galaxia (E2–E8), creación de tareas (A8) y panel de jerarquía en configuración (F1). El cronómetro inverso (C5) y la visualización desktop del calendario (B1) quedan aprobados.

## v3.1 (2026-09-14) — segunda pasada del creador sobre los mockups v3

Fuente: revisión de Gregorio sobre los mockups v3 ya pulidos. Mismo estatus: enmiendas con prioridad sobre el canon. Organizado H (cronómetro), I (galaxia/inicio), J (configuración), K (colores y calendario).

### H. Cronómetro

H1. **Paso 1 no excluyente**: dos botones **cuadrados** tipo toggle — "Usar preset" y "Personalizar". Con el preset activo se muestra abajo la **lista de presets** + **"Crear nuevo preset"**. Con Personalizar activo se abre el **panel de personalización** (el mismo que lleva la redirección de crear preset).

H2. **Gestionar presets = botón "Editar"** (no obliga a salirse del cronómetro). Se puede cambiar de pestaña dentro del cronómetro y simplemente cambiarse; al volver al modo de selección por defecto **se descarta el progreso** del preset en creación (cambiarse a Inicio sí conserva lo que se llevaba — el descarte es solo dentro del cronómetro).

H3. **Pasos supermeta/meta/tarea con botones cuadrados** que **se vuelven transparentes a medida que se completan** y **se comprimen un poco** en tamaño.

H4. El botón final se llama **"Iniciar bloque"**, no "Iniciar sesión".

### I. Galaxia / Inicio

I1. Las metas (lunas) deben quedar **orientadas hacia abajo** de la supermeta, manteniendo la equidistancia entre ellas.

I2. El reordenamiento al soltar tras arrastrar debe ser una **animación fluida** — no teletransportes.

I3. Vista de supermeta única (foco): los planetas (metas) **no flotan en el aire**: orbitan **pegados al borde del gran planeta**, como asteroides o lunas.

I4. El **botón crear debe abrir un popup** con 3 opciones: **1) Crear supermeta/meta** (abre el popup en el lugar con el flujo completo: asociar a calendario, color — default: el del calendario al que la asociaste —, definición de tareas y subtareas, plazo), **2) Iniciar bloque** (simple redirección al cronómetro), **3) Crear evento de calendario** (redirección al panel de creación del calendario).

I5. Movimiento orbital **leve** en la vista de supermetas (buen detalle).

I6. **Plazo de cumplimiento** al crear: para **metas y supermetas**, con **máximo 1 año y mínimo 1 segundo**.

I7. **Indicador porcentual** arriba en la vista de supermeta: **% de tareas cumplidas del total planteado**. Una meta se cumple cuando **todas sus tareas y objetivos** se han cumplido; si llega la fecha límite sin acumular el objetivo (p. ej. estudiar 5 h/semana hasta cierta fecha), queda **"finalizada pero incompleta al x%"**.

I8. Título de la vista de supermeta: **solo el nombre de la supermeta** (editable con **mini lápiz**) y **el porcentaje al lado**, ambos como título; más un **botón de configuración** que redirige al panel de gestión pulido de supermetas y metas (J4).

### J. Configuración

J1. Al crear supermeta es **obligatorio el cuestionario**: primero preguntar **si pertenece a un calendario existente**, luego **elegir el color** de la supermeta.

J2. Al crear una meta: **elegir la supermeta** a la que pertenece (a menos que se presione "añadir" dentro de la propia supermeta) y también **elegir su color**.

J3. **Crear una supermeta obliga a asociarle como mínimo una meta**: si se crea supermeta, altiro se abre la creación de una meta dentro de esa supermeta; si se crea meta desde el despliegue inicial, se obliga a elegir a qué supermeta pertenece.

J4. **Panel de gestión pulido**: en la vista de supermeta de la galaxia, el botón de configuración redirige aquí. Cada meta y supermeta tiene un **lápiz al lado** que permite **volver al panel de creación de la misma**: moverla a otra supermeta, cambiar el color, nombre, etc.

J5. **Eliminar siempre con botón de confirmación**. **Eliminar supermeta mata todas las metas** que tenía. La **configuración de meta permite moverla a otra supermeta** (sin matarla).

J6. Gestión de calendarios: **crear y eliminar** (esto último chiquitito y con botón de confirmación) **desde el propio panel del calendario y también desde Configuración**.

### K. Colores y calendario

K1. **LAS CATEGORÍAS NO EXISTEN.** Se eliminan de todo (mockups, canon, código futuro): todo se gestiona en **metas y supermetas**. Lo único aparte son los **calendarios**, que funcionan aparte.

K2. Un calendario puede tener **conectada una o más supermetas** y puede crear **eventos** (con el sistema de colores de K3).

K3. **Sistema de 3 colores** en los eventos que aparecen en el calendario:
   1. **Color del bloque/evento** = color de la **meta** a la que pertenece.
   2. **Primera etiqueta** = color del **calendario**.
   3. **Segunda etiqueta** = color de la **supermeta**.
   Las etiquetas son **rallitas verticales paralelas al lado izquierdo del evento**, estilo Google Calendar. En los **eventos inversos es solo un color** para todo (se salta este sistema de etiquetas).

K4. **Panel de creación de evento del calendario** (similar al de Google Calendar, sobre la pantalla del calendario): permite definir un **evento o tarea recurrente o puntual** y **asociarlo a una supermeta y su meta concreta**; hay una **casilla chiquitita "Evento invisible"** que **desactiva por completo el resto de la personalización** (elegir meta y supermeta) pero **mantiene** horario, días y la posibilidad de que sea **recurrente semanalmente / cada dos semanas / cada X semanas con fecha de término concreta**.

K5. **Eventos invisibles**: eventos creados desde un calendario que no tienen nada que ver con metas/supermetas — **completamente invisibles** fuera del calendario, solo para efectos del calendario.
