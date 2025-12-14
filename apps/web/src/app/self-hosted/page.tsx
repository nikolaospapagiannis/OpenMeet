'use client';

import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';
import {
  Server,
  Shield,
  Lock,
  Cloud,
  Database,
  Cpu,
  Globe,
  CheckCircle,
  ArrowRight,
  Terminal,
  Boxes,
  HardDrive,
  Network,
  Key,
  FileCode,
  Zap,
  Building2,
  Users,
  Brain,
  GitBranch,
  Container
} from 'lucide-react';

const deploymentOptions = [
  {
    icon: Container,
    title: 'Docker Compose',
    description: 'Single-server deployment for teams up to 100 users',
    features: ['5-minute setup', 'Auto-updates', 'Built-in backups'],
    recommended: 'Small teams'
  },
  {
    icon: Boxes,
    title: 'Kubernetes',
    description: 'Scalable deployment for enterprise workloads',
    features: ['Horizontal scaling', 'High availability', 'Custom resource limits'],
    recommended: 'Enterprise'
  },
  {
    icon: Cloud,
    title: 'Private Cloud',
    description: 'Deploy on AWS, Azure, or GCP in your VPC',
    features: ['Terraform modules', 'VPC isolation', 'Managed databases'],
    recommended: 'Cloud-native'
  },
  {
    icon: HardDrive,
    title: 'Air-Gapped',
    description: 'Complete network isolation for highest security',
    features: ['Offline installation', 'Local AI models', 'No external calls'],
    recommended: 'Government/Defense'
  }
];

const securityFeatures = [
  {
    icon: Lock,
    title: 'Data Sovereignty',
    description: 'All data stays within your network. No telemetry, no external API calls, no data exfiltration.'
  },
  {
    icon: Shield,
    title: 'Compliance Ready',
    description: 'HIPAA, SOC2, GDPR, FedRAMP-ready architecture with comprehensive audit logging.'
  },
  {
    icon: Key,
    title: 'Encryption',
    description: 'AES-256 encryption at rest, TLS 1.3 in transit. You control the encryption keys.'
  },
  {
    icon: Network,
    title: 'Network Isolation',
    description: 'Deploy in isolated VPCs, air-gapped environments, or behind corporate firewalls.'
  }
];

const aiProviders = [
  { name: 'OpenAI', logo: '🤖', description: 'GPT-4, Whisper' },
  { name: 'Anthropic', logo: '🧠', description: 'Claude models' },
  { name: 'Local Models', logo: '💻', description: 'Ollama, vLLM' },
  { name: 'Custom', logo: '⚙️', description: 'Your own models' }
];

const techStack = [
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'Redis', category: 'Cache' },
  { name: 'Elasticsearch', category: 'Search' },
  { name: 'RabbitMQ', category: 'Queue' },
  { name: 'MinIO', category: 'Storage' },
  { name: 'Prometheus', category: 'Monitoring' }
];

