# 06 — Diseño de UI: sistema de diseño, skins intercambiables y pantallas

## Propósito

Este documento fija el **sistema de diseño** de Productvt Beta y la especificación **pantalla por pantalla** de la UI: la arquitectura de tokens + skins + `AssetRegistry` que hace que "cambiar los gráficos" sea cambiar un skin sin tocar lógica ni componentes (brief §8); la API TypeScript de `ThemeProvider`/`AssetRegistry`; el skin base "Papel" con sus tokens completos claro/oscuro; las reglas de layout responsive (breakpoints concretos, qué cambia en cada uno); el inventario de componentes reutilizables con sus props; y la especificación de cada pantalla (estados vacío/carga/error, view model que consume, copys) para Autenticación, Cronómetro (en sus 10 estados + espectador + cambio de dominante + selección de descanso + cancelación), Temporizador inverso, **Calendario por capas** (la ampliación más reciente del alcance, brief §12), Estadísticas y Ajustes. Cierra con microinteracciones, accesibilidad y la tabla de copys en español.

No redefine tipos ni reglas de negocio de dominio — esos son de `02-DOMINIO.md`, `03-CRONOMETRO.md` y `04-SINCRONIZACION.md`, ya escritos y completos, que este documento cita por sección y no repite. Este documento es dueño de una sola pieza de modelo: el `AssetRegistry` (`02-DOMINIO.md` §3.5 y `10-GALAXIA-Y-TIENDA.md` ya lo citan como "de `06-DISENO-UI.md`" sin definirlo) y, como adición menor de UI, `CalendarViewMode`/`UserSettings.defaultCalendarView?` (§11, §13), siguiendo el mismo patrón de "adición propuesta, compatible hacia atrás" que usa `02-DOMINIO.md` §3.3. El destinatario es quien construya la Fase de UI/Fundación visual y, en particular, quien retome la Fase 7 (Calendario) de `BC Orquestador Productvt` — hoy en Fase 4b, todavía no llega a Calendario, así que el modelo de capas entra al canon a tiempo (brief §12).

## Fuentes

Orden de autoridad (si dos fuentes chocan, gana la de arriba; ver también el orden general en `_brief-orquestador.md` y el mensaje del orquestador que encargó este documento):

1. Respuestas literales del creador — anexo de `_brief-orquestador.md` (`R7`: recompensa solo por constancia, relevante para qué assets son gratis; `R14`: modelo dominante/espectador y su diálogo "¿Quieres tomar el control?"; `R20`: "construir algo completo, funcional y perfecto en términos técnicos y del funcionamiento de galaxias de la pantalla principal, layout y etc." — mandato general de calidad visual que este documento operacionaliza para las pantallas de V1; `R23`: "el orden que prefieras según lógica" — usado para la numeración de secciones de este documento).
2. `03-requisitos/decisiones-tomadas.md` v2 (`D1.b`: fricción de cancelación sin cambios pero **sin elementos punitivos de UI** — ver §9.6; `D6`: color vivo, ninguna capa tiene color propio; nota de vocabulario "¿Cancelar sesión?").
3. `_brief-orquestador.md` revisado 2026-09-06, en particular §8 (sistema de diseño y gráficos intercambiables, skin "Papel", tokens exactos, tipografías, componentes a formalizar) y §12 (Calendario por capas: modelo de datos completo, 5 vistas, plataformas primarias ambas, vista por defecto configurable, densidad como problema de este documento).
4. Código commiteado en `productvt-beta/src/domain/**` y `productvt-beta/src/**` (etiqueta `CODE`): verdad para nombres de tipos y campos. En particular, `src/constants/theme.ts`, `src/hooks/use-theme.ts`, `src/components/themed-text.tsx` y `themed-view.tsx` son el andamiaje as-built de Fase 1-2 (paleta genérica blanco/negro, sin skins, sin las tipografías del mockup): este documento fija su reemplazo/evolución hacia el sistema de tokens de §2-§4, conservando la API pública de `ThemedText`/`ThemedView` (`type`, `themeColor`) donde es sana (gobierno del brief: "donde el código ya commiteado sea sano y solo difiera en nombres... el canon adopta lo construido; donde el código contradiga una decisión del creador, se corrige el código" — la paleta genérica sí contradice el mandato explícito de skin "Papel" de brief §8, así que se corrige su contenido, no su forma). `src/i18n/es.ts` (`timerCopy`, `DEFAULT_CANCELLATION_PHRASE`) es la fuente de los copys ya fijados del cronómetro; este documento los cita y añade los que faltan (calendario, estadísticas, ajustes) en la misma tabla (§16). No hay librería de íconos vectoriales instalada (`package.json` revisado: solo `expo-image`, `expo-font`, `react-native-reanimated`/`gesture-handler`/`worklets`) — precedente as-built en `cancellation-phrase-editor.tsx` (usa el glifo "✏️" en vez de sumar una dependencia): este documento adopta esa misma convención de iconografía tipográfica para todo el sistema (§2, §7).
5. `docs/01-SPEC.md`, `02-DOMINIO.md` (ya incluye `CalendarLayer` y `WeeklyGoal.layerVisible`/`.name`/`.skinId`/`.parentGoalId`, §3.3, §3.5), `03-CRONOMETRO.md` (§1 los 10 `TimerStateName`; §8.1/§8.3 cancelación; §12 temporizador inverso) y `04-SINCRONIZACION.md` (§5 solicitud y cambio de dominante, con el diagrama de secuencia completo del diálogo) — ya escritos y completos: se citan por sección, no se repiten. `07-CALENDARIO-ESTADISTICAS-METAS.md` y `10-GALAXIA-Y-TIENDA.md` están **en construcción en paralelo** (esqueletos con marcadores `PENDIENTE` al momento de escribir esto): donde este documento necesita una fórmula o agregación exacta de calendario/estadísticas/metas o el catálogo de la Tienda, la nombra a nivel de forma (view model de UI) sin comprometer el algoritmo exacto, que es responsabilidad de esos documentos.
6. `03-requisitos/revision-spec-beta.md`: sin hallazgos ALTO/MEDIO propios de UI/diseño visual (todos los suyos ya resueltos en `02-DOMINIO.md`/`03-CRONOMETRO.md`/`04-SINCRONIZACION.md`); solo aplica indirectamente donde pide "no depender exclusivamente del color para estados críticos" (§39 del SPEC v1, ya recogido en `src/constants/theme.ts` como comentario as-built) — este documento lo hace explícito en cada pantalla con estado crítico (§9, §15).
7. `03-requisitos/matriz-degradacion-plataformas.md`: confirma que Android es la única plataforma dominante y que web/desktop-PWA son espectadores sin alarma propia — este documento traduce esa asimetría a UI concreta (`RolePill`, controles deshabilitados, §9.2).
8. `03-requisitos/nueva-funcionalidad-calendario-por-capas.md` (requerimiento original, con sus 4 preguntas ya resueltas en el brief §12); `01-mockups/mobile/cronometro.html` (leído completo: fuente literal de los tokens de color/tipografía del skin "Papel", los componentes `RolePill`/anillo de progreso/`ChoiceChip`/hoja de cancelación, y el flujo pantalla-por-estado); `01-mockups/mobile/calendario.html` y `01-mockups/mobile/estadisticas.html` (mockups sin capas ni vista por defecto — anteriores al requerimiento del brief §12, usados solo como precedente de densidad visual: puntos "+N más", tarjetas de meta, sparkline); `01-mockups/desktop/galaxia-metas.html` (leído completo) + `01-mockups/desktop/decisiones-visuales-galaxia.md` (skins de planeta y fondos, con sus flags `locked`/Tienda): fuente del `AssetRegistry` de V1.1 que este documento solo mecaniza (el catálogo completo es de `10-GALAXIA-Y-TIENDA.md` §4); `03-requisitos/nueva-funcionalidad-galaxia-tienda.md` como contexto de por qué existe ese gancho.
9. Originales v1 (`docs/originales/SPEC-v1.md` §39, §29): mencionados por `02-DOMINIO.md`/`03-CRONOMETRO.md` solo como antecedente de "no depender solo del color" y modo oscuro; no se leen de nuevo aquí más allá de esas referencias ya resueltas.

Convención de citas en este documento: `R<n>` = respuesta del creador, `D <sección>` = `decisiones-tomadas.md`, `B §n` = `_brief-orquestador.md`, `CODE` = as-built, `MOCK-CRONO`/`MOCK-CAL`/`MOCK-STATS`/`MOCK-GALAXIA` = los mockups HTML citados arriba.

## 1. Filosofía visual

**Productvt Beta es un cuaderno, no un dashboard.** Los tres mockups leídos completos (`MOCK-CRONO`, `MOCK-GALAXIA`, y por extensión `MOCK-CAL`) convergen en la misma idea sin haberse coordinado explícitamente: tinta sobre papel, tipografía con carácter editorial, números en monoespaciado como si fueran anotados a mano en un margen. Ninguna pantalla usa el vocabulario visual genérico de "app de productividad" (tarjetas con sombra dura, azules corporativos, iconografía de línea fina estilo Material/SF Symbols) ni el cliché de "app de metas" (degradados morado-azul, fondo espacial genérico con estrellas de stock — `decisiones-visuales-galaxia.md` lo rechaza explícitamente para la galaxia, y este documento extiende el mismo rechazo a todo el resto de la app).

Principios, en orden de prioridad cuando compiten entre sí:

1. **El color pertenece a las categorías, nunca a la decoración.** Todo color saturado en pantalla identifica una categoría de estudio/ocio/evento (`categoryId` → `Category.color` vigente, D6) o un estado semántico de baja frecuencia (acento de acción primaria, aviso, peligro) — con la **excepción CONFIRMADA D6.b**: si el bloque/ítem tiene `goalId` asociado, manda el color de esa `WeeklyGoal` sobre el de categoría, y en el Calendario la supermeta (si la hay) aporta un acento secundario (ver §9.1, §11). No hay paletas decorativas por pantalla ("la pantalla de Estadísticas es azul") — dos pantallas usan exactamente los mismos tokens de skin (§4). Esto es lo que hace que el color siga siendo informativo incluso con docenas de categorías simultáneas en el calendario (§11).
2. **El papel es la superficie, la tinta es el contenido.** Fondos cálidos casi neutros (`paper`/`paperRaised`), texto y líneas en `ink`/`muted`/`rule`, con muy poco relieve (bordes de 1px, sin sombras duras ni glassmorphism — nada que compita con `expo-glass-effect` nativo de iOS, que este proyecto no usa por no tener iOS en el alcance de plataformas de V1, brief §6). La jerarquía se construye con tipografía y espaciado, no con capas de superficie.
3. **Tres tipografías, tres roles, sin excepciones.** Fraunces (serif editorial, con itálica) es *siempre* el nombre de algo con peso propio: el estado del cronómetro, el nombre de una meta/planeta, el título de una hoja modal. Archivo (sans neutra) es *siempre* interfaz — botones, etiquetas, cuerpo de texto, formularios. IBM Plex Mono es *siempre* un número o una etiqueta técnica — el reloj, minutos, contadores, timestamps del panel de depuración. Mezclar estos roles (un botón en Fraunces, un reloj en Archivo) es un error de implementación, no una variación de estilo.
4. **La disciplina no se siente punitiva.** El producto exige fricción real (ventanas de respuesta, doble confirmación de cancelación, banco de descanso que no perdona), pero el *tono* visual nunca regaña: sin animaciones de fracaso, sin copy de culpa, sin rojo agresivo para "cancelaste". D1.b lo fija a nivel de negocio ("se eliminan los elementos punitivos impuestos por la app"); este documento lo fija a nivel visual en cada pantalla que toca un cierre no exitoso (§9.6, §11.5, §15).
5. **Reposo antes que movimiento.** El produce vive para sesiones largas de estudio: nada debe animarse de forma continua salvo lo que comunica tiempo real (el anillo de progreso, el parpadeo sutil de las estrellas de fondo de la galaxia). Todo lo demás entra y sale con una transición breve y se queda quieto (§5, §14).

Metáfora de producto por sección, útil para decisiones de detalle que este documento no cubre explícitamente: el Cronómetro es la **página del día** de un cuaderno de estudio (mockup: "Ciclo de Estudio"); el Calendario es el **almanaque** (mockup: "Almanaque de Estudio"); las Estadísticas son el **cuaderno de progreso** (mockup: "Cuaderno de progreso"); la futura Galaxia (V1.1) es el **atlas celeste** dibujado a mano (mockup: "Atlas de Metas"). Cuando una pantalla nueva no tenga precedente en los mockups (Autenticación, Ajustes), se diseña como si fuera una página más del mismo cuaderno — nunca como una pantalla de sistema separada.

## 2. Arquitectura del tema: tokens, skins y AssetRegistry

Tres capas, en orden de abstracción decreciente (brief §8: "cambiar gráficos = cambiar un skin/registro, sin tocar lógica ni pantallas"):

1. **Design tokens** (`src/design/tokens.ts`): los "nombres de las cosas" — roles de color (`ink`, `accent`, `danger`...), escala tipográfica, espaciado, radios, sombras (mínimas, ver §1), duraciones/curvas de movimiento. Un token es una *clave*, no un valor: ningún componente de `src/features/**` o `src/app/**` importa un color hexadecimal directamente — siempre lee `colors.accent`, nunca `'#3A6B54'`. Esto es lo que permite que el mismo componente (`ProgressRing`, `ChoiceChip`) se vea distinto bajo un skin distinto sin que su código cambie una sola línea.
2. **Skin**: un objeto que asigna un valor concreto a cada token, para modo claro y modo oscuro (§4-§5). V1 trae un solo skin, `"papel"` — el nombre `Skin` en el tipo (no `Theme`) es deliberado para no chocar con `useTheme()`/`ThemeProvider`, que son el *mecanismo* de resolución, no el conjunto de valores. Un futuro skin adicional (fuera de alcance de V1) sería otro objeto del mismo tipo registrado en `src/design/skins/`, sin tocar ningún componente.
3. **AssetRegistry** (`src/design/asset-registry.ts`): el registro de *assets* — imágenes, ilustraciones y tratamientos visuales identificados por una clave estable (`assetId`) en vez de una ruta o URL hardcodeada en el componente que los usa. Es el mecanismo que ya anticipan `Category.imageUrl?`/`Preset.imageUrl?` (personalización futura, sin UI en V1), `WeeklyGoal.skinId?` y `GalaxyViewLayout.backgroundId?` (`02-DOMINIO.md` §3.3/§3.5, V1.1): ninguno de esos campos guarda una URL directa que un componente deba interpretar por su cuenta — todos son un `assetId` que se resuelve contra el registro, que **nunca falla** (si el id no existe o no está desbloqueado, cae al asset por defecto del skin activo, `02-DOMINIO.md` §3.5). En V1 el registro solo contiene entradas *sin imagen* (formas/color resueltos por CSS-en-RN, nunca un archivo — ver iconografía tipográfica de §7); las entradas con imagen real (skins de planeta, fondos de galaxia) las puebla `10-GALAXIA-Y-TIENDA.md` §4 en V1.1, sobre este mismo mecanismo.

