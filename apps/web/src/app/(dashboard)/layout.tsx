'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Calendar,
  Activity,
  Upload,
  Zap,
  BarChart3,
  Sparkles,
  Users,
  CreditCard,
  Settings,
  MoreHorizontal,
  Mic,
  Plus,
  FileText,
  Video,
  Mail,
  User,
  Shield,
  HelpCircle,
  LogOut,
  MessageSquare,
  LayoutTemplate,
  GraduationCap,
  Hash,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

// Import widgets
import {
  SearchBar,
  NotificationCenter,
  UserProfileMenu,
  QuickActionsMenu,
} from '@/components/widgets';

// Import hooks
import { useSearch } from '@/hooks/useSearch';
import { useSubscription } from '@/hooks/useSubscription';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading, logout } = useAuth();

  // Search hook
  const { search } = useSearch();

  // Subscription hook
  const { subscription, usage } = useSubscription();
  const isPlatformOwner = subscription?.isPlatformOwner === true;
  const planName = isPlatformOwner ? 'Platform Owner' : (subscription?.planName || subscription?.tier || 'Free');
  const meetingsRemaining = usage?.meetingsLimit === Infinity
    ? 'Unlimited'
    : `${Math.max(0, (usage?.meetingsLimit || 5) - (usage?.meetingsRecorded || 0))} meetings remaining`;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { icon: Home, label: 'Home', href: '/dashboard' },
    { icon: Calendar, label: 'Meetings', href: '/meetings' },
    { icon: MessageSquare, label: 'Ask AI', href: '/ask-ai' },
    { icon: LayoutTemplate, label: 'Templates', href: '/templates' },
    { icon: Activity, label: 'Meeting Status', href: '/meeting-status' },
    { icon: Upload, label: 'Uploads', href: '/uploads' },
    { icon: Zap, label: 'Integrations', href: '/integrations' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: Sparkles, label: 'AI Apps', href: '/ai-apps' },
    { icon: GraduationCap, label: 'Coaching', href: '/coaching' },
    { icon: Hash, label: 'Topics', href: '/topics' },
    { icon: Users, label: 'Team', href: '/settings/team' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  // Quick actions for FAB
  const quickActions = [
    {
      icon: <Video className="w-5 h-5" />,
      label: 'New Meeting',
      onClick: () => router.push('/meetings/new'),
      color: 'bg-gradient-to-r from-purple-500 to-indigo-500' as const,
    },
    {
      icon: <Upload className="w-5 h-5" />,
      label: 'Upload Recording',
      onClick: () => router.push('/uploads'),
      color: 'bg-gradient-to-r from-teal-500 to-cyan-500' as const,
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'View Transcripts',
      onClick: () => router.push('/meetings?status=transcribed'),
      color: 'bg-gradient-to-r from-blue-500 to-cyan-500' as const,
    },
    {
      icon: <Mail className="w-5 h-5" />,
      label: 'Send Summary',
      onClick: () => router.push('/ai-apps'),
      color: 'bg-gradient-to-r from-green-500 to-emerald-500' as const,
    },
  ];

  // User menu items
  const userMenuItems = [
    {
      icon: <User className="w-4 h-4" />,
      label: 'Profile',
      onClick: () => router.push('/settings/profile'),
    },
    {
      icon: <Settings className="w-4 h-4" />,
      label: 'Settings',
      onClick: () => router.push('/settings'),
    },
    {
      icon: <CreditCard className="w-4 h-4" />,
      label: 'Billing',
      onClick: () => router.push('/settings/billing'),
    },
    {
      icon: <Shield className="w-4 h-4" />,
      label: 'Security',
      onClick: () => router.push('/settings/sso'),
    },
    {
      icon: <HelpCircle className="w-4 h-4" />,
      label: 'Help & Support',
      onClick: () => { window.open('https://docs.openmeet.com', '_blank'); },
      divider: true,
  
    },
    {
      icon: <LogOut className="w-4 h-4" />,
      label: 'Sign Out',
      onClick: logout,
      danger: true,
    },
  ];

  return (
    <NotificationProvider>
      <div className="flex h-screen bg-slate-950 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/dashboard">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">openmeet.com</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link key={item.label} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-400 border border-teal-500/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-white/5">
          <div className={`rounded-xl p-4 border ${
            isPlatformOwner
              ? 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/20'
              : 'bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-teal-500/20'
          }`}>
            <p className="text-sm font-medium text-white mb-1">{planName}</p>
            <p className="text-xs text-slate-400 mb-3">{meetingsRemaining}</p>
            {!isPlatformOwner && (
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0"
                onClick={() => router.push('/settings/billing')}
              >
                Upgrade Plan
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-slate-900/30 backdrop-blur-xl border-b border-white/5 px-6 py-3 flex items-center justify-between relative z-40">
          {/* Search */}
          <div className="flex-1 max-w-2xl">
            <SearchBar
              onSearch={search}
              placeholder="Search meetings, transcripts, action items..."
              className="w-full"
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 ml-6">
            {/* Status Badge - Hidden for platform owners */}
            {!isPlatformOwner && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-full text-sm border border-orange-500/20">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                {planName}
              </div>
            )}
            {isPlatformOwner && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-full text-sm border border-purple-500/20">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Platform Owner
              </div>
            )}

            {/* Capture Button */}
            <Link href="/meetings/new">
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white border-0 shadow-lg shadow-purple-500/20"
              >
                <Plus className="h-4 w-4 mr-1" />
                Capture
              </Button>
            </Link>

            {/* Mic Button */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-slate-400 hover:text-white hover:bg-white/5"
            >
              <Mic className="h-5 w-5" />
            </Button>

            {/* Notification Center */}
            <NotificationCenter />

            {/* User Profile Menu */}
            <UserProfileMenu
              user={{
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
              }}
              menuItems={userMenuItems}
              onLogout={logout}
            />
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-slate-950">{children}</div>
      </div>

        {/* Quick Actions FAB */}
        <QuickActionsMenu actions={quickActions} position="bottom-right" />
      </div>
    </NotificationProvider>
  );
}
