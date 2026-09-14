# Preguntas para definir Productvt Beta

Este documento reúne las preguntas que quedaron abiertas al revisar los cuatro documentos fuente del encargo — el prompt original, SPEC.md, ARCHITECTURE.md e IMPLEMENTATION_PLAN.md — antes de avanzar a la construcción de mockups o de código. El objetivo no es proponer soluciones sino destrabar decisiones: cada pregunta señala una contradicción, un vacío o una ambigüedad concreta entre documentos (o entre un documento y la intención original) que, de no resolverse ahora, quedará librada a la interpretación de quien implemente. Se pide respuesta puntual a cada una antes de continuar.

**Estado (actualizado 2026-09-06): las 25 preguntas están respondidas.** Este archivo queda como registro histórico de qué se preguntó y por qué importaba; las respuestas y su traducción a reglas concretas viven en [decisiones-tomadas.md](decisiones-tomadas.md) (fuente con prioridad sobre SPEC/ARCHITECTURE/IMPLEMENTATION_PLAN) y, ya integradas al canon completo, en `docs/01-SPEC.md` a `docs/04-SINCRONIZACION.md`. No hay preguntas 1-25 sin responder; preguntas de producto nuevas y no relacionadas (alcance de Galaxia+Tienda, calendario por capas) se documentan aparte en sus propios archivos de `nueva-funcionalidad-*.md`.

## Reglas de negocio del cronómetro

**1. ¿Existe (o debe existir) una forma de terminar una sesión voluntariamente conservando el tiempo ya estudiado, sin pasar por la cancelación (que borra todo)?** La máquina de estados del cronómetro (SPEC §15.3) nunca documenta una transición hacia "sesión completada con éxito": solo hay caminos hacia break, study, lunch, cancelled o expired.
*Por qué importa: sin un camino explícito a "completado", el único cierre con reglas claras es la cancelación, que elimina todo el progreso y no suma estadísticas — contrario al objetivo central de medir honestamente el estudio efectivo.*

**2. Cuando una sesión expira por no responder a tiempo, ¿se pierde solo el ciclo actual o también todo el tiempo efectivo de estudio acumulado en ciclos previos del mismo bloque?** SPEC §20.4 dice explícitamente que las sesiones `cancelled` no suman a estadísticas, pero nunca aclara qué pasa con las `expired`, aunque ambas comparten el campo `effectiveStudySeconds`.
*Por qué importa: perder 75+ minutos reales de estudio por no tocar la pantalla en 30 segundos es una penalización severa que cambia por completo cómo debe comunicarse la pérdida del bloque en la UI.*

**3. ¿Qué ventana de espera —30 segundos o 10 minutos— aplica a cada estado concreto de espera del cronómetro?** SPEC §19.3 reconoce la regla como "resolución de diseño para V1" pero no especifica si `study_completed_waiting_response` usa los 30 segundos del flujo de descanso o los 10 minutos genéricos, ni si el panel de `break_selection` tiene límite de tiempo o es indefinido.
*Por qué importa: sin esta definición exacta no se puede implementar la máquina de estados sin adivinar, arriesgando matar bloques de forma injusta o dejar sesiones colgadas indefinidamente.*

**4. ¿El temporizador inverso se detiene automáticamente al llegar a la duración objetivo, o sigue corriendo hasta que el usuario presiona "Finalizar"?** El prompt original solo describe finalización manual, pero SPEC §21.5 agrega una segunda condición ambigua ("al finalizar manualmente o completar duración, se guarda el bloque").
*Por qué importa: son dos productos de UX distintos — uno necesita una alarma de fin como en el modo estudio, el otro es un simple registro de referencia sin límite real.*

**5. ¿Cuántas veces se puede usar el botón de "Almuerzo" (45 min sin matar el bloque) dentro de un mismo bloque de estudio?** Ni el prompt original ni SPEC §18 especifican un límite ni un cooldown.
*Por qué importa: si es ilimitado, el usuario puede acumular descansos de 45 minutos indefinidamente sin estudiar, devaluando la disciplina que el cronómetro busca imponer.*

## Categorías, colores y metas

