# IMPLEMENTATION\_PLAN.md

## 1. Propósito

Este documento traduce `SPEC.md` y `ARCHITECTURE.md` en un plan operativo completo, optimizado para:

- tomar el menor tiempo posible,
- evitar retrabajo,
- aprovechar al máximo ChatGPT Plus y Gemini,
- construir una sola base de código,
- mantener una sola fuente de verdad para requisitos y arquitectura,
- saber exactamente **qué instalar**, **dónde iniciar sesión**, **qué archivo crear**, **qué pedirle a cada IA**, **cómo probar** y **cómo hacer seguimiento**.

Este documento no es solo técnico: también define el flujo humano de trabajo.

---

## 2. Estrategia general óptima

### 2.1 Principio base

No construir la app “conversando a ciegas” ni generando cientos de fragmentos sin estructura.

El flujo correcto es:

1. usar **este chat** y el **canvas** como centro de planificación,
2. usar **VS Code + Gemini Code Assist** como entorno de implementación principal,
3. usar **ChatGPT** para especificaciones, revisión de arquitectura, debugging lógico y prompts de trabajo,
4. usar **Firebase** para auth, base de datos y hosting,
5. usar **Expo** para correr Android y web desde una sola base.

### 2.2 Regla más importante

**No le pidas a dos IA que implementen el mismo módulo completo en paralelo.**

Eso genera:

- duplicación,
- inconsistencias,
- tipos incompatibles,
- pérdida de tiempo.

### 2.3 División de roles recomendada

#### ChatGPT

Usar para:

- mantener `SPEC.md`,
- mantener `ARCHITECTURE.md`,
- mantener `IMPLEMENTATION_PLAN.md`,
- redactar prompts maestros,
- revisar el código que produzca Gemini,
- resolver bugs de lógica,
- auditar decisiones de diseño.

#### Gemini Code Assist en VS Code

Usar para:

- crear archivos,
- completar componentes,
- escribir hooks,
- escribir stores,
- escribir repositorios,
- conectar Firebase,
- corregir TypeScript,
- iterar rápido dentro del proyecto.

---

## 3. Qué usarás desde ahora

## 3.1 Este chat

Este chat se usará para:

- definir producto,
- mantener documentos fuente,
- resolver dudas grandes,
- revisar bugs complejos,
- generar prompts,
- decidir cambios de alcance,
- revisar si algo que generó Gemini rompe el plan.

### Regla práctica

Cuando estés programando y aparezca un problema **estructural**, lo traes aquí.

Ejemplos:

- “Gemini quiere meter toda la lógica en el componente, ¿está bien?”
- “Este store quedó mal dividido, ¿cómo lo rehacemos?”
- “No entiendo cómo reconstruir una sesión activa tras cerrar la app.”
- “Revísame estos 4 archivos y dime si respetan la arquitectura.”

## 3.2 Canvas

El canvas se usará como repositorio vivo de documentos de proyecto.

Documentos actuales:

- `SPEC.md`
- `ARCHITECTURE.md`
- `IMPLEMENTATION_PLAN.md`

### Cómo usar el canvas

- no lo uses para programar todo el proyecto,
- úsalo como base documental,
- úsalo para ir actualizando decisiones,
- úsalo como fuente de verdad para copiar/pegar a Gemini.

### Regla práctica

Cuando cambie algo importante del proyecto, primero se actualiza el canvas y recién después se implementa.

## 3.3 VS Code

Será tu lugar de construcción real.

## 3.4 Firebase Console

Será tu lugar para:

- crear proyecto,
- activar Authentication,
- crear Firestore,
- configurar Hosting,
- revisar colecciones,
- revisar reglas.

## 3.5 Expo CLI / terminal

Será tu lugar para:

- crear proyecto,
- correr app,
- correr web,
- instalar dependencias,
- compilar cuando toque,
- probar localmente.

---

## 4. Apps y herramientas que debes instalar

Instala solo lo necesario.

## 4.1 Obligatorio

### 1. VS Code

Uso:

- IDE principal
- edición de código
- Gemini Code Assist

### 2. Node.js LTS

Uso:

- correr Expo
- instalar dependencias
- usar CLIs

### 3. Git

Uso:

- control de versiones
- volver atrás si Gemini rompe algo

### 4. Expo Go en tu Android

Uso:

- probar la app rápidamente en el celular

### 5. Navegador Chrome o Edge

Uso:

- correr la web
- Firebase Console
- ChatGPT
- Gemini / Google login

## 4.2 Muy recomendable

### 6. GitHub Desktop o Git integrado de VS Code

Uso:

- commits rápidos sin pelear con terminal si no quieres

### 7. Android Studio

No es obligatorio al inicio.

Instálalo solo si más adelante necesitas:

- emulador Android,
- builds nativos más serios,
- debugging Android más profundo.

### Regla de optimización

Para ahorrar tiempo, **no instales Android Studio el día 1**. Primero usa **Expo Go** en tu celular real.

---

## 5. Cuentas y logins que debes dejar listos

## 5.1 ChatGPT

Ya la tienes.

### Qué harás ahí

- seguir usando este chat,
- usar canvas,
- generar prompts,
- revisar código,
- depurar bugs grandes.

## 5.2 Google account

Idealmente usa una sola cuenta Google para:

- Gemini Code Assist
- Firebase
- Expo si quieres enlazar luego

## 5.3 Gemini Code Assist

Necesitarás iniciar sesión en la extensión con tu cuenta Google.

## 5.4 Firebase

Necesitarás iniciar sesión con tu cuenta Google en Firebase Console.

## 5.5 GitHub (opcional pero recomendado)

Útil para:

- respaldar el repo,
- ver cambios,
- recuperar versiones.

---

## 6. APIs / servicios que debes conectar

No conectar más de lo necesario en V1.

## 6.1 Sí conectar

### Firebase Authentication

Uso:

- login email/password
- login con Google

### Cloud Firestore

Uso:

- categorías
- presets
- sesiones
- metas
- eventos invisibles
- perfil y settings

### Firebase Hosting

Uso:

- desplegar versión web

### Expo Notifications

Uso:

- recordatorios y alertas locales

### Audio service de Expo

Uso:

- sonidos de fin de estudio
- sonidos de fin de descanso
- sonidos del temporizador inverso

### Document Picker de Expo

Uso futuro cercano:

- elegir audio del dispositivo

## 6.2 No conectar al principio

- Cloud Functions
- Google Calendar API
- OpenAI API
- Gemini API
- pagos
- analytics compleja
- backend propio

### Regla

Tus suscripciones ya te cubren el trabajo de IA. No pagues APIs extra para construir la V1.

---

## 7. Flujo exacto de trabajo diario

## 7.1 Centro de mando

Tu flujo ideal desde ahora es:

### Paso 1

Abres **este chat**.

### Paso 2

Revisas canvas:

- `SPEC.md`
- `ARCHITECTURE.md`
- `IMPLEMENTATION_PLAN.md`

### Paso 3

Abres VS Code en el proyecto.

### Paso 4

Usas Gemini para implementar **solo la fase actual**.

### Paso 5

Pruebas en:

- web
- Android con Expo Go

### Paso 6

Si algo falla:

- si es error local simple: se lo pides a Gemini,
- si es error raro, estructural o de arquitectura: lo traes a este chat.

### Paso 7

Cuando cierres una fase, haces commit.

---

## 8. Cómo usar este chat a partir de ahora

## 8.1 Tipos de mensajes que debes traer aquí

Trae a este chat cosas como:

- “Actualiza el spec para incluir X.”
- “Revisa estos archivos.”
- “Gemini me propuso esta estructura, ¿está bien?”
- “Hazme el prompt exacto para implementar el módulo de estadísticas.”
- “Te pego error y código, dime qué está mal.”
- “Resume el estado actual del proyecto y qué sigue.”

## 8.2 Tipos de cosas que no necesitas traer aquí cada vez

No necesitas venir por cada archivo trivial como:

- un botón aislado,
- un input simple,
- estilos básicos,
- un componente presentacional sencillo.

Eso se lo puedes pedir directamente a Gemini.

## 8.3 Regla de oro

**Usa este chat para pensar y revisar. Usa VS Code + Gemini para producir.**

---

## 9. Cómo usar los archivos del canvas

## 9.1 `SPEC.md`

