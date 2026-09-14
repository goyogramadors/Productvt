# 08 — Plan de implementación v2 para Claude Code

## Propósito

Este documento **describe** las 11 fases reales con las que Claude Code (sesión `BC Orquestador Productvt`) construye `productvt-beta/`: no propone un orden alternativo ni una arquitectura nueva. La secuencia (fundación → auth → categorías/presets → núcleo del cronómetro → sesiones → inverso → calendario → estadísticas → metas → pulido → setup final) ya está fijada por `03-requisitos/nueva-funcionalidad-galaxia-tienda.md` ("Impacto en secuenciación") y coincide exactamente con lo commiteado hasta hoy (3 de 11 fases) y con la fase en curso. Agrega dos fases de roadmap fuera de V1 (12 y 13) para que el canon no deje un vacío entre "V1 completo" y "qué sigue".

Para cada fase fija: objetivo, archivos (los ya existentes vía `Glob` sobre `productvt-beta/src` para las fases hechas; las rutas ya especificadas como "ADICIÓN" en `02-DOMINIO.md`/`03-CRONOMETRO.md`/`04-SINCRONIZACION.md` para las pendientes), qué reglas de esos tres documentos implementa, dependencias con otras fases, criterios de aceptación verificables, la matriz de tests del dominio que aplica, pruebas manuales sobre el build real, riesgos, y un commit sugerido en el estilo ya usado (`feat: <resumen en español sin tildes en el asunto>`). No repite el contenido de `01-SPEC.md`/`02-DOMINIO.md`/`03-CRONOMETRO.md`/`04-SINCRONIZACION.md`: los cita por sección. Tampoco redefine cómo configurar Firebase, el development build de Android o el despliegue de la PWA — eso es responsabilidad de `docs/09-SETUP-Y-OPERACION.md` (documento hermano, en redacción paralela), citado donde corresponde.

## Fuentes

Orden de autoridad (si dos fuentes chocan, gana la de arriba; ver también la tabla de Trazabilidad al final):

1. Respuestas literales del creador — anexo de `_brief-orquestador.md` (`R8`–`R13`, `R15`, `R17`, `R18`, `R20`–`R24`: delegación total de proceso y arquitectura — "las fases debes rediseñarlas por completo… construir algo completo, funcional y perfecto"; `R25` sobre cancelación).
2. `03-requisitos/decisiones-tomadas.md` (secciones "Arquitectura de código", "Proceso" puntos 20–24, "Coordinación entre sesiones"): fuente del orden de construcción a criterio técnico y de que la construcción de producción vive en una sola sesión (`BC Orquestador Productvt`) a la vez.
3. `_brief-orquestador.md` §7 ("Arquitectura de código") y §9 ("Proceso"): fuente de la carpeta `application/coordinators/`, el mandato de "rebanada vertical" del cronómetro, y el orden fundación → auth → cronómetro → sesiones → …
4. Código commiteado en `productvt-beta/` (etiqueta `CODE`, vía `git log`/`git show --stat`): verdad de qué está hecho, en qué commit, y con qué archivos exactos — fuente de las secciones "Fase 1/2/3" y de "Estado actual del repositorio".
5. `03-requisitos/nueva-funcionalidad-galaxia-tienda.md`, sección "Impacto en secuenciación": fuente literal de la lista de 11 fases que este documento describe, y del posicionamiento de Galaxia/Tienda fuera de esas 11 (Fase 12).
6. `docs/02-DOMINIO.md`, `docs/03-CRONOMETRO.md`, `docs/04-SINCRONIZACION.md`, `docs/05-ARQUITECTURA.md` (ya escritos y completos): fuente de toda regla de negocio, interfaz, invariante, ruta de archivo "ADICIÓN" y firma de repositorio (incluido `CalendarLayerRepository` completo, `05-ARQUITECTURA.md` §3.2) que las fases 4 a 9 implementan. Se citan por sección, nunca se repiten.
7. `docs/01-SPEC.md` §9 ("Alcance por versión") y §10 ("Definición de éxito"): fuente de los criterios de aceptación de producto y de qué queda en V1 vs. V1.1 vs. V1.5.
8. `03-requisitos/revision-spec-beta.md`: todo hallazgo ALTO/MEDIO ya resuelto en 01–04 se cita por su resolución, no se repite; este documento no resuelve hallazgos nuevos, solo referencia dónde se prueba cada uno (columna "tests del dominio" de cada fase).
9. `01-mockups/mobile/cronometro.html`, `01-mockups/desktop/galaxia-metas.html`, `03-requisitos/nueva-funcionalidad-galaxia-tienda.md` + `01-mockups/desktop/decisiones-visuales-galaxia.md`: fuente de las pruebas manuales de UI de la Fase 4 (flujo de pantalla del cronómetro) y del contenido de la Fase 12 (galaxia/tienda).
10. `docs/09-SETUP-Y-OPERACION.md` (en redacción paralela): fuente citada, no redefinida, de todo lo operativo (Firebase Spark, development build de Android, despliegue de la PWA, cuotas, troubleshooting) que las Fases 4 y 11 dan por hecho.
11. Originales v1 (`docs/originales/IMPLEMENTATION_PLAN-v1.md`): punto de partida sobre fases y orden de trabajo, **no** fuente de verdad — superado en su totalidad por los puntos 1–5 de arriba.

## 1. Principios rectores

1. **El código as-built es la verdad para nombres.** Ante cualquier duda de identificador, gana lo que ya está commiteado en `productvt-beta/src` sobre cualquier documento (brief §0, gobierno). Este plan no propone renombres; cuando 02/03/04 sí proponen una adición (campo, función, archivo nuevo), este plan la lista con la ruta exacta que esos documentos ya fijaron.
2. **Rebanada vertical, no capas horizontales.** El orden de fases prioriza tener algo compilable y usable en el dispositivo cuanto antes (`R20`, `B §9`: "construir algo completo, funcional… en el menor tiempo posible"), no terminar todo el dominio antes de tocar UI. Cada fase entrega una pantalla o flujo real, no solo tipos.
3. **Dominio puro primero, adaptadores después.** Toda regla de negocio (máquina de estados, banco, ventanas, agregadores) vive en `src/domain/**` sin React ni Firebase y se prueba con Vitest antes de cablear la UI — así lo exige `brief §7` y así ya lo hace el as-built (`src/domain/entities/*`, sin una sola importación de React o Firebase).
4. **Repositorio para todo agregado, sin excepciones** (`D9`, `brief §7`). Ningún componente ni hook importa `firebase/firestore` directo; todo pasa por `src/repositories/**` o por los coordinadores de `src/application/coordinators/**`.
5. **Costo cero es un criterio de aceptación, no una nota al pie.** Ninguna fase puede introducir Cloud Functions, Storage de pago, EAS Build en la nube, ni un SDK con cuota paga por defecto (`D17`, `D18`, brief §6). El criterio de aceptación de cada fase que toca Firestore incluye "cabe en el plan Spark".
6. **Cada fase deja el dominio más probado, no menos.** La matriz de tests de 03-CRONOMETRO §13 (42 casos) y las secciones de test de 02-DOMINIO/04-SINCRONIZACION no son opcionales ni se difieren a una "fase de QA" final — se escriben en la misma fase que introduce la regla que verifican.
7. **No hay fase de mockup separada** (`D` "Proceso", puntos 20–24): el prototipo funcional en el dispositivo real (Android) es el único artefacto de validación de cada fase; los mockups HTML (`01-mockups/**`) son insumo de diseño, no un paso previo obligatorio a repetir en código.
8. **Una sola sesión construye producción a la vez** (`decisiones-tomadas.md`, "Coordinación entre sesiones"): este documento asume que solo `BC Orquestador Productvt` avanza fases en `productvt-beta/src`; otra sesión que quiera tocar código de producción debe coordinar antes vía `ListAgents`/mensaje directo.

## 2. Estado actual del repositorio (as-built)

Fuente: `git log`/`git show --stat`/`git status` sobre `productvt-beta/`, actualizado el 2026-09-06 tras el commit que cierra la Fase 4a. Rama única `master`, sin remoto configurado. Seis commits:

| Commit | Mensaje | Fase de este plan |
|---|---|---|
| `b0aae3b` | Initial commit (plantilla Expo Router por defecto) | Previo a la Fase 1; no aporta dominio ni Firebase |
| `fcb3309` | chore: initial environment setup and core dependencies | Previo a la Fase 1 |
| `4420909` | feat: fundacion tecnica - dominio tipado, firebase client y estructura de capas | **Fase 1** |
| `51fbcfa` | feat: autenticacion completa con Firebase (email/password + Google) y AuthGate | **Fase 2** |
| `9f4ce68` | feat: CRUD de categorias, presets y pantalla de settings | **Fase 3** |
| `01019c7` | feat: núcleo del cronómetro de estudio y temporizador inverso (Fase 4a) | **Fase 4a** |

**Nota de numeración entre documentos**: `02-DOMINIO.md` (§3.3–§3.6) y `04-SINCRONIZACION.md` etiquetan varias adiciones como "Fase 3: cronómetro" o "fase de sincronización" porque se redactaron sobre el orden alternativo de brief §9/`decisiones-tomadas.md` puntos 20-24 (fundación→auth→**cronómetro**→sesiones→categorías/presets→…). El orden que realmente se construyó — y que este plan describe, por mandato de la Fuente 5 (`nueva-funcionalidad-galaxia-tienda.md`, "Impacto en secuenciación") y porque el `CODE` (Fuente 4) lo confirma — intercala **categorías/presets antes del cronómetro** (commit `9f4ce68` es la Fase 3 real). Toda cita literal "Fase 3: cronómetro"/"fase inverso"/"fase de sincronización" de `02-DOMINIO.md`/`03-CRONOMETRO.md`/`04-SINCRONIZACION.md` se traduce, en este documento, como **Fase 4** (con su división 4a/4b, §8); "fase categorías/presets" ya es la Fase 3 as-built; "fase metas" es la Fase 9; "fase Calendario" es la Fase 7.

### 2.1 Fase 4a: ya commiteada (`01019c7`)

El commit `01019c7` ("feat: núcleo del cronómetro de estudio y temporizador inverso (Fase 4a)") cierra la Fase 4a completa — dominio, infraestructura del singleton local y UI, no solo el dominio puro que describía una versión anterior de este documento cuando el trabajo seguía sin commitear:

- **Dominio puro** (`src/domain/**`, sin React ni Firebase): `entities/active-session.ts`, `entities/device-identity.ts` (con `canBeDominant`/`resolveDeviceRole`), `machines/{study-timer-events,study-timer-machine,inverse-timer-events,inverse-timer-machine,notification-intents}.ts`, `rules/{response-window,break-bank,lunch,cancellation,inverse-timer,materialize-session,session-effective-seconds,timer-engine,active-session-guard}.ts`, más las adiciones ya fijadas en `02-DOMINIO.md` §3.3 sobre `inverse-session.ts`/`study-session.ts`/`user-profile.ts` (`autoFinished`, `deviceInfo?`, `completionReason: 'ended_by_user'`, `SessionDeviceInfo.deviceId?`, `DEFAULT_CANCELLATION_PHRASE` re-exportada desde `src/i18n/es.ts`).
- **Infraestructura y aplicación**: `src/infrastructure/firebase/collections.ts` ya tiene `activeSessionDocRef(uid)`/`ACTIVE_SESSION_DOC_ID`; `src/repositories/active-session/` ya existe; `src/application/coordinators/` ya tiene contenido real — `StudySessionCoordinator.ts`, `InverseSessionCoordinator.ts`, `ActiveTimerRecoveryService.ts` (nombres tal como quedaron commiteados, CODE — no `study-session-coordinator.ts`/`ActiveSessionRecoveryService` en minúscula-con-guion que suponía una versión anterior de este documento antes del commit; gana el código, gobierno del brief §0).
- **UI**: `src/features/timer/**` completo (`components/{break-selector-modal,cancel-session-modal,inverse-active-panel,inverse-timer-form,lunch-panel,timer-active-panel,timer-session-form}.tsx`, `hooks/*`, `services/{timerAudioService,timerNotificationService,timerPersistence}.ts`) y `src/app/(tabs)/timer.tsx` ya reemplaza el placeholder de la Fase 2 con el flujo real.
- **Deliberadamente fuera de esta fase** (comentarios "LÍMITE DE ESTA FASE" en el propio código, `active-session.ts` y `device-identity.ts`, que siguen igual tras el commit): `controlRequest` no se lee ni se escribe todavía; `resolveDeviceRole` siempre devuelve `'dominant'` para el dispositivo que inició la sesión; `timer-engine.ts#nowMs()` usa el reloj local sin `clockOffset` (`TODO (Fase 4b)` explícito en el archivo). Ninguna de estas es una omisión — es exactamente el límite de alcance que la Fase 4b (§8.2) cierra: protocolo dominante/espectador, `clockOffset`, `controlRequest` y `firestore.rules` (sin escribir todavía) siguen sin commit.

### 2.2 Estado de la matriz de pruebas del dominio (`03-CRONOMETRO.md` §13)

`npx vitest run` sobre `productvt-beta/` (7 archivos de test, incluidos `study-timer-machine.test.ts`, `study-timer-machine.lunch.test.ts`, `inverse-timer-machine.test.ts`, `break-bank.test.ts`, `lunch.test.ts`, `materialize-session.test.ts`, `response-window.test.ts`) da **45 de 45 tests en verde**, cubriendo los 42 casos P1–P42 de la matriz (algunos casos se prueban con más de un test):

| Grupo cubierto | Casos | Estado |
|---|---|---|
| P1–P12 (transiciones, §13.1) | 12 | 12 verdes — **P11 ya no está en rojo**: `END_SESSION` desde `break_completed_waiting_response` preserva `effectiveStudySeconds` correctamente |
| P13–P29 (ventanas §13.2, banco §13.3, almuerzo §13.4) | 17 | 17 verdes |
| P30–P36 (cancelación §13.5, expiración/zombie §13.6) | 7 | 7 verdes |
| P37–P42 (inverso §13.7, materialización §13.8) | 6 | 6 verdes |

Total: **42 de 42 casos escritos, 42 de 42 verdes** (45 tests en total, algunos casos con más de un test asociado). El Principio 6 de este plan ("cada fase deja el dominio más probado, no menos") ya se cumple para la Fase 4a: no queda ningún caso en rojo ni sin escribir dentro de su alcance — ver criterios de aceptación 1 y 2 en §8.1, ya cumplidos.

## 3. Definición de "hecho" (Definition of Done)

Una fase de este plan está **hecha** solo cuando se cumplen las seis condiciones siguientes — no antes, y no parcialmente (Principios 6 y 7):

1. **Compila y corre en el dispositivo real.** `npx expo run:android` (Fase ≥4) o `npx expo start --web` (fases sin dependencia de Android) sin errores de TypeScript (`tsc --noEmit` limpio) ni warnings de Metro que bloqueen el flujo probado.
2. **La matriz de tests del dominio que le corresponde está en verde al 100 %.** Ningún caso de `03-CRONOMETRO.md` §13, `02-DOMINIO.md` §4 (invariantes I-1..I-20) o de la matriz de 25 casos (Q1-Q25) más Q26 de `07-CALENDARIO-ESTADISTICAS-METAS.md` §6 queda en rojo ni sin escribir dentro del alcance de la fase — `npx vitest run` sin fallos.
3. **La prueba manual de la fase (ver cada fase, "Pruebas manuales") se ejecutó sobre el build real** — no sobre el mockup HTML — y el resultado coincide con lo esperado. El mockup (`01-mockups/**`) es insumo de diseño, nunca el artefacto de validación (Principio 7).
4. **Ningún componente ni hook importa `firebase/firestore` fuera de `src/repositories/**`/`src/application/coordinators/**`** (Principio 4) — verificable con `grep -rn "firebase/firestore" src/app src/features src/components` sin resultados fuera de esas dos carpetas.
5. **No introduce costo**: ninguna Cloud Function, ningún uso de Storage de pago, ningún SDK con cuota paga por defecto (Principio 5) — revisión manual de `package.json` y de cualquier llamada a Firebase nueva contra `docs/09-SETUP-Y-OPERACION.md` §2.3 ("qué NO activar").
6. **El commit queda hecho con el mensaje sugerido de la fase** (o uno equivalente en el mismo estilo `feat: <resumen en español sin tildes>`), de forma que `git log --oneline` siga siendo la fuente de verdad de "cuántas fases van" para cualquier sesión que retome el trabajo (§18).

Una fase puede dividirse en sub-fases (como la Fase 4a/4b) cuando el motivo es una frontera real de alcance — no solo de tamaño —: "corre en un solo dispositivo" (4a) es una entrega funcional completa y demostrable por sí sola, mientras que "corre correctamente entre dos dispositivos" (4b) es una capa aparte que no se puede probar sin que la primera ya exista. La Definición de Hecho de arriba aplica a cada sub-fase con su propio alcance: los criterios de "matriz de tests" y "prueba manual" de 4a no exigen todavía nada de `04-SINCRONIZACION.md`, y 4b no repite lo que 4a ya cerró.

## 4. Las 13 fases: resumen y checklist rápido

| # | Fase | Estado | En una frase |
|---|---|---|---|
| 1 | Fundación técnica | ✅ HECHA (`4420909`) | Dominio tipado as-built + cliente Firebase + estructura de carpetas por capas. |
| 2 | Autenticación | ✅ HECHA (`51fbcfa`) | Email/Password + Google Sign-In, `AuthGate`, tabs base. |
| 3 | Categorías, presets y ajustes | ✅ HECHA, con brecha (`9f4ce68`) | CRUD de categorías/presets + Configuración; falta `parentId?` (subcategorías), I-14 (archivar-si-referenciada) y actualizar las tabs a las 5 confirmadas (Inicio/Tienda placeholder, Configuración fuera de la barra). |
| 4a | Núcleo local del cronómetro | ✅ HECHA, con brecha (`01019c7`) | Máquina de estados, banco, almuerzo, cancelación, inverso — un solo dispositivo, sin Firebase; 42/42 casos de prueba en verde; falta `StudySession.goalId?` (selección de meta al iniciar, D6.b — se cierra en la Fase 9). |
| 4b | Sincronización multi-dispositivo | ⏳ PENDIENTE (foco actual de BC) | Singleton `active/session`, protocolo dominante/espectador, `clockOffset`, recuperación. |
| 5 | Sesiones e historial | ⏳ PENDIENTE | `SessionRepository`, lista/detalle de sesiones pasadas, filtros. |
| 6 | Temporizador inverso (UI + repos) | ⏳ PENDIENTE | Pantalla y repositorio del inverso — el dominio ya existe desde la Fase 4a. |
| 7 | Calendario (por capas) | ⏳ PENDIENTE | `CalendarLayer`, capas de meta virtuales, 5 vistas, vista día con timeline. |
| 8 | Estadísticas | ⏳ PENDIENTE | Agregados día/semana/mes de tiempo efectivo por categoría. |
| 9 | Metas y estrella | ⏳ PENDIENTE | `WeeklyGoal` completo (`name`, `color`, `parentGoalId?`, `skinId?`, `layerVisible?`), estrella mensual; cierra la brecha de `goalId`/color de meta de la Fase 4a (D6.b). |
| 10 | Pulido | ⏳ PENDIENTE | Modo claro/oscuro, animaciones, accesibilidad, copys revisados. |
| 11 | Verificación y setup final | ⏳ PENDIENTE | `firestore.rules` desplegadas, checklist de `09-SETUP-Y-OPERACION.md`, build de release. |
| 12 | V1.1 — Galaxia de metas + Tienda | 🔭 ROADMAP (fuera de V1) | Vista de galaxia interactiva + Tienda de skins/fondos, `10-GALAXIA-Y-TIENDA.md`. |
| 13 | V1.5 — Web dominante opcional + datos personales | 🔭 ROADMAP (fuera de V1) | Habilitar `canBeDominant('web')` si se confirma; exportar/borrar datos. |

Checklist de progreso global (marcar en este documento a medida que BC cierra cada fase — es el único lugar donde este plan registra estado mutable):

- [x] Fase 1 — Fundación técnica
- [x] Fase 2 — Autenticación
- [x] Fase 3 — Categorías, presets y ajustes (brecha de `parentId?` pendiente, no bloquea las fases siguientes)
- [x] Fase 4a — Núcleo local del cronómetro (brecha de `goalId?`/color de meta pendiente — D6.b, no bloquea 4b-8, se cierra en la Fase 9)
- [ ] Fase 4b — Sincronización multi-dispositivo
- [ ] Fase 5 — Sesiones e historial
- [ ] Fase 6 — Temporizador inverso (UI + repos)
- [ ] Fase 7 — Calendario por capas
- [ ] Fase 8 — Estadísticas
- [ ] Fase 9 — Metas y estrella
- [ ] Fase 10 — Pulido
- [ ] Fase 11 — Verificación y setup final
- [ ] Fase 12 — V1.1: Galaxia + Tienda
- [ ] Fase 13 — V1.5: web dominante + datos personales

## 5. Fase 1 — Fundación técnica (HECHA)

**Commit**: `4420909` — "feat: fundacion tecnica - dominio tipado, firebase client y estructura de capas".

**Objetivo**: dominio tipado as-built, cliente de Firebase inicializado y estructura de carpetas por capas (dominio/repositorios/features/app) antes de tocar cualquier pantalla real.

**Archivos** (confirmado con `git show --stat 4420909`): `src/domain/entities/{category,inverse-session,invisible-event,preset,study-session,user-profile,weekly-goal}.ts`, `src/domain/enums/{category-type,timer-state}.ts`, `src/domain/value-objects/{category-snapshot,duration-seconds,month-key,preset-snapshot,week-key}.ts`, `src/infrastructure/firebase/{client,collections}.ts`, `src/constants/{routes,theme}.ts`, `src/types/common.ts`, `.env.example`, carpetas `.gitkeep` para `src/application/{coordinators,use-cases}/`, `src/features/`, `src/repositories/`, `src/store/`.

**Reglas que implementa**: estructura de capas de brief §7 (sin `screens/`, dominio puro sin React/Firebase); los 10 `TimerStateName` de `02-DOMINIO.md` §3.1; nombres canónicos base (`status`, `isArchived`, `startedAt`/`endedAt` vs. `startAt`/`endAt`) de decisiones-tomadas.md puntos 11-13.

**Dependencias**: ninguna (primera fase).

**Criterios de aceptación**: cumplidos — el proyecto compila (`tsc`), `src/infrastructure/firebase/client.ts` inicializa Auth+Firestore desde `.env`, ninguna entidad importa React/Firebase.

