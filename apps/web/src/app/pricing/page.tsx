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
  X,
  Star,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Building2,
  Users,
  Shield,
  Zap,
  Globe,
  HeadphonesIcon,
  Key,
  BarChart3,
  FileText,
  Mic,
  Video,
  Calendar,
  MessageSquare,
  Lock,
  CheckCircle,
  Infinity
} from 'lucide-react';

interface PricingTier {
  name: string;
  price: number;
  unit?: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  popular?: boolean;
  features: string[];
  buttonText: string;
  buttonVariant: 'ghost-glass' | 'gradient-primary' | 'glassmorphism';
  highlight?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Pro',
    price: 12,
    unit: 'user',
    description: 'Perfect for small teams',
    features: [
      'Unlimited minutes',
      'Up to 25 users',
      'AI summaries & action items',
      '90 day data retention',
      'CRM integrations',
      'Video recording & storage',
      'Email support',
    ],
    buttonText: 'Start Free Trial',
    buttonVariant: 'ghost-glass',
  },
  {
    name: 'Business',
    price: 29,
    unit: 'user',
    description: 'For growing organizations',
    badge: 'MOST POPULAR',
    badgeColor: 'from-purple-500 to-indigo-600',
    features: [
      'Everything in Pro',
      'Unlimited users',
      'Revenue intelligence suite',
      'Coaching scorecards',
      'API access (REST & GraphQL)',
      'Unlimited data retention',
      'Priority support',
      'Team workspaces',
    ],
    buttonText: 'Start Free Trial',
    buttonVariant: 'gradient-primary',
  },
  {
    name: 'Enterprise',
    price: 49,
    unit: 'user',
    description: 'Advanced security & compliance',
    badge: 'ENTERPRISE',
    badgeColor: 'from-teal-500 to-cyan-600',
    popular: true,
    features: [
      'Everything in Business',
      'SSO (SAML 2.0) & SCIM',
      'HIPAA & SOC2 compliance',
      'Dedicated CSM',
      'Custom SLAs (99.9%)',
      'Audit logging & reporting',
      'Advanced admin controls',
      'Phone & Slack support',
    ],
    buttonText: 'Contact Sales',
    buttonVariant: 'gradient-primary',
    highlight: true,
  },
  {
    name: 'Self-Hosted',
    price: 0,
    description: 'Your infrastructure. Your data.',
    badge: 'UNIQUE',
    badgeColor: 'from-emerald-500 to-teal-500',
    features: [
      'Deploy on your infrastructure',
      'Complete data sovereignty',
      'Multi-provider AI (OpenAI, Anthropic, local)',
      'White-label capable',
      'Air-gapped deployment option',
      'No data leaves your network',
      'Custom licensing',
      'Source code access available',
    ],
    buttonText: 'Request Demo',
    buttonVariant: 'glassmorphism',
  },
];

