# Nuevo requerimiento — Sistema de rachas, logros de perfil y sincronización de cuenta (2026-09-06)

Pedido en vivo por Gregorio a esta sesión (BC Orquestador). Separa y eleva a requerimiento propio algo que hasta ahora solo aparecía de pasada dentro de Galaxia/Tienda (el "cofre cada 7 días de racha" — ver `nueva-funcionalidad-galaxia-tienda.md`): la **racha en sí** (su lógica de cómputo, persistencia y sincronización) es infraestructura transversal, no un detalle de la Tienda. También pide una vista de **logros de perfil** por usuario, refuerza la **sincronización multi-dispositivo a partir de la cuenta** para estos datos nuevos, y reitera que la **optimización responsive** debe cubrir toda la app, no solo el calendario.

## 1. Sistema de rachas ("online", sincronizado por cuenta)

- Una racha = días consecutivos cumpliendo un criterio de uso (criterio exacto sin definir — ver preguntas abiertas).
- Debe ser **online**: la racha vive en la cuenta del usuario en Firestore, no solo localmente en un dispositivo, así que se ve igual sin importar desde qué dispositivo se consulte (mismo principio que el resto de la app: la cuenta es la fuente de verdad, no el dispositivo).
- La lógica de cómputo de racha es infraestructura separada del sistema de recompensas: los cofres de la Tienda (V1.1) son solo un **consumidor** de esta infraestructura, no la definen.

## 2. Logros de perfil

- Cada usuario debe tener una vista de **perfil** que muestre sus logros — incluye al menos las medallas de récord de racha ya mencionadas en el requerimiento de Galaxia/Tienda.
- No se especificó el catálogo completo de logros más allá de las medallas de racha.

## 3. Sincronización multi-dispositivo a partir de la cuenta

- Refuerza que la sincronización por cuenta debe cubrir racha y logros, no solo el cronómetro. Esto probablemente ya cae dentro del modelo "CRUD paralelo sin arbitraje" que `04-SINCRONIZACION.md` §10 ya define para todo lo que no es el timer activo (sincroniza como CRUD normal de Firestore, sin protocolo especial) — pero conviene confirmarlo explícitamente para estos datos nuevos en vez de asumirlo.

## 4. Optimización responsive para todos los formatos de la app

- No es solo el calendario (ver `nueva-funcionalidad-calendario-por-capas.md`): toda la app debe verse y funcionar bien optimizada en los distintos formatos de pantalla (celular, tablet, desktop/web).

## Preguntas abiertas

- ¿Qué cuenta como "cumplir" un día para mantener la racha? ¿Al menos una sesión de estudio completada ese día calendario? ¿Cumplir alguna meta específica? ¿Un mínimo de tiempo efectivo?
- ¿La racha se corta a medianoche en la zona horaria del usuario, o hay margen de tolerancia?
- ¿El catálogo de "logros" incluye algo más allá de medallas de racha (constancia por categoría, horas totales acumuladas, metas cumplidas, etc.)?
- ¿El perfil de logros es visible solo para el propio usuario, o tiene algún componente social? (conecta con la pregunta abierta del botón "Amigos" en `nueva-funcionalidad-galaxia-tienda.md`, todavía sin definir).

## A quién le corresponde

- **productvt-90** (arquitectura/canon): diseñar el modelo de datos de racha (¿campo agregado cacheado en el perfil, o se deriva en cliente de las sesiones existentes, siguiendo el patrón de agregadores ya usado para estadísticas?) y el catálogo de logros.
- **Diseño visual/UX** (productvt-9b u otra sesión de frontend): la pantalla de perfil/logros, y la revisión responsive de todos los formatos de la app.
