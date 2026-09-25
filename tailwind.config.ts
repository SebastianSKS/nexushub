import type { Config } from "tailwindcss";

/**
 * Todos los valores apuntan a variables CSS definidas en src/styles/tokens.css.
 * Así el cambio claro/oscuro no requiere clases `dark:` en los componentes.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      // Blanco y negro puros: hacen falta sobre fondos de color (carátulas, degradados) que no cambian con el tema.
      white: "#ffffff",
      black: "#000000",
      mica: "var(--mica-base)",
      layer: "var(--layer)",
      "layer-alt": "var(--layer-alt)",
      stroke: "var(--stroke)",
      "stroke-strong": "var(--stroke-strong)",
      accent: {
        DEFAULT: "var(--accent)",
        hover: "var(--accent-hover)",
        pressed: "var(--accent-pressed)",
        text: "var(--accent-text)",
        on: "var(--on-accent)",
      },
      success: { DEFAULT: "var(--success)", fg: "var(--success-fg)" },
      warning: { DEFAULT: "var(--warning)", fg: "var(--warning-fg)" },
      danger: { DEFAULT: "var(--error)", fg: "var(--error-fg)" },
      fg: {
        DEFAULT: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",
        disabled: "var(--text-disabled)",
      },
    },
    fontFamily: {
      glifo: ["'Segoe Fluent Icons'", "'Segoe MDL2 Assets'"],
      sans: [
        "'Segoe UI Variable'",
        "'Segoe UI'",
        "system-ui",
        "-apple-system",
        "sans-serif",
      ],
    },
    fontSize: {
      caption: ["12px", { lineHeight: "16px" }],
      body: ["14px", { lineHeight: "20px" }],
      subtitle: ["20px", { lineHeight: "28px", fontWeight: "600" }],
      title: ["28px", { lineHeight: "36px", fontWeight: "600" }],
      display: ["68px", { lineHeight: "92px", fontWeight: "600" }],
    },
    borderRadius: {
      none: "0",
      input: "4px",
      control: "8px",
      window: "7px",
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      card: "var(--elev-card)",
      flyout: "var(--elev-flyout)",
      dialog: "var(--elev-dialog)",
    },
    transitionTimingFunction: {
      fluent: "cubic-bezier(0, 0, 0, 1)",
    },
    transitionDuration: {
      exit: "150ms",
      enter: "250ms",
    },
    extend: {
      spacing: {
        titlebar: "48px",
        statusbar: "28px",
      },
    },
  },
  plugins: [],
};

export default config;