**Tests del dominio**: ninguno en este commit (los tipos son declaraciones, sin funciones puras que probar) — no es una brecha, es el orden correcto según el Principio 3 (tipos antes que reglas).

**Pruebas manuales**: `npx expo start --web` levanta sin errores.

**Riesgos materializados**: ninguno documentado; los nombres de esta fase son los que `02-DOMINIO.md` cita como as-built en toda su §3.2.

**Commit ya aplicado** — no se sugiere uno nuevo.

## 6. Fase 2 — Autenticación (HECHA)

**Commit**: `51fbcfa` — "feat: autenticacion completa con Firebase (email/password + Google) y AuthGate".

**Objetivo**: login/registro funcional (Email/Password + Google Sign-In) y una pantalla protegida por sesión, con las 4 tabs base ya enrutadas.

**Archivos**: `src/app/(auth)/{_layout,login,register}.tsx`, `src/app/(tabs)/{_layout,calendar,settings,stats,timer}.tsx` (placeholders "Fase pendiente" para calendar/stats/timer), `src/features/auth/{components/*,hooks/*,schemas/auth-schemas.ts}`, `src/infrastructure/firebase/auth.ts`, `src/repositories/user/userRepository.ts`, `src/store/auth/authStore.ts`. Elimina `src/app/explore.tsx`, `src/app/index.tsx` y varios componentes de la plantilla Expo por defecto (limpieza consistente con el Principio 1: no se preservan artefactos de plantilla sin valor de producto).

**Reglas que implementa**: brief §6 ("Auth: Email/Password + Google. El límite de ~100 usuarios de la app OAuth sin verificar se acepta") y decisiones-tomadas.md punto 19 (mismo límite, sin iniciar verificación paga).

**Dependencias**: Fase 1 (tipos de `UserProfile`, cliente Firebase).

**Criterios de aceptación**: cumplidos — registro y login con Email/Password funcionan, Google Sign-In funciona (con el límite de ~100 usuarios aceptado conscientemente), `AuthGate`/`useRequireAuth` protege las tabs, `UserRepository` crea `profile/main` idempotentemente tras el primer login.

**Tests del dominio**: ninguno (autenticación es infraestructura, no dominio puro) — coherente con el alcance de `src/domain/**`.

**Pruebas manuales**: flujo completo de registro → logout → login → Google Sign-In.

**Riesgos materializados**: ninguno documentado. Riesgo latente aceptado (no bloqueante): límite de Google Sign-In sin verificar — ya resuelto como aceptado en decisiones-tomadas.md punto 19.

**Commit ya aplicado** — no se sugiere uno nuevo.

## 7. Fase 3 — Categorías, presets y ajustes (HECHA, con brecha pendiente)

**Commit**: `9f4ce68` — "feat: CRUD de categorias, presets y pantalla de settings".

**Objetivo**: CRUD completo de categorías (tres árboles por `type`) y presets, más la pantalla de Configuración (frase de cancelación, preferencias de sonido).

**Archivos**: `src/features/categories/{components/{category-form,color-picker}.tsx,domain/category-rules.ts,hooks/*,schemas/category-schema.ts,services/category-service.ts}`, `src/features/presets/{components/preset-form.tsx,domain/preset-rules.ts,hooks/*,schemas/preset-schema.ts,services/preset-service.ts}`, `src/features/settings/{components/*,domain/sound-catalog.ts,hooks/useUserSettings.ts,services/settings-service.ts}`, `src/repositories/{categories/categoryRepository,presets/presetRepository,settings/settingsRepository}.ts`, `src/app/(tabs)/settings.tsx` (reemplaza el placeholder de la Fase 2).

**Reglas que implementa**: `02-DOMINIO.md` §2.2 (categorías/presets), I-14 parcial (solo el campo `isArchived`, ver brecha abajo), color vivo (I-15) vía `resolveCategoryColor`/`resolveCategoryName` sobre `categoryIndex`; paleta suave + RGB manual (SPEC §12.3); preset "Estándar" sembrado por defecto (`STANDARD_PRESET_VALUES`).

**Dependencias**: Fase 1 (entidades `Category`/`Preset`), Fase 2 (repositorios cuelgan de `uid` autenticado).

**Criterios de aceptación**: cumplidos para el alcance CRUD plano — crear/editar/archivar categoría y preset, exactamente un preset con `isDefault: true`, colores resueltos siempre por `categoryId` (nunca snapshot).

**Brecha pendiente** (no bloquea la Fase 4; debe cerrarse antes de que la Fase 7/Calendario por capas dependa de categorías estables):
1. `Category.parentId?: string` (`02-DOMINIO.md` §3.3, fila "Categorías/presets") **no está implementado** — no hay jerarquía de un nivel, ni propagación de color padre→hijos (I-14 solo verificado para el caso sin jerarquía).
2. No existe un método `CategoryRepository.remove()` que archive automáticamente si la categoría está referenciada por sesiones/eventos/metas (I-14, "nunca se borran físicamente… se archivan si hay referencias"): hoy `setCategoryArchived`/`archiveCategoryService` son un toggle manual, sin verificación de referencias.
3. `src/app/(tabs)/_layout.tsx` sigue con las 4 tabs de la Fase 2 (`calendar`, `settings`, `stats`, `timer`), no con las **5 pestañas ya confirmadas** por el creador (`_brief-orquestador.md` §12.5, 2026-09-06): Inicio, Cronómetro, Calendario, Estadísticas, Tienda — con Configuración movida a un botón dentro de Inicio, no como pestaña propia. Esta brecha se cierra agregando Inicio y Tienda como placeholders "Fase pendiente" (sin galaxia ni catálogo real todavía, igual que ya se hizo con calendar/stats/timer en la Fase 2) y moviendo el botón de Configuración; el contenido interactivo completo de la Galaxia/Tienda (planetas, arrastre, catálogo) sigue siendo exclusivo de la Fase 12 (§16) — no se adelanta nada de eso aquí. Puede cerrarse junto con el punto 1/2 de esta brecha o, a más tardar, al iniciar la Fase 7 (que ya reemplaza el placeholder de `calendar.tsx`).

**Tests del dominio**: ninguno en `src/domain/**` (las reglas de categoría viven en `src/features/categories/domain/category-rules.ts`, fuera del `include` de `vitest.config.ts`) — brecha menor de cobertura, no de arquitectura (el archivo ya es dominio puro, solo falta un test).

**Pruebas manuales**: CRUD de categoría y preset verificado en el dispositivo/web al momento del commit.

**Riesgos**: si la Fase 9 (Metas) o la Fase 12 (Galaxia) llegan sin resolver `parentId?`, la UI de "meta con supermeta" queda sin forma de agrupar categorías jerárquicamente en la fuente (nota: `WeeklyGoal.parentGoalId` es independiente de `Category.parentId` — la jerarquía de metas no depende de esta brecha, pero la de categorías para Calendario por capas sí se beneficia de tenerla resuelta antes).

**Commit sugerido para cerrar la brecha** (opcional, puede ir en la Fase 7 si se prefiere no interrumpir el cronómetro): `feat: subcategorias de un nivel y archivado seguro de categorias referenciadas`.

## 8. Fase 4 — Núcleo del cronómetro + sincronización (EN CURSO)

Esta es la fase que `03-CRONOMETRO.md` describe como "la que la sesión `BC Orquestador Productvt` está esperando para retomar" (§0 de ese documento), y la que este plan divide en dos sub-fases con Definición de Hecho independiente (§3): **4a** entrega el motor completo funcionando en un solo dispositivo, sin ninguna dependencia de sincronización; **4b** agrega el protocolo dominante/espectador para que el mismo motor funcione correctamente entre dos o más dispositivos. La división no es arbitraria: es exactamente la frontera que ya trazó el propio código as-built (comentarios "LÍMITE DE ESTA FASE" en `active-session.ts` y `device-identity.ts`, §2.1) y la que separa `03-CRONOMETRO.md` (comportamiento de un dispositivo) de `04-SINCRONIZACION.md` (protocolo entre dispositivos).

**Nota sobre el temporizador inverso**: el dominio del inverso (`inverse-timer-machine.ts`, `inverse-timer-events.ts`, `rules/inverse-timer.ts`, `InverseSession.autoFinished`/`deviceInfo?`) ya se está construyendo **dentro** de la Fase 4a, adelantado respecto del orden nominal de 11 fases (donde "Temporizador inverso" es la Fase 6). Esto es consistente, no un desvío: el inverso comparte el mismo singleton discriminado `active/session` (`type: 'study' | 'inverse'`) y la misma exclusión mutua (I-11, `03-CRONOMETRO.md` §12.4) que la sesión de estudio, así que construir ambas máquinas de estados a la vez evita reabrir `active-session.ts` dos veces. La Fase 6 (§10) queda entonces acotada a lo que realmente falta del inverso: repositorio, pantalla y los casos de test P37-P41 que hoy siguen sin escribir.

### 8.1 Fase 4a — Motor local del cronómetro (HECHA, `01019c7`, con brecha pendiente; dominante único, sin protocolo multi-dispositivo)

**Objetivo**: máquina de estados completa del cronómetro de estudio y del temporizador inverso corriendo en un solo dispositivo Android (dev build local), con banco de descanso, almuerzo, cancelación y ventanas de respuesta funcionando exactamente como fija `03-CRONOMETRO.md`, sin ningún protocolo de dominante/espectador todavía (eso es 4b).

**Archivos**: todos ya commiteados en `01019c7` (§2.1) — dominio puro (`entities/active-session.ts`, `device-identity.ts`; `machines/{study-timer-events,study-timer-machine,inverse-timer-events,inverse-timer-machine,notification-intents}.ts`; `rules/{response-window,break-bank,lunch,cancellation,inverse-timer,materialize-session,session-effective-seconds,timer-engine,active-session-guard}.ts`), infraestructura (`collections.ts` con `activeSessionDocRef`/`ACTIVE_SESSION_DOC_ID`, `src/repositories/active-session/`), aplicación (`StudySessionCoordinator`, `InverseSessionCoordinator`, `ActiveTimerRecoveryService` en `src/application/coordinators/`), notificaciones/audio (`timerNotificationService`, `timerAudioService`) y UI (`src/features/timer/**`, `src/app/(tabs)/timer.tsx` ya reemplaza el placeholder de la Fase 2). Ver §2.1 para el detalle completo por capa — esta tabla ya no distingue "faltan" para el alcance de 4a que fijó `03-CRONOMETRO.md` al cerrarse el commit; la única brecha detectada es posterior, por una decisión del creador del mismo día (D6.b, ver "Brecha pendiente" abajo).

**Brecha pendiente** (no bloquea las Fases 4b-8; se cierra en la Fase 9, cuando `WeeklyGoal.color` exista — ver §13):
1. `StudySession.goalId?: string` (`02-DOMINIO.md` §3.3, adición "fase metas / Cronómetro", D6.b confirmado por el creador 2026-09-06) **no está implementado**: `StartSessionPayload` (`03-CRONOMETRO.md` §2) no incluye `goalId` y `timer-session-form.tsx` no ofrece elegir una meta al iniciar el bloque. Es una elección explícita del usuario, nunca inferida por `categoryId` (una categoría puede tener más de una `WeeklyGoal`).
2. El panel activo del cronómetro (`timer-active-panel.tsx`) no pinta con el color de la meta cuando hay una asociada — sigue usando solo `category.color`. `_brief-orquestador.md` §11 es explícito en que esto "no es solo un ajuste de color... exige una integración funcional real".
3. No es una omisión bloqueante: `WeeklyGoal.color` (el dato que el selector necesitaría mostrar) todavía no existe — recién lo agrega la Fase 9. El orden correcto es agregar `goalId` y el selector de meta cuando esa fase ya haya sembrado `color` (nota equivalente en §13).

