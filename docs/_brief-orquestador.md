# Brief transversal del orquestador — Productvt Beta v2

Documento de trabajo (2026-09-05, sesión `productvt-90`; revisado 2026-09-06). Fija las decisiones **transversales** que todos los documentos de `docs/` deben respetar al pie de la letra, para que ocho redactores distintos produzcan un conjunto coherente. Donde este brief y un documento de `docs/` difieran, gana este brief; donde este brief y las respuestas literales del creador difieran, ganan las respuestas del creador (están al final).

**Gobierno (2026-09-06, palabra del creador: "tú eres el líder")**: la sesión `productvt-90` lidera planificación, arquitectura y canon (`docs/`). La sesión `BC Orquestador Productvt` construye el código en `productvt-beta/` siguiendo ese canon; `productvt-eb` mantiene `03-requisitos/` como canal de decisiones; `productvt-cb` produce mockups/UX en `00-vision/` y `01-mockups/`. Donde el código ya commiteado sea sano y solo difiera en nombres o forma de guardar, **el canon adopta lo construido** (no se renombra código por estética); donde el código contradiga una decisión del creador, se corrige el código.

Fuentes, en orden de autoridad:
1. Respuestas literales del creador a las 24 preguntas (sección final de este documento).
2. `03-requisitos/decisiones-tomadas.md` (v2) — interpretación ya validada de esas respuestas.
3. Este brief (decisiones de diseño delegadas al orquestador).
4. `03-requisitos/revision-spec-beta.md` — revisión externa del SPEC v1: **todo hallazgo ALTO y MEDIO debe quedar resuelto explícitamente** en algún documento de `docs/`.
5. `01-mockups/mobile/cronometro.html` — mockup del cronómetro hecho por la sesión de frontend: fuente de los tokens de diseño base y del flujo de pantalla del timer.
6. `docs/originales/*` — SPEC/ARCHITECTURE/IMPLEMENTATION_PLAN v1 y prompt inicial: punto de partida, **no** fuente de verdad.

---

## 1. Terminología canónica (obligatoria en todos los documentos)

| Término | Significado | Sustituye a |
|---|---|---|
| **Sesión** (`StudySession`) | Contenedor: la corrida completa de bloques y descansos desde "Iniciar" hasta que se termina, cancela o expira. | "bloque" en el sentido del SPEC v1 §14 |
| **Bloque** (`StudyBlock`) | Un tramo continuo de estudio (p. ej. 25 min según el preset). **Es la unidad de registro y de estadísticas.** | "ciclo" del SPEC v1 |
| **Descanso** corto / largo / personalizado | Tramos de pausa entre bloques. El personalizado consume el banco. | — |
| **Almuerzo** | Pausa de 45 min que no mata la sesión ni consume banco; disponible cada 3 bloques. | "botón de pánico" |
| **Banco de descanso** | Segundos de descanso no usados, acumulados dentro de la sesión actual. | — |
| **Ventana de respuesta** | Plazo para responder tras terminar un bloque o un descanso (30 s o 10 min). | "plazo para matar el bloque" |
| **Tiempo efectivo** | Suma de la duración de los bloques **completados**. Nunca incluye descansos ni almuerzo. | — |
| **Bloque inverso** (`InverseSession`) | Registro de ocio/anti-estudio con el temporizador inverso. | — |
| **Evento invisible** (`InvisibleEvent`) | Evento planificado que se ve en el calendario y no cuenta en estadísticas. | — |
| **Dominante / Espectador** | Roles de los dispositivos frente a la sesión activa (ver §5). | — |
| **Checkpoint** | Escritura puntual a Firestore en cada transición relevante de la sesión. | — |

Regla de oro: el usuario dice "bloque" para el tramo de 25 min (sus respuestas: "1 vez cada 3 bloques", "ese último bloque", "un bloque más"; el mockup de frontend también). **Todo texto en español para humanos —UI y documentos— usa esa acepción.** El código ya commiteado (SPEC/ARCHITECTURE v1) llama `StudySession` a la sesión y usa `cycle`/`cyclesCompleted`/`StudySegment.cycleNumber` para el tramo: **esos identificadores no se renombran**. La correspondencia obligatoria, que todo documento debe citar cuando mezcle ambos planos:

| Término en español (UI/docs) | Identificador en código |
|---|---|
| Sesión | `StudySession`, `activeSession` |
| Bloque (tramo de estudio) | `StudySegment`, `cycleNumber`, `cyclesCompleted` |
| Descanso | `BreakSegment` (`breakType`: `short`/`long`/`custom`/`skipped`) |
| Almuerzo | `LunchSegment` (con `returnState`) |
| Bloque inverso | `InverseSession` |

En español nunca se escribe "ciclo"; en código nunca se introduce `block`/`Block` como nuevo identificador para el tramo (evita dos nombres para lo mismo). Pendiente de que el creador confirme esta convención (§10.8).

## 2. Modelo de la sesión de estudio (decisión estructural)