Regla de dependencia: `tokens.ts` no importa nada; un `Skin` importa `tokens.ts` (para tipar sus valores) pero ningún otro skin; `asset-registry.ts` no importa ningún skin (los assets se filtran por `skinId` como dato, no por import); `theme-provider.tsx` (§3) importa `tokens.ts` y los skins disponibles, nunca al revés. Esto mantiene "cambiar el skin" como una operación de un solo archivo nuevo + una entrada en un registro, exactamente como pide el brief.

Reemplazo del andamiaje as-built: `src/constants/theme.ts` (Fase 1-2) define hoy `Colors.light/dark` como una paleta plana blanco/negro sin relación con el skin "Papel", más `Fonts` (fuentes de sistema, no Fraunces/Archivo/IBM Plex Mono), `Spacing`, `Radii`, `CategoryPalette`, `StatusColors`, `BottomTabInset`, `MaxContentWidth`. Este documento no descarta ese archivo por completo — las constantes que no dependen de la paleta genérica (`Spacing`, `Radii`, `CategoryPalette`, `StatusColors`, `BottomTabInset`, `MaxContentWidth`) migran sin cambios a `src/design/tokens.ts` como partes del `Skin` (o quedan como constantes compartidas fuera de cualquier skin, en el caso de `CategoryPalette`/`StatusColors`, que ya son independientes de claro/oscuro). Lo que sí se corrige es `Colors`/`Fonts`: se reemplazan por la estructura tipada de §3, poblada con los valores de §4. `ThemedText`/`ThemedView` (`src/components/`) conservan su API pública (`type`, `themeColor`/`type` como nombre de token) porque es sana — solo cambia qué hay detrás de `useTheme()`.

## 3. API TypeScript: `ThemeProvider` y `AssetRegistry`

### 3.1 Tokens y `Skin`

```ts
// src/design/tokens.ts — NUEVO (sustituye el contenido de color/tipografía de src/constants/theme.ts, §2)

/** Roles de color resueltos para UN modo (claro u oscuro) de UN skin. Nombres = los del mockup (MOCK-CRONO). */
export interface ColorTokens {
  // Superficie
  paper: string;
  paperRaised: string;
  // Contenido
  ink: string;
  muted: string;
  rule: string;
  ruleStrong: string;
  // Acento (acción primaria, categorías de estudio por defecto)
  accent: string;
  accentInk: string;   // texto/ícono sobre `accent`
  accentSoft: string;  // fondo de estado "seleccionado" de baja intensidad
  // Semántica del cronómetro
  break: string;
  breakSoft: string;
  lunch: string;
  lunchSoft: string;
  ocio: string;        // temporizador inverso
  warn: string;
  danger: string;
  dangerSoft: string;
  focus: string;        // anillo de foco de teclado/lector de pantalla
  // Alias semánticos (compatibilidad con `ThemedText`/`ThemedView` as-built, CODE):
  // se derivan de los roles de arriba, nunca se fijan por separado en un skin.
  text: string;              // = ink
  background: string;        // = paper
  backgroundElement: string; // = paperRaised
  backgroundSelected: string;// = accentSoft
  textSecondary: string;     // = muted
}

export type ThemeColor = keyof ColorTokens; // reemplaza el `ThemeColor` as-built de constants/theme.ts

export interface FontStack {
  family: string;        // nombre registrado con expo-font (§4.2)
  fallback: string;      // pila de respaldo (system-ui, Georgia, monospace) si la fuente no cargó aún
}

export interface TypographyTokens {
  display: FontStack;  // Fraunces — nombres con peso propio (§1, principio 3)
  body: FontStack;      // Archivo — interfaz
  mono: FontStack;      // IBM Plex Mono — números y etiquetas técnicas
}

/** Idéntico al `Spacing`/`Radii` as-built (CODE) — migran sin cambio de valores. */
export interface SpacingTokens { half: number; one: number; two: number; three: number; four: number; five: number; six: number; }
export interface RadiiTokens { small: number; medium: number; large: number; pill: number; }

export interface MotionTokens {
  durationFastMs: number;    // 120 — micro-feedback (press, toggle)
  durationBaseMs: number;    // 200 — entrada/salida de hojas y paneles
  durationSlowMs: number;    // 320 — transiciones de pantalla completa
  easingStandard: string;    // cubic-bezier para transición genérica
  easingDecelerate: string;  // elementos que entran (hoja subiendo, panel desplegándose)
}

export interface Skin {
  id: string;                 // 'papel' en V1
  name: string;                // "Papel" — nombre visible en Ajustes (§13) cuando haya más de un skin
  light: ColorTokens;
  dark: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radii: RadiiTokens;
  motion: MotionTokens;
}

/** Paleta de categorías y colores semánticos de estado, independientes de claro/oscuro (CODE, sin cambios de valor). */
export const CategoryPalette: readonly string[]; // = constants/theme.ts CategoryPalette, migrado literal
export const StatusColors: { success: string; warning: string; danger: string; info: string; neutral: string }; // = CODE, migrado literal
export const BottomTabInset: number; // = CODE (Platform.select ios/android), migrado literal
export const MaxContentWidth = 800;   // = CODE — ancho máximo de columna de lectura en pantallas de una sola columna (§6)
export const WideContentMaxWidth = 1400; // + NUEVO — techo de ancho para pantallas densas (Calendario, §11), evita que la grilla se estire hasta perder legibilidad en monitores ultra-anchos
```

### 3.2 `ThemeProvider`

```ts
// src/design/theme-provider.tsx — NUEVO

export type ColorSchemePreference = 'light' | 'dark' | 'system'; // = UserSettings.visualPreferences.colorScheme (CODE)

export interface ThemeContextValue {
  skin: Skin;
  colors: ColorTokens;              // ya resueltos para el modo activo — lo que consume el 99% de los componentes
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radii: RadiiTokens;
  motion: MotionTokens;
  mode: 'light' | 'dark';           // resuelto: preferencia explícita, o `useColorScheme()` del sistema si es 'system'
  colorSchemePreference: ColorSchemePreference;
  reduceMotion: boolean;            // resuelto: SO (`AccessibilityInfo.isReduceMotionEnabled`) OR `UserSettings.visualPreferences.reduceMotion` (§5)
  setColorSchemePreference(pref: ColorSchemePreference): void; // persiste en UserSettings vía el repositorio de settings
}

export interface ThemeProviderProps {
  skinId?: string;      // 'papel' por defecto; ignorado en V1 (un solo skin), presente para no migrar en V1.1
  children: ReactNode;
}

export function ThemeProvider(props: ThemeProviderProps): JSX.Element;

/**
 * Reemplaza el `useTheme()` as-built (`src/hooks/use-theme.ts`, hoy `() => Colors[scheme]`).
 * Mismo nombre de hook, misma idea de "un solo punto para leer el tema", forma más rica.
 */
export function useTheme(): ThemeContextValue;

/** Azúcar sintáctica para estilos memoizados que dependen del tema, evita recalcular StyleSheet en cada render. */
export function useThemedStyles<T>(factory: (ctx: ThemeContextValue) => T): T;
```

Migración de `ThemedText`/`ThemedView` (CODE): siguen aceptando `themeColor`/`type` como una clave de `ThemeColor` (§3.1); por dentro, `useTheme().colors[themeColor ?? 'text']` reemplaza `useTheme()[themeColor ?? 'text']` as-built — cambio de una línea en cada componente, cero cambios en quien los consume. `Fonts` (CODE, `Platform.select` de fuentes de sistema) se reemplaza por `useTheme().typography`, que ya resuelve la fuente correcta cargada por `expo-font` (§4.2) con su fallback si aún no cargó.

### 3.3 `AssetRegistry`

```ts
// src/design/asset-registry.ts — NUEVO. Mecanismo genérico; el catálogo de V1.1 (skins de
// planeta, fondos de galaxia, colecciones) lo puebla 10-GALAXIA-Y-TIENDA.md §4 sobre esta misma API
// poblando DEFAULT_ASSET_REGISTRY/AssetEntry[] — no una estructura de datos aparte.

export type AssetKind =
  | 'category_icon'      // reservado, sin UI en V1 (Category.imageUrl?)
  | 'preset_icon'         // reservado, sin UI en V1 (Preset.imageUrl?)
  | 'planet_skin'         // V1.1 — WeeklyGoal.skinId
  | 'background'          // V1.1 — GalaxyViewLayout.backgroundId (literal 'background', no 'galaxy_background': coincide con InventoryItemKind, 02-DOMINIO.md §3.5)
  | 'collection';         // V1.1 — colecciones de la Tienda (InventoryItem.kind === 'collection', 02-DOMINIO.md §3.5; catálogo en 10-GALAXIA-Y-TIENDA.md §4.4, p. ej. collection_constancia/collection_estrellas)

export interface AssetEntry {
  id: string;              // clave estable, p. ej. 'planet_skin.liso', 'background.crema'
  kind: AssetKind;
  skinId: string;          // skin de UI al que pertenece visualmente ('papel'); '*' si es agnóstico
  isFree: boolean;         // disponible sin desbloqueo (R7, brief §11 — nunca dinero real, ver 10-GALAXIA-Y-TIENDA.md)
  render: 'shape' | 'image'; // V1: siempre 'shape' (dibujado con tokens, sin archivo); 'image' es V1.1
  source?: ImageSourcePropType; // solo si render === 'image' (expo-image); ausente en V1
}

/** Falla-seguro: si `assetId` es `undefined` o no resuelve, devuelve la entrada `fallbackId` (nunca `undefined`). */
export function resolveAsset(assetId: string | undefined, fallbackId: string): AssetEntry;

/** Todas las entradas de un `kind`, filtradas por si el usuario ya las posee (`InventoryItem`, V1.1) o son gratis. */
export function listAssets(kind: AssetKind, ownedAssetIds: readonly string[]): AssetEntry[];

/** V1: registro vacío salvo un fallback por `kind` (garantiza que `resolveAsset` nunca lance). Puebla 10-GALAXIA-Y-TIENDA.md. */
export const DEFAULT_ASSET_REGISTRY: AssetEntry[];
```

## 4. Skin base "Papel": tokens completos

### 4.1 Colores (literales de `MOCK-CRONO`, ya coherentes con `MOCK-CAL`/`MOCK-GALAXIA`)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `paper` | `#EFEDE5` | `#14170F` | Fondo base de toda pantalla |
| `paperRaised` | `#FAF9F3` | `#1B1F16` | Tarjetas, inputs, hojas modales, chips no seleccionados |
| `ink` | `#20241E` | `#E9E7DC` | Texto principal, íconos, trazo de anillo activo |
| `muted` | `#6E7368` | `#949A88` | Texto secundario, ayudas, placeholders |
| `accent` | `#3A6B54` | `#7BB596` | Acción primaria, categoría de estudio en curso, foco |
| `accentInk` | `#F3F7F1` | `#10241A` | Texto/ícono sobre `accent` sólido |
| `accentSoft` | `#DCE6DC` | `#223429` | Fondo de chip/opción seleccionada |
| `rule` | `#D5D1C1` | `#2B3225` | Bordes sutiles, separadores, pista del anillo |
| `ruleStrong` | `#B9B4A0` | `#3C4433` | Bordes de control interactivo (chip, input, botón secundario) |
| `break` | `#2E7B84` | `#6FB9C2` | Estado de descanso (anillo, chip, fondo de tramo) |
| `breakSoft` | `#D8E6E7` | `#1D3538` | Fondo suave asociado a descanso |
| `lunch` | `#B9812E` | `#D9A85C` | Estado de almuerzo |
| `lunchSoft` | `#EFE1C6` | `#362A16` | Fondo suave asociado a almuerzo |
| `ocio` | `#6B8F71` | `#94C79B` | Temporizador inverso (distinto de `accent` para no confundir con estudio) |
| `warn` | `#C0672B` | `#E08B52` | Ventana de respuesta por vencer, avisos no críticos |
| `danger` | `#9C4A3A` | `#D08871` | Cancelar, eliminar, expiración |
| `dangerSoft` | `#E9D6CF` | `#33221D` | Fondo suave de estado de peligro (p. ej. tarjeta de sesión cancelada) |
| `focus` | = `accent` | = `accent` (oscuro) | Anillo de foco de teclado (§15) — siempre igual a `accent`, nunca un tercer color |

Alias semánticos (§3.1, para `ThemedText`/`ThemedView`): `text = ink`, `background = paper`, `backgroundElement = paperRaised`, `backgroundSelected = accentSoft`, `textSecondary = muted`.

```ts
// src/design/skins/papel.ts — NUEVO
import type { Skin } from '../tokens';

export const papelSkin: Skin = {
  id: 'papel',
  name: 'Papel',
  light: {
    paper: '#EFEDE5', paperRaised: '#FAF9F3', ink: '#20241E', muted: '#6E7368',
    accent: '#3A6B54', accentInk: '#F3F7F1', accentSoft: '#DCE6DC',
    rule: '#D5D1C1', ruleStrong: '#B9B4A0',
    break: '#2E7B84', breakSoft: '#D8E6E7', lunch: '#B9812E', lunchSoft: '#EFE1C6',
    ocio: '#6B8F71', warn: '#C0672B', danger: '#9C4A3A', dangerSoft: '#E9D6CF', focus: '#3A6B54',
    text: '#20241E', background: '#EFEDE5', backgroundElement: '#FAF9F3', backgroundSelected: '#DCE6DC', textSecondary: '#6E7368',
  },
  dark: {
    paper: '#14170F', paperRaised: '#1B1F16', ink: '#E9E7DC', muted: '#949A88',
    accent: '#7BB596', accentInk: '#10241A', accentSoft: '#223429',
    rule: '#2B3225', ruleStrong: '#3C4433',
    break: '#6FB9C2', breakSoft: '#1D3538', lunch: '#D9A85C', lunchSoft: '#362A16',
    ocio: '#94C79B', warn: '#E08B52', danger: '#D08871', dangerSoft: '#33221D', focus: '#7BB596',
    text: '#E9E7DC', background: '#14170F', backgroundElement: '#1B1F16', backgroundSelected: '#223429', textSecondary: '#949A88',
  },
  typography: {
    display: { family: 'Fraunces', fallback: 'Georgia, "Times New Roman", serif' },
    body: { family: 'Archivo', fallback: 'ui-sans-serif, system-ui, sans-serif' },
    mono: { family: 'IBMPlexMono', fallback: 'ui-monospace, "SFMono-Regular", monospace' },
  },
  spacing: { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 }, // = CODE Spacing, sin cambios
  radii: { small: 8, medium: 12, large: 16, pill: 999 },                        // = CODE Radii, sin cambios
  motion: { durationFastMs: 120, durationBaseMs: 200, durationSlowMs: 320, easingStandard: 'cubic-bezier(.4,0,.2,1)', easingDecelerate: 'cubic-bezier(0,0,.2,1)' },
};
```

