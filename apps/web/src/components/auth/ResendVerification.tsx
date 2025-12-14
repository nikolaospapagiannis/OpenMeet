'use client';

import { useState, useEffect } from 'react';
import { Loader2, Mail, CheckCircle, Clock } from 'lucide-react';
import apiClient from '@/lib/api';

interface ResendVerificationProps {
  email: string;
  onSuccess?: () => void;
}

export default function ResendVerification({ email, onSuccess }: ResendVerificationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await apiClient.resendVerification(email);
      setSuccess(true);
      setCountdown(60); // 60 second cooldown

      if (onSuccess) {
        onSuccess();
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to resend verification email';

      // Handle rate limit error
      if (err.response?.status === 429) {
        const retryAfter = err.response?.data?.retryAfter || 60;
        setCountdown(retryAfter);
        setError(`Please wait ${retryAfter} seconds before requesting another email`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {success && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="paragraph-s font-semibold">Verification email sent!</p>
            <p className="paragraph-s text-green-300 mt-1">
              Check your inbox at <span className="font-mono">{email}</span>
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleResend}
        disabled={isLoading || countdown > 0}
        className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-3 transition-colors ${
          countdown > 0
            ? 'bg-[#1e293b] text-[#64748b] cursor-not-allowed'
            : 'bg-[#7a5af8] hover:bg-[#9945ff] text-white'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Sending...
          </>
        ) : countdown > 0 ? (
          <>
            <Clock className="h-5 w-5" />
            Resend in {countdown}s
          </>
        ) : (
          <>
            <Mail className="h-5 w-5" />
            Resend verification email
          </>
        )}
      </button>

      <p className="paragraph-s text-[#94a3b8] text-center">
        Check your spam folder if you don't see the email within a few minutes
      </p>
    </div>
  );
}
