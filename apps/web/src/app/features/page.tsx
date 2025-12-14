'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Mic, Globe, Brain, Users, Shield, Zap,
  FileText, Search, BarChart3, TrendingUp,
  MessageSquare, Video, Calendar, Lock,
  Sparkles, ChevronRight, ArrowRight,
  CheckCircle, Database, Bot, Briefcase,
  Code, Cloud, Headphones, PieChart,
  UserCheck, Settings, Layers, Share2
} from 'lucide-react';

// Feature category type
interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeatureCategory {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  features: FeatureCard[];
}

export default function FeaturesPage() {
  const featureCategories: FeatureCategory[] = [
    {
      title: 'Transcription & Recording',
      description: 'Industry-leading accuracy with real-time processing',
      icon: <Mic className="w-6 h-6" />,
      gradient: 'from-teal-500/20 to-cyan-500/20',
      features: [
        {
          icon: <Globe className="w-5 h-5 text-teal-400" />,
          title: '150+ Language Support',
          description: 'Automatic language detection with dialect recognition for global teams'
        },
        {
          icon: <Zap className="w-5 h-5 text-teal-400" />,
          title: 'Real-Time Transcription',
          description: 'Sub-100ms latency with live speaker identification and timestamps'
        },
        {
          icon: <Video className="w-5 h-5 text-teal-400" />,
          title: 'HD Video Recording',
          description: 'Record and store meetings with synchronized audio and visual content'
        }
      ]
    },
    {
      title: 'AI Intelligence',
      description: 'Turn conversations into actionable insights',
      icon: <Brain className="w-6 h-6" />,
      gradient: 'from-purple-500/20 to-indigo-500/20',
      features: [
        {
          icon: <FileText className="w-5 h-5 text-purple-400" />,
          title: 'Smart Summaries',
          description: 'GPT-4 powered meeting summaries with key decisions highlighted'
        },
        {
          icon: <CheckCircle className="w-5 h-5 text-purple-400" />,
          title: 'Action Items',
          description: 'Automatically detect and assign tasks with due dates and owners'
        },
        {
          icon: <Search className="w-5 h-5 text-purple-400" />,
          title: 'Semantic Search',
          description: 'Find exact moments using natural language queries across all meetings'
        }
      ]
    },
    {
      title: 'Revenue Intelligence',
      description: 'Accelerate deals with conversation analytics',
      icon: <TrendingUp className="w-6 h-6" />,
      gradient: 'from-emerald-500/20 to-green-500/20',
      features: [
        {
          icon: <BarChart3 className="w-5 h-5 text-emerald-400" />,
          title: 'Deal Tracking',
          description: 'Monitor deal progression and identify risks in your pipeline'
        },
        {
          icon: <PieChart className="w-5 h-5 text-emerald-400" />,
          title: 'Win/Loss Analysis',
          description: 'Understand why deals close or fall through with pattern recognition'
        },
        {
          icon: <Bot className="w-5 h-5 text-emerald-400" />,
          title: 'Predictive Scoring',
          description: 'ML-powered deal scoring based on conversation sentiment and topics'
        }
      ]
    },
    {
      title: 'Team Collaboration',
      description: 'Work together seamlessly across your organization',
      icon: <Users className="w-6 h-6" />,
      gradient: 'from-blue-500/20 to-sky-500/20',
      features: [
        {
          icon: <Share2 className="w-5 h-5 text-blue-400" />,
          title: 'Shared Notebooks',
          description: 'Organize meetings by projects with team-wide access controls'
        },
        {
          icon: <MessageSquare className="w-5 h-5 text-blue-400" />,
          title: 'Comments & Mentions',
          description: 'Collaborate on transcripts with threaded discussions and notifications'
        },
        {
          icon: <Users className="w-5 h-5 text-blue-400" />,
          title: 'Live Co-Editing',
          description: 'Edit notes together in real-time during and after meetings'
        }
      ]
    },
    {
      title: 'Integrations',
      description: 'Connect with your entire tech stack',
      icon: <Layers className="w-6 h-6" />,
      gradient: 'from-orange-500/20 to-amber-500/20',
      features: [
        {
          icon: <Database className="w-5 h-5 text-orange-400" />,
          title: 'CRM Sync',
          description: 'Auto-log meetings to Salesforce, HubSpot, and Pipedrive'
        },
        {
          icon: <MessageSquare className="w-5 h-5 text-orange-400" />,
          title: 'Slack & Teams',
          description: 'Share summaries and clips directly to your communication channels'
        },
        {
          icon: <Calendar className="w-5 h-5 text-orange-400" />,
          title: 'Calendar Integration',
          description: 'Auto-join and record meetings from Google, Outlook, and Zoom'
        }
      ]
    },
    {
      title: 'Security & Compliance',
      description: 'Enterprise-grade protection for your data',
      icon: <Shield className="w-6 h-6" />,
      gradient: 'from-red-500/20 to-pink-500/20',
      features: [
        {
          icon: <Lock className="w-5 h-5 text-red-400" />,
          title: 'SOC 2 & HIPAA',
          description: 'Certified compliance with healthcare and financial regulations'
        },
        {
          icon: <UserCheck className="w-5 h-5 text-red-400" />,
          title: 'SSO & MFA',
          description: 'Single sign-on with SAML 2.0 and multi-factor authentication'
        },
        {
          icon: <Shield className="w-5 h-5 text-red-400" />,
          title: 'GDPR Compliant',
          description: 'Full data sovereignty with EU data centers and privacy controls'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-[var(--ff-purple-500)]/20 via-transparent to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            {/* Feature count badge */}
            <div className="inline-flex items-center gap-2 bg-[var(--ff-bg-layer)]/80 border border-[var(--ff-border)] rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-[var(--ff-purple-500)]" />
              <span className="text-sm font-semibold text-white">50+ Features</span>
              <span className="text-[var(--ff-border)]">•</span>
              <span className="text-sm text-slate-400">Everything you need</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                All Features,
              </span>{' '}
              <span className="bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] bg-clip-text text-transparent">
                One Platform
              </span>
            </h1>

            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12">
              Discover the complete suite of tools that make OpenMeet the most comprehensive
              meeting intelligence platform for modern teams
            </p>

            {/* Search/Filter placeholder */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search features..."
                  className="w-full pl-12 pr-4 py-4 bg-[var(--ff-bg-layer)]/80 border border-[var(--ff-border)] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[var(--ff-purple-500)] transition-colors"
                  disabled
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Categories Grid */}
      <section className="py-24 px-4 bg-[var(--ff-bg-layer)]">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-12">
            {featureCategories.map((category, idx) => (
              <div key={idx} className="group">
                {/* Category Header */}
                <div className="flex items-start gap-4 mb-8">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.gradient} border border-white/10 flex items-center justify-center flex-shrink-0`}>
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-white mb-2">{category.title}</h2>
                    <p className="text-lg text-slate-400">{category.description}</p>
                  </div>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid md:grid-cols-3 gap-6 pl-0 md:pl-16">
                  {category.features.map((feature, featureIdx) => (
                    <div
                      key={featureIdx}
                      className="group/card relative p-6 bg-[var(--ff-bg-dark)]/50 border border-[var(--ff-border)] rounded-xl hover:border-[var(--ff-purple-500)]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--ff-purple-500)]/10"
                    >
                      {/* Feature Icon */}
                      <div className="mb-4">
                        {feature.icon}
                      </div>

                      {/* Feature Content */}
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover/card:text-[var(--ff-purple-500)] transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-400 mb-4">
                        {feature.description}
                      </p>

                      {/* Learn more link */}
                      <button className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ff-purple-500)] hover:text-[var(--ff-purple-600)] transition-colors">
                        Learn more
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="py-24 px-4 bg-[var(--ff-bg-dark)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Plus Everything Else You Need
            </h2>
            <p className="text-xl text-slate-400">
              Additional features that make your workflow complete
            </p>
          </div>

          {/* Quick Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { icon: <Code className="w-5 h-5" />, name: 'API Access' },
              { icon: <Headphones className="w-5 h-5" />, name: 'Priority Support' },
              { icon: <Cloud className="w-5 h-5" />, name: 'Cloud Storage' },
              { icon: <Settings className="w-5 h-5" />, name: 'Custom Workflows' },
              { icon: <Briefcase className="w-5 h-5" />, name: 'Business Analytics' },
              { icon: <Lock className="w-5 h-5" />, name: 'Data Encryption' },
              { icon: <Users className="w-5 h-5" />, name: 'Team Management' },
              { icon: <Database className="w-5 h-5" />, name: 'Data Export' }
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--ff-bg-layer)]/50 border border-[var(--ff-border)] rounded-lg hover:border-[var(--ff-purple-500)]/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="text-slate-500 group-hover:text-[var(--ff-purple-500)] transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-sm font-medium text-white">{item.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="py-32 px-4 bg-gradient-to-b from-[var(--ff-bg-layer)] to-[var(--ff-bg-dark)] relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-t from-[var(--ff-purple-500)]/10 via-transparent to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Ready to transform your meetings?
          </h2>
          <p className="text-xl text-slate-400 mb-12">
            Join 800,000+ companies using AI-powered meeting intelligence.
            Start with 1,000 free minutes today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="px-8 py-4 bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[var(--ff-purple-500)]/25 transition-all duration-300 flex items-center gap-2">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] text-white font-semibold rounded-xl hover:border-[var(--ff-purple-500)]/50 transition-colors">
              Schedule Demo
            </button>
          </div>

          <p className="text-sm text-slate-500 mt-8">
            No credit card required • Setup in 2 minutes • Cancel anytime
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}