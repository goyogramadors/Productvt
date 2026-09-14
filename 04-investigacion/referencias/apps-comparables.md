# Apps comparables — inspiración de producto para Productvt Beta

## Propósito

Este documento reúne apps de referencia que ya resuelven, parcial o totalmente, alguno de los problemas que aborda Productvt Beta: cronómetro de estudio con reglas estrictas, banco de descanso, válvula de escape sin culpa, medición honesta de ocio, calendario, estadísticas por categoría y gamificación por constancia. **No es un benchmarking competitivo exhaustivo** (ninguna de estas apps compite directamente con Productvt) ni un análisis de mercado: es inspiración de producto para decidir qué patrones adoptar y cuáles evitar. La investigación se hizo con búsquedas web (reviews, notas de producto, foros) en septiembre de 2026; donde no se encontró información específica y verificable sobre una app, se indica explícitamente en vez de inventarla.

---

## Forest (app de enfoque con árboles)

**Qué hace bien:** flujo de inicio de sesión sin fricción — plantar un árbol y listo, sin formularios — y una metáfora visual simple (el árbol se marchita si abandonas la app) que convierte "no tocar el teléfono" en un compromiso emocional legible de un vistazo. Es el ejemplo más citado de gamificación de enfoque que lleva más de una década funcionando y siendo rentable. Productvt puede tomar de aquí la idea de que el costo de abandonar debe sentirse (no solo registrarse como un número), aplicado a su propia mecánica de cancelación con fricción.

**Qué evitar:** la crítica más repetida es que la gamificación se siente "infantil" o insuficientemente motivadora para power users, y que el control de alarmas/temporizador tiene fallas de continuidad (quirks). También hay una crítica académica sobre la "paradoja" de una app de desconexión digital que depende de mantener al usuario enganchado a su propia app para funcionar — algo a tener en cuenta si Productvt refuerza demasiado el lado "premio visual" sin sustancia de datos reales debajo.

**Mecanismo comparable:** no tiene equivalente a un banco de descanso acumulable ni a un botón de almuerzo/pánico — el modelo de Forest es binario (sesión intacta o "muerta" si sales de la app), sin la flexibilidad de gastar descanso ganado de forma granular. Tampoco tiene temporizador inverso de ocio ni sistema de estrella mensual atada a metas semanales.