- **Modelo as-built (adoptado del código commiteado en `productvt-beta/`, commit `4420909`)**: la sesión es un solo documento `StudySession` con `studySegments[]`, `breakSegments[]`, `lunchSegments[]`, `customBreakSelections[]`, `cyclesCompleted`, `effectiveStudySeconds`, `bankRemainingSeconds`, `status`, `completionReason`. **No existe** una subcolección `StudyBlock`. Las estadísticas leen `effectiveStudySeconds` de sesiones cuyo `status` cuente (ver abajo).
- **Cada bloque completado se escribe en el checkpoint de fin de bloque** dentro del documento singleton de sesión activa (`studySegments[]` y `effectiveStudySeconds` actualizados), de modo que un crash nunca pierde bloques ya completados. Al cerrar la sesión (por cualquier vía) el singleton se materializa como `StudySession` en `users/{uid}/sessions`.
- **Expiración** (respuesta 2, confirmada): pierde **solo el bloque en curso**; `effectiveStudySeconds` conserva la suma de los bloques completados y **sí cuenta** para estadísticas aunque `status` sea `expired`.
- **Cancelación — RESUELTO el 2026-09-06 (R25, pregunta 25 de `preguntas-para-el-creador.md`; `decisiones-tomadas.md` punto 1.b)**: misma severidad que expirar — se pierde solo el bloque en curso, los bloques previos completados en la misma sesión conservan su tiempo efectivo. `resolveCancelledSessionEffectiveSeconds` = `sumEffectiveStudySeconds(studySegments)` (idéntica a la de expiración; se mantiene como función separada por si una versión futura quisiera volver a diferenciarlas). **Fricción de cancelación (resuelto por Front End, productvt-9b)**: la doble confirmación de 15+15 s se mantiene sin cambios pese a la severidad reducida — cancelar sigue siendo una decisión activa e impulsiva que merece esa fricción; lo que se retira es cualquier elemento punitivo *impuesto por la app* (animación triste, copy de culpa del equipo). La `cancellationPhrase` personalizable sigue siendo el mecanismo de peso emocional, porque es un compromiso autoimpuesto, no un regaño de la app.
- **No existe "finalizar ahora conservando lo estudiado"** a mitad de un bloque (respuesta 1). La única salida mid-bloque es cancelar. Entre bloques —en la selección de descanso o al terminar un descanso— sí existe **"Terminar sesión"**, que cierra la sesión normalmente (`status: 'completed'`, `completionReason: 'ended_by_user'`) sin penalización: es simplemente no empezar otro bloque.
- Estados de cierre: `completed` (terminada por el usuario en un punto de decisión), `cancelled` (doble confirmación), `expired` (ventana vencida: `expired_no_response`; o zombie 24 h: `zombie_timeout_24h`).

## 3. Reglas del cronómetro que fija este brief

### 3.1 Ventanas de respuesta (interpretación de la respuesta 3)
La ventana depende del **tamaño del tramo que acaba de terminar**, no del tipo de estado:
- **30 segundos** si terminó un bloque de **≤ 30 min** o un descanso corto.
- **10 minutos** si terminó un bloque de **> 30 min** o un **descanso largo**; el panel de selección de descanso que sigue a ese bloque también usa 10 min.
- El umbral de 30 min es una suposición del orquestador **pendiente de confirmar** con el creador (el mockup del frontend usó 25 min → 30 s y 50/90 min → 10 min, compatible con este umbral).
- Al vencer cualquier ventana: `EXPIRE` → se descarta el bloque en curso (si lo hubiera) y la sesión pasa a `expired`.

### 3.2 Banco de descanso (corrige el doble conteo del SPEC v1 §17.5/§17.6)
- `disponible = banco + descansoGanado` donde `descansoGanado` = corto (o corto + largo cuando corresponde descanso largo).
- El usuario elige `usado ∈ [0, disponible]` en minutos enteros.
- `bancoNuevo = disponible − usado`. **Nunca** se suma el descanso ganado al banco "por adelantado".
- Saltar descanso ≡ `usado = 0`.
- El banco vive solo dentro de la sesión; muere con ella.

### 3.3 Almuerzo (respuesta 5 + hallazgo ALTO 1 de la revisión)
- 45 min fijos. No consume banco, no cuenta como tiempo efectivo.
- Disponibilidad: `bloquesCompletadosDesdeUltimoAlmuerzo ≥ 3`, **o** ningún almuerzo usado aún en la sesión (el "botón de pánico" está disponible desde el inicio; después exige 3 bloques entre usos). Esta segunda cláusula es suposición del orquestador **pendiente de confirmar**.
- Se puede pedir desde: `study_running` (el bloque se **pausa**, no se descarta; se guarda `stateBeforeLunch` y `remainingSeconds`), `break_selection`, `break_running` y ambos `*_waiting_response`. Al terminar el almuerzo se vuelve exactamente a `stateBeforeLunch`; si era un estado de espera, su ventana se **reinicia** completa.
- Máximo un almuerzo activo a la vez; el contador de cooldown se reinicia al usarlo.

### 3.4 Cancelación
- Doble confirmación: botón bloqueado 15 s, al pulsarlo se reinicia otros 15 s, y recién entonces cancela. Frase personalizada del perfil visible y editable in situ. **Se mantiene sin cambios** pese a la severidad reducida de abajo (resuelto, ver §2).
- Se puede abrir desde cualquier estado activo. Mientras el panel de cancelación está abierto, **la ventana de respuesta sigue corriendo** (no se pausa; si vence, gana la expiración).
- Efecto: cierra la sesión como `cancelled` (`completionReason: 'cancelled_by_user'`). **Conserva el tiempo efectivo de los bloques ya completados** (R25/D1.b, confirmado — misma regla que expirar); solo se pierde el bloque en curso. El banco de descanso de la sesión se pierde igual al cancelar (no cambia, es independiente de esta regla).

