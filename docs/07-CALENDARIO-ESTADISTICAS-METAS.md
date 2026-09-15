# 07 — Calendario, estadísticas y metas: algoritmos y fórmulas

## Propósito

Este documento fija los **algoritmos y fórmulas** de las tres secciones de la app que leen (nunca escriben) el histórico de sesiones: Calendario, Estadísticas y Metas. No redefine tipos ni campos — esos son de `02-DOMINIO.md` (interfaces, invariantes, esquema Firestore) — sino el comportamiento: qué consulta se hace, cómo se agrega en cliente, qué view model consume la UI y con qué fórmula exacta se calcula cada número. Es el documento que la fase de Calendario/Estadísticas/Metas del plan de implementación (`brief §9`) necesita para construirse sin preguntas adicionales.

Nota de alcance editorial: `02-DOMINIO.md` §3.6 nombra dos documentos futuros (`07-CALENDARIO-Y-ESTADISTICAS.md` y `08-METAS.md`) al anticipar dónde vivirían estos agregadores. Este documento **fusiona ambos** en un solo archivo (`07-CALENDARIO-ESTADISTICAS-METAS.md`) por asignación directa del orquestador — no cambia ningún tipo, invariante o esquema ya fijado en `02-DOMINIO.md`, solo consolida su ubicación editorial. Ningún otro documento de `docs/` necesita reeditarse por esto: la cita "`07-CALENDARIO-Y-ESTADISTICAS.md` / `08-METAS.md`" en `02-DOMINIO.md` §3.6 sigue siendo válida, apunta ahora a las secciones 1–3 de este archivo.

La Galaxia de metas (planetas, subgalaxias, arrastre) y la Tienda quedan **fuera de este documento**: son V1.1, documentadas completas en `10-GALAXIA-Y-TIENDA.md` (brief §11, `01-SPEC.md` §9.2). Aquí solo se especifica lo que V1 necesita ya: los **ganchos de datos** (`WeeklyGoal.parentGoalId?`) y cómo agregan sin doble conteo para que la Galaxia los reutilice sin migración, según `02-DOMINIO.md` §2.6/§3.3.

## Fuentes

Orden de autoridad (si dos fuentes chocan, gana la de arriba; ver también el orden general en `_brief-orquestador.md`):

1. Respuestas literales del creador — anexo de `_brief-orquestador.md` (etiquetas `R1`..`R25`).
2. `03-requisitos/decisiones-tomadas.md` v2 (etiquetas `D <sección/punto>`).
3. `_brief-orquestador.md` revisado 2026-09-06 (etiquetas `B §n`).
4. Código commiteado en `productvt-beta/src/domain/**` (etiqueta `CODE`): verdad para nombres de tipos y campos citados aquí. Ninguna entidad de este documento (`WeeklyGoal`, `Category`, `StudySession`, `InverseSession`, `InvisibleEvent`) tiene todavía repositorio ni servicio de calendario/estadísticas/metas commiteado — todas las funciones de este documento son **adición propuesta**, siguiendo el mismo patrón que `02-DOMINIO.md` §3.3/§3.6.
5. `docs/01-SPEC.md` (requisitos de producto §6.10-6.13, alcance §9), `02-DOMINIO.md` (modelo de datos, invariantes I-1..I-20, esquema Firestore §5, convenciones de tiempo §6) y `03-CRONOMETRO.md` (§8.3, regla de cancelación; §9, expiración y zombie) — ya escritos y completos, se citan por sección, no se repiten.
6. `03-requisitos/revision-spec-beta.md` (etiquetas `REV-ALTA-n`, `REV-MEDIA-<fila>`): hallazgos de producto ya resueltos en `01-SPEC.md` §11 se citan sin repetir; este documento resuelve su **faceta algorítmica** donde aplica (REV-MEDIA-12: §26.5, la vacuidad de la estrella anual — fórmula y 5 ejemplos en §3.3).
7. `01-mockups/desktop/galaxia-metas.html`, `03-requisitos/nueva-funcionalidad-galaxia-tienda.md`, `01-mockups/desktop/decisiones-visuales-galaxia.md`: solo para los ganchos de §3.6 (parentGoalId), no para su UI (V1.1).
8. Originales v1 (`docs/originales/SPEC-v1.md` §23–27; `docs/originales/ARCHITECTURE-v1.md` §17–20): punto de partida de los view models y agregadores (`CalendarItemViewModel`, `CategoryBreakdownItem`, `StatsDashboardViewModel`, `buildYearAchievementMap`), adaptados aquí a los nombres as-built y a las reglas ya resueltas en `02-DOMINIO.md`/`03-CRONOMETRO.md`.

Convención de este documento: toda función marcada `// ADICIÓN (fase calendario)`, `(fase estadísticas)` o `(fase metas)` es dominio puro (`src/domain/**`, sin React ni Firebase) siguiendo el patrón ya fijado en `02-DOMINIO.md` §3.6; los "assemblers" que las orquestan contra Firestore viven en `src/features/{calendar,stats,goals}/services/` (`B §7`).

## 1. Calendario

El calendario lee tres fuentes (`StudySession`, `InverseSession`, `InvisibleEvent`, `02-DOMINIO.md` §2.3-2.6) y las combina con dos mecanismos de filtrado que conviven (B §12, `nueva-funcionalidad-calendario-por-capas.md`): **capas de meta** (implícitas, una por `categoryId` con al menos una `WeeklyGoal` alguna vez) y **capas personalizadas** (`CalendarLayer`, `02-DOMINIO.md` §3.3 líneas 504-517). Ninguna capa tiene color propio (D6, "color vivo"): son filtros/interruptores de visibilidad, nunca una fuente de pintura.

### 1.1 Qué reemplaza y qué no

Antes de esta fase, el calendario mostraba todo sin filtro (SPEC v1 §23.2). La regla de ensamblado de §1.3 preserva ese comportamiento como caso base: **una categoría sin ninguna capa de meta ni personalizada que la mencione se muestra siempre**, sin interruptor (no hay control de UI para algo que ninguna capa reclama). Una categoría queda bajo control de capas **solo** desde el momento en que aparece en `CalendarLayer.categoryIds` o es el `categoryId` de alguna `WeeklyGoal`, y desde ahí su visibilidad depende de que al menos una de las capas que la incluyen esté visible. Esto es una decisión del orquestador (no está en el brief explícitamente) que resuelve la pregunta abierta 3 de `nueva-funcionalidad-calendario-por-capas.md` sin inventar una entidad "capa Todo": un usuario nuevo sin metas ni capas ve el calendario exactamente como en V1 (marcado en "Supuestos pendientes de confirmar").

### 1.2 Resolución de capas: de datos crudos a descriptores uniformes

Las capas de meta son virtuales: no hay un documento `CalendarLayer` por cada `WeeklyGoal`, sino un descriptor derivado por `categoryId`. Como puede existir más de una `WeeklyGoal` histórica para el mismo `categoryId` (una por semana) con `layerVisible` potencialmente distinto, la visibilidad efectiva de la capa de meta usa la meta de **`weekKey` más reciente** para ese `categoryId` — comparación de string funciona porque `WeekKey` ya viene cero-rellenado (`buildWeekKey`, `02-DOMINIO.md` §3.1/§6.3), así que el orden lexicográfico coincide con el cronológico.

```ts
// src/domain/rules/calendar-layers.ts — ADICIÓN (fase calendario)
import type { Category } from '../entities/category';
import type { CalendarLayer } from '../entities/calendar-layer';
import type { WeeklyGoal } from '../entities/weekly-goal';

/** Identidad uniforme de una capa: virtual (meta) o real (personalizada). Cadena, no unión discriminada,
 *  porque se usa directo como key de UI/estado ("qué capas están tildadas"). */
export type CalendarLayerId = `goal:${string}` | `custom:${string}`;

export function goalLayerId(categoryId: string): CalendarLayerId {
  return `goal:${categoryId}`;
}
export function customLayerId(layerId: string): CalendarLayerId {
  return `custom:${layerId}`;
}

export interface CalendarLayerDescriptor {
  layerId: CalendarLayerId;
  kind: 'goal' | 'custom';
  name: string;              // WeeklyGoal.name (capa de meta) o CalendarLayer.name (personalizada)
  categoryIds: readonly string[]; // 1 elemento en una capa de meta; 1+ en una personalizada
  isVisible: boolean;
}

/** Una capa de meta por cada categoryId con ≥1 WeeklyGoal alguna vez; usa la meta de weekKey más
 *  reciente como fuente de `name`/`layerVisible` (§1.2). No filtra por semana: es solo la fuente
 *  del descriptor, no acota qué sesiones se muestran (eso lo hace §1.3 con el categoryId, sin
 *  restricción temporal — regla 1 de B §12). */
export function resolveGoalLayers(goals: readonly WeeklyGoal[]): CalendarLayerDescriptor[] {
  const latestByCategory = new Map<string, WeeklyGoal>();
  for (const goal of goals) {
    const current = latestByCategory.get(goal.categoryId);
    if (!current || goal.weekKey > current.weekKey) latestByCategory.set(goal.categoryId, goal);
  }
  return [...latestByCategory.values()].map((goal) => ({
    layerId: goalLayerId(goal.categoryId),
    kind: 'goal' as const,
    name: goal.name,
    categoryIds: [goal.categoryId],
    isVisible: goal.layerVisible ?? true,   // ausente ⇒ visible (02-DOMINIO.md §3.3 línea 501)
  }));
}

export function resolveCustomLayers(layers: readonly CalendarLayer[]): CalendarLayerDescriptor[] {
  return layers.map((layer) => ({
    layerId: customLayerId(layer.id),
    kind: 'custom' as const,
    name: layer.name,
    categoryIds: layer.categoryIds,
    isVisible: layer.isVisible,
  }));
}
```

Escritura (no es dominio puro, pero fija el contrato para el repositorio de la fase Calendario): alternar la visibilidad de una capa de meta desde la UI del calendario escribe `layerVisible` en la **misma** `WeeklyGoal` que `resolveGoalLayers` habría elegido como fuente (la de `weekKey` más reciente para ese `categoryId`) — es un CRUD normal sobre un campo existente, sin arbitraje (D14), igual que cualquier otro campo de `WeeklyGoal`. Una meta nueva que se cree después para ese mismo `categoryId` no hereda el valor explícito: nace con `layerVisible` ausente (⇒ visible), comportamiento por defecto explícito en "Supuestos pendientes de confirmar".

### 1.3 Función pura de ensamblado

