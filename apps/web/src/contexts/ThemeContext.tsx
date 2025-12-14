'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

/**
 * Theme type definition
 */
type Theme = 'light' | 'dark'

/**
 * Theme context value interface
 */
interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

/**
 * Theme context with undefined default value
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

/**
 * ThemeProvider Props
 */
interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

/**
 * ThemeProvider Component
 * Provides theme context to all children components
 * Persists theme preference in localStorage
 * Applies theme class to documentElement
 */
export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'futuristic-theme'
}: ThemeProviderProps) {
  // Initialize theme state with localStorage value or default
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      try {
        const storedTheme = localStorage.getItem(storageKey) as Theme | null
        if (storedTheme === 'light' || storedTheme === 'dark') {
          return storedTheme
        }
      } catch (error) {
        console.error('Error reading theme from localStorage:', error)
      }
    }
    return defaultTheme
  })

  // Apply theme class to document element and persist to localStorage
  useEffect(() => {
    const root = window.document.documentElement

    // Remove opposite theme class and add current theme class
    if (theme === 'dark') {
      root.classList.remove('light')
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
    }

    // Persist theme to localStorage
    try {
      localStorage.setItem(storageKey, theme)
    } catch (error) {
      console.error('Error saving theme to localStorage:', error)
    }
  }, [theme, storageKey])

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = () => {
    setThemeState(prevTheme => prevTheme === 'dark' ? 'light' : 'dark')
  }

  /**
   * Set theme directly
   */
  const setTheme = (newTheme: Theme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeState(newTheme)
    }
  }

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    setTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Custom hook to use theme context
 * Throws error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}

/**
 * Optional: Theme toggle button component
 * Can be used as a ready-made theme switcher
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}