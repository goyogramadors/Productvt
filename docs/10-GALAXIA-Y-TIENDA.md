# 10 — Galaxia de metas y Tienda (V1.1)

## Propósito

Este documento diseña completo el requerimiento de galaxia de metas + Tienda pedido en vivo por el creador (2026-09-05): visualización de metas/supermetas como planetas/subgalaxias arrastrables tipo graph view de Obsidian, con fondo y skin personalizables, y una sección Tienda de desbloqueo por constancia. `01-SPEC.md` y `02-DOMINIO.md` ya fijaron el alcance por versión y los ganchos de datos mínimos (`WeeklyGoal.parentGoalId?`, `WeeklyGoal.skinId?`, `GalaxyLayout`, `InventoryItem`) para que V1 no migre nada cuando esto se construya. Este documento no repite ni modifica esos tipos: los cita y construye encima todo lo que falta para que sea implementable — definición de logro y del cofre cada 7 días de racha (la racha misma es canónica y se consume, no se redefine aquí — brief §12.6), catálogo estático de la Tienda, layout por defecto y física de arrastre con números concretos, resolución de las dos decisiones que la exploración visual de `productvt-9b` dejó abiertas (nodo ancla de una subgalaxia, conflicto de badges), implementación técnica, accesibilidad y 15 casos de prueba. El destinatario es quien construya la fase de Metas/Galaxia en `productvt-beta/src` (hoy `BC Orquestador Productvt`).

Dos aclaraciones de alcance que valen para todo el documento:

- **V1 no se toca a nivel de datos.** La interactividad completa que diseñan §2-§14 (arrastre, subgalaxias, personalización, Tienda) sigue siendo **V1.1**, salvo que el creador confirme adelantarla — con la excepción ya confirmada de la pestaña **Inicio** con la galaxia embebida como contenido principal, que sí entra a V1 (brief §12.5, ver §1.2 para el detalle exacto de qué es V1 y qué sigue siendo V1.1). Ninguna regla de este documento cambia el esquema Firestore ni las reglas de seguridad ya escritas en `02-DOMINIO.md` §5 — solo se le agrega el catálogo estático (que no vive en Firestore, ver §4) y la lógica que consume lo ya sembrado.
- **La Tienda no tiene backend propio.** El catálogo (§4) es una constante de código (`src/constants/`), no una colección de Firestore: coherente con Firebase Spark (costo cero) y con que no exista ninguna decisión de precios o moneda (regla no negociable, `01-SPEC.md` §3.3 punto 5).

## Fuentes

Orden de autoridad (si dos fuentes chocan, gana la de arriba):

1. Respuestas literales del creador — anexo de `_brief-orquestador.md` (`R7`: recompensa solo con constancia; `R20`: "funcionamiento de galaxias de la pantalla principal", interpretado en `01-SPEC.md` §9.2/§10 punto 6 como V1.1 salvo confirmación explícita).
2. `03-requisitos/decisiones-tomadas.md` v2, sección "Alcance — Galaxia de metas + Tienda" (`D "Alcance — Galaxia"`) y sección "Detalles técnicos menores" (nota: `parentGoalId` **todavía no** está en el `weekly-goal.ts` commiteado; ver §2).
3. `_brief-orquestador.md` §11 y su anexo (`B §11`); también §12.5 (CONFIRMADO por el creador, 2026-09-06: navegación principal de **5 pestañas** — Inicio, Cronómetro, Calendario, Estadísticas, Tienda — con la **galaxia de metas embebida** como contenido principal de la pestaña Inicio; "reemplaza cualquier supuesto anterior de '4 secciones'... o de estructura de tabs distinta en documentos ya escritos — corregir donde aparezca"; ver §1.2).
4. Código commiteado en `productvt-beta/src/domain/entities/weekly-goal.ts` (`CODE`): confirma que ni `parentGoalId` ni `skinId` existen todavía en el archivo as-built — son adición pendiente de la fase de Metas, tal como ya lo marca `02-DOMINIO.md` §3.3.
5. `docs/01-SPEC.md` §6.13 RF-MET-05, §9.1–9.2, §3.3 punto 5; y `docs/02-DOMINIO.md` §2.6, §3.3, §3.5, §4 invariante I-16, §5 (rutas, índices y reglas de seguridad de `layouts/galaxy` e `inventory/`). Estos dos documentos **ya fijan el modelo de datos base**; este documento no lo repite, lo cita por sección y construye encima (racha, logro, catálogo, layout visual, física).
6. `03-requisitos/revision-spec-beta.md`: no tiene hallazgos ALTO/MEDIO propios de galaxia/Tienda (el requerimiento es del 2026-09-05, posterior a esa revisión) — no aplica ninguna fila `REV-*` a este documento.
7. `03-requisitos/nueva-funcionalidad-galaxia-tienda.md` (cita textual del creador, requerimiento y preguntas abiertas originales), `01-mockups/desktop/decisiones-visuales-galaxia.md` (decisiones visuales sobre la exploración `01-mockups/desktop/galaxia-metas.html`) y `01-mockups/mobile/inicio.html` (mockup del hub "Inicio" de `productvt-9b` que ya embebe esta galaxia como pantalla principal — fuente de §1.2, no de la mecánica de arrastre/subgalaxia, que sigue viniendo de `galaxia-metas.html`). Los tres son **insumo de diseño visual, no decisión de producto ni de datos**: donde este documento se aparta de la exploración (§10, §11) lo señala explícitamente.
8. `01-mockups/mobile/cronometro.html`: origen de los tokens tipográficos compartidos (Fraunces/Archivo/IBM Plex Mono) que la exploración de galaxia ya reutiliza para sentirse parte del mismo producto.

`06-DISENO-UI.md` (ya escrito y completo) es el dueño del `AssetRegistry` — el registro genérico de assets visuales (imágenes, ilustraciones, tokens de skin) que usa toda la app: su §3.3 fija `AssetKind` (incluye `'planet_skin'` y `'galaxy_background'`), la interfaz `AssetEntry` (`id`, `kind`, `skinId`, `isFree`, `render`, `source?`), `resolveAsset` (fallback que nunca falla) y `listAssets`, con `DEFAULT_ASSET_REGISTRY` vacío en V1 salvo un fallback por `kind` — y su propio §2 dice explícitamente que "las entradas con imagen real (skins de planeta, fondos de galaxia) las puebla `10-GALAXIA-Y-TIENDA.md` §4 sobre esta misma API". Este documento **no** redefine el mecanismo: el catálogo de §4 se expresa como entradas `AssetEntry` de esos dos `kind` ya fijados, no como una estructura paralela.

## 1. Qué pidió el creador y alcance por versión

### 1.1 Qué pidió el creador (contexto y cita)

Pedido en vivo por Gregorio a `productvt-cb` (hoy `productvt-9b`) el 2026-09-05, mientras se revisaba el prototipo del Cronómetro — no estaba en ningún documento original (`docs/originales/*`). Cita completa en `03-requisitos/nueva-funcionalidad-galaxia-tienda.md`; resumen operativo de los cinco requisitos:

1. Las metas y supermetas se ven como una **galaxia de planetas**: cada meta es un planeta; una supermeta agrupa metas y se comporta como su propia subgalaxia.
2. Interactividad tipo **graph view de Obsidian**: los planetas se pueden arrastrar y reposicionar libremente, con una acción para **restablecer** el layout a un orden por defecto.
3. Múltiples vistas: una vista principal (metas/supermetas de nivel superior) y, al hacer click en una supermeta, su **subgalaxia** (vista anidada con sus metas hijas).
4. Personalización visual: el **fondo** de la vista principal y el de cada subgalaxia son independientes y personalizables; la **skin** de cada planeta también.
5. Una sección **Tienda** nueva, con skins de planeta, fondos, colecciones ligadas a rachas de estudio y un sistema de recompensas.

### 1.2 Alcance por versión

**Corrección de esta pasada (brief §12.5, CONFIRMADO por el creador 2026-09-06, posterior a `01-SPEC.md` §9.1-9.2 y a la sección "Alcance — Galaxia" de `decisiones-tomadas.md`)**: la navegación principal de V1 tiene **5 pestañas**, y una de ellas es **Inicio** — un hub con racha/cofre visibles arriba y **la galaxia de metas embebida como su contenido principal**, tal como ya la construyó `productvt-9b` en `01-mockups/mobile/inicio.html`. Esto significa que **alguna forma visual de la galaxia sí existe en V1** — no es correcto decir, sin matices, que "la vista de galaxia no existe en V1". Lo que sigue siendo V1.1 por defecto (mismo criterio que ya tenía este documento: la Tienda necesita historial de racha para significar algo, D "Alcance — Galaxia") es la **interactividad completa** que el resto de este documento diseña: arrastre libre con física de resorte (§7), subgalaxias navegables (§5.2), personalización de fondo/skin por vista (§10) y la Tienda con su economía de desbloqueo (§3-§4). La tabla separa ambos niveles:

| Elemento | V1 | V1.1 |
|---|---|---|
| Modelo de datos (`WeeklyGoal.name`/`.parentGoalId?`/`.skinId?`/`.layerVisible?`, `GalaxyLayout`, `InventoryItem`) | Completo en el esquema, sin UI (`02-DOMINIO.md` §2.6, §3.5) | Sin cambios — este documento no agrega ni un campo |
| Pestaña **Inicio** con la galaxia de metas embebida como contenido principal (racha/cofre visibles, botón "Crear") | **Sí — confirmado** (brief §12.5); fuente visual `01-mockups/mobile/inicio.html` | — (ya en V1) |
| Interactividad completa de la galaxia dentro de Inicio: arrastre libre con física de resorte, subgalaxias navegables al tocar una supermeta, "Restablecer orden" | No existe (el hub de Inicio en V1 puede mostrar la disposición por defecto de §6 sin arrastre, o remitir a la lista de metas — decisión de implementación fuera de alcance de este documento) | **Este documento**, §5-§9, §11-§12 |
| Personalización de fondo/skin por vista | No existe UI | §10 |
| Sección **Tienda** (pestaña propia, confirmada por brief §12.5) — catálogo, cofre cada 7 días, logro, desbloqueo | Pestaña visible y navegable (brief §12.5) | Su contenido — catálogo, otorgamiento, economía de desbloqueo — sigue siendo V1.1: **este documento**, §3-§4 |
| Metas semanales (CRUD, cálculo, estrella mensual) | Completo, vía lista simple sin jerarquía visible (RF-MET-01 a 05) | Sin cambios de datos ni de cálculo — la galaxia es una vista alternativa sobre las mismas `WeeklyGoal` (§15) |

