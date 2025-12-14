'use client';

import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Star, Shield, CheckCircle2, Mic, Globe, Users, Zap, FileText, Brain, BarChart3, TrendingUp, Search, Lock, Sparkles, ChevronRight, ArrowRight, Calendar, CheckCircle } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#000211]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--ff-bg-dark)] via-[#0a0518] to-[var(--ff-bg-dark)]"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--ff-purple-500)]/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--ff-purple-600)]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]"></div>

          {/* Particle Effects */}
          <div className="absolute inset-0 opacity-20">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${15 + Math.random() * 10}s`
                }}
              />
            ))}
          </div>
        </div>

        <div className="container-ff relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            {/* Trust Badges Row */}
            <div className="flex flex-wrap justify-center items-center gap-4 mb-8">
              {/* Self-Hosted Badge - Key Differentiator */}
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-sm border border-emerald-500/30 rounded-full px-4 py-2 hover:border-emerald-400/50 transition-all">
                <Lock size={14} className="text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">Self-Hosted Available</span>
              </div>

              {/* SOC 2 Badge */}
              <div className="inline-flex items-center gap-2 bg-[var(--ff-bg-layer)]/80 backdrop-blur-sm border border-[var(--ff-border)] rounded-full px-4 py-2 hover:border-[var(--ff-purple-500)]/50 transition-all">
                <Shield size={14} className="text-[var(--ff-purple-500)]" />
                <span className="text-sm font-medium text-[var(--ff-text-secondary)]">SOC 2 & HIPAA Ready</span>
              </div>

              {/* Multi-AI Badge */}
              <div className="inline-flex items-center gap-2 bg-[var(--ff-bg-layer)]/80 backdrop-blur-sm border border-[var(--ff-border)] rounded-full px-4 py-2 hover:border-[var(--ff-purple-500)]/50 transition-all">
                <Brain size={14} className="text-cyan-400" />
                <span className="text-sm font-medium text-[var(--ff-text-secondary)]">Multi-Provider AI</span>
              </div>
            </div>

            {/* Main Headline with Gradient */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-[var(--ff-text-primary)]">Enterprise Meeting Intelligence</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-[var(--ff-purple-500)] to-cyan-400 bg-clip-text text-transparent animate-gradient">
                Your Infrastructure. Your Data.
              </span>
            </h1>

            <p className="text-xl text-[var(--ff-text-secondary)] mb-10 max-w-3xl mx-auto">
              The only AI meeting platform that deploys <span className="text-emerald-400 font-semibold">on your infrastructure</span>.
              Transcribe, analyze, and coach with <span className="text-[var(--ff-text-primary)] font-semibold">complete data sovereignty</span>.
              Built for healthcare, legal, finance, and security-conscious enterprises.
            </p>

            {/* Dual CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/demo"
                className="group relative inline-flex items-center justify-center px-8 py-4 font-semibold text-white bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] rounded-xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(122,90,248,0.3)]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Request Demo
                  <Sparkles className="w-5 h-5" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--ff-purple-600)] to-[var(--ff-purple-500)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>

              <Link
                href="/self-hosted"
                className="group inline-flex items-center justify-center px-8 py-4 font-semibold text-emerald-400 bg-emerald-500/10 backdrop-blur-sm border-2 border-emerald-500/30 rounded-xl transition-all hover:border-emerald-400 hover:bg-emerald-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Self-Hosted Deployment
                </span>
              </Link>
            </div>

            {/* Trust Indicators - Privacy Focused */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-16">
              <p className="text-sm text-[var(--ff-text-muted)] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                GDPR Compliant
              </p>
              <span className="text-[var(--ff-border)] hidden sm:inline">•</span>
              <p className="text-sm text-[var(--ff-text-muted)] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                HIPAA Ready
              </p>
              <span className="text-[var(--ff-border)] hidden sm:inline">•</span>
              <p className="text-sm text-[var(--ff-text-muted)] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                No Data Leaves Your Network
              </p>
            </div>
          </div>

          {/* Animated Product Preview with Live Transcription Demo */}
          <div className="mt-16 max-w-6xl mx-auto relative">
            {/* Floating Feature Badges */}
            <div className="hidden lg:block">
              <div className="absolute -left-20 top-20 bg-[var(--ff-bg-layer)]/90 backdrop-blur-sm border border-[var(--ff-border)] rounded-2xl p-4 animate-float-slow shadow-xl">
                <div className="flex items-center gap-3">
                  <Mic className="w-6 h-6 text-[var(--ff-purple-500)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--ff-text-primary)]">Live Transcription</p>
                    <p className="text-xs text-[var(--ff-text-muted)]">98% accuracy</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-20 top-40 bg-[var(--ff-bg-layer)]/90 backdrop-blur-sm border border-[var(--ff-border)] rounded-2xl p-4 animate-float-slow" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-3">
                  <Globe className="w-6 h-6 text-[var(--ff-purple-500)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--ff-text-primary)]">150+ Languages</p>
                    <p className="text-xs text-[var(--ff-text-muted)]">With dialects</p>
                  </div>
                </div>
              </div>

              <div className="absolute -left-16 bottom-20 bg-[var(--ff-bg-layer)]/90 backdrop-blur-sm border border-[var(--ff-border)] rounded-2xl p-4 animate-float-slow" style={{ animationDelay: '4s' }}>
                <div className="flex items-center gap-3">
                  <Brain className="w-6 h-6 text-[var(--ff-purple-500)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--ff-text-primary)]">AI Summaries</p>
                    <p className="text-xs text-[var(--ff-text-muted)]">In seconds</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Product Preview */}
            <div className="relative rounded-2xl overflow-hidden border border-[var(--ff-border)] bg-gradient-to-br from-[var(--ff-bg-layer)] to-[#0a0a1a]/50 shadow-2xl hover:shadow-[0_20px_60px_rgba(122,90,248,0.2)] transition-all group">
              {/* Live Transcription Demo */}
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] flex items-center justify-center animate-pulse">
                    <Mic className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--ff-text-muted)]">Live Meeting</p>
                    <p className="font-semibold text-[var(--ff-text-primary)]">Product Strategy Discussion</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-red-400 font-medium">RECORDING</span>
                  </div>
                </div>

                {/* Animated Transcription Lines */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 opacity-0 animate-fade-in-up">
                    <img src="https://ui-avatars.com/api/?name=Sarah&background=7a5af8&color=fff&size=32" alt="Sarah" className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--ff-text-primary)] mb-1">Sarah Chen</p>
                      <p className="text-sm text-[var(--ff-text-secondary)]">Let's discuss the Q1 product roadmap and prioritize features based on customer feedback...</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-0 animate-fade-in-up" style={{ animationDelay: '1s' }}>
                    <img src="https://ui-avatars.com/api/?name=Mike&background=6938ef&color=fff&size=32" alt="Mike" className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--ff-text-primary)] mb-1">Mike Rodriguez</p>
                      <p className="text-sm text-[var(--ff-text-secondary)]">I agree. Based on our analytics, the mobile experience should be our top priority...</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-0 animate-fade-in-up" style={{ animationDelay: '2s' }}>
                    <img src="https://ui-avatars.com/api/?name=Emma&background=9945ff&color=fff&size=32" alt="Emma" className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--ff-text-primary)] mb-1">Emma Johnson</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-[var(--ff-text-secondary)]">Great point! We should also consider...</p>
                        <span className="text-xs text-[var(--ff-purple-500)] animate-pulse">typing...</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Insights Panel */}
                <div className="mt-6 p-4 bg-gradient-to-r from-[var(--ff-purple-500)]/10 to-[var(--ff-purple-600)]/10 border border-[var(--ff-purple-500)]/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-[var(--ff-purple-500)]" />
                    <p className="text-xs font-semibold text-[var(--ff-purple-500)] uppercase tracking-wider">AI Insights</p>
                  </div>
                  <p className="text-sm text-[var(--ff-text-secondary)]">
                    Key topics: Product roadmap, Mobile UX, Customer feedback • Sentiment: Positive • Action items detected: 3
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Target Industries Section */}
          <div className="mt-20">
            <p className="text-center text-sm text-[var(--ff-text-muted)] mb-8 uppercase tracking-wider">
              Built for privacy-sensitive industries
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {[
                { name: 'Healthcare', icon: '🏥' },
                { name: 'Legal', icon: '⚖️' },
                { name: 'Financial Services', icon: '🏦' },
                { name: 'Government', icon: '🏛️' },
                { name: 'Defense', icon: '🔒' },
                { name: 'Enterprise', icon: '🏢' }
              ].map((industry, i) => (
                <div
                  key={industry.name}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--ff-bg-layer)]/50 border border-[var(--ff-border)] rounded-full text-sm text-[var(--ff-text-secondary)] hover:border-[var(--ff-purple-500)]/50 hover:text-[var(--ff-text-primary)] transition-all animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <span>{industry.icon}</span>
                  <span>{industry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add custom animations to head */}
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); }
            33% { transform: translateY(-20px) translateX(10px); }
            66% { transform: translateY(10px) translateX(-10px); }
          }

          @keyframes float-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          @keyframes gradient {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }

          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .animate-float {
            animation: float 20s ease-in-out infinite;
          }

          .animate-float-slow {
            animation: float-slow 6s ease-in-out infinite;
          }

          .animate-gradient {
            background-size: 200% 200%;
            animation: gradient 3s ease infinite;
          }

          .animate-fade-in-up {
            animation: fade-in-up 0.8s ease-out forwards;
          }

          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }

          .animate-counter {
            display: inline-block;
          }
        `}</style>
      </section>

      {/* Bento Grid Features */}
      <section className="py-24 px-4 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              More Than Just Transcription
            </h2>
            <p className="text-xl text-slate-400">
              Built on multi-model ensemble architecture for unmatched accuracy
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Feature Card - Spans 2 columns */}
            <CardGlass
              variant="elevated"
              hover
              className="md:col-span-2 p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">
                  150+ Languages with Dialect Support
                </h3>
              </div>
              <p className="text-slate-400 mb-6">
                Our Whisper + DeepSpeech ensemble detects accents automatically.
                From French Canadian to Brazilian Portuguese, we catch every nuance.
              </p>
              <div className="flex flex-wrap gap-2">
                {['English', 'Spanish', 'Mandarin', 'German', 'Hindi', 'Arabic', 'French'].map(lang => (
                  <span key={lang} className="px-3 py-1 bg-slate-800/50 border border-white/10 rounded-full text-sm text-slate-300">
                    {lang}
                  </span>
                ))}
                <span className="px-3 py-1 bg-teal-500/20 border border-teal-500/30 rounded-full text-sm text-teal-300 font-semibold">
                  +143 more
                </span>
              </div>
            </CardGlass>

            {/* Tall Feature Card - Right side */}
            <CardGlass
              variant="default"
              hover
              className="md:row-span-2 p-8 bg-gradient-to-br from-slate-900/50 to-slate-800/30 relative overflow-hidden"
            >
              {/* Glow effect */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>

              <div className="relative z-10">
                <Zap className="w-10 h-10 text-teal-400 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">
                  Real-Time Processing
                </h3>
                <p className="text-slate-400 mb-8">
                  &lt;100ms latency using WebRTC and WebSocket architecture.
                  See the transcript appear as you speak.
                </p>

                {/* Live metrics */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-sm text-slate-400">Processing Time</span>
                    <span className="text-lg font-mono font-bold text-emerald-400">0.08s</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-sm text-slate-400">Accuracy</span>
                    <span className="text-lg font-mono font-bold text-emerald-400">98.2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Concurrent Users</span>
                    <span className="text-lg font-mono font-bold text-cyan-400">100K+</span>
                  </div>
                </div>
              </div>
            </CardGlass>

            {/* Bottom Feature Cards */}
            <CardGlass variant="default" hover className="p-8">
              <BarChart3 className="w-10 h-10 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Predictive Deal Scoring
              </h3>
              <p className="text-sm text-slate-400">
                ML models analyze sentiment and topic evolution to predict deal success probability in real-time.
              </p>
            </CardGlass>

            <CardGlass variant="default" hover className="p-8">
              <Search className="w-10 h-10 text-amber-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Semantic Search
              </h3>
              <p className="text-sm text-slate-400">
                Don't just search keywords. Ask "What was the budget decision?" and get the exact moment.
              </p>
            </CardGlass>
          </div>
        </div>
      </section>

      {/* Conversation Intelligence */}
      <section className="py-19 px-4 bg-[#0a0a1a]">
        <div className="container-ff">
          <div className="text-center mb-12">
            <h2 className="heading-l text-white mb-3">Conversation Intelligence</h2>
            <p className="paragraph-l text-[#cbd5e1]">Analyze talk-time, sentiment, and topics</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <SmallCard
              icon={<BarChart3 className="text-[#7a5af8] w-8 h-8 mb-3" />}
              title="Speaker Analytics"
              description="Track talk-time and participation rates"
            />
            <SmallCard
              icon={<TrendingUp className="text-[#7a5af8] w-8 h-8 mb-3" />}
              title="Sentiment Analysis"
              description="Understand meeting tone and engagement"
            />
            <SmallCard
              icon={<Search className="text-[#7a5af8] w-8 h-8 mb-3" />}
              title="Topic Tracking"
              description="Monitor key discussion points"
            />
          </div>
        </div>
      </section>

      {/* Comparison Table - Key Differentiators */}
      <section className="py-24 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4">
              Why OpenMeet
            </p>
            <h2 className="text-4xl font-bold text-white mb-4">
              The Only Self-Hosted Meeting Intelligence
            </h2>
            <p className="text-xl text-slate-400">
              What our competitors can't offer: complete data sovereignty
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800">
                  <th className="py-6 px-6 text-left text-slate-400 font-medium text-sm uppercase tracking-wider">
                    Capability
                  </th>
                  <th className="py-6 px-6 text-center bg-gradient-to-b from-emerald-500/10 to-transparent">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg">
                      <Lock className="w-4 h-4" />
                      <span className="font-bold text-white">OpenMeet</span>
                    </div>
                  </th>
                  <th className="py-6 px-6 text-center text-slate-500 font-medium">
                    Gong
                  </th>
                  <th className="py-6 px-6 text-center text-slate-500 font-medium">
                    Otter.ai
                  </th>
                  <th className="py-6 px-6 text-center text-slate-500 font-medium">
                    Competitor
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: 'Self-Hosted Deployment',
                    us: '✓ Full Control',
                    gong: '✗ SaaS Only',
                    otter: '✗ SaaS Only',
                    competitor: '✗ SaaS Only',  // competitor
                    highlight: true,
                    unique: true
                  },
                  {
                    feature: 'Data Residency Control',
                    us: '✓ Your Infrastructure',
                    gong: '✗ Their Cloud',
                    otter: '✗ Their Cloud',
                    competitor: '✗ Their Cloud',  // competitor
                    highlight: true,
                    unique: true
                  },
                  {
                    feature: 'Multi-Provider AI',
                    us: '✓ OpenAI, Anthropic, Local',
                    gong: '✗ Locked Vendor',
                    otter: '✗ Locked Vendor',
                    competitor: '✗ Locked Vendor',  // competitor
                    highlight: true,
                    unique: true
                  },
                  {
                    feature: 'White-Label/OEM',
                    us: '✓ Full Rebrand',
                    gong: '✗ Not Available',
                    otter: '✗ Not Available',
                    competitor: '✗ Not Available',  // competitor
                    highlight: true,
                    unique: true
                  },
                  {
                    feature: 'HIPAA Compliance',
                    us: '✓ BAA Available',
                    gong: '✓ Enterprise Only',
                    otter: '✓ Business+',
                    competitor: '✓ Enterprise',  // competitor
                    highlight: false
                  },
                  {
                    feature: 'Revenue Intelligence',
                    us: '✓ Full Suite',
                    gong: '✓ Market Leader',
                    otter: '✗ Basic',
                    competitor: '◐ Partial',  // competitor
                    highlight: false
                  },
                  {
                    feature: 'Enterprise SSO/SCIM',
                    us: '✓ Included',
                    gong: '✓ Enterprise',
                    otter: '✓ Enterprise',
                    competitor: '✓ Enterprise',  // competitor
                    highlight: false
                  },
                  {
                    feature: 'Typical Cost',
                    us: '$29/user/mo',
                    gong: '$150+/user/mo',
                    otter: '$30/user/mo',
                    competitor: '$19/user/mo',  // competitor
                    highlight: false
                  },
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      "border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors",
                      row.unique && "bg-emerald-500/5"
                    )}
                  >
                    <td className="py-5 px-6 font-medium text-white flex items-center gap-2">
                      {row.feature}
                      {row.unique && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 rounded-full">UNIQUE</span>
                      )}
                    </td>
                    <td className={cn(
                      "py-5 px-6 text-center font-bold bg-emerald-500/5",
                      row.highlight ? "text-emerald-400" : "text-white"
                    )}>
                      {row.us}
                    </td>
                    <td className="py-5 px-6 text-center text-slate-400">
                      {row.gong}
                    </td>
                    <td className="py-5 px-6 text-center text-slate-500">
                      {row.otter}
                    </td>
                    <td className="py-5 px-6 text-center text-slate-500">
                      {row.competitor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center">
            <Button variant="gradient-primary" size="lg">
              See Full Comparison
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Elevated Pricing Section */}
      <section className="py-24 px-4 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Enterprise Power, Startup Pricing
            </h2>
            <p className="text-xl text-slate-400">
              Save up to 30% compared to competitors. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 lg:gap-8">
            {/* Free Tier */}
            <CardGlass variant="subtle" className="p-8">
              <h3 className="text-lg font-semibold text-white mb-2">Free</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-white">$0</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                For individuals getting started
              </p>
              <Button variant="ghost-glass" className="w-full mb-8">
                Get Started
              </Button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  1,000 mins/mo
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  5 users max
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Basic AI summaries
                </li>
              </ul>
            </CardGlass>

            {/* Pro Tier */}
            <CardGlass variant="default" className="p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full text-xs font-bold text-white">
                BEST VALUE
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Pro</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">$8</span>
                <span className="text-slate-400">/user/mo</span>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                Perfect for small teams
              </p>
              <Button variant="gradient-primary" className="w-full mb-8">
                Start Free Trial
              </Button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Unlimited minutes
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  AI action items
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  CRM integrations
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Video recording
                </li>
              </ul>
            </CardGlass>

            {/* Business Tier - Elevated */}
            <CardGlass
              variant="elevated"
              gradient
              className="p-8 md:-translate-y-4 relative border-teal-500/50"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full text-xs font-bold text-white flex items-center gap-1">
                <Star className="w-3 h-3 fill-white" />
                POPULAR
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Business</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-white">$15</span>
                <span className="text-slate-400">/user/mo</span>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                For growing organizations
              </p>
              <Button variant="gradient-primary" size="lg" className="w-full mb-8">
                Get Started
              </Button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2 text-white">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
                  Everything in Pro
                </li>
                <li className="flex items-start gap-2 text-white">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
                  Speaker analytics
                </li>
                <li className="flex items-start gap-2 text-white">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
                  API access
                </li>
                <li className="flex items-start gap-2 text-white">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
                  Priority support
                </li>
                <li className="flex items-start gap-2 text-white">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
                  Custom retention
                </li>
              </ul>
            </CardGlass>

            {/* Enterprise Tier */}
            <CardGlass variant="subtle" className="p-8">
              <h3 className="text-lg font-semibold text-white mb-2">Enterprise</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-white">$29</span>
                <span className="text-slate-400">/user/mo</span>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                Security & control
              </p>
              <Button variant="ghost-glass" className="w-full mb-8">
                Contact Sales
              </Button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  SSO & MFA
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Dedicated CSM
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  HIPAA / SOC2
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Custom SLAs
                </li>
              </ul>
            </CardGlass>
          </div>
        </div>
      </section>

      {/* Trust & Compliance */}
      <section className="py-24 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-4">
              Bank-Grade Security
            </p>
            <h2 className="text-4xl font-bold text-white mb-4">
              Compliance Built Into Our DNA
            </h2>
            <p className="text-xl text-slate-400">
              Trusted by Fortune 500 companies and healthcare organizations
            </p>
          </div>

          {/* Compliance Badges */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-16">
            {[
              { name: 'SOC 2 Type II', icon: Shield },
              { name: 'HIPAA', icon: Lock },
              { name: 'GDPR', icon: Shield },
              { name: 'ISO 27001', icon: Lock },
              { name: 'CCPA', icon: Shield },
              { name: 'FedRAMP Ready', icon: Lock },
            ].map((badge) => (
              <CardGlass
                key={badge.name}
                variant="default"
                hover
                className="p-6 text-center group"
              >
                <badge.icon className="w-10 h-10 text-slate-400 group-hover:text-teal-400 transition-colors mx-auto mb-3" />
                <h4 className="font-bold text-white text-sm">{badge.name}</h4>
              </CardGlass>
            ))}
          </div>

          {/* Enterprise CTA Card */}
          <CardGlass
            variant="elevated"
            gradient
            className="p-12 relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="text-center lg:text-left">
                <h3 className="text-3xl font-bold text-white mb-3">
                  Ready for Private Cloud Deployment?
                </h3>
                <p className="text-lg text-slate-300 max-w-2xl">
                  We offer on-premise and private VPC deployments for regulated industries.
                  Complete data sovereignty with zero external dependencies.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button variant="gradient-primary" size="lg">
                  Talk to Solutions Team
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </CardGlass>
        </div>
      </section>
      {/* Testimonial */}
      <section className="py-19 px-4 bg-[#0a0a1a]">
        <div className="container-ff max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={20} className="fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <blockquote className="heading-m text-white font-normal italic mb-6">
            "OpenMeet has transformed how our team handles meetings. We save hours every week and never miss important details."
          </blockquote>
          <p className="paragraph-m text-[#94a3b8]">
            — Sarah Chen, VP of Sales at TechCorp
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-4 bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Transform Your Meetings Today
          </h2>
          <p className="text-xl text-slate-300 mb-12">
            Join 800,000+ companies using AI-powered meeting intelligence.
            Start free, upgrade anytime.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button variant="gradient-primary" size="xl">
              Start Free Trial
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="glassmorphism" size="xl">
              Schedule Demo
              <Calendar className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <p className="text-sm text-slate-400">
            No credit card required · 1,000 free minutes · Cancel anytime
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function LargeFeatureCard({
  icon,
  title,
  description,
  features
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="card-ff">
      {icon}
      <h3 className="heading-m text-white mb-3">{title}</h3>
      <p className="paragraph-m text-[#cbd5e1] mb-4">{description}</p>
      <ul className="space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <CheckCircle2 className="text-green-400 w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="paragraph-s text-[#cbd5e1]">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SmallCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="card-ff">
      {icon}
      <h3 className="heading-s text-white mb-2">{title}</h3>
      <p className="paragraph-s text-[#94a3b8]">{description}</p>
    </div>
  );
}

function SecurityBadge({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="text-center">
      <div className="card-ff">
        <div className="text-[#7a5af8] w-10 h-10 mx-auto mb-3">
          {icon}
        </div>
        <h4 className="paragraph-m text-white font-semibold">{title}</h4>
      </div>
    </div>
  );
}
