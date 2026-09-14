/**
 * Rutas de Expo Router (ARCHITECTURE.md secciones 5 y 7). Son constantes de string para que todas
 * las fases referencien un único lugar en vez de repetir literales sueltos.
 *
 * `auth` y `tabs` ya existen como pantallas reales desde la Fase 2 (`src/app/(auth)/*`,
 * `src/app/(tabs)/*`, ver AuthGate en `src/app/_layout.tsx`); las pantallas de `tabs` distintas de
 * `settings` son placeholders hasta su fase correspondiente. Los `modals` todavía no existen.
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
