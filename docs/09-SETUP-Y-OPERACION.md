# 09 — Setup y Operación: costo cero, ejecución local, despliegue web

## Propósito

Este documento fija, paso a paso y sin dejar ninguna decisión operativa abierta, cómo levantar el proyecto Firebase que consume `productvt-beta/`, cómo ejecutarlo en local (Android como dominante, web como espectador) y cómo desplegar la PWA — todo dentro del plan gratuito Firebase Spark (restricción dura, brief §6, RNF-07). Cubre: requisitos de máquina; qué crear y qué **no** activar en la consola de Firebase; Authentication (Email/Password + Google, con el detalle de OAuth Client ID por plataforma que `02-DOMINIO.md`/`04-SINCRONIZACION.md` dan por hecho); Firestore (reglas e índices, citados de `02-DOMINIO.md` §5.3/§5.2 y `04-SINCRONIZACION.md` §11, nunca redefinidos aquí); `.env` desde `.env.example` (ya commiteado); por qué el proyecto usa **development build local** desde la Fase 2 y no Expo Go ni EAS Build; notificaciones locales en segundo plano en Android (Doze/optimización de batería, permisos de Android 13+); el ciclo start/export/deploy de la web como PWA espectadora; el catálogo de sonidos; una estimación de cuotas (citada de `04-SINCRONIZACION.md` §12); un procedimiento de respaldo manual de datos a costo cero; troubleshooting de los fallos más probables; y un checklist final verificable.

Este documento no redefine ningún esquema, regla de negocio, invariante ni interfaz — esos viven en `01-SPEC.md`, `02-DOMINIO.md`, `03-CRONOMETRO.md` y `04-SINCRONIZACION.md`, que se citan por sección. Tampoco es el lugar de la matriz de degradación arquitectónica por plataforma (SDK exacto por capa de código): ese análisis ya está escrito y completo en `05-ARQUITECTURA.md` §6 ("Estrategia de plataformas y matriz de degradación"), que adopta la misma `03-requisitos/matriz-degradacion-plataformas.md` que este documento también cita y resuelve ahí mismo, en su §11 ("Resolución de hallazgos de la revisión externa"), los tres mismos hallazgos de abajo desde el ángulo arquitectónico (qué capa de código, qué SDK exacto por función). Este documento no repite esa matriz ni mantiene una segunda tabla de resolución para los mismos hallazgos: sobre la base que `05-ARQUITECTURA.md` §6/§11 ya fija, solo añade la faceta puramente **operativa** que ese documento no cubre — qué se configura en consola, qué permiso se pide al sistema operativo, qué comando se corre — en §6, §7 y §8 de este documento.

## Fuentes

Orden de autoridad (si dos fuentes chocan, gana la de arriba; ver también la tabla de Trazabilidad al final):

1. Respuestas literales del creador — anexo de `_brief-orquestador.md` (`R14`, `R16`, `R19`, `R25`; los puntos 8–13/15/17/18/21 fueron delegados explícitamente por el creador ("ni idea, [...] adáptalo para que sea óptimo [...] sin costo monetario adicional") a `decisiones-tomadas.md`).
2. `03-requisitos/decisiones-tomadas.md` (etiquetas `D14`–`D19`, sección "Confiabilidad técnica — sin costo monetario adicional" y "Detalles técnicos menores"): fuente directa de "development build local, nunca EAS" (punto 17), "audio propio local, no sincronizado" (punto 18) y de los defaults de semana/timezone reutilizados aquí sin repetirlos (§10 de este documento).
3. `_brief-orquestador.md` revisado 2026-09-06 (`B §6` "Stack y plataformas", `B §7` arquitectura de código): fuente del stack exacto (Expo SDK 57, Firebase JS SDK plan Spark, sin Cloud Functions ni Storage en V1) y de la ubicación de adaptadores (`src/infrastructure/{firebase,notifications,audio,storage,device}/`).
4. Código ya commiteado en `productvt-beta/` (etiqueta `CODE`): `.env.example`, `app.json`, `package.json`, `src/infrastructure/firebase/{client,auth,collections}.ts`, `src/features/auth/hooks/useGoogleSignIn.ts`, `src/features/settings/domain/sound-catalog.ts`, `.gitignore`. Es la verdad para nombres de variables de entorno, scripts npm, plugins de Expo ya declarados y el estado real del repositorio a la fecha de este documento (3 de 11 fases commiteadas: fundación, auth, categorías/presets/settings; Fase 4 en curso).
5. `docs/02-DOMINIO.md` §5 (rutas Firestore, `firestore.indexes.json`, `firestore.rules` completo) y §6 (convenciones de tiempo/zona horaria) y §7 (matriz de plataformas): fuente citada, no redefinida, de todo lo que este documento despliega.
6. `docs/04-SINCRONIZACION.md` §11 (fragmento anotado del `firestore.rules` del singleton `active/session`) y §12 (estimación de costo Spark multi-dispositivo): fuente citada de la sección 10 de este documento.
7. `docs/01-SPEC.md` §4.2 (modelo de distribución), §6.17 (plataformas), §8.3 (costo cero), §8.4 (privacidad; RNF-10 "Exportar mis datos"/"Borrar mi cuenta" es V1.5, en producto — distinto del respaldo manual de administrador de §11 de este documento, que es operable hoy).
8. `03-requisitos/revision-spec-beta.md`: `REV-ALTA-5` (viabilidad de alarmas en background en Android), `REV-ALTA-6` (riesgos técnicos de la versión web) y `REV-MEDIA-15` (Android 12+, Doze y optimización de batería no mencionados). Los cuatro documentos ya escritos (`01-SPEC.md` §11, `02-DOMINIO.md` §8, `03-CRONOMETRO.md` §14, `04-SINCRONIZACION.md` §15) remiten estos tres hallazgos a `05-ARQUITECTURA.md`, que **ya está escrito y completo** y los resuelve explícitamente en su §6 (matriz de degradación por plataforma) y §11 (tabla de resolución de hallazgos), adoptando la misma `matriz-degradacion-plataformas.md` que este punto también cita. Este documento no repite esa resolución arquitectónica: se limita a su faceta operativa (qué configurar, qué permiso pedir, qué comando ejecutar) en §6, §7 y §8, construida sobre la matriz que `05-ARQUITECTURA.md` §6/§11 ya fija — evitando que ambos documentos mantengan tablas de resolución paralelas y potencialmente divergentes para los mismos tres hallazgos.
9. Originales v1 (`docs/originales/IMPLEMENTATION_PLAN-v1.md`): punto de partida sobre fases y orden de trabajo, no fuente de verdad — las 11 fases reales las define y ejecuta la sesión BC Orquestador Productvt, no este documento.

## 1. Requisitos de máquina

Todo se ejecuta en la máquina del creador; no hay build en la nube (§6). Requisitos mínimos:

