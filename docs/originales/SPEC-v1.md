# Productvt Beta — SPEC.md

## 1. Propósito del documento

Este documento define la especificación funcional, técnica y de producto de **Productvt Beta**, una aplicación de productividad personal centrada en:

1. **Cronómetro de estudio por bloques** con descansos estructurados, banco de tiempo y lógica de respuesta obligatoria.
2. **Cronómetro inverso** para registrar tiempo de ocio / anti-estudio.
3. **Calendario funcional** para visualizar sesiones reales y eventos invisibles planificados.
4. **Estadísticas avanzadas** de estudio, ocio, categorías y metas.
5. **Sincronización por cuenta** entre múltiples dispositivos, especialmente **Android** y **web/escritorio Windows**.

Este archivo debe ser tratado como la **fuente única de verdad** del proyecto. Cualquier implementación, prompt, tarea, pantalla, modelo de datos o corrección debe respetar este documento.

---

## 2. Resumen ejecutivo del producto

**Productvt Beta** es una aplicación de productividad diseñada para registrar, estructurar y motivar sesiones reales de estudio y de ocio. No es un calendario genérico ni una app de tareas tradicional. El núcleo del producto es un **sistema de bloques temporizados con reglas estrictas**, orientado a convertir el estudio en una experiencia guiada, medible y visualmente atractiva.

El producto busca resolver cuatro problemas simultáneos:

- Medir el **tiempo real de estudio efectivo**.
- Registrar también el **tiempo de ocio / anti-estudio** sin mezclarlo con el estudio.
- Visualizar el historial real en un **calendario práctico**.
- Entregar **estadísticas y metas** que incentiven constancia y progreso.

La aplicación debe funcionar de forma confiable en Android y también ser usable desde navegador en Windows, con sincronización por cuenta.

---

## 3. Objetivos del producto

## 3.1 Objetivos principales

- Permitir iniciar y completar bloques de estudio de forma muy rápida.
- Registrar estudio efectivo con precisión, separándolo del tiempo de descanso.
- Permitir descansos estructurados, descansos personalizados y banco de tiempo acumulable.
- Registrar ocio o bloques inversos con un temporizador aparte.
- Mostrar sesiones reales en un calendario.
- Mostrar estadísticas potentes por día, semana y mes.
- Permitir metas semanales por categoría de estudio.
- Motivar el uso recurrente mediante una estética minimalista pero estimulante.

## 3.2 Objetivos secundarios

- Facilitar personalización de categorías, colores, presets y sonidos.
- Soportar eventos invisibles planificables y repetibles.
- Hacer que la app sea extensible a futuro sin rehacer la arquitectura.

## 3.3 No objetivos iniciales

- No será inicialmente una red social.
- No tendrá colaboración en tiempo real entre múltiples usuarios.
- No será inicialmente una app compleja de tareas, notas o documentos.
- No tendrá pagos, marketplace ni funcionalidades empresariales.

---

## 4. Público objetivo

## 4.1 Público inicial

- Usuario principal individual.
- Muy pocos usuarios adicionales como máximo en etapa inicial.
- Uso intensivo en Android.
- Uso complementario en navegador / PC Windows.

## 4.2 Tipo de usuario

- Persona que estudia de forma activa y quiere medir productividad real.
- Persona que también quiere controlar cuánto tiempo destina a ocio.
- Persona que valora estructura, feedback, motivación visual y estadísticas.

---

## 5. Propuesta de valor

Productvt Beta combina en una sola aplicación:

- temporizador serio de estudio,
- temporizador de ocio,
- calendario útil,
- estadísticas detalladas,
- metas por categoría,
- y una experiencia visual dopaminérgica sin dejar de ser minimalista.

La app no se limita a contar minutos: **organiza el comportamiento de estudio** y lo convierte en datos útiles.

---

## 6. Decisiones tecnológicas obligatorias

## 6.1 Stack de implementación

La implementación base del proyecto debe usar:

- **Expo**
- **React Native**
- **TypeScript**
- **Firebase Authentication**
- **Cloud Firestore**
- **Firebase Hosting** para la versión web
- **VS Code** como IDE principal

## 6.2 Justificación

Se elige Expo en vez de una PWA pura porque el núcleo de la app depende de:

- alarmas,
- audio,
- temporizadores,
- potencial uso en segundo plano,
- selección de archivos de audio del dispositivo,
- experiencia móvil robusta,
- base única para Android y web.

## 6.3 Restricciones del stack

- No usar backend propio en la primera versión.
- No cambiar el stack salvo razón técnica crítica.
- No introducir librerías innecesarias.
- Priorizar simplicidad, mantenibilidad y velocidad de entrega.

---

## 7. Plataformas objetivo

## 7.1 Android

Plataforma principal del producto. La experiencia móvil debe ser la mejor versión del sistema.

## 7.2 Web / escritorio Windows

Debe existir una versión usable desde navegador de PC para:

- revisar estadísticas,
- revisar calendario,
- editar categorías,
- gestionar metas,
- iniciar cronómetros si técnicamente es viable y estable.

Si existen diferencias de fiabilidad entre Android y web, la especificación funcional prioriza Android para las funciones más sensibles del cronómetro.

---

## 8. Principios de diseño del producto

- **Rápido de usar**: iniciar un bloque debe tomar pocos toques.
- **Rígido donde importa**: las reglas del cronómetro deben ser claras y consistentes.
- **Flexible donde aporta valor**: categorías, colores, presets, sonidos, metas.
- **Medición honesta**: distinguir estudio efectivo, descanso, ocio y cancelación.
- **Motivación visual**: uso de color, animaciones y pequeños premios visuales.
- **Minimalismo funcional**: nada de sobrecargar la interfaz con elementos inútiles.

---

## 9. Estructura general de la aplicación

La aplicación tendrá **4 secciones principales**:

1. **Calendario**
2. **Estadísticas**
3. **Cronómetro**
4. **Configuración / Gestión**

Aunque la descripción original explicita 3 secciones principales, el producto necesita una cuarta sección funcional de configuración/gestión para evitar sobrecargar las demás.

## 9.1 Sección Calendario

Muestra:

- bloques de estudio completados,
- bloques inversos completados,
- eventos invisibles,
- vistas día / semana / mes / año,
- acceso al popup para crear eventos invisibles,
- vista anual con indicadores resumidos.

## 9.2 Sección Estadísticas

Muestra:

- tiempo de estudio,
- tiempo inverso,
- comparaciones por período,
- porcentajes,
- distribución por categoría,
- tablas históricas,
- metas y cumplimiento.

## 9.3 Sección Cronómetro

Es el corazón del producto. Permite:

- crear e iniciar bloques de estudio,
- gestionar descansos,
- usar botón de almuerzo,
- ver estado actual,
- cancelar bloque,
- iniciar temporizador inverso,
- visualizar progreso del bloque actual.

## 9.4 Sección Configuración / Gestión

Debe incluir:

- perfil,
- frase personalizada de cancelación,
- sonidos,
- categorías,
- presets,
- colores,
- preferencias visuales,
- opciones de notificación,
- importación de audio del dispositivo,
- opciones generales.

---

## 10. Módulos funcionales del producto

Los módulos del sistema son:

1. Autenticación y cuenta
2. Categorías y colores
3. Presets / razones de estudio
4. Cronómetro de estudio por bloques
5. Banco de descanso
6. Botón de almuerzo / pánico
7. Cancelación de bloques
8. Temporizador inverso
9. Registro de sesiones
10. Calendario
11. Eventos invisibles
12. Estadísticas
13. Metas semanales
14. Sonidos y notificaciones
15. Preferencias visuales
16. Sincronización en la nube

---

## 11. Autenticación y cuenta

## 11.1 Objetivo

Permitir que el usuario pueda acceder a sus datos desde múltiples dispositivos con una sola cuenta.

## 11.2 Métodos permitidos inicialmente

- Email + contraseña
- Google Sign-In

## 11.3 Restricciones

- No usar autenticación por teléfono en el MVP.
- Cada usuario solo puede acceder a sus propios datos.

## 11.4 Datos del perfil

Cada usuario tendrá:

- nombre visible opcional,
- email,
- zona horaria,
- configuración general,
- frase de cancelación personalizada,
- preferencias de sonido,
- preferencias visuales.

---

## 12. Categorías

Las categorías son agrupadores funcionales y visuales para bloques y eventos.

## 12.1 Tipos de categoría

Deben existir tres sistemas de categorías separados:

1. **Categorías de estudio**
2. **Categorías de bloque inverso**
3. **Categorías de eventos invisibles**

## 12.2 Propiedades de una categoría

Cada categoría tendrá:

- `id`
- `type` (`study`, `inverse`, `invisible`)
- `name`
- `color`
- `icon` opcional futuro
- `isArchived`
- `createdAt`
- `updatedAt`

## 12.3 Colores

La categoría debe soportar:

- selección de colores suaves y minimalistas predefinidos,
- selección manual con paleta RGB,
- persistencia del color elegido.

## 12.4 Regla de actualización de color

Cuando el usuario cambie el color de una categoría:

- el color de la categoría se actualiza,
- los bloques futuros de esa categoría deben usar el nuevo color,
- los registros históricos ya guardados deben mantener el color con el que fueron creados, **a menos que se defina explícitamente que deben migrar**.

### Decisión de diseño

Para preservar fidelidad histórica, los bloques y eventos guardados deben almacenar un `colorSnapshot`. El cambio de color en la categoría no debe alterar retroactivamente el histórico, salvo que en una futura función exista edición masiva.

---

## 13. Presets / Razones de estudio

El usuario puede asociar un bloque a una “razón de estudio”, entendida como un preset operativo.

## 13.1 Preset estándar

Preset base por defecto:

- nombre: `Estándar`
- estudio: `25 min`
- descanso corto: `5 min`
- cantidad de bloques antes de descanso largo: `4`
- descanso largo posterior: `35 min`

## 13.2 Propiedades de un preset

- `id`
- `name`
- `studyDurationMinutes`
- `shortBreakMinutes`
- `cyclesBeforeLongBreak`
- `longBreakMinutes`
- `isDefault`
- `createdAt`
- `updatedAt`

## 13.3 Reglas

- El usuario puede crear más presets.
- Los presets se guardan y quedan disponibles para futuros bloques.
- Un bloque debe guardar un `presetSnapshot` para preservar integridad histórica si luego cambia el preset original.

---

## 14. Bloques de estudio

El bloque de estudio es la unidad principal del sistema.

## 14.1 Creación de bloque

Para iniciar un bloque de estudio, el usuario debe poder definir:

- nombre del bloque,
- categoría de estudio existente o nueva,
- color heredado o personalizado,
- preset / razón de estudio.

## 14.2 Reglas de inicio

- El inicio debe ser rápido.
- Debe permitirse crear categoría en el momento.
- Debe quedar todo registrado desde el primer segundo.

## 14.3 Naturaleza del bloque

Un bloque es una sesión compuesta por:

- uno o más ciclos de estudio,
- uno o más descansos,
- acumulación potencial de banco de tiempo,
- posibilidad de almuerzo,
- posibilidad de cancelación,
- posibilidad de expiración por no responder.

---

## 15. Máquina de estados del cronómetro de estudio

El cronómetro de estudio **debe implementarse como una máquina de estados explícita**, no como lógica informal dispersa.

## 15.1 Estados principales

- `idle`
- `study_running`
- `study_completed_waiting_response`
- `break_selection`
- `break_running`
- `break_completed_waiting_response`
- `lunch_running`
- `paused_transient` (solo si se requiere internamente)
- `session_completed`
- `session_cancelled`
- `session_expired`

## 15.2 Descripción de estados

### `idle`
No hay sesión activa.

### `study_running`
Está corriendo un tramo de estudio activo.

### `study_completed_waiting_response`
El tramo de estudio terminó. Suena alarma y el sistema espera que el usuario decida qué hacer.

### `break_selection`
Pantalla / panel para decidir:
- tomar descanso sugerido,
- saltar descanso,
- tomar descanso personalizado desde el banco permitido,
- continuar flujo.

### `break_running`
Está corriendo un descanso.

### `break_completed_waiting_response`
El descanso terminó. Suena alarma “toca estudiar” y comienza ventana de respuesta obligatoria.

### `lunch_running`
Está corriendo el descanso especial de almuerzo sin matar el bloque.

### `session_completed`
Sesión cerrada correctamente.

### `session_cancelled`
Sesión eliminada por cancelación confirmada.

### `session_expired`
Sesión perdida por no responder dentro de la ventana obligatoria.

## 15.3 Transiciones esenciales

- `idle -> study_running`
- `study_running -> study_completed_waiting_response`
- `study_completed_waiting_response -> break_selection`
- `break_selection -> break_running`
- `break_selection -> study_running`
- `break_running -> break_completed_waiting_response`
- `break_completed_waiting_response -> study_running`
- `any active state -> lunch_running`
- `lunch_running -> previous valid continuation state`
- `any active state -> session_cancelled`
- `waiting_response state -> session_expired` si vence la ventana de respuesta

---

## 16. Reglas del estudio efectivo

## 16.1 Definición

El **tiempo de estudio efectivo** es el tiempo transcurrido exclusivamente en los segmentos de estudio completados o en curso según la lógica definida, sin contar descansos ni almuerzo.

## 16.2 Uso

Este valor alimenta:

- estadísticas diarias,
- estadísticas semanales,
- estadísticas mensuales,
- metas por categoría,
- indicadores resumidos.

## 16.3 Visualización

Durante la sesión activa, el panel del cronómetro debe mostrar de forma permanente:

- tiempo de estudio efectivo acumulado del bloque,
- ciclo actual,
- progreso del ciclo actual,
- banco de descanso disponible.

---

## 17. Descansos

Los descansos son una pieza central del producto y forman parte del **V1 / MVP**.

## 17.1 Tipos de descanso

- descanso sugerido automático según preset,
- descanso largo automático según preset,
- descanso saltado,
- descanso personalizado usando banco,
- almuerzo / pánico de 45 minutos.

## 17.2 Descanso sugerido

Al terminar un ciclo de estudio, el sistema propone un descanso conforme al preset.

Ejemplo con preset estándar:

- bloque 1: descanso corto 5 min
- bloque 2: descanso corto 5 min
- bloque 3: descanso corto 5 min
- bloque 4: descanso largo total 40 min disponibles (35 + 5)

## 17.3 Panel al terminar estudio

Cuando termina un tramo de estudio:

- debe sonar una alarma suave por defecto,
- debe mostrarse el tiempo de descanso sugerido,
- deben aparecer opciones claras.

Acciones mínimas:

- `Tomar descanso`
- `Saltar descanso`
- `Tomar descanso personalizado`
- `Usar almuerzo` (según diseño de UI)

## 17.4 Saltar descanso

Si el usuario salta el descanso:

- ese tiempo no usado se acumula al **banco de descanso del bloque actual**.

## 17.5 Descanso personalizado

Esto es obligatorio en V1.

El usuario debe poder elegir manualmente cuánto descanso tomar **desde 0 minutos hasta el máximo disponible** según banco acumulado y descanso recién ganado.

### Requerimiento explícito del producto

El usuario debe poder tomar descansos personalizados como por ejemplo:

- 0 min
- 1 min
- 4 min
- cualquier valor entero permitido dentro del máximo disponible

### Regla

Si dispone de 5 minutos y toma 1 minuto:

- 1 min se consume,
- 4 min quedan en banco.

Si dispone de 40 minutos y toma 4 minutos:

- 4 min se consumen,
- 36 min quedan en banco.

## 17.6 Banco de descanso

Cada sesión activa de estudio debe mantener un **banco de descanso acumulable por bloque**.

### Qué suma al banco

- descanso sugerido saltado completamente,
- parte no usada de un descanso personalizado,
- parte no usada de un descanso largo,
- descanso recién ganado al finalizar un ciclo.

### Qué no suma al banco

- almuerzo de pánico,
- tiempos de inactividad no válidos,
- tiempos de bloques cancelados.

### Alcance del banco

- el banco pertenece **solo a la sesión de estudio actual**, no al usuario global.
- al terminar, cancelar o perder el bloque, el banco desaparece.

## 17.7 Descanso largo

Cuando corresponde descanso largo, el sistema debe sumar:

- el descanso corto del ciclo,
- más el descanso largo adicional.

Ejemplo con preset estándar:

- descanso disponible total en ese punto: **40 minutos**.

## 17.8 Ventana de respuesta al terminar descanso

Cuando termina un descanso:

- debe sonar una alarma “toca estudiar”,
- debe comenzar una ventana de respuesta obligatoria de **30 segundos**,
- si el usuario no responde dentro de esa ventana, la sesión se pierde.

---

## 18. Botón de almuerzo / pánico

## 18.1 Definición

El sistema tendrá un botón pequeño llamado `Almuerzo` visible dentro del cronómetro.

## 18.2 Efecto

- activa un descanso especial de **45 minutos**,
- no mata el bloque,
- no reemplaza la lógica normal del bloque,
- no debe confundirse con el banco de descanso.

## 18.3 Reglas

- debe estar disponible durante la sesión activa según diseño final,
- al terminar el almuerzo, la sesión debe continuar desde el estado correcto,
- el almuerzo no se agrega al banco,
- el almuerzo no se considera estudio efectivo.

## 18.4 Registro

Debe quedar registrado dentro del detalle de la sesión que se utilizó almuerzo, con sus timestamps.

---

## 19. Expiración por no responder

## 19.1 Objetivo

Forzar cierta disciplina operacional en el uso del cronómetro.

## 19.2 Regla general

Hay estados del flujo donde el usuario debe responder.

## 19.3 Plazos

### Tras terminar descanso

- ventana: **30 segundos**.

### Condición general de “matar bloque”

La descripción del producto también menciona un plazo general de **10 minutos sin responder** a lo que corresponda.

### Resolución de diseño para V1

Se define esta regla:

- las respuestas críticas inmediatas del flujo de descanso usan **30 segundos**,
- cualquier otra espera operativa prolongada no resuelta puede usar una ventana máxima de **10 minutos** antes de marcar expiración.

Esto debe implementarse de forma explícita para evitar ambigüedad.

---

## 20. Cancelación de bloques

## 20.1 Objetivo

Evitar cancelaciones impulsivas y dar gravedad emocional a la pérdida del bloque.

## 20.2 Flujo

Al pulsar `Cancelar bloque`:

- aparece panel de confirmación,
- se muestra una frase personalizada del perfil,
- la frase puede editarse con ícono lápiz,
- el panel muestra botón de confirmar bloqueado temporalmente.

## 20.3 Regla de confirmación

- primer confirm: bloqueado por 15 segundos,
- al presionarlo, se reinicia y vuelve a pedir 15 segundos,
- segundo confirm: recién entonces cancela definitivamente.

## 20.4 Efecto de cancelación

- se elimina todo el progreso del bloque,
- no se suman estadísticas,
- no se conserva banco de descanso,
- la sesión puede quedar registrada internamente como cancelada para trazabilidad o ser borrada lógicamente según diseño de datos.

### Decisión recomendada

No borrar físicamente: guardar como `cancelled` para auditoría y estadísticas de abandono futuras, pero no incluir en estadísticas productivas por defecto.

## 20.5 Feedback audiovisual

Idealmente incluir:

- animación triste, lágrimas, muerte simbólica o equivalente,
- sonido triste opcional,
- todo esto configurable o desactivable.

