# ARCHITECTURE.md

## 1. Propósito del documento

Este documento define la arquitectura técnica base de **Productvt Beta**.

Su objetivo es traducir el `SPEC.md` a una estructura implementable en **Expo + React Native + TypeScript + Firebase**, de modo que cualquier agente o desarrollador pueda construir el proyecto con una base robusta, mantenible y extensible.

Este documento cubre:

- estructura de carpetas,
- módulos del sistema,
- entidades de dominio,
- estado local y remoto,
- motor del cronómetro,
- navegación,
- servicios,
- persistencia,
- sincronización,
- calendario,
- estadísticas,
- metas,
- decisiones de separación de responsabilidades.

Este archivo debe leerse junto con `SPEC.md`. Si existe conflicto, **SPEC.md**** manda en reglas de negocio** y este documento manda en **organización técnica**.

---

## 2. Principios arquitectónicos

La arquitectura debe seguir estos principios:

### 2.1 Dominio primero

Las reglas del producto deben vivir en una capa de dominio, no escondidas dentro de componentes UI.

### 2.2 UI delgada

Las pantallas deben consumir estado y disparar acciones, pero no contener lógica compleja de tiempo, banco, expiración o métricas.

### 2.3 Máquina de estados explícita

El cronómetro de estudio debe construirse sobre una máquina de estados tipada y testeable.

### 2.4 Separación entre tiempo real y datos históricos

- una cosa es la **sesión activa**,
- otra cosa son los **registros persistidos**,
- y otra cosa son las **estadísticas agregadas**.

### 2.5 Persistencia resiliente

La app debe soportar cierres accidentales sin perder el estado crítico de una sesión activa.

### 2.6 Sincronización simple y segura

Firestore será la fuente de verdad remota del historial y configuración. El estado activo de una sesión en curso se manejará con cuidado para evitar duplicados.

### 2.7 Escalabilidad moderada

La arquitectura no debe estar sobreoptimizada para miles de usuarios, pero sí debe resistir crecimiento moderado sin rehacer el proyecto.

---

## 3. Stack técnico obligatorio

- **Expo**
- **React Native**
- **TypeScript**
- **Expo Router** o navegación equivalente tipada
- **Firebase Authentication**
- **Cloud Firestore**
- **Firebase Hosting** para la web
- **AsyncStorage** o persistencia local equivalente para estado crítico
- **Expo Notifications** para notificaciones locales
- **Expo AV / alternativa oficial actual** para audio
- **Expo Document Picker** para selección de archivos de audio del dispositivo en etapas compatibles

---

## 4. Vista general de capas

La arquitectura del proyecto se divide en las siguientes capas:

1. **Presentation layer**
2. **Application layer**
3. **Domain layer**
4. **Infrastructure layer**
5. **Persistence layer**

### 4.1 Presentation layer

Incluye:

- pantallas,
- componentes visuales,
- formularios,
- navegación,
- gráficos,
- calendarios,
- modales,
- feedback visual.

### 4.2 Application layer

Incluye:

- casos de uso,
- coordinadores,
- actions del store,
- hooks de alto nivel,
- transformación de datos entre UI y dominio.

### 4.3 Domain layer

Incluye:

- entidades de negocio,
- máquina de estados del timer,
- reglas de banco de descanso,
- cálculo de tiempos,
- cálculo de metas,
- agregación de estadísticas.

### 4.4 Infrastructure layer

Incluye:

- Firebase,
- audio,
- notificaciones,
- device APIs,
- date helpers,
- storage adapters.

### 4.5 Persistence layer

Incluye:

- repositorios Firestore,
- persistencia local de sesión activa,
- serialización/deserialización,
- snapshots del dominio.

---

## 5. Estructura sugerida de carpetas

