'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useState } from 'react';
import {
  Search, BookOpen, Video, Code, HelpCircle,
  ChevronRight, ArrowRight, PlayCircle, FileText,
  Users, Settings, CreditCard, Link2, Shield,
  Terminal, MessageCircle, Mail, HeadphonesIcon,
  Zap, Database, Lock, Key, UserPlus, Download,
  Upload, RefreshCw, AlertCircle, CheckCircle,
  Clock, Layers, Share2, Globe, Mic, Brain
} from 'lucide-react';

interface QuickLinkCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  color: string;
}

interface Article {
  title: string;
  category: string;
  readTime: string;
  link: string;
}

interface Category {
  name: string;
  icon: React.ReactNode;
  count: number;
}

interface VideoTutorial {
  title: string;
  duration: string;
  thumbnail: string;
  views: string;
}

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const quickLinks: QuickLinkCard[] = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Getting Started',
      description: 'Setup guides and first meeting tutorials',
      link: '#getting-started',
      color: 'from-purple-500/20 to-indigo-500/20'
    },
    {
      icon: <Video className="w-6 h-6" />,
      title: 'Video Tutorials',
      description: 'Step-by-step video walkthroughs',
      link: '#video-tutorials',
      color: 'from-teal-500/20 to-cyan-500/20'
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: 'API Documentation',
      description: 'Developer resources and guides',
      link: '#api-docs',
      color: 'from-orange-500/20 to-red-500/20'
    },
    {
      icon: <HelpCircle className="w-6 h-6" />,
      title: 'FAQs',
      description: 'Common questions answered',
      link: '#faqs',
      color: 'from-green-500/20 to-emerald-500/20'
    }
  ];

  const popularArticles: Article[] = [
    {
      title: 'How to connect Zoom',
      category: 'Integrations',
      readTime: '3 min read',
      link: '#'
    },
    {
      title: 'Understanding AI summaries',
      category: 'AI Features',
      readTime: '5 min read',
      link: '#'
    },
    {
      title: 'Setting up CRM integration',
      category: 'Integrations',
      readTime: '4 min read',
      link: '#'
    },
    {
      title: 'Managing team permissions',
      category: 'Admin',
      readTime: '6 min read',
      link: '#'
    },
    {
      title: 'Export options explained',
      category: 'Features',
      readTime: '3 min read',
      link: '#'
    },
    {
      title: 'Customizing AI meeting templates',
      category: 'AI Features',
      readTime: '4 min read',
      link: '#'
    },
    {
      title: 'Security best practices',
      category: 'Security',
      readTime: '7 min read',
      link: '#'
    },
    {
      title: 'Billing and subscription management',
      category: 'Billing',
      readTime: '5 min read',
      link: '#'
    }
  ];

  const resourceCategories: Category[] = [
    {
      name: 'Product Guides',
      icon: <BookOpen className="w-5 h-5" />,
      count: 42
    },
    {
      name: 'Admin & Settings',
      icon: <Settings className="w-5 h-5" />,
      count: 28
    },
    {
      name: 'Billing & Plans',
      icon: <CreditCard className="w-5 h-5" />,
      count: 15
    },
    {
      name: 'Integrations',
      icon: <Link2 className="w-5 h-5" />,
      count: 34
    },
    {
      name: 'Security & Privacy',
      icon: <Shield className="w-5 h-5" />,
      count: 19
    },
    {
      name: 'API & Developers',
      icon: <Terminal className="w-5 h-5" />,
      count: 26
    }
  ];

  const videoTutorials: VideoTutorial[] = [
    {
      title: 'Getting Started with OpenMeet',
      duration: '8:45',
      thumbnail: '/api/placeholder/360/200',
      views: '12.5K'
    },
    {
      title: 'Advanced AI Features Deep Dive',
      duration: '15:30',
      thumbnail: '/api/placeholder/360/200',
      views: '8.3K'
    },
    {
      title: 'Setting Up Team Collaboration',
      duration: '6:20',
      thumbnail: '/api/placeholder/360/200',
      views: '6.7K'
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)]">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Resources & Help Center
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              Everything you need to get the most out of OpenMeet. Find guides, tutorials, and answers to common questions.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for articles, guides, or tutorials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[var(--ff-bg-layer)] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--ff-purple-500)]"
              />
            </div>
          </div>

          {/* Quick Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {quickLinks.map((link, index) => (
              <div
                key={index}
                className="relative group cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${link.color} rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity`} />
                <div className="relative bg-[var(--ff-bg-layer)] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                  <div className="text-[var(--ff-purple-500)] mb-4">{link.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{link.title}</h3>
                  <p className="text-gray-400 text-sm mb-4">{link.description}</p>
                  <div className="flex items-center text-[var(--ff-purple-500)] text-sm font-medium">
                    <span>Explore</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Articles Section */}
      <section className="py-16 px-6 bg-[var(--ff-bg-layer)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">Popular Articles</h2>
            <button className="text-[var(--ff-purple-500)] hover:text-purple-400 font-medium flex items-center">
              View all articles
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularArticles.map((article, index) => (
              <div
                key={index}
                className="bg-[var(--ff-bg-dark)] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 bg-[var(--ff-purple-500)]/10 text-[var(--ff-purple-500)] text-xs rounded-md">
                        {article.category}
                      </span>
                      <span className="text-gray-500 text-xs flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {article.readTime}
                      </span>
                    </div>
                    <h3 className="text-white font-medium group-hover:text-[var(--ff-purple-500)] transition-colors">
                      {article.title}
                    </h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[var(--ff-purple-500)] transition-colors mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resource Categories */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8">Browse by Category</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resourceCategories.map((category, index) => (
              <div
                key={index}
                className="bg-[var(--ff-bg-layer)] border border-white/10 rounded-xl p-6 hover:border-[var(--ff-purple-500)]/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-[var(--ff-purple-500)]/10 rounded-lg text-[var(--ff-purple-500)] group-hover:bg-[var(--ff-purple-500)]/20 transition-colors">
                    {category.icon}
                  </div>
                  <span className="text-gray-500 text-sm">{category.count} articles</span>
                </div>
                <h3 className="text-lg font-semibold text-white group-hover:text-[var(--ff-purple-500)] transition-colors">
                  {category.name}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Tutorials Section */}
      <section className="py-16 px-6 bg-[var(--ff-bg-layer)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Watch our tutorials</h2>
              <p className="text-gray-400">Learn with step-by-step video guides</p>
            </div>
            <button className="text-[var(--ff-purple-500)] hover:text-purple-400 font-medium flex items-center">
              View all videos
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videoTutorials.map((video, index) => (
              <div
                key={index}
                className="bg-[var(--ff-bg-dark)] rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
              >
                <div className="relative aspect-video bg-gradient-to-br from-purple-900/20 to-indigo-900/20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                      <PlayCircle className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                    {video.duration}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-white font-medium mb-2 group-hover:text-[var(--ff-purple-500)] transition-colors">
                    {video.title}
                  </h3>
                  <div className="flex items-center text-gray-500 text-sm">
                    <span>{video.views} views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Need Help Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[var(--ff-purple-500)]/10 to-indigo-500/10 rounded-3xl p-12 border border-[var(--ff-purple-500)]/20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Still Need Help?</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Our support team is here to help you. Choose the best way to get in touch with us.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-[var(--ff-bg-dark)] border border-white/10 rounded-xl p-6 text-center hover:border-[var(--ff-purple-500)]/50 transition-all cursor-pointer">
                <div className="p-3 bg-[var(--ff-purple-500)]/10 rounded-lg w-fit mx-auto mb-4">
                  <Mail className="w-6 h-6 text-[var(--ff-purple-500)]" />
                </div>
                <h3 className="text-white font-semibold mb-2">Contact Support</h3>
                <p className="text-gray-400 text-sm mb-4">Get help via email within 24 hours</p>
                <button className="text-[var(--ff-purple-500)] font-medium text-sm hover:text-purple-400 transition-colors">
                  Send email →
                </button>
              </div>

              <div className="bg-[var(--ff-bg-dark)] border border-white/10 rounded-xl p-6 text-center hover:border-[var(--ff-purple-500)]/50 transition-all cursor-pointer">
                <div className="p-3 bg-[var(--ff-purple-500)]/10 rounded-lg w-fit mx-auto mb-4">
                  <Users className="w-6 h-6 text-[var(--ff-purple-500)]" />
                </div>
                <h3 className="text-white font-semibold mb-2">Community Forum</h3>
                <p className="text-gray-400 text-sm mb-4">Connect with other users and experts</p>
                <button className="text-[var(--ff-purple-500)] font-medium text-sm hover:text-purple-400 transition-colors">
                  Join forum →
                </button>
              </div>

              <div className="bg-[var(--ff-bg-dark)] border border-white/10 rounded-xl p-6 text-center hover:border-[var(--ff-purple-500)]/50 transition-all cursor-pointer">
                <div className="p-3 bg-[var(--ff-purple-500)]/10 rounded-lg w-fit mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-[var(--ff-purple-500)]" />
                </div>
                <h3 className="text-white font-semibold mb-2">Live Chat</h3>
                <p className="text-gray-400 text-sm mb-4">Chat with our support team instantly</p>
                <button className="text-[var(--ff-purple-500)] font-medium text-sm hover:text-purple-400 transition-colors">
                  Start chat →
                </button>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-400 text-sm">
                Enterprise customers can also reach us at{' '}
                <a href="tel:1-800-NEBULA" className="text-[var(--ff-purple-500)] hover:text-purple-400">
                  1-800-NEBULA
                </a>{' '}
                or through your dedicated account manager
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-16 px-6 bg-[var(--ff-bg-layer)]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8">Additional Resources</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[var(--ff-bg-dark)] border border-white/10 rounded-xl p-6">
              <Download className="w-8 h-8 text-[var(--ff-purple-500)] mb-4" />
              <h3 className="text-white font-semibold mb-2">Downloads</h3>
              <p className="text-gray-400 text-sm mb-4">Get desktop and mobile apps</p>
              <a href="#" className="text-[var(--ff-purple-500)] text-sm font-medium hover:text-purple-400">
                View downloads →
              </a>
            </div>

            <div className="bg-[var(--ff-bg-dark)] border border-white/10 rounded-xl p-6">
              <FileText className="w-8 h-8 text-[var(--ff-purple-500)] mb-4" />
              <h3 className="text-white font-semibold mb-2">Release Notes</h3>
              <p className="text-gray-400 text-sm mb-4">Latest updates and features</p>
              <a href="#" className="text-[var(--ff-purple-500)] text-sm font-medium hover:text-purple-400">
                Read changelog →
              </a>
            </div>

            <div className="bg-[var(--ff-bg-dark)] border border-white/10 rounded-xl p-6">
              <AlertCircle className="w-8 h-8 text-[var(--ff-purple-500)] mb-4" />
              <h3 className="text-white font-semibold mb-2">System Status</h3>
              <p className="text-gray-400 text-sm mb-4">Check service availability</p>
              <a href="#" className="text-[var(--ff-purple-500)] text-sm font-medium hover:text-purple-400">
                View status →
              </a>
            </div>

            <div className="bg-[var(--ff-bg-dark)] border border-white/10 rounded-xl p-6">
              <HeadphonesIcon className="w-8 h-8 text-[var(--ff-purple-500)] mb-4" />
              <h3 className="text-white font-semibold mb-2">Webinars</h3>
              <p className="text-gray-400 text-sm mb-4">Join live training sessions</p>
              <a href="#" className="text-[var(--ff-purple-500)] text-sm font-medium hover:text-purple-400">
                Register now →
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}