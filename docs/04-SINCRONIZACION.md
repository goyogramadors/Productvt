# 04 — Sincronización multi-dispositivo: dominante/espectador, checkpoints y recuperación

## Propósito

Este documento fija, de forma completa e implementable sin preguntas adicionales, el protocolo que hace cumplir "una sola sesión activa por usuario" entre dispositivos con el modelo **dominante/espectador** (brief §5, D14–16, R14): qué primitiva exacta de Firestore usa cada escritura del singleton `users/{uid}/active/session` (transacción, batch o `update` simple) y por qué; la secuencia completa de solicitud y cambio de dominante; el cálculo de `clockOffset` aplicado por múltiples dispositivos a la vez; el cierre perezoso de ventanas vencidas y sesiones zombie con una transacción que impide que dos dispositivos lo ejecuten dos veces; el algoritmo completo de `ActiveSessionRecoveryService`; el comportamiento exacto cuando el dominante pierde la red; y una estimación de costo que confirma que todo esto cabe en el plan Spark. Es la contraparte de sincronización de `03-CRONOMETRO.md` (que fija la máquina de estados y qué escribe cada transición) y de `02-DOMINIO.md` (que fija el esquema, los invariantes y el `firestore.rules` completo): ninguno de los dos se redefine aquí, se cita y se completa con el protocolo entre dispositivos que ambos dejan explícitamente para este documento.

## Fuentes

Orden de autoridad (si dos fuentes chocan, gana la de arriba; ver también la tabla de Trazabilidad al final):

1. Respuestas literales del creador — anexo de `_brief-orquestador.md` (etiqueta `R14`, `R16`).
2. `03-requisitos/decisiones-tomadas.md` v2 (etiquetas `D14`, `D15`, `D16`, sección "Robustez ante crash — checkpoints incrementales").
3. `_brief-orquestador.md` revisado 2026-09-06 (etiqueta `B §5`, `B §6`, `B §10.10`).
4. Código commiteado en `productvt-beta/src/domain/**` y `src/infrastructure/firebase/collections.ts` (etiqueta `CODE`): verdad para identificadores; este documento no propone renombres.
5. `03-requisitos/revision-spec-beta.md` (etiquetas `REV-ALTA-3`, `REV-MEDIA-19`): este documento resuelve la parte de esos hallazgos que es protocolo de sincronización (mecanismo de sesión única, flujo de conflicto multi-dispositivo). El resto de hallazgos de máquina de estados/modelo de datos ya está resuelto en `02-DOMINIO.md` §8 y `03-CRONOMETRO.md` §14 y no se repite.
6. `docs/02-DOMINIO.md` (mismo nivel de autoridad que el código porque es su copia literal + adiciones ya cerradas): fuente de todas las interfaces del singleton (`ActiveSession`, `ActiveStudySession`, `ActiveInverseSession`, `ControlRequest`, `DeviceIdentity`, `DeviceRole`), sus invariantes (`I-11`, `I-12`, `I-13`, `I-20`), las seis reglas de escritura de §3.4 y el `firestore.rules` completo de §5.3. Este documento no redefine ninguna interfaz ni campo, solo el protocolo que los usa.
7. `docs/03-CRONOMETRO.md` (mismo nivel): fuente de la máquina de estados, de qué checkpoint escribe cada transición (tabla de §4) y de la fórmula de `clockOffset`/motor por timestamps (§10). Dos referencias que ese documento deja explícitamente para "otro documento" (§0, lista de temas fuera de alcance) se resuelven aquí: el protocolo de cambio de dominante/espectador y el detalle de `clockOffset` entre dispositivos.
8. Originales v1 (`docs/originales/ARCHITECTURE-v1.md` §26): punto de partida, no fuente de verdad.

Nota sobre el documento "05-ARQUITECTURA.md": tanto `02-DOMINIO.md` §2.5 como `03-CRONOMETRO.md` §0 mencionan ese nombre como destino futuro del "protocolo de cambio de dominante" y de `clockOffset`. Ese documento no está escrito todavía; por instrucción directa de la sesión `productvt-90` (que lidera el canon), **este documento (`04-SINCRONIZACION.md`) es la ubicación canónica y completa de ese protocolo** — no una versión parcial a la espera de que otro documento lo redefina. Si más adelante se escribe `05-ARQUITECTURA.md`, debe citar este documento en vez de duplicar su contenido.

## 1. Modelo mental

No hay backend propio ni Cloud Functions (plan Spark, restricción dura de brief §6): toda la sincronización ocurre **entre clientes**, a través de un único documento en Firestore y de las garantías que el propio Firestore da sobre ese documento (reglas de seguridad + transacciones optimistas). El modelo completo se resume en cuatro ideas:

1. **Un solo documento representa "hay algo corriendo"**: `users/{uid}/active/session` (`02-DOMINIO.md` §2.5). Mientras exista, hay una sesión de estudio o un bloque inverso activo — nunca ambos a la vez, nunca ninguno de estudio y otro de estudio a la vez. Su ausencia es la señal de `idle`.
2. **Un dispositivo a la vez tiene la pluma**: el campo `dominantDeviceId` designa al único dispositivo autorizado a escribir transiciones de la máquina de estados (`03-CRONOMETRO.md` §4). Todos los demás dispositivos del mismo usuario son **espectadores**: leen el mismo documento y calculan el mismo reloj, pero no pueden accionarlo.
3. **El servidor de Firestore es el árbitro, no un dispositivo**: cuando dos dispositivos compiten por algo (tomar el control, cerrar una sesión vencida), la resolución nunca depende de que un dispositivo "avise" al otro por su cuenta — depende de una transacción de Firestore contra el mismo documento, y Firestore garantiza que como máximo una de las escrituras en conflicto se aplica. Esto es lo que reemplaza a un backend/árbitro central que este proyecto no puede costear.
4. **Nada se pierde por estar desconectado**: el motor que decide "cuánto falta" nunca depende de la red (`03-CRONOMETRO.md` §10) — es resta de timestamps. La red solo hace falta para **persistir** lo que ya pasó (checkpoints) y para las pocas operaciones que necesitan un árbitro (crear, tomar el control, cerrar por vencimiento cuando puede haber más de un lector compitiendo). La distinción exacta entre "necesita red" y "no necesita red" es el contenido de §3 y §9.

Con esas cuatro ideas, todo el resto del documento es mecánica: qué primitiva de Firestore (`update`, `WriteBatch`, `runTransaction`) usa cada escritura y por qué esa y no otra (§3); cómo el espectador reconstruye el reloj sin recibir nada del dominante salvo el propio documento (§4, §6); cómo se resuelve pedir y ceder el control (§5); cómo se cierra una sesión que nadie atendió a tiempo sin que dos dispositivos la cierren dos veces (§7); cómo un dispositivo que se acaba de abrir (o que estuvo minutos u horas sin red) sabe exactamente en qué quedó todo (§8); y qué pasa exactamente cuando el dominante se queda sin conexión a mitad de una sesión (§9).

## 2. El singleton `active/session`

Este documento no redefine el singleton: su forma completa (`ActiveSessionBase`, `ActiveStudySession`, `ActiveInverseSession`, `ControlRequest`, `PausedSegment`, `DeviceIdentity`, `DeviceRole`) está fijada en `02-DOMINIO.md` §3.4–§3.5, con la ruta y los campos por documento en §5.1 y las seis reglas de escritura (crear, checkpoint, solicitud de control, toma de control, cierre, zombie) enumeradas en §3.4. La tabla de mapeo brief §5 → nombres canónicos (`state` → `currentState`, `blocksCompleted` → `cyclesCompleted`, etc.) también vive ahí y no se repite.

Lo que este documento aporta sobre esas seis reglas es **la primitiva exacta de Firestore que implementa cada una** (§3), porque esa elección — `update()` simple, `WriteBatch` o `runTransaction` — es precisamente lo que determina si una escritura funciona sin red, si necesita ganarle una carrera a otro dispositivo, y cuánto cuesta. `02-DOMINIO.md` §3.4 y `03-CRONOMETRO.md` describen **qué** cambia en cada transición; este documento describe **cómo se escribe** para que "una sola sesión activa" y "un solo dominante" sean ciertas incluso cuando dos dispositivos actúan casi al mismo tiempo.

Campos del singleton que este documento usa constantemente, ya fijados en `02-DOMINIO.md` (se citan, no se redefinen): `sessionId`, `dominantDeviceId`, `deviceInfo.platform`, `currentState`, `responseDeadlineAt?`, `segmentStartedAt`, `segmentTargetSeconds`, `lastCheckpointAt` (`serverTimestamp()`), `controlRequest?: { requesterDeviceId, requesterPlatform, requesterDeviceName?, requestedAt }`.

## 3. Ciclo de vida completo: qué primitiva de Firestore usa cada escritura

Firestore ofrece tres formas de escribir, con garantías muy distintas frente a la concurrencia y frente a estar sin red:

| Primitiva | Garantía | Funciona sin red |
|---|---|---|
| `setDoc`/`updateDoc` simple | Se aplica tal cual, sin leer nada antes. Dos escrituras concurrentes al mismo campo: gana la última en llegar al servidor (last-write-wins). | Sí: se aplica al caché local al instante (lectura optimista para el propio dispositivo) y queda encolada hasta reconectar. |
| `WriteBatch` (`writeBatch(db)`, varias operaciones `.set`/`.delete()` sobre distintos documentos) | Todas sus operaciones se aplican juntas o ninguna, pero **sin leer nada antes**: no puede condicionar el resultado a "si el documento todavía dice X". | Sí: mismo comportamiento que arriba, todo el batch se encola como una unidad. |
| `runTransaction` (lee, decide, escribe) | Lee el documento, decide con esa lectura, y la escritura solo se confirma si nadie más escribió ese documento entre la lectura y el commit; si alguien lo hizo, Firestore reintenta automáticamente la función de la transacción con una lectura fresca. Es la única primitiva que puede expresar "solo si sigue siendo cierto que…". | **No**: si el dispositivo está sin red, la promesa de `runTransaction` se **rechaza** (no queda encolada) — hace falta conectividad para completarla (§9). |