**Reglas que implementa**: `03-CRONOMETRO.md` completo (§1-§13, salvo lo explícitamente delegado a `04-SINCRONIZACION.md` en su §0: protocolo dominante/espectador y `clockOffset`); `02-DOMINIO.md` §2.5, §3.4, §3.5 (formas de `ActiveSession`/`DeviceIdentity`, sin las reglas de escritura 3-4 de esa sección — solicitud/toma de control — que son 4b); invariantes I-1 a I-9, I-11 (mitad: "crear falla si existe", sin la mitad multi-dispositivo), I-13, I-17, I-19, I-20 (mitad: `isZombie` puro, sin la garantía transaccional entre dos lectores de 4b); matriz de degradación de `matriz-degradacion-plataformas.md` §1 (Android).

**Dependencias**: Fase 1 (entidades base), Fase 2 (uid autenticado), Fase 3 (categorías para elegir al iniciar sesión, presets para `presetSnapshot`).

**Criterios de aceptación**:
1. **Cumplido**: los 42 casos de `03-CRONOMETRO.md` §13 están escritos y en verde (`npx vitest run` limpio, 45/45 tests — §2.2).
2. **Cumplido** (verificado en el dispositivo Android real al cerrar el commit `01019c7`): iniciar, completar bloques, tomar/saltar/personalizar descansos, pedir almuerzo desde cualquier estado permitido, cancelar con doble confirmación y dejar expirar una ventana funcionan, con notificación y sonido en cada transición que `03-CRONOMETRO.md` §11 exige.
3. Cerrar la app a mitad de un bloque y reabrirla reconstruye el tiempo transcurrido exacto por diferencia de timestamps (aunque sin `clockOffset` de servidor todavía — eso lo corrige 4b sin romper esta fase).
4. Ningún componente de `src/app`/`src/features/timer` importa `firebase/firestore` directamente (Principio 4).
5. Criterio de éxito de producto 1 de `01-SPEC.md` §10.1: iniciar una sesión con el preset por defecto toma ≤ 3 toques y < 5 segundos desde la pantalla del Cronómetro.

**Tests del dominio**: `03-CRONOMETRO.md` §13 completa — P1-P42, todos escritos y en verde (§2.2). P11 (`END_SESSION` desde `break_completed_waiting_response`) ya no está en rojo.

**Pruebas manuales** (sobre el dev build de Android, no el mockup): flujo completo de una sesión con preset "Estándar" de principio a fin (4 bloques, descanso corto/largo, almuerzo, "Terminar sesión"); forzar una expiración dejando vencer una ventana de 30 s; cancelar a mitad de un bloque con al menos un bloque previo completado y verificar que el historial conserva ese tiempo; correr un bloque inverso hasta el tope `2·T` y verificar el auto-cierre. Comparar visualmente contra `01-mockups/mobile/cronometro.html` como referencia de diseño, no como validación (Principio 7).

**Riesgos**:
- Doze mode / app-killers de fabricante pueden retrasar notificaciones pese a la exención de batería — riesgo de plataforma aceptado, no bloqueante (`matriz-degradacion-plataformas.md` §1, fila "Riesgo residual").
- `expo-dev-client` ya está en `package.json` pero conviene reverificar que el prebuild/build de Android local (`09-SETUP-Y-OPERACION.md` §6) sigue funcionando tras el volumen de cambios de este commit — bloqueante operativo, no de código, para repetir la prueba manual en una máquina nueva.
- La brecha de `goalId`/color de meta (arriba) reabre `src/features/timer/**` en la Fase 9 — riesgo menor de romper alguno de los 42 casos de `03-CRONOMETRO.md` §13 si el selector de meta toca `timer-session-form.tsx`/`timer-active-panel.tsx` sin volver a correr `npx vitest run` completo.

**Commit ya aplicado** (`01019c7`, "feat: núcleo del cronómetro de estudio y temporizador inverso (Fase 4a)") — no se sugiere uno nuevo.

### 8.2 Fase 4b — Sincronización multi-dispositivo (dominante/espectador)

**Objetivo**: el mismo motor de 4a funcionando correctamente cuando dos o más dispositivos (Android dominante, Android/web espectadores) observan y compiten por la misma sesión activa — protocolo de cambio de dominante, `clockOffset`, cierre perezoso de ventanas vencidas/zombie desde cualquier lector, y recuperación tras cierre inesperado.

**Archivos** (todos "ADICIÓN" de `04-SINCRONIZACION.md`, ninguno existe hoy):
- `src/application/coordinators/active-session-recovery-service.ts` — algoritmo completo de `04-SINCRONIZACION.md` §8.1 (`recoverActiveSession`), invocado en arranque frío, vuelta a primer plano y reconexión.
- `src/application/coordinators/control-handover-service.ts` — flujo de solicitud/toma de control de §5 (`updateDoc(controlRequest)`, `runTransaction` de `validTakeover()`).
- Extender `src/repositories/active-session/activeSessionRepository.ts` (creado en 4a) con: `runTransaction` de creación cableada a `canStartNewActiveSession` (ya existe como guarda pura desde 4a), lectura por `onSnapshot`, cierre perezoso transaccional (`closeLazySessionIfDue`, §7.2), y la primitiva exacta por regla de la tabla de §3 de ese documento (`updateDoc` simple para checkpoints y `controlRequest`, `WriteBatch` para cierre normal, `runTransaction` para crear/tomar control/cierre perezoso).
- `src/domain/rules/clock-offset.ts` (o incorporado a `timer-engine.ts`) — cálculo de `clockOffsetMs` (`03-CRONOMETRO.md` §10.2, `04-SINCRONIZACION.md` §6) y su persistencia en `productvt.clockOffsetMs` (clave ya reservada en `storage/keys.ts` desde 4a).
- `firestore.rules` (raíz de `productvt-beta/`) — fragmento anotado de `04-SINCRONIZACION.md` §11: `create` del singleton solo si `deviceInfo.platform == 'android'` y no existe; `dominantUnchanged()`/`onlyControlRequestChanged()`/`requestFromAndroid()`/`validTakeover()` citadas literal de `02-DOMINIO.md` §5.3; `delete` permitido a cualquier dueño sin exigir ser dominante (cierre de zombie).
- UI: diálogo "¿Cambiar de dominante?" e indicador de rol (`RolePill` de brief §8) en la pantalla del cronómetro.

**Reglas que implementa**: `04-SINCRONIZACION.md` completo (§1-§14); `02-DOMINIO.md` §3.4 reglas de escritura 3-6, §5.3 (`firestore.rules`), §7 (matriz de plataformas de datos: solo Android crea/escribe/pide control; web/desktop-PWA solo leen y pueden cerrar zombies); invariantes I-11 (mitad multi-dispositivo), I-12, I-20 (mitad transaccional).

**Dependencias**: Fase 4a completa y commiteada (no tiene sentido sincronizar un motor que todavía no pasa sus propios 42 casos en un solo dispositivo).

**Criterios de aceptación**:
1. Con dos dispositivos Android (o un Android + la PWA de escritorio como espectador) abiertos a la vez sobre la misma cuenta: el segundo dispositivo ve la sesión activa del primero en vivo (`onSnapshot`), con el reloj interpolado coincidiendo dentro de un margen de red razonable (§6.2 de `04-SINCRONIZACION.md`).
2. Un espectador Android que toca un control dispara el diálogo "¿Cambiar de dominante?" en ambos dispositivos; el primero que confirma gana (verificado forzando la carrera manualmente, no solo revisando el código).
3. Apagar la red del dominante no detiene el conteo ni impide los checkpoints locales (persistencia offline del SDK) — solo la toma de control y el cierre perezoso exigen red (`04-SINCRONIZACION.md` §9).
4. Dejar una sesión "huérfana" (matar la app dominante a mitad de una ventana de espera) y abrir la web/otro Android tras el vencimiento cierra la sesión como corresponde (`expired` o zombie) sin duplicar el cierre si dos lectores lo intentan casi a la vez.
5. `firestore.rules` desplegadas contra el proyecto Spark rechazan: un `create` desde `platform: 'web'`, un `controlRequest` con `requesterPlatform` distinto de `'android'`, y un `update` de checkpoint desde un `dominantDeviceId` que no coincide.
6. Costo: una sesión de estudio típica (4-12 bloques) se mantiene dentro de las estimaciones de `04-SINCRONIZACION.md` §12 (muy por debajo del cupo diario gratuito de Firestore Spark).

**Tests del dominio**: los casos de `03-CRONOMETRO.md` §13 no cambian (ya son responsabilidad de 4a); esta fase agrega, si se decide testear con el emulador de Firestore (`@firebase/rules-unit-testing`, gratis, corre local sin costo Spark): pruebas de `firestore.rules` para I-11/I-12 (creación exclusiva, toma de control exclusiva) y de `closeLazySessionIfDue` para la garantía "solo un cierre se aplica" de `04-SINCRONIZACION.md` §7.3. No son parte de la matriz de 42 casos (dominio puro sin Firebase) pero sí de esta fase.

**Pruebas manuales**: los 5 casos límite de `04-SINCRONIZACION.md` §13 (dos pestañas web, reinstalación de la app, cambio de celular con el viejo aún encendido, reloj muy desfasado, sesión huérfana entre cambio de dominante y primer checkpoint) ejecutados a mano con dos dispositivos/navegadores reales.

**Riesgos**:
- Es la fase con más superficie de condiciones de carrera del proyecto — el riesgo principal es probarla solo mentalmente ("el código se ve correcto") en vez de forzar las carreras a mano con dos dispositivos físicos, como exige el criterio de aceptación 2.
- `firestore.rules` mal escritas fallan en silencio desde el cliente en algunos SDKs (la escritura simplemente se rechaza) — probar cada regla también con el emulador ayuda a no descubrirlo recién en producción.
- Sin Cloud Functions, el cierre de zombie depende 100 % de que algún cliente vuelva a abrir la app dentro de un tiempo razonable tras las 24 h — si el usuario no abre la app en varios días, el singleton queda "vivo" ese tiempo (aceptado, `04-SINCRONIZACION.md` §9.3-§9.4, no es un bug de esta fase).

**Commit sugerido**: `feat: sincronizacion multidispositivo del cronometro (dominante-espectador, firestore.rules)`.

## 9. Fase 5 — Sesiones e historial (PENDIENTE)

**Objetivo**: lista y detalle de sesiones pasadas (estudio e inverso) leídas desde `users/{uid}/sessions/`, con filtro por categoría/rango de fechas — la primera pantalla que consume datos ya materializados por la Fase 4.

**Archivos** (ADICIÓN, siguiendo el patrón as-built `features/<feature>/{components,hooks,services}` + `repositories/<feature>/`): `src/repositories/sessions/sessionRepository.ts` (nombrado en brief §7 como `SessionRepository`; opera sobre el documento único `StudySession`/`InverseSession` con arrays embebidos — **no** una subcolección de bloques, pese a la redacción ambigua de brief §7; `02-DOMINIO.md` §2.3 y §5.1 son la fuente correcta, as-built), `src/repositories/sessions/inverseSessionRepository.ts`, `src/features/sessions/{components/session-list-item.tsx,components/session-detail.tsx,hooks/useSessions.ts,services/session-query-service.ts}`.

