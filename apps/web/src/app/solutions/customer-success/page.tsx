'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  HeartHandshake,
  Clock,
  TrendingUp,
  MessageCircle,
  UserCheck,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Star,
  Shield,
  Lightbulb
} from 'lucide-react';

export default function CustomerSuccessPage() {
  return (
    <main className="min-h-screen bg-[var(--ff-bg-dark)]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--ff-purple-500)]/10 border border-[var(--ff-purple-500)]/20 mb-8">
              <HeartHandshake className="w-4 h-4 text-[var(--ff-purple-500)]" />
              <span className="text-sm text-[var(--ff-purple-500)] font-medium">For Customer Success Teams</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--ff-text-primary)] mb-6">
              Deliver Exceptional Customer Experiences with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] block mt-2">
                AI-Powered Customer Intelligence
              </span>
            </h1>

            <p className="text-xl text-[var(--ff-text-secondary)] mb-8 leading-relaxed">
              Transform every customer interaction into actionable insights. Proactively prevent churn,
              identify expansion opportunities, and deliver personalized success at scale.
            </p>

            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-4 bg-[var(--ff-purple-500)] text-white rounded-lg font-semibold hover:bg-[var(--ff-purple-600)] transition-colors flex items-center gap-2">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 bg-[var(--ff-bg-layer)] text-[var(--ff-text-primary)] rounded-lg font-semibold hover:bg-[var(--ff-bg-layer)]/80 transition-colors border border-[var(--ff-border)]">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 px-6 bg-[var(--ff-bg-layer)]/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--ff-text-primary)] mb-4">
            Customer Success teams lose 23% of revenue to preventable churn
          </h2>
          <p className="text-lg text-[var(--ff-text-secondary)] mb-12 max-w-3xl">
            Without visibility into customer sentiment and needs, issues escalate into cancellations
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: AlertCircle,
                title: "Reactive Instead of Proactive",
                description: "CSMs learn about problems only after customers complain or threaten to leave"
              },
              {
                icon: Clock,
                title: "Manual Account Reviews",
                description: "Hours spent preparing for QBRs instead of engaging with customers"
              },
              {
                icon: MessageCircle,
                title: "Lost Customer Context",
                description: "Important details from calls get lost, causing repetitive conversations"
              },
              {
                icon: TrendingUp,
                title: "Missed Expansion Signals",
                description: "Upsell and cross-sell opportunities go unnoticed in conversations"
              },
              {
                icon: UserCheck,
                title: "Inconsistent Onboarding",
                description: "New customers receive varying experiences depending on the CSM"
              },
              {
                icon: BarChart3,
                title: "No Health Score Accuracy",
                description: "Static metrics miss real customer sentiment and engagement levels"
              }
            ].map((item, index) => (
              <div key={index} className="bg-[var(--ff-bg-layer)] rounded-xl p-6 border border-[var(--ff-border)]">
                <item.icon className="w-12 h-12 text-[var(--ff-purple-500)] mb-4" />
                <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-2">
                  {item.title}
                </h3>
                <p className="text-[var(--ff-text-secondary)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--ff-text-primary)] mb-4">
            Turn every conversation into customer success
          </h2>
          <p className="text-lg text-[var(--ff-text-secondary)] mb-12 max-w-3xl">
            OpenMeet automatically captures, analyzes, and surfaces insights from every customer interaction
          </p>

          <div className="space-y-6">
            {[
              {
                icon: AlertCircle,
                title: "Churn Prevention",
                feature: "Early Warning System",
                description: "AI detects frustration, dissatisfaction, and churn signals in real-time from customer calls.",
                benefits: ["Risk alerts", "Sentiment tracking", "Escalation triggers"]
              },
              {
                icon: TrendingUp,
                title: "Revenue Intelligence",
                feature: "Expansion Opportunity Detection",
                description: "Automatically identify upsell signals, feature requests, and growth potential in conversations.",
                benefits: ["Usage insights", "Feature interest", "Budget discussions"]
              },
              {
                icon: Lightbulb,
                title: "Customer Insights",
                feature: "360° Customer Understanding",
                description: "Build comprehensive customer profiles from all interactions, preferences, and feedback.",
                benefits: ["Pain point mapping", "Success metrics", "Stakeholder analysis"]
              },
              {
                icon: Shield,
                title: "Success Automation",
                feature: "Scaled Personalization",
                description: "Automate follow-ups, create personalized success plans, and track adoption milestones.",
                benefits: ["Auto-generated QBRs", "Action item tracking", "Milestone alerts"]
              }
            ].map((item, index) => (
              <div key={index} className="bg-gradient-to-r from-[var(--ff-bg-layer)] to-transparent rounded-xl p-8 border border-[var(--ff-border)] hover:border-[var(--ff-purple-500)]/50 transition-colors">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-[var(--ff-purple-500)]/10 rounded-lg">
                    <item.icon className="w-8 h-8 text-[var(--ff-purple-500)]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-[var(--ff-text-primary)]">
                        {item.title}
                      </h3>
                      <span className="text-sm px-3 py-1 bg-[var(--ff-purple-500)]/20 text-[var(--ff-purple-500)] rounded-full">
                        {item.feature}
                      </span>
                    </div>
                    <p className="text-[var(--ff-text-secondary)] mb-4">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {item.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-sm text-[var(--ff-text-primary)]">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-6 bg-[var(--ff-bg-layer)]/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--ff-text-primary)] mb-12">
            Workflows that drive customer retention
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[var(--ff-bg-dark)] rounded-xl p-8 border border-[var(--ff-border)]">
              <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-4">
                Onboarding Calls
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Track implementation progress and blockers
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Document success criteria and timelines
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Create personalized adoption plans
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-[var(--ff-bg-dark)] rounded-xl p-8 border border-[var(--ff-border)]">
              <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-4">
                Quarterly Business Reviews
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Auto-generate QBR decks with insights
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Track ROI discussions and value realization
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Identify strategic initiatives and goals
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-[var(--ff-bg-dark)] rounded-xl p-8 border border-[var(--ff-border)]">
              <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-4">
                Support Escalations
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Capture technical issues and resolutions
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Monitor customer frustration levels
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Coordinate with product and engineering
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-[var(--ff-bg-dark)] rounded-xl p-8 border border-[var(--ff-border)]">
              <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-4">
                Renewal Discussions
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Track renewal probability and concerns
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Document pricing and contract negotiations
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Identify expansion opportunities
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--ff-text-primary)] mb-12 text-center">
            Proven impact on customer retention
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-[var(--ff-purple-500)] mb-2">27%</div>
              <div className="text-lg font-semibold text-[var(--ff-text-primary)] mb-1">Reduction in Churn</div>
              <div className="text-sm text-[var(--ff-text-secondary)]">Early risk detection</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[var(--ff-purple-500)] mb-2">45%</div>
              <div className="text-lg font-semibold text-[var(--ff-text-primary)] mb-1">More Upsells</div>
              <div className="text-sm text-[var(--ff-text-secondary)]">Opportunity identification</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[var(--ff-purple-500)] mb-2">3.2x</div>
              <div className="text-lg font-semibold text-[var(--ff-text-primary)] mb-1">CSM Efficiency</div>
              <div className="text-sm text-[var(--ff-text-secondary)]">More accounts managed</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[var(--ff-purple-500)] mb-2">94%</div>
              <div className="text-lg font-semibold text-[var(--ff-text-primary)] mb-1">CSAT Score</div>
              <div className="text-sm text-[var(--ff-text-secondary)]">Customer satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 px-6 bg-[var(--ff-bg-layer)]/30">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[var(--ff-purple-500)]/10 to-transparent rounded-2xl p-12 border border-[var(--ff-purple-500)]/20">
            <div className="flex items-center gap-2 mb-6">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <blockquote className="text-2xl text-[var(--ff-text-primary)] mb-6 leading-relaxed">
              "OpenMeet has been a game-changer for our CS team. We've reduced churn by 30% and increased
              net revenue retention to 115%. The AI insights help us be truly proactive with customers."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/20 rounded-full"></div>
              <div>
                <div className="font-semibold text-[var(--ff-text-primary)]">Jennifer Park</div>
                <div className="text-sm text-[var(--ff-text-secondary)]">VP Customer Success, SaaS Corp</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--ff-text-primary)] mb-6">
            Ready to transform customer success?
          </h2>
          <p className="text-xl text-[var(--ff-text-secondary)] mb-8">
            Join leading CS teams using OpenMeet to drive retention and growth
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="px-8 py-4 bg-[var(--ff-purple-500)] text-white rounded-lg font-semibold hover:bg-[var(--ff-purple-600)] transition-colors flex items-center gap-2">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 bg-[var(--ff-bg-layer)] text-[var(--ff-text-primary)] rounded-lg font-semibold hover:bg-[var(--ff-bg-layer)]/80 transition-colors border border-[var(--ff-border)]">
              See Demo
            </button>
          </div>
          <p className="text-sm text-[var(--ff-text-secondary)] mt-6">
            No credit card required • 14-day free trial • Full feature access
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}