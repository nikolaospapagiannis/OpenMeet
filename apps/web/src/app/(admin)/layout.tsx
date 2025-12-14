'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  BarChart3,
  Activity,
  Bell,
  Flag,
  FileText,
  Settings,
  Shield,
  ChevronLeft,
  Server,
  Database,
  Globe,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

type SystemRole = 'super_admin' | 'platform_admin' | 'billing_admin' | 'support_admin' | 'viewer';

const ROLE_HIERARCHY: Record<SystemRole, number> = {
  super_admin: 100,
  platform_admin: 80,
  billing_admin: 60,
  support_admin: 40,
  viewer: 20,
};

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  requiredRole?: SystemRole;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
      { icon: Activity, label: 'Platform Health', href: '/admin/health' },
    ],
  },
  {
    title: 'Management',
    items: [
      { icon: Building2, label: 'Organizations', href: '/admin/organizations' },
      { icon: Users, label: 'Users', href: '/admin/users' },
      { icon: CreditCard, label: 'Subscriptions', href: '/admin/subscriptions', requiredRole: 'billing_admin' },
    ],
  },
  {
    title: 'Analytics & Reporting',
    items: [
      { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
      { icon: FileText, label: 'Audit Logs', href: '/admin/logs' },
    ],
  },
  {
    title: 'Infrastructure',
    items: [
      { icon: Server, label: 'Infrastructure', href: '/admin/infrastructure', requiredRole: 'platform_admin' },
      { icon: Database, label: 'Database', href: '/admin/database', requiredRole: 'platform_admin' },
      { icon: Globe, label: 'API Metrics', href: '/admin/api-metrics', requiredRole: 'platform_admin' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { icon: Flag, label: 'Feature Flags', href: '/admin/feature-flags', requiredRole: 'platform_admin' },
      { icon: Bell, label: 'Alerts', href: '/admin/alerts' },
      { icon: Settings, label: 'Settings', href: '/admin/settings', requiredRole: 'super_admin' },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userRole = (user?.systemRole as SystemRole) || 'viewer';
  const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;

  const hasAccess = (requiredRole?: SystemRole): boolean => {
    if (!requiredRole) return true;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userRoleLevel >= requiredLevel;
  };

  const isAdminUser = userRoleLevel >= ROLE_HIERARCHY.viewer;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && !isAdminUser) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router, isAdminUser]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdminUser) {
    return null;
  }

  const getRoleBadgeColor = (role: SystemRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'platform_admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'billing_admin':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'support_admin':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const formatRoleName = (role: SystemRole) => {
    return role.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg border border-white/10"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <Menu className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900/80 backdrop-blur-xl border-r border-white/5 flex flex-col transition-all duration-300 ${
          mobileMenuOpen ? 'fixed inset-y-0 left-0 z-40' : 'hidden lg:flex'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <Link href="/admin">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                {sidebarOpen && (
                  <div>
                    <span className="text-lg font-bold text-white">Admin</span>
                    <p className="text-xs text-slate-400">Super Admin Panel</p>
                  </div>
                )}
              </div>
            </Link>
            <button
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <ChevronLeft className={`h-5 w-5 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
          {navSections.map((section) => {
            const visibleItems = section.items.filter(item => hasAccess(item.requiredRole));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
                {sidebarOpen && (
                  <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href ||
                      (item.href !== '/admin' && pathname.startsWith(item.href));

                    return (
                      <Link key={item.label} href={item.href}>
                        <div
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/20'
                              : 'text-slate-400 hover:bg-white/5 hover:text-white'
                          }`}
                          title={!sidebarOpen ? item.label : undefined}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {sidebarOpen && (
                            <span className="text-sm font-medium">{item.label}</span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-3 border-t border-white/5">
          <div className={`rounded-xl p-3 bg-slate-800/50 border border-white/5 ${!sidebarOpen ? 'px-2' : ''}`}>
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
                <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getRoleBadgeColor(userRole)}`}>
                  {formatRoleName(userRole)}
                </div>
              </>
            ) : (
              <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                {user.firstName?.[0]}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-3 space-y-1">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start text-slate-400 hover:text-white hover:bg-white/5 ${!sidebarOpen ? 'px-2' : ''}`}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {sidebarOpen && 'Back to App'}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className={`w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 ${!sidebarOpen ? 'px-2' : ''}`}
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {sidebarOpen && 'Sign Out'}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-slate-900/30 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="lg:hidden w-8" /> {/* Spacer for mobile menu button */}
            <h1 className="text-xl font-semibold text-white">Super Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getRoleBadgeColor(userRole)}`}>
              {formatRoleName(userRole)}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
