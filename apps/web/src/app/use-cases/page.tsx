'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'
import {
  TrendingUp,
  Users,
  UserPlus,
  Package,
  Megaphone,
  Crown,
  CheckCircle,
  ArrowRight,
  Quote
} from 'lucide-react'

const useCases = [
  {
    icon: TrendingUp,
    title: 'Sales Teams',
    subtitle: 'Close deals faster with AI-powered insights',
    painPoints: [
      'Manual call notes waste selling time',
      'Key deal signals get missed',
      'CRM data entry takes hours'
    ],
    features: [
      'Automatic deal intelligence extraction',
      'Real-time call coaching suggestions',
      'One-click CRM synchronization',
      'Competitor mention alerts',
      'Next step recommendations'
    ],
    gradient: 'from-purple-500 to-blue-500'
  },
  {
    icon: Users,
    title: 'Customer Success',
    subtitle: 'Deliver exceptional customer experiences',
    painPoints: [
      'Customer sentiment hard to track',
      'Onboarding calls poorly documented',
      'Renewal risks discovered too late'
    ],
    features: [
      'Customer health scoring',
      'Onboarding milestone tracking',
      'Churn risk detection',
      'Success story extraction',
      'QBR preparation automation'
    ],
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: UserPlus,
    title: 'Recruiting',
    subtitle: 'Make better hiring decisions faster',
    painPoints: [
      'Interview notes inconsistent',
      'Candidate comparison difficult',
      'Feedback collection slow'
    ],
    features: [
      'Structured interview summaries',
      'Candidate scoring automation',
      'Team feedback aggregation',
      'Skills assessment tracking',
      'Diversity metrics reporting'
    ],
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    icon: Package,
    title: 'Product Teams',
    subtitle: 'Turn user feedback into features',
    painPoints: [
      'User interviews hard to analyze',
      'Feature requests scattered',
      'Insights lost in recordings'
    ],
    features: [
      'User interview synthesis',
      'Feature request extraction',
      'Pain point identification',
      'Roadmap prioritization data',
      'User sentiment analysis'
    ],
    gradient: 'from-orange-500 to-red-500'
  },
  {
    icon: Megaphone,
    title: 'Marketing',
    subtitle: 'Transform conversations into content',
    painPoints: [
      'Webinar content underutilized',
      'Customer stories hard to capture',
      'Content creation time-intensive'
    ],
    features: [
      'Webinar transcription & clips',
      'Case study extraction',
      'Blog post generation',
      'Social media snippets',
      'SEO keyword identification'
    ],
    gradient: 'from-pink-500 to-purple-500'
  },
  {
    icon: Crown,
    title: 'Leadership',
    subtitle: 'Stay connected across your organization',
    painPoints: [
      'Meeting insights siloed',
      'Team alignment difficult',
      'Strategic themes missed'
    ],
    features: [
      'All-hands meeting summaries',
      'Cross-team visibility dashboard',
      'Strategic initiative tracking',
      'Team sentiment monitoring',
      'Executive briefing automation'
    ],
    gradient: 'from-yellow-500 to-orange-500'
  }
]

const testimonials = [
  {
    quote: "We've reduced our post-call admin work by 75%. Our reps now spend that time actually selling, and our close rates have increased by 22%.",
    author: "Sarah Chen",
    role: "Sales Manager",
    company: "TechCorp Global"
  },
  {
    quote: "Customer health scoring used to take hours of manual work. Now we instantly know which accounts need attention, preventing 3x more churns.",
    author: "Michael Rodriguez",
    role: "Customer Success Lead",
    company: "SaaS Innovations"
  },
  {
    quote: "Every user interview is now a goldmine of insights. We've shipped features that actually solve problems, and our NPS increased by 40 points.",
    author: "Emily Thompson",
    role: "VP of Product",
    company: "Digital Solutions Inc"
  }
]

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)]">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            Every Team Benefits
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
            From sales to support, product to marketing — transform how your entire organization captures and leverages conversation intelligence.
          </p>
        </div>
      </section>

      {/* Use Cases Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon
              return (
                <div
                  key={index}
                  className="bg-[var(--ff-bg-layer)] rounded-2xl p-8 border border-gray-800 hover:border-[var(--ff-purple-500)] transition-all duration-300 group"
                >
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${useCase.gradient} p-0.5 mb-6 group-hover:scale-110 transition-transform`}>
                    <div className="w-full h-full bg-[var(--ff-bg-layer)] rounded-xl flex items-center justify-center">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {useCase.title}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {useCase.subtitle}
                  </p>

                  {/* Pain Points */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Problems We Solve
                    </h4>
                    <ul className="space-y-2">
                      {useCase.painPoints.map((point, idx) => (
                        <li key={idx} className="text-sm text-gray-400 flex items-start">
                          <span className="text-red-500 mr-2">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Key Features */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Key Features
                    </h4>
                    <ul className="space-y-2">
                      {useCase.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-300 flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Link */}
                  <Link
                    href="#"
                    className="inline-flex items-center text-[var(--ff-purple-500)] hover:text-purple-400 transition-colors group/link"
                  >
                    See how it works
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6 bg-[var(--ff-bg-layer)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Trusted by Teams Everywhere
            </h2>
            <p className="text-xl text-gray-400">
              See how different roles are transforming their workflows
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-[var(--ff-bg-dark)] rounded-2xl p-8 border border-gray-800 relative"
              >
                <Quote className="w-8 h-8 text-[var(--ff-purple-500)] opacity-50 mb-4" />

                <p className="text-gray-300 mb-6 italic">
                  "{testimonial.quote}"
                </p>

                <div className="pt-4 border-t border-gray-800">
                  <p className="text-white font-semibold">
                    {testimonial.author}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {testimonial.role}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {testimonial.company}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-[var(--ff-purple-500)] to-blue-500 rounded-3xl p-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Team's Workflow?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of teams already saving hours every week while capturing critical insights from every conversation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                href="/demo"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/20 transition-colors border border-white/20"
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}