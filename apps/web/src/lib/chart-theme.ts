import React from 'react'

/**
 * Dark theme configuration for Recharts
 * Matches the Futuristic Enterprise design system
 */
export const darkChartTheme = {
  // CartesianGrid styling
  cartesianGrid: {
    strokeDasharray: "3 3",
    stroke: "#334155", // slate-700
    opacity: 0.2,
    vertical: false,
    horizontal: true,
  },

  // Tooltip styling with glassmorphism effect
  tooltip: {
    contentStyle: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)', // slate-900 with opacity
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0.75rem',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '12px 16px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    },
    itemStyle: {
      color: '#e2e8f0', // slate-200
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    labelStyle: {
      color: '#cbd5e1', // slate-300
      marginBottom: '0.5rem',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    cursor: {
      fill: 'rgba(20, 184, 166, 0.1)', // teal-500 with low opacity
    },
  },

  // X-Axis styling
  xAxis: {
    stroke: '#64748b', // slate-500
    fontSize: 12,
    tickLine: false,
    axisLine: {
      stroke: '#334155', // slate-700
      strokeWidth: 1,
    },
    tick: {
      fill: '#64748b', // slate-500
    },
  },

  // Y-Axis styling
  yAxis: {
    stroke: '#64748b', // slate-500
    fontSize: 12,
    tickLine: false,
    axisLine: false,
    tick: {
      fill: '#64748b', // slate-500
    },
  },

  // Legend styling
  legend: {
    iconType: 'circle' as const,
    wrapperStyle: {
      paddingTop: '20px',
      fontSize: '0.875rem',
      color: '#94a3b8', // slate-400
    },
  },

  // Default colors for data series
  colors: {
    primary: '#14b8a6', // teal-500
    secondary: '#06b6d4', // cyan-500
    tertiary: '#a855f7', // purple-500
    quaternary: '#4f46e5', // indigo-600
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    danger: '#ef4444', // red-500
  },

  // Area chart specific
  area: {
    strokeWidth: 2,
    fillOpacity: 0.1,
    activeDot: {
      r: 6,
      strokeWidth: 2,
      stroke: 'rgba(255, 255, 255, 0.2)',
    },
  },

  // Line chart specific
  line: {
    strokeWidth: 2,
    dot: false,
    activeDot: {
      r: 6,
      strokeWidth: 2,
      stroke: 'rgba(255, 255, 255, 0.2)',
    },
  },

  // Bar chart specific
  bar: {
    radius: [4, 4, 0, 0],
    maxBarSize: 40,
  },
}

/**
 * Light theme configuration for Recharts
 * Provides a clean, professional look for light mode
 */