Uso:

- pegárselo a Gemini como contexto maestro,
- validar si una función pertenece o no al producto,
- evitar inventos de la IA.

## 9.2 `ARCHITECTURE.md`

Uso:

- pegarlo a Gemini cuando implemente stores, hooks, repositorios y módulos,
- corregir si la IA mete lógica de dominio dentro de la UI,
- verificar separación de carpetas y capas.

## 9.3 `IMPLEMENTATION_PLAN.md`

Uso:

- seguir el orden exacto de construcción,
- saber qué archivo crear después,
- saber cómo probar cada fase,
- saber cuándo usar ChatGPT y cuándo Gemini.

## 9.4 Regla práctica de uso

No copies los 3 documentos completos en cada prompt.

Usa esta estrategia:

- para decisiones de producto: `SPEC.md`
- para estructura técnica: `ARCHITECTURE.md`
- para ejecución: `IMPLEMENTATION_PLAN.md`

Y cuando haga falta, pega solo la sección relevante.

---

## 10. Preparación inicial: orden exacto

## 10.1 Instala herramientas

Haz esto en este orden:

1. Instala Node.js LTS
2. Instala VS Code
3. Instala Git
4. Instala Expo Go en tu Android
5. Abre ChatGPT en navegador
6. Abre Firebase Console en navegador

## 10.2 En VS Code instala extensiones

### Obligatorio

- Gemini Code Assist
- ESLint
- Prettier
- GitHub Copilot: **no necesario** si quieres evitar ruido

### Opcional

- Firebase Explorer
- Error Lens
- Tailwind IntelliSense si luego lo necesitas en web

## 10.3 Logins

Haz login en este orden:

1. Gemini Code Assist en VS Code con tu cuenta Google
2. Firebase Console con la misma cuenta Google
3. GitHub si vas a usar repositorio remoto

---

## 11. Crear el proyecto real

## 11.1 Carpeta del proyecto

En tu computador crea una carpeta padre, por ejemplo:

```text
ProductvtBeta/
```

Dentro crearás el proyecto Expo.

## 11.2 Crear proyecto Expo

Desde terminal:

```bash
npx create-expo-app@latest productvt-beta
```

Luego:

```bash
cd productvt-beta
```

## 11.3 Iniciar Git

Si no quedó listo:

```bash
git init
```

## 11.4 Primer commit

Hazlo antes de tocar demasiado.

Mensaje sugerido:

```text
chore: bootstrap expo project
```

---

## 12. Crear y configurar Firebase

## 12.1 Crear proyecto Firebase

En Firebase Console:

1. Click en **Create project**
2. Nombre sugerido: `productvt-beta`
3. Desactiva Google Analytics si no lo necesitas al principio
4. Crea el proyecto

## 12.2 Registrar app web

Debes registrar la app web para obtener config SDK.

Nombre sugerido:

- `productvt-web`

Guarda el objeto config.

## 12.3 Activar Authentication

En Firebase Console:

- ve a **Authentication**
- click **Get started**
- activa:
  - Email/Password
  - Google

## 12.4 Crear Firestore

- ve a **Firestore Database**
- click **Create database**
- modo inicial: test para desarrollo temprano si quieres avanzar rápido
- luego se endurecen las reglas antes de usar en serio
- elige región cercana

## 12.5 Hosting

Déjalo creado para más adelante, pero ya sabiendo que lo usarás.

---

## 13. Dependencias que instalarás en el proyecto

Hazlo por bloques, no todas de una si no quieres.

## 13.1 Base inicial

Instala primero lo indispensable:

```bash
npm install firebase
npm install zustand
npm install zod
npm install date-fns
npm install react-hook-form
npm install @react-native-async-storage/async-storage
```

## 13.2 Expo útiles para V1

Según lo que implementes, irás agregando:

```bash
npx expo install expo-notifications
npx expo install expo-document-picker
npx expo install expo-av
npx expo install expo-router
npx expo install expo-linking
npx expo install expo-constants
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
```

### Nota

Si algunas ya vienen con el template, no duplicarlas.

---

## 14. Orden exacto de implementación

No improvisar el orden.

---

## FASE 0 — Preparación documental y setup

### Objetivo