export default function SelfHostedPage() {
  return (
    <div className="min-h-screen bg-[#000211]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-500/10 rounded-full blur-[120px]"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-6">
              <Lock className="w-4 h-4" />
              Only Available from OpenMeet
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Self-Hosted
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Meeting Intelligence
              </span>
            </h1>

            <p className="text-xl text-slate-400 mb-10 max-w-3xl mx-auto">
              Deploy OpenMeet on your own infrastructure. Complete data sovereignty.
              No external dependencies. Your meetings, your servers, your control.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/demo">
                <Button variant="gradient-primary" size="lg">
                  Request Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="https://github.com/openmeet/nebula" target="_blank" rel="noopener noreferrer">
                <Button variant="glassmorphism" size="lg">
                  <GitBranch className="w-5 h-5 mr-2" />
                  View on GitHub
                </Button>
              </a>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">5 min</div>
                <div className="text-sm text-slate-500">Setup Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-400">0</div>
                <div className="text-sm text-slate-500">External API Calls</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400">100%</div>
                <div className="text-sm text-slate-500">Data Ownership</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">4</div>
                <div className="text-sm text-slate-500">AI Providers</div>
              </div>
            </div>
          </div>

          {/* Architecture Diagram */}
          <CardGlass variant="elevated" className="p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>

            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-white mb-2">Architecture Overview</h3>
              <p className="text-slate-400">Everything runs inside your network</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {/* Your Infrastructure */}
              <div className="bg-slate-900/50 border border-emerald-500/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-emerald-400">Your Infrastructure</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Server className="w-4 h-4 text-slate-500" />
                    Docker / Kubernetes
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Database className="w-4 h-4 text-slate-500" />
                    PostgreSQL + Redis
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <HardDrive className="w-4 h-4 text-slate-500" />
                    S3-Compatible Storage
                  </div>
                </div>
              </div>

              {/* OpenMeet Core */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/50 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-white">OpenMeet Core</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Transcription Engine
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    AI Analysis Pipeline
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Revenue Intelligence
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Enterprise Features
                  </div>
                </div>
              </div>

              {/* AI Providers */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  <span className="font-semibold text-cyan-400">AI Provider (Your Choice)</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span>🤖</span> OpenAI API
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span>🧠</span> Anthropic Claude
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span>💻</span> Local Models (Ollama)
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span>🔒</span> Air-Gapped Option
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="text-sm text-emerald-300 text-center">
                <Lock className="w-4 h-4 inline mr-2" />
                All components run inside your network. Zero data leaves your infrastructure.
              </p>
            </div>
          </CardGlass>
        </div>
      </section>

      {/* Deployment Options */}
      <section className="py-24 px-4 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Deployment Options
            </h2>
            <p className="text-xl text-slate-400">
              Choose the deployment model that fits your infrastructure
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {deploymentOptions.map((option, idx) => (
              <CardGlass
                key={idx}
                variant="default"
                hover
                className="p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
                  <option.icon className="w-6 h-6 text-emerald-400" />
                </div>

                <div className="mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {option.recommended}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{option.title}</h3>
                <p className="text-sm text-slate-400 mb-4">{option.description}</p>

                <ul className="space-y-2">
                  {option.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardGlass>
            ))}
          </div>

          {/* Quick Start Code */}
          <div className="mt-16">
            <CardGlass variant="elevated" className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Terminal className="w-6 h-6 text-emerald-400" />
                <h3 className="text-xl font-bold text-white">Quick Start</h3>
              </div>

              <div className="bg-slate-900 rounded-lg p-6 font-mono text-sm overflow-x-auto">
                <div className="text-slate-500 mb-2"># Clone and start in 5 minutes</div>
                <div className="text-emerald-400">$ git clone https://github.com/openmeet/nebula.git</div>
                <div className="text-emerald-400">$ cd nebula</div>
                <div className="text-emerald-400">$ cp .env.example .env</div>
                <div className="text-emerald-400">$ docker compose up -d</div>
                <div className="text-slate-500 mt-4"># Access at http://localhost:3000</div>
              </div>

              <div className="mt-6 flex flex-wrap gap-4">
                <a href="https://docs.openmeet.com/self-hosted" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost-glass">
                    <FileCode className="w-4 h-4 mr-2" />
                    Full Documentation
                  </Button>
                </a>
                <a href="https://github.com/openmeet/nebula/blob/main/docker-compose.yml" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost-glass">
                    <Container className="w-4 h-4 mr-2" />
                    Docker Compose
                  </Button>
                </a>
                <a href="https://github.com/openmeet/nebula/tree/main/deploy/kubernetes" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost-glass">
                    <Boxes className="w-4 h-4 mr-2" />
                    Kubernetes Helm
                  </Button>
                </a>
              </div>
            </CardGlass>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-24 px-4 bg-[#0a0a1a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4">
              Enterprise Security
            </p>
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for Regulated Industries
            </h2>
            <p className="text-xl text-slate-400">
              HIPAA, SOC2, GDPR, FedRAMP-ready architecture
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityFeatures.map((feature, idx) => (
              <CardGlass key={idx} variant="default" className="p-6">
                <feature.icon className="w-10 h-10 text-emerald-400 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </CardGlass>
            ))}
          </div>

          {/* Compliance Badges */}
          <div className="mt-16 flex flex-wrap justify-center gap-4">
            {['HIPAA Ready', 'SOC 2 Type II', 'GDPR Compliant', 'FedRAMP Ready', 'ISO 27001'].map((badge) => (
              <div
                key={badge}
                className="px-6 py-3 bg-slate-900/50 border border-slate-700 rounded-lg flex items-center gap-2"
              >
                <Shield className="w-5 h-5 text-emerald-400" />
                <span className="text-white font-medium">{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-Provider AI */}
      <section className="py-24 px-4 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">
                AI Flexibility
              </p>
              <h2 className="text-4xl font-bold text-white mb-6">
                Choose Your AI Provider
              </h2>
              <p className="text-xl text-slate-400 mb-8">
                Unlike competitors locked to a single vendor, OpenMeet lets you choose—and switch—between
                AI providers. Use cloud APIs, or run completely local with open-source models.
              </p>

              <div className="space-y-4">
                {aiProviders.map((provider, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="text-3xl">{provider.logo}</div>
                    <div>
                      <h4 className="font-semibold text-white">{provider.name}</h4>
                      <p className="text-sm text-slate-400">{provider.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <CardGlass variant="elevated" gradient className="p-8">
              <h3 className="text-xl font-bold text-white mb-6">Why Multi-Provider Matters</h3>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Cost Optimization</h4>
                    <p className="text-sm text-slate-400">
                      Switch providers based on pricing. Use local models for bulk processing,
                      cloud APIs for complex analysis.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Air-Gapped Deployment</h4>
                    <p className="text-sm text-slate-400">
                      Run Ollama or vLLM locally for complete network isolation.
                      No data leaves your infrastructure.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">No Vendor Lock-In</h4>
                    <p className="text-sm text-slate-400">
                      If one provider changes pricing or policies, switch instantly
                      without any code changes.
                    </p>
                  </div>
                </div>
              </div>
            </CardGlass>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 px-4 bg-[#0a0a1a]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Production-Ready Stack
          </h2>
          <p className="text-slate-400 mb-12">
            Built on battle-tested open-source technologies
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {techStack.map((tech, idx) => (
              <div
                key={idx}
                className="px-6 py-3 bg-slate-900/50 border border-slate-700 rounded-lg"
              >
                <div className="text-white font-medium">{tech.name}</div>
                <div className="text-xs text-slate-500">{tech.category}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-slate-950 to-[#000211]">
        <div className="max-w-4xl mx-auto">
          <CardGlass variant="elevated" gradient className="p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-4">
                Ready to Deploy on Your Infrastructure?
              </h2>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Get a personalized demo and deployment consultation.
                Our team will help you plan the perfect self-hosted setup.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/demo">
                  <Button variant="gradient-primary" size="xl">
                    Request Demo
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <a href="mailto:enterprise@openmeet.com">
                  <Button variant="glassmorphism" size="xl">
                    <Users className="w-5 h-5 mr-2" />
                    Contact Enterprise Sales
                  </Button>
                </a>
              </div>

              <p className="text-sm text-slate-500 mt-8">
                Or email us directly at <a href="mailto:enterprise@openmeet.com" className="text-emerald-400 hover:underline">enterprise@openmeet.com</a>
              </p>
            </div>
          </CardGlass>
        </div>
      </section>

      <Footer />
    </div>
  );
}
