'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function PartnersPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    partnerType: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Partner application submitted:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div style={{ background: 'var(--ff-bg-dark, #000211)', minHeight: '100vh' }}>
      <Navigation />

      {/* Hero Section */}
      <section style={{
        padding: '120px 24px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background gradient */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(122, 90, 248, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '24px',
            lineHeight: '1.1'
          }}>
            Partner With OpenMeet
          </h1>
          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: '600px',
            margin: '0 auto 48px'
          }}>
            Grow your business with meeting intelligence
          </p>
        </div>
      </section>

      {/* Partner Programs */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 3vw, 2.5rem)',
            fontWeight: '600',
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '64px'
          }}>
            Partner Programs
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px'
          }}>
            {/* Reseller Partners */}
            <div style={{
              background: 'var(--ff-bg-layer, #0a0a1a)',
              borderRadius: '16px',
              padding: '40px 32px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(122, 90, 248, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--ff-purple-500, #7a5af8), #9b7bff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                  <path d="M2 17L12 22L22 17" />
                  <path d="M2 12L12 17L22 12" />
                </svg>
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '16px'
              }}>
                Reseller Partners
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.95rem',
                lineHeight: '1.8'
              }}>
                <li>• Sell OpenMeet to your customers</li>
                <li>• Revenue share model</li>
                <li>• Sales enablement</li>
              </ul>
            </div>

            {/* Technology Partners */}
            <div style={{
              background: 'var(--ff-bg-layer, #0a0a1a)',
              borderRadius: '16px',
              padding: '40px 32px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(122, 90, 248, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--ff-purple-500, #7a5af8), #9b7bff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M9 9h6v6h-6z" />
                </svg>
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '16px'
              }}>
                Technology Partners
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.95rem',
                lineHeight: '1.8'
              }}>
                <li>• Integrate with our API</li>
                <li>• Co-marketing opportunities</li>
                <li>• Technical support</li>
              </ul>
            </div>

            {/* Solution Partners */}
            <div style={{
              background: 'var(--ff-bg-layer, #0a0a1a)',
              borderRadius: '16px',
              padding: '40px 32px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(122, 90, 248, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--ff-purple-500, #7a5af8), #9b7bff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '16px'
              }}>
                Solution Partners
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.95rem',
                lineHeight: '1.8'
              }}>
                <li>• Implementation services</li>
                <li>• Custom solutions</li>
                <li>• Consulting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Benefits */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(180deg, transparent, rgba(122, 90, 248, 0.05), transparent)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 3vw, 2.5rem)',
            fontWeight: '600',
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '64px'
          }}>
            Partner Benefits
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '32px'
          }}>
            {[
              { title: 'Revenue Share', description: 'Up to 30% commission' },
              { title: 'Co-marketing Funds', description: 'Joint marketing campaigns' },
              { title: 'Partner Manager', description: 'Dedicated support team' },
              { title: 'Early Access', description: 'Beta features & updates' },
              { title: 'Training & Certification', description: 'Comprehensive onboarding' },
              { title: 'Partner Portal', description: 'Resources & tools access' }
            ].map((benefit, index) => (
              <div key={index} style={{
                textAlign: 'center',
                padding: '32px 24px',
                background: 'var(--ff-bg-layer, #0a0a1a)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--ff-purple-500, #7a5af8)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '12px'
                }}>
                  {benefit.title}
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.95rem'
                }}>
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Current Partners */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 3vw, 2.5rem)',
            fontWeight: '600',
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '64px'
          }}>
            Our Partners
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '32px',
            alignItems: 'center'
          }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{
                height: '60px',
                background: 'var(--ff-bg-layer, #0a0a1a)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                opacity: 0.7,
                transition: 'opacity 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem' }}>
                  Partner Logo {i}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(180deg, transparent, rgba(122, 90, 248, 0.05), transparent)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 3vw, 2.5rem)',
            fontWeight: '600',
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '64px'
          }}>
            How It Works
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '48px',
            position: 'relative'
          }}>
            {/* Connection lines for desktop */}
            <div className="hidden md:block absolute" style={{
              top: '40px',
              left: '25%',
              right: '25%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--ff-purple-500, #7a5af8), var(--ff-purple-500, #7a5af8), transparent)',
              opacity: 0.3
            }} />

            {[
              { step: '1', title: 'Apply', description: 'Fill out the partner application form' },
              { step: '2', title: 'Get Approved', description: 'We review and approve your application' },
              { step: '3', title: 'Start Earning', description: 'Access resources and start growing' }
            ].map((item, index) => (
              <div key={index} style={{
                textAlign: 'center',
                position: 'relative'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--ff-purple-500, #7a5af8), #9b7bff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {item.step}
                </div>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '12px'
                }}>
                  {item.title}
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.95rem'
                }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Application Form */}
      <section style={{ padding: '80px 24px 120px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 3vw, 2.5rem)',
            fontWeight: '600',
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            Become a Partner
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            textAlign: 'center',
            marginBottom: '48px',
            fontSize: '1.1rem'
          }}>
            Join our partner ecosystem and grow your business
          </p>

          <form onSubmit={handleSubmit} style={{
            background: 'var(--ff-bg-layer, #0a0a1a)',
            borderRadius: '20px',
            padding: '48px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
              marginBottom: '24px'
            }}>
              <div>
                <label htmlFor="companyName" style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.95rem',
                  fontWeight: '500'
                }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--ff-purple-500, #7a5af8)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                />
              </div>

              <div>
                <label htmlFor="contactName" style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.95rem',
                  fontWeight: '500'
                }}>
                  Contact Name *
                </label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  required
                  value={formData.contactName}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--ff-purple-500, #7a5af8)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
              marginBottom: '24px'
            }}>
              <div>
                <label htmlFor="email" style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.95rem',
                  fontWeight: '500'
                }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--ff-purple-500, #7a5af8)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                />
              </div>

              <div>
                <label htmlFor="phone" style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.95rem',
                  fontWeight: '500'
                }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--ff-purple-500, #7a5af8)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="partnerType" style={{
                display: 'block',
                marginBottom: '8px',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.95rem',
                fontWeight: '500'
              }}>
                Partner Type *
              </label>
              <select
                id="partnerType"
                name="partnerType"
                required
                value={formData.partnerType}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  cursor: 'pointer'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--ff-purple-500, #7a5af8)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
              >
                <option value="" style={{ background: '#0a0a1a' }}>Select partner type</option>
                <option value="reseller" style={{ background: '#0a0a1a' }}>Reseller Partner</option>
                <option value="technology" style={{ background: '#0a0a1a' }}>Technology Partner</option>
                <option value="solution" style={{ background: '#0a0a1a' }}>Solution Partner</option>
              </select>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label htmlFor="message" style={{
                display: 'block',
                marginBottom: '8px',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.95rem',
                fontWeight: '500'
              }}>
                Tell us about your business and partnership goals
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                value={formData.message}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--ff-purple-500, #7a5af8)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '16px 32px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--ff-purple-500, #7a5af8), #9b7bff)',
                color: '#ffffff',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(122, 90, 248, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Submit Application
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}