### 4.2 Tipografía: carga y roles

- **Fraunces** (variable, `ital,opsz,wght@0,9..144,380..520;1,9..144,380..520`): títulos con peso propio. Usar el rango de peso 480–520 para estado activo/énfasis y 400 para texto largo en Fraunces (poco frecuente). La itálica se reserva para matices de tono (p. ej. "meta cumplida" en la galaxia, V1.1) — nunca para texto de acción.
- **Archivo** (400 regular, 500 medium para botones/labels, 600 semibold para encabezados de sección de una pantalla): toda la interfaz funcional.
- **IBM Plex Mono** (400/500/600): relojes (`font-variant-numeric: tabular-nums` — en RN, `fontVariant: ['tabular-nums']`), contadores, `weekKey`/timestamps visibles, valores numéricos de estadísticas.
- **Carga (cost cero, brief §8)**: paquetes `@expo-google-fonts/fraunces`, `@expo-google-fonts/archivo`, `@expo-google-fonts/ibm-plex-mono` (Google Fonts vía `expo-font`, sin API key, sin costo) — dependencias nuevas menores, coherentes con la restricción de costo cero (no son un servicio, son archivos de fuente empaquetados). Se cargan una vez en `src/app/_layout.tsx` con `useFonts` antes de levantar `ThemeProvider`; mientras cargan, `FontStack.fallback` asegura que ninguna pantalla quede sin texto legible (nunca bloquear el primer render en el `useFonts`, solo usar el fallback hasta que resuelva). En web, los mismos paquetes exponen archivos `.ttf`/`.otf` que Metro/Expo empaqueta igual que en nativo — no se depende del `<link>` a `fonts.googleapis.com` que usan los mockups HTML (eso era válido solo como demo standalone). El `--font-display`/`--font-mono` genéricos de `src/global.css` (CODE, boilerplate de Expo) quedan sin uso una vez cargadas las tipografías reales; no hace falta borrarlos, pero ningún estilo del sistema de diseño depende de ellos.

## 5. Modo claro/oscuro y `prefers-reduced-motion`

**Modo de color.** `UserSettings.visualPreferences.colorScheme` (CODE, ya existe) es la fuente de verdad, con tres valores: `'light'`, `'dark'`, `'system'`. `ThemeProvider` (§3.2) resuelve `mode` así: si la preferencia es `'light'`/`'dark'`, ese es el modo; si es `'system'` (default de una cuenta nueva), se usa `useColorScheme()` de React Native (nativo) / `prefers-color-scheme` (web, ya se propaga vía `react-native-web`) y se re-evalúa en cada cambio del SO sin reiniciar la app. Nunca se guarda el modo *resuelto* en Firestore, solo la preferencia — dos dispositivos con SO en distinto modo y preferencia `'system'` deben poder verse distinto entre sí legítimamente. Cambiar la preferencia se expone en Ajustes (§13) y persiste vía el mismo `SettingsRepository` que ya usa `useUserSettings()` (CODE).

**`prefers-reduced-motion` / `reduceMotion`.** `UserSettings.visualPreferences.reduceMotion` (CODE, ya existe) es un *override manual* del usuario; el SO expone su propia señal (`AccessibilityInfo.isReduceMotionEnabled()` en nativo, `matchMedia('(prefers-reduced-motion: reduce)')` en web, que ambos mockups ya consultan). `ThemeProvider.reduceMotion` resuelto = **OR lógico** de ambas señales (si cualquiera de las dos pide movimiento reducido, se reduce) — un usuario no tiene que desactivar la animación del sistema operativo entero solo para esta app, y activar el ajuste de la app no le exige tocar la configuración de accesibilidad de su teléfono.

Efecto concreto de `reduceMotion === true`, aplicado consistentemente en todo componente animado (§14):
- Toda transición de entrada/salida (hoja modal, panel de capas, diálogo) pasa de deslizamiento+fundido a **solo fundido**, con `motion.durationFastMs` en vez de `durationBaseMs`.
- El **anillo de progreso** (`ProgressRing`, §7) sigue actualizándose — es información funcional, no decorativa — pero sin la interpolación elástica de color al entrar en zona de aviso (§9.4): el cambio de color es instantáneo, no un cross-fade.
- El **parpadeo de estrellas de fondo** de la galaxia (V1.1, `MOCK-GALAXIA` ya lo respeta: `reducedMotion ? .5 : Math.sin(...)`) y la física de arrastre con resorte se desactivan: estrellas a opacidad fija, los planetas saltan directo a su posición "home" sin animación de asentamiento.
- Ningún efecto de celebración (`UserSettings.visualPreferences.celebrationEffectsEnabled`, CODE — controla si existen del todo) se reproduce con partículas o rebote; si están habilitados, se reducen a un cambio de estado estático (ícono/badge) — las dos preferencias son independientes pero componen: `celebrationEffectsEnabled=false` quita el efecto entero, `reduceMotion=true` lo deja pero sin movimiento.

## 6. Layout responsive: breakpoints y patrones generales

El cronómetro es Android-first (mobile-first, `MOCK-CRONO` está diseñado a 420px de ancho máximo); el resto de la app — y el Calendario en particular, brief §12 — es **responsive real en ambas plataformas primarias**, no "que quepa". Se definen tres breakpoints únicos para toda la app (nunca un breakpoint distinto por pantalla):

```ts
// src/design/breakpoints.ts — NUEVO
export const Breakpoints = {
  compact: 0,     // teléfono: 0–699px de ancho de viewport/ventana
  medium: 700,    // tablet / desktop angosto: 700–1099px
  expanded: 1100, // desktop: ≥1100px
} as const;

export type BreakpointName = keyof typeof Breakpoints;

/** Basado en `useWindowDimensions()` (RN/RNW); re-evalúa en cada resize/rotación. */
export function useBreakpoint(): BreakpointName;
```

Qué cambia en cada breakpoint (regla general; el Calendario, §11, la refina más porque es la pantalla con mayor densidad de información):

| Aspecto | `compact` (< 700px) | `medium` (700–1099px) | `expanded` (≥ 1100px) |
|---|---|---|---|
| Navegación principal | Tab bar inferior nativa (`(tabs)/_layout.tsx`) con **5 destinos**: Inicio, Cronómetro, Calendario, Estadísticas, Tienda (brief §12.5, CONFIRMADO por el creador 2026-09-06 — reemplaza cualquier supuesto anterior de 4 destinos; Ajustes deja de ser pestaña propia y pasa a un botón mini dentro de Inicio, §13) | Barra lateral izquierda fija, ~72px, solo íconos + etiqueta corta | Barra lateral izquierda fija, ~220px, ícono + etiqueta completa |
| Overlays de acción (crear/editar, selector de descanso, confirmaciones) | Hoja inferior (`BottomSheet`, §7) a ancho completo | Diálogo centrado, ancho fijo ~480px | Diálogo centrado, ancho fijo ~480px |
| Panel "Mis capas" del Calendario (§11.4) | Hoja inferior, se abre/cierra explícitamente | Panel lateral acoplado, colapsable | Panel lateral acoplado, visible por defecto |
| Ancho de columna de contenido | 100% del viewport menos padding | `min(100%, MaxContentWidth)` centrado, salvo Calendario (`WideContentMaxWidth`) | Igual, con más aire lateral |
| Densidad de la vista Semana del Calendario | Agenda vertical por día (§11.3) | Grilla de 7 columnas con franja horaria | Grilla de 7 columnas con franja horaria, más alto visible sin scroll |

`AdaptiveNav` (`src/components/adaptive-nav.tsx`, NUEVO) es el componente que decide, con `useBreakpoint()`, si envuelve el contenido de `(tabs)/_layout.tsx` con la tab bar nativa o con la barra lateral — ambas apuntan a las mismas cinco rutas (Inicio, Cronómetro, Calendario, Estadísticas, Tienda), así que ningún destino ni pantalla cambia entre breakpoints, solo el "chrome" de navegación. `ROUTES.tabs` (CODE) hoy solo tiene `calendar`/`stats`/`timer`/`settings` porque el build todavía no llega a las fases de Inicio/Calendario/Tienda (Fase 4b); quien construya esas fases agrega `home`/`store` y retira `settings` de `tabs` (pasa a una ruta no-tab, §13) sin romper las rutas ya existentes. Las 5 pestañas son la navegación CONFIRMADA por el creador (brief §12.5, 2026-09-06: "Reemplaza cualquier supuesto anterior de '4 secciones'... o de estructura de tabs distinta en documentos ya escritos — corregir donde aparezca"); no hay ya un "quinto destino reservado" — Inicio y Tienda son destinos de V1 desde ya. Lo que sigue siendo V1.1 (`10-GALAXIA-Y-TIENDA.md`, brief §11) es el contenido interactivo completo de esos destinos (galaxia arrastrable con subgalaxias, catálogo de compra de la Tienda) — Inicio en V1 ya muestra como mínimo la racha (D "Racha de estudio", ya resuelto) y el botón "Crear", con la galaxia embebida en una forma simplificada hasta que V1.1 la complete.

Reglas transversales, válidas en toda pantalla:

- Nunca hay scroll horizontal del `body`/contenedor raíz. Contenido ancho (grilla del calendario, tabla de detalle) scrollea dentro de su propio contenedor (`overflow-x` acotado a ese componente), nunca la pantalla completa.
- Un mismo componente (`ChoiceChip`, `CategoryChip`, tarjetas) no cambia de forma entre breakpoints, solo su distribución (`flex-wrap` vs. columnas fijas) y, ocasionalmente, su densidad de texto (§11.3 trunca títulos más agresivamente en `compact`).
- Los formularios (crear categoría, crear capa, crear evento invisible) usan el mismo componente de formulario en los tres breakpoints; lo que cambia es el contenedor (`BottomSheet` vs. diálogo centrado), nunca los campos ni su orden.

## 7. Inventario de componentes

Convención de iconografía (precedente CODE en `cancellation-phrase-editor.tsx`, ver Fuentes): **sin librería de íconos vectoriales**. Todo ícono es un glifo Unicode/emoji en `typography.mono` o `typography.body` (✏️ editar, ★ estrella, › avance, + agregar, ‹ › navegación, ⚙ ajustes, ▦ capas, ◔ cronómetro, ▲ estadísticas) o una forma dibujada con `View`/`react-native-svg`-free (círculos, líneas) usando `colors`/`radii` — nunca un archivo de ícono. Esto es intencional y de costo cero, no una limitación temporal.

Componentes nuevos a formalizar en `src/components/` (los ya as-built, `ThemedText`/`ThemedView`, se listan solo por su cambio de §3.2):

| Componente | Props principales | Notas |
|---|---|---|
| `ThemedText` (CODE, evoluciona) | `type: 'default'\|'title'\|'small'\|'smallBold'\|'subtitle'\|'link'\|'linkPrimary'\|'code'`, `themeColor?: ThemeColor` | `code` pasa a usar `typography.mono`; el resto, `typography.body` salvo `title`/`subtitle` que usan `typography.display` (Fraunces) — cambio de fondo respecto al as-built genérico. |
| `ThemedView` (CODE, evoluciona) | `type?: ThemeColor` | Sin cambio de forma, solo de valores detrás. |
| `RolePill` | `role: 'dominant'\|'spectator'` | Píldora con punto de color + etiqueta ("Dominante"/"Espectador"). `dot` en `accent` (dominante) o `muted` (espectador) — nunca solo color, siempre + texto (regla de §1/§15). |
| `ProgressRing` | `progress: number` (0–1), `tone: 'accent'\|'break'\|'lunch'\|'ocio'\|'warn'`, `centerContent: ReactNode`, `showMidMarker?: boolean` | Anillo SVG-free (`react-native-svg` no está instalado; se implementa con dos `View` circulares superpuestos usando `borderColor`/`transform: rotate` por cuadrante, o se suma `react-native-svg` como dependencia menor de costo cero si el trazo por transformaciones no da un resultado limpio — decisión de implementación, no de este documento). `tone` decide el color del trazo; pasa a `warn` automáticamente cuando `progress < 0.25` en un estado "esperando respuesta" (§9.4). Anima el `strokeDashoffset`/ángulo con `motion.durationFastMs`, nunca salta sin transición salvo `reduceMotion`. |
| `StateLabel` | `text: string`, `tone?: 'default'\|'warn'\|'danger'` | Título Fraunces del estado actual del cronómetro/inverso ("Estudiando", "¿Qué sigue?"). |
| `CategoryChip` | `name: string`, `color: string`, `selected?: boolean`, `onPress?` | Punto de color (9px) + nombre; nunca solo el punto — el nombre siempre es visible (excepción: dentro de una celda de calendario muy angosta, §11.3, donde el punto solo aparece con el nombre en un tooltip/expansión). |
| `ChoiceChip` | `label: string`, `selected?: boolean`, `disabled?: boolean`, `onPress?`, `onRemove?` | Base de selección de categoría/preset/tiempo del cronómetro (`MOCK-CRONO` `.choice`/`.tchip`); `onRemove` pinta la "×" solo en opciones personalizadas (tiempos/presets creados por el usuario). |
| `BottomSheet` | `visible: boolean`, `onDismiss`, `title?: string`, `children` | En `compact`, hoja real deslizada desde abajo; en `medium`/`expanded`, el mismo componente renderiza como diálogo centrado (§6) — una sola API, dos presentaciones. |
| `EmptyState` | `icon?: string` (glifo), `title: string`, `description?: string`, `actionLabel?: string`, `onAction?` | Estado vacío genérico, reutilizado por toda pantalla con datos (§8-§13 solo especifican su copy). |
| `ErrorState` | `message: string`, `onRetry?` | Tono `danger`, ícono "⚠" (glifo), botón "Reintentar" si `onRetry` está presente. |
| `SkeletonBlock` | `width`, `height`, `radius?` | Relleno `paperRaised` con pulso de opacidad (`reduceMotion`: pulso estático sin animación, §5) — bloque de carga genérico para tiles/listas/tarjetas. |
| `DensityBadge` | `count: number`, `onPress?` | El "+N más" de calendario/paneles densos (`MOCK-CAL` `.more`), en `typography.mono`, siempre interactivo (abre el detalle completo). |
| `AdaptiveNav` | `items: {route, label, icon}[]` | §6 — decide tab bar vs. barra lateral según `useBreakpoint()`. |
| `LayerRow` | `label: string`, `swatches: string[]` (1–4 colores + conteo si hay más), `visible: boolean`, `onToggle`, `kind: 'goal'\|'custom'`, `onEdit?` (solo `custom`) | Fila del panel "Mis capas" (§11.4). |
| `TimelineDayColumn` | `date: string`, `items: CalendarItem[]`, `layout: DayTimelineLayout` (`positions: TimelinePosition[]`, `overflow: TimelineOverflowGroup[]` — `07-CALENDARIO-ESTADISTICAS-METAS.md` §1.6, `layoutDayTimeline` ya calculado con el `maxVisibleColumns` de §11.3), `hourRange?: [number, number]`, `onItemPress`, `onOverflowPress: (group: TimelineOverflowGroup) => void`, `nowIndicator?: boolean` | Columna de franja horaria (vistas Día/3 días/Semana en `medium`+, §11.3). No resuelve colisiones por sí misma (ese algoritmo es de dominio, `07-CALENDARIO-ESTADISTICAS-METAS.md` §1.6): solo pinta `layout.positions` (columna/`columnCount` ya asignados) y, por cada `layout.overflow[]`, un `DensityBadge` ("+N más") anclado a `topMinutes`/`heightMinutes` que abre el detalle de `hiddenItemIds` al tocarlo. |

