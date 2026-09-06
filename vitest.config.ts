import { defineConfig } from 'vitest/config';

/**
 * Corre SOLO los tests puros de dominio (docs/03-CRONOMETRO.md sección 13, decisiones-tomadas.md
 * punto 8: el dominio nunca importa React/Firebase/APIs de dispositivo, así que no necesita
 * jest-expo ni ningún entorno de React Native — Node alcanza y es más rápido).
 */
export default defineConfig({
  test: {
    include: ['src/domain/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