Dejar listo el entorno y la base documental.

### Qué haces tú

- instalar herramientas,
- crear proyecto,
- crear Firebase,
- abrir este chat,
- conservar canvas como referencia.

### Qué le pides a ChatGPT

Nada nuevo de código todavía. Solo dudas de setup si aparecen.

### Qué le pides a Gemini

Todavía poco. Solo ayuda si algo falla al instalar.

### Qué debes tener al final

- proyecto Expo inicial funcionando
- Firebase creado
- Gemini funcionando en VS Code
- repo inicial listo

### Cómo probar

```bash
npx expo start
```

Prueba:

- abrir web
- abrir Expo Go en Android
- ver que el proyecto base corre

### Commit al terminar

```text
chore: initial environment and firebase setup
```

---

## FASE 1 — Estructura de carpetas y tipos base

### Objetivo

Montar la arquitectura mínima sin lógica compleja todavía.

### Archivos y carpetas que debes crear

```text
src/
  app/
  components/
  features/
  domain/
  infrastructure/
  repositories/
  store/
  hooks/
  utils/
  constants/
  theme/
  types/
```

### Archivos específicos iniciales

```text
src/infrastructure/firebase/client.ts
src/infrastructure/firebase/auth.ts
src/infrastructure/firebase/firestore.ts
src/infrastructure/firebase/collections.ts

src/domain/enums/timer.ts
src/domain/entities/category.ts
src/domain/entities/preset.ts
src/domain/entities/session.ts
src/domain/entities/goal.ts
src/domain/entities/event.ts

src/types/common.ts
src/constants/routes.ts
src/theme/colors.ts
src/theme/spacing.ts
src/theme/typography.ts
```

### Qué pedirle a ChatGPT

Si quieres ahorrar tiempo, pídele aquí un prompt para Gemini tipo:

- “Hazme el prompt exacto para crear la estructura base de carpetas y tipos según Architecture”.

### Qué pedirle a Gemini

Prompt sugerido:

```text
Usa ARCHITECTURE.md como fuente de verdad técnica.
Crea la estructura base de carpetas y los archivos TypeScript mínimos para entidades, enums, constantes de rutas y tema.
No implementes todavía lógica de negocio compleja.
Entrega el contenido completo de cada archivo y mantén nombres consistentes.
```

### Cómo probar

- que compile sin errores
- que imports funcionen
- que no haya archivos huérfanos

### Commit

```text
chore: base architecture folders and domain types
```

---

## FASE 2 — Firebase wiring y autenticación

### Objetivo

Tener login funcional y usuario autenticado.

### Archivos a crear

```text
src/features/auth/types/auth.ts
src/features/auth/services/auth-service.ts
src/features/auth/hooks/useAuthUser.ts
src/features/auth/hooks/useRequireAuth.ts
src/store/auth/authStore.ts

src/app/(auth)/login.tsx
src/app/(auth)/register.tsx
src/app/_layout.tsx
src/app/(tabs)/_layout.tsx
```

### Qué harás en Firebase Console

- activar Email/Password
- activar Google Sign-In

### Qué le pides a Gemini

```text
Implementa la capa de autenticación usando Firebase Authentication.
Quiero:
1. firebase client config
2. auth service
3. auth store
4. pantallas de login y register
5. auth gate en el layout
No agregues diseño complejo todavía. Solo funcionalidad limpia y tipada.
```

### Qué traer a ChatGPT si falla

- problemas con el auth gate
- navegación rara tras login
- mal uso del store
- mezcla incorrecta de Firebase directo en la UI

### Cómo probar

Pruebas mínimas:

1. registrar usuario con email/password
2. cerrar sesión
3. iniciar sesión de nuevo
4. probar Google Sign-In si decides dejarlo operativo ya
5. verificar que una ruta protegida no abra sin auth

### Commit

```text
feat: firebase auth with login and register
```

---

## FASE 3 — Categorías, presets y settings básicos

### Objetivo

Tener base editable para categorías y presets antes del cronómetro.

### Archivos a crear

