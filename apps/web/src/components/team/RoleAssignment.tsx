'use client';

import { useState } from 'react';
import { Shield, Users, Crown, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { CardGlass } from '@/components/ui/card-glass';
import { TeamMember } from '@/hooks/useTeamManagement';

interface RoleAssignmentProps {
  teamMembers: TeamMember[];
  currentUserId: string;
  currentUserRole: string;
  onRoleChange: (userId: string, role: string) => Promise<any>;
  onBatchRoleChange?: (userIds: string[], role: string) => Promise<any>;
}

export function RoleAssignment({
  teamMembers,
  currentUserId,
  currentUserRole,
  onRoleChange,
  onBatchRoleChange,
}: RoleAssignmentProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [batchRole, setBatchRole] = useState<string>('user');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  const roles = [
    { value: 'user', label: 'Member', icon: Users, color: 'text-slate-400' },
    { value: 'admin', label: 'Admin', icon: Shield, color: 'text-teal-400' },
    { value: 'super_admin', label: 'Super Admin', icon: Crown, color: 'text-yellow-400' },
  ];

  const canChangeRole = (member: TeamMember) => {
    if (member.id === currentUserId) return false;
    if (currentUserRole === 'super_admin') return true;
    if (currentUserRole === 'admin' && member.role === 'user') return true;
    return false;
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setIsProcessing(true);
    try {
      await onRoleChange(memberId, newRole);
      setShowDropdown(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchRoleChange = async () => {
    if (selectedMembers.size === 0) return;

    setIsProcessing(true);
    try {
      if (onBatchRoleChange) {
        await onBatchRoleChange(Array.from(selectedMembers), batchRole);
        setSelectedMembers(new Set());
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedMembers.size === teamMembers.filter(m => canChangeRole(m)).length) {
      setSelectedMembers(new Set());
    } else {
      const allSelectableIds = teamMembers
        .filter(m => canChangeRole(m))
        .map(m => m.id);
      setSelectedMembers(new Set(allSelectableIds));
    }
  };

  const getRoleIcon = (role: string) => {
    const roleConfig = roles.find(r => r.value === role);
    const Icon = roleConfig?.icon || Users;
    return <Icon className={`w-4 h-4 ${roleConfig?.color || 'text-slate-400'}`} />;
  };

  const getRoleBadgeClass = (role: string) => {
    const badges: Record<string, string> = {
      super_admin: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      admin: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      user: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    };
    return badges[role] || badges.user;
  };

  const getRoleLabel = (role: string) => {
    const roleConfig = roles.find(r => r.value === role);
    return roleConfig?.label || 'Member';
  };

  return (
    <CardGlass variant="default" hover>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Role Management</h2>
          </div>

          {currentUserRole === 'super_admin' && onBatchRoleChange && selectedMembers.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                {selectedMembers.size} selected
              </span>
              <select
                value={batchRole}
                onChange={(e) => setBatchRole(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:ring-2 focus:ring-teal-500/50"
                disabled={isProcessing}
              >
                {roles.slice(0, 2).map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <Button
                variant="gradient-primary"
                size="sm"
                onClick={handleBatchRoleChange}
                disabled={isProcessing}
              >
                Apply to Selected
              </Button>
            </div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-300">
            <strong>Role Permissions:</strong>
          </p>
          <ul className="mt-2 space-y-1 text-xs text-blue-200/80">
            <li>• <strong>Members:</strong> Can view and participate in meetings</li>
            <li>• <strong>Admins:</strong> Can manage team members and settings</li>
            <li>• <strong>Super Admins:</strong> Full access to all features and billing</li>
          </ul>
        </div>
      </div>

      <div className="space-y-2">
        {currentUserRole === 'super_admin' && onBatchRoleChange && (
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <input
              type="checkbox"
              checked={selectedMembers.size === teamMembers.filter(m => canChangeRole(m)).length}
              onChange={toggleAllSelection}
              className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-teal-500 focus:ring-teal-500/50"
              disabled={isProcessing}
            />
            <span className="text-sm text-slate-400">Select All</span>
          </div>
        )}

        {teamMembers.map((member) => {
          const canChange = canChangeRole(member);
          const isCurrentUser = member.id === currentUserId;

          return (
            <div
              key={member.id}
              className={`
                flex items-center justify-between p-3 rounded-lg
                ${isCurrentUser ? 'bg-teal-500/5 border border-teal-500/20' : 'hover:bg-slate-800/30'}
                transition-colors
              `}
            >
              <div className="flex items-center gap-3">
                {currentUserRole === 'super_admin' && onBatchRoleChange && canChange && (
                  <input
                    type="checkbox"
                    checked={selectedMembers.has(member.id)}
                    onChange={() => toggleMemberSelection(member.id)}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-teal-500 focus:ring-teal-500/50"
                    disabled={isProcessing}
                  />
                )}

                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {member.firstName?.charAt(0) || member.email.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {member.firstName && member.lastName
                        ? `${member.firstName} ${member.lastName}`
                        : member.email}
                    </span>
                    {isCurrentUser && (
                      <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-slate-400">{member.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {canChange ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(showDropdown === member.id ? null : member.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10 hover:bg-slate-800 transition-colors"
                      disabled={isProcessing}
                    >
                      {getRoleIcon(member.role)}
                      <span className="text-sm text-white">{getRoleLabel(member.role)}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {showDropdown === member.id && (
                      <div className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-800 border border-white/10 shadow-xl z-10">
                        {roles.map((role) => {
                          if (role.value === 'super_admin' && currentUserRole !== 'super_admin') return null;
                          const Icon = role.icon;
                          return (
                            <button
                              key={role.value}
                              onClick={() => handleRoleChange(member.id, role.value)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 transition-colors text-left"
                              disabled={isProcessing}
                            >
                              <Icon className={`w-4 h-4 ${role.color}`} />
                              <span className="text-sm text-white">{role.label}</span>
                              {member.role === role.value && (
                                <Check className="w-4 h-4 text-teal-400 ml-auto" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Badge className={getRoleBadgeClass(member.role)}>
                    {getRoleLabel(member.role)}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </CardGlass>
  );
}