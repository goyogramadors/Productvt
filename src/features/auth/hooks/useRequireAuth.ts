import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { ROUTES } from '@/constants/routes';

import { useAuthUser } from './useAuthUser';

/**
 * AuthGate real (ARCHITECTURE.md sección 7.1: `AuthGate -> Login/Register | AppTabs`). Se usa una
 * única vez desde `src/app/_layout.tsx`: mientras el status de auth es `loading` no navega (evita
 * un parpadeo hacia login antes de saber si ya hay sesión persistida); sin sesión, fuerza el grupo
 * `(auth)`; con sesión, saca al usuario del grupo `(auth)` hacia las tabs si intenta quedarse ahí.
 *
 * La UI no decide manualmente a qué pantalla ir: este hook es la única fuente de la regla de
 * redirección, para que ninguna pantalla necesite reimplementarla.
 */
export function useRequireAuth() {
  const { status } = useAuthUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    const inAuthGroup = segments[0] === '(auth)';

    if (status === 'signedOut' && !inAuthGroup) {
      router.replace(ROUTES.auth.login);
      return;
    }

    if (status === 'signedIn' && inAuthGroup) {
      router.replace(ROUTES.tabs.timer);
    }
  }, [status, segments, router]);

  return { status };
}