**Reglas que implementa**: `02-DOMINIO.md` §5.1 (fila `sessions/{sessionId}`, `id === sessionId === ActiveSession.sessionId`, nunca `status: 'active'` — invariante I-13, verificable aquí porque es la primera fase que *lee* la colección que la Fase 4 escribe), §5.2 (consultas e índices compuestos sobre `sessions/`).

**Dependencias**: Fase 4a+4b completas (`sessions/` debe tener documentos reales materializados para tener algo que listar).

**Criterios de aceptación**: la lista muestra sesiones de estudio e inverso, cada una pintada con el color **vigente** de su categoría (I-15, nunca `colorSnapshot`), y el detalle de una sesión de estudio desglosa `studySegments[]`/`breakSegments[]`/`lunchSegments[]` tal como quedaron persistidos.

**Tests del dominio**: ninguno nuevo de máquina de estados (ya cubiertos en la Fase 4); cualquier función pura de filtrado/ordenamiento no trivial que se agregue debería sumarse a `src/domain/**` con su propio test (Principio 3).

**Pruebas manuales**: generar al menos 10 sesiones variadas (estudio completas, canceladas, expiradas; inverso normal y auto-cerrado) y verificar contra el criterio de éxito 3 de `01-SPEC.md` §10.1 ("cero discrepancias entre `effectiveStudySeconds` mostrado... y la suma manual de los bloques completados").

**Riesgos**: ninguno técnico nuevo — el riesgo es de alcance de UI (cuánto detalle mostrar) más que de dominio o sincronización, y depende de `06-DISENO-UI.md` (no escrito a la fecha de este documento).

**Commit sugerido**: `feat: repositorio y pantalla de historial de sesiones`.

## 10. Fase 6 — Temporizador inverso (PENDIENTE)

**Objetivo**: cerrar lo que la Fase 4a dejó fuera del inverso a propósito (§8, nota) — repositorio, pantalla y la parte de la matriz de tests específica del inverso que todavía no existe.

**Archivos**: `src/repositories/sessions/inverseSessionRepository.ts` (si no se creó ya en la Fase 5 — puede compartirse, es la misma colección `sessions/` discriminada por `type`), `src/features/inverse/{components/*,hooks/useInverseTimer.ts}`, `src/app/(tabs)/timer.tsx` ampliado con la selección estudio/inverso (o una pantalla separada, según defina `06-DISENO-UI.md`).

**Reglas que implementa**: el dominio ya existe desde la Fase 4a (`inverse-timer-machine.ts`, `rules/inverse-timer.ts`) — esta fase implementa `03-CRONOMETRO.md` §12 **en la UI**: recordatorios cada 15 min sin exigir respuesta, notificación distinta al alcanzar `T`, tope duro `2·T` con auto-cierre, cancelación simple (no doble confirmación, a diferencia del cronómetro de estudio — §8.4 de ese documento), y la exclusión mutua con una sesión de estudio activa (§12.4, I-11) reflejada en la UI (botón de iniciar inverso deshabilitado si hay una sesión de estudio activa, y viceversa).

**Dependencias**: Fase 4a (dominio del inverso), Fase 4b (para que el inverso también se beneficie del protocolo dominante/espectador — un bloque inverso activo también se ve en modo espectador desde web/desktop-PWA, mismo singleton).

**Criterios de aceptación**: iniciar un inverso mientras hay una sesión de estudio activa falla visiblemente (mensaje claro, no un error silencioso); alcanzar `T` resalta "Finalizar" y notifica sin detener el conteo; alcanzar `2·T` autocierra (`autoFinished: true`); cancelar es un toque + confirmación simple.

**Tests del dominio**: P37-P41 de `03-CRONOMETRO.md` §13.7 (recordatorios, no-autodetención en `T`, tope duro `2·T`, cancelación sin doble confirmación excluida de estadísticas, exclusión mutua) — si no se escribieron ya en la Fase 4a, son el criterio de "matriz en verde" de esta fase.

**Pruebas manuales**: correr un inverso hasta pasar `T` y verificar la notificación de "meta alcanzada"; dejarlo llegar a `2·T` y verificar el auto-cierre; intentar iniciar una sesión de estudio mientras el inverso corre (y viceversa) y verificar el bloqueo.

**Riesgos**: el supuesto de exclusión mutua (`_brief-orquestador.md` §10.4) sigue **pendiente de confirmar** por el creador — si decide permitir ambos en paralelo, `02-DOMINIO.md` §2.5 tendría que dejar de compartir un único singleton discriminado (cambio de esquema, no solo de UI) — no rediseñar el esquema en esta fase sin antes verificar si el supuesto sigue vigente.

**Commit sugerido**: `feat: pantalla y repositorio del temporizador inverso`.

## 11. Fase 7 — Calendario y eventos invisibles, por capas (PENDIENTE, alcance ampliado)

**Objetivo**: calendario con capas activables/desactivables (brief §12, `03-requisitos/nueva-funcionalidad-calendario-por-capas.md`) en lugar de una vista plana — capas de meta (virtuales, una por `WeeklyGoal`) y capas personalizadas (`CalendarLayer`, agrupan categorías libremente), en 5 vistas (año/mes/semana/3 días/día), con la vista día mostrando franja horaria. Responsive real en Android, web y desktop-PWA por igual — a diferencia del cronómetro, el calendario **no** tiene restricción de plataforma dominante (`_brief-orquestador.md` §12, "Plataformas": uso primario en ambas).

**Por qué el alcance ampliado no reordena nada**: el requerimiento de capas se pidió el 2026-09-06, con el build todavía en la Fase 4b — no llegó tarde. `02-DOMINIO.md` §3.3 ya incorporó el modelo de datos completo antes de que esta fase empezara a construirse, así que no hay nada que migrar ni ninguna versión "vieja" del calendario que reescribir.

**Archivos** (ADICIÓN, ninguno existe hoy):
- `src/domain/entities/calendar-layer.ts` — interfaz `CalendarLayer` (`id`, `userId`, `name`, `categoryIds[]`, `isVisible`, `createdAt`, `updatedAt`, `schemaVersion`) tal como la fija `02-DOMINIO.md` §3.3 literal, sin modificarla.
- `src/domain/entities/weekly-goal.ts` (ya existe as-built) — agregar `layerVisible?: boolean` (ausente ⇒ `true`, visible por defecto). Nota: `name`, `parentGoalId?`, `skinId?` son adiciones de la **Fase 9** (metas), no de esta fase — si Calendario se construye antes de que Metas termine de tocar `weekly-goal.ts`, agregar solo `layerVisible?` aquí y dejar el resto a la Fase 9 para no pisarse.
- `src/repositories/calendar-layers/calendarLayerRepository.ts` — **`CalendarLayerRepository`**, ya fijado literal por `05-ARQUITECTURA.md` §3.2 (firmas completas: `listCalendarLayers`, `subscribeCalendarLayers`, `createCalendarLayer`, `updateCalendarLayer`, `setCalendarLayerVisible`, `deleteCalendarLayer`, con esta misma ruta) — este plan solo lo cita, no lo fija (corrige una atribución errónea de una versión anterior de este documento, que no listaba a `05-ARQUITECTURA.md` entre sus Fuentes). CRUD normal contra `users/{uid}/calendarLayers/{layerId}` (`02-DOMINIO.md` §3.3, "Firestore: ... CRUD normal, sin arbitraje"), sin relación con el singleton `active/session` — es CRUD paralelo sin restricción de plataforma (D14).
- `src/features/calendar/services/{calendar-layer-assembler,calendar-view-assembler}.ts` — el "assembler" que resuelve, para un rango de fechas y un conjunto de capas activas, qué ítems (sesiones, eventos invisibles, ocurrencias recurrentes expandidas) se pintan y con qué color vigente (I-15). Vive en `features/calendar/services/` por decisiones-tomadas.md punto 8 ("los assemblers de stats/calendar quedan donde el plan ya los puso, por ser más específicos de su feature").
- `src/features/calendar/components/{layer-toggle-list,year-view,month-view,week-view,three-day-view,day-timeline-view}.tsx` — las 5 vistas más el panel de capas (checkboxes estilo "Mis calendarios").
- `src/app/(tabs)/calendar.tsx` (reemplaza el placeholder de la Fase 2).
- `UserSettings` gana el campo `defaultCalendarView?: CalendarViewMode` (ausente ⇒ `'week'`), ya fijado literal por `07-CALENDARIO-ESTADISTICAS-METAS.md` §1.5 (documento hermano ya completo, no en redacción) — pendiente solo de que `02-DOMINIO.md` §3/§5.1 lo incorpore formalmente, gap que ese mismo documento señala en su propia §4 (no una decisión abierta de esta fase).

**Reglas que implementa** (`_brief-orquestador.md` §12, `02-DOMINIO.md` §3.3 fila `calendar-layer.ts`):
1. Una capa de meta filtra por `WeeklyGoal.categoryId` y muestra **histórico completo** de esa categoría (no solo la semana vigente de la meta) — es una capa **virtual**, nunca un documento `CalendarLayer` propio.
2. Una capa personalizada agrupa **por categoría** (`categoryIds[]`, cualquier `type`: study/inverse/invisible) — no por evento individual.
3. La visibilidad de cualquier capa (`CalendarLayer.isVisible` o `WeeklyGoal.layerVisible`) sincroniza vía Firestore, sin arbitraje (D14) — dos dispositivos ven el mismo conjunto de capas activas.
4. Sin límite de capas en el modelo de datos — la densidad visual (cuántas mostrar sin saturar la vista Semana) es responsabilidad de `06-DISENO-UI.md` (no escrito a la fecha de este documento), no de esta fase de datos/lógica.
5. Ninguna capa tiene color propio: todo ítem se pinta con el color **vigente** de su categoría (I-15) — la capa es un filtro y un interruptor, nunca una fuente de color.
6. Recurrencia semanal de `InvisibleEvent` (`WeeklyRecurrence`, `02-DOMINIO.md` §3.2) se expande en cliente (`expandRecurringInvisibleEvents`), sin colección de instancias — resuelve REV-MEDIA-3.

**Dependencias**: Fase 3 (categorías estables — cerrar la brecha de `parentId?` de la Fase 3, §7, antes de esta fase conviene, aunque no es bloqueante estricto: `categoryIds[]` acepta cualquier lista plana igual sin jerarquía), Fase 4 (para tener sesiones reales que pintar), Fase 9 en paralelo para las capas de meta (aunque `layerVisible?` puede agregarse independientemente, ver nota arriba).

**Criterios de aceptación**:
1. Crear una capa personalizada "Horario" con 3 categorías, activarla/desactivarla, y verificar que el calendario muestra/oculta exactamente los ítems de esas categorías.
2. Cada `WeeklyGoal` con `targetSeconds` configurado aparece como una capa de meta en el panel, activada por defecto (`layerVisible` ausente ⇒ visible), mostrando el histórico completo de su categoría al navegar a meses anteriores/futuros, no solo la semana de la meta.
3. Las 5 vistas (año/mes/semana/3 días/día) renderizan sin overflow horizontal; la vista día muestra franja horaria con las horas del día, no una lista.
4. La vista Semana con ≥ 8 ítems en un mismo día trunca con algo equivalente a "+N más" en vez de desbordar la celda.
5. Cambiar la vista por defecto en Ajustes persiste y se respeta la próxima vez que se abre el Calendario, en cualquier dispositivo (sincroniza vía `UserSettings`).
6. Desde Android y desde la PWA de escritorio, el mismo rango de fechas con las mismas capas activas muestra resultados idénticos (criterio de éxito 5 de `01-SPEC.md` §10.1).

