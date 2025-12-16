'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Shield, AlertCircle, Key } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import apiClient from '@/lib/api';

interface MFAVerifyModalProps {
  isOpen: boolean;
  mfaToken: string;
  onClose: () => void;
  onSuccess: (tokens: any) => void;
}

export default function MFAVerifyModal({
  isOpen,
  mfaToken,
  onClose,
  onSuccess,
}: MFAVerifyModalProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen && !useBackupCode) {
      // Focus first input when modal opens
      inputRefs.current[0]?.focus();
    }
  }, [isOpen, useBackupCode]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '');

    if (numericValue.length > 1) {
      // If pasting multiple digits, distribute them across inputs
      const digits = numericValue.slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);

      // Focus the next empty input or the last one
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...code];
      newCode[index] = numericValue;
      setCode(newCode);

      // Auto-focus next input
      if (numericValue && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    setError('');
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const handleVerify = async () => {
    const verificationCode = useBackupCode ? backupCode : code.join('');

    if (!verificationCode || (useBackupCode ? backupCode.length === 0 : verificationCode.length !== 6)) {
      setError(useBackupCode ? 'Please enter a backup code' : 'Please enter a complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.verifyMFA(mfaToken, verificationCode);
      onSuccess(response);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setCode(['', '', '', '', '', '']);
    setBackupCode('');
    setUseBackupCode(false);
    setError('');
    onClose();
  };

  const toggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setCode(['', '', '', '', '', '']);
    setBackupCode('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Two-Factor Authentication</h2>
              <p className="text-xs text-slate-400">
                {useBackupCode ? 'Enter backup code' : 'Enter code from your authenticator app'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!useBackupCode ? (
            <>
              {/* 6-Digit Code Input */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300 text-center">
                  Enter 6-digit verification code
                </label>
                <div className="flex gap-2 justify-center">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-mono rounded-xl bg-slate-800/50 border border-white/10 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Use Backup Code Link */}
              <div className="text-center">
                <button
                  onClick={toggleBackupCode}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1"
                >
                  <Key className="w-3 h-3" />
                  Use backup code instead
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Backup Code Input */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  Enter backup code
                </label>
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => {
                    setBackupCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white text-center text-lg font-mono tracking-wider placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
                  placeholder="XXXXXXXX"
                  autoFocus
                />
                <p className="text-xs text-slate-400 text-center">
                  Backup codes are 8 characters long
                </p>
              </div>

              {/* Use Auth Code Link */}
              <div className="text-center">
                <button
                  onClick={toggleBackupCode}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1"
                >
                  <Shield className="w-3 h-3" />
                  Use authenticator code instead
                </button>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-slate-300">
              {useBackupCode ? (
                <>
                  <strong className="text-blue-400">Backup codes</strong> can only be used once.
                  After using this code, it will no longer be valid.
                </>
              ) : (
                <>
                  <strong className="text-blue-400">Need help?</strong> Open your authenticator app
                  and enter the 6-digit code shown for OpenMeet.
                </>
              )}
            </p>
          </div>

          {/* Verify Button */}
          <Button
            variant="gradient-primary"
            size="default"
            onClick={handleVerify}
            isLoading={loading}
            disabled={loading || (useBackupCode ? !backupCode : code.join('').length !== 6)}
            className="w-full"
          >
            Verify & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
