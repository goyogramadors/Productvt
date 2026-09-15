# 01 — Especificación de producto (SPEC) v2

## Propósito

Este documento es la especificación de **producto** de Productvt Beta v2: qué construye la app, para quién, qué problema resuelve, qué reglas de negocio son verdaderas, qué queda fuera de alcance y cómo se mide el éxito. Reemplaza por completo a `docs/originales/SPEC-v1.md`. No contiene detalle técnico de implementación (stack, carpetas, Firestore, máquina de estados o protocolo de sincronización) — eso vive en `02-DOMINIO.md` (modelo de datos, invariantes, esquema Firestore), `03-CRONOMETRO.md` (máquina de estados y reglas exactas del cronómetro) y `05-ARQUITECTURA.md` (arquitectura de código, matriz de degradación por plataforma, protocolo dominante/espectador). El destinatario es cualquier implementador (Claude Code, sesión `BC Orquestador Productvt`) y cualquier otra sesión del canon (`productvt-cb`, `productvt-eb`) que necesite entender **qué** debe existir y **por qué**, sin tener que inferirlo de conversaciones dispersas.

Cada requisito funcional (RF) trae un criterio de aceptación verificable: una condición observable que un tester (humano o automatizado) puede confirmar como cumplida o no cumplida, sin ambigüedad de interpretación.

## Fuentes

Orden de autoridad (si dos fuentes chocan, gana la de arriba; ver también el orden general en `_brief-orquestador.md`):

1. Respuestas literales del creador — anexo de `_brief-orquestador.md` (etiquetas `R1`..`R24`).
2. `03-requisitos/decisiones-tomadas.md` v2 (etiquetas `D <sección/punto>`).
3. `_brief-orquestador.md` revisado 2026-09-06 (etiquetas `B §n`).
4. Código commiteado en `productvt-beta/src/domain/**` (etiqueta `CODE`): verdad para nombres de tipos y campos citados aquí.
5. `03-requisitos/revision-spec-beta.md` (etiquetas `REV-ALTA-n`, `REV-MEDIA-<fila>`, `REV-BAJA-<fila>`): todo hallazgo de **producto** (alcance, reglas de negocio visibles al usuario, público, distribución, éxito, privacidad, accesibilidad) queda resuelto en la sección 11. Los hallazgos de modelo de datos ya están resueltos en `02-DOMINIO.md` §8 y se citan, no se repiten.
6. `01-mockups/mobile/cronometro.html` (tokens de diseño y flujo de pantalla del cronómetro) y `03-requisitos/nueva-funcionalidad-galaxia-tienda.md` + `01-mockups/desktop/decisiones-visuales-galaxia.md` (requerimiento y decisiones visuales de galaxia + tienda).
7. Originales v1 (`docs/originales/SPEC-v1.md`): punto de partida, no fuente de verdad. Se citan por sección cuando este documento corrige o reemplaza una regla.

Este documento no redefine el modelo de datos: cuando necesita nombrar un campo o tipo, cita `02-DOMINIO.md` por sección en vez de copiar la interfaz.

## 1. Visión y propuesta de valor

Productvt Beta no es un Pomodoro genérico ni un calendario de tareas: es un **sistema de disciplina de estudio** que convierte cada sesión de estudio en una máquina de estados con reglas estrictas — responder a tiempo o perder la sesión, cancelar exige doble confirmación con gravedad emocional — combinado con un **banco de descanso** que premia la constancia (el tiempo de descanso no usado se acumula y se puede gastar después, en vez de perderse) y una válvula de escape sin culpa (**almuerzo**, 45 min que no cuentan en contra). Se complementa con un **temporizador inverso** que mide honestamente el tiempo de ocio sin mezclarlo con el estudio, un **calendario** que distingue lo real de lo planificado, **estadísticas** que muestran progreso por categoría y **metas semanales** con recompensa gamificada (estrella mensual) por constancia real, no por vaciedad.

La propuesta de valor combina en una sola aplicación:

- Un cronómetro de estudio serio, con reglas que no se pueden hacer trampa fácilmente pero que perdonan el descanso no usado en vez de desperdiciarlo.
- Un temporizador de ocio separado, para medir sin culpa cuánto tiempo se destina a no estudiar.
- Un calendario que muestra solo lo que importa: sesiones reales y compromisos planificados, sin ruido.
- Estadísticas y metas que convierten el uso diario en datos accionables y en una razón concreta para volver a abrir la app.
- Una experiencia visual cuidada y consistente (skin "Papel": tinta sobre papel, sin genéricos de "app de productividad"), en vez de una interfaz utilitaria sin personalidad.

La app no se limita a contar minutos: estructura el comportamiento de estudio y lo convierte en un registro honesto — nunca en un número inflado por descansos mal contados o sesiones fantasma.

**Diferenciador central respecto de un Pomodoro estándar**: el usuario no puede simplemente "pausar y listo". Terminar un bloque exige responder dentro de una ventana; abandonar a mitad de camino exige una cancelación deliberada y con fricción (R1, D1, brief §2). Esta fricción es intencional: es la mecánica que hace que "empezar un bloque" sea una decisión que el usuario protege una vez tomada, en vez de un cronómetro que se puede ignorar sin costo.

## 2. Principios de diseño

Vigentes de SPEC v1 §8, confirmados sin cambios (no hay respuesta del creador que los contradiga):

1. **Rápido de usar**: iniciar una sesión toma pocos toques (RF-CRO-01) y no exige un formulario largo.
2. **Rígido donde importa**: las reglas del cronómetro (ventanas de respuesta, doble confirmación de cancelación, tope del inverso) son claras, consistentes y no negociables desde la UI.
3. **Flexible donde aporta valor**: categorías, colores, presets, sonidos, metas y — desde V1.1 — skins y fondos son personalizables sin fricción.
4. **Medición honesta**: el tiempo efectivo de estudio, el descanso, el almuerzo, el ocio y la cancelación se distinguen siempre entre sí; nunca se mezclan para inflar una cifra (regla de negocio §7.1).
5. **Motivación visual**: color, microcelebraciones y pequeños premios visuales refuerzan la constancia sin volverse ruido.
6. **Minimalismo funcional**: ninguna pantalla acumula más paneles de los que el usuario necesita ver en ese momento; el calendario no se sobrecarga de eventos triviales.
7. **Costo cero como restricción de diseño, no solo técnica** (R8, R9, R19, D "Confiabilidad técnica"): ninguna decisión de producto puede depender de un servicio de pago (Cloud Functions, Storage, Web Push gestionado, verificación de app OAuth). Si una función no es viable gratis con Firebase Spark, se degrada o se pospone (ver §6.17, §8.3) en vez de comprometer el costo.
8. **Un dominante a la vez, nunca dos fuentes de verdad** (R14, D14, brief §5): cualquier dispositivo puede consultar y gestionar todo excepto el cronómetro activo; el cronómetro activo tiene un único dispositivo que manda, para que el conteo nunca dependa de una carrera entre dispositivos.

## 3. No-objetivos

Vigentes de SPEC v1 §3.3, más las precisiones que exige el requerimiento de galaxia + Tienda (B §11) para no contradecirse:

1. No es una red social: no hay perfiles públicos, comentarios, ni interacción entre usuarios.
2. No hay colaboración en tiempo real entre múltiples usuarios; el modelo dominante/espectador (§6.16) es entre los dispositivos de **un mismo** usuario, no entre usuarios distintos.
3. No es una app de tareas, notas o documentos: no compite con un gestor de proyectos ni un editor de texto.
4. **No tendrá pagos, marketplace ni funcionalidades empresariales, en ninguna versión de este documento (V1 a V2).**
5. **Sin dinero real ni moneda comprable en ninguna versión** — incluida la Tienda de V1.1 (§9.2): todo desbloqueo de skins, fondos o colecciones es por constancia (rachas/logros), nunca por compra (R7, brief §11, D "Alcance — Galaxia"). Esta regla es más estricta que "no pagos": ni siquiera existe una moneda virtual comprable con dinero real que luego se canjee por cosméticos. Cualquier mecánica de precios (p. ej. una moneda virtual ganada solo por constancia) requeriría de todas formas una decisión explícita futura del creador — hoy no existe ningún campo de precio en el modelo (`02-DOMINIO.md` §3.5, supuesto 4).
6. No hay verificación de identidad ni cumplimiento regulatorio de pagos: al no manejar dinero, no aplica.
7. No se persigue publicación pública en tiendas de aplicaciones en V1 (ver distribución, §4.2): no hay objetivo de adquisición de usuarios externos.
8. No hay analítica de terceros ni publicidad: los únicos datos que salen del dispositivo van a Firebase del propio creador.

## 4. Público objetivo y distribución

### 4.1 Público

- Usuario principal: el creador, una persona que estudia de forma activa y quiere medir su productividad real, además de saber honestamente cuánto tiempo dedica a ocio.
- Un puñado de usuarios adicionales como máximo (familiares/amigos cercanos invitados directamente), nunca una base de usuarios abierta.
- Valora estructura, feedback inmediato, motivación visual y estadísticas — no tolera que la app "mienta" sobre cuánto estudió de verdad.

### 4.2 Modelo de distribución (resuelve REV-BAJA, SPEC v1 §4.1: "no define modelo de distribución")

- **Distribución privada, no publicada en Play Store ni en ninguna tienda de apps** en ninguna versión cubierta por este documento (V1 a V2). No hay objetivo de adquisición de usuarios ni de cumplir los requisitos de una ficha pública de Play Store.
- **Android**: instalación mediante un **development build local firmado** (`npx expo run:android` / `npx expo prebuild`, compilado en la máquina del creador con Android Studio/Gradle) instalado directamente como APK en los dispositivos autorizados. Nunca EAS Build en la nube (evita cuota paga, D17, R17).
- **Web/desktop**: la PWA se sirve desde Firebase Hosting (gratis) en una URL que no se promociona ni se indexa para descubrimiento público; el acceso es por enlace directo y login.
- **Autenticación**: Email/Password + Google Sign-In. El límite de ~100 usuarios de una app OAuth de Google sin verificar se acepta conscientemente (D19, R19): con un puñado de cuentas nunca se alcanza, y verificar la app ante Google es un trámite que este proyecto no necesita y que se descarta explícitamente para no sumar costo ni fricción de proceso.
- Esta sección resuelve el hallazgo BAJO de la revisión externa sobre distribución (SPEC v1 §4.1) y dialoga con §6.17/§8.3 (costo cero) y §11 (privacidad).

## 5. Estructura de la aplicación y terminología

### 5.1 Las cuatro secciones de la app

La app tiene **4 secciones principales**, accesibles desde la navegación inferior en teléfono y desde una barra lateral en tablet/desktop-web (brief §8):

