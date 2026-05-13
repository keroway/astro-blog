import { defineConfig, presetWind4 } from "unocss";

export default defineConfig({
  presets: [
    presetWind4({
      // presetWind4 の正式 API: reset CSS を無効化（global.css が担うため）
      preflights: { reset: false },
      // `dark:` バリアントを [data-theme="dark"] 属性セレクタに対応させる
      dark: { dark: '[data-theme="dark"]' },
    }),
  ],
  extendTheme: (theme) => {
    // --- Colors ---
    theme.colors ??= {};
    theme.colors.kw = {
      // Primitives
      navy: "var(--kw-navy)",
      blue: "var(--kw-blue)",
      paper: {
        DEFAULT: "var(--kw-paper)",
        warm: "var(--kw-paper-warm)",
        card: "var(--kw-paper-card)",
      },
      sand: {
        DEFAULT: "var(--kw-sand)",
        soft: "var(--kw-sand-soft)",
      },
      ink: {
        DEFAULT: "var(--kw-ink)",
        dim: "var(--kw-ink-dim)",
        faint: "var(--kw-ink-faint)",
      },
      rule: {
        DEFAULT: "var(--kw-rule)",
        soft: "var(--kw-rule-soft)",
        strong: "var(--kw-rule-strong)",
      },
      // Semantic — Background
      bg: {
        DEFAULT: "var(--kw-bg)",
        card: "var(--kw-bg-card)",
        alt: "var(--kw-bg-alt)",
        inverse: "var(--kw-bg-inverse)",
      },
      // Semantic — Foreground
      fg: {
        DEFAULT: "var(--kw-fg)",
        muted: "var(--kw-fg-muted)",
        faint: "var(--kw-fg-faint)",
        display: "var(--kw-fg-display)",
        link: "var(--kw-fg-link)",
        "on-navy": "var(--kw-fg-on-navy)",
      },
      // Semantic — Accent
      accent: {
        DEFAULT: "var(--kw-accent)",
        soft: "var(--kw-accent-soft)",
      },
      // Component — Button
      btn: {
        primary: {
          bg: "var(--kw-btn-primary-bg)",
          fg: "var(--kw-btn-primary-fg)",
          hover: "var(--kw-btn-primary-hover)",
        },
        ghost: {
          fg: "var(--kw-btn-ghost-fg)",
          border: "var(--kw-btn-ghost-border)",
        },
      },
      // Component — Status
      status: {
        active: {
          fg: "var(--kw-status-active-fg)",
          bg: "var(--kw-status-active-bg)",
        },
        wip: {
          fg: "var(--kw-status-wip-fg)",
          bg: "var(--kw-status-wip-bg)",
        },
        archived: {
          fg: "var(--kw-status-archived-fg)",
          bg: "var(--kw-status-archived-bg)",
        },
      },
    };

    // --- Spacing ---
    theme.spacing ??= {};
    Object.assign(theme.spacing, {
      "kw-1": "var(--kw-space-1)",
      "kw-2": "var(--kw-space-2)",
      "kw-3": "var(--kw-space-3)",
      "kw-4": "var(--kw-space-4)",
      "kw-5": "var(--kw-space-5)",
      "kw-6": "var(--kw-space-6)",
      "kw-8": "var(--kw-space-8)",
      "kw-10": "var(--kw-space-10)",
      "kw-12": "var(--kw-space-12)",
      "kw-16": "var(--kw-space-16)",
      "kw-20": "var(--kw-space-20)",
      "kw-24": "var(--kw-space-24)",
    });

    // --- Border Radius (presetWind4: theme.radius) ---
    theme.radius ??= {};
    Object.assign(theme.radius, {
      "kw-none": "var(--kw-radius-none)",
      "kw-xs": "var(--kw-radius-xs)",
      "kw-sm": "var(--kw-radius-sm)",
      "kw-md": "var(--kw-radius-md)",
      "kw-lg": "var(--kw-radius-lg)",
      "kw-pill": "var(--kw-radius-pill)",
    });

    // --- Shadow (presetWind4: theme.shadow) ---
    theme.shadow ??= {};
    Object.assign(theme.shadow, {
      "kw-card": "var(--kw-shadow-card)",
      "kw-pop": "var(--kw-shadow-pop)",
    });
  },
});
