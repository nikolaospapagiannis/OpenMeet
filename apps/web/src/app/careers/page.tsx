'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import {
  Briefcase,
  MapPin,
  Users,
  Heart,
  GraduationCap,
  Home,
  DollarSign,
  Sparkles,
  Shield,
  Globe,
  Target,
  Lightbulb,
  HandshakeIcon,
  ChevronRight,
  Filter,
  Code,
  Package,
  TrendingUp,
  Building,
  Zap,
  Calendar,
  Plane,
  Coffee
} from 'lucide-react';

interface JobPosition {
  id: string;
  title: string;
  location: string;
  department: string;
  type: string;
}

const jobPositions: JobPosition[] = [
  // Engineering
  { id: '1', title: 'Senior Backend Engineer', location: 'Remote', department: 'Engineering', type: 'Full-time' },
  { id: '2', title: 'Frontend Engineer', location: 'San Francisco / Remote', department: 'Engineering', type: 'Full-time' },
  { id: '3', title: 'ML Engineer', location: 'Remote', department: 'Engineering', type: 'Full-time' },
  { id: '4', title: 'Senior DevOps Engineer', location: 'Remote', department: 'Engineering', type: 'Full-time' },
  { id: '5', title: 'Mobile Engineer (React Native)', location: 'Remote', department: 'Engineering', type: 'Full-time' },
  { id: '6', title: 'Data Engineer', location: 'San Francisco', department: 'Engineering', type: 'Full-time' },
  { id: '7', title: 'Security Engineer', location: 'Remote', department: 'Engineering', type: 'Full-time' },
  { id: '8', title: 'QA Engineer', location: 'Remote', department: 'Engineering', type: 'Full-time' },

  // Product
  { id: '9', title: 'Senior Product Manager', location: 'San Francisco / Remote', department: 'Product', type: 'Full-time' },
  { id: '10', title: 'Product Designer', location: 'Remote', department: 'Product', type: 'Full-time' },
  { id: '11', title: 'UX Researcher', location: 'Remote', department: 'Product', type: 'Full-time' },

  // Sales & Marketing
  { id: '12', title: 'Account Executive', location: 'San Francisco', department: 'Sales & Marketing', type: 'Full-time' },
  { id: '13', title: 'Sales Development Representative', location: 'Remote', department: 'Sales & Marketing', type: 'Full-time' },
  { id: '14', title: 'Marketing Manager', location: 'Remote', department: 'Sales & Marketing', type: 'Full-time' },
  { id: '15', title: 'Content Marketing Lead', location: 'Remote', department: 'Sales & Marketing', type: 'Full-time' },
  { id: '16', title: 'Growth Marketing Manager', location: 'San Francisco / Remote', department: 'Sales & Marketing', type: 'Full-time' },

  // Operations
  { id: '17', title: 'Finance Manager', location: 'San Francisco', department: 'Operations', type: 'Full-time' },
  { id: '18', title: 'People Operations Manager', location: 'Remote', department: 'Operations', type: 'Full-time' },
];

const departments = ['All', 'Engineering', 'Product', 'Sales & Marketing', 'Operations'];

const whyJoinUs = [
  {
    icon: Home,
    title: 'Remote-First Culture',
    description: 'Work from anywhere in the world. We believe great talent exists everywhere.'
  },
  {
    icon: DollarSign,
    title: 'Competitive Compensation',
    description: 'Top-tier salaries, equity packages, and performance bonuses that reflect your impact.'
  },
  {
    icon: Heart,
    title: 'Health & Wellness',
    description: 'Comprehensive health coverage, mental wellness support, and fitness stipends.'
  },
  {
    icon: GraduationCap,
    title: 'Learning & Development',
    description: '$2,500 annual budget for courses, conferences, and professional development.'
  }
];

const companyValues = [
  {
    icon: Lightbulb,
    title: 'Innovation',
    description: 'We push boundaries and challenge the status quo to build revolutionary products.'
  },
  {
    icon: Shield,
    title: 'Transparency',
    description: 'Open communication and honest feedback drive our collaborative culture.'
  },
  {
    icon: Target,
    title: 'Customer Focus',
    description: 'Every decision we make starts with how it will benefit our users.'
  },
  {
    icon: HandshakeIcon,
    title: 'Collaboration',
    description: 'We win together. Cross-functional teamwork is at the heart of our success.'
  }
];

const benefits = [
  { icon: Heart, title: 'Health Insurance', description: '100% coverage for you and family' },
  { icon: DollarSign, title: '401(k) Matching', description: '6% match with immediate vesting' },
  { icon: Calendar, title: 'Unlimited PTO', description: 'Take the time you need to recharge' },
  { icon: Briefcase, title: 'Equity Package', description: 'Own a piece of what we build' },
  { icon: GraduationCap, title: 'Learning Budget', description: '$2,500 annual stipend' },
  { icon: Home, title: 'Home Office Setup', description: '$1,500 for your ideal workspace' },
  { icon: Plane, title: 'Team Offsites', description: 'Quarterly gatherings worldwide' },
  { icon: Coffee, title: 'Wellness Perks', description: 'Gym, therapy, and wellness apps' }
];

