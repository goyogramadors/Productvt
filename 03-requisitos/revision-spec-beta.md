# Revisión de SPEC.md (Productvt Beta) — v1 borrador

Fuente revisada: `spec (1).md` (aportado por el usuario, 2026-09-05). Documento **no final**.
Método: 5 revisores independientes en paralelo (consistencia interna, modelo de datos/FSM, reglas de negocio y edge cases, riesgos técnicos del stack, completitud para spec-kit) + 1 síntesis que verificó cada hallazgo contra el texto original antes de consolidar.

## Entendimiento del producto

Productvt Beta no es un Pomodoro genérico: es un sistema de disciplina de estudio modelado explícitamente como máquina de estados (`idle → study_running → study_completed_waiting_response → break_selection/break_running → ... → session_completed/cancelled/expired`), donde no responder dentro de una ventana obligatoria (30s tras el descanso, o hasta 10 min en otras esperas) hace perder toda la sesión, y cancelar exige doble confirmación de 15+15 segundos con una frase personalizada para dar "gravedad emocional" al abandono.

Su mecánica más distintiva es el **banco de descanso**: cada sesión acumula minutos de descansos saltados o no usados en su totalidad, que el usuario puede gastar después en descansos personalizados de cualquier valor entero (incluyendo 0 minutos) hasta el máximo disponible, más un botón de **Almuerzo** de 45 min que pausa la disciplina sin matar el bloque ni contar como banco ni como estudio efectivo.

Se complementa con un cronómetro inverso independiente para medir honestamente el tiempo de ocio (sin mezclarlo con el estudio), un calendario que distingue sesiones reales de "eventos invisibles" planificados (se ven pero no cuentan en estadísticas), snapshots históricos (`colorSnapshot`, `categoryNameSnapshot`, `presetSnapshot`) para que cambiar una categoría o preset no altere retroactivamente el histórico, y metas semanales por categoría con estrella anual gamificada. Corre sobre Expo/Firebase sin backend propio, priorizando Android y aceptando degradación en web, con sincronización que debe garantizar una sola sesión de estudio activa por usuario entre dispositivos.

---

## Hallazgos de severidad ALTA (bloquean o contradicen una regla crítica)

1. **§15.3/§18.3 — Retorno de `lunch_running` sin definir.** La transición `lunch_running -> previous valid continuation state` no dice a qué estado exacto se vuelve según el origen, ni existe campo tipo `stateBeforeLunch`. Tampoco se resuelve si se puede pedir almuerzo durante un descanso en curso o durante un `*_waiting_response` (riesgo: evadir la expiración obligatoria encadenando almuerzos), ni hay límite de usos. Contradice el mandato de §15 de que la FSM sea "explícita, no lógica informal dispersa".
   *Sugerencia:* tabular origen→destino, definir si `*_waiting_response` permite almuerzo, agregar `stateBeforeLunch`, fijar límite de usos por bloque.

2. **§22.2/§31.2/§41.4/§37.1 — Faltan campos de persistencia para recuperar sesión.** Ninguna entidad guarda el estado actual de la FSM ni un `responseDeadlineAt`. Sin eso no se puede implementar "recuperación tras cierre inesperado" (obligatorio en §31.2 y caso de prueba de §37.1), ni se define si la reconciliación usa reloj de servidor o del dispositivo.
   *Sugerencia:* agregar `currentState` y `responseDeadlineAt` al estado persistido; usar `serverTimestamp()` de Firestore para reconciliar.

3. **§31.3/§33(regla 10)/§42 — "Una sola sesión activa por usuario" sin mecanismo que la haga cumplir.** No hay documento singleton (`activeSession/current`) ni reglas de seguridad/transacciones. Sin Cloud Functions (excluidas por §6.3), dos dispositivos pueden crear sesión activa casi simultáneamente y violar la regla sin que nada lo detecte.
   *Sugerencia:* documento singleton por usuario + Security Rule que solo permita `create` si no existe (o `update` solo si coincide `deviceId`) vía `runTransaction` en cliente.

4. **§17.5 vs §17.6 — Doble conteo del banco de descanso.** §17.6 lista "descanso recién ganado al finalizar un ciclo" como algo que banca el total automáticamente, pero el resto de §17.6 y la lógica de §17.5 (máximo disponible = banco + descanso recién ganado) solo bancan la parte NO usada. Tal como está, se bancaría el total al ganarlo Y otra vez la parte no usada al gastarlo parcialmente.
   *Sugerencia:* eliminar o reformular ese cuarto punto de §17.6 para dejar claro que el banco solo recibe la parte no usada.