`01-SPEC.md` supuesto pendiente #6 (R20: *"funcionamiento de galaxias de la pantalla principal"*) preguntaba si había que "adelantar la galaxia a V1" como si fuera una decisión binaria y todavía abierta — brief §12.5 la resuelve parcialmente (la pestaña Inicio con galaxia embebida entra a V1, sin más confirmación pendiente) sin que `01-SPEC.md` se haya actualizado todavía para reflejarlo (fuera de alcance de este documento tocar `01-SPEC.md`). Lo único que sigue realmente abierto es **cuánta interactividad** tiene esa galaxia embebida durante V1 — si el creador pide la interactividad completa desde ya (arrastre, subgalaxias, personalización, Tienda con economía), lo único que cambia es **cuándo** se construye lo que ya está diseñado aquí: se inserta después del núcleo del cronómetro y antes del pulido (`01-SPEC.md` §9.2), sin que ninguna sección de este documento cambie de contenido, solo su ubicación en el plan de fases.

Fuera de alcance de este documento porque ya están resueltos en otro lado y no se repiten: la definición de `WeeklyGoal` misma y sus invariantes (`02-DOMINIO.md` §2.6, §3.3, §4 invariante I-16), el cálculo de `achievedSeconds` y la estrella mensual (`01-SPEC.md` §6.13, `07-CALENDARIO-ESTADISTICAS-METAS.md` §3), y el `AssetRegistry` genérico (`06-DISENO-UI.md` §3.3, ya escrito y completo) — este documento solo puebla las entradas de `kind: 'planet_skin'`/`'galaxy_background'` que ese registro necesita (§4, §10).

## 2. Modelo de datos ya fijado (`02-DOMINIO.md`): jerarquía, layout e inventario

### 2.1 `WeeklyGoal`: forma uniforme para hoja y supermeta

Cita literal, sin redefinir: `02-DOMINIO.md` §2.6, §3.3 (interfaz completa), §3.6 (`canAssignParentGoal`), §4 invariante I-16. Los campos relevantes para este documento:

```ts
// 02-DOMINIO.md §3.3 — cita, no redefinición
interface WeeklyGoal {
  id: string; userId: string; weekKey: WeekKey;
  categoryId: string; categoryNameSnapshot: string;
  targetSeconds: number; achievedSeconds: number;
  status: 'pending' | 'completed' | 'failed';
  name: string;                // + etiqueta propia (galaxia y formularios)
  parentGoalId?: string;       // + supermeta a la que pertenece (máx. dos niveles)
  skinId?: string;             // + skin de planeta; ausente = skin por defecto
  layerVisible?: boolean;      // + capa de calendario implícita (07-CALENDARIO..., no este documento)
}
```

El punto de diseño que hace posible toda la galaxia sin tocar el esquema (reconciliado 2026-09-06, brief §11): **una supermeta es, en el dato, una `WeeklyGoal` idéntica a cualquier otra** — tiene su propio `categoryId`, su propio `targetSeconds`, y su `achievedSeconds` se calcula exactamente igual (suma de bloques completados de esa categoría en esa semana, `02-DOMINIO.md` §6.3). Lo único que la distingue es que **una o más metas la referencian** vía `parentGoalId`. Esto significa que:

- Una supermeta **tiene su propio estado** (`pending`/`completed`/`failed`) independiente del de sus hijas — puede fallar aunque todas sus hijas se cumplan, o cumplirse aunque alguna hija falle. No existe ninguna regla de "la supermeta se cumple si sus hijas se cumplen": son dos (o más) metas independientes que comparten una relación visual de agrupación, nada más.
- La galaxia **no inventa ningún cálculo nuevo**: el planeta de una supermeta se pinta con el mismo dato (`achievedSeconds`/`targetSeconds`/`status`) que pintaría cualquier meta hoja. §9 describe el mapeo estado→visual, igual para ambas.
- `canAssignParentGoal(child, parent, allGoals)` (`02-DOMINIO.md` §3.6) es la única puerta de negocio: una meta con `parentGoalId` propio no puede ser padre de otra (dos niveles, I-16). La galaxia nunca permite arrastrar una meta "dentro" de otra para reasignar el padre — eso es una operación de datos con su propio formulario, no un gesto de arrastre (§5.3).

### 2.2 `GalaxyLayout`, `InventoryItem`: cita y sistema de coordenadas

Cita literal: `02-DOMINIO.md` §3.5 (interfaces `GalaxyPosition`, `GalaxyViewLayout`, `GalaxyLayout`, `InventoryItem`, `InventoryItemKind`, `InventoryAcquisitionSource`), §5.1 (rutas `layouts/galaxy`, `inventory/{itemId}`), §5.3 (reglas de seguridad ya escritas para ambas colecciones). Este documento no agrega ni un campo a esas interfaces.

`02-DOMINIO.md` deja abierto un detalle de implementación a propósito ("`x`/`y`: unidades lógicas relativas al centro de la vista — el renderer escala"). Este documento lo concreta, porque la física de arrastre (§7) y el layout por defecto (§6) lo necesitan:

**Convención de coordenadas**: `GalaxyPosition.x`/`.y` son números en un espacio normalizado donde **1.0 unidad = la mitad del lado menor del área visible de la vista** (`min(viewportWidth, viewportHeight) / 2`), con origen `(0, 0)` en el centro. Esto hace el layout independiente de resolución: la misma `GalaxyLayout` se ve proporcionalmente igual en un teléfono angosto y en un monitor ancho, sin guardar ni migrar nada distinto por plataforma (coherente con RF-PLA-03 y `02-DOMINIO.md` §7: `layouts/galaxy` es "Sí/Sí/Sí" en las tres plataformas).

```ts
// src/domain/rules/galaxy-coordinates.ts — ADICIÓN (fase Metas/Galaxia, V1.1)
/** Convierte una posición normalizada (GalaxyPosition) a coordenadas de pantalla para un viewport dado. */
export function toScreenPoint(
  position: GalaxyPosition,
  viewport: { width: number; height: number },
): { x: number; y: number } {
  const scale = Math.min(viewport.width, viewport.height) / 2;
  return { x: viewport.width / 2 + position.x * scale, y: viewport.height / 2 + position.y * scale };
}

/** Inversa: de un punto de pantalla (p. ej. el puntero durante un arrastre) a GalaxyPosition. */
export function toGalaxyPosition(
  point: { x: number; y: number },
  viewport: { width: number; height: number },
): GalaxyPosition {
  const scale = Math.min(viewport.width, viewport.height) / 2;
  return { x: (point.x - viewport.width / 2) / scale, y: (point.y - viewport.height / 2) / scale };
}
```

Solo las metas que el usuario movió activamente aparecen en `positions` (`02-DOMINIO.md` §3.5); una meta sin entrada usa `defaultGoalPosition` (§6). `GalaxyLayoutRepository` (V1.1, ya nombrado en `02-DOMINIO.md` §5.1) es el único que escribe `users/{uid}/layouts/galaxy` — nadie más importa Firestore para esto (brief §7).

`InventoryItem` (§3.5, cita) es la prueba de posesión: `id === assetId` (idempotente — otorgar un logro dos veces nunca duplica el ítem, importante para §3.3). `WeeklyGoal.skinId` y `GalaxyViewLayout.backgroundId` referencian un `assetId`; si no resuelve contra un `InventoryItem` del usuario ni contra un asset marcado gratuito, el renderer usa el default y nunca falla (§3.5, regla ya fijada) — este documento define en §4/§10 exactamente cuáles son esos defaults y qué assets existen.

## 3. Racha y logro: definición

**La racha NO se define en este documento.** Brief §12.6 (requerimiento elevado por el creador el 2026-09-06, precisamente a partir de la idea de "cofre cada 7 días" de este mismo requerimiento) ya fijó `computeCurrentStreakDays(sessions, timezone)` como la racha canónica y transversal de toda la app, propiedad de `07-CALENDARIO-ESTADISTICAS-METAS.md` (agregador puro, mismo patrón que sus otras funciones de estadísticas): días consecutivos, hacia atrás desde hoy en la zona horaria del perfil, con al menos un bloque de estudio completado ese día (`effectiveStudySeconds > 0` de cualquier `StudySession` con `status` `completed`, `cancelled` o `expired` — D1.b), sin relación con `WeeklyGoal` ni con metas configuradas. Brief §12.6 es explícito y no admite lectura alternativa: *"el sistema de cofres... vive en `10-GALAXIA-Y-TIENDA.md` y es un **consumidor** de este número, no su dueño — no se rediseña la racha para la Tienda, la Tienda solo la lee"*. Una versión anterior de esta sección definía su propia `computeWeeklyGoalStreak` (semanas ISO con todas las metas cumplidas) — quedaba retirada: era exactamente el rediseño que el brief prohíbe, y habría producido dos números de "racha" distintos y contradictorios el mismo día para el mismo usuario (uno en Estadísticas/Inicio, otro en la Tienda).

Lo que sí es diseño propio de este documento — porque ninguna otra parte del canon lo necesita — es **el logro** (hito permanente, §3.2) y **el cofre** (recompensa recurrente cada 7 días de racha, §3.3), ambos construidos para cumplir R7/D7 (recompensa solo por constancia real) sin agregar ninguna colección ni campo nuevo a Firestore: se calculan **en cliente**, a partir de la racha ya calculada por `07-CALENDARIO-ESTADISTICAS-METAS.md` y de `WeeklyGoal` (solo para `monthsWithStar`).

### 3.1 Racha consumida y "cofre cada 7 días"

Este documento no recibe `WeeklyGoal[]` para calcular una racha propia: recibe el número ya calculado, `currentStreakDays: number` (salida de `computeCurrentStreakDays`, `07-CALENDARIO-ESTADISTICAS-METAS.md`), como parte de `RewardEvalContext` (§3.2). Sobre ese número — y solo sobre él — este documento define una derivación propia, local a la Tienda, que no es una racha nueva sino un conteo de cuántas veces ya se cruzó el múltiplo de 7 que da nombre al requerimiento original ("cofre cada 7 días de racha", brief §12.6):

