import { MD3LightTheme, MD3Theme } from 'react-native-paper';

export const theme: MD3Theme & {
  colors: MD3Theme['colors'] & {
    gray: Record<number, string>;
    pending: string;
    ready: string;
  };
} = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#C73E3A',
    secondary: '#F4B942',
    tertiary: '#22C55E',
    error: '#EF4444',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceVariant: '#F3F4F6',
    onSurfaceVariant: '#6B7280',
    pending: '#FACC15', // vibrant yellow (pending)
    ready: '#16A34A',   // deeper green (ready)
    gray: {
      50: '#FAFAFA',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },
  roundness: 2,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  displayLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
  },
  displayMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as const,
  },
  displaySmall: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
  },
  headlineLarge: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  headlineMedium: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  headlineSmall: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
};
