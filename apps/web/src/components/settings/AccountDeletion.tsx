'use client';

import { useState } from 'react';
import { AlertTriangle, Shield, Trash2, X, Lock, CheckCircle } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Alert } from '@/components/ui/alert';

interface AccountDeletionProps {
  userId: string;
  userEmail: string;
  onDeleteComplete?: () => void;
}

export function AccountDeletion({
  userId,
  userEmail,
  onDeleteComplete
}: AccountDeletionProps) {
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [deletionStep, setDeletionStep] = useState(1);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataExportRequested, setDataExportRequested] = useState(false);

  const DELETION_PHRASE = 'DELETE MY ACCOUNT';

  const dataToBeDeleted = [
    { label: 'All meeting recordings', count: '142' },
    { label: 'Transcriptions and notes', count: '268' },
    { label: 'Analytics data', count: 'All' },
    { label: 'Team memberships', count: '3' },
    { label: 'Integrations and API keys', count: '7' },
    { label: 'Personal settings and preferences', count: 'All' },
  ];

  const handleRequestDataExport = async () => {
    try {
      const response = await fetch('/api/users/me/export', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to request data export');
      }

      setDataExportRequested(true);
    } catch (err) {
      setError('Failed to request data export. Please try again.');
    }
  };

  const handleProceedToStep2 = () => {
    if (!confirmEmail || confirmEmail !== userEmail) {
      setError('Please enter your email address correctly');
      return;
    }
    setError(null);
    setDeletionStep(2);
  };

  const handleProceedToStep3 = () => {
    if (!confirmPassword) {
      setError('Please enter your password');
      return;
    }
    setError(null);
    setDeletionStep(3);
  };

  const handleDeleteAccount = async () => {
    if (confirmPhrase !== DELETION_PHRASE) {
      setError(`Please type "${DELETION_PHRASE}" exactly`);
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          email: confirmEmail,
          password: confirmPassword,
          confirmPhrase: confirmPhrase,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Show success message
      setDeletionStep(4);

      // Call callback after delay
      setTimeout(() => {
        if (onDeleteComplete) {
          onDeleteComplete();
        }
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  const resetDeletion = () => {
    setShowDeletionModal(false);
    setDeletionStep(1);
    setConfirmEmail('');
    setConfirmPassword('');
    setConfirmPhrase('');
    setError(null);
  };

  return (
    <>
      <CardGlass
        variant="default"
        className="border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-rose-500/10 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <h3 className="text-lg font-semibold text-white">Danger Zone</h3>
        </div>

        <div className="space-y-4">
          {/* Export Data Option */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <h4 className="font-semibold text-amber-300 mb-2">Export Your Data</h4>
            <p className="text-sm text-slate-400 mb-4">
              Download all your data before deleting your account. This includes recordings, transcriptions, and settings.
            </p>
            <Button
              variant="ghost-glass"
              size="sm"
              onClick={handleRequestDataExport}
              disabled={dataExportRequested}
              className="w-full"
            >
              {dataExportRequested ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Export Requested - Check Email
                </>
              ) : (
                'Request Data Export'
              )}
            </Button>
          </div>

          {/* Delete Account */}
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <h4 className="font-semibold text-rose-300 mb-2">Delete Account</h4>
            <p className="text-sm text-slate-400 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeletionModal(true)}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete My Account
            </Button>
          </div>
        </div>
      </CardGlass>

      {/* Deletion Modal */}
      {showDeletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg">
            <CardGlass variant="default" className="p-6 border-rose-500/30">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                  <h3 className="text-xl font-semibold text-white">Delete Account</h3>
                </div>
                {deletionStep < 4 && (
                  <button
                    onClick={resetDeletion}
                    className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Step 1: Warning and Data List */}
              {deletionStep === 1 && (
                <div className="space-y-4">
                  <Alert className="bg-rose-500/10 border-rose-500/30 text-rose-300">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-sm">
                      This action is permanent and cannot be undone. All your data will be immediately deleted.
                    </p>
                  </Alert>

                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3">
                      The following data will be permanently deleted:
                    </h4>
                    <div className="space-y-2">
                      {dataToBeDeleted.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-white/5"
                        >
                          <span className="text-sm text-slate-300">{item.label}</span>
                          <span className="text-xs font-semibold text-rose-400">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Confirm your email address
                    </label>
                    <input
                      type="email"
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      placeholder={userEmail}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none"
                    />
                  </div>

                  {error && (
                    <Alert className="bg-rose-500/10 border-rose-500/30 text-rose-300">
                      {error}
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="ghost-glass"
                      size="default"
                      onClick={resetDeletion}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="default"
                      onClick={handleProceedToStep2}
                      className="flex-1"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Password Confirmation */}
              {deletionStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/30 border border-white/5">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <p className="text-sm text-slate-300">
                      For security, please confirm your password
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Enter your password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none"
                    />
                  </div>

                  {error && (
                    <Alert className="bg-rose-500/10 border-rose-500/30 text-rose-300">
                      {error}
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="ghost-glass"
                      size="default"
                      onClick={() => setDeletionStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      variant="destructive"
                      size="default"
                      onClick={handleProceedToStep3}
                      className="flex-1"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Final Confirmation */}
              {deletionStep === 3 && (
                <div className="space-y-4">
                  <Alert className="bg-rose-500/10 border-rose-500/30 text-rose-300">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-sm font-semibold">
                      Final Step: This is your last chance to cancel
                    </p>
                  </Alert>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Type <span className="font-mono font-bold text-rose-400">{DELETION_PHRASE}</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={confirmPhrase}
                      onChange={(e) => setConfirmPhrase(e.target.value.toUpperCase())}
                      placeholder="Type the phrase above"
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none font-mono"
                    />
                  </div>

                  {error && (
                    <Alert className="bg-rose-500/10 border-rose-500/30 text-rose-300">
                      {error}
                    </Alert>
                  )}

                  <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      By clicking "Delete My Account", you acknowledge that:
                      <br />• All your data will be permanently deleted
                      <br />• This action cannot be undone
                      <br />• You will lose access to all team resources
                      <br />• Any active subscriptions will be cancelled
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="ghost-glass"
                      size="default"
                      onClick={() => setDeletionStep(2)}
                      disabled={isDeleting}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      variant="destructive"
                      size="default"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting || confirmPhrase !== DELETION_PHRASE}
                      className="flex-1"
                    >
                      {isDeleting ? (
                        'Deleting...'
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete My Account
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Success */}
              {deletionStep === 4 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    Account Deleted Successfully
                  </h4>
                  <p className="text-sm text-slate-400">
                    Your account and all associated data have been permanently deleted.
                    You will be redirected shortly.
                  </p>
                </div>
              )}
            </CardGlass>
          </div>
        </div>
      )}
    </>
  );
}