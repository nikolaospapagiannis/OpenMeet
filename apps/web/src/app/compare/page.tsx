'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { Check, X, ArrowRight, Star, TrendingUp, Shield, Globe, Zap } from 'lucide-react'

export default function ComparePage() {
  const competitorCards = [
    {
      name: 'Competitor A',
      slug: 'competitor-a',
      description: 'Popular but limited features',
      savings: '30-50% cheaper',
      highlights: ['More languages', 'Better API', 'Self-hosting']
    },
    {
      name: 'Otter.ai',
      slug: 'otter',
      description: 'Basic transcription only',
      savings: '40-60% cheaper',
      highlights: ['Video recording', 'Multi-language', 'Advanced AI']
    },
    {
      name: 'Gong',
      slug: 'gong',
      description: 'Enterprise-only pricing',
      savings: '80-90% cheaper',
      highlights: ['No minimums', 'Transparent pricing', 'Same features']
    },
    {
      name: 'Chorus',
      slug: 'chorus',
      description: 'Limited to sales teams',
      savings: '70-85% cheaper',
      highlights: ['All industries', 'Flexible plans', 'Modern tech']
    }
  ]

  const comparisonData = [
    {
      category: 'Pricing',
      features: [
        {
          name: 'Starting Price',
          nebulaAi: '$8/month',
          competitor: '$10/month',
          otter: '$16.99/month',
          gong: '$100+/user',
          nebulaAiWins: true
        },
        {
          name: 'Free Plan',
          nebulaAi: true,
          competitor: true,
          otter: true,
          gong: false,
          nebulaAiWins: true
        },
        {
          name: 'Transparent Pricing',
          nebulaAi: true,
          competitor: true,
          otter: true,
          gong: false,
          nebulaAiWins: true
        },
        {
          name: 'No Minimum Seats',
          nebulaAi: true,
          competitor: true,
          otter: true,
          gong: false,
          nebulaAiWins: true
        }
      ]
    },
    {
      category: 'Core Features',
      features: [
        {
          name: 'Transcription Accuracy',
          nebulaAi: '98%',
          competitor: '95%',
          otter: '90%',
          gong: '95%',
          nebulaAiWins: true
        },
        {
          name: 'Languages Supported',
          nebulaAi: '150+',
          competitor: '100+',
          otter: 'English only',
          gong: '100+',
          nebulaAiWins: true
        },
        {
          name: 'Video Recording',
          nebulaAi: 'All Plans',
          competitor: 'Business+',
          otter: false,
          gong: true,
          nebulaAiWins: true
        },
        {
          name: 'Mobile Apps',
          nebulaAi: 'iOS + Android',
          competitor: 'iOS + Android',
          otter: 'iOS only',
          gong: 'iOS + Android',
          nebulaAiWins: true
        },
        {
          name: 'Real-time Transcription',
          nebulaAi: true,
          competitor: true,
          otter: true,
          gong: true,
          nebulaAiWins: true
        },
        {
          name: 'Speaker Identification',
          nebulaAi: true,
          competitor: true,
          otter: true,
          gong: true,
          nebulaAiWins: true
        }
      ]
    },
    {
      category: 'AI & Intelligence',
      features: [
        {
          name: 'AI Providers',
          nebulaAi: '5 (OpenAI, Anthropic, etc)',
          competitor: '1 (OpenAI)',
          otter: '1 (Proprietary)',
          gong: 'Proprietary',
          nebulaAiWins: true
        },
        {
          name: 'Custom Fine-tuning',
          nebulaAi: true,
          competitor: false,
          otter: false,
          gong: 'Enterprise',
          nebulaAiWins: true
        },
        {
          name: 'AI Meeting Assistant',
          nebulaAi: true,
          competitor: true,
          otter: true,
          gong: true,
          nebulaAiWins: true
        },
        {
          name: 'Sentiment Analysis',
          nebulaAi: true,
          competitor: 'Limited',
          otter: false,
          gong: true,
          nebulaAiWins: true
        },
        {
          name: 'Action Items Detection',
          nebulaAi: true,
          competitor: true,
          otter: true,
          gong: true,
          nebulaAiWins: true
        }
      ]
    },
    {
      category: 'Integration & API',
      features: [
        {
          name: 'GraphQL API',
          nebulaAi: true,
          competitor: false,
          otter: false,
          gong: false,
          nebulaAiWins: true
        },
        {
          name: 'REST API',
          nebulaAi: true,
          competitor: true,
          otter: 'Limited',
          gong: true,
          nebulaAiWins: true
        },
        {
          name: 'Webhook Support',
          nebulaAi: true,
          competitor: true,
          otter: false,
          gong: true,
          nebulaAiWins: true
        },
        {
          name: 'CRM Integrations',
          nebulaAi: '20+',
          competitor: '15+',
          otter: '5+',
          gong: '20+',
          nebulaAiWins: true
        },
        {
          name: 'Calendar Sync',
          nebulaAi: true,
          competitor: true,
          otter: true,
          gong: true,
          nebulaAiWins: true
        }
      ]
    },
    {
      category: 'Deployment & Security',
      features: [
        {
          name: 'Self-Hosted Option',
          nebulaAi: true,
          competitor: false,
          otter: false,
          gong: false,
          nebulaAiWins: true
        },
        {
          name: 'White-Label',
          nebulaAi: true,
          competitor: false,
          otter: false,
          gong: 'Enterprise',
          nebulaAiWins: true
        },
        {
          name: 'SOC 2 Compliant',
          nebulaAi: true,
          competitor: true,
          otter: true,
          gong: true,
          nebulaAiWins: true
        },
        {
          name: 'GDPR Compliant',
          nebulaAi: true,
          competitor: true,
          otter: true,
          gong: true,
          nebulaAiWins: true
        },
        {
          name: 'End-to-End Encryption',
          nebulaAi: true,
          competitor: true,
          otter: false,
          gong: true,
          nebulaAiWins: true
        }
      ]
    }
  ]

  const testimonials = [
    {
      quote: "Switched from our previous provider and cut our costs by 40% while getting more features. The self-hosted option was a game-changer for our security requirements.",
      author: "Sarah Chen",
      role: "CTO at TechCorp",
      previousTool: "Previous Provider",
      rating: 5
    },
    {
      quote: "Gong wanted $15,000 minimum per year. OpenMeet gives us the same capabilities for under $2,000. No-brainer decision.",
      author: "Michael Roberts",
      role: "VP Sales at SaaS Startup",
      previousTool: "Gong",
      rating: 5
    },
    {
      quote: "The multi-language support is incredible. Otter couldn't handle our international calls, but OpenMeet transcribes 150+ languages perfectly.",
      author: "Elena Vasquez",
      role: "Head of Product at GlobalTech",
      previousTool: "Otter",
      rating: 5
    }
  ]

  const renderFeatureValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-green-500" />
      ) : (
        <X className="w-5 h-5 text-red-500" />
      )
    }
    return <span className="text-sm">{value}</span>
  }

  return (
    <div className="min-h-screen bg-[#000211]">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            How OpenMeet Compares
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            See why teams choose OpenMeet over competitors. Better features, transparent pricing,
            and the flexibility to deploy however you want.
          </p>
        </div>
      </section>

      {/* Quick Comparison Cards */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Quick Comparisons
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {competitorCards.map((competitor) => (
              <Link
                key={competitor.slug}
                href={`/compare/${competitor.slug}`}
                className="bg-[#0a0a1a] border border-gray-800 rounded-xl p-6 hover:border-[#7a5af8] transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      OpenMeet vs
                    </h3>
                    <p className="text-[#7a5af8] font-bold text-xl">
                      {competitor.name}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#7a5af8] transition-colors" />
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  {competitor.description}
                </p>
                <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full inline-block text-sm font-medium mb-4">
                  {competitor.savings}
                </div>
                <ul className="space-y-2">
                  {competitor.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-center text-gray-300 text-sm">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Full Comparison Table */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Detailed Feature Comparison
          </h2>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {comparisonData.map((category, categoryIdx) => (
                <div key={categoryIdx} className="mb-8">
                  <h3 className="text-xl font-bold text-[#7a5af8] mb-4">
                    {category.category}
                  </h3>
                  <div className="bg-[#0a0a1a] rounded-xl overflow-hidden border border-gray-800">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left p-4 text-gray-400 font-medium">Feature</th>
                          <th className="p-4 text-center">
                            <div className="bg-[#7a5af8]/10 rounded-lg px-3 py-2 border-2 border-[#7a5af8]">
                              <span className="text-[#7a5af8] font-bold">OpenMeet</span>
                              <div className="text-xs text-[#7a5af8] mt-1">Our Solution</div>
                            </div>
                          </th>
                          <th className="p-4 text-gray-400 text-center">Competitor</th>
                          <th className="p-4 text-gray-400 text-center">Otter</th>
                          <th className="p-4 text-gray-400 text-center">Gong</th>
                        </tr>
                      </thead>
                      <tbody>
                        {category.features.map((feature, featureIdx) => (
                          <tr key={featureIdx} className="border-b border-gray-800/50">
                            <td className="p-4 text-white">{feature.name}</td>
                            <td className="p-4 text-center bg-[#7a5af8]/5">
                              <div className="flex justify-center items-center">
                                {renderFeatureValue(feature.nebulaAi)}
                              </div>
                            </td>
                            <td className="p-4 text-center text-gray-300">
                              <div className="flex justify-center items-center">
                                {renderFeatureValue(feature.competitor)}
                              </div>
                            </td>
                            <td className="p-4 text-center text-gray-300">
                              <div className="flex justify-center items-center">
                                {renderFeatureValue(feature.otter)}
                              </div>
                            </td>
                            <td className="p-4 text-center text-gray-300">
                              <div className="flex justify-center items-center">
                                {renderFeatureValue(feature.gong)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Teams Switch */}
      <section className="py-16 px-4 bg-[#0a0a1a]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Why Teams Switch to OpenMeet
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#000211] rounded-xl p-6 border border-gray-800">
              <div className="w-12 h-12 bg-[#7a5af8]/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-[#7a5af8]" />
              </div>
              <h3 className="text-white font-semibold mb-2">30-80% Cost Savings</h3>
              <p className="text-gray-400 text-sm">
                Get enterprise features at startup prices. No hidden fees or surprise charges.
              </p>
            </div>

            <div className="bg-[#000211] rounded-xl p-6 border border-gray-800">
              <div className="w-12 h-12 bg-[#7a5af8]/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-[#7a5af8]" />
              </div>
              <h3 className="text-white font-semibold mb-2">More Features Included</h3>
              <p className="text-gray-400 text-sm">
                Everything in one plan. No feature gates or artificial limitations.
              </p>
            </div>

            <div className="bg-[#000211] rounded-xl p-6 border border-gray-800">
              <div className="w-12 h-12 bg-[#7a5af8]/10 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-[#7a5af8]" />
              </div>
              <h3 className="text-white font-semibold mb-2">Better API Access</h3>
              <p className="text-gray-400 text-sm">
                GraphQL and REST APIs with no rate limits. Build whatever you need.
              </p>
            </div>

            <div className="bg-[#000211] rounded-xl p-6 border border-gray-800">
              <div className="w-12 h-12 bg-[#7a5af8]/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-[#7a5af8]" />
              </div>
              <h3 className="text-white font-semibold mb-2">Self-Hosted Option</h3>
              <p className="text-gray-400 text-sm">
                Deploy on your infrastructure. Keep your data completely private.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            What Switchers Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="bg-[#0a0a1a] rounded-xl p-6 border border-gray-800">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4 italic">"{testimonial.quote}"</p>
                <div className="pt-4 border-t border-gray-800">
                  <p className="text-white font-semibold">{testimonial.author}</p>
                  <p className="text-gray-400 text-sm">{testimonial.role}</p>
                  <p className="text-[#7a5af8] text-sm mt-2">
                    Switched from {testimonial.previousTool}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Migration CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#0a0a1a] to-[#000211]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Switch to OpenMeet in Minutes
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Our migration tool imports your data from any competitor.
            Start saving money and getting more features today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-[#7a5af8] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[#6b4ae4] transition-colors inline-flex items-center justify-center"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/migration"
              className="bg-[#0a0a1a] text-white px-8 py-4 rounded-xl font-semibold border border-gray-800 hover:border-[#7a5af8] transition-colors inline-flex items-center justify-center"
            >
              Learn About Migration
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-6">
            No credit card required • Import your data instantly • Cancel anytime
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}