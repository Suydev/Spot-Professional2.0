import colors from "@/constants/colors";

export function useColors() {
  return {
    background: colors.background,
    foreground: colors.text,
    card: colors.surface,
    cardForeground: colors.text,
    primary: colors.primary,
    primaryForeground: colors.background,
    secondary: colors.surfaceElevated,
    secondaryForeground: colors.text,
    muted: colors.muted,
    mutedForeground: colors.textSecondary,
    accent: colors.surfaceHighlight,
    accentForeground: colors.text,
    destructive: colors.error,
    destructiveForeground: colors.text,
    border: colors.border,
    input: colors.border,
    text: colors.text,
    tint: colors.primary,
    radius: colors.radius,
  };
}
