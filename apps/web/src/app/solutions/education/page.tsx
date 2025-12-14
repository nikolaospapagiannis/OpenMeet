'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  GraduationCap,
  Clock,
  BookOpen,
  Users,
  Lightbulb,
  Brain,
  FileText,
  CheckCircle2,
  ArrowRight,
  Star,
  Globe,
  Award
} from 'lucide-react';

export default function EducationPage() {
  return (
    <main className="min-h-screen bg-[var(--ff-bg-dark)]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--ff-purple-500)]/10 border border-[var(--ff-purple-500)]/20 mb-8">
              <GraduationCap className="w-4 h-4 text-[var(--ff-purple-500)]" />
              <span className="text-sm text-[var(--ff-purple-500)] font-medium">For Education</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--ff-text-primary)] mb-6">
              Enhance Learning Outcomes with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] block mt-2">
                AI-Powered Lecture Intelligence
              </span>
            </h1>

            <p className="text-xl text-[var(--ff-text-secondary)] mb-8 leading-relaxed">
              Transform lectures, seminars, and study sessions into searchable knowledge bases.
              Help students focus on learning while AI captures every important detail.
            </p>

            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-4 bg-[var(--ff-purple-500)] text-white rounded-lg font-semibold hover:bg-[var(--ff-purple-600)] transition-colors flex items-center gap-2">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 bg-[var(--ff-bg-layer)] text-[var(--ff-text-primary)] rounded-lg font-semibold hover:bg-[var(--ff-bg-layer)]/80 transition-colors border border-[var(--ff-border)]">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 px-6 bg-[var(--ff-bg-layer)]/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--ff-text-primary)] mb-4">
            Students miss 40% of lecture content while taking notes
          </h2>
          <p className="text-lg text-[var(--ff-text-secondary)] mb-12 max-w-3xl">
            Traditional note-taking prevents full engagement with learning materials
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: "Divided Attention",
                description: "Students struggle to listen, understand, and take notes simultaneously"
              },
              {
                icon: FileText,
                title: "Incomplete Notes",
                description: "Important concepts and explanations get missed during fast-paced lectures"
              },
              {
                icon: Users,
                title: "Accessibility Barriers",
                description: "Students with disabilities lack equal access to lecture content"
              },
              {
                icon: Globe,
                title: "Language Challenges",
                description: "Non-native speakers struggle to keep up with lecture pace and terminology"
              },
              {
                icon: BookOpen,
                title: "Poor Study Materials",
                description: "Handwritten notes are often incomplete, illegible, or disorganized"
              },
              {
                icon: Brain,
                title: "Lost Context",
                description: "Key connections and explanations are forgotten by exam time"
              }
            ].map((item, index) => (
              <div key={index} className="bg-[var(--ff-bg-layer)] rounded-xl p-6 border border-[var(--ff-border)]">
                <item.icon className="w-12 h-12 text-[var(--ff-purple-500)] mb-4" />
                <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-2">
                  {item.title}
                </h3>
                <p className="text-[var(--ff-text-secondary)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--ff-text-primary)] mb-4">
            Empower every student to succeed
          </h2>
          <p className="text-lg text-[var(--ff-text-secondary)] mb-12 max-w-3xl">
            OpenMeet automatically captures, transcribes, and organizes every learning session
          </p>

          <div className="space-y-6">
            {[
              {
                icon: Brain,
                title: "Smart Study Assistant",
                feature: "AI-Powered Learning Tools",
                description: "Generate study guides, flashcards, and practice questions from lecture content automatically.",
                benefits: ["Key concept extraction", "Auto-generated summaries", "Quiz creation"]
              },
              {
                icon: Globe,
                title: "Universal Access",
                feature: "Multi-Language Support",
                description: "Real-time transcription and translation in 30+ languages for inclusive learning.",
                benefits: ["Live captions", "Translation", "Speed control"]
              },
              {
                icon: Lightbulb,
                title: "Knowledge Management",
                feature: "Searchable Lecture Library",
                description: "Build a comprehensive knowledge base of all lectures, searchable by topic, date, or keyword.",
                benefits: ["Full-text search", "Topic tagging", "Cross-reference"]
              },
              {
                icon: Award,
                title: "Learning Analytics",
                feature: "Engagement Insights",
                description: "Track participation, comprehension, and learning patterns to improve outcomes.",
                benefits: ["Attendance tracking", "Engagement metrics", "Performance insights"]
              }
            ].map((item, index) => (
              <div key={index} className="bg-gradient-to-r from-[var(--ff-bg-layer)] to-transparent rounded-xl p-8 border border-[var(--ff-border)] hover:border-[var(--ff-purple-500)]/50 transition-colors">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-[var(--ff-purple-500)]/10 rounded-lg">
                    <item.icon className="w-8 h-8 text-[var(--ff-purple-500)]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-[var(--ff-text-primary)]">
                        {item.title}
                      </h3>
                      <span className="text-sm px-3 py-1 bg-[var(--ff-purple-500)]/20 text-[var(--ff-purple-500)] rounded-full">
                        {item.feature}
                      </span>
                    </div>
                    <p className="text-[var(--ff-text-secondary)] mb-4">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {item.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-sm text-[var(--ff-text-primary)]">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-6 bg-[var(--ff-bg-layer)]/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--ff-text-primary)] mb-12">
            Academic workflows transformed
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[var(--ff-bg-dark)] rounded-xl p-8 border border-[var(--ff-border)]">
              <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-4">
                Lectures & Seminars
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Automatic recording and transcription of all sessions
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Highlight key concepts and important dates
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Share recordings with absent students
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-[var(--ff-bg-dark)] rounded-xl p-8 border border-[var(--ff-border)]">
              <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-4">
                Study Groups
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Capture collaborative discussions and insights
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Create shared study notes automatically
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Track questions for professor follow-up
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-[var(--ff-bg-dark)] rounded-xl p-8 border border-[var(--ff-border)]">
              <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-4">
                Office Hours
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Document one-on-one guidance and feedback
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Create personalized study recommendations
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Track student progress and concerns
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-[var(--ff-bg-dark)] rounded-xl p-8 border border-[var(--ff-border)]">
              <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-4">
                Research Meetings
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Capture research discussions and hypotheses
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Document methodology and findings
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                  <span className="text-[var(--ff-text-secondary)]">
                    Create citations and references automatically
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--ff-text-primary)] mb-12 text-center">
            Measurable impact on learning
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-[var(--ff-purple-500)] mb-2">35%</div>
              <div className="text-lg font-semibold text-[var(--ff-text-primary)] mb-1">Better Grades</div>
              <div className="text-sm text-[var(--ff-text-secondary)]">Average improvement</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[var(--ff-purple-500)] mb-2">2.5hrs</div>
              <div className="text-lg font-semibold text-[var(--ff-text-primary)] mb-1">Saved Per Week</div>
              <div className="text-sm text-[var(--ff-text-secondary)]">On note organization</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[var(--ff-purple-500)] mb-2">89%</div>
              <div className="text-lg font-semibold text-[var(--ff-text-primary)] mb-1">Student Satisfaction</div>
              <div className="text-sm text-[var(--ff-text-secondary)]">Improved experience</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[var(--ff-purple-500)] mb-2">100%</div>
              <div className="text-lg font-semibold text-[var(--ff-text-primary)] mb-1">Content Capture</div>
              <div className="text-sm text-[var(--ff-text-secondary)]">Nothing missed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 px-6 bg-[var(--ff-bg-layer)]/30">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[var(--ff-purple-500)]/10 to-transparent rounded-2xl p-12 border border-[var(--ff-purple-500)]/20">
            <div className="flex items-center gap-2 mb-6">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <blockquote className="text-2xl text-[var(--ff-text-primary)] mb-6 leading-relaxed">
              "OpenMeet has revolutionized how our students learn. They can now focus entirely on understanding
              concepts during lectures, knowing every detail is captured. Grades have improved significantly."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/20 rounded-full"></div>
              <div>
                <div className="font-semibold text-[var(--ff-text-primary)]">Dr. Emily Thompson</div>
                <div className="text-sm text-[var(--ff-text-secondary)]">Professor of Biology, State University</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--ff-text-primary)] mb-6">
            Ready to transform education?
          </h2>
          <p className="text-xl text-[var(--ff-text-secondary)] mb-8">
            Join universities worldwide using OpenMeet to enhance learning outcomes
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="px-8 py-4 bg-[var(--ff-purple-500)] text-white rounded-lg font-semibold hover:bg-[var(--ff-purple-600)] transition-colors flex items-center gap-2">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 bg-[var(--ff-bg-layer)] text-[var(--ff-text-primary)] rounded-lg font-semibold hover:bg-[var(--ff-bg-layer)]/80 transition-colors border border-[var(--ff-border)]">
              Request Campus Demo
            </button>
          </div>
          <p className="text-sm text-[var(--ff-text-secondary)] mt-6">
            Special pricing for educational institutions • FERPA compliant • Unlimited students
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}