### 3.5 Temporizador inverso (respuesta 4)
- Duración objetivo `T` elegida al iniciar. Sigue corriendo al llegar a `T`. **Tope duro = 2·T**: al alcanzarlo se cierra solo (`autoFinished: true`) y se guarda igual.
- Notificaciones: recordatorio cada 15 min (sin respuesta requerida); notificación distinta "meta alcanzada" en `T`; en `2·T` notificación de cierre.
- **Exclusión mutua** con una sesión de estudio activa en el mismo usuario (no puede correr ocio mientras hay sesión de estudio abierta, ni al revés). Suposición del orquestador, pendiente de confirmar.
- Cancelar un bloque inverso no exige doble confirmación (es ocio): un toque + confirmación simple. Estado `cancelled` no cuenta en estadísticas.

## 4. Categorías, colores, metas, tiempo

- **Color vivo, siempre**: todo lo que se pinta (calendario, historial, estadísticas) resuelve el color y el nombre por `categoryId` contra la categoría vigente. No existe `colorSnapshot` ni `categoryNameSnapshot` como fuente visual. Cambiar el color propaga a subcategorías. Las categorías **nunca se borran físicamente** mientras estén referenciadas: se archivan (`isArchived`).
- Jerarquía: categoría → subcategoría (un nivel, `parentId?`). Tres árboles separados por `type`: `study | inverse | invisible`.
- **Estrella mensual**: solo si el mes tiene ≥ 1 semana cerrada con ≥ 1 meta configurada y **todas** las metas de **todas** las semanas cerradas con metas se cumplieron. Mes sin metas → sin estrella.
- Metas se miden en tiempo efectivo (bloques completados), por categoría de estudio, por semana.
- **Semana empieza el lunes**; `weekKey` en formato ISO (`2026-W36`); `monthKey` `2026-09`. Zona horaria: la del perfil del usuario (por defecto la del dispositivo al registrarse). Timestamps en Firestore como `Timestamp` (UTC); dominio en **segundos**; presets en minutos (excepción intencional: son entrada de usuario).

## 5. Sincronización multi-dispositivo: Dominante / Espectador (respuesta 14)

- Todo CRUD que no sea el timer activo (categorías, presets, eventos invisibles, metas, ajustes) funciona en paralelo en todos los dispositivos, sin arbitraje: Firestore + persistencia offline del SDK.
- Para la sesión activa existe un **documento singleton** `users/{uid}/active/session` con al menos: `sessionId`, `dominantDeviceId`, `state`, `stateBeforeLunch?`, `segmentStartedAt`, `segmentTargetSeconds`, `responseDeadlineAt?`, `bankSeconds`, `blocksCompleted`, `blocksSinceLunch`, `lunchUsed`, `lastCheckpointAt` (serverTimestamp), `controlRequest?: { requesterDeviceId, requestedAt }`.
- **Dominante**: único que ejecuta transiciones; escribe un checkpoint en cada transición. El conteo es 100 % local por timestamps (nunca depende de la red).
- **Espectador**: recibe el documento por `onSnapshot` y **interpola** el reloj localmente a partir de `segmentStartedAt`/`segmentTargetSeconds` (no necesita ticks del dominante). Sus controles están deshabilitados; al tocar uno se crea `controlRequest`.
- **Cambio de dominante**: al aparecer `controlRequest`, ambos dispositivos muestran el diálogo "¿Cambiar de dominante?" Sí/No. Resolución con `runTransaction` sobre `dominantDeviceId`: el primero que confirma gana; el otro pasa a espectador automáticamente al recibir el snapshot. "No" en el dominante cancela la solicitud.
- **Reloj**: se usa `serverTimestamp()` en los checkpoints y se calcula un `clockOffset` local (servidor − dispositivo) para que espectador y dominante coincidan aunque un reloj esté desfasado.
- **Zombie**: si `now − lastCheckpointAt > 24 h`, el próximo cliente que lea el singleton cierra la sesión como `expired` (bloque en curso perdido, bloques previos intactos) y libera el singleton. No hay Cloud Functions.
- **Reinstalación / caché borrada**: el singleton remoto es la verdad; AsyncStorage solo acelera el arranque del dispositivo dominante.
- Reglas de seguridad: cada usuario solo lee/escribe bajo `users/{uid}`; el singleton solo se `update` si `request.resource.data.dominantDeviceId == resource.data.dominantDeviceId` **o** el update es exclusivamente sobre `controlRequest`/toma de control vía transacción documentada.

## 6. Stack y plataformas (costo cero, restricción dura)

