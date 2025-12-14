'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, MoreVertical, Crown, Shield, User, Trash2, Send, Upload } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { BulkInviteModal } from '@/components/team/BulkInviteModal';
import { PendingInvites } from '@/components/team/PendingInvites';
import { TeamActivityLog } from '@/components/team/TeamActivityLog';
import { RoleAssignment } from '@/components/team/RoleAssignment';
import { SeatUsage } from '@/components/team/SeatUsage';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import apiClient from '@/lib/api';

export default function TeamPage() {
  const [email, setEmail] = useState('');
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'invites' | 'roles' | 'activity'>('members');

  const {
    teamMembers,
    pendingInvites,
    seatUsage,
    isLoading,
    error,
    inviteTeamMember,
    bulkInviteTeamMembers,
    resendInvite,
    revokeInvite,
    updateMemberRole,
    assignRolesToMembers,
    removeMember,
    fetchActivityLog,
    fetchTeamMembers,
    fetchPendingInvites,
  } = useTeamManagement();

  useEffect(() => {
    // Get current user info
    const userInfo = apiClient.getUserInfo();
    if (userInfo) {
      setCurrentUser(userInfo);
    }
  }, []);

  const handleInvite = async () => {
    if (!email.trim()) return;

    const result = await inviteTeamMember(email, 'user');
    if (result.success) {
      setEmail('');
      fetchPendingInvites();
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'Owner':
        return <Crown className="h-4 w-4 text-yellow-400" />;
      case 'admin':
      case 'Admin':
        return <Shield className="h-4 w-4 text-teal-400" />;
      default:
        return <User className="h-4 w-4 text-slate-400" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    const badges: Record<string, string> = {
      super_admin: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      Owner: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      admin: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      Admin: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      user: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      Member: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    };
    return badges[role] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      user: 'Member',
    };
    return labels[role] || role;
  };

  const tabs = [
    { id: 'members', label: 'Team Members', count: teamMembers.length },
    { id: 'invites', label: 'Pending Invites', count: pendingInvites.length },
    { id: 'roles', label: 'Role Management' },
    { id: 'activity', label: 'Activity Log' },
  ];

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-6 w-6 text-teal-400" />
            <h1 className="text-3xl font-bold text-white">Team Management</h1>
          </div>
          <p className="text-slate-400">Manage your team members, roles, and permissions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <CardGlass variant="elevated" gradient>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-teal-400" />
                  <h2 className="text-xl font-semibold text-white">Invite Team Members</h2>
                </div>
                <Button
                  variant="ghost-glass"
                  size="sm"
                  onClick={() => setShowBulkInvite(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Invite
                </Button>
              </div>

              <div className="flex gap-4">
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
                />
                <Button
                  variant="gradient-primary"
                  size="default"
                  onClick={handleInvite}
                  disabled={!email.trim() || isLoading}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Team members will receive an email with instructions to join your workspace
              </p>
            </CardGlass>
          </div>

          <SeatUsage
            seatUsage={seatUsage}
            onUpgrade={() => window.location.href = '/settings/billing'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <CardGlass variant="default" hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Members</p>
                <p className="text-3xl font-bold text-white">{teamMembers.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardGlass>

          <CardGlass variant="default" hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Active Members</p>
                <p className="text-3xl font-bold text-white">
                  {teamMembers.filter(m => m.isActive).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardGlass>

          <CardGlass variant="default" hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Pending Invites</p>
                <p className="text-3xl font-bold text-white">{pendingInvites.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardGlass>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 p-1 bg-slate-900/50 rounded-lg border border-white/5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                  ${activeTab === tab.id
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <Badge className="bg-white/10 text-white border-white/20 text-xs">
                    {tab.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'members' && (
          <CardGlass variant="default" hover>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Team Members</h2>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {teamMembers.length} Members
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Member</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Joined</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                            {member.firstName?.charAt(0) || member.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">
                                {member.firstName && member.lastName
                                  ? `${member.firstName} ${member.lastName}`
                                  : member.email}
                              </span>
                              {getRoleIcon(member.role)}
                              {currentUser?.id === member.id && (
                                <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-slate-400">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={getRoleBadgeClass(member.role)}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={member.isActive
                          ? "bg-green-500/20 text-green-300 border-green-500/30"
                          : "bg-slate-500/20 text-slate-300 border-slate-500/30"
                        }>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-400">
                          {new Date(member.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {member.role !== 'super_admin' && currentUser?.id !== member.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost-glass" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                            {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                              <Button
                                variant="ghost-glass"
                                size="sm"
                                className="text-rose-400 hover:text-rose-300"
                                onClick={() => removeMember(member.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                            {member.role === 'super_admin' ? 'Owner' : 'You'}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardGlass>
        )}

        {activeTab === 'invites' && (
          <PendingInvites
            invites={pendingInvites}
            onResend={resendInvite}
            onRevoke={revokeInvite}
          />
        )}

        {activeTab === 'roles' && currentUser && (
          <RoleAssignment
            teamMembers={teamMembers}
            currentUserId={currentUser.id}
            currentUserRole={currentUser.role}
            onRoleChange={updateMemberRole}
            onBatchRoleChange={currentUser.role === 'super_admin' ? assignRolesToMembers : undefined}
          />
        )}

        {activeTab === 'activity' && (
          <TeamActivityLog fetchActivityLog={fetchActivityLog} />
        )}

        {error && (
          <div className="fixed bottom-4 right-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 max-w-sm">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      <BulkInviteModal
        isOpen={showBulkInvite}
        onClose={() => setShowBulkInvite(false)}
        onInvite={bulkInviteTeamMembers}
      />
    </div>
  );
}