```ts
// src/constants/galaxy-catalog.ts — ADICIÓN (fase Metas/Galaxia, V1.1)
/** Cuántos "cofres" de 7 días de racha ya se ganaron. No redefine la racha: solo la divide. */
export function computeChestsEarned(currentStreakDays: number): number {
  return Math.floor(currentStreakDays / 7);
}
```

`chestsEarned` es lo que gatea tanto los umbrales de logro de §3.2 (`streak_4`/`streak_8`/`streak_12`) como cualquier fondo/skin con `source: 'streak'` en el catálogo de §4 — nunca `currentStreakDays` directamente contra un umbral de días distinto de un múltiplo de 7, para que "logro" y "cofre" cuenten exactamente lo mismo con una sola fórmula.

### 3.2 Logro (`achievement`)

Un logro es un hito **binario y permanente** (una vez desbloqueado, no se puede perder) evaluado sobre el historial completo del usuario, no sobre una ventana de semanas consecutivas. Catálogo fijo en código (`src/constants/galaxy-catalog.ts`, no en Firestore — mismo criterio de costo cero que el resto de la Tienda, §4.1):

```ts
// src/constants/galaxy-catalog.ts — ADICIÓN (fase Metas/Galaxia, V1.1)
export interface RewardEvalContext {
  currentStreakDays: number;             // computeCurrentStreakDays(sessions, tz) — 07-CALENDARIO-ESTADISTICAS-METAS.md, brief §12.6; NO se recalcula aquí
  chestsEarned: number;                  // computeChestsEarned(currentStreakDays) — §3.1, derivación propia de este documento
  monthsWithStar: number;                // meses históricos que cumplen RF-MET-04
  timezone: string;
}

export interface AchievementDefinition {
  id: string;
  description: string;                   // copy en español, src/i18n/es.ts
  isUnlocked: (ctx: RewardEvalContext) => boolean;
}

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  { id: 'first_star',  description: 'Primera estrella mensual', isUnlocked: (c) => c.monthsWithStar >= 1 },
  { id: 'three_stars', description: 'Tres meses con estrella',  isUnlocked: (c) => c.monthsWithStar >= 3 },
  { id: 'streak_4',    description: 'Racha de 4 semanas (28 días de estudio)',  isUnlocked: (c) => c.chestsEarned >= 4 },
  { id: 'streak_8',    description: 'Racha de 8 semanas (56 días de estudio)',  isUnlocked: (c) => c.chestsEarned >= 8 },
  { id: 'streak_12',   description: 'Racha de 12 semanas (84 días de estudio)', isUnlocked: (c) => c.chestsEarned >= 12 },
] as const;
```

Los umbrales de `streak_4`/`streak_8`/`streak_12` siguen siendo los mismos números que ya estaban en este documento (4/8/12), solo reexpresados en `chestsEarned` (múltiplos de 7 días de la racha canónica) en vez de "semanas ISO con metas cumplidas" — el default numérico sigue siendo una invención de este documento, no una cifra pedida por el creador (§17 pregunta 3). `monthsWithStar` reutiliza la misma función de estrella mensual ya definida (RF-MET-04, `07-CALENDARIO-ESTADISTICAS-METAS.md` §3) — este documento no la reimplementa, solo cuenta cuántos meses históricos la cumplen.

### 3.3 Otorgamiento: cuándo y cómo se escribe `InventoryItem`

- **Evaluación**: al abrir la sección Metas/Galaxia o la Tienda, y tras cualquier bloque de estudio completado que pueda cambiar `currentStreakDays` (mismo punto en que `07-CALENDARIO-ESTADISTICAS-METAS.md` recalcula la racha canónica) o tras cualquier cierre de semana (para `monthsWithStar`), se recalcula `RewardEvalContext` y se compara contra el catálogo de §4. Ningún cálculo requiere una Cloud Function ni un cron: es una función pura ejecutada en el cliente sobre datos que ya están cargados.
- **Escritura**: por cada entrada del catálogo cuya condición ya se cumple y que el usuario todavía no posee, se llama `grantInventoryItem(uid, item)` con un `InventoryItem` cuyo `id === assetId`, `source: 'streak'` o `'achievement'` según corresponda (`02-DOMINIO.md` §3.5; firma de la función en `05-ARQUITECTURA.md` §3.2 — repositorios son funciones exportadas, no clases con métodos). Como el `id` es el `assetId`, evaluar la misma condición en dos dispositivos o dos veces seguidas nunca duplica el ítem (mismo documento, mismo `set` idempotente que ya implementa `grantInventoryItem`) — sin necesidad de una transacción ni de un flag separado de "ya se notificó".
- **Notificación de desbloqueo**: una sola vez, la primera vez que el ítem aparece en el inventario (se detecta comparando contra el inventario ya cargado antes de escribir) — toast/microcelebración, sujeto a `celebrationEffectsEnabled` y `reduceMotion` (RF-TEM-04, RF-TEM-03).
- **Nunca se otorga ni se revoca por dinero, ni por una acción manual de "comprar"**: coherente con el no-objetivo §3.5 de `01-SPEC.md` — la Tienda es un catálogo de vitrina más una función de evaluación, no un carrito.

## 4. Catálogo estático de la Tienda y sistema de recompensas

### 4.1 Por qué es una constante de código, no una colección Firestore

La Tienda **no tiene backend propio**: no hay precios, no hay inventario limitado, no hay nada que un servidor deba arbitrar. El catálogo completo (qué assets existen, cuáles son gratis, qué los desbloquea) es una constante en `src/constants/galaxy-catalog.ts`, versionada con el código de la app — coherente con Firebase Spark (sin Cloud Functions ni colección adicional que mantener) y con la regla de `01-SPEC.md` §3.3 punto 5 (sin moneda ni precios en el modelo). Lo único que persiste en Firestore es **qué posee el usuario** (`InventoryItem`, ya fijado en `02-DOMINIO.md` §3.5) — la posesión, no el catálogo.

Cada fila de fondo/skin (§4.2, §4.3) cumple dos roles a la vez, sobre dos interfaces ya fijadas en otro documento, sin redefinir ninguna de las dos: es una entrada `AssetEntry` del `AssetRegistry` genérico (`06-DISENO-UI.md` §3.3 — resuelve qué se dibuja) y, cuando se otorga, la plantilla del `InventoryItem` que prueba la posesión (`02-DOMINIO.md` §3.5 — resuelve qué posee el usuario). Los dos documentos usan un `kind` propio para cada cosa y **no coinciden en el nombre para fondos** (`AssetEntry.kind: 'galaxy_background'` en `06-DISENO-UI.md`; `InventoryItem.kind: 'background'` en `02-DOMINIO.md`) — no es una inconsistencia de este documento: son dos enums distintos de dos documentos distintos, con propósitos distintos (`AssetKind` indexa todo el registro visual de la app, incluidos `category_icon`/`preset_icon` sin dueño de inventario; `InventoryItemKind` solo clasifica lo que un usuario puede poseer), así que este documento cita literalmente cada uno donde corresponde en vez de inventar un tercer nombre:

```ts
// src/constants/galaxy-catalog.ts — ADICIÓN (fase Metas/Galaxia, V1.1)
export interface GalaxyCatalogEntry {
  asset: AssetEntry;                    // 06-DISENO-UI.md §3.3 — id, kind ('galaxy_background' | 'planet_skin'), skinId, isFree, render: 'image', source
  inventoryKind: 'background' | 'planet_skin'; // subconjunto de InventoryItemKind (02-DOMINIO.md §3.5) relevante aquí
  source: InventoryAcquisitionSource;   // 'default' | 'streak' | 'achievement' (02-DOMINIO.md §3.5); también asset.isFree = source === 'default'
  isUnlocked: (ctx: RewardEvalContext) => boolean; // §3.2; siempre `true` cuando source === 'default'
}
```

Al otorgar una entrada (§3.3), `grantInventoryItem(uid, item)` recibe `{ id: entry.asset.id, kind: entry.inventoryKind, assetId: entry.asset.id, source: entry.source, ... }` — el `id`/`assetId` del catálogo es el mismo string en ambas interfaces, solo el nombre del campo `kind` cambia según cuál de las dos se está poblando.

### 4.2 Fondos (`AssetEntry.kind: 'galaxy_background'`; `InventoryItem.kind: 'background'`)

Los 5 presets vienen de la exploración visual (`01-mockups/desktop/decisiones-visuales-galaxia.md`, `galaxia-metas.html`) — tinta sobre papel, nunca degradados genéricos de "espacio". Este documento decide la distribución gratis/Tienda, resolviendo una tensión que la exploración no encaró: "Papel noche" funciona como sustituto del modo oscuro **dentro de esta pantalla** (decisión visual ya registrada), así que no puede depender de una racha — un usuario nuevo en modo oscuro necesita un fondo gratuito coherente desde el primer momento, igual que uno en modo claro.

**Regla de este documento**: el fondo gratuito por defecto sigue el tema de la app (RF-TEM-01) — "Papel crema" en claro/sistema-claro, "Papel noche" en oscuro/sistema-oscuro. Los otros tres quedan en la Tienda. La columna `id` es `asset.id` (`AssetEntry`) y también `InventoryItem.assetId` al otorgarse; `isFree = (source === 'default')`:

| `id` | Nombre | Colores (`paper` / `ink` / `accent`) | `source` | Desbloqueo |
|---|---|---|---|---|
| `bg_papel_crema` | Papel crema | `#EFEDE5` / `#20241E` / `#3A6B54` | `default` | Gratis (default claro) |
| `bg_papel_noche` | Papel noche | `#171A22` / `#E7E5DA` / `#7BA6B5` | `default` | Gratis (default oscuro) |
| `bg_pergamino` | Pergamino | `#E8DEC4` / `#3B2C1A` / `#8A5A2B` | `achievement` | `first_star` |
| `bg_anil` | Tinta añil | `#E4E6ED` / `#1C2340` / `#35468C` | `streak` | `chestsEarned >= 8` (§3.1) |
| `bg_musgo` | Musgo | `#E9ECE2` / `#212B1C` / `#4C7A3E` | `achievement` | `three_stars` |