---

## 21. Temporizador inverso

## 21.1 Definición

Es un temporizador para registrar tiempo de ocio / anti-estudio.

## 21.2 Objetivo

Medir conscientemente el tiempo destinado a actividades que no son estudio.

## 21.3 Flujo mínimo

- elegir nombre o categoría,
- definir duración objetivo,
- iniciar,
- recibir recordatorios cada 15 minutos,
- finalizar,
- guardar bloque inverso.

## 21.4 Categorías de bloque inverso

Ejemplos:

- ocio
- juego
- YouTube
- redes sociales
- descanso libre

## 21.5 Reglas

- los recordatorios cada 15 minutos no deben pedir respuesta,
- al finalizar manualmente o completar duración, se guarda el bloque inverso,
- estos bloques sí cuentan para estadísticas de ocio,
- no se mezclan con estudio.

---

## 22. Registro de sesiones

Toda sesión relevante debe quedar guardada.

## 22.1 Tipos de sesión

- `study`
- `inverse`
- `invisible_event_instance` (si se desea expansión de calendario)

## 22.2 Datos mínimos de una sesión de estudio

- id
- userId
- type
- name
- categoryId
- categoryNameSnapshot
- colorSnapshot
- presetSnapshot
- sessionStatus (`completed`, `cancelled`, `expired`, `active`)
- startedAt
- endedAt
- effectiveStudySeconds
- totalElapsedSeconds
- bankRemainingSeconds
- cyclesCompleted
- studySegments[]
- breakSegments[]
- lunchSegments[]
- customBreakSelections[]
- completionReason
- deviceInfo opcional
- createdAt
- updatedAt

## 22.3 Datos mínimos de una sesión inversa

- id
- userId
- type = inverse
- name
- categoryId
- categoryNameSnapshot
- colorSnapshot
- startedAt
- endedAt
- totalElapsedSeconds
- remindersTriggered
- status (`completed`, `cancelled`, `interrupted`)
- createdAt
- updatedAt

## 22.4 Segmentos

Guardar segmentos permite reconstruir visualmente la sesión.

Ejemplo de `studySegments[]`:

- start
- end
- durationSeconds
- cycleNumber

Ejemplo de `breakSegments[]`:

- breakType (`short`, `long`, `custom`, `skipped`, `lunch`)
- grantedSeconds
- usedSeconds
- bankDeltaSeconds
- start
- end

---

## 23. Calendario

## 23.1 Filosofía

No es un calendario genérico lleno de eventos triviales. Debe servir para visualizar acciones reales útiles.

## 23.2 Qué muestra el calendario

- bloques de estudio completados
- bloques inversos completados
- eventos invisibles

## 23.3 Qué no cuenta para estadísticas

- los eventos invisibles

## 23.4 Vistas requeridas

- día
- semana
- mes
- año

## 23.5 Comportamiento de las sesiones en calendario

Los bloques de estudio e inversos se agregan automáticamente según:

- fecha real,
- hora de inicio,
- duración,
- color,
- categoría,
- detalle interno del bloque.

## 23.6 Visualización interna del bloque en calendario

En la vista detallada debe ser posible ver:

- tiempo total del bloque,
- segmentos de estudio,
- segmentos de descanso,
- uso de almuerzo,
- tiempo efectivo,
- categoría,
- preset utilizado.

---

## 24. Eventos invisibles

## 24.1 Definición

Son eventos planificados que el usuario crea manualmente y que se muestran en calendario, pero no cuentan para estadísticas de estudio ni de ocio.

## 24.2 Casos de uso

- gimnasio
- clases
- reuniones
- citas
- trámites
- traslados

## 24.3 Propiedades

- nombre
- categoría invisible
- color
- fecha de inicio
- hora de inicio
- duración
- recurrencia opcional
- fecha final de recurrencia
- días de semana seleccionables
- notas opcionales futuras

## 24.4 Reglas

- pueden existir múltiples eventos simultáneos,
- se pueden editar,
- se pueden eliminar,
- se pueden repetir semanalmente con selección personalizada de días.

## 24.5 Recurrencia mínima requerida

Debe soportar al menos:

- sin repetición
- semanal
- semanal con múltiples días específicos
- fecha fin de serie

---

## 25. Estadísticas

La sección de estadísticas debe ser una de las áreas más potentes del producto.

## 25.1 Períodos soportados

- día
- semana
- mes

A futuro se puede extender, pero estos tres son obligatorios en V1.

## 25.2 Datos principales

- tiempo total de estudio efectivo
- tiempo total inverso / ocio
- comparación estudio vs ocio
- evolución del período actual
- breakdown por categoría
- breakdown por subcategoría
- metas y avance

## 25.3 Componentes visuales requeridos

### Barras por período

Para cada período debe existir gráfico de barras que permita ver:

- tiempo de estudio,
- tiempo inverso,
- subcategorías cuando corresponda.

### Gráfico porcentual

Debe existir visualización porcentual de:

- estudio vs ocio,
- y dentro del ocio, subtipos de ocio.

### Tablas históricas tipo Excel

Debe existir una vista tipo cuadrícula o tabla compacta que permita revisar:

- meses pasados,
- semanas pasadas,
- días pasados,
- evolución del total estudiado.

No tiene que ser literalmente Excel, pero sí una interfaz tabular densa y legible.

## 25.4 Desglose por categoría

Debe ser posible revisar específicamente:

- cuánto tiempo se dedicó a cada categoría de estudio,
- cuánto tiempo se dedicó a cada categoría inversa,
- cómo cambian esos tiempos por período.

Ejemplo:

- Cálculo 3
- Física
- Programación
- YouTube
- Juegos

## 25.5 Estadísticas del período actual y períodos anteriores

El sistema debe priorizar el período actual pero permitir revisar históricos.

---

## 26. Metas semanales

## 26.1 Definición

El usuario puede definir metas semanales de estudio efectivo por categoría.

## 26.2 Ejemplo

- Esta semana debo estudiar 10 horas de Cálculo 3.
- Esta semana debo estudiar 4 horas de Física.

## 26.3 Propiedades de una meta

- categoría objetivo
- período semanal
- cantidad objetivo en segundos o minutos
- cantidad lograda
- estado (`pending`, `completed`, `failed`)

## 26.4 Reglas

- las metas usan **tiempo efectivo de estudio**, no tiempo total del bloque,
- solo aplican a categorías de estudio,
- el progreso debe actualizarse automáticamente.

## 26.5 Estrella en vista anual

Si en un mes se cumplen todas las metas semanales definidas según la regla acordada, el mes debe mostrarse con una estrella en la vista anual.

### Regla a definir para V1

Se considerará que un mes tiene estrella si **todas las semanas cerradas de ese mes con metas configuradas fueron completadas**.

---

## 27. Vista anual del calendario

Debe existir una vista anual minimalista con:

- representación de los 12 meses,
- indicadores resumidos de tiempo,
- estrella en meses que cumplan la condición de metas,
- acceso para abrir detalle mensual.

---

## 28. Sonidos y notificaciones

## 28.1 Objetivo

Entregar feedback auditivo útil, suave y motivador.

## 28.2 Requerimientos

Debe existir:

- sonido suave por defecto para fin de estudio,
- sonido para “toca estudiar”,
- recordatorio del temporizador inverso cada 15 min,
- opción de personalizar sonidos,
- opción futura de seleccionar archivo propio del dispositivo.

## 28.3 Preferencias mínimas

- volumen relativo configurable si la plataforma lo permite,
- activar / desactivar sonidos,
- elegir entre sonidos predefinidos,
- elegir audio propio por dispositivo si está implementado.

## 28.4 Notificaciones

Se deben evaluar dos capas:

- notificación visual local,
- reproducción de sonido.

---

## 29. Diseño visual y experiencia

## 29.1 Estilo deseado

- minimalista
- limpio
- moderno
- colores suaves
- ligeramente dopaminérgico
- elegante pero no frío

## 29.2 Elementos deseados

- confeti o microcelebraciones al completar bloques,
- emojis o acentos visuales puntuales,
- transiciones suaves,
- componentes con buen espaciado,
- tipografía clara,
- indicadores de progreso agradables.

## 29.3 Límites

- no convertir la app en algo infantil o excesivamente saturado,
- no sobrecargar el calendario,
- no hacer pantallas con demasiados paneles simultáneos.

---

## 30. Arquitectura funcional interna

La implementación debe separar claramente:

1. UI
2. lógica de dominio
3. almacenamiento local
4. sincronización remota
5. analítica interna

## 30.1 Capas sugeridas

- `app/` o `src/app/`: navegación y entrypoints
- `screens/`: pantallas
- `components/`: componentes UI reutilizables
- `features/`: cronómetro, calendario, estadísticas, metas
- `domain/`: entidades, reglas, máquina de estados
- `services/`: Firebase, audio, notificaciones, storage
- `hooks/`: hooks reutilizables
- `store/`: estado global si aplica
- `utils/`: utilidades puras
- `theme/`: colores, espaciados, tipografías

---

## 31. Persistencia local y sincronización

## 31.1 Objetivo

La app debe seguir siendo razonablemente usable aunque la red falle de forma transitoria.

## 31.2 Requerimientos

- persistencia local del estado actual del cronómetro,
- recuperación de sesión si la app se cierra inesperadamente,
- sincronización con Firestore al reconectar,
- resolución clara de conflictos simple.

## 31.3 Regla inicial de sincronización

- el estado activo de cronómetro se considera fuente de verdad del dispositivo actual mientras está en curso,
- al cerrarse o actualizarse, se persiste y sincroniza,
- si el mismo usuario abre dos dispositivos a la vez, el sistema debe evitar sesiones activas duplicadas o manejarlo explícitamente.

### Regla recomendada

Una sola sesión activa de estudio por usuario.

---

