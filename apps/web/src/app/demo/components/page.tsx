'use client'

import React from 'react'
import { ThemeProvider, ThemeToggle, useTheme } from '@/contexts/ThemeContext'
import { Button, ButtonGroup } from '@/components/ui/button-v2'
import {
  CardGlass,
  CardGlassHeader,
  CardGlassTitle,
  CardGlassDescription,
  CardGlassContent,
  CardGlassFooter
} from '@/components/ui/card-glass'
import { AmbientGlow } from '@/components/ui/ambient-glow'
import {
  Skeleton,
  CardSkeleton,
  TableRowSkeleton,
  ChartSkeleton,
  FormSkeleton
} from '@/components/ui/skeleton'
import {
  EmptyState,
  NoResultsEmptyState,
  ErrorEmptyState,
  ComingSoonEmptyState,
  WelcomeEmptyState
} from '@/components/ui/empty-state'
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Database,
  Rocket,
  Star,
  TrendingUp,
  Users
} from 'lucide-react'

/**
 * Component Demo Page Content
 * Showcases all components in action
 */
function ComponentDemoContent() {
  const { theme } = useTheme()
  const [isLoading, setIsLoading] = React.useState(false)
  const [showSkeleton, setShowSkeleton] = React.useState(false)

  return (
    <>
      {/* Ambient Glow Background */}
      <AmbientGlow variant="hero" intensity="medium" />

      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">
                Futuristic Enterprise Components
              </h1>
              <p className="text-slate-400 mt-2">
                Production-ready component library with zero TODOs
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* Button Variants Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Button Variants</h2>

            <div className="flex flex-wrap gap-4">
              <Button variant="default">Default</Button>
              <Button variant="gradient-primary">Gradient Primary</Button>
              <Button variant="gradient-secondary">Gradient Secondary</Button>
              <Button variant="glassmorphism">Glassmorphism</Button>
              <Button variant="ghost-glass">Ghost Glass</Button>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button size="xs" variant="gradient-primary">Extra Small</Button>
              <Button size="sm" variant="gradient-primary">Small</Button>
              <Button size="default" variant="gradient-primary">Default</Button>
              <Button size="lg" variant="gradient-primary">Large</Button>
              <Button size="xl" variant="gradient-primary">Extra Large</Button>
            </div>

            <div className="flex gap-4">
              <Button
                variant="gradient-primary"
                isLoading={isLoading}
                loadingText="Processing..."
                onClick={() => {
                  setIsLoading(true)
                  setTimeout(() => setIsLoading(false), 3000)
                }}
              >
                Click to Load
              </Button>
              <Button disabled variant="gradient-secondary">
                Disabled
              </Button>
              <Button variant="glassmorphism" leftIcon={<Star className="w-4 h-4" />}>
                With Icon
              </Button>
            </div>

            <ButtonGroup>
              <Button variant="glassmorphism">First</Button>
              <Button variant="glassmorphism">Second</Button>
              <Button variant="glassmorphism">Third</Button>
            </ButtonGroup>
          </section>

          {/* Glass Card Variants Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Glassmorphism Cards</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <CardGlass variant="default" hover>
                <CardGlassHeader>
                  <CardGlassTitle>Default Card</CardGlassTitle>
                  <CardGlassDescription>
                    Beautiful glassmorphism effect with backdrop blur
                  </CardGlassDescription>
                </CardGlassHeader>
                <CardGlassContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-teal-500" />
                      <span className="text-sm text-slate-400">Performance optimized</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-500" />
                      <span className="text-sm text-slate-400">Accessibility compliant</span>
                    </div>
                  </div>
                </CardGlassContent>
                <CardGlassFooter>
                  <Button variant="gradient-primary" size="sm">
                    Learn More
                  </Button>
                </CardGlassFooter>
              </CardGlass>

              <CardGlass variant="elevated" hover gradient>
                <CardGlassHeader>
                  <CardGlassTitle>Elevated Card</CardGlassTitle>
                  <CardGlassDescription>
                    With gradient border and elevated appearance
                  </CardGlassDescription>
                </CardGlassHeader>
                <CardGlassContent>
                  <div className="h-20 bg-gradient-to-br from-teal-500/20 to-purple-500/20 rounded-lg" />
                </CardGlassContent>
              </CardGlass>

              <CardGlass variant="subtle" hover>
                <CardGlassHeader>
                  <CardGlassTitle>Subtle Card</CardGlassTitle>
                  <CardGlassDescription>
                    Minimal styling for understated elegance
                  </CardGlassDescription>
                </CardGlassHeader>
                <CardGlassContent>
                  <p className="text-sm text-slate-400">
                    Perfect for secondary content areas
                  </p>
                </CardGlassContent>
              </CardGlass>
            </div>
          </section>

          {/* Skeleton States Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Skeleton Loading States</h2>
              <Button
                variant="glassmorphism"
                size="sm"
                onClick={() => setShowSkeleton(!showSkeleton)}
              >
                {showSkeleton ? 'Hide' : 'Show'} Skeletons
              </Button>
            </div>

            {showSkeleton && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Card Skeleton</h3>
                  <CardSkeleton />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Form Skeleton</h3>
                  <FormSkeleton fields={4} />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Chart Skeleton</h3>
                  <ChartSkeleton />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Table Skeleton</h3>
                  <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                      <tbody>
                        <TableRowSkeleton columns={4} />
                        <TableRowSkeleton columns={4} />
                        <TableRowSkeleton columns={4} />
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Empty States Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Empty States</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <CardGlass>
                <EmptyState
                  icon={FileText}
                  title="No documents found"
                  description="Start by creating your first document to get started with the system."
                  action={{
                    label: "Create Document",
                    onClick: () => console.log('Create document'),
                    variant: 'gradient'
                  }}
                  variant="no-data"
                />
              </CardGlass>

              <CardGlass>
                <ErrorEmptyState
                  onRetry={() => console.log('Retry')}
                  message="Failed to load data. Please check your connection and try again."
                />
              </CardGlass>

              <CardGlass>
                <ComingSoonEmptyState feature="Advanced Analytics" />
              </CardGlass>

              <CardGlass>
                <WelcomeEmptyState
                  entityName="projects"
                  onGetStarted={() => console.log('Get started')}
                />
              </CardGlass>
            </div>
          </section>

          {/* Theme Variations */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Theme Variations</h2>
            <CardGlass variant="elevated">
              <CardGlassContent>
                <div className="space-y-4">
                  <p className="text-slate-400">
                    Current theme: <span className="font-bold text-teal-500">{theme}</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    All components automatically adapt to the selected theme. Try toggling between light and dark modes to see the responsive styling.
                  </p>
                  <div className="flex gap-4 pt-4">
                    <div className="w-12 h-12 rounded-lg bg-teal-500" />
                    <div className="w-12 h-12 rounded-lg bg-cyan-500" />
                    <div className="w-12 h-12 rounded-lg bg-purple-500" />
                    <div className="w-12 h-12 rounded-lg bg-indigo-600" />
                  </div>
                </div>
              </CardGlassContent>
            </CardGlass>
          </section>
        </div>
      </div>
    </>
  )
}

/**
 * Component Demo Page
 * Wrapped with ThemeProvider
 */
export default function ComponentDemoPage() {
  return (
    <ThemeProvider defaultTheme="dark">
      <ComponentDemoContent />
    </ThemeProvider>
  )
}