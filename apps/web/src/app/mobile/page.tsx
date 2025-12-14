'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Smartphone,
  Download,
  Bell,
  Search,
  WifiOff,
  Fingerprint,
  Mic,
  FileText,
  Shield,
  Zap,
  Globe,
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  Users,
  Play,
  Pause,
  Volume2,
  ChevronRight
} from 'lucide-react';

export default function MobilePage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: <Mic className="w-6 h-6" />,
      title: 'Record On-the-Go',
      description: 'Capture meetings, interviews, and voice notes instantly from your mobile device',
      gradient: 'from-purple-500 to-blue-500'
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'View Transcripts Anywhere',
      description: 'Access detailed transcriptions and summaries right from your phone',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: 'Smart Notifications',
      description: 'Get push alerts for meeting summaries, action items, and follow-ups',
      gradient: 'from-cyan-500 to-teal-500'
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: 'Powerful Search',
      description: 'Find any conversation, keyword, or insight from your entire meeting history',
      gradient: 'from-teal-500 to-green-500'
    },
    {
      icon: <WifiOff className="w-6 h-6" />,
      title: 'Offline Mode',
      description: 'Record and access recent meetings without an internet connection',
      gradient: 'from-green-500 to-yellow-500'
    },
    {
      icon: <Fingerprint className="w-6 h-6" />,
      title: 'Biometric Security',
      description: 'Protect sensitive meeting data with Face ID or fingerprint authentication',
      gradient: 'from-yellow-500 to-purple-500'
    }
  ];

  const stats = [
    { value: '4.8', label: 'App Store Rating', icon: <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" /> },
    { value: '500K+', label: 'Downloads', icon: <Download className="w-5 h-5 text-green-500" /> },
    { value: '50M+', label: 'Meetings Recorded', icon: <Mic className="w-5 h-5 text-purple-500" /> },
    { value: '120+', label: 'Countries', icon: <Globe className="w-5 h-5 text-blue-500" /> }
  ];

  return (
    <>
      <Navigation />

      <main className="bg-[var(--ff-bg-dark)] min-h-screen">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-radial from-[var(--ff-purple-500)]/10 via-transparent to-transparent opacity-40" />

          <div className="container-ff relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="inline-flex items-center gap-2 bg-[var(--ff-purple-500)]/10 border border-[var(--ff-purple-500)]/20 rounded-full px-4 py-2 mb-6">
                  <Smartphone className="w-4 h-4 text-[var(--ff-purple-500)]" />
                  <span className="text-sm text-[var(--ff-purple-500)]">Available on iOS & Android</span>
                </div>

                <h1 className="heading-xl mb-6 bg-gradient-to-r from-white to-[var(--ff-text-secondary)] bg-clip-text text-transparent">
                  Meetings in Your Pocket
                </h1>

                <p className="paragraph-l mb-8 text-[var(--ff-text-secondary)]">
                  Transform your mobile device into a powerful meeting assistant. Record, transcribe, and analyze conversations wherever you go with the OpenMeet mobile app.
                </p>

                {/* App Store Badges */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <button className="group relative bg-black border border-[var(--ff-border)] rounded-xl px-6 py-3 transition-all hover:border-[var(--ff-purple-500)]/50">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      <div className="text-left">
                        <div className="text-xs text-[var(--ff-text-muted)]">Download on the</div>
                        <div className="text-sm font-semibold">App Store</div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--ff-purple-500)]/0 to-[var(--ff-purple-500)]/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button className="group relative bg-black border border-[var(--ff-border)] rounded-xl px-6 py-3 transition-all hover:border-[var(--ff-purple-500)]/50">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <div className="text-left">
                        <div className="text-xs text-[var(--ff-text-muted)]">Get it on</div>
                        <div className="text-sm font-semibold">Google Play</div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--ff-purple-500)]/0 to-[var(--ff-purple-500)]/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center sm:text-left">
                      <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                        {stat.icon}
                        <div className="text-2xl font-bold">{stat.value}</div>
                      </div>
                      <div className="text-sm text-[var(--ff-text-muted)]">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Phone Mockup */}
              <div className={`relative transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="relative mx-auto max-w-[320px]">
                  {/* Phone Frame */}
                  <div className="relative bg-gradient-to-b from-gray-900 to-black rounded-[3rem] p-2 shadow-2xl">
                    <div className="relative bg-black rounded-[2.5rem] p-1">
                      {/* Notch */}
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-full z-20" />

                      {/* Screen Content */}
                      <div className="relative bg-gradient-to-b from-[var(--ff-bg-layer)] to-[var(--ff-bg-dark)] rounded-[2.5rem] h-[600px] overflow-hidden">
                        {/* Status Bar */}
                        <div className="relative z-30 flex justify-between items-center px-8 py-2 text-white text-xs">
                          <span>9:41</span>
                          <div className="flex gap-1">
                            <div className="w-4 h-3 bg-white/60 rounded-sm" />
                            <div className="w-4 h-3 bg-white/80 rounded-sm" />
                            <div className="w-4 h-3 bg-white rounded-sm" />
                          </div>
                        </div>

                        {/* App Interface */}
                        <div className="px-6 py-4">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white text-lg font-semibold">Recording</h3>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-white text-sm">00:42</span>
                            </div>
                          </div>

                          {/* Waveform Animation */}
                          <div className="flex items-center justify-center gap-1 h-32 mb-8">
                            {[...Array(20)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-gradient-to-t from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] rounded-full animate-pulse"
                                style={{
                                  height: `${Math.random() * 60 + 20}px`,
                                  animationDelay: `${i * 0.1}s`,
                                  animationDuration: '1.5s'
                                }}
                              />
                            ))}
                          </div>

                          {/* Meeting Title */}
                          <div className="bg-[var(--ff-bg-layer)] rounded-2xl p-4 mb-4 border border-[var(--ff-border)]">
                            <h4 className="text-white font-medium mb-2">Product Strategy Meeting</h4>
                            <div className="flex items-center gap-4 text-[var(--ff-text-muted)] text-sm">
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>5 participants</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>45 min</span>
                              </div>
                            </div>
                          </div>

                          {/* AI Insights Preview */}
                          <div className="bg-gradient-to-r from-[var(--ff-purple-500)]/10 to-[var(--ff-purple-600)]/10 rounded-2xl p-4 border border-[var(--ff-purple-500)]/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="w-4 h-4 text-[var(--ff-purple-500)]" />
                              <span className="text-[var(--ff-purple-500)] text-sm font-medium">AI Processing</span>
                            </div>
                            <p className="text-[var(--ff-text-secondary)] text-xs">
                              Generating transcript, summary, and action items...
                            </p>
                          </div>

                          {/* Control Buttons */}
                          <div className="flex justify-center gap-6 mt-8">
                            <button className="w-14 h-14 rounded-full bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] flex items-center justify-center">
                              <Volume2 className="w-6 h-6 text-white" />
                            </button>
                            <button className="w-16 h-16 rounded-full bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] flex items-center justify-center shadow-lg shadow-[var(--ff-purple-500)]/30">
                              <Pause className="w-7 h-7 text-white" />
                            </button>
                            <button className="w-14 h-14 rounded-full bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Elements */}
                  <div className="absolute -top-8 -right-8 bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] rounded-2xl p-3 shadow-xl animate-float">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -bottom-8 -left-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-3 shadow-xl animate-float-delayed">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Grid */}
        <section className="py-20 relative">
          <div className="container-ff">
            <div className="text-center mb-12">
              <h2 className="heading-l mb-4">Powerful Features for Mobile Professionals</h2>
              <p className="paragraph-l max-w-2xl mx-auto">
                Everything you need to capture, transcribe, and analyze meetings from your smartphone
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group relative bg-[var(--ff-bg-layer)] rounded-2xl p-6 border border-[var(--ff-border)] transition-all duration-300 hover:border-[var(--ff-purple-500)]/30 hover:shadow-lg hover:shadow-[var(--ff-purple-500)]/10 cursor-pointer"
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  {/* Icon */}
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} mb-4`}>
                    {feature.icon}
                  </div>

                  {/* Content */}
                  <h3 className="heading-s mb-2 text-white">{feature.title}</h3>
                  <p className="paragraph-s">{feature.description}</p>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--ff-purple-500)]/0 to-[var(--ff-purple-500)]/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Screenshots Section */}
        <section className="py-20 bg-[var(--ff-bg-layer)]">
          <div className="container-ff">
            <div className="text-center mb-12">
              <h2 className="heading-l mb-4">See It in Action</h2>
              <p className="paragraph-l max-w-2xl mx-auto">
                Experience the intuitive interface designed for productivity on the go
              </p>
            </div>

            {/* Screenshot Carousel */}
            <div className="relative">
              <div className="flex overflow-x-auto pb-8 gap-6 snap-x snap-mandatory scrollbar-hide">
                {/* Screenshot 1 - Dashboard */}
                <div className="flex-shrink-0 snap-center">
                  <div className="relative w-[280px] h-[560px] bg-gradient-to-b from-[var(--ff-bg-layer)] to-[var(--ff-bg-dark)] rounded-3xl p-6 border border-[var(--ff-border)]">
                    <h4 className="text-white font-semibold mb-4">Dashboard</h4>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-[var(--ff-bg-dark)] rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] rounded-full" />
                            <div className="flex-1">
                              <div className="h-3 bg-[var(--ff-border)] rounded-full w-3/4 mb-1" />
                              <div className="h-2 bg-[var(--ff-border)]/50 rounded-full w-1/2" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Screenshot 2 - Recording */}
                <div className="flex-shrink-0 snap-center">
                  <div className="relative w-[280px] h-[560px] bg-gradient-to-b from-[var(--ff-bg-layer)] to-[var(--ff-bg-dark)] rounded-3xl p-6 border border-[var(--ff-border)]">
                    <h4 className="text-white font-semibold mb-4">Recording</h4>
                    <div className="flex items-center justify-center h-40">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] animate-pulse" />
                        <Mic className="w-12 h-12 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    <div className="text-center mt-8">
                      <div className="text-3xl font-bold text-white mb-2">00:24:35</div>
                      <div className="text-[var(--ff-text-muted)]">Recording in progress</div>
                    </div>
                  </div>
                </div>

                {/* Screenshot 3 - Transcript */}
                <div className="flex-shrink-0 snap-center">
                  <div className="relative w-[280px] h-[560px] bg-gradient-to-b from-[var(--ff-bg-layer)] to-[var(--ff-bg-dark)] rounded-3xl p-6 border border-[var(--ff-border)]">
                    <h4 className="text-white font-semibold mb-4">Transcript</h4>
                    <div className="space-y-4">
                      {['Speaker 1', 'Speaker 2', 'Speaker 1'].map((speaker, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm text-[var(--ff-purple-500)] mb-1">{speaker}</div>
                            <div className="h-2 bg-[var(--ff-border)] rounded-full w-full mb-1" />
                            <div className="h-2 bg-[var(--ff-border)]/50 rounded-full w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Screenshot 4 - Summary */}
                <div className="flex-shrink-0 snap-center">
                  <div className="relative w-[280px] h-[560px] bg-gradient-to-b from-[var(--ff-bg-layer)] to-[var(--ff-bg-dark)] rounded-3xl p-6 border border-[var(--ff-border)]">
                    <h4 className="text-white font-semibold mb-4">AI Summary</h4>
                    <div className="bg-gradient-to-r from-[var(--ff-purple-500)]/10 to-[var(--ff-purple-600)]/10 rounded-xl p-4 mb-4">
                      <Zap className="w-6 h-6 text-[var(--ff-purple-500)] mb-2" />
                      <div className="space-y-2">
                        <div className="h-2 bg-[var(--ff-purple-500)]/30 rounded-full w-full" />
                        <div className="h-2 bg-[var(--ff-purple-500)]/20 rounded-full w-4/5" />
                        <div className="h-2 bg-[var(--ff-purple-500)]/20 rounded-full w-3/4" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        <div className="h-2 bg-[var(--ff-border)] rounded-full w-3/4" />
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        <div className="h-2 bg-[var(--ff-border)] rounded-full w-4/5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Device Compatibility */}
        <section className="py-20">
          <div className="container-ff">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="heading-l mb-6">Works on All Your Devices</h2>
                <p className="paragraph-l mb-8">
                  Seamlessly sync across iPhone, iPad, Android phones and tablets. Your meetings are always accessible, no matter which device you're using.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">iOS 14+ Support</h4>
                      <p className="text-[var(--ff-text-muted)] text-sm">Optimized for iPhone and iPad</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">Android 8.0+ Support</h4>
                      <p className="text-[var(--ff-text-muted)] text-sm">Works on phones and tablets</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">Cross-Platform Sync</h4>
                      <p className="text-[var(--ff-text-muted)] text-sm">Real-time synchronization across all devices</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                {/* Device Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {/* iPhone */}
                  <div className="relative">
                    <div className="bg-gradient-to-b from-gray-800 to-black rounded-3xl p-1.5 shadow-2xl">
                      <div className="bg-black rounded-[1.5rem] p-0.5">
                        <div className="bg-gradient-to-b from-[var(--ff-bg-layer)] to-[var(--ff-bg-dark)] rounded-[1.5rem] h-[250px] flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] rounded-2xl flex items-center justify-center mb-3 mx-auto">
                              <span className="text-white font-bold text-2xl">F</span>
                            </div>
                            <span className="text-white text-sm">OpenMeet</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-3">
                      <span className="text-[var(--ff-text-muted)] text-sm">iPhone 15 Pro</span>
                    </div>
                  </div>

                  {/* iPad */}
                  <div className="relative">
                    <div className="bg-gradient-to-b from-gray-800 to-black rounded-2xl p-1.5 shadow-2xl">
                      <div className="bg-black rounded-xl p-0.5">
                        <div className="bg-gradient-to-b from-[var(--ff-bg-layer)] to-[var(--ff-bg-dark)] rounded-xl h-[250px] flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-3 mx-auto">
                              <FileText className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-white text-sm">Transcript View</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-3">
                      <span className="text-[var(--ff-text-muted)] text-sm">iPad Pro</span>
                    </div>
                  </div>

                  {/* Android Phone */}
                  <div className="relative">
                    <div className="bg-gradient-to-b from-gray-800 to-black rounded-3xl p-1.5 shadow-2xl">
                      <div className="bg-black rounded-[1.5rem] p-0.5">
                        <div className="bg-gradient-to-b from-[var(--ff-bg-layer)] to-[var(--ff-bg-dark)] rounded-[1.5rem] h-[250px] flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mb-3 mx-auto">
                              <Bell className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-white text-sm">Notifications</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-3">
                      <span className="text-[var(--ff-text-muted)] text-sm">Samsung Galaxy</span>
                    </div>
                  </div>

                  {/* Android Tablet */}
                  <div className="relative">
                    <div className="bg-gradient-to-b from-gray-800 to-black rounded-2xl p-1.5 shadow-2xl">
                      <div className="bg-black rounded-xl p-0.5">
                        <div className="bg-gradient-to-b from-[var(--ff-bg-layer)] to-[var(--ff-bg-dark)] rounded-xl h-[250px] flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mb-3 mx-auto">
                              <Search className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-white text-sm">Search</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-3">
                      <span className="text-[var(--ff-text-muted)] text-sm">Android Tablet</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-20 bg-gradient-to-b from-[var(--ff-bg-dark)] to-[var(--ff-bg-layer)]">
          <div className="container-ff text-center">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 mb-6">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">Bank-Level Security</span>
            </div>

            <h2 className="heading-l mb-6">Your Data is Protected</h2>
            <p className="paragraph-l max-w-2xl mx-auto mb-12">
              Enterprise-grade encryption, biometric authentication, and compliance with global privacy standards keep your meetings secure.
            </p>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">256-bit Encryption</h3>
                <p className="text-[var(--ff-text-muted)] text-sm">End-to-end encryption for all data</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Fingerprint className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">Biometric Lock</h3>
                <p className="text-[var(--ff-text-muted)] text-sm">Face ID & fingerprint protection</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">GDPR Compliant</h3>
                <p className="text-[var(--ff-text-muted)] text-sm">Meets global privacy standards</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--ff-purple-500)]/20 via-transparent to-[var(--ff-purple-600)]/20" />

          <div className="container-ff relative z-10 text-center">
            <h2 className="heading-xl mb-6 bg-gradient-to-r from-white to-[var(--ff-text-secondary)] bg-clip-text text-transparent">
              Ready to Transform Your Meetings?
            </h2>
            <p className="paragraph-l max-w-2xl mx-auto mb-10">
              Join over 500,000 professionals who trust OpenMeet to capture and analyze their most important conversations.
            </p>

            {/* Download Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <button className="group relative bg-white text-black rounded-xl px-8 py-4 font-semibold transition-all hover:scale-105">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="black">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs opacity-70">Download on the</div>
                    <div className="text-lg">App Store</div>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-2" />
                </div>
              </button>

              <button className="group relative bg-white text-black rounded-xl px-8 py-4 font-semibold transition-all hover:scale-105">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs opacity-70">Get it on</div>
                    <div className="text-lg">Google Play</div>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-2" />
                </div>
              </button>
            </div>

            {/* QR Code Option */}
            <div className="inline-flex items-center gap-4 bg-[var(--ff-bg-layer)] rounded-2xl p-6 border border-[var(--ff-border)]">
              <div className="w-32 h-32 bg-white rounded-xl p-2">
                {/* QR Code Pattern */}
                <div className="w-full h-full bg-gradient-to-br from-black via-gray-800 to-black opacity-90 rounded-lg" />
              </div>
              <div className="text-left">
                <h4 className="text-white font-semibold mb-2">Scan to Download</h4>
                <p className="text-[var(--ff-text-muted)] text-sm">
                  Point your phone camera at the QR code<br />
                  to download the OpenMeet mobile app
                </p>
              </div>
            </div>
          </div>
        </section>

        <style jsx>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }

          @keyframes float-delayed {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-15px);
            }
          }

          .animate-float {
            animation: float 3s ease-in-out infinite;
          }

          .animate-float-delayed {
            animation: float-delayed 3s ease-in-out infinite;
            animation-delay: 1s;
          }

          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }

          .bg-gradient-radial {
            background: radial-gradient(circle at center, var(--tw-gradient-from), var(--tw-gradient-to));
          }
        `}</style>
      </main>

      <Footer />
    </>
  );
}