- Expo SDK 57 (ya instalado en `productvt-beta/`), Expo Router, TypeScript estricto, `zustand`, `zod`, `date-fns`, `react-hook-form`, Firebase JS SDK (plan **Spark**: Auth + Firestore + Hosting gratuitos; **sin** Cloud Functions, **sin** Storage en V1), `@react-native-async-storage/async-storage`, `expo-notifications`, `expo-audio` (no `expo-av`), `expo-document-picker`, `expo-dev-client`, `react-native-reanimated`.
- **Android**: Development Build **local** (`npx expo prebuild` + `npx expo run:android` con Android Studio/SDK en la máquina del creador). Nunca EAS Build en la nube. Expo Go solo sirve para pantallas sin alarmas.
- **Web**: `expo export --platform web` → Firebase Hosting (gratis) como **PWA instalable** (manifest + service worker básico). **Desktop = la PWA instalada** (Windows/macOS/Linux). No Electron/Tauri en V1 (se puede envolver la misma web después sin tocar lógica).
- **Roles por plataforma en V1 (regla de `decisiones-tomadas.md`, sección "Alcance de plataformas", pendiente de confirmar por el creador — §10.10)**: **solo Android puede ser dominante** (iniciar/accionar sesiones de estudio y bloques inversos, con alarmas reales). **Web y desktop-PWA son espectadores** del cronómetro (mismo `onSnapshot`, reloj interpolado, sin alarmas propias) y tienen **gestión completa** de todo lo demás (calendario, estadísticas, categorías, presets, metas, ajustes, eventos invisibles). Razón: los navegadores throttlean timers en pestañas no enfocadas, el audio automático exige gesto reciente y no hay push sin infraestructura extra; una ventana de 30 s no puede depender de eso. Los documentos describen el camino para habilitar "web dominante" en V1.1 (PWA instalada + deadlines conscientes de `visibilitychange`) sin cambiar el modelo.
- Matriz de degradación explícita módulo por módulo (notificaciones, audio, background, document picker) en `05-ARQUITECTURA.md`.
- Android: pedir exención de optimización de batería y usar notificaciones programadas (`expo-notifications`) al iniciar cada tramo, canceladas en cada transición.
- Auth: Email/Password + Google. El límite de ~100 usuarios de la app OAuth sin verificar se acepta (uso personal). Nada que requiera verificación paga o trámite.

## 7. Arquitectura de código (puntos 8–13 delegados)

- Sin carpeta `screens/`. UI en `src/app/**` (rutas Expo Router) + `src/features/<feature>/components/`.
- `src/application/coordinators/` **sí existe** y contiene `StudySessionCoordinator`, `ActiveSessionRecoveryService`, `ControlHandoverService`. Los "assemblers" de calendario/estadísticas viven en `src/features/<feature>/services/`.
- **Repositorio para todo agregado**, sin excepciones: `UserRepository`, `SettingsRepository`, `CategoryRepository`, `PresetRepository`, `SessionRepository` (sesiones + subcolección de bloques), `InverseSessionRepository`, `EventRepository`, `GoalRepository`, `ActiveSessionRepository` (singleton). Nadie más importa `firebase/firestore`.
- Dominio puro en `src/domain/**` (entidades, enums, value objects, máquina de estados, reglas de banco, agregadores): sin React, sin Firebase, sin APIs de dispositivo. 100 % testeable con Vitest/Jest.
- Nombres canónicos = **los ya commiteados en `productvt-beta/src/domain/**`** (leerlos antes de documentar): `status` (nunca `sessionStatus`); `remindersTriggered`; `startedAt`/`endedAt` para lo ocurrido, `startAt`/`endAt` para lo planificado; `isArchived`; `imageUrl?` en `Category` y `Preset`; `targetDurationSeconds` en `InverseSession`; `StudySession.completionReason`, `deviceInfo?`, `customBreakSelections[]`, `lunchSegments[]` (con `returnState`), `breakSegments[]` (`breakType`), `studySegments[]` (`cycleNumber`), `cyclesCompleted`. `colorSnapshot` y `categoryNameSnapshot` **existen como histórico únicamente**: ningún renderizado ni agregador los usa para pintar o nombrar (siempre `categoryId` → categoría vigente). Los documentos no proponen renombres de estos identificadores.
- Adaptadores de plataforma en `src/infrastructure/{firebase,notifications,audio,storage,device}/` con implementación nativa y web (`*.web.ts`) detrás de una misma interfaz.

## 8. Sistema de diseño y gráficos intercambiables

- **Theme provider con tokens** (colores, tipografía, espaciado, radios, sombras, motion) y **skins** como conjuntos de tokens + **registro de assets** (imágenes/ilustraciones por categoría, preset, estado del timer, celebraciones). Cambiar gráficos = cambiar un skin/registro, sin tocar lógica ni pantallas. `Category.imageUrl?` y `Preset.imageUrl?` existen desde V1 para personalización futura con imágenes.
- **Skin base "Papel"** = tokens del mockup del frontend (`01-mockups/mobile/cronometro.html`): papel `#EFEDE5`, papel elevado `#FAF9F3`, tinta `#20241E`, atenuado `#6E7368`, acento `#3A6B54`, descanso `#2E7B84`, almuerzo `#B9812E`, aviso `#C0672B`, peligro `#9C4A3A`, con su variante oscura; tipografías **Fraunces** (títulos), **Archivo** (texto), **IBM Plex Mono** (números/etiquetas), empaquetadas con `expo-font` (Google Fonts, gratis). Modo claro/oscuro obligatorio. `prefers-reduced-motion` respetado.
- Layout responsive: teléfono (tabs inferiores), tablet/desktop-web (barra lateral + contenido en columnas). Anillo de progreso como pieza central del timer (como en el mockup).
- Copys en español neutro (tú), centralizados en una tabla de strings (`src/i18n/es.ts`) para poder cambiarlos sin tocar componentes.
- Componentes del mockup a formalizar: `RolePill` (Dominante/Espectador), `ProgressRing`, `ChoiceChip`, `BottomSheet`, `StateLabel`, `CategoryChip`.

