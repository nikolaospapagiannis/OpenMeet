'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Megaphone,
  Video,
  PenTool,
  TrendingUp,
  Users,
  FileText,
  BarChart,
  Lightbulb,
  Mic,
  CheckCircle,
  ArrowRight,
  Quote,
  Sparkles,
  Youtube
} from 'lucide-react';

export default function MarketingSolutionPage() {
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
              <Megaphone size={16} style={{ color: 'var(--ff-purple-500)' }} />
              <span style={{ fontSize: '14px', color: 'var(--ff-purple-500)' }}>For Marketing Teams</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 'bold',
              marginBottom: '24px',
              background: 'linear-gradient(to right, #ffffff, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Transform Every Conversation into Content Gold
            </h1>

            <p style={{
              fontSize: '1.25rem',
              color: 'var(--ff-text-secondary)',
              maxWidth: '800px',
              margin: '0 auto 40px',
              lineHeight: '1.6'
            }}>
              Capture customer insights, create compelling content, and measure campaign impact
              with AI-powered transcription and analysis of all your marketing conversations.
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
                View Demo
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
            Marketers Miss 73% of Customer Insights
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--ff-text-secondary)',
            textAlign: 'center',
            marginBottom: '48px',
            maxWidth: '800px',
            margin: '0 auto 48px'
          }}>
            Valuable voice-of-customer data gets lost without proper documentation
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
              <Mic size={32} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Lost Customer Voice
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Customer interviews and focus groups aren't properly documented, losing authentic language and pain points
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'rgba(122, 90, 248, 0.05)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <PenTool size={32} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Content Creation Bottleneck
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Teams struggle to repurpose webinars, podcasts, and interviews into multiple content formats
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'rgba(122, 90, 248, 0.05)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <BarChart size={32} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Attribution Challenges
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Can't track which messages resonate or measure true campaign impact without conversation data
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
            How OpenMeet Amplifies Marketing Impact
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
                  <Sparkles size={24} style={{ color: 'var(--ff-purple-500)' }} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
                  Content Multiplication Engine
                </h3>
                <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  Turn one webinar into 10+ pieces of content. Automatically generate blog posts, social clips,
                  email campaigns, and quote cards from any recorded conversation.
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>AI-generated blog posts and articles</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Social media clips with captions</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>SEO-optimized transcripts and summaries</span>
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
                <Video size={80} style={{ color: 'var(--ff-purple-500)', opacity: 0.3 }} />
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
                  <Users size={24} style={{ color: 'var(--ff-purple-500)' }} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
                  Voice of Customer Intelligence
                </h3>
                <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  Extract authentic customer language, pain points, and objections from interviews.
                  Build data-driven buyer personas and messaging that converts.
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Sentiment and emotion analysis</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Pain point and objection mapping</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Competitive intelligence tracking</span>
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
                <Lightbulb size={80} style={{ color: 'var(--ff-purple-500)', opacity: 0.3 }} />
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
            Marketing Workflows Transformed by OpenMeet
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
              <Youtube size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Webinars & Virtual Events
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Generate follow-up content, extract Q&A highlights, and create on-demand resources.
                Track engagement and identify hot leads from attendee interactions.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Mic size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Podcast Production
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Streamline editing with automatic transcripts, generate show notes, and create
                audiograms for social media promotion.
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
                Customer Research
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Document user interviews, focus groups, and win/loss calls. Build data-driven
                personas and messaging frameworks.
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
                Case Study Creation
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Transform customer success calls into compelling case studies with quotes,
                metrics, and storylines automatically extracted.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <TrendingUp size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Influencer Collaborations
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Capture briefing calls, track deliverables discussed, and repurpose influencer
                content across channels.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Megaphone size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Campaign Planning
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Document brainstorming sessions, capture creative ideas, and maintain alignment
                across distributed teams.
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
            Marketing Teams See Real Results
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
                10x
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Content Output
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                From single recordings
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
                85%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Time Saved
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                On content repurposing
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
                3.2x
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Higher Engagement
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                With customer quotes
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
                62%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Better Conversion
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                Using VoC insights
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
              "OpenMeet is a content goldmine. We turned one customer interview into a case study,
              three blog posts, and a month of social content. Our messaging now uses actual
              customer language, and conversions are up 62%."
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
                <p style={{ fontWeight: '600' }}>Emily Watson</p>
                <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                  CMO, SaaS Innovations
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
            Turn Conversations into Campaigns
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--ff-text-secondary)',
            marginBottom: '32px',
            position: 'relative',
            zIndex: 1
          }}>
            Join innovative marketing teams creating more content with less effort.
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
            No credit card required • 10GB free storage • Unlimited team members
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