`bg_papel_crema` reutiliza exactamente los tokens del skin base "Papel" (`_brief-orquestador.md` §8: papel `#EFEDE5`, tinta `#20241E`, acento `#3A6B54`) — no es una paleta nueva, es el mismo fondo de siempre ofrecido también como opción explícita dentro de la galaxia. `bg_papel_noche` adopta los tonos que la propia exploración usa para "Papel noche"; ninguno de los dos entra en conflicto con la variante oscura del skin "Papel" porque esa variante todavía no está definida en ningún documento ni en código (`06-DISENO-UI.md` no la define en su skin base "Papel", solo fija el mecanismo del `AssetRegistry`) — cuando se defina, debe alinearse con estos tokens en vez de crear un tercero.

### 4.3 Skins de planeta (`AssetEntry.kind` / `InventoryItem.kind`: ambos `'planet_skin'`)

Los 5 tratamientos son técnicas de grabado, no colores planos (decisión visual ya registrada); la exploración ya marcaba dos de ellos como bloqueados en su propia demo (`SKINS` en `galaxia-metas.html`) — este documento adopta esa misma partición y le da un desbloqueo concreto. Aquí sí coincide el `kind` de ambas interfaces, sin ambigüedad:

| `id` | Nombre | Técnica | `source` | Desbloqueo |
|---|---|---|---|---|
| `skin_liso` | Liso | Degradado radial simple | `default` | Gratis |
| `skin_anillado` | Anillado | Anillo elíptico estilo Saturno | `default` | Gratis |
| `skin_rayado` | Rayado | Bandas horizontales | `default` | Gratis |
| `skin_puntillado` | Puntillado | Stippling (puntos aleatorios) | `streak` | `chestsEarned >= 4` (§3.1) |
| `skin_cometa` | Cometa | Estela diagonal | `streak` | `chestsEarned >= 12` (§3.1) |

### 4.4 Colecciones (`InventoryItem.kind: 'collection'`, sin entrada en `AssetRegistry`)

`InventoryItemKind` (`02-DOMINIO.md` §3.5) incluye `'collection'` como tercer valor, pero `AssetKind` (`06-DISENO-UI.md` §3.3) no tiene un `kind` equivalente — a propósito: una colección no es un asset visual que el renderer resuelva (no hay `AssetEntry` para ella), es solo una prueba de posesión agregada. Por eso §4.4 no define `GalaxyCatalogEntry` para las colecciones: son `InventoryItem`s propios (`kind: 'collection'`) sin `asset` que los acompañe.

El requerimiento original pide "colecciones ligadas a rachas de estudio" sin describir qué son visualmente. Este documento las define como **una vitrina de logros**, no como un asset aplicable a un planeta o fondo: una colección es una insignia coleccionable que se muestra en un panel "Vitrina" dentro de la Tienda (no en la galaxia misma) — reconoce constancia sostenida sin agregar más superficie de personalización que resolver (fondos y skins ya cubren eso). Cada colección agrupa varias insignias bajo un tema:

| `assetId` | Nombre | Insignias que agrupa |
|---|---|---|
| `collection_constancia` | Colección Constancia | `streak_4`, `streak_8`, `streak_12` (una insignia por umbral alcanzado) |
| `collection_estrellas` | Colección Estrellas | `first_star`, `three_stars` |

Una colección se considera "completa" cuando el usuario posee todas sus insignias — un dato derivado en cliente (cuenta de `InventoryItem` con el `source` correspondiente), no un campo persistido adicional.

### 4.5 Assets gratuitos por defecto (resuelve la pregunta del brief)

Confirma el default ya fijado en `02-DOMINIO.md` §8 tabla, fila 6: `skin_liso`/`skin_anillado`/`skin_rayado` y `bg_papel_crema`/`bg_papel_noche` se otorgan (`source: 'default'`) al crear la primera `WeeklyGoal` del usuario o al abrir la Galaxia por primera vez — igual que el preset "Estándar" se siembra al primer login (RF-PRE-02) — para que `InventoryRepository` tenga algo que resolver desde el primer uso sin depender de que el renderer "adivine" el default (`02-DOMINIO.md` §3.5: "si la referencia no resuelve, usa el asset por defecto" sigue siendo la red de seguridad, pero sembrar el inventario gratuito desde el inicio evita depender de ella en el camino feliz).

## 5. Vistas: galaxia principal y subgalaxia

### 5.1 Vista principal (root)

Muestra los planetas de **nivel superior**: toda `WeeklyGoal` de la semana vigente sin `parentGoalId` (sea o no supermeta — una meta simple sin hijas y una supermeta conviven en la misma vista). Usa `GalaxyLayout.root` (`backgroundId?`, `positions`). Controles visibles: selector de fondo (swatches, §10.1), botón "Restablecer orden" (§7.3), y el alternador "Galaxia / Lista" (§5.3, §14).

### 5.2 Subgalaxia

Al tocar (tap, no arrastre — la disambiguación de §7.1 decide cuál de las dos ocurrió) un planeta que es supermeta, se navega a su subgalaxia: una vista anidada que muestra **solo** las `WeeklyGoal` con `parentGoalId` igual al id de esa supermeta. Usa `GalaxyLayout.subgalaxies[parentGoalId]` (mismo tipo `GalaxyViewLayout`, independiente del root). La navegación se modela como una pila de breadcrumbs (`[Galaxia, Cálculo 3, …]`, como en la exploración) — tocar un breadcrumb anterior recorta la pila a ese punto; no hay límite de profundidad que imponer porque el modelo de datos ya solo permite dos niveles (I-16): la pila nunca crece más de `[root, subgalaxia]`.

Dentro de la subgalaxia, un **nodo ancla** central representa a la supermeta misma (decisión de este documento, §8.2) — tocarlo abre su hoja de personalización (§10.2), no navega (para eso ya está el breadcrumb).

### 5.3 La galaxia es una vista, no el formulario de datos

La galaxia **nunca** es el mecanismo para crear una meta, editar su objetivo (`targetSeconds`) o reasignar su `parentGoalId` — esas operaciones siguen siendo un formulario convencional (RF-MET-01, `01-SPEC.md` §6.13), accesible también como lista plana sin galaxia para quien prefiera ese flujo o esté en un contexto donde la galaxia no aporta (§13 modo gestión, §14 accesibilidad). Lo que la galaxia agrega sobre esa lista es exclusivamente: distribución espacial arrastrable (§6-§7), fondo y skin por planeta/vista (§10), y navegación por subgalaxia (§5.2). Crear una meta nueva la agrega automáticamente a la vista principal en su posición por defecto (§6) — no exige que el usuario "la coloque" para que exista.

## 6. Layout por defecto: espiral áurea

Adopta el layout de la exploración (`galaxia-metas.html`, `01-mockups/desktop/decisiones-visuales-galaxia.md`: "distribución tipo phyllotaxis/girasol... no se superponen nodos, se ve orgánico sin ser aleatorio"), reexpresado en el sistema de coordenadas normalizado de §2.2:

```ts
// src/domain/rules/galaxy-layout.ts — ADICIÓN (fase Metas/Galaxia, V1.1)
const GOLDEN_ANGLE_RAD = (137.5 * Math.PI) / 180;   // ángulo dorado, phyllotaxis
const SPIRAL_BASE_RADIUS = 0.09;                    // unidades normalizadas (§2.2)
const SPIRAL_MAX_RADIUS = 0.76;                     // deja margen para etiquetas y el anillo orbital

/**
 * Posición por defecto del i-ésimo planeta de una vista (orden estable: por `createdAt` de la
 * `WeeklyGoal`, para que agregar una meta nueva no reordene las existentes).
 * `anchorRadius` desplaza el inicio de la espiral para dejar hueco al nodo ancla (§8.2); 0 en el root.
 */
export function defaultGoalPosition(index: number, anchorRadius = 0): GalaxyPosition {
  const angle = index * GOLDEN_ANGLE_RAD;
  const radius = Math.min(anchorRadius + SPIRAL_BASE_RADIUS * Math.sqrt(index + 1), SPIRAL_MAX_RADIUS);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
```

Radios de planeta (misma proporción que la exploración — un planeta de 18px sobre un canvas de referencia de ~600px de lado menor equivale a `0.06` en unidades normalizadas de §2.2): `PLANET_RADIUS = 0.06` (meta simple), `SUPER_PLANET_RADIUS = 0.09` (supermeta, vista desde su galaxia contenedora — más grande, igual que la exploración: "26px vs. 18px"), `ANCHOR_RADIUS = 0.12` (nodo ancla dentro de su propia subgalaxia, §8.2 — el más grande de los tres, porque representa el "sol" de esa subgalaxia). Estos tres radios son constantes de diseño, no dependen del contenido de la meta.

El orden `i` de cada meta dentro de una vista es su posición en la lista ordenada por `createdAt` (estable) filtrada por la vista (`parentGoalId` ausente para el root; `parentGoalId === id` de la supermeta para una subgalaxia) — nunca por nombre ni por estado, para que el layout por defecto no salte de lugar al completar o fallar una meta.

## 7. Física de arrastre y "Restablecer orden"

Misma mecánica que la exploración (resorte hacia "home" + repulsión entre nodos cercanos + amortiguación — "esto es lo que da la sensación tipo Obsidian", decisión visual ya registrada), formalizada como una función de paso ejecutable en un `useFrameCallback` de Reanimated (§12.2):