5. **§6.2/§15/§17.8/§19.3/§34.3 — Viabilidad de alarmas en background en Android.** Los timers de JS se detienen en background y Expo Go no soporta foreground services robustos; lograr que las alarmas suenen con la app cerrada exige un *development build* vía EAS con módulos nativos (`expo-notifications`, `expo-task-manager`), no declarado como requisito desde el día 1.
   *Sugerencia:* especificar notificaciones locales programadas al iniciar cada tramo, y documentar que se necesita development build (no Expo Go) desde el inicio.

6. **§2/§7.2/§34.2 — Riesgos reales de la versión web no cubiertos.** Los navegadores throttlean timers en pestañas no enfocadas, el audio automático requiere gesto de usuario reciente, no hay infraestructura Web Push sin Service Worker adicional, y `react-native-web` no tiene paridad con `expo-av`/`expo-notifications`/`expo-task-manager`. Pone en riesgo la promesa de §2 de que la app "funcione de forma confiable... también desde navegador".
   *Sugerencia:* especificar módulo por módulo qué degrada o se desactiva en web antes de comprometer el cronómetro web como parte de V1.

---

## Hallazgos de severidad MEDIA

| Sección | Problema | Sugerencia |
|---|---|---|
| §44 | "Sesión" no está en el glosario pero se usa como sinónimo de "Bloque" en varios sitios (FSM, §22, §20.4) | Agregar "Sesión" al glosario y aclarar su relación con "Bloque" |
| §12.2/§12.4/§22.2/§41.2/§41.4 | El resumen de entidades (§41) no coincide en nombres de campo con las secciones detalladas (`isArchived` vs `archived`, `sessionStatus` vs `status`, `categorySnapshot` genérico vs los snapshots explícitos exigidos) | Unificar nombres o marcar §41 como resumen no autoritativo |
| §41.6/§24.3/§24.5 | `InvisibleEvent` no define esquema de `recurrence` pese a ser obligatorio en V1, ni `color`; incluye `visibility flags` sin definir | Especificar esquema de recurrencia y `color`; definir o eliminar `visibility flags` |
| §21.3/§22.3 | El flujo del cronómetro inverso pide "definir duración objetivo" pero `InverseSession` no tiene campo para guardarla | Agregar `targetDurationSeconds` |
| §19.3 | No se dice qué ventana de expiración aplica a `study_completed_waiting_response`, y la "ventana genérica de 10 min" no tiene estado real de la FSM al que aplicarse | Indicar explícitamente qué ventana aplica y a qué estado(s) |
| §15.2/§22.2/§22.4 | El almuerzo se modela dos veces: `lunchSegments[]` propio, pero `breakSegments[]` también admite `breakType='lunch'` | Elegir una sola fuente de verdad |
| §22.2 | `customBreakSelections[]` nunca define su estructura interna; parece solaparse con `breakSegments[]` | Definir su esquema o eliminarlo |
| §20/§21/§22.3 | No está claro si la cancelación con doble confirmación aplica al temporizador inverso; tampoco la diferencia entre `cancelled` e `interrupted` en `InverseSession` | Aclarar ambos puntos |
| §15.3/§17.3 | `break_selection` solo tiene 2 transiciones definidas pero el panel ofrece 4 acciones (incluye "usar almuerzo" y "personalizado") | Enumerar las 4 transiciones explícitamente |
| §17.6/§17.7 | No hay fórmula general para sumar banco previo + descanso largo; no se define `breakType` para un descanso largo tomado parcialmente | Definir fórmula general y taxonomía |
| §22.1/§42 | `invisible_event_instance` (expansión de recurrencia) no tiene colección en la estructura de Firestore (§42) | Decidir si la expansión es client-side o necesita subcolección |
| §26.5 | La regla de estrella anual se cumple vacuamente en un mes sin ninguna meta configurada | Excluir explícitamente meses sin metas configuradas |
| §25/§26/§41.7 | No se define inicio de semana (lunes/domingo) ni zona horaria de referencia | Definirlo — afecta `weekKey`, estrella anual y comparaciones |
| §9.4/§28.2/§35.3 | Contradicción sobre si "audio propio del dispositivo" es V1 o V2 | Aclarar, dado su impacto en viabilidad del stack |
| §6/§19.3/§28 | Android 12+ (alarma exacta), Doze mode y app-killers de fabricantes pueden retrasar/cancelar alarmas — no mencionado en §34 | Documentar comportamiento real y avisar sobre optimización de batería |
| §2/§7.2/§35.1/§45 | El MVP y el checklist no distinguen qué es Android-only vs multiplataforma obligatorio | Definir explícitamente por plataforma |
| §18 | Sin límite de usos de almuerzo por bloque/día — permite encadenar 45 min sucesivos evadiendo la disciplina de §19 | Definir máximo de usos y/o cooldown |
| §17.8/§19/§20.3 | No se resuelve qué pasa si se abre cancelación durante una ventana `*_waiting_response` | Definir si se pausa el conteo y qué transición prevalece |
| §31.3/§21 | No se aclara si el temporizador inverso puede correr junto a una sesión de estudio activa, ni el flujo ante conflicto multi-dispositivo | Aclarar exclusión mutua y UX de conflicto |
| §6/§10/§30/§36/§42 | El documento mezcla las 3 capas de spec-kit (constitution/specify/plan) sin separarlas; §36 describe un proceso manual que spec-kit reemplaza, sin marcarlo obsoleto | Extraer stack (§6) y arquitectura (§30/§42) a un plan técnico separado; marcar §36 como histórico |

