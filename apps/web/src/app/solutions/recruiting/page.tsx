'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Users,
  Search,
  Calendar,
  Brain,
  Clock,
  FileCheck,
  Briefcase,
  UserCheck,
  Shield,
  CheckCircle,
  ArrowRight,
  Quote,
  Star,
  Filter
} from 'lucide-react';

export default function RecruitingSolutionPage() {
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
              <Users size={16} style={{ color: 'var(--ff-purple-500)' }} />
              <span style={{ fontSize: '14px', color: 'var(--ff-purple-500)' }}>For Recruiting Teams</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 'bold',
              marginBottom: '24px',
              background: 'linear-gradient(to right, #ffffff, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Hire Top Talent 3x Faster with AI Interview Intelligence
            </h1>

            <p style={{
              fontSize: '1.25rem',
              color: 'var(--ff-text-secondary)',
              maxWidth: '800px',
              margin: '0 auto 40px',
              lineHeight: '1.6'
            }}>
              Streamline your hiring process with automatic interview transcription, candidate insights,
              and collaborative evaluation tools that help you make better hiring decisions.
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
                See How It Works
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
            67% of Recruiters Struggle with Interview Documentation
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--ff-text-secondary)',
            textAlign: 'center',
            marginBottom: '48px',
            maxWidth: '800px',
            margin: '0 auto 48px'
          }}>
            Manual note-taking leads to bias, inconsistent evaluations, and missed red flags
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
                Time-Consuming Process
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Recruiters waste 40% of their time on administrative tasks instead of sourcing and engaging candidates
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'rgba(122, 90, 248, 0.05)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Search size={32} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Poor Candidate Experience
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Delayed feedback and lack of transparency frustrates candidates and damages employer brand
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'rgba(122, 90, 248, 0.05)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <FileCheck size={32} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Compliance Risks
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Incomplete documentation exposes companies to legal risks and EEOC compliance issues
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
            How OpenMeet Transforms Recruiting
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
                  <Brain size={24} style={{ color: 'var(--ff-purple-500)' }} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
                  AI-Powered Candidate Insights
                </h3>
                <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  Automatically extract skills, experience, and cultural fit indicators from interviews.
                  Get objective candidate scorecards based on your evaluation criteria.
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Skill assessment and competency mapping</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Behavioral answer analysis (STAR method)</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Red flag and enthusiasm detection</span>
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
                <Brain size={80} style={{ color: 'var(--ff-purple-500)', opacity: 0.3 }} />
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
                  <UserCheck size={24} style={{ color: 'var(--ff-purple-500)' }} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
                  Collaborative Hiring Decisions
                </h3>
                <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  Share interview recordings and insights with hiring managers. Collect structured feedback
                  and make data-driven decisions faster.
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Timestamped highlights and clips</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Standardized evaluation forms</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>ATS integration (Greenhouse, Lever, Workday)</span>
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
                <Users size={80} style={{ color: 'var(--ff-purple-500)', opacity: 0.3 }} />
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
            Recruiting Workflows Enhanced by OpenMeet
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
              <Filter size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Phone Screens
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Quickly assess candidate fit with automatic summaries of key qualifications,
                salary expectations, and availability. Share recordings with hiring managers.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Briefcase size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Technical Interviews
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Capture coding discussions, problem-solving approaches, and technical competencies.
                Generate detailed technical assessment reports automatically.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Star size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Culture Fit Interviews
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Analyze soft skills, team dynamics, and cultural alignment. Track consistent
                evaluation criteria across all interviewers.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Shield size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Reference Checks
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Document reference conversations with searchable transcripts. Ensure compliance
                with complete audit trails of all hiring decisions.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Calendar size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Panel Interviews
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Coordinate multiple interviewers with shared notes and synchronized feedback.
                Compare evaluations side-by-side for consensus building.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <UserCheck size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Executive Hiring
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Maintain confidentiality with secure recordings and controlled access. Create
                comprehensive candidate profiles for board-level decisions.
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
            Measurable Impact on Hiring
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
                65%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Faster Time-to-Hire
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                From 45 days to 16 days average
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
                8 hrs
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Saved Per Hire
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                On documentation and admin
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
                92%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Hiring Manager Satisfaction
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                Better candidate insights
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
                43%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Higher Quality Hires
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                Lower 90-day turnover
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
              "OpenMeet revolutionized our hiring process. We're making better hiring decisions faster,
              and our candidates love the transparency. The AI insights have helped us reduce bias
              and improve diversity in our hiring."
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
                <p style={{ fontWeight: '600' }}>Michael Rodriguez</p>
                <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                  Head of Talent Acquisition, StartupCo
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
            Build Your Dream Team Faster
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--ff-text-secondary)',
            marginBottom: '32px',
            position: 'relative',
            zIndex: 1
          }}>
            Join leading companies using OpenMeet to transform their recruiting process.
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
            No credit card required • 14-day free trial • GDPR & SOC 2 compliant
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