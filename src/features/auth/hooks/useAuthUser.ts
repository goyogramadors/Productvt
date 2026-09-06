import { useAuthStore } from '@/store/auth/authStore';

/**
 * Lectura del usuario autenticado y su perfil/configuración (ARCHITECTURE.md sección 22.1). Hook
 * fino: solo selecciona del store, sin lógica de negocio.
 */
export function useAuthUser() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const settings = useAuthStore((s) => s.settings);

  return {
    status,
    user,
    profile,
    settings,
    isLoading: status === 'loading',
    isAuthenticated: status === 'signedIn',
  };
}
