/**
 * @binro/ui — Typography design tokens
 */

export const typography = {
  fontFamily: {
    sans: "Inter",
    mono: "JetBrains Mono",
  },

  fontSize: {
    xs:   { size: 12, lineHeight: 16 },
    sm:   { size: 14, lineHeight: 20 },
    base: { size: 16, lineHeight: 24 },
    lg:   { size: 18, lineHeight: 28 },
    xl:   { size: 20, lineHeight: 28 },
    "2xl":{ size: 24, lineHeight: 32 },
    "3xl":{ size: 30, lineHeight: 36 },
    "4xl":{ size: 36, lineHeight: 40 },
  },

  fontWeight: {
    normal:   "400",
    medium:   "500",
    semibold: "600",
    bold:     "700",
  },

  letterSpacing: {
    tight:  -0.5,
    normal:  0,
    wide:    0.5,
  },
} as const;
