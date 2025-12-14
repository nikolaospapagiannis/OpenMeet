'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import {
  Phone,
  HelpCircle,
  Newspaper,
  Mail,
  MapPin,
  Twitter,
  Linkedin,
  Github,
  Youtube,
  Send,
  Calendar,
  ArrowRight,
  MessageSquare,
  Building2,
  ChevronRight,
  Users,
  FileText,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: 'General',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.message.trim()) {
      errors.message = 'Message is required';
    } else if (formData.message.length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Reset form after successful submission
    setFormData({
      name: '',
      email: '',
      company: '',
      subject: 'General',
      message: ''
    });
    setFormErrors({});
    setIsSubmitting(false);

    // Show success message (in production, this would be a toast notification)
    alert('Thank you for your message! We\'ll get back to you soon.');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-[#000211]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 gradient-hero"></div>
        <div className="container-ff relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="heading-xl text-white mb-6">
              Get in Touch
            </h1>
            <p className="paragraph-l text-[#cbd5e1]">
              We'd love to hear from you. Whether you have a question about features,
              pricing, or anything else, our team is ready to answer all your questions.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options Grid */}
      <section className="py-16 px-4">
        <div className="container-ff">
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {/* Sales Card */}
            <CardGlass variant="elevated" hover padding="md">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#7a5af8]/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="text-[#7a5af8]" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="heading-s text-white mb-2">Sales</h3>
                  <p className="paragraph-s text-[#94a3b8] mb-4">
                    Talk to our sales team about enterprise plans and custom solutions
                  </p>
                  <a href="mailto:sales@openmeet.com" className="text-[#7a5af8] hover:text-[#9b7dfb] mb-4 block">
                    sales@openmeet.com
                  </a>
                  <Link href="/demo">
                    <Button
                      variant="gradient-primary"
                      size="sm"
                      className="w-full"
                    >
                      <Calendar size={16} className="mr-2" />
                      Schedule Demo
                    </Button>
                  </Link>
                </div>
              </div>
            </CardGlass>

            {/* Support Card */}
            <CardGlass variant="elevated" hover padding="md">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#7a5af8]/10 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="text-[#7a5af8]" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="heading-s text-white mb-2">Support</h3>
                  <p className="paragraph-s text-[#94a3b8] mb-4">
                    Get help with your account or troubleshoot technical issues
                  </p>
                  <a href="mailto:support@openmeet.com" className="text-[#7a5af8] hover:text-[#9b7dfb] mb-4 block">
                    support@openmeet.com
                  </a>
                  <Button
                    variant="glassmorphism"
                    size="sm"
                    className="w-full"
                  >
                    <MessageSquare size={16} className="mr-2" />
                    Help Center
                  </Button>
                </div>
              </div>
            </CardGlass>

            {/* Press Card */}
            <CardGlass variant="elevated" hover padding="md">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#7a5af8]/10 flex items-center justify-center flex-shrink-0">
                  <Newspaper className="text-[#7a5af8]" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="heading-s text-white mb-2">Press</h3>
                  <p className="paragraph-s text-[#94a3b8] mb-4">
                    Media inquiries and press resources for journalists
                  </p>
                  <a href="mailto:press@openmeet.com" className="text-[#7a5af8] hover:text-[#9b7dfb] mb-4 block">
                    press@openmeet.com
                  </a>
                  <Button
                    variant="glassmorphism"
                    size="sm"
                    className="w-full"
                  >
                    <FileText size={16} className="mr-2" />
                    Press Kit
                  </Button>
                </div>
              </div>
            </CardGlass>
          </div>

          {/* Contact Form and Office Info */}
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <CardGlass variant="elevated" padding="lg">
              <h2 className="heading-m text-white mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[#cbd5e1] mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg bg-[#0a0a1a]/60 border transition-colors",
                        "text-white placeholder-[#64748b]",
                        "focus:outline-none focus:ring-2 focus:ring-[#7a5af8] focus:border-transparent",
                        formErrors.name
                          ? "border-red-500"
                          : "border-[#1e293b] hover:border-[#334155]"
                      )}
                      placeholder="Your name"
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#cbd5e1] mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg bg-[#0a0a1a]/60 border transition-colors",
                        "text-white placeholder-[#64748b]",
                        "focus:outline-none focus:ring-2 focus:ring-[#7a5af8] focus:border-transparent",
                        formErrors.email
                          ? "border-red-500"
                          : "border-[#1e293b] hover:border-[#334155]"
                      )}
                      placeholder="your@email.com"
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-[#cbd5e1] mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg bg-[#0a0a1a]/60 border border-[#1e293b] hover:border-[#334155] transition-colors text-white placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#7a5af8] focus:border-transparent"
                    placeholder="Your company"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-[#cbd5e1] mb-2">
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg bg-[#0a0a1a]/60 border border-[#1e293b] hover:border-[#334155] transition-colors text-white focus:outline-none focus:ring-2 focus:ring-[#7a5af8] focus:border-transparent"
                  >
                    <option value="General">General Inquiry</option>
                    <option value="Sales">Sales</option>
                    <option value="Self-Hosted">Self-Hosted Deployment</option>
                    <option value="White-Label">White-Label Solution</option>
                    <option value="Enterprise">Enterprise Features</option>
                    <option value="Support">Support</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-[#cbd5e1] mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={6}
                    className={cn(
                      "w-full px-4 py-3 rounded-lg bg-[#0a0a1a]/60 border transition-colors resize-none",
                      "text-white placeholder-[#64748b]",
                      "focus:outline-none focus:ring-2 focus:ring-[#7a5af8] focus:border-transparent",
                      formErrors.message
                        ? "border-red-500"
                        : "border-[#1e293b] hover:border-[#334155]"
                    )}
                    placeholder="Tell us how we can help..."
                  />
                  {formErrors.message && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="gradient-primary"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={20} className="mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </CardGlass>

            {/* Right Column - Office Info and Additional Resources */}
            <div className="space-y-8">
              {/* Office Location */}
              <CardGlass variant="elevated" padding="md">
                <h3 className="heading-s text-white mb-4">Our Office</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-[#7a5af8] mt-1" size={20} />
                    <div>
                      <p className="text-white font-medium mb-1">San Francisco HQ</p>
                      <p className="paragraph-s text-[#94a3b8]">
                        548 Market St, Suite 62820<br />
                        San Francisco, CA 94104<br />
                        United States
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Building2 className="text-[#7a5af8] mt-1" size={20} />
                    <div>
                      <p className="text-white font-medium mb-1">Office Hours</p>
                      <p className="paragraph-s text-[#94a3b8]">
                        Monday - Friday<br />
                        9:00 AM - 6:00 PM PST
                      </p>
                    </div>
                  </div>
                </div>
              </CardGlass>

              {/* Social Links */}
              <CardGlass variant="elevated" padding="md">
                <h3 className="heading-s text-white mb-4">Connect With Us</h3>
                <div className="flex gap-4">
                  <a
                    href="https://twitter.com/nebulaai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-lg bg-[#0a0a1a]/60 border border-[#1e293b] hover:border-[#7a5af8] hover:bg-[#7a5af8]/10 flex items-center justify-center transition-all"
                  >
                    <Twitter size={20} className="text-[#cbd5e1]" />
                  </a>
                  <a
                    href="https://linkedin.com/company/openmeet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-lg bg-[#0a0a1a]/60 border border-[#1e293b] hover:border-[#7a5af8] hover:bg-[#7a5af8]/10 flex items-center justify-center transition-all"
                  >
                    <Linkedin size={20} className="text-[#cbd5e1]" />
                  </a>
                  <a
                    href="https://github.com/openmeet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-lg bg-[#0a0a1a]/60 border border-[#1e293b] hover:border-[#7a5af8] hover:bg-[#7a5af8]/10 flex items-center justify-center transition-all"
                  >
                    <Github size={20} className="text-[#cbd5e1]" />
                  </a>
                  <a
                    href="https://youtube.com/@nebulaai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-lg bg-[#0a0a1a]/60 border border-[#1e293b] hover:border-[#7a5af8] hover:bg-[#7a5af8]/10 flex items-center justify-center transition-all"
                  >
                    <Youtube size={20} className="text-[#cbd5e1]" />
                  </a>
                </div>
              </CardGlass>

              {/* FAQ Quick Links */}
              <CardGlass variant="elevated" padding="md">
                <h3 className="heading-s text-white mb-4">Frequently Asked Questions</h3>
                <div className="space-y-3">
                  <Link
                    href="/faq/getting-started"
                    className="flex items-center justify-between group"
                  >
                    <span className="text-[#cbd5e1] group-hover:text-[#7a5af8] transition-colors">
                      How do I get started?
                    </span>
                    <ChevronRight size={16} className="text-[#64748b] group-hover:text-[#7a5af8] group-hover:translate-x-1 transition-all" />
                  </Link>
                  <Link
                    href="/faq/pricing"
                    className="flex items-center justify-between group"
                  >
                    <span className="text-[#cbd5e1] group-hover:text-[#7a5af8] transition-colors">
                      What pricing plans are available?
                    </span>
                    <ChevronRight size={16} className="text-[#64748b] group-hover:text-[#7a5af8] group-hover:translate-x-1 transition-all" />
                  </Link>
                  <Link
                    href="/faq/security"
                    className="flex items-center justify-between group"
                  >
                    <span className="text-[#cbd5e1] group-hover:text-[#7a5af8] transition-colors">
                      How secure is my data?
                    </span>
                    <ChevronRight size={16} className="text-[#64748b] group-hover:text-[#7a5af8] group-hover:translate-x-1 transition-all" />
                  </Link>
                  <Link
                    href="/faq/integrations"
                    className="flex items-center justify-between group"
                  >
                    <span className="text-[#cbd5e1] group-hover:text-[#7a5af8] transition-colors">
                      What integrations do you support?
                    </span>
                    <ChevronRight size={16} className="text-[#64748b] group-hover:text-[#7a5af8] group-hover:translate-x-1 transition-all" />
                  </Link>
                </div>
                <Link
                  href="/faq"
                  className="inline-flex items-center text-[#7a5af8] hover:text-[#9b7dfb] mt-4 font-medium"
                >
                  View all FAQs
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </CardGlass>

              {/* Additional Resources */}
              <CardGlass variant="elevated" padding="md">
                <h3 className="heading-s text-white mb-4">Quick Resources</h3>
                <div className="space-y-3">
                  <a
                    href="/api-docs"
                    className="flex items-center gap-3 text-[#cbd5e1] hover:text-[#7a5af8] transition-colors"
                  >
                    <FileText size={18} />
                    <span>API Documentation</span>
                  </a>
                  <a
                    href="/security"
                    className="flex items-center gap-3 text-[#cbd5e1] hover:text-[#7a5af8] transition-colors"
                  >
                    <Shield size={18} />
                    <span>Security & Compliance</span>
                  </a>
                  <a
                    href="/partners"
                    className="flex items-center gap-3 text-[#cbd5e1] hover:text-[#7a5af8] transition-colors"
                  >
                    <Users size={18} />
                    <span>Partner Program</span>
                  </a>
                </div>
              </CardGlass>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}