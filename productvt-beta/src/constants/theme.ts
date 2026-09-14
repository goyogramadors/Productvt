/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Paleta de colores suaves y minimalistas para categorías (SPEC.md sección 12.3: "selección de
 * colores suaves y minimalistas predefinidos"), en el espíritu de los tonos pastel/apagados que
 * usan los calendarios de eventos. El selector de categoría (fase de categorías/presets) los
 * ofrece como opciones rápidas; SPEC.md también exige una paleta RGB manual como alternativa, que
 * no depende de esta lista fija.
 */
export const CategoryPalette = [
  '#7986CB', // lavanda
  '#33B679', // salvia
  '#8E24AA', // uva
  '#E67C73', // flamenco
  '#F6BF26', // banana
  '#F4511E', // mandarina
  '#039BE5', // celeste
  '#616161', // grafito
  '#3F51B5', // añil
  '#0B8043', // albahaca
  '#D50000', // tomate
  '#F09300', // calabaza
] as const;

export type CategoryPaletteColor = (typeof CategoryPalette)[number];

/** Color por defecto para una categoría recién creada sin selección explícita. */
export const DefaultCategoryColor: CategoryPaletteColor = CategoryPalette[0];

/**
 * Colores semánticos para feedback de estados críticos del cronómetro (SPEC.md sección 15) y de
 * sesiones (completada / cancelada / expirada). Por SPEC.md sección 39 ("no depender
 * exclusivamente del color para estados críticos"), estos son un complemento visual, no la única
 * señal: la UI debe acompañarlos siempre con texto o ícono.
 */
export const StatusColors = {
  success: '#0B8043',
  warning: '#F09300',
  danger: '#D50000',
  info: '#039BE5',
  neutral: '#616161',
} as const;

export type StatusColorName = keyof typeof StatusColors;

/** Radios de borde estándar, complementarios a `Spacing`. */
export const Radii = {
  small: 8,
  medium: 12,
  large: 16,
  pill: 999,
} as const;