## Hallazgos de severidad BAJA

- **§9** — Menciona una "descripción original de 3 secciones" que no existe en ningún otro lugar del documento; quitar la referencia.
- **§10/§18/§44** — "Botón de almuerzo / pánico": "pánico" nunca se define ni se reutiliza; quitarlo o definirlo.
- **§26.3/§41.7/§43** — Meta semanal dice "segundos o minutos" pero la convención general y la entidad ya fijan segundos; alinear redacción.
- **§15.1/§15.3** — `paused_transient` es un estado fantasma (declarado, nunca descrito ni usado); falta también la transición trivial `session_completed/cancelled/expired -> idle`.
- **§41.6** — Línea suelta con el carácter "n" justo bajo el encabezado (resto de edición) — eliminar.
- **§43/§13.2/§41.3** — Los presets están en minutos pese a que §43 fija segundos como unidad base; aclarar que es una excepción intencional (input de usuario).
- **§4.1** — No se define modelo de distribución (privado vs Play Store), lo que condiciona requisitos legales.
- **§11** — Sin mención a privacidad, exportación de datos o borrado de cuenta pese a usar datos personales de comportamiento.
- **§47** — Definición de éxito puramente cualitativa, sin métricas de aceptación cuantificables.
- **§39/§44** — Sin definición de idioma/localización ni estándar de accesibilidad de referencia (ej. WCAG).
- **§8/§33/§46** — Tres listas separadas de principios/invariantes sin jerarquía única.
- **§6/§34** — Sin mención de límites/costos del plan gratuito de Firebase ni umbral de reevaluación del stack.

---

## Preguntas abiertas clave (resolver antes de dar el SPEC por final)

1. ¿Qué estado exacto de continuación recupera `lunch_running` según desde dónde se activó el almuerzo, y hay límite de usos por bloque?
2. ¿Qué ventana de expiración aplica exactamente a `study_completed_waiting_response` (30s o 10 min), y a qué estado(s) reales se aplica la ventana genérica de 10 min?
3. ¿El descanso recién ganado al terminar un ciclo se banca automáticamente entero, o solo la parte no usada tras la decisión del usuario? (§17.5 vs §17.6 se contradicen)
4. ¿Cómo se hace cumplir técnicamente "una sola sesión activa por usuario" entre dos dispositivos, sin backend propio ni Cloud Functions?
5. ¿"Bloque" y "Sesión" son sinónimos estrictos o capas de datos distintas?
6. ¿Es viable que las alarmas suenen con la app en segundo plano/cerrada usando Expo Go, o se necesita development build con módulos nativos desde el inicio?
7. ¿Qué día de la semana y qué zona horaria se usan para cerrar semanas (afecta metas, `weekKey` y estrella anual)?
8. ¿El producto se publicará en Play Store (público) o queda privado, y las "pocas cuentas adicionales" son independientes?

## Riesgos técnicos principales

1. Alarmas/ventanas obligatorias en background probablemente no son viables con Expo Go — requeriría development build desde el día 1.
2. La versión web tiene limitaciones reales no resueltas (throttling de timers, autoplay de audio, sin Web Push, sin paridad de `react-native-web`).
3. Sin mecanismo diseñado para "una sola sesión activa por usuario" entre dispositivos — riesgo real de condición de carrera.
4. Audio personalizado del usuario como sonido de notificación probablemente requiere módulo nativo, fuera de "Expo puro".
5. Android 12+/Doze/optimización de batería de fabricantes puede retrasar o cancelar alarmas silenciosamente.
6. Faltan campos de persistencia (estado FSM, deadline, duración objetivo del inverso) prerrequisito de la recuperación de sesión ya declarada obligatoria en V1.

## Recomendación de siguiente paso

Antes de correr `/speckit-specify` o `/speckit-plan` sobre este documento: resolver directamente en el SPEC los 6 hallazgos de severidad **alta** (retorno de `lunch_running`, campos de persistencia para recuperación de sesión, mecanismo de sesión única entre dispositivos, doble conteo del banco de descanso, y viabilidad técnica de alarmas en background en Android y en web). En paralelo, extraer el stack tecnológico (Cap. 6) y la arquitectura de carpetas/Firestore (Cap. 30/42) a un documento de plan separado, y correr `/speckit-constitution` para consolidar en un único bloque las reglas de las secciones 8, 33 y 46 antes de generar los requisitos funcionales formales.
