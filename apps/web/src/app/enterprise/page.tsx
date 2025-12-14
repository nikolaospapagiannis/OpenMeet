'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Shield,
  Lock,
  Building2,
  Globe,
  Users,
  Zap,
  Server,
  HeadphonesIcon,
  Brain,
  CheckCircle,
  Star,
  ChevronRight,
  ArrowRight,
  Calendar,
  Phone,
  Mail,
  MapPin,
  BarChart3,
  TrendingUp,
  Clock,
  Award,
  Database,
  CloudLightning,
  Cpu,
  UserCheck,
  FileCheck,
  ShieldCheck,
  Sparkles,
  X,
  Check,
  Minus
} from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';

// Enterprise logos data
const enterpriseLogos = [
  { name: 'Microsoft', opacity: 0.6 },
  { name: 'Google', opacity: 0.6 },
  { name: 'Amazon', opacity: 0.6 },
  { name: 'Oracle', opacity: 0.6 },
  { name: 'Salesforce', opacity: 0.6 },
  { name: 'IBM', opacity: 0.6 },
];

// Compliance badges data
const complianceBadges = [
  { name: 'SOC 2 Type II', icon: ShieldCheck, certified: true },
  { name: 'HIPAA', icon: FileCheck, certified: true },
  { name: 'GDPR', icon: Shield, certified: true },
  { name: 'FedRAMP', icon: Award, inProgress: true },
  { name: 'ISO 27001', icon: Lock, certified: true },
  { name: 'CCPA', icon: UserCheck, certified: true },
];

// Case studies data
const caseStudies = [
  {
    company: 'Global Finance Corp',
    industry: 'Financial Services',
    size: '50,000+ employees',
    logo: Building2,
    results: {
      timeSaved: '40%',
      dealVelocity: '25%',
      compliance: '100%',
    },
    quote: 'OpenMeet transformed our sales operations with enterprise-grade security.',
  },
  {
    company: 'HealthTech Solutions',
    industry: 'Healthcare',
    size: '15,000+ employees',
    logo: Building2,
    results: {
      timeSaved: '35%',
      dealVelocity: '30%',
      compliance: '100%',
    },
    quote: 'HIPAA-compliant meeting intelligence at scale.',
  },
  {
    company: 'Retail Giant Inc',
    industry: 'E-commerce',
    size: '100,000+ employees',
    logo: Building2,
    results: {
      timeSaved: '45%',
      dealVelocity: '35%',
      compliance: '100%',
    },
    quote: 'Scalability that grows with our global operations.',
  },
];