## 32. Requisitos no funcionales

## 32.1 Rendimiento

- el cronómetro debe sentirse inmediato,
- la navegación no debe trabarse,
- estadísticas deben cargar razonablemente rápido,
- el calendario no debe colapsar con historial largo.

## 32.2 Confiabilidad

- no perder sesiones por cierres accidentales,
- registrar correctamente tiempos,
- minimizar errores de doble conteo.

## 32.3 Mantenibilidad

- código modular,
- tipos claros,
- funciones puras para reglas de tiempo,
- pruebas del motor del cronómetro.

## 32.4 Escalabilidad moderada

Debe poder pasar de 1 usuario a pocos usuarios sin rediseño del sistema.

---

## 33. Reglas críticas de negocio

1. El tiempo efectivo de estudio no incluye descansos ni almuerzo.
2. El banco de descanso pertenece solo a la sesión activa.
3. Los descansos personalizados con selección manual (incluyendo 0, 1, 4 minutos y cualquier entero permitido) son obligatorios en V1.
4. Los bloques inversos cuentan para ocio, no para estudio.
5. Los eventos invisibles aparecen en calendario, no en estadísticas.
6. Las metas se miden con tiempo efectivo.
7. Los cambios de preset o categoría no deben dañar el histórico.
8. La cancelación requiere doble confirmación con espera.
9. Las alarmas del flujo deben diferenciar fin de estudio de fin de descanso.
10. Debe existir una sola sesión activa de estudio por usuario.

---

## 34. Riesgos técnicos principales

## 34.1 Riesgo: lógica compleja del temporizador

Mitigación:

- máquina de estados,
- pruebas unitarias,
- estructura de dominio separada de UI.

## 34.2 Riesgo: diferencias Android vs web

Mitigación:

- priorizar Android para comportamiento crítico,
- encapsular audio/notificaciones en servicios,
- documentar degradaciones aceptables en web si existieran.

## 34.3 Riesgo: inconsistencias al cerrar la app

Mitigación:

- persistencia local periódica del estado,
- reconstrucción de sesión usando timestamps reales.

## 34.4 Riesgo: estadísticas incorrectas

Mitigación:

- separar claramente `effectiveStudySeconds` y `totalElapsedSeconds`,
- usar snapshots y segmentos.

---

## 35. Estrategia de implementación por fases

## 35.1 V1 / MVP obligatorio

Incluye:

- autenticación
- categorías de estudio, inversas e invisibles
- presets
- cronómetro de estudio con máquina de estados
- fin de estudio con alarma
- selección de descanso
- saltar descanso
- **descanso personalizado con banco de tiempo**
- **capacidad de tomar 0, 1, 4 o cualquier valor válido dentro del máximo disponible**
- descanso largo sumado correctamente
- contador de estudio efectivo en vivo
- botón de almuerzo
- cancelación con doble confirmación
- temporizador inverso
- guardado de sesiones
- calendario base
- eventos invisibles con recurrencia semanal
- estadísticas día / semana / mes
- metas semanales
- vista anual simple con estrellas

## 35.2 V1.5

Incluye:

- pulido visual superior
- confeti y microanimaciones
- mejores gráficos
- tabla histórica más densa
- más personalización de sonidos
- mejoras UX del calendario

## 35.3 V2

Incluye:

- importación avanzada de archivos de audio por nube si se requiere
- edición masiva / avanzada
- más analítica
- insights automáticos
- widgets / integraciones futuras

---

## 36. Herramientas externas y flujo de trabajo del proyecto

## 36.1 Herramientas a usar

- ChatGPT: especificación, arquitectura, debugging conceptual, prompts, revisiones grandes.
- Gemini Code Assist en VS Code: implementación iterativa archivo por archivo.
- Firebase Console: auth, base de datos, hosting.
- Expo CLI: desarrollo y pruebas.
- Git + GitHub opcional: control de versiones.

## 36.2 División de responsabilidades entre IA

### ChatGPT

Usar para:

- refinar el SPEC
- diseñar estados del cronómetro
- revisar arquitectura
- revisar modelos de datos
- detectar errores lógicos
- redactar prompts precisos para Gemini

### Gemini

Usar para:

- crear archivos concretos
- conectar componentes
- escribir pantallas
- wiring de Firebase
- correcciones rápidas dentro del IDE

---

## 37. Requisitos de testing

## 37.1 Testing obligatorio del motor del cronómetro

Se deben probar al menos:

- transición normal estudio -> descanso -> estudio
- descanso saltado
- descanso personalizado parcial
- banco acumulado correcto
- descanso largo correcto
- almuerzo sin matar bloque
- expiración por no responder
- cancelación con doble confirmación
- recuperación tras cierre inesperado

## 37.2 Testing de estadísticas

- suma correcta de tiempo efectivo
- exclusión correcta de eventos invisibles
- separación correcta entre estudio y ocio
- metas semanales correctas

---

## 38. Requisitos de UX detallados

## 38.1 Inicio de bloque