export const lightChartTheme = {
  // CartesianGrid styling
  cartesianGrid: {
    strokeDasharray: "3 3",
    stroke: '#e2e8f0', // slate-200
    opacity: 0.5,
    vertical: false,
    horizontal: true,
  },

  // Tooltip styling
  tooltip: {
    contentStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      border: '1px solid #e2e8f0', // slate-200
      borderRadius: '0.75rem',
      padding: '12px 16px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    },
    itemStyle: {
      color: '#334155', // slate-700
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    labelStyle: {
      color: '#475569', // slate-600
      marginBottom: '0.5rem',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    cursor: {
      fill: 'rgba(20, 184, 166, 0.05)', // teal-500 with very low opacity
    },
  },

  // X-Axis styling
  xAxis: {
    stroke: '#64748b', // slate-500
    fontSize: 12,
    tickLine: false,
    axisLine: {
      stroke: '#cbd5e1', // slate-300
      strokeWidth: 1,
    },
    tick: {
      fill: '#64748b', // slate-500
    },
  },

  // Y-Axis styling
  yAxis: {
    stroke: '#64748b', // slate-500
    fontSize: 12,
    tickLine: false,
    axisLine: false,
    tick: {
      fill: '#64748b', // slate-500
    },
  },

  // Legend styling
  legend: {
    iconType: 'circle' as const,
    wrapperStyle: {
      paddingTop: '20px',
      fontSize: '0.875rem',
      color: '#475569', // slate-600
    },
  },

  // Default colors for data series
  colors: {
    primary: '#0d9488', // teal-600
    secondary: '#0891b2', // cyan-600
    tertiary: '#9333ea', // purple-600
    quaternary: '#4f46e5', // indigo-600
    success: '#059669', // emerald-600
    warning: '#d97706', // amber-600
    danger: '#dc2626', // red-600
  },

  // Area chart specific
  area: {
    strokeWidth: 2,
    fillOpacity: 0.15,
    activeDot: {
      r: 6,
      strokeWidth: 2,
      stroke: 'rgba(255, 255, 255, 0.8)',
    },
  },

  // Line chart specific
  line: {
    strokeWidth: 2,
    dot: false,
    activeDot: {
      r: 6,
      strokeWidth: 2,
      stroke: 'rgba(255, 255, 255, 0.8)',
    },
  },

  // Bar chart specific
  bar: {
    radius: [4, 4, 0, 0],
    maxBarSize: 40,
  },
}

/**
 * Gradient Definitions Component for Recharts
 * Must be included inside the chart's <defs> element
 */
export function ChartGradients() {
  return React.createElement('defs', null, [
    // Teal gradient
    React.createElement('linearGradient', {
      key: 'colorTeal',
      id: 'colorTeal',
      x1: '0',
      y1: '0',
      x2: '0',
      y2: '1'
    }, [
      React.createElement('stop', {
        key: 'stop1',
        offset: '5%',
        stopColor: '#14b8a6',
        stopOpacity: 0.8
      }),
      React.createElement('stop', {
        key: 'stop2',
        offset: '95%',
        stopColor: '#0891b2',
        stopOpacity: 0.1
      })
    ]),

    // Purple gradient
    React.createElement('linearGradient', {
      key: 'colorPurple',
      id: 'colorPurple',
      x1: '0',
      y1: '0',
      x2: '0',
      y2: '1'
    }, [
      React.createElement('stop', {
        key: 'stop1',
        offset: '5%',
        stopColor: '#a855f7',
        stopOpacity: 0.8
      }),
      React.createElement('stop', {
        key: 'stop2',
        offset: '95%',
        stopColor: '#4f46e5',
        stopOpacity: 0.1
      })
    ]),

    // Cyan gradient
    React.createElement('linearGradient', {
      key: 'colorCyan',
      id: 'colorCyan',
      x1: '0',
      y1: '0',
      x2: '0',
      y2: '1'
    }, [
      React.createElement('stop', {
        key: 'stop1',
        offset: '5%',
        stopColor: '#06b6d4',
        stopOpacity: 0.8
      }),
      React.createElement('stop', {
        key: 'stop2',
        offset: '95%',
        stopColor: '#0891b2',
        stopOpacity: 0.1
      })
    ]),

    // Success gradient
    React.createElement('linearGradient', {
      key: 'colorSuccess',
      id: 'colorSuccess',
      x1: '0',
      y1: '0',
      x2: '0',
      y2: '1'
    }, [
      React.createElement('stop', {
        key: 'stop1',
        offset: '5%',
        stopColor: '#10b981',
        stopOpacity: 0.8
      }),
      React.createElement('stop', {
        key: 'stop2',
        offset: '95%',
        stopColor: '#059669',
        stopOpacity: 0.1
      })
    ]),

    // Warning gradient
    React.createElement('linearGradient', {
      key: 'colorWarning',
      id: 'colorWarning',
      x1: '0',
      y1: '0',
      x2: '0',
      y2: '1'
    }, [
      React.createElement('stop', {
        key: 'stop1',
        offset: '5%',
        stopColor: '#f59e0b',
        stopOpacity: 0.8
      }),
      React.createElement('stop', {
        key: 'stop2',
        offset: '95%',
        stopColor: '#d97706',
        stopOpacity: 0.1
      })
    ]),

    // Danger gradient
    React.createElement('linearGradient', {
      key: 'colorDanger',
      id: 'colorDanger',
      x1: '0',
      y1: '0',
      x2: '0',
      y2: '1'
    }, [
      React.createElement('stop', {
        key: 'stop1',
        offset: '5%',
        stopColor: '#ef4444',
        stopOpacity: 0.8
      }),
      React.createElement('stop', {
        key: 'stop2',
        offset: '95%',
        stopColor: '#dc2626',
        stopOpacity: 0.1
      })
    ])
  ])
}

/**
 * Helper function to get the appropriate theme based on current mode
 */
export function getChartTheme(isDark: boolean) {
  return isDark ? darkChartTheme : lightChartTheme
}

/**
 * Default chart margin configuration
 */
export const defaultChartMargin = {
  top: 20,
  right: 20,
  left: 20,
  bottom: 20,
}

/**
 * Responsive container configuration
 */
export const responsiveContainerConfig = {
  width: '100%' as const,
  height: '100%' as const,
  minHeight: 300,
}