Esta tabla es la que decide qué primitiva usa cada una de las seis reglas de `02-DOMINIO.md` §3.4, y por qué:

| Regla (`02-DOMINIO.md` §3.4) | Quién la ejecuta | Primitiva | Por qué esa y no otra |
|---|---|---|---|
| 1. Crear el singleton (`START_SESSION`/`START_INVERSE`, T1 de `03-CRONOMETRO.md` §4.1, §12.2) | El dispositivo que inicia | `runTransaction`: lee si existe, aborta si sí, `set` si no | Es la garantía de "una sola sesión activa" (I-11): dos dispositivos pulsando "Iniciar" casi a la vez **deben** competir por el mismo documento, y solo uno puede ganar. Un `setDoc` simple no podría condicionar la escritura a "solo si no existe". |
| 2. Checkpoint de una transición normal (T2–T13 de `03-CRONOMETRO.md` §4, excepto los cierres) | Solo el dominante (nadie más tiene permiso, regla de seguridad §11 de este documento) | `updateDoc` simple | No hay ninguna carrera que resolver: por diseño, solo el dominante escribe transiciones (`dominantUnchanged() && validCheckpoint()`, `02-DOMINIO.md` §5.3). No hace falta leer nada antes de escribir. Esto es lo que permite que el dominante siga contando y escribiendo **sin red** (§9). |
| 3. Solicitud de control (`controlRequest`) | El espectador que quiere tomar el control | `updateDoc` simple (solo los campos `controlRequest`/`updatedAt`) | Es una sola escritura de un campo que nadie más está escribiendo a la vez; si dos espectadores la piden casi a la vez, gana la última en llegar (last-write-wins) y el dominante solo ve una — no importa cuál, ambos casos siguen el mismo flujo de §5. |
| 4. Toma de control (confirmar "Sí") | El primer dispositivo (dominante o espectador) que confirma | `runTransaction`: lee `controlRequest`, valida `validTakeover()`, escribe `dominantDeviceId` y borra `controlRequest` | Es la garantía de "un solo dominante" (I-12) y la regla literal del creador ("el primero que apreta queda como dominante"): si ambos dispositivos confirman en el mismo instante, la transacción de Firestore garantiza que solo una de las dos escrituras se confirma; la otra reintenta, relee el documento ya sin `controlRequest` (o con otro `requesterDeviceId`) y `validTakeover()` falla — no hace nada (§5.4). |
| 5. Cierre normal (`END_SESSION` T7/T10, `CONFIRM_CANCEL` T16) | Solo el dominante | `WriteBatch`: `set(sessions/{sessionId})` + `delete(active/session)` | Solo el dominante puede ejecutar estas transiciones (mismas reglas que la fila 2) — no hay ningún otro dispositivo compitiendo por cerrar la sesión en este instante, así que no hace falta la garantía condicional de una transacción; basta con que las dos escrituras (materializar + borrar) se apliquen juntas o ninguna. Un `WriteBatch` sí funciona sin red (§9), a diferencia de una transacción. |
| 6. Cierre perezoso por ventana vencida o zombie (`EXPIRE` T17, `ZOMBIE_TIMEOUT` T18) | **Cualquier** dispositivo que lea el singleton y note que ya venció (`03-CRONOMETRO.md` §9.2, §9.3) | `runTransaction`: relee, verifica que la condición **sigue** siendo cierta, materializa y borra dentro de la misma transacción | A diferencia de la fila 5, aquí **más de un dispositivo puede intentar cerrar la misma sesión al mismo tiempo** (el dominante en su propio tick, un espectador que recién abrió la app, la web en modo espectador). Hace falta la garantía condicional de una transacción para que solo uno de esos cierres se aplique de verdad y el resto detecte "ya lo cerró otro" sin duplicar nada. Detalle completo en §7. |

Nota de precisión sobre `02-DOMINIO.md`/`03-CRONOMETRO.md`: ambos documentos describen la fila 6 con la frase genérica "batch de cierre"/"batch atómico" (misma redacción que la fila 5, por simetría de lectura). Este documento **precisa** que la primitiva real de la fila 6 es una transacción, no un `WriteBatch` — el efecto final sobre los documentos (`sessions/{id}` creado, `active/session` borrado) es idéntico, pero solo una transacción puede añadir la verificación de condición que evita la doble ejecución cuando el cierre no es exclusivo de un único actor. No es una contradicción: es la mecánica que faltaba especificar y que este documento tiene como responsabilidad (§0 de ambos documentos la deja explícitamente pendiente para el protocolo de sincronización).

## 4. Dominante y espectador

### 4.1 Resolución de rol

Ningún dispositivo "sabe" su rol de antemano: lo calcula cada vez que lee el singleton, comparando su propio `DeviceIdentity.deviceId` contra `dominantDeviceId` (`resolveDeviceRole`, `02-DOMINIO.md` §3.5). No hay un campo separado de "mi rol" que se pueda desincronizar de la verdad — el rol **es** una función pura del documento remoto más la identidad local:

```ts
// 02-DOMINIO.md §3.5, se cita, no se redefine
export function resolveDeviceRole(active: ActiveSession | null, device: DeviceIdentity): DeviceRole | null;
// null si no hay sesión activa; 'dominant' si active.dominantDeviceId === device.deviceId; si no, 'spectator'
```

Esto tiene una consecuencia importante: **el rol puede cambiar entre un `onSnapshot` y el siguiente sin que el dispositivo haga nada** — si otro dispositivo toma el control (§5), el antiguo dominante recibe el nuevo documento con un `dominantDeviceId` distinto y `resolveDeviceRole` le devuelve `'spectator'` en la siguiente evaluación. No hace falta ningún mensaje explícito de "perdiste el control": es, otra vez, una consecuencia directa de leer el mismo documento.

### 4.2 Responsabilidades de cada rol

| | Dominante | Espectador |
|---|---|---|
| Puede escribir transiciones de la máquina de estados (`03-CRONOMETRO.md` §4) | Sí | No — sus controles de acción están deshabilitados en la UI, y aunque los forzara, la regla de seguridad `dominantUnchanged()` (`02-DOMINIO.md` §5.3) rechaza el `update` |
| Programa/cancela notificaciones locales (`03-CRONOMETRO.md` §11) | Sí, es el único | No — un espectador nunca programa alarmas de esta sesión, aunque la vea en vivo |
| Calcula `remaining`/`computeLiveEffectiveStudySeconds` | Sí, para su propia UI y para decidir cuándo disparar el próximo evento "auto" | Sí, exactamente la misma fórmula (`03-CRONOMETRO.md` §10.1/§10.3), para pintar su propia UI en vivo |
| Detecta ventana vencida/zombie y puede intentar cerrarla | Sí | Sí — cualquier lector puede, ver §7 |
| Puede pedir el control | No aplica (ya lo tiene) | Sí, tocando cualquier control (§5) |
| Escribe `dominantDeviceId`, `controlRequest`, checkpoints | Sí (checkpoints); puede rechazar (`No`) una solicitud | Solo puede escribir `controlRequest` al pedir; puede ganar la toma de control (§5) |
| Plataformas permitidas en V1 | Solo `android` (`canBeDominant`, §5 de este documento) | `android`, `web` (incluida la PWA de escritorio) |

### 4.3 Interpolación local del reloj en el espectador

El espectador **nunca recibe ticks del dominante** — no hay ningún mensaje de "van 3, 4, 5 segundos…" viajando entre dispositivos. Lo único que recibe es el mismo documento que lee el dominante, vía `onSnapshot`, cada vez que cambia (es decir: en cada checkpoint, no en cada segundo). A partir de ahí, el espectador ejecuta exactamente las mismas funciones puras que el dominante:

1. Se suscribe con `onSnapshot(activeSessionDocRef(uid), callback)`. Cada callback trae un documento nuevo (`currentState`, `segmentStartedAt`, `segmentTargetSeconds`, `responseDeadlineAt?`, etc.).
2. En cada refresco de UI (un `requestAnimationFrame`/intervalo de ~250–500 ms, igual que el dominante — `03-CRONOMETRO.md` §10), calcula `computeRemainingSeconds(active, nowMs)` con su **propio** `nowMs = Date.now() + clockOffsetMs` (§6) y el **último documento recibido** — no reabre la suscripción ni pide nada a Firestore para este cálculo.
3. Entre un checkpoint y el siguiente, el espectador ve el mismo conteo hacia atrás que el dominante porque ambos parten del mismo `segmentStartedAt`/`segmentTargetSeconds` (server-relative) y aplican la misma resta; la única diferencia posible es el margen de red hasta que el snapshot le llegó, nunca una deriva acumulada — el espectador no "cuenta sus propios segundos" sobre una base vieja, recalcula desde el timestamp persistido en cada refresco.
4. Si el espectador toca un control (p. ej. "Tomar descanso"), no ejecuta ninguna transición local: dispara el flujo de solicitud de control (§5). No hay una "vista optimista" de acciones para el espectador — su UI de controles está deshabilitada hasta que se convierta en dominante.
5. El espectador también participa en el cierre perezoso (§7): si su propio `computeRemainingSeconds` o `isZombie` le indican que el plazo ya venció, intenta el mismo cierre transaccional que ejecutaría el dominante — es lo que resuelve `03-CRONOMETRO.md` §9.2 ("cualquier dispositivo que lea el singleton") y lo que permite que la web, sin ser nunca dominante, sí pueda cerrar una sesión zombie que el dominante dejó huérfana (`02-DOMINIO.md` §7, fila "Cerrar zombie").