| Componente | Versión / detalle | Para qué |
|---|---|---|
| Node.js | LTS vigente compatible con Expo SDK 57 (verificar con `npx expo-doctor` tras clonar; a la fecha de este documento, Node 20 LTS) | `npm`, `expo`, Metro bundler |
| npm | El que trae el Node.js instalado | Instalar dependencias (`package-lock.json` ya commiteado, usar `npm ci` cuando sea posible) |
| Java Development Kit (JDK) | JDK 17 (el que exige Android Gradle Plugin de Expo SDK 57) | Compilar el proyecto Android generado por `expo prebuild` |
| Android Studio + Android SDK | Última estable; SDK Platform de la API que declare `expo prebuild` (Android 14/15 al momento de este documento) + Android SDK Build-Tools + Android Emulator (opcional, ver nota) | `npx expo run:android`, generar/inspeccionar el keystore de depuración, `adb` |
| Un dispositivo Android físico o un emulador con Google Play Services | Android 8+ (mínimo soportado por Expo SDK 57) | Google Sign-In nativo (`@react-native-google-signin/google-signin`) requiere Play Services; **un emulador sin imagen "Google Play" no sirve para probar login con Google** |
| Git | Cualquier versión reciente | Clonar/versionar `productvt-beta/` |
| Editor con soporte TypeScript | Cualquiera (el repo trae `.vscode/settings.json`) | `tsconfig.json` ya en modo estricto (CODE) |
| Navegador moderno (Chrome/Edge/Firefox) | Última estable | `expo start --web`, probar la PWA espectadora e instalar el manifest (`display-mode: standalone`, RF-PLA-04) |
| Cuenta de Google | La que se use para Firebase Console y Google Cloud Console | Todo lo de §2–§4 |
| CLI de Firebase | Sin instalación fija en el proyecto (no es dependencia de `package.json`, CODE): se invoca con `npx firebase-tools@latest <comando>`, o se instala una vez de forma global con `npm install -g firebase-tools` | `firebase login`, `firebase deploy` (§4, §8) |

Notas:

- **Watchman** (recomendado por Expo en macOS/Linux para Metro) es una optimización, no un requisito duro; si no está instalado, Metro cae a polling y funciona igual, solo más lento en proyectos grandes.
- El emulador de Android es opcional: el flujo real de este proyecto siempre priorizó un dispositivo físico (es donde se prueban notificaciones en background, Doze y batería — cosas que un emulador simula mal, §7). Si se usa emulador para desarrollo rápido de UI, debe ser una imagen del sistema con "Google APIs" o "Google Play" (no "Google APIs" a secas si se quiere probar Sign-In real).
- No se requiere Xcode ni una Mac: `ios.icon` existe en `app.json` para no romper el flujo de Expo, pero iOS **no es una plataforma cubierta por V1** (`01-SPEC.md` §6.17 no lo lista; `02-DOMINIO.md` §7 tampoco). No se instala ni se prueba en iOS en esta guía.
- No se requiere ninguna tarjeta de crédito ni cuenta de facturación de Google Cloud en ningún paso de este documento (§2).

## 2. Firebase: crear el proyecto en el plan Spark y qué NO activar

Costo cero es una restricción de producto, no solo técnica (`01-SPEC.md` regla crítica 11, RNF-07): ningún archivo de configuración del proyecto puede referenciar un producto de Firebase de pago. El plan **Spark** (el que asigna Firebase por defecto a un proyecto nuevo, sin pedir tarjeta) alcanza para todo V1.

### 2.1 Crear el proyecto

