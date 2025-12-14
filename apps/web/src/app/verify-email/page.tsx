'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import apiClient from '@/lib/api';

type VerificationState = 'verifying' | 'success' | 'error' | 'expired' | 'already-verified';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<VerificationState>('verifying');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setError('Verification token is missing');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      await apiClient.verifyEmail(token!);
      setState('success');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?verified=true');
      }, 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Verification failed';

      if (errorMessage.includes('expired') || errorMessage.includes('Invalid')) {
        setState('expired');
      } else if (errorMessage.includes('already verified')) {
        setState('already-verified');
      } else {
        setState('error');
        setError(errorMessage);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#000211] flex items-center justify-center px-8 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-semibold">
            <span className="gradient-text">OpenMeet</span>
          </Link>
        </div>

        <div className="bg-[#0a0a1a] border border-[#1e293b] rounded-xl p-8 text-center">
          {state === 'verifying' && (
            <>
              <div className="flex justify-center mb-6">
                <Loader2 className="h-16 w-16 text-[#7a5af8] animate-spin" />
              </div>
              <h1 className="heading-l text-white mb-2">Verifying your email</h1>
              <p className="paragraph-m text-[#cbd5e1]">Please wait while we verify your email address...</p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
              </div>
              <h1 className="heading-l text-white mb-2">Email verified!</h1>
              <p className="paragraph-m text-[#cbd5e1] mb-6">
                Your email has been successfully verified. Redirecting you to login...
              </p>
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 text-[#7a5af8] animate-spin" />
              </div>
            </>
          )}

          {state === 'expired' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Mail className="h-10 w-10 text-orange-500" />
                </div>
              </div>
              <h1 className="heading-l text-white mb-2">Link expired</h1>
              <p className="paragraph-m text-[#cbd5e1] mb-6">
                This verification link has expired. Please request a new one.
              </p>
              <Link
                href="/verify-email/pending"
                className="w-full button-primary inline-block"
              >
                Request new link
              </Link>
            </>
          )}

          {state === 'already-verified' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-blue-500" />
                </div>
              </div>
              <h1 className="heading-l text-white mb-2">Already verified</h1>
              <p className="paragraph-m text-[#cbd5e1] mb-6">
                Your email has already been verified. You can sign in now.
              </p>
              <Link
                href="/login"
                className="w-full button-primary inline-block"
              >
                Go to login
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>
              </div>
              <h1 className="heading-l text-white mb-2">Verification failed</h1>
              <p className="paragraph-m text-[#cbd5e1] mb-6">
                {error || 'We could not verify your email. Please try again or contact support.'}
              </p>
              <div className="space-y-3">
                <Link
                  href="/verify-email/pending"
                  className="w-full button-primary inline-block"
                >
                  Request new link
                </Link>
                <Link
                  href="/login"
                  className="block paragraph-m text-[#7a5af8] hover:text-[#9945ff]"
                >
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>

        {(state === 'success' || state === 'already-verified') && (
          <p className="text-center paragraph-s text-[#94a3b8] mt-6">
            Need help?{' '}
            <Link href="/contact" className="text-[#7a5af8] hover:text-[#9945ff]">
              Contact support
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
