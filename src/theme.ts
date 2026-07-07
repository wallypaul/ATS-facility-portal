import { createTheme, type Theme, type PaletteMode } from '@mui/material/styles';

// Type contrast is intentional: Inter for UI, IBM Plex Mono for money / refs / IDs.
export const SANS =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const MONO =
  "'IBM Plex Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

// Deep pine-teal brand — medical-trustworthy, deliberately not SaaS-indigo.
// Amber is the single attention accent (pending / attention only).
const light = {
  mode: 'light' as PaletteMode,
  primary: { main: '#0E6E62', dark: '#0A554B', light: '#3E9488', contrastText: '#FFFFFF' },
  secondary: { main: '#C77700', contrastText: '#FFFFFF' },
  success: { main: '#2E7D5B', contrastText: '#FFFFFF' },
  warning: { main: '#B25E00', contrastText: '#FFFFFF' },
  error: { main: '#B3261E', contrastText: '#FFFFFF' },
  info: { main: '#0E6E62', contrastText: '#FFFFFF' },
  background: { default: '#F5F8F7', paper: '#FFFFFF' },
  divider: '#E1E7E6',
  text: { primary: '#12201E', secondary: '#46564F' },
};

const dark = {
  mode: 'dark' as PaletteMode,
  primary: { main: '#4FB3A4', dark: '#2E8577', light: '#7FCCC0', contrastText: '#06110F' },
  secondary: { main: '#E0A24A', contrastText: '#06110F' },
  success: { main: '#5FBE92', contrastText: '#06110F' },
  warning: { main: '#E0954A', contrastText: '#06110F' },
  error: { main: '#E88A82', contrastText: '#06110F' },
  info: { main: '#4FB3A4', contrastText: '#06110F' },
  background: { default: '#0E1513', paper: '#16201E' },
  divider: '#26332F',
  text: { primary: '#E7EEEC', secondary: '#A6B7B2' },
};

// A second neutral for the app rail/toolbars, slightly off the content surface.
const railBg = { light: '#EDF2F1', dark: '#111917' };

// ease-out expo-ish; no bounce, no elastic.
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

// --- Apple-style "vibrancy" glass -----------------------------------------
// Ambient, brand-tinted backdrop the glass refracts. Kept subtle (not drenched)
// and fixed so surfaces feel layered above a still background. The base color
// sits slightly below background.paper so glass reads as a lighter pane on top.
const ambientBg = {
  light: [
    'radial-gradient(1100px 760px at 12% -10%, rgba(14,110,98,0.12), transparent 58%)',
    'radial-gradient(920px 700px at 114% 4%, rgba(199,119,0,0.07), transparent 54%)',
    'radial-gradient(1000px 900px at 50% 118%, rgba(62,148,136,0.10), transparent 60%)',
    '#E9F1EF',
  ].join(','),
  dark: [
    'radial-gradient(1100px 760px at 12% -10%, rgba(79,179,164,0.16), transparent 58%)',
    'radial-gradient(920px 700px at 114% 4%, rgba(224,162,74,0.08), transparent 54%)',
    'radial-gradient(1000px 900px at 50% 118%, rgba(46,133,119,0.14), transparent 60%)',
    '#0A100E',
  ].join(','),
};

const glassTokens = {
  light: {
    bg: 'rgba(255, 255, 255, 0.72)',
    solid: '#FFFFFF',
    border: '1px solid rgba(255, 255, 255, 0.60)',
    hairline: '1px solid rgba(18, 32, 30, 0.07)',
    shadow: '0 1px 2px rgba(18,32,30,0.05), 0 12px 34px -10px rgba(18,32,30,0.14)',
    blur: 'blur(22px) saturate(180%)',
  },
  dark: {
    bg: 'rgba(24, 34, 32, 0.62)',
    solid: '#16201E',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    hairline: '1px solid rgba(255, 255, 255, 0.07)',
    shadow: '0 1px 2px rgba(0,0,0,0.30), 0 14px 38px -10px rgba(0,0,0,0.55)',
    blur: 'blur(22px) saturate(160%)',
  },
};

// Reusable glass surface. The tint stays opaque enough to keep text at AA, and
// prefers-reduced-transparency swaps to a solid surface (Apple honors this too).
export function glassSx(mode: PaletteMode) {
  const g = glassTokens[mode];
  return {
    backgroundColor: g.bg,
    backgroundImage: 'none',
    backdropFilter: g.blur,
    WebkitBackdropFilter: g.blur,
    border: g.border,
    boxShadow: g.shadow,
    '@media (prefers-reduced-transparency: reduce)': {
      backgroundColor: g.solid,
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
    },
  } as const;
}

