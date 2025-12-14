'use client';

import { useState, useEffect } from 'react';
import { Shield, Lock, Key, AlertTriangle, Check, ChevronRight } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import MFASetupWizard from '@/components/auth/MFASetupWizard';
import apiClient from '@/lib/api';

export default function SecuritySettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');
  const [loading, setLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!disablePassword) {
      setDisableError('Password is required');
      return;
    }

    setDisableLoading(true);
    setDisableError('');

    try {
      await apiClient.disableMFA(disablePassword);
      setShowDisableConfirm(false);
      setDisablePassword('');
      await loadUserData();
    } catch (error: any) {
      setDisableError(error.response?.data?.error || 'Failed to disable MFA');
    } finally {
      setDisableLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(newPassword)) {
      setPasswordError('Password must contain uppercase, lowercase, number, and special character');
      return;
    }

    setPasswordLoading(true);

    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-8 h-8 text-teal-400" />
            <h1 className="text-3xl font-bold text-white">Security Settings</h1>
          </div>
          <p className="text-slate-400">Manage your account security and authentication methods</p>
        </div>

        {/* Multi-Factor Authentication */}
        <CardGlass variant="default" hover className="mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Multi-Factor Authentication</h2>
            {user?.mfaEnabled && (
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                Enabled
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Add an extra layer of security to your account by enabling two-factor authentication.
              You'll need to enter a code from your authenticator app in addition to your password when signing in.
            </p>

            {user?.mfaEnabled ? (
              <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-green-300">MFA is Active</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Your account is protected with two-factor authentication
                    </div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDisableConfirm(true)}
                >
                  Disable MFA
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-200">MFA is Not Enabled</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Enable MFA to add an extra layer of security
                    </div>
                  </div>
                </div>
                <Button
                  variant="gradient-primary"
                  size="sm"
                  onClick={() => setShowMFASetup(true)}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Enable MFA
                </Button>
              </div>
            )}
          </div>
        </CardGlass>

        {/* Password Change */}
        <CardGlass variant="default" hover className="mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-semibold text-white">Change Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
                placeholder="Confirm new password"
              />
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-400">{passwordSuccess}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                variant="gradient-primary"
                size="default"
                isLoading={passwordLoading}
                disabled={passwordLoading}
              >
                <Check className="w-4 h-4 mr-2" />
                Update Password
              </Button>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-sm text-slate-300">
                <strong>Password requirements:</strong> At least 8 characters with uppercase, lowercase, number, and special character.
              </p>
            </div>
          </form>
        </CardGlass>

        {/* Active Sessions */}
        <CardGlass variant="default" hover>
          <div className="flex items-center gap-2 mb-6">
            <Key className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">Active Sessions</h2>
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
              {user?.activeSessions || 0}
            </Badge>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-400 mb-4">
              View and manage all devices where you're currently signed in.
            </p>

            <Button variant="outline" size="sm" className="border-white/10 text-slate-300">
              <ChevronRight className="w-4 h-4 mr-2" />
              View All Sessions
            </Button>
          </div>
        </CardGlass>
      </div>

      {/* MFA Setup Wizard Modal */}
      {showMFASetup && (
        <MFASetupWizard
          isOpen={showMFASetup}
          onClose={() => setShowMFASetup(false)}
          onComplete={() => {
            setShowMFASetup(false);
            loadUserData();
          }}
        />
      )}

      {/* Disable MFA Confirmation Modal */}
      {showDisableConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Disable MFA?</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    This will make your account less secure
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => {
                    setDisablePassword(e.target.value);
                    setDisableError('');
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 outline-none transition-all"
                  placeholder="Password"
                />
                {disableError && (
                  <p className="mt-2 text-sm text-red-400">{disableError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  size="default"
                  onClick={handleDisableMFA}
                  isLoading={disableLoading}
                  disabled={disableLoading}
                  className="flex-1"
                >
                  Disable MFA
                </Button>
                <Button
                  variant="ghost-glass"
                  size="default"
                  onClick={() => {
                    setShowDisableConfirm(false);
                    setDisablePassword('');
                    setDisableError('');
                  }}
                  disabled={disableLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