```text
src/features/categories/domain/category.types.ts
src/features/categories/services/category-service.ts
src/features/categories/hooks/useCategories.ts
src/features/categories/hooks/useCreateCategory.ts
src/features/categories/hooks/useUpdateCategory.ts
src/features/categories/components/category-form.tsx

src/features/presets/domain/preset.types.ts
src/features/presets/services/preset-service.ts
src/features/presets/hooks/usePresets.ts
src/features/presets/hooks/useCreatePreset.ts
src/features/presets/components/preset-form.tsx

src/features/settings/services/settings-service.ts
src/features/settings/hooks/useUserSettings.ts
src/app/(tabs)/settings.tsx
```

### Qué pedirle a Gemini

```text
Implementa CRUD básico de categorías y presets con Firestore.
Debe soportar tipos de categoría study, inverse e invisible.
Crea hooks, servicios, formularios básicos y una pantalla de settings mínima para gestionar categorías, presets y frase de cancelación.
```

### Cómo probar

- crear categoría de estudio
- crear categoría de ocio
- crear categoría invisible
- editar color
- crear preset estándar y otro personalizado
- verificar persistencia en Firestore

### Commit

```text
feat: categories presets and basic settings
```

---

## FASE 4 — Núcleo del timer de estudio

### Objetivo

Construir el corazón de la app.

### Importante

Aquí no se improvisa. Antes de pedir código, pega a Gemini las secciones relevantes de `SPEC.md` y `ARCHITECTURE.md` sobre:

- máquina de estados
- descansos
- banco
- almuerzo
- cancelación

### Archivos a crear

```text
src/features/timer/domain/timer.types.ts
src/features/timer/domain/timer.machine.ts
src/features/timer/domain/timer.reducer.ts
src/features/timer/domain/timer.selectors.ts
src/features/timer/domain/timer.rules.ts
src/features/timer/domain/break-bank.ts
src/features/timer/domain/effective-study.ts

src/features/timer/store/timerStore.ts
src/features/timer/services/studyTimerEngine.ts
src/features/timer/services/timerPersistence.ts
src/features/timer/services/timerAudioService.ts
src/features/timer/services/timerNotificationService.ts

src/features/timer/hooks/useActiveTimer.ts
src/features/timer/hooks/useStartStudySession.ts
src/features/timer/hooks/useBreakSelection.ts
src/features/timer/hooks/useCancelStudySession.ts
src/features/timer/hooks/useLunchAction.ts

src/features/timer/components/timer-session-form.tsx
src/features/timer/components/timer-active-panel.tsx
src/features/timer/components/break-selector-modal.tsx
src/features/timer/components/cancel-session-modal.tsx

src/app/(tabs)/timer.tsx
```

### Orden interno recomendado

1. tipos
2. machine
3. reglas puras
4. store
5. engine
6. panel UI
7. modales

### Qué pedirle a ChatGPT antes

En este chat pídele un prompt muy estricto para Gemini, por ejemplo:

- “Hazme el prompt maestro del módulo timer para que Gemini no meta la lógica dentro de componentes”.

### Qué pedirle a Gemini

No le pidas todo de una. Divide en subfases.

#### Prompt 1

```text
Implementa primero solo el dominio del timer de estudio:
- tipos
- estados
- eventos
- reducer o máquina de estados
- reglas puras de banco de descanso
- validación de descanso personalizado
No implementes UI todavía.
Entrega archivos completos y tests unitarios base.
```

#### Prompt 2

```text
Ahora implementa timerStore y studyTimerEngine usando el dominio ya creado.
El engine debe calcular tiempo por timestamps reales y no depender solo de setInterval.
Debe poder persistir y reconstruir el estado activo.
No implementes UI todavía.
```

#### Prompt 3

```text
Ahora implementa la pantalla timer.tsx y los componentes:
- formulario para iniciar bloque
- panel de sesión activa
- modal selector de descanso
- modal cancelar sesión
Usa el timerStore y no metas reglas complejas en la UI.
```

### Cómo probar

Casos manuales obligatorios:

1. iniciar bloque
2. completar un estudio corto de prueba
3. saltar descanso
4. ver que el banco aumente
5. tomar descanso personalizado de 0 min
6. tomar descanso personalizado de 1 min
7. tomar descanso personalizado de 4 min
8. verificar que el resto quede en banco
9. usar almuerzo
10. cancelar sesión con doble confirmación
11. cerrar la app y reabrir
12. comprobar recuperación