**Tests del dominio**: la parte "Calendario y capas" (§6.1) de la matriz ya completa de `07-CALENDARIO-ESTADISTICAS-METAS.md` §6 — 14 casos, Q1-Q14. Esta fase debe dejar esos 14 en verde, incluidos `resolveGoalLayerItems` (histórico completo, no solo semana vigente — Q6) y `resolveCustomLayerItems`/agrupación por `categoryIds[]` (Q3-Q5, Q7).

**Pruebas manuales**: activar/desactivar capas en un dispositivo y confirmar que el cambio se refleja en otro dispositivo (sincronización de CRUD sin arbitraje); navegar a un mes con muchos eventos y evaluar visualmente la densidad de la vista Semana. No existe todavía un mockup de calendario en `01-mockups/` (brecha de insumo de diseño que no bloquea la construcción per Principio 7).

**Riesgos**:
- Sin mockup específico de calendario por capas, la densidad de la vista Semana (brief §12, "resolver con cuidado... como hacen los calendarios profesionales") queda a criterio de quien construya la UI hasta que `06-DISENO-UI.md` la fije — riesgo de rehacer la UI si ese documento aparece después con una dirección distinta.
- El campo `defaultCalendarView` en `UserSettings` ya está fijado literal por `07-CALENDARIO-ESTADISTICAS-METAS.md` §1.5 (`defaultCalendarView?: CalendarViewMode`, ausente ⇒ `'week'`) — solo falta que `02-DOMINIO.md` §3/§5.1 lo incorpore formalmente (gap ya señalado por ese mismo documento en su §4, no una decisión pendiente de esta fase).

**Commit sugerido**: `feat: calendario por capas (CalendarLayer, capas de meta virtuales, 5 vistas)`.

## 12. Fase 8 — Estadísticas (PENDIENTE)

**Objetivo**: agregados de tiempo efectivo por día/semana/mes y por categoría, leídos sobre `sessions/` con el mismo principio de "leer un rango acotado y agregar en cliente" que ya fija `02-DOMINIO.md` §5.2 (sin `stats_cache`, descartado del SPEC v1).

**Archivos**: `src/features/stats/services/stats-assembler.ts` (agregador de feature; la función de agregación en sí puede vivir en `src/domain/**` si no depende de infraestructura, sin contradecir decisiones-tomadas.md punto 8 — ese punto solo fija dónde va el assembler *de feature*, no prohíbe que la fórmula pura sea dominio), `src/features/stats/components/*`, `src/app/(tabs)/stats.tsx` (reemplaza el placeholder de la Fase 2); `src/domain/rules/streak.ts` (nuevo) — `computeCurrentStreakDays(sessions, timezone)`, función pura de dominio (brief §12.6).

**Reglas que implementa**: `01-SPEC.md` §6.12; la regla de agregación reconciliada de `_brief-orquestador.md` §11 ("Estadísticas por categoría... agregación derivada: para una categoría y semana dadas, suma `targetSeconds`/`achievedSeconds` de todas las `WeeklyGoal` que compartan ese `categoryId`, sin importar la forma de almacenamiento") — relevante aunque la UI de supermeta no exista hasta la Fase 12, porque el cálculo ya debe ser correcto para metas simples desde esta fase; **racha de estudio** (`_brief-orquestador.md` §12.6, decisión de alcance del creador 2026-09-06: "la racha en sí (el contador) entra a V1, no V1.1"): `computeCurrentStreakDays` cuenta días consecutivos hacia atrás desde hoy, en `UserProfile.timezone`, con ≥1 bloque completado ese día (`effectiveStudySeconds > 0` de cualquier `StudySession` con `status` `completed`, `cancelled` o `expired` — los tres aportan por igual, D1.b); corte de día a medianoche exacta, sin margen de gracia; los bloques inversos no cuentan; sin campo cacheado ni colección nueva (agregador derivado, igual que el resto de esta fase). Se consume en el tile de racha de Estadísticas y en el hub de Inicio (solo lectura del número).

**Dependencias**: Fase 5 (sesiones materializadas que agregar), Fase 7 (comparten el mismo assembler de rango de fechas que el calendario, conviene no duplicar la lógica de "expandir un rango y filtrar por categoría").

**Criterios de aceptación**: cero discrepancias entre el total mostrado y la suma manual de `effectiveStudySeconds` de una muestra de ≥10 sesiones (criterio de éxito 3, `01-SPEC.md` §10.1); el creador puede ver estudio vs. ocio de la semana en <3 toques (criterio de éxito 9, §10.2); el tile de racha muestra el mismo número de días que un conteo manual sobre sesiones conocidas de antemano.

**Tests del dominio**: la parte "Estadísticas" (§6.2) de la matriz ya completa de `07-CALENDARIO-ESTADISTICAS-METAS.md` §6 — 7 casos, Q15-Q21 (sesión `cancelled`/`expired` cuenta igual que `completed`, `InverseSession.cancelled` excluida, evento invisible fuera de todo total, roll-up incondicional de categoría, atribución por `end` al cruzar medianoche, porcentaje sin división por cero). Se suma aquí, fuera de esa matriz (no es de 07): casos propios de `computeCurrentStreakDays` (racha rota por un día sin bloques, racha que incluye días con sesión `cancelled`/`expired` pero no `InverseSession`, corte exacto a medianoche en `timezone`).

**Pruebas manuales**: comparar manualmente el total de una semana con sesiones conocidas de antemano (mismo criterio que el de aceptación 1).

**Riesgos**: ninguno técnico nuevo — el riesgo es de exactitud de la fórmula de agregación (ya resuelta conceptualmente en el brief §11, solo falta implementarla igual en código) más que de arquitectura.

**Commit sugerido**: `feat: estadisticas dia-semana-mes por categoria`.

## 13. Fase 9 — Metas y estrella (PENDIENTE)

**Objetivo**: `WeeklyGoal` completo (agregando `name`, `color`, `parentGoalId?`, `skinId?`, `layerVisible?` sobre la entidad as-built), configuración de metas semanales por categoría, cálculo de `achievedSeconds`, la estrella mensual/anual gamificada, y el cierre completo de la jerarquía de color de meta (D6.b): agrega `StudySession.goalId?` (brecha de la Fase 4a, §8.1) más el selector de meta al iniciar un bloque y el color del anillo en el Cronómetro.

**Archivos**: extender `src/domain/entities/weekly-goal.ts` (ADICIÓN de `02-DOMINIO.md` §3.3, literal — bloque de código de esa sección, "AMPLIADA 2026-09-06", incluido `color: string`), `src/domain/rules/goal-rules.ts` (nuevo: `canAssignParentGoal` para I-16, cálculo de `achievedSeconds` desde bloques completados atribuidos por `end`, `resolveGoalColorOnCreate` para la copia de color supermeta→hija), `src/repositories/goals/goalRepository.ts` (`GoalRepository`, ya nombrado en brief §7), `src/features/goals/{components/*,hooks/*,services/star-calculator.ts}`. Para cerrar D6.b por completo, no solo el campo: extender `src/domain/entities/study-session.ts` con `goalId?: string` (brecha de la Fase 4a, §8.1) y `src/features/timer/components/{timer-session-form,timer-active-panel}.tsx` con el selector de meta y el color del anillo cuando hay `goalId` — contenido que `06-DISENO-UI.md` §9 (Cronómetro) todavía no ofrece y debe actualizarse en esta misma fase.

**Reglas que implementa**: `02-DOMINIO.md` §3.3 (interfaz ampliada de `WeeklyGoal`), I-16 (`categoryId` de tipo `study`; a lo sumo una meta hoja por `weekKey`+`categoryId`; `parentGoalId` apunta a una meta sin `parentGoalId` propio, máximo dos niveles; `achievedSeconds` nunca desde `totalElapsedSeconds`); regla de estrella mensual confirmada por el creador (R7; decisiones-tomadas.md punto 7: "no, solo hay recompensa cuando se cumple con una constancia... no cuando está vacío" — un mes sin ninguna meta configurada **no** obtiene estrella; se exige ≥1 semana cerrada con ≥1 meta y **todas** las metas de **todas** las semanas cerradas con metas cumplidas); modelo de meta reconciliado de `_brief-orquestador.md` §11 (`WeeklyGoal` siempre forma uniforme, sea hoja o supermeta — sin polimorfismo, sin cálculo especial que sume a los hijos). Jerarquía de color de meta (D6.b, confirmada por el creador 2026-09-06, `02-DOMINIO.md` §1.2/§3.3): supermeta con color propio; meta hija que hereda el color de su supermeta al crearse (copia, no enlace en vivo) y es editable después de forma independiente; categoría como fallback solo para bloques sin `goalId` asociado (D6 sigue intacto para ese caso). El Cronómetro pinta con el color de la meta cuando hay `goalId`; el Calendario pinta relleno = color de la meta y franja secundaria = color de la supermeta — esto exige actualizar también `07-CALENDARIO-ESTADISTICAS-METAS.md` §1.3 (`CalendarAssemblerItem.color`, hoy documentado ahí como "SIEMPRE vigente de la categoría, NUNCA de una capa" sin la excepción de D6.b) en esta misma fase, no solo `02-DOMINIO.md`/`06-DISENO-UI.md`.

**Dependencias**: Fase 3 (categorías de tipo `study`), Fase 5/8 (sesiones y su agregación de tiempo efectivo). Coordinar con la Fase 7 si ambas tocan `weekly-goal.ts` casi a la vez (nota de la Fase 7, §11) para no generar un conflicto de merge sobre el mismo archivo. También cierra la brecha de la Fase 4a (§8.1): agregar `goalId?` a `StudySession` y el selector de meta reabre brevemente `src/features/timer/**` (ya HECHA) — coordinar para no romper los 42 casos de `03-CRONOMETRO.md` §13 al tocar `timer-session-form.tsx`/`timer-active-panel.tsx`.

**Criterios de aceptación**: crear una meta semanal por categoría; ver `achievedSeconds` actualizarse con cada bloque completado de esa categoría en esa semana; obtener la estrella mensual solo cuando corresponde (criterio de éxito 8, `01-SPEC.md` §10.2: "al menos un mes... obtiene la estrella... no por defecto"); una meta con `parentGoalId` sigue calculando su propio progreso igual que una meta sin padre (sin lógica especial de supermeta en esta fase — eso es visual, Fase 12). Además (D6.b): iniciar un bloque asociado a una meta pinta el anillo del Cronómetro con el color de esa meta, no el de la categoría; si esa meta tiene `parentGoalId`, el Calendario pinta el evento con relleno = color de la meta y franja secundaria = color de la supermeta; una meta hija nueva copia el color vigente de su supermeta al crearse y sigue siendo editable después de forma independiente.

