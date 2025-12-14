/**
 * Theme utility library for white-label branding
 */

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  logoSquareUrl?: string;
  faviconUrl?: string;
  customDomain?: string;
  customDomainVerified: boolean;
  emailFromName: string;
  emailFromEmail?: string;
  emailLogoUrl?: string;
  emailFooter?: string;
  customCSS?: string;
  customJS?: string;
  productName: string;
  companyName?: string;
  tagline?: string;
  hideWatermark: boolean;
  customFonts?: Record<string, any>;
}

export const defaultBranding: BrandingConfig = {
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  accentColor: '#8B5CF6',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  customDomainVerified: false,
  emailFromName: 'OpenMeet',
  productName: 'OpenMeet',
  hideWatermark: false,
};

/**
 * Generate CSS variables from branding config
 */
export function generateCSSVariables(config: BrandingConfig): Record<string, string> {
  return {
    '--color-primary': config.primaryColor,
    '--color-primary-rgb': hexToRgb(config.primaryColor),
    '--color-secondary': config.secondaryColor,
    '--color-secondary-rgb': hexToRgb(config.secondaryColor),
    '--color-accent': config.accentColor,
    '--color-accent-rgb': hexToRgb(config.accentColor),
    '--color-background': config.backgroundColor,
    '--color-background-rgb': hexToRgb(config.backgroundColor),
    '--color-text': config.textColor,
    '--color-text-rgb': hexToRgb(config.textColor),
  };
}

/**
 * Apply CSS variables to document root
 */
export function applyCSSVariables(config: BrandingConfig): void {
  const variables = generateCSSVariables(config);

  Object.entries(variables).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}

/**
 * Convert hex color to RGB string
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';

  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Calculate luminance of a color
 */
export function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = ((rgb >> 16) & 0xff) / 255;
  const g = ((rgb >> 8) & 0xff) / 255;
  const b = (rgb & 0xff) / 255;

  const [rs, gs, bs] = [r, g, b].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function calculateContrast(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if contrast meets WCAG AA standard
 */
export function meetsWCAGAA(color1: string, color2: string): boolean {
  return calculateContrast(color1, color2) >= 4.5;
}

/**
 * Check if contrast meets WCAG AAA standard
 */
export function meetsWCAGAAA(color1: string, color2: string): boolean {
  return calculateContrast(color1, color2) >= 7;
}

/**
 * Lighten a color by a percentage
 */
export function lighten(hex: string, percent: number): string {
  const rgb = parseInt(hex.slice(1), 16);
  let r = (rgb >> 16) & 0xff;
  let g = (rgb >> 8) & 0xff;
  let b = rgb & 0xff;

  r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

  return rgbToHex(r, g, b);
}

/**
 * Darken a color by a percentage
 */
export function darken(hex: string, percent: number): string {
  const rgb = parseInt(hex.slice(1), 16);
  let r = (rgb >> 16) & 0xff;
  let g = (rgb >> 8) & 0xff;
  let b = rgb & 0xff;

  r = Math.max(0, Math.floor(r * (1 - percent / 100)));
  g = Math.max(0, Math.floor(g * (1 - percent / 100)));
  b = Math.max(0, Math.floor(b * (1 - percent / 100)));

  return rgbToHex(r, g, b);
}

/**
 * Update document title with product name
 */
export function updateDocumentTitle(productName: string, pageTitle?: string): void {
  document.title = pageTitle ? `${pageTitle} - ${productName}` : productName;
}

/**
 * Update favicon
 */
export function updateFavicon(faviconUrl: string): void {
  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
  link.type = 'image/x-icon';
  link.rel = 'shortcut icon';
  link.href = faviconUrl;

  if (!document.querySelector("link[rel*='icon']")) {
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}

/**
 * Inject custom CSS
 */
export function injectCustomCSS(css: string): void {
  const styleId = 'custom-branding-css';
  let styleElement = document.getElementById(styleId) as HTMLStyleElement;

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = css;
}

/**
 * Inject custom JavaScript (safely)
 */
export function injectCustomJS(js: string): void {
  const scriptId = 'custom-branding-js';
  let scriptElement = document.getElementById(scriptId) as HTMLScriptElement;

  if (scriptElement) {
    scriptElement.remove();
  }

  scriptElement = document.createElement('script');
  scriptElement.id = scriptId;
  scriptElement.type = 'text/javascript';
  scriptElement.textContent = js;
  document.body.appendChild(scriptElement);
}

/**
 * Get color palette from primary color
 */
export function getColorPalette(primaryColor: string): {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
} {
  return {
    50: lighten(primaryColor, 40),
    100: lighten(primaryColor, 32),
    200: lighten(primaryColor, 24),
    300: lighten(primaryColor, 16),
    400: lighten(primaryColor, 8),
    500: primaryColor,
    600: darken(primaryColor, 8),
    700: darken(primaryColor, 16),
    800: darken(primaryColor, 24),
    900: darken(primaryColor, 32),
  };
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Generate Tailwind CSS config from branding
 */
export function generateTailwindConfig(config: BrandingConfig): Record<string, any> {
  return {
    theme: {
      extend: {
        colors: {
          primary: getColorPalette(config.primaryColor),
          secondary: getColorPalette(config.secondaryColor),
          accent: getColorPalette(config.accentColor),
        },
      },
    },
  };
}

/**
 * Apply branding to document
 */
export function applyBranding(config: BrandingConfig): void {
  // Apply CSS variables
  applyCSSVariables(config);

  // Update title
  updateDocumentTitle(config.productName);

  // Update favicon
  if (config.faviconUrl) {
    updateFavicon(config.faviconUrl);
  }

  // Inject custom CSS
  if (config.customCSS) {
    injectCustomCSS(config.customCSS);
  }

  // Inject custom JS
  if (config.customJS) {
    injectCustomJS(config.customJS);
  }
}

/**
 * Load branding from API
 */
export async function loadBranding(): Promise<BrandingConfig> {
  try {
    const response = await fetch('/api/whitelabel/config');

    if (!response.ok) {
      throw new Error('Failed to load branding');
    }

    const config = await response.json();
    return config;
  } catch (error) {
    console.error('Error loading branding:', error);
    return defaultBranding;
  }
}

/**
 * Color presets for quick selection
 */
export const colorPresets = {
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#F59E0B',
  green: '#10B981',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  indigo: '#6366F1',
};