## 9. Proceso

- Sin fase de mockup separada: se construye el prototipo funcional compilable. Orden: fundación → auth → **cronómetro completo end-to-end en dispositivo** (rebanada vertical primero) → sesiones/bloques → categorías/presets → inverso → calendario → estadísticas → metas → pulido → verificación. Cada fase con criterios de aceptación y tests del dominio.
- Claude Code ejecuta todo; ChatGPT/Gemini quedan fuera. Las otras sesiones (`productvt-cb`, `productvt-eb`, `BC Orquestador Productvt`) consumen `docs/` como canon y **no** redactan un SPEC/plan paralelo.

## 10. Suposiciones pendientes de confirmar con el creador

1. Umbral de 30 min para elegir ventana de 30 s vs 10 min (§3.1).
2. Almuerzo disponible desde el inicio de la sesión y luego cada 3 bloques (§3.3).
3. Tope del inverso = 2·T (respuesta 4 dice "un bloque más desde el punto actual").
4. Exclusión mutua entre temporizador inverso y sesión de estudio (§3.5).
5. Desktop = PWA instalable, sin Electron (§6).
6. Qué significa "funcionamiento de galaxias de la pantalla principal" (respuesta 20).
7. Español neutro con "tú" (el mockup del frontend usa "vos").
8. Convención de vocabulario: "bloque" = tramo de 25 min en toda la UI y los documentos, con identificadores de código sin renombrar (`cycle*`, `StudySegment`) — §1.
9. ~~Alcance de la cancelación~~ — **RESUELTO el 2026-09-06**: misma severidad que expirar (R25, §2).
10. **Web/desktop solo espectador en V1** (regla de `decisiones-tomadas.md`): ¿acepta el creador que desde el computador no se pueda iniciar un bloque en V1, o quiere web dominante desde ya asumiendo alarmas menos confiables? — §6.
12. **Alcance V1 vs. V1.1 de la integración goalId/color de meta**: ¿la selección de meta al iniciar un bloque y la prioridad de color en Cronómetro/Calendario entran a V1 ya, o quedan en V1.1 junto con el resto de Galaxia/Tienda? — §11 (default: V1.1, el campo de datos existe en V1 como gancho sin funcionalidad).

11. **Galaxia de metas + Tienda**: ¿entra en V1 (respuesta 20 habla de "funcionamiento de galaxias de la pantalla principal") o en V1.1 como propone `productvt-eb`? Y sus cuatro preguntas: moneda (por defecto: desbloqueo por rachas/logros, sin dinero real ni moneda comprable), qué es una supermeta (por defecto: meta con hijas vía `parentGoalId`, dos niveles), si el layout se sincroniza (por defecto: sí, por usuario en Firestore), y si hay skins/fondos gratis por defecto (por defecto: sí, el skin "Papel" y un fondo base). — §11.

## 12.6 Racha de estudio (requerimiento nuevo, elevado por el creador el 2026-09-06 desde "cofre cada 7 días" de Galaxia/Tienda)

Fuente: `03-requisitos/nueva-funcionalidad-rachas-logros-sincronizacion.md` (BC). Decisión de alcance (scoping pedido explícitamente por BC como pregunta de arquitectura):

- **La racha en sí (el contador) entra a V1, no V1.1.** Es barata: se calcula, no se guarda. `computeCurrentStreakDays(sessions, timezone)` — función pura de dominio (mismo patrón que los agregadores de `07-CALENDARIO-ESTADISTICAS-METAS.md`) que cuenta días consecutivos (hacia atrás desde hoy, en la timezone del perfil) con al menos un bloque de estudio completado ese día (`effectiveStudySeconds > 0` proveniente de cualquier `StudySession` con `status` `completed`, `cancelled` o `expired` — los tres aportan bloques completados por igual, D1.b). Los bloques inversos **no** cuentan para esta racha (es racha de estudio, no de uso general de la app). Sin campo cacheado, sin colección nueva, sin Cloud Functions: es "online" por construcción, porque se deriva de `StudySession` en Firestore igual que cualquier estadística — ya resuelve la duda de BC sobre "agregador derivado vs. campo cacheado" a favor de agregador derivado.
- **Corte de día**: medianoche exacta en `UserProfile.timezone`, **sin margen de gracia** en V1 (simplicidad; reconsiderar en V1.1 si hace falta).
- **Consumo en V1**: se puede mostrar en Estadísticas y en el hub de Inicio (esquina superior, como ya lo tiene el mockup de productvt-9b) — es solo lectura de un número, no requiere Tienda ni inventario.
- **V1.1**: el sistema de cofres (recompensa cada 7 días de racha) vive en `10-GALAXIA-Y-TIENDA.md` y es un **consumidor** de este número, no su dueño — no se rediseña la racha para la Tienda, la Tienda solo la lee.
- **Diferido (descubrimiento de producto aparte, igual que "Amigos")**: catálogo de logros más allá de la racha, y cualquier componente social o de perfil compartido — no se define en V1 ni V1.1 todavía.

## 12.5 Navegación principal: 5 pestañas (CONFIRMADO por el creador, 2026-09-06)