1. [Firebase Console](https://console.firebase.google.com/) → "Agregar proyecto" → nombre libre (p. ej. `productvt-beta`) → **desactivar Google Analytics** (no es necesario, y activar Analytics puede empujar a habilitar productos de Google Cloud que piden facturación en proyectos con ciertas políticas de organización; RNF-09 ya excluye analítica de terceros).
2. Confirmar que el proyecto quede en plan **Spark** (Console → engranaje ⚙️ → "Uso y facturación" → debe decir "Spark: sin costo"). Si por política de la organización de Google el proyecto se crea con facturación vinculada por defecto, no activar ningún producto de pago igualmente: el plan asociado no obliga a usar productos Blaze, pero **no vincular una tarjeta si el flujo de creación no lo exige**.
3. Región: no aplica a nivel de proyecto (se elige por producto en §2.2/§4).

### 2.2 Qué SÍ activar

| Producto | Dónde | Para qué |
|---|---|---|
| **Authentication** | Build → Authentication → "Comenzar" | Email/Password + Google (§3) |
| **Firestore Database** | Build → Firestore Database → "Crear base de datos" → **modo producción** (no "modo de prueba": las reglas reales se despliegan en §4, dejar el proyecto abierto aunque sea unos minutos no es necesario) → elegir una región única (`nam5`/`us-central` u otra cercana al creador; **no se puede cambiar después sin migrar el proyecto**, elegirla con calma) | El único almacén de datos del producto (`02-DOMINIO.md` §5) |
| **Hosting** | Build → Hosting → "Comenzar" | Servir la PWA espectadora (§8); gratis, incluye HTTPS y un dominio `*.web.app`/`*.firebaseapp.com` |
| Apps registradas: 1 app **Web**, 1 app **Android** | Configuración del proyecto ⚙️ → "Tus apps" | La app Web entrega el `firebaseConfig` de `.env` (§5) y el "Web client ID" de Google (§3.2.1); la app Android entrega `google-services.json` (§3.2.2/§6) |

### 2.3 Qué NO activar (nunca, en ninguna fase de V1)

| Producto | Por qué no |
|---|---|
| **Cloud Functions** | Requiere el plan **Blaze** (pago por uso) para desplegar cualquier función, incluso si el uso real termina siendo gratis. El proyecto está diseñado para no necesitar backend propio: toda la exclusión mutua del cronómetro se resuelve con transacciones de cliente + `firestore.rules` (`02-DOMINIO.md` §5.3, `04-SINCRONIZACION.md` completo, RNF-06). |
| **Cloud Storage for Firebase** | No hay subida de archivos de usuario en V1 (RNF-07); el audio propio del dispositivo es local (D18, §9). Activarlo no cuesta nada por sí solo en Spark, pero no aporta nada a V1 y añade una superficie de reglas de seguridad que mantener sin necesidad — se deja fuera hasta que un caso de uso real lo justifique (V2 según brief §6). |
| **App Check** | Opcional y sin costo propio, pero su configuración recomendada (reCAPTCHA/Play Integrity) es fricción de setup que este proyecto de un puñado de usuarios de confianza no necesita; no está en el alcance de ninguna fase documentada. |
| **Extensions de Firebase** | Casi todas requieren Blaze (ejecutan Cloud Functions por debajo). Ninguna está en el stack (`B §6`). |
| **Cualquier upgrade a Blaze "por si acaso"** | Blaze no cobra mientras el uso esté dentro de las cuotas gratuitas, pero exige una tarjeta vinculada y cambia el comportamiento de algunos límites ("gratis hasta X" solo aplica con Blaze activo pero facturación en cero); Spark simplemente **corta** el servicio al llegar al tope diario en vez de cobrar. Para este proyecto, quedarse en Spark es la garantía más simple de costo cero (RNF-07) — un corte de servicio al tope (que §10 muestra que está lejísimos de alcanzarse) es preferible a arriesgar un cargo. |
| **Google Sign-In: verificación de la app OAuth ante Google** | El límite de ~100 usuarios de una app OAuth sin verificar se acepta conscientemente (D19, R19, `01-SPEC.md` §4.2): con un puñado de cuentas nunca se alcanza, y verificar la app es un trámite que este proyecto descarta explícitamente para no sumar costo ni fricción de proceso (RF-AUTH-05). |
| Facturación / alertas de presupuesto de Google Cloud | No hace falta configurarlas porque no hay billing vinculado; si en el futuro se agrega un usuario adicional que amerite revisar cuotas, el checklist es manual (RNF-08), no automático. |

Verificación rápida de que el proyecto sigue en Spark en cualquier momento: Console → engranaje ⚙️ → "Uso y facturación" debe seguir mostrando "Spark". Si algún flujo de configuración ofrece "mejorar el plan" para continuar, es la señal de que el paso que se está por dar no es gratuito — se detiene y se busca la alternativa listada en este documento.

## 3. Autenticación: Email/Password y Google Sign-In

Ambos proveedores se activan en Firebase Console → Authentication → Sign-in method (producto creado en §2.2). Las funciones de dominio (`registerWithEmail`, `loginWithEmail`, `signInWithGoogleIdToken`, `signInWithGooglePopupWeb`, `consumeGoogleRedirectResultWeb`, `AuthError`/`FRIENDLY_MESSAGES`) ya están commiteadas en `src/infrastructure/firebase/auth.ts` (CODE) — este documento solo cubre la configuración de Firebase/Google Cloud Console que ese código da por hecha, nunca el flujo de código en sí.

### 3.1 Email/Password

Authentication → Sign-in method → **Email/Password** → Habilitar (dejar "Email link (sin contraseña)" desactivado, no se usa). Nada más que configurar: el resto —validación, mensajes de error en español— ya vive en `auth.ts` (CODE).

### 3.2 Google Sign-In

`useGoogleSignIn.ts` (CODE) resuelve dos flujos distintos según plataforma: Android pide un `idToken` con el SDK nativo (`@react-native-google-signin/google-signin`) y lo intercambia por sesión de Firebase; web usa `signInWithPopup` del propio SDK de Firebase Auth, sin dependencia nativa. Ambos necesitan configuración de consola:

**3.2.1 Web client ID (obligatorio para las dos plataformas)**

1. Authentication → Sign-in method → **Google** → Habilitar → completar nombre público del proyecto y correo de soporte → Guardar.
2. Firebase muestra la tarjeta "Web SDK configuration" con un **Web client ID** (termina en `.apps.googleusercontent.com`). Copiarlo a `.env` como `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (§5).
3. Ese mismo ID se usa dos veces en CODE: `GoogleSignin.configure({ webClientId })` en Android (`useGoogleSignIn.ts`) para que el SDK nativo devuelva un `idToken` con la audiencia que Firebase puede validar; en web no se referencia directamente (Firebase resuelve el cliente OAuth desde la configuración del propio proyecto al llamar `signInWithPopup`).

**3.2.2 SHA-1 del keystore de depuración (solo Android)** — el paso que más se olvida; sin él, Google Sign-In en Android falla con `DEVELOPER_ERROR` aunque el Web client ID esté bien puesto (ver también §12).

1. Generar el proyecto nativo si todavía no existe: `npx expo prebuild --platform android` (§6). Gradle crea automáticamente `~/.android/debug.keystore` (contraseña `android`) si no existe.
2. Obtener el SHA-1 (y de paso el SHA-256, Firebase acepta ambos): dentro de `productvt-beta/android`, `./gradlew signingReport` → buscar el bloque `Variant: debug` → copiar `SHA1`. Alternativa sin Gradle: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`.
3. Firebase Console → ⚙️ Configuración del proyecto → pestaña General → app Android `com.productvtbeta.app` (creada en §2.2) → "Agregar huella digital" → pegar el SHA-1.
4. Descargar de nuevo `google-services.json` (mismo botón de la tarjeta de la app Android) y reemplazar el archivo en `productvt-beta/google-services.json` (raíz del paquete Expo; ya referenciado por `app.json` → `android.googleServicesFile`, CODE; el archivo está en `.gitignore` a propósito — nunca se commitea, CODE).
5. Si más adelante se firma con un keystore distinto (release), repetir los pasos 2–4 con su SHA-1: las huellas se **agregan**, no se reemplazan.

**3.2.3 Pantalla de consentimiento OAuth: agregar cuentas de prueba** — con la app sin verificar ante Google (aceptado conscientemente, D19/R19, RNF-07: verificarla es un trámite que este proyecto descarta para no sumar costo ni fricción), la pantalla de consentimiento queda en estado **Testing**, y en ese estado **solo las cuentas agregadas explícitamente como "Test users" pueden iniciar sesión** — cualquier otra ve un error de acceso bloqueado aunque el resto esté perfecto.

1. Google Cloud Console (mismo proyecto que Firebase) → APIs & Services → Pantalla de consentimiento de OAuth.
2. Tipo de usuario: **Externo**. Estado de publicación: **Pruebas** — nunca "Producción" (dispararía el proceso de verificación que se descarta, RNF-07).
3. Sección "Usuarios de prueba" → agregar la cuenta del creador y la de cada persona adicional autorizada (máximo ~100, límite aceptado por D19/R19).
4. Repetir este paso cada vez que se invite a alguien nuevo: es la causa más probable de "esta app no completó el proceso de verificación de Google" al primer intento de login de una cuenta nueva.

**3.2.4 Dominios autorizados del popup web** — Authentication → Settings → Authorized domains ya trae `localhost` y los dominios `*.web.app`/`*.firebaseapp.com` del proyecto por defecto: alcanza para `npx expo start --web` (localhost) y para el despliegue de §8 sin tocar nada.

## 4. Firestore: base de datos, reglas de seguridad e índices

`02-DOMINIO.md` §5 fija el esquema completo (rutas, campos, `firestore.rules`, `firestore.indexes.json`) — este documento no lo redefine, solo dice qué archivo crear, con qué comando desplegarlo, y cierra el único vacío operativo real: las capas de calendario personalizadas (`CalendarLayer`, brief §12) todavía no tienen regla ni índice en `02-DOMINIO.md` §5.2/§5.3 porque esa entidad se documentó como "adición propuesta" (§3.3) para una fase que BC aún no construye — no es un error de `02-DOMINIO.md`, es simplemente una fase futura. §4.3 de este documento da la extensión mínima necesaria para no llegar a la Fase de Calendario sin poder desplegarla.

### 4.1 Archivos a crear en la raíz de `productvt-beta/`

Ninguno de los tres existe todavía en el repositorio (CODE, verificado a la fecha de este documento):

| Archivo | Contenido | Cuándo se crea |
|---|---|---|
| `firestore.rules` | Copia textual y completa de `02-DOMINIO.md` §5.3, más el bloque `calendarLayers` de §4.3 cuando llegue esa fase | Ahora (aunque la Fase 3/4 todavía no tenga entidades que lo necesiten todas, no cuesta nada tenerlo desplegado desde el día 1 en vez de dejar el proyecto sin reglas) |
| `firestore.indexes.json` | Copia textual del JSON de `02-DOMINIO.md` §5.2, más las entradas de §4.3 | Ahora, se reemplaza completo cada vez que un documento de `docs/` agregue una consulta nueva |
| `firebase.json` | Referencia a los dos archivos anteriores + configuración de Hosting (§8) | Ahora |

`firebase.json` mínimo para este proyecto:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

`"public": "dist"` coincide con la carpeta que genera `npx expo export --platform web` (§8); el `rewrite` a `index.html` es obligatorio porque Expo Router hace ruteo del lado del cliente — sin él, refrescar la página en `/calendario` o cualquier ruta que no sea la raíz devuelve 404 de Hosting antes de que el router llegue a manejarla.

### 4.2 Despliegue con la CLI (gratis, sin login de facturación)

```sh
npx firebase-tools@latest login          # una vez por máquina; usa la cuenta de Google del proyecto
npx firebase-tools@latest use --add      # una vez por checkout: liga esta carpeta al proyecto Firebase creado en §2.1
npx firebase-tools@latest deploy --only firestore:rules
npx firebase-tools@latest deploy --only firestore:indexes
```

Los índices compuestos tardan minutos en construirse (Firebase Console → Firestore → Índices muestra el estado "Compilando"/"Habilitado"); una consulta que necesite un índice todavía en construcción falla con un error que **incluye un enlace directo** para crearlo — sirve como red de seguridad si `firestore.indexes.json` quedó desactualizado respecto de una consulta nueva. Redesplegar reglas o índices no tiene costo ni límite de frecuencia relevante en Spark.

### 4.3 Extensión para calendario por capas (`CalendarLayer`, brief §12) — propuesta de este documento

`02-DOMINIO.md` §3.3 ya fija la interfaz `CalendarLayer` y su ruta (`users/{uid}/calendarLayers/{layerId}`), pero esa entidad quedó fuera de §5.2 (tabla de índices) y §5.3 (`firestore.rules`) porque la Fase de Calendario todavía no arranca. Sin lo que sigue, `calendarLayers` quedaría **denegado por el catch-all** `match /{document=**} { allow read, write: if false; }` (ninguna regla dentro de `match /users/{uid}` la cubre todavía) y la consulta de una capa personalizada por categoría fallaría por falta de índice. Se documenta aquí, no se redefine el esquema: cuando BC construya la Fase de Calendario, este bloque debe copiarse a `02-DOMINIO.md` §5.3 y la tabla de §5.2 (ver Supuestos pendientes).

Regla (mismo patrón que `categories`/`goals`, CODE):

```text
// PROPUESTO — agregar dentro de match /users/{uid} en firestore.rules, junto a las demás
match /calendarLayers/{layerId} {
  allow read: if isOwner(uid);
  allow create, update: if isOwner(uid) && hasUserId(uid) && versionOk()
    && incoming().id == layerId
    && incoming().name is string
    && incoming().categoryIds is list && incoming().categoryIds.size() > 0
    && incoming().isVisible is bool;
  allow delete: if isOwner(uid);
}
```

Índice nuevo: una capa personalizada agrupa categorías de **cualquier `type`** (brief §12, punto 2), así que necesita leer `events` (las invisibles) filtrando por una lista de `categoryId` — algo que el índice ya existente de `02-DOMINIO.md` §5.2 (`events (isDeleted ASC, startAt ASC)`) no cubre. Las sesiones (`study`/`inverse`) de esa misma capa **no** necesitan un índice nuevo: el cliente ejecuta dos consultas en paralelo (una por `type`) contra el índice ya existente `sessions (type ASC, categoryId ASC, startedAt ASC)`, usando `where('categoryId', 'in', categoryIds)` (hasta 10 valores por consulta, Firestore lo trata como el mismo shape de índice que una igualdad).

```json
// PROPUESTO — agregar a la lista "indexes" de firestore.indexes.json (02-DOMINIO.md §5.2), sin tocar las entradas existentes
{ "collectionGroup": "events", "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isDeleted", "order": "ASCENDING" },
    { "fieldPath": "categoryId", "order": "ASCENDING" },
    { "fieldPath": "startAt", "order": "ASCENDING" }
  ] }
```

La capa **de meta** (`WeeklyGoal.layerVisible`, virtual) no necesita nada nuevo: filtra por un único `categoryId` de tipo `study`, ya cubierto por el índice `sessions (type ASC, categoryId ASC, startedAt ASC)` que exige "histórico completo" (brief §12, punto 1).

## 5. Variables de entorno: `.env` desde `.env.example`

`productvt-beta/.env.example` (CODE) ya documenta cada variable en sus propios comentarios — este documento no los repite palabra por palabra, solo da la tabla de referencia rápida y el procedimiento.

```sh
cp productvt-beta/.env.example productvt-beta/.env
```

| Variable | De dónde sale | Sección de este documento |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase Console → ⚙️ Configuración del proyecto → Tus apps → app Web → "SDK setup and configuration" → Config | §2.2 |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Idem (campo `authDomain`) | §2.2 |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Idem (campo `projectId`) | §2.1 |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Idem (campo `storageBucket`; existe aunque Storage no se active, §2.3) | §2.2 |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Idem | §2.2 |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Idem, específico de la app **Web** registrada | §2.2 |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Authentication → Sign-in method → Google → "Web SDK configuration" | §3.2.1 |

Notas operativas:

- Todas llevan el prefijo `EXPO_PUBLIC_` a propósito (`client.ts`, CODE): Expo las inyecta en el bundle de cliente en build/dev time. Ninguna es secreta — la seguridad real la dan `firestore.rules` (§4), no ocultar estos valores (son públicos por diseño en cualquier app cliente de Firebase).
- **Expo no recarga variables de entorno en caliente**: tras crear o editar `.env` hay que reiniciar `npx expo start` (matar el proceso y volver a correrlo); Fast Refresh normal no basta.
- `warnIfFirebaseConfigIncomplete()` (CODE, `client.ts`) imprime en consola qué variable falta en vez de crashear al importar — si la app arranca pero cualquier pantalla de auth/datos falla, lo primero es mirar esa advertencia.
- No existe (ni hace falta) un Android client ID en `.env`: Google valida el Sign-In nativo por `android.package` + SHA-1 registrados en consola (§3.2.2), no por variable de entorno.
- `.env` está en `.gitignore` (CODE); `.env.example` nunca se ignora — es la documentación viva de qué variables existen.

## 6. Development build local de Android (por qué no Expo Go ni EAS Build)

Decisión ya tomada, no se reabre aquí (D17, R17, `01-SPEC.md` §4.2, `03-requisitos/revision-spec-beta.md` REV-ALTA-5): este proyecto usa un **development build local** desde la Fase 4 (núcleo del cronómetro) en adelante. Este documento solo da los comandos y el porqué operativo de cada uno.

### 6.1 Por qué no Expo Go

Expo Go es un contenedor genérico que no incluye módulos nativos que este proyecto ya tiene como dependencia commiteada (CODE, `package.json`): `@react-native-google-signin/google-signin` (Google Sign-In nativo en Android, §3.2) y las notificaciones locales confiables en segundo plano que exige el cronómetro (`expo-notifications`, §7) no funcionan con garantías dentro de Expo Go — el sandbox de Expo Go solo trae los módulos que Expo empaquetó de antemano, no los que un proyecto agrega. Expo Go sirve únicamente para iterar pantallas sin alarmas ni Google Sign-In (brief §6); nada del cronómetro se prueba ahí.

### 6.2 Por qué no EAS Build (aunque exista y sea gratis para builds ocasionales)

EAS Build en la nube consume una cuota que, superado cierto volumen, exige el plan pago de Expo — y aunque hoy EAS ofrece cierto margen gratuito, depender de un servicio de terceros con un límite que puede cambiar contradice la restricción dura de costo cero (D17, RNF-07: "sin costo monetario adicional" es explícito y repetido por el creador). El **development build local** compila en la máquina del creador con Android Studio/Gradle (§1) sin depender de ninguna cuota externa, a cambio de que la primera compilación sea más lenta que un build en la nube — costo aceptado a propósito.

### 6.3 Comandos

```sh
cd productvt-beta
npx expo prebuild --platform android      # genera/regenera la carpeta android/ (gitignored, CODE)
npx expo run:android                      # compila el APK de debug, lo instala y abre el dev client
```

- `npx expo run:android` requiere un dispositivo Android físico conectado por USB con depuración habilitada, o un emulador con imagen **Google Play** ya iniciado (§1) — sin Play Services, Google Sign-In no funciona en el emulador aunque el resto de la app sí.
- La primera corrida es la más lenta (compila Gradle desde cero, minutos). Corridas siguientes durante desarrollo normal **no** necesitan repetir `run:android`: `npx expo start --dev-client` reconecta el bundle JS al dev client ya instalado (recarga de JS al vuelo, igual que Expo Go).
- Cuándo sí hay que repetir `npx expo prebuild` + `npx expo run:android` (regla general: cualquier cambio que Metro por sí solo no puede aplicar): agregar/actualizar un módulo con código nativo (nueva dependencia con carpeta `android/`), cambiar algo en `app.json` que afecte al proyecto nativo generado (plugins, `android.package`, íconos, permisos), o reemplazar `google-services.json` (§3.2.2).
- `npx expo prebuild --clean` fuerza a regenerar `android/` desde cero (borra la carpeta y la reconstruye desde `app.json` + plugins) — usarlo si el proyecto nativo quedó en un estado raro tras cambios manuales o una actualización de Expo SDK.
- Verificación de entorno antes de compilar: `npx expo-doctor` (ya mencionado en §1) detecta versiones de Node/JDK/Android SDK incompatibles antes de que el error aparezca a mitad de un build de Gradle.

## 7. Notificaciones en segundo plano (Android)

Resuelve la faceta operativa de REV-ALTA-5 y REV-MEDIA-15 (`revision-spec-beta.md`): viabilidad de alarmas en background, Android 12+/Doze y optimización de batería. La caracterización de **qué tan confiable** es cada mecanismo ya está fijada en `03-requisitos/matriz-degradacion-plataformas.md` §1 (cita, no se repite aquí: notificación local programada = alta confiabilidad con matices, motor por timestamps que no depende de background, riesgo residual = Doze/fabricantes agresivos). Este documento cubre qué configurar y qué pedirle al sistema operativo para llegar a ese nivel de confiabilidad.

### 7.1 Estado del código a la fecha de este documento

`app.json` (CODE) todavía **no** incluye el plugin `expo-notifications` en su lista de `plugins` — es esperable: la programación real de notificaciones es de la Fase 4/4b (cronómetro/sincronización, en curso), y `03-CRONOMETRO.md` §11 ya especifica qué notificación programa cada transición. Cuando esa fase agregue el adaptador en `src/infrastructure/notifications/` (brief §7), `app.json` debe incorporar el plugin con su configuración de ícono/color, por ejemplo:

```json
[
  "expo-notifications",
  {
    "icon": "./assets/images/notification-icon.png",
    "color": "#3A6B54",
    "defaultChannel": "productvt-timer"
  }
]
```

Cualquier cambio de configuración de este plugin exige repetir `npx expo prebuild` + `npx expo run:android` (§6.3) — es exactamente el tipo de cambio nativo que Metro no puede aplicar en caliente.

### 7.2 Permiso de notificaciones (Android 13+)

Desde Android 13 (API 33), `POST_NOTIFICATIONS` es un permiso en tiempo de ejecución, no uno que se otorgue solo al instalar. `expo-notifications` lo pide con `Notifications.requestPermissionsAsync()`; la app debe llamarlo antes del primer intento de iniciar una sesión de estudio o un bloque inverso (no en el arranque de la app, para no pedirlo antes de que el usuario entienda por qué). Si el usuario lo rechaza, la sesión igual puede correr (el motor por timestamps no depende de la notificación, `03-CRONOMETRO.md` §10.4) pero no habrá alarma sonora al vencer una ventana — advertirlo en la UI es responsabilidad de la fase de cronómetro, no de este documento.

### 7.3 Exención de optimización de batería

No existe una API de Expo que la conceda automáticamente sin fricción del sistema operativo — es, por diseño de Android, una acción que el usuario debe confirmar. Procedimiento manual (documentarlo en la app como parte del onboarding, ejecutarlo ahora a mano para probar):

1. Ajustes del sistema Android → Apps → Productvt Beta → Batería → "Sin restricciones" (la redacción exacta varía por fabricante: Samsung dice "Uso de batería sin restricciones", Xiaomi/MIUI tiene un paso adicional en "Ahorro de batería de la app").
2. Alternativa programática para más adelante (no commiteada todavía, CODE no la tiene): el paquete `expo-intent-launcher` (gratis, sin costo de plan) puede abrir directamente `IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)` para saltar al ajuste exacto sin que el usuario navegue el menú — si BC lo agrega, es una dependencia más en `package.json`, sin implicación de costo.
3. Este paso es una mitigación, no una garantía: `matriz-degradacion-plataformas.md` §1 ya documenta que algunos fabricantes (Xiaomi, Huawei, algunos Samsung) pueden retrasar o descartar la notificación igual — riesgo de plataforma aceptado, no bloqueante, porque el motor por timestamps reconstruye el tiempo real al reabrir la app.

### 7.4 Verificación rápida de que las notificaciones funcionan de verdad

Antes de dar por buena una instalación: iniciar un bloque corto (usar un preset de prueba de 1–2 min), **bloquear la pantalla del teléfono** y esperar a que el bloque termine — debe sonar y aparecer la notificación con la pantalla bloqueada. Repetir con la app **cerrada por completo** (deslizada fuera de recientes), no solo en background: es el caso que realmente separa "notificación programada por el SO" de "temporizador que solo corre mientras el proceso vive", y es exactamente lo que Expo Go no puede sostener (§6.1).

## 8. Web: desarrollo, export y despliegue a Firebase Hosting (PWA espectadora)

Resuelve la faceta operativa de REV-ALTA-6 (riesgos técnicos de la versión web). Importante no confundir dos roles distintos que la web cumple en V1 (brief §6, brief §12, `01-SPEC.md` §5.1/§6.17): **espectadora** del cronómetro (ve el conteo, no lo acciona — degradación descrita en `matriz-degradacion-plataformas.md` §2) pero **plataforma primaria e igual de completa que Android** para calendario, estadísticas, categorías, presets, metas y ajustes — y desde el brief §12, el calendario por capas explícitamente "es de uso primario en ambas plataformas (desktop y celular) — responsive real, no solo que quepa". Esto tiene una consecuencia directa para cómo se prueba antes de cada despliegue (§8.4): el cronómetro en web se verifica con una mirada rápida (¿el conteo se ve e interpola bien?); el calendario en web **no** — necesita la misma batería de pruebas completa que Android, porque ahí es donde una parte real de los usuarios lo va a usar de verdad.

### 8.1 Desarrollo local

```sh
npx expo start --web
```

Abre en el navegador configurado por defecto (usualmente `http://localhost:8081`); `localhost` ya está en la lista de dominios autorizados de Firebase Auth (§3.2.4), así que el login con Google por popup funciona sin configuración adicional. `react-native-web` (CODE, ya en `package.json`) resuelve los mismos componentes de `src/` sin una capa de UI separada.

### 8.2 Export estático

```sh
npx expo export --platform web
```

Genera la carpeta `dist/` (gitignored por convención de Expo — no está listada hoy en `.gitignore`, pero tampoco se commitea nunca: es un artefacto de build, se regenera en cada despliegue) con HTML/JS/CSS estáticos y el manifest de `app.json` → `web` (CODE: `output: "static"`, `favicon`). Antes de desplegar, verificar puntualmente que el manifest generado declare `"display": "standalone"` (necesario para que el navegador ofrezca "Instalar aplicación" y para que desktop sea la PWA instalada, brief §6, RF-PLA-04): si el export por defecto de esta versión de Expo no lo incluye, agregar la configuración correspondiente en `app.json` → `web` queda para la fase de pulido (`08-PLAN-IMPLEMENTACION.md`), no es un paso de este documento operativo.

### 8.3 Despliegue a Firebase Hosting

```sh
npx firebase-tools@latest deploy --only hosting
```

Usa el `firebase.json` de §4.1 (`"public": "dist"`). Al terminar, la CLI imprime la URL `https://<project-id>.web.app` (o `.firebaseapp.com`) — es la única forma de acceso (§2.1: no se promociona ni se indexa). Cada despliegue reemplaza la versión anterior por completo y sin tiempo de inactividad (Hosting de Firebase versiona internamente; `firebase hosting:rollback` revierte al despliegue anterior si algo sale mal, sin costo).

### 8.4 Qué probar antes de cada despliegue — distinto según el módulo

| Módulo | Cómo se prueba en web antes de desplegar | Por qué |
|---|---|---|
| Cronómetro (espectador) | Con una sesión activa en Android, abrir la web y confirmar que el conteo aparece e interpola sin acción posible sobre los controles (deshabilitados, RF-PLA-01) | Es un rol secundario de solo lectura; una verificación visual basta |
| Calendario (todas las vistas y capas) | Recorrer las 5 vistas (año/mes/semana/3 días/día) y activar/desactivar cada tipo de capa (de meta y personalizada, brief §12) en un navegador de escritorio **y** con el viewport de un teléfono (`Chrome DevTools` → modo responsive, o `resize_window` si se prueba con un agente de navegador) | Plataforma primaria, no espectadora — un defecto aquí afecta uso real, no solo una vista de cortesía |
| Estadísticas, metas, categorías/presets/ajustes | CRUD completo (crear, editar, archivar/borrar donde aplique) en el navegador de escritorio | Mismo criterio: control completo, no degradado (`01-SPEC.md` §6.17 RF-PLA-03) |
| Instalación como PWA | Instalar desde el navegador ("Instalar aplicación"/ícono en la barra de direcciones) y confirmar que abre en su propia ventana sin barra de navegador (`display-mode: standalone`) | Verifica RF-PLA-04 (desktop = la PWA instalada, no una pestaña más) |

## 9. Sonidos (`assets/sounds`)

`src/features/settings/domain/sound-catalog.ts` (CODE) ya fija el catálogo de sonidos predefinidos como dominio puro — `SOUND_OPTIONS` (cuatro ids: `default_study_finished`, `default_break_finished`, `default_inverse_reminder`, `chime_bright`) y `SOUND_SLOTS` (qué ranura de `UserSettings.soundPreferences`, `02-DOMINIO.md` §3.2, usa cada sonido: fin de estudio, "toca estudiar"/fin de descanso, recordatorio del inverso cada 15 min). Ese archivo es solo el catálogo de **ids y etiquetas**; los archivos de audio reales todavía no existen en el repositorio — CODE los reserva explícitamente para la Fase 4 (núcleo del cronómetro, `expo-audio`), que puede reutilizar estos mismos ids como claves de sus assets.

### 9.1 Dónde van los archivos y cómo se llaman

Carpeta `productvt-beta/assets/sounds/` (no existe todavía, se crea en la Fase 4): un archivo de audio por cada `id` de `SOUND_OPTIONS`, con el id como nombre de archivo:

```
assets/sounds/
  default_study_finished.mp3
  default_break_finished.mp3
  default_inverse_reminder.mp3
  chime_bright.mp3
```

`expo-audio` (CODE, ya en `package.json`) reproduce `.mp3`, `.wav` o `.aac` sin diferencia relevante de confiabilidad para este caso de uso — `.mp3` alcanza y mantiene los archivos livianos (cada sonido de notificación debería pesar pocos KB, sonidos de 1–3 segundos).

### 9.2 De dónde salen los archivos, a costo cero

- **Freesound.org**, filtrando por licencia **CC0** (dominio público, sin atribución obligatoria) — es la fuente recomendada: gratis, sin trámite de licencia que documentar, sin riesgo de reclamo de derechos. Evitar licencias CC-BY que exigen atribución visible en la app si se quiere evitar ese mantenimiento.
- Grabación propia (un golpe de campana, un timbre) con el micrófono del teléfono — cero costo, cero duda de licencia.
- Nunca usar un sonido extraído de un producto comercial (juegos, apps de terceros) aunque "suene parecido": aunque el proyecto sea de uso privado (§4.2), no hay necesidad de asumir ese riesgo pudiendo conseguir un CC0 equivalente gratis.

### 9.3 Audio personalizado del usuario (no es un asset del repositorio)

`productvt.customSoundUri` (`02-DOMINIO.md` §6.4) es una preferencia **local por dispositivo**, elegida con `expo-document-picker` (D18: no sincronizada entre dispositivos, evita Storage de pago en V1) — no se agrega nada a `assets/sounds/` ni al repositorio para esta función: el usuario elige un archivo ya presente en su propio dispositivo y la app solo guarda su URI local en AsyncStorage.

## 10. Cuotas del plan Spark: estimación de uso

`04-SINCRONIZACION.md` §12 ya calculó el escenario completo y generoso (1 usuario, hasta 2 dispositivos simultáneos, 5 sesiones/día de 6 bloques, espectador conectado toda la sesión): **≈300 escrituras/borrados diarios contra una cuota de 20 000** (margen >60×) y **≈200–400 lecturas diarias contra 50 000** (margen >100×) — cita, no se repite el cálculo aquí. Este documento solo agrega las cuotas de los otros dos productos activados en §2.2 que ese documento no cubre, y el procedimiento de revisión manual.

| Producto | Cuota gratuita Spark (verificar cifra vigente en [firebase.google.com/pricing](https://firebase.google.com/pricing) antes de un cambio grande de uso) | Situación de este proyecto |
|---|---|---|
| Firestore — lecturas/escrituras/borrados | 50 000 / 20 000 / 20 000 por día | Ver `04-SINCRONIZACION.md` §12: muy por debajo con margen amplio |
| Firestore — almacenamiento total | ~1 GiB | Una sesión típica pesa <8 KB (`02-DOMINIO.md` §5.1); miles de sesiones no se acercan al límite |
| Authentication (Email/Password + Google) | Sin cuota diaria relevante para este volumen de cuentas (el único límite con cuota real es SMS de verificación telefónica, que este proyecto no usa) | Sin riesgo con un puñado de cuentas (§2.3, D19) |
| Hosting — almacenamiento / transferencia | Del orden de 10 GB almacenados y cientos de MB/día de transferencia (cifra exacta a confirmar en la página de precios vigente) | El export estático de esta app pesa unos pocos MB; un puñado de usuarios ni se acerca |

Procedimiento de revisión manual (RNF-08: no hay umbral automático de reevaluación del stack en V1): antes de invitar a una persona adicional a usar la app, revisar Firebase Console → Uso y facturación → pestaña de cada producto, y comparar el uso de los últimos 30 días contra las cifras de esta tabla. Si algún producto se acerca a, digamos, el 20% de su cuota diaria de forma sostenida, es señal de revisar el patrón de uso (¿demasiados espectadores conectados a la vez? ¿un bucle de lecturas mal cacheado?) antes de sumar más cuentas — nunca de "mejorar el plan" (§2.3).

## 11. Respaldo manual de datos

Distinto de RNF-10 "Exportar mis datos"/"Borrar mi cuenta" (`01-SPEC.md` §8.4, funcionalidad de **producto** para el usuario final, V1.5, todavía no construida): esto es un respaldo de **administrador** (el creador, dueño del proyecto Firebase), operable hoy, a costo cero, sin esperar a V1.5.

### 11.1 Por qué no `gcloud firestore export`

El export/import administrado de Firestore (`gcloud firestore export gs://...`) escribe a un bucket de Cloud Storage y es, en la práctica, una funcionalidad que Google factura por el uso de Cloud Storage/Dataflow subyacente — no hay garantía de que quede dentro de un plan Spark sin billing habilitado. Se descarta explícitamente para no arriesgar un cargo (misma lógica que "no activar Blaze por si acaso", §2.3).

### 11.2 Alternativa a costo cero: script local con credenciales de aplicación por defecto

Un script Node de una sola vez, ejecutado a mano por el creador, que lee las colecciones bajo `users/{uid}` y las vuelca a un archivo JSON local. Usa `firebase-admin` (paquete npm gratis; las lecturas que hace cuentan contra la misma cuota gratuita de Firestore ya estimada en §10, sin necesitar Blaze) autenticado con credenciales de aplicación por defecto de `gcloud` — así se evita generar y proteger un archivo de clave de cuenta de servicio.

1. Instalar la CLI de Google Cloud (gratis) y autenticar: `gcloud auth application-default login` con la cuenta dueña del proyecto Firebase.
2. Guardar como `productvt-beta/scripts/backup-firestore.mjs` (no se ejecuta nunca dentro de la app, es una herramienta de operación — igual que `scripts/reset-project.js` ya commiteado, CODE):

```js
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync } from 'node:fs';

const UID = process.argv[2]; // uid del usuario a respaldar
const COLLECTIONS = [
  'profile', 'settings', 'categories', 'presets', 'sessions',
  'events', 'goals', 'calendarLayers', 'layouts', 'inventory',
];

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const backup = {};
for (const name of COLLECTIONS) {
  const snap = await db.collection(`users/${UID}/${name}`).get();
  backup[name] = snap.docs.map((d) => d.data());
}

const fileName = `backup-${UID}-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(fileName, JSON.stringify(backup, null, 2));
console.log(`Respaldo escrito en ${fileName}`);
```

3. Ejecutar: `node scripts/backup-firestore.mjs <uid>` (el `uid` se ve en Firebase Console → Authentication → lista de usuarios).
4. Guardar el JSON resultante fuera del repositorio (una carpeta local o un almacenamiento personal ya existente, sin costo adicional) — nunca commitearlo, contiene datos personales de comportamiento (RNF-09).
5. `calendarLayers` en la lista de arriba no falla si la colección todavía no existe (una fase futura, §4.3): `snap.docs` simplemente devuelve un arreglo vacío.

Frecuencia sugerida: antes de cualquier migración de esquema grande (`02-DOMINIO.md` §6.5) y, de ahí en más, manualmente cada cierto tiempo (p. ej. mensual) — no hay Cloud Functions para automatizarlo sin costo (RNF-06/RNF-07), así que queda como tarea manual del creador, igual que la revisión de cuotas de §10.

## 12. Troubleshooting

| Síntoma | Causa probable | Dónde resolverlo |
|---|---|---|
| Google Sign-In en Android falla con `DEVELOPER_ERROR` | Falta el SHA-1 del keystore usado, o se registró un SHA-1 de un keystore distinto al que firmó el APK instalado | §3.2.2: repetir `signingReport`, agregar la huella correcta en Firebase Console, redescargar `google-services.json` |
| Google Sign-In muestra "esta app no completó el proceso de verificación de Google" (bloquea el login) | La cuenta que intenta entrar no está en la lista de "Test users" de la pantalla de consentimiento OAuth | §3.2.3: agregarla en Google Cloud Console → Pantalla de consentimiento → Usuarios de prueba |
| `GoogleSignin.signIn()` no devuelve `idToken` (solo `accessToken`) | `webClientId` no configurado o vacío al llamar `GoogleSignin.configure` | §3.2.1: verificar que `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` esté en `.env` y que se reinició `expo start` tras editarlo (§5) |
| `firebase: auth/invalid-api-key` o pantallas de auth fallan silenciosamente | `.env` no existe o le faltan variables; o se editó sin reiniciar el servidor de desarrollo | §5: `cp .env.example .env`, completar, reiniciar `npx expo start`; revisar la advertencia de `warnIfFirebaseConfigIncomplete` en consola |
| Firestore responde `permission-denied` en una operación que debería estar permitida | `firestore.rules` desplegado no coincide con `02-DOMINIO.md` §5.3 (desactualizado o editado a mano sin redesplegar), o el usuario no está autenticado | §4.2: redesplegar `firebase deploy --only firestore:rules`; confirmar sesión activa con `onAuthStateChangedListener` |
| Una consulta nueva de calendario/estadísticas/metas falla pidiendo un índice | `firestore.indexes.json` no incluye el índice compuesto que esa consulta necesita | §4.2/§4.3: el error de Firestore trae un enlace que crea el índice exacto; agregarlo también a `firestore.indexes.json` para que sobreviva un redeploy limpio |
| `npx expo run:android` falla en la etapa de Gradle con error de versión de JDK | JDK instalado no es la 17 que exige el Android Gradle Plugin de Expo SDK 57 | §1: instalar/seleccionar JDK 17; verificar con `npx expo-doctor` |
| `npx expo prebuild` falla o el proyecto Android queda en estado inconsistente tras cambiar `app.json` | Carpeta `android/` generada antes del cambio de plugins/config, ahora desincronizada | §6.3: `npx expo prebuild --clean` para regenerarla desde cero |
| Las notificaciones no suenan con la app cerrada, solo con la app abierta | `expo-notifications` no está configurado como plugin en `app.json` todavía (§7.1, esperable antes de la Fase 4/4b), o no se pidió el permiso `POST_NOTIFICATIONS` (§7.2) | §7.1/§7.2: agregar el plugin y reconstruir (§6.3); confirmar que se llamó `requestPermissionsAsync()` |
| Las notificaciones a veces no suenan en un teléfono Xiaomi/Huawei/Samsung específico, incluso con permisos y exención de batería correctos | Riesgo residual documentado y aceptado (`matriz-degradacion-plataformas.md` §1): app-killers agresivos de fabricante | Sin fix adicional en V1; el motor por timestamps reconstruye el tiempo real al reabrir la app (`03-CRONOMETRO.md` §10.4) |
| La PWA no ofrece "Instalar aplicación" en el navegador de escritorio | El manifest exportado no declara `display: standalone`, o el sitio no se sirve por HTTPS (Firebase Hosting sí lo hace por defecto) | §8.2: verificar el manifest generado por `expo export --platform web` |
| Al refrescar una ruta que no es la raíz en la web desplegada (p. ej. `/calendario`) aparece un 404 de Hosting | Falta el `rewrite` a `index.html` en `firebase.json` | §4.1: confirmar que `firebase.json` tiene la sección `rewrites` mostrada ahí |
| Un espectador en web ve el cronómetro desincronizado por varios segundos del dominante | Reloj del dispositivo espectador muy desviado y `clockOffset` todavía no recalculado, o problema de red | No es un bug de configuración de este documento — ver `04-SINCRONIZACION.md` §6 (`clockOffset`) y §13.4 (caso límite de reloj desviado) |
| TypeScript se queja de que `getReactNativePersistence` no existe en `firebase/auth` | Gap conocido y documentado en el propio código (CODE, `client.ts`, comentario `@ts-expect-error`) — la función sí existe en runtime, es un problema de tipado del paquete `firebase` | No requiere acción: ya está resuelto con el `@ts-expect-error` documentado; no "arreglarlo" quitando el import |
| `npm ci`/`npm install` falla o trae versiones distintas a las commiteadas | `package-lock.json` desincronizado con el `package.json` local, o se usó `npm install` en vez de `npm ci` sobre un checkout limpio | §1: preferir `npm ci` quhen el `package-lock.json` ya está commiteado (CODE) |

## 13. Checklist final de setup

Orden recomendado (cada ítem depende de que los anteriores estén hechos):

- [ ] Máquina con Node LTS compatible, JDK 17, Android Studio + SDK, `adb` funcionando (`npx expo-doctor` sin errores) — §1.
- [ ] Dispositivo Android físico (o emulador con imagen Google Play) disponible y detectado por `adb devices` — §1.
- [ ] Proyecto Firebase creado en plan **Spark**, Analytics desactivado — §2.1.
- [ ] Authentication, Firestore Database (modo producción, región elegida con calma) y Hosting activados; **ningún** producto de §2.3 activado — §2.2/§2.3.
- [ ] App Web y app Android (`com.productvtbeta.app`) registradas en el proyecto Firebase — §2.2.
- [ ] Email/Password habilitado en Authentication — §3.1.
- [ ] Google habilitado en Authentication; Web client ID copiado — §3.2.1.
- [ ] SHA-1 de depuración agregado a la app Android; `google-services.json` descargado y colocado en `productvt-beta/` — §3.2.2.
- [ ] Pantalla de consentimiento OAuth en modo Pruebas, con todas las cuentas que van a usar la app agregadas como "Test users" — §3.2.3.
- [ ] `firebase.json`, `firestore.rules` (copia de `02-DOMINIO.md` §5.3 + bloque `calendarLayers` si ya corresponde) y `firestore.indexes.json` (copia de `02-DOMINIO.md` §5.2 + extensión de §4.3 si ya corresponde) creados en la raíz de `productvt-beta/` — §4.1.
- [ ] Reglas e índices desplegados (`firebase deploy --only firestore:rules` y `--only firestore:indexes`), índices en estado "Habilitado" en la consola — §4.2.
- [ ] `.env` creado desde `.env.example` con las 7 variables completas — §5.
- [ ] `npx expo prebuild --platform android` + `npx expo run:android` corren sin error; la app abre en el dispositivo — §6.
- [ ] Login con Email/Password y con Google funcionan en Android — §3, §6.
- [ ] Exención de optimización de batería concedida en el dispositivo de prueba; permiso de notificaciones aceptado — §7.2/§7.3.
- [ ] Prueba de notificación con pantalla bloqueada y con la app completamente cerrada, ambas exitosas — §7.4.
- [ ] `npx expo start --web` abre y permite login con Google por popup — §8.1.
- [ ] `npx expo export --platform web` + `firebase deploy --only hosting` publican la PWA; la URL `*.web.app` carga y se puede instalar como app de escritorio — §8.2/§8.3.
- [ ] Calendario, estadísticas, categorías/presets y metas probados con control completo en la web desplegada (no solo Android) — §8.4.
- [ ] Al menos un sonido de cada ranura (`SOUND_SLOTS`) presente en `assets/sounds/` con licencia CC0 o grabación propia — §9.
- [ ] Script de respaldo manual probado al menos una vez contra el proyecto real, con el JSON resultante guardado fuera del repositorio — §11.

## Supuestos pendientes de confirmar

Solo los supuestos de este documento que son de configuración/operación, no de producto ni de modelo de datos (esos ya están en `01-SPEC.md`/`02-DOMINIO.md`/`03-CRONOMETRO.md`/`04-SINCRONIZACION.md` y no se repiten).

| # | Supuesto | Default asumido aquí | Si BC/el creador decide distinto |
|---|---|---|---|
| 1 | Regla e índice de `calendarLayers` (§4.3) todavía no están en `02-DOMINIO.md` §5.2/§5.3 porque esa entidad es una "adición propuesta" para una fase futura | Se documentan aquí como propuesta operativa, lista para copiarse a `02-DOMINIO.md` cuando BC construya la Fase de Calendario | Si el diseño final de las consultas de calendario por capas resulta distinto (p. ej. un assembler que agrupe distinto a lo asumido en §4.3), quien escriba esa fase debe actualizar tanto `02-DOMINIO.md` §5.2/§5.3 como este documento en el mismo cambio, para que no queden desincronizados |
| 2 | Configuración exacta del plugin `expo-notifications` en `app.json` (ícono, color, canal) — §7.1 | Placeholder razonable (`#3A6B54`, acento del skin "Papel", brief §8) hasta que BC defina el asset real de ícono de notificación | Cambiar el ícono/color no afecta nada de este documento más allá del ejemplo de §7.1 |
| 3 | `expo-intent-launcher` para abrir directamente el ajuste de exención de batería (§7.3) | No es dependencia todavía; el paso manual de §7.3 punto 1 es suficiente para operar hoy | Si BC lo agrega en la Fase 4, este documento debe sumar el comando/llamada exacta como alternativa preferida al paso manual |
| 4 | El export web de esta versión de Expo genera un manifest con `display: standalone` sin configuración adicional (§8.2) | Se asume que sí (comportamiento por defecto de Expo Router en export estático) pero se marca como "verificar puntualmente" en vez de darlo por hecho | Si no lo genera así, agregar la configuración en `app.json` → `web` es tarea de la fase de pulido (`08-PLAN-IMPLEMENTACION.md`), no de este documento |
| 5 | Cifras exactas de cuota gratuita de Firebase Hosting (almacenamiento/transferencia, §10) | Aproximadas a la fecha de redacción; explícitamente marcadas "verificar en la página de precios vigente" | Si Google cambia estos números, no afecta ninguna regla de este documento — solo el margen de holgura reportado en la tabla de §10 |
| 6 | Nombre exacto y ubicación del script de respaldo manual (`scripts/backup-firestore.mjs`, §11.2) | Se documenta como convención sugerida, no commiteada todavía | Puede vivir en cualquier ruta que el creador prefiera; lo único que importa es que nunca se commitee el JSON resultante ni credenciales de servicio |

## Trazabilidad

| Sección de este documento | Regla / decisión | Fuente(s) |
|---|---|---|
| §1 — Requisitos de máquina | JDK 17, Android SDK, emulador con Google Play para Sign-In, sin Xcode/Mac (iOS fuera de V1) | CODE (`package.json`, Expo SDK 57), `01-SPEC.md` §6.17, `02-DOMINIO.md` §7 |
| §2.1–§2.2 — Crear proyecto Spark, qué activar | Auth + Firestore + Hosting; sin Analytics; región de Firestore elegida una sola vez | RNF-07, `01-SPEC.md` §8.3, `02-DOMINIO.md` §5 |
| §2.3 — Qué NO activar | Sin Cloud Functions/Storage/App Check/Extensions/Blaze/verificación OAuth | D "Confiabilidad técnica", D19, R17, R19, RNF-07, brief §6 |
| §3.1 — Email/Password | Proveedor simple, sin Email link | CODE (`auth.ts`, `FRIENDLY_MESSAGES`), `01-SPEC.md` §6.1 |
| §3.2 — Google Sign-In (Web client ID, SHA-1, test users, dominios) | Flujo dual Android/web ya commiteado; límite ~100 usuarios sin verificar aceptado | CODE (`useGoogleSignIn.ts`, `auth.ts`), D19, R19, `01-SPEC.md` §4.2 |
| §4.1–§4.2 — Archivos `firebase.json`/`firestore.rules`/`firestore.indexes.json`, despliegue por CLI | Esquema, reglas e índices ya fijados, solo se citan y despliegan | `02-DOMINIO.md` §5.1, §5.2, §5.3 |
| §4.3 — Extensión `calendarLayers` (regla + índice de `events` por `categoryId`) | Entidad y ruta ya definidas; regla/índice de despliegue son propuesta operativa de este documento | B §12, `02-DOMINIO.md` §3.3, D "Alcance — Calendario por capas" |
| §5 — Variables de entorno | Prefijo `EXPO_PUBLIC_`, sin secretos de servidor, sin Android client ID en `.env` | CODE (`.env.example`, `client.ts`) |
| §6 — Development build local, no Expo Go ni EAS | Restricción dura de costo cero y confiabilidad de notificaciones/Google Sign-In nativo | D17, R17, `01-SPEC.md` §4.2, REV-ALTA-5 |
| §7 — Notificaciones en background, batería, permiso Android 13+ | Confiabilidad "alta con matices"; riesgo residual de Doze/fabricante aceptado | `matriz-degradacion-plataformas.md` §1, REV-ALTA-5, REV-MEDIA-15, `03-CRONOMETRO.md` §11 |
| §8 — Web: dev/export/deploy, calendario como plataforma primaria | Espectador solo para el cronómetro; control completo (incluido calendario por capas) en web/desktop | B §6, B §12, D "Alcance de plataformas", `01-SPEC.md` §5.1/§6.17, `matriz-degradacion-plataformas.md` §2, REV-ALTA-6 |
| §9 — Sonidos | Catálogo de ids ya commiteado; archivos reales a costo cero (CC0) | CODE (`sound-catalog.ts`), D18 |
| §10 — Cuotas Spark | Margen amplio ya calculado; revisión manual sin umbral automático | `04-SINCRONIZACION.md` §12, RNF-08 |
| §11 — Respaldo manual | Distinto de RNF-10 (V1.5); script de administrador a costo cero, sin `gcloud firestore export` | `01-SPEC.md` §8.4 RNF-10, RNF-09, RNF-07 |
| §12 — Troubleshooting | Síntomas derivados de cada sección anterior, más gap de tipado ya documentado en CODE | CODE (`client.ts`), §3–§8 de este documento |
| §13 — Checklist final | Consolidación en orden de dependencia de todo el documento | Todas las anteriores |