**6. Al cambiar el color de una categoría, ¿deben recolorearse los bloques/eventos ya guardados, o deben conservar el color con el que fueron creados?** El prompt original pide explícitamente que el cambio de color "actualice automáticamente el resto de eventos de esa categoría", pero SPEC §12.4 decide lo contrario e introduce un `colorSnapshot` inmutable que preserva el histórico, calificándolo de "decisión de diseño".
*Por qué importa: es una contradicción directa entre lo pedido originalmente y lo formalizado como regla obligatoria, y afecta tanto el modelo de datos (si se necesita `colorSnapshot` por sesión) como el comportamiento visual del calendario e historial.*

**7. ¿Un mes sin ninguna meta configurada debe mostrar la estrella mensual o no?** La regla de SPEC §26.5 otorga la estrella si "todas las semanas cerradas con metas configuradas fueron completadas", condición que se cumple vacíamente cuando no hubo ninguna meta ese mes.
*Por qué importa: otorgar la estrella por no haberse propuesto ninguna meta contradice el propósito motivacional del indicador y puede generar una vista anual engañosa.*

## Arquitectura del código: coherencia entre documentos

**8. ¿Dónde deben vivir `StudySessionCoordinator` y `ActiveTimerRecoveryService`, y qué se hace con la carpeta `application/` de ARCHITECTURE.md?** ARCHITECTURE.md los define como responsables de iniciar/recuperar sesiones dentro de `application/`, pero IMPLEMENTATION_PLAN.md no crea ningún archivo ahí en sus 12 fases ni los menciona en ninguna lista de archivos — a diferencia de `StatsAssemblerService`/`CalendarAssemblerService`, que sí sobrevivieron reubicados en `features/*/services/`.
*Por qué importa: sin esta definición, la lógica de recuperación de sesión activa y coordinación de bloques (crítica según SPEC §31 y §34.3) puede terminar dispersa en componentes UI o en el store, justo lo que la arquitectura prohíbe.*

**9. ¿Es intencional que Categorías, Presets, Settings y User accedan a Firestore directamente desde el service, sin repositorio intermedio?** ARCHITECTURE.md §15.1 exige repositorios dedicados para todos los agregados y §15.3 prohíbe que cualquier componente hable directo con Firestore, pero en IMPLEMENTATION_PLAN.md Fase 3 (`category-service.ts`, `preset-service.ts`, `settings-service.ts`) no hay repositorio, mientras que Sessions, Events y Goals sí lo tienen.
*Por qué importa: es una violación directa de una regla arquitectónica explícita que pasaría desapercibida porque el plan no la señala como excepción ni la corrige.*

**10. ¿La carpeta `screens/` de ARCHITECTURE.md debe eliminarse por no usarse, o tiene un propósito distinto que el plan debería empezar a poblar?** ARCHITECTURE.md §5 la define como uno de tres hogares posibles para la UI, pero IMPLEMENTATION_PLAN.md nunca crea un solo archivo ahí en sus 12 fases: toda la UI termina en `app/(tabs)/*.tsx` y `features/*/components/*.tsx`.
*Por qué importa: una carpeta definida en la arquitectura pero nunca poblada genera ambigüedad real sobre dónde crear cada componente de pantalla y puede llevar a que cada fase invente su propia convención.*

## Modelo de datos y nomenclatura de entidades

**11. ¿Cuál es el nombre canónico del contador de recordatorios: `remindersTriggered` (SPEC §22.3) o `reminderCount` (ARCHITECTURE.md §9.5, interfaz `InverseSession`)?**
*Por qué importa: nombres distintos para el mismo campo entre SPEC y ARCHITECTURE pueden producir código inconsistente entre el mapper de Firestore y las validaciones de dominio, generando bugs de tipado silenciosos.*

**12. ¿Debe actualizarse la interfaz `StudySession` de ARCHITECTURE.md §9.4 para incluir `customBreakSelections[]`, `completionReason` y `deviceInfo`, y unificar `sessionStatus`/`status` en un solo nombre?** SPEC §22.2 exige esos campos como "datos mínimos" y usa `sessionStatus`, mientras que la interfaz de ARCHITECTURE.md los omite y usa `status` (que coincide con SPEC §41.4, revelando además una inconsistencia interna del propio SPEC).
*Por qué importa: ARCHITECTURE.md es el documento que se usa para tipar entidades ante Gemini; si la interfaz está incompleta, la sesión se guardará sin trazabilidad de cómo terminó ni qué descansos personalizados eligió el usuario.*