La navegación principal tiene exactamente **5 pestañas**: **Inicio** (hub tipo Clash Royale — racha/amigos arriba-izq., moneda/cofre arriba-der., la **galaxia de metas embebida** como contenido principal, botón grande "Crear" con popup Crear meta / Iniciar bloque; **Configuración es un botón mini dentro de este hub, no una pestaña propia**), **Cronómetro**, **Calendario** (sigue siendo su propia pestaña — NO se fusiona con Inicio ni con Estadísticas), **Estadísticas**, **Tienda** (pestaña propia, separada de Inicio). La Galaxia NO es una pestaña separada — vive dentro de Inicio, tal como ya la construyó productvt-9b en `01-mockups/mobile/inicio.html`. Reemplaza cualquier supuesto anterior de "4 secciones" (SPEC v1 §9) o de estructura de tabs distinta en documentos ya escritos — corregir donde aparezca.

**Corrección de fuente**: el mockup de referencia del CALENDARIO es `01-mockups/mobile/calendario.html` (vista mensual con color vivo por categoría y eventos invisibles como círculo hueco) — **no** `01-mockups/desktop/galaxia-metas.html`, que es la exploración visual de la Galaxia (error de esta sesión al pasar la fuente a los documentos 06 y 07; se corrige en la pasada de alineación post-lote). También existe `01-mockups/mobile/estadisticas.html` ("Cuaderno de Progreso") como referencia de esa pestaña.

## 12. Calendario por capas (requerimiento nuevo del creador, pedido en vivo a BC, 2026-09-06)

Fuente: `03-requisitos/nueva-funcionalidad-calendario-por-capas.md`. El build de código todavía no llega a la Fase 7 (Calendario, va por la 4b), así que este diseño entra al canon ANTES de que se escriba código, sin necesidad de rehacer nada.

- **Qué es**: el calendario deja de ser una vista plana — soporta **capas** activables/desactivables independientemente (como "Mis calendarios" de Google Calendar). Dos tipos: **capas de meta** (una por cada `WeeklyGoal`, implícita) y **capas personalizadas** (creadas libremente por el usuario, p. ej. un "Horario").
- **Modelo de datos (resuelve las 4 preguntas abiertas del documento fuente)**:
  1. Una capa de meta filtra por `WeeklyGoal.categoryId` y muestra **histórico completo** de esa categoría, no solo la semana vigente de la meta (un calendario sirve para navegar el tiempo; limitarlo a una semana lo haría inútil al mirar meses pasados o futuros).
  2. Las capas personalizadas agrupan **por categoría** (una lista `categoryIds[]`, de cualquier `type`: study/inverse/invisible — no por evento individual; cubre el caso "Horario" como un conjunto de categorías, p. ej. las de cada clase).
  3. La visibilidad de una capa **sincroniza vía Firestore** (es un campo del documento, `CalendarLayer.isVisible` o `WeeklyGoal.layerVisible`), consistente con la regla de que todo lo que no es el timer activo es CRUD normal sin arbitraje (D14).
  4. **No hay límite de capas en el modelo de datos** — la densidad visual (cuántas se pueden ver a la vez sin saturar) es un problema de `06-DISENO-UI.md`, no del esquema.
- **Entidades (ya en `02-DOMINIO.md`)**: las capas de meta son **virtuales** (nunca se guardan como documento propio — se derivan de `WeeklyGoal` + su nuevo campo `layerVisible?: boolean`, default visible). Las capas personalizadas SÍ son una entidad nueva, `CalendarLayer` (`users/{uid}/calendarLayers/{layerId}`), con `name` + `categoryIds[]` + `isVisible`. Ninguna capa tiene color propio: el renderizado sigue usando siempre el color **vigente** de la categoría de cada ítem (D6, "colores vivos") — la capa es un filtro y un interruptor de visibilidad, no una fuente de color.
- **Vistas ampliadas**: año, mes, semana, **3 días** (nueva), día (nueva: con **franja horaria**/timeline, no lista). La vista semana debe maximizar densidad sin saturar (agrupación, truncado "+N más" al estilo de calendarios profesionales). Vista por defecto **configurable por el usuario** (en `UserSettings`).
- **Plataformas**: a diferencia del cronómetro (Android dominante), el calendario es de uso primario en **ambas** plataformas (desktop y celular) — responsive real, no solo "que quepa" (coherente con la regla ya existente de que el calendario es CRUD/consulta sin restricción de plataforma, brief §6).

## 11. Galaxia de metas y Tienda (requerimiento nuevo del creador, 2026-09-05)

Fuente: `03-requisitos/nueva-funcionalidad-galaxia-tienda.md` (cita textual del creador registrada por `productvt-cb`) y la sección "Alcance — Galaxia de metas + Tienda" de `decisiones-tomadas.md`. Exploración visual libre: `01-mockups/desktop/galaxia-metas.html`.

