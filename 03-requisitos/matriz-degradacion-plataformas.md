# Matriz de degradación funcional por plataforma (notificaciones, audio, background)

Contribución de productvt-7b para `05-ARQUITECTURA.md` (referenciado como pendiente en `docs/02-DOMINIO.md` §7 y `docs/03-CRONOMETRO.md` §0). La matriz de **datos** (qué colección/documento puede leer o escribir cada plataforma) ya está resuelta en `02-DOMINIO.md` §7 — esta matriz cubre lo que falta: qué tan confiable es cada mecanismo de la app (alarmas, sonido, timers en segundo plano) en cada plataforma. Resuelve REV-ALTA-5 y REV-ALTA-6 de `revision-spec-beta.md`.

Consistente con "Alcance de plataformas" y "Confiabilidad técnica" de `decisiones-tomadas.md`: Android es la única plataforma dominante del cronómetro; web/desktop-PWA son espectadores y gestores completos de todo lo demás.

## 1. Android (development build local, no Expo Go)

| Mecanismo | Confiabilidad | Notas |
|---|---|---|
| Notificación local programada (`expo-notifications`) | Alta, con matices | Requiere development build (Expo Go no soporta bien background); pedir exención de optimización de batería al primer uso; en Android 12+ puede requerir el permiso de alarma exacta si se usa `AlarmManager` de precisión — si `expo-notifications` no lo expone directamente, aceptar el margen de imprecisión del scheduler estándar en vez de sumar un módulo nativo extra (mantiene "costo cero" y "sin librerías innecesarias", SPEC §6.3). |
| Audio de alarma (`expo-audio`) | Alta | Con development build no depende de gesto de usuario reciente (a diferencia de web); se reproduce igual con la app en background si la notificación la dispara. |
| Timer en segundo plano (cálculo del tiempo transcurrido) | Alta, por diseño | El motor NO depende de que `setInterval` seguí corriendo en background (ARCHITECTURE.md §11.3): se calcula por diferencia de timestamps al volver al foreground o al recibir la notificación. La app puede estar completamente suspendida y el cronómetro sigue siendo exacto. |
| Riesgo residual | Medio | Doze mode / app-killers agresivos de algunos fabricantes (Xiaomi, Huawei, algunos Samsung) pueden retrasar o descartar la notificación igual pese a la exención de batería. Mitigación: ninguna adicional en V1 más allá de pedir la exención — es un riesgo de plataforma aceptado, no bloqueante porque el timestamp-based engine igual reconstruye el tiempo real al reabrir. |

## 2. Web / Desktop-PWA (espectador del cronómetro, gestor completo de todo lo demás)

| Mecanismo | Confiabilidad | Notas |
|---|---|---|
| Notificación local / Web Push | No disponible en V1 | Requeriría Service Worker adicional con Web Push, fuera del alcance gratuito simple de Firebase Hosting — no se implementa. La web nunca necesita alarmar nada porque **nunca es dominante** (no inicia ni acciona bloques, "Alcance de plataformas"). |
| Audio automático | No garantizado | Los navegadores bloquean autoplay de audio sin gesto de usuario reciente. Sin impacto real porque la web no reproduce las alarmas del cronómetro (es espectador de solo lectura del `onSnapshot`, ver `02-DOMINIO.md` §7). |
| Timer en segundo plano / pestaña no enfocada | Se ve afectado pero no importa | Los navegadores throttlean `setInterval`/`setTimeout` en pestañas no enfocadas. Sin impacto real por el mismo motivo que el punto anterior: el reloj mostrado en web se **interpola** desde `segmentStartedAt`/`segmentTargetSeconds` del documento remoto (mismo motor por timestamps que Android), no desde un `setInterval` propio — al volver el foco, se recalcula exacto igual que en Android. |
| Riesgo residual | Ninguno relevante para V1 | Todos los riesgos típicos de "temporizador vivo en navegador" dejan de aplicar porque el diseño ya evita depender de que el navegador mantenga el tiempo real — la web solo necesita **leer** el estado, nunca producir una alarma confiable. |

## 3. Camino a V1.1 si la web pasa a ser dominante

Si en el futuro se habilita "web dominante" (ya previsto sin cambio de modelo en `02-DOMINIO.md` §7), esta matriz cambia: en ese momento sí haría falta resolver Web Push (Service Worker) y aceptar la política de autoplay de audio como limitación real — no antes, porque V1 nunca pone a la web en el camino crítico de una alarma.

## Resumen para `05-ARQUITECTURA.md`

La razón por la que esta matriz es más corta de lo que el hallazgo original (REV-ALTA-5/6) hacía temer: el motor de timestamps (ya decidido en ARCHITECTURE.md §11.3 y confirmado en el modelo dominante/espectador) convierte casi todos los riesgos de "background poco confiable" en irrelevantes — ningún cliente necesita mantener un reloj corriendo en segundo plano, solo reconstruirlo al volver a mirar. El único riesgo real que sobrevive es Android-específico (notificación que no despierta la pantalla por Doze/fabricante), y es un riesgo de plataforma aceptado, no algo que el diseño de software pueda eliminar del todo sin costo adicional.