**13. ¿La diferencia entre `startedAt`/`endedAt` (`StudySession`, `InverseSession`) y `startAt`/`endAt` (`InvisibleEvent`, `CalendarItemViewModel`) es intencional (evento planificado vs. sesión registrada) o debe unificarse?**
*Por qué importa: una convención de naming que cambia entidad por entidad dentro del mismo documento es fuente típica de bugs de "undefined" al mapear Firestore, especialmente en el ensamblador de calendario que combina las tres entidades.*

## Sincronización, multi-dispositivo y sesiones huérfanas

**14. Si el usuario intenta iniciar un bloque en un dispositivo mientras ya hay uno activo en otro, ¿qué debe pasar: se bloquea con un mensaje, se ofrece "tomar el control" (matando la sesión del otro dispositivo), o se muestra solo un aviso? Y si la sesión activa queda huérfana (crash, cierre sin cerrar sesión), ¿cómo recupera el usuario la capacidad de iniciar un bloque nuevo en cualquier dispositivo?** SPEC §31.3 y ARCHITECTURE.md §26 solo entregan una "regla recomendada" de una sola sesión activa por usuario, sin definir el flujo de UX.
*Por qué importa: sin este flujo, un usuario puede quedar bloqueado sin poder iniciar ningún bloque en ningún dispositivo porque el sistema cree que hay una sesión activa fantasma, rompiendo el principio de que iniciar un bloque debe tomar pocos toques.*

**15. ¿Qué fuente gana cuando hay discrepancia entre el AsyncStorage local y la referencia activa en Firestore (reinstalación, cambio de celular, reloj del dispositivo desincronizado, caché borrada)?** SPEC §31.3 dice que el estado local es "fuente de verdad mientras está en curso" y menciona que debe existir "resolución clara de conflictos simple" (§31.2), pero no la especifica.
*Por qué importa: es exactamente el tipo de ambigüedad que en la práctica produce sesiones fantasma, banco de descanso duplicado o pérdida silenciosa de datos de estudio.*

**16. Si el usuario cierra o mata la app estando en `study_completed_waiting_response` o `break_completed_waiting_response` y no vuelve a abrirla en días, ¿qué pasa con esa sesión "zombie" que Firestore sigue marcando como activa, y puede iniciar una sesión nueva mientras tanto?** El stack decide no usar Cloud Functions en V1, por lo que nadie evalúa la expiración de 30 segundos / 10 minutos hasta que la app se reabra.
*Por qué importa: sin un proceso server-side que cierre sesiones vencidas, la regla de "una sola sesión activa" puede bloquear indefinidamente a un usuario que simplemente cerró la app en mal momento.*

## Confiabilidad técnica de la implementación

**17. ¿Se decidió explícitamente seguir con Expo Go para todo el desarrollo, o se contempla migrar a un Development Build / EAS Build antes de construir el núcleo del cronómetro (Fase 4)?** El plan indica probar todo con Expo Go desde el día 1, pero SPEC.md exige alarmas precisas con ventana de respuesta obligatoria de 30 segundos, sonido de fin de bloque y selección de audio propio (Document Picker), y Expo Go tiene soporte limitado para notificaciones locales confiables en segundo plano, además de que Android limita temporizadores JS en background.
*Por qué importa: si el cronómetro no puede sonar/notificar de forma confiable en segundo plano bajo Expo Go, el núcleo diferenciador del producto puede no funcionar en producción, y descubrirlo recién en la Fase 4 obligaría a rehacer el setup del proyecto a mitad de camino.*

**18. ¿Se acepta que el audio personalizado elegido con Document Picker sea local a cada dispositivo (no sincronizado), o se espera que el mismo sonido suene también en la versión web?** El stack técnico no incluye Firebase Storage ni ningún mecanismo para subir ese archivo a la nube, pero el producto promete sincronización por cuenta entre Android y web.
*Por qué importa: tal como está definida la arquitectura, no hay forma técnica de que el mismo audio aparezca en otro dispositivo, lo cual contradice la promesa de "cuenta interconectada" si no se acepta como limitación desde ahora.*

## Autenticación