Esto es lo que hace que el modelo no necesite un servidor propio para "avisar" a los espectadores: Firestore ya hace ese trabajo (`onSnapshot` es la única red que corre), y la aritmética la reproduce cada dispositivo por su cuenta con las mismas funciones puras de `03-CRONOMETRO.md` §10.

## 5. Solicitud y cambio de dominante

### 5.1 Política de plataforma: `canBeDominant`

`02-DOMINIO.md` §3.5 ya fija el nombre canónico de esta política — `canBeDominant(platform)` — como adición propuesta de dominio (`src/domain/entities/device-identity.ts`). La instrucción de esta pasada la menciona como `canDeviceBeDominant`; este documento usa el nombre ya fijado en el canon (`canBeDominant`) para no introducir un segundo nombre para la misma función — es la misma política, sin cambio de comportamiento:

```ts
// 02-DOMINIO.md §3.5, se cita, no se redefine
export function canBeDominant(platform: DeviceIdentity['platform']): boolean; // V1: platform === 'android'
```

`canBeDominant('android') === true`; `canBeDominant('web') === false`; `canBeDominant('ios') === false` (no hay build de iOS en V1, brief §6, pero la función queda genérica por si se agrega después sin tocar la firma). Se evalúa en tres puntos, siempre en el cliente **y** reforzada en `firestore.rules` (§11) porque el cliente nunca es la única línea de defensa:

1. **Antes de mostrar el botón "Iniciar sesión"**: si `!canBeDominant(device.platform)`, el botón de iniciar un bloque de estudio o inverso no se renderiza (se muestra el estado en modo lectura). Esto es puramente UX — la regla real está en el punto 3.
2. **Antes de mostrar el control "Tomar el control"** en un dispositivo espectador que no puede serlo: no se renderiza el botón en absoluto para `web`. Un usuario en la PWA de escritorio nunca ve la opción de pedir el control (brief §6: "la web nunca puede tomar el rol dominante… sus controles de iniciar/accionar quedan deshabilitados").
3. **En la regla de seguridad** (§11): `incoming().deviceInfo.platform == 'android'` para `create` del singleton, y `requesterPlatform == 'android'` para escribir `controlRequest`. Aunque un cliente modificado se saltara los puntos 1–2, Firestore rechaza la escritura.

### 5.2 Flujo completo de solicitud y cambio de dominante

Ocurre siempre entre exactamente dos partes con permiso de ser dominantes en V1 (ambas Android, R14/D14): el dominante actual y un espectador Android que toca un control. La secuencia exacta:

```mermaid
sequenceDiagram
    participant B as Espectador (Android B)
    participant F as Firestore (active/session)
    participant A as Dominante (Android A)

    Note over A,B: dominantDeviceId = A; sin controlRequest
    B->>F: updateDoc(controlRequest: {requesterDeviceId: B, requesterPlatform: 'android', requestedAt: serverTimestamp()})
    Note over F: regla: dominantUnchanged() && onlyControlRequestChanged() && requestFromAndroid()
    F-->>A: onSnapshot (controlRequest presente)
    F-->>B: onSnapshot (controlRequest presente, eco de su propia escritura)
    Note over A,B: Ambos dispositivos muestran "¿Cambiar de dominante?" Sí / No

    alt B confirma "Sí" primero
        B->>F: runTransaction: validTakeover() → dominantDeviceId = B, borra controlRequest
        F-->>B: commit OK
        F-->>A: onSnapshot (dominantDeviceId = B, sin controlRequest)
        Note over A: resolveDeviceRole(A) = 'spectator' — A pasa a espectador sin acción propia
    else A confirma "No" primero (rechaza)
        A->>F: updateDoc(controlRequest: null) — misma regla que la solicitud, solo controlRequest cambia
        F-->>B: onSnapshot (controlRequest ausente)
        Note over B: solicitud cancelada; B sigue espectador; A sigue dominante
    else A no responde (app cerrada, dispositivo reemplazado) y B se confirma a sí mismo
        B->>F: runTransaction: validTakeover() (mismo B como requester) → dominantDeviceId = B
        Note over B: éxito igual — no depende de que A actúe ni de que A esté online (§5.4, caso de reinstalación/cambio de celular en §13)
    end
```

La condición que decide quién gana es exactamente `validTakeover()` de `02-DOMINIO.md` §5.3, citada aquí sin redefinir:

```ts
// 02-DOMINIO.md §5.3, firestore.rules — se cita, no se redefine
function validTakeover() {
  return ('controlRequest' in existing())
    && incoming().dominantDeviceId == existing().controlRequest.requesterDeviceId
    && !('controlRequest' in incoming());
}
```

### 5.3 Por qué "el primero que aprieta" es una garantía real y no una carrera de UI

La instrucción literal del creador (R14) es "el primero que apreta queda como dominante". Esto **no** se implementa comparando timestamps de dos toques de botón (eso sí sería una carrera de verdad, dependiente de la latencia de red de cada dispositivo) — se implementa dejando que Firestore decida cuál de las dos escrituras concurrentes gana, con la misma transacción en ambos lados:

1. Tanto el dominante actual (si presta "Sí" a la solicitud, cediendo el control) como el propio espectador que la pidió (si se autoconfirma, §5.4) ejecutan el **mismo** `runTransaction`, con la **misma** condición `validTakeover()`.
2. Si ambas transacciones se disparan casi al mismo tiempo, Firestore serializa los commits: la primera que llega al servidor gana; la segunda, al intentar confirmar con la lectura que hizo antes, detecta que el documento cambió entre su lectura y su intento de escritura (el motor de concurrencia optimista de Firestore) y **reintenta automáticamente la función de la transacción** con una lectura fresca.
3. En ese reintento, `controlRequest` ya no existe (la primera transacción lo borró) → `validTakeover()` es `false` → la función de la transacción no escribe nada y resuelve sin error, simplemente "no hizo falta, ya está resuelto". Ningún dispositivo ve un error visible; su UI simplemente refleja el `onSnapshot` con el nuevo `dominantDeviceId`.

Esto es lo mismo que resuelve el aparente empate de "ambos presionan Sí exactamente al mismo milisegundo": no hay empate posible a nivel de Firestore, porque los commits se serializan en el servidor. La UI de ambos dispositivos converge al mismo resultado en cuanto reciben el siguiente `onSnapshot`.

### 5.4 "No" del dominante, autoconfirmación del solicitante, y por qué ambos caminos son necesarios

- **"No" en el dominante actual** (brief §5: "'No' en el dominante cancela la solicitud"): es un `updateDoc` que borra `controlRequest` sin tocar `dominantDeviceId` — pasa por la misma rama de regla que la solicitud original (`dominantUnchanged() && onlyControlRequestChanged()`). No requiere transacción porque no compite con nada: solo el dominante puede escribir controlRequest sin cambiar `dominantDeviceId` de por medio en este caso, y aunque el espectador escribiera al mismo tiempo, el resultado (con o sin `controlRequest`) es aceptable con last-write-wins — en el peor caso el espectador ve su solicitud "revivir" por un instante y debe volver a pedirla, sin ninguna inconsistencia de dominancia.
- **Autoconfirmación del solicitante**: la lectura literal de R14 ("el primero que apreta") no exige que sea el dominante quien apriete — exige que **alguien** apriete "Sí" primero. Por diseño, el mismo dispositivo que pidió el control también ve su propio diálogo de confirmación (es el mismo componente de UI en ambos lados, brief §5: "ambos dispositivos muestran el diálogo"), así que el usuario puede confirmar la toma de control desde el dispositivo que la pidió sin esperar ninguna acción del otro. Esto **no es un atajo añadido por este documento**: es la consecuencia directa de que `validTakeover()` no distingue quién ejecuta la transacción, solo que el nuevo `dominantDeviceId` coincida con `controlRequest.requesterDeviceId`. Es, además, el mecanismo que resuelve el caso de reinstalación/cambio de celular sin necesitar ninguna regla adicional (§13).

### 5.5 Qué NO cambia durante una solicitud pendiente

Mientras `controlRequest` está presente y nadie ha confirmado nada: `currentState`, `segmentStartedAt`, `responseDeadlineAt` y todo lo demás del singleton siguen exactamente igual — el dominante actual sigue siendo el único que puede escribir transiciones, y el cronómetro (visible para ambos) sigue corriendo sin pausarse. Pedir el control no es una acción de la máquina de estados de `03-CRONOMETRO.md` (no aparece en `StudyTimerEvent`, §2 de ese documento) — es un protocolo paralelo que vive enteramente en el campo `controlRequest` del mismo documento.

## 6. `clockOffset`: reloj común sin servidor propio

La fórmula y el punto de cálculo ya están fijados en `03-CRONOMETRO.md` §10.2 y `02-DOMINIO.md` §6.1 (se citan, no se redefinen):

```ts
// 03-CRONOMETRO.md §10.2, se cita, no se redefine
// El dominante recalcula tras cada checkpoint que el propio dispositivo confirmó
clockOffsetMs = Date.parse(lastCheckpointAt_servidor) - localTimestampMsDeEseCheckpoint;

// El espectador lo estima al recibir un snapshot ya confirmado por el servidor
// (nunca uno optimista/local): metadata.hasPendingWrites === false && metadata.fromCache === false
clockOffsetMs = Date.parse(snapshot.lastCheckpointAt) - Date.now();

// Uso en cualquier fórmula de este documento
nowMs = Date.now() + clockOffsetMs;
```

Lo que aporta este documento es cómo esa misma fórmula, aplicada **de forma independiente por cada dispositivo**, produce un reloj consistente entre todos sin que ninguno le "hable" directamente a otro:

### 6.1 Cada dispositivo calcula su propio offset, nunca el de otro

