'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Shield,
  Lock,
  Key,
  Server,
  Eye,
  FileCheck,
  Award,
  CheckCircle,
  Globe,
  Database,
  UserCheck,
  Activity,
  AlertCircle,
  FileText,
  ArrowRight,
  Building2,
  Cloud,
  ShieldCheck
} from 'lucide-react';

const SecurityPage = () => {
  const certifications = [
    {
      name: 'SOC 2 Type II',
      description: 'Annual third-party audits',
      icon: Award,
      status: 'certified'
    },
    {
      name: 'HIPAA Compliant',
      description: 'Healthcare data protection',
      icon: FileCheck,
      status: 'certified'
    },
    {
      name: 'GDPR Ready',
      description: 'EU data protection standards',
      icon: Globe,
      status: 'certified'
    },
    {
      name: 'ISO 27001',
      description: 'Information security management',
      icon: ShieldCheck,
      status: 'certified'
    },
    {
      name: 'CCPA Compliant',
      description: 'California privacy rights',
      icon: UserCheck,
      status: 'certified'
    },
    {
      name: 'FedRAMP Ready',
      description: 'US government standards',
      icon: Building2,
      status: 'ready'
    }
  ];

  const securityFeatures = [
    {
      category: 'Data Encryption',
      icon: Lock,
      features: [
        { title: 'AES-256-GCM at rest', description: 'Military-grade encryption for stored data' },
        { title: 'TLS 1.3 in transit', description: 'Latest encryption protocols for data transfer' },
        { title: 'End-to-end encryption', description: 'Zero-knowledge architecture available' },
        { title: 'Key management', description: 'Hardware security modules (HSM) for key storage' }
      ]
    },
    {
      category: 'Access Controls',
      icon: Key,
      features: [
        { title: 'Role-based access (RBAC)', description: 'Granular permission management' },
        { title: 'Multi-factor authentication', description: 'TOTP, SMS, and hardware key support' },
        { title: 'SSO/SAML integration', description: 'Seamless enterprise authentication' },
        { title: 'IP allowlisting', description: 'Restrict access by network location' }
      ]
    },
    {
      category: 'Infrastructure',
      icon: Server,
      features: [
        { title: 'AWS GovCloud available', description: 'US government compliance requirements' },
        { title: 'Data residency options', description: 'Choose where your data is stored' },
        { title: 'Private cloud deployment', description: 'On-premise and hybrid options' },
        { title: '99.99% uptime SLA', description: 'Enterprise-grade reliability' }
      ]
    },
    {
      category: 'Monitoring',
      icon: Eye,
      features: [
        { title: '24/7 security monitoring', description: 'Round-the-clock security operations center' },
        { title: 'Real-time threat detection', description: 'AI-powered anomaly detection' },
        { title: 'Comprehensive audit logging', description: 'Complete activity tracking and retention' },
        { title: 'Incident response team', description: 'Expert security team on standby' }
      ]
    }
  ];

  const trustBadges = [
    { icon: Shield, label: 'Bank-level Security' },
    { icon: Lock, label: '256-bit Encryption' },
    { icon: Activity, label: '99.99% Uptime' }
  ];

  return (
    <div className="min-h-screen bg-[--ff-bg-dark]">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-[--ff-purple-500]/10 rounded-2xl">
              <Shield className="w-16 h-16 text-[--ff-purple-500]" />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Enterprise-Grade Security
          </h1>

          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
            Your data security is our top priority. We employ industry-leading security measures
            and maintain the highest compliance standards to protect your information.
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-8">
            {trustBadges.map((badge, index) => (
              <div key={index} className="flex items-center gap-3 bg-[--ff-bg-layer] px-6 py-3 rounded-full border border-white/10">
                <badge.icon className="w-5 h-5 text-[--ff-purple-500]" />
                <span className="text-white font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Certifications */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Compliance Certifications
            </h2>
            <p className="text-xl text-gray-400">
              Meeting and exceeding global compliance standards
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certifications.map((cert, index) => (
              <div
                key={index}
                className="bg-[--ff-bg-layer] border border-white/10 rounded-xl p-8 hover:border-[--ff-purple-500]/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-[--ff-purple-500]/10 rounded-xl">
                    <cert.icon className="w-8 h-8 text-[--ff-purple-500]" />
                  </div>
                  {cert.status === 'certified' ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <div className="px-3 py-1 bg-yellow-500/10 rounded-full">
                      <span className="text-xs text-yellow-500 font-medium">Ready</span>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-semibold text-white mb-2">
                  {cert.name}
                </h3>
                <p className="text-gray-400">
                  {cert.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Security Features
            </h2>
            <p className="text-xl text-gray-400">
              Comprehensive security measures to protect your data
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {securityFeatures.map((category, index) => (
              <div
                key={index}
                className="bg-[--ff-bg-layer] border border-white/10 rounded-xl p-8"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-[--ff-purple-500]/10 rounded-xl">
                    <category.icon className="w-6 h-6 text-[--ff-purple-500]" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    {category.category}
                  </h3>
                </div>

                <div className="space-y-4">
                  {category.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex gap-4">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-white font-semibold mb-1">
                          {feature.title}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Privacy Section */}
      <section className="py-20 px-6 bg-[--ff-bg-layer]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Data Privacy
            </h2>
            <p className="text-xl text-gray-400">
              Complete transparency about your data handling
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[--ff-bg-dark] border border-white/10 rounded-xl p-8">
              <div className="p-3 bg-[--ff-purple-500]/10 rounded-xl mb-4 inline-block">
                <Database className="w-8 h-8 text-[--ff-purple-500]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Data Storage
              </h3>
              <p className="text-gray-400 mb-4">
                Your data is stored in secure, SOC 2 certified data centers with geographic redundancy.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  US, EU, and APAC regions
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Data residency controls
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Automated backups
                </li>
              </ul>
            </div>

            <div className="bg-[--ff-bg-dark] border border-white/10 rounded-xl p-8">
              <div className="p-3 bg-[--ff-purple-500]/10 rounded-xl mb-4 inline-block">
                <FileText className="w-8 h-8 text-[--ff-purple-500]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Retention Policies
              </h3>
              <p className="text-gray-400 mb-4">
                Flexible data retention policies to meet your compliance requirements.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Customizable retention periods
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Automated data purging
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Legal hold capabilities
                </li>
              </ul>
            </div>

            <div className="bg-[--ff-bg-dark] border border-white/10 rounded-xl p-8">
              <div className="p-3 bg-[--ff-purple-500]/10 rounded-xl mb-4 inline-block">
                <Cloud className="w-8 h-8 text-[--ff-purple-500]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Data Deletion
              </h3>
              <p className="text-gray-400 mb-4">
                Complete and verifiable data deletion upon request.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  30-day deletion guarantee
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Cryptographic erasure
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Deletion certificates
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Responsible Disclosure */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-[--ff-purple-500]/10 to-transparent border border-[--ff-purple-500]/30 rounded-2xl p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <AlertCircle className="w-8 h-8 text-[--ff-purple-500]" />
                  <h2 className="text-3xl font-bold text-white">
                    Responsible Disclosure
                  </h2>
                </div>

                <p className="text-gray-400 mb-6">
                  We take security vulnerabilities seriously and appreciate the security research
                  community's efforts in responsibly disclosing potential issues.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <h3 className="text-white font-semibold mb-1">
                        Bug Bounty Program
                      </h3>
                      <p className="text-sm text-gray-400">
                        Rewards up to $10,000 for critical vulnerabilities
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <h3 className="text-white font-semibold mb-1">
                        Security Team Response
                      </h3>
                      <p className="text-sm text-gray-400">
                        24-hour response time for security reports
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <h3 className="text-white font-semibold mb-1">
                        Hall of Fame
                      </h3>
                      <p className="text-sm text-gray-400">
                        Recognition for responsible disclosure contributors
                      </p>
                    </div>
                  </div>
                </div>

                <button className="mt-8 px-6 py-3 bg-[--ff-purple-500]/10 border border-[--ff-purple-500]/30 rounded-lg text-[--ff-purple-500] font-medium hover:bg-[--ff-purple-500]/20 transition-all duration-300">
                  Report a Vulnerability
                </button>
              </div>

              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-[--ff-purple-500]/20 blur-3xl" />
                  <div className="relative bg-[--ff-bg-dark] border border-[--ff-purple-500]/30 rounded-2xl p-8">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Security Contact
                    </h3>
                    <p className="text-gray-400 mb-2">
                      Email: security@openmeet.com
                    </p>
                    <p className="text-gray-400 mb-2">
                      PGP Key: Available on request
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                      Please encrypt sensitive information
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Need a Security Review?
          </h2>

          <p className="text-xl text-gray-400 mb-12">
            Our security team is ready to provide detailed documentation,
            answer your questions, and support your security assessment process.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-[--ff-purple-500] text-white rounded-lg font-medium hover:bg-[--ff-purple-500]/90 transition-all duration-300 flex items-center justify-center gap-2">
              Request Security Documentation
              <ArrowRight className="w-5 h-5" />
            </button>

            <button className="px-8 py-4 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-all duration-300 border border-white/20">
              Schedule Security Call
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-8">
            Typical response time: 1 business day
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SecurityPage;