/**
 * Rutas planeadas de Expo Router (ARCHITECTURE.md secciones 5 y 7). Son constantes de string
 * para que las fases futuras (auth, timer, calendario, etc.) referencien un único lugar al crear
 * los archivos reales bajo `src/app/`, en vez de repetir literales sueltos.
 *
 * IMPORTANTE: estos archivos todavía NO existen (Fase 1 no crea pantallas reales). La navegación
 * actual del template (`src/components/app-tabs.tsx`) es temporal y será adaptada o reemplazada
 * cuando una fase futura construya las pantallas reales en estos paths.
 */
export const ROUTES = {
  auth: {
    login: '/(auth)/login',
    register: '/(auth)/register',
  },
  tabs: {
    calendar: '/(tabs)/calendar',
    stats: '/(tabs)/stats',
    timer: '/(tabs)/timer',
    settings: '/(tabs)/settings',
  },
  modals: {
    createInvisibleEvent: '/modals/create-invisible-event',
    editCategory: '/modals/edit-category',
    editPreset: '/modals/edit-preset',
    cancelSession: '/modals/cancel-session',
    breakSelector: '/modals/break-selector',
    weeklyGoal: '/modals/weekly-goal',
  },
} as const;

export type AuthRoute = (typeof ROUTES.auth)[keyof typeof ROUTES.auth];
export type TabRoute = (typeof ROUTES.tabs)[keyof typeof ROUTES.tabs];
export type ModalRoute = (typeof ROUTES.modals)[keyof typeof ROUTES.modals];
export type AppRoute = AuthRoute | TabRoute | ModalRoute;
