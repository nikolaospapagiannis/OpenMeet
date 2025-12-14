'use client'

import { useEffect, useRef, useState } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 2000, start: boolean = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!start) return

    let startTime: number | null = null
    const startValue = 0

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentCount = Math.floor(startValue + (end - startValue) * easeOutQuart)

      setCount(currentCount)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [end, duration, start])

  return count
}

// Intersection observer hook for triggering animations
function useIntersectionObserver(threshold = 0.1) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isIntersecting) {
          setIsIntersecting(true)
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [threshold, isIntersecting])

  return { ref, isIntersecting }
}

export default function AboutPage() {
  const { ref: statsRef, isIntersecting: statsVisible } = useIntersectionObserver()

  const companiesCount = useAnimatedCounter(800000, 2000, statsVisible)
  const meetingsCount = useAnimatedCounter(10000000, 2000, statsVisible)
  const languagesCount = useAnimatedCounter(150, 2000, statsVisible)
  const uptimeCount = useAnimatedCounter(99.99, 2000, statsVisible)

  const values = [
    {
      title: 'Innovation',
      description: 'Pioneering AI technology to transform how teams collaborate and extract insights from meetings.',
      icon: '🚀'
    },
    {
      title: 'Security First',
      description: 'Enterprise-grade security with end-to-end encryption and compliance with global standards.',
      icon: '🔒'
    },
    {
      title: 'Customer Success',
      description: 'Dedicated to helping our customers achieve their goals with exceptional support and service.',
      icon: '⭐'
    },
    {
      title: 'Transparency',
      description: 'Building trust through open communication and clear, ethical AI practices.',
      icon: '💎'
    }
  ]

  const teamMembers = [
    {
      name: 'Sarah Chen',
      role: 'Chief Executive Officer',
      bio: 'Former VP of Product at leading AI companies, 15+ years in enterprise software.',
      image: 'https://via.placeholder.com/200x200/7a5af8/ffffff?text=SC'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Chief Technology Officer',
      bio: 'AI researcher and engineer, previously led ML teams at Fortune 500 companies.',
      image: 'https://via.placeholder.com/200x200/7a5af8/ffffff?text=MR'
    },
    {
      name: 'Emily Johnson',
      role: 'Chief Product Officer',
      bio: 'Product visionary with experience scaling SaaS products to millions of users.',
      image: 'https://via.placeholder.com/200x200/7a5af8/ffffff?text=EJ'
    },
    {
      name: 'David Kim',
      role: 'Chief Revenue Officer',
      bio: 'Sales leader who has built and scaled revenue teams from startup to IPO.',
      image: 'https://via.placeholder.com/200x200/7a5af8/ffffff?text=DK'
    }
  ]

  const partners = [
    'Microsoft', 'Google', 'Salesforce', 'Slack', 'Zoom', 'HubSpot'
  ]

  return (
    <div style={{ backgroundColor: 'var(--ff-bg-dark, #000211)', minHeight: '100vh' }}>
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            Building the Future of
            <span className="block mt-2" style={{ color: 'var(--ff-purple-500, #7a5af8)' }}>
              Meeting Intelligence
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8 leading-relaxed">
            We're on a mission to transform how teams collaborate, making every conversation
            more productive and every insight more actionable through the power of AI.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">2021</div>
              <div className="text-gray-500 mt-1">Founded</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">200+</div>
              <div className="text-gray-500 mt-1">Team Members</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">50+</div>
              <div className="text-gray-500 mt-1">Countries</div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-12">Our Story</h2>
          <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
            <p>
              Founded in 2021, we started with a simple observation: despite spending countless
              hours in meetings, teams were losing critical information and insights. Important
              decisions were forgotten, action items were missed, and valuable discussions were
              lost to time.
            </p>
            <p>
              We believed there had to be a better way. By combining cutting-edge AI with an
              intuitive user experience, we created a platform that not only captures meetings
              but transforms them into structured, actionable intelligence.
            </p>
            <p>
              Today, we're proud to serve over 800,000 companies worldwide, from innovative
              startups to Fortune 500 enterprises. But we're just getting started. Our vision
              is a world where every team can unlock the full potential of their conversations,
              making collaboration more effective and decisions more informed.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-20 px-4" style={{ backgroundColor: 'var(--ff-bg-layer, #0a0a1a)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">By the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold" style={{ color: 'var(--ff-purple-500, #7a5af8)' }}>
                {companiesCount.toLocaleString()}+
              </div>
              <div className="text-gray-400 mt-2">Companies</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold" style={{ color: 'var(--ff-purple-500, #7a5af8)' }}>
                {(meetingsCount / 1000000).toFixed(0)}M+
              </div>
              <div className="text-gray-400 mt-2">Meetings Processed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold" style={{ color: 'var(--ff-purple-500, #7a5af8)' }}>
                {languagesCount}+
              </div>
              <div className="text-gray-400 mt-2">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold" style={{ color: 'var(--ff-purple-500, #7a5af8)' }}>
                {uptimeCount.toFixed(2)}%
              </div>
              <div className="text-gray-400 mt-2">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl border border-gray-800 hover:border-purple-500/50 transition-all duration-300"
                style={{ backgroundColor: 'var(--ff-bg-layer, #0a0a1a)' }}
              >
                <div className="text-4xl mb-4">{value.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-gray-400">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4" style={{ backgroundColor: 'var(--ff-bg-layer, #0a0a1a)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Leadership Team</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="text-center">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-40 h-40 rounded-full mx-auto mb-4 border-4 border-purple-500/20"
                />
                <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                <div className="text-purple-400 mb-3">{member.role}</div>
                <p className="text-gray-400 text-sm">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investors/Partners Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-4">Backed by Industry Leaders</h2>
          <p className="text-gray-400 text-center mb-12">
            Trusted by the world's leading companies and investors
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {partners.map((partner, index) => (
              <div
                key={index}
                className="flex items-center justify-center p-6 rounded-lg border border-gray-800 hover:border-purple-500/50 transition-all duration-300"
                style={{ backgroundColor: 'var(--ff-bg-layer, #0a0a1a)' }}
              >
                <div className="text-gray-400 font-semibold">{partner}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us CTA Section */}
      <section className="py-20 px-4" style={{ backgroundColor: 'var(--ff-bg-layer, #0a0a1a)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Join Our Mission</h2>
          <p className="text-xl text-gray-400 mb-8">
            Help us build the future of meeting intelligence and transform how teams collaborate worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/careers"
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors duration-200"
              style={{ backgroundColor: 'var(--ff-purple-500, #7a5af8)' }}
            >
              View Open Positions
            </a>
            <div className="text-gray-400">
              <span className="font-bold text-white">25+</span> open positions
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}