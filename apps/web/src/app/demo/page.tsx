'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';
import {
  Check,
  Building2,
  Users,
  Shield,
  Lock,
  Globe,
  Zap,
  ArrowRight,
  Calendar,
  Clock,
  CheckCircle,
  Sparkles,
  Brain,
  Server,
  Play,
  Star
} from 'lucide-react';

const industries = [
  { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { id: 'legal', label: 'Legal', icon: '⚖️' },
  { id: 'finance', label: 'Financial Services', icon: '🏦' },
  { id: 'government', label: 'Government', icon: '🏛️' },
  { id: 'technology', label: 'Technology', icon: '💻' },
  { id: 'other', label: 'Other', icon: '🏢' },
];

const teamSizes = [
  { id: '1-10', label: '1-10 users' },
  { id: '11-50', label: '11-50 users' },
  { id: '51-200', label: '51-200 users' },
  { id: '201-500', label: '201-500 users' },
  { id: '500+', label: '500+ users' },
];

const interests = [
  { id: 'self-hosted', label: 'Self-Hosted Deployment', highlight: true },
  { id: 'white-label', label: 'White-Label Solution', highlight: true },
  { id: 'revenue-intelligence', label: 'Revenue Intelligence' },
  { id: 'compliance', label: 'HIPAA/SOC2 Compliance' },
  { id: 'integrations', label: 'Custom Integrations' },
  { id: 'api', label: 'API & Developer Tools' },
];

export default function DemoPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    jobTitle: '',
    phone: '',
    industry: '',
    teamSize: '',
    interests: [] as string[],
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInterestToggle = (interestId: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(i => i !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#000211]">
        <Navigation />
        <section className="pt-32 pb-24 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Thank You for Your Interest!
            </h1>
            <p className="text-xl text-slate-400 mb-8">
              We've received your demo request. A member of our team will reach out within 24 hours to schedule your personalized demo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button variant="gradient-primary" size="lg">
                  Return to Home
                </Button>
              </Link>
              <Link href="/self-hosted">
                <Button variant="glassmorphism" size="lg">
                  Explore Self-Hosted
                  <Server className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000211]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#7a5af8]/10 via-transparent to-transparent"></div>
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[150px]"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left Column - Form */}
            <div>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-6">
                  <Calendar className="w-4 h-4" />
                  Schedule Your Personalized Demo
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  See OpenMeet in Action
                </h1>
                <p className="text-xl text-slate-400">
                  Get a personalized walkthrough of our self-hosted meeting intelligence platform.
                  See how it works with your infrastructure.
                </p>
              </div>

              <CardGlass variant="elevated" className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#7a5af8] transition-colors"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#7a5af8] transition-colors"
                        placeholder="Smith"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#7a5af8] transition-colors"
                      placeholder="john@company.com"
                    />
                  </div>

                  {/* Company & Job Title */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Company *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#7a5af8] transition-colors"
                        placeholder="Acme Inc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={formData.jobTitle}
                        onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#7a5af8] transition-colors"
                        placeholder="VP of Engineering"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#7a5af8] transition-colors"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Industry *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {industries.map((industry) => (
                        <button
                          key={industry.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, industry: industry.id }))}
                          className={cn(
                            "px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left flex items-center gap-2",
                            formData.industry === industry.id
                              ? "bg-[#7a5af8]/20 border-[#7a5af8] text-white"
                              : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600"
                          )}
                        >
                          <span>{industry.icon}</span>
                          <span>{industry.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Team Size */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Team Size *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {teamSizes.map((size) => (
                        <button
                          key={size.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, teamSize: size.id }))}
                          className={cn(
                            "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                            formData.teamSize === size.id
                              ? "bg-[#7a5af8]/20 border-[#7a5af8] text-white"
                              : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600"
                          )}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      What are you most interested in?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {interests.map((interest) => (
                        <button
                          key={interest.id}
                          type="button"
                          onClick={() => handleInterestToggle(interest.id)}
                          className={cn(
                            "px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2",
                            formData.interests.includes(interest.id)
                              ? interest.highlight
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                : "bg-[#7a5af8]/20 border-[#7a5af8] text-white"
                              : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600"
                          )}
                        >
                          {formData.interests.includes(interest.id) && <Check className="w-4 h-4" />}
                          {interest.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Anything specific you'd like to see?
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#7a5af8] transition-colors resize-none"
                      placeholder="Tell us about your use case, compliance requirements, or specific questions..."
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="gradient-primary"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Request Demo
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-slate-500 text-center">
                    By submitting, you agree to our{' '}
                    <Link href="/privacy" className="text-[#7a5af8] hover:underline">Privacy Policy</Link>
                    {' '}and{' '}
                    <Link href="/terms" className="text-[#7a5af8] hover:underline">Terms of Service</Link>.
                  </p>
                </form>
              </CardGlass>
            </div>

            {/* Right Column - Benefits */}
            <div className="lg:sticky lg:top-32">
              <div className="space-y-8">
                {/* Video Preview */}
                <CardGlass variant="default" className="p-6 relative overflow-hidden group cursor-pointer">
                  <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#7a5af8]/20 to-emerald-500/20"></div>
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mt-4 text-center">
                    Watch a 2-minute overview of OpenMeet
                  </p>
                </CardGlass>

                {/* What You'll See */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    What You'll See in the Demo
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        icon: Server,
                        title: 'Self-Hosted Architecture',
                        description: 'See how OpenMeet deploys on your infrastructure with Docker/Kubernetes',
                        color: 'text-emerald-400'
                      },
                      {
                        icon: Brain,
                        title: 'Multi-Provider AI',
                        description: 'Switch between OpenAI, Anthropic, or local models instantly',
                        color: 'text-cyan-400'
                      },
                      {
                        icon: Shield,
                        title: 'Enterprise Security',
                        description: 'SAML SSO, SCIM provisioning, and comprehensive audit logging',
                        color: 'text-purple-400'
                      },
                      {
                        icon: Zap,
                        title: 'Revenue Intelligence',
                        description: 'Deal tracking, coaching scorecards, and pipeline analytics',
                        color: 'text-amber-400'
                      },
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className={cn("w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0", item.color)}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{item.title}</h4>
                          <p className="text-sm text-slate-400">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trust Indicators */}
                <CardGlass variant="subtle" className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-300">30-minute personalized demo</span>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-slate-300">No commitment required</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Users className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-300">Talk to a solutions engineer</span>
                  </div>
                </CardGlass>

                {/* Testimonial */}
                <CardGlass variant="default" className="p-6">
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-slate-300 italic mb-4">
                    "Finally, an AI meeting platform we can deploy in our own environment.
                    Game-changer for HIPAA compliance."
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#7a5af8] to-[#6938ef] flex items-center justify-center">
                      <span className="text-white font-bold text-sm">JM</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Jennifer Martinez</p>
                      <p className="text-xs text-slate-500">CTO, HealthFirst Medical Group</p>
                    </div>
                  </div>
                </CardGlass>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