const allFeatures = [
  { category: 'Core Features', icon: <Mic className="w-5 h-5" /> },
  { name: 'Meeting transcription', free: true, pro: true, business: true, enterprise: true },
  { name: 'Minutes per month', free: '1,000', pro: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Number of users', free: '5', pro: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Languages supported', free: '100+', pro: '150+', business: '150+', enterprise: '150+' },
  { name: 'Data retention', free: '7 days', pro: '90 days', business: 'Unlimited', enterprise: 'Unlimited' },

  { category: 'AI Features', icon: <Sparkles className="w-5 h-5" /> },
  { name: 'AI summaries', free: true, pro: true, business: true, enterprise: true },
  { name: 'Action items', free: false, pro: true, business: true, enterprise: true },
  { name: 'Speaker analytics', free: false, pro: false, business: true, enterprise: true },
  { name: 'Sentiment analysis', free: false, pro: false, business: true, enterprise: true },
  { name: 'Custom AI prompts', free: false, pro: false, business: true, enterprise: true },
  { name: 'Conversation intelligence', free: false, pro: false, business: true, enterprise: true },

  { category: 'Recording', icon: <Video className="w-5 h-5" /> },
  { name: 'Web recorder', free: true, pro: true, business: true, enterprise: true },
  { name: 'Video recording', free: false, pro: true, business: true, enterprise: true },
  { name: 'Screen recording', free: false, pro: true, business: true, enterprise: true },
  { name: 'Mobile app recording', free: false, pro: true, business: true, enterprise: true },

  { category: 'Integrations', icon: <Globe className="w-5 h-5" /> },
  { name: 'Calendar integration', free: true, pro: true, business: true, enterprise: true },
  { name: 'Zoom, Teams, Meet', free: true, pro: true, business: true, enterprise: true },
  { name: 'Slack integration', free: true, pro: true, business: true, enterprise: true },
  { name: 'CRM integrations', free: false, pro: true, business: true, enterprise: true },
  { name: 'API access', free: false, pro: false, business: true, enterprise: true },
  { name: 'Webhooks', free: false, pro: false, business: true, enterprise: true },

  { category: 'Security & Compliance', icon: <Shield className="w-5 h-5" /> },
  { name: 'Data encryption', free: true, pro: true, business: true, enterprise: true },
  { name: 'Two-factor authentication', free: false, pro: true, business: true, enterprise: true },
  { name: 'SSO (SAML 2.0)', free: false, pro: false, business: false, enterprise: true },
  { name: 'HIPAA compliance', free: false, pro: false, business: false, enterprise: true },
  { name: 'SOC 2 Type II', free: false, pro: false, business: false, enterprise: true },
  { name: 'Private cloud deployment', free: false, pro: false, business: false, enterprise: true },

  { category: 'Support', icon: <HeadphonesIcon className="w-5 h-5" /> },
  { name: 'Email support', free: 'Standard', pro: 'Priority', business: 'Priority', enterprise: 'Priority' },
  { name: 'Phone support', free: false, pro: false, business: true, enterprise: true },
  { name: 'Dedicated CSM', free: false, pro: false, business: false, enterprise: true },
  { name: 'Custom onboarding', free: false, pro: false, business: true, enterprise: true },
  { name: 'SLA guarantee', free: false, pro: false, business: false, enterprise: '99.9%' },
];

