/** @type {import('tailwindcss').Config} */

// Helper: creates a color value that works with Tailwind's opacity utilities.
// Tailwind v3 calls this function with { opacityValue } at compile time.
function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'tertiary-fixed': withOpacity('--color-tertiary-fixed'),
        'error': withOpacity('--color-error'),
        'tertiary-container': withOpacity('--color-tertiary-container'),
        'tertiary-fixed-dim': withOpacity('--color-tertiary-fixed-dim'),
        'on-surface-variant': withOpacity('--color-on-surface-variant'),
        'primary-container': withOpacity('--color-primary-container'),
        'tertiary': withOpacity('--color-tertiary'),
        'on-tertiary': withOpacity('--color-on-tertiary'),
        'on-secondary-container': withOpacity('--color-on-secondary-container'),
        'on-tertiary-container': withOpacity('--color-on-tertiary-container'),
        'on-error': withOpacity('--color-on-error'),
        'secondary-fixed-dim': withOpacity('--color-secondary-fixed-dim'),
        'primary': withOpacity('--color-primary'),
        'inverse-primary': withOpacity('--color-inverse-primary'),
        'inverse-surface': withOpacity('--color-inverse-surface'),
        'on-background': withOpacity('--color-on-background'),
        'outline-variant': withOpacity('--color-outline-variant'),
        'surface-container-low': withOpacity('--color-surface-container-low'),
        'on-secondary': withOpacity('--color-on-secondary'),
        'on-surface': withOpacity('--color-on-surface'),
        'background': withOpacity('--color-background'),
        'on-secondary-fixed': withOpacity('--color-on-secondary-fixed'),
        'surface-container-highest': withOpacity('--color-surface-container-highest'),
        'on-tertiary-fixed': withOpacity('--color-on-tertiary-fixed'),
        'secondary-container': withOpacity('--color-secondary-container'),
        'primary-fixed': withOpacity('--color-primary-fixed'),
        'surface-container': withOpacity('--color-surface-container'),
        'on-secondary-fixed-variant': withOpacity('--color-on-secondary-fixed-variant'),
        'surface-container-lowest': withOpacity('--color-surface-container-lowest'),
        'inverse-on-surface': withOpacity('--color-inverse-on-surface'),
        'on-primary-fixed-variant': withOpacity('--color-on-primary-fixed-variant'),
        'surface-dim': withOpacity('--color-surface-dim'),
        'surface-container-high': withOpacity('--color-surface-container-high'),
        'primary-fixed-dim': withOpacity('--color-primary-fixed-dim'),
        'surface-tint': withOpacity('--color-surface-tint'),
        'surface-variant': withOpacity('--color-surface-variant'),
        'secondary': withOpacity('--color-secondary'),
        'surface-bright': withOpacity('--color-surface-bright'),
        'error-container': withOpacity('--color-error-container'),
        'on-primary': withOpacity('--color-on-primary'),
        'on-error-container': withOpacity('--color-on-error-container'),
        'on-primary-fixed': withOpacity('--color-on-primary-fixed'),
        'on-tertiary-fixed-variant': withOpacity('--color-on-tertiary-fixed-variant'),
        'on-primary-container': withOpacity('--color-on-primary-container'),
        'secondary-fixed': withOpacity('--color-secondary-fixed'),
        'outline': withOpacity('--color-outline'),
        'surface': withOpacity('--color-surface'),
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        'margin-desktop': '40px',
        xs: '4px',
        md: '16px',
        xl: '32px',
        sm: '12px',
        gutter: '24px',
        lg: '24px',
        'margin-mobile': '16px',
        base: '8px',
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
        'label-lg': ['Montserrat', 'sans-serif'],
        'label-sm': ['Montserrat', 'sans-serif'],
        'headline-lg': ['Montserrat', 'sans-serif'],
        'body-lg': ['Montserrat', 'sans-serif'],
        'body-md': ['Montserrat', 'sans-serif'],
        'headline-md': ['Montserrat', 'sans-serif'],
        'headline-sm': ['Montserrat', 'sans-serif'],
        'headline-lg-mobile': ['Montserrat', 'sans-serif'],
        'body-sm': ['Montserrat', 'sans-serif'],
        'display-lg': ['Montserrat', 'sans-serif'],
      },
      fontSize: {
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '500' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'headline-lg-mobile': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
      },
    },
  },
  plugins: [],
};