# 00 — Índice, orden de lectura y trazabilidad

## Propósito

Este documento es la puerta de entrada a `docs/`: dice qué es cada uno de los once documentos del canon (00 a 10), en qué orden leerlos según quién los lee, qué significa cada término en español frente al identificador de código correspondiente, qué preguntas siguen abiertas en el conjunto completo del canon (con su default ya aplicado), y dónde quedó resuelto cada hallazgo ALTO y MEDIO de la revisión externa del SPEC v1. No define ninguna regla de negocio, tipo ni algoritmo nuevo — es un mapa y un registro, no una fuente de reglas. Cuando este documento cita un número o una regla de otro documento, lo hace para orientar la lectura, nunca como afirmación autoritativa: ante cualquier discrepancia, gana el documento citado, no este índice.

El destinatario principal es cualquier sesión que necesite orientarse en el canon sin releer los diez documentos completos: la sesión `BC Orquestador Productvt` retomando el build tras un corte de contexto o un reset de cuota (§3), la sesión `productvt-7b` verificando que un hallazgo de `03-requisitos/revision-spec-beta.md` quedó resuelto (§6), la sesión `productvt-9b` ubicando qué documento fija un token visual o un flujo de pantalla (§3), y el creador confirmando o corrigiendo un supuesto pendiente (§5).

## Fuentes

Este documento no tiene un orden de autoridad propio distinto del resto del canon — es un índice, así que su única fuente es **la existencia y el contenido actual de cada documento que indexa**. Donde resume una regla (glosario §4, supuestos §5, trazabilidad §6), cita el documento y la sección exactos; no reinterpreta ni añade matices que esos documentos no digan ya. Documentos indexados, en el orden en que se citan a lo largo de este índice:

1. `docs/01-SPEC.md` a `docs/10-GALAXIA-Y-TIENDA.md` (los diez documentos de producto/técnicos ya completos, §2).
2. `_brief-orquestador.md` (brief transversal, con el anexo de respuestas literales del creador `R1`..`R25`) y `03-requisitos/decisiones-tomadas.md` v2 (`D <sección/punto>`) — la interpretación validada de esas respuestas; ambos son la autoridad de negocio que los diez documentos ya citan, no un contenido que este índice repita.
3. `03-requisitos/revision-spec-beta.md` (hallazgos `REV-ALTA-n`/`REV-MEDIA-<fila>`/`REV-BAJA-<fila>` de la revisión externa del SPEC v1) — fuente única de §6.
4. `03-requisitos/matriz-degradacion-plataformas.md`, `03-requisitos/nueva-funcionalidad-calendario-por-capas.md`, `03-requisitos/nueva-funcionalidad-galaxia-tienda.md`, `03-requisitos/nueva-funcionalidad-rachas-logros-sincronizacion.md`, `03-requisitos/preguntas-para-el-creador.md` — insumo de decisión ya absorbido por los documentos de `docs/` que este índice mapea (§1, §2).
5. Código commiteado y en curso en `productvt-beta/src/**` (`CODE`, explorado con `Glob`/`git log`/`git status`): verdad para el estado real de fases del build (§1, §3) — verificado el 2026-09-06 (6 commits, `01019c7` es la última fase cerrada; cambios sin commitear de la Fase 4b ya en curso: `clock-offset.ts`, `dominant-handoff-dialog.tsx`, `useDominantHandoff.ts`, `firestore.rules`/`firestore.indexes.json`/`firebase.json`, `ActiveSessionRecoveryService.ts` reemplazando a `ActiveTimerRecoveryService.ts`).
6. `01-mockups/**` y `00-vision/**`: insumo visual/UX, citado en §1 y §3, nunca fuente de modelo de datos o reglas de negocio.
7. `docs/originales/{SPEC,ARCHITECTURE,IMPLEMENTATION_PLAN}-v1.md` y `PROMPT-INICIAL.txt`: punto de partida histórico, citado solo en §1; superado en su totalidad por `docs/01-10`.

## 1. Qué es este documento y cómo se relaciona con el resto del proyecto

`docs/` es el **canon**: la única versión autoritativa de qué construye Productvt Beta y cómo. No es el único material del proyecto — conviven cuatro carpetas más, cada una con un rol distinto y sin autoridad para contradecir a `docs/`:

- **`03-requisitos/`** es el canal de decisiones crudas: las 24+1 respuestas literales del creador (citadas en el anexo de `_brief-orquestador.md`), su interpretación validada (`decisiones-tomadas.md`), la revisión externa del SPEC v1 (`revision-spec-beta.md`), la matriz de degradación por plataforma (`matriz-degradacion-plataformas.md`) y los requerimientos nuevos pedidos en vivo (calendario por capas, galaxia+tienda, rachas/logros). `docs/` no repite ese contenido — lo absorbe, lo resuelve y lo cita por etiqueta (`R<n>`, `D <punto>`, `REV-ALTA-n`). Cuando `03-requisitos/` y `docs/` parecen decir cosas distintas, gana `docs/` si ya absorbió esa decisión (lo normal); si `docs/` todavía no la absorbió, `03-requisitos/` sigue siendo la fuente pendiente de trasladar (ver §7, protocolo de cambios).
- **`docs/originales/`** (`SPEC-v1.md`, `ARCHITECTURE-v1.md`, `IMPLEMENTATION_PLAN-v1.md`, `PROMPT-INICIAL.txt`) es el punto de partida histórico del proyecto, **no** fuente de verdad: cada documento de `docs/01-10` lo cita por sección solo cuando corrige o reemplaza una regla concreta (p. ej. "corrige SPEC v1 §17.5/§17.6"), nunca como autoridad vigente. Ninguna sesión debe leerlo completo — los propios documentos de `docs/` indican qué rango de líneas leer cuando hace falta contexto histórico.
- **`01-mockups/`** (`mobile/{cronometro,calendario,estadisticas,inicio}.html`, `desktop/{galaxia-metas.html,decisiones-visuales-galaxia.md}`, `design-system/`) y **`00-vision/`** son exploración visual y de producto hecha por la sesión `productvt-9b`: fuente de tokens de diseño, flujo de pantalla y decisiones visuales (`06-DISENO-UI.md`, `10-GALAXIA-Y-TIENDA.md` los citan explícitamente), **nunca** de modelo de datos ni de reglas de negocio — son prototipos de navegador con `localStorage` como demo, no código de producción (`06-DISENO-UI.md` §17 detalla explícitamente qué no se adopta de ellos).
- **`productvt-beta/`** es el código real. `src/domain/**` y `src/infrastructure/firebase/collections.ts` son la **verdad para nombres de tipos y campos** ya commiteados: donde el código as-built sea sano y solo difiera en nombre o forma de guardar respecto de un documento, el canon adopta lo construido; donde el código contradiga una decisión del creador, se corrige el código, no el documento (regla de gobierno del brief, citada literal en la §Fuentes de cada documento de `docs/`).

### Gobierno vigente (brief, "Gobierno", 2026-09-06: *"tú eres el líder"*)

