/**
 * Utility to calculate contrasting text color (white or dark) based on background hex
 */
export function getContrastTextColor(hexColor?: string | null): 'text-white' | 'text-neutral-900' {
  if (!hexColor) return 'text-white';
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return 'text-white';

  const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
  const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
  const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);

  // Perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? 'text-neutral-900' : 'text-white';
}

/**
 * Returns hex with alpha for CSS rgba or inline style
 */
export function hexToRgba(hexColor?: string | null, alpha = 0.1): string {
  if (!hexColor) return `rgba(16, 185, 129, ${alpha})`; // default emerald
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return `rgba(16, 185, 129, ${alpha})`;

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Format brand theme styles for a tenant
 */
export function getTenantThemeStyles(brandColor?: string | null) {
  const color = brandColor && brandColor.trim() ? brandColor : '#059669'; // default sport emerald
  const contrastClass = getContrastTextColor(color);

  return {
    brandColor: color,
    contrastClass,
    buttonStyle: {
      backgroundColor: color,
      color: contrastClass === 'text-white' ? '#ffffff' : '#111827',
    },
    badgeStyle: {
      backgroundColor: hexToRgba(color, 0.12),
      color: color,
      borderColor: hexToRgba(color, 0.3),
    },
    borderStyle: {
      borderColor: color,
    },
    lightBgStyle: {
      backgroundColor: hexToRgba(color, 0.05),
    },
    gradientHeaderStyle: {
      background: `linear-gradient(135deg, ${color} 0%, ${hexToRgba(color, 0.85)} 100%)`,
    },
  };
}