### Commit

```text
feat: study timer core with break bank and recovery
```

---

## FASE 5 — Guardado de sesiones históricas

### Objetivo

Persistir study sessions e inverse sessions correctamente.

### Archivos a crear

```text
src/repositories/sessions/sessionRepository.ts
src/features/sessions/services/session-service.ts
src/features/sessions/hooks/useSessionsInRange.ts
src/features/sessions/hooks/useSessionDetails.ts
src/features/sessions/domain/session.mappers.ts
```

### Qué pedirle a Gemini

```text
Implementa el repositorio y servicio de sesiones para guardar study sessions e inverse sessions en Firestore con snapshots de categoría y preset.
Agrega hooks para consultar sesiones por rango y por detalle.
```

### Cómo probar

- completar sesión de estudio y verificar documento en Firestore
- completar sesión inversa y verificar documento
- revisar que study use effectiveStudySeconds
- revisar que inverse use totalElapsedSeconds

### Commit

```text
feat: session persistence and history queries
```

---

## FASE 6 — Temporizador inverso

### Objetivo

Registrar ocio / anti-estudio.

### Archivos a crear

```text
src/features/timer/domain/inverseTimer.types.ts
src/features/timer/services/inverseTimerEngine.ts
src/features/timer/hooks/useInverseTimer.ts
src/features/timer/components/inverse-session-form.tsx
src/features/timer/components/inverse-active-panel.tsx
```

### Qué pedirle a Gemini

```text
Implementa el temporizador inverso con duración objetivo, recordatorios cada 15 minutos, finalización y guardado como inverse session.
Manténlo separado del study timer engine.
```

### Cómo probar

- iniciar timer inverso
- simular duración corta
- verificar recordatorio
- finalizar
- revisar guardado

### Commit

```text
feat: inverse timer with reminders
```

---

## FASE 7 — Calendario y eventos invisibles

### Objetivo

Visualizar sesiones reales y eventos planificados.

### Archivos a crear

```text
src/features/calendar/domain/calendar.types.ts
src/features/calendar/domain/recurrence.ts
src/features/calendar/services/calendarAssemblerService.ts
src/features/calendar/services/invisible-event-service.ts
src/features/calendar/hooks/useCalendarItems.ts
src/features/calendar/components/calendar-view.tsx
src/features/calendar/components/calendar-item-card.tsx
src/features/calendar/components/invisible-event-form.tsx

src/repositories/events/eventRepository.ts
src/app/(tabs)/calendar.tsx
src/app/modals/create-invisible-event.tsx
```

### Qué pedirle a Gemini

```text
Implementa el módulo calendario para combinar study sessions, inverse sessions y eventos invisibles.
Soporta recurrencia semanal para eventos invisibles y una vista inicial usable de día/semana/mes.
```

### Cómo probar

- crear evento invisible simple
- crear evento recurrente martes/jueves
- revisar que aparezca en calendario
- completar sesión study y ver que aparezca automática
- completar sesión inverse y ver que aparezca automática

### Commit

```text
feat: calendar with invisible events and session timeline
```

---

## FASE 8 — Estadísticas

### Objetivo

Construir el panel de stats con desglose por subcategoría de estudio y ocio.

### Archivos a crear

```text
src/features/stats/domain/stats.types.ts
src/features/stats/domain/aggregateDailyStats.ts
src/features/stats/domain/aggregateWeeklyStats.ts
src/features/stats/domain/aggregateMonthlyStats.ts
src/features/stats/domain/aggregateStudyByCategory.ts
src/features/stats/domain/aggregateInverseByCategory.ts
src/features/stats/domain/aggregateStudyVsInverse.ts
src/features/stats/domain/buildHistoryTable.ts
src/features/stats/domain/buildYearOverview.ts

src/features/stats/services/statsAssemblerService.ts
src/features/stats/hooks/useStatsDashboard.ts
src/features/stats/hooks/useStudyBreakdown.ts
src/features/stats/hooks/useInverseBreakdown.ts
src/features/stats/components/stats-dashboard.tsx
src/features/stats/components/study-breakdown-card.tsx
src/features/stats/components/inverse-breakdown-card.tsx
src/features/stats/components/stats-bar-chart.tsx
src/features/stats/components/history-table.tsx

src/app/(tabs)/stats.tsx
```

