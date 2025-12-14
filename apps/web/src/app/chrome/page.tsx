'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Chrome,
  Download,
  Shield,
  Zap,
  MousePointer,
  Lock,
  CheckCircle,
  Mic,
  FileText,
  Video,
  Users,
  Globe,
  ArrowRight,
  Star
} from 'lucide-react';
import { useState } from 'react';
import styles from './page.module.css';

export default function ChromeExtensionPage() {
  const [activeTab, setActiveTab] = useState('zoom');

  return (
    <div className={styles.container}>
      <Navigation />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <Chrome className={styles.badgeIcon} />
            <span>Chrome Extension</span>
          </div>

          <h1 className={styles.heroTitle}>
            Capture Any Meeting
            <span className={styles.heroGradient}>Right From Your Browser</span>
          </h1>

          <p className={styles.heroDescription}>
            No bots. No downloads. Just one-click recording for any browser-based meeting.
            Works with Zoom, Google Meet, Teams, and any audio/video content.
          </p>

          <div className={styles.heroCta}>
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.primaryButton}
            >
              <Chrome size={20} />
              Add to Chrome - It's Free
            </a>
            <button className={styles.secondaryButton}>
              <span>Watch Demo</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <Star className={styles.statIcon} />
              <span>4.8/5 Rating</span>
            </div>
            <div className={styles.stat}>
              <Users className={styles.statIcon} />
              <span>50K+ Users</span>
            </div>
            <div className={styles.stat}>
              <Globe className={styles.statIcon} />
              <span>Works Everywhere</span>
            </div>
          </div>
        </div>

        {/* Browser Mockup */}
        <div className={styles.browserMockup}>
          <div className={styles.browserBar}>
            <div className={styles.browserDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className={styles.browserUrl}>
              <Lock size={14} />
              <span>meet.google.com</span>
            </div>
            <div className={styles.extensionIcon}>
              <div className={styles.extensionActive}>
                <span className={styles.recordingDot}></span>
                Recording
              </div>
            </div>
          </div>

          <div className={styles.browserContent}>
            <div className={styles.meetingTabs}>
              <button
                className={`${styles.tab} ${activeTab === 'zoom' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('zoom')}
              >
                Zoom
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'meet' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('meet')}
              >
                Google Meet
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'teams' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('teams')}
              >
                Teams
              </button>
            </div>

            <div className={styles.meetingInterface}>
              <div className={styles.videoGrid}>
                <div className={styles.videoTile}>
                  <div className={styles.videoAvatar}>JD</div>
                  <span className={styles.videoName}>John Doe</span>
                </div>
                <div className={styles.videoTile}>
                  <div className={styles.videoAvatar}>SM</div>
                  <span className={styles.videoName}>Sarah Miller</span>
                </div>
                <div className={styles.videoTile}>
                  <div className={styles.videoAvatar}>RJ</div>
                  <span className={styles.videoName}>Robert Johnson</span>
                </div>
                <div className={styles.videoTile}>
                  <div className={styles.videoAvatar}>EW</div>
                  <span className={styles.videoName}>Emma Wilson</span>
                </div>
              </div>

              <div className={styles.extensionOverlay}>
                <div className={styles.overlayContent}>
                  <Mic className={styles.overlayIcon} />
                  <span>Recording in progress...</span>
                  <span className={styles.timer}>00:12:45</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2>One Extension. Every Meeting Platform.</h2>
          <p>Works seamlessly with any browser-based meeting or media content</p>
        </div>

        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Globe />
            </div>
            <h3>Universal Compatibility</h3>
            <p>Works with Zoom, Google Meet, Teams, Webex, and any browser-based meeting platform</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <MousePointer />
            </div>
            <h3>One-Click Recording</h3>
            <p>Start recording instantly with a single click. No complex setup or configurations needed</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <FileText />
            </div>
            <h3>Auto-Transcription</h3>
            <p>Get accurate transcripts in real-time with speaker identification and timestamps</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Video />
            </div>
            <h3>Audio & Video Content</h3>
            <p>Record YouTube videos, podcasts, webinars, and any audio/video content in your browser</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Zap />
            </div>
            <h3>No Bot Required</h3>
            <p>Records directly from your browser - no meeting bots, no participant notifications</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Shield />
            </div>
            <h3>Privacy First</h3>
            <p>Your recordings stay private. No third-party access, encrypted end-to-end</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howItWorks}>
        <div className={styles.sectionHeader}>
          <h2>Start Recording in 3 Simple Steps</h2>
          <p>Get up and running in less than a minute</p>
        </div>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <h3>Install Extension</h3>
              <p>Add OpenMeet to Chrome from the Web Store with one click</p>
              <div className={styles.stepVisual}>
                <div className={styles.miniMockup}>
                  <Chrome className={styles.miniIcon} />
                  <span>Add to Chrome</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.stepConnector}></div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h3>Join Your Meeting</h3>
              <p>Open any meeting in your browser - Zoom, Meet, Teams, or others</p>
              <div className={styles.stepVisual}>
                <div className={styles.miniMockup}>
                  <Users className={styles.miniIcon} />
                  <span>Meeting in Progress</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.stepConnector}></div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <h3>Click to Record</h3>
              <p>Click the OpenMeet icon and start recording. Transcription begins automatically</p>
              <div className={styles.stepVisual}>
                <div className={styles.miniMockup}>
                  <div className={styles.recordButton}>
                    <span className={styles.recordDot}></span>
                    <span>Recording</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Security */}
      <section className={styles.privacy}>
        <div className={styles.privacyContent}>
          <div className={styles.privacyText}>
            <h2>Your Privacy is Our Priority</h2>
            <p className={styles.privacyLead}>
              Record meetings with confidence. OpenMeet ensures your data stays secure and private.
            </p>

            <div className={styles.privacyFeatures}>
              <div className={styles.privacyItem}>
                <CheckCircle className={styles.checkIcon} />
                <div>
                  <h4>Local Processing</h4>
                  <p>Audio processing happens locally in your browser when possible</p>
                </div>
              </div>

              <div className={styles.privacyItem}>
                <CheckCircle className={styles.checkIcon} />
                <div>
                  <h4>End-to-End Encryption</h4>
                  <p>All recordings are encrypted before being stored</p>
                </div>
              </div>

              <div className={styles.privacyItem}>
                <CheckCircle className={styles.checkIcon} />
                <div>
                  <h4>No Meeting Bots</h4>
                  <p>Records directly from your browser - invisible to other participants</p>
                </div>
              </div>

              <div className={styles.privacyItem}>
                <CheckCircle className={styles.checkIcon} />
                <div>
                  <h4>GDPR Compliant</h4>
                  <p>Fully compliant with GDPR, CCPA, and other privacy regulations</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.privacyVisual}>
            <div className={styles.securityBadge}>
              <Shield className={styles.shieldIcon} />
              <div className={styles.securityRings}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Installation Guide */}
      <section className={styles.installation}>
        <div className={styles.sectionHeader}>
          <h2>Quick Installation Guide</h2>
          <p>Get OpenMeet up and running in seconds</p>
        </div>

        <div className={styles.installationSteps}>
          <div className={styles.installStep}>
            <div className={styles.installIcon}>
              <Download />
            </div>
            <h3>1. Click "Add to Chrome"</h3>
            <p>Visit the Chrome Web Store and click the install button</p>
          </div>

          <div className={styles.installStep}>
            <div className={styles.installIcon}>
              <CheckCircle />
            </div>
            <h3>2. Grant Permissions</h3>
            <p>Allow microphone and tab audio capture permissions</p>
          </div>

          <div className={styles.installStep}>
            <div className={styles.installIcon}>
              <Zap />
            </div>
            <h3>3. Pin to Toolbar</h3>
            <p>Pin OpenMeet to your toolbar for quick access</p>
          </div>
        </div>

        <div className={styles.compatibilityNote}>
          <div className={styles.compatibilityIcon}>
            <Chrome />
          </div>
          <div>
            <h4>Browser Compatibility</h4>
            <p>Works with Chrome, Edge, Brave, and all Chromium-based browsers</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2>Ready to Never Miss a Detail?</h2>
          <p>Join thousands of professionals who trust OpenMeet to capture their meetings</p>

          <div className={styles.ctaButtons}>
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaPrimary}
            >
              <Chrome size={24} />
              <div>
                <span className={styles.ctaLabel}>Available in the</span>
                <span className={styles.ctaText}>Chrome Web Store</span>
              </div>
            </a>
          </div>

          <div className={styles.ctaFeatures}>
            <span><CheckCircle size={16} /> Free to try</span>
            <span><CheckCircle size={16} /> No credit card required</span>
            <span><CheckCircle size={16} /> 1-minute setup</span>
          </div>
        </div>

        <div className={styles.ctaVisual}>
          <div className={styles.floatingCard}>
            <div className={styles.floatingHeader}>
              <span className={styles.recordingIndicator}></span>
              <span>Recording Active</span>
            </div>
            <div className={styles.floatingStats}>
              <div>
                <span className={styles.statLabel}>Duration</span>
                <span className={styles.statValue}>45:23</span>
              </div>
              <div>
                <span className={styles.statLabel}>Speakers</span>
                <span className={styles.statValue}>4</span>
              </div>
              <div>
                <span className={styles.statLabel}>Words</span>
                <span className={styles.statValue}>3,247</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}