const faqs = [
  {
    question: 'How does the free trial work?',
    answer: 'Start with our 14-day free trial of the Pro plan. No credit card required. You get unlimited minutes and access to all Pro features. After the trial, you can choose to upgrade or continue with our Free plan.',
  },
  {
    question: 'Can I change plans anytime?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, changes take effect at the next billing cycle.',
  },
  {
    question: 'What counts as a "minute"?',
    answer: 'Minutes are calculated based on the actual duration of recorded meetings. A 30-minute meeting uses 30 minutes from your quota. Live transcription and uploaded audio/video files also count toward your minutes.',
  },
  {
    question: 'Do you offer discounts for annual billing?',
    answer: 'Yes! Save 20% when you choose annual billing. That\'s like getting 2 months free every year. Annual plans also include priority support and early access to new features.',
  },
  {
    question: 'What integrations are included?',
    answer: 'All plans include basic integrations with Zoom, Google Meet, Microsoft Teams, and calendars. Pro and above add CRM integrations (Salesforce, HubSpot). Business plans include API access for custom integrations.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. All plans include 256-bit AES encryption, secure data centers, and regular security audits. Enterprise plans add SOC 2 Type II, HIPAA compliance, and the option for private cloud deployment.',
  },
  {
    question: 'Can I get a custom plan?',
    answer: 'Yes! For teams over 100 users or specific requirements, we offer custom Enterprise plans with volume discounts, custom features, and flexible contracts. Contact our sales team to discuss your needs.',
  },
  {
    question: 'What happens if I exceed my minutes?',
    answer: 'Free plan users will need to wait for the next month or upgrade. Pro and Business users have unlimited minutes. We\'ll notify you before you reach your limit so you can plan accordingly.',
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const getPrice = (price: number) => {
    if (price === 0) return 0;
    return billingPeriod === 'annual' ? Math.floor(price * 0.8) : price;
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#000211]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#7a5af8]/10 via-transparent to-transparent"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-6">
              <Lock className="w-4 h-4" />
              Self-Hosted Option Available
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Enterprise Meeting Intelligence
            </h1>
            <p className="text-xl text-slate-400 mb-8">
              Cloud or self-hosted. Your choice. Transparent pricing.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1 bg-[#0a0a1a] border border-white/10 rounded-full">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  "px-6 py-2 rounded-full font-medium transition-all",
                  billingPeriod === 'monthly'
                    ? "bg-gradient-to-r from-[#7a5af8] to-[#6938ef] text-white"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={cn(
                  "px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2",
                  billingPeriod === 'annual'
                    ? "bg-gradient-to-r from-[#7a5af8] to-[#6938ef] text-white"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Annual
                {billingPeriod === 'annual' && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">
                    SAVE 20%
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {pricingTiers.map((tier, index) => (
              <CardGlass
                key={tier.name}
                variant={tier.highlight ? 'elevated' : 'default'}
                gradient={tier.highlight}
                className={cn(
                  "p-8 relative",
                  tier.highlight && "md:-translate-y-4 border-teal-500/50"
                )}
              >
                {tier.badge && (
                  <div className={cn(
                    "absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1",
                    `bg-gradient-to-r ${tier.badgeColor}`
                  )}>
                    {tier.popular && <Star className="w-3 h-3 fill-white" />}
                    {tier.badge}
                  </div>
                )}

                <h3 className="text-lg font-semibold text-white mb-2">{tier.name}</h3>

                <div className="mb-6">
                  <span className={cn(
                    "text-5xl font-bold",
                    tier.highlight
                      ? "bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent"
                      : "text-white"
                  )}>
                    ${getPrice(tier.price)}
                  </span>
                  {tier.unit && (
                    <span className="text-slate-400">/{tier.unit}/mo</span>
                  )}
                  {tier.price === 0 && (
                    <span className="text-slate-400">/mo</span>
                  )}
                </div>

                <p className="text-sm text-slate-400 mb-6">
                  {tier.description}
                </p>

                <Button
                  variant={tier.buttonVariant}
                  className="w-full mb-8"
                  size={tier.highlight ? 'lg' : 'default'}
                >
                  {tier.buttonText}
                </Button>

                <ul className="space-y-3 text-sm">
                  {tier.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className={cn(
                        "flex items-start gap-2",
                        tier.highlight ? "text-white" : "text-slate-300"
                      )}
                    >
                      <CheckCircle className={cn(
                        "w-5 h-5 mt-0.5 flex-shrink-0",
                        tier.highlight ? "text-teal-400" : "text-emerald-400"
                      )} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardGlass>
            ))}
          </div>

          {billingPeriod === 'annual' && (
            <p className="text-center mt-8 text-sm text-emerald-400">
              <Sparkles className="inline w-4 h-4 mr-1" />
              Annual pricing shown. You save 20% compared to monthly billing!
            </p>
          )}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-24 px-4 bg-[#0a0a1a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Compare Features
            </h2>
            <p className="text-xl text-slate-400">
              Everything you need to transform your meetings
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">Features</th>
                  <th className="text-center py-4 px-4">
                    <div className="text-white font-semibold">Free</div>
                    <div className="text-slate-500 text-sm">${getPrice(0)}/mo</div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="text-white font-semibold">Pro</div>
                    <div className="text-slate-500 text-sm">${getPrice(8)}/user/mo</div>
                  </th>
                  <th className="text-center py-4 px-4 bg-teal-500/5">
                    <div className="text-teal-400 font-semibold">Business</div>
                    <div className="text-slate-400 text-sm">${getPrice(15)}/user/mo</div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="text-white font-semibold">Enterprise</div>
                    <div className="text-slate-500 text-sm">${getPrice(29)}/user/mo</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {allFeatures.slice(0, showAllFeatures ? allFeatures.length : 15).map((feature, idx) => {
                  if (feature.category) {
                    return (
                      <tr key={idx} className="border-t border-white/10">
                        <td colSpan={5} className="py-4 px-4">
                          <div className="flex items-center gap-2 text-white font-semibold">
                            {feature.icon}
                            {feature.category}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={idx} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-slate-300">{feature.name}</td>
                      <td className="text-center py-3 px-4">
                        {typeof feature.free === 'boolean' ? (
                          feature.free ? (
                            <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-slate-600 mx-auto" />
                          )
                        ) : (
                          <span className="text-slate-400 text-sm">{feature.free}</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {typeof feature.pro === 'boolean' ? (
                          feature.pro ? (
                            <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-slate-600 mx-auto" />
                          )
                        ) : (
                          <span className="text-slate-400 text-sm">{feature.pro}</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4 bg-teal-500/5">
                        {typeof feature.business === 'boolean' ? (
                          feature.business ? (
                            <Check className="w-5 h-5 text-teal-400 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-slate-600 mx-auto" />
                          )
                        ) : (
                          <span className="text-teal-300 text-sm font-medium">{feature.business}</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {typeof feature.enterprise === 'boolean' ? (
                          feature.enterprise ? (
                            <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-slate-600 mx-auto" />
                          )
                        ) : (
                          <span className="text-slate-400 text-sm">{feature.enterprise}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!showAllFeatures && (
            <div className="text-center mt-8">
              <Button
                variant="ghost-glass"
                onClick={() => setShowAllFeatures(true)}
                className="inline-flex items-center gap-2"
              >
                Show All Features
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4 bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-400">
              Everything you need to know about our pricing
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <CardGlass
                key={index}
                variant="default"
                className="overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <h3 className="text-lg font-medium text-white pr-4">
                    {faq.question}
                  </h3>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                </button>

                <div className={cn(
                  "px-6 overflow-hidden transition-all duration-300",
                  expandedFaq === index ? "max-h-96 pb-4" : "max-h-0"
                )}>
                  <p className="text-slate-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </CardGlass>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-24 px-4 bg-[#0a0a1a]">
        <div className="max-w-5xl mx-auto">
          <CardGlass
            variant="elevated"
            gradient
            className="p-12 relative overflow-hidden"
          >
            {/* Background effects */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-white mb-4">
                  Need More? Let's Talk.
                </h2>
                <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                  Custom plans for teams over 100 users. Volume discounts, custom features,
                  and flexible contracts tailored to your organization.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="text-center">
                  <Building2 className="w-12 h-12 text-teal-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">Enterprise Ready</h3>
                  <p className="text-sm text-slate-400">
                    SSO, HIPAA, SOC2, and custom deployment options
                  </p>
                </div>
                <div className="text-center">
                  <Users className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">Dedicated Support</h3>
                  <p className="text-sm text-slate-400">
                    Customer Success Manager and priority support channels
                  </p>
                </div>
                <div className="text-center">
                  <Key className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">Custom Features</h3>
                  <p className="text-sm text-slate-400">
                    Tailored integrations and features for your workflow
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="gradient-primary" size="lg">
                  Contact Sales
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button variant="glassmorphism" size="lg">
                  Schedule Demo
                  <Calendar className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </CardGlass>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 px-4 bg-slate-950 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm font-bold text-teal-400 uppercase tracking-wider">
              Trusted by 800,000+ companies
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8">
            <div className="flex items-center gap-2 text-slate-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">SOC 2 Type II</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-medium">HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">GDPR Ready</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-medium">256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">ISO 27001</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}