```ts
// src/domain/rules/galaxy-physics.ts — ADICIÓN (fase Metas/Galaxia, V1.1)
export interface PlanetPhysicsNode {
  id: string;
  x: number; y: number;          // posición actual (unidades normalizadas, §2.2)
  vx: number; vy: number;        // velocidad actual
  homeX: number; homeY: number;  // "home": la posición guardada o la default de §6
  radius: number;                // PLANET_RADIUS / SUPER_PLANET_RADIUS / ANCHOR_RADIUS
  fixed?: boolean;                // true solo para el nodo ancla (§8.2): nunca se mueve
}

const REPULSION_MARGIN = 0.15;   // separación mínima añadida a la suma de radios
const REPULSION_STRENGTH = 0.6;
const SPRING_STRENGTH = 0.02;    // hacia "home"
const DAMPING = 0.85;            // por frame de referencia (16.7 ms / 60 fps)

/** Un paso de física para todos los nodos de una vista, excepto el que se arrastra y el ancla fija. */
export function stepGalaxyPhysics(nodes: PlanetPhysicsNode[], draggingId: string | null, dtMs: number): void {
  const frames = dtMs / 16.7; // normaliza a "frames de 60 fps" para que un dispositivo a 90/120 Hz no acelere la física
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.max(Math.hypot(dx, dy), 0.001);
      const minDist = a.radius + b.radius + REPULSION_MARGIN;
      if (dist < minDist) {
        const force = ((minDist - dist) / minDist) * REPULSION_STRENGTH * frames;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        if (a.id !== draggingId && !a.fixed) { a.vx -= fx; a.vy -= fy; }
        if (b.id !== draggingId && !b.fixed) { b.vx += fx; b.vy += fy; }
      }
    }
  }
  for (const n of nodes) {
    if (n.id === draggingId || n.fixed) continue;
    n.vx += (n.homeX - n.x) * SPRING_STRENGTH * frames;
    n.vy += (n.homeY - n.y) * SPRING_STRENGTH * frames;
    n.vx *= DAMPING; n.vy *= DAMPING;
    n.x += n.vx; n.y += n.vy;
  }
}
```

### 7.1 Arrastre: disambiguación tap vs. drag

Un `Gesture.Pan` de `react-native-gesture-handler` por nodo, con un `minDistance` equivalente al umbral de 6 px lógicos de la exploración (adaptado a la densidad de píxeles del dispositivo). Mientras el gesto está activo, el nodo se fija a la posición del puntero (`vx = vy = 0`, igual que la exploración) y el resto de la vista sigue corriendo su física alrededor (repulsión activa contra el nodo arrastrado, que actúa como obstáculo fijo — mismo comportamiento que `galaxia-metas.html`). Al soltar: si el desplazamiento total fue menor al umbral, se trata como **tap** (abre subgalaxia si es supermeta, o la hoja de personalización si es hoja o ancla — §5.2, §10); si fue mayor, se trata como **drag**: la posición final se convierte en el nuevo `homeX`/`homeY` de ese nodo y se persiste (§7.2).

### 7.2 Persistencia

Al soltar un drag válido, se escribe la `GalaxyPosition` resultante (§2.2, `toGalaxyPosition`) en `positions[goalId]` de la vista actual (`root` o la `subgalaxies[parentGoalId]` correspondiente) y se llama `upsertGalaxyLayout(uid, patch)` — CRUD normal, sin arbitraje (no es el timer activo, D14); firma fijada en `05-ARQUITECTURA.md` §3.2 (`patch: Partial<Pick<GalaxyLayout, 'root' | 'subgalaxies'>>`), no un método `.update()` de una clase. La escritura se debounce (p. ej. 400 ms tras el último `pointerup` de esa sesión de arrastre) para no generar una escritura por cada micro-ajuste si el usuario arrastra varios nodos seguidos.

### 7.3 "Restablecer orden"

Borra **todas** las entradas de `positions` de la vista actual únicamente (no toca `backgroundId` de esa vista ni afecta otras vistas — mismo alcance que la exploración: "recalcula esta espiral... 'Restablecer orden' borra las entradas de esa vista, no el fondo", ya fijado en `02-DOMINIO.md` §3.5). Tras borrar, cada nodo sin entrada usa `defaultGoalPosition` (§6) como su nuevo `home`, y la física (§7) los anima suavemente hacia ahí — no es un salto instantáneo, salvo que `reduceMotion` esté activo (§14).

## 8. Supermeta cerrada, abierta y nodo ancla

### 8.1 Cerrada (vista desde la galaxia que la contiene)

Igual que la exploración: radio `SUPER_PLANET_RADIUS` (mayor que una meta simple), anillo orbital elíptico punteado alrededor (visual, no interactivo), badge circular de conteo con el número de metas hijas (§11). El estado visual (glow/lavado/normal, §9) se pinta con el `status` **propio** de la supermeta (§2.1) — no con un agregado de sus hijas.

### 8.2 Abierta: nodo ancla (resuelve la decisión abierta de la exploración)

La exploración dejaba esto explícitamente sin resolver ("hoy NO hay un nodo central que represente a la supermeta misma dentro de su subgalaxia... falta decidir si conviene un 'sol' central ancla"). Este documento decide: **sí hay un nodo ancla**, por dos razones que la exploración no tenía disponibles porque son posteriores (reconciliación del modelo, brief §11, 2026-09-06): (1) una supermeta ahora tiene su propio `targetSeconds`/`achievedSeconds`/`status` (§2.1) — sin un ancla, ese dato desaparece de la vista en el momento exacto en que el usuario "entra" a mirar el detalle de esa supermeta, que es precisamente cuando más querría verlo; (2) el breadcrumb ya resuelve la navegación de vuelta, así que el ancla no necesita duplicar esa función y puede dedicarse por completo a mostrar y personalizar la supermeta misma.

Reglas del nodo ancla:

- **Fijo en el centro** de la vista (`x: 0, y: 0`), `fixed: true` en la física (§7) — nunca se arrastra, nunca tiene entrada en `positions`.
- **Radio `ANCHOR_RADIUS`** (§6), el mayor de los tres — es el "sol" de esa subgalaxia.
- Pintado con el **mismo mapeo estado→visual** que cualquier meta (§9): glow si `completed`, lavado+X si `failed`, normal si `pending`.
- **No muestra badge de conteo** (ya se ven las metas hijas alrededor; mostrar el número sería redundante) — solo el badge de estado si aplica (§9, §11).
- Tocarlo abre su **hoja de personalización** (§10.2): skin propio del ancla y, junto a ella, su progreso (`achievedSeconds`/`targetSeconds`) como texto — no navega (para volver al nivel superior está el breadcrumb).
- Las metas hijas inician su espiral (§6) con `anchorRadius = ANCHOR_RADIUS + REPULSION_MARGIN` para no nacer superpuestas al ancla; la física de repulsión (§7) además la trata como un obstáculo fijo de radio `ANCHOR_RADIUS`, igual que a cualquier nodo que se está arrastrando.

En la vista **root** no hay ancla: el root no representa a ninguna supermeta, es la lista de nivel superior sin padre que anclar.

## 9. Estados visuales: cumplida, fallida, activa

Mapea directamente `WeeklyGoalStatus` (`02-DOMINIO.md` §3.1: `'pending' | 'completed' | 'failed'`) al tratamiento visual de la exploración — la palabra "activa" que usa la demo (`galaxia-metas.html`) es un rótulo ad hoc de la maqueta, no un valor del enum canónico; este documento la traduce a `pending`:

| `WeeklyGoal.status` | Tratamiento visual | Badge |
|---|---|---|
| `completed` | Resplandor (glow) suave detrás del planeta, color de acento del fondo activo (§10.1) | Check (✓) en tinta clara, esquina inferior-izquierda (§11) |
| `failed` | Overlay semitransparente del color de papel encima del planeta ("lavado") | X, misma esquina y tratamiento que `completed` |
| `pending` | Sin overlay ni glow — tratamiento normal | Sin badge de estado |

**Ampliación de este documento sobre la exploración** (que solo manejaba el estado binario final): mientras una meta está `pending` — la mayor parte de su vida útil, durante la semana en curso — su `achievedSeconds`/`targetSeconds` ya existe y cambia en vivo con cada bloque completado (`02-DOMINIO.md` §6.3). Un planeta `pending` muestra un **arco de progreso** delgado sobre el borde del planeta (relleno proporcional a `achievedSeconds / targetSeconds`, tope visual en 100 %) — motivación visual coherente con `01-SPEC.md` §2 principio 5, sin inventar ningún dato nuevo: es el mismo número que ya muestra Estadísticas (`01-SPEC.md` §6.13 RF-MET-02) resuelto en un lugar distinto. El arco desaparece en cuanto la semana cierra y el planeta pasa a `completed`/`failed` (el glow/lavado reemplaza al arco; no coexisten).

Regla de accesibilidad transversal (RNF-11, ya fijada): ningún estado se comunica solo por color — `completed`/`failed` siempre llevan su badge de icono (✓/X); el progreso de un planeta `pending` siempre puede consultarse como número exacto en la hoja de personalización (§10) o en la vista de lista (§14), no solo como arco visual.

## 10. Personalización visual: fondos y skins

### 10.1 Fondo por vista

Cada vista (`root` y cada subgalaxia) tiene su propio `backgroundId?` en su `GalaxyViewLayout` (§2.2, cita `02-DOMINIO.md` §3.5) — cambiar el fondo del root nunca afecta el de una subgalaxia y viceversa, igual que la exploración ("se eligen por vista... la galaxia principal y cada supermeta recuerdan el suyo"). Selector: swatches horizontales en la barra superior de la vista (uno por `assetId` de fondo, §4.2), con un candado visual sobre los que el usuario todavía no posee (tocar uno bloqueado muestra "Disponible en la Tienda" y no cambia el fondo — mismo patrón que la exploración usa para skins bloqueadas).

### 10.2 Skin por planeta

Cada `WeeklyGoal` (hoja, supermeta o el ancla que la representa dentro de su propia subgalaxia — son la misma entidad, §2.1, §8.2) tiene su propio `skinId?`. Tocar un planeta que **no** es supermeta (o el nodo ancla) abre una hoja de personalización con la grilla de 5 skins (§4.3); tocar una supermeta **cerrada** (vista desde su galaxia contenedora) navega a su subgalaxia en cambio (§5.2) — para editar el skin de una supermeta hay que entrar a su subgalaxia y tocar su ancla.

### 10.3 Resolución y fallback

Cita `02-DOMINIO.md` §3.5: si `skinId`/`backgroundId` no resuelve contra un `InventoryItem` del usuario ni contra un asset marcado `default` en el catálogo (§4), el renderer usa `skin_liso`/el fondo por defecto del tema activo (§4.2) — nunca falla, nunca muestra un planeta sin skin.

## 11. Resolución de conflictos de diseño (badges y nodo ancla)

