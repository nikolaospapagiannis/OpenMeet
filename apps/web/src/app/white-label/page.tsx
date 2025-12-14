'use client';

import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import {
  Palette,
  Globe,
  Shield,
  Zap,
  Building2,
  CheckCircle,
  ArrowRight,
  Layers,
  Code2,
  BarChart3,
  Users,
  Lock,
  Server,
  Sparkles,
  MessageSquare,
  CreditCard,
  HeadphonesIcon,
  Cog,
  Database
} from 'lucide-react';

export default function WhiteLabelPage() {
  return (
    <div className="min-h-screen bg-[#000211]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 gradient-hero"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(122,90,248,0.15),transparent_70%)]"></div>

        <div className="container-ff relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#7a5af8]/20 to-[#6938ef]/20 border border-[#7a5af8]/30 mb-8">
              <Palette className="w-4 h-4 text-[#7a5af8]" />
              <span className="paragraph-s text-[#cbd5e1]">White-Label Solution</span>
            </div>

            <h1 className="heading-xl text-white mb-6">
              Launch Your Own{' '}
              <span className="bg-gradient-to-r from-[#7a5af8] via-[#6938ef] to-[#4f46e5] bg-clip-text text-transparent">
                Meeting Intelligence Platform
              </span>
            </h1>
            <p className="paragraph-l text-[#94a3b8] mb-8 max-w-3xl mx-auto">
              Rebrand our enterprise-grade meeting AI as your own product. Full customization,
              your branding, your pricing, your customers. Launch in weeks, not years.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/demo">
                <Button variant="gradient-primary" size="lg">
                  Request Partnership Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="glassmorphism" size="lg">
                  Talk to Partnerships Team
                </Button>
              </Link>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <StatCard value="<4 weeks" label="Time to Launch" />
              <StatCard value="100%" label="Rebrandable" />
              <StatCard value="0%" label="Revenue Share" />
              <StatCard value="Enterprise" label="Grade Security" />
            </div>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="py-20 px-4">
        <div className="container-ff">
          <div className="text-center mb-16">
            <h2 className="heading-l text-white mb-4">Everything You Need to Launch</h2>
            <p className="paragraph-l text-[#94a3b8] max-w-2xl mx-auto">
              A complete, ready-to-deploy platform with full source code access and unlimited customization.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Palette className="w-6 h-6" />}
              title="Complete Branding Control"
              description="Custom logos, colors, fonts, domains, and email templates. Your brand, everywhere."
            />
            <FeatureCard
              icon={<Server className="w-6 h-6" />}
              title="Flexible Deployment"
              description="Cloud-hosted by us, self-hosted by you, or hybrid. Your infrastructure preferences honored."
            />
            <FeatureCard
              icon={<CreditCard className="w-6 h-6" />}
              title="Your Billing System"
              description="Stripe, custom billing, or integrate with your existing system. Set your own pricing."
            />
            <FeatureCard
              icon={<Code2 className="w-6 h-6" />}
              title="API & SDK Access"
              description="Full API documentation and SDKs for custom integrations and extensions."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Multi-Tenant Architecture"
              description="Built for scale. Serve thousands of customers with isolated data and configs."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Enterprise Security"
              description="SOC 2 Type II, HIPAA, GDPR. Pass any enterprise security review."
            />
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 bg-[#0a0a1a]/50">
        <div className="container-ff">
          <div className="text-center mb-16">
            <h2 className="heading-l text-white mb-4">Perfect For</h2>
            <p className="paragraph-l text-[#94a3b8] max-w-2xl mx-auto">
              Whether you&apos;re a SaaS company, agency, or enterprise, white-labeling accelerates your go-to-market.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <UseCaseCard
              icon={<Building2 className="w-8 h-8" />}
              title="SaaS Companies"
              description="Add meeting intelligence to your product suite without building from scratch. Integrate via API or offer as a standalone product."
              examples={['CRM Platforms', 'HR Software', 'Project Management Tools', 'Communication Platforms']}
            />
            <UseCaseCard
              icon={<Globe className="w-8 h-8" />}
              title="Resellers & MSPs"
              description="Build a recurring revenue business selling meeting AI to your existing customer base."
              examples={['IT Service Providers', 'Telecom Companies', 'Business Consultants', 'System Integrators']}
            />
            <UseCaseCard
              icon={<Layers className="w-8 h-8" />}
              title="Vertical Solutions"
              description="Create industry-specific meeting intelligence products with specialized features and compliance."
              examples={['Healthcare', 'Legal', 'Financial Services', 'Education']}
            />
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-20 px-4">
        <div className="container-ff">
          <div className="text-center mb-16">
            <h2 className="heading-l text-white mb-4">Full-Featured Platform</h2>
            <p className="paragraph-l text-[#94a3b8] max-w-2xl mx-auto">
              Everything your customers expect from a modern meeting intelligence solution.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Core Features */}
            <div>
              <h3 className="heading-m text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#7a5af8]/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#7a5af8]" />
                </div>
                Core Platform
              </h3>
              <div className="space-y-4">
                <FeatureListItem>Multi-language transcription (95+ languages)</FeatureListItem>
                <FeatureListItem>AI-powered meeting summaries & action items</FeatureListItem>
                <FeatureListItem>Speaker identification & analytics</FeatureListItem>
                <FeatureListItem>Searchable transcript archive</FeatureListItem>
                <FeatureListItem>Video & audio recording with playback</FeatureListItem>
                <FeatureListItem>Calendar integrations (Google, Outlook, etc.)</FeatureListItem>
                <FeatureListItem>Meeting bots for Zoom, Meet, Teams, Webex</FeatureListItem>
                <FeatureListItem>Mobile apps (iOS & Android)</FeatureListItem>
              </div>
            </div>

            {/* Enterprise Features */}
            <div>
              <h3 className="heading-m text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#7a5af8]/20 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#7a5af8]" />
                </div>
                Enterprise Features
              </h3>
              <div className="space-y-4">
                <FeatureListItem>SAML/SSO & SCIM provisioning</FeatureListItem>
                <FeatureListItem>Role-based access control (RBAC)</FeatureListItem>
                <FeatureListItem>Audit logs & compliance reporting</FeatureListItem>
                <FeatureListItem>Data retention policies</FeatureListItem>
                <FeatureListItem>End-to-end encryption</FeatureListItem>
                <FeatureListItem>Custom AI model selection</FeatureListItem>
                <FeatureListItem>API rate limits & usage controls</FeatureListItem>
                <FeatureListItem>Dedicated support channels</FeatureListItem>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="py-20 px-4 bg-[#0a0a1a]/50">
        <div className="container-ff">
          <div className="text-center mb-16">
            <h2 className="heading-l text-white mb-4">Technical Architecture</h2>
            <p className="paragraph-l text-[#94a3b8] max-w-2xl mx-auto">
              Built on a modern, scalable stack designed for enterprise workloads.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <TechCard
              icon={<Database className="w-6 h-6" />}
              title="Data Layer"
              items={['PostgreSQL', 'Redis', 'Elasticsearch', 'MinIO/S3']}
            />
            <TechCard
              icon={<Server className="w-6 h-6" />}
              title="Backend"
              items={['Node.js/TypeScript', 'Python ML Services', 'RabbitMQ', 'Kubernetes Ready']}
            />
            <TechCard
              icon={<Layers className="w-6 h-6" />}
              title="Frontend"
              items={['React/Next.js', 'TypeScript', 'TailwindCSS', 'React Native']}
            />
            <TechCard
              icon={<Shield className="w-6 h-6" />}
              title="Security"
              items={['AES-256 Encryption', 'JWT Auth', 'RBAC', 'Audit Logging']}
            />
          </div>

          {/* Multi-Provider AI */}
          <CardGlass variant="elevated" padding="lg">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h3 className="heading-m text-white mb-4">Multi-Provider AI Architecture</h3>
                <p className="paragraph-m text-[#94a3b8] mb-6">
                  Choose your AI providers or let your customers choose theirs. Support for OpenAI, Anthropic,
                  local models via Ollama, and enterprise deployments with vLLM.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 bg-[#1e293b] rounded-full paragraph-s text-[#cbd5e1]">OpenAI GPT-4</span>
                  <span className="px-3 py-1 bg-[#1e293b] rounded-full paragraph-s text-[#cbd5e1]">Anthropic Claude</span>
                  <span className="px-3 py-1 bg-[#1e293b] rounded-full paragraph-s text-[#cbd5e1]">Ollama (Local)</span>
                  <span className="px-3 py-1 bg-[#1e293b] rounded-full paragraph-s text-[#cbd5e1]">vLLM</span>
                  <span className="px-3 py-1 bg-[#1e293b] rounded-full paragraph-s text-[#cbd5e1]">Custom Models</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-gradient-to-br from-[#7a5af8]/20 to-[#6938ef]/20 rounded-2xl flex items-center justify-center border border-[#7a5af8]/30">
                  <Zap className="w-12 h-12 text-[#7a5af8]" />
                </div>
              </div>
            </div>
          </CardGlass>
        </div>
      </section>

      {/* Partnership Models */}
      <section className="py-20 px-4">
        <div className="container-ff">
          <div className="text-center mb-16">
            <h2 className="heading-l text-white mb-4">Partnership Models</h2>
            <p className="paragraph-l text-[#94a3b8] max-w-2xl mx-auto">
              Flexible options to match your business model and technical requirements.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <PricingCard
              title="Cloud White-Label"
              description="We host, you brand"
              price="Custom"
              features={[
                'Full branding customization',
                'Custom domain & SSL',
                'We handle infrastructure',
                'Automatic updates',
                'Shared multi-tenant',
                '99.9% SLA'
              ]}
              highlighted={false}
            />
            <PricingCard
              title="Dedicated Cloud"
              description="Your isolated instance"
              price="Custom"
              features={[
                'Everything in Cloud',
                'Dedicated infrastructure',
                'Custom AI model config',
                'Advanced compliance',
                'Custom integrations',
                '99.99% SLA'
              ]}
              highlighted={true}
              badge="MOST POPULAR"
            />
            <PricingCard
              title="Source License"
              description="Full control"
              price="Custom"
              features={[
                'Complete source code',
                'Deploy anywhere',
                'Unlimited customization',
                'No per-seat fees',
                'Technical support',
                'Quarterly updates'
              ]}
              highlighted={false}
            />
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-20 px-4 bg-[#0a0a1a]/50">
        <div className="container-ff">
          <div className="text-center mb-16">
            <h2 className="heading-l text-white mb-4">Partner Success Program</h2>
            <p className="paragraph-l text-[#94a3b8] max-w-2xl mx-auto">
              We&apos;re invested in your success. Every partnership includes comprehensive support.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SupportCard
              icon={<HeadphonesIcon className="w-6 h-6" />}
              title="Dedicated Success Manager"
              description="Your single point of contact for strategy, support, and growth."
            />
            <SupportCard
              icon={<Cog className="w-6 h-6" />}
              title="Technical Integration Support"
              description="Engineering resources to help with custom integrations and deployment."
            />
            <SupportCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Go-to-Market Resources"
              description="Sales materials, competitive positioning, and marketing assets."
            />
            <SupportCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Priority Support Channel"
              description="Direct Slack access to our engineering and product teams."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container-ff">
          <CardGlass variant="gradient" padding="xl">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="heading-l text-white mb-4">Ready to Launch Your Platform?</h2>
              <p className="paragraph-l text-[#94a3b8] mb-8">
                Join leading companies building on our white-label platform. Schedule a partnership
                demo to see the full capabilities and discuss your requirements.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/demo">
                  <Button variant="gradient-primary" size="lg">
                    Schedule Partnership Demo
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="glassmorphism" size="lg">
                    Contact Partnerships
                  </Button>
                </Link>
              </div>
            </div>
          </CardGlass>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-[#0f1629]/80 backdrop-blur-xl rounded-xl border border-[#1e293b] p-4 text-center">
      <p className="heading-m text-white mb-1">{value}</p>
      <p className="paragraph-xs text-[#94a3b8]">{label}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <CardGlass variant="elevated" hover padding="md">
      <div className="w-12 h-12 bg-[#7a5af8]/20 rounded-xl flex items-center justify-center text-[#7a5af8] mb-4">
        {icon}
      </div>
      <h3 className="heading-s text-white mb-2">{title}</h3>
      <p className="paragraph-s text-[#94a3b8]">{description}</p>
    </CardGlass>
  );
}

function UseCaseCard({
  icon,
  title,
  description,
  examples,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  examples: string[];
}) {
  return (
    <CardGlass variant="elevated" padding="lg">
      <div className="w-16 h-16 bg-gradient-to-br from-[#7a5af8]/20 to-[#6938ef]/20 rounded-2xl flex items-center justify-center text-[#7a5af8] mb-6 border border-[#7a5af8]/30">
        {icon}
      </div>
      <h3 className="heading-m text-white mb-3">{title}</h3>
      <p className="paragraph-m text-[#94a3b8] mb-4">{description}</p>
      <div className="flex flex-wrap gap-2">
        {examples.map((example, index) => (
          <span key={index} className="px-3 py-1 bg-[#1e293b]/50 rounded-full paragraph-xs text-[#cbd5e1]">
            {example}
          </span>
        ))}
      </div>
    </CardGlass>
  );
}

function FeatureListItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
      <span className="paragraph-m text-[#cbd5e1]">{children}</span>
    </div>
  );
}

function TechCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <CardGlass variant="elevated" padding="md">
      <div className="w-10 h-10 bg-[#7a5af8]/20 rounded-lg flex items-center justify-center text-[#7a5af8] mb-4">
        {icon}
      </div>
      <h4 className="heading-xs text-white mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="paragraph-s text-[#94a3b8]">{item}</li>
        ))}
      </ul>
    </CardGlass>
  );
}

function PricingCard({
  title,
  description,
  price,
  features,
  highlighted,
  badge,
}: {
  title: string;
  description: string;
  price: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
}) {
  return (
    <CardGlass
      variant={highlighted ? 'gradient' : 'elevated'}
      padding="lg"
      className={highlighted ? 'ring-2 ring-[#7a5af8]' : ''}
    >
      {badge && (
        <span className="inline-block px-3 py-1 bg-gradient-to-r from-[#7a5af8] to-[#6938ef] rounded-full paragraph-xs text-white font-medium mb-4">
          {badge}
        </span>
      )}
      <h3 className="heading-m text-white mb-1">{title}</h3>
      <p className="paragraph-s text-[#94a3b8] mb-4">{description}</p>
      <p className="heading-l text-white mb-6">{price}</p>
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="paragraph-s text-[#cbd5e1]">{feature}</span>
          </li>
        ))}
      </ul>
      <Link href="/contact">
        <Button
          variant={highlighted ? 'gradient-primary' : 'glassmorphism'}
          className="w-full"
        >
          Contact Sales
        </Button>
      </Link>
    </CardGlass>
  );
}

function SupportCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <CardGlass variant="elevated" padding="md">
      <div className="w-12 h-12 bg-[#7a5af8]/20 rounded-xl flex items-center justify-center text-[#7a5af8] mb-4">
        {icon}
      </div>
      <h4 className="heading-xs text-white mb-2">{title}</h4>
      <p className="paragraph-s text-[#94a3b8]">{description}</p>
    </CardGlass>
  );
}