```text
src/
  app/
    _layout.tsx
    (auth)/
      login.tsx
      register.tsx
    (tabs)/
      _layout.tsx
      calendar.tsx
      stats.tsx
      timer.tsx
      settings.tsx
    modals/
      create-invisible-event.tsx
      edit-category.tsx
      edit-preset.tsx
      cancel-session.tsx
      break-selector.tsx
      weekly-goal.tsx

  screens/
    calendar/
    stats/
    timer/
    settings/

  components/
    common/
    timer/
    calendar/
    stats/
    settings/
    charts/
    forms/
    feedback/

  features/
    auth/
      hooks/
      services/
      components/
      types/
    categories/
      hooks/
      services/
      domain/
      components/
    presets/
      hooks/
      services/
      domain/
      components/
    timer/
      components/
      hooks/
      domain/
      services/
      store/
      utils/
      tests/
    sessions/
      services/
      repositories/
      hooks/
      domain/
    calendar/
      components/
      hooks/
      services/
      domain/
    stats/
      components/
      hooks/
      services/
      domain/
      selectors/
    goals/
      components/
      hooks/
      services/
      domain/
    settings/
      components/
      hooks/
      services/

  domain/
    entities/
    value-objects/
    enums/
    shared/

  application/
    use-cases/
    coordinators/
    mappers/
    dto/

  infrastructure/
    firebase/
      client.ts
      auth.ts
      firestore.ts
      collections.ts
    audio/
    notifications/
    storage/
    date/
    device/

  repositories/
    categories/
    presets/
    sessions/
    goals/
    events/
    user/

  store/
    auth/
    timer/
    ui/
    sync/

  hooks/
  utils/
  constants/
  theme/
  types/
```

---

## 6. Módulos arquitectónicos principales

Los módulos del sistema son:

1. `auth`
2. `categories`
3. `presets`
4. `timer`
5. `sessions`
6. `calendar`
7. `stats`
8. `goals`
9. `settings`
10. `sync`

Cada módulo debe poder evolucionar con cierto aislamiento.

---

## 7. Navegación general

La navegación principal debe usar tabs o equivalente con 4 áreas:

1. **Calendar**
2. **Stats**
3. **Timer**
4. **Settings**

### 7.1 Flujo de navegación base

```text
AuthGate
  ├── Login / Register
  └── AppTabs
       ├── Calendar
       ├── Stats
       ├── Timer
       └── Settings
```

### 7.2 Modales globales

Se recomienda que ciertos flujos sean modales reutilizables:

- crear evento invisible,
- editar categoría,
- editar preset,
- seleccionar descanso,
- cancelar sesión,
- crear meta semanal,
- seleccionar sonido.

---

## 8. Dominio central

El dominio se organiza alrededor de estas entidades:

- `UserProfile`
- `Category`
- `Preset`
- `StudySession`
- `InverseSession`
- `InvisibleEvent`
- `WeeklyGoal`
- `TimerState`
- `SessionSegment`
- `StatsSnapshot` (futuro / opcional)

---

## 9. Entidades de dominio

## 9.1 UserProfile

Responsabilidad:

- representar al usuario autenticado,
- contener configuración persistente.

Campos sugeridos:

```ts
interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  timezone: string;
  cancellationPhrase: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 9.2 Category

Responsabilidad:

- agrupar sesiones o eventos,
- aportar nombre y color.

Campos sugeridos:

```ts
type CategoryType = 'study' | 'inverse' | 'invisible';