## 8. Pantalla: Autenticación

Rutas as-built (`ROUTES.auth`, CODE): `/(auth)/login`, `/(auth)/register`, con componentes ya construidos (`login-form.tsx`, `register-form.tsx`, `auth-text-field.tsx`, `google-sign-in-button.tsx`, React Hook Form + Zod). Este documento no rediseña el flujo funcional (Email/Password + Google, brief §6) — fija su tratamiento visual, ausente hasta ahora porque la Fase 2 se construyó antes de que existiera el skin "Papel".

- **Layout**: página completa de la "página del cuaderno" (§1) — sin barra de navegación (no hay tabs todavía), fondo `paper`, columna centrada de ancho `min(100%, 380px)` en cualquier breakpoint (un formulario de login nunca necesita más ancho, incluso en `expanded`). Título "Productvt" en `typography.display`, subtítulo corto en `muted`.
- **`AuthTextField`** (CODE, evoluciona): usa `ChoiceChip`/`ThemedText` ya existentes por dentro; el borde de foco pasa a `colors.focus` (§15), el error de validación de Zod se muestra en `danger` bajo el campo, nunca solo con el borde en rojo (regla de "no depender solo del color").
- **`GoogleSignInButton`** (CODE): botón secundario (`paperRaised` + `ruleStrong`), nunca el estilo de marca de Google por defecto de la librería sin adaptar — se re-skinnea con los tokens de esta app, conservando el logo de Google (requisito de la marca, no de este documento) a la izquierda del label en `typography.body`.
- **Vacío**: no aplica (es un formulario, no una lista).
- **Carga**: el botón de submit activo muestra un spinner reemplazando el label (patrón ya usado en `cancellation-phrase-editor.tsx`, `ActivityIndicator`), inputs deshabilitados mientras se envía.
- **Error**: errores de Firebase Auth (credenciales inválidas, email en uso, límite de OAuth sin verificar de Google — D19) se traducen a copy en español simple bajo el formulario (`ErrorState` sin `onRetry`, ya que reintentar es simplemente corregir el campo y volver a enviar), nunca el mensaje crudo de Firebase.
- **View model**: `{ status: 'idle' | 'submitting' | 'error'; errorMessage?: string }`, ya cubierto por el patrón de `useAuthUser`/hooks as-built — no se propone un tipo nuevo, solo su mapeo a `ErrorState`/spinner de arriba.

## 9. Pantalla: Cronómetro

Fuente principal: `MOCK-CRONO`, leído completo — la estructura `topbar` (título + `RolePill`) + `stage` (contenido central según estado) + `actions` (botones) se adopta como el esqueleto de layout de esta pantalla en `compact`. En `medium`/`expanded` el mismo esqueleto se centra en una columna de `min(100%, MaxContentWidth)` con más aire alrededor del anillo — el cronómetro no necesita el ancho completo del calendario porque es, por diseño, la pantalla de un solo foco a la vez (brief §6: Android es la única plataforma dominante; en desktop esta pantalla se usa sobre todo en modo espectador, §9.2).

### 9.1 Estructura y componentes

`TimerScreen` decide qué renderizar en `stage` según `currentState` de `ActiveStudySession` (`03-CRONOMETRO.md` §1) cuando hay sesión activa, o el formulario de `idle` cuando no la hay. Componentes reutilizados: `RolePill`, `ProgressRing` (siempre presente salvo en `idle` y en las pantallas terminales), `StateLabel`, `CategoryChip`, `ChoiceChip` (selección de categoría/preset/duraciones en `idle`), `BottomSheet` (cancelación, selector personalizado de descanso).

```ts
// Forma que consume TimerScreen — vista de UI, no un tipo de dominio nuevo.
// El origen exacto (store de zustand + onSnapshot de ActiveSession) es de la fase de cronómetro,
// no de este documento; aquí solo se fija qué necesita la pantalla para pintar cada estado.
export interface TimerScreenViewModel {
  role: 'dominant' | 'spectator' | null;      // null si no hay sesión activa (pantalla en `idle`)
  active: ActiveStudySession | ActiveInverseSession | null; // CODE, 02-DOMINIO.md §3.4
  remainingSeconds: number;                    // computeRemainingSeconds, 03-CRONOMETRO.md §10.1
  liveEffectiveSeconds: number;                // computeLiveEffectiveStudySeconds, mismo §10
  category: { id: string; name: string; color: string } | null; // resuelto vía categoryId, color vivo (D6)
  goalId?: string;                             // + StudySession.goalId si el bloque está asociado a una meta (02-DOMINIO.md §3.3)
  goalColor?: string;                          // + WeeklyGoal.color de esa meta — manda sobre category.color (D6.b, ver nota abajo)
  bankAvailableSeconds: number;                // solo relevante en break_selection
  controlRequest: ControlRequest | null;       // dispara el diálogo de §9.2
  status: 'loading' | 'ready' | 'error';
  errorMessage?: string;
}
```

**Regla de color del bloque (D6.b, `02-DOMINIO.md` §1.2 — corrige la lectura de D6 "sin excepción" del §1 de este documento)**: cuando `goalId` está presente, el `CategoryChip` que se muestra en los estados corriendo/de espera (§9.3) pinta su punto y, si aplica, su fondo con `goalColor`, no con `category.color` — el color de categoría queda como *fallback* exclusivo de un bloque "suelto" (sin meta asociada), que es el único caso donde D6 sigue vigente sin excepción. Esto no cambia el tono del `ProgressRing` (§7): su prop `tone` (`accent`/`break`/`lunch`/`ocio`/`warn`) es un indicador semántico de **estado** del cronómetro, nunca un color de categoría o de meta, con o sin `goalId` — el anillo no se "recolorea" por meta. La franja secundaria de la supermeta (D6.b) no tiene lugar en esta pantalla de un solo foco; es exclusiva del Calendario (§11), donde sí conviven varios ítems a la vez.

### 9.2 Espectador y diálogo de cambio de dominante

Regla de negocio completa en `04-SINCRONIZACION.md` §4-§5 (no se repite). Tratamiento visual:

- **`RolePill`** siempre visible en la esquina superior del `stage` mientras hay sesión activa: `role="dominant"` → punto `accent`, etiqueta "Dominante"; `role="spectator"` → punto `muted`, etiqueta "Espectador" (`MOCK-CRONO` `.role-pill.spectator`).
- En espectador, **todo control de acción** (botones primarios/secundarios/`danger-ghost` que ejecutan una transición) se renderiza visualmente idéntico pero con `disabled` semántico: opacidad reducida (`§15`, nunca *solo* opacidad — el `accessibilityState.disabled` lo declara también para lectores de pantalla) **no** es el tratamiento correcto aquí, porque tocarlo sí hace algo (dispara la solicitud de control, `04-SINCRONIZACION.md` §5.2) — se renderiza como un botón secundario normal (ni deshabilitado ni primario) que, al tocarse, abre el diálogo de abajo en vez de ejecutar la transición.
- **Diálogo "¿Cambiar de dominante?"** (`BottomSheet`): título "¿Quieres tomar el control?" (lado que pide) / "Otro dispositivo quiere el control" (lado que ya es dominante, `MOCK-CRONO` lo prueba en su panel de depuración) — cuerpo explica en una frase que solo un dispositivo controla el bloque a la vez y que el otro sigue viendo el conteo; dos botones simétricos "Sí"/"No" (nunca "primario"/"secundario" jerárquicos — ambos caminos son legítimos, D14/R14: "el primero que apreta"). Se muestra en **ambos** dispositivos simultáneamente en cuanto existe `controlRequest` (`onSnapshot`), y se cierra solo cuando el `onSnapshot` deja de traer ese `controlRequest` (confirmado por cualquiera de los dos lados, o cancelado) — nunca por un timeout propio de la UI.
- Mientras el diálogo está abierto, el anillo y el resto de la pantalla **no se congelan** — el motor por timestamps sigue corriendo debajo (`04-SINCRONIZACION.md` §5.5) y el diálogo es un overlay, no un bloqueo del render.
- Recomendación de `04-SINCRONIZACION.md` §13.3 (migración de dispositivo): la pantalla de Ajustes (§13) incluye una tarjeta "Este dispositivo" con una nota breve sugiriendo cerrar sesión en el dispositivo anterior al migrar — evita el caso de un dispositivo viejo que sigue respondiendo diálogos sin que el usuario lo recuerde encendido.

### 9.3 Los 10 estados: tratamiento pantalla por pantalla

`TimerStateName` completo en `03-CRONOMETRO.md` §1 (CODE). Tabla de qué pinta `stage` en cada uno — solo lo visual; transición/guarda/checkpoint de cada uno ya están fijados y no se repiten:

| Estado | `StateLabel` | Anillo (`tone`) | Acciones visibles |
|---|---|---|---|
| `idle` | — (formulario de arranque, no un estado corriendo) | Ausente | Selector Normal/Inverso, categoría, preset/duraciones, "Iniciar sesión" |
| `study_running` | "Estudiando" | `accent`, cuenta regresiva desde `segmentTargetSeconds` | `CategoryChip` de la categoría activa, "Almuerzo" (si disponible, §7.1), "Cancelar sesión" (abre §9.6) |
| `study_completed_waiting_response` | "¡Bloque terminado!" | `accent`→`warn` bajo 25% (§9.4), cuenta regresiva de la ventana | Ayuda en `warn`: "Si no respondés a tiempo se pierde el tiempo de este bloque." + "Seguir" (primario) + "Almuerzo" + "Cancelar sesión" |
| `break_selection` | "Elegí tu descanso" | igual patrón `warn` bajo 25% | Panel de 5 salidas, §9.5 |
| `break_running` | "Descanso" | `break`, cuenta regresiva | "Almuerzo", "Cancelar sesión" |
| `break_completed_waiting_response` | "Toca estudiar" | `break`→`warn` bajo 25% | Ayuda en `warn` + "Empezar bloque" (primario) + "Almuerzo" + "Terminar sesión" (D "convención de vocabulario": no ofrece "Cancelar sesión" aquí porque no hay bloque en curso que cancelar — la salida limpia es "Terminar sesión", §9.5) |
| `lunch_running` | "Almuerzo" | `lunch`, cuenta regresiva fija de 45 min | Ninguna acción de bloque (no se puede cancelar el almuerzo ni pedir otro; solo esperar) |
| `session_completed` | "Sesión terminada" | Ausente (pantalla de cierre) | Resumen: tiempo efectivo total (`fmtMin(effectiveStudySeconds)`); "Volver a empezar" |
| `session_cancelled` | "Sesión cancelada" | Ausente | §9.6 — tono neutro, nunca punitivo |
| `session_expired` | "Se pasó el tiempo" | Ausente | Resumen igual a `session_completed` (tiempo efectivo conservado, D2); tono neutro (expirar es negligencia pasiva, no una falta — mismo tono que cancelar, sin culpa) |

Nota de nombres: `MOCK-CRONO` titula el estado terminal de cancelación "Bloque cancelado" — se corrige aquí a **"Sesión cancelada"**, siguiendo la convención de vocabulario ya fijada (D "Convención de vocabulario", ejemplo del diálogo "¿Cancelar sesión?": lo que termina es la sesión completa, aunque solo se pierda el tiempo del bloque en curso).

### 9.4 Ventanas de respuesta: urgencia visual sin pánico

Fórmula de la ventana en `03-CRONOMETRO.md` §3 (no se repite). Tratamiento: el anillo cambia de `tone` a `warn` cuando `remainingSeconds / segmentTargetSeconds < 0.25` (umbral ya usado por `MOCK-CRONO`, `renderRing`), y el texto de ayuda bajo `StateLabel` pasa de `muted` a `warn` desde el inicio de cualquier estado `*_waiting_response`/`break_selection` (no solo bajo el 25%) — la advertencia de qué se pierde es constante, la urgencia de color es progresiva. Nunca hay parpadeo agresivo ni sonido continuo de alarma visual: un solo cambio de color con la transición de `motion.durationFastMs`, coherente con "reposo antes que movimiento" (§1). El sonido/vibración de la notificación es responsabilidad de `03-CRONOMETRO.md` §11 (notificaciones locales), no de esta pantalla.

### 9.5 Selector de descanso (`break_selection`)

Las cinco salidas de `break_selection` están fijadas en `03-CRONOMETRO.md` §5 (no se repiten sus transiciones/guardas). Layout del panel (`MOCK-CRONO` como base, con dos correcciones respecto a la maqueta): banco disponible mostrado siempre arriba de las acciones (`"Banco disponible: {fmtMin(bankAvailableSeconds)}"`, `typography.mono` para el número); luego, en este orden, un botón por salida:

1. **"Descansar {N} min"** (primario, `accent`) — solo visible si el descanso sugerido (`grantedSeconds`) es mayor a 0.
2. **"Personalizado"** (secundario) — expande un campo numérico acotado a `[0, bankAvailableSeconds/60]` minutos enteros, con un botón "Usar" (patrón ya as-built en el mockup, `.custom-time-row`); nunca un slider (la app ya usa steppers/inputs numéricos en todo el resto del cronómetro, mantener consistencia).
3. **"Saltar"** (secundario) — equivalente a personalizado con 0, pero como acción de un toque, sin abrir el campo numérico.
4. **"Almuerzo"** (`ghost`, solo si `isLunchAvailable()`) — mismo tratamiento que en cualquier otro estado activo.
5. **"Terminar sesión"** (`ghost`, tono neutro — no `danger`) — cierra normalmente, D "no existe finalizar a mitad de bloque, pero sí entre bloques sin penalización": el botón no debe *parecer* una salida de emergencia (nada de rojo, nada de doble confirmación) porque no lo es.

### 9.6 Cancelación: copy neutro, feedback no punitivo

Regla de negocio completa (doble confirmación 15+15s, qué se conserva) en `03-CRONOMETRO.md` §8.1/§8.3 (D1.b, R25) — **no se repite aquí**. Esta sección fija exclusivamente el tratamiento visual que esa sección delega explícitamente a este documento.

- **Título del diálogo**: "Cancelar sesión" (`timerCopy.cancelSession.title`, ya as-built en `src/i18n/es.ts` — coincide). Nunca "¿Estás seguro?" solo ni un ícono de cara triste.
- **Cuerpo**: texto neutro, informativo, sin adjetivos de juicio — "Se pierde el tiempo del bloque en curso. Los bloques anteriores ya completados se conservan. No se puede deshacer." (`MOCK-CRONO`, ajustado a la regla vigente de D1.b/R25 de que se conservan bloques previos). La `cancellationPhrase` personalizable del perfil (`UserProfile.cancellationPhrase`, CODE) se muestra **debajo** de ese texto neutro, en `typography.display` itálica, como una cita del propio usuario a sí mismo — visualmente distinta del texto de sistema, para que quede claro que es su compromiso, no un regaño de la app (D1.b: "no es la app regañando, es un compromiso que la persona se escribió a sí misma"). Un ícono de lápiz (✏️, mismo glifo que Ajustes) permite editarla in situ, sin salir del diálogo, para el caso de que el usuario quiera reforzarla en el momento.
- **Botón de confirmación**: `danger` (color, no forma agresiva — mismo `Radii.medium` que cualquier otro botón), con el conteo regresivo como *label* del propio botón mientras está bloqueado (`"Esperá {n}s…"`, `timerCopy.cancelSession.firstConfirmLocked`, CODE) — nunca una barra de progreso roja creciente ni un temporizador aparte que añada tensión visual extra a la ya exigida por la fricción de negocio.
- **Qué se elimina explícitamente respecto a cualquier versión anterior de este flujo**: sin animación de "caída"/desvanecimiento triste del anillo, sin copy que use la palabra "abandonar" en el cuerpo (queda reservada solo a `DEFAULT_CANCELLATION_PHRASE`, que es la frase que el usuario edita y posee, no texto de sistema — nota de `02-DOMINIO.md` línea 440), sin sonido de "fracaso" distinto al de una notificación normal (el `SoundEffect: 'cancelled'` ya as-built puede ser un tono neutro, no uno dramático — decisión de audio, `05-ARQUITECTURA.md`/fase de sonido, este documento solo fija que no debe *leerse* como castigo).
- **Pantalla terminal `session_cancelled`** (§9.3): mismo tratamiento que `session_expired` — tono `ink`/`muted`, sin `danger` de fondo, solo el botón de cierre en `danger-ghost` (texto, sin relleno) como recordatorio sutil de qué pasó, no como una superficie roja completa.

### 9.7 Vacío, carga y error

- **Vacío**: no aplica como concepto de "lista vacía" — el estado por defecto sin sesión activa **es** `idle` (el formulario de arranque, §9.3), que nunca se trata como un estado vacío/error.
- **Carga**: al abrir la app con una sesión activa en Firestore, el `HYDRATE` (`04-SINCRONIZACION.md` §8) puede tardar lo que tarda la primera lectura; mientras `status === 'loading'`, se muestra un `ProgressRing` en `tone="accent"` con `progress` indeterminado (animación de barrido continuo, o estático si `reduceMotion`) y `StateLabel` en blanco/skeleton — nunca un spinner genérico de sistema, para no romper el lenguaje visual de la pantalla más importante de la app.
- **Error**: fallo de lectura del singleton o de escritura de una transición → `ErrorState` con mensaje corto ("No pudimos conectar con tu sesión") y `onRetry` que reintenta la suscripción; la sesión en curso **nunca se pierde** por un error de UI (el motor por timestamps y Firestore offline ya garantizan esto, `04-SINCRONIZACION.md` §9 — este documento solo asegura que el mensaje de error no sugiera lo contrario).

## 10. Pantalla: Temporizador inverso

Mismo lugar de navegación que el Cronómetro (`TimerScreen`, toggle "Normal"/"Inverso" en `idle`, `MOCK-CRONO` `.type-toggle`) — no es una ruta ni una pestaña separada. `InverseSession`/`ActiveInverseSession` no tienen una máquina de estados con nombres públicos como `TimerStateName` (`03-CRONOMETRO.md` §12: "mucho más simple... solo corriendo hasta un cierre"); esta pantalla deriva un enum **puramente de presentación** (no un tipo de dominio) para decidir qué pintar:

```ts
// UI-only, no persistido, no confundir con InverseSessionStatus (CODE)
export type InverseScreenPhase = 'idle' | 'running_before_target' | 'running_after_target' | 'closed';
// running_before_target: elapsed < targetDurationSeconds
// running_after_target: targetDurationSeconds <= elapsed < 2*targetDurationSeconds (meta alcanzada, sigue corriendo)
// closed: la sesión ya cerró (manual, tope duro, cancelación o zombie) — pantalla de resumen
```

- **`idle`**: mismo formulario que el cronómetro normal pero con categorías de tipo `inverse` (`CategoryType`, CODE) y un solo campo de duración objetivo (`ChoiceChip` de tiempos + "Otro"). Texto de ayuda fijo bajo el selector: "Sigue corriendo después del objetivo, hasta el doble como tope. Podés terminar cuando quieras, sin perder nada." (`MOCK-CRONO`, ya alineado con D4/R4).
- **`running_before_target`**: `StateLabel` "Tiempo libre"; anillo `tone="ocio"` (color reservado exclusivamente al inverso, nunca compartido con `accent` de estudio — refuerza que esto NO es una sesión de estudio, útil también para quien mira en espectador); `clock-sub` muestra "objetivo {N} min". Único botón: "Finalizar" (primario).
- **`running_after_target`**: mismo anillo, pero el aro cambia a `tone="warn"` de forma sostenida (no parpadeante) y el subtítulo cambia a "¡meta cumplida! sigue corriendo" (`MOCK-CRONO`) — es la única vez en toda la app que `warn` señala algo positivo, aceptable porque el color siempre va acompañado del texto explícito, nunca solo el color (§1/§15). El botón "Finalizar" pasa a ser el primario resaltado (borde/relleno más marcado) para invitar a cerrar en el punto ideal, sin forzarlo.
- **`closed`**: pantalla de resumen ("Tiempo libre registrado") con el tiempo total (`totalElapsedSeconds`) y la categoría; "Volver a empezar".
- **Cancelación**: confirmación simple de un toque (`03-CRONOMETRO.md` §12.5, `D "REV-MEDIA-8"` — no exige doble confirmación, es ocio) — un `BottomSheet` corto con "¿Terminar sin guardar como completado?" / "Sí, terminar" / "Seguir" (`timerCopy.inverse`, ya as-built), sin el aparato visual de §9.6 (nada de frase personalizada, nada de conteo bloqueado): es una salida de baja fricción a propósito.
- **Vacío/carga/error**: mismo patrón que §9.7 (no hay "lista" en esta pantalla; `idle` no es un vacío, `HYDRATE` reutiliza el mismo `ProgressRing` indeterminado en `tone="ocio"`).

## 11. Pantalla: Calendario por capas

La ampliación de alcance más reciente (brief §12, `03-requisitos/nueva-funcionalidad-calendario-por-capas.md`) y, junto con el Cronómetro, la pantalla más importante de este documento. Modelo de datos ya completo y **no se repite**: `CalendarLayer` (capas personalizadas, `categoryIds[]`, `isVisible`) y `WeeklyGoal.layerVisible?` (capa de meta virtual, nunca almacenada como documento propio) están en `02-DOMINIO.md` §3.3. Regla de color ya fijada: **ninguna capa tiene color propio** — el renderizado usa el color vigente de la categoría de cada ítem (D6), salvo la **excepción CONFIRMADA D6.b**: un ítem con `goalId` pinta su relleno con el color de esa meta (`WeeklyGoal.color`) y, si esa meta tiene `parentGoalId`, se agrega una franja secundaria con el color de la supermeta (§11.1, §11.3) — la capa en sí sigue siendo solo un filtro/interruptor de visibilidad, nunca una fuente de color (brief §12, punto 3 del modelo de datos; `02-DOMINIO.md` §1.2).

### 11.1 Qué consume la pantalla (view model de UI)

```ts
// Forma de UI que consume CalendarScreen. El origen exacto (consultas a `sessions/`, `events/`,
// `goals/`, `calendarLayers/` y su agregación) es responsabilidad de 07-CALENDARIO-ESTADISTICAS-METAS.md
// (o del "assembler" de features/calendar/services/ que ese documento nombre) — aquí solo se fija
// la forma que la UI necesita para pintar, no el algoritmo de consulta.
export interface CalendarItem {
  id: string;
  kind: 'study_session' | 'inverse_session' | 'invisible_event';
  categoryId: string;
  categoryName: string;    // resuelto contra la categoría VIGENTE (color vivo, D6) — nunca un snapshot
  categoryColor: string;   // idem
  goalId?: string;          // + StudySession.goalId si el ítem está asociado a una meta (02-DOMINIO.md §3.3); solo study_session
  goalColor?: string;       // + WeeklyGoal.color de esa meta — manda sobre categoryColor como relleno (D6.b)
  superGoalColor?: string;  // + color de la supermeta (WeeklyGoal.parentGoalId) de esa meta, si la hay — franja secundaria (D6.b)
  start: string;           // ISO
  end: string;             // ISO
  title?: string;          // solo invisible_event (InvisibleEvent.name)
  effectiveMinutes?: number; // solo study_session
  status?: 'completed' | 'cancelled' | 'expired'; // solo study_session/inverse_session
}

export interface CalendarLayerRow {
  kind: 'goal' | 'custom';
  id: string;               // categoryId (goal) o CalendarLayer.id (custom)
  label: string;             // nombre de la categoría (goal) o CalendarLayer.name (custom)
  swatchColors: string[];   // 1 color (goal) o hasta 4 (custom, con "+N" si hay más categorías, §7 DensityBadge)
  isVisible: boolean;
  categoryIds: string[];     // [categoryId] (goal) o CalendarLayer.categoryIds (custom) — para edición
}

export interface CalendarScreenViewModel {
  view: CalendarViewMode;    // §11.5
  anchorDate: string;        // fecha ancla de navegación (ISO, sin hora)
  items: CalendarItem[];     // YA filtrados por capas visibles (§11.1.1)
  goalLayers: CalendarLayerRow[];
  customLayers: CalendarLayerRow[];
  status: 'loading' | 'ready' | 'empty' | 'error';
  errorMessage?: string;
}
```

#### 11.1.1 Regla de visibilidad por capas (default de este documento)

El requerimiento fuente deja abierto qué pasa con un ítem que no pertenece a ninguna capa (`03-requisitos/nueva-funcionalidad-calendario-por-capas.md`, preguntas abiertas). Este documento fija el default siguiente, pensado para que un usuario sin ninguna capa configurada siga viendo *todo* (comportamiento actual, RF-CAL-02) y las capas sirvan solo para **acotar**, nunca para exigir configuración previa:

> Un `CalendarItem` es visible si y solo si: **(a)** ninguna capa (de meta o personalizada) referencia su `categoryId`, o **(b)** al menos una de las capas que sí lo referencian está actualmente visible.

Es decir: un ítem "sin reclamar" por ninguna capa siempre se ve; un ítem reclamado por una o más capas se ve si alguna de esas capas está prendida. Esto es distinto del modelo estricto de Google Calendar (donde *todo* pertenece a algún calendario, empezando por uno "principal") porque aquí las categorías no nacen dentro de una capa — la capa es una anotación posterior y opcional. Función pura propuesta: `isCalendarItemVisible(item, goalLayers, customLayers): boolean`, dominio puro, sin React ni Firebase — el documento que finalmente la implemente (`07-CALENDARIO-ESTADISTICAS-METAS.md` o `features/calendar/domain/`) puede ubicarla donde tenga más sentido junto a las demás funciones de agregación de calendario.

### 11.2 Las cinco vistas

Ampliación de SPEC v1/RF-CAL-01 (día/semana/mes/año) a los cinco niveles de zoom del brief §12: **año, mes, semana, 3 días, día**. Navegación entre vistas: un selector de segmento (`ChoiceChip` en fila, `MOCK-CAL` ya usa flechas ‹/› para navegar dentro de una vista — se mantiene igual para avanzar/retroceder el `anchorDate`, y se añade el selector de vista como una fila de `ChoiceChip` encima, coherente con el resto de la app en vez de un `<select>` nativo).

- **Año**: 12 miniaturas de mes en grilla (`expanded`: 4×3; `medium`: 3×4; `compact`: 2 columnas, scroll vertical). Cada día de cada miniatura pinta una intensidad de `accent` proporcional al total de minutos efectivos de ese día (mapa de calor de un solo tono, no por categoría — a esa escala, puntos por categoría son ilegibles); tocar un día salta a la vista Día de esa fecha, tocar el nombre del mes salta a Mes.
- **Mes**: grilla de 7 columnas, base directa de `MOCK-CAL` (`.day`, puntos por ítem, "+N más" a partir de 4 puntos visibles) — con dos cambios: los puntos ahora respetan la regla de visibilidad de capas (§11.1.1), y tocar un día abre un `BottomSheet`/panel de detalle con la lista completa de ítems de ese día (mismo patrón que `openDaySheet` del mockup), no solo en `compact`.
- **Semana**: la vista "normal" (brief §12, la que más se usa) — tratamiento de densidad completo en §11.3.
- **3 días**: igual que Día (franja horaria) pero con 3 `TimelineDayColumn` lado a lado; en `compact` es deslizable horizontalmente (una pantalla completa por día, swipe para ver el día siguiente/anterior dentro de la ventana de 3); en `medium`/`expanded` las 3 columnas se ven simultáneamente sin scroll horizontal.
- **Día**: una sola `TimelineDayColumn` a ancho completo, rango horario configurable pero con default 06:00–23:00 (fuera de ese rango se colapsa en una franja "antes/después" expandible, evitando scroll vacío para la mayoría de los usuarios) con una línea de "ahora" (`colors.accent`, punteada) cuando `anchorDate` es hoy.