export function getTheme(mode: PaletteMode): Theme {
  const p = mode === 'light' ? light : dark;
  const rail = railBg[mode];

  const g = glassTokens[mode];

  const theme = createTheme({
    palette: p,
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: SANS,
      fontSize: 15,
      htmlFontSize: 16,
      h1: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h2: { fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.25 },
      h3: { fontSize: '1.2rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
      h4: { fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.35 },
      h5: { fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.4 },
      h6: { fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.4 },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 600 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
      button: { fontWeight: 600, letterSpacing: 0 },
      caption: { fontSize: '0.75rem' },
    },
    transitions: {
      easing: { easeOut: EASE_OUT, easeInOut: EASE_OUT, easeIn: EASE_OUT, sharp: EASE_OUT },
      duration: { shortest: 120, shorter: 150, short: 180, standard: 220, complex: 240 },
    },
  });

  // Component overrides that depend on the resolved palette.
  theme.components = {
    MuiCssBaseline: {
      styleOverrides: {
        html: { WebkitFontSmoothing: 'antialiased', textSizeAdjust: '100%' },
        body: {
          color: p.text.primary,
          minHeight: '100dvh',
          // Ambient brand-tinted backdrop for the glass surfaces to refract.
          background: ambientBg[mode],
          backgroundAttachment: 'fixed',
        },
        '@media (prefers-reduced-transparency: reduce)': {
          body: { background: p.background.default },
        },
        '*, *::before, *::after': { boxSizing: 'border-box' },
        // Consistent brand focus ring everywhere keyboard focus lands.
        ':focus-visible': {
          outline: `2px solid ${p.primary.main}`,
          outlineOffset: '2px',
        },
        // Placeholders must read at text.secondary, not a lighter gray.
        '::placeholder': { color: p.text.secondary, opacity: 1 },
        'h1, h2, h3': { textWrap: 'balance' as const },
        p: { textWrap: 'pretty' as const },
        '::selection': {
          backgroundColor: mode === 'light' ? '#CDE6E1' : '#2E8577',
          color: mode === 'light' ? '#0A2E29' : '#06110F',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        // Kill the dark-mode elevation tint so flat surfaces stay true to the palette.
        root: { backgroundImage: 'none' },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        // Glass panel — the primary page surface.
        root: { ...glassSx(mode), borderRadius: 16 },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'default' },
      styleOverrides: {
        // Frosted top bar: glass tint + blur, flat with a bottom hairline (no big shadow).
        root: {
          ...glassSx(mode),
          color: p.text.primary,
          border: 'none',
          borderRadius: 0,
          borderBottom: g.hairline,
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        // Frosted side rail / mobile drawer: glass + right hairline, no shadow.
        paper: {
          ...glassSx(mode),
          border: 'none',
          borderRight: g.hairline,
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          paddingInline: 16,
          '&.MuiButton-contained.MuiButton-colorPrimary:hover': {
            backgroundColor: p.primary.dark,
          },
        },
        sizeSmall: { paddingInline: 12 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 10 },
        label: { paddingInline: 10 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: mode === 'light' ? '#12201E' : '#26332F',
          fontSize: '0.75rem',
          borderRadius: 8,
          padding: '6px 10px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { ...glassSx(mode), borderRadius: 20 },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        // Frosted dim behind real modals/drawers only — invisible popover backdrops
        // (menus, selects) stay crisp so their own glass reads cleanly.
        root: {
          '&:not(.MuiBackdrop-invisible)': {
            backgroundColor: mode === 'light' ? 'rgba(18,32,30,0.30)' : 'rgba(4,11,9,0.52)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            '@media (prefers-reduced-transparency: reduce)': {
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          // Inputs stay solid (not glass) so typed text keeps full legibility.
          backgroundColor: p.background.paper,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: p.divider },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: p.text.secondary },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: p.primary.main,
            borderWidth: 2,
          },
        },
        input: {
          '&::placeholder': { color: p.text.secondary, opacity: 1 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { '&.Mui-focused': { color: p.primary.main } } },
    },
    MuiLink: {
      defaultProps: { underline: 'hover', color: 'primary' },
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: p.divider },
        head: { fontWeight: 600, color: p.text.secondary, backgroundColor: rail },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { ...glassSx(mode), borderRadius: 14 },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10, alignItems: 'center' } },
    },
  };

  return theme;
}
