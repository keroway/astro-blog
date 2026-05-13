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
  shortcuts: {
    // ---- Font utilities ----
    "kw-mono":    "font-[var(--kw-font-mono)]",
    "kw-display": "font-[var(--kw-font-display)]",
    "kw-tabular": "[font-variant-numeric:tabular-nums]",

    // ---- Eyebrow — mono uppercase label ----
    "kw-eyebrow": "font-[var(--kw-font-mono)] text-[var(--kw-fs-mono-xs)] uppercase tracking-[var(--kw-ls-eyebrow)] text-kw-fg-muted",

    // ---- Button — primary base ----
    // border-bottom:0!important / transition / :hover / .kw-button-arrow は global.css に残す
    "kw-button": "inline-flex items-center gap-kw-3 py-[12px] px-[24px] font-[var(--kw-font-display)] [font-weight:var(--kw-fw-medium)] text-[var(--kw-fs-body-sm)] tracking-[var(--kw-ls-button)] bg-kw-btn-primary-bg text-kw-btn-primary-fg border-0 rounded-kw-sm cursor-pointer no-underline",

    // ---- Chip / status pill — base ----
    "kw-chip": "inline-flex items-baseline gap-kw-2 py-[4px] px-[10px] font-[var(--kw-font-mono)] text-[var(--kw-fs-mono-xs)] uppercase tracking-[0.15em] text-kw-fg-muted border border-kw-rule rounded-kw-xs bg-transparent",

    // ---- Chip — status variants ----
    "kw-chip--status-active":   "text-kw-status-active-fg bg-kw-status-active-bg border-transparent",
    "kw-chip--status-wip":      "text-kw-status-wip-fg bg-kw-status-wip-bg border-transparent",
    "kw-chip--status-archived": "text-kw-status-archived-fg bg-kw-status-archived-bg border-transparent",

    // ---- Section head — Japanese title + rule + mono en label ----
    "kw-section-head":          "flex items-baseline justify-between gap-kw-6 pb-kw-4 mb-kw-10 border-b border-b-kw-rule",
    "kw-section-head__title":   "flex items-baseline gap-kw-5 flex-wrap",
    "kw-section-head__jp":      "font-[var(--kw-font-display)] text-[var(--kw-fs-display-sm)] [font-weight:var(--kw-fw-medium)] text-kw-fg-display tracking-[var(--kw-ls-display)]",
    "kw-section-head__divider": "inline-block w-[24px] h-[1px] bg-kw-accent shrink-0",
    "kw-section-head__en":      "font-[var(--kw-font-mono)] text-[var(--kw-fs-mono-xs)] uppercase tracking-[var(--kw-ls-eyebrow)] text-kw-fg-muted whitespace-nowrap",

    // ---- Sand numeral ----
    "kw-numeral": "font-[var(--kw-font-mono)] [font-variant-numeric:tabular-nums] text-[22px] [font-weight:var(--kw-fw-medium)] text-kw-accent tracking-[-0.04em]",
  },
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