Debe tomar pocos segundos y no exigir formularios largos.

## 38.2 Cronómetro activo

Debe mostrar siempre:

- nombre del bloque
- categoría
- color
- tiempo restante actual
- tiempo efectivo acumulado
- ciclo actual
- banco disponible
- acceso a cancelar
- acceso a almuerzo

## 38.3 Selección de descanso

Debe ser extremadamente clara, con énfasis en:

- descanso sugerido
- saltar descanso
- descanso personalizado
- cuánto banco quedará

## 38.4 Estadísticas

Deben ser legibles y no requerir demasiados taps para encontrar una categoría.

---

## 39. Accesibilidad y configuración

- modo oscuro deseable
- tamaños legibles
- colores distinguibles
- no depender exclusivamente del color para estados críticos
- sonidos desactivables

---

## 40. Open questions resueltas provisionalmente

## 40.1 ¿Cambiar color de categoría cambia histórico?

No. Se guarda snapshot histórico.

## 40.2 ¿El banco de descanso sobrevive entre bloques?

No. Solo vive dentro de la sesión activa.

## 40.3 ¿Los bloques cancelados se borran o guardan?

Se guardan como `cancelled` pero excluidos de estadísticas productivas por defecto.

## 40.4 ¿Puede haber más de una sesión activa?

No. Una sesión activa de estudio por usuario.

## 40.5 ¿El descanso personalizado es V2?

No. Es **V1 / MVP obligatorio**.

---

## 41. Entidades principales del dominio

## 41.1 UserProfile

- id
- email
- displayName
- timezone
- cancellationPhrase
- settings

## 41.2 Category

- id
- type
- name
- color
- archived

## 41.3 Preset

- id
- name
- studyDurationMinutes
- shortBreakMinutes
- cyclesBeforeLongBreak
- longBreakMinutes

## 41.4 StudySession

- id
- name
- categorySnapshot
- presetSnapshot
- status
- timing data
- segments
- bank state

## 41.5 InverseSession

- id
- name
- categorySnapshot
- timing data
- status

## 41.6 InvisibleEvent
n
- id
- name
- categorySnapshot
- recurrence
- start/end
- visibility flags

## 41.7 WeeklyGoal

- id
- weekKey
- categoryId
- targetSeconds
- achievedSeconds
- status

---

## 42. Estructura sugerida de Firestore

```text
users/{uid}
  profile/main
  settings/main
  categories/{categoryId}
  presets/{presetId}
  sessions/{sessionId}
  events/{eventId}
  goals/{goalId}
  stats_cache/{docId}   # opcional futuro
```

---

## 43. Convenciones temporales

- guardar timestamps en UTC
- mostrar en zona horaria del usuario
- usar segundos como unidad base interna
- convertir a minutos/horas solo para UI

---

## 44. Convenciones de naming del producto

Terminología oficial del sistema:

- **Bloque de estudio**
- **Bloque inverso**
- **Evento invisible**
- **Categoría**
- **Preset**
- **Banco de descanso**
- **Tiempo efectivo**
- **Almuerzo**
- **Meta semanal**

---

## 45. Checklist de completitud del proyecto base

La base fundamental del proyecto se considera lista cuando existan:

- stack configurado
- auth operativa
- navegación principal
- modelo de datos tipado
- categorías funcionales
- presets funcionales
- cronómetro de estudio estable
- descansos personalizados con banco funcionales
- temporizador inverso funcional
- persistencia y sync base
- calendario funcional
- estadísticas iniciales correctas
- metas semanales funcionales
- configuración básica de sonidos y frase de cancelación

---

## 46. Instrucción para cualquier agente de código

Cualquier agente que implemente este proyecto debe:

1. Respetar este SPEC como fuente única de verdad.
2. No alterar reglas críticas del cronómetro sin actualizar el SPEC.
3. Implementar primero la lógica de dominio antes que el pulido visual.
4. Mantener separación entre estado UI y reglas de negocio.
5. Evitar soluciones frágiles basadas solo en timers del render.
6. Entregar siempre archivos completos, pasos de prueba y notas de edge cases.

---

## 47. Definición de éxito del producto

El producto base será exitoso si logra que el usuario pueda:

- iniciar un bloque en segundos,
- completar ciclos reales con descansos flexibles,
- medir honestamente cuánto estudió,
- ver cuánto tiempo gastó en ocio,
- revisar su historial en calendario,
- analizar su progreso por categoría,
- cumplir metas semanales,
- sentir motivación real para volver a abrir la app.

---

## 48. Próximo paso recomendado

El siguiente artefacto a generar después de este SPEC debe ser uno de estos dos:

1. **ARCHITECTURE.md** con estructura técnica de carpetas, servicios, estado y componentes.
2. **IMPLEMENTATION_PLAN.md** con fases, archivos y orden exacto de construcción.

Idealmente, luego se genera un **PROMPT_MASTER_IMPLEMENTATION.md** para usar con Gemini Code Assist dentro de VS Code.

