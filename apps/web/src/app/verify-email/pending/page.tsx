'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, Inbox } from 'lucide-react';
import ResendVerification from '@/components/auth/ResendVerification';

export default function VerifyEmailPendingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    // Try to get email from URL params or localStorage
    const emailParam = searchParams.get('email');
    const storedUser = localStorage.getItem('user');

    if (emailParam) {
      setEmail(emailParam);
    } else if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.email) {
          setEmail(user.email);
        } else {
          // No email available, redirect to register
          router.push('/register');
        }
      } catch (e) {
        router.push('/register');
      }
    } else {
      // No email available, redirect to register
      router.push('/register');
    }
  }, [searchParams, router]);

  if (!email) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-[#000211] flex">
      {/* Main Content */}
      <div className="w-full lg:w-3/5 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="text-2xl font-semibold">
              <span className="gradient-text">OpenMeet</span>
            </Link>
          </div>

          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-[#7a5af8]/10 flex items-center justify-center">
                <Inbox className="h-10 w-10 text-[#7a5af8]" />
              </div>
            </div>

            <h1 className="heading-l text-white mb-2 text-center">Check your email</h1>
            <p className="paragraph-m text-[#cbd5e1] text-center mb-4">
              We've sent a verification link to:
            </p>
            <p className="paragraph-m text-white font-semibold text-center font-mono bg-[#0a0a1a] border border-[#1e293b] rounded-lg py-3 px-4 mb-8">
              {email}
            </p>
          </div>

          <div className="bg-[#0a0a1a] border border-[#1e293b] rounded-xl p-6 mb-6">
            <h2 className="paragraph-m text-white font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#7a5af8]" />
              Next steps
            </h2>
            <ol className="space-y-3">
              <li className="paragraph-s text-[#cbd5e1] flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7a5af8]/10 flex items-center justify-center text-[#7a5af8] text-xs font-semibold">
                  1
                </span>
                <span>Check your inbox for an email from OpenMeet</span>
              </li>
              <li className="paragraph-s text-[#cbd5e1] flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7a5af8]/10 flex items-center justify-center text-[#7a5af8] text-xs font-semibold">
                  2
                </span>
                <span>Click the verification link in the email</span>
              </li>
              <li className="paragraph-s text-[#cbd5e1] flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7a5af8]/10 flex items-center justify-center text-[#7a5af8] text-xs font-semibold">
                  3
                </span>
                <span>You'll be automatically redirected to sign in</span>
              </li>
            </ol>
          </div>

          {/* Resend Verification */}
          <div className="mb-6">
            <p className="paragraph-m text-[#cbd5e1] mb-4 text-center">
              Didn't receive the email?
            </p>
            <ResendVerification email={email} />
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 paragraph-m text-[#7a5af8] hover:text-[#9945ff] font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column - Tips */}
      <div className="hidden lg:flex lg:w-2/5 bg-[#0a0a1a] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 blur-backdrop"></div>
        <div className="relative z-10 max-w-md">
          <h2 className="heading-l text-white mb-6">While you wait...</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#7a5af8]/10 flex items-center justify-center flex-shrink-0">
                <Mail className="text-[#7a5af8] w-6 h-6" />
              </div>
              <div>
                <h3 className="paragraph-m text-white font-semibold mb-1">Check spam folder</h3>
                <p className="paragraph-s text-[#94a3b8]">
                  Sometimes our emails end up in spam. Make sure to check there if you don't see it in your inbox.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#7a5af8]/10 flex items-center justify-center flex-shrink-0">
                <Inbox className="text-[#7a5af8] w-6 h-6" />
              </div>
              <div>
                <h3 className="paragraph-m text-white font-semibold mb-1">Whitelist our emails</h3>
                <p className="paragraph-s text-[#94a3b8]">
                  Add noreply@openmeet.com to your contacts to ensure you receive important updates.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#7a5af8]/10 flex items-center justify-center flex-shrink-0">
                <Mail className="text-[#7a5af8] w-6 h-6" />
              </div>
              <div>
                <h3 className="paragraph-m text-white font-semibold mb-1">Link expires in 24 hours</h3>
                <p className="paragraph-s text-[#94a3b8]">
                  The verification link will expire after 24 hours for security reasons. You can always request a new one.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
