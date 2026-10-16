// Design tokens copied from the v3 mobile web styles (src/mobile/mobile.css).
export const colors = {
  navy: '#09275e',
  blue: '#123d86',
  brand: '#1762c5',
  yellow: '#ffd436',
  ink: '#17233b',
  muted: '#71809a',
  line: '#e6eaf1',
  field: '#d8dfeb',
  bg: '#f6f8fb',
  danger: '#b3372f',
  ok: '#187443',
  okBg: '#e7f7ec',
  errBg: '#ffebe9',
  white: '#ffffff',
  navActive: '#2456a0',
  softBlue: '#eaf2ff',
  label: '#67809a',
};

// Family names registered by @expo-google-fonts in app/_layout.jsx.
export const fonts = {
  sans: 'DMSans_400Regular',
  sansBold: 'DMSans_700Bold',
  display: 'PlayfairDisplay_700Bold',
  displayItalic: 'PlayfairDisplay_700Bold_Italic',
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 99 };

export const shadow = {
  card: { shadowColor: '#09275e', shadowOpacity: 0.08, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 3 },
};
