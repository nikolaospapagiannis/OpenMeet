'use client';

import { useState, useCallback } from 'react';
import { User, Settings, LogOut, CreditCard, HelpCircle, Shield, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
  divider?: boolean;
  danger?: boolean;
}

interface UserProfileMenuProps {
  user: UserProfile;
  menuItems?: MenuItem[];
  onLogout?: () => void | Promise<void>;
  className?: string;
  isLoading?: boolean;
  error?: string;
}

const defaultMenuItems = (onLogout?: () => void | Promise<void>): MenuItem[] => [
  {
    icon: <User className="w-4 h-4" />,
    label: 'Profile',
    onClick: () => console.log('Profile'),
  },
  {
    icon: <Settings className="w-4 h-4" />,
    label: 'Settings',
    onClick: () => console.log('Settings'),
  },
  {
    icon: <CreditCard className="w-4 h-4" />,
    label: 'Billing',
    onClick: () => console.log('Billing'),
  },
  {
    icon: <Shield className="w-4 h-4" />,
    label: 'Security',
    onClick: () => console.log('Security'),
  },
  {
    icon: <HelpCircle className="w-4 h-4" />,
    label: 'Help & Support',
    onClick: () => console.log('Help'),
    divider: true,
  },
  {
    icon: <LogOut className="w-4 h-4" />,
    label: 'Sign Out',
    onClick: () => onLogout?.(),
    danger: true,
  },
];

export function UserProfileMenu({
  user,
  menuItems,
  onLogout,
  className,
  isLoading = false,
  error
}: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);

  const items = menuItems || defaultMenuItems(onLogout);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleItemClick = useCallback(async (item: MenuItem) => {
    setItemError(null);
    setLoadingItem(item.label);

    try {
      await item.onClick();
      setIsOpen(false);
    } catch (err: any) {
      setItemError(err?.message || `${item.label} failed`);
    } finally {
      setLoadingItem(null);
    }
  }, []);

  return (
    <div className={cn("relative", className)}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-xl",
          "transition-all duration-300",
          "hover:bg-white/5 hover:border-white/10",
          "border border-transparent",
          "focus:outline-none focus:ring-2 focus:ring-teal-500/50",
          isOpen && "bg-white/10 border-white/20",
          isLoading && "opacity-70 cursor-wait"
        )}
        aria-expanded={isOpen}
        aria-label="User menu"
      >
        {/* Avatar */}
        <div className="relative">
          {isLoading ? (
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center border-2 border-teal-400/30 shadow-lg">
              <span className="text-sm font-bold text-white">
                {getInitials(user.name)}
              </span>
            </div>
          )}
          {/* Online indicator */}
          {!isLoading && (
            <div className={cn(
              "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 shadow-lg",
              error ? "bg-red-500" : "bg-green-500"
            )} />
          )}
        </div>

        {/* User Info */}
        <div className="hidden md:block text-left">
          {isLoading ? (
            <>
              <div className="h-4 w-24 bg-slate-700 rounded animate-pulse" />
              <div className="h-3 w-16 bg-slate-700 rounded animate-pulse mt-1" />
            </>
          ) : (
            <>
              <div className="text-sm font-medium text-white">
                {user.name}
              </div>
              {user.role && (
                <div className="text-xs text-slate-400">
                  {user.role}
                </div>
              )}
            </>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown className={cn(
          "w-4 h-4 text-slate-400 transition-transform duration-300",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <CardGlass
            variant="elevated"
            className={cn(
              "absolute top-full right-0 mt-2 w-64",
              "animate-in fade-in slide-in-from-top-4 duration-300",
              "z-50"
            )}
          >
            {/* Error message */}
            {(error || itemError) && (
              <div className="p-3 border-b border-white/10 bg-red-500/10">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs">{error || itemError}</span>
                </div>
              </div>
            )}

            {/* User Info Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center border-2 border-teal-400/30 shadow-lg">
                    <span className="text-base font-bold text-white">
                      {getInitials(user.name)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {user.name}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {user.email}
                  </div>
                  {user.role && (
                    <div className="text-xs text-teal-400 mt-0.5">
                      {user.role}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {items.map((item, idx) => {
                const isItemLoading = loadingItem === item.label;

                return (
                  <div key={idx}>
                    {item.divider && idx > 0 && (
                      <div className="my-2 border-t border-white/10" />
                    )}
                    <button
                      onClick={() => handleItemClick(item)}
                      disabled={isItemLoading}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
                        "text-left transition-all duration-200",
                        "hover:bg-white/5",
                        "focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-inset",
                        item.danger
                          ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          : "text-slate-300 hover:text-white",
                        isItemLoading && "opacity-70 cursor-wait"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0",
                        item.danger && "text-red-400"
                      )}>
                        {isItemLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          item.icon
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {item.label}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </CardGlass>

          {/* Backdrop */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
}