| Sesión | Rol | Ámbito |
|---|---|---|
| `productvt-90` | Lidera planificación, arquitectura y canon | Escribe y mantiene `docs/` — incluido este índice |
| `BC Orquestador Productvt` | Construye el código | `productvt-beta/`, siguiendo `docs/` al pie de la letra; **4 de 13 fases commiteadas** (1 Fundación, 2 Autenticación, 3 Categorías/presets/ajustes, 4a Núcleo del cronómetro — commits `4420909`/`51fbcfa`/`9f4ce68`/`01019c7`); **Fase 4b (sincronización multi-dispositivo) en curso**, sin commitear a la fecha de este índice (`08-PLAN-IMPLEMENTACION.md` §2, §4, §8.2) |
| `productvt-7b` (antes `productvt-eb`) | Mantiene `03-requisitos/` | Canal de decisiones — registra respuestas del creador, corre revisiones externas, documenta requerimientos nuevos antes de que entren al canon |
| `productvt-9b` (antes `productvt-cb`) | Produce mockups/UX | `00-vision/`, `01-mockups/`, sin acceso directo a `productvt-beta/` |

Los nombres de sesión pueden volver a cambiar tras un reset de cuota (ya ocurrió una vez, el mismo 2026-09-06): usar `ListAgents` para confirmar el nombre vigente antes de enviar un mensaje de coordinación entre sesiones (`decisiones-tomadas.md`, "Coordinación entre sesiones").

### Regla de una sola sesión de producción a la vez

Solo `BC Orquestador Productvt` construye código en `productvt-beta/src` en un momento dado (`08-PLAN-IMPLEMENTACION.md`, Principio 8). Cualquier otra sesión que necesite tocar código de producción coordina antes por mensaje directo — nunca en paralelo sin avisar.

## 2. Mapa de documentos (00–10)

| # | Documento | Propósito en una frase | Consumidor principal | Depende de |
|---|---|---|---|---|
| 00 | **Índice, orden de lectura y trazabilidad** (este documento) | Mapa de `docs/`, glosario consolidado, registro de supuestos abiertos y de hallazgos resueltos | Cualquier sesión que se orienta en el canon | Los diez documentos siguientes + `03-requisitos/` |
| 01 | **`01-SPEC.md`** — Especificación de producto | Qué construye la app, para quién, requisitos funcionales con criterio de aceptación, no-objetivos, alcance por versión, definición de éxito | Todos: primera lectura de producto para cualquier audiencia | `_brief-orquestador.md`, `decisiones-tomadas.md`, `revision-spec-beta.md` §11 |
| 02 | **`02-DOMINIO.md`** — Dominio, modelo de datos y convenciones | Glosario canónico, interfaces TypeScript, invariantes, esquema Firestore completo (`firestore.rules` incluidas), convenciones de tiempo/nombres | BC en toda fase que toque una entidad; 03/04/05/06/07/09/10 lo citan constantemente | 01-SPEC, `CODE` (`src/domain/**`) |
| 03 | **`03-CRONOMETRO.md`** — Máquina de estados del cronómetro | Los 10 `TimerStateName`, tabla completa de transiciones, ventanas de respuesta, banco de descanso, almuerzo, cancelación, expiración/zombie, temporizador inverso, matriz de 42 casos de prueba | BC Fase 4 (núcleo del cronómetro); 04, 05, 06 citan su máquina de estados | 02-DOMINIO |
| 04 | **`04-SINCRONIZACION.md`** — Sincronización multi-dispositivo | Protocolo dominante/espectador, primitiva exacta de Firestore por escritura, `clockOffset`, cierre perezoso sin doble ejecución, `ActiveSessionRecoveryService`, casos límite, costo | BC Fase 4b (en curso); 05 lo cita para la matriz de degradación | 02-DOMINIO, 03-CRONOMETRO |
| 05 | **`05-ARQUITECTURA.md`** — Arquitectura técnica | Árbol de carpetas definitivo, capas y contratos entre ellas, matriz de degradación funcional por plataforma, dependencias con versión exacta, errores tipados, estrategia de testing | BC en toda fase (estructura de código); resuelve REV-ALTA-5/6 y REV-MEDIA-15 | 02-DOMINIO, 03-CRONOMETRO, 04-SINCRONIZACION, `matriz-degradacion-plataformas.md` |
| 06 | **`06-DISENO-UI.md`** — Sistema de diseño y pantallas | Tokens + skins + `AssetRegistry`, skin "Papel" completo, layout responsive, inventario de componentes, especificación pantalla por pantalla (incluido Calendario por capas), copys en español | BC Fase 7 en adelante y Fase 10 (Pulido); `productvt-9b` para coherencia visual | 02-DOMINIO, 03-CRONOMETRO, 04-SINCRONIZACION, mockups |
| 07 | **`07-CALENDARIO-ESTADISTICAS-METAS.md`** — Algoritmos de calendario, estadísticas y metas | Resolución de capas del calendario, agregadores de estadísticas (incluida la racha de estudio), fórmulas de metas y estrella mensual, matriz de 26 casos de prueba (Q1-Q26) | BC Fases 7, 8 y 9 | 01-SPEC, 02-DOMINIO, 03-CRONOMETRO |
| 08 | **`08-PLAN-IMPLEMENTACION.md`** — Plan de 13 fases | Estado real del repositorio, Definición de Hecho, objetivo/archivos/criterios/tests/riesgos de cada una de las 13 fases, cómo retomar el build desde otra sesión | BC en cada fase — es el documento que se abre primero al retomar el build | Todos los anteriores |
| 09 | **`09-SETUP-Y-OPERACION.md`** — Setup y operación a costo cero | Qué activar/no activar en Firebase Spark, Auth, Firestore (reglas/índices desplegados), development build local de Android, notificaciones en segundo plano, despliegue de la PWA, cuotas, respaldo manual, troubleshooting | BC en la Fase 4 (primer development build) y Fase 11 (verificación final); el creador para operar el proyecto | 02-DOMINIO §5, 04-SINCRONIZACION §11-12, 05-ARQUITECTURA §6 |
| 10 | **`10-GALAXIA-Y-TIENDA.md`** — Galaxia de metas y Tienda (V1.1) | Racha/logro consumidos (no redefinidos), catálogo estático de la Tienda, layout por defecto y física de arrastre, vistas galaxia/subgalaxia, 15 casos de prueba | BC Fase 12 (futuro, V1.1) | 01-SPEC, 02-DOMINIO, 06-DISENO-UI, 07 (racha) |

Nota de fusión editorial: `02-DOMINIO.md` §3.6 nombra dos documentos futuros (`07-CALENDARIO-Y-ESTADISTICAS.md` y `08-METAS.md`) que terminaron fusionándose en un solo archivo, `07-CALENDARIO-ESTADISTICAS-METAS.md` (decisión del orquestador, señalada en la propia introducción de ese documento) — esa cita de `02-DOMINIO.md` sigue siendo válida, apunta a las secciones 1–3 del 07 real.

## 3. Orden de lectura por audiencia

### 3.1 `BC Orquestador Productvt` retomando el build (caso más frecuente)

Sigue el protocolo completo de `08-PLAN-IMPLEMENTACION.md` §18 ("Cómo retomar desde otra sesión"); en términos de qué leer y en qué orden:

1. `08-PLAN-IMPLEMENTACION.md` §4 (tabla resumen de las 13 fases) para ubicar la fase actual, y `git log --oneline` + `git status` sobre `productvt-beta/` para confirmar el estado real (puede haber avanzado desde la última vez que se leyó este índice).
2. La sección completa de esa fase en `08-PLAN-IMPLEMENTACION.md` (objetivo, archivos, dependencias, criterios de aceptación).
3. `02-DOMINIO.md` §1 (glosario) y las secciones de esa fase que la tabla de §2 de este índice señale como dependencia.
4. `03-CRONOMETRO.md`/`04-SINCRONIZACION.md`/`07-CALENDARIO-ESTADISTICAS-METAS.md` según la fase — nunca se repiten en `08-PLAN-IMPLEMENTACION.md`, así que retomar sin leerlos deja huecos.
5. `05-ARQUITECTURA.md` §3 (árbol de carpetas) y §10 (tabla de mapeo español/código) para cualquier nombre de archivo/carpeta que no esté ya as-built.
6. `npx vitest run` dentro de `productvt-beta/` para confirmar el estado real de la matriz de tests antes de asumir que un caso sigue en rojo o en verde.

### 3.2 Qué debe leer BC antes de la Fase 7 (Calendario por capas)

La Fase 7 es la primera en construirse **después** de que el requerimiento de calendario por capas entrara al canon (2026-09-06, con el build todavía en la Fase 4b) — no hay nada que migrar, pero sí una lista de lectura más larga de lo habitual porque el modelo quedó repartido en cuatro documentos distintos:

1. `_brief-orquestador.md` §12 ("Calendario por capas") — el requerimiento resuelto en una sola sección, con las 4 preguntas originales ya cerradas.
2. `02-DOMINIO.md` §2.6 y §3.3 (bloque `calendar-layer.ts`, líneas ~504-531) — la entidad `CalendarLayer` completa y el campo `WeeklyGoal.layerVisible?`, ya as-built en el documento (no en el código todavía).
3. `03-requisitos/nueva-funcionalidad-calendario-por-capas.md` — el requerimiento original con sus 4 preguntas abiertas, útil solo para ver qué quedó resuelto y cómo (§12 del brief ya las resuelve; este archivo no aporta nada que el brief no repita).
4. `07-CALENDARIO-ESTADISTICAS-METAS.md` §1 completo — el algoritmo real: `resolveGoalLayers`/`resolveCustomLayers` (§1.2), `assembleCalendarLayers` (§1.3), expansión de recurrencia (§1.4), las 5 vistas y `CalendarViewMode` (§1.5, incluido el literal `'3day'` ya unificado entre 05/06/07), franja horaria de la vista Día (§1.6), y la matriz de 14 casos de prueba de calendario (§6.1, Q1-Q14).
5. `05-ARQUITECTURA.md` §3.2 (firmas completas de `CalendarLayerRepository`) y §6.4 ("El calendario es la excepción: primario en ambas plataformas" — sin restricción de `canBeDominant`).
6. `06-DISENO-UI.md` §11 completo (Pantalla: Calendario por capas) — vistas, panel "Mis capas", densidad de la vista Semana, vista por defecto configurable; es la única pieza de UI/densidad visual que ningún otro documento resuelve (§1.4 punto 4 del brief lo deja explícito: "la densidad es un problema de UI, no del esquema").
7. `08-PLAN-IMPLEMENTACION.md` §11 (Fase 7 completa: archivos exactos a crear, dependencias, criterios de aceptación, riesgos) — es la sección que consolida las seis lecturas anteriores en un plan de trabajo.
8. Brecha pendiente a verificar antes de empezar: `08-PLAN-IMPLEMENTACION.md` §7 señala que `Category.parentId?` (subcategorías) y el archivado seguro (I-14) siguen sin implementar desde la Fase 3 — no bloquea la Fase 7 en sentido estricto (`categoryIds[]` de una `CalendarLayer` acepta una lista plana igual sin jerarquía), pero conviene cerrarla antes si la UI de capas va a exponer jerarquía de categorías.

No existe todavía un mockup de calendario por capas en `01-mockups/` (`06-DISENO-UI.md` §11 y `08-PLAN-IMPLEMENTACION.md` §11 lo señalan como brecha de insumo, no como bloqueo) — `01-mockups/mobile/calendario.html` es el mockup del calendario plano anterior a este requerimiento, útil solo como precedente de densidad visual (puntos "+N más"), no como fuente de las capas.

### 3.3 Alguien nuevo entendiendo el producto de punta a punta

`01-SPEC.md` §1-§3 (visión, principios, no-objetivos) → `02-DOMINIO.md` §1-§2 (glosario y modelo conceptual, sin entrar a las interfaces TypeScript) → `06-DISENO-UI.md` §1 (filosofía visual) → `01-mockups/mobile/cronometro.html` en el navegador, como referencia visual. De ahí en más, cada sección de `01-SPEC.md` §6 remite al documento técnico correspondiente si hace falta más detalle.

### 3.4 `productvt-7b`, manteniendo `03-requisitos/`

`decisiones-tomadas.md` y `_brief-orquestador.md` (para no proponer una resolución que el canon ya fijó) → `revision-spec-beta.md` → este índice §6 (para confirmar dónde quedó cada hallazgo antes de reabrir uno como pendiente) → §5 (para ver qué preguntas siguen genuinamente abiertas y no proponer una nueva pregunta sobre algo ya resuelto).

### 3.5 `productvt-9b`, produciendo mockups/UX

`_brief-orquestador.md` §8 (sistema de diseño) y §12/§12.5 (calendario por capas, 5 pestañas confirmadas) → `06-DISENO-UI.md` completo (es el documento que formaliza lo que los mockups exploran) → `10-GALAXIA-Y-TIENDA.md` si el trabajo toca la Galaxia. `06-DISENO-UI.md` §17 ("Qué NO se adopta de los mockups") es lectura obligatoria antes de asumir que algo de un mockup pasa literal al canon.

### 3.6 El creador, revisando o confirmando decisiones

`01-SPEC.md` §1-§3 y §9 (qué hace la app y en qué versión) → este índice §5 (tabla consolidada de supuestos, la forma más rápida de ver todo lo que espera una respuesta suya en un solo lugar) → el documento específico citado en la fila del supuesto que le interese resolver.

## 4. Glosario y tabla de mapeo español/código

Regla de oro, obligatoria en todo documento del canon y en todo copy de la app (`_brief-orquestador.md` §1; `02-DOMINIO.md` §1): en español —UI y documentos para humanos— **"sesión"** es la corrida completa (`StudySession`, desde "Iniciar" hasta que se completa, cancela o expira) y **"bloque"** es cada tramo de estudio de ~25 min dentro de ella. **La palabra "ciclo" no se usa nunca en español**, aunque el código ya commiteado use `cycleNumber`/`cyclesCompleted`/`cyclesBeforeLongBreak` para el bloque — esos identificadores no se renombran, y en código nunca se introduce `block`/`Block` como identificador nuevo para el tramo (evita dos nombres para lo mismo). Definiciones precisas con ejemplos numéricos: `02-DOMINIO.md` §1.2.

### 4.1 Tabla de mapeo — modelo de datos

Copiada de `02-DOMINIO.md` §1.1 (fuente única; esta tabla no la reinterpreta, solo la reproduce para consulta rápida):