### 11.3 Densidad de la vista Semana

El requisito más explícito del brief §12 ("maximizar densidad sin saturar, como calendarios profesionales"). Tratamiento dependiente de breakpoint (§6):

- **Números concretos de `maxVisibleColumns`** (`07-CALENDARIO-ESTADISTICAS-METAS.md` §1.5/§1.6 delega el valor exacto a este documento, B §12 punto 4): **Semana = 3** (coincide con el default de `layoutDayTimeline` que ya asume 07); **3 días = 5** (más ancho por día que en Semana, mismo mecanismo, menos agresivo); **Día = sin límite práctico** (se omite `maxVisibleColumns`, todo el ancho disponible se reparte entre las columnas simultáneas).
- **`medium`/`expanded`**: grilla de 7 columnas × franja horaria (igual mecánica que Día/3 días, un `TimelineDayColumn` por día de la semana). Bloques de menos de 20 minutos de alto renderizado mantienen una altura mínima legible (`spacing.four`, ~24px) aunque eso implique superponerse levemente en el eje temporal real — es preferible a texto ilegible; el color de categoría se pinta como una franja izquierda de 3px + fondo al 12% de opacidad de `categoryColor` (nunca el color sólido de fondo completo, que rompe la legibilidad del texto encima) + el nombre de la categoría en `typography.body` truncado con elipsis. **Excepción D6.b**: si el `CalendarItem` trae `goalColor` (proviene de una `WeeklyGoal` vía `goalId`), la franja izquierda y el fondo al 12% usan `goalColor` en vez de `categoryColor` — es el relleno principal, identifica la meta; si además trae `superGoalColor` (la meta pertenece a una supermeta vía `parentGoalId`), se agrega una segunda franja de 3px en el borde derecho del bloque con ese color, que identifica visualmente a qué supermeta/"calendario" pertenece (ej. "Universidad"), coherente con `02-DOMINIO.md` §1.2. Un ítem sin `goalId` sigue la regla D6 sin excepción (solo franja izquierda de `categoryColor`, sin franja derecha). Los eventos invisibles usan el mismo bloque pero con borde punteado en vez de franja sólida (extensión directa del contraste "punto sólido vs. anillo hueco" que ya usa `MOCK-CAL` para distinguir sesión real de evento invisible).
- **`compact`**: una grilla de 7 columnas de franja horaria real no cabe con texto legible en una pantalla de teléfono en modo semana (sí en Día/3 días, donde hay una sola columna con todo el ancho). Se usa en su lugar una **agenda vertical por día**: 7 secciones apiladas (una por día de la semana), cada una con su fecha en `typography.mono` + hasta 3 filas de ítems (hora + `CategoryChip` truncado) + `DensityBadge` "+N más" si hay más de 3 — tocar cualquier fila o el badge abre el mismo panel de detalle del día que usa la vista Mes (reutilización de componente, no una cuarta variante de "detalle de día").
- Regla general de truncado en cualquier vista: nombre de categoría a un máximo de ~18 caracteres visibles antes de elipsis en celdas angostas (mes, agenda de semana compacta); el nombre completo siempre está disponible al abrir el detalle del ítem — nunca se pierde información, solo se oculta hasta que el usuario pide verla (principio de progressive disclosure, coherente con "sin saturar" del requisito).

### 11.4 Panel "Mis capas"

Equivalente a "Mis calendarios" de Google Calendar (referencia explícita del requerimiento fuente). Estructura fija en cualquier breakpoint (§6 ya fija el contenedor: hoja inferior en `compact`, panel lateral acoplado en `medium`/`expanded`):

1. Encabezado "Mis capas" + botón "+ Nueva capa" (abre el formulario de §11.4.2).
2. Sección **"Metas"**: una `LayerRow` (`kind="goal"`) por cada `categoryId` de tipo `study` que tenga o haya tenido algún `WeeklyGoal` configurado (histórico completo, brief §12 punto 1 — no solo la semana vigente), con `swatchColors = [categoryColor]`. Si el usuario nunca configuró ninguna meta, la sección no se muestra (no un estado vacío separado dentro del panel, simplemente ausente).
3. Sección **"Mis calendarios"**: una `LayerRow` (`kind="custom"`) por `CalendarLayer`, con `swatchColors` = colores de sus primeras 4 `categoryIds` + `DensityBadge` si tiene más. Cada fila tiene además un glifo "✏️" que abre el formulario de edición (§11.4.2) precargado. Si no hay ninguna capa personalizada, se muestra el `EmptyState` embebido: "Todavía no creaste ninguna capa" + acción "+ Nueva capa" (mismo botón que el encabezado, duplicado aquí para no dejar la sección completamente vacía sin llamado a la acción).
4. En `medium`/`expanded`, un control de colapso (chevron "›"/"‹") oculta el panel dejando solo un botón "▦ Capas" flotante para reabrirlo — util cuando el usuario quiere el ancho completo para la grilla de Semana.

Tocar el interruptor de una `LayerRow`:
- **`kind="goal"`**: invoca un callback `onToggleGoalLayer(categoryId, visible)`. La persistencia exacta ya la resuelve `07-CALENDARIO-ESTADISTICAS-METAS.md` §1.2: escribe siempre sobre la `WeeklyGoal` de `weekKey` más reciente para ese `categoryId` (la misma que `resolveGoalLayers` habría elegido como fuente) — CRUD normal sobre un campo existente, sin arbitraje (D14). Una meta nueva que se cree después para esa misma categoría **no hereda** ese valor explícito: nace con `layerVisible` ausente (⇒ visible). No es un supuesto pendiente de este documento (ver nota tras la tabla de "Supuestos pendientes").
- **`kind="custom"`**: invoca `onToggleCustomLayer(layerId, visible)`, que es un `update` directo de `CalendarLayer.isVisible` — sin ambigüedad, CRUD normal (D14).

Ambos toggles son optimistas en la UI (cambian de inmediato, igual que cualquier otro CRUD sin arbitraje de la app) y sincronizan por Firestore entre dispositivos (brief §12 punto 3 — coherente con que todo lo que no es el timer activo es CRUD en paralelo).

#### 11.4.2 Formulario: crear/editar capa personalizada

Un solo formulario para crear y editar (mismo componente, precargado en edición), en `BottomSheet`:

- Campo **Nombre** (texto, máx. ~30 caracteres, placeholder "Ej: Horario") — obligatorio.
- Selector **multi-categoría**: tres grupos con encabezado (Estudio / Ocio / Eventos, correspondientes a `CategoryType` `study`/`inverse`/`invisible`, CODE), cada categoría como `ChoiceChip` con `CategoryChip` visual (punto de color + nombre) y `selected` como estado múltiple (a diferencia del selector de categoría del Cronómetro, que es single-select) — reutiliza el mismo componente base, cambia solo la cardinalidad de selección. Contador "N categorías seleccionadas" bajo el selector.
- Validación: nombre no vacío y al menos 1 categoría seleccionada (`CalendarLayer.categoryIds: string[]`, "1 o más" — `02-DOMINIO.md` §3.3); botón "Crear capa"/"Guardar cambios" deshabilitado hasta que ambas se cumplan.
- Acción secundaria en modo edición: "Eliminar capa" (`danger-ghost`, confirmación simple de un toque — no es una acción de la disciplina del cronómetro, no necesita doble confirmación de 15+15s).

### 11.5 Vista por defecto configurable

Adición propuesta de UI, siguiendo el mismo patrón de "adición compatible hacia atrás" de `02-DOMINIO.md` §3.3 (campo opcional, ausente ⇒ default):

```ts
// src/domain/entities/user-profile.ts — ADICIÓN DE UI (fase Calendario), propuesta por 06-DISENO-UI.md
export type CalendarViewMode = 'year' | 'month' | 'week' | '3day' | 'day'; // literal '3day' alineado con 07-CALENDARIO-ESTADISTICAS-METAS.md §1.5 (mismo tipo, mismo nombre, documento dueño del algoritmo)

export interface UserSettings {
  // ...campos as-built sin cambios...
  defaultCalendarView?: CalendarViewMode; // + ausente ⇒ 'week' (brief §12: la vista semana es "la normal")
}
```

Expuesto en Ajustes (§13) como una fila de `ChoiceChip` con las 5 opciones (etiquetas: "Año", "Mes", "Semana", "3 días", "Día"); el Calendario arranca en `UserSettings.defaultCalendarView ?? 'week'` y solo cambia de vista por acción explícita del usuario dentro de esa sesión de navegación (nunca "recuerda" la última vista usada por separado del ajuste — una sola fuente de verdad para el default, evita el efecto sorpresa de que la app abra en una vista distinta a la configurada).

### 11.6 Crear evento invisible

Botón flotante "+" (`MOCK-CAL` `.fab`, se mantiene: es la única pantalla de la app con un FAB, porque es una acción secundaria dentro de una vista de consulta densa, no la acción primaria de una pantalla de formulario) abre el mismo panel de detalle de día con un formulario corto al final (nombre, categoría de tipo `invisible`, hora) — ya as-built como patrón en el mockup, solo se reskinnea con los componentes de §7. Recordatorio de copy fijo, coherente con RF-CAL-03: "Un evento invisible es algo planificado que se ve acá pero no suma a tus estadísticas."

### 11.7 Vacío, carga y error

- **Vacío**: sin ítems en el rango visible de la vista actual (no "sin datos en la app completa", que sería raro de comunicar en un calendario) — `EmptyState` discreto, sin ocupar toda la pantalla (la grilla/timeline sigue visible y navegable): "Nada por acá" + ayuda corta "Iniciá una sesión desde el Cronómetro o agregá un evento planificado."
- **Carga**: `SkeletonBlock` sobre la forma de la vista activa (filas para agenda/mes, columnas grises para timeline) — nunca un spinner de pantalla completa que reemplace la grilla, porque cambiar de vista o navegar de período no debería sentirse como una recarga total.
- **Error**: `ErrorState` con `onRetry`, mostrado en el lugar de la lista de ítems (el panel de capas y la navegación de fecha siguen interactivos — un fallo de lectura de `sessions/`/`events/` no debería impedir seguir navegando o ajustar capas).

## 12. Pantalla: Estadísticas

Base: `MOCK-STATS` ("Cuaderno de progreso"), con la salvedad de que la fórmula exacta de cada número (racha, agregación por categoría, estrella) es de `07-CALENDARIO-ESTADISTICAS-METAS.md` (D6/D7 ya fijan las reglas de negocio, no se repiten aquí) — esta sección fija layout, componentes y estados.

- **Encabezado**: título "Cuaderno de progreso" (Fraunces) + rango vigente en `muted` (p. ej. "1–7 sep 2026") + navegación ‹/› del período; selector de período como `ChoiceChip` (Semana/Mes/Año) — sustituye el `<select>`/pestañas ad-hoc del mockup por el mismo componente ya usado en el resto de la app.
- **Pestañas Estudio/Ocio**: `ChoiceChip` de dos opciones (categorías `study` vs. `inverse`, `CategoryType` CODE) — cambia qué categorías alimentan el desglose de abajo, nunca duplica toda la pantalla.
- **Tiles de resumen**: fila de 3 tarjetas (`typography.mono` para el valor grande, `muted` para la etiqueta) — minutos del período, racha en días, sesiones completadas. En `compact` se apilan en fila con scroll horizontal solo si no caben 3 (evitar 2+1 descompensado); en `medium`+ siempre 3 en fila.
- **Sparkline de los últimos 14 días**: barras verticales en `accent` (o `ocio` en la pestaña Ocio), altura proporcional al máximo del rango, con el día de hoy resaltado con un borde de 1px en `ink`; etiquetas de día en `typography.mono` diminuto debajo. Barras nunca son el único indicador — al tocar/enfocar una barra, un tooltip/leyenda accesible (§15) da el valor exacto en minutos.
- **Desglose por categoría**: filas ordenadas de mayor a menor minutos, cada una `CategoryChip` (color vigente) + barra de proporción (relleno `categoryColor` sobre pista `rule`) + valor en `typography.mono` a la derecha. Vacío de esta sección específica (hay datos del período pero ninguna categoría con minutos): "Todavía no hay sesiones completadas este período."
- **Metas semanales**: una tarjeta por fila de la agregación por categoría (brief §11: "una fila por categoría, agregación derivada de todas las `WeeklyGoal` que compartan `categoryId`, sin importar jerarquía de supermeta" — la Galaxia de V1.1 no cambia esta vista, solo le agrega una visualización alternativa) — `CategoryChip` + barra de progreso con dos tonos: `met` en `accent` cuando `achievedSeconds >= targetSeconds`, `partial` en `warn` en caso contrario (nunca `danger` — no cumplir una meta semanal a mitad de semana no es un error, es progreso en curso). Vacío: "No hay metas configuradas todavía" + acción "Configurar metas" (deep-link al formulario de metas, `ROUTES.modals.weeklyGoal`, CODE).
- **Estrella del mes**: tarjeta con `★` grande (glifo, `accent` si `earned`, `muted`/atenuado si no) — texto siempre explica la razón en una línea ("Cumpliste todas tus metas configuradas este mes" / "Te faltó cumplir 2 metas este mes" / si el mes no tiene ninguna meta configurada, la tarjeta entera no se muestra, D7: un mes sin metas no es un "fallo", es una ausencia de intento y no merece ni el badge ni un mensaje negativo).
- **Carga**: `SkeletonBlock` con la misma composición de tiles+sparkline+filas, para que el layout no salte al llegar el dato real.
- **Error**: `ErrorState` con `onRetry` reemplazando todo el cuerpo bajo el encabezado (el selector de período sigue interactivo).
- **View model** (forma de UI; el agregador exacto es de `07-CALENDARIO-ESTADISTICAS-METAS.md`):

```ts
export interface StatsScreenViewModel {
  categoryTypeTab: 'study' | 'inverse';
  period: 'week' | 'month' | 'year';
  rangeLabel: string;                 // ya formateado ("1–7 sep 2026")
  totalMinutes: number;
  streakDays: number;
  completedSessionsCount: number;
  last14DaysMinutes: number[];        // longitud 14, día más reciente al final
  categoryBreakdown: { categoryId: string; categoryName: string; categoryColor: string; minutes: number }[];
  weeklyGoals: { categoryId: string; categoryName: string; categoryColor: string; targetSeconds: number; achievedSeconds: number }[];
  monthStar: { earned: boolean; reason: string } | null; // null = mes sin metas configuradas, no se muestra la tarjeta
  status: 'loading' | 'ready' | 'error';
  errorMessage?: string;
}
```