No existe un `clockOffset` compartido en el singleton — sería redundante e incorrecto, porque el offset depende del reloj **local** de cada dispositivo, no de la sesión. Cada dispositivo (dominante y cada espectador) mantiene su propio `productvt.clockOffsetMs` (`02-DOMINIO.md` §6.4) y lo recalcula:

- El **dominante**, tras cada checkpoint que él mismo confirmó (tiene tanto su hora local de escritura como la hora de servidor que Firestore le devuelve una vez confirmado el `update`).
- Cada **espectador**, al recibir cualquier snapshot de `onSnapshot` cuyos metadatos indiquen que ya viene del servidor (no un eco optimista de su propia escritura, que un espectador no hace, ni una lectura servida desde caché offline).

### 6.2 Ejemplo numérico con dos relojes desincronizados

Dominante A tiene el reloj adelantado 3 s; espectador B tiene el reloj atrasado 5 s. El servidor resuelve un checkpoint de fin de bloque en el instante real `t`:

| | Hora local al momento del evento | `clockOffsetMs` calculado | `nowMs` corregido en ese instante |
|---|---|---|---|
| Dominante A | Registra el checkpoint como `t + 3000` (su reloj adelantado) | `t − (t + 3000) = −3000` | `Date.now() − 3000 = t` |
| Espectador B | Recibe el snapshot confirmado en su reloj como `t − 5000` (su reloj atrasado) | `t − (t − 5000) = +5000` | `Date.now() + 5000 = t` |

Ambos dispositivos, con relojes locales desincronizados en direcciones opuestas por 8 segundos de diferencia entre sí, calculan el mismo `nowMs ≈ t` una vez aplicado su propio offset — y por lo tanto ambos evalúan `computeRemainingSeconds` (`03-CRONOMETRO.md` §10.1) con el mismo resultado (salvo el margen de milisegundos de latencia de red hasta que el snapshot llegó, irrelevante para una UI que refresca cada 250–500 ms). Ningún dispositivo necesita saber el offset del otro: cada uno corrige su propio reloj hacia el mismo punto de referencia (el reloj del servidor de Firestore), y ese punto de referencia es el único que importa.

### 6.3 Recalculado, no memorizado una sola vez

`clockOffsetMs` se recalcula en **cada** checkpoint/snapshot confirmado, nunca una sola vez al arrancar la app (`02-DOMINIO.md` §6.1): un dispositivo cuyo reloj deriva lentamente durante una sesión larga (varias horas) se corrige solo, sin acumular error. La excepción es exactamente el caso de un dominante sin red por un tiempo prolongado, donde no llegan checkpoints confirmados para recalcular — tratado como limitación aceptada en §9.4.

## 7. Ventanas vencidas y sesión zombie: cierre perezoso sin doble ejecución

Las condiciones de cierre (`EXPIRE` cuando `now ≥ responseDeadlineAt`, `ZOMBIE_TIMEOUT` cuando `now − lastCheckpointAt > 24 h`) y su efecto sobre `effectiveStudySeconds` ya están fijados en `03-CRONOMETRO.md` §9 (se citan, no se redefinen). Lo que aporta este documento es el mecanismo que garantiza que, aunque **varios dispositivos detecten la misma condición casi al mismo tiempo**, el cierre se ejecute exactamente una vez.

### 7.1 Por qué hace falta una garantía especial aquí y no en un cierre normal

Un cierre normal (`END_SESSION`, `CONFIRM_CANCEL`) solo puede iniciarlo el dominante — no hay nadie más compitiendo, así que un `WriteBatch` alcanza (§3, fila 5). Un cierre perezoso es distinto por diseño (`03-CRONOMETRO.md` §9.2, deliberado): **cualquier** dispositivo que lea el singleton y note que el plazo ya venció debe poder cerrarlo, precisamente para que una sesión no quede "colgada" si el dominante cerró la app justo durante la ventana. Eso significa que, en el peor caso, tres dispositivos (el dominante reabriendo la app, un espectador Android, la web en modo espectador) pueden evaluar `now ≥ responseDeadlineAt` como verdadero casi simultáneamente y cada uno intentar cerrar la misma sesión.

### 7.2 La transacción condicional

```ts
// src/domain/coordinators/close-lazy-session.ts — ADICIÓN (fase de sincronización)
// Firma común a EXPIRE (T17) y ZOMBIE_TIMEOUT (T18) de 03-CRONOMETRO.md §4.4; closure es
// StudySessionClosure o InverseSessionClosure según active.type (02-DOMINIO.md §3.6).
export type LazyCloseResult = 'closed' | 'already_closed' | 'not_yet_due';

export async function closeLazySessionIfDue(
  uid: string,
  expectedSessionId: string,
  computeClosure: (active: ActiveSession, nowMs: number) => { closure: StudySessionClosure | InverseSessionClosure; stillDue: boolean } | null,
  nowMs: number
): Promise<LazyCloseResult> {
  return runTransaction(db, async (tx) => {
    const ref = activeSessionDocRef(uid);
    const snap = await tx.get(ref);
    if (!snap.exists()) return 'already_closed';               // otro dispositivo ya lo cerró
    const active = snap.data();
    if (active.sessionId !== expectedSessionId) return 'already_closed'; // ya se cerró y empezó otra sesión distinta
    const evaluation = computeClosure(active, nowMs);
    if (!evaluation || !evaluation.stillDue) return 'not_yet_due';       // el propio dispositivo se adelantó (reloj desfasado)
    const materialized = active.type === 'study'
      ? materializeStudySession(active, evaluation.closure as StudySessionClosure)
      : materializeInverseSession(active, evaluation.closure as InverseSessionClosure);
    tx.set(sessionDocRef(uid, active.sessionId), materialized);
    tx.delete(ref);
    return 'closed';
  });
}
```

`computeClosure` **recalcula la condición dentro de la transacción**, con el documento recién leído (`isZombie(active, nowIso)` o `nowMs ≥ Date.parse(active.responseDeadlineAt)`, según corresponda) — no confía en la evaluación que hizo el llamador antes de entrar a la transacción. Esto cubre el caso de que el dominante haya escrito un checkpoint nuevo (p. ej. el usuario respondió justo a tiempo) entre el momento en que un dispositivo decidió "voy a cerrar esto" y el momento en que su transacción efectivamente lee el documento: la relectura dentro de la transacción ve el checkpoint nuevo, `stillDue` da `false`, y el intento de cierre se aborta sin efecto — la sesión sigue viva, tal como debía.

### 7.3 Cómo se resuelve la carrera entre dos cierres simultáneos

```mermaid
sequenceDiagram
    participant W as Web (espectador)
    participant F as Firestore (active/session)
    participant An as Android (dominante, recién reabierto)

    Note over W,An: responseDeadlineAt ya venció; ambos lo detectan casi al mismo tiempo
    par Ambos intentan cerrar
        W->>F: runTransaction: lee, stillDue=true, set(sessions/{id}) + delete(active/session)
    and
        An->>F: runTransaction: lee, stillDue=true, set(sessions/{id}) + delete(active/session)
    end
    F-->>W: commit OK (primera en llegar)
    Note over F: la transacción de An leyó el documento antes de que W lo borrara;\nal intentar comitear, Firestore detecta que cambió → reintenta la función
    F-->>An: reintento: tx.get(ref) → !snap.exists() → devuelve 'already_closed'
    Note over An: no escribe nada; su UI ya no encuentra active/session en el próximo onSnapshot
```

El resultado es idéntico al de la toma de control (§5.3): la concurrencia optimista de Firestore garantiza que como máximo una transacción confirma el `set`+`delete`; la otra, al reintentar con una lectura fresca, encuentra el documento ya borrado y no hace nada. Ningún dispositivo necesita coordinarse "hablando" con el otro — ambos simplemente intentan la misma operación contra el mismo árbitro.

### 7.4 Quién dispara `closeLazySessionIfDue` y cuándo

- **El motor del dominante** (`03-CRONOMETRO.md` §10), en cada tick mientras la app está en primer plano: si `computeRemainingSeconds` llega a 0 en un estado de espera, o `isZombie` es verdadero, llama a esta función antes de asumir que la transición ya ocurrió.
- **`ActiveSessionRecoveryService`** (§8), al arrancar la app o al detectar que la app volvió a primer plano tras un rato en segundo plano: es la vía por la que un espectador (incluida la web) o un dominante recién reabierto detectan y cierran una sesión que nadie atendió mientras la app no corría.
- Ningún otro punto del código debe llamar a `materializeStudySession`/`materializeInverseSession` seguido de un `delete` manual para estos dos casos — siempre a través de esta función, para no reintroducir la carrera que resuelve.

## 8. `ActiveSessionRecoveryService`

Nombrado en brief §7 (`src/application/coordinators/`) y citado en `02-DOMINIO.md` §2.5 como responsable del "detalle de estados y transiciones" de recuperación; su algoritmo completo es responsabilidad de este documento. Se invoca en tres momentos: (a) arranque en frío de la app, (b) la app vuelve a primer plano tras estar en segundo plano más de unos segundos (posible salto de tiempo mientras estaba suspendida), (c) el listener de conectividad detecta que el dispositivo volvió a tener red tras un período offline (§9). En los tres casos ejecuta la misma función.

### 8.1 Algoritmo