- **Qué es**: las metas se visualizan como una **galaxia de planetas** interactiva — cada meta es un planeta; una **supermeta** agrupa metas y se abre como **subgalaxia** navegable; planetas y galaxias se arrastran (estilo graph view de Obsidian) con acción **"Restablecer orden"**; el **fondo** de la vista principal y el de cada subgalaxia son personalizables; la **skin de cada planeta** es personalizable. Una sección **Tienda** ofrece skins de planeta, fondos, colecciones ligadas a rachas y un sistema de recompensas.
- **Alcance de trabajo hasta que el creador confirme (§10.11)**: la **Tienda** es **V1.1**; la **galaxia** se documenta completa en un documento propio (`10-GALAXIA-Y-TIENDA.md`, se redacta en una pasada posterior) y su implementación se ubica en V1.1, **salvo que el creador la confirme para V1** — en ese caso pasa a ser la vista principal de la sección Metas dentro de la pantalla principal, después del núcleo del cronómetro y antes del pulido.
- **Ganchos obligatorios en V1 (costo cero, evitan migraciones)**: `WeeklyGoal.name: string`, `WeeklyGoal.parentGoalId?: string` (jerarquía meta/supermeta, máximo dos niveles), `WeeklyGoal.skinId?: string`, documento opcional `users/{uid}/layouts/galaxy` con posiciones `{ goalId: { x, y } }` y `backgroundId?` por vista (sincroniza entre dispositivos, es preferencia de usuario, no de dispositivo), e `users/{uid}/inventory` (skins/fondos poseídos) previsto en el esquema pero sin UI. El sistema de skins/assets de `06-DISENO-UI.md` (§8 de este brief) es la **misma** infraestructura que usará la galaxia: fondos y skins de planeta son entradas del AssetRegistry.
- **Modelo de meta reconciliado (resuelto 2026-09-06, a pedido de productvt-9b tras detectar dos formas distintas en sus propios mockups)**: `WeeklyGoal` es siempre una **meta individual con forma uniforme**, sea hoja o supermeta — TODA meta (incluida una supermeta) tiene su propio `categoryId` + `targetSeconds`, y su `achievedSeconds` se calcula exactamente igual para cualquiera de las dos (suma de `effectiveStudySeconds` de bloques de esa categoría en esa semana) — no hay una entidad "supermeta" polimórfica ni un cálculo especial que sume a los hijos. Lo único que distingue a una supermeta es que 1+ metas la referencian vía `parentGoalId`. La vista de **Estadísticas por categoría** (una fila por categoría, sin jerarquía) es una **agregación derivada**: para una categoría y semana dadas, suma `targetSeconds`/`achievedSeconds` de todas las `WeeklyGoal` (de cualquier profundidad) que compartan ese `categoryId` — nunca la forma de almacenamiento. La **estrella mensual** (D7) exige que TODA `WeeklyGoal` con target en las semanas cerradas del mes se complete, sin excepción para supermetas. Esto reconcilia el mockup de la galaxia (metas nombradas con jerarquía) con el de Estadísticas (una meta por categoría) sin que ninguno de los dos mockups necesite rehacerse: son dos vistas del mismo dato.
- **Regla de costo cero y no-objetivos**: la Tienda **no** usa dinero real ni moneda comprable — desbloqueo por rachas/logros/constancia (coherente con la respuesta 7: recompensa solo con constancia). Cualquier otra economía requiere decisión explícita del creador.
- **Rendimiento**: la galaxia se implementa con `react-native-reanimated` + `react-native-gesture-handler` (ya instalados) y SVG/Views.
- **Física del arrastre y "estándar" guardado — CORREGIDO 2026-09-06 (dos veces: primero se agregó un campo de más, luego se simplificó de vuelta con el diseño de productvt-9b, que es el correcto)**: los planetas gravitan de verdad hacia el centro con repulsión mutua (equilibrio dinámico por simulación, NO una fórmula de espiral fija) y se reacomodan solos al agregar/quitar metas. Arrastrar sin guardar es **efímero** — no escribe nada, la próxima vez que se abre esa galaxia se vuelve a calcular en vivo por física. Solo "Guardar como estándar" escribe `GalaxyViewLayout.positions?` (un único campo, ya en `02-DOMINIO.md`, ahora opcional): presente = el estándar guardado por el usuario, se usa tal cual; ausente = se calcula en vivo por física, sin persistir. "Restablecer orden" simplemente **borra** ese campo. No hace falta un segundo campo — si en el futuro se quisiera autoguardar el arrastre en vivo sin acción explícita del usuario, esa sería una decisión de producto nueva, no algo que se asuma aquí. Botones de la pantalla principal más cuadrados (menos radio de borde) que el resto de la app — detalle para `06-DISENO-UI.md`.
- **Ampliación del pedido (2026-09-06, en vivo a productvt-9b, registrada en `nueva-funcionalidad-galaxia-tienda.md`)**: moneda virtual ganada por "nivel de importancia" de cada meta, cofres cada 7 días de racha, color propio por meta, tipos de temporalidad de meta (recurrente / fecha específica / atemporal), y un botón "Amigos" sin definición (primera pieza social de todo el proyecto). Todo esto sigue siendo **V1.1 como mínimo** (algunas piezas, como "Amigos", probablemente V2+ porque implican relaciones entre usuarios, privacidad y potencialmente infraestructura más allá de Firebase Spark de un solo usuario — se trata como descubrimiento de producto aparte, no se diseña por adelantado). **Alcance V1 vs. V1.1 de esta regla — PENDIENTE DE CONFIRMAR (señalado por BC, 2026-09-06)**: Gregorio confirmó la REGLA de color (meta manda sobre categoría), pero en el contexto del mockup de diseño de productvt-9b, no como una instrucción explícita de que la integración funcional entre ya al código real de V1. Hasta que se pregunte y confirme lo contrario, el tratamiento es: el campo de datos (`StudySession.goalId?`, `WeeklyGoal.color`) se agrega en V1 como "gancho sin funcionalidad" (mismo patrón que `parentGoalId`/`skinId` de `WeeklyGoal`), pero la INTEGRACIÓN FUNCIONAL (selector de meta al iniciar un bloque, prioridad de color en el panel activo del Cronómetro, doble acento en el Calendario) queda en **V1.1 junto con el resto de Galaxia/Tienda** — evita tener que retrabajar la Fase 4 del Cronómetro (ya construida por BC) para agregar un selector de meta que todavía no tiene UI en ningún otro lado del V1. Ver "Supuestos pendientes de confirmar" (§10.12).

