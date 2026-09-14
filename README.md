# Productvt

App para celular y desktop. Este repositorio se organiza por fases de trabajo: **actualmente estamos en fase de Mockup** — diseño visual, flujos y validación de producto — sin entrar todavía en implementación técnica ni infraestructura.

## Estructura de carpetas

- **00-vision/** — Visión de producto, objetivos, alcance, público objetivo.
- **01-mockups/** — Diseños visuales de la app.
  - `mobile/` — Mockups de la versión móvil.
  - `desktop/` — Mockups de la versión de escritorio.
  - `design-system/` — Paleta de colores, tipografía, componentes reutilizables.
- **02-flujos-usuario/** — User flows, journeys, diagramas de navegación.
- **03-requisitos/** — Historias de usuario, especificaciones funcionales.
- **04-investigacion/** — Research de mercado y usuarios.
  - `referencias/` — Apps o productos de referencia/inspiración.
  - `competidores/` — Análisis de competencia.
- **assets/** — Recursos gráficos compartidos (imágenes, íconos, fuentes).
- **infraestructura/** — Reservado para una etapa posterior (arquitectura técnica, backend, deploy, CI/CD). No trabajar aquí todavía.

## Fase actual: construcción teórica v2 → prototipo funcional

La fase de mockup quedó superada el 2026-09-05: el creador respondió las 24 preguntas de `03-requisitos/preguntas-para-el-creador.md` y pidió construir directamente un prototipo funcional compilable. El flujo se reorganiza así:

- **`docs/`** — canon v2 del producto y la técnica, escrito por la sesión `productvt-90`. Empieza por `docs/00-INDICE.md` (orden de lectura por audiencia). Las decisiones transversales están en `docs/_brief-orquestador.md`; los documentos v1 originales quedan en `docs/originales/` solo como histórico.
- **`03-requisitos/`** — canal compartido de decisiones: `preguntas-para-el-creador.md`, `decisiones-tomadas.md` (v2, con las respuestas del creador) y `revision-spec-beta.md` (revisión externa del SPEC v1). Toda decisión nueva se registra aquí primero y luego se propaga a `docs/`.
- **`productvt-beta/`** — el código real (Expo SDK 57 + TypeScript + Firebase plan Spark). Se construye desde una sola sesión a la vez siguiendo `docs/08-PLAN-IMPLEMENTACION.md`.
- **`00-vision/`, `01-mockups/`** — material de la sesión de frontend (formulario de decisiones, mockup HTML del cronómetro cuyos tokens son el skin base "Papel").

Restricción dura del proyecto: **costo cero** (Firebase Spark, development build local en Android, web y desktop como PWA; sin EAS Build, Cloud Functions ni Storage).