```ts
// src/application/coordinators/active-session-recovery-service.ts — ADICIÓN (fase de sincronización)
export type RecoveryOutcome =
  | { kind: 'idle' }                                          // no hay sesión activa
  | { kind: 'closed_lazily'; closedAs: 'expired' | 'zombie' | 'inverse_auto_finished' } // se cerró en esta misma llamada
  | { kind: 'hydrated'; role: DeviceRole; active: ActiveSession }; // sesión viva, máquina reconstruida

export async function recoverActiveSession(
  uid: string,
  device: DeviceIdentity
): Promise<RecoveryOutcome> {
  // 1. El singleton remoto es SIEMPRE la verdad (D15, 02-DOMINIO.md §3.5). El caché local
  //    (productvt.activeSessionCache) solo sirve para pintar algo antes de que resuelva esta lectura;
  //    nunca se usa como fuente de decisión.
  const snap = await getDoc(activeSessionDocRef(uid)); // puede venir de caché si no hay red (snap.metadata.fromCache)
  if (!snap.exists()) {
    await clearLocalActiveSessionCache();               // por si quedó un residuo de una sesión ya cerrada
    return { kind: 'idle' };
  }
  const active = snap.data();
  const role = resolveDeviceRole(active, device);        // 'dominant' | 'spectator' — nunca null aquí, ya sabemos que existe

  // 2. Recalcula el offset con lo que haya disponible (si el snapshot viene de caché, se usa el último
  //    clockOffsetMs persistido en 02-DOMINIO.md §6.4; no se bloquea la recuperación esperando red).
  const nowMs = Date.now() + (await readClockOffsetMs());

  // 3. ¿La sesión ya venció mientras la app no corría? Se evalúa igual para dominante y espectador
  //    (03-CRONOMETRO.md §9.2: "cualquier dispositivo que lea el singleton").
  const evaluation = evaluateLazyClosure(active, nowMs);  // envuelve EXPIRE/ZOMBIE_TIMEOUT, ver 03-CRONOMETRO.md §9
  if (evaluation.due) {
    const result = await closeLazySessionIfDue(uid, active.sessionId, evaluation.computeClosure, nowMs); // §7.2
    if (result === 'closed') {
      return { kind: 'closed_lazily', closedAs: evaluation.reason };
    }
    // 'already_closed': otro dispositivo ganó la carrera entre que evaluamos y que intentamos cerrar — está bien,
    // simplemente releemos para hidratar con lo que quede (probablemente ya no exista: recursión de una sola vez).
    if (result === 'already_closed') {
      return recoverActiveSession(uid, device);
    }
    // 'not_yet_due': el reloj local estaba desfasado; sigue de largo y hidrata normalmente.
  }

  // 4. Hidratar la máquina local con lo que dice el singleton — nunca con el caché local.
  dispatchToLocalMachine({ type: 'HYDRATE', payload: { active } }); // 03-CRONOMETRO.md §2, evento HYDRATE

  // 5. Solo el dominante tiene trabajo adicional de recuperación: las notificaciones locales
  //    (03-CRONOMETRO.md §11) pueden haberse perdido (reinstalación, "borrar notificaciones" del SO,
  //    OS que las descarta tras muchas horas) — se reprograman siempre, de forma idempotente
  //    (mismo identificador determinístico `${sessionId}:${propósito}`, así que reprogramar una que
  //    seguía viva simplemente la reemplaza sin duplicarla).
  if (role === 'dominant') {
    await rescheduleNotificationsForState(active); // vuelve a programar exactamente lo que 03-CRONOMETRO.md §11
                                                    // programaría al "entrar" al currentState actual
    await writeLocalActiveSessionCache(active);    // acelera el próximo arranque de este mismo dominante
  }

  // 6. Suscribirse a onSnapshot para seguir recibiendo cambios en vivo (dominante y espectador).
  subscribeToActiveSession(uid, /* callback ya conectado al store */);

  return { kind: 'hydrated', role, active };
}
```

### 8.2 Notas de implementación

- **El paso 3 se ejecuta también para el espectador**, incluida la web: es exactamente el mecanismo que permite que un dispositivo que nunca puede ser dominante sí pueda destrabar una sesión zombie que el dominante abandonó (`02-DOMINIO.md` §7, fila "Cerrar zombie"; regla de seguridad §11 de este documento, `allow delete: if isOwner(uid) && docId == 'session'` sin exigir ser dominante).
- **El `HYDRATE` del paso 4 reconstruye la UI completa**, no solo el `currentState`: la pantalla del cronómetro debe poder pintar de inmediato el anillo de progreso correcto, el banco de descanso acumulado y el panel correspondiente (`break_selection`, etc.) leyendo directamente los campos ya persistidos del singleton — no hace falta ningún cálculo adicional más allá de `computeRemainingSeconds`/`computeLiveEffectiveStudySeconds` (`03-CRONOMETRO.md` §10), que ya están diseñados para funcionar igual de bien recién arrancada la app que en medio de una sesión continua (§10.4 de ese documento).
- **Un dominante que se recupera nunca debe confiar en `productvt.activeSessionCache` para decidir nada** — solo la usa para no mostrar una pantalla en blanco mientras espera la primera respuesta de `getDoc`. Si el caché local dice una cosa y el singleton remoto otra (p. ej. el dispositivo se cerró a mitad de escribir un checkpoint que sí llegó al servidor, o perdió el rol de dominante mientras estaba cerrado, §5), gana siempre el remoto.
- **La recursión del paso 3 ('already_closed' → volver a llamar `recoverActiveSession`) se ejecuta como máximo una vez en la práctica**: tras un cierre exitoso de cualquier dispositivo, la segunda lectura ya no encuentra el documento y cae directo al caso `idle` del paso 1. No hace falta un límite de reintentos explícito porque el propio dato (documento borrado) termina la recursión.
- Esta misma función (o su núcleo, factorizado como `evaluateLazyClosure` + `closeLazySessionIfDue`) es la que el motor del dominante llama en cada tick mientras la app está en primer plano (§7.4) — `ActiveSessionRecoveryService` es simplemente el punto de entrada que además decide `HYDRATE` vs "no hacer nada" en frío.

## 9. Offline: el dominante sin red sigue contando

Esta sección es la consecuencia directa de la tabla de §3: cada primitiva de Firestore se comporta distinto sin red, y eso determina exactamente qué sigue funcionando y qué se bloquea cuando el dominante pierde conectividad.

### 9.1 Lo que sigue funcionando sin ninguna limitación

- **El conteo mismo**: `computeRemainingSeconds`/`computeInverseElapsedSeconds` (`03-CRONOMETRO.md` §10.1, §12.3) son resta de timestamps locales — no llaman a Firestore ni a ninguna API de red. Un bloque de estudio, un descanso, un almuerzo o el temporizador inverso siguen corriendo con precisión de segundo aunque el dispositivo esté en modo avión.
- **Las notificaciones locales** (`03-CRONOMETRO.md` §11): se programan con `expo-notifications` contra el reloj del sistema operativo, no contra la red. Una alarma programada para dentro de 25 minutos suena a tiempo aunque el dispositivo pierda la red entera ese rato.
- **Los checkpoints de transición normal** (fila 2 de §3: `updateDoc` simple, todas las filas T2–T13 salvo cierres): se aplican de inmediato al caché local del propio dispositivo (el dominante ve su propia UI actualizada al instante, sin esperar red) y quedan **encolados** por el SDK de Firestore hasta que vuelve la conexión, momento en el que se envían en el mismo orden en que se generaron.
- **El cierre normal de una sesión** (fila 5 de §3: `WriteBatch`, `END_SESSION`/`CONFIRM_CANCEL`): igual que el punto anterior — el `WriteBatch` se aplica al caché local de inmediato y queda encolado. El propio dispositivo transiciona a `idle` sin esperar confirmación del servidor.

### 9.2 Lo que necesita conectividad, y por qué

`runTransaction` **no encola**: si el dispositivo está sin red, la promesa se **rechaza** de inmediato (o tras un timeout corto), no queda pendiente esperando reconexión como sí ocurre con `updateDoc`/`WriteBatch`. Esto es una limitación documentada del propio SDK de Firestore (una transacción necesita una lectura fresca del servidor para poder garantizar su condición; contra un caché offline no hay forma honesta de darla) y afecta exactamente a las tres operaciones de §3 que usan `runTransaction`:

| Operación | Efecto sin red | Mitigación |
|---|---|---|
| Crear el singleton (`START_SESSION`/`START_INVERSE`) | La transacción se rechaza; no se puede iniciar una sesión nueva estando offline | La UI detecta la falta de red (`NetInfo`/`navigator.onLine`, o simplemente captura el rechazo de la transacción) y muestra "Sin conexión: no se puede iniciar una sesión" en vez de un error genérico. Es una limitación de producto aceptada — iniciar una sesión es una acción puntual, no continua. |
| Solicitar/tomar el control (§5) | La solicitud (`updateDoc`) sí se encola; pero la confirmación (`runTransaction`) del lado que está sin red se rechaza | Si el dispositivo que confirma está offline, reintenta en cuanto detecta reconexión (mismo patrón que la fila siguiente). En la práctica, pedir/tomar el control es una acción entre dos dispositivos que ya están viéndose por `onSnapshot`, así que ambos suelen estar online en ese momento. |
| Cierre perezoso (`closeLazySessionIfDue`, §7) | Se rechaza; el dispositivo no puede materializar el cierre mientras esté offline | Ver §9.3: la UI se comporta como si ya hubiera cerrado, pero el cierre real en Firestore queda diferido. |

### 9.3 Caso detallado: una ventana vence mientras el dominante está offline

1. El dominante detecta localmente, por timestamp, que `now ≥ responseDeadlineAt` — esto no necesita red (§9.1).
2. Su UI transiciona de inmediato a la pantalla de "sesión expirada" (comportamiento optimista): desde la perspectiva del usuario de ese dispositivo, la sesión ya terminó.
3. Internamente, el motor intenta `closeLazySessionIfDue` (§7.2); la transacción se rechaza por falta de red. El servicio programa un reintento (con backoff, o simplemente al recibir el próximo evento de reconexión — `NetInfo.addEventListener` en nativo, `window.addEventListener('online')` en web).
4. Mientras tanto, **cualquier espectador sigue viendo el singleton tal como estaba antes de vencer** (su último `onSnapshot` confirmado): para ellos, la sesión sigue "activa" hasta que el cierre real llegue al servidor. No hay forma de evitar esta ventana de inconsistencia sin un backend propio que empuje el cierre — se acepta como comportamiento esperado, acotado en el tiempo por lo que tarde el dominante en recuperar señal.
5. En cuanto el dominante recupera conectividad, `closeLazySessionIfDue` se reintenta y esta vez completa: materializa `StudySession`/`InverseSession` y borra el singleton. Los espectadores lo ven en su siguiente `onSnapshot`.
6. Si, mientras tanto, otro dispositivo (un espectador que sí tenía red, o la web) detectó la misma condición y cerró la sesión primero, el reintento del dominante en el paso 5 recibe `'already_closed'` de la transacción (§7.2) y no hace nada — el resultado final es idéntico, solo que otro dispositivo lo ejecutó primero.