**19. ¿Se debe documentar formalmente en SPEC.md la aceptación del límite de ~100 usuarios sin verificar de Google Sign-In?** El prompt original acepta explícitamente esta limitación por tratarse de uso personal, pero no aparece registrada en ningún documento técnico.
*Por qué importa: sin este registro, un futuro agente o el propio dueño de producto podría interpretar el límite como un bug a resolver e iniciar un proceso de verificación de app con Google que ya se descartó como innecesario.*

## Proceso y alcance de la fase de mockup

**20. ¿Qué debe producir exactamente la fase de mockup (pantallas estáticas, prototipo clicable, diseño en Figma, HTML/código), en qué herramienta, y qué se considera "aprobado" antes de pasar a la Fase 1/2 de IMPLEMENTATION_PLAN.md?** Ninguno de los tres documentos técnicos contempla esta fase —fueron escritos para ir directo a código de producción en Expo/Firebase— y tampoco existen referencias visuales concretas más allá de las descripciones de texto del SPEC.
*Por qué importa: sin definir formato y criterio de salida, el trabajo puede partir en la dirección equivocada o duplicarse construyendo la UI del timer dos veces: una en mockup y otra real.*

**21. ¿El mockup debe respetar ya los nombres y estados definidos en ARCHITECTURE.md (Category, Preset, StudySession, los 10 estados de la máquina del cronómetro), o es una exploración visual libre y desconectada de ese documento?**
*Por qué importa: si el mockup ignora esa estructura puede omitir estados críticos —ventana de 30 segundos, panel de selección de descanso, cancelación con doble confirmación, banco de descanso— que son el corazón funcional del producto, obligando a rediseñar pantallas completas al conectar el mockup con la arquitectura real.*

**22. Ahora que Claude Code es el orquestador real, ¿el flujo ChatGPT (planificación) + Gemini Code Assist (implementación) que estructura IMPLEMENTATION_PLAN.md queda completamente reemplazado, o se sigue usando en paralelo para algo?**
*Por qué importa: si el flujo cambia por completo, buena parte de las secciones del plan sobre roles y prompts para Gemini quedan obsoletas y deberían reescribirse o descartarse antes de avanzar, para no seguir un manual operativo que ya no corresponde.*

**23. ¿En qué orden se deben mockear las 4 secciones del producto (Calendario, Estadísticas, Cronómetro, Configuración)?**
*Por qué importa: el cronómetro es "el corazón del producto" y el de más estados de interacción; mockearlo primero valida los flujos más riesgosos antes de invertir tiempo en pantallas que dependen de sus datos, pero si hay otra prioridad de negocio conviene saberlo ahora y no reordenar el trabajo a mitad de camino.*

**24. ¿SPEC.md, ARCHITECTURE.md e IMPLEMENTATION_PLAN.md deben tratarse como definitivos para el mockup, o hay partes que se quieren reabrir o ajustar antes de avanzar al diseño visual?**
*Por qué importa: los documentos contienen secciones que ya no reflejan el flujo real de trabajo con Claude Code; si se tratan como intocables, el mockup se construye sobre una base parcialmente desactualizada.*

## Alcance de la cancelación (pregunta agregada el 2026-09-06, tras resolver la ronda de 24 preguntas)

**25. ¿La cancelación de una sesión sigue perdiendo TODO el progreso (todos los bloques ya completados), o —al igual que ahora se decidió para la expiración— solo se pierde el bloque en curso, conservando el tiempo efectivo de los bloques previos ya completados en esa misma sesión?** SPEC v1 §20 diseña la cancelación como deliberadamente severa (doble confirmación de 15+15 s, frase personalizada editable, "dar gravedad emocional a la pérdida del bloque") precisamente porque hasta ahora perdía todo. `decisiones-tomadas.md` mantiene esa regla sin cambios ("cancelarla, borra todo"), pero nadie le ha confirmado explícitamente a Gregorio si debería alinearse con la nueva regla de expiración parcial, o si la severidad total es intencional y debe permanecer así.
*Por qué importa: cambia el propósito y la severidad percibida de toda la pantalla de cancelación — si cancelar ahora solo cuesta ~25 minutos en vez de la sesión completa, probablemente ya no justifica la misma fricción de doble confirmación de 30 segundos ni la carga emocional del diseño original (animación triste, frase personalizada), y el copy/UX de esa pantalla debería ajustarse en consecuencia. Es justo la distinción que le da sentido a que cancelar y expirar sean dos caminos distintos en la máquina de estados.*
