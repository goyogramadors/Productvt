# Iniciar Aquí — Productvt

Puerta de entrada del repositorio: qué es este proyecto, dónde vive cada tipo de información y qué reglas de gobernanza son innegociables. Léelo antes de tocar cualquier carpeta — toma menos de dos minutos y evita duplicar trabajo o pisar una decisión ya tomada.

## Qué es Productvt

App de estudio (cronómetro de bloques + calendario + estadísticas) para celular y desktop. El código real vive en `productvt-beta/` (Expo SDK 57 + TypeScript + Firebase plan Spark); todo lo demás en la raíz es producto, investigación y decisiones que anteceden y gobiernan ese código.

## Jerarquía de fuentes de verdad

No hay un solo documento "maestro": hay una cadena de autoridad, en este orden —

1. **`03-requisitos/`** — canal crudo de decisiones (respuestas literales del creador, revisión externa, requerimientos nuevos). Nada se construye directo sobre una instrucción verbal sin pasar por aquí primero.
2. **`docs/`** — el canon técnico. Absorbe y resuelve lo que entra por `03-requisitos/`; es la fuente autoritativa de producto, dominio, arquitectura y UI mientras no haya sido superada.
3. **`productvt-beta/src/`** (código commiteado) — cuando el código as-built es sano y solo difiere en nombre o forma de guardar respecto de un documento, el canon se corrige para citar el código real, nunca al revés.

Ante cualquier discrepancia entre dos niveles, gana el de más autoridad en esta lista (salvo el caso 3, que es la única excepción explícita).

## Mapa mínimo de navegación

| Necesito... | Voy a... |
|---|---|
| Entender la estructura completa de carpetas | `README.md` |
| Orientarme en el canon técnico (qué leer, en qué orden, glosario, estado real de fases) | `docs/00-INDICE.md` — siempre el primer documento técnico a abrir |
| Ver qué decidió el creador y cuándo | `03-requisitos/decisiones-tomadas.md` |
| Tocar código de la app | `productvt-beta/` — `AGENTS.md` advierte que Expo cambió de versión: leer los docs versionados de Expo antes de escribir código |
| Dar contexto completo del repo a una IA externa (pegar en un chat) | `repomix-output.xml` — snapshot empaquetado de todo el repo; regenerar con `npm run repomix` tras cambios relevantes |
| Ver mockups visuales | `01-mockups/` (fuente vigente) — `Respaldo-Productvt-Visual/` es un respaldo histórico, no fuente de verdad |

## Restricciones duras (no negociables)

- **Costo cero**: Firebase plan Spark; sin EAS Build, sin Cloud Functions, sin Storage.
- **Español "tú"** en todo copy de la app — nunca "vos".
- **"Sesión" / "bloque"**, nunca "ciclo" en español, aunque el código ya commiteado use `cycleNumber`/`cyclesCompleted` (esos identificadores no se renombran).

## Protocolo para registrar una decisión nueva

1. Se documenta primero en `03-requisitos/` (archivo nuevo si es requerimiento, entrada en `decisiones-tomadas.md` si resuelve una pregunta ya hecha).
2. Si es transversal (afecta más de un documento), se refleja en `docs/_brief-orquestador.md`.
3. Solo entonces se actualiza el documento de `docs/` correspondiente — nunca al revés.

Protocolo completo, con reglas de mantenimiento del índice: `docs/00-INDICE.md` §7.

## Estado actual

Construcción teórica v2 superada (2026-09-05) → prototipo funcional en curso. Verificar siempre el estado real con `git log`/`git status` sobre `productvt-beta/` antes de asumir lo que dice cualquier documento — el estado se mueve más rápido de lo que los documentos alcanzan a reflejar.

⚠️ **Hueco conocido**: el feedback del creador del 2026-09-14 (v3 y v3.1 en `03-requisitos/decisiones-tomadas.md`: jerarquía Calendarios/Supermetas/Metas/Tareas/Eventos, categorías eliminadas, flujo de cronómetro por pasos, galaxia tipo graph view, entre otros) todavía **no está propagado a `docs/`**. Cualquier trabajo que toque esas áreas debe partir de `decisiones-tomadas.md`, no del canon en `docs/`, hasta que se cierre esa propagación.

## Convención de trabajo

- Cambios de código en rama dedicada + pull request (sesiones de Claude Code usan el prefijo `claude/`).
- Una sola sesión construye `productvt-beta/src` a la vez; cualquier otra que necesite tocar código de producción coordina antes, nunca en paralelo sin avisar (`docs/00-INDICE.md` §1).

## Qué NO es este documento

No reemplaza a `docs/00-INDICE.md` (el canon técnico) ni a `03-requisitos/` (el canal de decisiones) — es solo la puerta de entrada más corta posible hacia ambos. Si algo aquí contradice a uno de esos dos, gana el documento específico y este archivo está desactualizado: corregirlo es responsabilidad de quien lo note.