### 9.4 Deriva del reloj durante una desconexión prolongada

`clockOffsetMs` solo se recalcula con checkpoints/snapshots **confirmados por el servidor** (§6.3). Mientras el dominante está offline, ningún checkpoint se confirma, así que su `clockOffsetMs` queda congelado en el último valor conocido — si el reloj del dispositivo deriva más durante esa ventana offline (poco probable en un teléfono moderno, pero no imposible), los timestamps que escribe mientras tanto (`segmentStartedAt` de una transición ocurrida offline) llevan ese error acumulado. En cuanto vuelve la red y el primer checkpoint se confirma, `clockOffsetMs` se recalcula y corrige el error hacia adelante; los timestamps ya escritos durante la ventana offline no se corrigen retroactivamente. Se acepta como limitación menor para una app de un solo usuario (el error típico de un reloj de dispositivo moderno en, digamos, una hora sin red es de milisegundos, muy por debajo de la granularidad de 30 s/10 min de las ventanas de respuesta).

## 10. CRUD paralelo sin arbitraje

Todo lo que **no** es el singleton de sesión activa (D14, brief §5) es CRUD normal contra Firestore: categorías, presets, eventos invisibles, metas, ajustes. Este documento no necesita fijar ningún protocolo especial porque no hay ningún recurso exclusivo que proteger — cada documento tiene su propio `id` y dos dispositivos escribiendo el mismo documento a la vez se resuelven con el comportamiento estándar de Firestore (last-write-wins por campo, persistencia offline del SDK con `persistentLocalCache`/`persistentMultipleTabManager` para más de una pestaña web, `02-DOMINIO.md` §7).

| Operación | Arbitraje | Por qué no hace falta uno |
|---|---|---|
| Crear/editar/archivar `Category`, `Preset` | Ninguno | Cada categoría/preset es un documento independiente; no hay una noción de "el mismo recurso, dos dueños" como con el singleton |
| Crear/editar/borrar (lógico) `InvisibleEvent` | Ninguno | Igual que arriba; `isDeleted` es un campo más, last-write-wins es aceptable para un solo usuario editando su propio calendario |
| Crear/editar `WeeklyGoal` | Ninguno | Igual; el recálculo de `achievedSeconds` es un agregador de lectura (`07-CALENDARIO-Y-ESTADISTICAS.md`/`08-METAS.md`), no una escritura concurrente disputada |
| `UserSettings`, `UserProfile` | Ninguno | Documento único por usuario, pero sin la semántica de "solo un dispositivo puede escribir" — dos dispositivos cambiando el tema visual casi a la vez simplemente terminan con el último valor que llegó, sin ninguna consecuencia funcional |
| Lectura de `sessions/` para calendario/estadísticas | Ninguno (es lectura) | Los documentos de `sessions/` solo los escribe el dominante al cerrar (o cualquier lector, en un cierre perezoso, §7) — nunca dos dispositivos a la vez, porque solo existe un singleton activo del que puede salir un cierre |

La única razón por la que el timer activo sí necesita todo el protocolo de §3–§9 y el resto de operaciones no, es que el timer activo tiene una invariante de negocio real que proteger ("una sola sesión activa", "un solo dominante") — ninguna de las operaciones de esta sección la tiene.

## 11. Fragmento anotado de `firestore.rules`

El archivo completo (`productvt-beta/firestore.rules`) ya está fijado en `02-DOMINIO.md` §5.3 y no se redefine aquí. Este documento cita el fragmento del singleton y anota, rama por rama, qué parte del protocolo de este documento habilita — es la razón de ser de cada condición, no una regla nueva:

```text
// 02-DOMINIO.md §5.3 — cita textual del bloque `match /active/{docId}`, no se redefine
match /active/{docId} {
  function validCheckpoint() {
    return incoming().lastCheckpointAt == request.time;
  }
  function dominantUnchanged() {
    return incoming().dominantDeviceId == existing().dominantDeviceId;
  }
  function onlyControlRequestChanged() {
    return changedKeys().hasOnly(['controlRequest', 'updatedAt']);
  }
  function requestFromAndroid() {
    return !('controlRequest' in incoming())
      || incoming().controlRequest.requesterPlatform == 'android';
  }
  function validTakeover() {
    return ('controlRequest' in existing())
      && incoming().dominantDeviceId == existing().controlRequest.requesterDeviceId
      && !('controlRequest' in incoming());
  }

  allow read: if isOwner(uid);

  allow create: if isOwner(uid) && docId == 'session' && hasUserId(uid) && versionOk()
    && incoming().type in ['study', 'inverse']
    && incoming().sessionId is string
    && incoming().dominantDeviceId is string
    && incoming().deviceInfo.platform == 'android'
    && validCheckpoint();

  allow update: if isOwner(uid) && docId == 'session' && hasUserId(uid) && versionOk()
    && incoming().sessionId == existing().sessionId
    && incoming().type == existing().type
    && (
         (dominantUnchanged() && validCheckpoint())
      || (dominantUnchanged() && onlyControlRequestChanged() && requestFromAndroid())
      || (validTakeover() && validCheckpoint())
    );

  allow delete: if isOwner(uid) && docId == 'session';
}
```

| Rama de la regla | Habilita (sección de este documento) |
|---|---|
| `allow create: … && incoming().deviceInfo.platform == 'android' && validCheckpoint()` | Fila 1 de §3 (crear el singleton, solo Android — §5.1) + exige que el `create` lleve `serverTimestamp()` real, no un valor inventado por el cliente |
| `update`, rama 1: `dominantUnchanged() && validCheckpoint()` | Fila 2 de §3 — el checkpoint normal del dominante en cada transición (§4.2, §9.1) |
| `update`, rama 2: `dominantUnchanged() && onlyControlRequestChanged() && requestFromAndroid()` | Filas 3 y "No del dominante" de §3/§5.2/§5.4 — solicitar, rechazar o retirar `controlRequest` sin tocar `dominantDeviceId`, y solo desde Android (§5.1) |
| `update`, rama 3: `validTakeover() && validCheckpoint()` | Fila 4 de §3 — la transacción de toma de control de §5.2/§5.3; nótese que también exige `validCheckpoint()`, es decir, la toma de control **también** actualiza `lastCheckpointAt` con `serverTimestamp()` en la misma escritura |
| `allow delete: if isOwner(uid) && docId == 'session'` (sin exigir ser dominante) | Fila 6 de §3 y §7 completa — cualquier dispositivo del dueño puede ejecutar la mitad "borrar" del cierre perezoso, incluida la web en modo espectador (I-20, `02-DOMINIO.md` §4) |
| Ausencia de una rama que permita cambiar `dominantDeviceId` fuera de `validTakeover()` | Es la mitad de la garantía de "un solo dominante" (I-12) que corresponde a las reglas, no a la transacción: aunque un cliente intentara escribir `dominantDeviceId` directamente sin pasar por `controlRequest`, Firestore lo rechaza porque ninguna de las tres ramas de `update` lo permite |

Las reglas no pueden, por diseño, saber **qué dispositivo físico** está escribiendo (no hay forma de que `firestore.rules` verifique un `deviceId` contra una lista de dispositivos de confianza) — su trabajo es proteger la **forma** de las transiciones válidas (qué combinación de campos puede cambiar junta) mientras el árbitro real de la concurrencia entre dispositivos es la transacción del cliente descrita en §5 y §7 (I-11, I-12 de `02-DOMINIO.md` §4).

## 12. Costo: lecturas y escrituras en el plan Spark

Cuotas diarias gratuitas del plan Spark (Firestore, sin tarjeta asociada): 50 000 lecturas, 20 000 escrituras, 20 000 borrados. `02-DOMINIO.md` §5.1 ya estima el costo de escritura de una sola sesión ("~12 escrituras del singleton + 1 escritura final + 1 borrado" para 4 bloques); este documento extiende esa estimación a un escenario de uso multi-dispositivo completo, que es lo que puede añadir costo que ese cálculo no cubre: las lecturas que genera un espectador con `onSnapshot` abierto durante toda la sesión.

### 12.1 Supuestos del escenario (deliberadamente generosos)

- 1 usuario, hasta 2 dispositivos simultáneos (1 Android dominante + 1 espectador, sea otro Android o la PWA de escritorio).
- 5 sesiones de estudio al día (bastante más que lo razonable para una persona real) con 6 bloques cada una en promedio.
- El espectador permanece con la app abierta y suscrito durante toda la sesión (el peor caso de lecturas; si no hay espectador conectado, el costo de esta sección es cero).
- 3 bloques inversos al día, sin espectador.
- Uso normal de calendario/estadísticas/metas: 10 aperturas de pantalla al día.

### 12.2 Escrituras del singleton por sesión de estudio

| Transición | Escrituras | Cantidad por sesión (6 bloques) |
|---|---|---|
| `START_SESSION` (T1) | 1 (`create`, transacción) | 1 |
| Fin de bloque + ack (T2, T3) | 2 por bloque | 12 |
| Selección de descanso + fin de descanso (T4/T5/T6, T8) | 2 por bloque (salvo el último, que puede terminar en `END_SESSION` en vez de descanso) | ~10 |
| Reanudar tras descanso (T9) | 1 por descanso tomado | ~5 |
| Cierre (`WriteBatch`: 1 `set` + 1 `delete`) | 2 | 2 |
| **Total por sesión** | | **≈ 30 operaciones de escritura/borrado** |

