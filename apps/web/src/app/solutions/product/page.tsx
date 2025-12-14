'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Package,
  MessageSquare,
  Lightbulb,
  Users,
  Target,
  Code,
  Map,
  UserCheck,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Quote,
  Bug,
  Zap
} from 'lucide-react';

export default function ProductSolutionPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--ff-bg-dark, #000211)', color: 'var(--ff-text-primary)' }}>
      <Navigation />

      {/* Hero Section */}
      <section style={{ paddingTop: '120px', paddingBottom: '80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '24px',
              backgroundColor: 'rgba(122, 90, 248, 0.1)',
              border: '1px solid rgba(122, 90, 248, 0.2)',
              marginBottom: '24px'
            }}>
              <Package size={16} style={{ color: 'var(--ff-purple-500)' }} />
              <span style={{ fontSize: '14px', color: 'var(--ff-purple-500)' }}>For Product Teams</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 'bold',
              marginBottom: '24px',
              background: 'linear-gradient(to right, #ffffff, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Build Products Your Customers Actually Want
            </h1>

            <p style={{
              fontSize: '1.25rem',
              color: 'var(--ff-text-secondary)',
              maxWidth: '800px',
              margin: '0 auto 40px',
              lineHeight: '1.6'
            }}>
              Capture every user insight, feedback session, and stakeholder meeting.
              Make data-driven product decisions with AI-powered conversation intelligence.
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button style={{
                padding: '14px 32px',
                backgroundColor: 'var(--ff-purple-500)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                Start Free Trial
                <ArrowRight size={18} />
              </button>
              <button style={{
                padding: '14px 32px',
                backgroundColor: 'transparent',
                color: 'var(--ff-text-primary)',
                border: '1px solid var(--ff-border)',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Watch Product Demo
              </button>
            </div>
          </div>
        </div>

        {/* Background gradient */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(122, 90, 248, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
      </section>

      {/* Pain Points Section */}
      <section style={{ padding: '80px 24px', backgroundColor: 'var(--ff-bg-layer)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            80% of Product Features Fail Due to Poor User Understanding
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--ff-text-secondary)',
            textAlign: 'center',
            marginBottom: '48px',
            maxWidth: '800px',
            margin: '0 auto 48px'
          }}>
            Critical user feedback gets lost between conversations and implementation
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px'
          }}>
            <div style={{
              padding: '32px',
              backgroundColor: 'rgba(122, 90, 248, 0.05)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <MessageSquare size={32} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Scattered Feedback
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                User insights scattered across calls, emails, and Slack, making it impossible to spot patterns
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'rgba(122, 90, 248, 0.05)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Users size={32} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Stakeholder Misalignment
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Requirements change because key discussions aren't properly documented and shared
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'rgba(122, 90, 248, 0.05)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Target size={32} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Prioritization Guesswork
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Can't quantify user needs or measure feature impact without comprehensive conversation data
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '48px',
            textAlign: 'center'
          }}>
            How OpenMeet Empowers Product Excellence
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div style={{ display: 'flex', gap: '48px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '300px' }}>
                <div style={{
                  display: 'inline-flex',
                  padding: '12px',
                  backgroundColor: 'rgba(122, 90, 248, 0.1)',
                  borderRadius: '12px',
                  marginBottom: '16px'
                }}>
                  <Lightbulb size={24} style={{ color: 'var(--ff-purple-500)' }} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
                  Unified Voice of Customer
                </h3>
                <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  Aggregate all user feedback from interviews, support calls, and sales demos.
                  AI identifies patterns, trends, and priority pain points across all conversations.
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Feature request tracking and prioritization</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Pain point clustering and analysis</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Jobs-to-be-done framework mapping</span>
                  </li>
                </ul>
              </div>
              <div style={{
                flex: '1',
                minWidth: '300px',
                height: '300px',
                backgroundColor: 'var(--ff-bg-layer)',
                borderRadius: '12px',
                border: '1px solid var(--ff-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BarChart3 size={80} style={{ color: 'var(--ff-purple-500)', opacity: 0.3 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '48px', alignItems: 'center', flexWrap: 'wrap', flexDirection: 'row-reverse' }}>
              <div style={{ flex: '1', minWidth: '300px' }}>
                <div style={{
                  display: 'inline-flex',
                  padding: '12px',
                  backgroundColor: 'rgba(122, 90, 248, 0.1)',
                  borderRadius: '12px',
                  marginBottom: '16px'
                }}>
                  <Map size={24} style={{ color: 'var(--ff-purple-500)' }} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
                  Requirements Traceability
                </h3>
                <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  Link every feature decision back to actual customer conversations.
                  Maintain clear documentation of why features were built and for whom.
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Stakeholder meeting documentation</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Decision rationale tracking</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Jira, Linear, and Notion integration</span>
                  </li>
                </ul>
              </div>
              <div style={{
                flex: '1',
                minWidth: '300px',
                height: '300px',
                backgroundColor: 'var(--ff-bg-layer)',
                borderRadius: '12px',
                border: '1px solid var(--ff-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Map size={80} style={{ color: 'var(--ff-purple-500)', opacity: 0.3 }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section style={{ padding: '80px 24px', backgroundColor: 'var(--ff-bg-layer)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '48px',
            textAlign: 'center'
          }}>
            Product Workflows Powered by OpenMeet
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '24px'
          }}>
            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <UserCheck size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                User Research Interviews
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Capture every insight from discovery calls and usability tests. Generate research
                reports with key findings and recommendations automatically.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Code size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Sprint Planning
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Document sprint goals, task assignments, and blockers. Keep everyone aligned
                with searchable meeting records and action items.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Zap size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Product Demos
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Track feature reactions, questions, and concerns during demos. Build better
                roadmaps based on what resonates with users.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Bug size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Bug Triages
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Document bug reports, reproduction steps, and priority decisions. Maintain
                clear records for QA and development teams.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Users size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Stakeholder Reviews
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Capture executive feedback, budget discussions, and strategic decisions.
                Keep all stakeholders informed with shared meeting insights.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Target size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Retrospectives
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Document lessons learned, team feedback, and improvement ideas. Track action
                items and measure progress over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '48px',
            textAlign: 'center'
          }}>
            Product Teams Ship Better, Faster
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '32px',
            marginBottom: '64px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, var(--ff-purple-500), var(--ff-purple-600))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px'
              }}>
                71%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Higher Feature Adoption
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                Building what users need
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, var(--ff-purple-500), var(--ff-purple-600))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px'
              }}>
                4x
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Faster User Feedback Loop
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                From weeks to days
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, var(--ff-purple-500), var(--ff-purple-600))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px'
              }}>
                89%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Team Alignment
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                On product priorities
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, var(--ff-purple-500), var(--ff-purple-600))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px'
              }}>
                52%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Less Rework
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                Clear requirements upfront
              </p>
            </div>
          </div>

          {/* Testimonial */}
          <div style={{
            backgroundColor: 'var(--ff-bg-layer)',
            borderRadius: '16px',
            padding: '48px',
            position: 'relative',
            border: '1px solid var(--ff-border)'
          }}>
            <Quote size={40} style={{
              color: 'var(--ff-purple-500)',
              opacity: 0.2,
              position: 'absolute',
              top: '24px',
              left: '24px'
            }} />
            <p style={{
              fontSize: '1.25rem',
              lineHeight: '1.8',
              fontStyle: 'italic',
              marginBottom: '24px',
              position: 'relative'
            }}>
              "OpenMeet transformed how we understand our users. We now have a searchable database
              of every customer interaction. Feature adoption is up 71% because we're building
              exactly what users ask for, in their own words."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--ff-purple-500)',
                opacity: 0.3
              }} />
              <div>
                <p style={{ fontWeight: '600' }}>David Park</p>
                <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                  VP of Product, FinTech Pro
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '80px 24px', backgroundColor: 'var(--ff-bg-layer)' }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '48px',
          backgroundColor: 'var(--ff-bg-dark)',
          borderRadius: '16px',
          border: '1px solid var(--ff-purple-500)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '16px',
            position: 'relative',
            zIndex: 1
          }}>
            Ship Products Users Love
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--ff-text-secondary)',
            marginBottom: '32px',
            position: 'relative',
            zIndex: 1
          }}>
            Join product teams building with confidence using OpenMeet's conversation intelligence.
          </p>
          <button style={{
            padding: '16px 48px',
            backgroundColor: 'var(--ff-purple-500)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 1
          }}>
            Start Free Trial
          </button>
          <p style={{
            marginTop: '16px',
            color: 'var(--ff-text-secondary)',
            fontSize: '0.875rem',
            position: 'relative',
            zIndex: 1
          }}>
            No credit card required • Integrates with your tools • SOC 2 compliant
          </p>

          {/* Background gradient */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-25%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(122, 90, 248, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
        </div>
      </section>

      <Footer />
    </div>
  );
}