interface Category {
  id: string;
  type: CategoryType;
  name: string;
  color: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 9.3 Preset

Responsabilidad:

- encapsular configuración de estudio/descanso.

```ts
interface Preset {
  id: string;
  name: string;
  studyDurationMinutes: number;
  shortBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  longBreakMinutes: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 9.4 StudySession

Responsabilidad:

- representar un bloque completo de estudio.

```ts
type StudySessionStatus =
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired';

interface StudySession {
  id: string;
  userId: string;
  type: 'study';
  name: string;
  categoryId: string;
  categoryNameSnapshot: string;
  colorSnapshot: string;
  presetSnapshot: PresetSnapshot;
  status: StudySessionStatus;
  startedAt: string;
  endedAt?: string;
  effectiveStudySeconds: number;
  totalElapsedSeconds: number;
  bankRemainingSeconds: number;
  cyclesCompleted: number;
  studySegments: StudySegment[];
  breakSegments: BreakSegment[];
  lunchSegments: LunchSegment[];
  createdAt: string;
  updatedAt: string;
}
```

---

## 9.5 InverseSession

Responsabilidad:

- representar una sesión de ocio o anti-estudio.

```ts
type InverseSessionStatus = 'active' | 'completed' | 'cancelled' | 'interrupted';

interface InverseSession {
  id: string;
  userId: string;
  type: 'inverse';
  name: string;
  categoryId: string;
  categoryNameSnapshot: string;
  colorSnapshot: string;
  startedAt: string;
  endedAt?: string;
  totalElapsedSeconds: number;
  reminderCount: number;
  status: InverseSessionStatus;
  createdAt: string;
  updatedAt: string;
}
```

---

## 9.6 InvisibleEvent

Responsabilidad:

- representar eventos visibles en calendario pero excluidos de estadísticas.

```ts
interface InvisibleEvent {
  id: string;
  userId: string;
  type: 'invisible';
  name: string;
  categoryId: string;
  categoryNameSnapshot: string;
  colorSnapshot: string;
  startAt: string;
  endAt: string;
  recurrence?: WeeklyRecurrence;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 9.7 WeeklyGoal

Responsabilidad:

- representar objetivos semanales de estudio efectivo por subcategoría.

```ts
type WeeklyGoalStatus = 'pending' | 'completed' | 'failed';

interface WeeklyGoal {
  id: string;
  userId: string;
  weekKey: string;
  categoryId: string;
  categoryNameSnapshot: string;
  targetSeconds: number;
  achievedSeconds: number;
  status: WeeklyGoalStatus;
  createdAt: string;
  updatedAt: string;
}
```

---

## 10. Value objects compartidos

Se recomienda definir objetos de valor reutilizables:

- `TimeRange`
- `ColorValue`
- `DurationSeconds`
- `WeekKey`
- `MonthKey`
- `YearMonth`
- `PresetSnapshot`
- `CategorySnapshot`

Esto reduce bugs y mejora tipado.

---

## 11. Arquitectura del cronómetro de estudio

Este es el núcleo técnico del proyecto.

## 11.1 Submódulos internos del timer

El módulo `timer` debe separarse en:

1. `timer-machine`
2. `timer-engine`
3. `timer-store`
4. `timer-persistence`
5. `timer-ui`
6. `timer-audio-notifications`

---

## 11.2 Timer machine

La máquina de estados define:

- estados,
- eventos,
- transiciones,
- side effects permitidos,
- deadlines de respuesta.

### Estado raíz sugerido

```ts
type TimerStateName =
  | 'idle'
  | 'study_running'
  | 'study_completed_waiting_response'
  | 'break_selection'
  | 'break_running'
  | 'break_completed_waiting_response'
  | 'lunch_running'
  | 'session_completed'
  | 'session_cancelled'
  | 'session_expired';
```

### Eventos principales

```ts
type TimerEvent =
  | { type: 'START_SESSION'; payload: StartSessionPayload }
  | { type: 'STUDY_FINISHED' }
  | { type: 'CHOOSE_BREAK_DEFAULT' }
  | { type: 'CHOOSE_BREAK_CUSTOM'; payload: { seconds: number } }
  | { type: 'SKIP_BREAK' }
  | { type: 'BREAK_FINISHED' }
  | { type: 'CONFIRM_RESUME' }
  | { type: 'START_LUNCH' }
  | { type: 'LUNCH_FINISHED' }
  | { type: 'CANCEL_SESSION' }
  | { type: 'EXPIRE_SESSION' }
  | { type: 'HYDRATE_ACTIVE_SESSION'; payload: HydratedTimerState };
```

---

## 11.3 Timer engine

El `timer-engine` coordina:

- conteo real del tiempo,
- avance de ticks,
- detección de deadlines,
- persistencia periódica,
- invocación de sonidos/notificaciones,
- reconstrucción del estado tras cierre.

### Regla clave

El engine no debe depender únicamente de `setInterval` para la verdad temporal.

Debe basarse en:

- timestamp de inicio,
- timestamp actual,
- duración objetivo,
- cálculo derivado por diferencia de tiempo.

Así, si la app se pausa o se cierra, se puede reconstruir el progreso real.

---

## 11.4 Timer store

Debe existir un store dedicado para la sesión activa.

Responsabilidades:

- contener el estado activo del cronómetro,
- exponer acciones puras y acciones coordinadas,
- separar estado persistente de estado visual.

### Estado mínimo sugerido

```ts
interface ActiveTimerStore {
  machineState: TimerStateName;
  activeSession: ActiveStudySession | null;
  currentSegmentStartedAt?: string;
  currentSegmentTargetSeconds?: number;
  waitingDeadlineAt?: string;
  lunchReturnState?: TimerStateName;
  isHydrated: boolean;
  isSyncing: boolean;
  lastPersistedAt?: string;
}
```

---

## 11.5 Timer persistence

Debe existir persistencia local del timer activo.

### Qué persistir localmente

- snapshot de la sesión activa,
- estado de la máquina,
- timestamps clave,
- banco acumulado,
- ciclos completados,
- segmento actual,
- deadline actual.

### Cuándo persistir

- al iniciar sesión,
- al cambiar de estado,
- cada cierto intervalo razonable,
- al backgrounding,
- al cerrar pantalla si aplica.

---

## 11.6 Timer audio and notifications

Debe encapsularse en un servicio independiente.

Funciones sugeridas:

- `playStudyFinishedSound()`
- `playResumeStudySound()`
- `playInverseReminderSound()`
- `scheduleLocalAlert()`
- `cancelPendingAlerts()`

La UI no debe manejar reproducción de audio directamente.

---

## 12. Lógica del banco de descanso

La lógica del banco debe vivir en funciones puras del dominio.

## 12.1 Entradas de la lógica

- descanso ganado en este ciclo,
- banco previo,
- decisión del usuario,
- descanso efectivamente consumido,
- tipo de descanso.

## 12.2 Salidas de la lógica

- banco actualizado,
- segmento de descanso a registrar,
- siguiente estado de la máquina.

## 12.3 Funciones de dominio sugeridas

```ts
computeGrantedBreakSeconds(...)
computeAvailableBreakBank(...)
validateCustomBreakChoice(...)
consumeBreakBank(...)
computeNextCycleType(...)
```

## 12.4 Regla crítica

El sistema debe permitir descansar cualquier cantidad entera válida desde `0` hasta `availableBreakSeconds`.

Esto debe incluir explícitamente casos como:

- 0 min
- 1 min
- 4 min
- cualquier otro entero válido

La UI puede mostrar minutos, pero el dominio debe trabajar en segundos.

---

## 13. Flujo técnico de una sesión de estudio

```text
User inicia sesión
  -> se crea ActiveStudySession
  -> timer-machine entra a study_running
  -> timer-engine arranca seguimiento
  -> timer-store persiste snapshot local
  -> al terminar estudio:
       - se registra StudySegment
       - suena audio
       - estado pasa a waiting/break selection
  -> usuario elige descanso
       - dominio valida y calcula banco
       - se registra BreakSegment
       - break_running
  -> termina descanso
       - suena “toca estudiar”
       - se abre deadline de respuesta
  -> usuario confirma
       - nuevo ciclo study_running
  -> al cierre final:
       - sesión se materializa como StudySession completa
       - se guarda en Firestore
       - se limpia timer local
       - se actualizan vistas derivadas
```

---

## 14. Arquitectura del temporizador inverso

El temporizador inverso es más simple que el de estudio, pero debe seguir la misma filosofía:

- estado claro,
- tiempo derivado por timestamps,
- persistencia local si queda activo,
- recordatorios cada 15 minutos.

## 14.1 Estados mínimos

- `idle`
- `inverse_running`
- `inverse_completed`
- `inverse_cancelled`

## 14.2 Store recomendado

Puede vivir en el mismo módulo `timer`, pero con un substore separado o con un discriminante de tipo.

## 14.3 Decisión arquitectónica

Para evitar complejidad innecesaria, se recomienda:

- **un módulo timer unificado**,
- pero con **dos engines separados**: `studyTimerEngine` e `inverseTimerEngine`.

---

## 15. Repositorios

Cada agregado principal debe tener su repositorio.

## 15.1 Repositorios requeridos

- `UserRepository`
- `CategoryRepository`
- `PresetRepository`
- `SessionRepository`
- `EventRepository`
- `GoalRepository`
- `SettingsRepository`

## 15.2 Responsabilidades

### Repository

- leer,
- escribir,
- actualizar,
- subscribirse a cambios si aplica,
- mapear documentos Firestore a entidades tipadas.

## 15.3 Regla

Ningún componente UI debe hablar directamente con Firestore.

---

## 16. Firestore: estructura lógica

```text
users/{uid}
  profile/main
  settings/main
  categories/{categoryId}
  presets/{presetId}
  sessions/{sessionId}
  events/{eventId}
  goals/{goalId}
```

### 16.1 categories

En una sola colección por usuario con campo `type`.

### 16.2 sessions

Una sola colección con sesiones de estudio e inversas, discriminadas por `type`.

Ventaja:

- simplifica consulta de calendario,
- simplifica estadísticas globales,
- mantiene flexibilidad.

### 16.3 events

Solo eventos invisibles planificados.

### 16.4 goals

Metas semanales por subcategoría de estudio.

---

## 17. Estrategia de consultas

## 17.1 Consultas de calendario

Se consultan:

- `sessions` por rango de fecha,
- `events` por rango de fecha o recurrencias aplicables.

## 17.2 Consultas de estadísticas

Primera etapa:

- calcular desde `sessions` directamente.

Etapa posterior opcional:

- cachear agregados por día/semana/mes.

## 17.3 Consultas de metas

- goals por `weekKey`
- categorías de estudio
- sesiones study del rango semanal

---

## 18. Estrategia de estadísticas

Este módulo debe ser robusto porque el usuario quiere desglose fino tanto de estudio como de ocio, incluyendo subcategorías. Esta exigencia es central en el proyecto.

## 18.1 Filosofía

Las estadísticas deben construirse desde datos históricos ya persistidos, no desde el estado activo del timer salvo para vistas en vivo del día actual.

## 18.2 Entradas del módulo stats

- sesiones study completas,
- sesiones inverse completas,
- categorías,
- metas,
- rango temporal solicitado.

## 18.3 Salidas del módulo stats

- totales por período,
- comparación estudio vs ocio,
- breakdown por subcategoría de estudio,
- breakdown por subcategoría de ocio,
- avances de metas,
- series temporales,
- resúmenes de tabla.

---

## 18.4 Aggregators de estadísticas

Se recomienda implementar agregadores puros en `features/stats/domain`.

Funciones sugeridas:

```ts
aggregateDailyStats(...)
aggregateWeeklyStats(...)
aggregateMonthlyStats(...)
aggregateStudyByCategory(...)
aggregateInverseByCategory(...)
aggregateStudyVsInverse(...)
aggregateGoalProgress(...)
buildHistoryTable(...)
buildYearOverview(...)
```

---

## 18.5 Breakdown por subcategoría de estudio

Obligatorio.

El sistema debe poder mostrar, para el período actual o histórico:

- total de tiempo efectivo por cada categoría de estudio,
- porcentaje relativo dentro del total de estudio,
- ranking de subcategorías,
- evolución por día/semana/mes.

### Ejemplo de salida

```ts
interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  color: string;
  totalSeconds: number;
  percentage: number;
}
```

---

## 18.6 Breakdown por subcategoría de ocio

Obligatorio.

El sistema debe poder mostrar, para el período actual o histórico:

- total de tiempo por cada categoría inversa,
- porcentaje relativo dentro del total de ocio,
- ranking de subcategorías de ocio,
- evolución por día/semana/mes.

Esto incluye ejemplos como:

- YouTube
- juegos
- ocio general
- redes sociales

### Salida sugerida

La misma estructura que estudio, pero filtrada por `type = inverse`.

---

## 18.7 View models de estadísticas

La UI de estadísticas no debe consumir documentos crudos. Debe consumir `view models` listos para presentar.

### Ejemplo

```ts
interface StatsDashboardViewModel {
  periodType: 'day' | 'week' | 'month';
  studyTotalSeconds: number;
  inverseTotalSeconds: number;
  studyBreakdown: CategoryBreakdownItem[];
  inverseBreakdown: CategoryBreakdownItem[];
  studyVsInversePercentage: {
    study: number;
    inverse: number;
  };
  barSeries: StatsBarDatum[];
  historyRows: HistoryTableRow[];
  activeGoals: GoalProgressViewModel[];
}
```

---

## 18.8 Regla de agregación de estudio

Para study sessions se debe usar:

- `effectiveStudySeconds`

No usar:

- `totalElapsedSeconds`

porque ese incluye descansos y almuerzo.

## 18.9 Regla de agregación de ocio

Para inverse sessions se debe usar:

- `totalElapsedSeconds`

---

## 18.10 Eventos invisibles en estadísticas

Nunca deben contaminar estadísticas productivas.

No se incluyen en:

- studyTotal
- inverseTotal
- breakdowns
- porcentajes
- metas

---

## 19. Arquitectura del calendario

El calendario necesita una capa propia porque mezcla datos reales y planificados.

## 19.1 Entradas

- sesiones de estudio,
- sesiones inversas,
- eventos invisibles,
- filtros de fecha,
- vista actual.

## 19.2 View model del calendario

La UI del calendario debe consumir eventos normalizados:

```ts
type CalendarItemType = 'study' | 'inverse' | 'invisible';

interface CalendarItemViewModel {
  id: string;
  type: CalendarItemType;
  title: string;
  startAt: string;
  endAt: string;
  color: string;
  categoryName: string;
  metadata?: Record<string, unknown>;
}
```

## 19.3 Expansión de recurrencias

Los eventos invisibles recurrentes deben expandirse a instancias visibles para la UI del calendario mediante una función pura tipo:

```ts
expandRecurringInvisibleEvents(...)
```

No guardar cada ocurrencia como documento independiente salvo que en el futuro exista una razón fuerte.

---

## 20. Arquitectura de metas

## 20.1 Fuente de verdad

La meta es un documento persistido.

## 20.2 Cálculo de progreso

El progreso se calcula combinando:

- goal.targetSeconds
- sesiones study del rango semanal
- filtro por categoría objetivo

## 20.3 Servicio sugerido

`GoalProgressService`

Responsabilidades:

- calcular avance semanal,
- determinar estado,
- producir view models para stats y vista anual.

## 20.4 Vista anual con estrellas

La vista anual debe consumir una función tipo:

```ts
buildYearAchievementMap(...)
```

Salida sugerida:

```ts
interface MonthAchievement {
  monthKey: string;
  hasStar: boolean;
  studyTotalSeconds: number;
  inverseTotalSeconds: number;
}
```

---

## 21. Store global y stores locales

No todo debe estar en el mismo store.

## 21.1 Stores recomendados

- `authStore`
- `timerStore`
- `uiStore`
- `syncStore` (si realmente hace falta)

## 21.2 Qué va en store global

- usuario autenticado,
- estado activo del cronómetro,
- preferencias UI globales,
- flags de sincronización.

## 21.3 Qué no va en store global

- listas grandes de sesiones históricas permanentes,
- cálculos de stats cacheados indiscriminadamente,
- formularios efímeros.

Esos deben vivir en hooks y queries locales por pantalla.

---

## 22. Hooks sugeridos

## 22.1 Auth

- `useAuthUser()`
- `useRequireAuth()`

## 22.2 Categories

- `useCategories(type)`
- `useCreateCategory()`
- `useUpdateCategory()`

## 22.3 Presets

- `usePresets()`
- `useCreatePreset()`

## 22.4 Timer

- `useActiveTimer()`
- `useStartStudySession()`
- `useBreakSelection()`
- `useCancelStudySession()`
- `useLunchAction()`
- `useInverseTimer()`

## 22.5 Sessions

- `useSessionsInRange(range)`
- `useSessionDetails(sessionId)`

## 22.6 Calendar

- `useCalendarItems(range, view)`

## 22.7 Stats

- `useStatsDashboard(period)`
- `useStudyBreakdown(period)`
- `useInverseBreakdown(period)`
- `useHistoryTable(periodType)`

## 22.8 Goals

- `useWeeklyGoals(weekKey)`
- `useGoalProgress(weekKey)`

---

## 23. Servicios de aplicación

Los servicios coordinan varias piezas.

## 23.1 StudySessionCoordinator

Responsabilidades:

- iniciar sesión,
- crear snapshot inicial,
- delegar a timer machine,
- persistir localmente,
- finalizar guardando en repositorio.

## 23.2 ActiveTimerRecoveryService

Responsabilidades:

- leer snapshot local,
- reconstruir estado,
- validar expiración por timestamps,
- rehidratar timer store.

## 23.3 StatsAssemblerService

Responsabilidades:

- tomar sesiones + categorías + goals,
- armar el view model completo de la pantalla de estadísticas.

## 23.4 CalendarAssemblerService

Responsabilidades:

- combinar study + inverse + invisible,
- expandir recurrencias,
- ordenar,
- producir eventos para UI.

---

## 24. Infraestructura: Firebase

## 24.1 Firebase client

Debe existir un módulo único de inicialización.

## 24.2 Auth adapter

Encapsula:

- login,
- register,
- logout,
- auth state listener,
- Google sign-in.

## 24.3 Firestore adapters

Encapsulan lecturas/escrituras por colección.

## 24.4 Regla

Nunca inicializar Firebase en múltiples lugares dispersos.

---

## 25. Persistencia local

## 25.1 Objetivos

- sobrevivir a cierres accidentales,
- rehidratar cronómetro,
- persistir preferencias rápidas.

## 25.2 Qué almacenar localmente

- sesión activa,
- selección de sonido por dispositivo,
- flags visuales opcionales,
- último filtro de estadísticas si aporta UX.

## 25.3 Qué no almacenar como única verdad

- historial largo,
- metas como única copia,
- categorías como única copia.

Eso debe vivir principalmente en Firestore.

---

## 26. Sincronización y conflictos

## 26.1 Regla principal

Un usuario no debe tener dos study sessions activas paralelas.

## 26.2 Estrategia

Al iniciar una nueva sesión:

- verificar si hay sesión activa local,
- verificar si hay sesión activa remota marcada,
- resolver con prioridad a la más reciente o forzar recuperación.

## 26.3 Estrategia pragmática V1

Usar un documento ligero de referencia como:

```text
users/{uid}/settings/main.activeStudySessionRef
```

o equivalente, para saber si hay una sesión activa conocida.

---

## 27. Errores y observabilidad

## 27.1 Tipos de error

- errores de auth,
- errores de sync,
- errores de audio,
- errores de persistencia,
- errores de dominio inválido.

## 27.2 Estrategia

Los errores de dominio deben ser mensajes claros y tipados, no strings sueltos por toda la app.

Ejemplo:

```ts
class InvalidCustomBreakSelectionError extends Error {}
class NoActiveSessionError extends Error {}
class SessionExpiredError extends Error {}
```

---

## 28. Testing strategy

## 28.1 Unit tests obligatorios

En dominio puro:

- máquina de estados,
- banco de descanso,
- cálculo de estudio efectivo,
- cálculo de descanso largo,
- agregadores de estadísticas,
- metas por subcategoría,
- breakdown de ocio por subcategoría,
- breakdown de estudio por subcategoría.

## 28.2 Integration tests recomendados

- timer store + persistence
- session repository + mapper
- calendar assembler
- stats assembler

## 28.3 UI tests mínimos

- iniciar sesión de estudio
- elegir descanso personalizado
- cancelar sesión
- crear evento invisible
- ver desglose de estudio y ocio por subcategoría

---

## 29. Estrategia de implementación por orden técnico

## Fase 1 — Fundación

- bootstrap Expo
- Firebase config
- auth
- theme base
- routing base
- tipos de dominio

## Fase 2 — Núcleo timer

- timer machine
- timer engine
- timer store
- persistencia local
- inicio/cancelación de sesión
- estudio efectivo
- banco de descanso
- descanso personalizado
- almuerzo

## Fase 3 — Persistencia histórica

- session repository
- guardar study/inverse sessions
- recuperación de sesión activa

## Fase 4 — Categorías y presets

- CRUD categorías
- CRUD presets
- snapshots

## Fase 5 — Calendario

- view models
- eventos invisibles
- recurrencia semanal
- vistas base

## Fase 6 — Estadísticas

- aggregators
- estudio vs ocio
- breakdown por subcategoría de estudio
- breakdown por subcategoría de ocio
- tabla histórica

## Fase 7 — Metas

- CRUD goals
- cálculo de progreso
- estrellas mensuales

## Fase 8 — Pulido

- sonidos
- confeti
- microanimaciones
- mejor UX

---

## 30. Contratos entre capas

## 30.1 UI -> Application

La UI dispara acciones del tipo:

- `startStudySession(input)`
- `chooseCustomBreak(seconds)`
- `skipBreak()`
- `confirmResume()`
- `startLunch()`
- `cancelSession()`

## 30.2 Application -> Domain

La capa application transforma input y llama reglas puras.

## 30.3 Application -> Repositories/Infrastructure

La capa application persiste, reproduce audio, agenda notificaciones y sincroniza.

## 30.4 Regla

El dominio puro no debe importar componentes, Firebase ni APIs de dispositivo.

---

## 31. View models clave

## 31.1 Timer screen view model

Debe incluir:

- nombre
- categoría
- color
- estado actual
- tiempo restante actual
- tiempo efectivo acumulado
- ciclo actual
- banco disponible
- deadline restante si aplica
- botones disponibles

## 31.2 Stats dashboard view model

Debe incluir al menos:

- total estudio
- total ocio
- porcentaje estudio vs ocio
- desglose de estudio por subcategoría
- desglose de ocio por subcategoría
- barras por período
- tabla histórica
- metas actuales

## 31.3 Calendar day/week/month view model

Debe incluir ítems normalizados listos para pintar.

---

## 32. Decisiones clave ya tomadas

1. El cronómetro se implementa como máquina de estados.
2. El dominio trabaja en segundos.
3. La UI muestra minutos/horas amigables.
4. Las estadísticas usan sesiones persistidas, no estado efímero.
5. El breakdown por subcategoría es obligatorio tanto para estudio como para ocio.
6. Los eventos invisibles no cuentan para estadísticas.
7. El banco de descanso no sale de la sesión actual.
8. Una sola study session activa por usuario.
9. Los snapshots preservan histórico frente a cambios de categoría/preset.

---

## 33. Próximo artefacto recomendado

Después de este documento, el siguiente archivo ideal es:

- `IMPLEMENTATION_PLAN.md`

Ese documento debe aterrizar esta arquitectura a:

- orden exacto de archivos,
- servicios a crear primero,
- stores,
- tipos,
- pantallas,
- prompts para Gemini Code Assist.

---

## 34. Instrucción final para cualquier agente de código

Si vas a implementar Productvt Beta:

- no pongas reglas de tiempo complejas dentro de componentes,
- no calcules estadísticas directamente en la UI,
- no mezcles sesiones activas con histórico,
- no uses `totalElapsedSeconds` para medir estudio productivo,
- sí debes soportar desglose por subcategoría tanto en estudio como en ocio,
- y sí debes construir primero el núcleo del timer antes del calendario bonito o el pulido visual.

