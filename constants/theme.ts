export const COLORS = {
  navy: '#1B2541',
  navyLight: '#243056',
  white: '#FFFFFF',
  offWhite: '#F5F6FA',
  gray100: '#ECEEF4',
  gray200: '#D1D5E0',
  gray300: '#A0A7B8',
  gray400: '#6B7280',
  accent: '#4F8CFF',
  accentLight: '#E8F0FF',
  red: '#EF4444',
  redLight: '#FEF2F2',
  redBorder: '#FECACA',
  yellow: '#F59E0B',
  yellowLight: '#FFFBEB',
  yellowBorder: '#FDE68A',
  green: '#10B981',
  greenLight: '#ECFDF5',
  greenBorder: '#A7F3D0',
  star: '#FBBF24',
  streak: '#FF6B2C',
  premium: '#A855F7',
  premiumLight: '#F3E8FF',
  background: '#F5F6FA',
  card: '#FFFFFF',
} as const;

export type QuestionStatus = 'failed' | 'skipped' | 'solved';

export const STATUS_COLORS: Record<QuestionStatus, { main: string; light: string; border: string; label: string; icon: string }> = {
  failed: { main: COLORS.red, light: COLORS.redLight, border: COLORS.redBorder, label: 'Yanlış Yaptım', icon: '🔴' },
  skipped: { main: COLORS.yellow, light: COLORS.yellowLight, border: COLORS.yellowBorder, label: 'Boş Bıraktım', icon: '🟡' },
  solved: { main: COLORS.green, light: COLORS.greenLight, border: COLORS.greenBorder, label: 'Doğru Yaptım', icon: '🟢' },
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const FONT_SIZES = { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24, hero: 32 } as const;
export const FONT_WEIGHTS = { regular: '400' as const, medium: '500' as const, semibold: '600' as const, bold: '700' as const, extrabold: '800' as const };
export const RADIUS = { sm: 8, md: 14, lg: 16, xl: 20, xxl: 28, full: 999 } as const;
export const SHADOWS = {
  small: { shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  medium: { shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
} as const;