Sources: [Forest Reviews (2026) | Product Hunt](https://www.producthunt.com/products/forest/reviews), [Forest App Review 2026 – Calmevo](https://calmevo.com/forest-app-review/), [Stay focused and grow a Forest: paradoxes of gamified digital disconnection](https://www.researchgate.net/publication/385812746_Stay_focused_and_grow_a_Forest_The_design_and_paradoxes_of_gamified_digital_disconnection)

---

## Toggl Track

**Qué hace bien:** medición honesta como principio de producto explícito — Toggl declara públicamente que nunca implementará funciones de "vigilancia" o prueba de trabajo (proof of work), priorizando la privacidad del usuario sobre el control. Sus reportes son claros para ver patrones de uso por proyecto/categoría a lo largo del tiempo, y funciona igual de bien en desktop, web y móvil, con seguimiento offline. Productvt puede tomar de aquí la idea de declarar como principio de producto (ya lo hace: "medición honesta es innegociable", §7.1 de 01-SPEC.md) y de mantener reportes multiplataforma consistentes sin degradar funcionalidad de gestión entre dispositivos.

**Qué evitar:** funciones clave (edición de entradas, tarifas facturables, forecasting) quedan detrás de planes pagos, y el reporting carece de filtrado avanzado para necesidades complejas; además no tiene función de pausa nativa en el tracking de tiempo, lo que puede inflar el tiempo registrado si el usuario se distrae sin pausar manualmente — justo el problema que el banco de descanso y la ventana de respuesta de Productvt buscan prevenir estructuralmente.

**Mecanismo comparable:** no tiene banco de descanso, botón de almuerzo, temporizador inverso ni sistema de metas gamificadas con estrella — es una herramienta de registro de tiempo neutral, sin mecánicas de disciplina ni de premio.

Sources: [Toggl Track Review 2025 – Hubstaff](https://hubstaff.com/blog/toggl-track-review/), [Honest Toggl Track Review 2026 – Connecteam](https://connecteam.com/reviews/toggl-track/), [Honest Toggl Track Review by a Competitor – Jibble](https://www.jibble.io/reviews/toggl)

---

## Focus To-Do / Pomofocus

**Qué hace bien:** son dos extremos útiles del mismo espectro. Focus To-Do combina temporizador Pomodoro con gestor de tareas visible durante el bloque, eliminando el cambio de contexto entre "qué voy a hacer" y "estoy haciéndolo"; sincroniza entre Android, iOS, Windows y Mac. Pomofocus, en el otro extremo, reduce todo a un dashboard único con inicio/pausa/reset y personalización de duración, sin pop-ups ni widgets — "no fluff, just a timer". Productvt puede tomar de Pomofocus la disciplina de que iniciar una sesión debe tomar pocos toques (ya es RF-CRO-01), y de Focus To-Do la idea de que el contexto (categoría, nombre) debe estar siempre visible sin navegar.

**Qué evitar:** Focus To-Do es criticado por sentirse "abultado" (bloated) cuando el usuario solo quiere iniciar un timer rápido, sin colaboración en equipo ni integración de calendario real. Pomofocus, a la inversa, renuncia a todo lo que dé visibilidad de mediano plazo (sin bloqueo de distracciones, sin vista agregada de progreso) a cambio de su simplicidad — un trade-off que Productvt no puede permitirse porque su propuesta de valor incluye estadísticas y metas, no solo el timer.

**Mecanismo comparable:** ninguno de los dos tiene banco de descanso acumulable (el descanso Pomodoro estándar se pierde si no se usa), botón de almuerzo, temporizador inverso de ocio ni estrella mensual por metas. Ninguna búsqueda encontró evidencia de que algún timer Pomodoro mainstream permita "ahorrar" minutos de descanso no usados para gastarlos después — este parece ser un mecanismo genuinamente distintivo de Productvt, no encontrado en ninguna app de referencia investigada.

Sources: [10 Best Pomodoro Timer Apps – The Digital Project Manager](https://thedigitalprojectmanager.com/tools/best-pomodoro-timer-app/), [Focus To-Do Review 2026 – Goals and Progress](https://goalsandprogress.com/focus-to-do-review-2026/), [Pomodoro Apps Compared – Goals and Progress](https://goalsandprogress.com/pomodoro-apps-comparison/)

---

## Session (app de estudio para Mac/iOS con Focus Mode)

**Qué hace bien:** integración nativa profunda con el sistema operativo (Focus Mode de Apple para silenciar notificaciones, Apple Shortcuts para automatizar) y un nivel de pulido visual que reviews describen como "hecho por el mismo equipo que diseña las apps de Apple". Bloquea apps/webs distractoras durante la sesión y las restaura al terminar, y sincroniza progreso entre iPhone, iPad y Mac con reportes de sesión y notas post-sesión. Productvt puede tomar de aquí el estándar de calidad visual que se propone alcanzar con su skin "Papel" (RF-TEM-02) y la idea de dejar una nota o registro post-sesión con contexto, no solo un número.

**Qué evitar:** Session depende de un ecosistema cerrado (solo Apple), lo que la hace irrelevante como referencia de multiplataforma; Productvt ya resuelve esto distinto (Android dominante + PWA espectadora). No se encontró en la investigación una crítica específica y verificable sobre limitaciones o quejas de usuarios de Session más allá de reseñas mayormente positivas — se señala esta falta de información en vez de inventar una debilidad.

**Mecanismo comparable:** no se encontró evidencia de que Session tenga banco de descanso acumulable, botón de almuerzo/pánico, temporizador inverso de ocio ni estrella mensual por metas semanales — su enfoque es bloqueo de distracciones + reportes, no las mecánicas de disciplina/perdón que definen a Productvt.

Sources: [Session – Pomodoro focus timer with analytics](https://www.stayinsession.com/), [The Best Focus App for macOS And iOS? – Mac O'Clock](https://medium.com/macoclock/the-best-focus-pomodoro-time-tracking-app-for-mac-ios-a78ff1007356)

---

## Habitica (gamificación de hábitos)

**Qué hace bien:** es la referencia más profunda de gamificación real (RPG completo: puntos de experiencia, oro, salud, subir de nivel, equipo) aplicada a constancia diaria, con streaks que otorgan logros permanentes cada 21 días consecutivos que nunca se pierden aunque el streak se rompa después. Esa idea — un logro que reconoce constancia pasada de forma permanente, sin poder "perderse" retroactivamente — es relevante para cómo Productvt podría pensar el histórico de estrellas mensuales ya obtenidas (aunque el RF-MET-04 de Productvt ya protege esto al materializar por sesión). También tiene accountability social opcional (guilds, quests) que Productvt descarta explícitamente como no-objetivo (§3.1-3.2 de 01-SPEC.md).

**Qué evitar:** la crítica más consistente es UI sobrecargada y curva de aprendizaje pronunciada para quien no conoce mecánicas RPG, además del riesgo de que el usuario optimice por puntos en vez de por el hábito real ("gamificar la métrica, no la conducta"), notificaciones excesivas y bugs que afectan streaks. Esto es exactamente el riesgo que Productvt evita al exigir "constancia real, no vacía" para la estrella (RF-MET-04: sin metas configuradas nunca hay estrella) — Habitica es la prueba de qué pasa cuando el juego se puede "ganar" sin que el hábito de fondo ocurra.

**Mecanismo comparable:** el streak-por-múltiplos-de-21-días de Habitica es conceptualmente parecido a una estrella por constancia, pero está atado a rachas diarias ininterrumpidas, no a metas semanales configurables por categoría con cierre semanal explícito como en Productvt (RF-MET-03/04). No tiene equivalente a banco de descanso, almuerzo ni temporizador inverso — Habitica no mide sesiones de tiempo, mide tareas/hábitos discretos.

Sources: [Habitica App Review 2026 – ChoosingTherapy](https://www.choosingtherapy.com/habitica-app-review/), [Honest Habitica Reviews – DeepFocusTools](https://deepfocustools.com/habitica-reviews/), [Streaks | Habitica Wiki](https://habitica.fandom.com/wiki/Streaks)

---

## Google Calendar (referencia de UI de calendario)

**Qué hace bien:** el patrón de vistas día/semana/mes/año con navegación consistente (swipe entre días, tap/swipe para colapsar a vista mensual) es el estándar que cualquier usuario ya conoce sin curva de aprendizaje — exactamente lo que Productvt necesita para que su calendario (RF-CAL-01) no requiera onboarding propio. El uso de bloques de color sólido por evento/categoría en vista semana es directamente aplicable a la regla de "color vivo" de Productvt (RF-CAT-04, RF-CAL-02).

**Qué evitar:** una crítica de UX documentada es que Google Calendar a veces desperdicia espacio de pantalla mostrando franjas horarias vacías (p. ej. 00:00–06:00) en vez de comprimirlas, obligando a hacer scroll para ver los eventos reales del día — relevante para Productvt porque su calendario también combina sesiones reales y eventos invisibles planificados, y el principio de "minimalismo funcional" (§2.6 de 01-SPEC.md) exige que el calendario no se sobrecargue de ruido ni obligue a scrollear de más.

**Mecanismo comparable:** el término "eventos invisibles" de Productvt no tiene relación con ninguna función de "eventos ocultos" de Google Calendar (esa noción no existe ahí en el sentido de Productvt); la búsqueda solo encontró críticas de UX sobre información oculta por falta de espacio, no una categoría de evento que se vea en calendario pero se excluya deliberadamente de reportes — ese diseño (visible en calendario, invisible en estadísticas) parece propio de Productvt y no tiene equivalente encontrado en Google Calendar.

Sources: [Calendar UI Examples – Eleken](https://www.eleken.co/blog-posts/calendar-ui), [Google Calendar's big redesign – Android Police](https://www.androidpolice.com/google-calendar-redesign-enable/), [22 handy hidden tricks for Google Calendar on Android – Computerworld](https://www.computerworld.com/article/1722623/google-calendar-android.html)

---

## Opal / One Sec (bloqueo de distracciones)

**Qué hace bien:** ambas construyen su propuesta de valor sobre "fricción deliberada" como mecanismo de cambio de conducta, no sobre fuerza de voluntad — la misma filosofía detrás de la cancelación de doble confirmación de Productvt. One Sec en particular tiene evidencia de investigación publicada (PNAS) mostrando que una pausa breve antes de abrir una app redujo un 57% las aperturas después de seis semanas de uso, validando que la fricción bien calibrada funciona y no es solo intuición de producto. Opal reporta reducciones de screen time de hasta 31% en sus usuarios.

**Qué evitar:** ambas apps son software bloqueando software — un usuario decidido puede desinstalar la app, cambiar ajustes del sistema o encontrar workarounds, así que la fricción nunca es "no negociable" al 100% (a diferencia de la cancelación de Productvt, que corre server-side en Firestore con una ventana de tiempo real, no solo una capa de UI en el dispositivo). One Sec además solo intercepta el lanzamiento nativo de apps, no navegación dentro del navegador — y la investigación advierte que después de dos semanas el cerebro "aprende el patrón" y la fricción pierde efecto, algo que Productvt debería vigilar si la cancelación de 15+15s se vuelve rutina memorizada en vez de una pausa real de reflexión. El modelo de precios de Opal (~100 USD/año con las funciones fuertes tras paywall) es exactamente lo que Productvt descarta por diseño (costo cero, sin pagos).

**Mecanismo comparable:** ninguna de las dos tiene un botón de "almuerzo" (pausa con gravedad cero, sin fricción, con límite de uso cada N bloques) — su fricción es unidireccional (siempre dificultan la acción), mientras que el almuerzo de Productvt es una válvula de escape deliberadamente sin fricción pero con cooldown. Tampoco tienen banco de descanso, temporizador inverso ni estrella mensual.

Sources: [Opal App Review – MakeUseOf](https://www.makeuseof.com/opal-screen-time-limiting-app-helps-use-phone-less/), [Directing smartphone use through the self-nudge app one sec – PNAS](https://www.pnas.org/doi/10.1073/pnas.2213114120), [One sec app review – Blok](https://www.blok.so/resources/one-sec-app-review-does-adding-friction-actually-reduce-screen-time)

---

## Streaks

**Qué hace bien:** ganó un Apple Design Award por llevar la simplicidad al extremo — hábitos como botones grandes que se mantienen presionados para marcar completado, con una cuadrícula visual donde los hábitos cumplidos "brillan". Limita deliberadamente a un máximo de tareas (históricamente 12, hoy hasta 24) como decisión de producto, no como limitación técnica — fuerza al usuario a priorizar en vez de acumular hábitos infinitos. Sus widgets nativos de iOS son señalados como los mejores de su categoría. Productvt puede tomar de aquí la disciplina de que una restricción deliberada de alcance (como "un dominante a la vez" o "solo Android ejecuta el cronómetro") puede ser una fortaleza de producto, no una carencia, si se comunica bien.

**Qué evitar:** es una app de un solo ecosistema (Apple) y de hábitos discretos diarios (sí/no), no de duración de tiempo — no resuelve el problema de medir cuánto tiempo real se dedicó a algo, que es el núcleo de Productvt. No se encontró en la investigación ninguna crítica sustancial de usuarios más allá de la limitación de número de hábitos (que la propia app defiende como filosofía, no como bug).

**Mecanismo comparable:** no tiene banco de descanso, almuerzo, temporizador inverso ni estrella mensual — su unidad de gamificación es la racha diaria consecutiva, no una meta semanal de tiempo por categoría con cierre y evaluación explícitos como en Productvt (RF-MET-03).

Sources: [Streaks – Daily Habit Tracker – App Store](https://apps.apple.com/in/app/streaks-daily-habit-tracker/id6448960901), [Streaks Limits You to 12 Habits — That's the Point – AppPicked](https://www.apppicked.com/en/blog/streaks-habit-tracker-ios-review), [The Best Habit Tracking App for iOS – The Sweet Setup](https://thesweetsetup.com/apps/best-habit-tracking-app-ios/)

---

## Búsquedas adicionales sobre mecanismos específicos

Se hicieron búsquedas dirigidas para verificar si el banco de descanso acumulable, el botón de almuerzo/pánico, el temporizador inverso con tope duro, o la estrella mensual por metas semanales existen en alguna app mainstream fuera de las siete revisadas arriba:

- **Banco de descanso acumulable**: ninguna búsqueda encontró un timer Pomodoro que permita "ahorrar" minutos de descanso no usados para gastarlos en un descanso posterior más largo. El patrón estándar de la industria (Focus To-Do, Pomofocus y equivalentes) es que el descanso no tomado simplemente se pierde.
- **Botón de pánico/pausa sin culpa**: la app **1Focus Pro** ofrece "pausar el bloqueo por tiempo limitado para emergencias sin perder el progreso", que es el mecanismo más cercano encontrado a la filosofía del almuerzo de Productvt (pausar sin penalizar), aunque está pensado para bloqueo de distracciones, no para un cronómetro de estudio con bloques y banco.
- **Temporizador inverso que sigue corriendo tras la meta con tope duro**: se encontraron apps de "count-up timer" y "reverse timer" genéricas (p. ej. Count Up Timer, Tymerao) que cuentan hacia arriba desde una meta, pero ninguna con el mecanismo específico de Productvt de notificar al llegar a `T`, seguir corriendo, y auto-cerrarse duro a `2·T`.
- **Estrella mensual condicionada a que todas las metas de todas las semanas configuradas se cumplan**: el logro por streak de Habitica (múltiplos de 21 días) es el pariente más cercano, pero mide racha diaria continua, no el cumplimiento de metas semanales configurables por categoría con la regla anti-vacuidad de Productvt (RF-MET-04: sin metas nunca hay estrella).

En los cuatro casos, no se encontró una app de referencia con el mecanismo exacto — se registra aquí como ausencia de evidencia, no como confirmación de que no exista en absoluto.

Sources: [How to Temporarily Pause Blocking in 1Focus](https://onefocusapp.com/pause-blocking/), [Reverse Time – App Store](https://apps.apple.com/us/app/reverse-time/id6447112198), [Count Up Timer – App Store](https://apps.apple.com/app/count-up-timer/id6743041311)

---

## Síntesis: qué haría única a Productvt frente a estas referencias

Ninguna de las apps investigadas combina, en una sola herramienta, las cuatro piezas que definen a Productvt: un banco de descanso que perdona en vez de desperdiciar, una válvula de escape sin culpa con cooldown propio, un temporizador de ocio que mide honestamente sin mezclarse con el estudio, y una gamificación (la estrella mensual) que exige constancia real y nunca se otorga por vacuidad. Los timers Pomodoro (Focus To-Do, Pomofocus) resuelven el bloque de estudio pero tratan el descanso como algo binario y desechable; las apps de fricción (Opal, One Sec) y Forest resuelven la disciplina de no abandonar pero sin la flexibilidad ni la contabilidad honesta del banco; Habitica y Streaks resuelven la gamificación de constancia pero sobre hábitos discretos, no sobre duración de tiempo medida con la rigurosidad de `effectiveStudySeconds` vs. `totalElapsedSeconds`. La diferenciación central de Productvt —que terminar un bloque exige responder dentro de una ventana y cancelar exige una decisión deliberada con gravedad emocional (15+15 s)— tampoco tiene equivalente exacto: la fricción de Opal/One Sec es unidireccional (siempre dificulta), mientras que Productvt combina fricción para abandonar con una válvula de escape sin fricción (almuerzo) para lo que sí merece perdón. Esa combinación de rigidez donde importa y flexibilidad donde aporta valor, unida a una medición que nunca infla una cifra, es lo que ninguna referencia investigada ofrece completo.