export default function CareersPage() {
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  const filteredJobs = selectedDepartment === 'All'
    ? jobPositions
    : jobPositions.filter(job => job.department === selectedDepartment);

  const jobsByDepartment = filteredJobs.reduce((acc, job) => {
    if (!acc[job.department]) {
      acc[job.department] = [];
    }
    acc[job.department].push(job);
    return acc;
  }, {} as Record<string, JobPosition[]>);

  return (
    <div className="min-h-screen bg-[#000211]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--ff-bg-dark)] via-[#0a0518] to-[var(--ff-bg-dark)]"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[var(--ff-purple-500)]/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[var(--ff-purple-600)]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="container-ff relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[var(--ff-purple-500)]/10 border border-[var(--ff-purple-500)]/30 rounded-full px-4 py-2 mb-6">
              <Sparkles size={16} className="text-[var(--ff-purple-500)]" />
              <span className="text-sm font-medium text-[var(--ff-purple-400)]">25+ Open Positions</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
              Join Our Mission
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8">
              Help us build the future of meeting intelligence
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="group">
                View Open Roles
                <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg">
                About Our Culture
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Join Us Section */}
      <section className="py-20 px-4">
        <div className="container-ff">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
              Why Join OpenMeet?
            </h2>
            <p className="text-xl text-gray-400">
              Build your career at a company that values innovation and growth
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyJoinUs.map((item, index) => (
              <CardGlass key={index} className="p-6 hover:border-[var(--ff-purple-500)]/50 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] rounded-lg flex items-center justify-center mb-4">
                  <item.icon size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </CardGlass>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions Section */}
      <section className="py-20 px-4 bg-[var(--ff-bg-layer)]/30">
        <div className="container-ff">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
              Open Positions
            </h2>
            <p className="text-xl text-gray-400">
              Find your perfect role and join our growing team
            </p>
          </div>

          {/* Department Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-4 py-2 rounded-full border transition-all ${
                  selectedDepartment === dept
                    ? 'bg-[var(--ff-purple-500)] border-[var(--ff-purple-500)] text-white'
                    : 'bg-transparent border-gray-700 text-gray-400 hover:border-[var(--ff-purple-500)]/50'
                }`}
              >
                {dept}
                {dept === 'All' && ` (${jobPositions.length})`}
                {dept !== 'All' && ` (${jobPositions.filter(j => j.department === dept).length})`}
              </button>
            ))}
          </div>

          {/* Job Listings by Department */}
          <div className="space-y-12">
            {Object.entries(jobsByDepartment).map(([department, jobs]) => (
              <div key={department}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[var(--ff-purple-500)]/10 rounded-lg flex items-center justify-center">
                    {department === 'Engineering' && <Code size={20} className="text-[var(--ff-purple-500)]" />}
                    {department === 'Product' && <Package size={20} className="text-[var(--ff-purple-500)]" />}
                    {department === 'Sales & Marketing' && <TrendingUp size={20} className="text-[var(--ff-purple-500)]" />}
                    {department === 'Operations' && <Building size={20} className="text-[var(--ff-purple-500)]" />}
                  </div>
                  <h3 className="text-2xl font-semibold text-white">{department}</h3>
                  <span className="text-sm text-gray-500">({jobs.length} roles)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobs.map((job) => (
                    <CardGlass
                      key={job.id}
                      className="p-6 hover:border-[var(--ff-purple-500)]/50 transition-all group cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="text-xl font-semibold text-white mb-2 group-hover:text-[var(--ff-purple-400)] transition-colors">
                            {job.title}
                          </h4>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Briefcase size={14} />
                              {job.type}
                            </span>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-[var(--ff-purple-500)]/10 text-[var(--ff-purple-400)] text-xs font-medium rounded-full">
                          {job.department}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="w-full group-hover:bg-[var(--ff-purple-600)] transition-colors"
                      >
                        Apply Now
                        <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardGlass>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-20 px-4">
        <div className="container-ff">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
              Our Values
            </h2>
            <p className="text-xl text-gray-400">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {companyValues.map((value, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <value.icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{value.title}</h3>
                <p className="text-gray-400">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Life at OpenMeet Section */}
      <section className="py-20 px-4 bg-[var(--ff-bg-layer)]/30">
        <div className="container-ff">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
              Life at OpenMeet
            </h2>
            <p className="text-xl text-gray-400">
              Join a team that works hard and celebrates together
            </p>
          </div>

          {/* Placeholder Team Photos Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, index) => (
              <div
                key={index}
                className="aspect-square bg-gradient-to-br from-[var(--ff-purple-500)]/20 to-[var(--ff-purple-600)]/20 rounded-xl border border-[var(--ff-border)] overflow-hidden group hover:border-[var(--ff-purple-500)]/50 transition-all"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <Users size={40} className="text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container-ff">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
              Benefits & Perks
            </h2>
            <p className="text-xl text-gray-400">
              We take care of our team so they can focus on building great products
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <CardGlass key={index} className="p-6 text-center hover:border-[var(--ff-purple-500)]/50 transition-all">
                <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <benefit.icon size={24} className="text-[var(--ff-purple-500)]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-400">{benefit.description}</p>
              </CardGlass>
            ))}
          </div>
        </div>
      </section>

      {/* Don't See Your Role Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[var(--ff-purple-500)]/10 to-transparent">
        <div className="container-ff">
          <CardGlass className="p-12 text-center max-w-3xl mx-auto border-[var(--ff-purple-500)]/30">
            <Zap size={48} className="text-[var(--ff-purple-500)] mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Don't See Your Role?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              We're always looking for exceptional talent. Send us your resume and tell us how you can contribute to our mission.
            </p>
            <Button size="lg" variant="outline" className="group">
              Submit General Application
              <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardGlass>
        </div>
      </section>

      <Footer />
    </div>
  );
}