### Qué pedirle a Gemini

Hazlo en dos pasos.

#### Prompt 1

```text
Implementa primero el dominio puro de estadísticas:
- agregación diaria, semanal y mensual
- total estudio vs ocio
- breakdown por subcategoría de estudio
- breakdown por subcategoría de ocio
- tabla histórica
No hagas UI todavía.
Incluye tests unitarios.
```

#### Prompt 2

```text
Ahora implementa statsAssemblerService, hooks y la pantalla stats.tsx con tarjetas, gráficos básicos y tabla histórica.
La UI debe consumir view models ya preparados.
```

### Cómo probar

- revisar estudio total diario
- revisar ocio total diario
- revisar categoría estudio específica
- revisar categoría ocio específica
- revisar semana y mes
- revisar porcentajes
- revisar tabla histórica

### Commit

```text
feat: stats dashboard with study and leisure breakdowns
```

---

## FASE 9 — Metas semanales y estrellas mensuales

### Objetivo

Agregar metas por categoría de estudio.

### Archivos a crear

```text
src/repositories/goals/goalRepository.ts
src/features/goals/domain/goal.types.ts
src/features/goals/domain/goalProgress.ts
src/features/goals/services/goal-service.ts
src/features/goals/services/goalProgressService.ts
src/features/goals/hooks/useWeeklyGoals.ts
src/features/goals/hooks/useGoalProgress.ts
src/features/goals/components/weekly-goal-form.tsx
src/features/goals/components/goal-progress-card.tsx
```

### Qué pedirle a Gemini

```text
Implementa metas semanales por categoría de estudio usando effectiveStudySeconds.
Agrega cálculo de progreso y lógica para marcar meses con estrella en la vista anual.
```

### Cómo probar

- crear meta semanal
- registrar sesiones en esa categoría
- ver progreso aumentar
- verificar estado completed
- verificar estrella mensual según regla

### Commit

```text
feat: weekly goals and yearly achievement markers
```

---

## FASE 10 — Sonidos, pulido visual y UX

### Objetivo

Hacer la app agradable y motivante.

### Archivos a crear o ampliar

```text
src/infrastructure/audio/
src/features/settings/components/sound-selector.tsx
src/features/feedback/components/confetti-success.tsx
src/features/feedback/components/sad-cancel-feedback.tsx
```

### Qué pedirle a Gemini

```text
Agrega selección de sonidos predefinidos, soporte de audio local por dispositivo si es viable en esta etapa, confeti al completar bloques y feedback triste al cancelar.
No rompas la separación entre servicios e interfaz.
```

### Cómo probar

- sonido fin de estudio
- sonido fin de descanso
- recordatorio inverso
- confeti al completar
- feedback de cancelación

### Commit

```text
feat: sounds animations and motivational polish
```

---

## FASE 11 — Deploy web

### Objetivo

Publicar la versión web.

### Qué hacer tú

1. instalar Firebase CLI si hace falta
2. iniciar sesión en Firebase CLI
3. inicializar hosting
4. hacer build web
5. deploy

### Comandos aproximados

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

### Qué pedirle a Gemini

```text
Dame la configuración exacta para deploy de Expo web a Firebase Hosting en este proyecto.
Quiero pasos concretos, archivos a tocar y scripts package.json si hacen falta.
```

### Cómo probar

- abrir URL publicada
- hacer login
- revisar stats
- revisar calendario

### Commit

```text
chore: web deployment setup
```

---

## 15. Qué pedirle a cada app en cada situación

## 15.1 Pídeselo a Gemini cuando...

- necesites crear archivos nuevos
- necesites cablear imports
- necesites escribir hooks y services
- necesites UI básica
- tengas errores locales simples
- quieras iterar rápido en el IDE

## 15.2 Pídeselo a ChatGPT cuando...

- tengas una decisión de arquitectura
- quieras revisar varios archivos a la vez
- Gemini te proponga algo sospechoso
- quieras generar un prompt mejor
- haya bugs lógicos raros
- quieras actualizar documentación

## 15.3 Nunca hagas esto

