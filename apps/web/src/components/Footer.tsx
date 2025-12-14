'use client';

import Link from 'next/link';
import { Twitter, Linkedin, Youtube, Facebook, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#000211] border-t border-[#1e293b] mt-20">
      <div className="container-ff py-17">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
          {/* Product */}
          <div>
            <h3 className="heading-xss text-[#94a3b8] mb-4">Product</h3>
            <ul className="space-y-3">
              <FooterLink href="/features">Features</FooterLink>
              <FooterLink href="/self-hosted">Self-Hosted</FooterLink>
              <FooterLink href="/pricing">Pricing</FooterLink>
              <FooterLink href="/white-label">White-Label</FooterLink>
              <FooterLink href="/enterprise">Enterprise</FooterLink>
              <FooterLink href="/developers">Developer API</FooterLink>
              <FooterLink href="/security">Security</FooterLink>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="heading-xss text-[#94a3b8] mb-4">Solutions</h3>
            <ul className="space-y-3">
              <FooterLink href="/solutions/healthcare">Healthcare</FooterLink>
              <FooterLink href="/solutions/legal">Legal</FooterLink>
              <FooterLink href="/solutions/finance">Financial Services</FooterLink>
              <FooterLink href="/solutions/government">Government</FooterLink>
              <FooterLink href="/solutions/sales">Sales Teams</FooterLink>
              <FooterLink href="/solutions/engineering">Engineering</FooterLink>
              <FooterLink href="/solutions/product">Product & Research</FooterLink>
            </ul>
          </div>

          {/* Integrations */}
          <div>
            <h3 className="heading-xss text-[#94a3b8] mb-4">Integrations</h3>
            <ul className="space-y-3">
              <FooterLink href="/integrations/zoom">Zoom</FooterLink>
              <FooterLink href="/integrations/meet">Google Meet</FooterLink>
              <FooterLink href="/integrations/teams">Microsoft Teams</FooterLink>
              <FooterLink href="/integrations/slack">Slack</FooterLink>
              <FooterLink href="/integrations/salesforce">Salesforce</FooterLink>
              <FooterLink href="/integrations/hubspot">HubSpot</FooterLink>
              <FooterLink href="/integrations">View All</FooterLink>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="heading-xss text-[#94a3b8] mb-4">Company</h3>
            <ul className="space-y-3">
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href="/careers">Careers</FooterLink>
              <FooterLink href="/press">Press</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
              <FooterLink href="/partners">Partners</FooterLink>
              <FooterLink href="/affiliates">Affiliates</FooterLink>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="heading-xss text-[#94a3b8] mb-4">Resources</h3>
            <ul className="space-y-3">
              <FooterLink href="/blog">Blog</FooterLink>
              <FooterLink href="/docs">Documentation</FooterLink>
              <FooterLink href="/help">Help Center</FooterLink>
              <FooterLink href="/customers">Customer Stories</FooterLink>
              <FooterLink href="/compliance">Compliance</FooterLink>
              <FooterLink href="/changelog">Changelog</FooterLink>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-[#1e293b]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-[#7a5af8] via-[#6938ef] to-[#4f46e5] rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"></div>
                <span className="text-white font-bold text-sm relative z-10">N</span>
              </div>
              <span className="paragraph-m text-white font-semibold">OpenMeet<span className="text-[#7a5af8]">AI</span></span>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-5">
              <SocialLink href="https://twitter.com/nebulaai" icon={<Twitter size={18} />} />
              <SocialLink href="https://www.linkedin.com/company/openmeet" icon={<Linkedin size={18} />} />
              <SocialLink href="https://github.com/openmeet" icon={<Youtube size={18} />} />
            </div>

            {/* Copyright */}
            <div className="paragraph-s text-[#94a3b8]">
              © 2025 OpenMeet, Inc. All rights reserved.
            </div>
          </div>

          {/* Legal Links */}
          <div className="mt-6 flex flex-wrap justify-center gap-6">
            <Link href="/privacy" className="paragraph-s text-[#94a3b8] hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="paragraph-s text-[#94a3b8] hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookies" className="paragraph-s text-[#94a3b8] hover:text-white transition-colors">
              Cookie Policy
            </Link>
            <Link href="/gdpr" className="paragraph-s text-[#94a3b8] hover:text-white transition-colors">
              GDPR
            </Link>
            <Link href="/ccpa" className="paragraph-s text-[#94a3b8] hover:text-white transition-colors">
              CCPA
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="paragraph-s text-[#cbd5e1] hover:text-white transition-colors block">
        {children}
      </Link>
    </li>
  );
}

function SocialLink({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[#94a3b8] hover:text-white transition-colors"
      target="_blank"
      rel="noopener noreferrer"
    >
      {icon}
    </Link>
  );
}