export default function EnterprisePage() {
  const [teamSize, setTeamSize] = useState(100);
  const [showContactForm, setShowContactForm] = useState(false);

  // Calculate ROI
  const hoursPerWeek = teamSize * 5; // Average 5 hours saved per person
  const hourlyRate = 75; // Average hourly rate
  const weeklySavings = hoursPerWeek * hourlyRate;
  const annualSavings = weeklySavings * 52;

  return (
    <div className="min-h-screen bg-[#000211]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#7a5af8]/20 via-transparent to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="container max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-[#0a0a1a]/60 border border-[#7a5af8]/30 rounded-full px-4 py-2 mb-6">
              <Shield className="w-4 h-4 text-[#7a5af8]" />
              <span className="text-sm font-medium text-white">Enterprise Ready</span>
              <span className="text-[#1e293b]">•</span>
              <span className="text-sm text-[#cbd5e1]">SOC 2 Type II Certified</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              Built for{' '}
              <span className="bg-gradient-to-r from-[#7a5af8] to-cyan-500 bg-clip-text text-transparent">
                Enterprise Scale
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-[#cbd5e1] mb-8 max-w-3xl mx-auto">
              Trusted by Fortune 500 companies to power their conversation intelligence at scale
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button variant="gradient-primary" size="xl" onClick={() => setShowContactForm(true)}>
                Talk to Sales Team
                <Phone className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="glassmorphism" size="xl">
                Request Security Docs
                <FileCheck className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Customer logos */}
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
              {enterpriseLogos.map((logo) => (
                <div key={logo.name} className="text-[#cbd5e1]">
                  <Building2 className="w-12 h-12" />
                  <span className="text-xs mt-2 block">{logo.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Features Grid */}
      <section className="py-24 px-4 bg-slate-950">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Enterprise-Grade Features
            </h2>
            <p className="text-xl text-slate-400">
              Security, compliance, and scalability without compromise
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Advanced Security */}
            <CardGlass variant="elevated" hover className="p-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7a5af8]/20 to-purple-500/20 border border-[#7a5af8]/30 flex items-center justify-center mb-6">
                <Lock className="w-6 h-6 text-[#7a5af8]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Advanced Security</h3>
              <p className="text-slate-400 mb-6">
                Bank-grade security with multiple layers of protection
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  SSO/SAML 2.0 Integration
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Multi-Factor Authentication
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Role-Based Access Control
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  AES-256 Encryption
                </li>
              </ul>
            </CardGlass>

            {/* Compliance */}
            <CardGlass variant="elevated" hover className="p-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Compliance</h3>
              <p className="text-slate-400 mb-6">
                Meet regulatory requirements across industries
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  SOC 2 Type II Certified
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  HIPAA Compliant
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  GDPR Ready
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  FedRAMP (In Progress)
                </li>
              </ul>
            </CardGlass>

            {/* Scalability */}
            <CardGlass variant="elevated" hover className="p-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Unlimited Scale</h3>
              <p className="text-slate-400 mb-6">
                Built to handle your entire organization
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  100K+ concurrent users
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  99.99% uptime SLA
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Global CDN distribution
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Auto-scaling infrastructure
                </li>
              </ul>
            </CardGlass>

            {/* Custom Deployment */}
            <CardGlass variant="elevated" hover className="p-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-6">
                <Server className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Custom Deployment</h3>
              <p className="text-slate-400 mb-6">
                Deploy anywhere, your way
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Private cloud options
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  On-premise deployment
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Air-gapped environments
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Hybrid cloud support
                </li>
              </ul>
            </CardGlass>

            {/* Dedicated Support */}
            <CardGlass variant="elevated" hover className="p-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center mb-6">
                <HeadphonesIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Dedicated Support</h3>
              <p className="text-slate-400 mb-6">
                White-glove service for your team
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  24/7 enterprise support
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Dedicated CSM
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Priority ticket resolution
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Custom onboarding
                </li>
              </ul>
            </CardGlass>

            {/* Custom AI */}
            <CardGlass variant="elevated" hover className="p-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Custom AI Models</h3>
              <p className="text-slate-400 mb-6">
                AI tailored to your industry
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Fine-tuned models
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Industry-specific training
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Custom terminology
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Private model hosting
                </li>
              </ul>
            </CardGlass>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-24 px-4 bg-[#0a0a1a]">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Calculate Your ROI
            </h2>
            <p className="text-xl text-slate-400">
              See how much time and money you can save with OpenMeet
            </p>
          </div>

          <CardGlass variant="elevated" gradient className="p-8 lg:p-12">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Input Side */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">Your Team</h3>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-slate-300 block mb-2">
                      Team Size
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      value={teamSize}
                      onChange={(e) => setTeamSize(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #7a5af8 0%, #7a5af8 ${(teamSize / 1000) * 100}%, #475569 ${(teamSize / 1000) * 100}%, #475569 100%)`
                      }}
                    />
                    <div className="flex justify-between text-sm text-slate-400 mt-2">
                      <span>10</span>
                      <span className="text-xl font-bold text-white">{teamSize} users</span>
                      <span>1000+</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-1">Avg. Hours Saved/Week</p>
                      <p className="text-2xl font-bold text-white">5 hrs</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-1">Hourly Rate</p>
                      <p className="text-2xl font-bold text-white">$75</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Side */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">Your Savings</h3>

                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-[#7a5af8]/20 to-cyan-500/20 border border-[#7a5af8]/30 rounded-xl p-6">
                    <p className="text-sm text-slate-300 mb-2">Annual Savings</p>
                    <p className="text-4xl font-bold bg-gradient-to-r from-[#7a5af8] to-cyan-500 bg-clip-text text-transparent">
                      ${annualSavings.toLocaleString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-1">Weekly Savings</p>
                      <p className="text-xl font-bold text-emerald-400">${weeklySavings.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-1">Hours Saved/Year</p>
                      <p className="text-xl font-bold text-cyan-400">{(hoursPerWeek * 52).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button variant="gradient-primary" className="w-full" size="lg">
                      Get Custom ROI Report
                      <BarChart3 className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardGlass>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-24 px-4 bg-slate-950">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Enterprise Success Stories
            </h2>
            <p className="text-xl text-slate-400">
              See how leading companies transform with OpenMeet
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {caseStudies.map((study, idx) => (
              <CardGlass key={idx} variant="elevated" hover className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center">
                    <study.logo className="w-6 h-6 text-[#7a5af8]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{study.company}</h3>
                    <p className="text-sm text-slate-400">{study.industry}</p>
                  </div>
                </div>

                <blockquote className="text-slate-300 italic mb-6">
                  "{study.quote}"
                </blockquote>

                <div className="space-y-3 pt-6 border-t border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Time Saved</span>
                    <span className="text-sm font-bold text-emerald-400">{study.results.timeSaved}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Deal Velocity</span>
                    <span className="text-sm font-bold text-cyan-400">+{study.results.dealVelocity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Compliance</span>
                    <span className="text-sm font-bold text-[#7a5af8]">{study.results.compliance}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-500 mt-6">{study.size}</p>
              </CardGlass>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-4 bg-slate-900/50">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Why Enterprises Choose OpenMeet
            </h2>
            <p className="text-xl text-slate-400">
              More features, better security, lower cost
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800">
                  <th className="py-6 px-6 text-left text-slate-400 font-medium text-sm uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="py-6 px-6 text-center bg-gradient-to-b from-[#7a5af8]/10 to-transparent">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7a5af8] to-cyan-600 rounded-lg">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-bold text-white">OpenMeet</span>
                    </div>
                  </th>
                  <th className="py-6 px-6 text-center text-slate-500 font-medium">
                    Gong
                  </th>
                  <th className="py-6 px-6 text-center text-slate-500 font-medium">
                    Chorus
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: 'Starting Price',
                    us: '$29/user/mo',
                    gong: '$100+/user/mo',
                    chorus: '$80+/user/mo',
                    highlight: true
                  },
                  {
                    feature: 'Deployment Options',
                    us: 'Cloud, On-Prem, Hybrid',
                    gong: 'Cloud Only',
                    chorus: 'Cloud Only',
                    highlight: true
                  },
                  {
                    feature: 'Security Certifications',
                    us: 'SOC2, HIPAA, GDPR',
                    gong: 'SOC2',
                    chorus: 'SOC2',
                    highlight: false
                  },
                  {
                    feature: 'Custom AI Models',
                    us: <Check className="w-5 h-5 text-emerald-400 mx-auto" />,
                    gong: <X className="w-5 h-5 text-red-400 mx-auto" />,
                    chorus: <X className="w-5 h-5 text-red-400 mx-auto" />,
                    highlight: true
                  },
                  {
                    feature: 'API Access',
                    us: 'Full GraphQL + REST',
                    gong: 'Limited REST',
                    chorus: 'Limited REST',
                    highlight: false
                  },
                  {
                    feature: '24/7 Support',
                    us: <Check className="w-5 h-5 text-emerald-400 mx-auto" />,
                    gong: <Minus className="w-5 h-5 text-amber-400 mx-auto" />,
                    chorus: <Minus className="w-5 h-5 text-amber-400 mx-auto" />,
                    highlight: false
                  },
                  {
                    feature: 'Data Residency Options',
                    us: 'Global (15 regions)',
                    gong: 'US Only',
                    chorus: 'US + EU',
                    highlight: true
                  },
                  {
                    feature: 'Contract Length',
                    us: 'Monthly Available',
                    gong: 'Annual Only',
                    chorus: 'Annual Only',
                    highlight: true
                  },
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-5 px-6 font-medium text-white">
                      {row.feature}
                    </td>
                    <td className={cn(
                      "py-5 px-6 text-center font-bold bg-[#7a5af8]/5",
                      row.highlight ? "text-[#7a5af8]" : "text-white"
                    )}>
                      {row.us}
                    </td>
                    <td className="py-5 px-6 text-center text-slate-400">
                      {row.gong}
                    </td>
                    <td className="py-5 px-6 text-center text-slate-400">
                      {row.chorus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center">
            <Button variant="ghost-glass" size="lg">
              Download Full Comparison
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Compliance & Security */}
      <section className="py-24 px-4 bg-[#0a0a1a]">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-[#7a5af8] uppercase tracking-wider mb-4">
              Trusted by Regulated Industries
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Compliance & Security First
            </h2>
            <p className="text-xl text-slate-400">
              Meet the strictest regulatory requirements
            </p>
          </div>

          {/* Compliance badges grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-16">
            {complianceBadges.map((badge) => (
              <CardGlass
                key={badge.name}
                variant="subtle"
                hover
                className="p-6 text-center relative group"
              >
                {badge.inProgress && (
                  <div className="absolute -top-2 -right-2 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs text-amber-400">
                    Coming
                  </div>
                )}
                <badge.icon className={cn(
                  "w-10 h-10 mx-auto mb-3 transition-colors",
                  badge.certified ? "text-emerald-400" : "text-amber-400"
                )} />
                <h4 className="font-bold text-white text-sm">{badge.name}</h4>
              </CardGlass>
            ))}
          </div>

          {/* Security features */}
          <CardGlass variant="elevated" className="p-12">
            <div className="grid lg:grid-cols-3 gap-8">
              <div>
                <Database className="w-10 h-10 text-cyan-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Data Sovereignty</h3>
                <p className="text-slate-400">
                  Your data never leaves your chosen region. Full control over data residency.
                </p>
              </div>
              <div>
                <CloudLightning className="w-10 h-10 text-[#7a5af8] mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Zero-Trust Architecture</h3>
                <p className="text-slate-400">
                  Every request verified. No implicit trust. Complete audit trails.
                </p>
              </div>
              <div>
                <Cpu className="w-10 h-10 text-emerald-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Edge Computing</h3>
                <p className="text-slate-400">
                  Process sensitive data locally. Reduce latency. Maintain compliance.
                </p>
              </div>
            </div>
          </CardGlass>
        </div>
      </section>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
          <CardGlass variant="elevated" className="max-w-2xl w-full p-8 relative">
            <button
              onClick={() => setShowContactForm(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-3xl font-bold text-white mb-2">Talk to Our Solutions Team</h2>
            <p className="text-slate-400 mb-8">
              Get a custom demo and pricing for your organization
            </p>

            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-[#7a5af8] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-[#7a5af8] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Work Email *
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-[#7a5af8] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Company *
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-[#7a5af8] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Team Size *
                </label>
                <select className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-[#7a5af8] focus:outline-none">
                  <option>10-50</option>
                  <option>51-200</option>
                  <option>201-500</option>
                  <option>501-1000</option>
                  <option>1000+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Message
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-[#7a5af8] focus:outline-none resize-none"
                  placeholder="Tell us about your needs..."
                />
              </div>

              <div className="flex gap-4">
                <Button variant="gradient-primary" size="lg" className="flex-1">
                  Request Demo
                  <Calendar className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="ghost-glass"
                  size="lg"
                  onClick={() => setShowContactForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardGlass>
        </div>
      )}

      {/* Final CTA */}
      <section className="py-32 px-4 bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-[#7a5af8]/20 via-cyan-500/20 to-emerald-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Ready to Scale Your Conversation Intelligence?
          </h2>
          <p className="text-xl text-slate-300 mb-12">
            Join Fortune 500 companies using enterprise-grade AI meeting intelligence
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button variant="gradient-primary" size="xl" onClick={() => setShowContactForm(true)}>
              Talk to Solutions Team
              <Phone className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="glassmorphism" size="xl">
              Download Security Whitepaper
              <FileCheck className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Contact info */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400">
            <a href="tel:1-800-NEBULA" className="flex items-center gap-2 hover:text-white transition-colors">
              <Phone className="w-4 h-4" />
              1-800-NEBULA
            </a>
            <a href="mailto:enterprise@openmeet.com" className="flex items-center gap-2 hover:text-white transition-colors">
              <Mail className="w-4 h-4" />
              enterprise@openmeet.com
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Global Coverage
            </span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}