## 13. Pantalla: Ajustes

**Acceso**: Ajustes deja de ser una pestaña propia del tab bar (§6; brief §12.5 reemplaza el modelo anterior de 4 destinos, donde Ajustes sí era una pestaña) — se abre desde un botón mini (glifo ⚙, §7) dentro del hub de Inicio. Es un cambio de punto de entrada únicamente: el contenido y las secciones de abajo no cambian.

Lista de secciones colapsables, cada una un `ThemedView` con encabezado `smallBold`. Varias ya tienen componente as-built (Fase de categorías/presets/settings) — este documento fija dónde entran visualmente y qué se agrega:

| Sección | Contenido | Estado |
|---|---|---|
| Cuenta | Email (solo lectura), zona horaria (`UserProfile.timezone`, editable — selector de IANA timezone, CODE ya la persiste), "Cerrar sesión" | Nuevo (layout), lógica ya as-built vía `useAuthUser` |
| Apariencia | Modo de color (`ChoiceChip` Claro/Oscuro/Sistema, §5), reducir movimiento (switch, override manual sobre la señal del SO), efectos de celebración (switch), selector de skin (`ChoiceChip` — en V1 una sola opción "Papel", deshabilitada/informativa; se activa sola cuando exista un segundo skin, sin cambios de código en esta pantalla) | Nuevo |
| Calendario | Vista por defecto (§11.5, `ChoiceChip` de 5 opciones) | Nuevo |
| Sonido | `SoundPreferencesSection` (CODE) — sin cambios funcionales, reskin a tokens de §4 | As-built, reskin |
| Notificaciones | Switch `UserSettings.notificationsEnabled` (CODE) | Nuevo (layout), campo ya as-built |
| Frase de cancelación | `CancellationPhraseEditor` (CODE) — mismo componente, reskin (el glifo ✏️ ya es coherente con §7) | As-built, reskin |
| Categorías | `CategoryManagementSection` (CODE) — lista por `CategoryType`, con `CategoryChip`/`ChoiceChip` de color (paleta `CategoryPalette` + selector RGB manual, ya as-built en `color-picker.tsx`) | As-built, reskin |
| Presets | `PresetManagementSection` (CODE) | As-built, reskin |
| Este dispositivo | Plataforma + nombre de dispositivo (`DeviceIdentity`, CODE), rol actual si hay sesión activa (`RolePill`, §9.2), nota breve: "Si cambiás de celular, cerrá sesión acá antes de instalar la app en el nuevo" (recomendación de `04-SINCRONIZACION.md` §13.3) | Nuevo |

- **Vacío**: no aplica (es configuración, siempre tiene contenido); las subsecciones de listas (Categorías/Presets) usan su propio `EmptyState` ya as-built o el de §7 si aún no lo tienen ("Todavía no creaste ninguna categoría de este tipo" + acción).
- **Carga**: cada sección se hidrata independientemente desde `useUserSettings()`/`useCategories()`/`usePresets()` (CODE) — `SkeletonBlock` por sección mientras resuelve, nunca un spinner de pantalla completa (el usuario puede querer tocar "Cerrar sesión" mientras el resto sigue cargando).
- **Error**: por sección, `ErrorState` acotado al bloque que falló (un error de `CategoryRepository` no debe ocultar el resto de Ajustes).

## 14. Microinteracciones

Todas construidas sobre `react-native-reanimated`/`react-native-gesture-handler` (ya instalados, costo cero) y respetando `reduceMotion` (§5) sin excepción — cada regla de abajo tiene su versión "reducida" implícita: fundido en vez de desplazamiento, `durationFastMs` en vez de `durationBaseMs`/`durationSlowMs`.

| Interacción | Comportamiento | Duración/curva |
|---|---|---|
| Selección de `ChoiceChip`/`CategoryChip` | Cambio de fondo (`paperRaised`→`accentSoft`) + borde (`ruleStrong`→`accent`) | `durationFastMs`, `easingStandard` |
| Apertura de `BottomSheet` | Desliza desde abajo (`compact`) o fundido+escala 0.98→1 (`medium`/`expanded`) | `durationBaseMs`, `easingDecelerate` |
| Cierre de `BottomSheet` | Inverso de la apertura, siempre más rápido que abrir (percepción de salida ágil) | `durationFastMs` |
| `ProgressRing` cambiando de tramo (p. ej. `study_running`→`study_completed_waiting_response`) | Cambio de `tone` con cross-fade de color; el trazo no "salta" de longitud, se recalcula sobre el nuevo `segmentTargetSeconds` en el siguiente tick | `durationBaseMs` en el color, instantáneo en la geometría |
| Botón bloqueado de cancelación (§9.6) | El texto del propio botón cuenta hacia atrás; al desbloquear, un pulso único de opacidad (no un rebote) marca el cambio de estado | `durationFastMs` |
| Toggle de una `LayerRow` (§11.4) | Checkbox con marca que aparece/desaparece con fundido; el ítem afectado en la vista de calendario aparece/desaparece con el mismo fundido, no un recálculo brusco de layout | `durationFastMs` |
| Arrastre de planeta en la Galaxia (V1.1) | Física de resorte + amortiguación ya prototipada en `MOCK-GALAXIA` (`decisiones-visuales-galaxia.md`) — fuera de alcance de V1, se documenta completo en `10-GALAXIA-Y-TIENDA.md` §7; aquí solo se fija que respeta `reduceMotion` igual que el resto (posición "home" instantánea, sin resorte) | — |
| Celebración (estrella ganada, meta cumplida) | Si `celebrationEffectsEnabled`: un único destello/rebote breve en el elemento afectado, nunca pantalla completa ni confeti — coherente con "reposo antes que movimiento" (§1) | `durationSlowMs`, una sola vez |
| Pull-to-refresh / navegación entre períodos (Calendario, Estadísticas) | Sin gesto de pull-to-refresh custom (Firestore + `onSnapshot`/suscripciones ya mantienen los datos vivos, un refresh manual no debería ser necesario); la navegación ‹/› anima el contenido saliente/entrante con un desplazamiento lateral breve | `durationFastMs` |

## 15. Accesibilidad

Estándar de referencia: **WCAG 2.1 nivel AA** (ausente de los originales v1, hallazgo BAJO de `revision-spec-beta.md` §39/§44 — este documento lo fija explícitamente, cerrando ese hallazgo).

- **Contraste**: todos los pares texto/fondo del skin "Papel" (§4.1) deben cumplir ≥ 4.5:1 para texto normal y ≥ 3:1 para texto grande/elementos gráficos — verificado al fijar los valores hex (mismos que `MOCK-CRONO`, ya diseñados con ese criterio en mente por el contraste alto tinta/papel). `muted`/`textSecondary` es el par de menor margen: se usa solo para texto secundario, nunca para el único portador de información crítica (ventanas de expiración, errores).
- **Nunca solo color** (SPEC v1 §39, ya recogido como comentario as-built en `constants/theme.ts` `StatusColors`): todo estado crítico (ventana por vencer, sesión cancelada/expirada, meta no cumplida, capa oculta) se acompaña siempre de texto o un glifo, nunca de un cambio de color aislado. Ya aplicado explícitamente en §9.3 (ayuda en texto bajo cada `*_waiting_response`), §11.2 (puntos + forma sólida/punteada para sesión real vs. evento invisible, no solo color), §12 (barra de meta con texto de valores, no solo el color del relleno).
- **Foco de teclado** (relevante en web/desktop-PWA, plataforma primaria de gestión): todo control interactivo tiene un anillo de foco visible en `colors.focus` (= `accent`, nunca un tercer color, §4.1) con `outline-offset` perceptible; el orden de tabulación sigue el orden visual/DOM natural de cada pantalla, sin `tabIndex` manual salvo para saltar overlays cerrados. `BottomSheet`/diálogos atrapan el foco mientras están abiertos y lo devuelven al elemento que los abrió al cerrarse.
- **Roles y etiquetas** (`accessibilityRole`/`accessibilityLabel`/`accessibilityState` de React Native, ya usados en el as-built `cancellation-phrase-editor.tsx`/`auth-text-field.tsx`): todo `Pressable`/botón declara `accessibilityRole="button"`; los controles deshabilitados-por-espectador (§9.2) declaran `accessibilityState={{ disabled: false }}` explícitamente **falso** con un `accessibilityHint` que explique que tocar abre la solicitud de control, en vez de leerse como deshabilitado (evita que un lector de pantalla anuncie un control como inactivo cuando en realidad dispara una acción); el `ProgressRing` expone `accessibilityLabel` dinámico con el tiempo restante en palabras ("12 minutos con 30 segundos restantes"), no solo el valor visual.
- **Tamaño de toque**: todo control interactivo mide al menos 44×44px lógicos (guía iOS/Android estándar, aplica igual a web táctil), incluso cuando su representación visual (un glifo pequeño, un punto de color) es más chica — el área de toque se expande con padding invisible, nunca se reduce el objetivo al tamaño del glifo.
- **`prefers-reduced-motion`**: cubierto en detalle en §5; se repite aquí solo como ítem de la checklist de accesibilidad, no se redefine.
- **Escalado de texto del sistema**: todos los tamaños de `typography` se definen en unidades que respetan el escalado de fuente del SO (`allowFontScaling` no se desactiva en ningún `ThemedText`) — una excepción deliberada: los relojes de `typography.mono` en `ProgressRing` fijan un tamaño mínimo estable para no romper el layout circular a escalados extremos, con el valor numérico igual de accesible vía `accessibilityLabel` (punto anterior).
- **Idioma declarado**: `lang="es"` en el `<html>` de la build web (Expo Router web ya lo resuelve por configuración de proyecto, no de este documento) y `accessibilityLanguage="es"` donde React Native lo exponga, para que lectores de pantalla usen la pronunciación correcta del español.

## 16. Internacionalización (i18n)

V1 es monolingüe (español neutro, "tú"/forma verbal de segunda persona sin "vos" — supuesto pendiente §10.7 del brief, ya resuelto a favor de "tú" por instrucción directa del orquestador para todos los documentos de `docs/`, sustituyendo el "vos" de `MOCK-CRONO`/`MOCK-CAL`/`MOCK-STATS`, que se escribieron antes de esa decisión). Toda cadena visible al usuario vive en `src/i18n/es.ts` (CODE, ya existe con `timerCopy`/`DEFAULT_CANCELLATION_PHRASE`) — este documento extiende esa misma tabla con las cadenas que faltan; ningún componente de UI concatena texto de usuario hardcodeado fuera de ese archivo.

| Clave (`src/i18n/es.ts`) | Texto | Corrige respecto al mockup |
|---|---|---|
| `timerCopy.cancelSession.*` | (ya as-built, ver `03-CRONOMETRO.md` §8.3) | — |
| `timerScreen.stakesHelper` | "Si no respondés a tiempo se pierde el tiempo de este bloque." | Se mantiene igual (ya en "tú" implícito por ser impersonal) |
| `timerScreen.sessionCompletedTitle` | "Sesión terminada" | — |
| `timerScreen.sessionCancelledTitle` | "Sesión cancelada" | `MOCK-CRONO` decía "Bloque cancelado" (§9.3) |
| `timerScreen.sessionExpiredTitle` | "Se pasó el tiempo" | — |
| `timerScreen.lunchUnavailableHelper` | (ya as-built, `timerCopy.lunch.unavailable`) | — |
| `inverseScreen.targetReachedHelper` | "¡Meta alcanzada! Sigue corriendo." | "vos" → "tú"/impersonal |
| `inverseScreen.hardCapHelper` | "Sigue corriendo después del objetivo, hasta el doble como tope. Podés terminar cuando quieras, sin perder nada." | "Podés" → "Puedes" |
| `calendarScreen.viewLabels` | `{ year: 'Año', month: 'Mes', week: 'Semana', '3day': '3 días', day: 'Día' }` | Nuevo (brief §12); clave `'3day'`, no `threeDay` — alineada con `CalendarViewMode` de `07-CALENDARIO-ESTADISTICAS-METAS.md` §1.5 |
| `calendarScreen.layersTitle` | "Mis capas" | Nuevo |
| `calendarScreen.goalLayersSection` | "Metas" | Nuevo |
| `calendarScreen.customLayersSection` | "Mis calendarios" | Nuevo |
| `calendarScreen.newLayerAction` | "+ Nueva capa" | Nuevo |
| `calendarScreen.layerFormNamePlaceholder` | "Ej: Horario" | Nuevo |
| `calendarScreen.layerFormCategoriesCount` | `(n: number) => n === 1 ? '1 categoría seleccionada' : \`${n} categorías seleccionadas\`` | Nuevo |
| `calendarScreen.emptyHelper` | "Iniciá una sesión desde el Cronómetro o agregá un evento planificado." | "Iniciá"/"agregá" → "Inicia"/"agrega" |
| `calendarScreen.invisibleEventNote` | (ya en `MOCK-CAL`, sin cambio de fondo) "Un evento invisible es algo planificado que se ve acá pero no suma a tus estadísticas." | — |
| `statsScreen.title` | "Cuaderno de progreso" | — |
| `statsScreen.tabs` | `{ study: 'Estudio', inverse: 'Ocio' }` | `MOCK-STATS` decía "productiva"/"ocio" como `type` interno; el label visible ya era "Estudio"/"Ocio" |
| `statsScreen.emptyBreakdown` | "Todavía no hay sesiones completadas este período." | Generaliza "este mes" → "este período" (ahora hay 3 períodos) |
| `statsScreen.emptyGoals` | "No hay metas configuradas todavía." | — |
| `statsScreen.configureGoalsAction` | "Configurar metas" | Nuevo |
| `statsScreen.streakLabel` | "racha (días)" | — |
| `settingsScreen.sectionAccount` | "Cuenta" | Nuevo |
| `settingsScreen.sectionAppearance` | "Apariencia" | Nuevo |
| `settingsScreen.colorSchemeOptions` | `{ light: 'Claro', dark: 'Oscuro', system: 'Sistema' }` | Nuevo |
| `settingsScreen.reduceMotionLabel` | "Reducir movimiento" | Nuevo |
| `settingsScreen.thisDeviceSection` | "Este dispositivo" | Nuevo |
| `settingsScreen.deviceMigrationHint` | "Si cambiás de celular, cerrá sesión acá antes de instalar la app en el nuevo." | Coherente con "tú": se corrige aquí mismo a "Si cambias de celular, cierra sesión acá antes de instalar la app en el nuevo." |
| `common.retry` | "Reintentar" | Nuevo (usado por `ErrorState`, §7) |
| `common.loading` | "Cargando…" (solo como `accessibilityLabel` de `SkeletonBlock`, nunca texto visible permanente) | Nuevo |