| Término en español (UI/docs) | Identificador en código | Dónde vive |
|---|---|---|
| Sesión | `StudySession`, `ActiveStudySession`, `activeSession` | `sessions/{sessionId}` (cerrada), `active/session` (en curso) |
| Bloque (tramo de estudio) | `StudySegment`, `cycleNumber`, `cyclesCompleted`, `cyclesSinceLunch`, `Preset.cyclesBeforeLongBreak` | `StudySession.studySegments[]`, `ActiveStudySession` |
| Descanso | `BreakSegment` (`breakType`: `short`/`long`/`custom`/`skipped`) | `StudySession.breakSegments[]` |
| Elección de descanso personalizado | `CustomBreakSelection` | `StudySession.customBreakSelections[]` |
| Almuerzo | `LunchSegment` (con `returnState`), `stateBeforeLunch` | `StudySession.lunchSegments[]`, `ActiveStudySession` |
| Banco de descanso | `bankRemainingSeconds`, `BreakSegment.bankDeltaSeconds` | `StudySession`, `ActiveStudySession` |
| Tiempo efectivo | `effectiveStudySeconds` | `StudySession`, `ActiveStudySession` |
| Ventana de respuesta | `responseDeadlineAt` | `ActiveStudySession` |
| Bloque inverso | `InverseSession`, `ActiveInverseSession` | `sessions/{sessionId}` con `type: 'inverse'`, `active/session` |
| Evento invisible | `InvisibleEvent`, `WeeklyRecurrence` | `events/{eventId}` |
| Meta semanal / supermeta | `WeeklyGoal`, `parentGoalId` | `goals/{goalId}` |
| Capa de calendario personalizada | `CalendarLayer` | `calendarLayers/{layerId}` |
| Capa de calendario de meta (virtual, sin documento propio) | `WeeklyGoal.layerVisible?` | `goals/{goalId}` (mismo documento de la meta) |
| Dominante / Espectador | `dominantDeviceId`, `DeviceRole` | `active/session` |
| Checkpoint | `lastCheckpointAt` | `active/session` |

### 4.2 Tabla de mapeo — arquitectura de código

Copiada de `05-ARQUITECTURA.md` §10 (fuente única), términos que solo aparecen al hablar de la estructura de carpetas, no del modelo de datos:

| Término en español | Identificador en código | Dónde vive |
|---|---|---|
| Repositorio | `<Agregado>Repository` (módulo de funciones, no clase) | `src/repositories/<agregado>/<agregado>Repository.ts` |
| Coordinador | `StudySessionCoordinator.ts`, `InverseSessionCoordinator.ts`, `ActiveSessionRecoveryService.ts`, `ControlHandoverService.ts` | `src/application/coordinators/` |
| Capa de dominio / dominio puro | `src/domain/**` | Sin React/Firebase/APIs de dispositivo |
| Adaptador de plataforma | `infrastructure/<módulo>/<módulo>Service.ts` + `.web.ts` | `src/infrastructure/{notifications,audio,storage,device}/` |
| Rol del dispositivo | `DeviceRole` (`'dominant' \| 'spectator'`) | `src/domain/entities/active-session.ts` |
| Cierre perezoso (ventana vencida / zombie) | `closeLazySessionIfDue` | `src/domain/rules/close-lazy-session.ts` |
| Vista del calendario (año/mes/semana/3 días/día) | `CalendarViewMode` (literal de 3 días: `'3day'`, unificado entre 05/06/07) | `src/domain/entities/user-profile.ts` / `UserSettings.defaultCalendarView?` |
| Modelo de vista / vista armada para pantalla | `<Pantalla>ViewModel` | `src/features/<feature>/` |
| Ensamblador | `<feature>Assembler.ts` (función, no clase) | `src/features/<feature>/services/` |
| Sistema de diseño / tokens | `src/design/tokens.ts`, `src/design/skins/<skin>.ts` | `src/design/` |
| Registro de assets | `AssetRegistry` | `src/design/asset-registry.ts` |
| Resultado exitoso/fallido tipado | `Result<T, E>` / `AsyncResult<T, E>`, `ok()`/`err()` | `src/types/common.ts` |

### 4.3 Glosario mínimo, sin identificador de código (conceptos transversales)

| Término | Significado breve | Documento que lo define completo |
|---|---|---|
| Dominante / Espectador | Roles de los dispositivos de un mismo usuario frente al cronómetro activo; solo Android puede ser dominante en V1 | `04-SINCRONIZACION.md` §4-§5 |
| Color vivo | Todo lo pintado resuelve color y nombre por `categoryId` contra la categoría vigente, nunca desde un snapshot histórico | `02-DOMINIO.md` §1.2 (fila "Color vivo") |
| Capa de calendario | Filtro/interruptor de visibilidad sobre el calendario (de meta, virtual, o personalizada); nunca aporta color propio | `07-CALENDARIO-ESTADISTICAS-METAS.md` §1 |
| Racha de estudio | Días consecutivos con ≥1 bloque completado, agregador derivado sin campo cacheado | `07-CALENDARIO-ESTADISTICAS-METAS.md` §2.7 |
| Estrella mensual | Recompensa del mes solo si hubo ≥1 semana cerrada con metas y todas se cumplieron | `07-CALENDARIO-ESTADISTICAS-METAS.md` §3.3 |
| Supermeta | `WeeklyGoal` referenciada por al menos otra vía `parentGoalId`; forma de dato idéntica a cualquier meta hoja | `10-GALAXIA-Y-TIENDA.md` §2 |
| Skin "Papel" | Skin visual base de la app: paleta, Fraunces/Archivo/IBM Plex Mono | `06-DISENO-UI.md` §4 |

## 5. Supuestos pendientes de confirmar — registro consolidado de todos los documentos

Ningún supuesto de esta tabla bloquea la implementación: cada documento de origen ya aplicó un default razonable y describe el punto exacto de cambio si el creador decide distinto. Los numerados del 1 al 11 siguen la numeración de `_brief-orquestador.md` §10 (cross-documento, aparecen citados igual en varios documentos); del 12 en adelante son supuestos propios de un solo documento, agrupados por dónde viven.

### 5.1 Supuestos transversales (brief §10, citados en 2 o más documentos)

