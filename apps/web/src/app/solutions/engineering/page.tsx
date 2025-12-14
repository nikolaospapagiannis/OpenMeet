'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Code,
  Terminal,
  GitBranch,
  Bug,
  Cpu,
  FileCode,
  Rocket,
  Users,
  Shield,
  CheckCircle,
  ArrowRight,
  Quote,
  Zap,
  Database
} from 'lucide-react';

export default function EngineeringSolutionPage() {
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
              <Code size={16} style={{ color: 'var(--ff-purple-500)' }} />
              <span style={{ fontSize: '14px', color: 'var(--ff-purple-500)' }}>For Engineering Teams</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 'bold',
              marginBottom: '24px',
              background: 'linear-gradient(to right, #ffffff, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Document Technical Decisions Automatically
            </h1>

            <p style={{
              fontSize: '1.25rem',
              color: 'var(--ff-text-secondary)',
              maxWidth: '800px',
              margin: '0 auto 40px',
              lineHeight: '1.6'
            }}>
              Capture architecture discussions, code reviews, and incident postmortems.
              Build institutional knowledge that scales with your engineering team.
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
                See Technical Demo
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
            Engineering Teams Lose 30% Productivity to Context Switching
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--ff-text-secondary)',
            textAlign: 'center',
            marginBottom: '48px',
            maxWidth: '800px',
            margin: '0 auto 48px'
          }}>
            Critical technical decisions and knowledge disappear in undocumented meetings
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
              <Terminal size={32} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Knowledge Silos
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Technical decisions and architectural knowledge trapped with individual engineers, lost when they leave
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'rgba(122, 90, 248, 0.05)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Bug size={32} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Repeated Mistakes
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Same bugs and architectural issues resurface because postmortems aren't properly documented
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
                Onboarding Delays
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                New engineers take months to understand system architecture and past decisions without documentation
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
            How OpenMeet Accelerates Engineering Teams
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
                  <Database size={24} style={{ color: 'var(--ff-purple-500)' }} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
                  Technical Knowledge Base
                </h3>
                <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  Automatically build a searchable repository of all technical discussions, architecture
                  decisions, and code review feedback. Never lose institutional knowledge again.
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Architecture Decision Records (ADRs)</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>System design documentation</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Code review insights and patterns</span>
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
                <GitBranch size={80} style={{ color: 'var(--ff-purple-500)', opacity: 0.3 }} />
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
                  <Shield size={24} style={{ color: 'var(--ff-purple-500)' }} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
                  Incident Response & Postmortems
                </h3>
                <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  Document incident calls, root cause analysis, and action items. Build a learning
                  culture where mistakes become valuable knowledge for the entire team.
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Automatic timeline reconstruction</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Action item tracking and follow-up</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--ff-purple-500)', flexShrink: 0 }} />
                    <span>Pattern analysis across incidents</span>
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
                <Shield size={80} style={{ color: 'var(--ff-purple-500)', opacity: 0.3 }} />
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
            Engineering Workflows Enhanced by OpenMeet
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
              <Cpu size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Architecture Reviews
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Capture design discussions, trade-offs, and decisions. Create searchable ADRs
                that explain the "why" behind your architecture.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <FileCode size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Code Reviews
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Document verbal code review feedback and pair programming sessions. Build
                a library of best practices and common patterns.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Terminal size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Daily Standups
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Track blockers, commitments, and progress automatically. Generate daily
                summaries and identify recurring issues.
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'var(--ff-bg-dark)',
              borderRadius: '12px',
              border: '1px solid var(--ff-border)'
            }}>
              <Rocket size={24} style={{ color: 'var(--ff-purple-500)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Sprint Planning
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Document technical requirements, effort estimates, and dependencies.
                Keep everyone aligned on sprint goals and deliverables.
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
                Debugging Sessions
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Record troubleshooting approaches and solutions. Create a searchable
                database of solved problems and debugging strategies.
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
                Tech Talks
              </h3>
              <p style={{ color: 'var(--ff-text-secondary)', lineHeight: '1.6' }}>
                Transform internal presentations into permanent learning resources.
                Make knowledge sharing scalable across teams and time zones.
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
            Engineering Impact Metrics
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
                60%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Faster Onboarding
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                New engineers productive in days
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
                45%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Fewer Repeat Incidents
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                Learning from postmortems
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
                Saved Weekly Per Dev
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                Less context switching
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
                94%
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Knowledge Retention
              </p>
              <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                When engineers leave
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
              "OpenMeet solved our knowledge management problem. Every technical discussion is now
              searchable. New engineers get up to speed 60% faster, and we haven't repeated
              the same architectural mistakes since implementing it."
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
                <p style={{ fontWeight: '600' }}>Alex Kumar</p>
                <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.875rem' }}>
                  CTO, CloudScale Systems
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
            Never Lose Technical Knowledge Again
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--ff-text-secondary)',
            marginBottom: '32px',
            position: 'relative',
            zIndex: 1
          }}>
            Join engineering teams building better systems with OpenMeet's conversation intelligence.
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
            No credit card required • Self-hosted options available • SOC 2 Type II
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