- pedirle a Gemini una fase enorme sin contexto
- pedirle a ChatGPT que te regenere toda la base si ya tienes repo andando
- pegar 50 archivos a la vez sin decir qué revisar

---

## 16. Cómo pedir código sin perder tiempo

## 16.1 Regla óptima

Siempre pide por **módulos pequeños con límites claros**.

Mal:

- “Haz toda la app.”

Bien:

- “Implementa el dominio puro del timer de estudio.”
- “Ahora implementa timerStore y persistence.”
- “Ahora la UI del panel activo.”

## 16.2 Formato de prompt recomendado para Gemini

```text
Contexto:
[pega 1 o 2 secciones relevantes de SPEC/ARCHITECTURE/PLAN]

Objetivo:
[qué módulo exacto quieres]

Restricciones:
- no cambies nombres existentes
- no metas lógica de dominio en la UI
- usa TypeScript estricto
- mantén consistencia con la arquitectura

Entrega:
1. archivos a crear/modificar
2. contenido completo
3. instrucciones para probar
4. errores probables y cómo corregirlos
```

---

## 17. Cómo probar de forma eficiente

## 17.1 Regla principal

Prueba cada fase antes de abrir la siguiente.

## 17.2 Plataformas de prueba

### Web

Úsala para:

- revisar navegación
- revisar formularios
- revisar estadísticas
- revisar calendario

### Android con Expo Go

Úsalo para:

- timer real
- experiencia móvil
- notificaciones locales
- sonidos
- flows activos

## 17.3 Testing mínimo por commit relevante

Antes de commitear una fase, comprueba:

- compila
- abre en web
- abre en Android
- no rompió login
- no rompió navegación
- no rompió Firestore

---

## 18. Cómo hacer seguimiento del proyecto

## 18.1 Seguimiento documental

Haz seguimiento en dos niveles:

### Nivel 1 — Canvas

Para:

- decisiones grandes
- cambios de alcance
- redefiniciones de reglas

### Nivel 2 — Git commits

Para:

- estado real del código
- volver atrás si algo falla

## 18.2 Mensajes de commit recomendados

- `chore:` setup y config
- `feat:` nuevas funcionalidades
- `fix:` correcciones
- `refactor:` cambios internos sin nueva funcionalidad

## 18.3 Regla útil

No estés 2 días sin commit. Haz commits frecuentes por fase pequeña.

---

## 19. Flujo optimizado completo resumido

### Día 1

- instala todo
- crea Expo app
- crea Firebase
- configura auth
- configura estructura base

### Día 2

- categorías
- presets
- settings base

### Día 3 y 4

- núcleo del timer study
- banco
- descansos personalizados
- recuperación

### Día 5

- guardado sesiones
- timer inverso

### Día 6

- calendario
- eventos invisibles

### Día 7

- estadísticas
- breakdown study/ocio

### Día 8

- metas
- pulido
- deploy web

### Nota

No importa si te toma más de 8 días. El punto es el orden, no la velocidad exacta.

---

## 20. Checklist operativo maestro

Antes de empezar cada sesión de trabajo:

- abrir este chat
- revisar fase actual en `IMPLEMENTATION_PLAN.md`
- abrir VS Code
- revisar último commit
- abrir Expo en Android y/o web

Antes de pedir código a Gemini:

- definir módulo exacto
- pegar solo contexto necesario
- decir archivos y restricciones

Antes de cerrar una fase:

- probar en web
- probar en Android
- revisar Firestore si corresponde
- commit

Si algo raro pasa:

- bug simple: Gemini
- bug estructural: ChatGPT

---

## 21. Próximo paso exacto después de este documento

Tu próximo paso operativo no es programar el timer todavía.

Haz esto exactamente:

1. instala herramientas faltantes
2. crea proyecto Expo
3. crea Firebase
4. instala extensiones de VS Code
5. verifica que Gemini funcione
6. vuelve a este chat y pide:

### mensaje sugerido

> Ya hice el setup inicial. Ahora dame el prompt exacto para la FASE 1, para pedírselo a Gemini Code Assist en VS Code, usando mi Architecture e Implementation Plan como fuente de verdad.

Ese debe ser el primer prompt maestro real de implementación.

