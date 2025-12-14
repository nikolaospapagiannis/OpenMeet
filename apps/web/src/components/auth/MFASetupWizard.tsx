'use client';

import { useState } from 'react';
import { X, Shield, Smartphone, Key, Check, Copy, ChevronRight, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button-v2';
import apiClient from '@/lib/api';

interface MFASetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function MFASetupWizard({ isOpen, onClose, onComplete }: MFASetupWizardProps) {
  const [step, setStep] = useState(1);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);

  // Step 1: Initialize MFA setup
  const handleStartSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.setupMFA();
      setQrCode(response.qrCode);
      setSecret(response.secret);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initialize MFA setup');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify TOTP code
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.completeMFA(verificationCode);
      setBackupCodes(response.backupCodes);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setBackupCodesCopied(true);
    setTimeout(() => setBackupCodesCopied(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openmeet-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    onComplete();
  };

  const handleClose = () => {
    // Reset state
    setStep(1);
    setQrCode('');
    setSecret('');
    setVerificationCode('');
    setBackupCodes([]);
    setError('');
    setCopied(false);
    setBackupCodesCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Enable MFA</h2>
              <p className="text-xs text-slate-400">Step {step} of 3</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-purple-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Step 1: Introduction */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                  <Smartphone className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Secure Your Account with MFA
                </h3>
                <p className="text-sm text-slate-400">
                  Multi-factor authentication adds an extra layer of security to your account by requiring a verification code from your authenticator app.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3 p-4 rounded-xl bg-slate-800/30 border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-purple-400">1</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 mb-1">
                      Install an Authenticator App
                    </h4>
                    <p className="text-xs text-slate-400">
                      Download Google Authenticator, Authy, or any TOTP-compatible app on your phone.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-4 rounded-xl bg-slate-800/30 border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-purple-400">2</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 mb-1">
                      Scan the QR Code
                    </h4>
                    <p className="text-xs text-slate-400">
                      Use your authenticator app to scan the QR code we'll provide.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-4 rounded-xl bg-slate-800/30 border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-purple-400">3</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 mb-1">
                      Enter Verification Code
                    </h4>
                    <p className="text-xs text-slate-400">
                      Enter the 6-digit code from your app to confirm setup.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                </div>
              )}

              <Button
                variant="gradient-primary"
                size="default"
                onClick={handleStartSetup}
                isLoading={loading}
                disabled={loading}
                className="w-full"
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Get Started
              </Button>
            </div>
          )}

          {/* Step 2: Scan QR Code */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Scan QR Code
                </h3>
                <p className="text-sm text-slate-400">
                  Use your authenticator app to scan this QR code
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center p-6 rounded-xl bg-white">
                <QRCodeSVG value={qrCode} size={200} level="H" />
              </div>

              {/* Manual Entry */}
              <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
                <h4 className="text-sm font-medium text-slate-200 mb-2">
                  Can't scan the code?
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  Enter this code manually in your authenticator app:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm text-purple-400 font-mono">
                    {secret}
                  </code>
                  <Button
                    variant="ghost-glass"
                    size="sm"
                    onClick={handleCopySecret}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Verification Code Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Enter 6-digit code from your app
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                    setError('');
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white text-center text-2xl tracking-widest font-mono placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="ghost-glass"
                  size="default"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  variant="gradient-primary"
                  size="default"
                  onClick={handleVerifyCode}
                  isLoading={loading}
                  disabled={loading || verificationCode.length !== 6}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Verify & Enable
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                  <Check className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  MFA Successfully Enabled!
                </h3>
                <p className="text-sm text-slate-400">
                  Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                </p>
              </div>

              {/* Backup Codes */}
              <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-medium text-slate-200">Backup Codes</h4>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost-glass"
                      size="xs"
                      onClick={handleCopyBackupCodes}
                    >
                      {backupCodesCopied ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm text-purple-400 font-mono text-center"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-amber-300 font-medium mb-1">
                      Important: Save these codes
                    </p>
                    <p className="text-slate-300 text-xs">
                      Each code can only be used once. Store them in a password manager or secure location. You won't be able to see them again.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleDownloadBackupCodes}
                  className="flex-1 border-white/10 text-slate-300"
                >
                  Download Codes
                </Button>
                <Button
                  variant="gradient-primary"
                  size="default"
                  onClick={handleComplete}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