**Tests del dominio**: I-16 completo (parametrizado: intentar asignar `parentGoalId` a una meta que ya tiene padre debe fallar — máximo dos niveles); la parte "Metas" (§6.3/§6.4) de la matriz ya completa de `07-CALENDARIO-ESTADISTICAS-METAS.md` §6 — 5 casos, Q22-Q25 más Q26 (roll-up condicional de subcategoría con/sin meta propia, cierre de semana con objetivo exacto, estrella mensual sin metas, estrella con una sola semana con metas cumplida, rollup derivado por categoría entre supermeta y meta hoja). Faltan dos casos que ni 07 ni `03-CRONOMETRO.md` cubren todavía y que esta fase sí debe escribir: mes con una meta incumplida entre varias configuradas ⇒ sin estrella; y crear una meta hija copia el `color` vigente de su supermeta en ese instante (copia, no enlace en vivo — D6.b), sin que cambiar después el color de la supermeta repinte metas hijas ya creadas.

**Pruebas manuales**: configurar metas para 2-3 categorías en la semana actual, completar bloques reales de estudio, y verificar que el progreso y la eventual estrella del mes coinciden con lo esperado a mano.

**Riesgos**: si la Fase 12 (Galaxia) se adelanta a V1 por decisión del creador (supuesto pendiente #6 de `02-DOMINIO.md`), esta fase necesitaría entregar además `GalaxyLayout`/`InventoryItem` con UI real en vez de solo esquema — ver Fase 12 (§16) para el camino de adelanto sin romper el modelo.

**Commit sugerido**: `feat: metas semanales con jerarquia y estrella mensual`.

## 14. Fase 10 — Pulido (PENDIENTE)

**Objetivo**: cerrar la brecha entre "funciona" y "se siente terminado" antes de la verificación final — tema claro/oscuro completo, animaciones/celebraciones, accesibilidad, copys revisados, sin tocar reglas de negocio.

**Archivos**: no se anticipan rutas nuevas de dominio (esta fase no debería tocar `src/domain/**` salvo bugs encontrados) — principalmente `src/constants/theme.ts` (skin "Papel" completo con variante oscura, brief §8), componentes de `src/components/ui/` y microcopys de `src/i18n/es.ts`.

**Reglas que implementa**: brief §8 (theme provider con tokens, skin base "Papel", tipografías Fraunces/Archivo/IBM Plex Mono vía `expo-font`, modo claro/oscuro obligatorio, `prefers-reduced-motion` respetado); `01-SPEC.md` §8.5 (accesibilidad e idioma).

**Dependencias**: todas las fases de UI anteriores (4 a 9) deben existir para tener algo que pulir.

**Criterios de aceptación**: modo oscuro completo sin contrastes rotos; animaciones respetan `prefers-reduced-motion`; ningún copy usa "ciclo" en español (regla de terminología obligatoria) ni deja un texto de plantilla sin traducir.

**Tests del dominio**: ninguno nuevo esperado (fase de UI/UX, no de reglas de negocio) — si esta fase revela un bug de dominio, se corrige y su test se suma a la matriz existente, no se crea una matriz nueva.

**Pruebas manuales**: recorrido completo de la app en modo claro y oscuro, en Android y en la PWA de escritorio, verificando legibilidad y consistencia visual contra `01-mockups/mobile/cronometro.html`/`01-mockups/desktop/galaxia-metas.html` como referencia de skin.

**Riesgos**: sin `06-DISENO-UI.md` escrito a la fecha de este documento, el alcance exacto de "pulido" depende de ese documento cuando exista — riesgo de retrabajo si aparece después con tokens distintos a los ya usados de forma ad-hoc en fases anteriores.

**Commit sugerido**: `feat: pulido visual, modo oscuro y accesibilidad`.

## 15. Fase 11 — Verificación y setup final (PENDIENTE)

**Objetivo**: última fase de V1 — desplegar `firestore.rules`/índices definitivos, correr el checklist completo de `09-SETUP-Y-OPERACION.md`, y verificar los 5 criterios funcionales + los 4 de producto de `01-SPEC.md` §10 de punta a punta.

**Archivos**: `firestore.rules` y `firestore.indexes.json` finales (raíz de `productvt-beta/`) desplegados con `firebase deploy --only firestore`; export de la PWA (`expo export --platform web`) desplegado a Firebase Hosting (`09-SETUP-Y-OPERACION.md` §8); ningún archivo de dominio nuevo esperado.

**Reglas que implementa**: `09-SETUP-Y-OPERACION.md` completo (documento hermano — se cita, no se repite: requisitos de máquina, creación del proyecto Spark, qué no activar, development build local, notificaciones en segundo plano, despliegue web, cuotas, respaldo manual, troubleshooting, checklist final de su §13).

**Dependencias**: todas las fases de V1 (1 a 10).

**Criterios de aceptación**: los 5 criterios funcionales de `01-SPEC.md` §10.1 y, tras 4 semanas de uso real del creador, los 4 de producto de §10.2; checklist de `09-SETUP-Y-OPERACION.md` §13 completo; `firestore.rules` desplegadas coinciden exactamente con las diseñadas en `02-DOMINIO.md` §5.3 y `04-SINCRONIZACION.md` §11.

**Tests del dominio**: no se agregan casos nuevos en esta fase — es el punto donde se confirma que **toda** la matriz acumulada (42 de `03-CRONOMETRO.md` + 26 de `07-CALENDARIO-ESTADISTICAS-METAS.md`, 25 casos Q1-Q25 más Q26 — más los de I-14/I-16 de categorías/metas y los propios de la racha de estudio de la Fase 8) sigue en verde tras el pulido de la Fase 10.

**Pruebas manuales**: recorrido de aceptación completo por cada criterio de `01-SPEC.md` §10, con evidencia (captura o nota) de cada uno.

**Riesgos**: ninguno técnico específico de esta fase — es integración y verificación, no construcción nueva. El riesgo real es de proceso: si alguna fase anterior quedó "casi hecha" sin cumplir su Definición de Hecho (§3), esta fase es donde ese déficit se vuelve visible y bloquea el cierre de V1.

**Commit sugerido**: `chore: firestore.rules e indices definitivos, checklist de setup completo`.

## 16. Fase 12 — V1.1: Galaxia de metas + Tienda (futuro)

**Objetivo**: vista de galaxia interactiva de metas/supermetas (planetas, subgalaxias, arrastre, "Restablecer orden", fondos y skins personalizables) y sección Tienda (skins, fondos, colecciones de rachas, recompensas) — documentada completa en `docs/10-GALAXIA-Y-TIENDA.md` (documento hermano, se cita, no se repite aquí).

**Archivos**: los ganchos de datos (`WeeklyGoal.parentGoalId?`/`.skinId?`, `GalaxyLayout`, `InventoryItem`) ya están en el esquema desde V1 (`02-DOMINIO.md` §3.3/§3.5/§5.1, sembrados en la Fase 9) para que esta fase no migre nada — solo agrega UI y repositorios: `src/repositories/{galaxy-layout/galaxyLayoutRepository,inventory/inventoryRepository}.ts`, y todo lo que `10-GALAXIA-Y-TIENDA.md` fije en sus secciones 5-13 (vistas, layout por defecto, física de arrastre, personalización visual, implementación técnica con Reanimated+Gesture Handler+SVG).

**Reglas que implementa**: `10-GALAXIA-Y-TIENDA.md` completo — se cita por sección en el momento de construir, no se repite en este plan (convención de redacción: "no dupliques... citalos").

**Dependencias**: Fase 9 (metas con `parentGoalId?`/`skinId?` ya pobladas) y Fase 8 (la racha de estudio ya construida y expuesta en Estadísticas — `computeCurrentStreakDays`, brief §12.6: "la racha en sí (el contador) entra a V1, no V1.1"). Esta fase es **consumidora únicamente** de ese número, para el sistema de cofres cada 7 días de racha de la Tienda — no rediseña ni recalcula la racha, solo la lee (brief §12.6: "la Tienda solo la lee, no la rediseña").

**Condición de adelanto a V1**: lo que sigue condicionado a que el creador confirme explícitamente es solo el **contenido interactivo completo** de la galaxia (planetas, subgalaxias, arrastre, personalización visual) — si se confirma (`_brief-orquestador.md` §10.11), esta fase se reordena para ir **después de la Fase 4 (núcleo del cronómetro) y antes de la Fase 10 (Pulido)**, según fija `01-SPEC.md` §9.2 y `_brief-orquestador.md` §11 explícitamente ("en ese caso pasa a ser la vista principal de la sección Metas... después del núcleo del cronómetro y antes del pulido"). La Tienda con catálogo real permanece V1.1 incluso en ese escenario, porque sus 4 preguntas de producto (moneda, definición de supermeta, sincronización de layout, skins gratis) ya tienen default asumido pero no confirmación literal del creador para construir sin riesgo de rehacer trabajo (`decisiones-tomadas.md`, "Alcance — Galaxia de metas + Tienda"). **Esto ya NO incluye la forma de la barra de navegación**: `_brief-orquestador.md` §12.5 confirma las 5 pestañas (Inicio, Cronómetro, Calendario, Estadísticas, Tienda, con Configuración movida a un botón dentro de Inicio) como decisión cerrada el 2026-09-06, independiente de cuándo se construya el contenido interactivo de la galaxia — ver la brecha agregada a la Fase 3 (§7) para las pestañas placeholder de Inicio/Tienda, que no esperan a esta fase.

**Criterios de aceptación, tests del dominio, pruebas manuales, riesgos**: fijados en `10-GALAXIA-Y-TIENDA.md` §16 ("Casos de prueba") y §17 ("Preguntas abiertas para el creador") — no se repiten aquí.

**Commit sugerido**: `feat: galaxia de metas interactiva y tienda de skins-fondos-recompensas` (o dividido en dos commits, galaxia y tienda por separado, dado el tamaño — a criterio de quien construya).

## 17. Fase 13 — V1.5: web dominante opcional + exportar/borrar datos (futuro)

**Objetivo**: dos mejoras de confiabilidad y datos personales que `01-SPEC.md` §9.3 fija para V1.5, sin que ninguna de las dos requiera cambiar el modelo de datos ya construido en V1.

**13.1 — Web dominante opcional** (si el creador lo confirma; supuesto pendiente #10 de `_brief-orquestador.md` §10, también §7 de `02-DOMINIO.md`): habilitar `canBeDominant('web')` cuando la PWA está instalada (`display-mode: standalone`), quitar la condición `deviceInfo.platform == 'android'` del `create` y de `requestFromAndroid()` en `firestore.rules`, y resolver Web Push (Service Worker) + aceptar la política de autoplay de audio como limitación real (`matriz-degradacion-plataformas.md` §3, "Camino a V1.1 si la web pasa a ser dominante" — la matriz anticipa este camino aunque esa sección diga "V1.1"; este plan lo ubica en V1.5 por seguir el orden de `01-SPEC.md` §9.3; si el creador prefiere adelantarlo, es un cambio de fecha, no de diseño). **Ningún campo ni colección cambia** (`02-DOMINIO.md` §7, último párrafo).

**13.2 — Exportar mis datos / Borrar mi cuenta** (`01-SPEC.md` §8.4 RNF-10, resuelve el hallazgo BAJO de `revision-spec-beta.md` sobre ausencia de privacidad/exportación/borrado): flujo cliente que recorra `users/{uid}/**` y genere un export (JSON, descargable) y un borrado en cascada de todas las subcolecciones del usuario más la cuenta de Firebase Auth. Sin Cloud Functions (costo cero sigue vigente en V1.5): se implementa client-side, iterando cada colección con el SDK ya autenticado como el propio usuario.

**Archivos**: `src/features/settings/services/data-export-service.ts`, `src/features/settings/services/account-deletion-service.ts`, cambios en `firestore.rules` para 13.1 si se confirma.

**Dependencias**: todas las fases de V1 (1-11) — no tiene sentido exportar/borrar datos de un esquema que todavía puede cambiar.

**Criterios de aceptación**: (13.1) desde la PWA instalada en desktop, iniciar un bloque de estudio funciona igual que en Android, con alarmas basadas en Web Push cuando la pestaña no tiene foco; (13.2) exportar genera un archivo con todas las colecciones del usuario, y borrar la cuenta elimina efectivamente todo bajo `users/{uid}` más el usuario de Auth, sin dejar residuos.

**Tests del dominio**: ninguno nuevo de máquina de estados; conviene un test de que el export cubre exactamente las colecciones de `02-DOMINIO.md` §5.1 (ninguna olvidada).

**Pruebas manuales**: exportar y verificar el archivo contra los datos reales de una cuenta de prueba; borrar esa cuenta de prueba y confirmar en la consola de Firebase que no queda ningún documento bajo su `uid`.

**Riesgos**: 13.1 depende de que el creador confirme un supuesto que sigue abierto hoy — no construir sin esa confirmación, dado que Web Push agrega complejidad real (Service Worker) que hoy V1 evita deliberadamente. 13.2 es sensible por naturaleza (borrado irreversible de datos reales) — requiere una confirmación explícita del usuario en la UI, equivalente en peso a la doble confirmación ya usada para cancelar una sesión.

**Commit sugerido**: `feat: exportar y borrar datos personales` / `feat: web dominante opcional (PWA instalada)` (dos commits separados, alcance independiente).

## 18. Cómo retomar desde otra sesión

Cualquier sesión de Claude Code que retome `productvt-beta/` (tras un reset de cuota, un cambio de máquina, o simplemente una sesión nueva) sigue estos pasos, en orden:

1. **Confirmar identidad y coordinación** (`decisiones-tomadas.md`, "Coordinación entre sesiones"): correr `ListAgents` para verificar si `BC Orquestador Productvt` (o su nombre vigente — puede haber cambiado tras un reset de cuota) sigue activa. Si sigue activa, no tocar código de producción en paralelo — coordinar por mensaje directo antes. Este plan asume una sola sesión construyendo a la vez (Principio 8).
2. **Leer el estado real, no confiar en la memoria de la conversación**: `git log --oneline` sobre `productvt-beta/` da la lista de fases realmente commiteadas (§2 de este documento la tenía correcta al momento de escribirse, pero puede haber avanzado desde entonces — este documento no se actualiza solo). `git status` muestra si hay una fase a medio terminar sin commitear.
3. **Ubicar la fase actual en este documento** (§4, tabla resumen) y leer su sección completa (objetivo, archivos, reglas, criterios de aceptación) antes de escribir código nuevo.
4. **Correr `npx vitest run`** dentro de `productvt-beta/` para ver el estado real de la matriz de tests del dominio — no asumir que el número de §2.2 sigue siendo exacto; cambia con cada commit.
5. **Releer las fuentes de mayor autoridad citadas en la fase**, en particular `03-CRONOMETRO.md`/`04-SINCRONIZACION.md`/`07-CALENDARIO-ESTADISTICAS-METAS.md` según corresponda — este documento cita esas secciones, no las repite, así que retomar sin leerlas deja huecos.
6. **Verificar si algún documento de `docs/` cambió** desde la última vez que se leyó: `07-CALENDARIO-ESTADISTICAS-METAS.md` ya está completo (su §6 fija la matriz de 25 casos Q1-Q25 más Q26, y su §1.5 fija `UserSettings.defaultCalendarView?: CalendarViewMode`, ausente ⇒ `'week'`) — este plan ya adopta ambos en las Fases 7/8/9/11 (§11, §12, §13, §15); si aparece un documento nuevo con cambios posteriores a la fecha de este plan, sus secciones reemplazan cualquier supuesto que este documento haya tenido que hacer en su lugar.
7. **Al terminar una fase**: actualizar el checklist de §4 (marcar la casilla), hacer el commit sugerido (o uno equivalente en el mismo estilo), y verificar la Definición de Hecho de §3 completa antes de darla por cerrada.
8. **Si el creador da una instrucción nueva en vivo** (como ocurrió con Calendario por capas y Galaxia+Tienda, ambas incorporadas a este canon sin reordenar fases ya construidas): documentarla primero en `03-requisitos/` (fuente de decisiones), reflejarla en `_brief-orquestador.md` si es transversal, y solo entonces actualizar el documento de fase correspondiente de `docs/` — nunca construir directamente sobre una instrucción verbal sin dejar rastro escrito, para que la próxima sesión que retome tenga de dónde partir.

## Supuestos pendientes de confirmar

Solo supuestos de secuenciación, alcance de fase o granularidad de commit — propios de este documento. Los supuestos de reglas de negocio, modelo de datos o UX ya están en `02-DOMINIO.md`, `03-CRONOMETRO.md`, `04-SINCRONIZACION.md` y `10-GALAXIA-Y-TIENDA.md` (se citan, no se repiten aquí).

| # | Supuesto | Default asumido en este documento | Si se decide distinto |
|---|---|---|---|
| 1 | Momento de cerrar la brecha de `Category.parentId?`/archivado seguro (Fase 3, §7) | No bloquea las Fases 4-6; debe cerrarse antes de construir la Fase 7 (Calendario por capas), para que una capa personalizada pueda razonar sobre jerarquía de categorías si se decide exponerla en la UI. | Si se prefiere cerrarla de inmediato, es un commit corto e independiente que no depende de ninguna fase posterior — puede adelantarse sin reordenar nada. |
| 2 | ~~Nombre exacto de `UserSettings.defaultCalendarView`~~ (Fase 7, §11) | **RESUELTO**: `07-CALENDARIO-ESTADISTICAS-METAS.md` §1.5 (ya completo) fija `defaultCalendarView?: CalendarViewMode`, ausente ⇒ `'week'`. Ya no es una interpretación de este plan. | Solo falta que `02-DOMINIO.md` §3/§5.1 lo incorpore formalmente (gap ya señalado por ese mismo documento en su §4) — no cambia nada de esta fase. |
| 3 | Ubicación exacta de la pantalla de Sesiones/historial (Fase 5, §9) y de Metas (Fase 9, §13) dentro de la navegación | No fijada por ningún documento de `docs/` a la fecha de escritura (depende de `06-DISENO-UI.md`, no redactado); este plan no propone una IA de navegación nueva. | Se resuelve cuando `06-DISENO-UI.md` exista; no afecta el orden de fases, solo la carpeta final de sus componentes. |
| 4 | División de la Fase 12 en dos commits (galaxia / tienda) vs. uno solo (§16) | Sugerido como dos, dado el tamaño comparable al resto del sistema de metas (`decisiones-tomadas.md`, "Alcance — Galaxia de metas + Tienda"). | Queda a criterio de quien construya; no cambia el alcance, solo la granularidad de `git log`. |
| 5 | Si el caso de test P11 en rojo (§2.2, §8.1) es un bug aislado o síntoma de que faltan más casos en la misma familia de transiciones (`END_SESSION` desde cualquier estado de espera) | Se asume aislado hasta que se investigue; este documento no prescribe la corrección exacta, solo la marca como bloqueante de la Definición de Hecho de la Fase 4a. | Si al corregirlo aparecen más casos rotos de la misma familia, se suman a la matriz de 42 casos sin que eso cambie el conteo total esperado (`03-CRONOMETRO.md` §13 ya los enumera como P8/P11, ambos con el mismo resultado esperado). |

## Trazabilidad

| Regla / afirmación de este documento | Fuente |
|---|---|
| Orden de las 11 fases (fundación→auth→categorías/presets→cronómetro→sesiones→inverso→calendario→estadísticas→metas→pulido→setup final) | `03-requisitos/nueva-funcionalidad-galaxia-tienda.md`, "Impacto en secuenciación" |
| 4 de 13 fases commiteadas (1, 2, 3, 4a), commits `4420909`/`51fbcfa`/`9f4ce68`/`01019c7`, Fase 4b en curso | CODE (`git log`/`git show --stat`/`git status` sobre `productvt-beta/`) |
| Fase 4 dividida en 4a (motor local) / 4b (sincronización) | CODE (comentarios "LÍMITE DE ESTA FASE" en `active-session.ts`/`device-identity.ts`) + `03-CRONOMETRO.md`/`04-SINCRONIZACION.md` §0 (misma frontera documental) |
| Matriz de 42 casos de prueba del cronómetro, 42 escritos / 42 verdes (P11 ya no en rojo) | CODE (`npx vitest run` sobre `productvt-beta/`, 45 tests en 7 archivos) + `03-CRONOMETRO.md` §13 |
| Brecha de Fase 3: `Category.parentId?` y archivado seguro (I-14) sin implementar | CODE (`category.ts`, `category-rules.ts`, `categoryRepository.ts`) + `02-DOMINIO.md` §3.3, §4 (I-14) |
| Rebanada vertical, dominio puro primero, repositorio obligatorio, costo cero | B §7, §9; D "Arquitectura de código"; R8, R9 |
| Calendario por capas: `CalendarLayer`, `WeeklyGoal.layerVisible`, sin límite de capas en el dato | B §12; `03-requisitos/nueva-funcionalidad-calendario-por-capas.md`; `02-DOMINIO.md` §3.3 |
| Galaxia/Tienda en V1.1, condición de adelanto a V1 | B §10.11, §11; D "Alcance — Galaxia de metas + Tienda"; `01-SPEC.md` §9.2 |
| Alcance V1/V1.1/V1.5/V2 | `01-SPEC.md` §9 |
| Definición de éxito (criterios de aceptación citados por fase) | `01-SPEC.md` §10 |
| Solo Android dominante; web/desktop-PWA espectador y gestor completo | D "Alcance de plataformas"; B §6; `02-DOMINIO.md` §7 |
| Matriz de degradación por plataforma (notificaciones/audio/background) | `03-requisitos/matriz-degradacion-plataformas.md` (resuelve REV-ALTA-5, REV-ALTA-6) |
| Estrella mensual: mes sin metas no obtiene estrella | R7; D punto 7 |
| Cancelación = misma severidad que expirar | R25; D punto 1.b; `03-CRONOMETRO.md` §8.3 |
| Color de meta manda sobre color de categoría cuando el bloque tiene `goalId` asociado (D6.b); brecha de `goalId`/color abierta en Fase 4a (§8.1), cerrada en Fase 9 (§13) | Respuesta del creador 2026-09-06; `decisiones-tomadas.md` D6.b; `_brief-orquestador.md` §11; `02-DOMINIO.md` §1.2/§3.3 |
| Una sola sesión de producción construyendo a la vez; coordinación entre sesiones | D "Coordinación entre sesiones" |
| Development build local, no EAS Build en la nube, no Cloud Functions/Storage de pago | D puntos 17-18; B §6; `09-SETUP-Y-OPERACION.md` §2.3 |
| Este documento usa 42 como total de la matriz de `03-CRONOMETRO.md` §13 (no 32, que es una línea introductoria desalineada dentro de ese mismo documento) | Recuento directo de la tabla P1-P42 de `03-CRONOMETRO.md` §13; no se modifica ese documento (fuera de alcance de este) |
| No hay fase de mockup separada; el prototipo funcional en el dispositivo es el único artefacto de validación | R20, R22, R24; D "Proceso" puntos 20-24 |
| Documentos no son definitivos; autoridad total del orquestador sobre proceso/arquitectura | R8-R13, R15, R17-R18, R21, R24 |
