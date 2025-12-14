'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  ArrowRight,
  ChevronRight,
  User,
  Tag,
  TrendingUp,
  Mail,
  Loader2
} from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  slug: string;
  imageUrl?: string;
  featured?: boolean;
}

const categories = [
  'All',
  'Product Updates',
  'AI & ML',
  'Sales',
  'Tips & Tricks',
  'Customer Stories'
];

const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "Introducing Multi-Provider AI: Choose Your Perfect AI Partner",
    excerpt: "Choose from OpenAI, Anthropic, vLLM, Ollama, or LM Studio. We believe in giving you the flexibility to use the AI provider that best fits your needs and budget.",
    category: "Product Updates",
    author: "Sarah Chen",
    date: "Nov 25, 2024",
    readTime: "5 min",
    slug: "multi-provider-ai",
    featured: true
  },
  {
    id: 2,
    title: "How AI Meeting Summaries Are Revolutionizing Sales Teams",
    excerpt: "Discover how top-performing sales teams are using AI-powered meeting intelligence to close deals faster and improve customer relationships.",
    category: "Sales",
    author: "Michael Rodriguez",
    date: "Nov 23, 2024",
    readTime: "7 min",
    slug: "ai-meeting-summaries-sales"
  },
  {
    id: 3,
    title: "5 Tips to Get the Most Out of Your Meeting Transcriptions",
    excerpt: "Learn practical strategies to transform your meeting transcriptions into actionable insights that drive productivity and team alignment.",
    category: "Tips & Tricks",
    author: "Emily Johnson",
    date: "Nov 20, 2024",
    readTime: "4 min",
    slug: "meeting-transcription-tips"
  },
  {
    id: 4,
    title: "Customer Success Story: How TechCorp Saved 15 Hours Per Week",
    excerpt: "See how TechCorp transformed their meeting culture and reclaimed valuable time using OpenMeet's intelligent meeting assistant.",
    category: "Customer Stories",
    author: "David Park",
    date: "Nov 18, 2024",
    readTime: "6 min",
    slug: "techcorp-success-story"
  },
  {
    id: 5,
    title: "The Future of Meeting Intelligence: Trends for 2025",
    excerpt: "Explore emerging trends in AI-powered meeting technology and what they mean for the future of workplace collaboration.",
    category: "AI & ML",
    author: "Lisa Wang",
    date: "Nov 15, 2024",
    readTime: "8 min",
    slug: "meeting-intelligence-trends-2025"
  },
  {
    id: 6,
    title: "Building Better Action Items with AI-Powered Insights",
    excerpt: "Transform vague meeting discussions into clear, actionable tasks with our advanced AI analysis features.",
    category: "Product Updates",
    author: "Alex Thompson",
    date: "Nov 12, 2024",
    readTime: "5 min",
    slug: "ai-powered-action-items"
  }
];

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);

  const featuredPost = blogPosts.find(post => post.featured);
  const regularPosts = blogPosts.filter(post => !post.featured);

  const filteredPosts = selectedCategory === 'All'
    ? regularPosts
    : regularPosts.filter(post => post.category === selectedCategory);

  const displayedPosts = showAllPosts ? filteredPosts : filteredPosts.slice(0, 6);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubscribing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubscribing(false);
    setEmail('');
    // In production, you'd handle the actual subscription here
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Product Updates': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'AI & ML': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'Sales': 'bg-green-500/10 text-green-400 border-green-500/20',
      'Tips & Tricks': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'Customer Stories': 'bg-pink-500/10 text-pink-400 border-pink-500/20'
    };
    return colors[category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  return (
    <div className="min-h-screen bg-[#000211]">
      <Navigation />

      <main className="relative pt-24 pb-20">
        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 text-white">
              The OpenMeet Blog
            </h1>
            <p className="text-xl text-gray-400">
              Insights on meeting intelligence, AI, and productivity
            </p>
          </div>
        </section>

        {/* Featured Post */}
        {featuredPost && (
          <section className="container mx-auto px-4 mb-16">
            <div className="max-w-7xl mx-auto">
              <Link href={`/blog/${featuredPost.slug}`}>
                <CardGlass className="group cursor-pointer overflow-hidden hover:border-purple-500/30 transition-all duration-300">
                  <div className="grid lg:grid-cols-2 gap-8">
                    {/* Image Placeholder */}
                    <div className="relative h-64 lg:h-full min-h-[300px] bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
                      </div>
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          Featured
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 flex flex-col justify-center">
                      <div className="mb-4">
                        <span className={cn(
                          "inline-block px-3 py-1 rounded-full text-xs font-medium border",
                          getCategoryColor(featuredPost.category)
                        )}>
                          {featuredPost.category}
                        </span>
                      </div>

                      <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-white group-hover:text-purple-400 transition-colors">
                        {featuredPost.title}
                      </h2>

                      <p className="text-gray-400 mb-6 text-lg line-clamp-3">
                        {featuredPost.excerpt}
                      </p>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500" />
                          <span>{featuredPost.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{featuredPost.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{featuredPost.readTime} read</span>
                        </div>
                      </div>

                      <div className="mt-6">
                        <span className="text-purple-400 font-medium group-hover:gap-3 flex items-center gap-2 transition-all">
                          Read article
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                </CardGlass>
              </Link>
            </div>
          </section>
        )}

        {/* Category Filter */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    selectedCategory === category
                      ? "bg-purple-500 text-white"
                      : "bg-[#0a0a1a] text-gray-400 border border-gray-800 hover:border-purple-500/50 hover:text-white"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Blog Post Grid */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <CardGlass className="group h-full cursor-pointer hover:border-purple-500/30 transition-all duration-300">
                    {/* Image Placeholder */}
                    <div className="relative h-48 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-t-lg overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="mb-3">
                        <span className={cn(
                          "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          getCategoryColor(post.category)
                        )}>
                          {post.category}
                        </span>
                      </div>

                      <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-purple-400 transition-colors line-clamp-2">
                        {post.title}
                      </h3>

                      <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500" />
                          <span>{post.author}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>{post.date}</span>
                          <span className="text-gray-600">•</span>
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                    </div>
                  </CardGlass>
                </Link>
              ))}
            </div>

            {/* Load More Button */}
            {filteredPosts.length > 6 && !showAllPosts && (
              <div className="mt-12 text-center">
                <Button
                  onClick={() => setShowAllPosts(true)}
                  variant="glassmorphism"
                  size="lg"
                  className="group"
                >
                  Load More Articles
                  <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <CardGlass className="p-8 lg:p-12 text-center">
              <div className="mb-2">
                <Mail className="w-12 h-12 mx-auto text-purple-400 mb-4" />
              </div>
              <h2 className="text-3xl font-bold mb-3 text-white">
                Stay updated
              </h2>
              <p className="text-gray-400 mb-8">
                Get the latest insights on meeting intelligence and AI delivered to your inbox
              </p>

              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 px-4 py-3 bg-[#0a0a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <Button
                  type="submit"
                  variant="gradient-primary"
                  size="lg"
                  disabled={isSubscribing}
                  className="min-w-[140px]"
                >
                  {isSubscribing ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    'Subscribe'
                  )}
                </Button>
              </form>

              <p className="mt-4 text-xs text-gray-500">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </CardGlass>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}