```ts
// src/domain/rules/calendar-layers.ts — ADICIÓN (fase calendario), continuación

export type CalendarItemType = 'study' | 'inverse' | 'invisible';

/** Forma normalizada de entrada: una fila por sesión de estudio, sesión inversa u ocurrencia
 *  (ya expandida, §1.5) de evento invisible. El assembler no distingue status de sesión: filtrar
 *  por status (si aplica) es responsabilidad del caller (para Calendario no aplica — RF-CAL-02
 *  muestra sesiones completadas Y sesiones cerradas con bloques efectivos, ver 03-CRONOMETRO.md §8.3). */
export interface CalendarSourceItem {
  id: string;
  type: CalendarItemType;
  categoryId: string;
  title: string;
  startAt: string;    // ISO UTC
  endAt: string;       // ISO UTC
  metadata?: Record<string, unknown>;
}

/** Salida del assembler de DOMINIO puro (`src/domain/rules/calendar-layers.ts`). Nombre elegido
 *  deliberadamente `CalendarAssemblerItem` y no `CalendarItemViewModel`: `05-ARQUITECTURA.md` §4.3
 *  ya fija una interfaz **distinta** con ese mismo nombre (`kind: CalendarItemKind`, `startIso`/
 *  `endIso`, `categoryColor`) como el contrato de UI que consume `src/features/calendar/`. Esta
 *  interfaz de aquí es la forma más completa que necesita el propio dominio (`categoryId`,
 *  `categoryName` para resolver fallback de archivada, `metadata` para casos como el detalle de
 *  sesión de §1.7) — el service de `src/features/calendar/services/` (B §7) es quien mapea
 *  `CalendarAssemblerItem` → el `CalendarItemViewModel` de `05-ARQUITECTURA.md` §4.3 para la UI.
 *  Pendiente de coherencia editorial (no se resuelve aquí, `05-ARQUITECTURA.md` no es de mi
 *  autoridad editar): esa sección debe actualizar su comentario para citar esta interfaz como la
 *  forma que produce el algoritmo de agregación, en vez de asumir que su propio shape es el que
 *  `assembleCalendarLayers` devuelve directamente. */
export interface CalendarAssemblerItem {
  id: string;
  type: CalendarItemType;
  title: string;
  startAt: string;
  endAt: string;
  categoryId: string;
  categoryName: string;   // SIEMPRE vigente (I-15, 02-DOMINIO.md §1.2 "color vivo")
  color: string;           // SIEMPRE vigente de la categoría, NUNCA de una capa (B §12, D6)
  layerIds: CalendarLayerId[]; // capas VISIBLES a las que pertenece; [] si no hay ninguna capa que reclame su categoría (§1.1)
  metadata?: Record<string, unknown>;
}

/**
 * Ensamblado de capas (B §12, resuelve las 4 preguntas de `nueva-funcionalidad-calendario-por-capas.md`):
 * - Una categoría sin ninguna capa (de meta o personalizada) que la mencione se muestra siempre (§1.1).
 * - Una categoría mencionada por ≥1 capa se muestra solo si AL MENOS UNA de las capas que la
 *   mencionan está visible; si todas las que la mencionan están ocultas, desaparece por completo
 *   (caso "capa desactivada no aparece", Q7 de §6).
 * - Un ítem cuya categoría está en varias capas visibles aparece UNA sola vez, con `layerIds` de
 *   longitud ≥ 2 (caso "dos capas con categorías solapadas", Q5 de §6) — nunca se duplica la fila.
 * - Una capa de meta no acota por semana: su categoryId trae TODO el histórico que pase el filtro
 *   de rango que ya aplicó la consulta (§4), incluidas sesiones anteriores a que la meta existiera
 *   (Q6 de §6).
 */
export function assembleCalendarLayers(
  items: readonly CalendarSourceItem[],
  layers: readonly CalendarLayerDescriptor[],   // TODAS las resueltas (§1.2), cualquier visibilidad
  categoriesById: ReadonlyMap<string, Category>,
): CalendarAssemblerItem[] {
  const layeredCategoryIds = new Set<string>();
  for (const layer of layers) for (const c of layer.categoryIds) layeredCategoryIds.add(c);

  const visibleLayersByCategory = new Map<string, CalendarLayerDescriptor[]>();
  for (const layer of layers) {
    if (!layer.isVisible) continue;
    for (const c of layer.categoryIds) {
      const list = visibleLayersByCategory.get(c) ?? [];
      list.push(layer);
      visibleLayersByCategory.set(c, list);
    }
  }

  const result: CalendarAssemblerItem[] = [];
  for (const item of items) {
    const isControlled = layeredCategoryIds.has(item.categoryId);
    const memberLayers = visibleLayersByCategory.get(item.categoryId) ?? [];
    if (isControlled && memberLayers.length === 0) continue; // toda capa que la reclama está oculta

    const category = categoriesById.get(item.categoryId);
    result.push({
      id: item.id,
      type: item.type,
      title: item.title,
      startAt: item.startAt,
      endAt: item.endAt,
      categoryId: item.categoryId,
      categoryName: category?.name ?? item.title,   // categoría archivada sigue resolviendo (I-14)
      color: category?.color ?? '#6E7368',          // gris "atenuado" del skin Papel si no resuelve (defensivo, nunca debería faltar)
      layerIds: memberLayers.map((l) => l.layerId),
      metadata: item.metadata,
    });
  }
  return result;
}
```

### 1.4 Expansión de recurrencia de eventos invisibles

`InvisibleEvent.recurrence?: WeeklyRecurrence` (`frequency: 'weekly'`, `daysOfWeek: WeekDayIndex[]`, `until?`, `02-DOMINIO.md` §2.6/§3.1) se expande en cliente con `expandRecurringInvisibleEvents`, ya nombrada en `02-DOMINIO.md` §2.6 pero sin algoritmo — se fija aquí.

**Regla de zona horaria (obligatoria, `02-DOMINIO.md` §6.2)**: `daysOfWeek` se interpreta en el día de la semana **local** (zona del perfil) del evento, no en UTC. La hora de cada ocurrencia debe reproducir la misma hora de pared local que `startAt` original, incluso cuando una ocurrencia cae al otro lado de un cambio de horario (DST) respecto del original — nunca se le suma una semana en milisegundos a ciegas, porque eso arrastra el corrimiento de una hora a través del cambio de horario.

```ts
// src/domain/rules/expand-recurring-events.ts — ADICIÓN (fase calendario)
import { toZonedWallClock } from '../time/zoned'; // ya especificada en 02-DOMINIO.md §3.6

/** Offset (minutos, este-positivo) entre la hora de pared en `timezone` y UTC en el instante dado.
 *  Única primitiva nueva que necesita este algoritmo; se construye enteramente sobre
 *  `toZonedWallClock` (02-DOMINIO.md §3.6), sin agregar una función de "zona local → UTC" al
 *  dominio compartido. */
function offsetMinutesAt(instantIso: string, timezone: string): number {
  const zoned = toZonedWallClock(instantIso, timezone);
  const asIfUtcMs = Date.UTC(
    zoned.getFullYear(), zoned.getMonth(), zoned.getDate(),
    zoned.getHours(), zoned.getMinutes(), zoned.getSeconds(),
  );
  return (asIfUtcMs - new Date(instantIso).getTime()) / 60_000;
}

export interface RecurringOccurrence {
  occurrenceId: string;   // `${event.id}::${index}`, estable dentro de una misma consulta
  startAt: string;
  endAt: string;
}

/**
 * Expande UN InvisibleEvent recurrente contra un rango acotado [from, to] (el rango de la vista
 * de calendario solicitada, §1.5/§4 — nunca "todo el futuro"). Límite defensivo adicional:
 * `to − from` no debe superar ~2 años (730 días) en una sola llamada; una vista "Año" ya respeta
 * esto por construcción (365-366 días).
 */
export function expandRecurringInvisibleEvents(
  event: InvisibleEvent,
  from: string,
  to: string,
  timezone: string,
): RecurringOccurrence[] {
  if (!event.recurrence) {
    return overlaps(event.startAt, event.endAt, from, to) ? [{ occurrenceId: `${event.id}::0`, startAt: event.startAt, endAt: event.endAt }] : [];
  }

  const durationMs = new Date(event.endAt).getTime() - new Date(event.startAt).getTime();
  const zonedStart = toZonedWallClock(event.startAt, timezone);
  const [h, m, s] = [zonedStart.getHours(), zonedStart.getMinutes(), zonedStart.getSeconds()];
  const seriesFromMs = Math.max(new Date(event.startAt).getTime(), new Date(from).getTime());
  const seriesToMs = Math.min(
    event.recurrence.until ? new Date(event.recurrence.until).getTime() : new Date(to).getTime(),
    new Date(to).getTime(),
  );

  const occurrences: RecurringOccurrence[] = [];
  // Recorrer día calendario a día calendario (zonificado) en [seriesFromMs, seriesToMs] — acotado
  // por el rango de la vista, nunca por "hasta el infinito" (limita el costo a ~366 iteraciones/año).
  for (let dayCursorMs = startOfZonedDay(seriesFromMs, timezone); dayCursorMs <= seriesToMs; dayCursorMs += ONE_DAY_MS) {
    const zonedDay = toZonedWallClock(new Date(dayCursorMs).toISOString(), timezone);
    if (!event.recurrence.daysOfWeek.includes(zonedDay.getDay() as WeekDayIndex)) continue;

    // Construir el instante candidato: mismo Y-M-D que zonedDay, misma hora de pared (h,m,s) que el
    // evento original, interpretado como si fuera UTC (naive) y luego corregido por el offset real.
    const naiveMs = Date.UTC(zonedDay.getFullYear(), zonedDay.getMonth(), zonedDay.getDate(), h, m, s);
    const offsetAtNaive = offsetMinutesAt(new Date(naiveMs).toISOString(), timezone);
    const correctedStartMs = naiveMs - offsetAtNaive * 60_000; // deshace el offset asumido "como si fuera UTC"

    // Corrección de DST: si el offset real en el instante corregido difiere del usado para corregir
    // (cambio de horario entre el evento original y esta ocurrencia), reaplicar con el offset final.
    const offsetFinal = offsetMinutesAt(new Date(correctedStartMs).toISOString(), timezone);
    const startMs = offsetFinal === offsetAtNaive ? correctedStartMs : naiveMs - offsetFinal * 60_000;

    const occStart = new Date(startMs).toISOString();
    const occEnd = new Date(startMs + durationMs).toISOString();
    if (overlaps(occStart, occEnd, from, to)) {
      occurrences.push({ occurrenceId: `${event.id}::${occurrences.length}`, startAt: occStart, endAt: occEnd });
    }
  }
  return occurrences;
}
```