| Sección | Contenido | Disponible en |
|---|---|---|
| **Cronómetro** | Corazón del producto: iniciar y gestionar sesiones de estudio, gestionar descansos y banco, usar almuerzo, cancelar, iniciar y ver el temporizador inverso, ver estado y progreso en vivo. Desde V1.1 puede incorporar la vista de Galaxia como pantalla principal de Metas si el creador lo confirma (§9.2). | Android (control completo); Web/desktop-PWA (solo espectador, §6.17) |
| **Calendario** | Sesiones de estudio y bloques inversos completados, eventos invisibles, vistas día/semana/mes/año, alta de eventos invisibles. | Todas las plataformas, control completo |
| **Estadísticas** | Tiempo de estudio y ocio por período, comparaciones, desglose por categoría/subcategoría, tablas históricas, metas y su avance. | Todas las plataformas, control completo |
| **Configuración / Gestión** | Perfil, frase de cancelación, sonidos, categorías, presets, colores, preferencias visuales (tema), notificaciones, importación de audio propio (solo Android). | Todas las plataformas, control completo (salvo audio propio) |

### 5.2 Terminología obligatoria y tabla de mapeo español/código

En español —toda la UI y todo texto para humanos, incluido este documento— **"sesión"** es la corrida completa (`StudySession`, desde "Iniciar" hasta que se completa, cancela o expira) y **"bloque"** es cada tramo de estudio de ~25 min dentro de ella. La palabra **"ciclo" no se usa nunca en español**, aunque el código ya commiteado use `cycleNumber`/`cyclesCompleted` para el bloque (esos identificadores no se renombran; brief §1, D "Convención de vocabulario"). Ejemplo de la regla en un copy real: el diálogo de cancelación dice "¿Cancelar sesión?" (nunca "¿Cancelar bloque?"), porque cancelar borra la sesión completa, no un tramo.

Tabla de mapeo obligatoria (citada tal cual de `_brief-orquestador.md` §1 / `02-DOMINIO.md` §1.1) para todo requisito de este documento que mezcle ambos planos:

| Término en español (UI/docs) | Identificador en código |
|---|---|
| Sesión | `StudySession`, `ActiveStudySession`, `activeSession` |
| Bloque (tramo de estudio) | `StudySegment`, `cycleNumber`, `cyclesCompleted` |
| Descanso | `BreakSegment` (`breakType`: `short`/`long`/`custom`/`skipped`) |
| Almuerzo | `LunchSegment` (con `returnState`) |
| Banco de descanso | `bankRemainingSeconds` |
| Tiempo efectivo | `effectiveStudySeconds` |
| Ventana de respuesta | `responseDeadlineAt` |
| Bloque inverso | `InverseSession`, `ActiveInverseSession` |
| Evento invisible | `InvisibleEvent` |
| Meta semanal / supermeta | `WeeklyGoal`, `parentGoalId` |
| Dominante / Espectador | `dominantDeviceId`, `DeviceRole` |
| Checkpoint | `lastCheckpointAt` |

Definiciones precisas de cada término (con ejemplos numéricos e invariantes verificables) viven en `02-DOMINIO.md` §1.2 y §4 — este documento las cita, no las repite.

## 6. Requisitos funcionales

Cada requisito tiene un identificador estable `RF-<MÓDULO>-<NN>` (p. ej. `RF-CRO-03`) para que otros documentos y las tareas de implementación lo citen sin ambigüedad; el prefijo identifica el módulo y el número es correlativo dentro de él. Cada RF trae un **criterio de aceptación** verificable. Ningún RF de esta sección duplica una interfaz o un invariante ya definido en `02-DOMINIO.md`: cuando el criterio depende de un campo o una regla de dominio, se cita por sección (`02-DOMINIO.md §x`) en vez de repetirla. El detalle de estados/transiciones exactos del cronómetro está en `03-CRONOMETRO.md`; aquí solo se fija **qué** debe ser cierto desde el punto de vista del producto.

### 6.1 Autenticación y cuenta

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-AUTH-01 | El usuario se registra e inicia sesión con email/contraseña o con Google Sign-In. | Ambos métodos crean o recuperan la misma cuenta Firebase Auth; ningún tercer método (Apple, Facebook, etc.) está disponible en V1. |
| RF-AUTH-02 | Al primer login de una cuenta se crea de forma idempotente su `UserProfile` (`profile/main`) y `UserSettings` (`settings/main`) con valores por defecto, incluida `timezone` detectada del dispositivo y `cancellationPhrase` con el texto por defecto. | Repetir el login de la misma cuenta nunca duplica ni sobrescribe un perfil ya existente (as-built, `ensureUserProfileAndSettings`, `02-DOMINIO.md` §2.1). |
| RF-AUTH-03 | El usuario puede editar su nombre visible, su zona horaria y su frase personalizada de cancelación desde Configuración. | Cambiar la frase de cancelación actualiza `UserProfile.cancellationPhrase` y se refleja de inmediato en el panel de cancelación (§6.7); cambiar la zona horaria reatribuye días/semanas futuros sin reescribir sesiones pasadas (`02-DOMINIO.md` §6.2). |
| RF-AUTH-04 | Cerrar sesión no borra datos locales de dispositivo que no sean de la cuenta (p. ej. `DeviceIdentity`), pero sí impide seguir leyendo/escribiendo Firestore de esa cuenta. | Tras cerrar sesión, ninguna pantalla muestra datos de la cuenta anterior; volver a iniciar sesión con la misma cuenta recupera exactamente el mismo estado remoto. |
| RF-AUTH-05 | Sin verificación de teléfono, sin recuperación de cuenta por SMS, sin flujo de verificación de app ante Google (D19, R19). | El flujo de registro/login no presenta ni depende de ningún paso que implique costo o trámite de verificación. |

### 6.2 Categorías

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-CAT-01 | Existen tres árboles de categorías independientes, uno por cada `type`: `study`, `inverse`, `invisible` (`02-DOMINIO.md` §2.2). | Una categoría creada para sesiones de estudio nunca aparece como opción al crear un bloque inverso ni un evento invisible, y viceversa. |
| RF-CAT-02 | Toda categoría tiene nombre, color e ícono opcional; el color es obligatorio y se hereda o personaliza al crearla. | No se puede guardar una categoría sin nombre ni color; el selector de color ofrece una paleta y la opción de color libre. |
| RF-CAT-03 | Jerarquía de un nivel: una categoría puede tener subcategorías (`parentId`), pero una subcategoría no puede tener subcategorías propias. | El selector de "categoría padre" al crear una categoría solo ofrece categorías del mismo `type` que no tengan ya un `parentId` propio (`canAssignParent`, `02-DOMINIO.md` §3.6, I-14). |
| RF-CAT-04 | Cambiar el color de una categoría lo propaga a sus subcategorías y **recolorea el histórico completo** (calendario, historial de sesiones, estadísticas pasadas) — "color vivo" (R6, D6). | Cambiar el color de una categoría con sesiones de hace un mes actualiza de inmediato el color con que se ve esa sesión en calendario/estadísticas, sin reescribir ningún documento de sesión (`02-DOMINIO.md` I-15). |
| RF-CAT-05 | Una categoría referenciada por al menos una sesión, evento o meta nunca se borra físicamente: se archiva. | Intentar "eliminar" una categoría con historial la marca `isArchived: true` en vez de borrarla; deja de ofrecerse para nuevas sesiones pero el histórico que la usa sigue mostrando su nombre y color vigentes. |
| RF-CAT-06 | Cada categoría admite un `imageUrl?` opcional reservado para personalización futura con imagen, sin que V1 exponga un selector de imagen. | El campo existe en el modelo (`02-DOMINIO.md` §2.2) y no rompe nada si queda vacío; no hay ningún control de UI en V1 para completarlo. |

### 6.3 Presets

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-PRE-01 | Un preset define, en minutos: duración de estudio, descanso corto, cantidad de bloques antes del descanso largo (`cyclesBeforeLongBreak`) y duración del descanso largo. | Los cuatro campos son obligatorios y numéricos positivos (`cyclesBeforeLongBreak` entero ≥ 1); el formulario de preset no permite guardar con alguno vacío o en cero (salvo el descanso corto, que admite 0). |
| RF-PRE-02 | Todo usuario nuevo recibe automáticamente el preset **Estándar** (`STANDARD_PRESET_VALUES`: 25 min estudio, 5 min descanso corto, 4 bloques, 35 min descanso largo), marcado `isDefault: true`. | Una cuenta recién creada, sin ninguna acción del usuario, ya puede iniciar una sesión de estudio usando el preset Estándar. |
| RF-PRE-03 | El usuario puede crear, editar y eliminar presets propios, y elegir cuál es el preset por defecto. | Exactamente un preset por usuario tiene `isDefault: true` en todo momento; marcar otro como predeterminado quita la marca al anterior en la misma operación. |
| RF-PRE-04 | Al iniciar una sesión, los valores del preset elegido se **congelan** en esa sesión (`presetSnapshot`); cambiar o borrar el preset después no altera sesiones ya iniciadas o cerradas. | Editar la duración de estudio de un preset mientras hay una sesión activa que lo usa no cambia la duración del bloque en curso ni de los bloques ya registrados de esa sesión (`02-DOMINIO.md` §2.2). |
| RF-PRE-05 | Un preset admite `imageUrl?` opcional reservado para personalización futura, igual que Categoría (RF-CAT-06). | Igual criterio que RF-CAT-06, aplicado a `Preset`. |

### 6.4 Cronómetro de estudio