| # | Pregunta | Default asumido | Documento(s) que lo aplican |
|---|---|---|---|
| 1 | Umbral de 30 min para elegir ventana de 30 s vs. 10 min | Tramo ≤ 30 min → 30 s; tramo que da paso a descanso largo (o el propio descanso largo) → 10 min, independiente del tamaño (`LARGE_SEGMENT_THRESHOLD_SECONDS = 1800`) | 01-SPEC §Supuestos #1; 03-CRONOMETRO §Supuestos #1 |
| 2 | Almuerzo disponible desde el inicio de la sesión y luego cada 3 bloques | `isLunchAvailable = !lunchUsed \|\| cyclesSinceLunch ≥ 3` (`LUNCH_COOLDOWN_CYCLES = 3`) | 01-SPEC §Supuestos #2; 03-CRONOMETRO §Supuestos #2 |
| 3 | Tope del inverso = `2·T` (R4 dice literalmente "un bloque más desde el punto actual") | `INVERSE_HARD_CAP_FACTOR = 2`, proporcional a `T`, no un margen fijo de minutos | 01-SPEC §Supuestos #3; 03-CRONOMETRO §Supuestos #3 |
| 4 | Exclusión mutua entre temporizador inverso y sesión de estudio | Activa por diseño: ambos comparten el mismo singleton discriminado `active/session` | 01-SPEC §Supuestos #4; 03-CRONOMETRO §Supuestos #4 |
| 5 | Desktop = PWA instalable, sin Electron/Tauri | Confirmado como default; `react-native-web` + Firebase Hosting es la única ruta de escritorio en V1 | 01-SPEC §Supuestos #5; 05-ARQUITECTURA §Supuestos #1 |
| 6 | Qué significa "funcionamiento de galaxias de la pantalla principal" (R20) | Interpretado como la Galaxia de metas de `10-GALAXIA-Y-TIENDA.md`; la **pestaña Inicio con la galaxia embebida ya es V1** (confirmado, brief §12.5); su **interactividad completa** (arrastre, subgalaxias, personalización, Tienda) sigue en V1.1 salvo confirmación explícita | 01-SPEC §Supuestos #6; 10-GALAXIA-Y-TIENDA §17 pregunta 1, §Supuestos #8 |
| 7 | Español neutro con "tú" (el mockup de frontend usa "vos") | "Tú" en todo copy de la app, centralizado en `src/i18n/es.ts` | 01-SPEC §Supuestos #7; 06-DISENO-UI §Supuestos #5 |
| 8 | Convención de vocabulario "bloque"/"ciclo" | Aplicada en todo el canon (§4 de este índice); identificadores de código sin renombrar | 01-SPEC §Supuestos #8 |
| 9 | ~~Alcance de la cancelación~~ | **RESUELTO** 2026-09-06 (R25/D1.b): misma severidad que expirar. Queda un sub-supuesto de UX, no de negocio, sin dueño asignado todavía: si la doble confirmación de 15+15 s sigue teniendo sentido con la severidad reducida — no bloquea nada | 01-SPEC §Supuestos (fila "—"); 02-DOMINIO §Supuestos (fila "—"); 03-CRONOMETRO §Supuestos (nota final) |
| 10 | Rol dominante por plataforma — ¿web/desktop solo espectador en V1, o el creador prefiere web dominante desde ya? | Solo Android puede ser dominante en V1; camino a "web dominante" documentado para V1.1/V1.5 sin cambiar el modelo de datos ni el protocolo (solo `canBeDominant` + 2 condiciones de `firestore.rules`) | 01-SPEC §Supuestos #10; 02-DOMINIO §Supuestos #2; 04-SINCRONIZACION §Supuestos #1; 05-ARQUITECTURA §Supuestos #2 |
| 11 | Galaxia + Tienda: alcance temporal, moneda, definición de supermeta, sincronización del layout, skins/fondos gratis por defecto | Tienda e interactividad completa de galaxia en V1.1 (salvo confirmación); sin dinero real (desbloqueo por rachas/logros); supermeta = meta con hijas vía `parentGoalId`, 2 niveles; layout sincroniza por usuario en Firestore; skin "Papel" + 2 fondos gratis por defecto | 01-SPEC §Supuestos #11; 02-DOMINIO §Supuestos #3-6; 10-GALAXIA-Y-TIENDA §1.2, §17 |

### 5.2 Supuestos propios de `05-ARQUITECTURA.md`

| # | Pregunta | Default asumido |
|---|---|---|
| 12 | Cuándo se construye `src/design/` (tokens/skins) completo, mientras tanto qué sigue vigente | `constants/theme.ts` as-built sigue siendo la fuente de tokens hasta que una fase de UI temprana lo necesite o hasta la Fase 10 (Pulido), lo que ocurra primero |
| 13 | `src/application/use-cases/` queda vacío en V1 | Ningún flujo de las 13 fases actuales necesita una orquestación multi-agregado que no encaje en un coordinador o un service de feature; se puebla solo si una fase futura (p. ej. exportar/borrar datos, V1.5) lo justifica |

### 5.3 Supuestos propios de `06-DISENO-UI.md`

| # | Pregunta | Default asumido |
|---|---|---|
| 14 | Regla de visibilidad de una capa de calendario cuando un ítem (categoría) no está reclamado por ninguna | Un ítem sin ninguna capa que lo referencie es siempre visible; uno reclamado se rige por el OR de sus capas |
| 15 | Implementación del `ProgressRing` sin `react-native-svg` instalado | `View`s/transformaciones CSS-en-RN si el resultado es limpio; se admite sumar `react-native-svg` como dependencia menor si no lo es |
| 16 | Paquetes de tipografía para Fraunces/Archivo/IBM Plex Mono | `@expo-google-fonts/{fraunces,archivo,ibm-plex-mono}` (MIT/OFL, sin costo, sin API key) |

### 5.4 Supuestos propios de `07-CALENDARIO-ESTADISTICAS-METAS.md`

| # | Pregunta | Default asumido |
|---|---|---|
| 17 | Resolución de `WeeklyGoal.layerVisible` cuando existen varias metas históricas del mismo `categoryId` con distinto valor | Gana la `WeeklyGoal` de `weekKey` más reciente; una meta nueva no hereda el valor explícito de la anterior (nace ausente ⇒ visible) |
| 18 | `UserSettings.defaultCalendarView?: CalendarViewMode` todavía no reflejado formalmente en `02-DOMINIO.md` §3/§5.1 | Campo ya fijado literal por este documento (§1.5, ausente ⇒ `'week'`); pendiente solo de que `02-DOMINIO.md` lo incorpore en su próxima revisión — mismo gap señalado por `09-SETUP-Y-OPERACION.md` §Supuestos #1 sobre `calendarLayers` |
| 19 | Números concretos de densidad visual (`maxVisibleColumns`, `maxVisibleChips`) | Delegados a `06-DISENO-UI.md` (existencia del parámetro sí, valor exacto no) |
| 20 | Una ocurrencia de evento invisible que cruza ella misma un cambio de horario (DST) | Solo se corrige la hora de inicio de cada ocurrencia; una ocurrencia excepcionalmente larga (> 20 h) que cruce DST a mitad de su propia duración no está cubierta |
| 21 | Racha: si "hoy" sin bloque todavía rompe la cuenta | `computeCurrentStreakDays` empieza a contar desde ayer si hoy no tiene ningún bloque completado todavía (el día no ha terminado) |
| 22 | `CalendarAssemblerItem` (dominio) vs. `CalendarItemViewModel` (`05-ARQUITECTURA.md` §4.3) | Son tipos distintos a propósito (uno más completo para el dominio, otro más simple como contrato de UI); `05-ARQUITECTURA.md` debe actualizar su cita en su próxima revisión |

### 5.5 Supuestos propios de `08-PLAN-IMPLEMENTACION.md`