5 sesiones/día × 30 ≈ **150 escrituras/borrados diarios** por CRUD de sesión de estudio. Los 3 bloques inversos (creación + hasta 2 checkpoints de `remindersTriggered` + cierre) añaden ≈ 3 × 4 = 12 más. Categorías/presets/eventos/metas/ajustes: unas pocas decenas de escrituras al día en el uso normal de una sola persona. **Total generoso: bien por debajo de 300 escrituras/borrados diarios**, contra una cuota de 20 000 — margen de más de 60×.

### 12.3 Lecturas: el costo que añade tener un espectador conectado

Cada documento que un `onSnapshot` entrega a un cliente (la primera vez que empieza a coincidir, y cada vez que cambia mientras sigue coincidiendo) se factura como una lectura. Un espectador con la app abierta durante una sesión completa recibe aproximadamente el mismo número de eventos que el dominante escribe checkpoints — es decir, ≈ 15 eventos de `onSnapshot` por sesión de 6 bloques (la mitad de la tabla de arriba, porque no todas las transiciones cambian el documento de forma visible para el snapshot — en la práctica, una lectura facturable por cada `update`/`set` confirmado que el espectador está escuchando).

| Fuente de lecturas | Cantidad por sesión | Total diario (5 sesiones) |
|---|---|---|
| `onSnapshot` del espectador durante la sesión | ≈ 15 | ≈ 75 |
| Lectura inicial de `ActiveSessionRecoveryService` (`getDoc`, ambos dispositivos, cada apertura de app) | 2 por apertura × ~4 aperturas/día | ≈ 8 |
| Calendario/estadísticas/metas (consultas de rango, `07-CALENDARIO-Y-ESTADISTICAS.md`) | — | ≈ 100–300 (documentos de `sessions`/`events`/`goals` leídos por consulta, generoso) |
| **Total diario estimado** | | **≈ 200–400 lecturas** |

Contra una cuota de 50 000 lecturas/día, esto deja un margen de más de 100×. Incluso multiplicando todo el escenario por 10 (uso extremo, varios espectadores conectados todo el día, decenas de sesiones) el proyecto seguiría muy por debajo de la cuota gratuita. La conclusión de `02-DOMINIO.md` §5.1 ("el cupo diario gratuito queda holgado para un usuario") se confirma también para el caso multi-dispositivo, que es el que este documento tenía que verificar.

### 12.4 Qué NO se factura

Los checkpoints que el dominante escribe **no** generan una lectura para sí mismo (una escritura no es una lectura); el motor por timestamps (§9.1) tampoco genera tráfico de red en absoluto entre checkpoints — el refresco visual de cada 250–500 ms es puramente local. El único costo real y recurrente de tener la sesión "en vivo" en dos dispositivos es el de la tabla de §12.3, y ya está cubierto con margen amplio.

## 13. Casos límite

### 13.1 Dos pestañas web abiertas a la vez

Ambas pestañas comparten el mismo origen y, por lo tanto, el mismo `localStorage` — incluido `productvt.deviceIdentity` (`02-DOMINIO.md` §6.4): las dos pestañas se presentan ante Firestore con el **mismo** `deviceId`. Como la web nunca puede ser dominante en V1 (§5.1), esto no genera ningún conflicto real:

- Ambas pestañas son espectadoras y muestran el mismo estado en vivo vía `onSnapshot` (con `persistentMultipleTabManager`, `02-DOMINIO.md` §7, que coordina el caché offline entre pestañas del mismo origen para no duplicar listeners de red).
- Ninguna de las dos puede iniciar una sesión ni pedir el control — el botón correspondiente no se renderiza en absoluto para `platform: 'web'` (§5.1, punto 2).
- Si en V1.1 la web pudiera ser dominante, dos pestañas con el mismo `deviceId` sí serían un problema real (ambas "son" el mismo dispositivo a ojos de Firestore, y podrían pisarse checkpoints entre sí) — pero eso es explícitamente trabajo de V1.1 (§14), no de este documento.

### 13.2 Reinstalación de la app

Ya cubierto en `02-DOMINIO.md` §3.5: reinstalar genera un `DeviceIdentity.deviceId` nuevo (nunca se deriva del hardware), y el singleton remoto sigue siendo la verdad. Dos variantes según si el dispositivo reinstalado tenía o no el rol dominante en el momento de reinstalar:

- **Era espectador**: no hay ningún efecto sobre la sesión activa — el dispositivo reinstalado simplemente arranca, lee el singleton (§8) y se hidrata como espectador con su nuevo `deviceId`. No necesita pedir nada.
- **Era el dominante**: la app reinstalada ya no tiene forma de "demostrar" que es el mismo dispositivo físico (el `deviceId` viejo no vuelve). El singleton sigue existiendo con `dominantDeviceId` apuntando a un `deviceId` que ya no existe en ningún dispositivo — nadie puede escribir transiciones hasta que: (a) el usuario toca cualquier control en el dispositivo reinstalado, lo que dispara una solicitud de control (§5.2) y (b) el propio dispositivo reinstalado se autoconfirma (§5.4) — no hace falta que el `deviceId` viejo responda nada, porque ya no existe ningún dispositivo que pueda hacerlo. Mientras tanto, la sesión sigue corriendo por timestamps (nadie la detiene) y eventualmente puede expirar/zombiar normalmente si el usuario tarda en volver a abrir la app (§7).

### 13.3 Cambio de celular (dispositivo viejo todavía encendido)

Distinto del caso anterior porque el dispositivo viejo **sí puede seguir respondiendo** si el usuario no cerró la app ahí: si el nuevo teléfono pide el control (§5.2) y el viejo sigue con la app abierta y ve el diálogo, puede: (a) confirmar "Sí" él mismo (cede el control voluntariamente, el resultado es igual que si lo confirmara el nuevo), (b) confirmar "No" (brief §5: cancela la solicitud; el usuario tendría que volver a pedirlo, posiblemente tras cerrar la app en el dispositivo viejo), o (c) no hacer nada — en cuyo caso el nuevo dispositivo se autoconfirma igual (§5.4) sin esperar al viejo. Recomendación de producto (no de este documento, para `06-DISENO-UI.md` o el flujo de onboarding): sugerir cerrar sesión o desinstalar la app del dispositivo viejo al migrar, para evitar el caso (b) por accidente.

### 13.4 Reloj de un dispositivo muy adelantado o atrasado

Ya cubierto en profundidad en §6 (mecanismo) y §9.4 (límite durante desconexión). Resumen del caso límite explícito: un dispositivo con el reloj del sistema operativo mal configurado por decenas de minutos u horas (poco común, pero posible si el usuario lo cambió manualmente) sigue funcionando correctamente **siempre que tenga red para confirmar checkpoints**, porque toda la aritmética de este protocolo pasa por `clockOffsetMs` corregido contra el reloj del servidor, nunca por el reloj local crudo (`Date.now()` sin corregir no aparece en ninguna fórmula de `03-CRONOMETRO.md` §10 ni de este documento). El único caso donde un reloj muy desviado importa de verdad es exactamente el de §9.4: sin red para confirmar el offset, no hay forma de corregirlo hasta que vuelva la conexión.

### 13.5 Sesión huérfana entre el cambio de dominante y el primer checkpoint del nuevo dominante

Caso no cubierto explícitamente en otra sección: justo después de una toma de control exitosa (§5.2), el nuevo dominante todavía no ha escrito ningún checkpoint propio — el singleton sigue teniendo el `segmentStartedAt`/`segmentTargetSeconds` que escribió el dominante anterior. Esto es intencional y correcto: la toma de control no reinicia el tramo en curso, solo cambia quién tiene permiso de escribir la próxima transición. El nuevo dominante simplemente continúa contando desde los mismos timestamps (su motor local calcula `computeRemainingSeconds` igual que lo hacía como espectador un instante antes) y escribe su primer checkpoint real en la siguiente transición que corresponda (fin de bloque, fin de descanso, etc.) — no hace falta ninguna sincronización adicional en el momento mismo del cambio de control.

## 14. Camino a "web dominante" en V1.1

`02-DOMINIO.md` §7 ya resume el cambio de esquema necesario (quitar la condición `platform == 'android'` de `firestore.rules` y de `canBeDominant`; ningún campo ni colección cambia). Este documento añade el resumen del cambio de **protocolo** que ese camino implicaría, sin implementarlo (queda fuera de V1, brief §10.10, pendiente de confirmación del creador):

- **La mecánica de §3–§9 no cambia**: transacciones, `onSnapshot`, `clockOffset`, cierre perezoso — todo funciona igual de bien contra un navegador que contra Android, porque ninguna de esas primitivas depende de la plataforma.
- **Lo que sí cambiaría es la confiabilidad de la alarma, no la del dato**: una pestaña de navegador en segundo plano recibe throttling de `setInterval`/`setTimeout` (irrelevante aquí, porque el motor no depende de eso, §9.1) pero **sí** pierde la capacidad de sonar una notificación si la pestaña está cerrada o el navegador no tiene una Service Worker con Web Push configurada (fuera del alcance de costo cero de Firebase Hosting gratuito en V1). Es exactamente la razón por la que brief §6 excluye a la web de ser dominante en V1, no una limitación de este protocolo de sincronización.
- Si en V1.1 se decide una PWA instalada con `display-mode: standalone` como dominante, el punto a resolver no está en este documento sino en la matriz de degradación de notificaciones/audio por plataforma (fuera de alcance de `04-SINCRONIZACION.md`): usar la Page Visibility API (`visibilitychange`) para al menos degradar con elegancia cuando la pestaña pierde foco, y aceptar que las ventanas de 30 s no tienen la misma garantía de que el usuario las vea a tiempo que en Android.
- El protocolo de cambio de dominante (§5) seguiría funcionando exactamente igual si un dispositivo web pudiera ser dominante: `validTakeover()` no distingue plataforma, solo compara `deviceId`. El único cambio de regla sería permitir que `requesterPlatform` y `deviceInfo.platform` valieran `'web'` en las condiciones de `create` y `requestFromAndroid()`.

