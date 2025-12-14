'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import apiClient from '@/lib/api';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
  }>({ score: 0, label: 'Weak', color: 'bg-red-500' });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  useEffect(() => {
    if (password) {
      calculatePasswordStrength(password);
    }
  }, [password]);

  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) {
      setPasswordStrength({ score: 33, label: 'Weak', color: 'bg-red-500' });
    } else if (score <= 4) {
      setPasswordStrength({ score: 66, label: 'Medium', color: 'bg-yellow-500' });
    } else {
      setPasswordStrength({ score: 100, label: 'Strong', color: 'bg-green-500' });
    }
  };

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.resetPassword(token, data.password);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Failed to reset password. The link may have expired. Please request a new one.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#000211] flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="text-2xl font-semibold">
              <span className="gradient-text">
                OpenMeet
              </span>
            </Link>
          </div>

          <div className="bg-[#0a0a1a] border border-[#1e293b] rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h1 className="heading-m text-white mb-2">Password reset successful!</h1>
            <p className="paragraph-m text-[#cbd5e1] mb-6">
              Your password has been successfully reset. You will be redirected to the login page in a few seconds.
            </p>
            <Link
              href="/login"
              className="button-primary w-full"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000211] flex items-center justify-center px-8 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <Link href="/" className="text-2xl font-semibold">
            <span className="gradient-text">
              OpenMeet
            </span>
          </Link>
        </div>

        <h1 className="heading-l text-white mb-2">Reset your password</h1>
        <p className="paragraph-m text-[#cbd5e1] mb-8">
          Enter your new password below. Make sure it's strong and secure.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block label-m text-[#cbd5e1] mb-2">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                {...register('password')}
                disabled={isLoading || !token}
                className="input-ff pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="paragraph-s text-red-400 mt-1">{errors.password.message}</p>
            )}

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="paragraph-s text-[#94a3b8]">Password strength:</span>
                  <span className={`paragraph-s font-semibold ${
                    passwordStrength.label === 'Weak' ? 'text-red-500' :
                    passwordStrength.label === 'Medium' ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-[#1e293b] rounded-full h-2">
                  <div
                    className={`${passwordStrength.color} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Password Requirements */}
            <div className="mt-3 space-y-1">
              <p className="paragraph-s text-[#94a3b8] mb-2">Password must contain:</p>
              <div className="space-y-1">
                <PasswordRequirement
                  met={password?.length >= 8}
                  text="At least 8 characters"
                />
                <PasswordRequirement
                  met={/[A-Z]/.test(password || '')}
                  text="One uppercase letter"
                />
                <PasswordRequirement
                  met={/[a-z]/.test(password || '')}
                  text="One lowercase letter"
                />
                <PasswordRequirement
                  met={/[0-9]/.test(password || '')}
                  text="One number"
                />
                <PasswordRequirement
                  met={/[^A-Za-z0-9]/.test(password || '')}
                  text="One special character"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block label-m text-[#cbd5e1] mb-2">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                {...register('confirmPassword')}
                disabled={isLoading || !token}
                className="input-ff pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="paragraph-s text-red-400 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !token}
            className="w-full button-primary"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting password...
              </span>
            ) : (
              'Reset password'
            )}
          </button>
        </form>

        <p className="text-center paragraph-m text-[#94a3b8] mt-6">
          Remember your password?{' '}
          <Link href="/login" className="text-[#7a5af8] hover:text-[#9945ff] font-semibold">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-[#94a3b8] flex-shrink-0" />
      )}
      <span className={`paragraph-s ${met ? 'text-green-500' : 'text-[#94a3b8]'}`}>
        {text}
      </span>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#000211] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#7a5af8]" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
