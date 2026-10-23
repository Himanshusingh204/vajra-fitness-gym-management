// Mirrors the web tokens: one burgundy accent, neutral graphite and off-white surfaces.
// Text and accent pairs are checked for WCAG AA (4.5:1) on both surface and background.

const light = {
  background: '#f7f6f3',
  surface: '#ffffff',
  surfaceMuted: '#efede8',
  border: '#dcd9d2',
  text: '#17181a',
  textMuted: '#585c63',
  accent: '#800020',
  onAccent: '#ffffff',
  accentSoft: '#f6e6ea',
  success: '#1d6b3f',
  successSoft: '#e3f2e8',
  warning: '#8a5300',
  warningSoft: '#fbefd9',
  danger: '#b42318',
  dangerSoft: '#fde8e6',
  info: '#1f5f8b',
  infoSoft: '#e2eef7',
};

export type Palette = typeof light;

const dark: Palette = {
  background: '#121315',
  surface: '#1c1d20',
  surfaceMuted: '#26282c',
  border: '#34363b',
  text: '#f2f1ee',
  textMuted: '#a7aab0',
  accent: '#f08a9e',
  onAccent: '#2a0710',
  accentSoft: '#3a1820',
  success: '#6fd49a',
  successSoft: '#173323',
  warning: '#f2c063',
  warningSoft: '#3a2c12',
  danger: '#ff8a80',
  dangerSoft: '#3d1a18',
  info: '#8cc4ee',
  infoSoft: '#16293a',
};

export const palettes = { light, dark };

export const radius = { control: 10, card: 14, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
};

export const type = {
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32 },
  heading: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 25 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
};

export const minTouch = 44;

// Content stops growing past this on tablets so lines stay readable.
export const maxContentWidth = 640;

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