## 15. Resolución de hallazgos de la revisión externa

Solo los hallazgos de `revision-spec-beta.md` que son de **protocolo de sincronización entre dispositivos** (mecanismo de sesión única, flujo de conflicto dominante/espectador). El resto de hallazgos de máquina de estados y modelo de datos ya está resuelto en `02-DOMINIO.md` §8 y `03-CRONOMETRO.md` §14 y no se repite; los de viabilidad técnica de alarmas/background y limitaciones generales de la web (REV-ALTA-5, REV-ALTA-6) no son de sincronización y quedan fuera de este documento.

| Hallazgo | Resolución | Dónde en este documento |
|---|---|---|
| **REV-ALTA-3** — "Una sola sesión activa por usuario" sin mecanismo que la haga cumplir; sin Cloud Functions, dos dispositivos pueden crear sesión activa casi simultáneamente y violar la regla sin que nada lo detecte (§31.3/§33 regla 10/§42) | El documento singleton `users/{uid}/active/session` (ya fijado en `02-DOMINIO.md` §2.5) se crea con `runTransaction` que lee-y-aborta-si-existe (§3, fila 1): dos dispositivos pulsando "Iniciar" casi a la vez compiten por el mismo documento y Firestore garantiza que solo uno gana. El mismo mecanismo (transacción condicional) protege el cierre perezoso (§7) y la toma de control (§5) — los tres puntos donde más de un dispositivo podría competir. `firestore.rules` (§11) refuerza la forma de cada escritura como segunda línea de defensa. | §2, §3 (tabla completa), §5 (toma de control), §7 (cierre perezoso), §11 (reglas anotadas) |
| **REV-MEDIA-19** (parte de flujo de conflicto multi-dispositivo) — "No se aclara… el flujo ante conflicto multi-dispositivo" (§31.3/§21; la parte de exclusión mutua estudio/inverso ya la resuelve `03-CRONOMETRO.md` §12.4) | Secuencia completa de solicitud y cambio de dominante con diálogo "¿Cambiar de dominante?" en ambos lados, resolución por transacción ("el primero que aprieta"), rechazo explícito ("No"), y el caso sin respuesta del otro lado (autoconfirmación) — con diagrama de secuencia paso a paso. | §5 completa (§5.2 diagrama, §5.3 garantía de la carrera, §5.4 caminos de "No"/autoconfirmación) |

Hallazgos de esta lista que **no** están arriba porque ya se resolvieron en otro documento (se citan, no se repiten): REV-ALTA-1 (retorno de `lunch_running`), REV-ALTA-2 (campos de persistencia para recuperación), REV-ALTA-4 (doble conteo del banco), REV-MEDIA-5/9/10/17/18 (ventanas, `break_selection`, banco, almuerzo, cancelación durante espera) — todos en `03-CRONOMETRO.md` §14; REV-MEDIA-1/2/3/4/6/7/8/13 (glosario, nombres de campo, `InvisibleEvent`, `InverseSession`, almuerzo modelado dos veces, `customBreakSelections`, `interrupted`, semana/zona horaria) en `02-DOMINIO.md` §8. REV-ALTA-5 (viabilidad de alarmas en background) y REV-ALTA-6 (riesgos de la versión web) son de viabilidad técnica de plataforma, no de protocolo de sincronización, y quedan para donde se documente esa matriz (mencionada como pendiente en `02-DOMINIO.md` §7 y `03-CRONOMETRO.md` §0).

## Supuestos pendientes de confirmar

Solo el supuesto de `_brief-orquestador.md` §10 que afecta al **protocolo de sincronización** de este documento. El resto de la lista de brief §10 (umbral de 30 min, tope del inverso, cancelación, galaxia, etc.) es de máquina de estados, modelo de datos o producto, y se trata en `02-DOMINIO.md`/`03-CRONOMETRO.md`/`10-GALAXIA-Y-TIENDA.md`.

| # | Supuesto (brief §10) | Default asumido en este documento | Si el creador decide distinto |
|---|---|---|---|
| 1 | **Rol dominante por plataforma — "web/desktop solo espectador en V1"** (§10.10) | Solo `android` pasa `canBeDominant` (§5.1); `firestore.rules` exige `deviceInfo.platform == 'android'` para crear el singleton y `requesterPlatform == 'android'` para pedir el control (§11). Todo el protocolo de §3–§9 (transacciones, `onSnapshot`, `clockOffset`, cierre perezoso) ya funciona igual de bien con cualquier plataforma — la restricción es exclusivamente de política, no de mecanismo. | Camino completo ya documentado en §14: se quita la condición `platform == 'android'` de dos sitios en `firestore.rules` y se amplía `canBeDominant`; ninguna interfaz, campo, transacción ni diagrama de secuencia de este documento cambia. Lo que sí habría que resolver aparte (fuera de este documento) es la confiabilidad de notificaciones/alarmas en una pestaña de navegador sin foco. |

Nota: la precisión de §3 (que el cierre perezoso de las filas T17/T18 usa `runTransaction` y no un `WriteBatch` simple, a diferencia de la lectura superficial de "batch atómico" en `02-DOMINIO.md`/`03-CRONOMETRO.md`) no es un supuesto pendiente de confirmar por el creador — es una precisión de mecanismo dentro de la autoridad delegada de arquitectura de código (brief §7–§9, D "Arquitectura de código"), sin ninguna decisión de producto involucrada.

## Trazabilidad

| Sección de este documento | Regla / decisión | Fuente(s) |
|---|---|---|
| §1 — Modelo mental | Cuatro ideas rectoras: singleton único, un dominante a la vez, Firestore como árbitro sin backend propio, motor sin dependencia de red | B §5, B §6, R14, D14–16, `02-DOMINIO.md` §2.5 |
| §2 — El singleton `active/session` | Remisión a interfaces, campos y las seis reglas de escritura ya fijadas; no se redefinen | `02-DOMINIO.md` §3.4, §3.5, §5.1 |
| §3 — Ciclo de vida completo | Tabla `update`/`WriteBatch`/`runTransaction` por cada una de las seis reglas; precisión de que el cierre perezoso usa transacción, no batch | CODE (comportamiento del SDK de Firestore), `02-DOMINIO.md` §3.4, `03-CRONOMETRO.md` §4 |
| §4 — Dominante y espectador | `resolveDeviceRole` puro; tabla de responsabilidades; algoritmo de interpolación local del espectador | R14, D14, `02-DOMINIO.md` §3.5, `03-CRONOMETRO.md` §10 |
| §5 — Solicitud y cambio de dominante | `canBeDominant`; secuencia completa con diagrama; garantía transaccional de "el primero que aprieta"; "No" del dominante y autoconfirmación del solicitante | R14, D14, B §5, B §6, `02-DOMINIO.md` §3.5/§5.3, REV-MEDIA-19 |
| §6 — `clockOffset` | Cálculo independiente por dispositivo; ejemplo numérico con dos relojes desincronizados; recalculado en cada checkpoint | `03-CRONOMETRO.md` §10.2, `02-DOMINIO.md` §6.1/§6.4 |
| §7 — Ventanas vencidas y sesión zombie | Transacción condicional (`closeLazySessionIfDue`) que impide la doble ejecución cuando varios dispositivos compiten por cerrar la misma sesión | R16, D16, `03-CRONOMETRO.md` §9, REV-ALTA-3 |
| §8 — `ActiveSessionRecoveryService` | Algoritmo completo de recuperación al arrancar/reconectar: lectura remota como única verdad, cierre perezoso si corresponde, `HYDRATE`, reprogramación de notificaciones | B §7, `02-DOMINIO.md` §2.5, `03-CRONOMETRO.md` §2 (evento `HYDRATE`), §11 (notificaciones) |
| §9 — Offline | Qué primitiva funciona sin red y cuál no; caso detallado de ventana vencida offline; deriva de reloj durante desconexión prolongada | D "Robustez ante crash — checkpoints incrementales", B §5, CODE (comportamiento del SDK de Firestore) |
| §10 — CRUD paralelo sin arbitraje | Confirmación de que solo el timer activo necesita protocolo especial; el resto es CRUD estándar sin conflicto | D14, B §5 |
| §11 — Fragmento anotado de `firestore.rules` | Cita del bloque `match /active/{docId}` con anotación rama por rama sobre qué protocolo habilita cada una | `02-DOMINIO.md` §5.3 |
| §12 — Costo: lecturas y escrituras en el plan Spark | Estimación de escrituras/lecturas multi-dispositivo; confirma margen amplio contra la cuota Spark | `02-DOMINIO.md` §5.1, restricción de costo cero (brief §6) |
| §13 — Casos límite | Dos pestañas web, reinstalación, cambio de celular, reloj desviado, sesión huérfana tras cambio de control | `02-DOMINIO.md` §3.5/§6.4/§7, brief §5 |
| §14 — Camino a "web dominante" en V1.1 | Resumen del cambio de protocolo (ninguno) y de plataforma (dos condiciones de reglas) que ese camino implicaría | `02-DOMINIO.md` §7, brief §10.10 |
| §15 — Resolución de hallazgos de la revisión externa | REV-ALTA-3 (mecanismo de sesión única) y la porción de REV-MEDIA-19 sobre flujo de conflicto multi-dispositivo | `revision-spec-beta.md` |
| Supuestos pendientes de confirmar | Rol dominante por plataforma (web/desktop espectador en V1) | B §10.10 |