| # | Pregunta | Default asumido |
|---|---|---|
| 23 | Momento de cerrar la brecha de `Category.parentId?`/archivado seguro (I-14), abierta desde la Fase 3 | No bloquea las Fases 4-6; debe cerrarse antes de construir la Fase 7 (Calendario por capas) — ver §3.2 de este índice |
| 24 | Ubicación exacta de las pantallas de Sesiones/historial (Fase 5) y Metas (Fase 9) en la navegación | No fijada todavía; depende de que `06-DISENO-UI.md` la resuelva (ya está escrito, pendiente de que una fase futura la aplique) |
| 25 | División de la Fase 12 (Galaxia+Tienda) en uno o dos commits | Sugerido como dos (galaxia / tienda por separado), dado el tamaño comparable al resto del sistema de metas |

### 5.6 Supuestos propios de `09-SETUP-Y-OPERACION.md`

| # | Pregunta | Default asumido |
|---|---|---|
| 26 | Regla e índice de `calendarLayers` todavía no están en `02-DOMINIO.md` §5.2/§5.3 | Documentados aquí como propuesta operativa, lista para copiarse a `02-DOMINIO.md` cuando se construya la Fase 7 |
| 27 | Configuración exacta del plugin `expo-notifications` en `app.json` (ícono/color/canal) | Placeholder `#3A6B54` (acento del skin "Papel") hasta que exista el asset real |
| 28 | Cifras exactas de cuota gratuita de Firebase Hosting | Aproximadas a la fecha de redacción, marcadas "verificar en la página de precios vigente" |
| 29 | Nombre y ubicación del script de respaldo manual | `scripts/backup-firestore.mjs`, convención sugerida, no commiteada todavía |

### 5.7 Supuestos propios de `10-GALAXIA-Y-TIENDA.md`

| # | Pregunta | Default asumido |
|---|---|---|
| 30 | Sistema de coordenadas de `GalaxyPosition` | Normalizado: `1.0 = min(viewportWidth, viewportHeight) / 2`, origen en el centro de la vista |
| 31 | Catálogo completo y umbrales de desbloqueo (fondos/skins/colecciones, `chestsEarned`) | Tabla completa inventada por este documento — el creador todavía no la ha visto |
| 32 | Dos fondos gratis por defecto (uno por modo claro/oscuro) | `bg_papel_crema` (claro) y `bg_papel_noche` (oscuro), ambos `source: 'default'` |
| 33 | Nodo ancla central no arrastrable dentro de cada subgalaxia | Implementado como "sol" central fijo; la exploración visual original solo tenía breadcrumb |
| 34 | `react-native-svg` como dependencia nueva | Se agrega en la fase de Metas/Galaxia, sin costo (MIT) |
| 35 | Vista de lista como fallback de accesibilidad primario | Alternador "Galaxia / Lista" con paridad total de acciones |

Ver también §5.1 fila 6 (interactividad de la galaxia en V1 vs. V1.1) y fila 11 (las 4 preguntas originales de Galaxia+Tienda), que son los mismos supuestos citados también dentro de `10-GALAXIA-Y-TIENDA.md` §17.

## 6. Trazabilidad de la revisión externa (hallazgos ALTO y MEDIO)

`03-requisitos/revision-spec-beta.md` es la revisión externa del SPEC v1: 6 hallazgos de severidad ALTA y 20 de severidad MEDIA. **Los 26 quedan resueltos explícitamente en algún documento de `docs/`** — ninguno sigue abierto a la fecha de este índice. Cada documento que resuelve un hallazgo lo dice en su propia sección "Resolución de hallazgos de la revisión externa" (o, en `01-SPEC.md`, su §11); esta tabla solo consolida el resultado para no tener que abrir los cinco documentos por separado.

### 6.1 Severidad ALTA (6 de 6 resueltos)

| Hallazgo | Resuelto en | Resumen de la resolución |
|---|---|---|
| REV-ALTA-1 — Retorno de `lunch_running` sin definir; sin límite de usos | `03-CRONOMETRO.md` §7 (completa); filas T11-T13 de §4.2 | `stateBeforeLunch` persistido; dos tratamientos según había tramo corriendo o espera; límite = cooldown de 3 bloques |
| REV-ALTA-2 — Faltan campos de persistencia (`currentState`, `responseDeadlineAt`) para recuperar sesión | `02-DOMINIO.md` §2.5, §3.4, §5.1 | Ya son campos as-built/adición del singleton `ActiveStudySession` |
| REV-ALTA-3 — Sin mecanismo que haga cumplir "una sola sesión activa por usuario" | `02-DOMINIO.md` §2.5/§5.3 (I-11/I-12); `04-SINCRONIZACION.md` §2-§3, §5, §7, §11 | Singleton único + `runTransaction` de creación exclusiva + toma de control transaccional + cierre perezoso condicional |
| REV-ALTA-4 — Doble conteo del banco de descanso | `03-CRONOMETRO.md` §6 (fórmulas + 6 ejemplos numéricos); `02-DOMINIO.md` I-4 | `bankDeltaSeconds = grantedSeconds − usedSeconds`; el ganado se suma una sola vez |
| REV-ALTA-5 — Viabilidad de alarmas en background en Android (Expo Go vs. development build) | `05-ARQUITECTURA.md` §6.2, §7.3, §11 | Development build local desde la Fase 2; notificaciones locales programadas/canceladas por transición; riesgo de Doze aceptado |
| REV-ALTA-6 — Riesgos técnicos de la versión web (throttling, autoplay, sin Web Push) | `05-ARQUITECTURA.md` §6 completa, §11 | La web nunca es dominante; el motor por timestamps hace irrelevantes esos riesgos para el dato |

### 6.2 Severidad MEDIA (20 de 20 resueltos)