Todas las filas nuevas de esta tabla usan "tú"/imperativo de "tú" de forma consistente ("Configura", "Inicia", "agrega"), corrigiendo cualquier "vos" heredado de los mockups de `productvt-9b`, que se escribieron antes de que esta convención quedara fijada para todo `docs/`.

## 17. Qué NO se adopta de los mockups

Los mockups HTML (`MOCK-CRONO`, `MOCK-CAL`, `MOCK-STATS`, `MOCK-GALAXIA`) son prototipos de exploración visual en un navegador de escritorio, no código de producción — son fuente de tokens, layout y flujo, no de implementación literal. Puntos explícitos donde este documento se aparta:

- **Idioma "vos"**: los cuatro mockups usan "vos" ("¿Seguro que querés…?", "Podés terminar cuando quieras") — el canon de `docs/` fija "tú" para toda la app (§16); ningún copy de mockup se copia sin corregir la conjugación.
- **"Bloque cancelado" como título de cierre**: `MOCK-CRONO` titula así el estado terminal de cancelación; se corrige a "Sesión cancelada" (§9.3) por la convención de vocabulario ya fijada en `decisiones-tomadas.md`.
- **`<canvas>` 2D para la galaxia**: `MOCK-GALAXIA` dibuja todo con la API `CanvasRenderingContext2D` del navegador. React Native no tiene un `<canvas>` equivalente sin una librería adicional no instalada (`react-native-canvas` o similar); la implementación real de V1.1 (`10-GALAXIA-Y-TIENDA.md` §12, ya lo anticipa) usa `Views`/SVG posicionados con `react-native-reanimated` + `react-native-gesture-handler` (ya instalados) en vez de un canvas de trazos manuales — la física de arrastre/resorte se traduce a esa base, no se porta el código del mockup.
- **Persistencia en `localStorage`**: todos los mockups guardan su estado de demo en `localStorage` del navegador (categorías, presets, layout de galaxia, capas). La app real nunca usa `localStorage`/`AsyncStorage` como fuente de verdad de datos de usuario — es Firestore vía repositorios (`02-DOMINIO.md` §5, `04-SINCRONIZACION.md`); `AsyncStorage` solo acelera el arranque del dispositivo dominante (D15).
- **Panel de depuración de `MOCK-CRONO`** ("Panel de prueba — no es parte de la app", selector de velocidad del reloj, botón "pedir el control", contador de bloques desde el último almuerzo): es explícitamente andamiaje de demo del propio mockup, nunca una pantalla ni un componente de la app real.
- **`<select>` nativos del navegador**: los mockups usan `<select>` HTML para elegir bloques-antes-de-descanso-largo, tipo de tiempo personalizado, etc. La app usa `ChoiceChip` (§7) de forma consistente en todos esos casos — un `<select>`/`Picker` nativo solo se reserva para listas largas sin equivalente razonable en chips (p. ej. el selector de zona horaria IANA en Ajustes, §13).
- **Datos de ejemplo generados de forma determinística** (`calendario.html`/`estadisticas.html` siembran sesiones falsas con una fórmula basada en el día del mes): es fixture de demo, no una regla de negocio ni un patrón de UI a preservar.
- **Layout de cinco pestañas de `inicio.html`, corrección respecto a una versión anterior de este documento**: una redacción previa de esta sección rechazaba el layout de cinco pestañas de esa maqueta ("V1 mantiene los cuatro destinos as-built... sin una pestaña de galaxia — es V1.1"), citando una versión del brief anterior a la confirmación del creador. Eso queda **superado**: brief §12.5 ("CONFIRMADO por el creador, 2026-09-06") fija exactamente 5 pestañas — Inicio, Cronómetro, Calendario, Estadísticas, Tienda — y ordena explícitamente "reemplaza cualquier supuesto anterior de '4 secciones'... o de estructura de tabs distinta en documentos ya escritos — corregir donde aparezca". El layout de cinco pestañas de `inicio.html` **sí se adopta** desde V1 (§6); lo que sigue sin adoptarse de esa maqueta es su implementación técnica completa: la galaxia interactiva (arrastre, subgalaxias) y el catálogo de compra de la Tienda siguen siendo V1.1 (`10-GALAXIA-Y-TIENDA.md`, brief §11) — en V1, Inicio muestra como mínimo la racha (ya resuelto, D "Racha de estudio") y el botón "Crear", con la galaxia embebida en una forma simplificada/placeholder hasta que V1.1 la complete.
- **Colores de categoría de ejemplo de los mockups** (`#B06A3A`, `#4E6E8E`, etc., usados como datos de demostración para categorías ficticias como "Matemáticas"/"Lectura"): no son parte del skin ni de `CategoryPalette` (que ya está fijada en `constants/theme.ts`, CODE, con su propia paleta de 12 colores) — son solo contenido de ejemplo del prototipo.

## Supuestos pendientes de confirmar

Solo los supuestos que introduce este documento (los de negocio ya listados en `_brief-orquestador.md` §10 y `02-DOMINIO.md` no se repiten aquí salvo que este documento les agregue una faceta de UI):

| # | Supuesto | Default asumido aquí | Si se decide distinto |
|---|---|---|---|
| 1 | **Regla de visibilidad de capas cuando un ítem no está reclamado por ninguna** (§11.1.1) — el requerimiento fuente no lo resuelve. | Un ítem sin ninguna capa que lo referencie es siempre visible (las capas solo acotan, nunca exigen configuración previa); un ítem reclamado se rige por el OR de sus capas. | Cambiaría solo la función pura `isCalendarItemVisible` (dominio, no este documento) y el copy de ayuda del panel de capas; no afecta el esquema de `CalendarLayer`/`WeeklyGoal.layerVisible`. |
| 2 | **`UserSettings.defaultCalendarView`** (§11.5) — campo nuevo no presente todavía en `02-DOMINIO.md`, propuesto aquí siguiendo el patrón de adición compatible de §3.3 de ese documento. | `defaultCalendarView?: CalendarViewMode`, ausente ⇒ `'week'`. | Quien mantenga `02-DOMINIO.md` puede incorporarlo literal a su §3.3/§5.1 en su próxima revisión; no cambia su tipo ni su semántica. |
| 3 | **Implementación del `ProgressRing`** (§7) sin `react-native-svg` instalado. | Se implementa con `View`s/transformaciones CSS-en-RN si el resultado visual es limpio; si no, se admite sumar `react-native-svg` como dependencia menor de costo cero. | Decisión técnica de la fase de implementación del cronómetro, no bloquea este documento — el contrato de props (`progress`, `tone`, `centerContent`) es igual en ambos casos. |
| 4 | **Paquetes `@expo-google-fonts/*` para Fraunces/Archivo/IBM Plex Mono** (§4.2) — el brief §8 ya exige estas tipografías "empaquetadas con `expo-font`"; este documento fija los paquetes concretos. | `@expo-google-fonts/fraunces`, `@expo-google-fonts/archivo`, `@expo-google-fonts/ibm-plex-mono` (MIT/OFL, sin costo, sin API key). | Si se prefiere auto-alojar los archivos de fuente en `assets/fuentes/` (ya existe esa carpeta en el repo) en vez de depender de esos paquetes, el resultado visual es idéntico — solo cambia el mecanismo de carga en `_layout.tsx`. |
| 5 | **Español "tú" en toda la app** (brief §10.7, "el mockup usa vos") — no es un supuesto nuevo de este documento, pero es el primero en aplicarlo de forma exhaustiva a copys de pantalla completos (§16-§17); se asume resuelto a favor de "tú" por ser la convención ya fijada para `docs/` en las instrucciones de redacción transversales. | "Tú" en todos los copys nuevos de este documento. | Si el creador prefiere "vos" (coherente con el mockup original de frontend), es un cambio mecánico de conjugación en `src/i18n/es.ts`, sin impacto en componentes ni layout. |

**Ya no pendiente** (estaba aquí como ítem 2 en una versión anterior de esta tabla): la continuidad de `WeeklyGoal.layerVisible` entre semanas la resuelve `07-CALENDARIO-ESTADISTICAS-METAS.md` §1.2 — la `WeeklyGoal` de `weekKey` más reciente para un `categoryId` es la fuente de `layerVisible` (comparación lexicográfica de `WeekKey`, que ya coincide con el orden cronológico); una meta nueva que se cree después para esa misma categoría **no hereda** el valor explícito de la anterior, nace con `layerVisible` ausente (⇒ visible). §11.4 ya cita esta resolución.

## Trazabilidad

| Sección de este documento | Regla / decisión | Fuente(s) |
|---|---|---|
| §1 Filosofía visual | Tono no punitivo; color solo para categorías/estado | D1.b; `MOCK-CRONO`, `MOCK-GALAXIA`, `decisiones-visuales-galaxia.md` |
| §2 Arquitectura del tema (tokens/skins/AssetRegistry) | "Cambiar gráficos = cambiar skin, sin tocar lógica" | B §8 |
| §2 Reemplazo de `constants/theme.ts` | Gobierno "adopta lo sano, corrige lo que contradiga una decisión" | B (párrafo de gobierno, encabezado del brief) |
| §3 API `ThemeProvider`/`AssetRegistry` | Mecanismo de skins + fallback que nunca falla | B §8; `02-DOMINIO.md` §3.5 (`AssetRegistry` citado, no definido, ahí) |
| §4 Skin "Papel", tokens exactos | Paleta, tipografías Fraunces/Archivo/IBM Plex Mono | B §8; `MOCK-CRONO` (leído completo) |
| §5 Claro/oscuro y `reduceMotion` | `UserSettings.visualPreferences` ya as-built | CODE (`user-profile.ts`); B §8 "modo claro/oscuro obligatorio... `prefers-reduced-motion` respetado" |
| §6 Layout responsive, breakpoints | Teléfono = tabs; tablet/desktop = barra lateral | B §8; brief §12 "responsive real... no solo mobile-first" |
| §7 Inventario de componentes | `RolePill`/`ProgressRing`/`ChoiceChip`/`BottomSheet`/`StateLabel`/`CategoryChip` a formalizar | B §8 (lista explícita de componentes); `MOCK-CRONO` |
| §7 Iconografía tipográfica (sin librería de íconos) | Precedente as-built, sin costo adicional | CODE (`cancellation-phrase-editor.tsx`); `package.json` (sin librería de íconos) |
| §8 Auth | Reskin del flujo Email/Password + Google ya as-built | CODE (`(auth)/*`, `features/auth/**`); B §6 |
| §9 Cronómetro, 10 estados | `TimerStateName` completo, sin repetir transición/guarda | CODE (`timer-state.ts`); `03-CRONOMETRO.md` §1, §4 |
| §9.2 Espectador y diálogo de dominante | Protocolo de solicitud/cambio de control | R14, D14; `04-SINCRONIZACION.md` §4-§5 |
| §9.4 Ventana de respuesta, urgencia visual | Umbral 30s/10min por tamaño de tramo | `03-CRONOMETRO.md` §3 |
| §9.5 Selector de descanso, 5 salidas | Transiciones de `break_selection` | `03-CRONOMETRO.md` §5 |
| §9.6 Cancelación, copy neutro | Misma fricción, sin elementos punitivos de UI | R25, D1.b; `03-CRONOMETRO.md` §8.1/§8.3 (delega el tratamiento visual explícitamente a este documento) |
| §10 Temporizador inverso | Sin doble confirmación; tope `2·T` | R4, D4; `03-CRONOMETRO.md` §12; CODE (`inverse-timer-machine.ts`) |
| §11 Calendario por capas completo | Modelo de datos, 5 vistas, plataformas ambas, vista por defecto | B §12; `03-requisitos/nueva-funcionalidad-calendario-por-capas.md`; `02-DOMINIO.md` §3.3 (`CalendarLayer`, `WeeklyGoal.layerVisible`) |
| §11.1.1 Regla de visibilidad por capas | Default propuesto por este documento (sin precedente) | Ver Supuestos #1 |
| §11.3 Densidad de la vista Semana | "Maximizar densidad sin saturar, como calendarios profesionales" | B §12; `03-requisitos/nueva-funcionalidad-calendario-por-capas.md` §3 |
| §11.5 Vista por defecto configurable | `UserSettings` nuevo campo, adición compatible | B §12; patrón de adición de `02-DOMINIO.md` §3.3 |
| §12 Estadísticas | Layout sobre agregación ya resuelta en D6/D7 | `MOCK-STATS`; D6, D7; `01-SPEC.md` §9 (referido, no repetido) |
| §12 Reconciliación meta/supermeta en Estadísticas | Agregación derivada por `categoryId`, no por jerarquía | B §11 ("modelo de meta reconciliado") |
| §13 Ajustes | Secciones ya as-built + Apariencia/Calendario/Este dispositivo nuevas | CODE (`features/settings/**`); §5, §11.5, `04-SINCRONIZACION.md` §13.3 (recomendación de migración) |
| §14 Microinteracciones | Duraciones/curvas de `MotionTokens`, respeto de `reduceMotion` | §3.1, §5; `MOCK-GALAXIA` (física de arrastre, V1.1) |
| §15 Accesibilidad | WCAG 2.1 AA; "nunca solo color" | REV-BAJA (`revision-spec-beta.md` §39/§44); CODE (`StatusColors`, comentario as-built) |
| §16 i18n | "Tú", tabla centralizada en `src/i18n/es.ts` | B §10.7 (supuesto, resuelto a "tú"); CODE (`i18n/es.ts`) |
| §17 Qué no se adopta | Mockups como fuente de tokens/flujo, no de implementación literal | B §5 (fuente 5 del brief: "mockup... fuente de tokens... y flujo de pantalla") |

Nota final: este documento no fue leído ni citado por `07-CALENDARIO-ESTADISTICAS-METAS.md` ni `10-GALAXIA-Y-TIENDA.md` al momento de escribirse (ambos en construcción paralela, con marcadores `PENDIENTE`) — donde ese trabajo en curso termine nombrando un tipo o una función distinta a la propuesta aquí para la misma idea (p. ej. el nombre exacto del assembler que produce `CalendarItem[]`), prevalece el nombre que fije el documento dueño de esa capa (07 para agregación de datos, 10 para el catálogo de Tienda) y este documento debe ajustarse a esa cita en una revisión posterior, sin que eso invalide la forma de UI aquí descrita.