El detalle exacto de estados y transiciones vive en `03-CRONOMETRO.md`; aquí solo el comportamiento observable desde producto.

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-CRO-01 | Iniciar una sesión toma pocos toques: categoría de estudio (existente o creada al vuelo), preset (por defecto el marcado `isDefault`) y nombre opcional (SPEC v1 §14.1-14.2, §38.1). | Con el preset por defecto, iniciar una sesión desde la pantalla del Cronómetro toma ≤ 3 toques y no exige ningún campo salvo la categoría. |
| RF-CRO-02 | El panel de sesión activa muestra siempre: nombre, categoría y color, tiempo restante del tramo en curso, tiempo efectivo acumulado, bloque actual, banco disponible, acceso a Almuerzo y acceso a Cancelar (SPEC v1 §16.3, §38.2). | En `study_running` y `break_running` los siete datos son visibles sin navegar a otra pantalla. |
| RF-CRO-03 | Ventana de respuesta obligatoria al terminar un bloque, un descanso o en `break_selection`: **30 s** si el tramo que terminó dura ≤ 30 min; **10 min** si el tramo que terminó es el bloque que da paso a un descanso largo, o el propio descanso largo (R3, D3, brief §3.1; umbral de 30 min es supuesto pendiente #1). Resuelve REV-MEDIA-5 (ventana de `study_completed_waiting_response` sin definir). | Cronometrar la ventana desde que termina el tramo hasta que el usuario responde o expira nunca usa un valor distinto de 30 s o 10 min. |
| RF-CRO-04 | El panel `break_selection` ofrece exactamente 4 acciones simultáneas: tomar el descanso sugerido, saltar, personalizado, usar almuerzo (resuelve REV-MEDIA-9: v1 solo definía 2 de 4 transiciones). | Las 4 opciones están visibles a la vez en `break_selection`; ninguna acción adicional existe en ese panel. |
| RF-CRO-05 | "Terminar sesión" (`completionReason: 'ended_by_user'`) solo existe en un punto de decisión entre bloques (`break_selection` o `break_completed_waiting_response`); no existe "finalizar ahora conservando lo estudiado" a mitad de un bloque o descanso (R1, D1). | El control "Terminar sesión" no está disponible en `study_running`, `break_running` ni `lunch_running`. |
| RF-CRO-06 | Al vencer una ventana de respuesta, la sesión expira (`status: 'expired'`): se pierde solo el tramo en curso; los bloques ya completados conservan su tiempo efectivo y cuentan en estadísticas (R2, D2). | Expirar durante el bloque 3 de una sesión de 4 deja `effectiveStudySeconds` igual a la suma de los bloques 1 y 2, nunca 0 ni la suma completa. |
| RF-CRO-07 | Recuperación tras cierre inesperado de la app o del dispositivo dominante: al reabrir, la sesión se reconstruye desde el singleton remoto con los bloques ya completados por checkpoint incremental; ningún bloque completado se pierde por un crash (faceta de producto de REV-ALTA-2/REV-ALTA-3; mecanismo en `02-DOMINIO.md` §2.5/§3.4 y `05-ARQUITECTURA.md`). | Forzar el cierre de la app a mitad del bloque 3 y reabrirla muestra la sesión continuando en el bloque 3 con los bloques 1 y 2 ya registrados. |
| RF-CRO-08 | Solo puede existir una sesión de estudio o un bloque inverso activo por usuario a la vez, entre todos sus dispositivos (regla crítica #10 de SPEC v1 §33; resuelve REV-ALTA-3; mecanismo en `02-DOMINIO.md` I-11). | Intentar iniciar una segunda sesión o bloque inverso mientras ya hay uno activo en cualquier dispositivo del mismo usuario nunca crea un segundo singleton: la app lo rechaza o lo ofrece como toma de control (§6.16). |

### 6.5 Banco de descanso

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-BAN-01 | El descanso ganado al completar un bloque (corto siempre; + largo cuando el bloque es múltiplo de `cyclesBeforeLongBreak`) se suma **una sola vez** al disponible de esa decisión (`disponible = banco + ganado`); lo no usado nunca se vuelve a sumar como ingreso nuevo (resuelve REV-ALTA-4, doble conteo de SPEC v1 §17.5/§17.6). | Con el preset Estándar, el bloque 4 ofrece 2400 s disponibles (300 + 2100), nunca ese valor sumado dos veces con el banco previo (`02-DOMINIO.md` §1.2, I-4). |
| RF-BAN-02 | El usuario elige cuánto descanso usar, en minutos enteros, entre 0 y el disponible — incluye 0, 1, 4 min o cualquier entero permitido; obligatorio en V1 (SPEC v1 §17.5, regla crítica #3 de §33). | El selector de descanso personalizado acepta cualquier entero de minutos entre 0 y el disponible convertido a minutos, y rechaza el resto. |
| RF-BAN-03 | Saltar descanso equivale a usar 0 minutos (`breakType: 'skipped'`); todo el disponible pasa al banco. | Con un disponible de 5 min, tocar "Saltar" produce `usedSeconds: 0` y `bankDeltaSeconds: 300`. |
| RF-BAN-04 | El banco pertenece solo a la sesión activa: nace en 0 al iniciarla y desaparece con ella al terminar, cancelar o expirar (regla crítica #2 de SPEC v1 §33). | Dos sesiones distintas del mismo usuario nunca comparten ni heredan banco entre sí. |
| RF-BAN-05 | Un descanso ejecutado se clasifica en exactamente una de cuatro categorías —corto, largo, personalizado o saltado— según cuánto se usó respecto de lo ganado; el almuerzo nunca se clasifica como un tipo de descanso (`02-DOMINIO.md` I-5). | Aceptar exactamente el descanso corto ganado sin abrir el selector produce `breakType: 'short'`; cualquier otro valor (incluido un descanso largo tomado parcialmente) produce `'custom'`. |

### 6.6 Almuerzo

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-ALM-01 | Pausa fija de 45 min que no consume banco de descanso ni cuenta como tiempo efectivo de estudio ni de descanso (R5, SPEC v1 §18). | Usar el almuerzo nunca modifica `bankRemainingSeconds` ni `effectiveStudySeconds`. |
| RF-ALM-02 | Disponible desde el inicio de la sesión (sin usos previos) y luego una vez cada 3 bloques completados desde el último uso (R5, D5; el "desde el inicio" es supuesto pendiente #2). Resuelve REV-ALTA-1 (límite de usos indefinido) y REV-MEDIA-17 (sin límite en v1). | En una sesión nueva el botón Almuerzo está habilitado antes de completar ningún bloque; tras usarlo, queda deshabilitado hasta completar 3 bloques más. |
| RF-ALM-03 | Se puede pedir desde cualquier estado activo: bloque en curso (que se **pausa**, no se descarta), `break_selection`, descanso en curso, y cualquier ventana de espera. Al terminar el almuerzo se retoma exactamente el estado y el tramo desde donde se pidió; si era una ventana de espera, se reinicia completa (resuelve REV-ALTA-1). | Pedir almuerzo a mitad de un bloque y terminarlo retoma el mismo bloque con el tiempo restante que tenía al pausarse, no un bloque nuevo. |
| RF-ALM-04 | Máximo un almuerzo activo a la vez. | El control de Almuerzo está deshabilitado mientras `currentState === 'lunch_running'`. |
| RF-ALM-05 | Cada uso queda registrado en el detalle de la sesión con sus timestamps de inicio y fin (SPEC v1 §18.4). | La vista de detalle de una sesión con almuerzo usado muestra al menos un tramo de almuerzo con hora de inicio y fin. |

### 6.7 Cancelación

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-CAN-01 | Doble confirmación con fricción deliberada: botón bloqueado 15 s; al pulsarlo se reinicia otro bloqueo de 15 s; recién la segunda confirmación cancela (SPEC v1 §20.2-20.3, regla crítica #8 de §33). Se muestra la frase personalizada del perfil (`UserProfile.cancellationPhrase`), editable in situ con un ícono de lápiz. | El flujo completo de cancelación toma al menos 30 s de espera bloqueada, sin contar lo que el usuario tarde en decidir. |
| RF-CAN-02 | El panel de cancelación se abre desde cualquier estado activo. Mientras está abierto, la ventana de respuesta vigente (si la hay) **sigue corriendo**: no se pausa por tener el panel abierto (resuelve REV-MEDIA-18). | Abrir el panel de cancelación durante una ventana de 30 s y no completar ni cancelar antes de que venza hace que la sesión **expire**, no que se cancele. |
| RF-CAN-03 | Cancelar cierra la sesión como `cancelled` (`completionReason: 'cancelled_by_user'`), con la **misma severidad que expirar** (CONFIRMADO por el creador el 2026-09-06, pregunta 25 — corrige la versión anterior de este documento, que asumía "borra todo"): se pierde solo el `effectiveStudySeconds` del bloque en curso al momento de `CONFIRM_CANCEL`; los bloques previos ya completados en esa misma sesión conservan su tiempo efectivo y sí cuentan para estadísticas. `studySegments[]` completo se conserva siempre como histórico de auditoría (SPEC v1 §20.4, decisión recomendada de no borrar físicamente). | Cancelar una sesión con 2 bloques completados suma esos 2 bloques a las estadísticas del período, igual que si esa misma sesión hubiera expirado en el mismo punto; el historial de la sesión muestra los 2 bloques completados. |
| RF-CAN-04 | Cancelar un bloque inverso **no** exige esta doble confirmación — ver RF-INV-06 (§6.8). | — |
| RF-CAN-05 | Feedback audiovisual **neutro** configurable al cancelar (sonido/transición de cierre), desactivable sin afectar la mecánica de doble confirmación. Corrige SPEC v1 §20.5 (animación triste/sonido triste, copy de culpa): resuelto el 2026-09-06 (decisiones-tomadas.md, "Fricción de cancelación") que la app **no** impone ningún elemento punitivo — el peso emocional lo aporta la `cancellationPhrase` que el propio usuario escribió, no un diseño de culpa del equipo. | Desactivar "efectos de cancelación" en Ajustes elimina el sonido/transición pero no cambia el flujo de 15+15 s; ningún estado de cancelación usa lenguaje o imágenes de reproche. |

### 6.8 Temporizador inverso

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-INV-01 | Iniciar exige elegir categoría inversa (o crearla al vuelo) y una duración objetivo `T` antes de arrancar (SPEC v1 §21.3; resuelve REV-MEDIA-4, el campo `targetDurationSeconds` es as-built). | No se puede iniciar un bloque inverso sin haber definido `T` en minutos. |
| RF-INV-02 | El temporizador no se detiene al alcanzar `T`: sigue corriendo. Al llegar a `T` suena una notificación distinta de "meta alcanzada" y el botón "Finalizar" se resalta (R4, D4). | Alcanzar `T` no cierra la sesión ni detiene el conteo; dispara una notificación distinguible de los recordatorios periódicos. |
| RF-INV-03 | Tope duro en `2 · T`: al alcanzarlo, el bloque se cierra automáticamente (`autoFinished: true`) y se guarda igual, sin intervención del usuario (R4, D4; el factor 2 es supuesto pendiente #3). | Un bloque inverso sin intervención se cierra solo exactamente a los `2 · T` segundos desde el inicio, nunca antes ni después. |
| RF-INV-04 | Recordatorios cada 15 min que no exigen respuesta (SPEC v1 §21.5, §28.2). | Cada recordatorio es una notificación pasiva; ignorarla nunca cierra ni penaliza el bloque. |
| RF-INV-05 | Exclusión mutua con una sesión de estudio activa del mismo usuario: no puede haber un bloque inverso corriendo si ya hay una sesión de estudio activa, ni viceversa (brief §3.5; supuesto pendiente #4). | Intentar iniciar un temporizador inverso mientras hay una sesión de estudio activa (en cualquier dispositivo del usuario) es rechazado por la app. |
| RF-INV-06 | Cancelar un bloque inverso es un toque más una confirmación simple, sin la doble espera de 15+15 s de la cancelación de estudio (es ocio, no exige la misma gravedad emocional; brief §3.5; resuelve REV-MEDIA-8). `cancelled` no cuenta en estadísticas de ocio. | Cancelar un bloque inverso toma como máximo dos toques y no impone ningún bloqueo temporal. |
| RF-INV-07 | `'interrupted'` existe en el modelo pero ningún flujo de V1 lo produce; queda reservado (resuelve REV-MEDIA-8). | Ninguna acción de la UI de V1 puede dejar un bloque inverso en `status: 'interrupted'`. |

### 6.9 Sesiones (registro e historial)

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-SES-01 | Cada sesión de estudio o bloque inverso se guarda como un único documento con todo su detalle embebido, sin subcolección de bloques, distinguiendo siempre tiempo efectivo de tiempo total transcurrido (`02-DOMINIO.md` §2.3-2.4). | Para toda sesión cerrada, `totalElapsedSeconds ≥ effectiveStudySeconds`, y ambos están disponibles por separado en el detalle. |
| RF-SES-02 | Historial de sesiones pasadas, filtrable por tipo (estudio/ocio) y por categoría, ordenado por fecha de inicio descendente. | El historial muestra al menos las últimas 20 sesiones sin scroll manual excesivo; filtrar por categoría oculta las sesiones de otras categorías. |
| RF-SES-03 | El detalle de una sesión de estudio muestra: tiempo total, segmentos de estudio, segmentos de descanso, uso de almuerzo si lo hubo, tiempo efectivo, categoría y preset utilizado (SPEC v1 §23.6). | Abrir el detalle de cualquier sesión de estudio cerrada muestra los siete datos anteriores sin cambiar de pantalla. |
| RF-SES-04 | Cambiar o borrar un preset o una categoría después de cerrada una sesión nunca altera lo que esa sesión registró (`presetSnapshot` congelado; categoría resuelta en vivo salvo nombre/color histórico; regla crítica #7 de SPEC v1 §33; `02-DOMINIO.md` §2.2-2.3). | Borrar un preset no usado por ninguna sesión activa no rompe el detalle de sesiones pasadas que lo usaron. |
| RF-SES-05 | Toda sesión cerrada tiene exactamente un `status` final (`completed`, `cancelled` o `expired` para estudio; `completed` o `cancelled` para ocio en V1) y un `completionReason` que explica el motivo exacto (`02-DOMINIO.md` §3.3). | Ninguna sesión del historial queda con `status: 'active'` (`02-DOMINIO.md` I-13). |

### 6.10 Calendario

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-CAL-01 | Vistas de día, semana, mes y año (SPEC v1 §23.4, §27). | Las cuatro vistas son accesibles desde Calendario sin pasos intermedios. |
| RF-CAL-02 | Muestra sesiones de estudio completadas, bloques inversos completados y eventos invisibles, cada uno pintado con el color vigente de su categoría (SPEC v1 §23.2, §23.5; regla "color vivo" R6/D6). | Una sesión cuya categoría cambió de color después de cerrada se ve, hoy, con el color nuevo en el calendario. |
| RF-CAL-03 | Los eventos invisibles se ven en el calendario pero no cuentan en ninguna estadística (SPEC v1 §23.3, §24.1; regla crítica #5 de §33). | Crear un evento invisible de 2 horas no mueve ningún número en Estadísticas. |
| RF-CAL-04 | Abrir una sesión desde el calendario muestra el mismo detalle que RF-SES-03. Pueden existir múltiples sesiones o eventos simultáneos sin que la vista los oculte (SPEC v1 §24.4). | Dos eventos superpuestos en el tiempo son ambos visibles y ambos abribles desde la vista de día. |
| RF-CAL-05 | El calendario funciona igual en Android, web y desktop-PWA: es gestión (CRUD y lectura), no ejecución del cronómetro, y no depende de qué dispositivo es dominante (`02-DOMINIO.md` §7). | Crear, editar o revisar cualquier elemento del calendario desde la PWA de escritorio produce el mismo resultado que desde Android. |

### 6.11 Eventos invisibles

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-EVI-01 | Nombre, categoría de tipo `invisible`, fecha/hora de inicio y fin planificadas (`startAt`/`endAt`, no `startedAt`/`endedAt`), notas opcionales (SPEC v1 §24.3; `02-DOMINIO.md` §2.6, D13). | El formulario exige nombre, categoría, inicio y fin; el color se resuelve siempre de la categoría, nunca se pide aparte. |
| RF-EVI-02 | Recurrencia opcional semanal: días de la semana seleccionables y fecha de fin de serie opcional; sin recurrencia por defecto (SPEC v1 §24.5; resuelve REV-MEDIA-3). Las ocurrencias se calculan en el dispositivo desde un único documento, sin una fila por ocurrencia (faceta de producto de REV-MEDIA-11). | Un evento "Gimnasio" lunes/miércoles/viernes hasta fin de año se ve en las 3 fechas correspondientes de cada semana sin haber creado más de un evento. |
| RF-EVI-03 | Se pueden editar y eliminar; el borrado es lógico (`isDeleted`) y nunca deja huérfana una ocurrencia ya mostrada (SPEC v1 §24.4). | "Eliminar" un evento recurrente detiene todas sus ocurrencias futuras sin dejar rastro visible en el calendario. |

### 6.12 Estadísticas

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-EST-01 | Períodos obligatorios en V1: día, semana y mes (SPEC v1 §25.1). | El selector de período ofrece las tres opciones sin configuración adicional. |
| RF-EST-02 | Para el período elegido: tiempo total de estudio efectivo, tiempo total de ocio, comparación estudio vs. ocio, desglose por categoría y subcategoría de estudio, y avance de metas de la semana (SPEC v1 §25.2, §25.4). | Cambiar de "semana" a "mes" recalcula los seis datos sin recargar la pantalla completa. |
| RF-EST-03 | Gráfico de barras por período que distingue tiempo de estudio, tiempo inverso y, cuando aplica, subcategorías (SPEC v1 §25.3). | El gráfico de una semana con 3 categorías de estudio muestra las 3 con su color vigente. |
| RF-EST-04 | Visualización porcentual de estudio vs. ocio, y dentro del ocio, de sus subtipos por categoría (SPEC v1 §25.3). | La suma de los porcentajes mostrados es 100 % del tiempo registrado en el período (sin contar eventos invisibles, RF-CAL-03). |
| RF-EST-05 | Tabla histórica densa tipo cuadrícula para revisar meses, semanas y días pasados y la evolución del total estudiado (SPEC v1 §25.3). | La tabla permite ver al menos 8 períodos pasados sin exportar datos. |
| RF-EST-06 | Toda estadística de estudio usa `effectiveStudySeconds`, nunca `totalElapsedSeconds`; toda estadística de ocio usa `totalElapsedSeconds` de `InverseSession` (SPEC v1 §16.2, regla crítica #1 de §33; `02-DOMINIO.md` I-1). Sesiones `completed`, `cancelled` y `expired` aportan su `effectiveStudySeconds` (que ya excluye el bloque en curso al momento del cierre, §6.7); solo eventos invisibles (RF-CAL-03) quedan siempre excluidos del todo. | Sumar manualmente los bloques completados de un período —sin importar si la sesión que los contiene terminó `completed`, `cancelled` o `expired`— coincide exactamente con el número que muestra Estadísticas para ese período. |
| RF-EST-07 | Vista anual minimalista con los 12 meses, indicador resumido de tiempo por mes y una estrella en los meses que cumplen la regla de constancia (§6.13, SPEC v1 §27). | Un mes sin ninguna sesión ni meta configurada se ve sin estrella y sin datos, no como un error. |

### 6.13 Metas

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-MET-01 | Metas semanales de tiempo efectivo de estudio por categoría (solo `type: 'study'`), capturadas en horas/minutos desde la UI y persistidas en segundos (`targetSeconds`) (SPEC v1 §26.1-26.3, regla crítica #6 de §33; resuelve REV-BAJA "segundos o minutos"). | Crear una meta de "10 horas de Cálculo 3 esta semana" persiste `targetSeconds: 36000`. |
| RF-MET-02 | `achievedSeconds` se recalcula automáticamente desde los bloques completados atribuidos a esa semana y categoría; un bloque de una subcategoría sin meta propia cuenta para la meta de la categoría padre (`02-DOMINIO.md` §6.3, I-16). | Completar un bloque de 25 min de una subcategoría de Cálculo 3 mueve el avance de la meta de Cálculo 3 si esa subcategoría no tiene meta propia esa semana. |
| RF-MET-03 | Al cerrar la semana (lunes 00:00 de la semana siguiente, zona horaria del perfil), toda meta `pending` pasa a `completed` o `failed` según si `achievedSeconds ≥ targetSeconds` (SPEC v1 §26.4; `02-DOMINIO.md` §6.3). | Una meta con `achievedSeconds` igual al objetivo exacto al cierre queda `completed`, nunca `failed`. |
| RF-MET-04 | Estrella mensual: un mes la obtiene solo si tiene al menos una semana cerrada con al menos una meta configurada, y **todas** las metas de **todas** las semanas cerradas con metas de ese mes se cumplieron (R7, D7; resuelve REV-MEDIA-12: sin metas nunca hay estrella por vacuidad). | Un mes sin ninguna meta configurada nunca muestra estrella; un mes con una sola semana con metas —todas cumplidas— y el resto de semanas sin metas configuradas sí la obtiene. |
| RF-MET-05 | Una meta puede agruparse bajo una supermeta vía `parentGoalId`, hasta dos niveles; en V1 el campo existe en el modelo sin UI para crear ni visualizar la jerarquía (gancho para la Galaxia de V1.1, `02-DOMINIO.md` §3.3, brief §11). | Crear una meta normal en V1 nunca pide ni expone `parentGoalId`. |

### 6.14 Sonidos y notificaciones

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-SON-01 | Sonidos por defecto para fin de bloque de estudio, fin de descanso ("toca estudiar") y recordatorio del temporizador inverso; suaves, no estridentes por defecto (SPEC v1 §28.1-28.2). | Los tres eventos disparan un sonido distinguible entre sí cuando el sonido está habilitado. |
| RF-SON-02 | Preferencias sincronizadas entre dispositivos: activar/desactivar sonido globalmente, volumen relativo (0–1) donde la plataforma lo permita, elegir entre sonidos predefinidos por evento (SPEC v1 §28.3; `02-DOMINIO.md` §2.1 `SoundPreferences`). | Cambiar el volumen en un dispositivo se refleja en `settings/main` y, tras sincronizar, en cualquier otro dispositivo del mismo usuario. |
| RF-SON-03 | Audio propio del dispositivo (selector de documentos) solo en Android; preferencia **local** de ese dispositivo, no sincronizada entre dispositivos en V1 (D18; resuelve REV-MEDIA-14, fijado como V1 local y no V2 para no requerir Firebase Storage de pago). | Elegir un audio propio en un teléfono Android no aparece como opción en otro dispositivo del mismo usuario. |
| RF-SON-04 | En Android, cada tramo con alarma (fin de bloque, fin de descanso) programa una notificación local que suena aunque la app esté en segundo plano, y se cancela si el tramo cambia antes de sonar (SPEC v1 §28.4; matriz de degradación completa en `05-ARQUITECTURA.md`). | Minimizar la app en Android durante un bloque y esperar a que termine igual dispara la alarma sonora y la notificación visual. |
| RF-SON-05 | Sonido de cancelación (neutro, no punitivo) configurable/desactivable por separado del resto — ver RF-CAN-05. | — |
| RF-SON-06 | Web y desktop-PWA no reproducen alarmas propias del cronómetro (son espectadores, §6.17): el audio automático sin gesto reciente del usuario está restringido por los navegadores (`02-DOMINIO.md` §7). | Una sesión activa vista desde la PWA de escritorio nunca reproduce sonido de fin de bloque por sí sola. |

### 6.15 Tema y personalización

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-TEM-01 | Modo claro, oscuro y "según sistema", en todas las plataformas (SPEC v1 §39; brief §8). | Cambiar el modo en Ajustes actualiza toda la app sin reiniciarla. |
| RF-TEM-02 | Skin visual base "Papel" (paleta, tipografías Fraunces/Archivo/IBM Plex Mono) aplicada de forma consistente en toda la app, incluida la futura Galaxia (brief §8, §11; detalle completo en `06-DISENO-UI.md`). | Los mismos tokens de color/tipografía del cronómetro se usan en calendario, estadísticas y metas. |
| RF-TEM-03 | La preferencia `reduceMotion` del perfil se respeta: anima menos o nada cuando está activada (SPEC v1 §39). | Activar "reducir movimiento" elimina o simplifica microcelebraciones y transiciones largas. |
| RF-TEM-04 | Microcelebraciones visuales (p. ej. confeti al completar un bloque o una meta) configurables/desactivables (`celebrationEffectsEnabled`, SPEC v1 §29.2). | Desactivar celebraciones en Ajustes elimina el efecto visual sin afectar el registro del bloque. |
| RF-TEM-05 | Layout responsive: navegación inferior por pestañas en teléfono; barra lateral con contenido en columnas en tablet y desktop-web (brief §8). | La misma cuenta abierta en un teléfono y en la PWA de escritorio muestra la navegación adecuada a cada tamaño, sin más funcionalidad faltante que la ya restringida por plataforma (§6.17). |

### 6.16 Multi-dispositivo (dominante / espectador)

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-MUL-01 | Todo lo que no sea el cronómetro activo (categorías, presets, eventos invisibles, metas, ajustes, perfil) funciona en paralelo sin arbitraje en todos los dispositivos del usuario: CRUD normal contra Firestore (R14, D14). | Crear una categoría en un dispositivo la hace aparecer en cualquier otro dispositivo del mismo usuario sin ninguna acción manual de "sincronizar". |
| RF-MUL-02 | Para el cronómetro activo, un único dispositivo es **dominante** en cada momento: el único que puede iniciar/accionar transiciones. Los demás son **espectadores**: ven el contador en vivo pero sus controles de acción están deshabilitados (R14, D14, brief §5). | En un segundo dispositivo con la sesión a la vista, los botones de acción (tomar descanso, cancelar, etc.) se ven deshabilitados mientras ese dispositivo es espectador. |
| RF-MUL-03 | Si un espectador intenta accionar un control, se dispara una solicitud de cambio de dominante: aparece un diálogo "¿Quieres tomar el control?" (Sí/No) en el espectador y en el dominante actual; quien confirme primero se vuelve el nuevo dominante y el otro pasa a espectador automáticamente (R14, D14). | Tocar un control deshabilitado en el espectador siempre dispara el diálogo en ambos dispositivos, nunca ejecuta la acción directamente. |
| RF-MUL-04 | Una sesión sin checkpoint nuevo durante 24 h se considera "zombie" y se cierra sola la próxima vez que cualquier dispositivo del usuario la lee, conservando los bloques ya completados (R16, D16). | Una sesión abandonada (app o dispositivo apagado) más de 24 h se cierra sola al reabrir la app en cualquier dispositivo del mismo usuario. |
| RF-MUL-05 | Reinstalar la app o borrar caché de un dispositivo nunca pierde una sesión activa: el singleton remoto es la fuente de verdad; el almacenamiento local solo acelera el arranque del dominante (D15; `02-DOMINIO.md` §3.5). | Reinstalar la app en el dispositivo dominante mientras hay una sesión activa la recupera correctamente al volver a iniciar sesión, arrancando como espectador hasta tomar el control. |

### 6.17 Plataformas

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-PLA-01 | Solo Android puede ser dominante en V1: iniciar o accionar una sesión de estudio o un bloque inverso con alarmas reales requiere Android (D "Alcance de plataformas"; supuesto pendiente #10). Resuelve REV-ALTA-6 y REV-MEDIA-16 en su faceta de producto (matriz de degradación técnica completa en `05-ARQUITECTURA.md`). | Los controles de iniciar/accionar el cronómetro están deshabilitados en web y en la PWA de escritorio, con un mensaje que explica por qué. |
| RF-PLA-02 | Web y desktop-PWA ven el cronómetro activo en modo espectador (mismo `onSnapshot`, reloj interpolado localmente), sin alarmas de audio propias (§6.14). | Abrir la PWA mientras hay una sesión activa en Android muestra el conteo en vivo sincronizado, con margen de error menor a 2 segundos frente al dispositivo dominante. |
| RF-PLA-03 | Calendario, estadísticas, categorías, presets, metas, eventos invisibles y ajustes funcionan igual y con control completo en Android, web y desktop-PWA (`02-DOMINIO.md` §7). | Cualquier operación de esas seis áreas hecha en la PWA de escritorio produce exactamente el mismo resultado que en Android. |
| RF-PLA-04 | Desktop es la misma PWA instalada (Windows/macOS/Linux vía Firebase Hosting), no una app nativa separada; sin Electron ni Tauri en V1 (brief §6; supuesto pendiente #5). | Instalar la PWA en un navegador de escritorio compatible (`display-mode: standalone`) da acceso a las cuatro secciones sin instalar software adicional. |
| RF-PLA-05 | Existe un camino documentado (no implementado en V1) para habilitar "web dominante" en una versión futura sin rediseñar el modelo de datos ni las reglas de seguridad, más allá de aceptar `'web'` como plataforma dominante (`02-DOMINIO.md` §7; supuesto pendiente #10). | `05-ARQUITECTURA.md` señala exactamente qué condiciones y reglas de seguridad cambiarían para habilitarlo, sin proponer un modelo de datos distinto. |

## 7. Reglas críticas de negocio

Estas reglas son no negociables: ninguna pantalla, atajo o excepción de UI puede violarlas. Unifican en una sola jerarquía priorizada las tres listas dispersas de SPEC v1 (§8 "Principios de diseño", §33 "Reglas críticas de negocio", §46 "Instrucción para cualquier agente de código") — resuelve el hallazgo BAJO sobre falta de jerarquía única. Los principios de producto de alto nivel están en §2; aquí, las reglas operativas verificables, de la más fundamental a la más específica.

1. **Medición honesta es innegociable.** El tiempo efectivo de estudio nunca incluye descansos ni almuerzo (§6.4, §6.12; `02-DOMINIO.md` I-1). Los bloques inversos cuentan solo para ocio, nunca para estudio (§6.8). Los eventos invisibles se ven en calendario pero nunca en estadísticas (§6.10-6.11).
2. **Expirar y cancelar tienen el mismo efecto sobre las estadísticas, pero flujos de UX distintos.** Ambos conservan los bloques ya completados y solo pierden el bloque en curso (R2, D2, R25, D1.b — §6.4 RF-CRO-06, §6.7 RF-CAN-03); lo que los distingue es que cancelar exige la doble confirmación deliberada de 15+15 s (fricción de producto) mientras que expirar es involuntario (no responder a tiempo).
3. **Toda ventana de respuesta que vence expira la sesión**, perdiendo solo el tramo en curso — nunca la sesión completa (§6.4 RF-CRO-03, RF-CRO-06).
4. **El banco de descanso es propiedad exclusiva de la sesión activa.** Nace en 0, se calcula con una única fórmula sin doble conteo, y desaparece con la sesión sin excepción (§6.5, `02-DOMINIO.md` I-4).
5. **El descanso personalizado con banco es obligatorio en V1**, incluyendo 0, 1, 4 minutos o cualquier entero permitido hasta el disponible (§6.5 RF-BAN-02).
6. **El almuerzo nunca es un descanso.** No consume banco, no cuenta como estudio efectivo, y tiene su propio límite de uso (cada 3 bloques) para no convertirse en una forma de evadir la disciplina del cronómetro (§6.6).
7. **Solo hay una sesión activa por usuario, y solo un dominante a la vez.** Ningún dispositivo puede crear una segunda sesión activa mientras exista una; ningún dispositivo que no sea el dominante puede accionar el cronómetro sin pasar por el protocolo de toma de control (§6.16; `02-DOMINIO.md` I-11, I-12).
8. **Los cambios de categoría o preset nunca dañan el histórico ya cerrado.** El preset se congela por sesión (`presetSnapshot`); el color y el nombre de categoría siempre se resuelven en vivo, nunca desde un snapshot (§6.2 RF-CAT-04, §6.3 RF-PRE-04; `02-DOMINIO.md` I-15).
9. **Las metas se miden siempre con tiempo efectivo**, nunca con tiempo total transcurrido, y la estrella mensual exige constancia real: un mes sin ninguna meta configurada nunca la obtiene por vacuidad (§6.13 RF-MET-01, RF-MET-04).
10. **Android es la única plataforma que ejecuta el cronómetro con alarmas reales en V1**; el resto de funciones (gestión, calendario, estadísticas, metas) son multiplataforma sin degradación (§6.17).
11. **Costo cero es una restricción de producto, no solo técnica**: ninguna regla de negocio puede depender de un servicio de pago (§2 principio 7; §8.3).
12. **Sin dinero real ni moneda comprable en ninguna versión**, incluida la Tienda de V1.1: todo desbloqueo es por constancia (§3.5, §9.2).

## 8. Requisitos no funcionales

### 8.1 Rendimiento

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RNF-01 | El conteo del cronómetro nunca depende de la latencia de red: el dispositivo dominante cuenta localmente por timestamps y solo escribe checkpoints puntuales (brief §5; `02-DOMINIO.md` §6.1). | Desconectar la red del dispositivo dominante durante un bloque no detiene ni desincroniza el conteo visible en pantalla. |
| RNF-02 | El tamaño de una sesión típica (hasta ~12 bloques) se mantiene muy por debajo del límite de 1 MiB por documento de Firestore (`02-DOMINIO.md` §5.1: < 8 KB). | Ninguna sesión de uso normal se acerca al límite de tamaño de documento. |
| RNF-03 | Calendario, estadísticas y metas leen rangos acotados y agregan en cliente, sin caché de agregados en V1 (`02-DOMINIO.md` §5.2). | Abrir Estadísticas para un mes no requiere más de una consulta por tipo de dato (sesiones de estudio, sesiones inversas, eventos, metas). |

### 8.2 Confiabilidad

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RNF-04 | Ningún bloque completado se pierde ante un cierre inesperado de la app: cada `StudySegment`/`BreakSegment`/`LunchSegment` se escribe al checkpoint remoto al completarse (D "Robustez ante crash"). | Ver RF-CRO-07 (§6.4). |
| RNF-05 | Una sesión sin actividad de checkpoint durante 24 h se resuelve sola (zombie) sin intervención manual ni Cloud Functions (R16, D16). | Ver RF-MUL-04 (§6.16). |
| RNF-06 | El sistema opera correctamente sin ninguna Cloud Function: toda regla de exclusión y arbitraje se resuelve con transacciones de cliente y reglas de seguridad de Firestore (brief §6; `02-DOMINIO.md` §5.3). | El proyecto no despliega ninguna Cloud Function; `firestore.rules` es la única capa de arbitraje del servidor. |

### 8.3 Costo cero

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RNF-07 | Todo el backend corre en el plan gratuito Firebase Spark: Auth + Firestore + Hosting. Sin Cloud Functions, sin Storage en V1, sin EAS Build en la nube, sin verificación de app OAuth de pago (R8, R9, R17, R19; D "Confiabilidad técnica", D19; principio §2.7). | Ningún archivo de configuración del proyecto referencia un producto de Firebase de pago ni un servicio externo con costo recurrente. |
| RNF-08 | El volumen de escrituras de un usuario individual queda muy por debajo de la cuota diaria gratuita de Firestore (`02-DOMINIO.md` §5.1: ~14 escrituras por sesión típica vs. 20 000/día gratis). No existe un umbral automático de reevaluación del stack en V1; si el creador invita usuarios adicionales, esta cuenta se revisa manualmente antes de escalar (resuelve el hallazgo BAJO sobre límites del plan gratuito). | Antes de invitar a un nuevo usuario, se revisa manualmente la proyección de escrituras diarias contra la cuota gratuita. |

### 8.4 Privacidad y datos personales

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RNF-09 | Ningún dato de comportamiento (sesiones, categorías, metas) sale del proyecto Firebase propio del creador hacia un tercero: sin analítica de terceros, sin publicidad, sin SDKs de tracking (no-objetivo §3.8). | La app no incluye ningún SDK de analítica o publicidad de terceros. |
| RNF-10 | **V1.5** introduce "Exportar mis datos" (descarga de todas las colecciones del usuario en un archivo legible, p. ej. JSON) y "Borrar mi cuenta" (borrado de todos los documentos bajo `users/{uid}` y de la cuenta de Firebase Auth) — resuelve el hallazgo BAJO de SPEC v1 §11 (sin mención de privacidad/exportación/borrado). No es V1 porque no bloquea el prototipo funcional de un solo usuario, pero queda comprometido explícitamente para no dejarlo indefinido (§9.3). | Desde V1.5, Ajustes ofrece ambas acciones con confirmación previa; "Borrar mi cuenta" exige una confirmación tan explícita como la cancelación de sesión (§6.7). |

### 8.5 Accesibilidad e idioma

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RNF-11 | Modo oscuro/claro/sistema disponible en toda la app (§6.15 RF-TEM-01); ningún estado crítico del cronómetro (activo, esperando respuesta, expirado, cancelado) se comunica solo por color, siempre acompañado de texto o ícono (SPEC v1 §39). Estándar de referencia: **WCAG 2.1 nivel AA** para contraste de color y tamaño de texto, sin certificación formal en V1 (resuelve el hallazgo BAJO sobre falta de estándar de accesibilidad). | Toda combinación de color de texto/fondo definida en `06-DISENO-UI.md` cumple una razón de contraste ≥ 4.5:1 para texto normal. |
| RNF-12 | Todo el texto de la app está en **español neutro, con "tú"** (no "usted", no "vos"), centralizado en `src/i18n/es.ts` (brief §8; el mockup del cronómetro usó "vos" — corregido en el copy final; supuesto pendiente #7). | Ningún copy de la app usa conjugación de "vos" ni de "usted". |

## 9. Alcance por versión

Resuelve el hallazgo MEDIO sobre falta de distinción Android-only vs. multiplataforma en el MVP de v1 (REV-MEDIA-16, SPEC v1 §2/§7.2/§35.1/§45) marcando explícitamente la plataforma de cada bloque de alcance.

### 9.1 V1 — Prototipo funcional

| Módulo | Alcance | Plataforma |
|---|---|---|
| Autenticación (§6.1) | Completo | Multiplataforma |
| Categorías y presets (§6.2-6.3) | Completo, incluida jerarquía de un nivel | Multiplataforma |
| Cronómetro de estudio completo: banco, almuerzo, cancelación, ventanas de respuesta (§6.4-6.7) | Completo | **Android dominante** (iniciar/accionar); web/desktop-PWA solo espectador (§6.17) |
| Temporizador inverso (§6.8) | Completo | **Android dominante**; web/desktop-PWA solo espectador |
| Sesiones e historial (§6.9) | Completo | Multiplataforma (lectura y gestión) |
| Calendario (§6.10) y eventos invisibles (§6.11) | Completo, incluida recurrencia semanal | Multiplataforma |
| Estadísticas día/semana/mes (§6.12) | Completo | Multiplataforma |
| Metas semanales y estrella mensual (§6.13) | Completo, sin UI de supermeta/galaxia | Multiplataforma |
| Sonidos y notificaciones (§6.14) | Completo | Android con alarmas reales; web/desktop-PWA sin alarma propia |
| Tema claro/oscuro y skin "Papel" (§6.15) | Completo | Multiplataforma |
| Ganchos de datos para Galaxia/Tienda (`parentGoalId`, `skinId`, `GalaxyLayout`, `InventoryItem`) | Solo esquema, sin UI (`02-DOMINIO.md` §2.6, §3.5) | N/A |

### 9.2 V1.1 — Galaxia de metas + Tienda

- Vista de Galaxia interactiva de metas/supermetas (planetas, subgalaxias, arrastre, "Restablecer orden", fondos y skins personalizables), documentada completa en `10-GALAXIA-Y-TIENDA.md` (fuente 6: `nueva-funcionalidad-galaxia-tienda.md`, `decisiones-visuales-galaxia.md`; brief §11).
- Sección Tienda: skins de planeta, fondos, colecciones ligadas a rachas de estudio, sistema de recompensas — desbloqueo exclusivo por constancia (rachas/logros), **nunca** por dinero real ni moneda comprable (no-objetivo §3.5).
- Salvo que el creador confirme adelantar la galaxia a V1 (pregunta abierta, R20, supuesto pendiente #6): en ese caso pasa a ser la vista principal de la sección Metas, después del núcleo del cronómetro y antes del pulido, sin mover la Tienda (que permanece V1.1 por sus 4 preguntas de producto aún abiertas).
- Disponible en Android, web y desktop-PWA por igual: no requiere ser dominante del cronómetro (es visualización y gestión, como Calendario o Estadísticas).

### 9.3 V1.5 — Pulido y confiabilidad de datos personales

- Confeti y microanimaciones adicionales, mejores gráficos de estadísticas, tabla histórica más densa, más personalización de sonidos, mejoras UX de calendario (SPEC v1 §35.2).
- **Exportar mis datos** y **Borrar mi cuenta** (§8.4 RNF-10).
- Camino a "web dominante" si el creador lo confirma entonces (supuesto pendiente #10): no cambia el modelo de datos, solo las reglas de seguridad y `canBeDominant` (`02-DOMINIO.md` §7, RF-PLA-05).

### 9.4 V2 — Analítica personal e integraciones

- Más analítica e insights automáticos, siempre propios (no de terceros — no-objetivo §3.8 sigue vigente en V2), edición masiva/avanzada de sesiones, widgets/integraciones futuras (SPEC v1 §35.3).
- Sincronización del audio propio del dispositivo entre dispositivos vía Firebase Storage, si el costo se justifica entonces (hoy es local por dispositivo, D18, §6.14 RF-SON-03).

## 10. Definición de éxito

Reemplaza la definición puramente cualitativa de SPEC v1 §47 (resuelve el hallazgo BAJO sobre falta de métricas cuantificables) con criterios verificables. Como la app es de uso personal/reducido y sin analítica de terceros (no-objetivo §3.8), las métricas de uso se miden por autoevaluación del creador desde la propia sección Estadísticas (dogfooding), no por telemetría externa.

### 10.1 Funcional (verificable en el prototipo, sin depender del tiempo de uso)

1. Iniciar una sesión con el preset por defecto toma ≤ 3 toques y < 5 segundos desde la pantalla del Cronómetro (RF-CRO-01).
2. El 100 % de los bloques completados sobreviven a un cierre inesperado de la app (RF-CRO-07, RNF-04), verificado con al menos un test de recuperación por cada estado activo de la máquina de estados.
3. Cero discrepancias entre `effectiveStudySeconds` mostrado en Estadísticas y la suma manual de los bloques completados del período, en una muestra de al menos 10 sesiones variadas (RF-EST-06).
4. Cero sesiones con `status: 'active'` persistidas en `sessions/` (`02-DOMINIO.md` I-13) tras una semana de uso real.
5. El calendario y las estadísticas muestran resultados idénticos vistos desde Android y desde la PWA de escritorio para los mismos datos (RF-CAL-05, RF-PLA-03).

### 10.2 De producto (autoevaluación del creador tras 4 semanas de uso real)

6. El creador reporta haber usado el cronómetro de estudio al menos 4 días por semana en promedio.
7. El creador reporta que el banco de descanso y el almuerzo redujeron, en su percepción, el abandono de sesiones por descansos mal ajustados, comparado con un Pomodoro rígido previo.
8. Al menos un mes del período de prueba obtiene la estrella mensual con metas configuradas y cumplidas de verdad (RF-MET-04), no por defecto.
9. El creador puede ver, sin ayuda externa, cuánto tiempo dedicó a ocio vs. estudio en la semana, en menos de 3 toques desde que abre la app.

## 11. Resolución de la revisión externa (hallazgos de producto)

Solo los hallazgos de `03-requisitos/revision-spec-beta.md` que son de **producto** (alcance, reglas de negocio visibles al usuario, público, distribución, éxito, privacidad, accesibilidad). Los de modelo de datos puro ya están resueltos en `02-DOMINIO.md` §8 (se listan al final, sin repetir). Los de viabilidad técnica pura (alarmas en background, límites de Android/Doze) se resuelven en `05-ARQUITECTURA.md`.

### 11.1 Severidad ALTA (faceta de producto)

| Hallazgo | Resolución | Dónde |
|---|---|---|
| REV-ALTA-1 — Retorno de `lunch_running` sin definir; sin límite de usos (§15.3/§18.3) | Se retoma exactamente el estado y el tramo de origen; ventana de espera se reinicia si era `*_waiting_response`; límite de uso = cooldown de 3 bloques desde el último uso, disponible desde el inicio de la sesión. | §6.6 RF-ALM-02, RF-ALM-03 |
| REV-ALTA-3 — Sin mecanismo que haga cumplir "una sola sesión activa por usuario" (§31.3/§33 regla 10/§42) | Regla de negocio explícita: un singleton por usuario, rechazo de creación si ya existe uno, protocolo de toma de control para el dominante. | §6.4 RF-CRO-08, §6.16 RF-MUL-02/03; regla 7 de §7; mecanismo técnico en `02-DOMINIO.md` I-11/I-12 |
| REV-ALTA-4 — Doble conteo del banco de descanso (§17.5 vs §17.6) | Fórmula única: el ganado se suma una sola vez; lo no usado nunca se vuelve a sumar. | §6.5 RF-BAN-01; regla 4 de §7; `02-DOMINIO.md` I-4 |

### 11.2 Severidad MEDIA (faceta de producto)

| Hallazgo | Resolución | Dónde |
|---|---|---|
| REV-MEDIA-1 — "Sesión" ausente del glosario, confundida con "Bloque" (§44) | Glosario y tabla de mapeo obligatorios: sesión = `StudySession` completa, bloque = tramo de ~25 min. | §5.2 |
| REV-MEDIA-5 — Ventana de `study_completed_waiting_response` sin definir (§19.3) | 30 s si el tramo terminado dura ≤ 30 min; 10 min si da paso a descanso largo o es el propio descanso largo. | §6.4 RF-CRO-03 |
| REV-MEDIA-6 — Almuerzo modelado dos veces (`lunchSegments[]` y `breakSegments[].breakType==='lunch'`) (§15.2/§22.2/§22.4) | Fuente única de producto: el almuerzo nunca es un tipo de descanso; `breakType: 'lunch'` no se usa en ningún flujo. | §6.5 RF-BAN-05; §6.6; regla 6 de §7; dato en `02-DOMINIO.md` §8 REV-MEDIA-6 |
| REV-MEDIA-8 — ¿Cancelación con doble confirmación aplica al inverso? ¿`cancelled` vs `interrupted`? (§20/§21/§22.3) | No aplica: cancelar un bloque inverso es un toque + confirmación simple. `interrupted` queda reservado, ningún flujo de V1 lo produce. | §6.8 RF-INV-06, RF-INV-07 |
| REV-MEDIA-9 — `break_selection` solo tenía 2 de 4 transiciones definidas (§15.3/§17.3) | Las 4 acciones (tomar sugerido, saltar, personalizado, usar almuerzo) están enumeradas explícitamente. | §6.4 RF-CRO-04 |
| REV-MEDIA-12 — La estrella anual se cumplía vacuamente en un mes sin metas (§26.5) | Un mes sin ninguna meta configurada nunca obtiene estrella. | §6.13 RF-MET-04; regla 9 de §7 |
| REV-MEDIA-14 — Contradicción sobre si el audio propio del dispositivo es V1 o V2 (§9.4/§28.2/§35.3) | Es V1, pero como preferencia local por dispositivo, no sincronizada (evita Storage de pago). | §6.14 RF-SON-03; §9.4 (sincronizar queda en V2) |
| REV-MEDIA-16 — El MVP no distinguía Android-only de multiplataforma (§2/§7.2/§35.1/§45) | Cada módulo de alcance marca explícitamente su plataforma. | §9 (tabla 9.1) |
| REV-MEDIA-17 — Sin límite de usos de almuerzo por bloque/día (§18) | Cooldown de 3 bloques desde el último uso. | §6.6 RF-ALM-02 |
| REV-MEDIA-18 — ¿Qué pasa si se abre cancelación durante `*_waiting_response`? (§17.8/§19/§20.3) | La ventana de respuesta sigue corriendo; si vence, la sesión expira aunque el panel de cancelación esté abierto. | §6.7 RF-CAN-02 |
| REV-MEDIA-19 — ¿El inverso puede correr junto a una sesión de estudio? Conflicto multi-dispositivo (§31.3/§21) | Exclusión mutua explícita (supuesto pendiente); conflicto multi-dispositivo resuelto por el protocolo dominante/espectador. | §6.8 RF-INV-05; §6.16 |
| REV-MEDIA-20 — El documento v1 mezclaba las 3 capas de spec-kit (constitution/specify/plan) sin separarlas (§6/§10/§30/§36/§42) | Este documento es solo especificación de **producto**; stack, carpetas, Firestore y máquina de estados viven en `02-DOMINIO.md`, `03-CRONOMETRO.md` y `05-ARQUITECTURA.md` (ver Propósito, Fuentes). | Estructura completa de este documento |

### 11.3 Severidad BAJA (faceta de producto)

| Hallazgo | Resolución | Dónde |
|---|---|---|
| "Botón de pánico" nunca definido (§10/§18/§44) | Terminología fijada: siempre "Almuerzo"; "pánico" no se usa en ningún copy ni documento. | §5.2 (tabla de mapeo, fila Almuerzo) |
| Meta semanal en "segundos o minutos" ambiguo (§26.3/§41.7/§43) | Captura en horas/minutos, persistencia siempre en segundos. | §6.13 RF-MET-01 |
| `paused_transient` es un estado fantasma; falta transición terminal→idle (§15.1/§15.3) | `paused_transient` no existe en el `TimerStateName` as-built; el retorno a `idle` es implícito al cerrarse el singleton (no hay pantalla de transición). | `02-DOMINIO.md` §3.1 |
| Presets en minutos pese a que el resto usa segundos (§43/§13.2/§41.3) | Excepción intencional documentada: los presets son entrada de usuario. | §6.3 RF-PRE-01; `02-DOMINIO.md` §6.1 |
| Sin modelo de distribución definido (§4.1) | Distribución privada, sin Play Store, en ninguna versión. | §4.2 |
| Sin mención de privacidad/exportación/borrado (§11) | Exportar mis datos y Borrar mi cuenta, comprometidos para V1.5. | §8.4 RNF-10; §9.3 |
| Definición de éxito puramente cualitativa (§47) | Métricas funcionales y de producto verificables. | §10 |
| Sin idioma/localización ni estándar de accesibilidad de referencia (§39/§44) | Español "tú" fijado; WCAG 2.1 AA como referencia. | §8.5 RNF-11, RNF-12 |
| Tres listas de principios/reglas sin jerarquía única (§8/§33/§46) | Lista jerarquizada única de reglas críticas de negocio. | §7 |
| Sin mención de límites/costos del plan gratuito de Firebase (§6/§34) | Cuota diaria gratuita muy por encima del uso proyectado; sin umbral automático de reevaluación. | §8.3 RNF-08 |

Hallazgos BAJA sin acción (artefactos editoriales del documento v1, no heredados por este documento): la referencia fantasma a una "descripción original de 3 secciones" (§9) y el carácter suelto "n" bajo el encabezado de §41.6 — ninguno de los dos existe en este documento ni en `02-DOMINIO.md`.

### 11.4 Hallazgos ya resueltos como modelo de datos (solo referencia, no se repiten)

REV-ALTA-2; REV-MEDIA-2, REV-MEDIA-3, REV-MEDIA-4, REV-MEDIA-7, REV-MEDIA-10, REV-MEDIA-11, REV-MEDIA-13 — todos resueltos en `02-DOMINIO.md` §8. REV-ALTA-5, REV-ALTA-6 y REV-MEDIA-15 son de viabilidad técnica pura (alarmas en background, límites de la web, Android 12+/Doze) y se resuelven en `05-ARQUITECTURA.md`.

## Supuestos pendientes de confirmar

Numerados según `_brief-orquestador.md` §10. Cada uno trae el default ya aplicado en este documento y el impacto de que el creador decida distinto.

| # | Supuesto (brief §10) | Default asumido en este documento | Si el creador decide distinto |
|---|---|---|---|
| 1 | Umbral de 30 min para elegir ventana de 30 s vs. 10 min (§10.1) | Tramo ≤ 30 min → 30 s; tramo que da paso a descanso largo, o el propio descanso largo → 10 min (§6.4 RF-CRO-03). | Cambia solo el número de minutos del umbral en la regla de `03-CRONOMETRO.md`; ningún RF ni campo del modelo cambia. |
| 2 | Almuerzo disponible desde el inicio de la sesión y luego cada 3 bloques (§10.2) | Habilitado desde el bloque 0; cooldown de 3 bloques tras cada uso (§6.6 RF-ALM-02). | Cambia solo la condición de disponibilidad (`cyclesSinceLunch ≥ 3 \|\| !lunchUsed`); no afecta el modelo de datos. |
| 3 | Tope del inverso = 2·T (§10.3; R4 dice "un bloque más desde el punto actual") | `INVERSE_HARD_CAP_FACTOR = 2` (§6.8 RF-INV-03). | Cambia solo la constante del factor; el campo `targetDurationSeconds` y el flujo no cambian. |
| 4 | Exclusión mutua entre temporizador inverso y sesión de estudio (§10.4) | Activa: no pueden coexistir dos sesiones (una de estudio, una inversa) del mismo usuario (§6.8 RF-INV-05). | Si se permite coexistencia, el singleton `active/session` deja de ser una unión discriminada única y el modelo de `02-DOMINIO.md` §2.5 debe revisarse. |
| 5 | Desktop = PWA instalable, sin Electron (§10.5) | Confirmado como default de este documento (§6.17 RF-PLA-04; §4.2). | Adoptar Electron/Tauri no cambia el modelo de datos ni las reglas de negocio, solo el empaquetado — fuera del alcance de este documento. |
| 6 | Qué significa "funcionamiento de galaxias de la pantalla principal" (§10.6; R20) | Interpretado como la Galaxia de metas de §9.2, en V1.1 salvo confirmación explícita de adelantarla a V1. | Si se confirma para V1, la tabla de §9.1 gana una fila "Galaxia de metas (vista principal de Metas)" y se reordena el plan de fases de `IMPLEMENTATION_PLAN` correspondiente; el alcance de la Tienda no cambia (sigue V1.1). |
| 7 | Español neutro con "tú" (el mockup del frontend usa "vos") (§10.7) | "Tú" en todo copy de la app (§8.5 RNF-12). | Cambiar a "vos" (o a "usted") es un cambio de contenido en `src/i18n/es.ts`, sin impacto en ningún RF ni en el modelo. |
| 8 | Convención de vocabulario: "bloque" = tramo de 25 min en toda la UI y los documentos, identificadores de código sin renombrar (§10.8) | Aplicada en todo este documento (§5.2) y en el resto del canon. | No se anticipa cambio: es una convención de redacción ya coherente con las citas literales del creador (R2, R5 en el anexo del brief). |
| — | ~~Alcance de la cancelación~~ — **RESUELTO el 2026-09-06** (R25, D1.b): cancelar tiene la misma severidad que expirar, solo pierde el bloque en curso (§6.7 RF-CAN-03). Queda un supuesto de UX derivado, no de negocio: si la fricción de doble confirmación de 15+15 s sigue justificada con la severidad reducida — pendiente para Front End, no bloquea ningún RF de este documento. | — | — |
| 10 | **Web/desktop solo espectador en V1** (§10.10) — ¿acepta el creador que desde el computador no se pueda iniciar un bloque en V1, o quiere web dominante desde ya? | Solo Android dominante en V1; camino a "web dominante" documentado para V1.5 (§6.17 RF-PLA-01/05; §9.3). | Adelantar "web dominante" no cambia el modelo de datos (`02-DOMINIO.md` §7); solo las reglas de seguridad y `canBeDominant`, y el criterio de RF-PLA-01 pasaría a incluir web. |
| 11 | **Galaxia de metas + Tienda** (§10.11): alcance temporal, moneda de la Tienda, definición de supermeta, sincronización del layout, skins/fondos gratis por defecto | Tienda en V1.1 (galaxia también, salvo #6 arriba); sin dinero real ni moneda comprable, desbloqueo por rachas/logros; supermeta = meta con hijas vía `parentGoalId`, dos niveles; layout sincroniza por usuario en Firestore; sí hay skin "Papel" y un fondo base gratis (§3.5, §6.13 RF-MET-05, §9.2). | Ninguna de las cuatro respuestas cambia el modelo de datos ya sembrado en `02-DOMINIO.md` §2.6/§3.5 (son sus defaults documentados); solo determinan el contenido exacto de `10-GALAXIA-Y-TIENDA.md`. |

## Trazabilidad

| Sección de este documento | Regla / decisión | Fuente(s) |
|---|---|---|
| §1 — Visión y propuesta de valor | Sistema de disciplina de estudio, no Pomodoro genérico; fricción deliberada de cancelación | R1, D1, B §2, CODE |
| §2 — Principios de diseño | Vigentes de SPEC v1 §8 + costo cero y un dominante a la vez como principios | SPEC v1 §8, R8, R9, R14, R19, B §5, B §6 |
| §3 — No-objetivos | No red social/colaboración/tareas; sin pagos ni moneda comprable en ninguna versión | SPEC v1 §3.3, R7, B §11, D "Alcance — Galaxia" |
| §4.1 — Público | Usuario único + puñado de invitados | SPEC v1 §4 |
| §4.2 — Modelo de distribución | Privado, sin Play Store; development build local; límite OAuth aceptado | REV-BAJA §4.1, D17, D19, R17, R19 |
| §5.1 — Cuatro secciones de la app | Cronómetro/Calendario/Estadísticas/Configuración, con su disponibilidad por plataforma | SPEC v1 §9, B §6, B §8 |
| §5.2 — Terminología y tabla de mapeo | "Sesión"≠"bloque"≠"ciclo"; tabla obligatoria | B §1, R2, R4, R5, D "Convención de vocabulario", REV-MEDIA-1 |
| §6.1 — Autenticación | Email/Google; perfil/settings idempotentes; sin verificación paga | R19, D19, `02-DOMINIO.md` §2.1 |
| §6.2 — Categorías | Tres árboles, un nivel, color vivo, archivado | R6, D6, B §4, `02-DOMINIO.md` §2.2, I-14, I-15 |
| §6.3 — Presets | Minutos, preset Estándar por defecto, snapshot congelado | CODE, `02-DOMINIO.md` §2.2 |
| §6.4 — Cronómetro de estudio | Ventanas 30 s/10 min, 4 acciones de `break_selection`, terminar sesión solo entre bloques, expiración parcial, recuperación, sesión única | R1, R2, R3, D1, D2, D3, B §2, B §3.1, REV-ALTA-2, REV-ALTA-3, REV-MEDIA-5, REV-MEDIA-9 |
| §6.5 — Banco de descanso | Fórmula única sin doble conteo; personalizado obligatorio | D "Aclaraciones técnicas", REV-ALTA-4, `02-DOMINIO.md` I-4/I-5 |
| §6.6 — Almuerzo | 45 min, disponible desde el inicio y cada 3 bloques, pausa sin descartar el tramo | R5, D5, B §3.3, REV-ALTA-1, REV-MEDIA-17 |
| §6.7 — Cancelación | Doble confirmación 15+15 s; ventana sigue corriendo; misma severidad que expirar (confirmado, ya no es supuesto) | D1, D1.b, R25, B §2, REV-MEDIA-18 |
| §6.8 — Temporizador inverso | Sigue tras `T`, tope `2·T`, exclusión mutua, cancelación simple | R4, D4, B §3.5, REV-MEDIA-4, REV-MEDIA-8 |
| §6.9 — Sesiones e historial | Documento único, snapshot de preset, estados terminales | CODE, D12, `02-DOMINIO.md` §2.3, I-13 |
| §6.10 — Calendario | Vistas día/semana/mes/año, color vivo, sin ejecución del cronómetro | SPEC v1 §23/§27, R6, `02-DOMINIO.md` §7 |
| §6.11 — Eventos invisibles | Recurrencia semanal, borrado lógico, expansión en cliente | SPEC v1 §24, REV-MEDIA-3, REV-MEDIA-11 |
| §6.12 — Estadísticas | Períodos día/semana/mes, effectiveStudySeconds vs totalElapsedSeconds, exclusión de invisibles y cancelados | SPEC v1 §25, regla crítica #1 §33, `02-DOMINIO.md` I-1 |
| §6.13 — Metas | Tiempo efectivo, subcategoría hereda a la meta del padre, estrella sin vacuidad, gancho supermeta | SPEC v1 §26, R7, D7, REV-MEDIA-12, B §11 |
| §6.14 — Sonidos y notificaciones | Sonidos por defecto, preferencias sincronizadas, audio propio local no sincronizado, alarmas Android | SPEC v1 §28, D18, REV-MEDIA-14 |
| §6.15 — Tema y personalización | Claro/oscuro/sistema, skin "Papel", reduceMotion, layout responsive | SPEC v1 §29/§39, B §8 |
| §6.16 — Multi-dispositivo | Dominante/espectador, toma de control, zombie 24h | R14, D14, D15, D16, B §5, REV-ALTA-3 |
| §6.17 — Plataformas | Solo Android dominante en V1, web/desktop espectador y gestor completo, PWA sin Electron | D "Alcance de plataformas", B §6, REV-ALTA-6, REV-MEDIA-16 |
| §7 — Reglas críticas de negocio | Lista jerarquizada única que reemplaza SPEC v1 §8/§33/§46 | SPEC v1 §33, hallazgo BAJO "tres listas sin jerarquía" |
| §8.1-8.2 — Rendimiento y confiabilidad | Conteo local, checkpoints incrementales, sin Cloud Functions | B §5, D "Robustez ante crash", `02-DOMINIO.md` §5-6 |
| §8.3 — Costo cero | Firebase Spark, sin servicios de pago, cuota diaria holgada | R8, R9, R17, R19, D "Confiabilidad técnica", D19, hallazgo BAJO límites Firebase |
| §8.4 — Privacidad | Sin analítica de terceros; exportar/borrar en V1.5 | no-objetivo §3.8, hallazgo BAJO §11 SPEC v1 |
| §8.5 — Accesibilidad e idioma | Modo oscuro, no depender solo de color, WCAG AA de referencia, español "tú" | SPEC v1 §39, B §7 (supuesto), hallazgo BAJO §39/§44 |
| §9 — Alcance por versión | V1 (Android dominante), V1.1 (Galaxia+Tienda), V1.5 (privacidad/pulido), V2 (analítica) | R20, D "Alcance — Galaxia", REV-MEDIA-16, SPEC v1 §35 |
| §10 — Definición de éxito | Métricas funcionales y de producto verificables, sin telemetría de terceros | hallazgo BAJO §47 SPEC v1, no-objetivo §3.8 |
| §11 — Resolución de la revisión externa | Tabla hallazgo → resolución → ubicación, solo hallazgos de producto | REV-ALTA-1/3/4, REV-MEDIA-1/5/6/8/9/12/14/16/17/18/19/20, hallazgos BAJA listados |
| Supuestos pendientes de confirmar | Web dominante, umbral 30 min, tope inverso, almuerzo, exclusión mutua, PWA, galaxia, idioma, vocabulario, fricción de cancelación (UX, no negocio) | B §10 (puntos 1-8, 10-11) |


## Enmienda v3 (2026-09-14) — feedback del creador tras revisar los mockups interactivos

Fuente y autoridad: `03-requisitos/decisiones-tomadas.md` sección **v3 (2026-09-14)** (con prioridad sobre este documento hasta que esta enmienda se incorpore orgánicamente a las secciones correspondientes). Esta sección NO reescribe el cuerpo del documento: agrega las reglas nuevas que lo afectan y señala las que lo corrigen.

### Reglas de producto que entran por esta enmienda

1. **Nomenclatura estándar del producto** (v3 §A): los nombres canónicos de las funcionalidades son **Calendario** (entidad de capa visual; no usar "capa" como nombre de entidad), **Supermeta**, **Meta**, **Tarea**, **Evento** y **Bloque** (tramo de cronómetro). Toda UI, doc y código debe usar exactamente estos nombres.
2. **Jerarquía de dominio corregida** (v3 §A1–A4): metas y supermetas **no se asocian a categorías** — se asocian a un **calendario**. Una meta puede pertenecer a **más de una supermeta**. Cada supermeta puede tener **tareas y eventos**.
3. **Antimeta** (v3 §A7): al crear una supermeta existe por defecto el botón "Antimeta"; una antimeta no da puntaje, solo tiene eventos atemporales y funciona como categoría invisible seleccionable desde el cronómetro inverso.
4. **Cronómetro conectado al resto del producto** (v3 §C): el inicio de sesión de estudio se desglosa por pasos (preset → supermeta → meta → tarea/evento) y el tiempo registrado alimenta las estadísticas de cumplimiento de metas; lo mismo conecta a la galaxia de la pantalla de inicio.
5. **Todo bloque finalizado se crea como cuadro en el calendario** vinculado a la supermeta (v3 §D).
6. **HUD de la galaxia (Ajustes, amigos)**: por ahora solo decoración (v3 §F2).