| Hallazgo | Resuelto en | Resumen de la resolución |
|---|---|---|
| REV-MEDIA-1 — "Sesión" ausente del glosario, confundida con "Bloque" | `01-SPEC.md` §5.2; `02-DOMINIO.md` §1, §1.1 | Glosario y tabla de mapeo obligatorios |
| REV-MEDIA-2 — Nombres de campo inconsistentes entre resumen y detalle | `02-DOMINIO.md` §3.2, §6.6 | Un solo nombre por campo, copiado literal del código as-built |
| REV-MEDIA-3 — `InvisibleEvent` sin esquema de `recurrence`/`color` | `02-DOMINIO.md` §2.6, §3.2 | `WeeklyRecurrence` con esquema fijo; color siempre resuelto por `categoryId` |
| REV-MEDIA-4 — `InverseSession` sin campo para la duración objetivo | `02-DOMINIO.md` §2.4, §3.2 | `targetDurationSeconds` ya as-built |
| REV-MEDIA-5 — Ventana de `study_completed_waiting_response` sin definir | `03-CRONOMETRO.md` §3 completa | Tabla cerrada de tres estados de espera, cada uno con su función de ventana |
| REV-MEDIA-6 — Almuerzo modelado dos veces (`lunchSegments[]` y `breakType: 'lunch'`) | `02-DOMINIO.md` §2.3, I-5/I-7 | Fuente única (`lunchSegments[]`); `'lunch'` existe en el tipo pero ningún flujo lo produce |
| REV-MEDIA-7 — `customBreakSelections[]` sin esquema definido | `02-DOMINIO.md` §1.2, §3.2, I-6 | Esquema as-built citado; distinción explícita decisión (`CustomBreakSelection`) vs. ejecución (`BreakSegment`) |
| REV-MEDIA-8 — ¿Doble confirmación aplica al inverso? ¿`cancelled` vs. `interrupted`? | `02-DOMINIO.md` §3.2, I-17; `03-CRONOMETRO.md` §8.4, §12.5 | No aplica doble confirmación al inverso; `interrupted` queda reservado, sin caso de uso en V1 |
| REV-MEDIA-9 — `break_selection` con solo 2 de 4 transiciones definidas | `03-CRONOMETRO.md` §5 | 5 salidas explícitas (se agrega "Terminar sesión" a las 4 originales) |
| REV-MEDIA-10 — Sin fórmula general banco+descanso largo; sin `breakType` para un largo parcial | `03-CRONOMETRO.md` §6.1-§6.2, ejemplo E5 | Fórmula única; un largo tomado parcialmente clasifica como `'custom'`, nunca `'long'` |
| REV-MEDIA-11 — `invisible_event_instance` sin colección para la expansión de recurrencia | `02-DOMINIO.md` §2.6/§5.1 | Expansión en cliente (`expandRecurringInvisibleEvents`), sin colección de instancias |
| REV-MEDIA-12 — La estrella anual se cumplía vacuamente en un mes sin metas | `01-SPEC.md` §6.13 RF-MET-04; `07-CALENDARIO-ESTADISTICAS-METAS.md` §3.3 | Un mes sin ninguna meta configurada nunca obtiene estrella |
| REV-MEDIA-13 — Inicio de semana y zona horaria de referencia sin definir | `02-DOMINIO.md` §6.2, §6.3 | Semana ISO-8601 (lunes); zona = `UserProfile.timezone` |
| REV-MEDIA-14 — Contradicción sobre si el audio propio del dispositivo es V1 o V2 | `01-SPEC.md` §6.14 RF-SON-03 | Es V1, pero como preferencia local por dispositivo, no sincronizada |
| REV-MEDIA-15 — Android 12+/Doze/optimización de batería no mencionados | `05-ARQUITECTURA.md` §6.2, §11; `09-SETUP-Y-OPERACION.md` §7 | Riesgo de plataforma aceptado, documentado; procedimiento operativo de exención de batería |
| REV-MEDIA-16 — El MVP no distinguía Android-only de multiplataforma | `01-SPEC.md` §9 (tabla 9.1) | Cada módulo de alcance marca explícitamente su plataforma |
| REV-MEDIA-17 — Sin límite de usos de almuerzo por bloque/día | `03-CRONOMETRO.md` §7.1 | Cooldown de 3 bloques desde el último uso |
| REV-MEDIA-18 — ¿Qué pasa si se abre cancelación durante `*_waiting_response`? | `03-CRONOMETRO.md` §8.2 | La ventana sigue corriendo; `EXPIRE` gana si vence antes de la doble confirmación |
| REV-MEDIA-19 — ¿El inverso puede correr junto a una sesión de estudio? Conflicto multi-dispositivo | `03-CRONOMETRO.md` §12.4 (exclusión mutua); `04-SINCRONIZACION.md` §5 (conflicto de dominante) | Exclusión mutua gratuita por el singleton único; protocolo de toma de control con diagrama completo |
| REV-MEDIA-20 — El documento v1 mezclaba las 3 capas de spec-kit sin separarlas | `01-SPEC.md` (estructura completa del documento) | `01-SPEC.md` es solo especificación de producto; stack/arquitectura/máquina de estados viven en 02/03/05 |

### 6.3 Severidad BAJA

No exigidos explícitamente por el orden de autoridad del canon (solo ALTO y MEDIO deben quedar resueltos), pero también están cerrados: los 10 hallazgos BAJA de `revision-spec-beta.md` quedan resueltos en `01-SPEC.md` §11.3 (modelo de distribución, privacidad/exportación, definición de éxito, accesibilidad/idioma, jerarquía única de reglas, límites del plan gratuito) y en notas puntuales de `02-DOMINIO.md` (`paused_transient` descartado, presets en minutos como excepción intencional). Ninguno queda sin dirección.

## 7. Protocolo de cambios

Pasos, en orden, para que una decisión nueva del creador (o un hallazgo nuevo de `productvt-7b`) entre al canon sin dejar rastro verbal perdido (mismo protocolo que ya sigue `08-PLAN-IMPLEMENTACION.md` §18 punto 8, generalizado aquí a cualquier documento, no solo al plan de fases):

1. **Se documenta primero en `03-requisitos/`** — un archivo nuevo `nueva-funcionalidad-<tema>.md` si es un requerimiento de producto, o una entrada en `decisiones-tomadas.md` si es la resolución de una pregunta ya hecha. Nunca se construye directamente sobre una instrucción verbal sin dejar algo escrito primero.
2. **Se refleja en `_brief-orquestador.md`** si la decisión es transversal (afecta a más de un documento de `docs/`) — con su propia sección numerada y, si corresponde, una entrada en la lista de "Supuestos pendientes de confirmar" del brief.
3. **Solo entonces se actualiza el documento de `docs/` correspondiente** — nunca al revés. Un documento de `docs/` no debe adelantarse a una decisión que todavía vive solo en una conversación.
4. **El documento actualizado corrige, no acumula**: si una sección queda superada, se reemplaza y se dice explícitamente qué versión anterior corrige (como ya hacen varias secciones de `_brief-orquestador.md` y `decisiones-tomadas.md`, marcadas "CORREGIDO 2026-09-06"), no se agrega un párrafo contradictorio al lado del viejo.
5. **Este índice se actualiza** cuando: se completa un documento nuevo (§2), cambia el estado de una fase en `08-PLAN-IMPLEMENTACION.md` de forma que afecte a qué debe leer alguien antes de empezarla (§3), se resuelve un supuesto de la tabla de §5 (se mueve a "resuelto" en el documento de origen y se anota aquí), o se identifica un hallazgo ALTO/MEDIO nuevo de una revisión externa futura (§6).
6. **Ningún documento de `docs/` se edita por otra sesión que no sea su dueño de facto** salvo corrección de una cita cruzada rota (p. ej. un nombre de tipo que otro documento ya renombró) — la convención de redacción de todo el canon es "referenciar por nombre y sección, no duplicar", así que un cambio de nombre en un documento puede dejar una cita desactualizada en otro; corregir esa cita puntual no es lo mismo que redactar contenido nuevo del documento ajeno.
7. **El código as-built nunca se renombra para que coincida con un documento** — es al revés: si `productvt-beta/src` ya commiteó un nombre distinto al que un documento proponía, el documento se corrige para citar el nombre real (regla de gobierno del brief, repetida en la §Fuentes de cada documento de `docs/`).

## 8. Registro de versiones

Registro de cuándo cada documento de `docs/` quedó completo por primera vez y de los cambios transversales relevantes posteriores — no un changelog línea por línea (eso vive en el historial de edición de cada archivo), sino los hitos que afectan a más de un documento o al estado del canon como conjunto.