El pseudocódigo omite tres helpers triviales por brevedad: `overlaps(aStart, aEnd, bStart, bEnd)` (intersección de dos rangos ISO), `startOfZonedDay(ms, timezone)` (medianoche local anterior o igual a `ms`, vía `toZonedWallClock`) y la constante `ONE_DAY_MS = 86_400_000`; los tres son funciones puras de una línea, sin estado ni dependencias nuevas.

Notas de límites: el bucle está acotado por `[from, to]` (el rango pedido por la vista, nunca "todas las semanas futuras" — una serie sin `until` es infinita en teoría, pero solo se materializan las ocurrencias que caen dentro de la ventana consultada, igual que hace `expandRecurringInvisibleEvents` en cualquier calendario real). El caso `until` anterior a `from` produce `seriesToMs < seriesFromMs` y el bucle no itera nunca (cero ocurrencias, caso Q14 de §6). Se asume que una sola ocurrencia no cruza ella misma un cambio de horario (duración típica de horas, no de meses); si algún evento invisible durara más de un día y cruzara un cambio de horario a mitad de su propia duración, `durationMs` seguiría siendo la duración real en milisegundos (correcta), solo la hora de **inicio** de cada ocurrencia se corrige por DST.

### 1.5 Vistas: año, mes, semana, 3 días, día

Todas las vistas consumen `CalendarAssemblerItem[]` ya ensamblado (§1.3) más las ocurrencias expandidas (§1.4) normalizadas al mismo shape. La atribución de cada ítem a un día/semana/mes sigue `02-DOMINIO.md` §6.3 (bloque por `end`, sesión-fila por `startedAt`, evento por `startAt` de cada ocurrencia).

| Vista | Granularidad de consulta (§4) | Agrupación | Densidad |
|---|---|---|---|
| Año | 12 meses | `groupCalendarItemsByMonth` → total de segundos por mes (reutiliza los agregadores de §2) + `hasStar` (§3.3) | Un indicador resumido y una estrella por mes; sin lista de ítems (RF-CAL-01/RF-EST-07). |
| Mes | 1 mes ± semana de relleno para completar la grilla | `groupCalendarItemsByDay` → celda por día | Grilla tipo mes clásico: hasta `maxVisibleChips` ítems por celda (por defecto 3, ver `06-DISENO-UI.md`) y un chip `"+N más"` con el resto (`buildMonthDayCell`, §1.6). |
| Semana | 7 días | `layoutDayTimeline` por día con `maxVisibleColumns` bajo (por defecto 3, `06-DISENO-UI.md` resuelve el número exacto) | Vista más usada (B §12); satura más rápido → columnas limitadas + overflow `"+N más"` por franja horaria (§1.6, caso Q12). |
| 3 días | 3 días | `layoutDayTimeline` por día, `maxVisibleColumns` más alto (más ancho por día que en semana) | Igual mecanismo que semana, menos agresivo. |
| Día | 1 día | `layoutDayTimeline` de ese único día, `maxVisibleColumns` sin límite práctico (todo el ancho disponible) | Franja horaria (timeline) 00:00-24:00, no una lista (requisito nuevo de `nueva-funcionalidad-calendario-por-capas.md` §2). |

Vista por defecto configurable (`nueva-funcionalidad-calendario-por-capas.md` §4): se agrega

```ts
// src/domain/entities/user-profile.ts — ADICIÓN (fase calendario)
export type CalendarViewMode = 'year' | 'month' | 'week' | '3day' | 'day';
```

