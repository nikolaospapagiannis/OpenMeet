'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Brain,
  MessageSquare,
  Shield,
  ArrowRight,
  Play,
  Users,
  Headphones,
  Briefcase,
  UserCheck,
  Clock,
  AlertCircle,
  TrendingUp,
  Bot,
  Mic,
  Video
} from 'lucide-react'
import './live-assist.css'

export default function LiveAssistPage() {
  return (
    <div className="live-assist-page">
      <Navigation />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="gradient-orb gradient-orb-1"></div>
          <div className="gradient-orb gradient-orb-2"></div>
          <div className="grid-pattern"></div>
        </div>

        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles className="badge-icon" />
              <span>AI-Powered Meeting Assistant</span>
            </div>

            <h1 className="hero-title">
              Real-Time AI Assistant
              <span className="title-gradient">for Live Meetings</span>
            </h1>

            <p className="hero-description">
              Get instant AI suggestions, fact-checking, and smart answers during your meetings.
              Never miss important details or struggle for the right words again.
            </p>

            <div className="hero-actions">
              <button className="btn btn-primary">
                <Zap className="btn-icon" />
                Try Live Assist Free
              </button>
              <button className="btn btn-secondary">
                <Play className="btn-icon" />
                Watch Demo
              </button>
            </div>

            <div className="hero-stats">
              <div className="stat">
                <span className="stat-value">10M+</span>
                <span className="stat-label">Meeting Minutes Enhanced</span>
              </div>
              <div className="stat">
                <span className="stat-value">95%</span>
                <span className="stat-label">Accuracy Rate</span>
              </div>
              <div className="stat">
                <span className="stat-value">2.5x</span>
                <span className="stat-label">Faster Response Time</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="meeting-interface">
              <div className="meeting-header">
                <div className="meeting-controls">
                  <Mic className="control-icon" />
                  <Video className="control-icon" />
                </div>
              </div>
              <div className="ai-suggestions">
                <div className="suggestion-card active">
                  <Brain className="suggestion-icon" />
                  <div className="suggestion-content">
                    <span className="suggestion-label">Smart Suggestion</span>
                    <p>"Based on the discussion, you might want to mention the Q3 revenue growth of 28%"</p>
                  </div>
                </div>
                <div className="suggestion-card">
                  <CheckCircle2 className="suggestion-icon" />
                  <div className="suggestion-content">
                    <span className="suggestion-label">Fact Verified</span>
                    <p>"The compliance deadline is indeed March 31st, 2024"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              Supercharge Your Meetings with
              <span className="title-gradient">AI Intelligence</span>
            </h2>
            <p className="section-description">
              Live Assist provides real-time AI support that enhances every conversation
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <MessageSquare className="feature-icon" />
              </div>
              <h3 className="feature-title">Live Suggestions</h3>
              <p className="feature-description">
                Get contextual suggestions and talking points as the conversation unfolds
              </p>
              <ul className="feature-list">
                <li>Smart response recommendations</li>
                <li>Key point reminders</li>
                <li>Context-aware prompts</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Shield className="feature-icon" />
              </div>
              <h3 className="feature-title">Real-Time Fact-Checking</h3>
              <p className="feature-description">
                Instantly verify facts, figures, and claims during discussions
              </p>
              <ul className="feature-list">
                <li>Automatic fact verification</li>
                <li>Source citations</li>
                <li>Error detection alerts</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Zap className="feature-icon" />
              </div>
              <h3 className="feature-title">Instant Answers</h3>
              <p className="feature-description">
                Get immediate answers to questions without interrupting the flow
              </p>
              <ul className="feature-list">
                <li>Quick data retrieval</li>
                <li>Historical context</li>
                <li>Relevant documentation</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Brain className="feature-icon" />
              </div>
              <h3 className="feature-title">Smart Prompts</h3>
              <p className="feature-description">
                AI-generated questions and prompts to deepen conversations
              </p>
              <ul className="feature-list">
                <li>Follow-up questions</li>
                <li>Clarification requests</li>
                <li>Discussion starters</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              How Live Assist
              <span className="title-gradient">Works</span>
            </h2>
            <p className="section-description">
              Get started in three simple steps
            </p>
          </div>

          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">01</div>
              <div className="step-content">
                <h3 className="step-title">Connect Your Meeting</h3>
                <p className="step-description">
                  Integrate Live Assist with your preferred meeting platform - Zoom, Teams, or Google Meet
                </p>
              </div>
              <div className="step-visual">
                <div className="integration-icons">
                  <div className="integration-icon">Z</div>
                  <div className="integration-icon">T</div>
                  <div className="integration-icon">G</div>
                </div>
              </div>
            </div>

            <div className="process-step">
              <div className="step-number">02</div>
              <div className="step-content">
                <h3 className="step-title">AI Analyzes in Real-Time</h3>
                <p className="step-description">
                  Our AI listens to the conversation and provides instant insights without recording
                </p>
              </div>
              <div className="step-visual">
                <div className="ai-processing">
                  <Bot className="processing-icon" />
                  <div className="processing-waves">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="process-step">
              <div className="step-number">03</div>
              <div className="step-content">
                <h3 className="step-title">Get Smart Assistance</h3>
                <p className="step-description">
                  Receive real-time suggestions, fact-checks, and answers directly in your meeting interface
                </p>
              </div>
              <div className="step-visual">
                <div className="assistance-preview">
                  <CheckCircle2 className="preview-icon" />
                  <div className="preview-text">Smart suggestion available</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="use-cases-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              Perfect for Every
              <span className="title-gradient">Meeting Type</span>
            </h2>
            <p className="section-description">
              Live Assist adapts to your specific meeting needs
            </p>
          </div>

          <div className="use-cases-grid">
            <div className="use-case-card">
              <div className="use-case-icon">
                <Briefcase />
              </div>
              <h3 className="use-case-title">Sales Calls</h3>
              <p className="use-case-description">
                Close deals faster with instant access to product specs, pricing, and competitive intelligence
              </p>
              <div className="use-case-benefits">
                <span className="benefit">+45% Close Rate</span>
                <span className="benefit">2x Faster Responses</span>
              </div>
            </div>

            <div className="use-case-card">
              <div className="use-case-icon">
                <Headphones />
              </div>
              <h3 className="use-case-title">Customer Support</h3>
              <p className="use-case-description">
                Provide accurate solutions instantly with AI-powered knowledge base access
              </p>
              <div className="use-case-benefits">
                <span className="benefit">-60% Resolution Time</span>
                <span className="benefit">98% Accuracy</span>
              </div>
            </div>

            <div className="use-case-card">
              <div className="use-case-icon">
                <UserCheck />
              </div>
              <h3 className="use-case-title">Interviews</h3>
              <p className="use-case-description">
                Ask better questions and evaluate candidates with AI-suggested interview prompts
              </p>
              <div className="use-case-benefits">
                <span className="benefit">Better Hiring</span>
                <span className="benefit">Consistent Process</span>
              </div>
            </div>

            <div className="use-case-card">
              <div className="use-case-icon">
                <Users />
              </div>
              <h3 className="use-case-title">Team Meetings</h3>
              <p className="use-case-description">
                Keep discussions on track with smart agenda management and action item tracking
              </p>
              <div className="use-case-benefits">
                <span className="benefit">30% More Productive</span>
                <span className="benefit">Clear Actions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="comparison-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              The Live Assist
              <span className="title-gradient">Difference</span>
            </h2>
            <p className="section-description">
              See how meetings transform with AI assistance
            </p>
          </div>

          <div className="comparison-grid">
            <div className="comparison-column before">
              <h3 className="comparison-title">
                <AlertCircle className="comparison-icon" />
                Without Live Assist
              </h3>
              <ul className="comparison-list">
                <li className="comparison-item negative">
                  <Clock className="item-icon" />
                  <span>Scrambling for information mid-call</span>
                </li>
                <li className="comparison-item negative">
                  <Clock className="item-icon" />
                  <span>Missing important follow-up questions</span>
                </li>
                <li className="comparison-item negative">
                  <Clock className="item-icon" />
                  <span>Uncertain about facts and figures</span>
                </li>
                <li className="comparison-item negative">
                  <Clock className="item-icon" />
                  <span>Lost opportunities due to slow responses</span>
                </li>
                <li className="comparison-item negative">
                  <Clock className="item-icon" />
                  <span>Repetitive questions across meetings</span>
                </li>
              </ul>
            </div>

            <div className="comparison-column after">
              <h3 className="comparison-title">
                <CheckCircle2 className="comparison-icon" />
                With Live Assist
              </h3>
              <ul className="comparison-list">
                <li className="comparison-item positive">
                  <TrendingUp className="item-icon" />
                  <span>Instant access to all relevant data</span>
                </li>
                <li className="comparison-item positive">
                  <TrendingUp className="item-icon" />
                  <span>AI-suggested questions at perfect moments</span>
                </li>
                <li className="comparison-item positive">
                  <TrendingUp className="item-icon" />
                  <span>Real-time fact verification and accuracy</span>
                </li>
                <li className="comparison-item positive">
                  <TrendingUp className="item-icon" />
                  <span>Quick, confident responses that close deals</span>
                </li>
                <li className="comparison-item positive">
                  <TrendingUp className="item-icon" />
                  <span>Learning from every meeting interaction</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">
              Ready to Transform Your
              <span className="title-gradient">Meeting Experience?</span>
            </h2>
            <p className="cta-description">
              Join thousands of professionals using Live Assist to have more productive,
              confident, and successful meetings every day.
            </p>

            <div className="cta-features">
              <div className="cta-feature">
                <CheckCircle2 className="cta-feature-icon" />
                <span>14-day free trial</span>
              </div>
              <div className="cta-feature">
                <CheckCircle2 className="cta-feature-icon" />
                <span>No credit card required</span>
              </div>
              <div className="cta-feature">
                <CheckCircle2 className="cta-feature-icon" />
                <span>Cancel anytime</span>
              </div>
            </div>

            <div className="cta-actions">
              <button className="btn btn-primary btn-large">
                <Sparkles className="btn-icon" />
                Try Live Assist Free
                <ArrowRight className="btn-icon-right" />
              </button>
              <button className="btn btn-secondary btn-large">
                Schedule Demo
              </button>
            </div>

            <p className="cta-note">
              Trusted by 50,000+ professionals at companies like Google, Microsoft, and Amazon
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}