| Fecha | Evento | Documentos afectados |
|---|---|---|
| 2026-09-05 | `_brief-orquestador.md` fija las decisiones transversales v2 sobre las 24 respuestas del creador | Todos los posteriores |
| 2026-09-05 | Requerimiento "Galaxia de metas + Tienda" pedido en vivo por el creador; marcado V1.1 por `productvt-eb` | `decisiones-tomadas.md`, gancho de esquema en `02-DOMINIO.md` |
| 2026-09-06 | `01-SPEC.md`, `02-DOMINIO.md`, `03-CRONOMETRO.md`, `04-SINCRONIZACION.md` completos | — |
| 2026-09-06 | Pregunta 25 (severidad de la cancelación) resuelta directamente por el creador: misma severidad que expirar | `01-SPEC.md`, `02-DOMINIO.md`, `03-CRONOMETRO.md`, `decisiones-tomadas.md` |
| 2026-09-06 | Requerimiento "Calendario por capas" pedido en vivo a `BC Orquestador Productvt`, con el build todavía en Fase 4b — entra directo a V1 | `_brief-orquestador.md` §12, `02-DOMINIO.md` (`CalendarLayer`, `WeeklyGoal.layerVisible?`) |
| 2026-09-06 | Navegación principal de 5 pestañas confirmada (Inicio con galaxia embebida, Cronómetro, Calendario, Estadísticas, Tienda) | `_brief-orquestador.md` §12.5, `06-DISENO-UI.md`, `10-GALAXIA-Y-TIENDA.md`, `08-PLAN-IMPLEMENTACION.md` |
| 2026-09-06 | Color de meta confirmado con excepción sobre color de categoría (D6.b) cuando un bloque tiene `goalId` | `02-DOMINIO.md` §1.2/§3.3, `decisiones-tomadas.md`, `07-CALENDARIO-ESTADISTICAS-METAS.md`, `08-PLAN-IMPLEMENTACION.md` (Fase 9) |
| 2026-09-06 | `05-ARQUITECTURA.md`, `06-DISENO-UI.md`, `07-CALENDARIO-ESTADISTICAS-METAS.md`, `08-PLAN-IMPLEMENTACION.md`, `09-SETUP-Y-OPERACION.md`, `10-GALAXIA-Y-TIENDA.md` completos | — |
| 2026-09-06 | Renombre de sesiones tras reset de cuota: `productvt-cb` → `productvt-9b`, `productvt-eb` → `productvt-7b` | `decisiones-tomadas.md` ("Coordinación entre sesiones") |
| 2026-09-06 | Este documento (`00-INDICE.md`) se redacta completo, cerrando el conjunto de los 11 documentos del canon | Este documento |

Regla de mantenimiento: cada vez que se agregue una fila a esta tabla por un cambio transversal nuevo, revisar si también corresponde actualizar §2 (mapa), §5 (supuestos) o §6 (trazabilidad) de este mismo índice — un evento que afecta a varios documentos casi siempre mueve algo en más de una de esas secciones.

## Supuestos pendientes de confirmar

Este documento no introduce reglas de negocio ni de modelo de datos propias, así que no genera supuestos de ese tipo — la tabla completa de supuestos de todo el canon ya está en §5. Los únicos supuestos propios de este índice son de **mantenimiento del propio índice**:

| # | Supuesto | Default asumido en este documento | Si se decide distinto |
|---|---|---|---|
| 1 | Este índice no se regenera automáticamente: depende de que cada sesión que cierre un documento o resuelva un supuesto lo actualice a mano (§7, paso 5). | Se asume que el protocolo de §7 se sigue; si no se sigue, este índice queda desactualizado sin aviso — no hay mecanismo de verificación automática en un proyecto sin Cloud Functions ni CI. | Si se quiere una verificación automática (p. ej. un script que compare las tablas de §2/§5/§6 contra el contenido real de cada documento), es una herramienta de `productvt-beta/scripts/` o de `.claude/`, fuera del alcance de este documento — este índice seguiría siendo la fuente legible por humanos. |
| 2 | La numeración de la tabla consolidada de supuestos (§5) es propia de este índice, no de `_brief-orquestador.md` más allá del rango 1-11 | Los ítems 12 en adelante son una numeración nueva que este documento introduce para poder referenciar cada fila sin ambigüedad; ningún otro documento del canon los cita todavía por ese número. | Si otro documento empieza a citar "supuesto #14 del índice", esa referencia debe mantenerse estable en futuras ediciones de este archivo — no renumerar filas ya citadas externamente, solo agregar al final de su bloque correspondiente (§5.2-§5.7). |

## Trazabilidad

| Sección de este documento | Contenido | Fuente(s) |
|---|---|---|
| §1 — Qué es este documento y gobierno vigente | Relación con `03-requisitos/`, `docs/originales/`, `01-mockups/`/`00-vision/`, `productvt-beta/`; tabla de gobierno; estado real del build | `_brief-orquestador.md` (encabezado y "Gobierno"), `decisiones-tomadas.md` ("Coordinación entre sesiones"), `08-PLAN-IMPLEMENTACION.md` §2/§4, `CODE` (`git log`/`git status` sobre `productvt-beta/`, verificado 2026-09-06) |
| §2 — Mapa de documentos | Propósito/consumidor/dependencias de cada uno de los 11 documentos | Propósito y Fuentes de cada documento `01-SPEC.md` a `10-GALAXIA-Y-TIENDA.md` |
| §3 — Orden de lectura por audiencia | Rutas de lectura para BC, para quien llega nuevo, para `productvt-7b`, `productvt-9b` y el creador; lista completa de lectura previa a la Fase 7 | `08-PLAN-IMPLEMENTACION.md` §11, §18; `_brief-orquestador.md` §12; `02-DOMINIO.md` §2.6/§3.3; `07-CALENDARIO-ESTADISTICAS-METAS.md` §1; `05-ARQUITECTURA.md` §3.2/§6.4; `06-DISENO-UI.md` §11 |
| §4 — Glosario y tabla de mapeo | Regla de oro sesión/bloque/ciclo; tablas de mapeo de modelo de datos y de arquitectura; glosario mínimo | `02-DOMINIO.md` §1, §1.1, §1.2; `05-ARQUITECTURA.md` §10; `07-CALENDARIO-ESTADISTICAS-METAS.md` §2.7, §3.3; `10-GALAXIA-Y-TIENDA.md` §2 |
| §5 — Supuestos consolidados | 35 supuestos de todo el canon, agrupados por transversales (brief §10) y propios de cada documento | Secciones "Supuestos pendientes de confirmar" de `01-SPEC.md` a `10-GALAXIA-Y-TIENDA.md` |
| §6 — Trazabilidad de la revisión externa | 26 hallazgos ALTO/MEDIO de `revision-spec-beta.md`, todos resueltos | Secciones "Resolución de hallazgos de la revisión externa" (o `01-SPEC.md` §11) de `01-SPEC.md`, `02-DOMINIO.md` §8, `03-CRONOMETRO.md` §14, `04-SINCRONIZACION.md` §15, `05-ARQUITECTURA.md` §11 |
| §7 — Protocolo de cambios | Orden `03-requisitos/` → brief → documento de `docs/`; regla de no renombrar código as-built desde un documento | `08-PLAN-IMPLEMENTACION.md` §18 punto 8 (generalizado), regla de gobierno repetida en la §Fuentes de cada documento del canon |
| §8 — Registro de versiones | Hitos de cuándo cada documento quedó completo y de decisiones transversales posteriores | Fechas y contenido de cada documento indexado, `decisiones-tomadas.md` |
