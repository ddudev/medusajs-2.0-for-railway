/**
 * Centralized color definitions for easy client customization
 * All colors are defined here and can be easily changed for different clients
 */

export interface ColorPalette {
  base: string
  hover?: string
  active?: string
  disabled?: string
  light?: string
  dark?: string
}

export interface ThemeColors {
  primary: ColorPalette
  secondary: ColorPalette
  accent: ColorPalette
  success: ColorPalette
  error: ColorPalette
  warning: ColorPalette
  text: {
    primary: string
    secondary: string
    tertiary: string
    inverse: string
  }
  background: {
    base: string
    elevated: string
    overlay: string
  }
  border: {
    base: string
    hover: string
    focus: string
  }
}

/**
 * Default theme colors based on Figma design
 * Orange primary brand color, black top bar, white backgrounds
 */
export const defaultThemeColors: ThemeColors = {
  primary: {
    base: "#FF6B35", // Main - Orange (brand color)
    hover: "#E55A2B", // Darker orange on hover
    active: "#CC5529", // Even darker when active
    disabled: "#9CA3AF", // Gray when disabled
    light: "#FF8C5A", // Lighter orange variant
    dark: "#E55A2B", // Darker orange variant
  },
  secondary: {
    base: "#FFFFFF", // White for backgrounds
    hover: "#F9FAFB", // Slightly off-white on hover
    active: "#F3F4F6", // More off-white when active
    disabled: "#E5E7EB", // Light gray when disabled
    light: "#FFFFFF",
    dark: "#F9FAFB",
  },
  accent: {
    base: "#FF6B35", // Accent - Orange (same as primary)
    hover: "#E55A2B", // Darker orange on hover
    light: "#FF8C5A", // Light orange
    dark: "#CC5529", // Dark orange
  },
  success: {
    base: "#2D8659", // Sec - Medium-dark green
    hover: "#256F4A",
    light: "#4FA675",
    dark: "#1F5C3D",
  },
  error: {
    base: "#D97706", // Sec - Terracotta/burnt orange
    hover: "#B86205",
    light: "#E68A2E",
    dark: "#9A4F04",
  },
  warning: {
    base: "#F59E0B", // Sec - Orange-gold
    hover: "#D97706",
    light: "#FBBF24",
    dark: "#B45309",
  },
  text: {
    primary: "#1F2937", // Text - Very dark gray
    secondary: "#4B5563", // Text - Medium-dark gray
    tertiary: "#9CA3AF", // Text - Light taupe/beige-gray
    inverse: "#FFFFFF", // Text - White
  },
  background: {
    base: "#FFFFFF", // White base background
    elevated: "#F9FAFB", // Slightly off-white for elevated surfaces
    overlay: "rgba(0, 0, 0, 0.5)", // Semi-transparent overlay
  },
  border: {
    base: "#E5E7EB", // Light gray for borders
    hover: "#D1D5DB", // Slightly darker on hover
    focus: "#36C1C7", // Turquoise for focus states
  },
}

/**
 * Export theme colors (can be replaced with client-specific colors)
 */
export const themeColors = defaultThemeColors