**Color de meta — CORREGIDO 2026-09-06 (revierte la resolución anterior de este mismo párrafo)**: el creador confirmó explícitamente que el color de una meta **sí manda** sobre el de categoría cuando un bloque está asociado a una meta — no es solo cosmético de la galaxia. Jerarquía (D6.b, `03-requisitos/decisiones-tomadas.md` punto 6.b): **Supermeta** (color propio) → **Meta hija** (color propio, copiado del de su supermeta al crearse, editable después de forma independiente) → **Categoría** (fallback, solo para bloques sin `goalId` asociado — D6 sigue intacto para ese caso). Requiere `StudySession.goalId?: string` (elección explícita del usuario al iniciar el bloque, nunca inferida) y `WeeklyGoal.color: string` (ambos ya en `02-DOMINIO.md`). El Cronómetro pinta con el color de la meta si hay `goalId`; el Calendario pinta relleno = color de la meta, franja secundaria = color de la supermeta (identifica la capa/"calendario" a la que pertenece, p. ej. "Universidad") — se conecta directo con el Calendario por capas (§12): la capa de una meta ahora lleva doble acento de color. Moneda/cofres/temporalidad de metas quedan como detalle a formalizar en `10-GALAXIA-Y-TIENDA.md` cuando corresponda, sin bloquear nada del V1 actual.

---

## Anexo — Respuestas literales del creador (2026-09-05)

1. ¿Terminar sesión conservando tiempo sin cancelar? — **no.**
25. (Pregunta de seguimiento, agregada el 2026-09-06 tras cerrar las 24 anteriores) ¿Cancelar sigue perdiendo toda la sesión, o —como ahora se sabe para la expiración— solo se pierde el bloque en curso? — **la misma regla que la expiración: solo el bloque en curso.**
2. Al expirar, ¿se pierde solo el ciclo actual o todo? — **todo el tiempo efectivo de ese último bloque pero los previos no.**
3. ¿Qué ventana (30 s / 10 min) aplica a cada estado? — **las de 30 segundos son a bloques pequeños, la de 10 minutos para aquellos bloques de mayor tamaño o los descansos largos.**
4. ¿El inverso se detiene al llegar al objetivo? — **sigue corriendo pero se corta en un límite superior de máximo un bloque más desde el punto actual.**
5. ¿Cuántas veces el almuerzo? — **solo 1 vez cada 3 bloques.**
6. ¿Recolorear histórico al cambiar color? — **deben actualizarse.**
7. ¿Estrella en mes sin metas? — **no, solo hay recompensa cuando se cumple con una constancia de una tarea y metas configuradas, no cuando está vacío.**
8. Coordinators / carpeta application — **ni idea, solucionalo para que tenga coherencia y adáptalo para que sea óptimo; puedes borrar archivos, modificar la estructura o arquitectura para que sea más robusta o completa en general.**
9. Servicios sin repositorio — **no necesariamente, puede modificarse según lo que consideres mejor; prioricemos que sea algo estable y funcional, idealmente sin un costo monetario adicional de por medio.**
10–13, 15, 17, 18, 21. — **ni idea, se aplica lo mismo que la pregunta 8.**
14. Multi-dispositivo — **funcionan en paralelo para todas las actividades de crear eventos o cosas por el estilo, pero como contador de iniciar bloque solo un dispositivo puede ser el dominante; el otro puede ver el contador igualmente, pero si intenta modificar o hacer algo debe decir "¿quieres cambiar de dominante?" en un sí o no, y debe salir lo mismo en el otro; el primero que aprete queda como dominante y el otro de espectador.**
16. Sesión zombie — **ni idea, lo mismo que la 8. Pero probablemente muere luego de 24 horas.**
19. Documentar límite de Google Sign-In — **ni idea, lo mismo que la 8. Recuerda no sumar costos adicionales.**
20. Fase de mockup — **las fases debes rediseñarlas por completo e intentar crear un prototipo funcional con código y compilación en el menor tiempo posible, tomando en cuenta todas las preguntas que te responda, y construir algo completo, funcional y perfecto en términos técnicos y del funcionamiento de galaxias de la pantalla principal, layout y etc.**
22. Flujo ChatGPT+Gemini — **completamente reemplazado.**
23. Orden de secciones — **el que prefieras según lógica.**
24. ¿Documentos definitivos? — **para nada. Todo lo que puedas modificar y adaptar según tu entendimiento conceptual de la app sirve. Todo tiene que ser recreado y aplicado por ti ahora.**
