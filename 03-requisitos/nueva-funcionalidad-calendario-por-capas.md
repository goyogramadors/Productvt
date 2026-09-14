# Nuevo requerimiento — Calendario por capas (2026-09-06)

Pedido en vivo por Gregorio, ampliando el criterio de la sección Calendario (SPEC §23-24, ARCHITECTURE.md §19). Se documenta aquí para que quede en el canon antes de que se construya la Fase 7 (Calendario) — el build de código todavía no llegó a esa fase (va por la Fase 4b, núcleo del cronómetro), así que hay margen para diseñarlo bien en vez de parchearlo después.

## 1. Calendario "por capas" (como calendarios superpuestos, estilo Google Calendar)

El calendario no debe ser una sola vista plana de todos los eventos — debe soportar **capas** independientes que se puedan crear, nombrar y activar/desactivar por separado:

- **Capas ligadas a una meta**: cada meta (`WeeklyGoal`) debe poder tener su propio "calendario" — una capa que muestra específicamente los eventos/sesiones asociados a esa meta (razonablemente, filtrado por la categoría de estudio que la meta rastrea).
- **Capas de "horario" o personalizadas**: el usuario también debe poder crear calendarios propios que **no** dependan de ninguna meta — agrupaciones libres definidas por el usuario (por ejemplo, un "horario" con sus clases, o cualquier agrupación personalizada de categorías/eventos).
- **Filtro de vista**: el usuario puede activar o desactivar cada capa para ver solo lo que le interesa en un momento dado (equivalente a los checkboxes de "Mis calendarios" en Google Calendar).

No se especifica aquí el modelo de datos exacto (¿una entidad `CalendarLayer` nueva? ¿se deriva directo de `Category`/`WeeklyGoal`?) — queda a criterio de quien diseñe la arquitectura de esta fase, siguiendo el mismo patrón ya usado en el proyecto (diseñar el esquema, no solo el requisito).

## 2. Vistas requeridas

Amplía SPEC §23.4 (que solo pedía día/semana/mes/año) a 5 niveles de zoom:

- **Año**
- **Mes**
- **Semana**
- **3 días**
- **Día** — esta vista debe mostrar **franja horaria** (timeline con horas, como la vista de día de Google Calendar), no solo una lista de eventos del día.

## 3. Requisitos de UX y densidad visual

- Optimizado especialmente para **computador y celular** — responsive real (no solo que "quepa"), pensado para ambos como plataformas primarias de uso del calendario (a diferencia del cronómetro, que es Android-only para el rol dominante — el calendario es de consulta/gestión y debe verse bien en ambos, ver decisiones-tomadas.md sección "Alcance de plataformas").
- La **vista Semana** (la vista "normal", la que más se va a usar) debe maximizar la cantidad de eventos visibles **sin saturar visualmente** — hay que resolver la densidad de información con cuidado (agrupación, truncado tipo "+N más", tamaños de fuente/bloque, etc., como hacen los calendarios profesionales), no solo apilar eventos hasta que no quepan.

## 4. Vista por defecto configurable

La vista con la que se abre el calendario (año/mes/semana/3 días/día) debe ser **configurable por el usuario** (en Settings o en el propio calendario), no una vista fija hardcodeada.

## Preguntas abiertas para quien lo arquitecture

- ¿La capa de una meta se limita a la duración/alcance de esa meta (p. ej. solo la semana vigente) o muestra histórico completo de esa categoría?
- ¿Las capas personalizadas agrupan por categoría, por evento individual, o ambas?
- ¿La visibilidad de capas (qué está prendido/apagado) se sincroniza entre dispositivos (Firestore) o es preferencia local por dispositivo?
- ¿Hay un límite razonable de capas simultáneas antes de que la vista se sature, o eso lo resuelve el diseño de densidad del punto 3?