Literal de "3 días" fijado como `'3day'` — corrige la versión anterior de este documento, que usaba `'three_day'` por analogía con el resto de valores separados por guion bajo ya usados aquí (`CalendarItemType`, `BreakSegmentType`, etc.), pero que en realidad **divergía** de `CalendarViewMode`/`CalendarViewType` de `05-ARQUITECTURA.md` §4.3 y de `06-DISENO-UI.md` §11.5, los cuales ya usan `'3day'` y ya coinciden entre sí. Corregido para que los tres documentos compartan exactamente el mismo literal (ver Supuesto #9, ahora resuelto).

y `UserSettings.defaultCalendarView?: CalendarViewMode`, ausente ⇒ `'week'` — adición **no incluida todavía** en `02-DOMINIO.md` §3/§5.1 (gap señalado en "Supuestos pendientes de confirmar"; mismo patrón de campo opcional retrocompatible que el resto del documento).

### 1.6 Franja horaria: distribución por hora y solapamientos

Una sola función cubre día, 3 días y semana (varía solo `maxVisibleColumns`, delegado a `06-DISENO-UI.md` como problema de densidad, B §12 punto 4):

```ts
// src/domain/rules/day-timeline-layout.ts — ADICIÓN (fase calendario)

export interface TimelinePosition {
  itemId: string;
  topMinutes: number;      // minutos desde las 00:00 locales del día
  heightMinutes: number;    // duración visible, recortada a [0, 1440] si el ítem cruza medianoche
  column: number;           // 0-indexado dentro de su grupo de solapamiento
  columnCount: number;      // columnas visibles totales de ese grupo (≤ maxVisibleColumns)
}

export interface TimelineOverflowGroup {
  topMinutes: number;
  heightMinutes: number;
  hiddenItemIds: string[];  // ítems del grupo que no entraron en columnCount
  label: string;            // p. ej. "+2 más"
}

export interface DayTimelineLayout {
  positions: TimelinePosition[];
  overflow: TimelineOverflowGroup[];
}

/**
 * Algoritmo (coloreado de intervalos, estilo "columnas" de calendarios profesionales):
 * 1. Recortar cada ítem a la ventana [00:00, 24:00) del `dayKey` en `timezone` (un ítem que cruza
 *    medianoche produce como máximo una posición por día — se recorta, no se divide en dos filas
 *    del mismo layout; el día siguiente lo recorta de nuevo desde su propio 00:00, caso Q13 de §6).
 * 2. Ordenar por `topMinutes` asc, y por `heightMinutes` desc como desempate.
 * 3. Agrupar en clústeres de solapamiento transitivo (un ítem solapa con el siguiente si
 *    `top < finDelAnterior`; mientras haya solapamiento se extiende el clúster).
 * 4. Dentro de cada clúster, asignar columnas en barrido (greedy): mantener una lista de "fin de
 *    columna"; a cada ítem, en orden de inicio, asignarle la primera columna cuyo fin ≤ su propio
 *    inicio (se reutiliza); si ninguna calza, abrir una columna nueva.
 * 5. Si el número de columnas abiertas para el clúster supera `maxVisibleColumns`: se muestran las
 *    primeras `maxVisibleColumns − 1` (por orden de inicio) y el resto se agrupa en un
 *    `TimelineOverflowGroup` anclado al `topMinutes`/`heightMinutes` del clúster completo.
 */
export function layoutDayTimeline(
  items: readonly CalendarAssemblerItem[],   // ya filtrados a los que intersectan el día
  dayKey: DayKey,
  timezone: string,
  options?: { maxVisibleColumns?: number }, // ausente ⇒ sin límite práctico (vista Día)
): DayTimelineLayout;
```

### 1.7 Detalle de sesión desde el calendario

Abrir un ítem `type: 'study'` desde cualquier vista consume el mismo view model que el historial de sesiones (RF-CAL-04), con el detalle exigido por SPEC v1 §23.6:

```ts
// src/features/calendar/services/session-detail.ts — ADICIÓN (fase calendario)
export interface SessionDetailViewModel {
  id: string;
  categoryName: string;         // vigente (I-15)
  color: string;                 // vigente
  presetNameSnapshot: string;    // histórico (presetSnapshot SÍ es fuente de verdad de la sesión, 02-DOMINIO.md §2.2)
  status: StudySessionStatus;
  totalElapsedSeconds: number;
  effectiveStudySeconds: number;
  studySegments: readonly StudySegment[];
  breakSegments: readonly BreakSegment[];
  lunchSegments: readonly LunchSegment[];
}

export function buildSessionDetailViewModel(
  session: StudySession,
  categoriesById: ReadonlyMap<string, Category>,
): SessionDetailViewModel;
```

Un `InverseSession` usa el mismo patrón con un shape más simple (`targetDurationSeconds`, `totalElapsedSeconds`, `remindersTriggered`, `autoFinished`); un `InvisibleEvent` (u ocurrencia expandida) muestra nombre, categoría, horario planificado y notas — sin segmentos, porque nunca tuvo ejecución real.

### 1.8 Vistas Mes y Año: agrupación por celda

```ts
// src/domain/rules/calendar-grouping.ts — ADICIÓN (fase calendario)

/** Agrupa por DayKey local (§6.3 02-DOMINIO.md); una sesión que cruza medianoche puede aportar a
 *  dos días (una fila de calendario por `startAt`, ver también el recorte de §1.6 para el timeline). */
export function groupCalendarItemsByDay(
  items: readonly CalendarAssemblerItem[], timezone: string,
): ReadonlyMap<DayKey, CalendarAssemblerItem[]>;

export interface MonthDayCell {
  dayKey: DayKey;
  visibleItems: CalendarAssemblerItem[];   // hasta maxVisibleChips (06-DISENO-UI.md fija el número)
  overflowCount: number;                   // resto; UI muestra "+N más" si > 0
}
export function buildMonthDayCell(
  items: readonly CalendarAssemblerItem[], maxVisibleChips: number,
): MonthDayCell;

/** Un total por mes, reutilizando el mismo agregador que Estadísticas (§2.2) sobre el rango de ese
 *  mes — la vista Año NO reimplementa la suma, solo la reagrupa en 12 celdas + `hasStar` (§3.3). */
export function groupCalendarItemsByMonth(
  monthlyTotals: ReadonlyMap<MonthKey, StatsPeriodTotals>,
  achievements: ReadonlyMap<MonthKey, MonthAchievement>,
): ReadonlyArray<{ monthKey: MonthKey; totals: StatsPeriodTotals; hasStar: boolean }>;
```

## 2. Estadísticas

### 2.1 Períodos exactos

Día (`DayKey`), semana (`WeekKey`, **ISO, lunes**) y mes (`MonthKey`) obligatorios en V1 (RF-EST-01, SPEC v1 §25.1); año se resuelve reagrupando 12 meses (§1.8), no es un período agregado nuevo. Zona horaria de referencia: `UserProfile.timezone` (`02-DOMINIO.md` §6.2). Todo período se calcula con `toZonedWallClock` + `buildDayKey`/`buildWeekKey`/`buildMonthKey` — nunca con `new Date(iso)` directo (misma prohibición que el calendario, §1.4). El rango de consulta de un período se amplía ±48 h antes de filtrar en cliente (`02-DOMINIO.md` §5.2), porque una sesión puede cruzar la medianoche o el cambio de semana y sus bloques se atribuyen por `end`, no por `startedAt`.

### 2.2 Qué cuenta por status: la regla que evita restar dos veces

Regla central (RF-EST-06, `03-CRONOMETRO.md` §8.3): **para `StudySession`, `completed`, `cancelled` y `expired` aportan su `effectiveStudySeconds` exactamente igual** — ningún agregador de estudio filtra por `status`. Esto es así porque `effectiveStudySeconds` ya excluye el bloque en curso al momento del cierre (sea cual sea la causa), así que no hay nada que "restar" adicionalmente por haber cancelado o expirado; sumar todos los `StudySession` de un rango, sin importar su `status`, es la fórmula completa. (`status: 'active'` nunca existe en `sessions/`, I-13 de `02-DOMINIO.md` — no hace falta excluirlo explícitamente, pero un agregador defensivo puede filtrarlo por claridad.)

**Para `InverseSession` la regla es la opuesta**: `status === 'cancelled'` **no** cuenta en estadísticas de ocio (I-17 de `02-DOMINIO.md`); solo `completed` aporta `totalElapsedSeconds` (`'interrupted'` está reservado y ningún flujo de V1 lo produce, §8 de `02-DOMINIO.md`). Es una asimetría real entre las dos entidades, no un error de transcripción: cancelar un bloque de estudio no es lo mismo que cancelar ocio (cancelar estudio interrumpe algo que ya se estaba construyendo — el trabajo previo cuenta; cancelar ocio simplemente significa que ese tramo de ocio no ocurrió como se había medido).

```ts
// src/domain/rules/stats-aggregators.ts — ADICIÓN (fase estadísticas)

/** Aplana los bloques completados de un conjunto de StudySession en filas atribuibles, sin
 *  filtrar por status (§2.2). Cada fila lleva el categoryId de la SESIÓN (StudySegment no tiene
 *  categoryId propio, 02-DOMINIO.md §3.2). */
export interface AttributedStudySegment {
  categoryId: string;
  durationSeconds: number;
  end: string;   // ISO; decide weekKey/dayKey/monthKey vía weekKeyOfStudySegment/dayKeyOfStudySegment
}
export function flattenStudySegments(sessions: readonly StudySession[]): AttributedStudySegment[] {
  return sessions.flatMap((session) =>
    session.studySegments.map((segment) => ({
      categoryId: session.categoryId,
      durationSeconds: segment.durationSeconds,
      end: segment.end,
    })),
  );
}

/** Suma de totalElapsedSeconds de InverseSession, excluyendo 'cancelled' (I-17). */
export function sumInverseElapsedSeconds(sessions: readonly InverseSession[]): number {
  return sessions
    .filter((s) => s.status !== 'cancelled')
    .reduce((total, s) => total + s.totalElapsedSeconds, 0);
}
```

### 2.3 Agregadores por período: firmas y fórmulas

```ts
// src/domain/rules/stats-aggregators.ts — continuación

export type PeriodGranularity = 'day' | 'week' | 'month';
export interface PeriodKey { granularity: PeriodGranularity; key: DayKey | WeekKey | MonthKey; }

export interface StatsPeriodTotals {
  studyEffectiveSeconds: number;   // Σ AttributedStudySegment.durationSeconds cuyo end cae en el período
  inverseElapsedSeconds: number;   // sumInverseElapsedSeconds(...) filtrado por startedAt en el período
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;   // vigente (I-15)
  color: string;           // vigente
  ownSeconds: number;       // solo bloques/tiempo con ESTE categoryId exacto
  totalSeconds: number;     // ownSeconds + Σ children[].totalSeconds (roll-up incondicional, §2.4)
  percentage: number;       // 0-100, totalSeconds / totalDelTipo(period) × 100; 0 si el total del período es 0
}
export interface CategoryBreakdownNode extends CategoryBreakdownItem {
  children: CategoryBreakdownNode[];   // un nivel (I-14, Category.parentId)
}

export interface PeriodStatsViewModel {
  period: PeriodKey;
  totals: StatsPeriodTotals;
  studyBreakdown: CategoryBreakdownNode[];    // raíces (sin parentId) del árbol de categorías `study`
  inverseBreakdown: CategoryBreakdownNode[];  // ídem, categorías `inverse`
  studyVsInversePercentage: { study: number; inverse: number }; // suman 100 salvo ambos en 0 (§2.5)
}

/** Fórmula: aggregateStudyEffectiveSeconds = Σ segment.durationSeconds para segment ∈ flattenStudySegments(sessions)
 *  cuyo weekKeyOfStudySegment(segment, tz) / dayKeyOfStudySegment(segment, tz) === period.key. */
export function aggregatePeriodStats(
  period: PeriodKey,
  timezone: string,
  studySessions: readonly StudySession[],     // ya acotadas por el rango ampliado ±48h (§2.1)
  inverseSessions: readonly InverseSession[],
  categoriesById: ReadonlyMap<string, Category>,
): PeriodStatsViewModel;
```

### 2.4 Desglose con roll-up de subcategorías (distinto del roll-up de Metas)

`RF-EST-02` pide desglose "por categoría **y** subcategoría" (SPEC v1 §25.4): cada categoría —tenga o no subcategorías— tiene su propia fila con `ownSeconds` (solo sus bloques directos); una categoría padre además reporta `totalSeconds = ownSeconds + Σ totalSeconds de sus hijas` (roll-up **incondicional**, siempre se suma, sin excepciones — jerarquía de un nivel, I-14).

Esto es deliberadamente distinto del roll-up de `WeeklyGoal.achievedSeconds` (§3.1): ahí, una subcategoría solo cede su tiempo al padre **si esa subcategoría no tiene meta propia esa semana** (regla condicional, `02-DOMINIO.md` §6.3). En Estadísticas no hay esa condición porque no hay "metas" de por medio — es simplemente un árbol que se suma de abajo hacia arriba para dar un total por categoría raíz, y por separado se puede inspeccionar cada subcategoría con su propio número exacto. Un lector no debe asumir que "roll-up" significa lo mismo en ambas secciones.

```ts
export function buildCategoryBreakdownTree(
  directTotalsByCategoryId: ReadonlyMap<string, number>,   // Σ ownSeconds por categoryId exacto
  categories: readonly Category[],                          // de un solo `type` (study u inverse)
): CategoryBreakdownNode[] {
  // 1. Construir un nodo por categoría con ownSeconds = directTotalsByCategoryId.get(id) ?? 0.
  // 2. Anidar cada nodo bajo su padre (Category.parentId, un nivel — I-14); las raíces son las que no tienen parentId.
  // 3. totalSeconds de cada raíz = ownSeconds + Σ children[].totalSeconds (los hijos no tienen nietos, un nivel).
  // 4. percentage de cada nodo = totalSeconds / totalGeneralDelTipo × 100 (0 si el total general es 0).
  // 5. Ordenar cada nivel por totalSeconds desc (ranking, ARCHITECTURE-v1.md §18.5).
}
```

### 2.5 Comparación estudio vs. ocio (porcentajes)

```ts
export function computeStudyVsInversePercentage(totals: StatsPeriodTotals): { study: number; inverse: number } {
  const grandTotal = totals.studyEffectiveSeconds + totals.inverseElapsedSeconds;
  if (grandTotal === 0) return { study: 0, inverse: 0 };   // caso Q21 de §6: sin división por cero
  return {
    study: Math.round((totals.studyEffectiveSeconds / grandTotal) * 100),
    inverse: Math.round((totals.inverseElapsedSeconds / grandTotal) * 100),
  };
}
```

Eventos invisibles nunca entran a `grandTotal`, a `studyBreakdown` ni a `inverseBreakdown` (RF-CAL-03, RF-EST-02, `regla crítica #5` de SPEC v1 §33): no tienen `effectiveStudySeconds` ni `totalElapsedSeconds` — son puramente informativos en el Calendario.

### 2.6 Tabla histórica

```ts
// src/domain/rules/stats-aggregators.ts — continuación
export interface HistoryTableRow {
  period: PeriodKey;
  label: string;                    // p. ej. "2026-W36" o "Lun 01 sep"
  studyEffectiveSeconds: number;
  inverseElapsedSeconds: number;
}

/** No recalcula desde cero: reutiliza aggregatePeriodStats ya ejecutado por período (§5, rendimiento). */
export function buildHistoryTable(
  perPeriodTotals: ReadonlyMap<string /* period.key */, StatsPeriodTotals>,
  orderedPeriodKeys: readonly PeriodKey[],   // más reciente primero; RF-EST-05 exige ≥ 8 períodos
): HistoryTableRow[];
```

RF-EST-05 exige ver al menos 8 períodos pasados sin exportar datos: `orderedPeriodKeys` debe traer ≥ 8 entradas para el período elegido (semana/mes) — el caller decide cuántas semanas/meses hacia atrás pedir; la función en sí no tiene un mínimo hardcodeado.

### 2.7 Racha de estudio

Resuelve el gap señalado por `06-DISENO-UI.md` §12 (`StatsScreenViewModel.streakDays: number` remite explícitamente "la fórmula exacta de cada número (racha, agregación por categoría, estrella) es de `07-CALENDARIO-ESTADISTICAS-METAS.md`", pero este documento todavía no definía ninguna función de racha). Requerimiento nuevo elevado por el creador el 2026-09-06 (B §12.6, desde "cofre cada 7 días" de Galaxia/Tienda): **la racha en sí (el contador) entra a V1, no V1.1** — es barata, se calcula, no se guarda; sin campo cacheado, sin colección nueva, sin Cloud Functions (mismo patrón de agregador derivado que el resto de esta sección 2 y que la estrella mensual de §3.3).

```ts
// src/domain/rules/streak.ts — ADICIÓN (fase estadísticas)

/**
 * Días consecutivos hacia atrás desde hoy (zona del perfil) con al menos un bloque de estudio
 * completado ese día (`effectiveStudySeconds > 0` proveniente de cualquier StudySession, sin
 * filtrar por status — B §12.6, D1.b: `completed`, `cancelled` y `expired` aportan bloques
 * completados por igual, misma regla que §2.2 para el resto de Estadísticas). Los bloques
 * inversos NO cuentan: es racha de ESTUDIO, no de uso general de la app (B §12.6). Corte de día:
 * medianoche exacta en `timezone`, SIN margen de gracia en V1 (B §12.6, simplicidad; reconsiderar
 * en V1.1 si hace falta).
 */
export function computeCurrentStreakDays(
  sessions: readonly StudySession[],
  timezone: string,
  nowIso: string = new Date().toISOString(),   // instante "ahora" en UTC; parametrizable para tests
): number {
  const segments = flattenStudySegments(sessions);   // §2.2, sin filtrar por status (D1.b)
  const daysWithStudy = new Set<DayKey>(
    segments.map((segment) => dayKeyOfStudySegment(segment, timezone)),  // mismo uso que §2.3 sobre AttributedStudySegment.end
  );
  const todayKey = buildDayKey(toZonedWallClock(nowIso, timezone));
  // Si hoy todavía no hay ningún bloque completado, el corte de medianoche (B §12.6) no rompe de
  // inmediato una racha que sigue vigente: el día no ha terminado, así que se empieza a contar
  // desde ayer (default de este documento, ver "Supuestos pendientes de confirmar"). Si ayer
  // tampoco tiene estudio, el resultado es 0 de todas formas.
  let cursor = daysWithStudy.has(todayKey) ? todayKey : previousDayKey(todayKey);
  let streak = 0;
  while (daysWithStudy.has(cursor)) {
    streak += 1;
    cursor = previousDayKey(cursor);
  }
  return streak;
}

/** Un día calendario atrás de `dayKey` — aritmética de fecha simple (DayKey ya es la fecha local
 *  de pared, `02-DOMINIO.md` §3.1/§6.3; no hace falta volver a pasar por `timezone`). */
function previousDayKey(dayKey: DayKey): DayKey {
  const [year, month, day] = dayKey.split('-').map(Number);
  return buildDayKey(new Date(Date.UTC(year, month - 1, day - 1)));
}
```

`flattenStudySegments` es exactamente la de §2.2 (sin filtrar por `status`, D1.b) — la racha no reimplementa el aplanado, solo lo reagrupa por `DayKey` en vez de por `WeekKey`/`MonthKey`. `dayKeyOfStudySegment`, `buildDayKey`, `toZonedWallClock` y `DayKey` son as-built/canon de `02-DOMINIO.md` §3.1/§3.6/§6.3; `previousDayKey` es la única primitiva nueva que necesita este algoritmo, en el mismo espíritu que `offsetMinutesAt` de §1.4 ("única primitiva nueva... sin agregar una función compartida al dominio").

**Consumo en V1** (B §12.6): Estadísticas (tile de resumen, `06-DISENO-UI.md` §12, `StatsScreenViewModel.streakDays`) y el hub de Inicio (esquina superior); es solo lectura de un número, no requiere Tienda ni inventario. **V1.1**: el sistema de cofres de `10-GALAXIA-Y-TIENDA.md` es un **consumidor** de `computeCurrentStreakDays`, no su dueño — no se rediseña esta función para la Tienda. No confundir con `computeWeeklyGoalStreak` de `10-GALAXIA-Y-TIENDA.md` §3.1 (racha de **semanas de meta cumplida**, métrica distinta, explícitamente V1.1): esta sección define la única racha de V1, la de días de estudio.

## 3. Metas

### 3.1 `weekKey`, progreso y el roll-up condicional de subcategoría

`WeeklyGoal.weekKey` es el `WeekKey` ISO (lunes, zona del perfil, `02-DOMINIO.md` §6.3) que declara la meta al crearla — no se deriva de nada, es un campo de entrada. `achievedSeconds` sí se recalcula siempre desde bloques completados (RF-MET-02, I-16):

```ts
// src/domain/rules/goal-progress.ts — ADICIÓN (fase metas)

/**
 * achievedSeconds de UNA WeeklyGoal (hoja o supermeta — forma uniforme, B §11): suma la duración
 * de los bloques cuyo `weekKeyOfStudySegment(segment, tz) === goal.weekKey` Y cuyo categoryId
 * "resuelve" a `goal.categoryId` bajo esta regla (02-DOMINIO.md §6.3):
 * - El bloque es directamente de `goal.categoryId`, O
 * - El bloque es de una SUBCATEGORÍA de `goal.categoryId` (Category.parentId === goal.categoryId)
 *   Y esa subcategoría NO tiene su propia WeeklyGoal para el mismo weekKey (si la tuviera, el
 *   bloque cuenta para la meta de la subcategoría, nunca para las dos — evita doble conteo).
 * A diferencia del roll-up de Estadísticas (§2.4, incondicional), este es CONDICIONAL: depende de
 * si existe o no una meta propia esa semana para la subcategoría.
 */
export function computeGoalAchievedSeconds(
  goal: WeeklyGoal,
  segmentsOfWeek: readonly AttributedStudySegment[],    // ya filtrados a weekKeyOfStudySegment === goal.weekKey
  categoriesById: ReadonlyMap<string, Category>,
  goalsOfWeekByCategoryId: ReadonlyMap<string, WeeklyGoal>,   // todas las WeeklyGoal de esa misma weekKey
): number {
  return segmentsOfWeek.reduce((total, segment) => {
    if (segment.categoryId === goal.categoryId) return total + segment.durationSeconds;
    const category = categoriesById.get(segment.categoryId);
    const isChildWithoutOwnGoal =
      category?.parentId === goal.categoryId && !goalsOfWeekByCategoryId.has(segment.categoryId);
    return isChildWithoutOwnGoal ? total + segment.durationSeconds : total;
  }, 0);
}
```

Caso Q22 de §6: si "Cálculo 3" (padre) tiene meta esta semana y su subcategoría "Cálculo 3 — Tarea 4" **no** tiene meta propia esa semana, los bloques de la subcategoría cuentan para la meta del padre. Si "Cálculo 3 — Tarea 4" **sí** tiene su propia meta esa semana, sus bloques cuentan solo para esa meta propia — el padre no los ve.

### 3.2 Estados y cierre de semana

`WeeklyGoalStatus = 'pending' | 'completed' | 'failed'` (as-built). El cierre es **perezoso**, mismo patrón arquitectónico que la sesión zombie (I-20 de `02-DOMINIO.md`): no hay Cloud Functions (Spark), así que ningún cron cierra la semana — el primer cliente que lee una `WeeklyGoal` `pending` cuya semana ya cerró la actualiza y la persiste.

```ts
// src/domain/rules/goal-progress.ts — continuación

/** Una semana está "cerrada" cuando `now` (zona del perfil) ya es ≥ el lunes 00:00 de la semana
 *  siguiente a `weekKey` (02-DOMINIO.md §6.3, última fila). */
export function isWeekClosed(weekKey: WeekKey, nowIso: string, timezone: string): boolean;

/** Resuelve el status final de una meta ya cerrada. `achievedSeconds ≥ targetSeconds` (igualdad
 *  cuenta como cumplida, RF-MET-03) ⇒ 'completed'; si no, 'failed'. No cambia nada si la semana
 *  sigue abierta (devuelve 'pending' sin tocar el resto). */
export function resolveClosedGoalStatus(
  goal: Pick<WeeklyGoal, 'achievedSeconds' | 'targetSeconds' | 'status'>,
  weekIsClosed: boolean,
): WeeklyGoalStatus {
  if (!weekIsClosed || goal.status !== 'pending') return goal.status;
  return goal.achievedSeconds >= goal.targetSeconds ? 'completed' : 'failed';
}
```

Caso Q23 de §6: `achievedSeconds === targetSeconds` exacto al cierre → `'completed'`, nunca `'failed'` (RF-MET-03, criterio `≥`).

### 3.3 Estrella mensual: función y 5 ejemplos

Regla ya fijada (R7/D7, RF-MET-04): un mes tiene estrella solo si tiene ≥ 1 semana **cerrada** con ≥ 1 meta configurada, y **todas** las metas de **todas** las semanas cerradas con metas de ese mes están `completed`. Una semana se atribuye al mes que contiene su **lunes** (consistente con que `WeekKey` ya fija ese lunes como inicio).

```ts
// src/domain/rules/goal-progress.ts — continuación
export interface MonthAchievement {
  monthKey: MonthKey;
  hasStar: boolean;
  weeksClosedWithGoals: number;
  allGoalsCompleted: boolean;   // true vacuamente si weeksClosedWithGoals === 0, pero entonces hasStar es false igual
}

/** hasStar = weeksClosedWithGoals > 0 && allGoalsCompleted. Es un valor DERIVADO, nunca persistido:
 *  se recalcula en cada lectura, así que un mes en curso puede mostrar estrella hoy y perderla
 *  mañana si una semana que faltaba cierra con una meta fallida (ejemplo 5). */
export function buildMonthAchievement(
  monthKey: MonthKey,
  goalsByClosedWeekOfThisMonth: ReadonlyMap<WeekKey, readonly WeeklyGoal[]>,   // solo semanas YA cerradas
): MonthAchievement;
```

| # | Escenario | `weeksClosedWithGoals` | `allGoalsCompleted` | `hasStar` |
|---|---|---|---|---|
| 1 | 4 semanas cerradas del mes, las 4 con ≥1 meta, todas `completed`. | 4 | true | **true** |
| 2 | 4 semanas cerradas con metas; una de ellas tiene una meta `failed`. | 4 | false | **false** |
| 3 | 4 semanas cerradas, ninguna con ninguna meta configurada (mes "vacío", R7). | 0 | true (vacuamente) | **false** — la vacuidad no cuenta (RF-MET-04). |
| 4 | Solo 1 de 4 semanas cerradas tiene una meta configurada (las otras 3 no tienen ninguna); esa única meta está `completed`. | 1 | true | **true** — solo importan las semanas que SÍ tienen metas. |
| 5 | Mes en curso: W36 y W37 ya cerradas con 1 meta `completed` cada una; W38 todavía `pending` (semana actual, no cerrada). Evaluado hoy: `hasStar = true`. Si W38 cierra más tarde con esa meta `failed`, al recalcular `hasStar` pasa a `false` — no quedó "ganada" de forma permanente. | 2 (hoy) → 3 (al cerrar W38) | true → false | **true hoy, false después** — ilustra que no se persiste, se deriva en cada lectura. |

### 3.4 Modelo uniforme de `WeeklyGoal` (hoja o supermeta) — resumen operativo

`02-DOMINIO.md` §2.6/§3.3 ya fija la interfaz (`categoryId`, `targetSeconds`, `achievedSeconds`, `name`, `parentGoalId?`, `skinId?`, `layerVisible?`); B §11 fija la regla de forma: **toda** `WeeklyGoal` —tenga o no `parentGoalId` apuntándole desde otras metas (es decir, sea hoja o actúe como supermeta)— tiene su propio `categoryId` y `targetSeconds`, y su `achievedSeconds` se calcula con la **misma** función `computeGoalAchievedSeconds` de §3.1, sin polimorfismo ni un cálculo especial que sume el progreso de sus hijas. `parentGoalId` es **puramente organizativo**: indica que una meta pertenece a una supermeta para la Galaxia (`10-GALAXIA-Y-TIENDA.md`, V1.1) y no cambia en nada cómo se calcula, se cierra o se muestra en Calendario/Estadísticas esa meta.

### 3.5 Agregación por categoría en Estadísticas: roll-up derivado (no la forma de guardado)

La vista "Estadísticas → avance de metas de la semana" (RF-EST-02) muestra **una fila por categoría**, no una fila por `WeeklyGoal`. Como I-16 solo exige unicidad de `(weekKey, categoryId)` entre metas **hoja** (una supermeta puede compartir `categoryId` con una de sus propias metas hoja en la misma semana — B §11, ejemplo: una supermeta "Cálculo 3 general" con `categoryId` igual al de la categoría padre, y una meta hoja "Cálculo 3 — repaso" con ese mismo `categoryId` como caso límite permitido por el modelo), puede haber **más de una** `WeeklyGoal` con el mismo `categoryId` en la misma semana. La fila de Estadísticas para esa categoría sencillamente suma:

```ts
// src/domain/rules/goal-progress.ts — continuación
export interface GoalCategoryRollup {
  categoryId: string;
  categoryName: string;   // vigente
  color: string;            // vigente
  targetSeconds: number;    // Σ targetSeconds de TODAS las WeeklyGoal de esa weekKey con ese categoryId
  achievedSeconds: number;  // Σ achievedSeconds de esas mismas WeeklyGoal
  progressPercentage: number;   // achievedSeconds / targetSeconds × 100, capado a 100; 0 si targetSeconds es 0
}

/** ROLLUP DERIVADO (B §11): agrupa por categoryId y suma. NUNCA es la forma de guardado — cada
 *  WeeklyGoal sigue siendo un documento independiente en `goals/`; esto es solo una proyección
 *  de lectura para la fila "por categoría" de Estadísticas. */
export function rollupGoalsByCategory(goalsOfWeek: readonly WeeklyGoal[]): GoalCategoryRollup[];
```

Caso Q26 de §6: una supermeta y una meta hoja comparten `categoryId` la misma semana → la fila de Estadísticas de esa categoría suma ambos `targetSeconds` y ambos `achievedSeconds`, sin que ninguna de las dos `WeeklyGoal` se modifique ni se fusione.

## 4. Consultas e índices

Base: `02-DOMINIO.md` §5.2 ya fija la tabla general de consultas/índices y el `firestore.indexes.json` completo. Esta sección solo agrega lo que introduce el calendario por capas y no repite las filas ya existentes (historial, estadísticas por rango, metas por semana) salvo para señalar que se **reutilizan**.

| Consumidor | Consulta (`users/{uid}/…`) | Índice compuesto |
|---|---|---|
| Capa de meta (histórico completo de una categoría) | `sessions` where `type == 'study'` and `categoryId == c` and `startedAt` en el rango de la **vista actual** (año/mes/semana/3 días/día — nunca "todo" en una sola consulta, ver §5) | Reutiliza `sessions (type ASC, categoryId ASC, startedAt ASC)`, ya declarado en `02-DOMINIO.md` §5.2 — **ningún índice nuevo**. |
| Capa personalizada (N `categoryIds`) | `sessions` where `type == 'study'` and `categoryId in [c1..cN]` (máx. 30 valores, límite de Firestore) and `startedAt` en rango | Mismo índice de arriba: Firestore trata `in` como equivalente a una igualdad para efectos de qué índice satisface la consulta, así que **no** hace falta un índice por combinación de categorías ni N consultas separadas. Si `categoryIds.length > 30` (caso extremo, sin límite en el modelo por B §12 punto 4), el repositorio parte la lista en tandas de 30 y mezcla los resultados en cliente. |
| Listar capas personalizadas del usuario | `calendarLayers` sin filtro (colección completa; se esperan unas pocas decenas como máximo) | Ninguno — Firestore indexa automáticamente cada colección para lecturas sin filtro compuesto. |
| Capas personalizadas visibles | `calendarLayers` where `isVisible == true` | Ninguno (campo único, índice automático de un solo campo). |
| Metas de una categoría, todas las semanas (para `resolveGoalLayers`, §1.2, y para `computeGoalAchievedSeconds` cuando se necesita saber si una subcategoría tiene meta propia, §3.1) | `goals` where `categoryId == c` | Ninguno (campo único). |

Nota de esquema pendiente (no es de mi autoridad editar `02-DOMINIO.md`, se señala para quien construya la fase Calendario): la tabla de rutas de `02-DOMINIO.md` §5.1 y su `firestore.rules` (§5.3) todavía no listan `users/{uid}/calendarLayers/{layerId}` ni `WeeklyGoal.name`/`layerVisible` en la fila de `goals/{id}`, aunque ambos ya están definidos como interfaz en `02-DOMINIO.md` §3.3. Mismo patrón de reglas que `categories`/`presets` (dueño exclusivo por `uid`, CRUD normal sin arbitraje porque no es el timer activo — D14): `allow read, write: if request.auth.uid == uid` sobre `calendarLayers/{layerId}`, sin validación de forma adicional más allá de `userId == uid` (I-18).

## 5. Rendimiento

Volumen de referencia (uso personal, `02-DOMINIO.md` §5.2): un usuario que estudia todos los días durante 2 años acumula del orden de 1 500-2 500 `StudySession`, unas pocas centenas de `InverseSession`, unas decenas de `InvisibleEvent` y `WeeklyGoal`, y a lo sumo unas pocas decenas de `CalendarLayer`. Ninguna cifra se acerca a los límites del plan Spark (50 000 lecturas/día, `04-SINCRONIZACION.md` §12).

- **"Histórico completo" es una propiedad del filtro, no una orden de precarga.** Que una capa de meta no tenga límite temporal (§1.1/regla 1 de B §12) describe qué categorías son elegibles cuando el usuario navega a cualquier fecha — no significa disparar una consulta sin `startedAt` acotado la primera vez que se abre el calendario. Cada vista (§1.5) sigue ejecutando una consulta acotada a su propio rango (año actual, mes actual, semana actual…); navegar a otro año dispara una consulta nueva acotada a ese año. El costo de "ver 2 años de histórico de una categoría" se paga solo si el usuario efectivamente navega esos 2 años, una vista a la vez.
- **Memoización en cliente, no `stats_cache` en Firestore.** `02-DOMINIO.md` §5.2 ya descarta un documento de agregados cacheados en Firestore para V1. Eso no impide memoizar en memoria (store `zustand` del feature): un período ya cerrado (semana/mes/año que ya terminó) es inmutable en sus totales una vez calculado — ni una sesión nueva ni un cambio de color de categoría alteran `effectiveStudySeconds`/`totalElapsedSeconds` ya sumados (el color es "vivo" pero el número no cambia). Cachear por `(periodKey, categoryFilter)` con invalidación solo cuando llega un `onSnapshot` de una sesión cuyo rango de fechas toca ese período evita recalcular `flattenStudySegments`/`aggregatePeriodStats` en cada render. El período **en curso** (semana/mes actuales) sí se recalcula en cada snapshot nuevo — es el único que cambia.
- **`layoutDayTimeline` es O(n log n)** en el número de ítems del día (ordenar + un barrido lineal de asignación de columnas) — trivial incluso en un día con decenas de eventos invisibles solapados.
- **`expandRecurringInvisibleEvents` está acotado por el rango pedido** (§1.4): el costo es O(días del rango), no O(ocurrencias totales de la serie desde su creación) — una serie sin `until` de 3 años de antigüedad cuesta exactamente lo mismo expandir para "esta semana" que una creada ayer.
- **Consultas con `categoryId in [...]` de más de 30 valores** (capa personalizada muy grande, sin límite en el modelo por B §12 punto 4) se parten en tandas de 30 — un caso extremo que la densidad visual de `06-DISENO-UI.md` debería desalentar mucho antes de llegar a ese número, pero el dominio no lo prohíbe.

## 6. Matriz de pruebas del dominio (25 casos)

Casos de test unitario puro (Vitest/Jest, `src/domain/**`, sin React ni Firebase — mismo criterio que `03-CRONOMETRO.md` §13). Cada caso referencia la sección/función que verifica.

### 6.1 Calendario y capas (§1)

| # | Caso | Entrada / setup | Resultado esperado |
|---|---|---|---|
| Q1 | Sin ninguna capa creada, el calendario se comporta como en V1 | `layers: []`, ítems de 3 categorías distintas | `assembleCalendarLayers` devuelve los 3 ítems, cada uno con `layerIds: []` (§1.1, §1.3) |
| Q2 | Capa de meta oculta sin otra cobertura hace desaparecer su categoría | Una `WeeklyGoal` con `layerVisible: false` para `categoryId: 'calculo3'`; ninguna otra capa la menciona; 2 sesiones de esa categoría en rango | `assembleCalendarLayers` devuelve `[]` para esas 2 sesiones |
| Q3 | Capa personalizada agrupa varias categorías | `CalendarLayer{categoryIds: ['gimnasio','clases'], isVisible: true}`; 1 ítem de cada categoría | Ambos ítems aparecen, cada uno con `layerIds: ['custom:<id>']` |
| Q4 | Capa personalizada oculta no esconde una categoría también cubierta por una capa de meta visible | `CalendarLayer{categoryIds:['calculo3'], isVisible:false}` + `WeeklyGoal{categoryId:'calculo3', layerVisible:true}` | El ítem de `calculo3` aparece con `layerIds: ['goal:calculo3']` únicamente |
| Q5 | Dos capas con categorías solapadas no duplican el ítem | Meta visible + `CalendarLayer` visible, ambas incluyen `categoryId: 'calculo3'` | Un solo `CalendarAssemblerItem` por sesión, con `layerIds.length === 2` |
| Q6 | Capa de meta con histórico previo a que la meta existiera | `WeeklyGoal` creada en `weekKey: '2026-W36'` para `categoryId: 'calculo3'`; existe una `StudySession` de esa categoría de `weekKey: '2026-W10'` | Al activar la capa, la sesión de `2026-W10` aparece igual (el filtro es por `categoryId`, sin piso temporal) |
| Q7 | Capa personalizada desactivada no aparece | `CalendarLayer{isVisible:false}` recién creada, ninguna otra capa cubre su(s) categoría(s) | `assembleCalendarLayers` no devuelve ningún ítem de esas categorías hasta que `isVisible` pase a `true` |
| Q8 | Resolución de capa de meta con múltiples `WeeklyGoal` históricas | `categoryId: 'fisica'` con metas en `2026-W20 (layerVisible:true)` y `2026-W36 (layerVisible:false)` | `resolveGoalLayers` produce `isVisible: false` (gana la de `weekKey` más reciente) |
| Q9 | Expansión de recurrencia semanal básica | `InvisibleEvent` Lun/Mié/Vie sin `until`, consultado en un rango de exactamente 2 semanas | `expandRecurringInvisibleEvents` devuelve 6 ocurrencias |
| Q10 | Expansión de recurrencia cruza un cambio de horario | Evento a las 09:00 hora local, semana antes y semana después de un cambio de DST en `timezone` | Ambas ocurrencias muestran `09:00` en hora local; el offset UTC entre ambas difiere en 1 h |
| Q11 | `layoutDayTimeline` con solapamiento simple | 3 ítems parcialmente superpuestos en un mismo día, `maxVisibleColumns` ausente | 3 columnas, `overflow: []` |
| Q12 | `layoutDayTimeline` con overflow en vista Semana | 5 ítems mutuamente solapados, `maxVisibleColumns: 3` | 2 posiciones visibles (`columnCount ≤ 3`... la 3ª columna se reserva al grupo de overflow) + un `TimelineOverflowGroup` con los 3 ítems restantes y `label: '+3 más'` |
| Q13 | Ítem que cruza medianoche se recorta por día | Sesión de 23:00 a 00:40 del día siguiente | `layoutDayTimeline(día 1)` la recorta a `[1380, 1440)` minutos; `layoutDayTimeline(día 2)` la recorta a `[0, 40)` — dos posiciones, un solo ítem |
| Q14 | Recurrencia con `until` anterior al rango consultado | `recurrence.until` = hace 3 meses; rango consultado = mes actual | `expandRecurringInvisibleEvents` devuelve `[]` |

### 6.2 Estadísticas (§2)

| # | Caso | Entrada / setup | Resultado esperado |
|---|---|---|---|
| Q15 | Sesión `cancelled` con bloques previos cuenta igual que `completed` | `StudySession{status:'cancelled', studySegments: [2 bloques de 1500s]}` | `aggregatePeriodStats` suma `3000s` a `studyEffectiveSeconds`, igual que si `status` fuera `'completed'` (RF-EST-06) |
| Q16 | Sesión `expired` cuenta igual | Mismo `studySegments` que Q15, `status: 'expired'` | Mismo `3000s` sumado — ningún agregador de estudio filtra por `status` (§2.2) |
| Q17 | `InverseSession` `cancelled` NO cuenta (asimetría con estudio) | `InverseSession{status:'cancelled', totalElapsedSeconds: 1200}` | `sumInverseElapsedSeconds` la excluye; `inverseElapsedSeconds` del período no incluye esos `1200s` (I-17) |
| Q18 | Evento invisible nunca entra a ningún total | `InvisibleEvent` de 2 h dentro del rango consultado | `studyEffectiveSeconds`, `inverseElapsedSeconds` y ambos `breakdown[]` no cambian (RF-CAL-03) |
| Q19 | Roll-up incondicional de categoría en Estadísticas | Categoría padre "Cálculo 3" con `ownSeconds: 1000`; subcategoría "Tarea 4" con `ownSeconds: 500` | `buildCategoryBreakdownTree` da al padre `totalSeconds: 1500`, a la hija `totalSeconds: 500` — ambos visibles como filas independientes |
| Q20 | Atribución de bloque que cruza medianoche | `StudySegment{start: '...T23:40:00Z', end: '...T00:05:00Z'}` (25 min) | `weekKeyOfStudySegment`/`dayKeyOfStudySegment` atribuyen el bloque completo al día del `end`, no al del `start` (`02-DOMINIO.md` §6.3) |
| Q21 | Porcentaje sin ocio, sin división por cero | `totals: {studyEffectiveSeconds: 3600, inverseElapsedSeconds: 0}` | `computeStudyVsInversePercentage` devuelve `{study:100, inverse:0}` |
| Q27 | Racha de estudio: días consecutivos con `status` mixto y un corte | Bloques completados en `D-3`, `D-2`, `D-1` (uno de esos tres proviene de una `StudySession` `cancelled`, otro de una `expired`) pero ninguno en `D-4`; `nowIso` = mediodía de `D` (hoy), sin bloques todavía hoy | `computeCurrentStreakDays` devuelve `3` — cuenta hacia atrás desde ayer (hoy sin sesión aún no rompe la racha, §2.7), se detiene en `D-4` sin estudio, y `cancelled`/`expired` aportan igual que `completed` (D1.b) |

### 6.3 Metas (§3)

| # | Caso | Entrada / setup | Resultado esperado |
|---|---|---|---|
| Q22 | Roll-up condicional de subcategoría, ambas ramas en un solo caso parametrizado | (a) Meta de "Cálculo 3" esa semana, bloques de "Cálculo 3 — Tarea 4" **sin** meta propia esa semana. (b) Igual, pero "Tarea 4" **sí** tiene su propia `WeeklyGoal` esa semana. | (a) `computeGoalAchievedSeconds` del padre incluye esos bloques (RF-MET-02). (b) Los excluye — cuentan solo para la meta propia de la subcategoría, nunca para las dos. |
| Q23 | Cierre de semana con el objetivo exacto | `achievedSeconds === targetSeconds`, semana recién cerrada, `status: 'pending'` | `resolveClosedGoalStatus` devuelve `'completed'`, nunca `'failed'` (RF-MET-03) |
| Q24 | Estrella mensual: mes sin ninguna meta configurada | 4 semanas cerradas del mes, ninguna con ninguna `WeeklyGoal` | `buildMonthAchievement` devuelve `hasStar: false` (vacuidad, R7/RF-MET-04) |
| Q25 | Estrella mensual: una sola semana con metas, cumplida, el resto sin metas | 1 de 4 semanas cerradas tiene 1 meta `completed`; las otras 3 no tienen ninguna meta | `hasStar: true` (solo importan las semanas que tienen metas configuradas) |

### 6.4 Rollup derivado supermeta/hoja (caso adicional, más allá del mínimo)

| # | Caso | Entrada / setup | Resultado esperado |
|---|---|---|---|
| Q26 | Rollup derivado por categoría: supermeta y meta hoja comparten `categoryId` | `WeeklyGoal` supermeta con `categoryId:'calculo3', targetSeconds:36000` + `WeeklyGoal` hoja con `parentGoalId` apuntando a la anterior y el mismo `categoryId:'calculo3', targetSeconds:18000` | `rollupGoalsByCategory` da una sola fila para `calculo3` con `targetSeconds: 54000` (suma de ambas), sin fusionar ni modificar los documentos originales |

Total: **27 casos** (Q1-Q25 y Q27, el caso (a)/(b) de Q22 parametrizado como una sola prueba con dos ramas — mismo patrón que P19 de `03-CRONOMETRO.md` §13.3), más Q26 en §6.4 por encima del mínimo pedido. Distribución: capas (14), estadísticas (8, incluida la racha de §2.7), metas (5).

## Supuestos pendientes de confirmar

Ninguno de estos bloquea la implementación: cada uno tiene un default razonable ya aplicado en el documento, con el punto exacto de cambio si el creador decide distinto.

| # | Supuesto | Default asumido en este documento | Si el creador decide distinto |
|---|---|---|---|
| 1 | **Categoría sin ninguna capa la muestra siempre** (`nueva-funcionalidad-calendario-por-capas.md`, pregunta abierta 3: no hay una "capa Todo" explícita) | §1.1: una categoría solo queda bajo control de un interruptor de visibilidad desde que aparece en alguna `CalendarLayer.categoryIds` o es `categoryId` de alguna `WeeklyGoal`; el resto se muestra siempre. | Si el creador prefiere una capa "Todo" explícita y togglable que también pueda ocultar categorías sin meta ni capa personalizada, se agrega un tercer tipo de capa virtual global en `resolveGoalLayers`/`resolveCustomLayers` (§1.2) con `categoryIds` = todas las categorías del usuario; `assembleCalendarLayers` (§1.3) no cambia de forma, solo de qué conjunto de capas recibe. |
| 2 | **Resolución de `layerVisible` por la `WeeklyGoal` de `weekKey` más reciente** (§1.2) | Cuando existen varias metas históricas del mismo `categoryId` con distinto `layerVisible`, gana la más reciente; el toggle de la UI escribe en esa misma meta. Una meta nueva para esa categoría nace con `layerVisible` ausente (visible), no hereda el valor explícito de la anterior. | Si el creador prefiere que el toggle sea "por categoría" de verdad (un solo valor, no atado a un documento de meta específico), hace falta un campo nuevo fuera de `WeeklyGoal` (p. ej. una entrada ligera en `CalendarLayer` o un documento de preferencias de calendario) — cambio de esquema, no solo de función. |
| 3 | **`UserSettings.defaultCalendarView`, ausente ⇒ `'week'`** (§1.5) | Campo nuevo, todavía no reflejado en `02-DOMINIO.md` §3/§5.1 (gap señalado también en §4). | Si `02-DOMINIO.md` se actualiza primero con un nombre distinto para este campo, este documento adopta ese nombre sin cambiar la lógica de default. |
| 4 | **Números concretos de densidad** (`maxVisibleColumns` en semana/3 días/día, `maxVisibleChips` en mes) | Delegados a `06-DISENO-UI.md` (B §12 punto 4, "la densidad es un problema de UI, no del esquema"); este documento solo fija que existen como parámetro de `layoutDayTimeline`/`buildMonthDayCell`, no sus valores exactos. | `06-DISENO-UI.md` fija los números; ninguna firma de este documento cambia. |
| 5 | **Una ocurrencia de evento invisible no cruza ella misma un cambio de horario** (§1.4) | Razonable para eventos de duración típica (minutos a pocas horas); la corrección de DST solo se aplica a la hora de **inicio** de cada ocurrencia. | Para un evento excepcionalmente largo (> 20 h) que cruce un cambio de horario a mitad de su propia duración, habría que recalcular también `durationMs` por ocurrencia en vez de asumirlo fijo — caso extremo no cubierto. |
| 6 | **`CalendarLayer` aún no está en la tabla de rutas ni en `firestore.rules` de `02-DOMINIO.md`** (§4) | Se señala el patrón de regla esperado (mismo que `categories`/`presets`) sin escribirlo en `02-DOMINIO.md`, que no es editable por este documento. | Queda resuelto en cuanto `02-DOMINIO.md` (o `05-ARQUITECTURA.md`) incorpore la fila y la regla; no cambia nada de lo ya especificado aquí. |
| 7 | **Racha: "hoy" sin bloque todavía no rompe la cuenta** (§2.7) | B §12.6 fija el corte de día (medianoche exacta, sin margen de gracia) pero no dice explícitamente si la racha exige que "hoy" ya tenga un bloque. Default de este documento: `computeCurrentStreakDays` empieza a contar desde ayer cuando hoy todavía no tiene ningún bloque completado (el día no ha terminado); si ayer tampoco tiene, el resultado es `0`. | Si el creador prefiere el corte literal (racha en `0` cada madrugada hasta que se complete el primer bloque del día), se elimina la rama `daysWithStudy.has(todayKey) ? todayKey : previousDayKey(todayKey)` y se empieza siempre en `todayKey` — cambio de una línea, sin tocar la firma. |
| 8 | **`CalendarAssemblerItem` (§1.3) no es el mismo tipo que `CalendarItemViewModel` de `05-ARQUITECTURA.md` §4.3** | Renombrado en este documento para no colisionar con la interfaz ya fijada en `05-ARQUITECTURA.md` §4.3 (`kind`/`startIso`/`endIso`/`categoryColor`), que es más simple y está pensada como contrato de UI; `CalendarAssemblerItem` conserva la forma más completa que el propio dominio necesita (`categoryId`, `categoryName`, `metadata`). | `05-ARQUITECTURA.md` §4.3 debe actualizar su comentario para citar `CalendarAssemblerItem` como la salida real del algoritmo de `07` y describir el mapeo hacia su propio `CalendarItemViewModel` en `src/features/calendar/services/` — no es de mi autoridad editar ese documento, se señala aquí para quien lo mantenga. |
| 9 | ~~Literal de "3 días" desalineado entre documentos~~ — **RESUELTO en esta revisión** (§1.5) | Este documento usaba `'three_day'`, divergiendo de `05-ARQUITECTURA.md` §4.3 y `06-DISENO-UI.md` §11.5, que ya coincidían entre sí en `'3day'` (el desalineado era `07`, no `06` — corrige la lectura anterior de esta misma fila). Corregido aquí a `'3day'` en la definición de `CalendarViewMode` (§1.5) para que los tres documentos compartan el mismo literal. | Ya no aplica — `05`, `06` y `07` usan `'3day'`. |

## Trazabilidad

| Sección de este documento | Regla / decisión | Fuente(s) |
|---|---|---|
| §1.1 — Qué reemplaza y qué no | Categoría sin capa se muestra siempre; una categoría queda bajo control desde que alguna capa la menciona | B §12 (pregunta abierta 3 de la fuente), `nueva-funcionalidad-calendario-por-capas.md` §1, Supuesto 1 |
| §1.2 — Resolución de capas a descriptores uniformes | `CalendarLayerId`, `resolveGoalLayers` (weekKey más reciente), `resolveCustomLayers` | B §12 (modelo de datos, 4 preguntas resueltas), `02-DOMINIO.md` §3.3 líneas 489-517 (interfaces `WeeklyGoal.layerVisible`, `CalendarLayer`), D14 (CRUD sin arbitraje) |
| §1.3 — `assembleCalendarLayers` | Algoritmo de ensamblado: histórico completo por categoría, sin duplicar ítems, `layerIds` de membresía | B §12 reglas 1-4, `nueva-funcionalidad-calendario-por-capas.md` §1, D6 ("color vivo", capa nunca pinta) |
| §1.4 — Expansión de recurrencia | `expandRecurringInvisibleEvents`, corrección de DST sobre `toZonedWallClock`, límites por rango de vista | `02-DOMINIO.md` §2.6/§3.1 (`WeeklyRecurrence`, función nombrada sin algoritmo)/§3.6 (`toZonedWallClock`)/§6.2 (prohibición de `new Date(iso)` directo), ARCHITECTURE-v1 §19.3, REV-MEDIA (§22.1/§42, expansión client-side) |
| §1.5 — Vistas año/mes/semana/3 días/día | 5 niveles de zoom, vista por defecto configurable, franja horaria en Día | `nueva-funcionalidad-calendario-por-capas.md` §2/§4, RF-CAL-01 (01-SPEC.md), B §12 |
| §1.6 — `layoutDayTimeline` | Coloreado de intervalos con `maxVisibleColumns` y overflow "+N más" | `nueva-funcionalidad-calendario-por-capas.md` §2 (franja horaria)/§3 (densidad de semana), B §12 punto 4 |
| §1.7 — Detalle de sesión | `SessionDetailViewModel` con segmentos, descansos, almuerzo, tiempo efectivo, preset | SPEC-v1 §23.6, RF-CAL-04 (01-SPEC.md), `02-DOMINIO.md` §2.3 |
| §1.8 — Agrupación Mes/Año | `groupCalendarItemsByDay/Month`, `buildMonthDayCell`, reutiliza agregadores de §2 | ARCHITECTURE-v1 §20.4 (adaptado), RF-EST-07 |
| §2.1 — Períodos exactos | Semana ISO lunes, timezone del perfil, rango ±48h | `02-DOMINIO.md` §6.2/§6.3/§5.2 (cita, no repite) |
| §2.2 — Qué cuenta por status | Estudio: `completed`/`cancelled`/`expired` cuentan igual; ocio: `cancelled` no cuenta | RF-EST-06 (01-SPEC.md), `03-CRONOMETRO.md` §8.3, I-17 (`02-DOMINIO.md`) |
| §2.3 — Agregadores por período | `aggregatePeriodStats`, `PeriodStatsViewModel`, adaptación de `aggregateDailyStats`/`aggregateWeeklyStats`/`aggregateMonthlyStats` | ARCHITECTURE-v1 §17.2/§18.4, I-1 (`02-DOMINIO.md`) |
| §2.4 — Roll-up incondicional de subcategoría | `buildCategoryBreakdownTree`, distinto del roll-up condicional de Metas | RF-EST-02 (01-SPEC.md), ARCHITECTURE-v1 §18.5/§18.7 (`CategoryBreakdownItem`), I-14 (`02-DOMINIO.md`) |
| §2.5 — Estudio vs. ocio | `computeStudyVsInversePercentage`, sin división por cero; eventos invisibles fuera de todo total | RF-EST-04 (01-SPEC.md), ARCHITECTURE-v1 §18.10, regla crítica #5 de SPEC-v1 §33 |
| §2.6 — Tabla histórica | `buildHistoryTable`, ≥ 8 períodos | RF-EST-05 (01-SPEC.md), ARCHITECTURE-v1 §18.4 (`buildHistoryTable`) |
| §2.7 — Racha de estudio | `computeCurrentStreakDays`: agregador derivado, sin caché, corte de medianoche sin margen de gracia, `completed`/`cancelled`/`expired` cuentan igual, inverso no cuenta | B §12.6, D1.b, `06-DISENO-UI.md` §12 (`StatsScreenViewModel.streakDays`, remite aquí la fórmula) |
| §3.1 — `achievedSeconds` y roll-up condicional | `computeGoalAchievedSeconds`: bloque directo o de subcategoría sin meta propia | RF-MET-02 (01-SPEC.md), `02-DOMINIO.md` §6.3 (fila "Meta semanal")/I-16 |
| §3.2 — Cierre de semana perezoso | `isWeekClosed`, `resolveClosedGoalStatus`, mismo patrón que zombie (sin Cloud Functions) | RF-MET-03 (01-SPEC.md), `02-DOMINIO.md` §6.3 (última fila)/I-20 (patrón de cierre perezoso, análogo) |
| §3.3 — Estrella mensual | `buildMonthAchievement`, derivado no persistido, 5 ejemplos | R7, D7, RF-MET-04 (01-SPEC.md), `02-DOMINIO.md` §1.2 (fila "Estrella mensual"), REV-MEDIA (§26.5, vacuidad) |
| §3.4 — Modelo uniforme de `WeeklyGoal` | Toda meta (hoja o supermeta) misma forma y mismo cálculo; `parentGoalId` solo organizativo | B §11 ("Modelo de meta reconciliado"), RF-MET-05 (01-SPEC.md), `02-DOMINIO.md` §3.3/I-16 |
| §3.5 — Rollup derivado por categoría | `rollupGoalsByCategory`, no cambia la forma de guardado | B §11 (rollup derivado, "no la forma de guardado"), I-16 (calificador "hoja") |
| §4 — Consultas e índices | Reutiliza `sessions(type,categoryId,startedAt)`; `categoryId in [...]` sin índice nuevo; `calendarLayers` sin índice compuesto | `02-DOMINIO.md` §5.2 (cita, extiende), B §12 punto 4 |
| §5 — Rendimiento | "Histórico completo" es alcance del filtro, no precarga; memoización de períodos cerrados | `02-DOMINIO.md` §5.2 (descarta `stats_cache` en Firestore, no la memoización en cliente), B §12 punto 4 |
| §6 — Matriz de pruebas | 25 casos (Q1-Q25) + Q26 adicional sobre capas, estadísticas y metas | CODE (Vitest/Jest), todas las secciones anteriores |

Recordatorio de alcance (ver Propósito): la Galaxia de metas y la Tienda no se tratan en este documento — viven completas en `10-GALAXIA-Y-TIENDA.md` (V1.1). Este documento solo garantiza que sus ganchos de datos (`WeeklyGoal.parentGoalId?`, `.skinId?`) no interfieren con ningún algoritmo de Calendario/Estadísticas/Metas de V1 (verificado explícitamente en §3.4/§3.5).


## Enmienda v3 (2026-09-14) — feedback del creador tras revisar los mockups interactivos

Fuente y autoridad: `03-requisitos/decisiones-tomadas.md` sección **v3 (2026-09-14)** (con prioridad sobre este documento hasta que esta enmienda se incorpore orgánicamente a las secciones correspondientes). Esta sección NO reescribe el cuerpo del documento: agrega las reglas nuevas que lo afectan y señala las que lo corrigen.

### Reglas de UI y configuración que entran por esta enmienda (v3 §B, §F)

1. **Aprobado sin cambios**: la visualización de calendario para desktop. Preocupación abierta del creador: **responsive en celular** — resolver el layout móvil del calendario antes de la fase móvil de UI (v3 §B1).
2. **Dismiss del popup de crear evento**: presionar **fuera** del panel lo cierra por defecto (v3 §B2).
3. **Mover eventos**: presionar y arrastrar un evento lo mueve (v3 §B3).
4. **Día actual destacado** en el panel (v3 §B4).
5. **Barra de continuidad (línea de "ahora")**: indicador que sigue la hora en curso en las **vistas de 3 días y 1 día** (v3 §B5).
6. **Jerarquía en Configuración** (v3 §F1): pantalla con la jerarquía completa de supermetas y metas, **editable** y con **eliminación**.
7. **HUD de la galaxia decorativo** (v3 §F2): Ajustes y amigos sin funcionalidad real por ahora.
8. **Impacto en rollup de estadísticas** (§3.5 de este documento): metas/supermetas ya no tienen `categoryId` (v3 §A2) — el rollup por categoría debe rediseñarse hacia **meta/supermeta/calendario**; el exceso de bloques (v3 §C4) aparece como métrica de estadísticas. Pendiente de redacción fina en la propagación orgánica de este documento.
