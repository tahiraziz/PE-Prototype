/**
 * Luminur Design System — Color & Typography Tokens
 *
 * Single source of truth for all components.
 * Usage: import { colors, typography } from '../styles/tokens';
 */

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const colors = {
  black:     '#111827',
  gray:      '#596887',
  border:    '#EEEEEE',

  green:     '#166534',
  lightGreen: '#F0FDF4',

  red:       '#991B1B',
  lightRed:  '#FFF5F3',

  orange:    '#D97706',
  lightOrange: '#FEF6F0',

  lightBlue: '#Eff6FF',
  darkBlue: '#375292',

  inputBorder: '#D1D5DB',

} as const;

// ---------------------------------------------------------------------------
// Typography scale (font-size in px, as numbers for inline styles)
// ---------------------------------------------------------------------------

export const fontSize = {
  label:     14, // Labels, subtext, units
  body:      16, // List items, section content
  heading:   16, // Section headers (medium weight)
  title:     20, // Page / panel title
  display:   24, // Large metric numbers
} as const;

// ---------------------------------------------------------------------------
// Font weights
// ---------------------------------------------------------------------------

export const fontWeight = {
  regular:   400,
  medium:    500,
  semibold:  600,
} as const;
