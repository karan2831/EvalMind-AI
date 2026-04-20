import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: "class",
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        "secondary-fixed": "#e3e2e7",
        "on-tertiary-fixed-variant": "#474649",
        "outline-variant": "#c1c6d6",
        "on-secondary-container": "#626267",
        "surface-bright": "#f9f9fb",
        "on-error-container": "#93000a",
        "outline": "#717785",
        "surface-variant": "#e2e2e4",
        "primary-fixed": "#d7e2ff",
        "error-container": "#ffdad6",
        "on-tertiary": "#ffffff",
        "tertiary": "#5b5b5d",
        "on-primary": "#ffffff",
        "surface-tint": "#005cbb",
        "background": "#f9f9fb",
        "inverse-primary": "#abc7ff",
        "surface-dim": "#d9dadc",
        "on-primary-fixed-variant": "#00458f",
        "on-secondary-fixed-variant": "#46464b",
        "secondary-fixed-dim": "#c7c6cb",
        "inverse-surface": "#2f3132",
        "tertiary-container": "#747375",
        "secondary": "#5e5e63",
        "on-tertiary-container": "#fdfafc",
        "on-error": "#ffffff",
        "surface-container-high": "#e8e8ea",
        "on-secondary": "#ffffff",
        "on-primary-fixed": "#001b3f",
        "secondary-container": "#e0dfe4",
        "primary": "#0059b5",
        "error": "#ba1a1a",
        "surface-container-low": "#f3f3f5",
        "primary-fixed-dim": "#abc7ff",
        "on-secondary-fixed": "#1a1b1f",
        "surface": "#f9f9fb",
        "surface-container-lowest": "#ffffff",
        "on-surface": "#1a1c1d",
        "on-tertiary-fixed": "#1b1b1d",
        "on-surface-variant": "#414753",
        "tertiary-fixed": "#e4e2e4",
        "on-primary-container": "#fcfbff",
        "surface-container-highest": "#e2e2e4",
        "on-background": "#1a1c1d",
        "primary-container": "#0071e3",
        "tertiary-fixed-dim": "#c8c6c8",
        "surface-container": "#eeeef0",
        "inverse-on-surface": "#f0f0f2"
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
      fontFamily: {
        "headline": ["Manrope"],
        "body": ["Inter"],
        "label": ["Inter"]
      }
    },
  },
  plugins: [],
}
export default config;
