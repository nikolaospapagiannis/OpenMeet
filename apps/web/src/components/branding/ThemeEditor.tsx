import React, { useState, useEffect } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Palette, Eye, Shuffle, RefreshCw, Download, Upload, Check, AlertCircle, Sun, Moon } from 'lucide-react';
import { BrandingConfig } from '@/hooks/useBranding';

interface ThemeEditorProps {
  config: BrandingConfig;
  onUpdate: (updates: Partial<BrandingConfig>) => void;
  onApplyPreset?: (presetId: string) => void;
  presets?: Array<{
    id: string;
    name: string;
    description?: string;
    colors: Partial<BrandingConfig>;
    preview?: string;
  }>;
}

interface ColorGroup {
  label: string;
  field: keyof BrandingConfig;
  darkField?: keyof BrandingConfig;
  description?: string;
  contrastWith?: keyof BrandingConfig;
}

export function ThemeEditor({ config, onUpdate, onApplyPreset, presets = [] }: ThemeEditorProps) {
  const [selectedColor, setSelectedColor] = useState<keyof BrandingConfig>('primaryColor');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState('');

  const colorGroups: ColorGroup[] = [
    {
      label: 'Primary Color',
      field: 'primaryColor',
      darkField: 'darkPrimaryColor',
      description: 'Main brand color for buttons and key elements',
      contrastWith: 'backgroundColor',
    },
    {
      label: 'Secondary Color',
      field: 'secondaryColor',
      darkField: 'darkSecondaryColor',
      description: 'Supporting color for secondary actions',
    },
    {
      label: 'Accent Color',
      field: 'accentColor',
      darkField: 'darkAccentColor',
      description: 'Highlight color for important elements',
    },
    {
      label: 'Background',
      field: 'backgroundColor',
      darkField: 'darkBackgroundColor',
      description: 'Main background color',
    },
    {
      label: 'Text Color',
      field: 'textColor',
      darkField: 'darkTextColor',
      description: 'Primary text color',
      contrastWith: 'backgroundColor',
    },
    {
      label: 'Success',
      field: 'successColor',
      description: 'Color for success messages',
    },
    {
      label: 'Warning',
      field: 'warningColor',
      description: 'Color for warning messages',
    },
    {
      label: 'Error',
      field: 'errorColor',
      description: 'Color for error messages',
    },
    {
      label: 'Info',
      field: 'infoColor',
      description: 'Color for informational messages',
    },
  ];

  const calculateContrast = (color1: string, color2: string): number => {
    const getLuminance = (color: string) => {
      const rgb = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
      if (!rgb) return 0;

      const [r, g, b] = [
        parseInt(rgb[1], 16) / 255,
        parseInt(rgb[2], 16) / 255,
        parseInt(rgb[3], 16) / 255,
      ].map(val => {
        if (val <= 0.03928) return val / 12.92;
        return Math.pow((val + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  };

  const getContrastRating = (ratio: number) => {
    if (ratio >= 7) return { label: 'AAA', color: 'text-green-600' };
    if (ratio >= 4.5) return { label: 'AA', color: 'text-yellow-600' };
    if (ratio >= 3) return { label: 'AA Large', color: 'text-orange-600' };
    return { label: 'Fail', color: 'text-red-600' };
  };

  const generateComplementaryColors = () => {
    const primary = config.primaryColor;
    const rgb = primary.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!rgb) return;

    const r = parseInt(rgb[1], 16);
    const g = parseInt(rgb[2], 16);
    const b = parseInt(rgb[3], 16);

    // Generate complementary color
    const compR = 255 - r;
    const compG = 255 - g;
    const compB = 255 - b;

    // Generate analogous colors
    const hsl = rgbToHsl(r, g, b);
    const analog1 = hslToRgb((hsl[0] + 30) % 360, hsl[1], hsl[2]);
    const analog2 = hslToRgb((hsl[0] - 30 + 360) % 360, hsl[1], hsl[2]);

    onUpdate({
      secondaryColor: rgbToHex(compR, compG, compB),
      accentColor: rgbToHex(analog1[0], analog1[1], analog1[2]),
    });
  };

  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return [h * 360, s * 100, l * 100];
  };

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const exportTheme = () => {
    const themeData = {
      name: config.productName || 'Custom Theme',
      version: '1.0.0',
      colors: {
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        accentColor: config.accentColor,
        backgroundColor: config.backgroundColor,
        textColor: config.textColor,
        errorColor: config.errorColor,
        warningColor: config.warningColor,
        successColor: config.successColor,
        infoColor: config.infoColor,
        darkPrimaryColor: config.darkPrimaryColor,
        darkSecondaryColor: config.darkSecondaryColor,
        darkAccentColor: config.darkAccentColor,
        darkBackgroundColor: config.darkBackgroundColor,
        darkTextColor: config.darkTextColor,
      },
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(themeData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `theme-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportModalOpen(false);
  };

  const importTheme = () => {
    try {
      const data = JSON.parse(importData);
      if (data.colors) {
        onUpdate(data.colors);
        setImportModalOpen(false);
        setImportData('');
      } else {
        alert('Invalid theme format');
      }
    } catch (error) {
      alert('Invalid JSON format');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold">Theme Editor</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={generateComplementaryColors}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Generate Complementary Colors"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Import Theme"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExportModalOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Export Theme"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Presets */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Quick Presets</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApplyPreset?.(preset.id)}
                className="group p-3 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex -space-x-1">
                    {[preset.colors.primaryColor, preset.colors.secondaryColor, preset.colors.accentColor]
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border-2 border-white"
                          style={{ backgroundColor: color as string }}
                        />
                      ))}
                  </div>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600">
                    {preset.name}
                  </span>
                </div>
                {preset.description && (
                  <p className="text-xs text-gray-500 text-left">{preset.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {colorGroups.map((group) => {
          const field = darkMode && group.darkField ? group.darkField : group.field;
          const color = config[field] as string || '#000000';
          const contrastColor = group.contrastWith ? config[group.contrastWith] as string : null;
          const contrastRatio = contrastColor ? calculateContrast(color, contrastColor) : null;
          const rating = contrastRatio ? getContrastRating(contrastRatio) : null;

          return (
            <div
              key={group.field}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedColor(field);
                setShowColorPicker(true);
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{group.label}</span>
                {darkMode && group.darkField && (
                  <Moon className="w-3 h-3 text-gray-400" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg border-2 border-gray-200 shadow-inner"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-gray-600">{color}</code>
                    {rating && (
                      <span className={`text-xs font-semibold ${rating.color}`}>
                        {rating.label}
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                  )}
                  {contrastRatio && (
                    <p className="text-xs text-gray-400 mt-1">
                      Contrast: {contrastRatio.toFixed(2)}:1
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {colorGroups.find(g => g.field === selectedColor || g.darkField === selectedColor)?.label}
              </h3>
              <button
                onClick={() => setShowColorPicker(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <HexColorPicker
                color={config[selectedColor] as string || '#000000'}
                onChange={(color) => onUpdate({ [selectedColor]: color })}
              />
              <HexColorInput
                color={config[selectedColor] as string || '#000000'}
                onChange={(color) => onUpdate({ [selectedColor]: color })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowColorPicker(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Export Theme</h3>
            <p className="text-sm text-gray-600 mb-4">
              Export your current theme configuration as a JSON file.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setExportModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={exportTheme}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Import Theme</h3>
            <p className="text-sm text-gray-600 mb-4">
              Paste your theme JSON configuration below.
            </p>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
              placeholder='{"colors": {"primaryColor": "#3B82F6", ...}}'
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setImportData('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={importTheme}
                disabled={!importData}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}