'use client';

import React, { useState } from 'react';
import { BrandingConfig } from '@/lib/theme';
import { Monitor, Smartphone, Tablet, Sun, Moon, Mail } from 'lucide-react';

interface BrandPreviewProps {
  config: BrandingConfig;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';
type PreviewMode = 'app' | 'email';
type ColorMode = 'light' | 'dark';

export function BrandPreview({ config }: BrandPreviewProps) {
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [mode, setMode] = useState<PreviewMode>('app');
  const [colorMode, setColorMode] = useState<ColorMode>('light');

  const getViewportClass = () => {
    switch (viewport) {
      case 'mobile':
        return 'max-w-[375px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'max-w-full';
    }
  };

  const renderAppPreview = () => {
    const isDark = colorMode === 'dark';
    const bgColor = isDark ? '#1F2937' : config.backgroundColor;
    const textColor = isDark ? '#F9FAFB' : config.textColor;
    const logo = isDark && config.logoDarkUrl ? config.logoDarkUrl : config.logoUrl;

    return (
      <div
        className="w-full h-full rounded-lg p-6 space-y-6"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: config.primaryColor + '20' }}>
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt={config.productName} className="h-8" />
            ) : (
              <div
                className="h-8 w-32 rounded flex items-center justify-center text-sm font-semibold"
                style={{ backgroundColor: config.primaryColor, color: '#fff' }}
              >
                {config.productName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              style={{ backgroundColor: config.primaryColor + '20', color: config.primaryColor }}
            >
              Settings
            </button>
            <button
              className="px-3 py-1.5 rounded text-sm font-medium transition-colors text-white"
              style={{ backgroundColor: config.primaryColor }}
            >
              New Meeting
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Welcome to {config.productName}</h2>
          {config.tagline && (
            <p className="text-sm opacity-70">{config.tagline}</p>
          )}

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {['Meetings', 'Analytics', 'Integrations'].map((title, index) => (
              <div
                key={title}
                className="rounded-lg p-4 border"
                style={{
                  borderColor: [config.primaryColor, config.secondaryColor, config.accentColor][index] + '40',
                  backgroundColor: [config.primaryColor, config.secondaryColor, config.accentColor][index] + '10',
                }}
              >
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm opacity-70">
                  View your {title.toLowerCase()} here
                </p>
                <div
                  className="mt-3 text-sm font-medium"
                  style={{ color: [config.primaryColor, config.secondaryColor, config.accentColor][index] }}
                >
                  View all
                </div>
              </div>
            ))}
          </div>

          {/* Sample list */}
          <div className="space-y-2 mt-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ borderColor: isDark ? '#374151' : '#E5E7EB' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    {i}
                  </div>
                  <div>
                    <div className="font-medium">Meeting {i}</div>
                    <div className="text-sm opacity-70">2 days ago</div>
                  </div>
                </div>
                <button
                  className="px-3 py-1 rounded text-sm"
                  style={{ backgroundColor: config.secondaryColor, color: '#fff' }}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Watermark */}
        {!config.hideWatermark && (
          <div className="pt-6 border-t text-center text-xs opacity-50" style={{ borderColor: config.primaryColor + '20' }}>
            Powered by {config.companyName || config.productName}
          </div>
        )}
      </div>
    );
  };

  const renderEmailPreview = () => {
    const logo = config.emailLogoUrl || config.logoUrl;

    return (
      <div className="w-full h-full bg-white rounded-lg p-6 space-y-6">
        {/* Email header */}
        <div className="border-b pb-4">
          {logo ? (
            <img src={logo} alt={config.productName} className="h-8" />
          ) : (
            <div
              className="h-8 w-32 rounded flex items-center justify-center text-sm font-semibold text-white"
              style={{ backgroundColor: config.primaryColor }}
            >
              {config.productName}
            </div>
          )}
        </div>

        {/* Email body */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold" style={{ color: config.textColor }}>
            Meeting Summary
          </h2>

          <p className="text-sm" style={{ color: config.textColor }}>
            Hello John,
          </p>

          <p className="text-sm" style={{ color: config.textColor }}>
            Here's your meeting summary from today's call:
          </p>

          <div
            className="rounded-lg p-4 my-4"
            style={{ backgroundColor: config.primaryColor + '10', borderLeft: `4px solid ${config.primaryColor}` }}
          >
            <p className="font-semibold mb-2" style={{ color: config.primaryColor }}>
              Key Points
            </p>
            <ul className="space-y-1 text-sm" style={{ color: config.textColor }}>
              <li>Discussion about Q4 goals</li>
              <li>Product roadmap review</li>
              <li>Budget planning for next quarter</li>
            </ul>
          </div>

          <a
            href="#"
            className="inline-block px-6 py-2 rounded text-sm font-medium text-white text-center"
            style={{ backgroundColor: config.primaryColor }}
          >
            View Full Summary
          </a>
        </div>

        {/* Email footer */}
        <div className="border-t pt-4 mt-6">
          {config.emailFooter ? (
            <div
              className="text-xs text-gray-600"
              dangerouslySetInnerHTML={{ __html: config.emailFooter }}
            />
          ) : (
            <div className="text-xs text-gray-600 space-y-1">
              <p>
                Sent from {config.emailFromName || config.productName}
              </p>
              {config.companyName && <p>{config.companyName}</p>}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Viewport selector */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewport('desktop')}
            className={`p-2 rounded transition-colors ${
              viewport === 'desktop'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Desktop"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={`p-2 rounded transition-colors ${
              viewport === 'tablet'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Tablet"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`p-2 rounded transition-colors ${
              viewport === 'mobile'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Mobile"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('app')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === 'app'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            App
          </button>
          <button
            onClick={() => setMode('email')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === 'email'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-1" />
            Email
          </button>
        </div>

        {/* Color mode selector (only for app) */}
        {mode === 'app' && (
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setColorMode('light')}
              className={`p-2 rounded transition-colors ${
                colorMode === 'light'
                  ? 'bg-white shadow-sm text-yellow-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Light mode"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setColorMode('dark')}
              className={`p-2 rounded transition-colors ${
                colorMode === 'dark'
                  ? 'bg-white shadow-sm text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Dark mode"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-gray-100 rounded-lg p-6 flex justify-center">
        <div className={`transition-all ${getViewportClass()}`}>
          <div className="bg-white rounded-lg shadow-xl overflow-hidden min-h-[600px]">
            {mode === 'app' ? renderAppPreview() : renderEmailPreview()}
          </div>
        </div>
      </div>
    </div>
  );
}