`01-mockups/desktop/decisiones-visuales-galaxia.md` señala dos conflictos sin resolver: la posición de los badges y el nodo ancla. El nodo ancla ya se resolvió en §8.2; esto cierra el de los badges.

**Geometría**: cada badge es un círculo de radio fijo `BADGE_RADIUS = 0.022` (unidades normalizadas, §2.2 — no proporcional al radio del planeta: mismo tamaño legible en una meta simple que en una supermeta, igual que la exploración usa 8 px fijos tanto para `r=18` como para `r=26`), centrado a `0.72 × radio` del centro del planeta, en la esquina indicada:

| Badge | Aplica a | Esquina | Contenido |
|---|---|---|---|
| Estado | Cualquier `WeeklyGoal` con `status !== 'pending'` (hoja, supermeta o ancla) | Inferior-izquierda | Check (✓) o X, según §9 |
| Conteo de hijas | Solo supermeta **cerrada** (vista desde su galaxia contenedora) | Superior-derecha | Número de metas hijas |

Las dos esquinas usadas (inferior-izquierda, superior-derecha) son **diagonalmente opuestas**: la distancia entre sus centros es `2 × 0.72 × radio × √2 ≈ 2.04 × radio`, muy por encima de `2 × BADGE_RADIUS` para cualquier radio de este documento (`PLANET_RADIUS = 0.06` en adelante, §6) — los dos badges nunca se solapan geométricamente, incluida una supermeta cerrada con `status !== 'pending'` que necesita ambos a la vez (el caso que la exploración señalaba como sin resolver, porque en su demo ninguna supermeta de ejemplo tenía `status`). El nodo ancla (§8.2) nunca muestra el badge de conteo, así que dentro de una subgalaxia nunca compite por esquina con su propio badge de estado.

## 12. Implementación técnica (Reanimated + Gesture Handler + SVG)

### 12.1 Dependencia nueva: `react-native-svg`

El canvas 2D de la exploración (`<canvas>` + `CanvasRenderingContext2D`) no existe en React Native. `react-native-svg` **no está instalada todavía** (verificado contra `productvt-beta/package.json` y `node_modules/`; brief §11 ya anticipaba "SVG/Views" como técnica de renderizado). Se agrega en la fase de Metas/Galaxia con `npx expo install react-native-svg` (paquete MIT, sin costo, con soporte web vía `react-native-web` — funciona igual en Android, web y desktop-PWA). No compromete el costo cero del proyecto (`01-SPEC.md` §8.3): es una librería, no un servicio.

### 12.2 Estructura de componentes

```
src/features/goals/components/
  GalaxyView.tsx          // canvas SVG + loop de física, recibe la vista actual (root o subgalaxia)
  PlanetNode.tsx           // un <G> SVG: círculo con gradiente + skin (§10) + badges (§11) + etiqueta
  AnchorNode.tsx            // nodo ancla (§8.2): mismo PlanetNode con fixed=true y sin badge de conteo
  BackgroundLayer.tsx       // fondo de la vista (§10.1): color sólido + capa de estrellas decorativas
  BackgroundPicker.tsx      // swatches de fondo (§10.1)
  SkinSheet.tsx             // hoja de personalización de skin (§10.2), reutilizada por planeta y ancla
  ResetLayoutButton.tsx     // dispara §7.3
  GoalListView.tsx          // alternativa de lista (§5.3, §14)
```

- **`GalaxyView`**: un `SharedValue<PlanetPhysicsNode[]>` por vista, actualizado en un `useFrameCallback` (Reanimated corre el worklet en el hilo de UI, no bloquea JS) que llama `stepGalaxyPhysics` (§7) en cada frame con el `dtMs` real que entrega el callback — evita depender de que el dispositivo esté a 60 Hz exactos (§7, `frames = dtMs / 16.7`).
- **Gesto por nodo**: `Gesture.Pan()` de `react-native-gesture-handler`, con `minDistance` para la disambiguación tap/drag (§7.1); durante `onUpdate` escribe directamente sobre el `SharedValue` compartido (worklet, sin cruzar al hilo de JS en cada frame de arrastre); `onEnd` decide tap vs. drag y, si es drag, hace `runOnJS` una sola vez para persistir (§7.2).
- **Renderizado**: cada `PlanetNode` es un grupo SVG (`<G transform="translate(x,y)">`) cuya posición se anima leyendo el mismo `SharedValue` vía `useAnimatedProps` — sin re-render de React por frame, solo actualización de propiedades nativas (mismo patrón que cualquier animación de Reanimated con SVG).
- **Zoom/pan del lienzo** (necesario en teléfono, donde la vista completa no siempre cabe cómodamente): `Gesture.Pinch()` + `Gesture.Pan()` a nivel de `GalaxyView` completo, compuestos con `Gesture.Race()` contra el gesto por-nodo de arriba, de modo que arrastrar *sobre* un planeta lo mueve a él y arrastrar sobre el fondo mueve la cámara — mismo patrón que cualquier lienzo infinito tipo Obsidian/Miro.

### 12.3 Repositorios (sin excepciones a la regla del brief §7)

`GalaxyLayoutRepository` y `InventoryRepository` (nombres ya fijados en `02-DOMINIO.md` §5.1) son los únicos que importan `firebase/firestore` para estas dos colecciones — `GalaxyView` y el resto de componentes de `src/features/goals/` solo llaman a estos repositorios o a los hooks que los envuelven, nunca a Firestore directo.

## 13. Web/desktop: modo gestión

La galaxia **no** es una función del cronómetro activo — es visualización y gestión de metas, igual que Calendario o Estadísticas (`01-SPEC.md` §9.2; `02-DOMINIO.md` §7: `layouts/galaxy`/`inventory` son "Sí/Sí/Sí" en Android/Web/Desktop-PWA). No requiere ser dominante ni tiene ninguna restricción de plataforma (a diferencia del cronómetro, §6.17 de `01-SPEC.md`).

- **Interacción**: `react-native-gesture-handler` traduce el mismo `Gesture.Pan`/`Gesture.Pinch` a eventos de puntero del navegador (mouse-drag para arrastrar un planeta, rueda/pellizco de trackpad para zoom) — sin código distinto por plataforma en la lógica de gestos.
- **Densidad de pantalla**: en desktop, con más espacio, `SPIRAL_MAX_RADIUS` (§6) puede ocupar el lienzo completo sin necesidad de zoom inicial; en teléfono, el zoom/pan de §12.2 es la forma primaria de explorar una galaxia con muchas metas. Ninguna constante de layout cambia por plataforma — es el mismo `viewport.width`/`.height` (§2.2) el que varía.
- **Sin degradación funcional**: crear, arrastrar, restablecer, cambiar skin/fondo y navegar subgalaxias funciona idéntico en las tres plataformas — ninguna fila de este documento en la matriz de plataformas de `02-DOMINIO.md` §7 distingue Android de web/desktop.
- **Vista de lista** (§5.3, §14) es igual de completa en las tres plataformas — en desktop, además, es la vía más rápida para editar varias metas seguidas (formularios con teclado y mouse, sin depender del gesto de arrastre).

## 14. Accesibilidad

Un lienzo interactivo de arrastre libre es, por naturaleza, difícil de operar con teclado o lector de pantalla — la exploración (`galaxia-metas.html`) no intenta resolverlo (`<canvas>` puro, sin ningún atributo ARIA ni manejo de teclado). Este documento no hereda esa omisión: cumple RNF-11 (`01-SPEC.md` §8.5, WCAG 2.1 AA de referencia) con una estrategia de **camino equivalente**, no de "arreglar" el lienzo.

- **Vista de lista como alternativa completa**: el alternador "Galaxia / Lista" (§5.1, §5.3) no es una vista reducida — expone exactamente las mismas acciones (ver nombre/progreso/estado de cada meta, entrar a una subgalaxia como una sublista expandible, cambiar skin, cambiar fondo de la vista; "Restablecer orden" no aplica en lista, por no tener layout que restablecer). Es la vía primaria para teclado y lector de pantalla: componentes RN estándar (`Pressable`, texto), orden de tabulación natural, sin necesidad de que el SVG del lienzo sea operable.
- **Mejor esfuerzo en el lienzo**: cada `PlanetNode`/`AnchorNode` (§12.2) lleva `accessibilityRole="button"` y `accessibilityLabel` con nombre, categoría, estado y progreso (p. ej. "Cálculo 3, meta, 7 de 10 horas, en curso") para que un lector de pantalla que sí explore el lienzo obtenga información útil — sin que esto sea la única vía (la lista de arriba lo es).
- **`reduceMotion`** (RF-TEM-03, ya fijado): con la preferencia activa, la física de resorte/repulsión (§7) se apaga — un nodo movido o un "Restablecer orden" coloca los nodos directamente en su posición final, sin animación de varios frames; el parpadeo decorativo de fondo (estrellas, si el fondo activo lo incluye) también se detiene.
- **Color nunca es la única señal**: los estados `completed`/`failed` siempre llevan su badge de icono (✓/X, §9, §11), nunca dependen solo del glow o el lavado — ya es la regla general de `01-SPEC.md` §8.5 RNF-11, aplicada aquí sin excepción.
- **Contraste**: los 5 fondos y sus tokens de acento (§4.2) son los mismos ya validados para el resto de la app (skin "Papel", `01-SPEC.md` §6.15 RF-TEM-02) — ningún fondo de este documento introduce una combinación de color nueva sin pasar por esa validación.

## 15. Interacción con estrellas y estadísticas

La galaxia **no calcula nada que Estadísticas no calcule ya** — es un renderizador alternativo sobre las mismas `WeeklyGoal` (§2.1). Concretamente:

- El `achievedSeconds`/`targetSeconds`/`status` de cada planeta (§9) es el mismo dato que la fila de esa categoría muestra en la vista "Estadísticas por categoría" (agregación derivada ya definida en brief §11 y `07-CALENDARIO-ESTADISTICAS-METAS.md` §3) — no hay una segunda función de cálculo específica de la galaxia.
- La **estrella mensual** (`01-SPEC.md` §6.13 RF-MET-04, `07-CALENDARIO-ESTADISTICAS-METAS.md` §3) alimenta directamente `monthsWithStar` del catálogo de recompensas (§3.2) — es la misma función, reutilizada, no reimplementada.
- Tocar un planeta desde la galaxia puede llevar directamente al detalle de esa meta en Estadísticas (mismo tipo de detalle que RF-SES-03 describe para sesiones, aplicado a metas) — atajo de navegación, no una vista de datos distinta.
- La **racha** (`currentStreakDays`, §3.1), a diferencia de lo que asumía una versión anterior de este documento, **no** es exclusiva de la Tienda: es `computeCurrentStreakDays`, propiedad de `07-CALENDARIO-ESTADISTICAS-METAS.md` (brief §12.6), consumida en Estadísticas y en el hub de Inicio (esquina superior) igual que aquí. Este documento no la define ni la muestra por primera vez — solo la lee para gatear `chestsEarned` y el catálogo de recompensas (§3-§4); si el número de racha visible en Inicio/Estadísticas cambia alguna vez de fórmula, cambia en `07-CALENDARIO-ESTADISTICAS-METAS.md` y este documento hereda el nuevo valor sin tocar una sola línea propia.

## 16. Casos de prueba

Todas ejecutables como tests de dominio (Vitest, `src/domain/**`) salvo donde se indique explícitamente vista/UI.

| ID | Escenario | Acción | Resultado esperado |
|---|---|---|---|
| CP-GAL-01 | Vista con 12 metas sin posición guardada | `defaultGoalPosition(i)` para `i = 0..11` | Ángulos distintos (múltiplos de 137.5°), radios crecientes (`√(i+1)`), ninguna posición coincide entre sí (§6) |
| CP-GAL-02 | Un viewport de 375×812 (teléfono) | `toGalaxyPosition(toScreenPoint(p, vp), vp)` para varios `p` | Devuelve `p` exacto (round-trip sin pérdida) (§2.2) |
| CP-GAL-03 | Meta `m1` arrastrada en el root y en su propia subgalaxia (no aplica, pero `m2` arrastrada en el root y `m3` en una subgalaxia distinta) | Persistir ambas posiciones | `positions` del root contiene solo `m2`; `subgalaxies[x].positions` contiene solo `m3`; ninguna vista ve la entrada de la otra (§7.2) |
| CP-GAL-04 | Root con 2 metas movidas y `backgroundId: 'bg_anil'` | Tocar "Restablecer orden" | `root.positions` queda vacío; `root.backgroundId` sigue `'bg_anil'`; ningún `WeeklyGoal.skinId` cambia (§7.3) |
| CP-GAL-05 | Supermeta `sup` con 3 hijas (`parentGoalId === sup.id`) | Renderizar `sup` desde el root | Badge de conteo muestra `3`; agregar una 4ª hija sin ninguna migración hace que el badge muestre `4` en el siguiente render (§8.1, §11) |
| CP-GAL-06 | Subgalaxia de `sup` con el nodo ancla | Ejecutar `stepGalaxyPhysics` varios frames con el ancla incluida en `nodes` | `ancla.x === 0 && ancla.y === 0` en todos los frames; nunca aparece una entrada para el ancla en `positions` (§7, §8.2) |
| CP-GAL-07 | Ancla con `status: 'failed'` | Renderizar el nodo ancla | Muestra badge de estado (X) en la esquina inferior-izquierda; no muestra ningún badge de conteo (§8.2, §11) |
| CP-GAL-08 | Los tres radios (`PLANET_RADIUS`, `SUPER_PLANET_RADIUS`, `ANCHOR_RADIUS`) | Calcular la distancia entre el centro del badge de estado (inferior-izquierda) y el de conteo (superior-derecha) para cada radio | La distancia (`2 × 0.72 × r × √2`) es siempre `≥ 2 × BADGE_RADIUS`: nunca se solapan (§11) |
| CP-GAL-09 | Metas con `status` `completed`, `failed` y `pending` (esta última con `achievedSeconds = 0.4 × targetSeconds`) | Renderizar cada una | `completed`→glow + check; `failed`→lavado + X; `pending`→sin overlay, arco de progreso al 40 % (§9) |
| CP-GAL-10 | `WeeklyGoal.skinId = 'skin_inexistente'` y `GalaxyViewLayout.backgroundId = 'bg_inexistente'` | Renderizar el planeta y la vista | Cae a `skin_liso` y al fondo por defecto del tema activo, sin lanzar error (§10.3) |
| CP-GAL-11 | `currentStreakDays = 27` (ya calculado por `computeCurrentStreakDays`, no por este documento) | `computeChestsEarned(27)` | Devuelve `3` — `chestsEarned` no llega a `4`, `streak_4` permanece bloqueado (§3.1) |
| CP-GAL-12 | `currentStreakDays = 28` (justo un múltiplo de 7) | `computeChestsEarned(28)` | Devuelve `4` — cruza el umbral exacto de `streak_4` (`chestsEarned >= 4`, §3.2); `currentStreakDays = 29` sigue devolviendo `4` (no vuelve a subir hasta `35`) |
| CP-GAL-13 | `currentStreakDays = 28` (`chestsEarned = 4`) ya evaluado una vez (ítem `streak_4` ya otorgado) | Volver a evaluar `ACHIEVEMENT_DEFINITIONS` con el mismo `RewardEvalContext`, en el mismo dispositivo y en otro | `grantInventoryItem(uid, item)` se llama de nuevo pero el documento resultante es idéntico (mismo `id`); no aparecen dos `InventoryItem` para el mismo `assetId` (§3.3) |
| CP-GAL-14 | Usuario sin `InventoryItem` para `skin_cometa` (`currentStreakDays = 20`, `chestsEarned = 2`) | Intentar aplicar `skin_cometa` a una meta desde la hoja de personalización | La UI muestra "Disponible en la Tienda" y no modifica `WeeklyGoal.skinId`; el valor anterior se conserva (§4.3, §10.2) |
| CP-GAL-15 | Un conjunto fijo de `WeeklyGoal` (con jerarquía y estados variados) | Renderizar la vista de Galaxia y la vista de Lista sobre el mismo conjunto | Ambas vistas exponen el mismo conjunto de metas con el mismo nombre/estado/progreso — ninguna acción disponible en Galaxia falta en Lista (§5.3, §14) |

## 17. Preguntas abiertas para el creador

Ninguna de estas bloquea la implementación (todas tienen un default razonable ya aplicado en este documento, listado en "Supuestos pendientes de confirmar") — son puntos donde el creador podría preferir algo distinto de lo que este documento asumió:

1. **¿Cuánta interactividad de la galaxia embebida en Inicio entra ya a V1?** La pestaña Inicio con la galaxia embebida como contenido principal ya está confirmada para V1 (brief §12.5, §1.2) — lo que sigue abierto es si el creador quiere la interactividad completa que diseña este documento (arrastre, subgalaxias, personalización de fondo/skin, Tienda con economía de desbloqueo, supuesto pendiente #6 de `01-SPEC.md`) también desde V1, o si el hub de Inicio puede mostrar en V1 una disposición más simple (por defecto, sin arrastre) mientras esa interactividad llega en V1.1 — este documento queda listo para construirse en cualquiera de los dos momentos sin cambios.
2. **Nodo ancla** (§8.2): este documento decide agregar un "sol" central no arrastrable dentro de cada subgalaxia. ¿Coincide con lo que el creador imaginaba, o prefiere que la exploración original (solo breadcrumb, sin nodo central) se mantenga tal cual?
3. **Umbrales de desbloqueo** (§4.2, §4.3: `chestsEarned` de 4/8/12 — múltiplos de 7 días de la racha canónica, equivalentes a 28/56/84 días de estudio; logros de 1/3 meses con estrella): son un default razonable de este documento, no una cifra pedida por el creador — ¿le parecen bien esos números, muy exigentes o muy laxos para el ritmo real de uso?
4. **Colecciones sin efecto funcional** (§4.4): este documento las define como una vitrina de insignias sin aplicación visual directa en la galaxia. ¿Alcanza así, o el creador espera que una colección desbloquee algo más (p. ej. un fondo o skin exclusivo que ningún logro individual otorga)?
5. **Reparto de fondos gratis por tema** (§4.2: "Papel crema" en claro, "Papel noche" en oscuro, gratis ambos): ¿de acuerdo con que sean dos assets gratuitos en vez de uno solo, dado que resuelve la necesidad de un fondo coherente con el modo oscuro desde el primer uso?

(La pregunta sobre qué corta o no la racha ante una semana sin metas ya no aplica a este documento: la racha es `computeCurrentStreakDays`, propiedad de `07-CALENDARIO-ESTADISTICAS-METAS.md` — brief §12.6 — y no depende de `WeeklyGoal` en absoluto; cualquier pregunta sobre su definición exacta pertenece a ese documento, no a este.)

## Supuestos pendientes de confirmar

Todo lo que sigue es diseño propio de este documento (no hay respuesta literal del creador ni default ya fijado en otro documento del canon), con su default ya aplicado arriba y qué pasa si el creador decide distinto.

| # | Supuesto | Default asumido en este documento | Si el creador decide distinto |
|---|---|---|---|
| 1 | Sistema de coordenadas de `GalaxyPosition` (§2.2) | Normalizado, `1.0 = min(viewportWidth, viewportHeight) / 2`, origen en el centro de la vista | Concretiza lo que `02-DOMINIO.md` §3.5 deja abierto ("el renderer escala"); cambiarlo es solo ajustar `toScreenPoint`/`toGalaxyPosition`, sin tocar el campo persistido |
| 2 | Catálogo completo y umbrales de desbloqueo (§4.2-§4.4): qué fondos/skins/colecciones existen y qué `chestsEarned` (múltiplo de 7 días de la racha canónica) o logro los desbloquea | Tabla de §4, completamente inventada por este documento — el creador no la ha visto todavía | Cambia solo `src/constants/galaxy-catalog.ts`; no afecta `InventoryItem` ni ninguna interfaz de `02-DOMINIO.md`; tampoco afecta la definición de la racha misma, que vive en `07-CALENDARIO-ESTADISTICAS-METAS.md` |
| 3 | Dos fondos gratis por defecto, uno por modo claro/oscuro (§4.2, §4.5) | `bg_papel_crema` (claro) y `bg_papel_noche` (oscuro), ambos `source: 'default'` | Reducirlo a un solo fondo gratis (p. ej. solo "Papel crema") deja al modo oscuro sin opción coherente desde el primer uso hasta desbloquear algo — este documento lo evita a propósito |
| 4 | Nodo ancla central no arrastrable dentro de cada subgalaxia (§8.2) | Implementado como se describe: fijo, radio `ANCHOR_RADIUS`, con el mismo mapeo de estado que cualquier meta | Si el creador prefiere sin ancla (solo breadcrumb, como la exploración original), se elimina el componente `AnchorNode` y el desplazamiento `anchorRadius` de `defaultGoalPosition`; no hay campo de datos que revertir, porque el ancla nunca tuvo entrada propia en `positions` |
| 5 | Posición de badges: conteo arriba-derecha, estado abajo-izquierda (§11) | Resuelve el conflicto que `decisiones-visuales-galaxia.md` dejaba señalado | Cualquier otro par de esquinas diagonalmente opuestas cumple la misma garantía geométrica; solo cambiaría la constante de posición en `PlanetNode` |
| 6 | `react-native-svg` como dependencia nueva (§12.1) | Se agrega en la fase de Metas/Galaxia, sin costo (MIT, sin servicio asociado) | Ninguna alternativa evidente para SVG declarativo en RN — de no adoptarse, habría que evaluar `react-native-skia` u otra librería de dibujo, con el mismo costo cero pero una API de componentes distinta |
| 7 | Vista de lista como fallback de accesibilidad primario (§14) | Alternador "Galaxia / Lista" con paridad total de acciones | Si el creador considera innecesaria la lista (galaxia siempre visible), RNF-11 exigiría en cambio hacer el lienzo mismo navegable por teclado — bastante más costoso de construir que una lista paralela |
| 8 | Alcance V1 vs. V1.1 de la **interactividad** de este documento (§1.2) — la pestaña Inicio con galaxia embebida ya NO es un supuesto, está confirmada para V1 (brief §12.5) | El contenido de §5-§14 (arrastre, subgalaxias, personalización, Tienda) es V1.1, salvo confirmación explícita del creador de adelantarlo | Cubierto por el supuesto pendiente #6 de `01-SPEC.md`, ahora parcialmente resuelto por brief §12.5 (ver §1.2) — solo queda abierta la profundidad de interactividad, no la existencia de la pestaña |

## Trazabilidad

| Sección de este documento | Regla / decisión | Fuente(s) |
|---|---|---|
| §1 — Qué pidió el creador y alcance por versión | Cinco requisitos originales; reparto V1 (ganchos + pestaña Inicio con galaxia embebida) / V1.1 (interactividad completa + Tienda) | R20, B §11, B §12.5 (5 pestañas, Inicio confirmado), D "Alcance — Galaxia", `01-SPEC.md` §9.1-9.2, `nueva-funcionalidad-galaxia-tienda.md`, `01-mockups/mobile/inicio.html` |
| §2 — Modelo de datos ya fijado | `WeeklyGoal` uniforme hoja/supermeta; `GalaxyLayout`/`InventoryItem` citados; sistema de coordenadas normalizado (concretización propia) | B §11, `02-DOMINIO.md` §2.6, §3.3, §3.5, §3.6, §4 I-16, §5.1, CODE (`weekly-goal.ts` as-built sin estos campos todavía) |
| §3 — Racha y logro | Racha consumida, no redefinida (`computeCurrentStreakDays`, propiedad de `07-CALENDARIO-ESTADISTICAS-METAS.md`); `chestsEarned`, logro y otorgamiento son diseño nuevo de este documento, sin colección Firestore adicional | Brief §12.6 (racha canónica, "la Tienda solo la lee"), R7, D7, `01-SPEC.md` §3.5, `02-DOMINIO.md` §3.5 (`InventoryAcquisitionSource`) |
| §4 — Catálogo estático y recompensas | Fondos/skins/colecciones y sus umbrales; assets gratis por defecto | `decisiones-visuales-galaxia.md`, `galaxia-metas.html`, `_brief-orquestador.md` §8, `02-DOMINIO.md` §8 fila 4 y 6, `01-SPEC.md` §3.3 punto 5 |
| §5 — Vistas: galaxia principal y subgalaxia | Root vs. subgalaxia, breadcrumb, la galaxia no reemplaza el formulario de metas | B §11, `02-DOMINIO.md` §3.5, `01-SPEC.md` §6.13 RF-MET-01, I-16 |
| §6 — Layout por defecto: espiral áurea | Ángulo dorado, radio `√índice`, radios de planeta | `decisiones-visuales-galaxia.md`, `galaxia-metas.html` (`defaultPosFor`) |
| §7 — Física de arrastre y "Restablecer orden" | Resorte + repulsión + amortiguación; disambiguación tap/drag; alcance del reset | `decisiones-visuales-galaxia.md`, `galaxia-metas.html` (`frame`, `resetBtn`), D14, `02-DOMINIO.md` §3.5 |
| §8 — Supermeta cerrada, abierta y nodo ancla | Anillo orbital y badge de conteo (cerrada); nodo ancla resuelto por este documento (abierta) | `decisiones-visuales-galaxia.md` (decisión abierta), brief §11 (reconciliación de modelo) |
| §9 — Estados visuales | Glow/lavado/normal; arco de progreso para `pending` (ampliación propia) | `decisiones-visuales-galaxia.md`, `galaxia-metas.html` (`drawPlanet`), `02-DOMINIO.md` §3.1, `01-SPEC.md` §6.13 RF-MET-02, §2 principio 5 |
| §10 — Personalización visual | Fondo por vista, skin por planeta, resolución con fallback | `decisiones-visuales-galaxia.md`, `02-DOMINIO.md` §3.5 |
| §11 — Resolución de conflictos de diseño | Geometría de badges en esquinas opuestas; nodo ancla (cruce a §8) | `decisiones-visuales-galaxia.md` (conflicto señalado), CODE (`galaxia-metas.html` `drawPlanet`, geometría real difiere de lo escrito en la exploración) |
| §12 — Implementación técnica | `react-native-svg` nuevo; estructura de componentes; física en `useFrameCallback` | B §11 ("Reanimated + Gesture Handler + SVG"), CODE (`package.json`, `node_modules` sin `react-native-svg`) |
| §13 — Web/desktop: modo gestión | Sin restricción de plataforma, mismos gestos vía puntero | `01-SPEC.md` §9.2, §6.17, `02-DOMINIO.md` §7 |
| §14 — Accesibilidad | Vista de lista como camino equivalente; `reduceMotion`; color nunca única señal | `01-SPEC.md` §8.5 RNF-11, RF-TEM-03 |
| §15 — Interacción con estrellas y estadísticas | La galaxia reutiliza el cálculo de Estadísticas/Metas sin duplicarlo | `01-SPEC.md` §6.13 RF-MET-02/04, `07-CALENDARIO-ESTADISTICAS-METAS.md` §3 |
| §16 — Casos de prueba | 15 casos, dominio puro salvo CP-GAL-14/15 (UI) | Deriva de §2-§14 de este documento |
| §17 — Preguntas abiertas | 6 preguntas sobre decisiones propias de este documento, ninguna bloqueante | Este documento |
| Supuestos pendientes de confirmar | 9 supuestos, todos con default ya aplicado | Este documento |

Trazabilidad transversal: todo el documento se apoya en que `01-SPEC.md` y `02-DOMINIO.md` ya fijaron el alcance por versión y el esquema base (`WeeklyGoal.parentGoalId?/skinId?`, `GalaxyLayout`, `InventoryItem`) — sin eso, ninguna sección de este documento habría podido evitar redefinir el modelo de datos.


## Enmienda v3 (2026-09-14) — feedback del creador tras revisar los mockups interactivos

Fuente y autoridad: `03-requisitos/decisiones-tomadas.md` sección **v3 (2026-09-14)** (con prioridad sobre este documento hasta que esta enmienda se incorpore orgánicamente a las secciones correspondientes). Esta sección NO reescribe el cuerpo del documento: agrega las reglas nuevas que lo afectan y señala las que lo corrigen.

### Comportamiento de la galaxia confirmado por el creador (v3 §E)

1. **Alcance exclusivo**: la galaxia representa **solo supermetas y metas** — cada supermeta es un **planeta**, sus metas son **mini-planetas** conectados como subramas (v3 §E1).
2. **Interacción tipo Obsidian Graph View**: gravedad y vínculos con la misma sensación interactiva (v3 §E2).
3. **Proporción considerable supermeta:meta** — desde la vista general las metas se ven **apenas, como estrellas** (v3 §E3).
4. **Orden circular por defecto**: orden de **creación, sentido horario**; es el orden que restaura el botón **"Restablecer"** (v3 §E4).
5. **Arrastre**: la supermeta arrastrada cambia su posición relativa; mientras se arrastra puede tomar posiciones anómalas, pero **al soltar se acomoda automáticamente** en la posición coordinada con más sentido y **empuja a las demás** (v3 §E5).
6. **Vista de foco**: clic en una supermeta → **pantalla completa** sin las demás supermetas; el planeta ocupa **la mitad de la pantalla** y sus metas se ven con mayor resolución y tamaño orbitando el planeta central (v3 §E6).
7. **Persistencia de posiciones** en ambas vistas, salvo reseteo explícito de la vista (v3 §E7).
8. **Antimetas ocultas por defecto**; un botón las hace aparecer **bien pequeñas** (v3 §E8).
9. **Botón "crear"** = hotkey, sin cambios (v3 §E9).
10. **HUD decorativo**: Ajustes y amigos sin funcionalidad por ahora (v3 §F2). La Tienda no cambia en esta enmienda.


### Añadido v3.1 (2026-09-14) — segunda pasada del creador

Refinamientos posteriores a esta enmienda, registrados como **v3.1** en `03-requisitos/decisiones-tomadas.md` (§H–§K, autoridad vigente). Los puntos que tocan directamente a este documento:
- I1: lunas orientadas hacia abajo con equidistancia. I2: reorden animado al soltar (sin teletransportes). I3: en foco, las metas orbitan pegadas al borde del planeta. I6/I7: plazo por meta/supermeta (máx. 1 año) e indicador % de tareas cumplidas. I8: título = nombre editable (mini lápiz) + % + botón de configuración al panel de gestión (J4).
