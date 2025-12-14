'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  TrendingUp,
  Clock,
  Target,
  Users,
  BarChart3,
  Phone,
  Zap,
  CheckCircle,
  ArrowRight,
  DollarSign,
  Calendar,
  UserCheck,
  MessageSquare,
  FileText,
  Quote
} from 'lucide-react';

export default function SalesSolutionPage() {
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
              <TrendingUp size={16} style={{ color: 'var(--ff-purple-500)' }} />
              <span style={{ fontSize: '14px', color: 'var(--ff-purple-500)' }}>For Sales Teams</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 'bold',
              marginBottom: '24px',
              background: 'linear-gradient(to right, #ffffff, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Close More Deals with AI-Powered Meeting Intelligence
            </h1>

            <p style={{
              fontSize: '1.25rem',
              color: 'var(--ff-text-secondary)',
              maxWidth: '800px',
              margin: '0 auto 40px',
              lineHeight: '1.6'
            }}>
              Transform every sales conversation into actionable insights. Never miss a follow-up,
              objection, or buying signal with OpenMeet's automatic meeting transcription and analysis.
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
                Watch Demo
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
            Sales Teams Lose 20% of Deals Due to Poor Follow-Up
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--ff-text-secondary)',
            textAlign: 'center',
            marginBottom: '48px',
            maxWidth: '800px',
            margin: '0 auto 48px'
          }}>
            Without proper meeting documentation, critical details slip through the cracks
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
              <Clock size={32} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Hours Lost on Admin Work
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Sales reps spend 30% of their time on CRM updates and meeting notes instead of selling
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'rgba(122, 90, 248, 0.05)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <MessageSquare size={32} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Missed Buying Signals
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Important customer objections and interest indicators get lost when multitasking
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
                Poor Handoffs
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Team collaboration suffers when meeting context isn't properly documented and shared
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
            How OpenMeet Empowers Sales Teams
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
                  <Zap size={24} style={{ color: 'var(--ff-purple-500)' }} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
                  Automatic CRM Updates
                </h3>
                <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  OpenMeet automatically logs calls, updates deal stages, and creates follow-up tasks in your CRM.
                  Save 5+ hours per week on data entry.
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Salesforce, HubSpot, and Pipedrive integration</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Custom field mapping and workflows</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Real-time sync after every meeting</span>
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
                  <Target size={24} style={{ color: 'var(--ff-purple-500)' }} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
                  Deal Intelligence & Coaching
                </h3>
                <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  AI analyzes your calls to identify objections, competitors mentioned, and buying signals.
                  Get real-time coaching to improve win rates.
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Sentiment analysis and talk-time ratios</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Competitor mention tracking</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>MEDDIC, BANT, and custom methodologies</span>
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
                <Target size={80} style={{ color: 'var(--ff-purple-500)', opacity: 0.3 }} />
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
            Sales Workflows Powered by OpenMeet
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
              <Phone size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Discovery Calls
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Automatically capture pain points, budget, timeline, and decision criteria.
                Generate personalized follow-up emails with key discussion points.
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
                Demo Presentations
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Track feature interests, questions asked, and engagement levels.
                Create tailored proposals based on what resonated most.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <FileText size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Contract Negotiations
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Document pricing discussions, terms requested, and commitments made.
                Ensure nothing falls through the cracks at closing.
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
            Proven ROI for Sales Teams
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
                32%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Increase in Close Rate
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                Better follow-up and insights
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
                5+ hrs
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Saved Per Rep Weekly
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                On admin and data entry
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
                47%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Faster Ramp Time
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                For new sales hires
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
                2.3x
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                More Pipeline Generated
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                Through better qualification
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
              "OpenMeet transformed our sales process. We're closing deals 30% faster and our CRM
              is always up-to-date. The AI coaching insights alone have increased our team's
              performance significantly."
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
                <p style={{ fontWeight: '600' }}>Sarah Chen</p>
                <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                  VP of Sales, TechCorp
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
            Ready to Supercharge Your Sales?
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--ff-text-secondary)',
            marginBottom: '32px',
            position: 'relative',
            zIndex: 1
          }}>
            Join thousands of sales teams using OpenMeet to close more deals and work smarter.
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
            No credit card required • 14-day free trial • Cancel anytime
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